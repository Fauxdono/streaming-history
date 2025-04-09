import Papa from 'papaparse';
import _ from 'lodash';
import * as XLSX from 'xlsx';

// Define service-related constants once (unchanged)
export const STREAMING_TYPES = {
  SPOTIFY: 'spotify',
  APPLE_MUSIC: 'apple_music',
  YOUTUBE_MUSIC: 'youtube_music',
  TIDAL: 'tidal',
  DEEZER: 'deezer',
  SOUNDCLOUD: 'soundcloud' 
};

export const STREAMING_SERVICES = {
  [STREAMING_TYPES.SPOTIFY]: {
    name: 'Spotify',
    downloadUrl: 'https://www.spotify.com/account/privacy/',
    instructions: 'Request your "Extended streaming history" and wait for the email (can take up to 5 days). filenames:Streaming_History_Audio_2023-2024_14',
    acceptedFormats: '.json'
  },
  [STREAMING_TYPES.APPLE_MUSIC]: {
    name: 'Apple Music',
    downloadUrl: 'https://privacy.apple.com/',
    instructions: 'Go to URL and request a copy of your data and open Apple_Media_Services/Apple Music Activity/Apple Music - Play History Daily Tracks',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.YOUTUBE_MUSIC]: {
    name: 'YouTube Music',
    downloadUrl: 'https://takeout.google.com/',
    instructions: 'THIS ONE MIGHT NOT WORK BECAUSE I DONT HAVE YOUTUBE MUSIC FILES. PLEASE SEND ME IF YOU HAVE SO I CAN MAKE IT WORK :), Select YouTube and YouTube Music data in Google Takeout',
    acceptedFormats: '.json,.csv'
  },
  [STREAMING_TYPES.DEEZER]: {
    name: 'Deezer',
    downloadUrl: 'https://www.deezer.com/account',
    instructions: 'Go to Account Settings and in the third tab Private information above your birthdate you see My personal data next to Privacy Settings press then download your listening history',
    acceptedFormats: '.csv,.xlsx'
  },
  [STREAMING_TYPES.SOUNDCLOUD]: {
    name: 'SoundCloud',
    instructions: 'You have to send customer service a mail for your SoundCloud history. Mine only went back to 2024 so it isn\'t that comprehensive for me',
    downloadUrl: 'https://soundcloud.com/settings/account',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.TIDAL]: {
    name: 'Tidal',
    downloadUrl: 'support@tidal.com',
    instructions: 'send an email to Tidal to request data and wait for 2-4 weeks for it to come',
    acceptedFormats: '.csv'
  }
};

// Precompile regex patterns for normalizeString function to avoid recreating them on each call
const FEATURE_PATTERNS = [
  // Parentheses/brackets formats
  /\(feat\.\s*(.*?)\)/gi,
  /\[feat\.\s*(.*?)\]/gi,
  /\(ft\.\s*(.*?)\)/gi,
  /\[ft\.\s*(.*?)\]/gi,
  /\(with\s*(.*?)\)/gi,
  /\[with\s*(.*?)\)/gi,
  /\(and\s*(.*?)\)/gi,
  /\[and\s*(.*?)\)/gi,
  
  // Without parentheses/brackets
  /\sfeat\.\s+(.*?)(?=\s*[-,]|$)/gi,
  /\sft\.\s+(.*?)(?=\s*[-,]|$)/gi,
  /\sfeaturing\s+(.*?)(?=\s*[-,]|$)/gi,
  /\swith\s+(.*?)(?=\s*[-,]|$)/gi,
  
  // Hyphenated formats
  /\s-\s+feat\.\s+(.*?)(?=\s*[-,]|$)/gi,
  /\s-\s+ft\.\s+(.*?)(?=\s*[-,]|$)/gi
];

// Common clutter patterns for track cleaning
const CLUTTER_PATTERNS = [
  /\(bonus track\)/gi,
  /\[bonus track\]/gi,
  /\(.*?version\)/gi,
  /\[.*?version\]/gi,
  /\(.*?edit\)/gi,
  /\[.*?edit\)/gi,
  /\(.*?remix\)/gi,
  /\[.*?remix\)/gi,
];

// Optimized normalizeString function
function normalizeString(str) {
  if (!str) return { normalized: '', featureArtists: [] };
  
  // Extract feature artists
  let featureArtists = [];
  let normalized = str;
  
  // Extract all patterns in one pass
  for (const pattern of FEATURE_PATTERNS) {
    const regExp = new RegExp(pattern.source, pattern.flags);
    let match;
    
    while ((match = regExp.exec(str)) !== null) {
      if (match && match[1]) {
        // Clean up the extracted artist name
        let artist = match[1].trim().replace(/[.,;:!?]+$/, '');
        featureArtists.push(artist);
        
        // Also remove the match from normalized string
        const matchText = match[0];
        normalized = normalized.replace(matchText, ' ');
      }
    }
  }
  
  // Clean up in a single pass rather than multiple replacements
  for (const pattern of CLUTTER_PATTERNS) {
    normalized = normalized.replace(pattern, '');
  }
  
  // Clean up the normalized string
  normalized = normalized.toLowerCase()
    .replace(/\s+/g, ' ')      // Collapse multiple spaces
    .replace(/\s-\s/g, ' ')    // Remove " - " separators
    .replace(/^\s*-\s*/, '')   // Remove leading dash
    .replace(/\s*-\s*$/, '')   // Remove trailing dash
    .replace(/[^\w\s]/g, '')   // Remove non-alphanumeric except spaces
    .trim();
  
  return {
    normalized,
    featureArtists: featureArtists.length > 0 ? featureArtists : null
  };
}

// Optimized filter function using date caching
function filterDataByDate(data, dateFilter) {
  // If no date filter, return all data
  if (!dateFilter || dateFilter === 'all') {
    return data;
  }

  // Check if we have year-month-day format (YYYY-MM-DD)
  if (dateFilter.includes('-') && dateFilter.split('-').length === 3) {
    const [year, month, day] = dateFilter.split('-').map(Number);
    
    // Filter to exactly this date
    return data.filter(entry => {
      try {
        // Cache date object if not already present
        if (!entry._dateObj) {
          entry._dateObj = new Date(entry.ts);
        }
        const date = entry._dateObj;
        
        return date.getFullYear() === year &&
               date.getMonth() + 1 === month && // JavaScript months are 0-based
               date.getDate() === day;
      } catch (err) {
        return false;
      }
    });
  }
  
  // Check if we have year-month format (YYYY-MM)
  if (dateFilter.includes('-') && dateFilter.split('-').length === 2) {
    const [year, month] = dateFilter.split('-').map(Number);
    
    // Filter to this month
    return data.filter(entry => {
      try {
        // Cache date object if not already present
        if (!entry._dateObj) {
          entry._dateObj = new Date(entry.ts);
        }
        const date = entry._dateObj;
        
        return date.getFullYear() === year &&
               date.getMonth() + 1 === month; // JavaScript months are 0-based
      } catch (err) {
        return false;
      }
    });
  }
  
  // Otherwise, it's just a year
  const year = parseInt(dateFilter);
  if (!isNaN(year)) {
    return data.filter(entry => {
      try {
        // Cache date object if not already present
        if (!entry._dateObj) {
          entry._dateObj = new Date(entry.ts);
        }
        const date = entry._dateObj;
        
        return date.getFullYear() === year;
      } catch (err) {
        return false;
      }
    });
  }
  
  // If we get here, something's wrong with the date filter
  console.warn("Invalid date filter format:", dateFilter);
  return data;
}

// Optimized createMatchKey function
function createMatchKey(trackName, artistName) {
  if (!trackName || !artistName) return '';
  
  // Get normalized track name
  const trackResult = normalizeString(trackName);
  const cleanTrack = trackResult.normalized;
  
  // Extract primary artist efficiently
  let primaryArtist = artistName;
  
  // Try ampersand separator first (most common)
  const ampIndex = artistName.indexOf('&');
  if (ampIndex > 0) {
    primaryArtist = artistName.substring(0, ampIndex).trim();
  } 
  // Then try comma separator
  else {
    const commaIndex = artistName.indexOf(',');
    if (commaIndex > 0) {
      primaryArtist = artistName.substring(0, commaIndex).trim();
    }
    // Finally try feat/ft separator
    else {
      const featIndex = artistName.toLowerCase().indexOf(' feat');
      if (featIndex > 0) {
        primaryArtist = artistName.substring(0, featIndex).trim();
      } else {
        const ftIndex = artistName.toLowerCase().indexOf(' ft');
        if (ftIndex > 0) {
          primaryArtist = artistName.substring(0, ftIndex).trim();
        }
      }
    }
  }
  
  // Normalize the primary artist
  const artistResult = normalizeString(primaryArtist);
  const cleanArtist = artistResult.normalized;
  
  return `${cleanTrack}-${cleanArtist}`;
}

