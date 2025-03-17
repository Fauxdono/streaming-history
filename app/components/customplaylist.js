import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, Plus, Trash2, Save, Music, Filter, PlusSquare, ArrowUp, ArrowDown } from 'lucide-react';

const CustomPlaylistCreator = ({ 
  processedData = [], 
  formatDuration,
  rawPlayData = []
}) => {
  const [playlistName, setPlaylistName] = useState('My Custom Playlist');
  const [searchTerm, setSearchTerm] = useState('');
  const [creationMode, setCreationMode] = useState('manual'); // 'manual' or 'smart'
  const [smartRules, setSmartRules] = useState([
    { type: 'artist', operator: 'contains', value: '', id: Date.now() }
  ]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [musicBasePath, setMusicBasePath] = useState('/Music/Downloads');
  const [fileExtension, setFileExtension] = useState('mp3');
  const [pathFormat, setPathFormat] = useState('default');
  const [customPathFormat, setCustomPathFormat] = useState('{basePath}/{artist}/{artist}-{album}/{track}.{ext}');
  const [savedPlaylists, setSavedPlaylists] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualTrack, setManualTrack] = useState({
    trackName: '',
    artist: '',
    albumName: 'Unknown Album',
    playCount: 1,
    totalPlayed: 180000 // Default 3 minutes
  });
  const [draggedTrackIndex, setDraggedTrackIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [customTrackPosition, setCustomTrackPosition] = useState("");
  const [activeTrackForPosition, setActiveTrackForPosition] = useState(null);
  
 // Create a normalized track map for faster searching
const trackMap = useMemo(() => {
  // Create a map for normalized track names (for fuzzy search)
  const normalizedMap = new Map();
  
  // Process all tracks
  const map = new Map();
  
  // First process raw data to calculate accurate play counts
  const playCountMap = new Map();
  
  // Count occurrences in raw data first
  rawPlayData.forEach(entry => {
    if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name && entry.ms_played >= 30000) {
      const key = `${entry.master_metadata_track_name.toLowerCase()}-${entry.master_metadata_album_artist_name.toLowerCase()}`;
      
      if (!playCountMap.has(key)) {
        playCountMap.set(key, {
          count: 1,
          totalPlayed: entry.ms_played
        });
      } else {
        const current = playCountMap.get(key);
        current.count += 1;
        current.totalPlayed += entry.ms_played;
      }
    }
  });
  
  // Now add processed tracks with correct play counts
  processedData.forEach(track => {
    // Skip if no track name or artist
    if (!track.trackName || !track.artist) return;
    
    try {
      const key = `${track.trackName.toLowerCase()}-${track.artist.toLowerCase()}`;
      
      // Get actual play count from our calculation if available
      const playData = playCountMap.get(key);
      const actualPlayCount = playData ? playData.count : (track.playCount || 0);
      const actualTotalPlayed = playData ? playData.totalPlayed : (track.totalPlayed || 0);
      
      map.set(key, {
        ...track,
        id: `processed-${key}`,
        playCount: actualPlayCount, // Use our calculated play count
        totalPlayed: actualTotalPlayed // Use our calculated total play time
      });
      
      // Add to normalized map for fuzzy search
      const normalizedTitle = normalizeTrackTitle(track.trackName);
      const normalizedArtist = normalizeArtistName(track.artist);
      
      const normalizedKey = `${normalizedTitle}-${normalizedArtist}`;
      if (!normalizedMap.has(normalizedKey)) {
        normalizedMap.set(normalizedKey, []);
      }
      normalizedMap.get(normalizedKey).push(key);
      
      // Add common variations
      const variations = getCommonVariations(track.trackName);
      variations.forEach(variation => {
        const varKey = `${variation}-${normalizedArtist}`;
        if (!normalizedMap.has(varKey)) {
          normalizedMap.set(varKey, []);
        }
        if (!normalizedMap.get(varKey).includes(key)) {
          normalizedMap.get(varKey).push(key);
        }
      });
    } catch (err) {
      console.warn("Error processing track:", track, err);
    }
  });
  
  // Then add tracks from raw data that aren't already in our map
  rawPlayData.forEach(entry => {
    if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name && entry.ms_played >= 30000) {
      try {
        const key = `${entry.master_metadata_track_name.toLowerCase()}-${entry.master_metadata_album_artist_name.toLowerCase()}`;
        
        if (!map.has(key)) {
          // Get the play count from our calculation
          const playData = playCountMap.get(key) || { count: 1, totalPlayed: entry.ms_played };
          
          map.set(key, {
            trackName: entry.master_metadata_track_name,
            artist: entry.master_metadata_album_artist_name,
            albumName: entry.master_metadata_album_album_name || 'Unknown Album',
            totalPlayed: playData.totalPlayed,
            playCount: playData.count, // Use our calculated count
            id: `raw-${key}`
          });
          
          // Add to normalized map for fuzzy search
          const normalizedTitle = normalizeTrackTitle(entry.master_metadata_track_name);
          const normalizedArtist = normalizeArtistName(entry.master_metadata_album_artist_name);
          
          const normalizedKey = `${normalizedTitle}-${normalizedArtist}`;
          if (!normalizedMap.has(normalizedKey)) {
            normalizedMap.set(normalizedKey, []);
          }
          normalizedMap.get(normalizedKey).push(key);
          
          // Add common variations
          const variations = getCommonVariations(entry.master_metadata_track_name);
          variations.forEach(variation => {
            const varKey = `${variation}-${normalizedArtist}`;
            if (!normalizedMap.has(varKey)) {
              normalizedMap.set(varKey, []);
            }
            if (!normalizedMap.get(varKey).includes(key)) {
              normalizedMap.get(varKey).push(key);
            }
          });
        }
      } catch (err) {
        console.warn("Error processing raw track:", entry, err);
      }
    }
  });
  
  // Store the normalized map in the map object itself
  map.normalizedMap = normalizedMap;
  
  // For debugging
  console.log("Track map created with correct play counts:", 
    Array.from(map.values()).map(t => ({
      name: t.trackName,
      artist: t.artist,
      playCount: t.playCount
    })).slice(0, 5)
  );
  
  return map;
}, [processedData, rawPlayData]);
  
  // Helper function to normalize track titles for better matching
  function normalizeTrackTitle(title) {
    if (!title) return '';
    
    // First convert to lowercase
    let normalized = title.toLowerCase()
      // Replace special characters
      .replace(/[àáâäæãåā]/g, 'a')
      .replace(/[èéêëēėę]/g, 'e')
      .replace(/[îïíīįì]/g, 'i')
      .replace(/[ôöòóœøōõ]/g, 'o')
      .replace(/[ûüùúū]/g, 'u')
      // Remove common noise words
      .replace(/\b(feat|ft|featuring|with|prod|produced by)\b/g, '')
      // Remove parentheses content, which is often features, remixes, etc.
      .replace(/\([^\)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      // Remove some common punctuation
      .replace(/['",.!?-]/g, '')
      .trim();
    
    // Replace specific common substitutions
    normalized = normalized
      .replace(/chill/g, "chil")
      .replace(/all american/g, "all amerikkkan")
      .replace(/amerikkkan/g, "american")
      .replace(/\$/g, "s")
      .replace(/&/g, "and")
      .replace(/w\//g, "with");
    
    return normalized;
  }
  
  // Helper function to normalize artist names
  function normalizeArtistName(name) {
    if (!name) return '';
    
    return name.toLowerCase()
      // Replace special characters
      .replace(/[àáâäæãåā]/g, 'a')
      .replace(/[èéêëēėę]/g, 'e')
      .replace(/[îïíīįì]/g, 'i')
      .replace(/[ôöòóœøōõ]/g, 'o')
      .replace(/[ûüùúū]/g, 'u')
      // ASAP => asap
      .replace(/\ba\$ap\b/gi, 'asap')
      // Remove common punctuation
      .replace(/['",.!?-]/g, '')
      // Normalize spaces
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Create common variations of track titles
  function getCommonVariations(title) {
    if (!title) return [];
    
    const variations = [];
    const lowerTitle = title.toLowerCase();
    
    // For titles with (feat. XXX), create a version without it
    if (lowerTitle.includes('feat.') || lowerTitle.includes('ft.')) {
      variations.push(lowerTitle.replace(/(\(|\[)?\s*(feat\.?|ft\.?)\s+[^\)\]]*(\)|\])?/gi, '').trim());
    }
    
    // For titles with common abbreviations, add variations
    if (lowerTitle.includes('pt.')) {
      variations.push(lowerTitle.replace(/pt\./gi, 'part').trim());
    }
    
    return variations.map(v => normalizeTrackTitle(v));
  }
  
  // All tracks array for operations
  const allTracks = useMemo(() => {
    return Array.from(trackMap.values());
  }, [trackMap]);
  
  // Filter tracks based on search term - more efficient approach with fuzzy matching
  const filteredTracks = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    const normalizedTerm = normalizeTrackTitle(term);
    const normalizedArtistTerm = normalizeArtistName(term);
    
    // First collect all potential matches using the normalized map
    const potentialMatches = new Set();
    
    // Check for normalized track title matches
    trackMap.normalizedMap.forEach((trackKeys, normalizedKey) => {
      // First try exact artist+title matches
      if (normalizedKey.includes(normalizedTerm)) {
        trackKeys.forEach(key => potentialMatches.add(key));
      }
    });
    
    // If we have less than 20 matches, try more fuzzy matching
    if (potentialMatches.size < 20) {
      trackMap.normalizedMap.forEach((trackKeys, normalizedKey) => {
        const [trackPart, artistPart] = normalizedKey.split('-');
        
        // Try matching just the track part or artist part
        if (trackPart.includes(normalizedTerm) || artistPart.includes(normalizedArtistTerm)) {
          trackKeys.forEach(key => potentialMatches.add(key));
        }
      });
    }
    
    // Get the actual tracks from the track map
    const matchedTracks = [];
    potentialMatches.forEach(key => {
      if (trackMap.has(key)) {
        matchedTracks.push(trackMap.get(key));
      }
    });
    
    // If we still don't have enough, do a fallback direct search
    if (matchedTracks.length < 20) {
      // Direct search in all tracks
      const directMatches = allTracks.filter(track => 
        !potentialMatches.has(`${track.trackName.toLowerCase()}-${track.artist.toLowerCase()}`) &&
        (track.trackName.toLowerCase().includes(term) || 
         track.artist.toLowerCase().includes(term) ||
         (track.albumName && track.albumName.toLowerCase().includes(term)))
      );
      
      // Add direct matches
      matchedTracks.push(...directMatches);
    }
    
    // Sort by relevance (exact matches first)
    return matchedTracks
      .sort((a, b) => {
        // Sort by how closely the track name matches the search term
        const aTrackMatch = a.trackName.toLowerCase().includes(term) ? 0 : 1;
        const bTrackMatch = b.trackName.toLowerCase().includes(term) ? 0 : 1;
        
        if (aTrackMatch !== bTrackMatch) {
          return aTrackMatch - bTrackMatch;
        }
        
        // Then by how closely the artist matches
        const aArtistMatch = a.artist.toLowerCase().includes(term) ? 0 : 1;
        const bArtistMatch = b.artist.toLowerCase().includes(term) ? 0 : 1;
        
        return aArtistMatch - bArtistMatch;
      })
      .slice(0, 20); // Limit to 20 results
  }, [searchTerm, trackMap, allTracks]);
  
  // Add track to selection
  const addTrack = (track) => {
    if (!selectedTracks.some(t => t.id === track.id)) {
      setSelectedTracks(prev => [...prev, track]);
    }
    setSearchTerm('');
  };
  
  // Add a manually entered track
  const addManualTrack = () => {
    // Validate required fields
    if (!manualTrack.trackName || !manualTrack.artist) {
      alert('Track name and artist are required');
      return;
    }
    
    // Create a unique ID for this track
    const trackId = `manual-${manualTrack.trackName}-${manualTrack.artist}-${Date.now()}`;
    
    // Create the track object
    const newTrack = {
      ...manualTrack,
      id: trackId
    };
    
    // Add to selected tracks
    setSelectedTracks(prev => [...prev, newTrack]);
    
    // Reset the form
    setManualTrack({
      trackName: '',
      artist: '',
      albumName: 'Unknown Album',
      playCount: 1,
      totalPlayed: 180000
    });
    
    // Hide the manual add form
    setShowManualAdd(false);
  };
  
  // Update manual track field
  const updateManualTrack = (field, value) => {
    setManualTrack(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Add a smart rule
  const addRule = () => {
    setSmartRules(prev => [
      ...prev, 
      { type: 'artist', operator: 'contains', value: '', id: Date.now() }
    ]);
  };
  
const updateRule = (id, field, value) => {
  setSmartRules(prev => 
    prev.map(rule => {
      if (rule.id === id) {
        // Create updated rule with new field value
        const updatedRule = { ...rule, [field]: value };
        
        // If changing to a numeric field type, ensure operator is appropriate
        if (field === 'type' && (value === 'playCount' || value === 'playTime')) {
          // For numeric fields, use numeric operators
          if (['contains', 'startsWith', 'endsWith'].includes(updatedRule.operator)) {
            updatedRule.operator = 'greaterThan'; // Default numeric operator
          }
        }
        // For date fields, use date operators
        else if (field === 'type' && value === 'playDate') {
          if (['contains', 'startsWith', 'endsWith'].includes(updatedRule.operator)) {
            updatedRule.operator = 'after'; // Default date operator
          }
        }
        
        return updatedRule;
      }
      return rule;
    })
  );
};

const generateFromRules = () => {
  console.clear();
  console.log("======= STARTING PLAYLIST GENERATION =======");
  
  // Early exit if no valid rules
  if (smartRules.every(rule => !rule.value.trim())) {
    alert('Please add at least one rule with a value');
    return;
  }
  
  // Show processing indicator
  setSelectedTracks([{ 
    id: 'processing',
    trackName: 'Processing...',
    artist: 'Please wait while your playlist is being generated',
    albumName: '',
    totalPlayed: 0,
    playCount: 0
  }]);
  
  // Only use valid rules (with a value)
  let validRules = smartRules.filter(rule => rule.value.trim());
  
  // CRITICAL FIX: Ensure proper operators for numeric fields
  validRules = validRules.map(rule => {
    // Make a copy to avoid mutating the original rule
    const fixedRule = { ...rule };
    
    // For numeric fields, ensure numeric operators
    if (rule.type === 'playCount' || rule.type === 'playTime') {
      if (['contains', 'startsWith', 'endsWith'].includes(rule.operator)) {
        console.log(`FIXING OPERATOR: Changing ${rule.operator} to greaterThan for ${rule.type}`);
        fixedRule.operator = 'greaterThan';
      }
    }
    
    return fixedRule;
  });
  
  console.log("Rules after validation:", validRules);
  console.log(`Processing ${allTracks.length} total tracks`);
  
  // Skip all complex pre-processing and go straight to filtering
  setTimeout(() => {
    try {
      // Get all tracks as an array
      const allTracks = Array.from(trackMap.values());
      
      // DIRECT FILTERING - no batching, no callbacks, just direct filtering
      const matchingTracks = [];
      
      // Flag to indicate if we're filtering on play count
      const hasPlayCountRule = validRules.some(rule => rule.type === 'playCount');
      
      // Directly apply all rules to each track
      allTracks.forEach(track => {
        if (!track) return; // Skip invalid tracks
        
        // Check if track matches all rules
        const matchesAllRules = validRules.every(rule => {
          // Make sure rule value is valid
          const ruleValue = rule.value.trim().toLowerCase();
          if (!ruleValue) return true;
          
          // Check each rule type with direct implementation
          switch(rule.type) {
            case 'artist': {
              const artist = String(track.artist || '').toLowerCase();
              return rule.operator === 'contains' ? artist.includes(ruleValue) : 
                     rule.operator === 'equals' ? artist === ruleValue :
                     rule.operator === 'startsWith' ? artist.startsWith(ruleValue) :
                     rule.operator === 'endsWith' ? artist.endsWith(ruleValue) : false;
            }
            
            case 'album': {
              const album = String(track.albumName || '').toLowerCase();
              return rule.operator === 'contains' ? album.includes(ruleValue) : 
                     rule.operator === 'equals' ? album === ruleValue :
                     rule.operator === 'startsWith' ? album.startsWith(ruleValue) :
                     rule.operator === 'endsWith' ? album.endsWith(ruleValue) : false;
            }
            
            case 'track': {
              const trackName = String(track.trackName || '').toLowerCase();
              return rule.operator === 'contains' ? trackName.includes(ruleValue) : 
                     rule.operator === 'equals' ? trackName === ruleValue :
                     rule.operator === 'startsWith' ? trackName.startsWith(ruleValue) :
                     rule.operator === 'endsWith' ? trackName.endsWith(ruleValue) : false;
            }
            
            case 'playCount': {
              // Very explicit handling for play count
              // Convert both sides to numbers with unary plus to force numeric type
              const trackPlayCount = +Number(track.playCount || 0);
              const numericRuleValue = +Number(ruleValue);
              
              // Debug high count tracks
              if (trackPlayCount > 290) {
                console.log(`Evaluating high play count track: "${track.trackName}" (${trackPlayCount}) ${rule.operator} ${numericRuleValue}`);
              }
              
              // Super explicit comparisons
              let result = false;
              
              if (rule.operator === 'greaterThan') {
                result = trackPlayCount > numericRuleValue;
              } 
              else if (rule.operator === 'lessThan') {
                result = trackPlayCount < numericRuleValue;
              }
              else if (rule.operator === 'equals') {
                result = trackPlayCount === numericRuleValue;
              }
              
              // Log result for high count tracks
              if (trackPlayCount > 290) {
                console.log(`Result: ${result}`);
              }
              
              return result;
            }
            
            case 'playTime': {
              // Convert both sides to numbers with unary plus to force numeric type
              const trackMinutes = +Number((track.totalPlayed || 0) / 60000);
              const numericRuleValue = +Number(ruleValue);
              
              // Super explicit comparisons
              if (rule.operator === 'greaterThan') {
                return trackMinutes > numericRuleValue;
              } 
              else if (rule.operator === 'lessThan') {
                return trackMinutes < numericRuleValue;
              }
              else if (rule.operator === 'equals') {
                return trackMinutes === numericRuleValue;
              }
              
              return false;
            }

case 'playDate': {
  // Get timestamp from track entry
  const trackDate = new Date(track.ts);
  
  // For "between" operator, we need to parse two dates
  if (rule.operator === 'between') {
    const [startDateStr, endDateStr] = ruleValue.split('|');
    if (!startDateStr || !endDateStr) return false;
    
    const startDate = new Date(startDateStr);
    // Set end date to end of day for inclusive filtering
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);
    
    // Check if track date is between start and end
    return trackDate >= startDate && trackDate <= endDate;
  }
  
  // For other operators, parse single date
  const ruleDate = new Date(ruleValue);
  
  // For "on" operator, compare year, month, and day only
  if (rule.operator === 'on') {
    return trackDate.getFullYear() === ruleDate.getFullYear() &&
          trackDate.getMonth() === ruleDate.getMonth() &&
          trackDate.getDate() === ruleDate.getDate();
  }
  
  // For after/before, compare full timestamps
  if (rule.operator === 'after') {
    return trackDate >= ruleDate;
  } else if (rule.operator === 'before') {
    // Set rule date to end of day for more intuitive "before" filtering
    ruleDate.setHours(23, 59, 59, 999);
    return trackDate <= ruleDate;
  }
  
  return false;
}
            
            default:
              return true;
          }
        });
        
        // If track matches all rules, add it to results
        if (matchesAllRules) {
          // Always log high play count matches for debugging
          if (hasPlayCountRule && +Number(track.playCount || 0) > 290) {
            console.log(`MATCH FOUND: "${track.trackName}" with play count ${track.playCount}`);
          }
          
          matchingTracks.push(track);
        }
    });
      
      // Limit to 100 tracks
      const limitedResults = matchingTracks.slice(0, 100);
      
      // Update UI with results
      console.log(`Found ${matchingTracks.length} matching tracks (showing up to 100)`);
      
      if (matchingTracks.length === 0) {
        setSelectedTracks([{
          id: 'no-matches',
          trackName: 'No matches found',
          artist: 'Try adjusting your smart playlist rules',
          albumName: '',
          totalPlayed: 0,
          playCount: 0
        }]);
        
        // Clear the no-matches message after 3 seconds
        setTimeout(() => {
          setSelectedTracks([]);
        }, 3000);
      } else {
        setSelectedTracks(limitedResults);
      }
      
    } catch (error) {
      console.error("Error generating playlist:", error);
      setSelectedTracks([{
        id: 'error',
        trackName: 'Error generating playlist',
        artist: error.message || 'Please try again with different rules',
        albumName: '',
        totalPlayed: 0,
        playCount: 0
      }]);
    }
  }, 100);
};
// Also replace the applyOperator function with this version for numeric comparisons:
const applyOperator = (fieldValue, operator, ruleValue) => {
  switch(operator) {
    case 'contains':
      return String(fieldValue).includes(ruleValue);
    case 'equals':
      // For numeric comparisons, convert both to numbers
      if (typeof fieldValue === 'number' || !isNaN(Number(fieldValue))) {
        return Number(fieldValue) === Number(ruleValue);
      }
      return String(fieldValue) === ruleValue;
    case 'startsWith':
      return String(fieldValue).startsWith(ruleValue);
    case 'endsWith':
      return String(fieldValue).endsWith(ruleValue);
    case 'greaterThan':
      return Number(fieldValue) > Number(ruleValue);
    case 'lessThan':
      return Number(fieldValue) < Number(ruleValue);
    default:
      return true;
  }
};

// Also update the process batches function to better handle numeric comparisons:
const processBatches = (tracks, validRules, batchSize = 300, resultCallback) => {
  let results = [];
  let processingIndex = 0;
  
  function processNextBatch() {
    // Update processing status
    setSelectedTracks([{ 
      id: 'processing',
      trackName: `Processing... (${Math.min(processingIndex + batchSize, tracks.length)}/${tracks.length})`,
      artist: `Found ${results.length} matching tracks so far`,
      albumName: '',
      totalPlayed: 0,
      playCount: 0
    }]);
    
    // Process this batch
    const endIndex = Math.min(processingIndex + batchSize, tracks.length);
    const currentBatch = tracks.slice(processingIndex, endIndex);
    
    // Filter the batch
    const batchMatches = currentBatch.filter(track => {
      // Make sure track is valid
      if (!track) return false;
      
      return validRules.every(rule => {
        const ruleValue = rule.value.toLowerCase();
        
        switch(rule.type) {
          case 'artist':
            return applyOperator(track.artist?.toLowerCase() || '', rule.operator, ruleValue);
          case 'album':
            return applyOperator(track.albumName?.toLowerCase() || '', rule.operator, ruleValue);
          case 'track':
            return applyOperator(track.trackName?.toLowerCase() || '', rule.operator, ruleValue);
          case 'playCount':
            // Explicit numeric comparison for play count
            const trackCount = Number(track.playCount || 0);
            const ruleCount = Number(ruleValue);
            
            switch(rule.operator) {
              case 'greaterThan':
                return trackCount > ruleCount;
              case 'lessThan':
                return trackCount < ruleCount;
              case 'equals':
                return trackCount === ruleCount;
              default:
                return false;
            }
          case 'playTime':
            // Explicit numeric comparison for play time
            const trackTime = Number((track.totalPlayed || 0) / 60000);
            const ruleTime = Number(ruleValue);
            
            switch(rule.operator) {
              case 'greaterThan':
                return trackTime > ruleTime;
              case 'lessThan':
                return trackTime < ruleTime;
              case 'equals':
                return trackTime === ruleTime;
              default:
                return false;
            }
          default:
            return true;
        }
      });
    });
    
    // Add matches to results
    results = [...results, ...batchMatches];
    processingIndex = endIndex;
    
    // Continue processing or finish
    if (processingIndex < tracks.length && results.length < 100) {
      // Schedule next batch
      setTimeout(processNextBatch, 10);
    } else {
      // We're done, call the callback with results
      resultCallback(results.slice(0, 100));
    }
  }
  
  // Start processing
  processNextBatch();
};
  
  // Remove track from selection
  const removeTrack = (trackId) => {
    setSelectedTracks(prev => prev.filter(track => track.id !== trackId));
  };
  
  // Reorder tracks
  const moveTrack = (index, direction) => {
    const newTracks = [...selectedTracks];
    
    if (direction === 'up' && index > 0) {
      [newTracks[index], newTracks[index - 1]] = [newTracks[index - 1], newTracks[index]];
      setSelectedTracks(newTracks);
    } else if (direction === 'down' && index < selectedTracks.length - 1) {
      [newTracks[index], newTracks[index + 1]] = [newTracks[index + 1], newTracks[index]];
      setSelectedTracks(newTracks);
    }
  };
  
  // Move track to a specific position
  const moveTrackToPosition = (trackIndex, newPosition) => {
    // Validate position
    const targetPosition = parseInt(newPosition);
    if (isNaN(targetPosition) || targetPosition < 1 || targetPosition > selectedTracks.length) {
      alert(`Please enter a position between 1 and ${selectedTracks.length}`);
      return;
    }
    
    // Adjust for zero-based indexing
    const targetIndex = targetPosition - 1;
    
    // Don't do anything if position is the same
    if (trackIndex === targetIndex) return;
    
    // Make a copy of tracks
    const newTracks = [...selectedTracks];
    
    // Remove the track from its current position
    const [movedTrack] = newTracks.splice(trackIndex, 1);
    
    // Insert it at the new position
    newTracks.splice(targetIndex, 0, movedTrack);
    
    // Update state
    setSelectedTracks(newTracks);
    setActiveTrackForPosition(null);
    setCustomTrackPosition("");
  };
  
  // Handle drag start
  const handleDragStart = (index) => {
    setDraggedTrackIndex(index);
  };
  
  // Handle drag over
  const handleDragOver = (e, index) => {
    e.preventDefault(); // Necessary to allow drop
    setDragOverIndex(index);
  };
  
  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    
    // Check if we have a valid drag operation
    if (draggedTrackIndex !== null && dragOverIndex !== null && draggedTrackIndex !== dragOverIndex) {
      // Create a new tracks array
      const newTracks = [...selectedTracks];
      
      // Remove the dragged track
      const [draggedTrack] = newTracks.splice(draggedTrackIndex, 1);
      
      // Insert it at the drop position
      newTracks.splice(dragOverIndex, 0, draggedTrack);
      
      // Update state
      setSelectedTracks(newTracks);
    }
    
    // Reset drag state
    setDraggedTrackIndex(null);
    setDragOverIndex(null);
  };
  
  // Helper function to clean path components for file system compatibility
  const cleanPathComponent = (text) => {
    if (!text) return 'Unknown';
    
    return text
      .replace(/[/\\?%*:|"<>]/g, '') // Remove characters not allowed in file paths
      .replace(/\s+/g, ' ')          // Normalize whitespace
      .trim();
  };
  
  // Create M3U playlist content
  const createM3UContent = () => {
    if (selectedTracks.length === 0) {
      return '';
    }
    
    // Create the M3U content
    let content = '#EXTM3U\n';
    
    selectedTracks.forEach((track, index) => {
      // Skip system messages
      if (track.id === 'processing' || track.id === 'no-matches' || track.id === 'error') {
        return;
      }
      
      // Calculate track duration in seconds (avoid division by zero)
      const durationSecs = Math.round(track.totalPlayed / (track.playCount || 1) / 1000);
      
      // Basic info line
      content += `#EXTINF:${durationSecs},${track.artist} - ${track.trackName}\n`;
      
      // File path line - create a clean path without special characters
      const artist = cleanPathComponent(track.artist);
      const album = cleanPathComponent(track.albumName || 'Unknown Album');
      const trackName = cleanPathComponent(track.trackName);
      
      // Build the file path
      let filePath;
      
      if (pathFormat === 'default') {
        // Default format: BasePath/Artist/Artist-Album/Track.ext
        filePath = `${musicBasePath}/${artist}/${artist}-${album}/${trackName}.${fileExtension}`;
      } else {
        // Custom format using the template
        filePath = customPathFormat
          .replace('{basePath}', musicBasePath)
          .replace('{artist}', artist)
          .replace('{album}', album)
          .replace('{track}', trackName)
          .replace('{ext}', fileExtension)
          .replace('{index}', (index + 1).toString().padStart(3, '0'));
      }
      
      content += `${filePath}\n`;
    });
    
    return content;
  };
  
  // Export the playlist
  const exportPlaylist = () => {
    // Check if there are any real tracks (not just system messages)
    const realTracks = selectedTracks.filter(track => 
      !['processing', 'no-matches', 'error'].includes(track.id)
    );
    
    if (realTracks.length === 0) {
      alert('Please add tracks to your playlist first');
      return;
    }
    
    const content = createM3UContent();
    if (!content) {
      alert('No valid tracks to export');
      return;
    }
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedPlaylistName = playlistName.replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${sanitizedPlaylistName}-${timestamp}.m3u`;
    
    // Download the file
    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };
  
  // Save the current playlist
  const savePlaylist = () => {
    // Check if there are any real tracks (not just system messages)
    const realTracks = selectedTracks.filter(track => 
      !['processing', 'no-matches', 'error'].includes(track.id)
    );
    
    if (realTracks.length === 0) {
      alert('Please add tracks to your playlist first');
      return;
    }
    
    const newPlaylist = {
      id: Date.now().toString(),
      name: playlistName,
      tracks: realTracks,
      created: new Date().toISOString()
    };
    
    setSavedPlaylists(prev => [...prev, newPlaylist]);
    
    // Save to localStorage for persistence
    try {
      const existingPlaylists = JSON.parse(localStorage.getItem('savedPlaylists') || '[]');
      localStorage.setItem('savedPlaylists', JSON.stringify([...existingPlaylists, newPlaylist]));
      alert('Playlist saved successfully!');
    } catch (e) {
      console.warn('Failed to save playlist to localStorage:', e);
      alert('Playlist saved in memory, but could not be stored for permanent access.');
    }
  };
  
  // Load saved playlists from localStorage on mount
  useEffect(() => {
    try {
      const storedPlaylists = JSON.parse(localStorage.getItem('savedPlaylists') || '[]');
      if (storedPlaylists.length > 0) {
        setSavedPlaylists(storedPlaylists);
      }
    } catch (e) {
      console.warn('Failed to load playlists from localStorage:', e);
    }
  }, []);
  
  // Delete a saved playlist
  const deletePlaylist = (playlistId) => {
    setSavedPlaylists(prev => prev.filter(playlist => playlist.id !== playlistId));
    
    // Update localStorage
    try {
      const existingPlaylists = JSON.parse(localStorage.getItem('savedPlaylists') || '[]');
      localStorage.setItem('savedPlaylists', 
        JSON.stringify(existingPlaylists.filter(playlist => playlist.id !== playlistId))
      );
    } catch (e) {
      console.warn('Failed to update localStorage:', e);
    }
  };
  
  // Load a saved playlist
  const loadPlaylist = (playlist) => {
    setPlaylistName(playlist.name);
    setSelectedTracks(playlist.tracks);
    setActiveTab('create');
  };
  
  // Track stats (exclude system messages)
  const totalDuration = useMemo(() => {
    return selectedTracks
      .filter(track => !['processing', 'no-matches', 'error'].includes(track.id))
      .reduce((total, track) => total + (track.totalPlayed / Math.max(1, track.playCount)), 0);
  }, [selectedTracks]);
  
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'create' 
              ? 'text-red-600 border-b-2 border-red-600' 
              : 'text-red-500 hover:text-red-700'
          }`}
        >
          Create Playlist
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'saved' 
              ? 'text-red-600 border-b-2 border-red-600' 
              : 'text-red-500 hover:text-red-700'
          }`}
        >
          Saved Playlists ({savedPlaylists.length})
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'export' 
              ? 'text-red-600 border-b-2 border-red-600' 
              : 'text-red-500 hover:text-red-700'
          }`}
        >
          Export Settings
        </button>
      </div>
      
      {activeTab === 'create' && (
        <div className="space-y-4">
          {/* Playlist Name */}
          <div>
            <label className="block text-red-700 mb-1">Playlist Name:</label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-700"
              placeholder="Enter playlist name"
            />
          </div>
          
          {/* Creation Mode Switch */}
          <div className="flex border-b mb-4">
            <button
              onClick={() => setCreationMode('manual')}
              className={`px-4 py-2 font-medium ${
                creationMode === 'manual' 
                  ? 'bg-red-50 text-red-600 border-b-2 border-red-600' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              Manual Selection
            </button>
            <button
              onClick={() => setCreationMode('smart')}
              className={`px-4 py-2 font-medium ${
                creationMode === 'smart' 
                  ? 'bg-red-50 text-red-600 border-b-2 border-red-600' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              Smart Playlist
            </button>
          </div>
          
          {creationMode === 'manual' ? (
            /* Track Search */
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-red-700">Search for tracks to add:</label>
                  <button 
                    onClick={() => setShowManualAdd(!showManualAdd)}
                    className="flex items-center text-red-600 hover:text-red-800"
                  >
                    <PlusSquare size={16} className="mr-1" />
                    {showManualAdd ? 'Cancel' : 'Add track manually'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
                    placeholder="Search by track name, artist or album..."
                  />
                  
                  {filteredTracks.length > 0 && !showManualAdd && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto text-red-500">
                      {filteredTracks.map(track => (
                        <div 
                          key={track.id}
                          onClick={() => addTrack(track)}
                          className="px-4 py-2 hover:bg-red-50 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <div className="font-medium">{track.trackName}</div>
                            <div className="text-sm text-red-600">
                              {track.artist} {track.albumName ? `• ${track.albumName}` : ''}
                            </div>
                          </div>
                          <button className="text-red-600 hover:text-red-800">
                            <Plus size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Manual Track Add Form */}
              {showManualAdd && (
                <div className="border border-red-300 rounded p-4 bg-red-50">
                  <h4 className="font-bold text-red-700 mb-3">Add Track Manually</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-red-700 mb-1">Track Name:*</label>
                      <input
                        type="text"
                        value={manualTrack.trackName}
                        onChange={(e) => updateManualTrack('trackName', e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
                        placeholder="Enter track name"
                      />
                    </div>
                    <div>
                      <label className="block text-red-700 mb-1">Artist:*</label>
                      <input
                        type="text"
                        value={manualTrack.artist}
                        onChange={(e) => updateManualTrack('artist', e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
                        placeholder="Enter artist name"
                      />
                    </div>
                    <div>
                      <label className="block text-red-700 mb-1">Album:</label>
                      <input
                        type="text"
                        value={manualTrack.albumName}
                        onChange={(e) => updateManualTrack('albumName', e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
                        placeholder="Enter album name (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-red-700 mb-1">Duration (seconds):</label>
                      <input
                        type="number"
                        value={Math.round(manualTrack.totalPlayed / 1000)}
                        onChange={(e) => updateManualTrack('totalPlayed', parseInt(e.target.value) * 1000)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
                        placeholder="Duration in seconds"
                        min="1"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={addManualTrack}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        <Plus size={16} className="inline mr-1" /> Add Track
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Smart Rules */
            <div className="space-y-4 border p-4 rounded bg-red-50">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-red-700">Smart Playlist Rules</h4>
                <div className="text-sm text-red-600">All rules must match (AND logic)</div>
              </div>
              
              {smartRules.map((rule) => (
                <div key={rule.id} className="flex flex-wrap gap-2 items-center border-b border-red-200 pb-3">
                  <select
                    value={rule.type}
                    onChange={(e) => updateRule(rule.id, 'type', e.target.value)}
                    className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
                  >
                    <option value="artist">Artist</option>
                    <option value="album">Album</option>
                    <option value="track">Track Name</option>
                    <option value="playCount">Play Count</option>
                    <option value="playTime">Play Time (minutes)</option>
                    <option value="playDate">Play Date</option>
                  </select>
                  
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                    className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
                  >
                    {(rule.type === 'artist' || rule.type === 'album' || rule.type === 'track') ? (
                      <>
                        <option value="contains">contains</option>
                        <option value="equals">equals</option>
                        <option value="startsWith">starts with</option>
                        <option value="endsWith">ends with</option>
                      </>
  ) : rule.type === 'playDate' ? (
    <>
      <option value="after">after</option>
      <option value="before">before</option>
      <option value="between">between</option>
      <option value="on">on</option>
    </>
                    ) : (
                      <>
                        <option value="greaterThan">greater than</option>
                        <option value="lessThan">less than</option>
                        <option value="equals">equals</option>
                      </>
                    )}
                  </select>
                  {rule.type === 'playDate' ? (
  rule.operator === 'between' ? (
    <div className="flex-1 flex gap-2 items-center">
      <input
        type="date"
        value={rule.value.split('|')[0] || ''}
        onChange={(e) => {
          const endDate = rule.value.split('|')[1] || '';
          updateRule(rule.id, 'value', `${e.target.value}|${endDate}`);
        }}
        className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
      />
      <span className="text-red-600">to</span>
      <input
        type="date"
        value={rule.value.split('|')[1] || ''}
        onChange={(e) => {
          const startDate = rule.value.split('|')[0] || '';
          updateRule(rule.id, 'value', `${startDate}|${e.target.value}`);
        }}
        className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
      />
    </div>
  ) : (
    <input
      type="date"
      value={rule.value}
      onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
      className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
    />
  )
) : (
                  <input
                    type={rule.type === 'playCount' || rule.type === 'playTime' ? 'number' : 'text'}
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-600"
                    placeholder={`Enter ${rule.type} value...`}
                    min={rule.type === 'playCount' || rule.type === 'playTime' ? "0" : undefined}
                  />
                  )}
                  <button 
                    onClick={() => removeRule(rule.id)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              
              <div className="flex justify-between">
                <button
                  onClick={addRule}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  <Plus size={16} className="inline mr-1" /> Add Rule
                </button>
                
                <button
                  onClick={generateFromRules}
                  disabled={smartRules.every(rule => !rule.value)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  <Filter size={16} className="inline mr-1" /> Generate Playlist
                </button>
              </div>
            </div>
          )}
          
          {/* Selected Tracks */}
          <div>
            <div className="flex justify-between items-center">
              <div className="font-bold text-red-700">
                Selected Tracks ({selectedTracks.filter(t => !['processing', 'no-matches', 'error'].includes(t.id)).length})
              </div>
              <div className="text-sm text-red-600">
                Total Duration: {formatDuration(totalDuration)}
              </div>
            </div>
            
            {selectedTracks.length > 0 ? (
              <div className="mt-2 border border-red-200 rounded overflow-hidden">
                {selectedTracks.map((track, index) => {
                  // Special handling for system messages
                  if (['processing', 'no-matches', 'error'].includes(track.id)) {
                    return (
                      <div key={track.id} className="p-3 bg-red-50 text-center">
                        <div className="font-medium text-red-700">{track.trackName}</div>
                        <div className="text-sm text-red-600">{track.artist}</div>
                      </div>
                    );
                  }
                  
                  // Normal track display
                  return (
                    <div 
                      key={track.id}
                      className={`p-2 flex justify-between items-center ${
                        index % 2 === 0 ? 'bg-red-50' : 'bg-white'
                      } ${dragOverIndex === index ? 'border-2 border-red-400' : ''}`}
                      draggable={true}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={handleDrop}
                      onDragEnd={() => {
                        setDraggedTrackIndex(null);
                        setDragOverIndex(null);
                      }}
                    >
                      <div className="flex items-center">
                        <div className="text-red-500 mr-2">{index + 1}.</div>
                        <div>
                          <div className="font-medium text-red-700">{track.trackName}</div>
                          <div className="text-sm text-red-600">
                            {track.artist} {track.albumName ? `• ${track.albumName}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {activeTrackForPosition === index ? (
                          <div className="flex items-center">
                            <input
                              type="number"
                              value={customTrackPosition}
                              onChange={(e) => setCustomTrackPosition(e.target.value)}
                              className="w-12 px-1 py-0.5 border rounded text-xs text-red-700 mr-1"
                              min="1" 
                              max={selectedTracks.length}
                            />
                            <button 
                              onClick={() => moveTrackToPosition(index, customTrackPosition)}
                              className="p-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                            >
                              Go
                            </button>
                            <button 
                              onClick={() => setActiveTrackForPosition(null)}
                              className="p-1 ml-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setActiveTrackForPosition(index);
                              setCustomTrackPosition(index + 1);
                            }}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Set position"
                          >
                            #
                          </button>
                        )}
                        <button 
                          onClick={() => moveTrack(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-red-600 hover:text-red-800 disabled:text-red-300"
                          title="Move up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button 
                          onClick={() => moveTrack(index, 'down')}
                          disabled={index === selectedTracks.length - 1}
                          className="p-1 text-red-600 hover:text-red-800 disabled:text-red-300"
                          title="Move down"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button 
                          onClick={() => removeTrack(track.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Remove track"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 p-4 text-center text-red-400 border border-dashed border-red-300 rounded">
                No tracks selected. Search for tracks to add them to your playlist.
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={savePlaylist}
              disabled={!selectedTracks.some(t => !['processing', 'no-matches', 'error'].includes(t.id))}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              Save Playlist
            </button>
            <button
              onClick={exportPlaylist}
              disabled={!selectedTracks.some(t => !['processing', 'no-matches', 'error'].includes(t.id))}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              Export as M3U
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <h3 className="font-bold text-red-700">Saved Playlists</h3>
          
          {savedPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPlaylists.map(playlist => (
                <div key={playlist.id} className="border border-red-200 rounded p-4 hover:border-red-400">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-red-600">{playlist.name}</h4>
                    <div className="text-sm text-red-500">
                      {new Date(playlist.created).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm text-red-600 mt-1">
                    {playlist.tracks.length} tracks • 
                    {formatDuration(playlist.tracks.reduce((total, track) => 
                      total + (track.totalPlayed / Math.max(1, track.playCount)), 0))}
                  </div>
                  <div className="mt-3 flex justify-between">
                    <button
                      onClick={() => loadPlaylist(playlist)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePlaylist(playlist.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-red-400 border border-dashed border-red-300 rounded">
              No saved playlists. Create and save a playlist to see it here.
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'export' && (
        <div className="space-y-4">
          <div>
            <label className="block text-red-700 mb-1">Base Music Path:</label>
            <input
              type="text"
              value={musicBasePath}
              onChange={(e) => setMusicBasePath(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-700"
              placeholder="e.g. /Music/Downloads or C:/Music"
            />
            <p className="text-xs text-red-600 mt-1">
              This will be the base path for your music files in the exported playlist.
            </p>
          </div>
          
          <div>
            <label className="block text-red-700 mb-1">Path Format:</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center text-red-700">
                <input
                  type="radio"
                  checked={pathFormat === 'default'}
                  onChange={() => setPathFormat('default')}
                  className="mr-2"
                />
                <span>Default (BasePath/Artist/Artist-Album/Track.ext)</span>
              </label>
              <label className="flex items-center text-red-700">
                <input
                  type="radio"
                  checked={pathFormat === 'custom'}
                  onChange={() => setPathFormat('custom')}
                  className="mr-2"
                />
                <span>Custom Format</span>
              </label>
            </div>
            
            {pathFormat === 'custom' && (
              <div className="mt-2">
                <input
                  type="text"
                  value={customPathFormat}
                  onChange={(e) => setCustomPathFormat(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-700"
                  placeholder="Custom path format"
                />
                <div className="text-xs text-red-600 mt-1">
                  <p>Available placeholders:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>{'{basePath}'} - Your base music path</li>
                    <li>{'{artist}'} - Artist name</li>
                    <li>{'{album}'} - Album name</li>
                    <li>{'{track}'} - Track name</li>
                    <li>{'{ext}'} - File extension</li>
                    <li>{'{index}'} - Track number (001, 002, etc.)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-red-700 mb-1">File Extension:</label>
            <select
              value={fileExtension}
              onChange={(e) => setFileExtension(e.target.value)}
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-700"
            >
              <option value="mp3">mp3</option>
              <option value="flac">flac</option>
              <option value="m4a">m4a</option>
              <option value="ogg">ogg</option>
              <option value="wav">wav</option>
            </select>
          </div>
          
          <div className="text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded">
            <p className="font-medium">Path Preview:</p>
            <p className="font-mono mt-1">
              {pathFormat === 'default' 
                ? `${musicBasePath}/Artist/Artist-Album/Track.${fileExtension}`
                : customPathFormat
                    .replace('{basePath}', musicBasePath)
                    .replace('{artist}', 'Artist')
                    .replace('{album}', 'Album')
                    .replace('{track}', 'Track')
                    .replace('{ext}', fileExtension)
                    .replace('{index}', '001')
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomPlaylistCreator;