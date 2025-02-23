import React, { useState, useMemo, useEffect } from 'react';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

const CustomTrackRankings = ({ rawPlayData = [], formatDuration, initialArtists = []  }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topN, setTopN] = useState(50);
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [selectedArtists, setSelectedArtists] = useState(initialArtists);
  const [artistSearch, setArtistSearch] = useState('');
  const [key, setKey] = useState(0);
  
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

const filteredTracks = useMemo(() => {
  if (!rawPlayData?.length) return [];
  
  const start = startDate ? startOfDay(new Date(startDate)) : new Date(0);
  const end = endDate ? endOfDay(new Date(endDate)) : new Date();
  
  const trackStats = {};
  rawPlayData.forEach(entry => {
    const timestamp = new Date(entry.playedAt);
    if (
      timestamp >= start && 
      timestamp <= end && 
      entry.playedMs >= 30000 && 
      entry.trackName &&
      !entry.isPodcast &&
      (selectedArtists.length === 0 || selectedArtists.includes(entry.artistName))
    ) {
      const key = `${entry.trackName}-${entry.artistName}`;
      if (!trackStats[key]) {
        trackStats[key] = {
          key,
          trackName: entry.trackName,
          artistName: entry.artistName,
          totalPlayed: 0,
          playCount: 0
        };
      }
      trackStats[key].totalPlayed += entry.playedMs;
      trackStats[key].playCount += 1;
    }
  });

  return Object.values(trackStats)
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, topN);
}, [rawPlayData, startDate, endDate, topN, sortBy, selectedArtists]);

const setQuickRange = (days) => {
    const currentStart = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(currentStart);
    end.setDate(end.getDate() + days);  // This is the fix
    setStartDate(format(currentStart, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
};

  const addArtist = (artist) => {
    setSelectedArtists(prev => [...prev, artist]);
    setArtistSearch('');
  };

  const removeArtist = (artist) => {
    setSelectedArtists(prev => prev.filter(a => a !== artist));
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
              <tr key={song.key} className="border-b hover:bg-orange-50">
                <td className="p-2 text-orange-700">{index + 1}</td>
                <td className="p-2 text-orange-700">{song.trackName}</td>
     
                <td className="p-2 text-orange-700 cursor-pointer hover:underline" onClick={() => addArtistFromTrack(song.artist)}> {song.artist} </td>
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