// Helper function for consistent album name normalization
function normalizeAlbumName(albumName) {
  if (!albumName) return '';
  return albumName.toLowerCase()
    // Remove deluxe/special edition markers
    .replace(/(\(|\[)?\s*(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\s*edition)?\s*(\)|\])?/gi, '')
    // Remove years in parentheses like (2019) or [2019]
    .replace(/(\(|\[)\s*\d{4}\s*(\)|\])/g, '')
    // Remove feat. artist parts
    .replace(/(\(|\[)?\s*feat\..*(\)|\])?/gi, '')
    // Clean up remaining parentheses and brackets
    .replace(/(\(|\[)\s*(\)|\])/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Simplified parseListeningTime - we don't need all the if/else branches
function parseListeningTime(timeValue) {
  // Default play time (3.5 minutes)
  let ms_played = 210000;
  
  try {
    if (!timeValue) return ms_played;
    
    if (typeof timeValue === 'number') {
      // If it's already a number, assume it's in seconds
      return timeValue * 1000;
    }
    
    if (typeof timeValue === 'string') {
      // Check for MM:SS or HH:MM:SS format
      const timeParts = timeValue.split(':').map(Number);
      if (timeParts.length === 2) {
        // MM:SS format
        return (timeParts[0] * 60 + timeParts[1]) * 1000;
      } else if (timeParts.length === 3) {
        // HH:MM:SS format
        return ((timeParts[0] * 60 + timeParts[1]) * 60 + timeParts[2]) * 1000;
      } else {
        // Try to parse as a number directly
        const num = parseFloat(timeValue);
        if (!isNaN(num)) {
          return (num < 30 ? num * 60 : num) * 1000;
        }
      }
    }
  } catch (e) {
    console.warn('Error parsing listening time:', timeValue, e);
  }
  
  return ms_played;
}

// Keep the processor functions with minor optimizations

async function processSoundcloudCSV(content) {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (results) => {
        console.log('Soundcloud CSV headers:', results.meta.fields);
        
        const transformedData = results.data
          .filter(row => row['play_time'] && row['track_title'])
          .map(row => {
            // Parse the play time
            const playTime = new Date(row.play_time);
            
            // Extract artist and track name from track_title
            let artist = "Unknown Artist";
            let trackName = row.track_title;
            
            // Handle different track title formats
            if (row.track_title.includes(" - ")) {
              // Standard "Artist - Track" format
              const parts = row.track_title.split(" - ");
              artist = parts[0].trim();
              trackName = parts.slice(1).join(" - ").trim();
            } else if (row.track_title.match(/^.*?\s+feat\.|ft\.|\(feat\.|\(ft\./i)) {
              // Handle "Artist feat. Someone" format
              const match = row.track_title.match(/^(.*?)\s+(feat\.|ft\.|\(feat\.|\(ft\.)/i);
              if (match) {
                artist = match[1].trim();
                trackName = row.track_title.substring(match[0].length).trim();
              }
            }
            
            // Extract username from URL
            const urlParts = row.track_url ? row.track_url.split('/') : [];
            const uploader = urlParts[3] || "unknown";
            
            // Determine estimated duration based on track type
            let estimatedDuration = 210000; // Default: 3.5 minutes
            const lcTitle = trackName.toLowerCase();
            
            if (lcTitle.includes("podcast") || lcTitle.includes("episode") || 
                lcTitle.includes("mix") || lcTitle.includes("set")) {
              estimatedDuration = 1800000; // 30 minutes for podcasts/mixes
            } else if (lcTitle.includes("intro") || lcTitle.includes("skit")) {
              estimatedDuration = 90000; // 1.5 minutes for intros/skits
            }
            
            return {
              ts: playTime,
              ms_played: estimatedDuration,
              master_metadata_track_name: trackName,
              master_metadata_album_artist_name: artist,
              master_metadata_album_album_name: uploader, // Use uploader as album name
              reason_start: "trackdone",
              reason_end: "trackdone",
              shuffle: false,
              skipped: false,
              platform: "SOUNDCLOUD",
              source: "soundcloud",
              username: uploader,
              url: row.track_url
            };
          });
        
        console.log(`Transformed ${transformedData.length} Soundcloud entries`);
        resolve(transformedData);
      },
      error: (error) => {
        console.error('Error parsing Soundcloud CSV:', error);
        resolve([]);
      }
    });
  });
}

// Simplified isTidalCSV function
function isTidalCSV(content) {
  try {
    if (!content || typeof content !== 'string') {
      return false;
    }
    
    // Just check the first line for Tidal-specific headers
    const firstLine = content.split('\n')[0]?.toLowerCase() || '';
    
    // Check for required Tidal headers
    return ['artist_name', 'track_title', 'entry_date', 'stream_duration_ms']
      .every(header => firstLine.includes(header));
  } catch (error) {
    console.warn('Error checking if CSV is Tidal format:', error);
    return false;
  }
}

// Now the most important optimization for calculatePlayStats - this function is the main bottleneck
function calculatePlayStats(entries) {
  console.time('calculatePlayStats');
  
  // Initialize result objects
  const allSongs = [];
  const artistStats = {};
  const albumStats = {};
  const songPlayHistory = {};
  const serviceListeningTime = {};
  let totalListeningTime = 0;
  let processedSongs = 0;
  let shortPlays = 0;

  // Use Map for better performance with large datasets
  const trackMap = new Map();
  const albumLookup = new Map();
  const featureArtistLookup = new Map();
  const isrcMap = new Map();
  const trackToAlbumMap = new Map();
  const albumToTracksMap = new Map();

  // Pre-process dates for all entries at once instead of repeatedly parsing
  entries.forEach(entry => {
    if (!entry._dateObj && entry.ts) {
      try {
        entry._dateObj = entry.ts instanceof Date ? entry.ts : new Date(entry.ts);
      } catch (e) {
        // Invalid date, ignore
      }
    }
  });

  // First pass - collect album information in a single loop
  entries.forEach(entry => {
    if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
      const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
      
      if (albumName !== 'Unknown Album') {
        const trackName = entry.master_metadata_track_name.toLowerCase().trim();
        const artistName = entry.master_metadata_album_artist_name.toLowerCase().trim();
        const trackKey = `${trackName}|||${artistName}`;
        
        // Store album information
        trackToAlbumMap.set(trackKey, {
          albumName: albumName,
          normalizedAlbumName: normalizeAlbumName(albumName),
          source: entry.source || 'unknown'
        });
        
        // Track which tracks belong to each album
        const albumKey = `${normalizeAlbumName(albumName)}|||${artistName}`;
        if (!albumToTracksMap.has(albumKey)) {
          albumToTracksMap.set(albumKey, new Set());
        }
        albumToTracksMap.get(albumKey).add(trackName);
      }
      
      // Also collect ISRC codes and feature artists in this pass
      if (entry.master_metadata_track_name) {
        // Process track info once
        const trackInfo = normalizeString(entry.master_metadata_track_name);
        const artistInfo = normalizeString(entry.master_metadata_album_artist_name || 'Unknown Artist');
        const lookupKey = `${trackInfo.normalized}|||${artistInfo.normalized}`;
        
        // Store feature artists
        if (trackInfo.featureArtists && trackInfo.featureArtists.length > 0) {
          featureArtistLookup.set(lookupKey, trackInfo.featureArtists);
        }
        
        // Store ISRC codes
        if (entry.master_metadata_external_ids?.isrc) {
          isrcMap.set(entry.master_metadata_external_ids.isrc, lookupKey);
        } else if (entry.isrc) {
          isrcMap.set(entry.isrc, lookupKey);
        }
        
        // Store album info preferring Spotify source
        if (entry.master_metadata_album_album_name) {
          if (entry.source === 'spotify' || !albumLookup.has(lookupKey)) {
            albumLookup.set(lookupKey, entry.master_metadata_album_album_name);
          }
        }
      }
    }
  });

  // Main processing pass - combine everything into a single loop instead of multiple passes
  entries.forEach(entry => {
    const playTime = entry.ms_played;
    
    // Skip invalid entries
    if (!entry.master_metadata_track_name || playTime < 30000) {
      if (playTime < 30000) shortPlays++;
      return;
    }

    processedSongs++;
    totalListeningTime += playTime;

    // Track service listening time
    const service = entry.source || 'unknown';
    serviceListeningTime[service] = (serviceListeningTime[service] || 0) + playTime;

    const trackName = entry.master_metadata_track_name;
    const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
    
    // Efficiently get normalized versions
    const trackInfo = normalizeString(trackName);
    const artistInfo = normalizeString(artistName);
    const normTrack = trackInfo.normalized;
    const normArtist = artistInfo.normalized;
    
    // Extract all feature artists in one go
    let featureArtists = [];
    
    // Add features from track name
    if (trackInfo.featureArtists) {
      featureArtists = [...featureArtists, ...trackInfo.featureArtists];
    }
    
    // Add features from artist name
    if (artistInfo.featureArtists) {
      featureArtists = [...featureArtists, ...artistInfo.featureArtists];
    }
    
    // Check for & format in artist name (one check instead of regex)
    if (artistName.includes('&')) {
      const artistParts = artistName.split(/\s*&\s*/);
      // Add all parts after the first as features
      if (artistParts.length > 1) {
        artistParts.slice(1).forEach(part => {
          if (!featureArtists.includes(part.trim())) {
            featureArtists.push(part.trim());
          }
        });
      }
    }
    
    // Get primary artist efficiently
    let primaryArtist = artistName;
    
    // Try ampersand separator first (most common)
    const ampIndex = artistName.indexOf('&');
    if (ampIndex > 0) {
      primaryArtist = artistName.substring(0, ampIndex).trim();
    } 
    // Then try comma separator
    else {
      const commaIndex = artistName.indexOf(',');
      if (commaIndex > 0) {
        primaryArtist = artistName.substring(0, commaIndex).trim();
      }
      // Finally try feat/ft separator
      else {
        const featIndex = artistName.toLowerCase().indexOf(' feat');
        if (featIndex > 0) {
          primaryArtist = artistName.substring(0, featIndex).trim();
        } else {
          const ftIndex = artistName.toLowerCase().indexOf(' ft');
          if (ftIndex > 0) {
            primaryArtist = artistName.substring(0, ftIndex).trim();
          }
        }
      }
    }
    
    // Use lookupKey for matching across sources
    const lookupKey = `${normTrack}|||${normArtist}`;
    
    // Check for ISRC match
    let matchKeyFromIsrc = null;
    if (entry.master_metadata_external_ids?.isrc && isrcMap.has(entry.master_metadata_external_ids.isrc)) {
      matchKeyFromIsrc = isrcMap.get(entry.master_metadata_external_ids.isrc);
    } else if (entry.isrc && isrcMap.has(entry.isrc)) {
      matchKeyFromIsrc = isrcMap.get(entry.isrc);
    }
    
    const finalLookupKey = matchKeyFromIsrc || lookupKey;
    
    // Determine album name efficiently
    let albumName = 'Unknown Album';
    
    if (entry.source === 'spotify' && entry.master_metadata_album_album_name) {
      albumName = entry.master_metadata_album_album_name;
    } else {
      const trackKey = `${normTrack}|||${normArtist}`;
      
      if (trackToAlbumMap.has(trackKey)) {
        albumName = trackToAlbumMap.get(trackKey).albumName;
      } else if (albumLookup.has(finalLookupKey)) {
        albumName = albumLookup.get(finalLookupKey);
      }
    }
    
    // Get lookup features
    if (featureArtistLookup.has(finalLookupKey)) {
      const lookupFeatures = featureArtistLookup.get(finalLookupKey);
      lookupFeatures.forEach(artist => {
        if (!featureArtists.includes(artist)) {
          featureArtists.push(artist);
        }
      });
    }
    
    // Create a match key for deduplication
    const enhancedMatchKey = createMatchKey(trackName, primaryArtist);
    
    // Handle timestamp efficiently
    let timestamp = entry._dateObj || new Date();

    // Create key for play history
    const standardKey = `${trackName}-${artistName}`;
    
    // Track play history
    if (!songPlayHistory[standardKey]) {
      songPlayHistory[standardKey] = [];
    }
    
    songPlayHistory[standardKey].push(timestamp.getTime());

    // Artist stats
    if (!artistStats[artistName]) {
      artistStats[artistName] = {
        name: artistName,
        totalPlayed: 0,
        playCount: 0,
        firstListen: timestamp.getTime(),
        firstSong: trackName,
        firstSongPlayCount: 1
      };
    } else {
      // Update running totals
      artistStats[artistName].totalPlayed += playTime;
      artistStats[artistName].playCount++;
      
      // If this timestamp is earlier than the current firstListen, update the first song
      if (timestamp.getTime() < artistStats[artistName].firstListen) {
        artistStats[artistName].firstListen = timestamp.getTime();
        artistStats[artistName].firstSong = trackName;
        artistStats[artistName].firstSongPlayCount = 1;
      } 
      // If this is the same song as the first song, increment its counter
      else if (trackName === artistStats[artistName].firstSong) {
        artistStats[artistName].firstSongPlayCount = (artistStats[artistName].firstSongPlayCount || 0) + 1;
      }
    }

    // Album stats
    if (albumName && artistName) {
      const normalizedAlbumName = normalizeAlbumName(albumName);
      const normalizedArtistName = artistName.toLowerCase().trim();
      const albumKey = `${normalizedAlbumName}-${normalizedArtistName}`;
      
      // Get track count from mapping
      const fullAlbumKey = `${normalizedAlbumName}|||${normalizedArtistName}`;
      const expectedTrackCount = albumToTracksMap.has(fullAlbumKey) ? 
                               albumToTracksMap.get(fullAlbumKey).size : 0;
      
      if (!albumStats[albumKey]) {
        albumStats[albumKey] = {
          name: albumName,
          artist: artistName,
          totalPlayed: 0,
          playCount: 0,
          trackCount: new Set(),
          trackNames: new Set(),
          trackObjects: [],
          expectedTrackCount: expectedTrackCount,
          firstListen: timestamp.getTime(),
          isComplete: false,
          years: new Set()
        };
      }

      // Add year to the set
      if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
        albumStats[albumKey].years.add(timestamp.getFullYear());
      }
          
      albumStats[albumKey].totalPlayed += playTime;
      albumStats[albumKey].playCount++;
      albumStats[albumKey].trackCount.add(normTrack);
      albumStats[albumKey].trackNames.add(trackName);
      
      // Efficiently update track objects
      const existingTrackIndex = albumStats[albumKey].trackObjects.findIndex(
        t => t.trackName === trackName
      );
      
      if (existingTrackIndex === -1) {
        // Add new track
        albumStats[albumKey].trackObjects.push({
          trackName,
          artist: artistName,
          totalPlayed: playTime,
          playCount: 1,
          albumName
        });
      } else {
        // Update existing track stats
        albumStats[albumKey].trackObjects[existingTrackIndex].totalPlayed += playTime;
        albumStats[albumKey].trackObjects[existingTrackIndex].playCount++;
      }
      
      // Update expected track count if needed
      if (albumStats[albumKey].trackCount.size > albumStats[albumKey].expectedTrackCount) {
        albumStats[albumKey].expectedTrackCount = albumStats[albumKey].trackCount.size;
      }
      
      // Mark as complete if we've found all expected tracks
      if (expectedTrackCount > 0 && albumStats[albumKey].trackCount.size >= expectedTrackCount) {
        albumStats[albumKey].isComplete = true;
      }
      
      albumStats[albumKey].firstListen = Math.min(
        albumStats[albumKey].firstListen, 
        timestamp.getTime()
      );
    }

    // Track handling with Map instead of object for better performance
    if (trackMap.has(enhancedMatchKey)) {
      // Update existing track
      const track = trackMap.get(enhancedMatchKey);
      track.totalPlayed += playTime;
      track.playCount++;
      
      // Update album info if better one is available
      if (albumName !== 'Unknown Album' && 
          (track.albumName === 'Unknown Album' || entry.source === 'spotify')) {
        track.albumName = albumName;
      }
      
      // Add variation if new
      if (!track.variations.some(v => 
          v.trackName === trackName && v.artistName === artistName)) {
        track.variations.push({ 
          trackName, 
          artistName, 
          source: entry.source || 'unknown',
          isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
        });
      }
      
      // Update feature artists
      featureArtists.forEach(artist => {
        if (!track.featureArtists.some(a => a.toLowerCase() === artist.toLowerCase())) {
          track.featureArtists.push(artist);
        }
      });
      
      // Store ISRC if available and not already stored
      if ((entry.master_metadata_external_ids?.isrc || entry.isrc) && !track.isrc) {
        track.isrc = entry.master_metadata_external_ids?.isrc || entry.isrc;
      }
    } else {
      // Create a new track entry
      trackMap.set(enhancedMatchKey, {
        key: standardKey,
        trackName,
        artist: primaryArtist,
        fullArtist: artistName,
        albumName,
        totalPlayed: playTime,
        playCount: 1,
        variations: [{ 
          trackName, 
          artistName, 
          source: entry.source || 'unknown',
          isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
        }],
        featureArtists: featureArtists.length > 0 ? featureArtists : [],
        isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
      });
    }
  });
  
  // Process tracks for display
  trackMap.forEach((track) => {
    // Choose best version for display
    if (track.variations && track.variations.length > 1) {
      // Sort variations by preference
      const sortedVariations = [...track.variations].sort((a, b) => {
        // Spotify source is preferred
        if (a.source === 'spotify' && b.source !== 'spotify') return -1;
        if (b.source === 'spotify' && a.source !== 'spotify') return 1;
        
        // Prefer entries with feat/ft in the track name
        const aHasFeat = /feat\.|ft\.|with/i.test(a.trackName);
        const bHasFeat = /feat\.|ft\.|with/i.test(b.trackName);
        if (aHasFeat && !bHasFeat) return -1;
        if (bHasFeat && !aHasFeat) return 1;
        
        // Prefer entries with & in the artist name
        const aHasAmp = a.artistName.includes('&');
        const bHasAmp = b.artistName.includes('&');
        if (aHasAmp && !bHasAmp) return -1;
        if (bHasAmp && !aHasAmp) return 1;
        
        return 0;
      });
      
      // Use best variation
      const bestVariation = sortedVariations[0];
      track.displayName = bestVariation.trackName;
      track.displayArtist = bestVariation.artistName;
    } else {
      track.displayName = track.trackName;
      track.displayArtist = track.fullArtist || track.artist;
    }
    
    allSongs.push(track);
  });

  // Process album stats
  Object.values(albumStats).forEach(album => {
    // Sort tracks by total played time
    album.trackObjects.sort((a, b) => b.totalPlayed - a.totalPlayed);
    
    // Ensure trackCount is converted to a number
    album.trackCountValue = album.trackCount.size;
    
    // Convert years Set to Array
    album.yearsArray = Array.from(album.years).sort();
  });

  console.timeEnd('calculatePlayStats');
  
  return {
    songs: allSongs,
    artists: artistStats,
    albums: albumStats,
    playHistory: songPlayHistory,
    totalListeningTime,
    serviceListeningTime,
    processedSongs,
    shortPlays
  };
}

