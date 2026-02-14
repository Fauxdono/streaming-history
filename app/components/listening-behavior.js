import React, { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ArtistByTimeOfDay from './ArtistByTimeOfDay.js';
import { useTheme } from './themeprovider.js';

// Removed exported variables to prevent conflicts with SpotifyAnalyzer state management

const ListeningBehavior = ({
  rawPlayData = [],
  formatDuration,
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  colorTheme = 'indigo',
  colorMode = 'minimal'
}) => {
  const [activeTab, setActiveTab] = useState('behavior');

  // Defer heavy computations to prevent blocking during tab switch
  const deferredRawPlayData = useDeferredValue(rawPlayData);
  const deferredActiveTab = useDeferredValue(activeTab);
  // Use selectedYear if it's a specific date (YYYY-MM-DD), otherwise use today
  const [selectedDate, setSelectedDate] = useState(() => {
    if (selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3) {
      return selectedYear; // Use the date from year selector
    }
    return null; // No automatic date selection
  });

  // Get the current theme
  const { theme, minPlayDuration, skipFilter, fullListenOnly } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Color system for colorful/minimal modes - colorful has contrast, minimal is flat (Amber theme)
  const modeColors = isColorful ? {
    text: isDarkMode ? 'text-amber-300' : 'text-amber-700',
    textLight: isDarkMode ? 'text-amber-400' : 'text-amber-600',
    textLighter: isDarkMode ? 'text-amber-500' : 'text-amber-500',
    bg: isDarkMode ? 'bg-amber-900' : 'bg-amber-200',
    bgLight: isDarkMode ? 'bg-amber-800' : 'bg-amber-100',
    bgCard: isDarkMode ? 'bg-amber-800' : 'bg-amber-100',
    bgCardAlt: isDarkMode ? 'bg-amber-800' : 'bg-amber-100',
    border: isDarkMode ? 'border-amber-600' : 'border-amber-300',
    borderLight: isDarkMode ? 'border-amber-600' : 'border-amber-300',
    buttonActive: isDarkMode ? 'bg-amber-600 text-black' : 'bg-amber-500 text-black',
    buttonInactive: isDarkMode ? 'bg-amber-800 text-amber-300 border border-amber-600 hover:bg-amber-700' : 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200',
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

  // Color theme for legends - grey in minimal mode
  const getLegendTextColor = useMemo(() => {
    if (!isColorful) {
      return isDarkMode ? '#ffffff' : '#000000'; // White/black in minimal mode
    }
    if (isDarkMode) {
      switch (colorTheme) {
        case 'purple': return '#C4B5FD';
        case 'indigo': return '#A5B4FC';
        case 'green': return '#86EFAC';
        case 'blue': return '#93C5FD';
        case 'amber': return '#FCD34D';  // amber-300 hex - lighter amber for dark mode
        case 'yellow': return '#FCD34D';  // amber-300 hex - lighter amber for dark mode
        default: return '#A5B4FC';
      }
    } else {
      switch (colorTheme) {
        case 'purple': return '#7C3AED';
        case 'indigo': return '#3730A3';
        case 'green': return '#14532D';
        case 'blue': return '#1E40AF';
        case 'amber': return '#B45309';  // amber-700 hex - darker for light mode
        case 'yellow': return '#92400E';  // yellow-800 - darker for light mode
        default: return '#3730A3';
      }
    }
  }, [colorTheme, isDarkMode, isColorful]);

  // Color theme mapping function
  const getColors = (colorTheme) => {
    console.log('🔍 getColors called with:', colorTheme);
    switch (colorTheme) {
      case 'amber':
        console.log('✅ Using amber color case - copying CustomTrackRankings approach');
        return {
          text: 'text-amber-700',
          textLight: 'text-amber-600', 
          textLighter: 'text-amber-500',
          textDark: 'text-amber-800',
          primary: 'text-amber-600',
          primaryLight: 'text-amber-500',
          primaryLighter: 'text-amber-400',
          primaryDark: 'text-amber-300',    // For dark mode
          primaryDarker: 'text-amber-200',
          bg: 'bg-amber-50',
          bgLight: 'bg-amber-100',
          bgLighter: 'bg-amber-50',
          bgMed: 'bg-amber-200',
          bgDark: 'bg-amber-600',
          border: 'border-amber-200',
          borderMed: 'border-amber-300',
          borderDark: 'border-amber-400',
          borderStrong: 'border-amber-600',
          hoverBg: 'hover:bg-amber-100',
          textVeryLight: 'text-amber-400'
        };
      case 'yellow':
        return {
          primary: 'yellow-700',
          primaryLight: 'yellow-600',
          primaryLighter: 'yellow-500',
          primaryDark: 'amber-300',    // Use amber-300 for lighter amber in dark mode
          primaryDarker: 'amber-400',  // Use amber-400 for slightly darker amber in dark mode
          bg: 'yellow-600',
          bgLight: 'yellow-200',
          bgLighter: 'yellow-100',
          bgMed: 'yellow-300',
          border: 'yellow-200',
          borderMed: 'yellow-300',
          borderDark: 'yellow-400',
          borderStrong: 'yellow-600',
          hoverBg: 'yellow-300',
          text: 'yellow-700',
          textDark: 'amber-300',       // Use amber-300 for lighter amber text in dark mode
          textLight: 'amber-400',      // Use amber-400 for amber text in dark mode
          textLighter: 'amber-200',    // Use amber-200 for lightest amber text in dark mode
          textVeryLight: 'yellow-500'
        };
      case 'indigo':
      default:
        return {
          primary: 'indigo-700',
          primaryLight: 'indigo-600',
          primaryLighter: 'indigo-500',
          primaryDark: 'indigo-400',
          primaryDarker: 'indigo-300',
          bg: 'indigo-600',
          bgLight: 'indigo-200',
          bgLighter: 'indigo-100',
          bgMed: 'indigo-300',
          border: 'indigo-200',
          borderMed: 'indigo-300',
          borderDark: 'indigo-400',
          borderStrong: 'indigo-600',
          hoverBg: 'indigo-300',
          text: 'indigo-700',
          textDark: 'indigo-200',
          textLight: 'indigo-300',
          textLighter: 'indigo-400',
          textVeryLight: 'indigo-500'
        };
    }
  };

  const colors = getColors(colorTheme);
  console.log('🎯 Final colors object:', colors);

  // Color theme for pie chart strokes - use actual hex values instead of CSS variables for SVG compatibility
  // In minimal mode, use grey; in colorful mode, use theme colors
  const getStrokeColor = useMemo(() => {
    if (!isColorful) {
      return isDarkMode ? '#ffffff' : '#000000'; // White/black stroke in minimal mode
    }
    if (isDarkMode) {
      switch (colorTheme) {
        case 'purple': return '#d8b4fe';
        case 'indigo': return '#a5b4fc';
        case 'green': return '#86efac';
        case 'blue': return '#93c5fd';
        case 'teal': return '#5eead4';
        case 'orange': return '#fdba74';
        case 'pink': return '#f9a8d4';
        case 'red': return '#fca5a5';
        case 'yellow': return '#fde047';
        case 'cyan': return '#67e8f9';
        case 'emerald': return '#6ee7b7';
        case 'rose': return '#fda4af';
        case 'amber': return '#fcd34d';
        default: return '#a5b4fc';
      }
    } else {
      switch (colorTheme) {
        case 'purple': return '#6b21a8';
        case 'indigo': return '#3730a3';
        case 'green': return '#14532d';
        case 'blue': return '#1e40af';
        case 'teal': return '#115e59';
        case 'orange': return '#9a3412';
        case 'pink': return '#831843';
        case 'red': return '#7f1d1d';
        case 'yellow': return '#713f12';
        case 'cyan': return '#155e75';
        case 'emerald': return '#065f46';
        case 'rose': return '#9f1239';
        case 'amber': return '#b45309';
        default: return '#3730a3';
      }
    }
  }, [colorTheme, isDarkMode, isColorful]);

  // Color theme for pie chart text labels - use actual hex values instead of CSS variables for SVG compatibility
  // In minimal mode, use grey; in colorful mode, use theme colors
  const getTextColor = useMemo(() => {
    if (!isColorful) {
      return isDarkMode ? '#ffffff' : '#000000'; // White/black text in minimal mode
    }
    if (isDarkMode) {
      switch (colorTheme) {
        case 'purple': return '#d8b4fe';
        case 'indigo': return '#a5b4fc';
        case 'green': return '#86efac';
        case 'blue': return '#93c5fd';
        case 'teal': return '#5eead4';
        case 'orange': return '#fdba74';
        case 'pink': return '#f9a8d4';
        case 'red': return '#fca5a5';
        case 'yellow': return '#fde047';
        case 'cyan': return '#67e8f9';
        case 'emerald': return '#6ee7b7';
        case 'rose': return '#fda4af';
        case 'amber': return '#fcd34d';
        default: return '#a5b4fc';
      }
    } else {
      switch (colorTheme) {
        case 'purple': return '#6b21a8';
        case 'indigo': return '#3730a3';
        case 'green': return '#14532d';
        case 'blue': return '#1e40af';
        case 'teal': return '#115e59';
        case 'orange': return '#9a3412';
        case 'pink': return '#831843';
        case 'red': return '#7f1d1d';
        case 'yellow': return '#713f12';
        case 'cyan': return '#155e75';
        case 'emerald': return '#065f46';
        case 'rose': return '#9f1239';
        case 'amber': return '#b45309';
        default: return '#3730a3';
      }
    }
  }, [colorTheme, isDarkMode, isColorful]);
  
// Update the filteredData useMemo in ListeningBehavior.js
const filteredData = useMemo(() => {
  // Use deferred data for non-blocking computation
  const dataToUse = deferredRawPlayData;
  
  if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
    // Year range mode
    
    // Check if dates include month/day information
    const startHasMonthDay = yearRange.startYear.includes('-');
    const endHasMonthDay = yearRange.endYear.includes('-');
    
    if (startHasMonthDay || endHasMonthDay) {
      // Parse dates into Date objects for comparison
      let startDate, endDate;
      
      try {
        // Process start date
        if (startHasMonthDay) {
          if (yearRange.startYear.split('-').length === 3) {
            // YYYY-MM-DD format
            startDate = new Date(yearRange.startYear);
            startDate.setHours(0, 0, 0, 0); // Start of day
          } else if (yearRange.startYear.split('-').length === 2) {
            // YYYY-MM format
            const [year, month] = yearRange.startYear.split('-').map(Number);
            startDate = new Date(year, month - 1, 1); // First day of month
          } else {
            startDate = new Date(parseInt(yearRange.startYear), 0, 1); // January 1st
          }
        } else {
          // Just year
          startDate = new Date(parseInt(yearRange.startYear), 0, 1); // January 1st
        }
        
        // Process end date
        if (endHasMonthDay) {
          if (yearRange.endYear.split('-').length === 3) {
            // YYYY-MM-DD format
            endDate = new Date(yearRange.endYear);
            endDate.setHours(23, 59, 59, 999); // End of day
          } else if (yearRange.endYear.split('-').length === 2) {
            // YYYY-MM format
            const [year, month] = yearRange.endYear.split('-').map(Number);
            // Last day of month
            endDate = new Date(year, month, 0, 23, 59, 59, 999);
          } else {
            endDate = new Date(parseInt(yearRange.endYear), 11, 31, 23, 59, 59, 999); // December 31st
          }
        } else {
          // Just year
          endDate = new Date(parseInt(yearRange.endYear), 11, 31, 23, 59, 59, 999); // December 31st
        }
        
        // Filter data for this date range
        return dataToUse.filter(entry => {
          try {
            const date = new Date(entry.ts);
            if (isNaN(date.getTime())) return false;
            
            return date >= startDate && date <= endDate;
          } catch (err) {
            return false;
          }
        });
        
      } catch (err) {
        console.error("Error processing date range", err);
        // Fallback to standard year range
        const startYear = parseInt(yearRange.startYear);
        const endYear = parseInt(yearRange.endYear);
        
        return dataToUse.filter(entry => {
          try {
            const date = new Date(entry.ts);
            if (isNaN(date.getTime())) return false;
            
            const year = date.getFullYear();
            return year >= startYear && year <= endYear;
          } catch (err) {
            return false;
          }
        });
      }
    } else {
      // Standard year range (no month/day specificity)
      const startYear = parseInt(yearRange.startYear);
      const endYear = parseInt(yearRange.endYear);
      
      return dataToUse.filter(entry => {
        try {
          const date = new Date(entry.ts);
          if (isNaN(date.getTime())) return false;
          
          const year = date.getFullYear();
          return year >= startYear && year <= endYear;
        } catch (err) {
          return false;
        }
      });
    }
  } else if (selectedYear !== 'all') {
    if (selectedYear.includes('-')) {
      // Handle YYYY-MM or YYYY-MM-DD format
      return dataToUse.filter(entry => {
        try {
          const date = new Date(entry.ts);
          if (isNaN(date.getTime())) return false;
          
          // For YYYY-MM-DD format
          if (selectedYear.split('-').length === 3) {
            return date.toISOString().split('T')[0] === selectedYear;
          }
          
          // For YYYY-MM format
          const [year, month] = selectedYear.split('-');
          return date.getFullYear() === parseInt(year) && 
                (date.getMonth() + 1) === parseInt(month);
        } catch (err) {
          return false;
        }
      });
    } else {
      // Regular single year
      return dataToUse.filter(entry => {
        try {
          const date = new Date(entry.ts);
          if (isNaN(date.getTime())) return false;
          
          return date.getFullYear() === parseInt(selectedYear);
        } catch (err) {
          return false;
        }
      });
    }
  } else {
    return dataToUse;
  }
}, [deferredRawPlayData, selectedYear, yearRangeMode, yearRange]);
  
  // Add loading state for heavy computations
  const [isComputing, setIsComputing] = useState(false);
  
  // Analyze user behavior (skips, shuffle, etc.) - only compute for active behavior tab
  const behaviorData = useMemo(() => {
    if (deferredActiveTab !== 'behavior' && activeTab !== 'behavior') {
      return { shuffleData: [], skipData: [], endReasons: [], startReasons: [], platformData: [] };
    }
    let totalTracks = 0;
    let skippedTracks = 0;
    let shufflePlays = 0;
    let normalPlays = 0;
    let completedTracks = 0;
    
    // Reason end counts
    const reasonEndCounts = {};
    const reasonStartCounts = {};
    const platforms = {};
    
    filteredData.forEach(entry => {
      if (entry.ms_played >= 1000) { // Only analyze meaningful plays (more than 1 second)
        totalTracks++;
        
        // Count platform usage
        const platform = entry.platform || 'Unknown';
        platforms[platform] = (platforms[platform] || 0) + 1;
        
        // Count shuffle vs. normal plays
        if (entry.shuffle) {
          shufflePlays++;
        } else {
          normalPlays++;
        }
        
        // Count skips (using reason_end)
        if (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn') {
          skippedTracks++;
        }
        
        // Count completed tracks
        if (entry.reason_end === 'trackdone') {
          completedTracks++;
        }
        
        // Count all end reasons
        reasonEndCounts[entry.reason_end] = (reasonEndCounts[entry.reason_end] || 0) + 1;
        
        // Count start reasons
        reasonStartCounts[entry.reason_start] = (reasonStartCounts[entry.reason_start] || 0) + 1;
      }
    });
    
    // Format for pie charts - grey in minimal mode, colorful otherwise
    const shuffleData = [
      { name: 'Shuffle On', value: shufflePlays, color: isColorful ? (isDarkMode ? '#4C1D95' : '#8884d8') : (isDarkMode ? '#6B7280' : '#9CA3AF') },
      { name: 'Shuffle Off', value: normalPlays, color: isColorful ? (isDarkMode ? '#065F46' : '#82ca9d') : (isDarkMode ? '#374151' : '#D1D5DB') }
    ];

    const skipData = [
      { name: 'Completed', value: completedTracks, color: isColorful ? (isDarkMode ? '#065F46' : '#82ca9d') : (isDarkMode ? '#4B5563' : '#9CA3AF') },
      { name: 'Skipped', value: skippedTracks, color: isColorful ? (isDarkMode ? '#DC2626' : '#ff8042') : (isDarkMode ? '#6B7280' : '#6B7280') },
      { name: 'Other End', value: totalTracks - completedTracks - skippedTracks, color: isColorful ? (isDarkMode ? '#4C1D95' : '#8884d8') : (isDarkMode ? '#374151' : '#D1D5DB') }
    ];
    
    // Format reasons for bar charts
    const endReasons = Object.entries(reasonEndCounts).map(([reason, count]) => ({
      name: reason,
      count,
      percentage: Math.round((count / totalTracks) * 100)
    })).sort((a, b) => b.count - a.count);
    
    const startReasons = Object.entries(reasonStartCounts).map(([reason, count]) => ({
      name: reason,
      count,
      percentage: Math.round((count / totalTracks) * 100)
    })).sort((a, b) => b.count - a.count);
    
    // Format platforms for bar chart
    const platformData = Object.entries(platforms).map(([platform, count]) => ({
      name: platform,
      count,
      percentage: Math.round((count / totalTracks) * 100)
    })).sort((a, b) => b.count - a.count);
    
    return {
      totalTracks,
      skippedTracks,
      skippedPercentage: Math.round((skippedTracks / totalTracks) * 100),
      completedTracks,
      completedPercentage: Math.round((completedTracks / totalTracks) * 100),
      shufflePlays,
      shufflePercentage: Math.round((shufflePlays / totalTracks) * 100),
      endReasons,
      startReasons,
      shuffleData,
      skipData,
      platformData
    };
  }, [filteredData, deferredActiveTab, activeTab, isDarkMode, isColorful]);
  
  // Analyze listening sessions - only compute for active sessions tab
  const sessionData = useMemo(() => {
    if (deferredActiveTab !== 'sessions' && activeTab !== 'sessions') {
      return { sessions: [], sessionLengths: [], totalSessions: 0, durationGroups: [] };
    }
    // Define a session as listening activity with gaps less than 30 minutes
    const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes
    const sessions = [];
    let currentSession = null;
    
    // Sort all entries by timestamp
    const sortedEntries = [...filteredData].sort((a, b) => {
      return new Date(a.ts) - new Date(b.ts);
    });
    
    sortedEntries.forEach(entry => {
      if (entry.ms_played < 5000) return; // Ignore very short plays
      
      const timestamp = new Date(entry.ts);
      
      if (!currentSession) {
        // Start a new session
        currentSession = {
          start: timestamp,
          end: new Date(timestamp.getTime() + entry.ms_played),
          tracks: [entry],
          totalDuration: entry.ms_played
        };
      } else {
        const timeSinceLastTrack = timestamp - currentSession.end;
        
        if (timeSinceLastTrack <= SESSION_GAP_MS) {
          // Continue current session
          currentSession.end = new Date(timestamp.getTime() + entry.ms_played);
          currentSession.tracks.push(entry);
          currentSession.totalDuration += entry.ms_played;
        } else {
          // End current session and start a new one
          sessions.push(currentSession);
          currentSession = {
            start: timestamp,
            end: new Date(timestamp.getTime() + entry.ms_played),
            tracks: [entry],
            totalDuration: entry.ms_played
          };
        }
      }
    });
    
    // Add the last session if it exists
    if (currentSession) {
      sessions.push(currentSession);
    }
    
    // Calculate session stats
    const sessionLengths = sessions.map(session => {
      const durationMinutes = Math.round(session.totalDuration / 60000);
      const dayOfWeek = session.start.getDay();
      const hour = session.start.getHours();
      return {
        date: session.start.toLocaleDateString(),
        fullDate: session.start,
        dayOfWeek,
        hour,
        tracksCount: session.tracks.length,
        durationMinutes,
        sessionDuration: session.end - session.start,
        averageTrackLength: Math.round(session.totalDuration / session.tracks.length)
      };
    });
    
    // Find days with most activity
    const dayStats = {};
    const monthStats = {};
    
    const passesFilters = (entry) => {
      if (entry.ms_played < minPlayDuration) return false;
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) return false;
      if (fullListenOnly && entry.reason_end !== 'trackdone') return false;
      return true;
    };
    sortedEntries.forEach(entry => {
      if (!passesFilters(entry)) return;
      
      const date = new Date(entry.ts);
      const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      
      // Track day stats
      if (!dayStats[dayKey]) {
        dayStats[dayKey] = {
          date: date,
          displayDate: date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          totalPlays: 0,
          totalTime: 0
        };
      }
      dayStats[dayKey].totalPlays++;
      dayStats[dayKey].totalTime += entry.ms_played;
      
      // Track month stats
      if (!monthStats[monthKey]) {
        monthStats[monthKey] = {
          date: new Date(date.getFullYear(), date.getMonth(), 1),
          displayDate: date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long'
          }),
          totalPlays: 0,
          totalTime: 0
        };
      }
      monthStats[monthKey].totalPlays++;
      monthStats[monthKey].totalTime += entry.ms_played;
    });
    
    // Find top days and months
    const mostActiveDay = Object.values(dayStats)
      .sort((a, b) => b.totalPlays - a.totalPlays)[0] || null;
    
    const longestListeningDay = Object.values(dayStats)
      .sort((a, b) => b.totalTime - a.totalTime)[0] || null;
    
    const mostActiveMonth = Object.values(monthStats)
      .sort((a, b) => b.totalPlays - a.totalPlays)[0] || null;
    
    // Group sessions by duration - grey in minimal mode, colorful otherwise
    const durationGroups = [
      { name: "< 15 min", count: 0, color: isColorful ? (isDarkMode ? "#4C1D95" : "#8884d8") : (isDarkMode ? "#374151" : "#D1D5DB") },
      { name: "15-30 min", count: 0, color: isColorful ? (isDarkMode ? "#065F46" : "#82ca9d") : (isDarkMode ? "#4B5563" : "#9CA3AF") },
      { name: "30-60 min", count: 0, color: isColorful ? (isDarkMode ? "#D97706" : "#ffc658") : (isDarkMode ? "#6B7280" : "#6B7280") },
      { name: "1-2 hours", count: 0, color: isColorful ? (isDarkMode ? "#DC2626" : "#ff8042") : (isDarkMode ? "#9CA3AF" : "#4B5563") },
      { name: "> 2 hours", count: 0, color: isColorful ? (isDarkMode ? "#1E40AF" : "#8dd1e1") : (isDarkMode ? "#D1D5DB" : "#374151") }
    ];
    
    sessionLengths.forEach(session => {
      if (session.durationMinutes < 15) {
        durationGroups[0].count++;
      } else if (session.durationMinutes < 30) {
        durationGroups[1].count++;
      } else if (session.durationMinutes < 60) {
        durationGroups[2].count++;
      } else if (session.durationMinutes < 120) {
        durationGroups[3].count++;
      } else {
        durationGroups[4].count++;
      }
    });
    
    // Calculate session averages
    const totalSessions = sessions.length;
    const averageSessionDuration = totalSessions ? 
      Math.round(sessionLengths.reduce((sum, session) => sum + session.durationMinutes, 0) / totalSessions) : 0;
    const averageTracksPerSession = totalSessions ? 
      Math.round(sessionLengths.reduce((sum, session) => sum + session.tracksCount, 0) / totalSessions) : 0;
    
    // Find longest session with date
    const longestSession = sessionLengths.length ? 
      sessionLengths.sort((a, b) => b.durationMinutes - a.durationMinutes)[0] : null;
    
    // Find session with most tracks with date
    const mostTracksSession = sessionLengths.length ?
      sessionLengths.sort((a, b) => b.tracksCount - a.tracksCount)[0] : null;
    
    return {
      sessions,
      sessionLengths,
      totalSessions,
      averageSessionDuration,
      averageTracksPerSession,
      durationGroups,
      longestSession,
      mostTracksSession,
      mostActiveDay,
      longestListeningDay,
      mostActiveMonth
    };
  }, [filteredData, isDarkMode, isColorful, deferredActiveTab, activeTab, minPlayDuration, skipFilter, fullListenOnly]);

  // Update selectedDate when selectedYear changes to a specific date
  React.useEffect(() => {
    if (selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3) {
      setSelectedDate(selectedYear);
    }
  }, [selectedYear]);

  // Analyze listening history for selected date - only compute for active history tab

  // Custom pie chart label renderer - just show the percentage inside
  const renderCustomizedLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    console.log('Pie chart render - Theme:', theme, 'isDarkMode:', isDarkMode, 'textColor:', getTextColor, 'strokeColor:', getStrokeColor);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={getTextColor}
        style={{ fill: getTextColor }}
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize="12px"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  }, [getTextColor]);

  // Memoized chart components to prevent unnecessary re-renders
  const ShuffleChart = React.memo(({ data, isDarkMode, colorTheme }) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart key={`pie-shuffle-${isDarkMode}-${colorTheme}`}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="70%"
          labelLine={false}
          label={renderCustomizedLabel}
          stroke={getStrokeColor}
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => value}
          contentStyle={{
            backgroundColor: isDarkMode ? '#1F2937' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
            color: isDarkMode ? '#ffffff' : '#000000'
          }}
        />
        <Legend
          wrapperStyle={{
            color: getLegendTextColor,
            fontSize: '12px'
          }}
          contentStyle={{
            color: getLegendTextColor
          }}
          iconType="rect"
          formatter={(value) => (
            <span style={{ color: getLegendTextColor }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  ));

  const CompletionChart = React.memo(({ data, isDarkMode, colorTheme }) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart key={`pie-completion-${isDarkMode}-${colorTheme}`}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="70%"
          labelLine={false}
          label={renderCustomizedLabel}
          stroke={getStrokeColor}
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => value}
          contentStyle={{
            backgroundColor: isDarkMode ? '#1F2937' : '#ffffff',
            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
            color: isDarkMode ? '#ffffff' : '#000000'
          }}
        />
        <Legend 
          wrapperStyle={{ 
            color: getLegendTextColor,
            fontSize: '12px'
          }}
          contentStyle={{
            color: getLegendTextColor
          }}
          iconType="rect"
          formatter={(value) => (
            <span style={{ color: getLegendTextColor }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  ));

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded font-medium ${
        activeTab === id ? modeColors.buttonActive : modeColors.buttonInactive
      }`}
    >
      {label}
    </button>
  );

  // Function to get title based on year selection mode
  const getPageTitle = () => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return <span>Listening Behavior <span className="text-xs opacity-75">{yearRange.startYear}-{yearRange.endYear}</span></span>;
    } else if (selectedYear === 'all') {
      return <span>Listening Behavior <span className="text-xs opacity-75">all-time</span></span>;
    } else {
      return <span>Listening Behavior <span className="text-xs opacity-75">{selectedYear}</span></span>;
    }
  };

  return (
    <div className={`w-full ${modeColors.text}`}>
      {/* Title - mobile gets its own row */}
      <div className="hidden">
        <h3 className={`text-xl ${modeColors.text}`}>
          {getPageTitle()}
        </h3>
      </div>

      {/* Desktop layout - title and controls on same row */}
      <div className="hidden sm:flex justify-between items-center mb-2">
        <h3 className={`text-xl ${modeColors.text}`}>
          {getPageTitle()}
        </h3>
        <div className="flex flex-wrap gap-1 sm:gap-2">
          <TabButton id="behavior" label="Behavior" />
          <TabButton id="sessions" label="Sessions" />
          <TabButton id="artistsTime" label="Artists by Time" />
        </div>
      </div>

      {/* Mobile controls - separate row */}
      <div className="block sm:hidden mb-2">
        <div className="flex flex-wrap gap-1">
          <TabButton id="behavior" label="Behavior" />
          <TabButton id="sessions" label="Sessions" />
          <TabButton id="artistsTime" label="By Time" />
        </div>
      </div>

      {activeTab === 'behavior' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Shuffle vs. Normal Play</h3>
              <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
                <ShuffleChart
                  data={behaviorData.shuffleData}
                  isDarkMode={isDarkMode}
                  colorTheme={colorTheme}
                />
              </div>

              <div className={`text-sm text-center mt-2 ${modeColors.textLight}`}>
                You listen in shuffle mode {behaviorData.shufflePercentage}% of the time
              </div>
            </div>

            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Track Completion</h3>
              <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
                <CompletionChart
                  data={behaviorData.skipData}
                  isDarkMode={isDarkMode}
                  colorTheme={colorTheme}
                />
              </div>
              <div className={`text-sm text-center mt-2 ${modeColors.textLight}`}>
                You completed {behaviorData.completedPercentage}% of tracks, skipped {behaviorData.skippedPercentage}%
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>How You Start Tracks</h3>
            <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={behaviorData.startReasons}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" stroke={isDarkMode ? '#9CA3AF' : '#374151'} />
                  <YAxis dataKey="name" type="category" width={100} stroke={isDarkMode ? '#9CA3AF' : '#374151'} />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'count' ? 'Count' : 'Percentage']}
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1F2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                  <Legend />
                  <Bar name="Count" dataKey="count" fill={isColorful ? (isDarkMode ? "#4C1D95" : "#8884d8") : (isDarkMode ? "#9CA3AF" : "#6B7280")} />
                  <Bar name="Percentage" dataKey="percentage" fill={isColorful ? (isDarkMode ? "#065F46" : "#82ca9d") : (isDarkMode ? "#6B7280" : "#9CA3AF")} unit="%" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>How Tracks End</h3>
            <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={behaviorData.endReasons}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" stroke={isDarkMode ? '#9CA3AF' : '#374151'} />
                  <YAxis dataKey="name" type="category" width={100} stroke={isDarkMode ? '#9CA3AF' : '#374151'} />
                  <Tooltip
                    formatter={(value, name) => [value, name === 'count' ? 'Count' : 'Percentage']}
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1F2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                  <Legend />
                  <Bar name="Count" dataKey="count" fill={isColorful ? (isDarkMode ? "#4C1D95" : "#8884d8") : (isDarkMode ? "#9CA3AF" : "#6B7280")} />
                  <Bar name="Percentage" dataKey="percentage" fill={isColorful ? (isDarkMode ? "#065F46" : "#82ca9d") : (isDarkMode ? "#6B7280" : "#9CA3AF")} unit="%" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Platforms Used</h3>
            <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={behaviorData.platformData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" stroke={isDarkMode ? '#9CA3AF' : '#374151'} />
                  <YAxis dataKey="name" type="category" width={150} stroke={isDarkMode ? '#9CA3AF' : '#374151'} />
                  <Tooltip
                    formatter={(value, name) => [value, name === 'count' ? 'Count' : 'Percentage']}
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1F2937' : '#ffffff',
                      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                      color: isDarkMode ? '#ffffff' : '#000000'
                    }}
                  />
                  <Legend />
                  <Bar name="Count" dataKey="count" fill={isColorful ? (isDarkMode ? "#4C1D95" : "#8884d8") : (isDarkMode ? "#9CA3AF" : "#6B7280")} />
                  <Bar name="Percentage" dataKey="percentage" fill={isColorful ? (isDarkMode ? "#065F46" : "#82ca9d") : (isDarkMode ? "#6B7280" : "#9CA3AF")} unit="%" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
              <h3 className={`font-bold ${modeColors.text}`}>Total Sessions</h3>
              <p className={`text-3xl ${modeColors.text}`}>{sessionData.totalSessions}</p>
            </div>

            <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
              <h3 className={`font-bold ${modeColors.text}`}>Avg. Session Length</h3>
              <p className={`text-3xl ${modeColors.text}`}>{sessionData.averageSessionDuration} min</p>
            </div>

            <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
              <h3 className={`font-bold ${modeColors.text}`}>Avg. Tracks per Session</h3>
              <p className={`text-3xl ${modeColors.text}`}>{sessionData.averageTracksPerSession}</p>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Session Duration Distribution</h3>
            <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart key={`pie-session-${isDarkMode}-${colorTheme}`}>
                  <Pie
                    data={sessionData.durationGroups}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    stroke={getStrokeColor}
                    strokeWidth={2}
                  >
                    {sessionData.durationGroups.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Session Statistics</h3>
              <ul className="space-y-2">
                {sessionData.longestSession && (
                  <li className={`p-2 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
                    <span className={`font-bold ${modeColors.text}`}>Longest Session:</span>
                    <span className={`ml-2 ${modeColors.text}`}>{sessionData.longestSession.durationMinutes} minutes</span>
                    <div className={`text-sm ${modeColors.textLight}`}>
                      on {sessionData.longestSession.fullDate.toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </li>
                )}

                {sessionData.mostTracksSession && (
                  <li className={`p-2 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
                    <span className={`font-bold ${modeColors.text}`}>Most Tracks in a Session:</span>
                    <span className={`ml-2 ${modeColors.text}`}>{sessionData.mostTracksSession.tracksCount} tracks</span>
                    <div className={`text-sm ${modeColors.textLight}`}>
                      on {sessionData.mostTracksSession.fullDate.toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </li>
                )}

                <li className={`p-2 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
                  <span className={`font-bold ${modeColors.text}`}>Total Listening Time:</span>
                  <span className={`ml-2 ${modeColors.text}`}>
                    {formatDuration(sessionData.sessionLengths.reduce((sum, session) => sum + (session.durationMinutes * 60000), 0))}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Notable Days & Months</h3>
              <div className="space-y-3">
                {sessionData.mostActiveDay && (
                  <div className={`p-3 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
                    <h4 className={`font-medium ${modeColors.text}`}>Most Active Day:</h4>
                    <div className={`font-bold ${modeColors.text}`}>{sessionData.mostActiveDay.displayDate}</div>
                    <div className={`text-sm ${modeColors.textLight}`}>
                      {sessionData.mostActiveDay.totalPlays} tracks played
                    </div>
                  </div>
                )}

                {sessionData.longestListeningDay && (
                  <div className={`p-3 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
                    <h4 className={`font-medium ${modeColors.text}`}>Longest Listening Day:</h4>
                    <div className={`font-bold ${modeColors.text}`}>{sessionData.longestListeningDay.displayDate}</div>
                    <div className={`text-sm ${modeColors.textLight}`}>
                      {formatDuration(sessionData.longestListeningDay.totalTime)} of listening
                    </div>
                  </div>
                )}

                {sessionData.mostActiveMonth && (
                  <div className={`p-3 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
                    <h4 className={`font-medium ${modeColors.text}`}>Most Active Month:</h4>
                    <div className={`font-bold ${modeColors.text}`}>{sessionData.mostActiveMonth.displayDate}</div>
                    <div className={`text-sm ${modeColors.textLight}`}>
                      {sessionData.mostActiveMonth.totalPlays} tracks played
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Session Insights</h3>
            <div className={`p-3 rounded space-y-2 border ${modeColors.bgCard} ${modeColors.border}`}>
              <p className={modeColors.textLight}>
                Most of your listening sessions are
                <span className="font-bold"> {
                  sessionData.durationGroups.sort((a, b) => b.count - a.count)[0]?.name.toLowerCase()
                }</span>.
              </p>
              <p className={modeColors.textLight}>
                On average, you listen to {sessionData.averageTracksPerSession} tracks per session
                for about {sessionData.averageSessionDuration} minutes.
              </p>
            </div>
          </div>
        </div>
      )}
    
    {activeTab === 'artistsTime' && (
      <ArtistByTimeOfDay
        rawPlayData={filteredData}
        formatDuration={formatDuration}
        colorMode={colorMode}
      />
    )}
    
  </div>
);
};

export default ListeningBehavior;