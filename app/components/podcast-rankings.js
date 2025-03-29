import React, { useState, useMemo, useEffect } from 'react';
import { 
    startOfDay, endOfDay, 
    startOfYear, endOfYear, // Import year functions
    format, differenceInMinutes, parseISO, addMilliseconds, max, min 
} from 'date-fns';
import YearSelector from './YearSelector'; // Import the new component

// Helper to safely parse dates
const safeParseISO = (dateString) => {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return null;
  }
};

// Helper to format duration
const formatDurationFallback = (ms) => {
  if (ms === null || ms === undefined || isNaN(ms) || ms <= 0) return 'N/A';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (hours === 0 && minutes === 0 || seconds > 0) { // Show seconds if less than a minute or if there are remaining seconds
      parts.push(`${seconds}s`);
  }
  
  return parts.length > 0 ? parts.join(' ') : '0s';
};


const PodcastRankings = ({
  rawPlayData = [],
  formatDuration = formatDurationFallback,
  initialShows = []
}) => {
  // State for year selection
  const [selectionMode, setSelectionMode] = useState('all-time'); // 'single', 'range', 'all-time'
  const [selectedYear, setSelectedYear] = useState('all'); // e.g., '2023' or 'all'
  const [selectedYearRange, setSelectedYearRange] = useState(null); // e.g., { startYear: '2021', endYear: '2023' }

  // State for other controls
  const [topN, setTopN] = useState(50);
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [selectedShows, setSelectedShows] = useState(initialShows);
  const [showSearch, setShowSearch] = useState('');
  const [mergeThresholdMinutes, setMergeThresholdMinutes] = useState(10);
  const [showDuplicateStats, setShowDuplicateStats] = useState(true);
  const [processingStats, setProcessingStats] = useState({ /* ... initial ... */ });

  // --- Derive available years for YearSelector ---
  const availableYears = useMemo(() => {
    const yearSet = new Set();
    rawPlayData.forEach(entry => {
      const date = safeParseISO(entry.ts);
      if (date) {
        yearSet.add(format(date, 'yyyy'));
      }
    });
    return Array.from(yearSet).sort((a, b) => parseInt(a) - parseInt(b));
  }, [rawPlayData]);

  // --- Callbacks for YearSelector ---
  const handleYearChange = (year) => {
    console.log("Single Year Selected:", year);
    setSelectionMode('single');
    setSelectedYear(year);
    setSelectedYearRange(null); // Clear range selection
  };

  const handleYearRangeChange = (range) => {
    console.log("Year Range Selected:", range);
    setSelectionMode('range');
    setSelectedYearRange(range);
    setSelectedYear('all'); // Clear single year selection
  };

  const handleModeChange = (newMode) => {
      console.log("Mode Changed To:", newMode);
      setSelectionMode(newMode);
      // If switching to all-time, update the 'selectedYear' state
      if (newMode === 'all-time') {
          setSelectedYear('all');
          setSelectedYearRange(null);
      } else if (newMode === 'single' && selectedYear === 'all' && availableYears.length > 0) {
          // Default to latest year if switching from all-time to single
          setSelectedYear(availableYears[availableYears.length - 1]);
          setSelectedYearRange(null);
      } else if (newMode === 'range' && selectedYearRange === null && availableYears.length >= 2) {
          // Default to full range if switching from other modes to range
          setSelectedYearRange({
              startYear: availableYears[0],
              endYear: availableYears[availableYears.length - 1]
          });
          setSelectedYear('all');
      }
  }
  
  // --- Show data derivation (unchanged) ---
  const allShows = useMemo(() => { /* ... */ }, [rawPlayData]);
  const filteredShows = useMemo(() => { /* ... */ }, [allShows, showSearch, selectedShows]);

  // --- Episode Processing (useMemo adapted for new state) ---
  const processedEpisodes = useMemo(() => {
    console.time("Processing Episodes");
    if (!rawPlayData?.length) {
      console.timeEnd("Processing Episodes");
      return [];
    }

    let start = new Date(0);
    let end = new Date(); // Default to all time

    // Determine date range based on selectionMode
    if (selectionMode === 'single' && selectedYear !== 'all') {
        const yearNum = parseInt(selectedYear);
        if (!isNaN(yearNum)) {
            start = startOfYear(new Date(yearNum, 0, 1));
            end = endOfYear(new Date(yearNum, 11, 31));
        } else {
             console.warn("Invalid single year selected:", selectedYear);
             // Keep default all-time range if year is invalid
        }
    } else if (selectionMode === 'range' && selectedYearRange) {
        const startYearNum = parseInt(selectedYearRange.startYear);
        const endYearNum = parseInt(selectedYearRange.endYear);
        if (!isNaN(startYearNum) && !isNaN(endYearNum)) {
             start = startOfYear(new Date(startYearNum, 0, 1));
             end = endOfYear(new Date(endYearNum, 11, 31));
        } else {
            console.warn("Invalid year range selected:", selectedYearRange);
            // Keep default all-time range if range is invalid
        }
    } 
    // If mode is 'all-time' or fallbacks occurred, use default full range

    const mergeThresholdMs = mergeThresholdMinutes * 60 * 1000;
    const stats = { /* ... initial stats object ... */ };
    const episodeMap = {};
    const hashTracker = new Set();

    // Step 1: Initial Filtering and Grouping
    for (const entry of rawPlayData) {
      stats.initialEvents++;
      const endTime = safeParseISO(entry.ts);
      const durationMs = typeof entry.ms_played === 'number' ? entry.ms_played : 0;

      // Filter by date range derived from year selection
      if (!endTime || durationMs < 0 || endTime < start || endTime > end) {
        stats.filteredOutInvalid++;
        continue;
      }
      
      const episodeKey = entry.spotify_episode_uri || `${entry.episode_name}|${entry.episode_show_name}`;
      if (!episodeKey || !entry.episode_show_name || !entry.episode_name) {
          stats.filteredOutInvalid++;
          continue;
      }

      if (selectedShows.length > 0 && !selectedShows.includes(entry.episode_show_name)) {
        continue;
      }

      if (durationMs === 0) {
        stats.filteredOutZeroDuration++;
        continue;
      }

      const eventHash = `${entry.ts}_${durationMs}_${episodeKey}`;
      if (hashTracker.has(eventHash)) {
        stats.exactDuplicatesRemoved++;
        continue;
      }
      hashTracker.add(eventHash);

      const startTime = new Date(endTime.getTime() - durationMs);

      if (!episodeMap[episodeKey]) {
        episodeMap[episodeKey] = {
          key: episodeKey,
          episodeName: entry.episode_name,
          showName: entry.episode_show_name,
          events: [],
          uniquePlatforms: new Set(),
          longestSinglePlay: 0,
          episodeDurationMs: null
        };
      }

      episodeMap[episodeKey].events.push({ startTime, endTime, duration: durationMs, platform: entry.platform || 'unknown' });
      episodeMap[episodeKey].uniquePlatforms.add(entry.platform || 'unknown');
      episodeMap[episodeKey].longestSinglePlay = Math.max(episodeMap[episodeKey].longestSinglePlay, durationMs);
    }

    // Step 2: Merge segments (logic remains the same as before)
    const finalEpisodeStats = [];
    Object.values(episodeMap).forEach(episode => {
       if (episode.events.length === 0) return;
       episode.events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
       
       const mergedSegments = [];
       let currentSegment = null;
       let eventsMergedInCurrent = 0;

       episode.events.forEach(event => {
          if (!currentSegment) {
            currentSegment = { start: event.startTime, end: event.endTime, platforms: new Set([event.platform]), eventCount: 1 };
            eventsMergedInCurrent = 1;
          } else {
            const gapMs = event.startTime.getTime() - currentSegment.end.getTime();
            const startsBeforeOrShortlyAfter = gapMs <= mergeThresholdMs;
            const significantOverlap = event.startTime < currentSegment.end;

            if (startsBeforeOrShortlyAfter || significantOverlap) {
              currentSegment.end = max(currentSegment.end, event.endTime);
              currentSegment.platforms.add(event.platform);
              currentSegment.eventCount++;
              eventsMergedInCurrent++;
            } else {
              currentSegment.duration = currentSegment.end.getTime() - currentSegment.start.getTime();
              mergedSegments.push(currentSegment);
              stats.finalSegments++;
              stats.mergedEvents += (eventsMergedInCurrent - 1);
              currentSegment = { start: event.startTime, end: event.endTime, platforms: new Set([event.platform]), eventCount: 1 };
              eventsMergedInCurrent = 1;
            }
          }
       });
       if (currentSegment) {
          currentSegment.duration = currentSegment.end.getTime() - currentSegment.start.getTime();
          mergedSegments.push(currentSegment);
          stats.finalSegments++;
          stats.mergedEvents += (eventsMergedInCurrent - 1);
       }

       const totalPlayed = mergedSegments.reduce((sum, seg) => sum + seg.duration, 0);
       const segmentCount = mergedSegments.length;

       if (totalPlayed > 60000) { 
          finalEpisodeStats.push({
            key: episode.key,
            episodeName: episode.episodeName,
            showName: episode.showName,
            totalPlayed: totalPlayed,
            segmentCount: segmentCount,
            longestSession: episode.longestSinglePlay,
            averageSegmentLength: segmentCount > 0 ? Math.round(totalPlayed / segmentCount) : 0,
            uniquePlatforms: Array.from(episode.uniquePlatforms),
            playSegments: mergedSegments.map(s => ({ timestamp: s.start, duration: s.duration }))
          });
       }
    });
    
    setProcessingStats(stats);
    console.timeEnd("Processing Episodes");

    return finalEpisodeStats
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, topN);

  }, [
    rawPlayData, 
    selectionMode, // Use mode
    selectedYear, // Use selected year
    selectedYearRange, // Use selected range
    topN, 
    sortBy, 
    selectedShows, 
    mergeThresholdMinutes 
  ]); // Update dependencies

  // --- Show selection handlers (unchanged) ---
  const addShow = (show) => { /* ... */ };
  const removeShow = (show) => { /* ... */ };
  const addShowFromEpisode = (show) => { /* ... */ };


  return (
    <div className="space-y-4 p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold text-indigo-800 mb-4">Podcast Episode Rankings</h2>

      {/* Replace Date Inputs/Buttons with YearSelector */}
      <YearSelector
        availableYears={availableYears}
        onYearChange={handleYearChange}
        onYearRangeChange={handleYearRangeChange}
        onModeChange={handleModeChange} // Pass the mode updater
        initialMode={selectionMode}     // Pass current mode
        initialYear={selectedYear}       // Pass current single year
        initialYearRange={selectedYearRange} // Pass current range
        colorTheme="indigo" // Example theme
      />

      {/* Rest of the controls (Top N, Merge Threshold, Show Filter) */}
       {/* Settings & Show Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Settings */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 space-y-3">
             <h3 className="font-medium text-indigo-700">Settings</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-indigo-700">Top</label>
                <input
                  type="number" min="1" max="1000" value={topN}
                  onChange={(e) => setTopN(Math.min(1000, Math.max(1, parseInt(e.target.value) || 50)))}
                  className="border rounded w-16 px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400 text-sm"
                />
                <label className="text-sm text-indigo-700">episodes</label>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-indigo-700 whitespace-nowrap">Merge plays within:</label>
                <input
                  type="number" min="1" max="1440" value={mergeThresholdMinutes}
                  onChange={(e) => setMergeThresholdMinutes(Math.min(1440, Math.max(1, parseInt(e.target.value) || 10)))}
                  className="border rounded w-16 px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400 text-sm"
                />
                <span className="text-sm text-indigo-700">minutes</span>
              </div>
              <div className="flex items-center">
                 <input 
                    type="checkbox" 
                    id="showStatsCheck" 
                    checked={showDuplicateStats} 
                    onChange={() => setShowDuplicateStats(!showDuplicateStats)} 
                    className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                 />
                 <label htmlFor="showStatsCheck" className="text-sm text-indigo-700">Show Processing Stats</label>
              </div>
          </div>
          
          {/* Show Filter */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 space-y-3">
            <h3 className="font-medium text-indigo-700">Filter by Show(s)</h3>
            <div className="relative">
              <input
                type="text"
                value={showSearch}
                onChange={(e) => setShowSearch(e.target.value)}
                placeholder="Type to search shows..."
                className="w-full border rounded px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400 text-sm"
              />
              {showSearch && filteredShows.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {filteredShows.map(show => (
                    <div
                      key={show}
                      onClick={() => addShow(show)}
                      className="px-3 py-2 hover:bg-indigo-100 cursor-pointer text-sm"
                    >
                      {show}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedShows.length === 0 && <span className="text-sm text-indigo-500 italic">Showing all shows</span>}
              {selectedShows.map(show => (
                <div key={show} className="flex items-center bg-indigo-600 text-white px-2 py-1 rounded-full text-xs">
                  {show}
                  <button onClick={() => removeShow(show)} className="ml-2 text-indigo-200 hover:text-white font-bold">×</button>
                </div>
              ))}
            </div>
             {selectedShows.length > 0 && (
                 <button 
                    onClick={() => setSelectedShows([])} 
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                 >
                    Clear all show filters
                 </button>
             )}
          </div>
      </div>

      {/* Processing Stats Display (if enabled) */}
       {showDuplicateStats && (
         <div className="text-xs text-indigo-600 bg-indigo-100 p-3 rounded border border-indigo-200 flex flex-wrap gap-x-4 gap-y-1">
            <span>Initial: {processingStats.initialEvents}</span>
            <span>| Invalid: {processingStats.filteredOutInvalid}</span>
            <span>| Zero Dur: {processingStats.filteredOutZeroDuration}</span>
            <span>| Exact Dup: {processingStats.exactDuplicatesRemoved}</span>
            <span>| Merged Evts: {processingStats.mergedEvents}</span>
            <span>| Final Segs: {processingStats.finalSegments}</span>
         </div>
      )}

      {/* Table Display (mostly unchanged, just uses processedEpisodes) */}
       {processedEpisodes.length > 0 ? (
        <div className="overflow-x-auto border border-indigo-200 rounded-lg shadow-sm">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-indigo-100">
              <tr className="border-b border-indigo-200">
                <th className="p-2 text-left text-indigo-800 font-semibold">#</th>
                <th className="p-2 text-left text-indigo-800 font-semibold">Episode</th>
                <th className="p-2 text-left text-indigo-800 font-semibold">Show</th>
                <th className={`p-2 text-right text-indigo-800 font-semibold cursor-pointer hover:bg-indigo-200 ${sortBy === 'totalPlayed' ? 'bg-indigo-200' : ''}`} onClick={() => setSortBy('totalPlayed')}>
                  Total Played {sortBy === 'totalPlayed' && '▼'}
                </th>
                <th className={`p-2 text-right text-indigo-800 font-semibold cursor-pointer hover:bg-indigo-200 ${sortBy === 'longestSession' ? 'bg-indigo-200' : ''}`} onClick={() => setSortBy('longestSession')}>
                  Longest Play {sortBy === 'longestSession' && '▼'}
                </th>
                <th className={`p-2 text-right text-indigo-800 font-semibold cursor-pointer hover:bg-indigo-200 ${sortBy === 'segmentCount' ? 'bg-indigo-200' : ''}`} onClick={() => setSortBy('segmentCount')}>
                  Sessions {sortBy === 'segmentCount' && '▼'}
                </th>
                <th className="p-2 text-right text-indigo-800 font-semibold">Platforms</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-indigo-100">
              {processedEpisodes.map((episode, index) => (
                <tr key={episode.key} className="hover:bg-indigo-50">
                  <td className="p-2 text-indigo-700">{index + 1}</td>
                  <td className="p-2 text-indigo-900 max-w-xs truncate" title={episode.episodeName}>{episode.episodeName}</td>
                  <td className="p-2 text-indigo-700 max-w-xs truncate cursor-pointer hover:underline" 
                      title={episode.showName} 
                      onClick={() => addShowFromEpisode(episode.showName)}>
                      {episode.showName}
                  </td>
                  <td className="p-2 text-right text-indigo-700 font-medium">
                    {formatDuration(episode.totalPlayed)}
                  </td>
                  <td className="p-2 text-right text-indigo-700">
                    {formatDuration(episode.longestSession)}
                  </td>
                  <td className="p-2 text-right text-indigo-700">
                    {episode.segmentCount}
                  </td>
                  <td className="p-2 text-right text-indigo-700 text-xs max-w-[100px] truncate" title={episode.uniquePlatforms.join(', ')}>
                     {episode.uniquePlatforms.map(p => p.includes(';') ? p.split(';')[0] : p).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-indigo-500 italic">
          No podcast episodes found matching your filters.
        </div>
      )}
    </div>
  );
};

export default PodcastRankings;