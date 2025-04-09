import React, { useState, useMemo, useEffect } from 'react';
import { normalizeString, createMatchKey } from './streaming-adapter.js';
import { Download, Plus, XCircle, Eye } from 'lucide-react';
import PlaylistExporter from './playlist-exporter.js';

const CustomTrackRankings = ({ 
  rawPlayData = [], 
  formatDuration, 
  initialArtists = [],
  // Add props for connecting with the YearSelector sidebar
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  onYearChange,
  onYearRangeChange,
  onToggleYearRangeMode
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topN, setTopN] = useState(100);
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [selectedArtists, setSelectedArtists] = useState(initialArtists);
  const [selectedAlbums, setSelectedAlbums] = useState([]);
  const [artistSearch, setArtistSearch] = useState('');
  const [albumSearch, setAlbumSearch] = useState('');
  const [unifiedSearch, setUnifiedSearch] = useState('');
  const [includeFeatures, setIncludeFeatures] = useState(false);
  const [onlyFeatures, setOnlyFeatures] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [musicBasePath, setMusicBasePath] = useState('/Music/Downloads');
  const [fileExtension, setFileExtension] = useState('mp3');
  const [pathFormat, setPathFormat] = useState('default');
  const [customPathFormat, setCustomPathFormat] = useState('{basePath}/{artist}/{artist}-{album}/{track}.{ext}');
  const [playlistName, setPlaylistName] = useState('Custom Date Range Playlist');
  const [showPlaylistExporter, setShowPlaylistExporter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // New state for omitted content feature
  const [omittedSongs, setOmittedSongs] = useState([]);
  const [omittedArtists, setOmittedArtists] = useState([]);
  const [showOmittedTab, setShowOmittedTab] = useState(false);
  
  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load omitted content from localStorage
  useEffect(() => {
    try {
      const savedOmittedSongs = localStorage.getItem('omittedSongs');
      const savedOmittedArtists = localStorage.getItem('omittedArtists');
      
      if (savedOmittedSongs) {
        setOmittedSongs(JSON.parse(savedOmittedSongs));
      }
      
      if (savedOmittedArtists) {
        setOmittedArtists(JSON.parse(savedOmittedArtists));
      }
    } catch (err) {
      console.error("Error loading omitted content from localStorage:", err);
    }
  }, []);

  // Save omitted songs to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('omittedSongs', JSON.stringify(omittedSongs));
    } catch (err) {
      console.error("Error saving omitted songs to localStorage:", err);
    }
  }, [omittedSongs]);

  // Save omitted artists to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('omittedArtists', JSON.stringify(omittedArtists));
    } catch (err) {
      console.error("Error saving omitted artists to localStorage:", err);
    }
  }, [omittedArtists]);

  // Extract available years from raw play data
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    
    if (!rawPlayData || !Array.isArray(rawPlayData) || rawPlayData.length === 0) {
      return [];
    }
    
    rawPlayData.forEach(entry => {
      if (entry && entry.ts && entry.ms_played >= 30000) {
        try {
          const date = new Date(entry.ts);
          if (!isNaN(date.getTime())) {
            yearsSet.add(date.getFullYear().toString());
          }
        } catch (err) {
          // Skip invalid dates
        }
      }
    });
    
    return Array.from(yearsSet).sort();
  }, [rawPlayData]);
  
  // Fixed useEffect in CustomTrackRankings.js to properly handle month/day in ranges
  useEffect(() => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      // Year range mode
      
      // Check if dates include month/day information
      const startHasMonthDay = yearRange.startYear.includes('-');
      const endHasMonthDay = yearRange.endYear.includes('-');
      
      if (startHasMonthDay || endHasMonthDay) {
        // Handle month/day information in range
        try {
          let startDateStr, endDateStr;
          
          // Process start date
          if (startHasMonthDay) {
            const startParts = yearRange.startYear.split('-');
            if (startParts.length === 3) {
              // YYYY-MM-DD format - use as is
              startDateStr = yearRange.startYear;
            } else if (startParts.length === 2) {
              // YYYY-MM format - use first day of month
              startDateStr = `${startParts[0]}-${startParts[1]}-01`;
            }
          } else {
            // Just year - use first day of year
            startDateStr = `${yearRange.startYear}-01-01`;
          }
          
          // Process end date  
          if (endHasMonthDay) {
            const endParts = yearRange.endYear.split('-');
            if (endParts.length === 3) {
              // YYYY-MM-DD format - use as is 
              endDateStr = yearRange.endYear;
            } else if (endParts.length === 2) {
              // YYYY-MM format - use last day of month
              const year = parseInt(endParts[0]);
              const month = parseInt(endParts[1]);
              const lastDay = new Date(year, month, 0).getDate();
              endDateStr = `${endParts[0]}-${endParts[1]}-${lastDay}`;
            }
          } else {
            // Just year - use last day of year
            endDateStr = `${yearRange.endYear}-12-31`;
          }
          
          setStartDate(startDateStr);
          setEndDate(endDateStr);
        } catch (err) {
          console.error("Error processing date range", err);
          // Fallback to full year range
          setStartDate(`${yearRange.startYear}-01-01`);
          setEndDate(`${yearRange.endYear}-12-31`);
        }
      } else {
        // Standard full year range
        setStartDate(`${yearRange.startYear}-01-01`);
        setEndDate(`${yearRange.endYear}-12-31`);
      }
    } else if (selectedYear !== 'all') {
      if (selectedYear.includes('-')) {
        // Handle case with YYYY-MM-DD or YYYY-MM format
        const parts = selectedYear.split('-');
        
        if (parts.length === 3) {
          // Single day selection - set both start and end to the same day
          setStartDate(selectedYear);
          setEndDate(selectedYear);
        } else if (parts.length === 2) {
          // Month selection (YYYY-MM)
          const year = parts[0];
          const month = parts[1];
          
          // Get the last day of the month
          const lastDay = new Date(year, parseInt(month), 0).getDate();
          
          setStartDate(`${year}-${month}-01`);
          setEndDate(`${year}-${month}-${lastDay}`);
        }
      } else {
        // Single year format (YYYY)
        setStartDate(`${selectedYear}-01-01`);
        setEndDate(`${selectedYear}-12-31`);
      }
    } else {
      // All time
      setStartDate('');
      setEndDate('');
    }
  }, [selectedYear, yearRangeMode, yearRange]);

  // Functions to handle omitting and un-omitting songs and artists
  const omitSong = (song) => {
    setOmittedSongs(prev => [...prev, song]);
  };

  const unomitSong = (songKey) => {
    setOmittedSongs(prev => prev.filter(song => song.key !== songKey));
  };

  const omitArtist = (artist) => {
    setOmittedArtists(prev => [...prev, artist]);
  };

  const unomitArtist = (artist) => {
    setOmittedArtists(prev => prev.filter(a => a !== artist));
  };

  const addArtistFromTrack = (artist) => {
    if (!selectedArtists.includes(artist)) {
      setSelectedArtists(prev => [...prev, artist]);
    }
  };
  
  const addAlbumFromTrack = (album, artist) => {
    const albumKey = `${album} - ${artist}`;
    
    if (!selectedAlbums.some(a => a.key === albumKey)) {
      setSelectedAlbums(prev => [...prev, { 
        name: album, 
        artist: artist, 
        key: albumKey 
      }]);
    }
  };

  // Get unique artists from raw play data
  const allArtists = useMemo(() => {
    const artists = new Set(
      rawPlayData
        .filter(entry => entry.master_metadata_album_artist_name)
        .map(entry => entry.master_metadata_album_artist_name)
    );
    return Array.from(artists).sort();
  }, [rawPlayData]);

  // Get unique albums from raw play data
  const allAlbums = useMemo(() => {
    const albumMap = new Map();
    
    rawPlayData
      .filter(entry => entry.master_metadata_album_album_name && entry.master_metadata_album_artist_name)
      .forEach(entry => {
        const album = entry.master_metadata_album_album_name;
        const artist = entry.master_metadata_album_artist_name;
        const key = `${album} - ${artist}`;
        
        if (!albumMap.has(key)) {
          albumMap.set(key, { name: album, artist: artist, key: key });
        }
      });
    
    return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawPlayData]);

  const filteredArtists = useMemo(() => {
    return allArtists
      .filter(artist => 
        artist.toLowerCase().includes(artistSearch.toLowerCase()) &&
        !selectedArtists.includes(artist)
      )
      .slice(0, 10);
  }, [allArtists, artistSearch, selectedArtists]);
  
  const filteredAlbums = useMemo(() => {
    return allAlbums
      .filter(album => 
        (album.name.toLowerCase().includes(albumSearch.toLowerCase()) || 
         album.artist.toLowerCase().includes(albumSearch.toLowerCase())) &&
        !selectedAlbums.some(a => a.key === album.key)
      )
      .slice(0, 10);
  }, [allAlbums, albumSearch, selectedAlbums]);

  // Create a mapping of track/artist keys to album names
  const albumMap = useMemo(() => {
    const map = new Map();
    
    rawPlayData.forEach(entry => {
      if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
        const albumName = entry.master_metadata_album_album_name;
        
        if (albumName) {
          const trackName = entry.master_metadata_track_name.toLowerCase().trim();
          const artistName = entry.master_metadata_album_artist_name.toLowerCase().trim();
          const trackKey = `${trackName}|||${artistName}`;
          
          if (entry.source === 'spotify' || !map.has(trackKey)) {
            map.set(trackKey, albumName);
          }
        }
      }
    });
    
    return map;
  }, [rawPlayData]);

  // The filtered tracks based on all applied filters
  const filteredTracks = useMemo(() => {
    if (!rawPlayData?.length) return [];
    
    const isAllTime = (!startDate || startDate === "") && (!endDate || endDate === "");
    
    const start = isAllTime ? new Date(0) : new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = isAllTime ? new Date() : new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const trackStats = {};
   // In the filteredTracks useMemo in CustomTrackRankings.js,
// modify the section where features are detected:

rawPlayData.forEach(entry => {
  try {
    const timestamp = new Date(entry.ts);
    
    if (timestamp >= start && 
        timestamp <= end && 
        entry.ms_played >= 30000 && 
        entry.master_metadata_track_name) {
        
        // Check for features in both track name and artist name
        let featureArtists = null;
        try {
          // Check track name for features (existing code)
          const trackResult = normalizeString(entry.master_metadata_track_name);
          featureArtists = trackResult.featureArtists || [];
          
          // NEW: Also check artist name for features
          if (entry.master_metadata_album_artist_name) {
            const artistResult = normalizeString(entry.master_metadata_album_artist_name);
            // Combine features from both track and artist name
            if (artistResult.featureArtists) {
              if (!featureArtists) {
                featureArtists = artistResult.featureArtists;
              } else {
                featureArtists = [...featureArtists, ...artistResult.featureArtists];
              }
            }
          }
          
          // If no features were found, set to null
          if (featureArtists && featureArtists.length === 0) {
            featureArtists = null;
          }
        } catch (err) {
          console.warn("Error processing features:", err);
        }
        
        // Special case handling for artists with "feat" in name
        const artistName = entry.master_metadata_album_artist_name || '';
        const artistParts = artistName.split(/\s+(?:feat|ft|featuring|with)[. ]/i);
        
        // If artist name contains a feature separator
        const hasFeatureInArtistName = artistParts.length > 1;
        
        // Rest of the code remains the same...
        const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
        let isAlbumMatch = true;
        
        if (selectedAlbums.length > 0) {
          isAlbumMatch = selectedAlbums.some(album => 
            album.name === albumName && 
            album.artist === entry.master_metadata_album_artist_name
          );
        }
        
        // MODIFIED: Consider the primary artist to be the first part before "feat."
        let primaryArtist = entry.master_metadata_album_artist_name;
        let featuredArtist = null;
        
        if (hasFeatureInArtistName && artistParts.length > 1) {
          primaryArtist = artistParts[0].trim();
          featuredArtist = artistParts.slice(1).join(' ').trim();
          // Add the featured artist to our featureArtists array
          if (featuredArtist) {
            if (!featureArtists) {
              featureArtists = [featuredArtist];
            } else if (!featureArtists.includes(featuredArtist)) {
              featureArtists.push(featuredArtist);
            }
          }
        }
        
        // Check if the selected artists match either primary or featured artist
        const isArtistMatch = 
          selectedArtists.length === 0 || 
          selectedArtists.includes(entry.master_metadata_album_artist_name) ||
          (hasFeatureInArtistName && selectedArtists.includes(primaryArtist));
        
        // UPDATED check for feature match to handle both patterns
        const isFeatureMatch = 
          (featureArtists && selectedArtists.some(artist => 
            featureArtists.some(feature => 
              feature.toLowerCase().includes(artist.toLowerCase())
            )
          )) || 
          // Also check if any selected artist appears as a featured artist in the artist name
          (featuredArtist && selectedArtists.some(artist => 
            featuredArtist.toLowerCase().includes(artist.toLowerCase())
          ));
        
        const shouldInclude = (
          isAlbumMatch &&
          (
            selectedArtists.length === 0 ||
            (onlyFeatures && isFeatureMatch) ||
            (!onlyFeatures && isArtistMatch) ||
            (!onlyFeatures && includeFeatures && isFeatureMatch)
          )
        );
        
        if (!shouldInclude) {
          return;
        }
        
        // Same as the existing code
        let key;
        try {
          key = createMatchKey(
            entry.master_metadata_track_name,
            primaryArtist // Use primary artist instead of full artist string
          );
        } catch (err) {
          key = `${entry.master_metadata_track_name}-${primaryArtist}`;
        }
        
        const trackLookupKey = `${entry.master_metadata_track_name.toLowerCase().trim()}|||${primaryArtist.toLowerCase().trim()}`;
        const lookupAlbumName = entry.master_metadata_album_album_name || albumMap.get(trackLookupKey) || 'Unknown Album';
        
        if (!trackStats[key]) {
          trackStats[key] = {
            key,
            trackName: entry.master_metadata_track_name,
            artist: primaryArtist, // Store primary artist
            fullArtist: entry.master_metadata_album_artist_name, // Keep full artist string for reference
            albumName: lookupAlbumName,
            totalPlayed: 0,
            playCount: 0,
            featureArtists,
            variations: [entry.master_metadata_track_name],
            isFeatured: isFeatureMatch,
            featuredArtist // Store the featured artist separately
          };
        } else {
          if (trackStats[key].variations && 
              !trackStats[key].variations.includes(entry.master_metadata_track_name)) {
            trackStats[key].variations.push(entry.master_metadata_track_name);
          }
          
          if (isFeatureMatch && !trackStats[key].isFeatured) {
            trackStats[key].isFeatured = true;
          }
          
          if (lookupAlbumName !== 'Unknown Album' && 
              (trackStats[key].albumName === 'Unknown Album' || entry.source === 'spotify')) {
            trackStats[key].albumName = lookupAlbumName;
          }
        }
        
        trackStats[key].totalPlayed += entry.ms_played;
        trackStats[key].playCount += 1;
    }
  } catch (err) {
    console.warn("Error processing entry:", err);
  }
});

    // Filter out omitted songs and artists
    return Object.values(trackStats)
      .filter(track => {
        // Skip if the song is omitted
        if (omittedSongs.some(s => s.key === track.key)) {
          return false;
        }
        
        // Skip if the artist is omitted
        if (omittedArtists.includes(track.artist)) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, topN);
  }, [
    rawPlayData, 
    startDate, 
    endDate, 
    topN, 
    sortBy, 
    selectedArtists, 
    selectedAlbums, 
    includeFeatures, 
    onlyFeatures, 
    albumMap, 
    omittedSongs, 
    omittedArtists
  ]);


const songsByYear = useMemo(() => {
  const yearGroups = {};
  
  if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
    // Year range case
    const rangeKey = `${yearRange.startYear}-${yearRange.endYear}`;
    
    // Store under the range key (e.g., "2022-2022")
    yearGroups[rangeKey] = filteredTracks;
    
    // ALSO store under single year key if start and end are the same
    if (yearRange.startYear === yearRange.endYear) {
      // Important: Store under BOTH the year itself AND the date format if it's a specific date
      yearGroups[yearRange.startYear] = filteredTracks;
      
      // If this is a specific date format (YYYY-MM-DD), ensure we store it that way too
      if (yearRange.startYear.includes('-') && yearRange.startYear.split('-').length === 3) {
        yearGroups[yearRange.startYear] = filteredTracks;
      }
    }
    
    return yearGroups;
  } else if (selectedYear !== 'all') {
    // Single year case - put tracks under the selected year key
    return { [selectedYear]: filteredTracks };
  }
  
  // Default "all time" case
  return { all: filteredTracks };
}, [filteredTracks, selectedYear, yearRangeMode, yearRange]);

  // Handle changes to feature toggles
  const handleFeatureToggleChange = (toggleType, value) => {
    if (toggleType === 'include') {
      setIncludeFeatures(value);
      if (onlyFeatures && value) {
        setOnlyFeatures(false);
      }
    } else {
      setOnlyFeatures(value);
      if (includeFeatures && value) {
        setIncludeFeatures(false);
      }
    }
  };

  // Helper function to clean path components for file system compatibility
  const cleanPathComponent = (text) => {
    if (!text) return 'Unknown';
    
    return text
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

const getDataForYearOrRange = (dataByYear, selectedYear, isRangeMode, yearRange) => {
  // Check for single year first
  if (dataByYear[selectedYear]) {
    return dataByYear[selectedYear];
  }
  
  // If this is a range with same start/end years, try the range key
  if (isRangeMode && yearRange.startYear === yearRange.endYear && 
      yearRange.startYear === selectedYear) {
    const rangeKey = `${yearRange.startYear}-${yearRange.endYear}`;
    return dataByYear[rangeKey] || [];
  }
  
  // Handle other cases...
  return [];
};
  
  // Create M3U playlist content
  const createM3UContent = () => {
    if (filteredTracks.length === 0) {
      return '';
    }
    
    let content = '#EXTM3U\n';
    
    filteredTracks.forEach((track, index) => {
      const durationSecs = Math.round(track.totalPlayed / (track.playCount || 1) / 1000);
      
      content += `#EXTINF:${durationSecs},${track.artist} - ${track.trackName}\n`;
      
      const artist = cleanPathComponent(track.artist);
      const album = cleanPathComponent(track.albumName || 'Unknown Album');
      const trackName = cleanPathComponent(track.trackName);
      
      let filePath;
      
      if (pathFormat === 'default') {
        filePath = `${musicBasePath}/${artist}/${artist}-${album}/${trackName}.${fileExtension}`;
      } else {
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
    if (filteredTracks.length === 0) {
      alert('No tracks to export');
      return;
    }
    
    const content = createM3UContent();
    if (!content) {
      alert('Error creating playlist content');
      return;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedPlaylistName = playlistName.replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${sanitizedPlaylistName}-${timestamp}.m3u`;
    
    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Function to get page title based on date selection
  const getPageTitle = () => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `Custom Track Range (${yearRange.startYear}-${yearRange.endYear})`;
    } else if (selectedYear !== 'all') {
      if (selectedYear.includes('-')) {
        const parts = selectedYear.split('-');
        if (parts.length === 3) {
          // Display format for a specific date (YYYY-MM-DD)
          const date = new Date(selectedYear);
          if (!isNaN(date.getTime())) {
            return `Custom Track Range for ${date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}`;
          }
        } else if (parts.length === 2) {
          // Display format for a specific month (YYYY-MM)
          const year = parts[0];
          const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
          const date = new Date(year, month, 1);
          if (!isNaN(date.getTime())) {
            return `Custom Track Range for ${date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long'
            })}`;
          }
        }
        return `Custom Track Range for ${selectedYear}`;
      }
      return `Custom Track Range for ${selectedYear}`;
    } else {
      return 'Custom Date Range Selection';
    }
  };

  // Get formatted date range string
  const getFormattedDateRange = () => {
    if (!startDate && !endDate) {
      return "All Time";
    }
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const startStr = start.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        const endStr = end.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        return `${startStr} to ${endStr}`;
      }
    } catch (error) {
      console.error("Error formatting date range:", error);
    }
    
    // Fallback if date formatting fails
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `${yearRange.startYear} to ${yearRange.endYear}`;
    } else if (selectedYear !== 'all') {
      return selectedYear;
    }
    
    return "Custom Date Range";
  };

  // Render track rows based on mobile/desktop view
  const renderTrackRow = (song, index) => {
    if (isMobile) {
      // Mobile view - compact layout
      return (
        <tr 
          key={song.key} 
          className={`border-b hover:bg-orange-50 ${song.isFeatured ? 'bg-orange-50' : ''}`}
        >
          <td className="p-2 text-orange-700">
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-bold text-xs mr-2 text-orange-800">{index + 1}.</span>
                {song.isFeatured && (
                  <span className="inline-block px-1 py-0.5 mr-1 bg-orange-200 text-orange-700 rounded text-xs">
                    FEAT
                  </span>
                )}
                <div className="font-medium">{song.trackName}</div>
                
                {/* Add omit buttons */}
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      omitSong(song);
                    }}
                    className="text-orange-600 hover:text-orange-800"
                    title="Omit this song"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </div>
              <div 
                className="text-xs text-orange-600 cursor-pointer hover:underline flex items-center"
              >
                <span onClick={() => addArtistFromTrack(song.artist)}>{song.artist}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    omitArtist(song.artist);
                  }}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                  title="Omit this artist"
                >
                  <XCircle size={14} />
                </button>
              </div>
              <div 
                className="text-xs text-orange-500 cursor-pointer hover:underline truncate max-w-[200px]"
                onClick={() => addAlbumFromTrack(song.albumName, song.artist)}
              >
                {song.albumName}
              </div>
            </div>
          </td>
          <td className="p-2 align-top text-right text-orange-700">
            <div className="flex flex-col">
              <span className="font-medium">{formatDuration(song.totalPlayed)}</span>
              <span className="text-xs">{song.playCount} plays</span>
            </div>
          </td>
        </tr>
      );
    }
    
    // Desktop view - full table
    return (
      <tr 
        key={song.key} 
        className={`border-b hover:bg-orange-50 ${song.isFeatured ? 'bg-orange-50' : ''}`}
      >
        <td className="p-2 text-orange-700">{index + 1}</td>
        <td className="p-2 text-orange-700">
          <div className="flex items-center">
            {song.isFeatured && (
              <span className="inline-block px-1.5 py-0.5 mr-2 bg-orange-200 text-orange-700 rounded text-xs">
                FEAT
              </span>
            )}
            <div>
              {song.trackName}
            </div>
          </div>
        </td>
        <td 
          className="p-2 text-orange-700" 
        > 
          <div className="flex items-center">
            <span 
              className="cursor-pointer hover:underline"
              onClick={() => addArtistFromTrack(song.artist)}
            >
              {song.artist}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                omitArtist(song.artist);
              }}
              className="ml-2 text-orange-600 hover:text-orange-800"
              title="Omit this artist"
            >
              <XCircle size={16} />
            </button>
          </div>
        </td>
        <td 
          className="p-2 text-orange-700 cursor-pointer hover:underline" 
          onClick={() => addAlbumFromTrack(song.albumName, song.artist)}
        >
          {song.albumName}
        </td>
        <td className="p-2 text-right text-orange-700">{formatDuration(song.totalPlayed)}</td>
        <td className="p-2 text-right text-orange-700">{song.playCount}</td>
        <td className="p-2 text-right text-orange-700">
          <button
            onClick={() => omitSong(song)}
            className="p-1 text-orange-600 hover:text-orange-800 rounded"
            title="Omit this song"
          >
            <XCircle size={16} />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Date Range Selection */}
      <div className="border rounded-lg p-3 sm:p-4 bg-orange-50">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-bold text-orange-700">{getPageTitle()}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPlaylistExporter(!showPlaylistExporter)}
              className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs sm:text-sm"
            >
              <Download size={14} className="hidden sm:inline" />
              {showPlaylistExporter ? "Hide" : "Export"}
            </button>
          </div>
        </div>

        <div className="mt-2">
          <div className="mt-4 flex flex-wrap gap-2 sm:gap-4 items-center">
            <div className="flex items-center gap-1 sm:gap-2 text-orange-700">
              <label className="text-sm">Show top</label>
              <input
                type="number"
                min="1"
                max="69420"
                value={topN}
                onChange={(e) => setTopN(Math.min(69420, Math.max(1, parseInt(e.target.value) || 1)))}
                className="border rounded w-14 sm:w-16 px-1 sm:px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
              />
              <label className="text-sm">tracks</label>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-orange-700 text-sm">Sort:</span>
              <button
                onClick={() => setSortBy('totalPlayed')}
                className={`px-2 py-1 rounded text-xs ${
                  sortBy === 'totalPlayed'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                Time
              </button>
              <button
                onClick={() => setSortBy('playCount')}
                className={`px-2 py-1 rounded text-xs ${
                  sortBy === 'playCount'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                Plays
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Exporter */}
      {showPlaylistExporter && (
        <PlaylistExporter
          processedData={filteredTracks}
          songsByYear={songsByYear}
          selectedYear={selectedYear !== 'all' ? selectedYear : 'all'}
          colorTheme="orange"
        />
      )}

      {/* Artist and Album Selection */}
      <div className="border rounded-lg p-3 sm:p-4 bg-orange-50">
        <h3 className="font-bold text-orange-700 mb-2">Filters</h3>
        
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedArtists.map(artist => (
            <div 
              key={artist} 
              className="flex items-center bg-orange-600 text-white px-2 py-1 rounded text-xs"
            >
              {artist}
              <button 
                onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                className="ml-1 text-white hover:text-orange-200"
              >
                ×
              </button>
            </div>
          ))}
          
          {selectedAlbums.map(album => (
            <div 
              key={album.key} 
              className="flex items-center bg-orange-500 text-white px-2 py-1 rounded text-xs"
            >
              <span className="mr-1">💿</span> {album.name} 
              <button 
                onClick={() => setSelectedAlbums(prev => prev.filter(a => a.key !== album.key))}
                className="ml-1 text-white hover:text-orange-200"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={unifiedSearch}
            onChange={(e) => {
              setUnifiedSearch(e.target.value);
              setArtistSearch(e.target.value);
              setAlbumSearch(e.target.value);
            }}
            placeholder="Search artists or albums..."
            className="w-full border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
          />
          
          {unifiedSearch && (filteredArtists.length > 0 || filteredAlbums.length > 0) && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto text-orange-600">
              {filteredArtists.length > 0 && (
                <div>
                  <div className="px-2 py-1 bg-orange-100 text-orange-800 font-semibold text-xs">ARTISTS</div>
                  {filteredArtists.map(artist => (
                    <div
                      key={artist}
                      onClick={() => {
                        addArtistFromTrack(artist);
                        setUnifiedSearch('');
                      }}
                      className="px-2 py-1 hover:bg-orange-50 cursor-pointer"
                    >
                      <span className="mr-1">👤</span> {artist}
                    </div>
                  ))}
                </div>
              )}
              
              {filteredAlbums.length > 0 && (
                <div>
                  <div className="px-2 py-1 bg-orange-100 text-orange-800 font-semibold text-xs">ALBUMS</div>
                  {filteredAlbums.map(album => (
                    <div
                      key={album.key}
                      onClick={() => {
                        addAlbumFromTrack(album.name, album.artist);
                        setUnifiedSearch('');
                      }}
                      className="px-2 py-1 hover:bg-orange-50 cursor-pointer"
                    >
                      <span className="mr-1">💿</span> {album.name} <span className="text-xs">({album.artist})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Feature Toggles - only show when artists are selected */}
        {selectedArtists.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
            {/* Include features toggle */}
            <label className={`flex items-center cursor-pointer ${onlyFeatures ? 'opacity-50' : ''}`}>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={includeFeatures} 
                  disabled={onlyFeatures}
                  onChange={() => handleFeatureToggleChange('include', !includeFeatures)}
                  className="sr-only"
                />
                <div className={`block w-8 sm:w-10 h-5 sm:h-6 rounded-full ${includeFeatures ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-3 sm:w-4 h-3 sm:h-4 rounded-full transition-transform ${includeFeatures ? 'transform translate-x-3 sm:translate-x-4' : ''}`}></div>
              </div>
            <span className="ml-2 text-orange-700 text-xs sm:text-sm">
                Include features 
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Tabs for switching between main content and omitted content */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowOmittedTab(false)}
          className={`px-4 py-2 rounded-t text-sm ${
            !showOmittedTab
              ? 'bg-orange-600 text-white'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          }`}
        >
          Track Results
        </button>
        <button
          onClick={() => setShowOmittedTab(true)}
          className={`px-4 py-2 rounded-t text-sm flex items-center gap-1 ${
            showOmittedTab
              ? 'bg-orange-600 text-white'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          }`}
        >
          <Eye size={14} />
          Omitted Content ({omittedSongs.length + omittedArtists.length})
        </button>
      </div>

      {/* Show either omitted content tab or normal results */}
      {showOmittedTab ? (
        <div className="border rounded-lg p-3 sm:p-4 bg-orange-50">
          <h3 className="font-bold text-orange-700 mb-4">Omitted Content</h3>
          
          {omittedArtists.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-orange-600 mb-2">Omitted Artists</h4>
              <div className="flex flex-wrap gap-2">
                {omittedArtists.map(artist => (
                  <div 
                    key={artist} 
                    className="flex items-center bg-orange-600 text-white px-2 py-1 rounded text-xs"
                  >
                    {artist}
                    <button 
                      onClick={() => unomitArtist(artist)}
                      className="ml-2 text-white hover:text-orange-200"
                    >
                      Un-omit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {omittedSongs.length > 0 && (
            <div>
              <h4 className="font-semibold text-orange-600 mb-2">Omitted Songs</h4>
              <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left text-orange-700">Track</th>
                      <th className="p-2 text-left text-orange-700">Artist</th>
                      <th className="p-2 text-left text-orange-700">Album</th>
                      <th className="p-2 text-right text-orange-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {omittedSongs.map(song => (
                      <tr key={song.key} className="border-b hover:bg-orange-50">
                        <td className="p-2 text-orange-700">{song.trackName}</td>
                        <td className="p-2 text-orange-700">{song.artist}</td>
                        <td className="p-2 text-orange-700">{song.albumName}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => unomitSong(song.key)}
                            className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
                          >
                            Un-omit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {omittedSongs.length === 0 && omittedArtists.length === 0 && (
            <div className="text-center py-4 text-orange-500">
              No songs or artists have been omitted yet
            </div>
          )}
        </div>
      ) : (
        /* Results section with date range info */
        <div className="border rounded-lg p-3 sm:p-4 bg-orange-50">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="text-orange-700 font-medium text-sm">
              Date Range: <span className="text-orange-800">{getFormattedDateRange()}</span>
            </div>
            <div className="text-orange-700 text-sm">
              Found <span className="font-bold">{filteredTracks.length}</span> tracks
            </div>
          </div>

          {filteredTracks.length > 0 ? (
            <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    {!isMobile && (
                      <>
                        <th className="p-2 text-left text-orange-700">Rank</th>
                        <th className="p-2 text-left text-orange-700">Track</th>
                        <th className="p-2 text-left text-orange-700">Artist</th>
                        <th className="p-2 text-left text-orange-700">Album</th>
                        <th 
                          className={`p-2 text-right text-orange-700 cursor-pointer hover:bg-orange-100 ${
                            sortBy === 'totalPlayed' ? 'font-bold' : ''
                          }`}
                          onClick={() => setSortBy('totalPlayed')}
                        >
                          Time {sortBy === 'totalPlayed' && '▼'}
                        </th>
                        <th 
                          className={`p-2 text-right text-orange-700 cursor-pointer hover:bg-orange-100 ${
                            sortBy === 'playCount' ? 'font-bold' : ''
                          }`}
                          onClick={() => setSortBy('playCount')}
                        >
                          Plays {sortBy === 'playCount' && '▼'}
                        </th>
                        <th className="p-2 text-right text-orange-700">Actions</th>
                      </>
                    )}
                    {isMobile && (
                      <>
                        <th className="p-2 text-left text-orange-700">Track Info</th>
                        <th className="p-2 text-right text-orange-700">Stats</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredTracks.map(renderTrackRow)}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-orange-500">
              {startDate || endDate || selectedArtists.length > 0 || selectedAlbums.length > 0 
                ? 'No tracks found matching your filters' 
                : 'Select filters to view tracks'}
            </div>
          )}
        </div>
      )}

      {/* Basic Export Controls - simplified version */}
      <div>
        <button
          onClick={() => setShowExportOptions(!showExportOptions)}
          className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs sm:text-sm"
        >
          <Download size={14} className="hidden sm:inline" />
          {showExportOptions ? 'Hide Export Options' : 'Quick Export'}
        </button>
        
        {showExportOptions && (
          <div className="mt-4 p-3 sm:p-4 bg-orange-50 border border-orange-200 rounded">
            <div>
              <label className="block text-orange-700 mb-1 text-sm">Playlist Name:</label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full px-2 py-1 sm:px-3 sm:py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-700 text-sm"
                placeholder="Enter playlist name"
              />
            </div>
            
            <div className="mt-3">
              <label className="block text-orange-700 mb-1 text-sm">Base Music Path:</label>
              <input
                type="text"
                value={musicBasePath}
                onChange={(e) => setMusicBasePath(e.target.value)}
                className="w-full px-2 py-1 sm:px-3 sm:py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-700 text-sm"
                placeholder="e.g. /Music/Downloads or C:/Music"
              />
            </div>
            
            <div className="mt-3">
              <label className="block text-orange-700 mb-1 text-sm">File Extension:</label>
              <select
                value={fileExtension}
                onChange={(e) => setFileExtension(e.target.value)}
                className="px-2 py-1 sm:px-3 sm:py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-700 text-sm"
              >
                <option value="mp3">mp3</option>
                <option value="flac">flac</option>
                <option value="m4a">m4a</option>
                <option value="ogg">ogg</option>
                <option value="wav">wav</option>
              </select>
            </div>
            
            <div className="mt-3">
              <button
                onClick={exportPlaylist}
                disabled={filteredTracks.length === 0}
                className="px-2 py-1 sm:px-4 sm:py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                Download Playlist ({filteredTracks.length})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomTrackRankings;