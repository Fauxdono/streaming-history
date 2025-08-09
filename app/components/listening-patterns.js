import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StreamingByYear from './streaming-by-year.js';
import { useTheme } from './themeprovider.js'; // Import the theme hook

// Export variables for SpotifyAnalyzer.js to use for dynamic tab names
export let selectedPatternYear = 'all';
export let yearPatternRange = { startYear: '', endYear: '' };
export let patternYearRangeMode = false;

const ListeningPatterns = ({ 
  rawPlayData = [], 
  formatDuration,
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false
}) => {
  const [activeTab, setActiveTab] = useState('timeOfDay');
  const [dayOfWeekViewMode, setDayOfWeekViewMode] = useState('plays');
  
  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Update exported variables when props change
  useEffect(() => {
    selectedPatternYear = selectedYear;
    yearPatternRange = yearRange;
    patternYearRangeMode = yearRangeMode;
  }, [selectedYear, yearRange, yearRangeMode]);
  
  // Chart colors that adjust with theme
  const chartColors = useMemo(() => {
    return {
      // Time periods
      timePeriods: [
        { name: 'Morning', fullName: 'Morning (5-11)', count: 0, totalMs: 0, 
          color: isDarkMode ? '#9a7ced' : '#8884d8' },
        { name: 'Afternoon', fullName: 'Afternoon (12-16)', count: 0, totalMs: 0, 
          color: isDarkMode ? '#82e3cf' : '#82ca9d' },
        { name: 'Evening', fullName: 'Evening (17-21)', count: 0, totalMs: 0, 
          color: isDarkMode ? '#ffdc94' : '#ffc658' },
        { name: 'Night', fullName: 'Night (22-4)', count: 0, totalMs: 0, 
          color: isDarkMode ? '#7bceff' : '#4B9CD3' }
      ],
      
      // Days of week
      dayColors: [
        isDarkMode ? '#ff9f73' : '#FF8042', // Sun
        isDarkMode ? '#5ce6be' : '#00C49F', // Mon
        isDarkMode ? '#ffe77e' : '#FFBB28', // Tue
        isDarkMode ? '#ff9f73' : '#FF8042', // Wed
        isDarkMode ? '#5cc0ff' : '#0088FE', // Thu
        isDarkMode ? '#b19cff' : '#8884d8', // Fri
        isDarkMode ? '#82e3cf' : '#82ca9d'  // Sat
      ],
      
      // Months/seasons
      seasonColors: {
        spring: isDarkMode ? '#82e3cf' : '#82ca9d',
        summer: isDarkMode ? '#ffdc94' : '#ffc658',
        fall: isDarkMode ? '#ff9f73' : '#FF8042',
        winter: isDarkMode ? '#7bceff' : '#4B9CD3'
      }
    };
  }, [isDarkMode]);

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

  // Custom pie chart label renderer - just show the percentage inside
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    // Adjust text color based on theme
    const textFill = isDarkMode ? "#ffffff" : "#ffffff";
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={textFill}
        textAnchor="middle" 
        dominantBaseline="central"
        fontSize="12px"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 whitespace-nowrap font-medium ${
        activeTab === id
          ? isDarkMode 
            ? 'bg-gray-700 text-purple-400 border-b-2 border-purple-400' 
            : 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
          : isDarkMode
            ? 'bg-gray-800 text-purple-400 hover:bg-gray-700'
            : 'bg-purple-200 text-purple-600 hover:bg-purple-300'
      }`}
    >
      {label}
    </button>
  );

  // Function to get title based on year selection mode
  const getPageTitle = () => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `Listening Patterns (${yearRange.startYear}-${yearRange.endYear})`;
    } else if (selectedYear === 'all') {
      return 'All-time Listening Patterns';
    } else {
      return `Listening Patterns for ${selectedYear}`;
    }
  };

  return (
   <div className="w-full">
    {/* Horizontally scrollable tabs */}
    <div className="relative border-b overflow-x-auto pb-1 -mx-4 px-4">
      <div className="flex min-w-max">
        <TabButton id="timeOfDay" label="Time of Day" />
        <TabButton id="dayOfWeek" label="Day of Week" />
        <TabButton id="seasonal" label="Seasonal" />
        <TabButton id="streaming" label="Streaming Services" />
      </div>
    </div>

    {activeTab === 'timeOfDay' && (
      <div className="space-y-6">
        <div>
          <h3 className={`text-lg font-bold mb-2 ${
            isDarkMode ? 'text-purple-300' : 'text-purple-700'
          }`}>Listening by Time of Day</h3>
          <p className={`mb-4 ${
            isDarkMode ? 'text-purple-400' : 'text-purple-600'
          }`}>When do you listen to music the most?</p>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeOfDayData.hourly}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="displayHour" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    return name === 'totalMs' ? formatDuration(value) : value;
                  }}
                  labelFormatter={(value) => `Hour: ${value}`}
                />
                <Legend />
                <Bar name="Number of Plays" dataKey="count" fill={isDarkMode ? "#9a7ced" : "#8884d8"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-bold text-purple-700 mb-2">Time Periods</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeOfDayData.periods}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={false}
                    label={renderCustomizedLabel}
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
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-bold text-purple-700 mb-2">Time Period Stats</h3>
            <ul className="space-y-2">
              {timeOfDayData.periods.map((period, index) => (
                <li key={index} className="p-2 bg-purple-50 rounded">
                  <span className="font-bold" style={{ color: period.color }}>{period.fullName}:</span>
                  <div className="ml-2 text-purple-400">
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
              <h3 className="text-lg font-bold text-purple-700">Listening by Day of Week</h3>
              <p className="text-purple-600">Which days do you stream music the most?</p>
            </div>
            <div className="flex bg-purple-100 rounded-full p-1">
              <button
                onClick={() => setDayOfWeekViewMode('plays')}
                className={`px-3 py-1 rounded-full text-sm ${
                  dayOfWeekViewMode === 'plays' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-purple-700 hover:bg-purple-200'
                }`}
              >
                Total Plays
              </button>
              <button
                onClick={() => setDayOfWeekViewMode('average')}
                className={`px-3 py-1 rounded-full text-sm ${
                  dayOfWeekViewMode === 'average' 
                    ? 'bg-purple-600 text-white' 
                    : 'text-purple-700 hover:bg-purple-200'
                }`}
              >
                Average per Day
              </button>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dayOfWeekData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
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
                  <Bar name="Number of Plays" dataKey="count" fill={isDarkMode ? "#9a7ced" : "#8884d8"} />
                ) : (
                  <Bar name="Average per Day" dataKey="avgPerDay" fill={isDarkMode ? "#82e3cf" : "#82ca9d"} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-purple-700 mb-2">Day of Week Stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {dayOfWeekData.map((day, index) => (
              <div key={index} className="p-3 bg-purple-50 rounded border border-purple-100 relative">
                {(dayOfWeekViewMode === 'plays' && day.isTopByCount) || 
                (dayOfWeekViewMode === 'average' && day.isTopByAverage) ? (
                  <div className="absolute -top-2 -right-2 text-yellow-500 text-2xl">★</div>
                ) : null}
                <h4 className="font-bold text-purple-700">{day.fullName}</h4>
                <div className="text-sm text-purple-600">
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
          <h3 className="text-lg font-bold text-purple-700 mb-2">Listening by Month</h3>
          <p className="text-purple-600 mb-4">How does your listening change throughout the year?</p>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData.months}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
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
                <Bar name="Number of Plays" dataKey="count" fill={isDarkMode ? "#9a7ced" : "#8884d8"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-bold text-purple-700 mb-2">Seasonal Listening</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={monthlyData.seasons}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={false}
                    label={renderCustomizedLabel}
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
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex flex-col justify-center">
            <h3 className="text-lg font-bold text-purple-700 mb-2">Seasonal Stats</h3>
            <ul className="space-y-2">
              {monthlyData.seasons.map((season, index) => (
                <li key={index} className="p-2 bg-purple-50 rounded">
                  <span className="font-bold" style={{ color: season.color }}>{season.fullName}:</span>
                  <div className="ml-2 text-purple-400">
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

    {activeTab === 'streaming' && (
      <StreamingByYear 
        rawPlayData={filteredData} 
        formatDuration={formatDuration} 
        isDarkMode={isDarkMode}
      />
    )}
  </div>
);
};

export default ListeningPatterns;