export const streamingProcessor = {
  async processFiles(files) {
    console.time('processFiles');
    try {
      let allProcessedData = [];
      
      // Process batches of files in parallel
      const batchSize = 5; // Process 5 files at a time
      const fileBatches = [];
      
      // Split files into batches
      for (let i = 0; i < files.length; i += batchSize) {
        fileBatches.push(Array.from(files).slice(i, i + batchSize));
      }
      
      // Process each batch sequentially to avoid memory issues
      for (const batch of fileBatches) {
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            try {
              // Spotify JSON files
              if (file.name.includes('Streaming_History') && file.name.endsWith('.json')) {
                const content = await file.text();
                const data = JSON.parse(content);
                return data.map(entry => ({
                  ...entry,
                  source: 'spotify'
                }));
              }
              
              // Apple Music CSV files
              else if (file.name.toLowerCase().includes('apple') && file.name.endsWith('.csv')) {
                const content = await file.text();
                return await processAppleMusicCSV(content);
              }
              
              // Tidal CSV files
              else if (file.name.toLowerCase().includes('tidal') && file.name.endsWith('.csv')) {
                const content = await file.text();
                return await processTidalCSV(content);
              }
              
              // Generic CSV files - check if they're Tidal or Soundcloud by content
              else if (file.name.endsWith('.csv')) {
                const content = await file.text();
                
                // Check if it's a Soundcloud CSV
                if (content.includes('play_time') && content.includes('track_title')) {
                  return await processSoundcloudCSV(content);
                }
                
                // Check if it's a Tidal CSV
                if (isTidalCSV(content)) {
                  return await processTidalCSV(content);
                }
              }
              
              // XLSX files (Deezer)
              else if (file.name.endsWith('.xlsx')) {
                return await processDeezerXLSX(file);
              }
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
            }
            return [];
          })
        );
        
        // Combine batch results
        batchResults.forEach(dataArray => {
          if (dataArray && dataArray.length > 0) {
            allProcessedData = [...allProcessedData, ...dataArray];
          }
        });
      }

      // Process ISRC codes from Deezer
      allProcessedData.forEach(item => {
        if (item.source === 'deezer' && item.isrc) {
          item.master_metadata_external_ids = {
            isrc: item.isrc
          };
        }
      });

      console.log(`Calculating stats for ${allProcessedData.length} entries`);
      
      // Calculate primary stats
      const stats = calculatePlayStats(allProcessedData);

      // Process artist stats
      const sortedArtists = Object.values(stats.artists)
        .map(artist => {
          const artistSongs = stats.songs.filter(song => song.artist === artist.name);
          const mostPlayed = _.maxBy(artistSongs, 'playCount') || { trackName: 'Unknown', playCount: 0 };
          
          // Collect all play timestamps for this artist
          const artistPlays = [];
          artistSongs.forEach(song => {
            if (stats.playHistory[song.key]) {
              artistPlays.push(...stats.playHistory[song.key]);
            }
          });

          // Calculate streaks
          const streaks = calculateArtistStreaks(artistPlays);

          return {
            ...artist,
            mostPlayedSong: mostPlayed,
            ...streaks
          };
        })
        .sort((a, b) => b.totalPlayed - a.totalPlayed);

      // Process album stats
      const sortedAlbums = _.orderBy(
        Object.values(stats.albums).map(album => ({
          ...album,
          trackCount: album.trackCount.size
        })),
        ['totalPlayed'],
        ['desc']
      );

      // Get top songs
      const sortedSongs = _.orderBy(stats.songs, ['totalPlayed'], ['desc']).slice(0, 250);

      // Ensure trackCount is properly handled
      const verifiedAlbums = sortedAlbums.map(album => {
        if (typeof album.trackCount === 'object' && album.trackCount instanceof Set) {
          return {
            ...album,
            trackCount: album.trackCount.size
          };
        }
        return album;
      });

      // Calculate derived stats in parallel
      const [songsByYear, briefObsessions, artistsByYear, albumsByYear] = await Promise.all([
        calculateSongsByYear(stats.songs, stats.playHistory),
        calculateBriefObsessions(stats.songs, stats.playHistory),
        calculateArtistsByYear(stats.songs, stats.playHistory, allProcessedData),
        calculateAlbumsByYear(verifiedAlbums, allProcessedData)
      ]);
      
      console.timeEnd('processFiles');

      return {
        stats: {
          totalFiles: files.length,
          totalEntries: allProcessedData.length,
          processedSongs: stats.processedSongs,
          nullTrackNames: allProcessedData.filter(e => !e.master_metadata_track_name).length,
          uniqueSongs: stats.songs.length,
          shortPlays: stats.shortPlays,
          totalListeningTime: stats.totalListeningTime,
          serviceListeningTime: stats.serviceListeningTime
        },
        topArtists: sortedArtists,
        topAlbums: verifiedAlbums,
        processedTracks: sortedSongs,
        songsByYear,
        briefObsessions,
        artistsByYear,
        albumsByYear,
        rawPlayData: allProcessedData
      };
    } catch (error) {
      console.error('Error processing files:', error);
      throw error;
    }
  }
};

// Keep supporting functions

function calculateArtistStreaks(timestamps) {
  // Sort timestamps and convert to unique days (YYYY-MM-DD format)
  const days = [...new Set(
    timestamps.map(ts => new Date(ts).toISOString().split('T')[0])
  )].sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let streakStart = null;
  let streakEnd = null;

  for (let i = 0; i < days.length; i++) {
    const currentDate = new Date(days[i]);
    const previousDate = i > 0 ? new Date(days[i - 1]) : null;
    
    if (!previousDate || 
        (currentDate - previousDate) / (1000 * 60 * 60 * 24) === 1) {
      // Continuing streak
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        streakEnd = currentDate;
        streakStart = new Date(days[i - currentStreak + 1]);
      }
    } else {
      // Break in streak
      currentStreak = 1;
    }
  }

  // Check if current streak is still active
  const lastPlay = new Date(days[days.length - 1]);
  const now = new Date();
  const daysSinceLastPlay = Math.floor((now - lastPlay) / (1000 * 60 * 60 * 24));
  const activeStreak = daysSinceLastPlay <= 1 ? currentStreak : 0;

  return {
    longestStreak,
    currentStreak: activeStreak,
    streakStart,
    streakEnd
  };
}

function calculateBriefObsessions(songs, songPlayHistory) {
  const briefObsessionsArray = [];
 
  songs.forEach(song => {
    if (song.playCount <= 50) {
      const timestamps = songPlayHistory[song.key] || [];
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a - b);
        
        let maxPlaysInWeek = 0;
        let bestWeekStart = null;
        
        for (let i = 0; i < timestamps.length; i++) {
          const weekEnd = new Date(timestamps[i]);
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekStart.getDate() - 7);
          
          // Count plays in this week window efficiently
          let playsInWeek = 0;
          for (let j = 0; j < timestamps.length; j++) {
            const ts = timestamps[j];
            if (ts >= weekStart && ts <= weekEnd) {
              playsInWeek++;
            }
          }
          
          if (playsInWeek > maxPlaysInWeek) {
            maxPlaysInWeek = playsInWeek;
            bestWeekStart = weekStart;
          }
        }
        
        if (maxPlaysInWeek >= 5) {
          briefObsessionsArray.push({
            ...song,
            intensePeriod: {
              weekStart: bestWeekStart,
              playsInWeek: maxPlaysInWeek
            }
          });
        }
      }
    }
  });

  return _.orderBy(
    briefObsessionsArray,
    ['intensePeriod.playsInWeek', 'intensePeriod.weekStart'],
    ['desc', 'asc']
  ).slice(0, 100);
}

async function processTidalCSV(content) {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (results) => {
        console.log('Tidal CSV headers:', results.meta.fields);
        
        const transformedData = results.data
          .filter(row => {
            // Add explicit checks for required fields
            return row.track_title && 
                   row.artist_name && 
                   // Ensure these are actually strings
                   typeof row.track_title === 'string' && 
                   typeof row.artist_name === 'string';
          })
          .map(row => {
            // Parse the timestamp
            let timestamp;
            try {
              timestamp = new Date(row.entry_date);
              // If timestamp parsing fails, use current date as fallback
              if (isNaN(timestamp.getTime())) {
                console.warn('Invalid timestamp in Tidal data:', row.entry_date);
                timestamp = new Date();
              }
            } catch (e) {
              console.warn('Error parsing Tidal timestamp:', e);
              timestamp = new Date(); // Fallback to current date
            }
            
            // Make sure stream_duration_ms is a number
            const duration = typeof row.stream_duration_ms === 'number' ? 
              row.stream_duration_ms : 
              parseFloat(row.stream_duration_ms) || 210000; // Default to 3.5 minutes if parsing fails
            
            // Create standardized entry
            // Ensure strings are used
            return {
              ts: timestamp,
              ms_played: duration,
              master_metadata_track_name: String(row.track_title || 'Unknown Track'),
              master_metadata_album_artist_name: String(row.artist_name || 'Unknown Artist'),
              master_metadata_album_album_name: String(row.album_name || "Unknown Album"),
              reason_start: "trackdone",
              reason_end: "trackdone",
              shuffle: false,
              skipped: false,
              platform: "TIDAL",
              source: "tidal",
              product_type: row.product_type,
              client_name: row.client_name_from_session,
              country: row.country_name,
              region: row.region_name,
              city: row.city_name
            };
          });
        
        console.log(`Transformed ${transformedData.length} Tidal entries`);
        resolve(transformedData);
      },
      error: (error) => {
        console.error('Error parsing Tidal CSV:', error);
        resolve([]);
      }
    });
  });
}

// Simplified calculateSongsByYear that avoids excessive date parsing
function calculateSongsByYear(songs, songPlayHistory) {
  const songsByYear = {};
  let dateErrors = 0;
  
  songs.forEach(song => {
    const timestamps = songPlayHistory[song.key] || [];
    if (timestamps.length > 0) {
      // Group timestamps by year using a more efficient approach
      const years = new Map();
      
      timestamps.forEach(ts => {
        try {
          const date = new Date(ts);
          
          // Check if date is valid
          if (isNaN(date.getTime())) {
            dateErrors++;
            return;
          }
          
          // Check if date is from the future
          const currentYear = new Date().getFullYear();
          const year = date.getFullYear();
          
          if (year > currentYear) {
            dateErrors++;
            return;
          }
          
          // Count by year
          if (!years.has(year)) {
            years.set(year, 0);
          }
          years.set(year, years.get(year) + 1);
          
        } catch (e) {
          dateErrors++;
        }
      });
      
      // Convert to songsByYear format
      years.forEach((count, year) => {
        if (!songsByYear[year]) {
          songsByYear[year] = [];
        }
        
        songsByYear[year].push({
          ...song,
          totalPlayed: song.totalPlayed * (count / timestamps.length),
          playCount: count,
          spotifyScore: Math.pow(count, 1.5)
        });
      });
    }
  });

  // Sort and limit each year's entries
  Object.keys(songsByYear).forEach(year => {
    songsByYear[year] = _.orderBy(songsByYear[year], ['spotifyScore'], ['desc'])
      .slice(0, 100);
  });

  return songsByYear;
}



function calculateAlbumsByYear(albums, rawPlayData) {
  // First, create album ID mapping from all-time data
  const albumMapping = {};
  
  // For each all-time album, create a unique ID and store reference data
  albums.forEach(album => {
    if (!album) return;
    
    // Create a unique ID for this album
    const albumKey = `${album.artist}:::${album.name}`.toLowerCase();
    
    // Get track names from trackNames or trackObjects
    let trackNames = [];
    if (album.trackNames && album.trackNames instanceof Set) {
      trackNames = Array.from(album.trackNames);
    } else if (album.trackObjects && Array.isArray(album.trackObjects)) {
      trackNames = album.trackObjects.map(t => t.trackName || t.displayName).filter(Boolean);
    }
    
    // Store essential data for matching
    albumMapping[albumKey] = {
      name: album.name,
      artist: album.artist,
      allTimeReference: album,
      // Store any album identifiers to help with matching
      trackNames: trackNames,
      trackCount: album.trackCount instanceof Set ? 
                album.trackCount.size : 
                (typeof album.trackCount === 'number' ? album.trackCount : 
                 album.trackCountValue || 0)
    };
    
    // Also create keys for alternate/partial album names
    if (album.name !== 'Unknown Album') {
      // For example, "Mr. Morale & The Big Steppers" might have a variant "Mr. Morale"
      const simplifiedName = album.name.split(/\s+&|\s+and/i)[0].trim();
      if (simplifiedName !== album.name && simplifiedName.length > 5) {
        const altKey = `${album.artist}:::${simplifiedName}`.toLowerCase();
        albumMapping[altKey] = albumMapping[albumKey];
      }
    }
  });
  
  // Function to normalize track names for better matching across services
  function normalizeTrackName(trackName) {
    if (!trackName) return '';
    
    // Convert to lowercase
    let normalized = trackName.toLowerCase()
      // Remove featuring artist info
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\(ft\..*?\)/gi, '')
      .replace(/\(featuring.*?\)/gi, '')
      .replace(/feat\..*?$/gi, '')
      .replace(/ft\..*?$/gi, '')
      
      // Remove remix, version, etc.
      .replace(/\(.*?version\)/gi, '')
      .replace(/\(.*?remix\)/gi, '')
      .replace(/\(.*?edit\)/gi, '')
      
      // Remove parenthetical info
      .replace(/\(.*?\)/gi, '')
      .replace(/\[.*?\]/gi, '')
      
      // Replace vertical bars, periods, and other separators with spaces
      .replace(/[|\-\.l]/g, ' ')
      
      // Remove punctuation
      .replace(/[.,\/#!$%\^&\*;:{}=\_`~()]/g, '')
      
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
      
    return normalized;
  }
  
  // Group plays by year and album AND track
  const playsByYearAndAlbum = {};
  
  // Track relation between normalized tracks and actual track names
  const normalizedToOriginalTrack = {};
  
  // First pass: build normalized track mappings
  rawPlayData.forEach(entry => {
    if (entry.ms_played < 30000 || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) return;
    
    const trackName = entry.master_metadata_track_name;
    const normalizedTrack = normalizeTrackName(trackName);
    
    if (normalizedTrack) {
      if (!normalizedToOriginalTrack[normalizedTrack]) {
        normalizedToOriginalTrack[normalizedTrack] = [trackName];
      } else if (!normalizedToOriginalTrack[normalizedTrack].includes(trackName)) {
        normalizedToOriginalTrack[normalizedTrack].push(trackName);
      }
    }
  });
  
  // Track relationship between tracks and albums
  const trackToAlbumMap = new Map();
  
  // Second pass: build track-to-album mappings to better understand which tracks belong together
  rawPlayData.forEach(entry => {
    if (entry.ms_played < 30000 || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) return;
    
    const artist = entry.master_metadata_album_artist_name;
    const trackName = entry.master_metadata_track_name;
    const normalizedTrack = normalizeTrackName(trackName);
    const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
    
    // Create a key that identifies this track
    const trackKey = `${artist}:::${normalizedTrack}`.toLowerCase();
    
    // If this track explicitly belongs to an album, record this relationship
    if (albumName && albumName !== 'Unknown Album') {
      if (!trackToAlbumMap.has(trackKey)) {
        trackToAlbumMap.set(trackKey, []);
      }
      
      // Add this album to the list if not already present
      const albumList = trackToAlbumMap.get(trackKey);
      const albumInfo = { 
        name: albumName, 
        count: 1,
        source: entry.source || 'unknown'
      };
      
      // Check if this album is already in the list
      const existingIndex = albumList.findIndex(a => a.name.toLowerCase() === albumName.toLowerCase());
      if (existingIndex >= 0) {
        albumList[existingIndex].count++;
      } else {
        albumList.push(albumInfo);
      }
    }
  });
  
  // Process album membership for tracks with multiple albums
  const trackMainAlbum = new Map();
  
  // For each track, determine its main album
  trackToAlbumMap.forEach((albums, trackKey) => {
    if (albums.length === 0) return;
    
    // If only one album, that's the main album
    if (albums.length === 1) {
      trackMainAlbum.set(trackKey, albums[0].name);
      return;
    }
    
    // Multiple albums - select the most common one
    // Prioritize Spotify source if counts are similar
    albums.sort((a, b) => {
      const countDiff = b.count - a.count;
      if (Math.abs(countDiff) > 5) return countDiff; // Clear winner by count
      
      // Similar counts, prioritize by source
      if (a.source === 'spotify' && b.source !== 'spotify') return -1;
      if (b.source === 'spotify' && a.source !== 'spotify') return 1;
      
      return countDiff; // Default to count difference
    });
    
    trackMainAlbum.set(trackKey, albums[0].name);
  });
  
  // Third pass: build year-specific album data
  rawPlayData.forEach(entry => {
    if (entry.ms_played < 30000 || !entry.master_metadata_album_artist_name) return;
    
    try {
      const timestamp = new Date(entry.ts);
      if (isNaN(timestamp.getTime())) return;
      
      const year = timestamp.getFullYear();
      const artist = entry.master_metadata_album_artist_name;
      const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
      const trackName = entry.master_metadata_track_name;
      
      // Skip tracks with no name
      if (!trackName) return;
      
      // Normalize the track name for cross-service comparison
      const normalizedTrack = normalizeTrackName(trackName);
      
      // Check if this track has a known main album that differs from the current album
      const trackKey = `${artist}:::${normalizedTrack}`.toLowerCase();
      const mainAlbum = trackMainAlbum.get(trackKey);
      
      // If this track belongs to a different album according to our mapping, 
      // and the current album is unknown, use the main album instead
      let effectiveAlbumName = albumName;
      if (mainAlbum && albumName === 'Unknown Album') {
        effectiveAlbumName = mainAlbum;
      }
      
      // Create a key for the album
      const albumKey = `${artist}:::${effectiveAlbumName}`.toLowerCase();
      
      // Try to find matching album in our master mapping
      let resolvedAlbumKey = albumKey;
      let resolvedAlbumData = albumMapping[albumKey];
      
      // If not found, try to identify special cases of tracks
      if ((!resolvedAlbumData || effectiveAlbumName === 'Unknown Album') && trackName) {
        // For Unknown Album cases, see if we have a known main album for this track
        if (effectiveAlbumName === 'Unknown Album' && mainAlbum) {
          const mainAlbumKey = `${artist}:::${mainAlbum}`.toLowerCase();
          if (albumMapping[mainAlbumKey]) {
            resolvedAlbumKey = mainAlbumKey;
            resolvedAlbumData = albumMapping[mainAlbumKey];
          }
        }
        
        // If still not found, try to match by track name
        if (!resolvedAlbumData) {
          // Try to find a matching album by artist and track
          for (const [key, data] of Object.entries(albumMapping)) {
            if (key.startsWith(`${artist.toLowerCase()}:::`) && 
                data.trackNames && data.trackNames.some(t => {
                  if (!t) return false;
                  const normalizedAlbumTrack = normalizeTrackName(t);
                  return normalizedAlbumTrack === normalizedTrack || 
                         normalizedAlbumTrack.includes(normalizedTrack) ||
                         normalizedTrack.includes(normalizedAlbumTrack);
                })) {
              resolvedAlbumKey = key;
              resolvedAlbumData = data;
              break;
            }
          }
        }
      }
      
      // Initialize if needed
      if (!playsByYearAndAlbum[year]) {
        playsByYearAndAlbum[year] = {};
      }
      
      if (!playsByYearAndAlbum[year][resolvedAlbumKey]) {
        // Create a completely new album object for this year
        // Don't use the allTimeReference directly to avoid modifying the original data
        playsByYearAndAlbum[year][resolvedAlbumKey] = {
          name: resolvedAlbumData ? resolvedAlbumData.name : effectiveAlbumName,
          artist: artist,
          totalPlayed: 0,
          playCount: 0,
          normalizedTracks: new Set(), // Track normalized track names to avoid duplicates
          tracks: new Set(),   // Track actual track names
          trackObjects: {},    // Use an object with normTrack as keys
          firstListen: timestamp.getTime(),
          // Store reference to all-time data but don't use its play counts
          allTimeReference: resolvedAlbumData?.allTimeReference || null
        };
      }
      
      // Update stats for this year's album
      playsByYearAndAlbum[year][resolvedAlbumKey].totalPlayed += entry.ms_played;
      playsByYearAndAlbum[year][resolvedAlbumKey].playCount++;
      
      if (trackName) {
        // Add the normalized track to avoid duplicates across services
        playsByYearAndAlbum[year][resolvedAlbumKey].normalizedTracks.add(normalizedTrack);
        
        // Add the actual track name
        playsByYearAndAlbum[year][resolvedAlbumKey].tracks.add(trackName);
        
        // Update or add track to trackObjects using the normalized name as key
        if (!playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack]) {
          // Add new track
          playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack] = {
            trackName: trackName,
            normalizedTrack: normalizedTrack,
            artist: artist,
            totalPlayed: entry.ms_played,
            playCount: 1,
            albumName: effectiveAlbumName,
            variations: normalizedToOriginalTrack[normalizedTrack] || [trackName]
          };
        } else {
          // Update existing track
          playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack].totalPlayed += entry.ms_played;
          playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack].playCount++;
          
          // Ensure this variation is in the list
          if (!playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack].variations.includes(trackName)) {
            playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack].variations.push(trackName);
          }
        }
      }
      
      // Update first listen time if earlier
      if (timestamp.getTime() < playsByYearAndAlbum[year][resolvedAlbumKey].firstListen) {
        playsByYearAndAlbum[year][resolvedAlbumKey].firstListen = timestamp.getTime();
      }
    } catch (err) {
      console.warn("Error processing album entry:", err);
    }
  });
  
  // Helper function for album similarity
  function isSimilarAlbum(album1, album2) {
    if (!album1 || !album2) return false;
    
    const norm1 = album1.toLowerCase().trim();
    const norm2 = album2.toLowerCase().trim();
    
    // Direct match
    if (norm1 === norm2) return true;
    
    // Skip if either is unknown
    if (norm1 === 'unknown album' || norm2 === 'unknown album') return false;
    
    // Check for substantial substring match
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const minLength = Math.min(norm1.length, norm2.length);
      
      // Ensure it's a substantial match, not just a short word contained within
      if (minLength >= 5 && 
          (norm1.length <= 2 * norm2.length) && 
          (norm2.length <= 2 * norm1.length)) {
        return true;
      }
    }
    
    // Check for similarity in words (at least 50% of words in common)
    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size > 0 && words2.size > 0) {
      let matchCount = 0;
      words1.forEach(word => {
        if (words2.has(word)) matchCount++;
      });
      
      const matchRatio = matchCount / Math.min(words1.size, words2.size);
      if (matchRatio >= 0.5) return true;
    }
    
    return false;
  }
  
  // Convert to final format
  const result = {};
  
  Object.entries(playsByYearAndAlbum).forEach(([year, albums]) => {
    result[year] = Object.values(albums).map(album => {
      // Convert trackObjects from object to array for easier usage
      const trackObjectsArray = Object.values(album.trackObjects || {}).sort((a, b) => b.totalPlayed - a.totalPlayed);
      
      // Start with a fresh album object for this year
      let yearAlbum = {
        name: album.name,
        artist: album.artist,
        totalPlayed: album.totalPlayed,
        playCount: album.playCount,
        firstListen: album.firstListen,
        // Use normalized track count to avoid counting duplicates
        trackCountValue: album.normalizedTracks ? album.normalizedTracks.size : 0,
        // Include array of track objects
        trackObjects: trackObjectsArray
      };
      
      // If we have an all-time reference, use it to fill in additional metadata
      // but NOT the play counts
      if (album.allTimeReference) {
        const allTimeRef = album.allTimeReference;
        
        // Copy metadata from all-time reference
        yearAlbum.trackCount = allTimeRef.trackCount;
        
        // If all-time reference has track metadata but no track count, 
        // use our normalized count as a better estimate
        if (allTimeRef && (!allTimeRef.trackCountValue || allTimeRef.trackCountValue < yearAlbum.trackCountValue)) {
          allTimeRef.trackCountValue = yearAlbum.trackCountValue;
        }
        
        // Use all-time track count if it's higher
        if (allTimeRef && allTimeRef.trackCountValue && allTimeRef.trackCountValue > yearAlbum.trackCountValue) {
          yearAlbum.trackCountValue = allTimeRef.trackCountValue;
        }
        
        yearAlbum.isComplete = allTimeRef.isComplete;
      }
      
      return yearAlbum;
    }).sort((a, b) => b.totalPlayed - a.totalPlayed);
  });
  
  return result;
}

// Helper function to determine if two album names are similar enough to be the same album
function isSimilarAlbum(album1, album2) {
  if (!album1 || !album2) return false;
  
  const norm1 = album1.toLowerCase().trim();
  const norm2 = album2.toLowerCase().trim();
  
  // Direct match
  if (norm1 === norm2) return true;
  
  // Skip if either is unknown
  if (norm1 === 'unknown album' || norm2 === 'unknown album') return false;
  
  // Check for substantial substring match
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLength = Math.min(norm1.length, norm2.length);
    
    // Ensure it's a substantial match, not just a short word contained within
    if (minLength >= 5 && 
        (norm1.length <= 2 * norm2.length) && 
        (norm2.length <= 2 * norm1.length)) {
      return true;
    }
  }
  
  // Check for similarity in words (at least 50% of words in common)
  const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size > 0 && words2.size > 0) {
    let matchCount = 0;
    words1.forEach(word => {
      if (words2.has(word)) matchCount++;
    });
    
    const matchRatio = matchCount / Math.min(words1.size, words2.size);
    if (matchRatio >= 0.5) return true;
  }
  
  return false;
}
function calculateArtistsByYear(songs, songPlayHistory, rawPlayData) {
  const artistsByYear = {};
  let dateErrors = 0;
  
  // First, go through raw play data to get all artists by year
  rawPlayData.forEach(entry => {
    if (!entry.master_metadata_album_artist_name || entry.ms_played < 30000) {
      return; // Skip entries with no artist or short plays
    }
    
    const artist = entry.master_metadata_album_artist_name;
    let timestamp;
    try {
      timestamp = entry.ts instanceof Date 
        ? entry.ts 
        : new Date(entry.ts);
      
      // Check if date is valid
      if (isNaN(timestamp.getTime())) {
        dateErrors++;
        return;
      }
      
      // Check if date is from the future
      const currentYear = new Date().getFullYear();
      const year = timestamp.getFullYear();
      
      if (year > currentYear) {
        console.warn(`Future year detected: ${year} for artist ${artist}. Defaulting to current year.`);
        dateErrors++;
        timestamp = new Date(); // Default to current date for future dates
      }
    } catch (e) {
      console.warn("Error parsing timestamp:", entry.ts, e);
      dateErrors++;
      return;
    }
    
    const year = timestamp.getFullYear();
    
    if (!artistsByYear[year]) {
      artistsByYear[year] = {};
    }
    
    if (!artistsByYear[year][artist]) {
      artistsByYear[year][artist] = {
        name: artist,
        totalPlayed: 0,
        playCount: 0,
        tracks: new Set(),
        plays: []
      };
    }
    
    artistsByYear[year][artist].totalPlayed += entry.ms_played;
    artistsByYear[year][artist].playCount++;
    
    if (entry.master_metadata_track_name) {
      artistsByYear[year][artist].tracks.add(entry.master_metadata_track_name);
    }
    
    artistsByYear[year][artist].plays.push({
      timestamp: timestamp.getTime(),
      trackName: entry.master_metadata_track_name
    });
  });
  
  // Convert to array format and add additional stats for each year
  const result = {};
  
  Object.entries(artistsByYear).forEach(([year, artists]) => {
    result[year] = Object.values(artists).map(artist => {
      const sortedPlays = artist.plays.sort((a, b) => a.timestamp - b.timestamp);
      const firstListen = sortedPlays.length > 0 ? sortedPlays[0].timestamp : null;
      const firstSong = sortedPlays.length > 0 ? sortedPlays[0].trackName : null;
      
      // Count plays of first song
      const firstSongPlayCount = sortedPlays.filter(play => play.trackName === firstSong).length;
      
      // Find most played song
      const songCounts = {};
      sortedPlays.forEach(play => {
        if (play.trackName) {
          songCounts[play.trackName] = (songCounts[play.trackName] || 0) + 1;
        }
      });
      
      const mostPlayedSongName = Object.entries(songCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ trackName: name, playCount: count }))[0] || 
        { trackName: 'Unknown', playCount: 0 };
      
      // Calculate streaks
      const playDates = [...new Set(
        sortedPlays.map(play => new Date(play.timestamp).toISOString().split('T')[0])
      )].sort();
      
      let currentStreak = 0;
      let longestStreak = 0;
      let streakStart = null;
      let streakEnd = null;
      
      for (let i = 0; i < playDates.length; i++) {
        const currentDate = new Date(playDates[i]);
        const previousDate = i > 0 ? new Date(playDates[i - 1]) : null;
        
        if (!previousDate || 
            (currentDate - previousDate) / (1000 * 60 * 60 * 24) === 1) {
          // Continuing streak
          currentStreak++;
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
            streakEnd = currentDate;
            streakStart = new Date(playDates[i - currentStreak + 1]);
          }
        } else {
          // Break in streak
          currentStreak = 1;
        }
      }
      
      // Check if current streak is still active
      const lastPlay = playDates.length > 0 ? new Date(playDates[playDates.length - 1]) : null;
      const now = new Date();
      const daysSinceLastPlay = lastPlay ? Math.floor((now - lastPlay) / (1000 * 60 * 60 * 24)) : 999;
      const activeStreak = daysSinceLastPlay <= 1 ? currentStreak : 0;
      
      // Calculate a score similar to spotifyScore for sorting
      const artistScore = Math.pow(artist.playCount, 1.5);
      
      return {
        ...artist,
        tracks: artist.tracks.size,
        firstListen,
        firstSong,
        firstSongPlayCount,
        mostPlayedSong: mostPlayedSongName,
        longestStreak,
        currentStreak: activeStreak,
        streakStart,
        streakEnd,
        artistScore
      };
    }).sort((a, b) => b.artistScore - a.artistScore);
  });
  
  if (dateErrors > 0) {
    console.warn(`Detected ${dateErrors} date parsing issues while grouping artists by year`);
  }
  
  return result;
}

