import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from './themeprovider.js';

const DiscoveryAnalysis = ({
  rawPlayData = [],
  formatDuration,
  // Add props for connecting with the YearSelector sidebar
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  onYearChange,
  onYearRangeChange,
  onToggleYearRangeMode,
  colorTheme = 'green',
  colorMode = 'minimal'
}) => {
  const [activeTab, setActiveTab] = useState('discovery');
  const [timeframe, setTimeframe] = useState('all');

  // Get the current theme
  const { theme, minPlayDuration, skipFilter, fullListenOnly } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Color system for colorful/minimal modes - colorful has contrast, minimal is flat (Orange theme)
  const modeColors = isColorful ? {
    text: isDarkMode ? 'text-orange-300' : 'text-orange-700',
    textLight: isDarkMode ? 'text-orange-400' : 'text-orange-600',
    textLighter: isDarkMode ? 'text-orange-500' : 'text-orange-500',
    bg: isDarkMode ? 'bg-orange-900' : 'bg-orange-200',
    bgLight: isDarkMode ? 'bg-orange-800' : 'bg-orange-100',
    bgCard: isDarkMode ? 'bg-orange-800' : 'bg-orange-100',
    bgCardAlt: isDarkMode ? 'bg-orange-800' : 'bg-orange-100',
    border: isDarkMode ? 'border-orange-600' : 'border-orange-300',
    borderLight: isDarkMode ? 'border-orange-600' : 'border-orange-300',
    buttonActive: isDarkMode ? 'bg-orange-600 text-black' : 'bg-orange-500 text-black',
    buttonInactive: isDarkMode ? 'bg-orange-800 text-orange-300 border border-orange-600 hover:bg-orange-700' : 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200',
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
    buttonActive: isDarkMode ? 'bg-white text-black border border-white translate-x-[2px] translate-y-[2px]' : 'bg-black text-white border border-black translate-x-[2px] translate-y-[2px]',
    buttonInactive: isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-900 shadow-[2px_2px_0_0_white]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]',
  };

  // Color theme for legends - grey in minimal mode
  const getLegendTextColor = useMemo(() => {
    if (!isColorful) {
      return isDarkMode ? '#ffffff' : '#000000';
    }
    if (isDarkMode) {
      switch (colorTheme) {
        case 'purple': return '#C4B5FD';
        case 'indigo': return '#A5B4FC';
        case 'green': return '#86EFAC';
        case 'blue': return '#93C5FD';
        case 'orange': return '#FDBA74';
        default: return '#86EFAC';
      }
    } else {
      switch (colorTheme) {
        case 'purple': return '#7C3AED';
        case 'indigo': return '#3730A3';
        case 'green': return '#14532D';
        case 'blue': return '#1E40AF';
        case 'orange': return '#9a3412';
        default: return '#14532D';
      }
    }
  }, [colorTheme, isDarkMode, isColorful]);

  // Color theme for pie chart strokes - grey in minimal mode
  const getStrokeColor = useMemo(() => {
    if (!isColorful) {
      return isDarkMode ? '#ffffff' : '#000000';
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
        default: return '#86efac';
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
        default: return '#14532d';
      }
    }
  }, [colorTheme, isDarkMode, isColorful]);

  // Color theme for pie chart text labels - grey in minimal mode
  const getTextColor = useMemo(() => {
    if (!isColorful) {
      return isDarkMode ? '#ffffff' : '#000000';
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
        default: return '#86efac';
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
        default: return '#14532d';
      }
    }
  }, [colorTheme, isDarkMode, isColorful]);
  
// Update the filteredData useMemo in DiscoveryAnalysis.js
const filteredData = useMemo(() => {
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
            // Get last day of month
            const lastDay = new Date(year, month, 0).getDate();
            endDate = new Date(year, month - 1, lastDay, 23, 59, 59, 999);
          } else {
            endDate = new Date(parseInt(yearRange.endYear), 11, 31, 23, 59, 59, 999); // December 31st
          }
        } else {
          // Just year
          endDate = new Date(parseInt(yearRange.endYear), 11, 31, 23, 59, 59, 999); // December 31st
        }
        
        // Filter data for this date range
        return rawPlayData.filter(entry => {
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
        
        return rawPlayData.filter(entry => {
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
      
      return rawPlayData.filter(entry => {
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
      return rawPlayData.filter(entry => {
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
      return rawPlayData.filter(entry => {
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
    return rawPlayData;
  }
}, [rawPlayData, selectedYear, yearRangeMode, yearRange]);
  
  // Analyze artist discovery and loyalty
  const discoveryData = useMemo(() => {
    // Sort all entries by timestamp
    const passesFilters = (entry) => {
      if (entry.ms_played < minPlayDuration) return false;
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) return false;
      if (fullListenOnly && entry.reason_end !== 'trackdone') return false;
      return true;
    };
    const sortedEntries = [...filteredData].filter(entry => passesFilters(entry))
                              .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    
    if (sortedEntries.length === 0) {
      return {
        firstListenDates: {},
        newArtistsByMonth: [],
        totalArtistsDiscovered: 0,
        loyaltyData: [],
        top5Artists: [],
        top5Percentage: 0,
        uniqueArtistsCount: 0,
        artistPlayCounts: {}
      };
    }
    
    // Track first time listening to each artist
    const firstListenDates = {};
    const artistPlayCounts = {};
    const artistPlayTime = {};
    
    sortedEntries.forEach(entry => {
      const artist = entry.master_metadata_album_artist_name;
      if (!artist) return;
      
      const date = new Date(entry.ts);
      
      // Track first listen date
      if (!firstListenDates[artist]) {
        firstListenDates[artist] = date;
      }
      
      // Track play counts
      artistPlayCounts[artist] = (artistPlayCounts[artist] || 0) + 1;
      
      // Track play time
      artistPlayTime[artist] = (artistPlayTime[artist] || 0) + entry.ms_played;
    });
    
    // Calculate new artists discovered by month
    const artistsByMonth = {};
    Object.entries(firstListenDates).forEach(([artist, date]) => {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      artistsByMonth[monthKey] = (artistsByMonth[monthKey] || 0) + 1;
    });
    
    // Format for chart
    const monthKeys = Object.keys(artistsByMonth).sort();
    const newArtistsByMonth = monthKeys.map(month => {
      const [year, monthNum] = month.split('-');
      return {
        month: `${monthNum}/${year.slice(2)}`,
        count: artistsByMonth[month],
        fullLabel: `${new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' })} ${year}`
      };
    });
    
    // Calculate artist loyalty (top 5 vs others)
    const sortedArtists = Object.entries(artistPlayTime)
      .sort((a, b) => b[1] - a[1])
      .map(([name, time]) => ({ name, time }));
    
    const top5Artists = sortedArtists.slice(0, 5);
    const totalPlayTime = sortedArtists.reduce((sum, artist) => sum + artist.time, 0);
    const top5PlayTime = top5Artists.reduce((sum, artist) => sum + artist.time, 0);
    const top5Percentage = Math.round((top5PlayTime / totalPlayTime) * 100);
    
    // Format for loyalty pie chart - grey in minimal mode
    const otherPlayTime = totalPlayTime - top5PlayTime;
    const loyaltyData = [
      { name: 'Top 5 Artists', value: top5PlayTime, color: isColorful ? (isDarkMode ? '#4C1D95' : '#8884d8') : (isDarkMode ? '#6B7280' : '#9CA3AF') },
      { name: 'All Other Artists', value: otherPlayTime, color: isColorful ? (isDarkMode ? '#065F46' : '#82ca9d') : (isDarkMode ? '#374151' : '#D1D5DB') }
    ];

    return {
      firstListenDates,
      newArtistsByMonth,
      totalArtistsDiscovered: Object.keys(firstListenDates).length,
      loyaltyData,
      top5Artists,
      top5Percentage,
      uniqueArtistsCount: sortedArtists.length,
      artistPlayCounts
    };
  }, [filteredData, isDarkMode, isColorful, minPlayDuration, skipFilter, fullListenOnly]);
  
  // Analyze listening depth
  const depthData = useMemo(() => {
    // Group plays by artist and track
    const artistTracks = {};
    const trackPlays = {};
    
    // Get the earliest and latest dates for filtering
    const passesFilters = (entry) => {
      if (entry.ms_played < minPlayDuration) return false;
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) return false;
      if (fullListenOnly && entry.reason_end !== 'trackdone') return false;
      return true;
    };
    const filteredEntries = [...filteredData].filter(entry => passesFilters(entry));
    if (filteredEntries.length === 0) return { artistDepths: [], averageDepth: 0, replayValue: [] };
    
    // Process all tracks
    filteredEntries.forEach(entry => {
      const artist = entry.master_metadata_album_artist_name;
      const track = entry.master_metadata_track_name;
      if (!artist || !track) return;
      
      // Track unique songs per artist
      if (!artistTracks[artist]) {
        artistTracks[artist] = new Set();
      }
      artistTracks[artist].add(track);
      
      // Track plays per song
      const trackKey = `${artist} - ${track}`;
      trackPlays[trackKey] = (trackPlays[trackKey] || 0) + 1;
    });
    
    // Calculate depth for top 20 artists
    const artistPlayCounts = discoveryData.artistPlayCounts;
    const topArtists = Object.entries(artistPlayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name]) => name);
    
    const artistDepths = topArtists
      .filter(artist => artistTracks[artist])
      .map(artist => {
        const uniqueTracks = artistTracks[artist].size;
        return {
          name: artist,
          uniqueTracks,
          totalPlays: artistPlayCounts[artist],
          depthScore: uniqueTracks * 100 / Math.max(20, uniqueTracks * 1.5) // Normalized score out of 100
        };
      })
      .sort((a, b) => b.depthScore - a.depthScore);
    
    // Calculate average depth
    const totalDepth = artistDepths.reduce((sum, artist) => sum + artist.depthScore, 0);
    const averageDepth = Math.round(totalDepth / (artistDepths.length || 1));
    
    // Calculate replay value (most repeated tracks)
    const replayValue = Object.entries(trackPlays)
      .map(([track, plays]) => ({ track, plays }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);
    
    return {
      artistDepths,
      averageDepth,
      replayValue
    };
  }, [filteredData, discoveryData.artistPlayCounts, minPlayDuration, skipFilter, fullListenOnly]);
  
  // Analyze music variety
  const varietyData = useMemo(() => {
    // Calculate uniqueness ratio by timeframe
    const plays = {};
    const uniqueTracks = {};
    const timeframes = {};
    
    const passesFilters2 = (entry) => {
      if (entry.ms_played < minPlayDuration) return false;
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) return false;
      if (fullListenOnly && entry.reason_end !== 'trackdone') return false;
      return true;
    };
    filteredData.filter(entry => passesFilters2(entry)).forEach(entry => {
      if (!entry.master_metadata_track_name) return;
      
      const date = new Date(entry.ts);
      const dayKey = date.toISOString().split('T')[0];
      const weekKey = getWeekNumber(date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      // Daily stats
      if (!plays[dayKey]) {
        plays[dayKey] = 0;
        uniqueTracks[dayKey] = new Set();
        timeframes[dayKey] = 'day';
      }
      plays[dayKey]++;
      uniqueTracks[dayKey].add(`${entry.master_metadata_album_artist_name} - ${entry.master_metadata_track_name}`);
      
      // Weekly stats
      if (!plays[weekKey]) {
        plays[weekKey] = 0;
        uniqueTracks[weekKey] = new Set();
        timeframes[weekKey] = 'week';
      }
      plays[weekKey]++;
      uniqueTracks[weekKey].add(`${entry.master_metadata_album_artist_name} - ${entry.master_metadata_track_name}`);
      
      // Monthly stats
      if (!plays[monthKey]) {
        plays[monthKey] = 0;
        uniqueTracks[monthKey] = new Set();
        timeframes[monthKey] = 'month';
      }
      plays[monthKey]++;
      uniqueTracks[monthKey].add(`${entry.master_metadata_album_artist_name} - ${entry.master_metadata_track_name}`);
    });
    
    // Calculate variety scores
    const dailyVariety = Object.entries(uniqueTracks)
      .filter(([key]) => timeframes[key] === 'day' && plays[key] >= 5)
      .map(([key, tracks]) => ({
        timeframe: key,
        date: new Date(key),
        uniqueTracks: tracks.size,
        totalPlays: plays[key],
        varietyScore: (tracks.size / plays[key]) * 100
      }))
      .sort((a, b) => a.date - b.date);
    
    const weeklyVariety = Object.entries(uniqueTracks)
      .filter(([key]) => timeframes[key] === 'week' && plays[key] >= 10)
      .map(([key, tracks]) => {
        const [year, week] = key.split('-W');
        const weekStart = getDateOfISOWeek(parseInt(week), parseInt(year));
        return {
          timeframe: key,
          date: weekStart,
          label: `Week ${week}, ${year}`,
          uniqueTracks: tracks.size,
          totalPlays: plays[key],
          varietyScore: (tracks.size / plays[key]) * 100
        };
      })
      .sort((a, b) => a.date - b.date);
    
    const monthlyVariety = Object.entries(uniqueTracks)
      .filter(([key]) => timeframes[key] === 'month' && plays[key] >= 20)
      .map(([key, tracks]) => {
        const [year, month] = key.split('-');
        return {
          timeframe: key,
          date: new Date(parseInt(year), parseInt(month) - 1, 1),
          label: `${new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('default', { month: 'long' })} ${year}`,
          uniqueTracks: tracks.size,
          totalPlays: plays[key],
          varietyScore: (tracks.size / plays[key]) * 100
        };
      })
      .sort((a, b) => a.date - b.date);
    
    // Calculate averages
    const avgDailyVariety = dailyVariety.length > 0 ?
      dailyVariety.reduce((sum, day) => sum + day.varietyScore, 0) / dailyVariety.length : 0;
    
    const avgWeeklyVariety = weeklyVariety.length > 0 ?
      weeklyVariety.reduce((sum, week) => sum + week.varietyScore, 0) / weeklyVariety.length : 0;
    
    const avgMonthlyVariety = monthlyVariety.length > 0 ?
      monthlyVariety.reduce((sum, month) => sum + month.varietyScore, 0) / monthlyVariety.length : 0;
    
    return {
      dailyVariety: dailyVariety.slice(-30), // last 30 days with data
      weeklyVariety: weeklyVariety.slice(-12), // last 12 weeks with data
      monthlyVariety,
      avgDailyVariety,
      avgWeeklyVariety,
      avgMonthlyVariety
    };
  }, [filteredData, minPlayDuration, skipFilter, fullListenOnly]);
  
  // Helper function to get ISO week number
  function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }
  
  // Helper function to get date from ISO week number
  function getDateOfISOWeek(week, year) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const date = simple;
    date.setDate(simple.getDate() - simple.getDay() + 1);
    return date;
  }
  
  // Page title based on time range
  const getPageTitle = () => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return <span>Music Discovery <span className="text-xs opacity-75">{yearRange.startYear}-{yearRange.endYear}</span></span>;
    } else if (selectedYear !== 'all') {
      return <span>Music Discovery <span className="text-xs opacity-75">{selectedYear}</span></span>;
    }
    return <span>Music Discovery <span className="text-xs opacity-75">all-time</span></span>;
  };

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

  // Custom pie chart label renderer
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={getTextColor}
        style={{ fill: getTextColor }}
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize="11px"
        fontWeight="bold"
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  const TimeframeButton = ({ id, label }) => (
    <button
      onClick={() => setTimeframe(id)}
      className={`px-3 py-1 text-sm font-medium rounded-full ${
        timeframe === id ? modeColors.buttonActive : modeColors.buttonInactive
      }`}
    >
      {label}
    </button>
  );

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
          <TabButton id="discovery" label="Discovery" />
          <TabButton id="loyalty" label="Loyalty" />
          <TabButton id="depth" label="Depth" />
          <TabButton id="variety" label="Variety" />
        </div>
      </div>

      {/* Mobile controls - separate row */}
      <div className="block sm:hidden mb-2">
        <div className="flex flex-wrap gap-1">
          <TabButton id="discovery" label="Discovery" />
          <TabButton id="loyalty" label="Loyalty" />
          <TabButton id="depth" label="Depth" />
          <TabButton id="variety" label="Variety" />
        </div>
      </div>

      {activeTab === 'discovery' && (
        <div className="space-y-6">
          <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
            <h3 className={`text-sm sm:text-lg font-bold mb-4 ${modeColors.text}`}>Artist Discovery Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-3 rounded shadow border ${modeColors.bgCard} ${modeColors.border}`}>
                <div className={`text-sm ${modeColors.textLight}`}>Total Unique Artists</div>
                <div className={`text-3xl font-bold ${modeColors.text}`}>{discoveryData.uniqueArtistsCount}</div>
              </div>
              <div className={`p-3 rounded shadow border ${modeColors.bgCard} ${modeColors.border}`}>
                <div className={`text-sm ${modeColors.textLight}`}>Average New Artists per Month</div>
                <div className={`text-3xl font-bold ${modeColors.text}`}>
                  {discoveryData.newArtistsByMonth.length > 0 ?
                    Math.round(discoveryData.totalArtistsDiscovered / discoveryData.newArtistsByMonth.length) : 0
                  }
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Artist Discovery Rate</h3>
            <p className={`mb-4 ${modeColors.textLight}`}>New artists discovered over time</p>

            <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={discoveryData.newArtistsByMonth}
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    height={60}
                    stroke={isDarkMode ? '#9CA3AF' : '#374151'}
                  />
                  <YAxis stroke={isDarkMode ? '#9CA3AF' : '#374151'} />
                  <Tooltip 
                    formatter={(value) => [value, 'New Artists']}
                    labelFormatter={(value, payload) => payload[0]?.payload?.fullLabel || value}
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
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={isColorful ? (isDarkMode ? '#059669' : '#82ca9d') : (isDarkMode ? '#9CA3AF' : '#6B7280')}
                    name="New Artists Discovered"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
            <h3 className={`text-sm sm:text-lg font-bold ${modeColors.text}`}>Discovery Insights</h3>
            <ul className="mt-2 space-y-2">
              <li className={modeColors.textLight}>
                {discoveryData.newArtistsByMonth.length > 0 ? (
                  <>
                    Your peak discovery month was
                    <span className="font-bold">{' '}
                      {discoveryData.newArtistsByMonth.sort((a, b) => b.count - a.count)[0]?.fullLabel}
                    </span> when you discovered
                    <span className="font-bold">{' '}
                      {discoveryData.newArtistsByMonth.sort((a, b) => b.count - a.count)[0]?.count}
                    </span> new artists.
                  </>
                ) : 'No discovery data available.'}
              </li>
              {discoveryData.newArtistsByMonth.length > 6 && (
                <li className={modeColors.textLight}>
                  In the last 6 months, you've discovered
                  <span className="font-bold">{' '}
                    {discoveryData.newArtistsByMonth.slice(-6).reduce((sum, month) => sum + month.count, 0)}
                  </span> new artists.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'loyalty' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Artist Loyalty</h3>
              <p className={`mb-4 ${modeColors.textLight}`}>Your listening time distribution</p>

              <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={discoveryData.loyaltyData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                      label={renderCustomizedLabel}
                      stroke={getStrokeColor}
                      strokeWidth={2}
                    >
                      {discoveryData.loyaltyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatDuration(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={`text-sm text-center mt-2 ${modeColors.textLight}`}>
                Your top 5 artists account for {discoveryData.top5Percentage}% of your total listening time
              </div>
            </div>

            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Your Top 5 Artists</h3>
              <div className="space-y-3">
                {discoveryData.top5Artists.map((artist, index) => (
                  <div key={index} className={`p-3 rounded flex justify-between items-center border ${modeColors.bgCard} ${modeColors.border}`}>
                    <div>
                      <span className={`font-bold text-lg ${modeColors.text}`}>{index + 1}. {artist.name}</span>
                      <div className={`text-sm ${modeColors.textLight}`}>
                        {formatDuration(artist.time)} total listening time
                      </div>
                    </div>
                    <div className={`font-bold ${modeColors.textLight}`}>
                      {Math.round((artist.time / discoveryData.loyaltyData[0].value) * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Loyalty Profile</h3>
            <div className={modeColors.textLight}>
              {discoveryData.top5Percentage > 75 ? (
                <p>You're a <span className="font-bold">super fan</span>! You spend most of your time with your favorite artists.</p>
              ) : discoveryData.top5Percentage > 50 ? (
                <p>You're a <span className="font-bold">loyal listener</span>. You balance favorites with musical exploration.</p>
              ) : discoveryData.top5Percentage > 30 ? (
                <p>You're an <span className="font-bold">eclectic explorer</span>. You enjoy variety and discovering new music.</p>
              ) : (
                <p>You're a true <span className="font-bold">music adventurer</span>! You rarely stick to the same artists for long.</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'depth' && (
        <div className="space-y-6">
          <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
            <h3 className={`text-sm sm:text-lg font-bold mb-4 ${modeColors.text}`}>Artist Catalog Exploration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`p-3 rounded shadow border ${modeColors.bgCard} ${modeColors.border}`}>
                <div className={`text-sm ${modeColors.textLight}`}>Average Listening Depth Score</div>
                <div className={`text-3xl font-bold ${modeColors.text}`}>{depthData.averageDepth} / 100</div>
                <div className={`text-xs mt-1 ${modeColors.textLighter}`}>Higher scores indicate deeper exploration of artists' catalogs</div>
              </div>
              <div className={`p-3 rounded shadow border ${modeColors.bgCard} ${modeColors.border}`}>
                <div className={`text-sm ${modeColors.textLight}`}>Most Explored Artist</div>
                <div className={`text-3xl font-bold ${modeColors.text}`}>
                  {depthData.artistDepths[0]?.name || "N/A"}
                </div>
                <div className={`text-xs mt-1 ${modeColors.textLighter}`}>
                  {depthData.artistDepths[0] ?
                    `${depthData.artistDepths[0].uniqueTracks} unique tracks listened to` : ""}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Artist Catalog Depth</h3>
            <p className={`mb-4 ${modeColors.textLight}`}>How deeply you explore your favorite artists' music</p>

            <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={depthData.artistDepths.slice(0, 10)}
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      if (name === 'depthScore') return [`${value.toFixed(1)} / 100`, 'Depth Score'];
                      if (name === 'uniqueTracks') return [value, 'Unique Tracks'];
                      return [value, name];
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
                  <Bar name="Unique Tracks" dataKey="uniqueTracks" fill={isColorful ? (isDarkMode ? "#065F46" : "#82ca9d") : (isDarkMode ? "#9CA3AF" : "#6B7280")} />
                  <Bar name="Depth Score" dataKey="depthScore" fill={isColorful ? (isDarkMode ? "#4C1D95" : "#8884d8") : (isDarkMode ? "#6B7280" : "#9CA3AF")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Replay Value Kings</h3>
            <p className={`mb-4 ${modeColors.textLight}`}>Your most repeated tracks</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {depthData.replayValue.map((track, index) => (
                <div key={index} className={`p-3 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
                  <div className={`font-bold ${modeColors.text}`}>{index + 1}. {track.track}</div>
                  <div className={`text-sm ${modeColors.textLight}`}>
                    Played <span className="font-bold">{track.plays}</span> times
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'variety' && (
        <div className="space-y-6">
          <div className="flex justify-center gap-3 mb-4 overflow-x-auto pb-1">
            <TimeframeButton id="day" label="Daily" />
            <TimeframeButton id="week" label="Weekly" />
            <TimeframeButton id="month" label="Monthly" />
          </div>

          <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
            <h3 className={`text-sm sm:text-lg font-bold mb-4 ${modeColors.text}`}>Music Variety Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-3 rounded shadow border ${modeColors.bgCard} ${modeColors.border}`}>
                <div className={`text-sm ${modeColors.textLight}`}>Daily Variety Score</div>
                <div className={`text-3xl font-bold ${modeColors.text}`}>{Math.round(varietyData.avgDailyVariety)}%</div>
                <div className={`text-xs mt-1 ${modeColors.textLighter}`}>Average percentage of unique tracks in a day</div>
              </div>
              <div className={`p-3 rounded shadow border ${modeColors.bgCard} ${modeColors.border}`}>
                <div className={`text-sm ${modeColors.textLight}`}>Weekly Variety Score</div>
                <div className={`text-3xl font-bold ${modeColors.text}`}>{Math.round(varietyData.avgWeeklyVariety)}%</div>
                <div className={`text-xs mt-1 ${modeColors.textLighter}`}>Average percentage of unique tracks in a week</div>
              </div>
              <div className={`p-3 rounded shadow border ${modeColors.bgCard} ${modeColors.border}`}>
                <div className={`text-sm ${modeColors.textLight}`}>Monthly Variety Score</div>
                <div className={`text-3xl font-bold ${modeColors.text}`}>{Math.round(varietyData.avgMonthlyVariety)}%</div>
                <div className={`text-xs mt-1 ${modeColors.textLighter}`}>Average percentage of unique tracks in a month</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Music Variety Over Time</h3>
            <p className={`mb-4 ${modeColors.textLight}`}>
              Higher percentages indicate more unique tracks (less repetition)
            </p>

            <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={
                    timeframe === 'day' ? varietyData.dailyVariety :
                    timeframe === 'week' ? varietyData.weeklyVariety :
                    varietyData.monthlyVariety
                  }
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                  <XAxis 
                    dataKey={timeframe === 'month' ? 'label' : 'timeframe'} 
                    angle={-45} 
                    textAnchor="end" 
                    height={60}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Variety Score']}
                    labelFormatter={(value, payload) => {
                      if (timeframe === 'week' || timeframe === 'month') {
                        return payload[0]?.payload?.label || value;
                      }
                      return new Date(value).toLocaleDateString();
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
                  <Line
                    type="monotone"
                    dataKey="varietyScore"
                    stroke={isColorful ? (isDarkMode ? "#059669" : "#82ca9d") : (isDarkMode ? "#9CA3AF" : "#6B7280")}
                    name="Variety Score"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Variety Profile</h3>
            <div className={modeColors.textLight}>
              {Math.round(
                (varietyData.avgDailyVariety + varietyData.avgWeeklyVariety + varietyData.avgMonthlyVariety) / 3
              ) > 80 ? (
                <p>You're a <span className="font-bold">variety seeker</span>! You rarely repeat the same tracks and constantly explore new music.</p>
              ) : Math.round(
                (varietyData.avgDailyVariety + varietyData.avgWeeklyVariety + varietyData.avgMonthlyVariety) / 3
              ) > 60 ? (
                <p>You have <span className="font-bold">diverse taste</span> with a good balance between favorites and new discoveries.</p>
              ) : Math.round(
                (varietyData.avgDailyVariety + varietyData.avgWeeklyVariety + varietyData.avgMonthlyVariety) / 3
              ) > 40 ? (
                <p>You're a <span className="font-bold">balanced listener</span> who enjoys both familiar tracks and occasional new music.</p>
              ) : (
                <p>You're a <span className="font-bold">comfort listener</span> who sticks to favorite tracks and enjoys repeating them.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryAnalysis;