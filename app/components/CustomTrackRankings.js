import React, { useState, useMemo, useEffect } from 'react';
import { normalizeString, createMatchKey } from './streaming-adapter.js';
import { Download, Plus } from 'lucide-react';
import DateSelector from './dateselector.js';
import YearSelector from './year-selector.js';
import TripleRangeSelector from './TripleRangeSelector.js';

const CustomTrackRankings = ({ 
  rawPlayData = [], 
  formatDuration, 
  initialArtists = [] 
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
  const [includeFeatures, setIncludeFeatures] = useState(false); // Toggle for including features
  const [onlyFeatures, setOnlyFeatures] = useState(false); // Toggle for showing only features
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [musicBasePath, setMusicBasePath] = useState('/Music/Downloads');
  const [fileExtension, setFileExtension] = useState('mp3');
  const [pathFormat, setPathFormat] = useState('default');
  const [customPathFormat, setCustomPathFormat] = useState('{basePath}/{artist}/{artist}-{album}/{track}.{ext}');
  const [playlistName, setPlaylistName] = useState('Custom Date Range Playlist');
  
  // Year-based date selection
  const [yearRangeMode, setYearRangeMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');
  const [yearRange, setYearRange] = useState({ startYear: '', endYear: '' });
  
// Update the availableYears useMemo to ensure it properly extracts years from rawPlayData
const availableYears = useMemo(() => {
  const yearsSet = new Set();
  
  // Make sure we have valid data
  if (!rawPlayData || !Array.isArray(rawPlayData) || rawPlayData.length === 0) {
    console.warn('No raw play data available for year extraction');
    return [];
  }
  
  // Loop through all entries and collect years
  let count = 0;
  rawPlayData.forEach(entry => {
    if (entry && entry.ts && entry.ms_played >= 30000) {
      try {
        const date = new Date(entry.ts);
        if (!isNaN(date.getTime())) {
          yearsSet.add(date.getFullYear().toString());
          count++;
        }
      } catch (err) {
        console.warn('Error parsing date:', entry.ts);
      }
    }
  });
  
  console.log(`Extracted ${yearsSet.size} unique years from ${count} valid entries`);
  
  // Convert to sorted array
  return Array.from(yearsSet).sort();
}, [rawPlayData]);
  
  // When year or year range changes, update the date range
  useEffect(() => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      setStartDate(`${yearRange.startYear}-01-01`);
      setEndDate(`${yearRange.endYear}-12-31`);
    } else if (selectedYear !== 'all') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
    } else {
      // All years - find min and max dates
      if (availableYears.length > 0) {
        const minYear = Math.min(...availableYears.map(y => parseInt(y)));
        const maxYear = Math.max(...availableYears.map(y => parseInt(y)));
        setStartDate(`${minYear}-01-01`);
        setEndDate(`${maxYear}-12-31`);
      } else {
        // No data, use defaults
        setStartDate('');
        setEndDate('');
      }
    }
  }, [selectedYear, yearRangeMode, yearRange, availableYears]);
  
