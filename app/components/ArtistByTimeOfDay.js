import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from './themeprovider.js';

const ArtistByTimeOfDay = ({ rawPlayData = [], formatDuration }) => {
  const [startTime, setStartTime] = useState(''); // Start time in HH:MM format
  const [endTime, setEndTime] = useState('');   // End time in HH:MM format
  const [artistLimit, setArtistLimit] = useState(5);
  
  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Analyze artists by time of day
  const artistTimeData = useMemo(() => {
    // Define time periods with much darker colors for dark mode
    const timePeriods = {
      morning: { name: 'Morning (5-11)', hours: [5, 6, 7, 8, 9, 10, 11], color: isDarkMode ? '#4C1D95' : '#8884d8' },
      afternoon: { name: 'Afternoon (12-16)', hours: [12, 13, 14, 15, 16], color: isDarkMode ? '#065F46' : '#82ca9d' },
      evening: { name: 'Evening (17-21)', hours: [17, 18, 19, 20, 21], color: isDarkMode ? '#D97706' : '#ffc658' },
      night: { name: 'Night (22-4)', hours: [22, 23, 0, 1, 2, 3, 4], color: isDarkMode ? '#1E40AF' : '#4B9CD3' },
    };
    
    // Create artist plays count by hour
    const artistsByHour = Array(24).fill().map(() => ({}));
    const artistsByPeriod = {
      morning: {},
      afternoon: {},
      evening: {},
      night: {},
      all: {}
    };
    
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000 && entry.master_metadata_album_artist_name) { // Only significant plays
        const date = new Date(entry.ts);
        const hour = date.getHours();
        const artist = entry.master_metadata_album_artist_name;
        
        // Add to hourly data
        if (!artistsByHour[hour][artist]) {
          artistsByHour[hour][artist] = {
            plays: 0,
            totalMs: 0
          };
        }
        artistsByHour[hour][artist].plays += 1;
        artistsByHour[hour][artist].totalMs += entry.ms_played;
        
        // Determine which period this hour belongs to
        let periodKey = 'all';
        for (const [key, period] of Object.entries(timePeriods)) {
          if (period.hours.includes(hour)) {
            periodKey = key;
            break;
          }
        }
        
        // Add to period data
        if (!artistsByPeriod[periodKey][artist]) {
          artistsByPeriod[periodKey][artist] = {
            plays: 0,
            totalMs: 0
          };
        }
        artistsByPeriod[periodKey][artist].plays += 1;
        artistsByPeriod[periodKey][artist].totalMs += entry.ms_played;
        
        // Also add to "all" category
        if (!artistsByPeriod.all[artist]) {
          artistsByPeriod.all[artist] = {
            plays: 0,
            totalMs: 0
          };
        }
        artistsByPeriod.all[artist].plays += 1;
        artistsByPeriod.all[artist].totalMs += entry.ms_played;
      }
    });
    
    // Format hourly data for charts
    const hourlyTopArtists = artistsByHour.map((artists, hour) => {
      const displayHour = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      
      // Sort artists by play count and get top artists
      const topArtists = Object.entries(artists)
        .sort((a, b) => b[1].plays - a[1].plays)
        .slice(0, 3) // Top 3 artists for each hour
        .map(([name, data], index) => ({
          name,
          plays: data.plays,
          totalMs: data.totalMs,
          rank: index + 1
        }));
      
      return {
        hour,
        displayHour,
        totalPlays: Object.values(artists).reduce((sum, data) => sum + data.plays, 0),
        topArtists
      };
    });
    
    // Format period data for charts
    const periodTopArtists = {};
    
    Object.entries(artistsByPeriod).forEach(([period, artists]) => {
      // Get top artists for this period
      periodTopArtists[period] = Object.entries(artists)
        .map(([name, data]) => ({
          name,
          plays: data.plays,
          totalMs: data.totalMs,
          avgPlayTime: data.totalMs / data.plays
        }))
        .sort((a, b) => b.totalMs - a.totalMs);
    });
    
    return {
      hourlyTopArtists,
      periodTopArtists,
      timePeriods
    };
  }, [rawPlayData, isDarkMode]);
  
  // Format period data for display based on time range and artist limit
  const periodChartData = useMemo(() => {
    let filteredData = {};
    
    if (!startTime && !endTime) {
      // Show all time data if no time range specified
      filteredData = artistTimeData.periodTopArtists['all'] || [];
    } else {
      // Get hours in the specified range
      const startHour = startTime ? parseInt(startTime.split(':')[0]) : 0;
      const endHour = endTime ? parseInt(endTime.split(':')[0]) : 23;
      
      // Handle time ranges that cross midnight
      let hoursInRange = [];
      if (startHour <= endHour) {
        // Normal range (e.g., 9:00 to 17:00)
        for (let h = startHour; h <= endHour; h++) {
          hoursInRange.push(h);
        }
      } else {
        // Range crosses midnight (e.g., 22:00 to 06:00)
        for (let h = startHour; h <= 23; h++) {
          hoursInRange.push(h);
        }
        for (let h = 0; h <= endHour; h++) {
          hoursInRange.push(h);
        }
      }
      
      // Aggregate data for hours in range
      const artistTotals = {};
      
      hoursInRange.forEach(hour => {
        // Find which period this hour belongs to
        let periodKey = 'all';
        for (const [key, period] of Object.entries(artistTimeData.timePeriods)) {
          if (period.hours.includes(hour)) {
            periodKey = key;
            break;
          }
        }
        
        // Add artists from this period
        const periodArtists = artistTimeData.periodTopArtists[periodKey] || [];
        periodArtists.forEach(artist => {
          if (!artistTotals[artist.name]) {
            artistTotals[artist.name] = {
              name: artist.name,
              plays: 0,
              totalMs: 0
            };
          }
          
          // Weight the contribution based on how many hours from this period are in range
          const periodHoursInRange = hoursInRange.filter(h => 
            artistTimeData.timePeriods[periodKey]?.hours.includes(h)
          ).length;
          const periodTotalHours = artistTimeData.timePeriods[periodKey]?.hours.length || 1;
          const weight = periodHoursInRange / periodTotalHours;
          
          artistTotals[artist.name].plays += Math.round(artist.plays * weight);
          artistTotals[artist.name].totalMs += Math.round(artist.totalMs * weight);
        });
      });
      
      // Convert to array and calculate averages
      filteredData = Object.values(artistTotals)
        .map(artist => ({
          ...artist,
          avgPlayTime: artist.totalMs / Math.max(artist.plays, 1)
        }))
        .sort((a, b) => b.totalMs - a.totalMs);
    }
    
    return filteredData.slice(0, artistLimit).map(artist => ({
      ...artist,
      formattedTime: formatDuration(artist.totalMs)
    }));
  }, [artistTimeData, startTime, endTime, artistLimit, formatDuration]);
  
  // Calculate what percentage of selected time range's listening is the top artists
  const topArtistsPercentage = useMemo(() => {
    let totalTime = 0;
    
    if (!startTime && !endTime) {
      const allData = artistTimeData.periodTopArtists['all'] || [];
      totalTime = allData.reduce((sum, artist) => sum + artist.totalMs, 0);
    } else {
      // Calculate total for time range (approximate based on periods)
      const startHour = startTime ? parseInt(startTime.split(':')[0]) : 0;
      const endHour = endTime ? parseInt(endTime.split(':')[0]) : 23;
      
      let hoursInRange = [];
      if (startHour <= endHour) {
        for (let h = startHour; h <= endHour; h++) {
          hoursInRange.push(h);
        }
      } else {
        for (let h = startHour; h <= 23; h++) {
          hoursInRange.push(h);
        }
        for (let h = 0; h <= endHour; h++) {
          hoursInRange.push(h);
        }
      }
      
      hoursInRange.forEach(hour => {
        let periodKey = 'all';
        for (const [key, period] of Object.entries(artistTimeData.timePeriods)) {
          if (period.hours.includes(hour)) {
            periodKey = key;
            break;
          }
        }
        const periodData = artistTimeData.periodTopArtists[periodKey] || [];
        const periodTotal = periodData.reduce((sum, artist) => sum + artist.totalMs, 0);
        const periodHours = artistTimeData.timePeriods[periodKey]?.hours.length || 1;
        totalTime += periodTotal / periodHours; // Approximate per hour
      });
    }
    
    const topTime = periodChartData.reduce((sum, artist) => sum + artist.totalMs, 0);
    return totalTime > 0 ? Math.round((topTime / totalTime) * 100) : 0;
  }, [artistTimeData, startTime, endTime, periodChartData]);

  // Create a chart showing hourly listening patterns
  const hourlyArtistChart = useMemo(() => {
    // Prepare data for hourly chart - showing which hours have most distinct artists
    const hourlyData = artistTimeData.hourlyTopArtists.map(hour => {
      // Count unique artists
      const uniqueArtistsCount = hour.topArtists.length;
      // Get the top artist if available
      const topArtist = hour.topArtists.length > 0 ? hour.topArtists[0].name : "None";
      
      return {
        hour: hour.hour,
        displayHour: hour.displayHour,
        totalPlays: hour.totalPlays,
        uniqueArtists: uniqueArtistsCount,
        topArtist
      };
    });
    
    return hourlyData;
  }, [artistTimeData]);
  
  const TimeFilter = () => (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <span className={isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}>Time range (leave empty for all day):</span>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-2">
            <label className={`text-sm ${
              isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
            }`}>From:</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDarkMode ? 'bg-black text-gray-200 border-gray-600' : 'bg-white text-indigo-700 border-gray-300'
              }`}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-sm ${
              isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
            }`}>To:</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDarkMode ? 'bg-black text-gray-200 border-gray-600' : 'bg-white text-indigo-700 border-gray-300'
              }`}
            />
          </div>
          <button
            onClick={() => {
              setStartTime('');
              setEndTime('');
            }}
            className={`px-3 py-1 text-sm rounded ${
              isDarkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Clear
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <span className={isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}>Number of artists (1-99):</span>
        <input
          type="number"
          min="1"
          max="99"
          value={artistLimit}
          onChange={e => setArtistLimit(Math.min(99, Math.max(1, parseInt(e.target.value) || 5)))}
          className={`w-16 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDarkMode ? 'bg-black text-gray-200 border-gray-600' : 'bg-white text-indigo-700 border-gray-300'
          }`}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded ${
        isDarkMode ? 'bg-black border border-gray-700' : 'bg-indigo-50'
      }`}>
        <h3 className={`font-bold mb-4 ${
          isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
        }`}>Top Artists by Time of Day</h3>
        <p className={`mb-4 ${
          isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
        }`}>
          Discover which artists you listen to most during different parts of the day
        </p>
        
        <TimeFilter />
        
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={periodChartData}
              margin={{ top: 10, right: 30, left: 40, bottom: 40 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis type="number" stroke={isDarkMode ? '#9CA3AF' : '#374151'} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150}
                tick={{ fontSize: 12 }}
                stroke={isDarkMode ? '#9CA3AF' : '#374151'}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'totalMs') return formatDuration(value);
                  if (name === 'plays') return `${value} plays`;
                  return value;
                }}
              />
              <Legend />
              <Bar name="Listening Time" dataKey="totalMs" fill={isDarkMode ? '#4C1D95' : '#8884d8'} />
              <Bar name="Play Count" dataKey="plays" fill={isDarkMode ? '#065F46' : '#82ca9d'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className={`text-sm text-center mt-2 ${
          isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
        }`}>
          {periodChartData.length > 0 
            ? (!startTime && !endTime)
              ? `These top ${periodChartData.length} artists represent ${topArtistsPercentage}% of your total listening time`
              : `These top ${periodChartData.length} artists represent ${topArtistsPercentage}% of your listening time from ${startTime || '00:00'} to ${endTime || '23:59'}`
            : 'No data available for this time range'}
        </div>
      </div>
      
      <div>
        <h3 className={`font-bold mb-2 ${
          isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
        }`}>Listening by Hour of Day</h3>
        <p className={`mb-4 ${
          isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
        }`}>See when during the day you listen to different artists</p>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hourlyArtistChart}
              margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis 
                dataKey="displayHour" 
                angle={-45} 
                textAnchor="end" 
                height={60}
                stroke={isDarkMode ? '#9CA3AF' : '#374151'}
              />
              <YAxis stroke={isDarkMode ? '#9CA3AF' : '#374151'} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'uniqueArtists') return `${value} unique artists`;
                  if (name === 'totalPlays') return `${value} total plays`;
                  return value;
                }}
                labelFormatter={(label) => `Hour: ${label}`}
              />
              <Legend />
              <Bar name="Total Plays" dataKey="totalPlays" fill={isDarkMode ? '#4C1D95' : '#8884d8'} />
              <Bar name="Unique Artists" dataKey="uniqueArtists" fill={isDarkMode ? '#065F46' : '#82ca9d'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div>
        <h3 className={`font-bold mb-2 ${
          isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
        }`}>Artist Insights by Time</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {periodChartData.slice(0, 4).map((artist, index) => (
            <div key={index} className={`p-3 rounded border ${
              isDarkMode ? 'bg-black border-gray-700' : 'bg-indigo-50 border-indigo-100'
            }`}>
              <h4 className={`font-bold ${
                isDarkMode ? 'text-indigo-300' : 'text-indigo-700'
              }`}>
                {index + 1}. {artist.name}
              </h4>
              <div className={`text-sm ${
                isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
              }`}>
                <div>Total Time: {artist.formattedTime}</div>
                <div>Play Count: {artist.plays} tracks</div>
                <div>
                  Average: {formatDuration(artist.avgPlayTime)} per play
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArtistByTimeOfDay;