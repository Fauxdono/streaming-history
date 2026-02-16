import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from './themeprovider.js';

const CalendarView = ({
  rawPlayData = [],
  formatDuration,
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  colorTheme = 'blue',
  textTheme = null,
  backgroundTheme = null,
  onYearChange, // Add callback to update selected year
  colorMode = 'minimal',
  viewMode = 'grid',
  setViewMode = () => {}
}) => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [daySelectionMode, setDaySelectionMode] = useState(false);

  // Get the current theme
  const { theme, minPlayDuration, skipFilter, fullListenOnly } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Color system for colorful/minimal modes - colorful has contrast, minimal is flat (Green theme)
  const modeColors = isColorful ? {
    text: isDarkMode ? 'text-green-300' : 'text-green-700',
    textLight: isDarkMode ? 'text-green-400' : 'text-green-600',
    textLighter: isDarkMode ? 'text-green-500' : 'text-green-500',
    bg: isDarkMode ? 'bg-green-900' : 'bg-green-200',
    bgLight: isDarkMode ? 'bg-green-800' : 'bg-green-100',
    bgCard: isDarkMode ? 'bg-green-800' : 'bg-green-100',
    bgCardAlt: isDarkMode ? 'bg-green-800' : 'bg-green-100',
    border: isDarkMode ? 'border-green-600' : 'border-green-300',
    borderLight: isDarkMode ? 'border-green-600' : 'border-green-300',
    buttonActive: isDarkMode ? 'bg-green-600 text-black' : 'bg-green-500 text-black',
    buttonInactive: isDarkMode ? 'bg-green-800 text-green-300 border border-green-600 hover:bg-green-700' : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200',
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

  // Flexible theming system - uses textTheme and backgroundTheme when available
  const getThemedColors = () => {
    if (textTheme && backgroundTheme) {
      const textColors = {
        indigo: {
          primary: isDarkMode ? 'indigo-300' : 'indigo-700',
          primaryLight: isDarkMode ? 'indigo-400' : 'indigo-600', 
          primaryLighter: isDarkMode ? 'indigo-500' : 'indigo-500',
          primaryDark: isDarkMode ? 'indigo-200' : 'indigo-800',
          textDark: isDarkMode ? 'indigo-200' : 'indigo-800',
          textLight: isDarkMode ? 'indigo-300' : 'indigo-700',
          textLighter: isDarkMode ? 'indigo-400' : 'indigo-600',
          textVeryLight: isDarkMode ? 'indigo-500' : 'indigo-500'
        },
        blue: {
          primary: isDarkMode ? 'blue-300' : 'blue-700',
          primaryLight: isDarkMode ? 'blue-400' : 'blue-600',
          primaryLighter: isDarkMode ? 'blue-500' : 'blue-500',
          primaryDark: isDarkMode ? 'blue-200' : 'blue-800',
          textDark: isDarkMode ? 'blue-200' : 'blue-800',
          textLight: isDarkMode ? 'blue-300' : 'blue-700',
          textLighter: isDarkMode ? 'blue-400' : 'blue-600',
          textVeryLight: isDarkMode ? 'blue-500' : 'blue-500'
        },
        red: {
          primary: isDarkMode ? 'red-500' : 'red-600',
          primaryLight: isDarkMode ? 'red-500' : 'red-500',
          primaryLighter: isDarkMode ? 'red-600' : 'red-500',
          primaryDark: isDarkMode ? 'red-500' : 'red-700',
          textDark: isDarkMode ? 'red-500' : 'red-700',
          textLight: isDarkMode ? 'red-500' : 'red-600',
          textLighter: isDarkMode ? 'red-500' : 'red-500',
          textVeryLight: isDarkMode ? 'red-500' : 'red-500'
        }
      };

      const backgroundColors = {
        green: {
          bg: 'green-600',
          bgLight: isDarkMode ? 'green-800' : 'green-200',
          bgMed: isDarkMode ? 'green-700' : 'green-300',
          border: isDarkMode ? 'border-green-600' : 'border-green-200',
          borderMed: isDarkMode ? 'border-green-500' : 'border-green-300',
          borderDark: isDarkMode ? 'border-green-400' : 'border-green-400',
          borderStrong: isDarkMode ? 'border-green-300' : 'border-green-600',
          hoverBg: isDarkMode ? 'green-700' : 'green-300'
        },
        indigo: {
          bg: 'indigo-600',
          bgLight: isDarkMode ? 'indigo-800' : 'indigo-200',
          bgMed: isDarkMode ? 'indigo-700' : 'indigo-300',
          border: isDarkMode ? 'border-indigo-600' : 'border-indigo-200',
          borderMed: isDarkMode ? 'border-indigo-500' : 'border-indigo-300',
          borderDark: isDarkMode ? 'border-indigo-400' : 'border-indigo-400',
          borderStrong: isDarkMode ? 'border-indigo-300' : 'border-indigo-600',
          hoverBg: isDarkMode ? 'indigo-700' : 'indigo-300'
        }
      };

      const textColorObj = textColors[textTheme] || textColors.blue;
      const backgroundColorObj = backgroundColors[backgroundTheme] || backgroundColors.green;
      
      return { ...textColorObj, ...backgroundColorObj };
    }
    
    // Fallback to old system
    return getColors(colorTheme);
  };

  // Legacy color system for backward compatibility
  const getColors = (colorTheme) => {
    switch (colorTheme) {
      case 'green':
        return {
          primary: 'green-700',
          primaryLight: 'green-600',
          primaryLighter: 'green-500',
          primaryDark: 'green-400',
          bg: 'green-600',
          bgLight: 'green-200',
          bgMed: 'green-300',
          border: 'green-200',
          borderMed: 'green-300',
          borderDark: 'green-400',
          borderStrong: 'green-600',
          hoverBg: 'green-300',
          textDark: 'green-200',
          textLight: 'green-300',
          textLighter: 'green-400',
          textVeryLight: 'green-500'
        };
      case 'blue':
      default:
        return {
          primary: 'blue-700',
          primaryLight: 'blue-600',
          primaryLighter: 'blue-500',
          primaryDark: 'blue-400',
          bg: 'blue-600',
          bgLight: 'blue-200',
          bgMed: 'blue-300',
          border: 'blue-200',
          borderMed: 'blue-300',
          borderDark: 'blue-400',
          borderStrong: 'blue-600',
          hoverBg: 'blue-300',
          textDark: 'blue-200',
          textLight: 'blue-300',
          textLighter: 'blue-400',
          textVeryLight: 'blue-500'
        };
    }
  };

  const colors = getThemedColors();
  
  // Month names constants
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Filtered data based on year selection
  const filteredData = useMemo(() => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      // Year range mode
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
  
  // Check if we're viewing a specific month (YYYY-MM format)
  const isMonthView = selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 2;
  
  // Listening history data for daily history tab
  const historyData = useMemo(() => {
    if (activeTab !== 'history') {
      return { tracks: [], totalTracks: 0, totalListeningTime: 0, uniqueTracks: 0, uniqueArtists: 0, sessions: 0, formattedDate: 'No date selected' };
    }
    
    // Only show data when a specific date is selected (YYYY-MM-DD format)
    if (!selectedYear || !selectedYear.includes('-') || selectedYear.split('-').length !== 3) {
      return { tracks: [], totalTracks: 0, totalListeningTime: 0, uniqueTracks: 0, uniqueArtists: 0, sessions: 0, formattedDate: 'No date selected' };
    }
    
    const dateToUse = selectedYear;
    const selectedDateObj = new Date(dateToUse);
    const nextDay = new Date(selectedDateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    // Filter tracks for the selected date
    const dayTracks = filteredData
      .filter(entry => {
        const trackDate = new Date(entry.ts);
        return trackDate >= selectedDateObj && trackDate < nextDay;
      })
      .sort((a, b) => new Date(a.ts) - new Date(b.ts)) // Chronological order
      .map(entry => ({
        ...entry,
        formattedTime: new Date(entry.ts).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }),
        formattedDuration: formatDuration(entry.ms_played),
        completionRate: entry.master_metadata_track_name ?
          Math.min(100, Math.round((entry.ms_played / (minPlayDuration || 30000)) * 100)) : 0
      }));

    // Calculate day statistics
    const totalTracks = dayTracks.length;
    const totalListeningTime = dayTracks.reduce((sum, track) => sum + track.ms_played, 0);
    const uniqueTracks = new Set(dayTracks.map(t => `${t.master_metadata_track_name}-${t.master_metadata_album_artist_name}`)).size;
    const uniqueArtists = new Set(dayTracks.filter(t => t.master_metadata_album_artist_name).map(t => t.master_metadata_album_artist_name)).size;
    
    // Find listening sessions (gaps > 30 minutes)
    const sessions = [];
    let currentSession = null;
    const SESSION_GAP = 30 * 60 * 1000; // 30 minutes
    
    dayTracks.forEach(track => {
      const trackTime = new Date(track.ts);
      
      if (!currentSession || (trackTime - currentSession.endTime) > SESSION_GAP) {
        if (currentSession) sessions.push(currentSession);
        currentSession = {
          startTime: trackTime,
          endTime: new Date(trackTime.getTime() + track.ms_played),
          tracks: [track],
          count: 1
        };
      } else {
        currentSession.endTime = new Date(trackTime.getTime() + track.ms_played);
        currentSession.tracks.push(track);
        currentSession.count++;
      }
    });
    
    if (currentSession) sessions.push(currentSession);

    return {
      tracks: dayTracks,
      totalTracks,
      totalListeningTime,
      uniqueTracks,
      uniqueArtists,
      sessions: sessions.length,
      formattedDate: selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  }, [filteredData, selectedYear, formatDuration, activeTab, minPlayDuration, skipFilter, fullListenOnly]);
  
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
      uniqueArtists: new Set(),
      uniqueSongs: new Set(),
      topArtist: { name: '', playCount: 0, totalTime: 0 },
      topAlbum: { name: '', artist: '', playCount: 0, totalTime: 0 },
      firstListens: []
    }));
    
    // Track daily data
    const dailyArtists = Array.from({ length: daysInMonth }, () => new Map());
    const dailyAlbums = Array.from({ length: daysInMonth }, () => new Map());
    const dailySongs = Array.from({ length: daysInMonth }, () => new Set());
    
    const passesFilters = (entry) => {
      if (entry.ms_played < minPlayDuration) return false;
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) return false;
      if (fullListenOnly && entry.reason_end !== 'trackdone') return false;
      return true;
    };

    filteredData.forEach(entry => {
      if (passesFilters(entry)) {
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
          if (!dailyAlbums[dayIndex].has(albumName)) {
            dailyAlbums[dayIndex].set(albumName, { playCount: 0, totalTime: 0, artist: artistName });
          }
          const albumData = dailyAlbums[dayIndex].get(albumName);
          albumData.playCount++;
          albumData.totalTime += entry.ms_played;

          // Track first listens (songs not heard on previous days)
          if (!dailySongs[dayIndex].has(songKey)) {
            // Check if this song was heard on any previous day
            let isFirstListen = true;
            for (let prevDay = 0; prevDay < dayIndex; prevDay++) {
              if (dailySongs[prevDay].has(songKey)) {
                isFirstListen = false;
                break;
              }
            }
            
            if (isFirstListen) {
              daysData[dayIndex].firstListens.push({
                song: songName,
                artist: artistName,
                album: albumName
              });
            }
            
            dailySongs[dayIndex].add(songKey);
          }
        }
      }
    });
    
    // Find top artist and album for each day
    daysData.forEach((dayData, index) => {
      // Top artist
      if (dailyArtists[index].size > 0) {
        const topArtist = [...dailyArtists[index].entries()]
          .sort((a, b) => b[1].playCount - a[1].playCount)[0];
        dayData.topArtist = {
          name: topArtist[0],
          playCount: topArtist[1].playCount,
          totalTime: topArtist[1].totalTime
        };
      }
      
      // Top album
      if (dailyAlbums[index].size > 0) {
        const topAlbum = [...dailyAlbums[index].entries()]
          .sort((a, b) => b[1].playCount - a[1].playCount)[0];
        dayData.topAlbum = {
          name: topAlbum[0],
          artist: topAlbum[1].artist,
          playCount: topAlbum[1].playCount,
          totalTime: topAlbum[1].totalTime
        };
      }
      
      // Convert sets to counts
      dayData.uniqueSongCount = dayData.uniqueSongs.size;
      dayData.uniqueArtistCount = dayData.uniqueArtists.size;
      
      // Clean up sets to avoid serialization issues
      delete dayData.uniqueArtists;
      delete dayData.uniqueSongs;
    });

    return daysData;
  }, [filteredData, selectedYear, isMonthView, minPlayDuration, skipFilter, fullListenOnly]);

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
      topSong: { name: '', artist: '', playCount: 0, totalTime: 0 },
      uniqueArtists: new Set(),
      uniqueSongs: new Set(),
      firstListens: []
    }));
    
    // Track monthly data
    const monthlyArtists = Array.from({ length: 12 }, () => new Map());
    const monthlyAlbums = Array.from({ length: 12 }, () => new Map());
    const monthlySongs = Array.from({ length: 12 }, () => new Set());
    const monthlyTrackedSongs = Array.from({ length: 12 }, () => new Map());
    
    const passesFilters2 = (entry) => {
      if (entry.ms_played < minPlayDuration) return false;
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) return false;
      if (fullListenOnly && entry.reason_end !== 'trackdone') return false;
      return true;
    };

    filteredData.forEach(entry => {
      if (passesFilters2(entry)) {
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
        if (!monthlyAlbums[month].has(albumName)) {
          monthlyAlbums[month].set(albumName, { playCount: 0, totalTime: 0, artist: artistName });
        }
        const albumData = monthlyAlbums[month].get(albumName);
        albumData.playCount++;
        albumData.totalTime += entry.ms_played;

        // Track songs per month
        if (!monthlyTrackedSongs[month].has(songKey)) {
          monthlyTrackedSongs[month].set(songKey, { 
            name: songName, 
            artist: artistName, 
            playCount: 0, 
            totalTime: 0 
          });
        }
        const songData = monthlyTrackedSongs[month].get(songKey);
        songData.playCount++;
        songData.totalTime += entry.ms_played;

        // Track first listens (songs not heard in previous months)
        if (!monthlySongs[month].has(songKey)) {
          // Check if this song was heard in any previous month
          let isFirstListen = true;
          for (let prevMonth = 0; prevMonth < month; prevMonth++) {
            if (monthlySongs[prevMonth].has(songKey)) {
              isFirstListen = false;
              break;
            }
          }
          
          if (isFirstListen) {
            monthsData[month].firstListens.push({
              song: songName,
              artist: artistName,
              album: albumName
            });
          }
          
          monthlySongs[month].add(songKey);
        }
      }
    });
    
    // Find top artist and album for each month
    monthsData.forEach((monthData, index) => {
      // Top artist
      if (monthlyArtists[index].size > 0) {
        const topArtist = [...monthlyArtists[index].entries()]
          .sort((a, b) => b[1].playCount - a[1].playCount)[0];
        monthData.topArtist = {
          name: topArtist[0],
          playCount: topArtist[1].playCount,
          totalTime: topArtist[1].totalTime
        };
      }
      
      // Top album
      if (monthlyAlbums[index].size > 0) {
        const topAlbum = [...monthlyAlbums[index].entries()]
          .sort((a, b) => b[1].playCount - a[1].playCount)[0];
        monthData.topAlbum = {
          name: topAlbum[0],
          artist: topAlbum[1].artist,
          playCount: topAlbum[1].playCount,
          totalTime: topAlbum[1].totalTime
        };
      }
      
      // Top song
      if (monthlyTrackedSongs[index].size > 0) {
        const topSong = [...monthlyTrackedSongs[index].entries()]
          .sort((a, b) => b[1].playCount - a[1].playCount)[0];
        monthData.topSong = {
          name: topSong[1].name,
          artist: topSong[1].artist,
          playCount: topSong[1].playCount,
          totalTime: topSong[1].totalTime
        };
      }
      
      // Convert sets to counts
      monthData.uniqueSongCount = monthData.uniqueSongs.size;
      monthData.uniqueArtistCount = monthData.uniqueArtists.size;
      
      // Clean up sets to avoid serialization issues
      delete monthData.uniqueArtists;
      delete monthData.uniqueSongs;
    });

    return monthsData;
  }, [filteredData, isMonthView, monthNamesShort, minPlayDuration, skipFilter, fullListenOnly]);
  
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
      return <span>Calendar View <span className="text-xs opacity-75">{yearRange.startYear}-{yearRange.endYear}</span></span>;
    } else if (selectedYear === 'all') {
      return <span>Calendar View <span className="text-xs opacity-75">all-time</span></span>;
    } else {
      return <span>Calendar View <span className="text-xs opacity-75">{selectedYear}</span></span>;
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
        <div className="flex items-center gap-3">
          <h3 className={`text-xl ${modeColors.text}`}>
            {getPageTitle()}
          </h3>
          {activeTab === 'history' && (
            <span className={`text-sm ${modeColors.textLight}`}>Use the year selector to pick a specific date</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
          <TabButton id="calendar" label="Calendar" />
          <TabButton id="history" label="Daily History" />
          {activeTab === 'calendar' && isMonthView && (
            <button
              onClick={() => setDaySelectionMode(!daySelectionMode)}
              className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium transition-colors ${
                daySelectionMode
                  ? modeColors.buttonActive
                  : isColorful
                    ? 'bg-green-500 text-black hover:bg-green-600'
                    : `${isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-800' : 'bg-white text-black border border-black hover:bg-gray-100'}`
              }`}
            >
              {daySelectionMode ? 'Cancel Selection' : 'View in Daily History'}
            </button>
          )}
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className={
              isColorful
                ? 'px-2 py-1 rounded text-xs font-medium transition-colors bg-green-500 text-black hover:bg-green-600'
                : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-800' : 'bg-white text-black border border-black hover:bg-gray-100'}`
            }
          >
            {viewMode === 'grid' ? '☰' : '▦'}
          </button>
        </div>
      </div>

      {/* Mobile controls - separate row */}
      <div className="block sm:hidden mb-2">
        <div className="flex flex-wrap gap-1 items-center">
          <TabButton id="calendar" label="Calendar" />
          <TabButton id="history" label="History" />
          {activeTab === 'calendar' && isMonthView && (
            <button
              onClick={() => setDaySelectionMode(!daySelectionMode)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                daySelectionMode
                  ? modeColors.buttonActive
                  : modeColors.buttonInactive
              }`}
            >
              {daySelectionMode ? 'Cancel' : 'Daily History'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div>
            {/* Monthly View - Grid */}
            {!isMonthView && viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {calendarData.map((monthData, index) => (
                  <div key={index} className={`p-3 ${modeColors.bgCardAlt} rounded shadow-sm border transition-all duration-300 relative ${modeColors.border}`}>
                    <div className={`absolute top-1 right-3 ${modeColors.textLight} text-[1.33rem]`}>{monthData.fullName}</div>
                    <div className={`text-sm ${modeColors.text}`}>
                      Total Time: <span className="font-bold">{formatDuration(monthData.totalTime)}</span>
                      <br/>
                      Plays: <span className="font-bold">{monthData.totalPlays.toLocaleString()}</span>
                      <br/>
                      Songs: <span className="font-bold">{monthData.uniqueSongCount}</span>
                      <br/>
                      Artists: <span className="font-bold">{monthData.uniqueArtistCount}</span>
                      <br/>
                      {monthData.topArtist.name && (
                        <>Top Artist: <span className="font-bold">{monthData.topArtist.name}</span> ({monthData.topArtist.playCount} plays)<br/></>
                      )}
                      {monthData.topAlbum.name && (
                        <>Top Album: <span className="font-bold">{monthData.topAlbum.name}</span> ({monthData.topAlbum.playCount} plays)<br/></>
                      )}
                      {monthData.topSong.name && (
                        <>Top Song: <span className="font-bold">{monthData.topSong.name}</span> ({monthData.topSong.playCount} plays)<br/></>
                      )}
                      New Songs: <span className="font-bold">{monthData.firstListens.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Monthly View - List */}
            {!isMonthView && viewMode === 'list' && (
              <div className={`overflow-x-auto border rounded ${modeColors.border} ${modeColors.bgCard}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${modeColors.border}`}>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>#</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Month</th>
                      <th className={`text-right px-3 py-2 font-medium ${modeColors.textLight}`}>Plays</th>
                      <th className={`text-right px-3 py-2 font-medium ${modeColors.textLight}`}>Songs</th>
                      <th className={`text-right px-3 py-2 font-medium ${modeColors.textLight}`}>Artists</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Top Artist</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Top Album</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendarData.map((monthData, index) => (
                      <tr key={index} className={`border-b ${modeColors.border} hover:opacity-80 transition-colors`}>
                        <td className={`px-3 py-2 ${modeColors.textLight}`}>{index + 1}</td>
                        <td className={`px-3 py-2 font-medium ${modeColors.text}`}>{monthData.fullName}</td>
                        <td className={`px-3 py-2 text-right ${modeColors.text}`}>{monthData.totalPlays}</td>
                        <td className={`px-3 py-2 text-right ${modeColors.text}`}>{monthData.uniqueSongCount}</td>
                        <td className={`px-3 py-2 text-right ${modeColors.text}`}>{monthData.uniqueArtistCount}</td>
                        <td className={`px-3 py-2 ${modeColors.text} truncate max-w-[150px]`}>{monthData.topArtist.name || '—'}</td>
                        <td className={`px-3 py-2 ${modeColors.text} truncate max-w-[150px]`}>{monthData.topAlbum.name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Daily View - Grid */}
            {isMonthView && viewMode === 'grid' && (
              <>
                {daySelectionMode && (
                  <p className={`text-sm text-center mb-2 ${modeColors.textLight}`}>
                    Click on any day below to view its detailed history
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {dailyCalendarData.map((dayData, index) => {
                  const handleDayClick = () => {
                    if (!daySelectionMode) return;
                    if (onYearChange) onYearChange(dayData.date);
                    setActiveTab('history');
                    setDaySelectionMode(false);
                  };

                  const dateObj = new Date(dayData.date);
                  const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
                  const day = dateObj.getDate();
                  const suffix = day % 10 === 1 && day !== 11 ? 'st' :
                                 day % 10 === 2 && day !== 12 ? 'nd' :
                                 day % 10 === 3 && day !== 13 ? 'rd' : 'th';

                  return (
                  <div
                    key={index}
                    onClick={handleDayClick}
                    className={`p-3 ${modeColors.bgCardAlt} rounded shadow-sm border transition-all duration-300 relative ${
                      daySelectionMode ? 'cursor-pointer' : 'cursor-default'
                    } ${modeColors.border} ${
                      daySelectionMode
                        ? isColorful
                          ? 'hover:opacity-80 ring-2 ring-green-500 ring-opacity-50'
                          : isDarkMode
                            ? 'hover:bg-gray-800 ring-2 ring-white ring-opacity-30'
                            : 'hover:bg-gray-100 ring-2 ring-black ring-opacity-30'
                        : ''
                    }`}>
                    <div className={`absolute top-1 right-3 ${modeColors.textLight} text-[1.33rem]`}>
                      <span className="opacity-50">{monthName}</span>{' '}{day}{suffix}
                    </div>
                    <div className={`text-sm ${modeColors.text}`}>
                      Total Time: <span className="font-bold">{formatDuration(dayData.totalTime)}</span>
                      <br/>
                      Plays: <span className="font-bold">{dayData.totalPlays.toLocaleString()}</span>
                      <br/>
                      Songs: <span className="font-bold">{dayData.uniqueSongCount}</span>
                      <br/>
                      Artists: <span className="font-bold">{dayData.uniqueArtistCount}</span>
                      <br/>
                      {dayData.topArtist.name && (
                        <>Top Artist: <span className="font-bold">{dayData.topArtist.name}</span> ({dayData.topArtist.playCount} plays)<br/></>
                      )}
                      {dayData.topAlbum.name && (
                        <>Top Album: <span className="font-bold">{dayData.topAlbum.name}</span> ({dayData.topAlbum.playCount} plays)<br/></>
                      )}
                      New Songs: <span className="font-bold">{dayData.firstListens.length}</span>
                    </div>
                  </div>
                  );
                })}
                </div>
              </>
            )}

            {/* Daily View - List */}
            {isMonthView && viewMode === 'list' && (
              <div className={`overflow-x-auto border rounded ${modeColors.border} ${modeColors.bgCard}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${modeColors.border}`}>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Day</th>
                      <th className={`text-right px-3 py-2 font-medium ${modeColors.textLight}`}>Plays</th>
                      <th className={`text-right px-3 py-2 font-medium ${modeColors.textLight}`}>Songs</th>
                      <th className={`text-right px-3 py-2 font-medium ${modeColors.textLight}`}>Artists</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Top Artist</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Top Album</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyCalendarData.map((dayData, index) => {
                      const dateObj = new Date(dayData.date);
                      const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
                      const day = dateObj.getDate();
                      const suffix = day % 10 === 1 && day !== 11 ? 'st' :
                                     day % 10 === 2 && day !== 12 ? 'nd' :
                                     day % 10 === 3 && day !== 13 ? 'rd' : 'th';

                      return (
                        <tr key={index} className={`border-b ${modeColors.border} hover:opacity-80 transition-colors cursor-pointer`}
                          onClick={() => {
                            if (onYearChange) onYearChange(dayData.date);
                            setActiveTab('history');
                          }}
                        >
                          <td className={`px-3 py-2 font-medium ${modeColors.text}`}>
                            <span className="opacity-50">{monthName}</span>{' '}
                            <span className="font-bold">{day}{suffix}</span>
                          </td>
                          <td className={`px-3 py-2 text-right ${modeColors.text}`}>{dayData.totalPlays}</td>
                          <td className={`px-3 py-2 text-right ${modeColors.text}`}>{dayData.uniqueSongCount}</td>
                          <td className={`px-3 py-2 text-right ${modeColors.text}`}>{dayData.uniqueArtistCount}</td>
                          <td className={`px-3 py-2 ${modeColors.text} truncate max-w-[150px]`}>{dayData.topArtist.name || '—'}</td>
                          <td className={`px-3 py-2 ${modeColors.text} truncate max-w-[150px]`}>{dayData.topAlbum.name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
          <div className="flex flex-col gap-4">
            <div>
              {selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3 && (
                <div className={`mt-2 text-sm px-3 py-2 rounded ${modeColors.bgCardAlt} ${modeColors.text} border ${modeColors.border}`}>
                  Viewing data for: <span className="font-semibold">{historyData.formattedDate}</span>
                </div>
              )}
            </div>
          </div>

          <div className={`p-3 sm:p-4 rounded ${modeColors.bgCard} border ${modeColors.borderLight}`}>
            <h4 className={`font-bold mb-3 sm:mb-2 text-sm sm:text-base ${modeColors.text}`}>Summary for {historyData.formattedDate}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
              <div>
                <div className={`font-medium ${modeColors.text}`}>Total Tracks</div>
                <div className={`text-lg font-bold ${modeColors.textLight}`}>{historyData.totalTracks}</div>
              </div>
              <div>
                <div className={`font-medium ${modeColors.text}`}>Listening Time</div>
                <div className={`text-lg font-bold ${modeColors.textLight}`}>{formatDuration(historyData.totalListeningTime)}</div>
              </div>
              <div>
                <div className={`font-medium ${modeColors.text}`}>Unique Tracks</div>
                <div className={`text-lg font-bold ${modeColors.textLight}`}>{historyData.uniqueTracks}</div>
              </div>
              <div>
                <div className={`font-medium ${modeColors.text}`}>Unique Artists</div>
                <div className={`text-lg font-bold ${modeColors.textLight}`}>{historyData.uniqueArtists}</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className={`font-bold mb-3 sm:mb-4 text-sm sm:text-base ${modeColors.text}`}>Chronological Track List ({historyData.tracks.length} tracks)</h4>

            {historyData.tracks.length === 0 ? (
              <div className={`text-center py-8 ${modeColors.textLight}`}>
                No listening data found for this date.
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {historyData.tracks.map((track, index) => (
                  <div key={index} className={`p-3 ${modeColors.bgCardAlt} rounded shadow-sm border transition-all duration-300 relative ${modeColors.border}`}>
                    <div className={`absolute top-1 right-3 ${modeColors.textLight} text-[1.33rem] font-mono`}>{track.formattedTime}</div>
                    <div className={`font-bold ${modeColors.text} pr-20 truncate`}>{track.master_metadata_track_name || 'Unknown Track'}</div>
                    <div className={`text-sm ${modeColors.text}`}>
                      Artist: <span className="font-bold">{track.master_metadata_album_artist_name || 'Unknown Artist'}</span>
                      <br/>
                      {track.master_metadata_album_album_name && (
                        <>Album: <span className="font-bold">{track.master_metadata_album_album_name}</span><br/></>
                      )}
                      Duration: <span className="font-bold">{track.formattedDuration}</span>
                      <br/>
                      {track.reason_end === 'trackdone' && (
                        <span className="text-green-600">Completed</span>
                      )}
                      {(track.reason_end === 'fwdbtn' || track.reason_end === 'backbtn') && (
                        <span className="text-orange-600">Skipped</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`overflow-x-auto border rounded ${modeColors.border} ${modeColors.bgCard}`}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${modeColors.border}`}>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>#</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Time</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Track</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Artist</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Album</th>
                      <th className={`text-right px-3 py-2 font-medium ${modeColors.textLight}`}>Duration</th>
                      <th className={`text-left px-3 py-2 font-medium ${modeColors.textLight}`}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.tracks.map((track, index) => (
                      <tr key={index} className={`border-b ${modeColors.border} hover:opacity-80 transition-colors`}>
                        <td className={`px-3 py-2 ${modeColors.textLight}`}>{index + 1}</td>
                        <td className={`px-3 py-2 font-mono text-xs ${modeColors.textLight}`}>{track.formattedTime}</td>
                        <td className={`px-3 py-2 font-medium ${modeColors.text} truncate max-w-[200px]`}>{track.master_metadata_track_name || 'Unknown Track'}</td>
                        <td className={`px-3 py-2 ${modeColors.text} truncate max-w-[150px]`}>{track.master_metadata_album_artist_name || 'Unknown Artist'}</td>
                        <td className={`px-3 py-2 ${modeColors.text} truncate max-w-[150px]`}>{track.master_metadata_album_album_name || '—'}</td>
                        <td className={`px-3 py-2 text-right ${modeColors.text}`}>{track.formattedDuration}</td>
                        <td className="px-3 py-2">
                          {track.reason_end === 'trackdone' && <span className="text-xs text-green-600">Completed</span>}
                          {(track.reason_end === 'fwdbtn' || track.reason_end === 'backbtn') && <span className="text-xs text-orange-600">Skipped</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;