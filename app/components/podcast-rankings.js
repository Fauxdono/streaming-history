import React, { useState, useMemo, useEffect } from 'react';
import {
  format, parseISO, isValid
} from 'date-fns';

// Helper to safely parse dates and check validity
const safeParseISOAndValidate = (dateString) => {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    // Check if the parsed date is valid
    if (isValid(date)) {
      return date;
    }
    return null;
  } catch (error) {
    console.error("Error parsing date:", dateString, error);
    return null;
  }
};

const PodcastRankings = ({ 
  rawPlayData = [], 
  formatDuration, 
  // Add props for connecting with the YearSelector sidebar
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  onYearChange,
  onYearRangeChange,
  onToggleYearRangeMode
}) => {
  // State for filters and sorting
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedShows, setSelectedShows] = useState([]);
  const [showSearch, setShowSearch] = useState('');
  const [topN, setTopN] = useState(50);
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [duplicateThreshold, setDuplicateThreshold] = useState(15); // Minutes
  const [showDuplicateStats, setShowDuplicateStats] = useState(false);
  const [duplicatesFound, setDuplicatesFound] = useState(0);
  const [duplicateTypes, setDuplicateTypes] = useState({ exact: 0, overlapping: 0, zeroTime: 0 });

  // Update date range based on year selection (from YearSelector)
  useEffect(() => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      // Convert year range to date range
      setStartDate(`${yearRange.startYear}-01-01`);
      setEndDate(`${yearRange.endYear}-12-31`);
    } else if (selectedYear !== 'all') {
      if (selectedYear.includes('-')) {
        // Handle YYYY-MM or YYYY-MM-DD format
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
      setAllTime();
    }
  }, [selectedYear, yearRangeMode, yearRange, rawPlayData]);

  // Initialize date range from raw data
  useEffect(() => {
    if ((!startDate || !endDate) && rawPlayData.length > 0) {
      setAllTime();
    }
  }, [rawPlayData]);

  // Handle date range changes that should update the YearSelector
  const handleDateChange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    
    if (!start || !end) {
      // If clearing the date range, set to 'all'
      if (onYearChange) onYearChange('all');
      if (onToggleYearRangeMode) onToggleYearRangeMode(false);
      return;
    }
    
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;
      
      const startYear = startDate.getFullYear().toString();
      const endYear = endDate.getFullYear().toString();
      
      // If same year, use single year mode
      if (startYear === endYear) {
        // Check if it's a full year
        const isFullYear = 
          start === `${startYear}-01-01` && 
          end === `${startYear}-12-31`;
        
        if (isFullYear) {
          if (onYearChange) onYearChange(startYear);
          if (onToggleYearRangeMode) onToggleYearRangeMode(false);
        } else {
          // For partial year, keep as is and don't update the year selector
        }
      } else {
        // Different years, use range mode
        if (onYearRangeChange) onYearRangeChange({ startYear, endYear });
        if (onToggleYearRangeMode) onToggleYearRangeMode(true);
      }
    } catch (err) {
      console.error("Error handling date change:", err);
    }
  };

  // Date range functions
  const setQuickRange = (days) => {
    if (days > 0) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - days);
      
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(today, 'yyyy-MM-dd');
      
      setStartDate(startStr);
      setEndDate(endStr);
      handleDateChange(startStr, endStr);
    } else if (days === 0) {
      const today = new Date();
      const dateStr = format(today, 'yyyy-MM-dd');
      
      setStartDate(dateStr);
      setEndDate(dateStr);
      handleDateChange(dateStr, dateStr);
    }
  };

  const setCurrentMonth = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startStr = format(firstDayOfMonth, 'yyyy-MM-dd');
    const endStr = format(today, 'yyyy-MM-dd');
    
    setStartDate(startStr);
    setEndDate(endStr);
    handleDateChange(startStr, endStr);
  };

  const setPreviousMonth = () => {
    const today = new Date();
    const firstDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    
    const startStr = format(firstDayOfPrevMonth, 'yyyy-MM-dd');
    const endStr = format(lastDayOfPrevMonth, 'yyyy-MM-dd');
    
    setStartDate(startStr);
    setEndDate(endStr);
    handleDateChange(startStr, endStr);
  };

  const setCurrentYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    
    const startStr = format(firstDayOfYear, 'yyyy-MM-dd');
    const endStr = format(today, 'yyyy-MM-dd');
    
    setStartDate(startStr);
    setEndDate(endStr);
    
    // Update the year selector
    if (onYearChange) onYearChange(year.toString());
    if (onToggleYearRangeMode) onToggleYearRangeMode(false);
  };

  const setPreviousYear = () => {
    const prevYear = new Date().getFullYear() - 1;
    const firstDayOfYear = new Date(prevYear, 0, 1);
    const lastDayOfYear = new Date(prevYear, 11, 31);
    
    const startStr = format(firstDayOfYear, 'yyyy-MM-dd');
    const endStr = format(lastDayOfYear, 'yyyy-MM-dd');
    
    setStartDate(startStr);
    setEndDate(endStr);
    
    // Update the year selector
    if (onYearChange) onYearChange(prevYear.toString());
    if (onToggleYearRangeMode) onToggleYearRangeMode(false);
  };

  const setAllTime = () => {
    if (rawPlayData.length > 0) {
      try {
        let earliest = new Date(rawPlayData[0].ts);
        let latest = new Date(rawPlayData[0].ts);

        for (const entry of rawPlayData) {
          if (!entry.ts) continue;
          
          try {
            const date = new Date(entry.ts);
            if (!isNaN(date.getTime())) {
              if (date < earliest) earliest = date;
              if (date > latest) latest = date;
            }
          } catch (e) {
            // Skip invalid dates
          }
        }
        
        const startStr = format(earliest, 'yyyy-MM-dd');
        const endStr = format(latest, 'yyyy-MM-dd');
        
        setStartDate(startStr);
        setEndDate(endStr);
        
        // Update the year selector
        if (onYearChange) onYearChange('all');
        if (onToggleYearRangeMode) onToggleYearRangeMode(false);
      } catch (err) {
        console.error("Error setting all time range:", err);
      }
    }
  };

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
  );
};