// Use this simplified function
const handleDateChange = (start, end) => {
  setStartDate(start);
  setEndDate(end);
};
  
  // Toggle between single year and year range modes
  const toggleYearRangeMode = (value) => {
    setYearRangeMode(value);
  };
  
  const addArtistFromTrack = (artist) => {
    // Prevent duplicate artists
    if (!selectedArtists.includes(artist)) {
      setSelectedArtists(prev => [...prev, artist]);
    }
  };
  
  const addAlbumFromTrack = (album, artist) => {
    // Create a unique identifier for the album
    const albumKey = `${album} - ${artist}`;
    
    // Prevent duplicate albums
    if (!selectedAlbums.some(a => a.key === albumKey)) {
      setSelectedAlbums(prev => [...prev, { 
        name: album, 
        artist: artist, 
        key: albumKey 
      }]);
    }
  };

  // Set quick date range
  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
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
    
    // First pass: collect all Spotify album information
    rawPlayData.forEach(entry => {
      if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
        const albumName = entry.master_metadata_album_album_name;
        
        if (albumName) {
          const trackName = entry.master_metadata_track_name.toLowerCase().trim();
          const artistName = entry.master_metadata_album_artist_name.toLowerCase().trim();
          
          // Create a key that identifies this track
          const trackKey = `${trackName}|||${artistName}`;
          
          // Store the album information for this track
          // Prioritize Spotify entries (they usually have better metadata)
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
    
    const start = startDate ? new Date(startDate) : new Date(0);
    start.setHours(0, 0, 0, 0); // Start of day
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999); // End of day
    
    const trackStats = {};
    rawPlayData.forEach(entry => {
      try {
        const timestamp = new Date(entry.ts);
        
        // Check if the entry is within the selected date range and has sufficient play time
        if (timestamp >= start && 
            timestamp <= end && 
            entry.ms_played >= 30000 && 
            entry.master_metadata_track_name) {
          
          // Extract feature artists
          let featureArtists = null;
          try {
            const result = normalizeString(entry.master_metadata_track_name);
            featureArtists = result.featureArtists;
          } catch (err) {
            console.warn('Error normalizing track name:', err);
          }
          
          // Album filtering
          const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
          let isAlbumMatch = true;
          
          if (selectedAlbums.length > 0) {
            isAlbumMatch = selectedAlbums.some(album => 
              album.name === albumName && 
              album.artist === entry.master_metadata_album_artist_name
            );
          }
          
          // Check if this is a main artist match
          const isArtistMatch = selectedArtists.length === 0 || 
            selectedArtists.includes(entry.master_metadata_album_artist_name);
          
          // Check if this is a feature artist match
          const isFeatureMatch = featureArtists && 
            selectedArtists.some(artist => 
              featureArtists.some(feature => 
                feature.toLowerCase().includes(artist.toLowerCase())
              )
            );
          
          // Handle filter logic for different toggle states
          const shouldInclude = (
            // Album filter must match if albums are selected
            isAlbumMatch &&
            (
              // No artists selected - include everything
              selectedArtists.length === 0 ||
              
              // Only features mode - only include feature matches
              (onlyFeatures && isFeatureMatch) ||
              
              // Main artist matches (when not in only-features mode)
              (!onlyFeatures && isArtistMatch) ||
              
              // Include features mode - include feature matches
              (!onlyFeatures && includeFeatures && isFeatureMatch)
            )
          );
          
          if (!shouldInclude) {
            return; // Skip this track
          }
          
          // Create a unique key for the track
          let key;
          try {
            key = createMatchKey(
              entry.master_metadata_track_name,
              entry.master_metadata_album_artist_name
            );
          } catch (err) {
            console.warn('Error creating match key:', err);
            key = `${entry.master_metadata_track_name}-${entry.master_metadata_album_artist_name}`;
          }
          
          // Get the album name if available
          const trackLookupKey = `${entry.master_metadata_track_name.toLowerCase().trim()}|||${entry.master_metadata_album_artist_name.toLowerCase().trim()}`;
          const lookupAlbumName = entry.master_metadata_album_album_name || albumMap.get(trackLookupKey) || 'Unknown Album';
          
          if (!trackStats[key]) {
            // New track, create its stats object
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
            // Track variations
            if (trackStats[key].variations && 
                !trackStats[key].variations.includes(entry.master_metadata_track_name)) {
              trackStats[key].variations.push(entry.master_metadata_track_name);
            }
            
            // Update the featured flag if not already set
            if (isFeatureMatch && !trackStats[key].isFeatured) {
              trackStats[key].isFeatured = true;
            }
            
            // Update album name if this entry has a better one
            if (lookupAlbumName !== 'Unknown Album' && 
                (trackStats[key].albumName === 'Unknown Album' || entry.source === 'spotify')) {
              trackStats[key].albumName = lookupAlbumName;
            }
          }
          
          // Update play statistics
          trackStats[key].totalPlayed += entry.ms_played;
          trackStats[key].playCount += 1;
        }
      } catch (err) {
        console.error('Error processing track entry:', err);
      }
    });

    return Object.values(trackStats)
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, topN);
  }, [rawPlayData, startDate, endDate, topN, sortBy, selectedArtists, selectedAlbums, includeFeatures, onlyFeatures, albumMap]);

  // Handle changes to feature toggles
  const handleFeatureToggleChange = (toggleType, value) => {
    if (toggleType === 'include') {
      setIncludeFeatures(value);
      // If turning on "only features", turn off "include features"
      if (onlyFeatures && value) {
        setOnlyFeatures(false);
      }
    } else { // 'only'
      setOnlyFeatures(value);
      // If turning on "only features", turn off "include features"
      if (includeFeatures && value) {
        setIncludeFeatures(false);
      }
    }
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
    if (filteredTracks.length === 0) {
      return '';
    }
    
    // Create the M3U content
    let content = '#EXTM3U\n';
    
    filteredTracks.forEach((track, index) => {
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
    if (filteredTracks.length === 0) {
      alert('No tracks to export');
      return;
    }
    
    const content = createM3UContent();
    if (!content) {
      alert('Error creating playlist content');
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

  // Create an object with years for YearSelector
  const yearsForYearSelector = useMemo(() => {
    const yearsObj = {};
    availableYears.forEach(year => {
      yearsObj[year] = []; // YearSelector expects an object with years as keys
    });
    return yearsObj;
  }, [availableYears]);

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

return (
  <div className="space-y-4">
    <div className="border rounded-lg p-4 bg-orange-50">
      <h3 className="font-bold text-orange-700 mb-2">{getPageTitle()}</h3>
      
      <div className="mt-2">
        {useTripleSelector ? (
          <TripleRangeSelector
            onDateRangeChange={handleDateChange}
            initialStartDate={startDate}
            initialEndDate={endDate}
            colorTheme="orange"
          />
        ) : (
          // You need an alternative component here, or null if you only want the triple selector
          null
        )}
      </div>
    </div>
  </div>
);
        {/* Top N tracks control */}
        <div className="mt-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-orange-700">
            <label>Show top</label>
            <input
              type="number"
              min="1"
              max="999"
              value={topN}
              onChange={(e) => setTopN(Math.min(999, Math.max(1, parseInt(e.target.value))))}
              className="border rounded w-16 px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
            />
            <label>tracks</label>
          </div>
        </div>
      </div>

      {/* Artist and Album Selection */}
      <div className="border rounded-lg p-4 bg-orange-50">
        <h3 className="font-bold text-orange-700 mb-2">Artist and Album Selection</h3>
        
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedArtists.map(artist => (
            <div 
              key={artist} 
              className="flex items-center bg-orange-600 text-white px-2 py-1 rounded text-sm"
            >
              {artist}
              <button 
                onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                className="ml-2 text-white hover:text-orange-200"
              >
                ×
              </button>
            </div>
          ))}
          
          {selectedAlbums.map(album => (
            <div 
              key={album.key} 
              className="flex items-center bg-orange-500 text-white px-2 py-1 rounded text-sm"
            >
              <span className="mr-1">💿</span> {album.name} <span className="text-xs ml-1">({album.artist})</span>
              <button 
                onClick={() => setSelectedAlbums(prev => prev.filter(a => a.key !== album.key))}
                className="ml-2 text-white hover:text-orange-200"
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
              // Update all search states with the same value
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
          <div className="flex flex-col sm:flex-row gap-4 mt-2">
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
                <div className={`block w-10 h-6 rounded-full ${includeFeatures ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${includeFeatures ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className="ml-2 text-orange-700">
                Include songs featuring these artists
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
                <div className={`block w-10 h-6 rounded-full ${onlyFeatures ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${onlyFeatures ? 'transform translate-x-4' : ''}`}></div>
              </div>
              <span className="ml-2 text-orange-700">
                Only show songs where these artists are featured
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Export Controls */}
      <div>
        <button
          onClick={() => setShowExportOptions(!showExportOptions)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          <Download size={16} />
          {showExportOptions ? 'Hide Export Options' : 'Export as M3U Playlist'}
        </button>
        
        {showExportOptions && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded">
            <div>
              <label className="block text-orange-700 mb-1">Playlist Name:</label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-700"
                placeholder="Enter playlist name"
              />
            </div>
            
            <div className="mt-3">
              <label className="block text-orange-700 mb-1">Base Music Path:</label>
              <input
                type="text"
                value={musicBasePath}
                onChange={(e) => setMusicBasePath(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-700"
                placeholder="e.g. /Music/Downloads or C:/Music"
              />
            </div>
            
            <div className="mt-3">
              <label className="block text-orange-700 mb-1">File Extension:</label>
              <select
                value={fileExtension}
                onChange={(e) => setFileExtension(e.target.value)}
                className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-orange-500 text-orange-700"
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
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed"
              >
                Download Playlist ({filteredTracks.length} tracks)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results section */}
      {filteredTracks.length > 0 ? (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[640px]">
            <table className="w-full">
              <thead>
                <tr className="border-b">
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
                    Total Time {sortBy === 'totalPlayed' && '▼'}
                  </th>
                  <th 
                    className={`p-2 text-right text-orange-700 cursor-pointer hover:bg-orange-100 ${
                      sortBy === 'playCount' ? 'font-bold' : ''
                    }`}
                    onClick={() => setSortBy('playCount')}
                  >
                    Play Count {sortBy === 'playCount' && '▼'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.map((song, index) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-orange-500">
          {startDate || endDate || selectedArtists.length > 0 || selectedAlbums.length > 0 
            ? 'No tracks found matching your filters' 
            : 'Select filters to view tracks'}
        </div>
      )}
    </div>
  );
};

export default CustomTrackRankings;