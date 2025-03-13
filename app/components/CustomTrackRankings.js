import React, { useState, useMemo, useEffect } from 'react';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { normalizeString, createMatchKey } from './streaming-adapter.js';

const CustomTrackRankings = ({ rawPlayData = [], formatDuration, initialArtists = [] }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topN, setTopN] = useState(50);
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [selectedArtists, setSelectedArtists] = useState(initialArtists);
  const [artistSearch, setArtistSearch] = useState('');
  const [includeFeatures, setIncludeFeatures] = useState(false); // Toggle for including features
  const [onlyFeatures, setOnlyFeatures] = useState(false); // New toggle for showing only features
  
  const addArtistFromTrack = (artist) => {
    // Prevent duplicate artists
    if (!selectedArtists.includes(artist)) {
      setSelectedArtists(prev => [...prev, artist]);
    }
  };

  useEffect(() => {
    if (!startDate && !endDate && rawPlayData.length > 0) {
      let earliest = new Date(rawPlayData[0].ts);
      let latest = new Date(rawPlayData[0].ts);
      
      for (const entry of rawPlayData) {
        const date = new Date(entry.ts);
        if (date < earliest) earliest = date;
        if (date > latest) latest = date;
      }
      
      setStartDate(format(earliest, 'yyyy-MM-dd'));
      setEndDate(format(latest, 'yyyy-MM-dd'));
    }
  }, [rawPlayData, startDate, endDate]);

  // Get unique artists from raw play data
  const allArtists = useMemo(() => {
    const artists = new Set(
      rawPlayData
        .filter(entry => entry.master_metadata_album_artist_name)
        .map(entry => entry.master_metadata_album_artist_name)
    );
    return Array.from(artists).sort();
  }, [rawPlayData]);

  const filteredArtists = useMemo(() => {
    return allArtists
      .filter(artist => 
        artist.toLowerCase().includes(artistSearch.toLowerCase()) &&
        !selectedArtists.includes(artist)
      )
      .slice(0, 10);
  }, [allArtists, artistSearch, selectedArtists]);

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
    
    const start = startDate ? startOfDay(new Date(startDate)) : new Date(0);
    const end = endDate ? endOfDay(new Date(endDate)) : new Date();
    
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
            // No artists selected - include everything
            selectedArtists.length === 0 ||
            
            // Only features mode - only include feature matches
            (onlyFeatures && isFeatureMatch) ||
            
            // Main artist matches (when not in only-features mode)
            (!onlyFeatures && isArtistMatch) ||
            
            // Include features mode - include feature matches
            (!onlyFeatures && includeFeatures && isFeatureMatch)
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
          let albumName = entry.master_metadata_album_album_name || albumMap.get(trackLookupKey) || 'Unknown Album';
          
          if (!trackStats[key]) {
            // New track, create its stats object
            trackStats[key] = {
              key,
              trackName: entry.master_metadata_track_name,
              artist: entry.master_metadata_album_artist_name,
              albumName: albumName,
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
            if (albumName !== 'Unknown Album' && 
                (trackStats[key].albumName === 'Unknown Album' || entry.source === 'spotify')) {
              trackStats[key].albumName = albumName;
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
  }, [rawPlayData, startDate, endDate, topN, sortBy, selectedArtists, includeFeatures, onlyFeatures, albumMap]);

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const addArtist = (artist) => {
    setSelectedArtists(prev => [...prev, artist]);
    setArtistSearch('');
  };

  const removeArtist = (artist) => {
    setSelectedArtists(prev => prev.filter(a => a !== artist));
  };

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-orange-700">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setQuickRange(0)} className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">
            Day
          </button>
          <button onClick={() => setQuickRange(7)} className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">
            Week
          </button>
          <button onClick={() => setQuickRange(30)} className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">
            Month
          </button>
          <button onClick={() => setQuickRange(90)} className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">
            Quarter
          </button>
          <button onClick={() => setQuickRange(365)} className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200">
            Year
          </button>
        </div>

        <div className="flex items-center gap-2 text-orange-700">
          <label>Top</label>
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

      {/* Artist Selection */}
      <div className="relative">
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedArtists.map(artist => (
            <div 
              key={artist} 
              className="flex items-center bg-orange-600 text-white px-2 py-1 rounded text-sm"
            >
              {artist}
              <button 
                onClick={() => removeArtist(artist)}
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
            value={artistSearch}
            onChange={(e) => setArtistSearch(e.target.value)}
            placeholder="Search artists..."
            className="w-full border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
          />
          {artistSearch && filteredArtists.length > 0 && (
            <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1">
              {filteredArtists.map(artist => (
                <div
                  key={artist}
                  onClick={() => addArtist(artist)}
                  className="px-2 py-1 hover:bg-orange-100 cursor-pointer"
                >
                  {artist}
                </div>
              ))}
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
                    className={`p-2 text-right text-orange-700 cursor-pointer hover:bg-orange-100 ${sortBy === 'totalPlayed' ? 'font-bold' : ''}`}
                    onClick={() => setSortBy('totalPlayed')}
                  >
                    Total Time {sortBy === 'totalPlayed' && '▼'}
                  </th>
                  <th 
                    className={`p-2 text-right text-orange-700 cursor-pointer hover:bg-orange-100 ${sortBy === 'playCount' ? 'font-bold' : ''}`}
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
                          {song.featureArtists && song.featureArtists.length > 0 && (
                            <div className="text-xs text-orange-500 mt-0.5">
                              feat. {song.featureArtists.join(', ')}
                            </div>
                          )}
                          {song.variations && song.variations.length > 1 && (
                            <div className="text-xs text-orange-400 mt-0.5">
                              Also: {song.variations.filter(v => v !== song.trackName)[0]}
                              {song.variations.length > 2 ? ` +${song.variations.length - 2} more` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td 
                      className="p-2 text-orange-700 cursor-pointer hover:underline" 
                      onClick={() => addArtistFromTrack(song.artist)}
                    > 
                      {song.artist} 
                    </td>
                    <td className="p-2 text-orange-700">{song.albumName}</td>
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
          {startDate || endDate || selectedArtists.length > 0 
            ? 'No tracks found matching your filters' 
            : 'Select filters to view tracks'}
        </div>
      )}
    </div>
  );
};

export default CustomTrackRankings;