// For the processFiles function, you need to modify this entire function rather than 
// just inserting the else-if block. Here's how the complete processFiles should be modified:

export const streamingProcessor = {
  async processFiles(files) {
    try {
      let allProcessedData = [];
      
      // Process all files through Promise.all - simpler approach
      const processedData = await Promise.all(
        Array.from(files).map(async (file) => {
          // Spotify JSON files
          if (file.name.includes('Streaming_History') && file.name.endsWith('.json')) {
            try {
              const content = await file.text();
              const data = JSON.parse(content);
              const dataWithSource = data.map(entry => ({
                ...entry,
                source: 'spotify'
              }));
              return dataWithSource;
            } catch (error) {
              console.error('Error parsing JSON:', error);
              return [];
            }
          }
          
          // Apple Music CSV files
          else if (file.name.toLowerCase().includes('apple') && file.name.endsWith('.csv')) {
            try {
              const content = await file.text();
              const transformedData = await processAppleMusicCSV(content);
              return transformedData;
            } catch (error) {
              console.error('Error processing Apple Music CSV file:', error);
              return [];
            }
          }
          
          // Tidal CSV files - handle by name OR by content detection
          else if (file.name.toLowerCase().includes('tidal') && file.name.endsWith('.csv')) {
        
            try {
              const content = await file.text();
              console.log(`Processing ${file.name} as a Tidal CSV file`);
              const tidalData = await processTidalCSV(content);
              return tidalData;
            } catch (error) {
              console.error('Error processing Tidal CSV file:', error);
              return [];
            }
          }
          
          // Generic CSV files - check if they're Tidal or Soundcloud by content
else if (file.name.endsWith('.csv')) {
  try {
    // Get file content safely
    let content;
    try {
      content = await file.text();
    } catch (readError) {
      console.error(`Error reading file ${file.name}:`, readError);
      return [];
    }
    
    // Basic content validation - ensure it's a string
    if (!content || typeof content !== 'string') {
      console.warn(`File ${file.name} has invalid content`);
      return [];
    }
    
    // Check if it's a Soundcloud CSV - with safer string checks
    if (typeof content === 'string' && 
        content.includes('play_time') && 
        content.includes('track_title')) {
      console.log(`Processing ${file.name} as a Soundcloud CSV file`);
      try {
        const soundcloudData = await processSoundcloudCSV(content);
        return soundcloudData;
      } catch (scError) {
        console.error('Error in Soundcloud processing:', scError);
        return [];
      }
    }
    
    // Check if it's a Tidal CSV - make sure we're passing a string
    if (typeof content === 'string') {
      try {
        const isTidal = isTidalCSV(content);
        if (isTidal) {
          console.log(`Processing ${file.name} as a Tidal CSV file based on content`);
          const tidalData = await processTidalCSV(content);
          return tidalData;
        }
      } catch (formatCheckError) {
        // Just log the error, don't use it for anything else
        console.error('Error checking file format');
        return [];
      }
    }
    
    console.log(`File ${file.name} doesn't match any known format pattern`);
    return [];
  } catch (error) {
    // Avoid any operations on the error object
    console.error(`Error processing CSV file ${file.name}`);
    return [];
  }
}          return [];
        })
      );
      
      // Flatten the results and combine into allProcessedData
      processedData.forEach(dataArray => {
        if (dataArray && dataArray.length > 0) {
          allProcessedData = [...allProcessedData, ...dataArray];
        }
      });

    // Handle ISRC codes from Deezer data
    allProcessedData.forEach(item => {
      if (item.source === 'deezer' && item.isrc) {
        // Store the ISRC code if available for better track matching
        item.master_metadata_external_ids = {
          isrc: item.isrc
        };
      }
    });

    // Calculate comprehensive stats using allProcessedData
    const stats = calculatePlayStats(allProcessedData);

    const sortedArtists = Object.values(stats.artists)
      .map(artist => {
        const artistSongs = stats.songs.filter(song => song.artist === artist.name);
        const mostPlayed = _.maxBy(artistSongs, 'playCount');
        const artistPlays = [];
        artistSongs.forEach(song => {
          if (stats.playHistory[song.key]) {
            artistPlays.push(...stats.playHistory[song.key]);
          }
        });

        const streaks = calculateArtistStreaks(artistPlays);

        return {
          ...artist,
          mostPlayedSong: mostPlayed || { trackName: 'Unknown', playCount: 0 },
          ...streaks
        };
      })
      .sort((a, b) => b.totalPlayed - a.totalPlayed);

    const sortedAlbums = _.orderBy(
      Object.values(stats.albums).map(album => ({
        ...album,
        trackCount: album.trackCount.size
      })),
      ['totalPlayed'],
      ['desc']
    );

    const sortedSongs = _.orderBy(stats.songs, ['totalPlayed'], ['desc']).slice(0, 250);

    const verifiedAlbums = sortedAlbums.map(album => {
      if (typeof album.trackCount === 'object' && album.trackCount instanceof Set) {
        return {
          ...album,
          trackCount: album.trackCount.size
        };
      }
      return album;
    });

    return {
      stats: {
        totalFiles: files.length,
        totalEntries: allProcessedData.length,
        processedSongs: stats.processedSongs,
        nullTrackNames: allProcessedData.filter(e => !e.master_metadata_track_name).length,
        uniqueSongs: stats.songs.length, // Use the length of the songs array
        shortPlays: stats.shortPlays,
        totalListeningTime: stats.totalListeningTime,
        serviceListeningTime: stats.serviceListeningTime
      },
      topArtists: sortedArtists,
      topAlbums: verifiedAlbums,
      processedTracks: sortedSongs,
      songsByYear: calculateSongsByYear(stats.songs, stats.playHistory),
      briefObsessions: calculateBriefObsessions(stats.songs, stats.playHistory),
      artistsByYear: calculateArtistsByYear(stats.songs, stats.playHistory, allProcessedData),
      albumsByYear: calculateAlbumsByYear(verifiedAlbums, allProcessedData),
      rawPlayData: allProcessedData
    };
  } catch (error) {
    console.error('Error processing files:', error);
    throw error;
  }
}
};
export { normalizeString, createMatchKey, filterDataByDate };