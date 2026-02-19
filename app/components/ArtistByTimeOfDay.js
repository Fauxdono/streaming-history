import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from './themeprovider.js';

const ArtistByTimeOfDay = ({ rawPlayData = [], formatDuration, colorMode = 'minimal' }) => {
  const [startTime, setStartTime] = useState(''); // Start time in HH:MM format
  const [endTime, setEndTime] = useState('');   // End time in HH:MM format
  const [artistLimit, setArtistLimit] = useState(5);

  // Get the current theme
  const { theme, minPlayDuration, skipFilter, fullListenOnly } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Color system for colorful/minimal modes (Amber theme to match Behavior tab)
  const modeColors = isColorful ? {
    text: isDarkMode ? 'text-amber-300' : 'text-amber-700',
    textLight: isDarkMode ? 'text-amber-400' : 'text-amber-600',
    bg: isDarkMode ? 'bg-amber-900' : 'bg-amber-200',
    bgCard: isDarkMode ? 'bg-amber-800' : 'bg-amber-100',
    border: isDarkMode ? 'border-amber-600' : 'border-amber-300',
    input: isDarkMode ? 'bg-amber-900 text-amber-200 border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-300',
    button: isDarkMode ? 'bg-amber-700 text-amber-200 hover:bg-amber-600' : 'bg-amber-200 text-amber-700 hover:bg-amber-300',
    barColor: isDarkMode ? '#D97706' : '#F59E0B',
    barColorAlt: isDarkMode ? '#B45309' : '#FBBF24',
  } : {
    text: isDarkMode ? 'text-white' : 'text-black',
    textLight: isDarkMode ? 'text-gray-400' : 'text-gray-600',
    bg: isDarkMode ? 'bg-black' : 'bg-white',
    bgCard: isDarkMode ? 'bg-black' : 'bg-white',
    border: isDarkMode ? 'border-[#4169E1]' : 'border-black',
    input: isDarkMode ? 'bg-black text-white border-[#4169E1]' : 'bg-white text-black border-black',
    button: isDarkMode ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-gray-200 text-black hover:bg-gray-300',
    barColor: isDarkMode ? '#9CA3AF' : '#6B7280',
    barColorAlt: isDarkMode ? '#6B7280' : '#9CA3AF',
  };
  
  // Analyze artists by time of day
  const artistTimeData = useMemo(() => {
    // Define time periods - grey in minimal mode
    const timePeriods = {
      morning: { name: 'Morning (5-11)', hours: [5, 6, 7, 8, 9, 10, 11], color: isColorful ? (isDarkMode ? '#4C1D95' : '#8884d8') : (isDarkMode ? '#374151' : '#D1D5DB') },
      afternoon: { name: 'Afternoon (12-16)', hours: [12, 13, 14, 15, 16], color: isColorful ? (isDarkMode ? '#065F46' : '#82ca9d') : (isDarkMode ? '#4B5563' : '#9CA3AF') },
      evening: { name: 'Evening (17-21)', hours: [17, 18, 19, 20, 21], color: isColorful ? (isDarkMode ? '#D97706' : '#ffc658') : (isDarkMode ? '#6B7280' : '#6B7280') },
      night: { name: 'Night (22-4)', hours: [22, 23, 0, 1, 2, 3, 4], color: isColorful ? (isDarkMode ? '#1E40AF' : '#4B9CD3') : (isDarkMode ? '#9CA3AF' : '#4B5563') },
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
    
    const passesFilters = (entry) => {
      if (entry.ms_played < minPlayDuration) return false;
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) return false;
      if (fullListenOnly && entry.reason_end !== 'trackdone') return false;
      return true;
    };

    rawPlayData.forEach(entry => {
      if (passesFilters(entry) && entry.master_metadata_album_artist_name) {
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
  }, [rawPlayData, isDarkMode, isColorful, minPlayDuration, skipFilter, fullListenOnly]);
  
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
    <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={modeColors.text}>Time range (leave empty for all day):</span>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <div className="flex items-center gap-2">
            <label className={`text-sm ${modeColors.text}`}>From:</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={`px-2 py-1 border rounded focus:outline-none ${modeColors.input}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className={`text-sm ${modeColors.text}`}>To:</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={`px-2 py-1 border rounded focus:outline-none ${modeColors.input}`}
            />
          </div>
          <button
            onClick={() => {
              setStartTime('');
              setEndTime('');
            }}
            className={`px-3 py-1 text-sm rounded ${modeColors.button}`}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={modeColors.text}>Number of artists (1-99):</span>
        <input
          type="number"
          min="1"
          max="99"
          value={artistLimit}
          onChange={e => setArtistLimit(Math.min(99, Math.max(1, parseInt(e.target.value) || 5)))}
          className={`w-16 px-2 py-1 border rounded focus:outline-none ${modeColors.input}`}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border}`}>
        <h3 className={`font-bold mb-4 ${modeColors.text}`}>Top Artists by Time of Day</h3>
        <p className={`mb-4 ${modeColors.textLight}`}>
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
              <Bar name="Listening Time" dataKey="totalMs" fill={modeColors.barColor} />
              <Bar name="Play Count" dataKey="plays" fill={modeColors.barColorAlt} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`text-sm text-center mt-2 ${modeColors.textLight}`}>
          {periodChartData.length > 0
            ? (!startTime && !endTime)
              ? `These top ${periodChartData.length} artists represent ${topArtistsPercentage}% of your total listening time`
              : `These top ${periodChartData.length} artists represent ${topArtistsPercentage}% of your listening time from ${startTime || '00:00'} to ${endTime || '23:59'}`
            : 'No data available for this time range'}
        </div>
      </div>

      <div>
        <h3 className={`font-bold mb-2 ${modeColors.text}`}>Listening by Hour of Day</h3>
        <p className={`mb-4 ${modeColors.textLight}`}>See when during the day you listen to different artists</p>

        <div className={`h-64 w-full rounded border p-2 ${modeColors.bgCard} ${modeColors.border}`}>
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
              <Bar name="Total Plays" dataKey="totalPlays" fill={modeColors.barColor} />
              <Bar name="Unique Artists" dataKey="uniqueArtists" fill={modeColors.barColorAlt} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className={`font-bold mb-2 ${modeColors.text}`}>Artist Insights by Time</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {periodChartData.slice(0, 4).map((artist, index) => (
            <div key={index} className={`p-3 rounded shadow-sm border relative ${modeColors.bgCard} ${modeColors.border}`}>
              <div className={`font-bold ${modeColors.text}`}>
                {artist.name}
              </div>

              <div className={`text-sm ${modeColors.textLight}`}>
                Total Time: <span className="font-bold">{artist.formattedTime}</span>
                <br/>
                Plays: <span className="font-bold">{artist.plays}</span> tracks
                <br/>
                Average: <span className="font-bold">{formatDuration(artist.avgPlayTime)}</span> per play
              </div>

              <div className={`absolute top-1 right-3 text-[2rem] ${modeColors.text}`}>
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArtistByTimeOfDay;