import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ArtistByTimeOfDay from './ArtistByTimeOfDay.js';

const ListeningBehavior = ({ rawPlayData = [], formatDuration }) => {
  const [activeTab, setActiveTab] = useState('behavior');
  const [selectedYear, setSelectedYear] = useState('all'); // 'all' for all-time data, or specific year
  
  // Get all available years from data
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        yearsSet.add(date.getFullYear());
      }
    });
    
    return Array.from(yearsSet).sort((a, b) => b - a); // Sort in descending order (newest first)
  }, [rawPlayData]);
  
  // Filter data by selected year
  const filteredData = useMemo(() => {
    if (selectedYear === 'all') {
      return rawPlayData;
    }
    
    return rawPlayData.filter(entry => {
      const date = new Date(entry.ts);
      return date.getFullYear() === parseInt(selectedYear);
    });
  }, [rawPlayData, selectedYear]);
  
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
    
    // Format for pie charts
    const shuffleData = [
      { name: 'Shuffle On', value: shufflePlays, color: '#8884d8' },
      { name: 'Shuffle Off', value: normalPlays, color: '#82ca9d' }
    ];
    
    const skipData = [
      { name: 'Completed', value: completedTracks, color: '#82ca9d' },
      { name: 'Skipped', value: skippedTracks, color: '#ff8042' },
      { name: 'Other End', value: totalTracks - completedTracks - skippedTracks, color: '#8884d8' }
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
    
    // Group sessions by duration
    const durationGroups = [
      { name: "< 15 min", count: 0, color: "#8884d8" },
      { name: "15-30 min", count: 0, color: "#82ca9d" },
      { name: "30-60 min", count: 0, color: "#ffc658" },
      { name: "1-2 hours", count: 0, color: "#ff8042" },
      { name: "> 2 hours", count: 0, color: "#8dd1e1" }
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
  }, [filteredData]);

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 whitespace-nowrap font-medium ${
        activeTab === id
          ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
          : 'bg-indigo-200 text-indigo-600 hover:bg-indigo-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-indigo-700">
          {selectedYear === 'all' 
            ? 'All-time Listening Behavior' 
            : `Listening Behavior for ${selectedYear}`}
        </h3>
        <div className="flex items-center">
          <span className="text-indigo-600 mr-2">Filter by year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border rounded-md p-1 bg-indigo-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Time</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Horizontally scrollable tabs */}
      <div className="relative border-b overflow-x-auto pb-1 -mx-4 px-4">
        <div className="flex min-w-max">
          <TabButton id="behavior" label="Listening Behavior" />
          <TabButton id="sessions" label="Listening Sessions" />
          <TabButton id="artistsTime" label="Artists by Time" />
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {behaviorData.shuffleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value} />
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {behaviorData.skipData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value} />
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Count' : 'Percentage']} />
                  <Legend />
                  <Bar name="Count" dataKey="count" fill="#8884d8" />
                  <Bar name="Percentage" dataKey="percentage" fill="#82ca9d" unit="%" />
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Count' : 'Percentage']} />
                  <Legend />
                  <Bar name="Count" dataKey="count" fill="#8884d8" />
                  <Bar name="Percentage" dataKey="percentage" fill="#82ca9d" unit="%" />
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Count' : 'Percentage']} />
                  <Legend />
                  <Bar name="Count" dataKey="count" fill="#8884d8" />
                  <Bar name="Percentage" dataKey="percentage" fill="#82ca9d" unit="%" />
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {sessionData.durationGroups.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value} />
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
    </div>
  );
};

export default ListeningBehavior;