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
  onToggleYearRangeMode
}) => {
  const [activeTab, setActiveTab] = useState('discovery');
  const [timeframe, setTimeframe] = useState('all');
  
  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
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
    const sortedEntries = [...filteredData].filter(entry => entry.ms_played >= 30000)
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
    
    // Format for loyalty pie chart
    const otherPlayTime = totalPlayTime - top5PlayTime;
    const loyaltyData = [
      { name: 'Top 5 Artists', value: top5PlayTime, color: isDarkMode ? '#9a7ced' : '#8884d8' },
      { name: 'All Other Artists', value: otherPlayTime, color: isDarkMode ? '#82e3cf' : '#82ca9d' }
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
  }, [filteredData, isDarkMode]);
  
  // Analyze listening depth
  const depthData = useMemo(() => {
    // Group plays by artist and track
    const artistTracks = {};
    const trackPlays = {};
    
    // Get the earliest and latest dates for filtering
    const filteredEntries = [...filteredData].filter(entry => entry.ms_played >= 30000);
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
  }, [filteredData, discoveryData.artistPlayCounts]);
  
  // Analyze music variety
  const varietyData = useMemo(() => {
    // Calculate uniqueness ratio by timeframe
    const plays = {};
    const uniqueTracks = {};
    const timeframes = {};
    
    filteredData.filter(entry => entry.ms_played >= 30000).forEach(entry => {
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
  }, [filteredData]);
  
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
      return `Music Discovery (${yearRange.startYear}-${yearRange.endYear})`;
    } else if (selectedYear !== 'all') {
      return `Music Discovery (${selectedYear})`;
    }
    return 'All-time Music Discovery';
  };

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 whitespace-nowrap font-medium ${
        activeTab === id
          ? isDarkMode 
            ? 'bg-gray-700 text-green-400 border-b-2 border-green-400' 
            : 'bg-green-50 text-green-600 border-b-2 border-green-600'
          : isDarkMode
            ? 'bg-gray-800 text-green-400 hover:bg-gray-700'
            : 'bg-green-200 text-green-600 hover:bg-green-300'
      }`}
    >
      {label}
    </button>
  );
  
  const TimeframeButton = ({ id, label }) => (
    <button
      onClick={() => setTimeframe(id)}
      className={`px-3 py-1 text-sm font-medium ${
        timeframe === id
          ? isDarkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'
          : isDarkMode ? 'bg-gray-700 text-green-400 hover:bg-gray-600' : 'bg-green-100 text-green-600 hover:bg-green-200'
      } rounded-full`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
    
      
      {/* Horizontally scrollable tabs */}
      <div className="relative border-b overflow-x-auto pb-1 -mx-4 px-4">
        <div className="flex min-w-max">
          <TabButton id="discovery" label="Artist Discovery" />
          <TabButton id="loyalty" label="Artist Loyalty" />
          <TabButton id="depth" label="Listening Depth" />
          <TabButton id="variety" label="Music Variety" />
        </div>
      </div>

      {activeTab === 'discovery' && (
        <div className="space-y-6">
          <div className={`p-4 rounded ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-green-50'
          }`}>
            <h3 className={`font-bold mb-4 ${
              isDarkMode ? 'text-green-400' : 'text-green-700'
            }`}>Artist Discovery Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm text-green-600">Total Unique Artists</div>
                <div className="text-3xl font-bold text-green-700">{discoveryData.uniqueArtistsCount}</div>
              </div>
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm text-green-600">Average New Artists per Month</div>
                <div className="text-3xl font-bold text-green-700">
                  {discoveryData.newArtistsByMonth.length > 0 ? 
                    Math.round(discoveryData.totalArtistsDiscovered / discoveryData.newArtistsByMonth.length) : 0
                  }
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-green-700 mb-2">Artist Discovery Rate</h3>
            <p className="text-green-600 mb-4">New artists discovered over time</p>
            
            <div className="h-72 w-full">
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
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke={isDarkMode ? '#82e3cf' : '#82ca9d'}
                    name="New Artists Discovered" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className={`p-4 rounded ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-green-50'
          }`}>
            <h3 className={`font-bold ${
              isDarkMode ? 'text-green-400' : 'text-green-700'
            }`}>Discovery Insights</h3>
            <ul className="mt-2 space-y-2">
              <li className={isDarkMode ? 'text-green-400' : 'text-green-600'}>
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
                <li className="text-green-600">
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
              <h3 className="text-lg font-bold text-green-700 mb-2">Artist Loyalty</h3>
              <p className="text-green-600 mb-4">Your listening time distribution</p>
              
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={discoveryData.loyaltyData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {discoveryData.loyaltyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatDuration(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-sm text-green-600 text-center mt-2">
                Your top 5 artists account for {discoveryData.top5Percentage}% of your total listening time
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-green-700 mb-2">Your Top 5 Artists</h3>
              <div className="space-y-3">
                {discoveryData.top5Artists.map((artist, index) => (
                  <div key={index} className="p-3 bg-green-50 rounded flex justify-between items-center">
                    <div>
                      <span className="font-bold text-lg text-green-700">{index + 1}. {artist.name}</span>
                      <div className="text-sm text-green-600">
                        {formatDuration(artist.time)} total listening time
                      </div>
                    </div>
                    <div className="text-green-600 font-bold">
                      {Math.round((artist.time / discoveryData.loyaltyData[0].value) * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-bold text-green-700 mb-2">Loyalty Profile</h3>
            <div className="text-green-600">
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
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-bold text-green-700 mb-4">Artist Catalog Exploration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm text-green-600">Average Listening Depth Score</div>
                <div className="text-3xl font-bold text-green-700">{depthData.averageDepth} / 100</div>
                <div className="text-xs text-green-500 mt-1">Higher scores indicate deeper exploration of artists' catalogs</div>
              </div>
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm text-green-600">Most Explored Artist</div>
                <div className="text-3xl font-bold text-green-700">
                  {depthData.artistDepths[0]?.name || "N/A"}
                </div>
                <div className="text-xs text-green-500 mt-1">
                  {depthData.artistDepths[0] ? 
                    `${depthData.artistDepths[0].uniqueTracks} unique tracks listened to` : ""}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-green-700 mb-2">Artist Catalog Depth</h3>
            <p className="text-green-600 mb-4">How deeply you explore your favorite artists' music</p>
            
            <div className="h-96 w-full">
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
                  <Legend />
                  <Bar name="Unique Tracks" dataKey="uniqueTracks" fill="#82ca9d" />
                  <Bar name="Depth Score" dataKey="depthScore" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-green-700 mb-2">Replay Value Kings</h3>
            <p className="text-green-600 mb-4">Your most repeated tracks</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {depthData.replayValue.map((track, index) => (
                <div key={index} className="p-3 bg-green-50 rounded border border-green-100">
                  <div className="font-bold text-green-700">{index + 1}. {track.track}</div>
                  <div className="text-sm text-green-600">
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
          
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-bold text-green-700 mb-4">Music Variety Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm text-green-600">Daily Variety Score</div>
                <div className="text-3xl font-bold text-green-700">{Math.round(varietyData.avgDailyVariety)}%</div>
                <div className="text-xs text-green-500 mt-1">Average percentage of unique tracks in a day</div>
              </div>
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm text-green-600">Weekly Variety Score</div>
              <div className="text-3xl font-bold text-green-700">{Math.round(varietyData.avgWeeklyVariety)}%</div>
                <div className="text-xs text-green-500 mt-1">Average percentage of unique tracks in a week</div>
              </div>
              <div className="p-3 bg-white rounded shadow">
                <div className="text-sm text-green-600">Monthly Variety Score</div>
                <div className="text-3xl font-bold text-green-700">{Math.round(varietyData.avgMonthlyVariety)}%</div>
                <div className="text-xs text-green-500 mt-1">Average percentage of unique tracks in a month</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-green-700 mb-2">Music Variety Over Time</h3>
            <p className="text-green-600 mb-4">
              Higher percentages indicate more unique tracks (less repetition)
            </p>
            
            <div className="h-72 w-full">
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
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="varietyScore" 
                    stroke="#82ca9d" 
                    name="Variety Score" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-bold text-green-700 mb-2">Variety Profile</h3>
            <div className="text-green-600">
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