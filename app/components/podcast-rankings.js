import React, { useState, useMemo, useEffect } from 'react';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

const PodcastRankings = ({ rawPlayData = [], formatDuration, initialShows = [] }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topN, setTopN] = useState(50);
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [selectedShows, setSelectedShows] = useState(initialShows);
  const [showSearch, setShowSearch] = useState('');
  
  const addShowFromEpisode = (show) => {
    if (!selectedShows.includes(show)) {
      setSelectedShows(prev => [...prev, show]);
    }
  };

  useEffect(() => {
    if (!startDate && !endDate) {
      const defaultEnd = new Date();
      const defaultStart = subDays(defaultEnd, 30);
      setStartDate(format(defaultStart, 'yyyy-MM-dd'));
      setEndDate(format(defaultEnd, 'yyyy-MM-dd'));
    }
  }, []);

  // Get unique shows from raw play data
  const allShows = useMemo(() => {
    const shows = new Set(
      rawPlayData
        .filter(entry => entry.episode_show_name)
        .map(entry => entry.episode_show_name)
    );
    return Array.from(shows).sort();
  }, [rawPlayData]);

  const filteredShows = useMemo(() => {
    return allShows
      .filter(show => 
        show.toLowerCase().includes(showSearch.toLowerCase()) &&
        !selectedShows.includes(show)
      )
      .slice(0, 10);
  }, [allShows, showSearch, selectedShows]);

  const filteredEpisodes = useMemo(() => {
  if (!rawPlayData?.length) return [];
  
  const start = startDate ? startOfDay(new Date(startDate)) : new Date(0);
  const end = endDate ? endOfDay(new Date(endDate)) : new Date();
  
  const episodeStats = {};
  
  rawPlayData.forEach(entry => {
    const timestamp = new Date(entry.playedAt);
    if (
      timestamp >= start && 
      timestamp <= end && 
      entry.isPodcast &&
      entry.podcastName &&
      entry.podcastEpisode &&
      (selectedShows.length === 0 || selectedShows.includes(entry.podcastName))
    ) {
      const key = `${entry.podcastEpisode}-${entry.podcastName}`;
      if (!episodeStats[key]) {
        episodeStats[key] = {
          key,
          episodeName: entry.podcastEpisode,
          showName: entry.podcastName,
          totalPlayed: 0,
          segmentCount: 0,
          playSegments: [],
          durationMs: entry.durationMs || 0
        };
      }
      
      if (entry.playedMs >= 300000) { // 5 minutes
        episodeStats[key].segmentCount++;
        episodeStats[key].playSegments.push({
          timestamp: new Date(entry.playedAt),
          duration: entry.playedMs
        });
      }
      
      episodeStats[key].totalPlayed += entry.playedMs;
    }
  });

  return Object.values(episodeStats)
    .map(episode => ({
      ...episode,
      percentageListened: episode.durationMs ? 
        Math.round((episode.totalPlayed / episode.durationMs) * 100) : null,
      averageSegmentLength: Math.round(episode.totalPlayed / episode.segmentCount)
    }))
    .sort((a, b) => b[sortBy] - a[sortBy])
    .slice(0, topN);
}, [rawPlayData, startDate, endDate, topN, sortBy, selectedShows]);

  const setQuickRange = (days) => {
    const currentStart = startDate ? new Date(startDate) : new Date();
    const end = new Date(currentStart);
    end.setDate(currentStart.getDate() + days);
    setStartDate(format(currentStart, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const addShow = (show) => {
    setSelectedShows(prev => [...prev, show]);
    setShowSearch('');
  };

  const removeShow = (show) => {
    setSelectedShows(prev => prev.filter(s => s !== show));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-indigo-700">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
        </div>
        
        <div className="flex gap-2">
          <button onClick={() => setQuickRange(0)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
            Day
          </button>
          <button onClick={() => setQuickRange(7)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
            Week
          </button>
          <button onClick={() => setQuickRange(30)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
            Month
          </button>
          <button onClick={() => setQuickRange(90)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
            Quarter
          </button>
          <button onClick={() => setQuickRange(365)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
            Year
          </button>
        </div>

        <div className="flex items-center gap-2 text-indigo-700">
          <label>Top</label>
          <input
            type="number"
            min="1"
            max="999"
            value={topN}
            onChange={(e) => setTopN(Math.min(999, Math.max(1, parseInt(e.target.value))))}
            className="border rounded w-16 px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
          <label>episodes</label>
        </div>
      </div>

      {/* Show Selection */}
      <div className="relative">
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedShows.map(show => (
            <div 
              key={show} 
              className="flex items-center bg-indigo-600 text-white px-2 py-1 rounded text-sm"
            >
              {show}
              <button 
                onClick={() => removeShow(show)}
                className="ml-2 text-white hover:text-indigo-200"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            value={showSearch}
            onChange={(e) => setShowSearch(e.target.value)}
            placeholder="Search shows..."
            className="w-full border rounded px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
          {showSearch && filteredShows.length > 0 && (
            <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1">
              {filteredShows.map(show => (
                <div
                  key={show}
                  onClick={() => addShow(show)}
                  className="px-2 py-1 hover:bg-indigo-100 cursor-pointer"
                >
                  {show}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {filteredEpisodes.length > 0 ? (
  <div className="overflow-x-auto -mx-4 px-4">
  <div className="min-w-[640px]">
    <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left text-indigo-700">Rank</th>
              <th className="p-2 text-left text-indigo-700">Episode</th>
              <th className="p-2 text-left text-indigo-700">Show</th>
              <th 
                className={`p-2 text-right text-indigo-700 cursor-pointer hover:bg-indigo-100 ${sortBy === 'totalPlayed' ? 'font-bold' : ''}`}
                onClick={() => setSortBy('totalPlayed')}
              >
                Total Time {sortBy === 'totalPlayed' && '▼'}
              </th>
              <th 
                className={`p-2 text-right text-indigo-700 cursor-pointer hover:bg-indigo-100 ${sortBy === 'segmentCount' ? 'font-bold' : ''}`}
                onClick={() => setSortBy('segmentCount')}
              >
                Sessions {sortBy === 'segmentCount' && '▼'}
              </th>
              <th className="p-2 text-right text-indigo-700">% Complete</th>
              <th className="p-2 text-right text-indigo-700">Avg Session</th>
            </tr>
          </thead>
          <tbody>
            {filteredEpisodes.map((episode, index) => (
              <tr key={episode.key} className="border-b hover:bg-indigo-50">
                <td className="p-2 text-indigo-700">{index + 1}</td>
                <td className="p-2 text-indigo-700">{episode.episodeName}</td>
                <td className="p-2 text-indigo-700 cursor-pointer hover:underline" 
                    onClick={() => addShowFromEpisode(episode.showName)}
                >
                  {episode.showName}
                </td>
                <td className="p-2 text-right text-indigo-700">
                  {formatDuration(episode.totalPlayed)}
                </td>
                <td className="p-2 text-right text-indigo-700">
                  {episode.segmentCount}
                </td>
                <td className="p-2 text-right text-indigo-700">
                  {episode.percentageListened !== null ? 
                    `${episode.percentageListened}%` : 
                    'N/A'}
                </td>
                <td className="p-2 text-right text-indigo-700">
                  {formatDuration(episode.averageSegmentLength)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
  </div>
</div>
      ) : (
        <div className="text-center py-4 text-indigo-500">
          {startDate || endDate || selectedShows.length > 0 
            ? 'No episodes found matching your filters' 
            : 'Select filters to view episodes'}
        </div>
      )}
    </div>
  );
};

export default PodcastRankings;