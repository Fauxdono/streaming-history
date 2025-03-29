import React, { useState, useMemo, useEffect } from 'react';
import {
    startOfDay, endOfDay,
    startOfYear, endOfYear,
    format, differenceInMinutes, parseISO, addMilliseconds, max, min, isValid // Import isValid
} from 'date-fns';
import YearSelector from './year-selector.js'; // Import the YearSelector

// Helper to safely parse dates and check validity
const safeParseISOAndValidate = (dateString) => {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    // Check if the parsed date is valid
    if (isValid(date)) {
      return date;
    }
    console.warn("Invalid date parsed:", dateString);
    return null;
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return null;
  }
};

// Helper to format duration
const formatDurationFallback = (ms) => {
  if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return 'N/A'; // Allow 0ms now? Changed from <=0
  if (ms === 0) return '0s'; // Explicitly handle 0

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  if (hours === 0 ) parts.push(`${seconds}s`); // Show seconds if less than an hour OR if exact minute

  return parts.length > 0 ? parts.join(' ') : '<1s'; // Handle very small durations
};


const PodcastRankings = ({
  rawPlayData = [],
  formatDuration = formatDurationFallback,
  initialShows = []
}) => {
  // State for year/date selection
  const [selectionMode, setSelectionMode] = useState('all-time');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedYearRange, setSelectedYearRange] = useState(null);

  // Other state variables
  const [topN, setTopN] = useState(50);
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [selectedShows, setSelectedShows] = useState(initialShows);
  const [showSearch, setShowSearch] = useState('');
  const [mergeThresholdMinutes, setMergeThresholdMinutes] = useState(10);
  const [showProcessingStats, setShowProcessingStats] = useState(false); // Default to false initially
  const [processingStats, setProcessingStats] = useState({
    initialEvents: 0,
    filteredOutInvalidTsOrDuration: 0,
    filteredOutDateRange: 0,
    filteredOutNoEpisodeData: 0,
    filteredOutShowFilter: 0,
    filteredOutZeroDuration: 0,
    exactDuplicatesRemoved: 0,
    validEventsProcessed: 0,
    mergedEventsCount: 0,
    finalSegmentsCount: 0,
    finalEpisodesCount: 0
  });

  const addShowFromEpisode = (show) => {
    if (show && !selectedShows.includes(show)) {
        setSelectedShows(prev => [...prev, show]);
    }
  };

  // Derive available years for YearSelector
  const availableYears = useMemo(() => {
    const yearSet = new Set();
    rawPlayData.forEach(entry => {
      const date = safeParseISOAndValidate(entry.ts); // Use validating parser
      if (date) {
        yearSet.add(format(date, 'yyyy'));
      }
    });
    return Array.from(yearSet).sort((a, b) => parseInt(a) - parseInt(b));
  }, [rawPlayData]);

   // Effect to set initial defaults when years become available or mode changes
   useEffect(() => {
      if (availableYears.length === 0) return; // Don't run if no years yet

      if (selectionMode === 'range' && selectedYearRange === null && availableYears.length >= 2) {
         setSelectedYearRange({
            startYear: availableYears[0],
            endYear: availableYears[availableYears.length - 1]
         });
      } else if (selectionMode === 'single' && selectedYear === 'all'){
         setSelectedYear(availableYears[availableYears.length-1]); // Default to latest year
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [availableYears, selectionMode]); // Rerun only when needed


  // --- Callbacks for YearSelector ---
  const handleYearChange = (year) => {
    console.log("Parent received single year:", year);
    setSelectedYear(year);
    // Mode should already be 'single' if this callback is triggered by BetterYearSlider
  };

  const handleYearRangeChange = (range) => {
     console.log("Parent received range:", range);
     if(range && range.startYear && range.endYear) {
        setSelectedYearRange(range);
        // Mode should already be 'range' if this callback is triggered by DualHandleYearSlider
    } else {
        console.error("Invalid range received in Parent:", range);
    }
  };

  const handleModeChange = (newMode) => {
    console.log("Parent setting mode:", newMode);
    // Only update if mode actually changes
    if (newMode !== selectionMode) {
        setSelectionMode(newMode);
        // Reset/adjust other selections based on the *new* mode
        if (newMode === 'all-time') {
          setSelectedYear('all');
          setSelectedYearRange(null);
        } else if (newMode === 'single') {
          setSelectedYearRange(null);
          // Set default year if needed (or keep current if valid)
          if (selectedYear === 'all' && availableYears.length > 0) {
              setSelectedYear(availableYears[availableYears.length - 1]);
          } else if (!availableYears.includes(selectedYear) && availableYears.length > 0){
              setSelectedYear(availableYears[availableYears.length - 1]);
          }
        } else if (newMode === 'range') {
          setSelectedYear('all');
          // Set default range if needed (or keep current if valid)
          if (selectedYearRange === null && availableYears.length >= 2) {
              setSelectedYearRange({ startYear: availableYears[0], endYear: availableYears[availableYears.length - 1] });
          }
        }
    }
  };

  // --- Show data derivation (unchanged) ---
   const allShows = useMemo(() => {
      const shows = new Set(
        rawPlayData
          .filter(entry => entry.episode_show_name)
          .map(entry => entry.episode_show_name)
      );
      return Array.from(shows).sort((a, b) => a.localeCompare(b));
  }, [rawPlayData]);

  const filteredShows = useMemo(() => {
      return allShows
        .filter(show =>
          show.toLowerCase().includes(showSearch.toLowerCase()) &&
          !selectedShows.includes(show)
        )
        .slice(0, 10);
  }, [allShows, showSearch, selectedShows]);


  // --- Episode Processing (useMemo with robust checks) ---
  const processedEpisodes = useMemo(() => {
    console.time("Processing Episodes");
    if (!rawPlayData?.length) {
      console.timeEnd("Processing Episodes");
      return [];
    }

    let startFilterDate = new Date(0);
    let endFilterDate = new Date(); // Default to all time

    // Determine date range based on selectionMode
    if (selectionMode === 'single' && selectedYear !== 'all') {
        const yearNum = parseInt(selectedYear);
        if (!isNaN(yearNum)) {
            startFilterDate = startOfYear(new Date(yearNum, 0, 1));
            endFilterDate = endOfYear(new Date(yearNum, 11, 31));
        }
    } else if (selectionMode === 'range' && selectedYearRange?.startYear && selectedYearRange?.endYear) {
        const startYearNum = parseInt(selectedYearRange.startYear);
        const endYearNum = parseInt(selectedYearRange.endYear);
        if (!isNaN(startYearNum) && !isNaN(endYearNum)) {
             startFilterDate = startOfYear(new Date(startYearNum, 0, 1));
             endFilterDate = endOfYear(new Date(endYearNum, 11, 31));
        }
    }
    // console.log(`Filtering between ${format(startFilterDate, 'yyyy-MM-dd')} and ${format(endFilterDate, 'yyyy-MM-dd')}`);


    const mergeThresholdMs = mergeThresholdMinutes * 60 * 1000;
    const stats = { initialEvents: 0, filteredOutInvalidTsOrDuration: 0, filteredOutDateRange: 0, filteredOutNoEpisodeData: 0, filteredOutShowFilter: 0, filteredOutZeroDuration: 0, exactDuplicatesRemoved: 0, validEventsProcessed: 0, mergedEventsCount: 0, finalSegmentsCount: 0, finalEpisodesCount: 0 };
    const episodeMap = {};
    const hashTracker = new Set();

    // Step 1: Initial Filtering and Grouping
    for (const entry of rawPlayData) {
      stats.initialEvents++;
      const endTime = safeParseISOAndValidate(entry.ts); // Use validating parser
      const durationMs = typeof entry.ms_played === 'number' && !isNaN(entry.ms_played) ? entry.ms_played : -1; // Treat non-numbers as invalid

      // Basic validity check
      if (!endTime || durationMs < 0) {
        stats.filteredOutInvalidTsOrDuration++;
        continue;
      }

      // Date range check
      if (endTime < startFilterDate || endTime > endFilterDate) {
        stats.filteredOutDateRange++;
        continue;
      }

      const episodeKey = entry.spotify_episode_uri || `${entry.episode_name}|${entry.episode_show_name}`;
      if (!episodeKey || !entry.episode_show_name || !entry.episode_name) {
          stats.filteredOutNoEpisodeData++;
          continue;
      }

      if (selectedShows.length > 0 && !selectedShows.includes(entry.episode_show_name)) {
          stats.filteredOutShowFilter++;
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
      // Validate startTime as well
      if (!isValid(startTime)) {
          stats.filteredOutInvalidTsOrDuration++;
          console.warn("Invalid start time calculated for entry:", entry);
          continue;
      }

       stats.validEventsProcessed++;

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

    // Step 2: Merge segments
    const finalEpisodeStats = [];
    Object.values(episodeMap).forEach(episode => {
       if (episode.events.length === 0) return;

       // Filter out any events that might still have invalid dates *before* sorting
       const validEvents = episode.events.filter(e => isValid(e.startTime) && isValid(e.endTime));
       if (validEvents.length === 0) return;

       validEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

       const mergedSegments = [];
       let currentSegment = null;
       let eventsMergedInCurrentSegment = 0;

       validEvents.forEach(event => {
          if (!currentSegment) {
            currentSegment = { start: event.startTime, end: event.endTime, platforms: new Set([event.platform]), eventCount: 1 };
            eventsMergedInCurrentSegment = 1;
          } else {
            // Ensure dates are valid before comparison/calculation
            if (!isValid(currentSegment.end) || !isValid(event.startTime) || !isValid(event.endTime)){
                console.warn("Invalid date encountered during merge for episode", episode.key);
                // Option: Skip this event or finalize previous segment? Let's skip.
                return;
            }
            const gapMs = event.startTime.getTime() - currentSegment.end.getTime();
            const startsBeforeOrShortlyAfter = gapMs <= mergeThresholdMs;
            const significantOverlap = event.startTime < currentSegment.end;

            if (startsBeforeOrShortlyAfter || significantOverlap) {
              currentSegment.end = max(currentSegment.end, event.endTime); // Use date-fns max
              currentSegment.platforms.add(event.platform);
              currentSegment.eventCount++;
              eventsMergedInCurrentSegment++;
            } else {
              // Finalize previous segment only if its dates are valid
              if(isValid(currentSegment.start) && isValid(currentSegment.end)) {
                 currentSegment.duration = currentSegment.end.getTime() - currentSegment.start.getTime();
                 // Add only if duration is positive
                 if (currentSegment.duration > 0) {
                     mergedSegments.push(currentSegment);
                     stats.finalSegmentsCount++;
                     stats.mergedEventsCount += (eventsMergedInCurrentSegment - 1);
                 } else {
                     console.warn("Segment skipped due to non-positive duration:", currentSegment);
                 }
              } else {
                  console.warn("Segment skipped due to invalid dates:", currentSegment);
              }

              currentSegment = { start: event.startTime, end: event.endTime, platforms: new Set([event.platform]), eventCount: 1 };
              eventsMergedInCurrentSegment = 1;
            }
          }
       });

       // Add the last valid segment
       if (currentSegment && isValid(currentSegment.start) && isValid(currentSegment.end)) {
          currentSegment.duration = currentSegment.end.getTime() - currentSegment.start.getTime();
          if (currentSegment.duration > 0) {
              mergedSegments.push(currentSegment);
              stats.finalSegmentsCount++;
              stats.mergedEventsCount += (eventsMergedInCurrentSegment - 1);
          } else {
              console.warn("Last segment skipped due to non-positive duration:", currentSegment);
          }
       } else if (currentSegment) {
           console.warn("Last segment skipped due to invalid dates:", currentSegment);
       }

       const totalPlayed = mergedSegments.reduce((sum, seg) => sum + seg.duration, 0);
       const segmentCount = mergedSegments.length;

       if (totalPlayed > 10000) { // Only show if > 10 seconds listened
          stats.finalEpisodesCount++;
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
      selectionMode,
      selectedYear,
      selectedYearRange,
      topN,
      sortBy,
      selectedShows,
      mergeThresholdMinutes
  ]);

  // --- Show selection handlers ---
  const addShow = (show) => {
      if (show && !selectedShows.includes(show)) {
          setSelectedShows(prev => [...prev, show]);
      }
      setShowSearch('');
  };
  const removeShow = (show) => {
      setSelectedShows(prev => prev.filter(s => s !== show));
  };


  return (
    <div className="space-y-4 p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold text-indigo-800 mb-4">Podcast Episode Rankings</h2>

      {/* YearSelector Component */}
      <YearSelector
        availableYears={availableYears}
        currentMode={selectionMode}
        selectedYear={selectedYear}
        selectedYearRange={selectedYearRange}
        onModeChange={handleModeChange}
        onYearChange={handleYearChange}
        onYearRangeChange={handleYearRangeChange}
        colorTheme="indigo"
      />

     {/* Settings & Show Selection Grid */}
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
                    checked={showProcessingStats} // Corrected state variable name
                    onChange={() => setShowProcessingStats(!showProcessingStats)} // Corrected state variable name
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
            <div className="flex flex-wrap gap-2 min-h-[24px]"> {/* Added min-height */}
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

      {/* Processing Stats Display */}
      {showProcessingStats && (
         <div className="text-xs text-indigo-600 bg-indigo-100 p-3 rounded border border-indigo-200 flex flex-wrap gap-x-3 gap-y-1 leading-relaxed">
            <span>Events: {processingStats.initialEvents}</span>|
            <span>Invalid TS/Dur: {processingStats.filteredOutInvalidTsOrDuration}</span>|
            <span>Out of Range: {processingStats.filteredOutDateRange}</span>|
            <span>No Ep Data: {processingStats.filteredOutNoEpisodeData}</span>|
            <span>Show Filtered: {processingStats.filteredOutShowFilter}</span>|
            <span>Zero Dur: {processingStats.filteredOutZeroDuration}</span>|
            <span>Exact Dup: {processingStats.exactDuplicatesRemoved}</span>|
            <span>Valid Raw: {processingStats.validEventsProcessed}</span>|
            <span>Merged Evts: {processingStats.mergedEventsCount}</span>|
            <span>Final Segs: {processingStats.finalSegmentsCount}</span>|
            <span>Final Eps: {processingStats.finalEpisodesCount}</span>
         </div>
      )}

      {/* Table Display */}
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
                  <td className="p-2 text-indigo-700 text-center">{index + 1}</td>
                  <td className="p-2 text-indigo-900 max-w-xs truncate" title={episode.episodeName}>{episode.episodeName}</td>
                  <td className="p-2 text-indigo-700 max-w-xs truncate cursor-pointer hover:underline"
                      title={episode.showName}
                      onClick={() => addShowFromEpisode(episode.showName)}>
                      {episode.showName}
                  </td>
                  <td className="p-2 text-right text-indigo-700 font-medium whitespace-nowrap">
                    {formatDuration(episode.totalPlayed)}
                  </td>
                  <td className="p-2 text-right text-indigo-700 whitespace-nowrap">
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