export default PodcastRankings;
      .slice(0, 10);
  }, [allShows, showSearch, selectedShows]);

  const filteredEpisodes = useMemo(() => {
    if (!rawPlayData?.length) return [];
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    // Step 1: Collect all relevant episodes
    const episodeMap = {};
    const duplicateStats = {exact: 0, overlapping: 0, zeroTime: 0};

    // Filter relevant play events and group by episode
    const relevantEvents = rawPlayData.filter(entry => {
      if (!entry.ts) return false;
      
      try {
        const timestamp = new Date(entry.ts);
        return (
          !isNaN(timestamp.getTime()) &&
          (!start || timestamp >= start) && 
          (!end || timestamp <= end) && 
          entry.episode_show_name &&
          entry.episode_name &&
          (selectedShows.length === 0 || selectedShows.includes(entry.episode_show_name))
        );
      } catch (err) {
        return false;
      }
    });

    // Remove zero-duration entries and exact duplicates first
    const hashTracker = new Set();
    const filteredEvents = [];

    relevantEvents.forEach(entry => {
      // Skip zero duration plays
      if (entry.ms_played === 0) {
        duplicateStats.zeroTime++;
        return;
      }
      
      // Check for exact duplicates (same timestamp, same duration, same episode)
      const hash = `${entry.ts}_${entry.ms_played}_${entry.episode_name}`;
      if (hashTracker.has(hash)) {
        duplicateStats.exact++;
        return;
      }
      
      hashTracker.add(hash);
      filteredEvents.push(entry);
    });

    // Group play events by episode
    filteredEvents.forEach(entry => {
      const key = `${entry.episode_name}|${entry.episode_show_name}`;
      if (!episodeMap[key]) {
        episodeMap[key] = {
          key,
          episodeName: entry.episode_name,
          showName: entry.episode_show_name,
          events: [],
          durationMs: entry.duration_ms || 0
        };
      }
      
      episodeMap[key].events.push({
        timestamp: new Date(entry.ts),
        duration: entry.ms_played,
        platform: entry.platform || 'unknown'
      });
    });

    // Step 2: Process each episode to merge overlapping sessions
    const episodeStats = {};

    Object.entries(episodeMap).forEach(([key, episode]) => {
      // Skip episodes with no valid plays
      if (episode.events.length === 0) return;
      
      // Sort events by timestamp
      episode.events.sort((a, b) => a.timestamp - b.timestamp);
      
      // Initialize episode stats
      episodeStats[key] = {
        key,
        episodeName: episode.episodeName,
        showName: episode.showName,
        totalPlayed: 0,
        segmentCount: 0,
        playSegments: [],
        durationMs: episode.durationMs,
        duplicatesRemoved: 0,
        longestSession: 0,
        uniquePlatforms: new Set()
      };
      
      // Track the timeline of listening
      const segments = [];
      let currentSegment = null;
      
      // Process each event
      for (let i = 0; i < episode.events.length; i++) {
        const event = episode.events[i];
        episodeStats[key].uniquePlatforms.add(event.platform);
        
        // Find the longest single session
        episodeStats[key].longestSession = Math.max(
          episodeStats[key].longestSession,
          event.duration
        );
        
        // Skip very short plays (less than 2 minutes)
        if (event.duration < 120000) continue;
        
        // If this is our first segment or there's no overlap with previous
        if (!currentSegment) {
          currentSegment = {
            start: event.timestamp,
            end: new Date(event.timestamp.getTime() + event.duration),
            duration: event.duration
          };
        } else {
          // Check if this event overlaps with or continues the current segment
          // We consider events within the duplicate threshold to be part of the same session
          const minutesSinceLastEnd = Math.round(
            (event.timestamp - currentSegment.end) / (60 * 1000)
          );
          
          // If this is within our threshold, extend the current segment
          if (minutesSinceLastEnd <= duplicateThreshold) {
            const newEnd = new Date(event.timestamp.getTime() + event.duration);
            
            // Only extend if this actually makes the segment longer
            if (newEnd > currentSegment.end) {
              currentSegment.end = newEnd;
              
              // We count a portion of this as new time, avoiding double counting
              const overlap = Math.max(0, 
                currentSegment.end.getTime() - 
                Math.max(currentSegment.start.getTime(), event.timestamp.getTime())
              );
              
              const newTime = event.duration - overlap;
              if (newTime > 0) {
                currentSegment.duration += newTime;
              }
            }
            
            duplicateStats.overlapping++;
            episodeStats[key].duplicatesRemoved++;
          } else {
            // This is a new segment
            segments.push(currentSegment);
            currentSegment = {
              start: event.timestamp,
              end: new Date(event.timestamp.getTime() + event.duration),
              duration: event.duration
            };
          }
        }
      }
      
      // Add the last segment
      if (currentSegment) {
        segments.push(currentSegment);
      }
      
      // Sum up the total play time from segments
      let totalPlayed = 0;
      segments.forEach(segment => {
        totalPlayed += segment.duration;
        
        // Add to play segments list if over 5 minutes
        if (segment.duration >= 300000) {
          episodeStats[key].playSegments.push({
            timestamp: segment.start,
            duration: segment.duration
          });
          episodeStats[key].segmentCount++;
        }
      });
      
      episodeStats[key].totalPlayed = totalPlayed;
      episodeStats[key].uniquePlatforms = Array.from(episodeStats[key].uniquePlatforms);
    });

    // Update duplicate stats
    setDuplicateTypes(duplicateStats);
    setDuplicatesFound(
      duplicateStats.exact + 
      duplicateStats.overlapping + 
      duplicateStats.zeroTime
    );

    // Convert to array and calculate additional metrics
    return Object.values(episodeStats)
      .filter(episode => episode.totalPlayed > 0) // Only include episodes with play time
      .map(episode => ({
        ...episode,
        percentageListened: episode.durationMs ? 
          Math.round((episode.totalPlayed / episode.durationMs) * 100) : null,
        averageSegmentLength: episode.segmentCount > 0 ? 
          Math.round(episode.totalPlayed / episode.segmentCount) : 0,
        estimatedFullLength: Math.max(episode.longestSession, episode.totalPlayed)
      }))
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, topN);
  }, [rawPlayData, startDate, endDate, topN, sortBy, selectedShows, duplicateThreshold]);

  const addShowFromEpisode = (show) => {
    if (!selectedShows.includes(show)) {
      setSelectedShows(prev => [...prev, show]);
    }
  };

  const addShow = (show) => {
    setSelectedShows(prev => [...prev, show]);
    setShowSearch('');
  };

  const removeShow = (show) => {
    setSelectedShows(prev => prev.filter(s => s !== show));
  };

  // Function to get page title based on date selection
  const getPageTitle = () => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `Podcast Rankings (${yearRange.startYear}-${yearRange.endYear})`;
    } else if (selectedYear !== 'all') {
      if (selectedYear.includes('-')) {
        const parts = selectedYear.split('-');
        if (parts.length === 3) {
          // Display format for a specific date (YYYY-MM-DD)
          const date = new Date(selectedYear);
          if (!isNaN(date.getTime())) {
            return `Podcast Rankings for ${date.toLocaleDateString(undefined, {
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
            return `Podcast Rankings for ${date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long'
            })}`;
          }
        }
        return `Podcast Rankings for ${selectedYear}`;
      }
      return `Podcast Rankings for ${selectedYear}`;
    } else {
      return 'All-time Podcast Rankings';
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <h3 className="font-bold text-indigo-700 mb-2">{getPageTitle()}</h3>

      {/* Date picker controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-indigo-700">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value, endDate)}
            className="border rounded px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange(startDate, e.target.value)}
            className="border rounded px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setQuickRange(0)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
              Today
            </button>
            <button onClick={() => setQuickRange(7)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
              Last 7 days
            </button>
            <button onClick={() => setQuickRange(30)} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">
              Last 30 days
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={setCurrentMonth} className="px-3 py-1 bg-indigo-200 text-indigo-700 rounded hover:bg-indigo-300">
              This month
            </button>
            <button onClick={setPreviousMonth} className="px-3 py-1 bg-indigo-200 text-indigo-700 rounded hover:bg-indigo-300">
              Last month
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button onClick={setCurrentYear} className="px-3 py-1 bg-indigo-300 text-indigo-700 rounded hover:bg-indigo-400">
              This year
            </button>
            <button onClick={setPreviousYear} className="px-3 py-1 bg-indigo-300 text-indigo-700 rounded hover:bg-indigo-400">
              Last year
            </button>
            <button onClick={setAllTime} className="px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600">
              All time
            </button>
          </div>
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

      {/* Duplicate Detection Settings */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
        <div className="flex items-center gap-2">
          <label className="text-indigo-700 font-medium">Session gap threshold: </label>
          <input
            type="number"
            min="1"
            max="1440" // 24 hours max
            value={duplicateThreshold}
            onChange={(e) => setDuplicateThreshold(Math.min(1440, Math.max(1, parseInt(e.target.value))))}
            className="border rounded w-16 px-2 py-1 text-indigo-700 focus:border-indigo-400 focus:ring-indigo-400"
          />
          <span className="text-indigo-700">minutes</span>
        </div>
        
        <button 
          onClick={() => setShowDuplicateStats(!showDuplicateStats)}
          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
        >
          {showDuplicateStats ? 'Hide Stats' : 'Show Stats'}
        </button>
        
        {showDuplicateStats && (
          <div className="flex-1 text-indigo-700 text-sm p-2 bg-indigo-100 rounded">
            <div><span className="font-medium">{duplicatesFound}</span> duplicate plays filtered:</div>
            <div>• <span className="font-medium">{duplicateTypes.exact}</span> exact duplicates</div>
            <div>• <span className="font-medium">{duplicateTypes.overlapping}</span> overlapping sessions</div>
            <div>• <span className="font-medium">{duplicateTypes.zeroTime}</span> zero-duration entries</div>
          </div>
        )}
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
                    className={`p-2 text-right text-indigo-700 cursor-pointer hover:bg-indigo-100 ${
                      sortBy === 'totalPlayed' ? 'font-bold' : ''
                    }`}
                    onClick={() => setSortBy('totalPlayed')}
                  >
                    Total Time {sortBy === 'totalPlayed' && '▼'}
                  </th>
                  <th 
                    className={`p-2 text-right text-indigo-700 cursor-pointer hover:bg-indigo-100 ${
                      sortBy === 'longestSession' ? 'font-bold' : ''
                    }`}
                    onClick={() => setSortBy('longestSession')}
                  >
                    Longest Session {sortBy === 'longestSession' && '▼'}
                  </th>
                  <th 
                    className={`p-2 text-right text-indigo-700 cursor-pointer hover:bg-indigo-100 ${
                      sortBy === 'segmentCount' ? 'font-bold' : ''
                    }`}
                    onClick={() => setSortBy('segmentCount')}
                  >
                    Sessions {sortBy === 'segmentCount' && '▼'}
                  </th>
                  {showDuplicateStats && (
                    <th className="p-2 text-right text-indigo-700">Duplicates Removed</th>
                  )}
                  <th className="p-2 text-right text-indigo-700">Platforms</th>
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
                      {formatDuration(episode.longestSession)}
                    </td>
                    <td className="p-2 text-right text-indigo-700">
                      {episode.segmentCount}
                    </td>
                    {showDuplicateStats && (
                      <td className="p-2 text-right text-indigo-700">
                        {episode.duplicatesRemoved}
                      </td>
                    )}
                    <td className="p-2 text-right text-indigo-700 text-xs">
                      {episode.uniquePlatforms.map(p => p.includes(';') ? p.split(';')[0] : p).join(', ')}
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