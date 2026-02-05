import React, { useState, useMemo, useEffect } from 'react';
import {
  format, parseISO, isValid
} from 'date-fns';
import { LayoutGrid, List } from 'lucide-react';
import { useTheme } from './themeprovider.js';

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
  onToggleYearRangeMode,
  colorMode = 'minimal'
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
  const [isMobile, setIsMobile] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);

  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Color system for colorful/minimal modes - flat design (Red theme)
  const modeColors = isColorful ? {
    text: isDarkMode ? 'text-red-300' : 'text-red-700',
    textLight: isDarkMode ? 'text-red-400' : 'text-red-600',
    textLighter: isDarkMode ? 'text-red-500' : 'text-red-500',
    bg: isDarkMode ? 'bg-red-900' : 'bg-red-100',
    bgLight: isDarkMode ? 'bg-red-900' : 'bg-red-100',
    bgCard: isDarkMode ? 'bg-red-900' : 'bg-red-100',
    bgCardAlt: isDarkMode ? 'bg-red-900' : 'bg-red-100',
    border: isDarkMode ? 'border-red-600' : 'border-red-300',
    borderLight: isDarkMode ? 'border-red-600' : 'border-red-300',
    buttonActive: isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white',
    buttonInactive: isDarkMode ? 'bg-red-900 text-red-300 border border-red-600 hover:bg-red-800' : 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200',
  } : {
    text: isDarkMode ? 'text-white' : 'text-black',
    textLight: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    textLighter: isDarkMode ? 'text-gray-500' : 'text-gray-500',
    bg: isDarkMode ? 'bg-black' : 'bg-white',
    bgLight: isDarkMode ? 'bg-black' : 'bg-white',
    bgCard: isDarkMode ? 'bg-black' : 'bg-white',
    bgCardAlt: isDarkMode ? 'bg-black' : 'bg-white',
    border: isDarkMode ? 'border-white' : 'border-black',
    borderLight: isDarkMode ? 'border-white' : 'border-black',
    buttonActive: isDarkMode ? 'bg-white text-black' : 'bg-black text-white',
    buttonInactive: isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-900' : 'bg-white text-black border border-black hover:bg-gray-100',
  };

  // Add check for mobile viewport
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

  // Update date range based on year selection (from YearSelector)
  useEffect(() => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      // Check if dates include month/day information
      const startHasMonthDay = yearRange.startYear.includes('-');
      const endHasMonthDay = yearRange.endYear.includes('-');
      
      if (startHasMonthDay || endHasMonthDay) {
        // Process dates with month/day information
        try {
          // Process start date
          let startDateStr;
          if (startHasMonthDay) {
            if (yearRange.startYear.split('-').length === 3) {
              // YYYY-MM-DD format - use as is
              startDateStr = yearRange.startYear;
            } else if (yearRange.startYear.split('-').length === 2) {
              // YYYY-MM format - use first day of month
              const [year, month] = yearRange.startYear.split('-');
              startDateStr = `${year}-${month}-01`;
            }
          } else {
            // Just year - use January 1st
            startDateStr = `${yearRange.startYear}-01-01`;
          }
          
          // Process end date
          let endDateStr;
          if (endHasMonthDay) {
            if (yearRange.endYear.split('-').length === 3) {
              // YYYY-MM-DD format - use as is
              endDateStr = yearRange.endYear;
            } else if (yearRange.endYear.split('-').length === 2) {
              // YYYY-MM format - use last day of month
              const [year, month] = yearRange.endYear.split('-');
              const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
              endDateStr = `${year}-${month}-${lastDay}`;
            }
          } else {
            // Just year - use December 31st
            endDateStr = `${yearRange.endYear}-12-31`;
          }
          
          setStartDate(startDateStr);
          setEndDate(endDateStr);
        } catch (err) {
          console.error("Error processing date range", err);
          // Fallback to standard year range
          setStartDate(`${yearRange.startYear}-01-01`);
          setEndDate(`${yearRange.endYear}-12-31`);
        }
      } else {
        // Standard year range (no month/day specificity)
        setStartDate(`${yearRange.startYear}-01-01`);
        setEndDate(`${yearRange.endYear}-12-31`);
      }
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
      // All time - use the existing setAllTime function
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
    }
  }, [selectedYear, yearRangeMode, yearRange, rawPlayData, onYearChange, onToggleYearRangeMode]);

  // Initialize date range from raw data
  useEffect(() => {
    if ((!startDate || !endDate) && rawPlayData.length > 0) {
      // Initialize with all time data
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
      } catch (err) {
        console.error("Error setting initial date range:", err);
      }
    }
  }, [rawPlayData, startDate, endDate]);

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
        return `Podcast Rankings  (${selectedYear})`;
      }
      return `Podcast Rankings  (${selectedYear})`;
    } else {
      return 'Podcast Rankings (All Time)';
    }
  };

  // Render episode row with compact mode support
  const renderEpisodeRow = (episode, index) => {
    if (isMobile) {
      // True mobile view - very condensed, 2 columns only
      return (
        <tr key={episode.key} className={`border-b hover:opacity-80 ${
          isDarkMode 
            ? 'border-gray-700 hover:bg-black' 
            : 'border-gray-200 hover:bg-indigo-50'
        }`}>
          <td className={`p-2 ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-bold text-xs mr-2 text-indigo-800">{index + 1}.</span>
                <div className="font-medium text-sm">{episode.episodeName}</div>
              </div>
              <div 
                className={`text-xs cursor-pointer hover:underline ${
                  isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
                }`}
                onClick={() => addShowFromEpisode(episode.showName)}
              >
                {episode.showName}
              </div>
            </div>
          </td>
          <td className={`p-2 align-top text-right ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{formatDuration(episode.totalPlayed)}</span>
              <span className="text-xs">{episode.segmentCount} sessions</span>
            </div>
          </td>
        </tr>
      );
    } else if (isCompactView) {
      // Compact view - all data but smaller table format
      return (
        <tr key={episode.key} className={`border-b hover:opacity-80 ${
          isDarkMode 
            ? 'border-gray-700 hover:bg-black' 
            : 'border-gray-200 hover:bg-indigo-50'
        }`}>
          <td className={`p-1 sm:p-2 text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>{index + 1}</td>
          <td className={`p-1 sm:p-2 text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>{episode.episodeName}</td>
          <td className={`p-1 sm:p-2 text-xs sm:text-sm cursor-pointer hover:underline ${
            isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-700 hover:text-indigo-800'
          }`} 
              onClick={() => addShowFromEpisode(episode.showName)}
          >
            {episode.showName}
          </td>
          <td className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>
            {formatDuration(episode.totalPlayed)}
          </td>
          <td className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>
            {formatDuration(episode.longestSession)}
          </td>
          <td className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>
            {episode.segmentCount}
          </td>
          {showDuplicateStats && (
            <td className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
              isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
            }`}>
              {episode.duplicatesRemoved}
            </td>
          )}
          <td className={`p-1 sm:p-2 text-right text-xs ${
            isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
          }`}>
            {episode.uniquePlatforms.map(p => p.includes(';') ? p.split(';')[0] : p).slice(0, 2).join(', ')}
          </td>
        </tr>
      );
    } else {
      // Desktop view - full table
      return (
        <tr key={episode.key} className={`border-b hover:opacity-80 ${
          isDarkMode 
            ? 'border-gray-700 hover:bg-black' 
            : 'border-gray-200 hover:bg-indigo-50'
        }`}>
          <td className={`p-1 sm:p-2 text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>{index + 1}</td>
          <td className={`p-1 sm:p-2 text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>{episode.episodeName}</td>
          <td className={`p-1 sm:p-2 text-xs sm:text-sm cursor-pointer hover:underline ${
            isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-700 hover:text-indigo-800'
          }`} 
              onClick={() => addShowFromEpisode(episode.showName)}
          >
            {episode.showName}
          </td>
          <td className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>
            {formatDuration(episode.totalPlayed)}
          </td>
          <td className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>
            {formatDuration(episode.longestSession)}
          </td>
          <td className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>
            {episode.segmentCount}
          </td>
          {showDuplicateStats && (
            <td className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
              isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
            }`}>
              {episode.duplicatesRemoved}
            </td>
          )}
          <td className={`p-1 sm:p-2 text-right text-xs ${
            isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
          }`}>
            {episode.uniquePlatforms.map(p => p.includes(';') ? p.split(';')[0] : p).join(', ')}
          </td>
        </tr>
      );
    }
  };

  return (
    <div className={`w-full ${modeColors.text}`}>
      {/* Title - mobile gets its own row */}
      <div className="block sm:hidden mb-1">
        <h3 className={`text-xl ${modeColors.text}`}>
          {getPageTitle()}
        </h3>
      </div>

      {/* Desktop layout - title and controls on same row */}
      <div className="hidden sm:flex justify-between items-center mb-2">
        <h3 className={`text-xl ${modeColors.text}`}>
          {getPageTitle()}
        </h3>
        <div className={`flex items-center gap-1 sm:gap-2 ${modeColors.text}`}>
          <button
            onClick={() => setIsCompactView(!isCompactView)}
            className={`p-1 rounded ${isCompactView ? modeColors.buttonActive : modeColors.buttonInactive} hover:opacity-80`}
            title={isCompactView ? 'Switch to expanded view' : 'Switch to compact view'}
          >
            {isCompactView ? <List size={16} /> : <LayoutGrid size={16} />}
          </button>
          <label className="text-xs sm:text-sm">Show top</label>
          <input
            type="number"
            min="1"
            max="999"
            value={topN}
            onChange={(e) => setTopN(Math.min(999, Math.max(1, parseInt(e.target.value))))}
            className={`border rounded w-16 px-2 py-1 text-xs sm:text-sm ${modeColors.bgCard} ${modeColors.border} ${modeColors.text}`}
          />
        </div>
      </div>

      {/* Mobile controls - separate row */}
      <div className="block sm:hidden mb-4">
        <div className={`flex items-center gap-1 ${modeColors.text}`}>
          <button
            onClick={() => setIsCompactView(!isCompactView)}
            className={`p-1 rounded ${isCompactView ? modeColors.buttonActive : modeColors.buttonInactive} hover:opacity-80`}
            title={isCompactView ? 'Switch to expanded view' : 'Switch to compact view'}
          >
            {isCompactView ? <List size={16} /> : <LayoutGrid size={16} />}
          </button>
          <label className="text-xs">Show top</label>
          <input
            type="number"
            min="1"
            max="999"
            value={topN}
            onChange={(e) => setTopN(Math.min(999, Math.max(1, parseInt(e.target.value))))}
            className={`border rounded w-16 px-2 py-1 text-xs ${modeColors.bgCard} ${modeColors.border} ${modeColors.text}`}
          />
        </div>
      </div>
     

      {/* Duplicate Detection Settings */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <label className={`text-xs sm:text-sm font-medium ${
              isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
            }`}>Session gap threshold: </label>
            <input
              type="number"
              min="1"
              max="1440" // 24 hours max
              value={duplicateThreshold}
              onChange={(e) => setDuplicateThreshold(Math.min(1440, Math.max(1, parseInt(e.target.value))))}
              className={`border rounded w-16 px-2 py-1 text-xs sm:text-sm focus:border-indigo-400 focus:ring-indigo-400 ${
                isDarkMode 
                  ? 'bg-black border-gray-600 text-indigo-300' 
                  : 'bg-white border-gray-300 text-indigo-700'
              }`}
            />
            <span className={`text-xs sm:text-sm ${
              isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
            }`}>minutes</span>
          </div>
        
          <button 
            onClick={() => setShowDuplicateStats(!showDuplicateStats)}
            className={`px-3 py-1 rounded text-xs sm:text-sm hover:opacity-80 ${
              isDarkMode 
                ? 'bg-black text-indigo-300 hover:bg-gray-600' 
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
          >
            {showDuplicateStats ? 'Hide Stats' : 'Show Stats'}
          </button>
        </div>
        
        {showDuplicateStats && (
          <div className={`text-xs sm:text-sm p-2 rounded ${
            isDarkMode 
              ? 'bg-black border border-gray-700 text-indigo-300' 
              : 'bg-indigo-100 text-indigo-700'
          }`}>
            <div><span className="font-medium">{duplicatesFound}</span> duplicate plays filtered:</div>
            <div>• <span className="font-medium">{duplicateTypes.exact}</span> exact duplicates</div>
            <div>• <span className="font-medium">{duplicateTypes.overlapping}</span> overlapping sessions</div>
            <div>• <span className="font-medium">{duplicateTypes.zeroTime}</span> zero-duration entries</div>
          </div>
        )}
    

      {/* Show Selection */}
      <div className="relative">
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedShows.map(show => (
            <div 
              key={show} 
              className={`flex items-center px-2 py-1 rounded text-xs sm:text-sm ${
                isDarkMode 
                  ? 'bg-indigo-700 text-indigo-200' 
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {show}
              <button 
                onClick={() => removeShow(show)}
                className={`ml-2 hover:opacity-80 ${
                  isDarkMode ? 'text-indigo-200' : 'text-white hover:text-indigo-200'
                }`}
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
            className={`w-full border rounded px-2 py-1 text-xs sm:text-sm focus:border-indigo-400 focus:ring-indigo-400 ${
              isDarkMode 
                ? 'bg-black border-gray-600 text-indigo-300 placeholder-gray-500' 
                : 'bg-white border-gray-300 text-indigo-700'
            }`}
          />
          {showSearch && filteredShows.length > 0 && (
            <div className={`absolute z-10 w-full border rounded shadow-lg mt-1 ${
              isDarkMode 
                ? 'bg-black border-gray-600' 
                : 'bg-white border-gray-300'
            }`}>
              {filteredShows.map(show => (
                <div
                  key={show}
                  onClick={() => addShow(show)}
                  className={`px-2 py-1 cursor-pointer text-xs sm:text-sm ${
                    isDarkMode 
                      ? 'text-indigo-300 hover:bg-black' 
                      : 'text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  {show}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {filteredEpisodes.length > 0 ? (
        <div className="overflow-x-auto -mx-2 sm:-mx-4 px-2 sm:px-4">
          <div className={(isMobile || isCompactView) ? "min-w-full" : "min-w-[800px]"}>
            <table className="w-full border-collapse">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                  {isMobile && (
                    <>
                      <th className={`p-2 text-left text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Episode Info</th>
                      <th className={`p-2 text-right text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Stats</th>
                    </>
                  )}
                  {isCompactView && !isMobile && (
                    <>
                      <th className={`p-1 sm:p-2 text-left text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Rank</th>
                      <th className={`p-1 sm:p-2 text-left text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Episode</th>
                      <th className={`p-1 sm:p-2 text-left text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Show</th>
                      <th 
                        className={`p-1 sm:p-2 text-right text-xs sm:text-sm cursor-pointer hover:opacity-80 ${
                          isDarkMode ? 'text-indigo-300 hover:bg-black' : 'text-indigo-700 hover:bg-indigo-100'
                        } ${sortBy === 'totalPlayed' ? 'font-bold' : ''}`}
                        onClick={() => setSortBy('totalPlayed')}
                      >
                        Total Time {sortBy === 'totalPlayed' && '▼'}
                      </th>
                      <th 
                        className={`p-1 sm:p-2 text-right text-xs sm:text-sm cursor-pointer hover:opacity-80 ${
                          isDarkMode ? 'text-indigo-300 hover:bg-black' : 'text-indigo-700 hover:bg-indigo-100'
                        } ${sortBy === 'longestSession' ? 'font-bold' : ''}`}
                        onClick={() => setSortBy('longestSession')}
                      >
                        Longest {sortBy === 'longestSession' && '▼'}
                      </th>
                      <th 
                        className={`p-1 sm:p-2 text-right text-xs sm:text-sm cursor-pointer hover:opacity-80 ${
                          isDarkMode ? 'text-indigo-300 hover:bg-black' : 'text-indigo-700 hover:bg-indigo-100'
                        } ${sortBy === 'segmentCount' ? 'font-bold' : ''}`}
                        onClick={() => setSortBy('segmentCount')}
                      >
                        Sessions {sortBy === 'segmentCount' && '▼'}
                      </th>
                      {showDuplicateStats && (
                        <th className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
                          isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                        }`}>Dupes</th>
                      )}
                      <th className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Platforms</th>
                    </>
                  )}
                  {!isMobile && !isCompactView && (
                    <>
                      <th className={`p-1 sm:p-2 text-left text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Rank</th>
                      <th className={`p-1 sm:p-2 text-left text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Episode</th>
                      <th className={`p-1 sm:p-2 text-left text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Show</th>
                      <th 
                        className={`p-1 sm:p-2 text-right text-xs sm:text-sm cursor-pointer hover:opacity-80 ${
                          isDarkMode ? 'text-indigo-300 hover:bg-black' : 'text-indigo-700 hover:bg-indigo-100'
                        } ${sortBy === 'totalPlayed' ? 'font-bold' : ''}`}
                        onClick={() => setSortBy('totalPlayed')}
                      >
                        Total Time {sortBy === 'totalPlayed' && '▼'}
                      </th>
                      <th 
                        className={`p-1 sm:p-2 text-right text-xs sm:text-sm cursor-pointer hover:opacity-80 ${
                          isDarkMode ? 'text-indigo-300 hover:bg-black' : 'text-indigo-700 hover:bg-indigo-100'
                        } ${sortBy === 'longestSession' ? 'font-bold' : ''}`}
                        onClick={() => setSortBy('longestSession')}
                      >
                        Longest Session {sortBy === 'longestSession' && '▼'}
                      </th>
                      <th 
                        className={`p-1 sm:p-2 text-right text-xs sm:text-sm cursor-pointer hover:opacity-80 ${
                          isDarkMode ? 'text-indigo-300 hover:bg-black' : 'text-indigo-700 hover:bg-indigo-100'
                        } ${sortBy === 'segmentCount' ? 'font-bold' : ''}`}
                        onClick={() => setSortBy('segmentCount')}
                      >
                        Sessions {sortBy === 'segmentCount' && '▼'}
                      </th>
                      {showDuplicateStats && (
                        <th className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
                          isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                        }`}>Duplicates Removed</th>
                      )}
                      <th className={`p-1 sm:p-2 text-right text-xs sm:text-sm ${
                        isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
                      }`}>Platforms</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredEpisodes.map(renderEpisodeRow)}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`text-center py-4 ${
          isDarkMode ? 'text-indigo-400' : 'text-indigo-500'
        }`}>
          {startDate || endDate || selectedShows.length > 0 
            ? 'No episodes found matching your filters' 
            : 'Select filters to view episodes'}
        </div>
      )}
    </div>
  );
};

export default PodcastRankings;