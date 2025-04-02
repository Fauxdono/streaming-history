import React, { useState, useMemo, useEffect } from 'react';
import { normalizeString, createMatchKey } from './streaming-adapter.js';
import { Download, Plus } from 'lucide-react';
import DateSelector from './dateselector.js';
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
  const [topN, setTopN] = useState(50);
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
  
 useEffect(() => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      setStartDate(`${yearRange.startYear}-01-01`);
      setEndDate(`${yearRange.endYear}-12-31`);
    } else if (selectedYear !== 'all') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
    } else {
      setStartDate('');
      setEndDate('');
    }
  }, [selectedYear, yearRangeMode, yearRange, availableYears]);

const handleDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    
    if (!start || !end || start === "" || end === "") {
      if (onYearChange) onYearChange('all');
      if (onToggleYearRangeMode) onToggleYearRangeMode(false);
    } else {
      try {
        const startYear = new Date(start).getFullYear().toString();
        const endYear = new Date(end).getFullYear().toString();
        
        if (startYear === endYear) {
          if (onYearChange) onYearChange(startYear);
          if (onToggleYearRangeMode) onToggleYearRangeMode(false);
        } else {
          if (onYearRangeChange) onYearRangeChange({ startYear, endYear });
          if (onToggleYearRangeMode) onToggleYearRangeMode(true);
        }
      } catch (err) {
        if (onYearChange) onYearChange('all');
        if (onToggleYearRangeMode) onToggleYearRangeMode(false);
      }
    }
  };

const getInitialDates = () => {
    if (selectedYear === 'all' && !yearRangeMode) {
      return { initialStartDate: '', initialEndDate: '' };
    }
    
    if (startDate && endDate) {
      return { initialStartDate: startDate, initialEndDate: endDate };
    }
    
    return { initialStartDate: '', initialEndDate: '' };
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

 const filteredTracks = useMemo(() => {
  if (!rawPlayData?.length) return [];
  
  const isAllTime = (!startDate || startDate === "") && (!endDate || endDate === "");
  
  const start = isAllTime ? new Date(0) : new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = isAllTime ? new Date() : new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const trackStats = {};
  rawPlayData.forEach(entry => {
    try {
      const timestamp = new Date(entry.ts);
      
      if (timestamp >= start && 
          timestamp <= end && 
          entry.ms_played >= 30000 && 
          entry.master_metadata_track_name) {
          
          let featureArtists = null;
          try {
            const result = normalizeString(entry.master_metadata_track_name);
            featureArtists = result.featureArtists;
          } catch (err) {}
          
          const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
          let isAlbumMatch = true;
          
          if (selectedAlbums.length > 0) {
            isAlbumMatch = selectedAlbums.some(album => 
              album.name === albumName && 
              album.artist === entry.master_metadata_album_artist_name
            );
          }
          
          const isArtistMatch = selectedArtists.length === 0 || 
            selectedArtists.includes(entry.master_metadata_album_artist_name);
          
          const isFeatureMatch = featureArtists && 
            selectedArtists.some(artist => 
              featureArtists.some(feature => 
                feature.toLowerCase().includes(artist.toLowerCase())
              )
            );
          
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
          
          let key;
          try {
            key = createMatchKey(
              entry.master_metadata_track_name,
              entry.master_metadata_album_artist_name
            );
          } catch (err) {
            key = `${entry.master_metadata_track_name}-${entry.master_metadata_album_artist_name}`;
          }
          
          const trackLookupKey = `${entry.master_metadata_track_name.toLowerCase().trim()}|||${entry.master_metadata_album_artist_name.toLowerCase().trim()}`;
          const lookupAlbumName = entry.master_metadata_album_album_name || albumMap.get(trackLookupKey) || 'Unknown Album';
          
          if (!trackStats[key]) {
            trackStats[key] = {
              key,
              trackName: entry.master_metadata_track_name,
              artist: entry.master_metadata_album_artist_name,
              albumName: lookupAlbumName,
              totalPlayed: 0,
              playCount: 0,
              featureArtists,
              variations: [entry.master_metadata_track_name],
              isFeatured: isFeatureMatch
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
      } catch (err) {}
    });

    return Object.values(trackStats)
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, topN);
  }, [rawPlayData, startDate, endDate, topN, sortBy, selectedArtists, selectedAlbums, includeFeatures, onlyFeatures, albumMap]);

  // Group tracks by year for PlaylistExporter
  const songsByYear = useMemo(() => {
    const yearGroups = {};
    
    if (selectedYear !== 'all') {
      return { [selectedYear]: filteredTracks };
    } else if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      const rangeLabel = `${yearRange.startYear}-${yearRange.endYear}`;
      return { [rangeLabel]: filteredTracks };
    }
    
    return { all: filteredTracks };
  }, [filteredTracks, startDate, endDate, selectedYear, yearRangeMode, yearRange]);

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
      return `Custom Track Range for ${selectedYear}`;
    } else {
      return 'Custom Date Range Selection';
    }
  };

  // Get formatted date range string
  const getFormattedDateRange = () => {
    if (!startDate && !endDate) {
      return "All Time";
    } else if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `${yearRange.startYear}-01-01 to ${yearRange.endYear}-12-31`;
    } else if (selectedYear !== 'all') {
      return `${selectedYear}-01-01 to ${selectedYear}-12-31`;
    } else if (startDate && endDate) {
      return `${startDate} to ${endDate}`;
    } else {
      return "Custom Date Range";
    }
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
              </div>
              <div 
                className="text-xs text-orange-600 cursor-pointer hover:underline"
                onClick={() => addArtistFromTrack(song.artist)}
              >
                {song.artist}
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
          className="p-2 text-orange-700 cursor-pointer hover:underline" 
          onClick={() => addArtistFromTrack(song.artist)}
        > 
          {song.artist} 
        </td>
        <td 
          className="p-2 text-orange-700 cursor-pointer hover:underline" 
          onClick={() => addAlbumFromTrack(song.albumName, song.artist)}
        >
          {song.albumName}
        </td>
        <td className="p-2 text-right text-orange-700">{formatDuration(song.totalPlayed)}</td>
        <td className="p-2 text-right text-orange-700">{song.playCount}</td>
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
                max="250"
                value={topN}
                onChange={(e) => setTopN(Math.min(250, Math.max(1, parseInt(e.target.value))))}
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
            
            {/* Only features toggle */}
            <label className={`flex items-center cursor-pointer ${includeFeatures ? 'opacity-50' : ''}`}>
              <div className="relative">
                <input 
                  type="checkbox" 
                  checked={onlyFeatures} 
                  disabled={includeFeatures}
                  onChange={() => handleFeatureToggleChange('only', !onlyFeatures)}
                  className="sr-only"
                />
                <div className={`block w-8 sm:w-10 h-5 sm:h-6 rounded-full ${onlyFeatures ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-3 sm:w-4 h-3 sm:h-4 rounded-full transition-transform ${onlyFeatures ? 'transform translate-x-3 sm:translate-x-4' : ''}`}></div>
              </div>
              <span className="ml-2 text-orange-700 text-xs sm:text-sm">
                Only features
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Results section with date range info */}
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