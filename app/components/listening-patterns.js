import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StreamingByYear from './streaming-by-year.js';
import TrackRankings from './TrackRankings.js';
import { useTheme } from './themeprovider.js'; // Import the theme hook

const WorldMap = dynamic(() => import('react-svg-worldmap').then(mod => mod.WorldMap ? { default: mod.WorldMap } : mod), { ssr: false });

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

// Removed exported variables to prevent conflicts with SpotifyAnalyzer state management

const ListeningPatterns = ({
  rawPlayData = [],
  formatDuration,
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  colorTheme = 'purple',
  textTheme = null,
  backgroundTheme = null,
  briefObsessions = [],
  songsByYear = {},
  colorMode = 'minimal',
  viewMode = 'grid',
  setViewMode = () => {}
}) => {
  const [activeTab, setActiveTab] = useState('timeOfDay');
  const [dayOfWeekViewMode, setDayOfWeekViewMode] = useState('plays');

  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Color system for colorful/minimal modes - colorful has contrast, minimal is flat
  const colors = isColorful ? {
    text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700',
    textLight: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
    textLighter: isDarkMode ? 'text-yellow-500' : 'text-yellow-500',
    bg: isDarkMode ? 'bg-yellow-900' : 'bg-yellow-200',
    bgLight: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100',
    bgCard: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100',
    bgCardAlt: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100',
    border: isDarkMode ? 'border-yellow-600' : 'border-yellow-300',
    buttonActive: isDarkMode ? 'bg-yellow-600 text-black' : 'bg-yellow-500 text-black',
    buttonInactive: isDarkMode ? 'bg-yellow-800 text-yellow-300 border border-yellow-600 hover:bg-yellow-700' : 'bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200',
    toggleBg: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100',
    toggleActive: isDarkMode ? 'bg-yellow-500 text-black' : 'bg-yellow-600 text-white',
    toggleInactive: isDarkMode ? 'text-yellow-300 hover:bg-yellow-700' : 'text-yellow-700 hover:bg-yellow-200',
    barColor: isDarkMode ? '#fde047' : '#a16207', // yellow-300 / yellow-700
    barColorAlt: isDarkMode ? '#facc15' : '#ca8a04', // yellow-400 / yellow-600
    gridColor: isDarkMode ? '#a16207' : '#ca8a04', // yellow-700 / yellow-600
  } : {
    text: isDarkMode ? 'text-white' : 'text-black',
    textLight: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    textLighter: isDarkMode ? 'text-gray-500' : 'text-gray-500',
    bg: isDarkMode ? 'bg-black' : 'bg-white',
    bgLight: isDarkMode ? 'bg-black' : 'bg-white',
    bgCard: isDarkMode ? 'bg-black' : 'bg-white',
    bgCardAlt: isDarkMode ? 'bg-black' : 'bg-white',
    border: isDarkMode ? 'border-white' : 'border-black',
    buttonActive: isDarkMode ? 'bg-white text-black' : 'bg-black text-white',
    buttonInactive: isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-900' : 'bg-white text-black border border-black hover:bg-gray-100',
    toggleBg: isDarkMode ? 'bg-black' : 'bg-white',
    toggleActive: isDarkMode ? 'bg-white text-black' : 'bg-black text-white',
    toggleInactive: isDarkMode ? 'text-white hover:bg-gray-900' : 'text-black hover:bg-gray-100',
    barColor: isDarkMode ? '#9CA3AF' : '#6B7280', // gray-400 / gray-500
    barColorAlt: isDarkMode ? '#6B7280' : '#9CA3AF', // gray-500 / gray-400
    gridColor: isDarkMode ? '#4B5563' : '#D1D5DB', // gray-600 / gray-300
  };

  // Color theme for legends - grey in minimal mode
  const getLegendTextColor = useMemo(() => {
    if (!isColorful) {
      return isDarkMode ? '#ffffff' : '#000000';
    }
    const color = isDarkMode ?
      (colorTheme === 'purple' ? '#C4B5FD' :
       colorTheme === 'indigo' ? '#A5B4FC' :
       colorTheme === 'green' ? '#86EFAC' :
       colorTheme === 'blue' ? '#93C5FD' :
       colorTheme === 'yellow' ? '#FDE047' : '#C4B5FD') :
      (colorTheme === 'purple' ? '#7C3AED' :
       colorTheme === 'indigo' ? '#3730A3' :
       colorTheme === 'green' ? '#14532D' :
       colorTheme === 'blue' ? '#1E40AF' :
       colorTheme === 'yellow' ? '#A16207' : '#7C3AED');

    return color;
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
        default: return '#d8b4fe';
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
        default: return '#6b21a8';
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
        default: return '#d8b4fe';
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
        default: return '#6b21a8';
      }
    }
  }, [colorTheme, isDarkMode, isColorful]);
  
  
  // Removed useEffect that updated exported variables (now handled by SpotifyAnalyzer state)
  
  // Chart colors that adjust with theme - grey in minimal mode
  const chartColors = useMemo(() => {
    // Grey shades for minimal mode
    const greyShades = isDarkMode
      ? ['#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB']
      : ['#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151'];

    return {
      // Time periods
      timePeriods: [
        { name: 'Morning', fullName: 'Morning (5-11)', count: 0, totalMs: 0,
          color: isColorful ? (isDarkMode ? '#059669' : '#8884d8') : greyShades[0],
          textColor: isColorful ? (isDarkMode ? '#8B5CF6' : '#8884d8') : (isDarkMode ? '#ffffff' : '#000000') },
        { name: 'Afternoon', fullName: 'Afternoon (12-16)', count: 0, totalMs: 0,
          color: isColorful ? (isDarkMode ? '#D97706' : '#82ca9d') : greyShades[1],
          textColor: isColorful ? (isDarkMode ? '#10B981' : '#82ca9d') : (isDarkMode ? '#ffffff' : '#000000') },
        { name: 'Evening', fullName: 'Evening (17-21)', count: 0, totalMs: 0,
          color: isColorful ? (isDarkMode ? '#DC2626' : '#ffc658') : greyShades[2],
          textColor: isColorful ? (isDarkMode ? '#F59E0B' : '#ffc658') : (isDarkMode ? '#ffffff' : '#000000') },
        { name: 'Night', fullName: 'Night (22-4)', count: 0, totalMs: 0,
          color: isColorful ? (isDarkMode ? '#1E40AF' : '#4B9CD3') : greyShades[3],
          textColor: isColorful ? (isDarkMode ? '#3B82F6' : '#4B9CD3') : (isDarkMode ? '#ffffff' : '#000000') }
      ],

      // Days of week
      dayColors: isColorful ? [
        isDarkMode ? '#DC2626' : '#FF8042', // Sun
        isDarkMode ? '#059669' : '#00C49F', // Mon
        isDarkMode ? '#D97706' : '#FFBB28', // Tue
        isDarkMode ? '#DC2626' : '#FF8042', // Wed
        isDarkMode ? '#2563EB' : '#0088FE', // Thu
        isDarkMode ? '#7C3AED' : '#8884d8', // Fri
        isDarkMode ? '#059669' : '#82ca9d'  // Sat
      ] : [
        greyShades[0], greyShades[1], greyShades[2], greyShades[3],
        greyShades[4], greyShades[0], greyShades[1]
      ],

      // Months/seasons
      seasonColors: isColorful ? {
        spring: isDarkMode ? '#059669' : '#82ca9d',
        summer: isDarkMode ? '#D97706' : '#ffc658',
        fall: isDarkMode ? '#DC2626' : '#FF8042',
        winter: isDarkMode ? '#1E40AF' : '#4B9CD3'
      } : {
        spring: greyShades[0],
        summer: greyShades[1],
        fall: greyShades[2],
        winter: greyShades[3]
      }
    };
  }, [isDarkMode, isColorful]);

  // Update the filteredData useMemo in ListeningPatterns.js
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
  
  // Time of day analysis
  const timeOfDayData = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({
      hour: i,
      count: 0,
      totalMs: 0,
      label: `${i}:00`,
      displayHour: i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`
    }));
    
    const hourlyData = [...hours];
    
    filteredData.forEach(entry => {
      if (entry.ms_played >= 30000) { // Only count plays of at least 30 seconds
        const date = new Date(entry.ts);
        const hour = date.getHours();
        
        hourlyData[hour].count += 1;
        hourlyData[hour].totalMs += entry.ms_played;
      }
    });
    
    // Group into time periods for better visualization
    // Use the chartColors timePeriods as the template
    const timePeriods = JSON.parse(JSON.stringify(chartColors.timePeriods));
    
    hourlyData.forEach((hour) => {
      if (hour.hour >= 5 && hour.hour <= 11) {
        timePeriods[0].count += hour.count;
        timePeriods[0].totalMs += hour.totalMs;
      } else if (hour.hour >= 12 && hour.hour <= 16) {
        timePeriods[1].count += hour.count;
        timePeriods[1].totalMs += hour.totalMs;
      } else if (hour.hour >= 17 && hour.hour <= 21) {
        timePeriods[2].count += hour.count;
        timePeriods[2].totalMs += hour.totalMs;
      } else {
        timePeriods[3].count += hour.count;
        timePeriods[3].totalMs += hour.totalMs;
      }
    });
    
    return { hourly: hourlyData, periods: timePeriods };
  }, [filteredData, chartColors.timePeriods]);

  const dayOfWeekData = useMemo(() => {
    const days = [
      { name: 'Sun', fullName: 'Sunday', dayNum: 0, count: 0, totalMs: 0, color: chartColors.dayColors[0] },
      { name: 'Mon', fullName: 'Monday', dayNum: 1, count: 0, totalMs: 0, color: chartColors.dayColors[1] },
      { name: 'Tue', fullName: 'Tuesday', dayNum: 2, count: 0, totalMs: 0, color: chartColors.dayColors[2] },
      { name: 'Wed', fullName: 'Wednesday', dayNum: 3, count: 0, totalMs: 0, color: chartColors.dayColors[3] },
      { name: 'Thu', fullName: 'Thursday', dayNum: 4, count: 0, totalMs: 0, color: chartColors.dayColors[4] },
      { name: 'Fri', fullName: 'Friday', dayNum: 5, count: 0, totalMs: 0, color: chartColors.dayColors[5] },
      { name: 'Sat', fullName: 'Saturday', dayNum: 6, count: 0, totalMs: 0, color: chartColors.dayColors[6] }
    ];
    
    filteredData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const day = date.getDay();
        
        days[day].count += 1;
        days[day].totalMs += entry.ms_played;
      }
    });
    
    // Calculate average time per day
    const totalDays = {};
    
    filteredData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const day = date.getDay();
        const dateString = date.toISOString().split('T')[0];
        
        if (!totalDays[day]) {
          totalDays[day] = new Set();
        }
        
        totalDays[day].add(dateString);
      }
    });
    
    days.forEach((day, index) => {
      const uniqueDayCount = totalDays[index] ? totalDays[index].size : 0;
      day.avgPerDay = uniqueDayCount > 0 ? day.count / uniqueDayCount : 0;
    });
    
    // Find the day with most listens (both by total and by average)
    const maxPlaysDay = [...days].sort((a, b) => b.count - a.count)[0];
    const maxAvgDay = [...days].sort((a, b) => b.avgPerDay - a.avgPerDay)[0];
    
    // Mark the top days with a star
    days.forEach(day => {
      day.isTopByCount = day.fullName === maxPlaysDay.fullName;
      day.isTopByAverage = day.fullName === maxAvgDay.fullName;
    });
    
    return days;
  }, [filteredData, chartColors.dayColors]);
  
  // Monthly/seasonal analysis
  const monthlyData = useMemo(() => {
    const months = [
      { name: 'Jan', fullName: 'January', monthNum: 0, count: 0, totalMs: 0, color: chartColors.seasonColors.winter },
      { name: 'Feb', fullName: 'February', monthNum: 1, count: 0, totalMs: 0, color: chartColors.seasonColors.winter },
      { name: 'Mar', fullName: 'March', monthNum: 2, count: 0, totalMs: 0, color: chartColors.seasonColors.spring },
      { name: 'Apr', fullName: 'April', monthNum: 3, count: 0, totalMs: 0, color: chartColors.seasonColors.spring },
      { name: 'May', fullName: 'May', monthNum: 4, count: 0, totalMs: 0, color: chartColors.seasonColors.spring },
      { name: 'Jun', fullName: 'June', monthNum: 5, count: 0, totalMs: 0, color: chartColors.seasonColors.summer },
      { name: 'Jul', fullName: 'July', monthNum: 6, count: 0, totalMs: 0, color: chartColors.seasonColors.summer },
      { name: 'Aug', fullName: 'August', monthNum: 7, count: 0, totalMs: 0, color: chartColors.seasonColors.summer },
      { name: 'Sep', fullName: 'September', monthNum: 8, count: 0, totalMs: 0, color: chartColors.seasonColors.fall },
      { name: 'Oct', fullName: 'October', monthNum: 9, count: 0, totalMs: 0, color: chartColors.seasonColors.fall },
      { name: 'Nov', fullName: 'November', monthNum: 10, count: 0, totalMs: 0, color: chartColors.seasonColors.fall },
      { name: 'Dec', fullName: 'December', monthNum: 11, count: 0, totalMs: 0, color: chartColors.seasonColors.winter }
    ];
    
    // Group months into seasons
    const seasons = [
      { name: 'Spring', fullName: 'Spring (Mar-May)', count: 0, totalMs: 0, color: chartColors.seasonColors.spring },
      { name: 'Summer', fullName: 'Summer (Jun-Aug)', count: 0, totalMs: 0, color: chartColors.seasonColors.summer },
      { name: 'Fall', fullName: 'Fall (Sep-Nov)', count: 0, totalMs: 0, color: chartColors.seasonColors.fall },
      { name: 'Winter', fullName: 'Winter (Dec-Feb)', count: 0, totalMs: 0, color: chartColors.seasonColors.winter }
    ];
    
    filteredData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const month = date.getMonth();
        
        months[month].count += 1;
        months[month].totalMs += entry.ms_played;
        
        // Add to seasons
        if (month >= 2 && month <= 4) {
          seasons[0].count += 1;
          seasons[0].totalMs += entry.ms_played;
        } else if (month >= 5 && month <= 7) {
          seasons[1].count += 1;
          seasons[1].totalMs += entry.ms_played;
        } else if (month >= 8 && month <= 10) {
          seasons[2].count += 1;
          seasons[2].totalMs += entry.ms_played;
        } else {
          seasons[3].count += 1;
          seasons[3].totalMs += entry.ms_played;
        }
      }
    });
    
    return { months, seasons };
  }, [filteredData, chartColors.seasonColors]);

  // Location data aggregation from conn_country
  const locationData = useMemo(() => {
    const countryMap = {};

    filteredData.forEach(entry => {
      if (entry.ms_played >= 30000 && entry.conn_country) {
        const code = entry.conn_country.toUpperCase();
        if (!countryMap[code]) {
          countryMap[code] = { country: code.toLowerCase(), plays: 0, totalMs: 0, artists: new Set(), songs: new Set() };
        }
        countryMap[code].plays += 1;
        countryMap[code].totalMs += entry.ms_played;
        if (entry.master_metadata_album_artist_name) countryMap[code].artists.add(entry.master_metadata_album_artist_name);
        if (entry.master_metadata_track_name) countryMap[code].songs.add(entry.master_metadata_track_name);
      }
    });

    const sorted = Object.entries(countryMap)
      .map(([code, d]) => ({
        country: d.country,
        code,
        name: (() => { try { return countryNames.of(code) || code; } catch { return code; } })(),
        value: d.plays,
        plays: d.plays,
        totalMs: d.totalMs,
        artists: d.artists.size,
        songs: d.songs.size,
      }))
      .sort((a, b) => b.plays - a.plays);

    return sorted;
  }, [filteredData]);

  // Custom pie chart label renderer - just show the percentage inside
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
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
        fontSize="10px"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded font-medium ${
        activeTab === id ? colors.buttonActive : colors.buttonInactive
      }`}
    >
      {label}
    </button>
  );

  // Function to get title based on year selection mode
  const getPageTitle = () => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return <span>Listening Patterns <span className="text-xs opacity-75">{yearRange.startYear}-{yearRange.endYear}</span></span>;
    } else if (selectedYear === 'all') {
      return <span>Listening Patterns <span className="text-xs opacity-75">all-time</span></span>;
    } else {
      return <span>Listening Patterns <span className="text-xs opacity-75">{selectedYear}</span></span>;
    }
  };

  return (
   <div className={`w-full ${colors.text}`}>
    {/* Title - mobile gets its own row */}
    <div className="hidden">
      <h3 className={`text-xl ${colors.text}`}>
        {getPageTitle()}
      </h3>
    </div>

    {/* Desktop layout - title and controls on same row */}
    <div className="hidden sm:flex justify-between items-center mb-2">
      <h3 className={`text-xl ${colors.text}`}>
        {getPageTitle()}
      </h3>
      <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
        <TabButton id="timeOfDay" label="Time of Day" />
        <TabButton id="dayOfWeek" label="Day of Week" />
        <TabButton id="seasonal" label="Seasonal" />
        <TabButton id="obsessions" label="Obsessions" />
        <TabButton id="streaming" label="Streaming" />
        <TabButton id="locations" label="Locations" />
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.bgDark} ${colors.bgDarkHover}`}
        >
          {viewMode === 'grid' ? '☰' : '▦'}
        </button>
      </div>
    </div>

    {/* Mobile controls - separate row */}
    <div className="block sm:hidden mb-4">
      <div className="flex flex-wrap gap-1">
        <TabButton id="timeOfDay" label="Time" />
        <TabButton id="dayOfWeek" label="Day" />
        <TabButton id="seasonal" label="Season" />
        <TabButton id="obsessions" label="Obsess" />
        <TabButton id="streaming" label="Stream" />
        <TabButton id="locations" label="Map" />
      </div>
    </div>

    {activeTab === 'timeOfDay' && (
      <div className="space-y-6">
        <div>
          <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
            colors.text
          }`}>Listening by Time of Day</h3>
          <p className={`mb-4 ${
            colors.textLight
          }`}>When do you listen to music the most?</p>
          
          <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 ${
            colors.bgCard
          }`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeOfDayData.hourly}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
                <XAxis 
                  dataKey="displayHour" 
                  stroke={isDarkMode ? '#9CA3AF' : '#374151'}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke={isDarkMode ? '#9CA3AF' : '#374151'}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    return name === 'totalMs' ? formatDuration(value) : value;
                  }}
                  labelFormatter={(value) => `Hour: ${value}`}
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1F2937' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                    color: isDarkMode ? '#ffffff' : '#000000'
                  }}
                />
                <Legend />
                <Bar name="Number of Plays" dataKey="count" fill={colors.barColor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="timeOfDay">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              colors.text
            }`}>Time Periods</h3>
            <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 ${
              colors.bgCard
            }`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeOfDayData.periods}
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
                    {timeOfDayData.periods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => value}
                    labelFormatter={(name) => {
                      const period = timeOfDayData.periods.find(p => p.name === name);
                      return period ? period.fullName : name;
                    }}
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
            </div>
          </div>
          
          <div className="flex flex-col justify-center">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              colors.text
            }`}>Time Period Stats</h3>
            <ul className="space-y-2">
              {timeOfDayData.periods.map((period, index) => (
                <li key={index} className={`p-2 rounded ${colors.bgCard} border ${colors.border}`}>
                  <span className="font-bold" style={{ color: period.textColor || period.color }}>{period.fullName}:</span>
                  <div className="ml-2" style={{ color: period.textColor || period.color }}>
                    <div>{period.count} plays</div>
                    <div>{formatDuration(period.totalMs)} listening time</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )}

    {activeTab === 'dayOfWeek' && (
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className={`text-sm sm:text-lg font-bold ${
                colors.text
              }`}>Listening by Day of Week</h3>
              <p className={`${
                colors.textLight
              }`}>Which days do you stream music the most?</p>
            </div>
            <div className={`flex rounded-lg p-1 ${colors.toggleBg}`}>
              <button
                onClick={() => setDayOfWeekViewMode('plays')}
                className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex-1 ${
                  dayOfWeekViewMode === 'plays' ? colors.toggleActive : colors.toggleInactive
                }`}
              >
                Total
              </button>
              <button
                onClick={() => setDayOfWeekViewMode('average')}
                className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex-1 ${
                  dayOfWeekViewMode === 'average' ? colors.toggleActive : colors.toggleInactive
                }`}
              >
                Average
              </button>
            </div>
          </div>
          
          <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 ${
            colors.bgCard
          }`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dayOfWeekData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  stroke={isDarkMode ? '#9CA3AF' : '#374151'}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'totalMs') return formatDuration(value);
                    if (name === 'count') return `${value} plays`;
                    if (name === 'avgPerDay') return `${value.toFixed(1)} plays per day`;
                    return value;
                  }}
                  labelFormatter={(label) => {
                    const day = dayOfWeekData.find(d => d.name === label);
                    return day ? day.fullName : label;
                  }}
                />
                <Legend />
                {dayOfWeekViewMode === 'plays' ? (
                  <Bar name="Number of Plays" dataKey="count" fill={colors.barColor} />
                ) : (
                  <Bar name="Average per Day" dataKey="avgPerDay" fill={colors.barColorAlt} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
            colors.text
          }`}>Day of Week Stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {dayOfWeekData.map((day, index) => (
              <div key={index} className={`p-3 rounded border relative ${colors.bgCardAlt}`} style={{ borderColor: day.color }}>
                {(dayOfWeekViewMode === 'plays' && day.isTopByCount) || 
                (dayOfWeekViewMode === 'average' && day.isTopByAverage) ? (
                  <div className="absolute -top-2 -right-2 text-yellow-500 text-2xl">★</div>
                ) : null}
                <h4 className={`font-bold ${
                  colors.text
                }`}>{day.fullName}</h4>
                <div className={`text-sm ${
                  colors.textLight
                }`}>
                  <div>Total Plays: {day.count}</div>
                  <div>Listening Time: {formatDuration(day.totalMs)}</div>
                  <div>Avg. Plays Per Day: {day.avgPerDay.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {activeTab === 'seasonal' && (
      <div className="space-y-6">
        <div>
          <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
            colors.text
          }`}>Listening by Month</h3>
          <p className={`mb-4 ${
            colors.textLight
          }`}>How does your listening change throughout the year?</p>
          
          <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 ${
            colors.bgCard
          }`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData.months}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.gridColor} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  stroke={isDarkMode ? '#9CA3AF' : '#374151'}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    return name === 'totalMs' ? formatDuration(value) : value;
                  }}
                  labelFormatter={(label) => {
                    const month = monthlyData.months.find(m => m.name === label);
                    return month ? month.fullName : label;
                  }}
                />
                <Legend />
                <Bar name="Number of Plays" dataKey="count" fill={colors.barColor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="seasonal">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              colors.text
            }`}>Seasonal Listening</h3>
            <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 ${
              colors.bgCard
            }`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={monthlyData.seasons}
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
                    {monthlyData.seasons.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => value}
                    labelFormatter={(name) => {
                      const season = monthlyData.seasons.find(s => s.name === name);
                      return season ? season.fullName : name;
                    }}
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
            </div>
          </div>
          
          <div className="flex flex-col justify-center">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              colors.text
            }`}>Seasonal Stats</h3>
            <ul className="space-y-2">
              {monthlyData.seasons.map((season, index) => (
                <li key={index} className={`p-2 rounded ${colors.bgCard} border ${colors.border}`}>
                  <span className="font-bold" style={{ color: season.color }}>{season.fullName}:</span>
                  <div className="ml-2" style={{ color: season.color }}>
                    <div>{season.count} plays</div>
                    <div>{formatDuration(season.totalMs)} listening time</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )}

    {activeTab === 'obsessions' && (
      <div className="space-y-6">
        <TrackRankings
          processedData={[]}
          briefObsessions={briefObsessions}
          songsByYear={songsByYear}
          formatDuration={formatDuration}
          initialYear={selectedYear}
          yearRange={yearRange}
          yearRangeMode={yearRangeMode}
          textTheme="yellow"
          backgroundTheme="yellow"
          colorMode={colorMode}
          viewMode={viewMode}
        />
      </div>
    )}

    {activeTab === 'streaming' && (
      <StreamingByYear
        rawPlayData={filteredData}
        formatDuration={formatDuration}
        isDarkMode={isDarkMode}
        textTheme="yellow"
        backgroundTheme="yellow"
        colorMode={colorMode}
      />
    )}

    {activeTab === 'locations' && (
      <div className="space-y-6">
        <div>
          <h3 className={`text-sm sm:text-lg font-bold mb-2 ${colors.text}`}>Listening Locations</h3>
          <p className={`mb-4 ${colors.textLight}`}>Countries where you've listened to Spotify</p>

          {locationData.length > 0 ? (
            <>
              <div className={`rounded p-2 sm:p-4 ${colors.bgCard} border ${colors.border} flex justify-center`}>
                <WorldMap
                  color={isColorful ? (isDarkMode ? '#fde047' : '#a16207') : (isDarkMode ? '#ffffff' : '#000000')}
                  valueSuffix=" plays"
                  size="responsive"
                  data={locationData}
                  backgroundColor={isColorful ? (isDarkMode ? '#854d0e' : '#fef9c3') : (isDarkMode ? '#000000' : '#ffffff')}
                  tooltipBgColor={isDarkMode ? '#1F2937' : '#ffffff'}
                  tooltipTextColor={isDarkMode ? '#ffffff' : '#000000'}
                  borderColor={isColorful ? (isDarkMode ? '#fde047' : '#a16207') : (isDarkMode ? '#ffffff' : '#000000')}
                  strokeOpacity={isColorful ? 0.6 : 0.3}
                />
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 mt-4">
                  {locationData.map((loc, index) => (
                    <div key={loc.code} className={`p-3 rounded border relative ${colors.bgCardAlt} ${colors.border}`}>
                      <div className={`absolute top-2 right-2 text-xs font-bold ${colors.textLighter}`}>#{index + 1}</div>
                      <h4 className={`font-bold ${colors.text}`}>{loc.name}</h4>
                      <div className={`text-sm ${colors.textLight}`}>
                        <div>{loc.plays.toLocaleString()} plays</div>
                        <div>{formatDuration(loc.totalMs)}</div>
                        <div>{loc.artists.toLocaleString()} artists</div>
                        <div>{loc.songs.toLocaleString()} songs</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`mt-4 overflow-x-auto rounded border ${colors.border}`}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${colors.bgCard} border-b ${colors.border}`}>
                        <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>#</th>
                        <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>Country</th>
                        <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Plays</th>
                        <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Time</th>
                        <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Artists</th>
                        <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Songs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locationData.map((loc, index) => (
                        <tr key={loc.code} className={`border-b ${colors.border} ${colors.bgCardAlt}`}>
                          <td className={`px-3 py-2 ${colors.textLighter}`}>{index + 1}</td>
                          <td className={`px-3 py-2 font-medium ${colors.text}`}>{loc.name}</td>
                          <td className={`px-3 py-2 text-right ${colors.textLight}`}>{loc.plays.toLocaleString()}</td>
                          <td className={`px-3 py-2 text-right ${colors.textLight}`}>{formatDuration(loc.totalMs)}</td>
                          <td className={`px-3 py-2 text-right ${colors.textLight}`}>{loc.artists.toLocaleString()}</td>
                          <td className={`px-3 py-2 text-right ${colors.textLight}`}>{loc.songs.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <p className={`${colors.textLight}`}>No location data available. The conn_country field was not found in your streaming data.</p>
          )}
        </div>
      </div>
    )}
  </div>
);
};

export default ListeningPatterns;