import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ArtistByTimeOfDay from './ArtistByTimeOfDay.js';
import { useTheme } from './themeprovider.js';

// Removed exported variables to prevent conflicts with SpotifyAnalyzer state management

const ListeningBehavior = ({ 
  rawPlayData = [], 
  formatDuration,
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false
}) => {
  const [activeTab, setActiveTab] = useState('behavior');
  // Use selectedYear if it's a specific date (YYYY-MM-DD), otherwise use today
  const [selectedDate, setSelectedDate] = useState(() => {
    if (selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3) {
      return selectedYear; // Use the date from year selector
    }
    return null; // No automatic date selection
  });
  
  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
// Update the filteredData useMemo in ListeningBehavior.js
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
  
  // Analyze user behavior (skips, shuffle, etc.)
  const behaviorData = useMemo(() => {
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
    
    // Format for pie charts with much darker colors for dark mode
    const shuffleData = [
      { name: 'Shuffle On', value: shufflePlays, color: isDarkMode ? '#4C1D95' : '#8884d8' },
      { name: 'Shuffle Off', value: normalPlays, color: isDarkMode ? '#065F46' : '#82ca9d' }
    ];
    
    const skipData = [
      { name: 'Completed', value: completedTracks, color: isDarkMode ? '#065F46' : '#82ca9d' },
      { name: 'Skipped', value: skippedTracks, color: isDarkMode ? '#DC2626' : '#ff8042' },
      { name: 'Other End', value: totalTracks - completedTracks - skippedTracks, color: isDarkMode ? '#4C1D95' : '#8884d8' }
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
  }, [filteredData]);
  
  // Analyze listening sessions
  const sessionData = useMemo(() => {
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
    
    sortedEntries.forEach(entry => {
      if (entry.ms_played < 30000) return; // Only count meaningful plays
      
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
    
    // Group sessions by duration with much darker colors for dark mode
    const durationGroups = [
      { name: "< 15 min", count: 0, color: isDarkMode ? "#4C1D95" : "#8884d8" },
      { name: "15-30 min", count: 0, color: isDarkMode ? "#065F46" : "#82ca9d" },
      { name: "30-60 min", count: 0, color: isDarkMode ? "#D97706" : "#ffc658" },
      { name: "1-2 hours", count: 0, color: isDarkMode ? "#DC2626" : "#ff8042" },
      { name: "> 2 hours", count: 0, color: isDarkMode ? "#1E40AF" : "#8dd1e1" }
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
  }, [filteredData, isDarkMode]);

  // Update selectedDate when selectedYear changes to a specific date
  React.useEffect(() => {
    if (selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3) {
      setSelectedDate(selectedYear);
    }
  }, [selectedYear]);

  // Analyze listening history for selected date
  const historyData = useMemo(() => {
    // Use selectedYear if it's a specific date, otherwise use selectedDate
    // Only show data when a specific date is selected
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
          Math.min(100, Math.round((entry.ms_played / 30000) * 100)) : 0 // Assume 30sec = 100% for short tracks
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
  }, [filteredData, selectedDate, selectedYear, formatDuration]);

  // Custom pie chart label renderer - just show the percentage inside
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
    return (
      <text 
        x={x} 
        y={y} 
        fill={isDarkMode ? "#ffffff" : "#ffffff"} 
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
            ? 'bg-gray-700 text-indigo-400 border-b-2 border-indigo-400' 
            : 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
          : isDarkMode
            ? 'bg-gray-800 text-indigo-400 hover:bg-gray-700'
            : 'bg-indigo-200 text-indigo-600 hover:bg-indigo-300'
      }`}
    >
      {label}
    </button>
  );

  // Function to get title based on year selection mode
  const getPageTitle = () => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `Listening Behavior (${yearRange.startYear}-${yearRange.endYear})`;
    } else if (selectedYear === 'all') {
      return 'All-time Listening Behavior';
    } else {
      return `Listening Behavior for ${selectedYear}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Main title is only shown here - removed from SpotifyAnalyzer */}
      
      {/* Horizontally scrollable tabs */}
      <div className="relative overflow-x-auto pb-1 -mx-4 px-4">
        <div className="flex min-w-max">
          <TabButton id="behavior" label="Listening Behavior" />
          <TabButton id="sessions" label="Listening Sessions" />
          <TabButton id="artistsTime" label="Artists by Time" />
          <TabButton id="history" label="Listening History" />
        </div>
      </div>

      {activeTab === 'behavior' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-bold text-indigo-700 mb-2">Shuffle vs. Normal Play</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={behaviorData.shuffleData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {behaviorData.shuffleData.map((entry, index) => (
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
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
    
              <div className="text-sm text-indigo-600 text-center mt-2">
                You listen in shuffle mode {behaviorData.shufflePercentage}% of the time
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-indigo-700 mb-2">Track Completion</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={behaviorData.skipData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {behaviorData.skipData.map((entry, index) => (
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
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-sm text-indigo-600 text-center mt-2">
                You completed {behaviorData.completedPercentage}% of tracks, skipped {behaviorData.skippedPercentage}%
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-indigo-700 mb-2">How You Start Tracks</h3>
            <div className="h-64 w-full">
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
                  <Bar name="Count" dataKey="count" fill={isDarkMode ? "#4C1D95" : "#8884d8"} />
                  <Bar name="Percentage" dataKey="percentage" fill={isDarkMode ? "#065F46" : "#82ca9d"} unit="%" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-indigo-700 mb-2">How Tracks End</h3>
            <div className="h-64 w-full">
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
                  <Bar name="Count" dataKey="count" fill={isDarkMode ? "#4C1D95" : "#8884d8"} />
                  <Bar name="Percentage" dataKey="percentage" fill={isDarkMode ? "#065F46" : "#82ca9d"} unit="%" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-indigo-700 mb-2">Platforms Used</h3>
            <div className="h-64 w-full">
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
                  <Bar name="Count" dataKey="count" fill={isDarkMode ? "#4C1D95" : "#8884d8"} />
                  <Bar name="Percentage" dataKey="percentage" fill={isDarkMode ? "#065F46" : "#82ca9d"} unit="%" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-indigo-50 rounded">
              <h3 className="font-bold text-indigo-700">Total Sessions</h3>
              <p className="text-3xl text-indigo-600">{sessionData.totalSessions}</p>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded">
              <h3 className="font-bold text-indigo-700">Avg. Session Length</h3>
              <p className="text-3xl text-indigo-600">{sessionData.averageSessionDuration} min</p>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded">
              <h3 className="font-bold text-indigo-700">Avg. Tracks per Session</h3>
              <p className="text-3xl text-indigo-600">{sessionData.averageTracksPerSession}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-indigo-700 mb-2">Session Duration Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sessionData.durationGroups}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={false}
                    label={renderCustomizedLabel}
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
              <h3 className="text-lg font-bold text-indigo-700 mb-2">Session Statistics</h3>
              <ul className="space-y-2">
                {sessionData.longestSession && (
                  <li className="p-2 bg-indigo-50 rounded">
                    <span className="font-bold text-indigo-700">Longest Session:</span>
                    <span className="ml-2 text-indigo-600">{sessionData.longestSession.durationMinutes} minutes</span>
                    <div className="text-sm text-indigo-500">
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
                  <li className="p-2 bg-indigo-50 rounded">
                    <span className="font-bold text-indigo-700">Most Tracks in a Session:</span>
                    <span className="ml-2 text-indigo-600">{sessionData.mostTracksSession.tracksCount} tracks</span>
                    <div className="text-sm text-indigo-500">
                      on {sessionData.mostTracksSession.fullDate.toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </li>
                )}
                
                <li className="p-2 bg-indigo-50 rounded">
                  <span className="font-bold text-indigo-700">Total Listening Time:</span>
                  <span className="ml-2 text-indigo-600">
                    {formatDuration(sessionData.sessionLengths.reduce((sum, session) => sum + (session.durationMinutes * 60000), 0))}
                  </span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-indigo-700 mb-2">Notable Days & Months</h3>
              <div className="space-y-3">
                {sessionData.mostActiveDay && (
                  <div className="p-3 bg-indigo-50 rounded">
                    <h4 className="font-medium text-indigo-700">Most Active Day:</h4>
                    <div className="text-indigo-600 font-bold">{sessionData.mostActiveDay.displayDate}</div>
                    <div className="text-sm text-indigo-500">
                      {sessionData.mostActiveDay.totalPlays} tracks played
                    </div>
                  </div>
                )}
                
                {sessionData.longestListeningDay && (
                  <div className="p-3 bg-indigo-50 rounded">
                  <h4 className="font-medium text-indigo-700">Longest Listening Day:</h4>
                  <div className="text-indigo-600 font-bold">{sessionData.longestListeningDay.displayDate}</div>
                  <div className="text-sm text-indigo-500">
                    {formatDuration(sessionData.longestListeningDay.totalTime)} of listening
                  </div>
                </div>
              )}
              
              {sessionData.mostActiveMonth && (
                <div className="p-3 bg-indigo-50 rounded">
                  <h4 className="font-medium text-indigo-700">Most Active Month:</h4>
                  <div className="text-indigo-600 font-bold">{sessionData.mostActiveMonth.displayDate}</div>
                  <div className="text-sm text-indigo-500">
                    {sessionData.mostActiveMonth.totalPlays} tracks played
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-indigo-700 mb-2">Session Insights</h3>
          <div className="p-3 bg-indigo-50 rounded space-y-2">
            <p className="text-indigo-700">
              Most of your listening sessions are 
              <span className="font-bold"> {
                sessionData.durationGroups.sort((a, b) => b.count - a.count)[0]?.name.toLowerCase()
              }</span>.
            </p>
            <p className="text-indigo-700">
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
      />
    )}
    
    {activeTab === 'history' && (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className={`text-lg font-bold ${
              isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
            }`}>Daily Listening History</h3>
            <p className={`text-sm ${
              isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
            }`}>Use the year selector to pick a specific date and see what you listened to in chronological order</p>
            {selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3 && (
              <div className={`mt-2 text-sm px-3 py-2 rounded ${
                isDarkMode ? 'bg-indigo-800 text-indigo-200 border border-indigo-600' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                📅 Viewing data for: <span className="font-semibold">{historyData.formattedDate}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className={`p-4 rounded ${
          isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-indigo-50 border border-indigo-100'
        }`}>
          <h4 className={`font-bold mb-2 ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>Summary for {historyData.formattedDate}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className={`font-medium ${
                isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
              }`}>Total Tracks</div>
              <div className={`text-lg font-bold ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}>{historyData.totalTracks}</div>
            </div>
            <div>
              <div className={`font-medium ${
                isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
              }`}>Listening Time</div>
              <div className={`text-lg font-bold ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}>{formatDuration(historyData.totalListeningTime)}</div>
            </div>
            <div>
              <div className={`font-medium ${
                isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
              }`}>Unique Tracks</div>
              <div className={`text-lg font-bold ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}>{historyData.uniqueTracks}</div>
            </div>
            <div>
              <div className={`font-medium ${
                isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
              }`}>Unique Artists</div>
              <div className={`text-lg font-bold ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}>{historyData.uniqueArtists}</div>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className={`font-bold mb-4 ${
            isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
          }`}>Chronological Track List ({historyData.tracks.length} tracks)</h4>
          
          {historyData.tracks.length === 0 ? (
            <div className={`text-center py-8 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              No listening data found for this date.
            </div>
          ) : (
            <div className={`max-h-96 overflow-y-auto border rounded ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="space-y-1 p-2">
                {historyData.tracks.map((track, index) => (
                  <div key={index} className={`flex items-center justify-between p-3 rounded text-sm hover:bg-opacity-50 transition-colors ${
                    isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {track.formattedTime}
                        </span>
                        <span className={`font-medium truncate ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-900'
                        }`}>
                          {track.master_metadata_track_name || 'Unknown Track'}
                        </span>
                      </div>
                      <div className={`text-xs mt-1 truncate ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {track.master_metadata_album_artist_name || 'Unknown Artist'}
                        {track.master_metadata_album_album_name && ` • ${track.master_metadata_album_album_name}`}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4">
                      <div className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {track.formattedDuration}
                      </div>
                      {track.reason_end === 'trackdone' && (
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                          ✓ Completed
                        </span>
                      )}
                      {(track.reason_end === 'fwdbtn' || track.reason_end === 'backbtn') && (
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                          ⏭ Skipped
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);
};

export default ListeningBehavior;