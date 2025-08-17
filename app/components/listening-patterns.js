import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StreamingByYear from './streaming-by-year.js';
import { useTheme } from './themeprovider.js'; // Import the theme hook

// Removed exported variables to prevent conflicts with SpotifyAnalyzer state management

const ListeningPatterns = ({ 
  rawPlayData = [], 
  formatDuration,
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  colorTheme = 'purple'
}) => {
  const [activeTab, setActiveTab] = useState('timeOfDay');
  const [dayOfWeekViewMode, setDayOfWeekViewMode] = useState('plays');
  
  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Color theme for legends (similar to year selector)
  const getLegendTextColor = useMemo(() => {
    const color = isDarkMode ? 
      (colorTheme === 'purple' ? '#C4B5FD' :
       colorTheme === 'indigo' ? '#A5B4FC' :
       colorTheme === 'green' ? '#86EFAC' :
       colorTheme === 'blue' ? '#93C5FD' : '#C4B5FD') :
      (colorTheme === 'purple' ? '#7C3AED' :
       colorTheme === 'indigo' ? '#3730A3' :
       colorTheme === 'green' ? '#14532D' :
       colorTheme === 'blue' ? '#1E40AF' : '#7C3AED');
    
    console.log('Legend color:', color, 'isDarkMode:', isDarkMode, 'colorTheme:', colorTheme);
    return color;
  }, [colorTheme, isDarkMode]);
  
  // Month names for calendar data
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Removed useEffect that updated exported variables (now handled by SpotifyAnalyzer state)
  
  // Chart colors that adjust with theme
  const chartColors = useMemo(() => {
    return {
      // Time periods
      timePeriods: [
        { name: 'Morning', fullName: 'Morning (5-11)', count: 0, totalMs: 0, 
          color: isDarkMode ? '#059669' : '#8884d8', // darker chart color like seasonal
          textColor: isDarkMode ? '#8B5CF6' : '#8884d8' }, // brighter text color
        { name: 'Afternoon', fullName: 'Afternoon (12-16)', count: 0, totalMs: 0, 
          color: isDarkMode ? '#D97706' : '#82ca9d', // darker chart color like seasonal
          textColor: isDarkMode ? '#10B981' : '#82ca9d' }, // brighter text color
        { name: 'Evening', fullName: 'Evening (17-21)', count: 0, totalMs: 0, 
          color: isDarkMode ? '#DC2626' : '#ffc658', // darker chart color like seasonal
          textColor: isDarkMode ? '#F59E0B' : '#ffc658' }, // brighter text color
        { name: 'Night', fullName: 'Night (22-4)', count: 0, totalMs: 0, 
          color: isDarkMode ? '#1E40AF' : '#4B9CD3', // darker chart color like seasonal
          textColor: isDarkMode ? '#3B82F6' : '#4B9CD3' } // brighter text color
      ],
      
      // Days of week
      dayColors: [
        isDarkMode ? '#DC2626' : '#FF8042', // Sun
        isDarkMode ? '#059669' : '#00C49F', // Mon
        isDarkMode ? '#D97706' : '#FFBB28', // Tue
        isDarkMode ? '#DC2626' : '#FF8042', // Wed
        isDarkMode ? '#2563EB' : '#0088FE', // Thu
        isDarkMode ? '#7C3AED' : '#8884d8', // Fri
        isDarkMode ? '#059669' : '#82ca9d'  // Sat
      ],
      
      // Months/seasons
      seasonColors: {
        spring: isDarkMode ? '#059669' : '#82ca9d',
        summer: isDarkMode ? '#D97706' : '#ffc658',
        fall: isDarkMode ? '#DC2626' : '#FF8042',
        winter: isDarkMode ? '#1E40AF' : '#4B9CD3'
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

  // Check if we're viewing a specific month (YYYY-MM format)
  const isMonthView = selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 2;
  
  // Daily data for when a specific month is selected
  const dailyCalendarData = useMemo(() => {
    if (!isMonthView) return [];
    
    const [year, month] = selectedYear.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    
    // Initialize array for each day of the month
    const daysData = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      date: `${year}-${month}-${(i + 1).toString().padStart(2, '0')}`,
      totalPlays: 0,
      totalTime: 0,
      topArtist: { name: '', playCount: 0, totalTime: 0 },
      topAlbum: { name: '', artist: '', playCount: 0, totalTime: 0 },
      firstListens: [], // New songs discovered this day
      uniqueArtists: new Set(),
      uniqueSongs: new Set()
    }));

    // Track artists and albums per day
    const dailyArtists = Array(daysInMonth).fill().map(() => new Map());
    const dailyAlbums = Array(daysInMonth).fill().map(() => new Map());
    const songFirstListens = new Map();

    filteredData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const dayIndex = date.getDate() - 1; // 0-based index
        
        if (dayIndex >= 0 && dayIndex < daysInMonth) {
          const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
          const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
          const songName = entry.master_metadata_track_name || 'Unknown Song';
          const songKey = `${songName}-${artistName}`;

          // Update daily totals
          daysData[dayIndex].totalPlays++;
          daysData[dayIndex].totalTime += entry.ms_played;
          daysData[dayIndex].uniqueArtists.add(artistName);
          daysData[dayIndex].uniqueSongs.add(songKey);

          // Track artists per day
          if (!dailyArtists[dayIndex].has(artistName)) {
            dailyArtists[dayIndex].set(artistName, { playCount: 0, totalTime: 0 });
          }
          const artistData = dailyArtists[dayIndex].get(artistName);
          artistData.playCount++;
          artistData.totalTime += entry.ms_played;

          // Track albums per day
          const albumKey = `${albumName}-${artistName}`;
          if (!dailyAlbums[dayIndex].has(albumKey)) {
            dailyAlbums[dayIndex].set(albumKey, { name: albumName, artist: artistName, playCount: 0, totalTime: 0 });
          }
          const albumData = dailyAlbums[dayIndex].get(albumKey);
          albumData.playCount++;
          albumData.totalTime += entry.ms_played;

          // Track first listens for this day
          if (!songFirstListens.has(songKey)) {
            songFirstListens.set(songKey, {
              song: songName,
              artist: artistName,
              album: albumName,
              firstHeard: date,
              day: dayIndex
            });
          } else {
            const existing = songFirstListens.get(songKey);
            if (date < existing.firstHeard) {
              existing.firstHeard = date;
              existing.day = dayIndex;
            }
          }
        }
      }
    });

    // Process the data to find top items for each day
    daysData.forEach((dayData, dayIndex) => {
      // Find top artist for this day
      let topArtist = { name: '', playCount: 0, totalTime: 0 };
      dailyArtists[dayIndex].forEach((data, artistName) => {
        if (data.playCount > topArtist.playCount) {
          topArtist = { name: artistName, playCount: data.playCount, totalTime: data.totalTime };
        }
      });
      dayData.topArtist = topArtist;

      // Find top album for this day
      let topAlbum = { name: '', artist: '', playCount: 0, totalTime: 0 };
      dailyAlbums[dayIndex].forEach((data, albumKey) => {
        if (data.playCount > topAlbum.playCount) {
          topAlbum = data;
        }
      });
      dayData.topAlbum = topAlbum;

      // Get first listens for this day
      const dayFirstListens = [];
      songFirstListens.forEach((data, songKey) => {
        if (data.day === dayIndex) {
          dayFirstListens.push(data);
        }
      });
      
      dayFirstListens.sort((a, b) => a.firstHeard - b.firstHeard);
      dayData.firstListens = dayFirstListens.slice(0, 3);

      // Convert Sets to counts
      dayData.uniqueArtistCount = dayData.uniqueArtists.size;
      dayData.uniqueSongCount = dayData.uniqueSongs.size;
      delete dayData.uniqueArtists;
      delete dayData.uniqueSongs;
    });

    return daysData;
  }, [filteredData, selectedYear, isMonthView]);

  // Calendar view data - monthly insights with top artist, album, and first listens
  const calendarData = useMemo(() => {
    if (isMonthView) return []; // Don't compute monthly data if we're in daily view
    
    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: monthNamesShort[i],
      fullName: ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'][i],
      totalPlays: 0,
      totalTime: 0,
      topArtist: { name: '', playCount: 0, totalTime: 0 },
      topAlbum: { name: '', artist: '', playCount: 0, totalTime: 0 },
      firstListens: [], // New songs discovered this month
      uniqueArtists: new Set(),
      uniqueSongs: new Set()
    }));

    // Track artists and albums per month
    const monthlyArtists = Array(12).fill().map(() => new Map());
    const monthlyAlbums = Array(12).fill().map(() => new Map());
    const songFirstListens = new Map(); // Track when each song was first heard

    filteredData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const month = date.getMonth(); // 0-based
        const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
        const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
        const songName = entry.master_metadata_track_name || 'Unknown Song';
        const songKey = `${songName}-${artistName}`;

        // Update monthly totals
        monthsData[month].totalPlays++;
        monthsData[month].totalTime += entry.ms_played;
        monthsData[month].uniqueArtists.add(artistName);
        monthsData[month].uniqueSongs.add(songKey);

        // Track artists per month
        if (!monthlyArtists[month].has(artistName)) {
          monthlyArtists[month].set(artistName, { playCount: 0, totalTime: 0 });
        }
        const artistData = monthlyArtists[month].get(artistName);
        artistData.playCount++;
        artistData.totalTime += entry.ms_played;

        // Track albums per month
        const albumKey = `${albumName}-${artistName}`;
        if (!monthlyAlbums[month].has(albumKey)) {
          monthlyAlbums[month].set(albumKey, { name: albumName, artist: artistName, playCount: 0, totalTime: 0 });
        }
        const albumData = monthlyAlbums[month].get(albumKey);
        albumData.playCount++;
        albumData.totalTime += entry.ms_played;

        // Track first listens
        if (!songFirstListens.has(songKey)) {
          songFirstListens.set(songKey, {
            song: songName,
            artist: artistName,
            album: albumName,
            firstHeard: date,
            month: month
          });
        } else {
          // Update if this is earlier
          const existing = songFirstListens.get(songKey);
          if (date < existing.firstHeard) {
            existing.firstHeard = date;
            existing.month = month;
          }
        }
      }
    });

    // Process the data to find top items and first listens for each month
    monthsData.forEach((monthData, index) => {
      // Find top artist for this month
      let topArtist = { name: '', playCount: 0, totalTime: 0 };
      monthlyArtists[index].forEach((data, artistName) => {
        if (data.playCount > topArtist.playCount) {
          topArtist = { name: artistName, playCount: data.playCount, totalTime: data.totalTime };
        }
      });
      monthData.topArtist = topArtist;

      // Find top album for this month
      let topAlbum = { name: '', artist: '', playCount: 0, totalTime: 0 };
      monthlyAlbums[index].forEach((data, albumKey) => {
        if (data.playCount > topAlbum.playCount) {
          topAlbum = data;
        }
      });
      monthData.topAlbum = topAlbum;

      // Get first listens for this month (songs first heard in this month)
      const monthFirstListens = [];
      songFirstListens.forEach((data, songKey) => {
        if (data.month === index) {
          monthFirstListens.push(data);
        }
      });
      
      // Sort by first heard date and limit to top 5
      monthFirstListens.sort((a, b) => a.firstHeard - b.firstHeard);
      monthData.firstListens = monthFirstListens.slice(0, 5);

      // Convert Sets to counts
      monthData.uniqueArtistCount = monthData.uniqueArtists.size;
      monthData.uniqueSongCount = monthData.uniqueSongs.size;
      delete monthData.uniqueArtists;
      delete monthData.uniqueSongs;
    });

    return monthsData;
  }, [filteredData]);

  // Custom pie chart label renderer - just show the percentage inside
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    // Use white text for contrast against colored pie slices
    const textFill = "#ffffff";
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={textFill}
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
      className={`px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm rounded font-medium flex-1 sm:flex-none ${
        activeTab === id
          ? isDarkMode 
            ? 'bg-gray-700 text-purple-400 border border-purple-400' 
            : 'bg-purple-600 text-white border border-purple-600'
          : isDarkMode
            ? 'bg-gray-800 text-purple-400 hover:bg-gray-700 border border-gray-600'
            : 'bg-purple-200 text-purple-600 hover:bg-purple-300 border border-purple-300'
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
   <div className={`w-full ${isDarkMode ? 'text-purple-200' : 'text-gray-900'}`}>
    {/* Mobile-friendly tabs */}
    <div className="mb-4">
      <div className="flex flex-wrap gap-1 sm:gap-2">
        <TabButton id="timeOfDay" label="Time of Day" />
        <TabButton id="dayOfWeek" label="Day of Week" />
        <TabButton id="seasonal" label="Seasonal" />
        <TabButton id="streaming" label="Streaming" />
        <TabButton id="calendar" label="Calendar" />
      </div>
    </div>

    {activeTab === 'timeOfDay' && (
      <div className="space-y-6">
        <div>
          <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
            isDarkMode ? 'text-purple-300' : 'text-purple-700'
          }`}>Listening by Time of Day</h3>
          <p className={`mb-4 ${
            isDarkMode ? 'text-purple-400' : 'text-purple-600'
          }`}>When do you listen to music the most?</p>
          
          <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeOfDayData.hourly}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
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
                <Bar name="Number of Plays" dataKey="count" fill={isDarkMode ? "#4C1D95" : "#8884d8"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="timeOfDay">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              isDarkMode ? 'text-purple-300' : 'text-purple-700'
            }`}>Time Periods</h3>
            <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
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
              isDarkMode ? 'text-purple-300' : 'text-purple-700'
            }`}>Time Period Stats</h3>
            <ul className="space-y-2">
              {timeOfDayData.periods.map((period, index) => (
                <li key={index} className={`p-2 rounded ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-purple-50'
                }`}>
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
                isDarkMode ? 'text-purple-300' : 'text-purple-700'
              }`}>Listening by Day of Week</h3>
              <p className={`${
                isDarkMode ? 'text-purple-400' : 'text-purple-600'
              }`}>Which days do you stream music the most?</p>
            </div>
            <div className={`flex rounded-lg p-1 ${isDarkMode ? 'bg-gray-700' : 'bg-purple-100'}`}>
              <button
                onClick={() => setDayOfWeekViewMode('plays')}
                className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex-1 ${
                  dayOfWeekViewMode === 'plays' 
                    ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white'
                    : isDarkMode ? 'text-purple-300 hover:bg-gray-600' : 'text-purple-700 hover:bg-purple-200'
                }`}
              >
                Total
              </button>
              <button
                onClick={() => setDayOfWeekViewMode('average')}
                className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm flex-1 ${
                  dayOfWeekViewMode === 'average' 
                    ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white'
                    : isDarkMode ? 'text-purple-300 hover:bg-gray-600' : 'text-purple-700 hover:bg-purple-200'
                }`}
              >
                Average
              </button>
            </div>
          </div>
          
          <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dayOfWeekData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
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
                  <Bar name="Number of Plays" dataKey="count" fill={isDarkMode ? "#4C1D95" : "#8884d8"} />
                ) : (
                  <Bar name="Average per Day" dataKey="avgPerDay" fill={isDarkMode ? "#059669" : "#82ca9d"} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
            isDarkMode ? 'text-purple-300' : 'text-purple-700'
          }`}>Day of Week Stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {dayOfWeekData.map((day, index) => (
              <div key={index} className={`p-3 rounded border relative ${
                isDarkMode ? 'bg-gray-800' : 'bg-purple-50'
              }`} style={{ borderColor: day.color }}>
                {(dayOfWeekViewMode === 'plays' && day.isTopByCount) || 
                (dayOfWeekViewMode === 'average' && day.isTopByAverage) ? (
                  <div className="absolute -top-2 -right-2 text-yellow-500 text-2xl">★</div>
                ) : null}
                <h4 className={`font-bold ${
                  isDarkMode ? 'text-purple-300' : 'text-purple-700'
                }`}>{day.fullName}</h4>
                <div className={`text-sm ${
                  isDarkMode ? 'text-purple-400' : 'text-purple-600'
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
            isDarkMode ? 'text-purple-300' : 'text-purple-700'
          }`}>Listening by Month</h3>
          <p className={`mb-4 ${
            isDarkMode ? 'text-purple-400' : 'text-purple-600'
          }`}>How does your listening change throughout the year?</p>
          
          <div className={`h-48 sm:h-64 w-full rounded p-1 sm:p-2 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData.months}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
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
                <Bar name="Number of Plays" dataKey="count" fill={isDarkMode ? "#4C1D95" : "#8884d8"} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="seasonal">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              isDarkMode ? 'text-purple-300' : 'text-purple-700'
            }`}>Seasonal Listening</h3>
            <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
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
              isDarkMode ? 'text-purple-300' : 'text-purple-700'
            }`}>Seasonal Stats</h3>
            <ul className="space-y-2">
              {monthlyData.seasons.map((season, index) => (
                <li key={index} className={`p-2 rounded ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-purple-50'
                }`}>
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

    {activeTab === 'calendar' && (
      <div className="space-y-6">
        <div>
          {/* Dynamic header based on view mode */}
          <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
            isDarkMode ? 'text-purple-300' : 'text-purple-700'
          }`}>
            {isMonthView ? 
              `Daily Calendar - ${selectedYear.split('-')[1]}/${selectedYear.split('-')[0]}` : 
              'Yearly Calendar Overview'}
          </h3>
          <p className={`mb-4 ${
            isDarkMode ? 'text-purple-400' : 'text-purple-600'
          }`}>
            {isMonthView ? 
              'Daily breakdown showing your top artist, album, and new discoveries for each day' :
              'Monthly insights showing your top artist, album, and new discoveries for each month'}
          </p>
          
          {/* Monthly View */}
          {!isMonthView && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {calendarData.map((monthData, index) => (
                <div key={index} className={`p-3 rounded shadow-sm border-2 transition-colors relative ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                    : 'bg-white border-purple-200 hover:border-purple-400'
                }`}>
                  
                  <div className={`text-sm ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-500'
                  }`}>
                    Total Plays: <span className="font-bold">{monthData.totalPlays}</span>
                    <br/>
                    Songs: <span className="font-bold">{monthData.uniqueSongCount}</span>
                    <br/>
                    Artists: <span className="font-bold">{monthData.uniqueArtistCount}</span>
                    <br/>
                    {monthData.topArtist.name && (
                      <>
                        Top Artist: <span className="font-bold">{monthData.topArtist.name}</span>
                        <br/>
                        <span className="text-xs">({monthData.topArtist.playCount} plays)</span>
                        <br/>
                      </>
                    )}
                    {monthData.topAlbum.name && (
                      <>
                        Top Album: <span className="font-bold">{monthData.topAlbum.name}</span>
                        <br/>
                        <span className="text-xs">by {monthData.topAlbum.artist}</span>
                        <br/>
                      </>
                    )}
                    {monthData.firstListens.length > 0 && (
                      <>
                        New Songs: <span className="font-bold">{monthData.firstListens.length}</span>
                        <br/>
                        <span className="text-xs">First: {monthData.firstListens[0].song}</span>
                      </>
                    )}
                  </div>
                  
                  <div className={`absolute top-2 right-3 text-sm font-bold ${
                    isDarkMode ? 'text-purple-500' : 'text-purple-300'
                  }`}>{monthData.fullName}</div>
                </div>
              ))}
            </div>
          )}
          
          {/* Daily View */}
          {isMonthView && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {dailyCalendarData.map((dayData, index) => (
                <div key={index} className={`p-3 rounded shadow-sm border-2 transition-colors relative ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-600' 
                    : 'bg-white border-purple-200 hover:border-purple-400'
                }`}>
                  
                  <div className={`text-sm ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-500'
                  }`}>
                    Total Plays: <span className="font-bold">{dayData.totalPlays}</span>
                    <br/>
                    Songs: <span className="font-bold">{dayData.uniqueSongCount}</span>
                    <br/>
                    Artists: <span className="font-bold">{dayData.uniqueArtistCount}</span>
                    <br/>
                    {dayData.topArtist.name && (
                      <>
                        Top Artist: <span className="font-bold">{dayData.topArtist.name}</span>
                        <br/>
                        <span className="text-xs">({dayData.topArtist.playCount} plays)</span>
                        <br/>
                      </>
                    )}
                    {dayData.topAlbum.name && (
                      <>
                        Top Album: <span className="font-bold">{dayData.topAlbum.name}</span>
                        <br/>
                        <span className="text-xs">by {dayData.topAlbum.artist}</span>
                        <br/>
                      </>
                    )}
                    {dayData.firstListens.length > 0 && (
                      <>
                        New Songs: <span className="font-bold">{dayData.firstListens.length}</span>
                        <br/>
                        <span className="text-xs">First: {dayData.firstListens[0].song}</span>
                      </>
                    )}
                  </div>
                  
                  <div className={`absolute top-2 right-3 text-lg font-bold ${
                    isDarkMode ? 'text-purple-500' : 'text-purple-300'
                  }`}>{selectedYear.split('-')[1].padStart(2, '0') === '01' ? 'Jan' : 
                      selectedYear.split('-')[1].padStart(2, '0') === '02' ? 'Feb' :
                      selectedYear.split('-')[1].padStart(2, '0') === '03' ? 'Mar' :
                      selectedYear.split('-')[1].padStart(2, '0') === '04' ? 'Apr' :
                      selectedYear.split('-')[1].padStart(2, '0') === '05' ? 'May' :
                      selectedYear.split('-')[1].padStart(2, '0') === '06' ? 'Jun' :
                      selectedYear.split('-')[1].padStart(2, '0') === '07' ? 'Jul' :
                      selectedYear.split('-')[1].padStart(2, '0') === '08' ? 'Aug' :
                      selectedYear.split('-')[1].padStart(2, '0') === '09' ? 'Sep' :
                      selectedYear.split('-')[1].padStart(2, '0') === '10' ? 'Oct' :
                      selectedYear.split('-')[1].padStart(2, '0') === '11' ? 'Nov' : 'Dec'} {dayData.day}</div>
                </div>
              ))}
            </div>
          )}
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