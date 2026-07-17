import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Label, LabelList } from 'recharts';
import { useTheme } from './themeprovider.js';
import { getAnalysisPageColors, getAnalysisChartTheme } from './theme.js';
import { StatTile, Callout, makePieLabel, donutCenter, tooltipProps, legendProps, axisProps } from './ChartBits.js';
import { RankBadge, RankBar } from './RankCardBits.js';

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
  colorMode = 'minimal',
  trackDurationMap = null
}) => {
  const [activeTab, setActiveTab] = useState('discovery');
  const [timeframe, setTimeframe] = useState('day');

  // Get the current theme
  const { theme, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Page + chart theming (shared with the other analysis pages via theme.js)
  const modeColors = getAnalysisPageColors('orange', isColorful, isDarkMode);
  const chart = getAnalysisChartTheme('orange', isColorful, isDarkMode);
  
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
  } else if (selectedYear.startsWith('all-')) {
    // All-time with month or month+day filter (all-MM or all-MM-DD)
    const parts = selectedYear.split('-');
    if (parts.length === 3) {
      const month = parseInt(parts[1]), day = parseInt(parts[2]);
      return rawPlayData.filter(entry => {
        try {
          const date = new Date(entry.ts);
          if (isNaN(date.getTime())) return false;
          return (date.getMonth() + 1) === month && date.getDate() === day;
        } catch (err) { return false; }
      });
    } else {
      const month = parseInt(parts[1]);
      return rawPlayData.filter(entry => {
        try {
          const date = new Date(entry.ts);
          if (isNaN(date.getTime())) return false;
          return (date.getMonth() + 1) === month;
        } catch (err) { return false; }
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
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) {
        if (!skipEndThreshold || !trackDurationMap) return false;
        const key = `${(entry.master_metadata_track_name || '').toLowerCase().trim()}|||${(entry.master_metadata_album_artist_name || '').toLowerCase().trim()}`;
        const est = trackDurationMap.get(key);
        if (!est || entry.ms_played < est - skipEndThreshold) return false;
      }
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
    
    // Peak discovery month — computed without mutating the chronological chart data
    const peakDiscoveryMonth = newArtistsByMonth.reduce(
      (max, m) => (!max || m.count > max.count ? m : max),
      null
    );

    // Calculate artist loyalty (top 5 vs others)
    const sortedArtists = Object.entries(artistPlayTime)
      .sort((a, b) => b[1] - a[1])
      .map(([name, time]) => ({ name, time }));
    
    const top5Artists = sortedArtists.slice(0, 5);
    const totalPlayTime = sortedArtists.reduce((sum, artist) => sum + artist.time, 0);
    const top5PlayTime = top5Artists.reduce((sum, artist) => sum + artist.time, 0);
    const top5Percentage = Math.round((top5PlayTime / totalPlayTime) * 100);
    
    // Loyalty pie data — slice colors come from the accent ramp at render time
    const otherPlayTime = totalPlayTime - top5PlayTime;
    const loyaltyData = [
      { name: 'Top 5 Artists', value: top5PlayTime },
      { name: 'All Other Artists', value: otherPlayTime }
    ];

    return {
      firstListenDates,
      newArtistsByMonth,
      peakDiscoveryMonth,
      totalArtistsDiscovered: Object.keys(firstListenDates).length,
      loyaltyData,
      top5Artists,
      top5Percentage,
      uniqueArtistsCount: sortedArtists.length,
      artistPlayCounts
    };
  }, [filteredData, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);
  
  // Analyze listening depth
  const depthData = useMemo(() => {
    // Group plays by artist and track
    const artistTracks = {};
    const trackPlays = {};
    
    // Get the earliest and latest dates for filtering
    const passesFilters = (entry) => {
      if (entry.ms_played < minPlayDuration) return false;
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) {
        if (!skipEndThreshold || !trackDurationMap) return false;
        const key = `${(entry.master_metadata_track_name || '').toLowerCase().trim()}|||${(entry.master_metadata_album_artist_name || '').toLowerCase().trim()}`;
        const est = trackDurationMap.get(key);
        if (!est || entry.ms_played < est - skipEndThreshold) return false;
      }
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
  }, [filteredData, discoveryData.artistPlayCounts, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);
  
  // Analyze music variety
  const varietyData = useMemo(() => {
    // Calculate uniqueness ratio by timeframe
    const plays = {};
    const uniqueTracks = {};
    const timeframes = {};
    
    const passesFilters2 = (entry) => {
      if (entry.ms_played < minPlayDuration) return false;
      if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) {
        if (!skipEndThreshold || !trackDurationMap) return false;
        const key = `${(entry.master_metadata_track_name || '').toLowerCase().trim()}|||${(entry.master_metadata_album_artist_name || '').toLowerCase().trim()}`;
        const est = trackDurationMap.get(key);
        if (!est || entry.ms_played < est - skipEndThreshold) return false;
      }
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
  }, [filteredData, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);

  // Listening by release decade, from release_year (user edits on the Your
  // Data tab and MusicBrainz enrichment). Coverage is reported honestly —
  // most libraries only have years for part of the catalog.
  const erasData = useMemo(() => {
    const perDecade = {}; // decade -> { ms, tracks: Set }
    const allTracks = new Set();
    const datedTracks = new Set();
    let oldest = null;

    for (const entry of filteredData) {
      const name = entry.master_metadata_track_name;
      if (!name) continue;
      const trackKey = `${name}|${entry.master_metadata_album_artist_name || ''}`.toLowerCase();
      allTracks.add(trackKey);
      const year = entry.release_year;
      if (!year) continue;
      datedTracks.add(trackKey);
      if (!oldest || year < oldest.year) {
        oldest = { year, name, artist: entry.master_metadata_album_artist_name || '' };
      }
      if ((entry.ms_played || 0) < 30000) continue;
      const decade = Math.floor(year / 10) * 10;
      if (!perDecade[decade]) perDecade[decade] = { ms: 0, tracks: new Set() };
      perDecade[decade].ms += entry.ms_played;
      perDecade[decade].tracks.add(trackKey);
    }

    const decades = Object.keys(perDecade).map(Number).sort((a, b) => a - b);
    const bars = [];
    if (decades.length > 0) {
      // Include empty decades so the time axis isn't misleading
      for (let d = decades[0]; d <= decades[decades.length - 1]; d += 10) {
        const bucket = perDecade[d];
        bars.push({
          decade: `${d}s`,
          ms: bucket?.ms || 0,
          hours: Math.round(((bucket?.ms || 0) / 3600000) * 10) / 10,
          trackCount: bucket?.tracks.size || 0,
        });
      }
    }

    const topDecade = bars.reduce((max, b) => (b.ms > (max?.ms || 0) ? b : max), null);
    return {
      bars,
      topDecade,
      oldest,
      datedTrackCount: datedTracks.size,
      totalTrackCount: allTracks.size,
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

  // Loyalty donut: 2 ramp steps; the legend carries the names, the hole
  // carries the headline share
  const loyaltyColors = chart.ramp(2);
  const loyaltyLabel = makePieLabel({ colors: loyaltyColors, outsideInk: chart.axis });


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

      {/* Desktop layout - title, centered tabs, controls */}
      <div className="hidden sm:flex items-center mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={`text-xl ${modeColors.text} truncate`}>
            {getPageTitle()} <span className="opacity-50">/</span> <span className="text-base">{{ discovery: 'Discovery', loyalty: 'Loyalty', depth: 'Depth', variety: 'Variety', eras: 'Eras' }[activeTab]}</span>
          </h3>
        </div>
        <div className="flex flex-wrap gap-1 items-center justify-center shrink-0">
          <TabButton id="discovery" label="Discovery" />
          <TabButton id="loyalty" label="Loyalty" />
          <TabButton id="depth" label="Depth" />
          <TabButton id="variety" label="Variety" />
          <TabButton id="eras" label="Eras" />
        </div>
        <div className="flex-1 flex justify-end">
          {activeTab === 'variety' && (
            <button
              onClick={() => setTimeframe(timeframe === 'day' ? 'week' : timeframe === 'week' ? 'month' : 'day')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${modeColors.buttonInactive}`}
            >
              {{ day: 'Daily', week: 'Weekly', month: 'Monthly' }[timeframe]}
            </button>
          )}
        </div>
      </div>

      {/* Mobile controls - separate row */}
      <div className="block sm:hidden mb-2">
        <div className="flex flex-wrap gap-1 justify-center">
          <TabButton id="discovery" label="Discovery" />
          <TabButton id="loyalty" label="Loyalty" />
          <TabButton id="depth" label="Depth" />
          <TabButton id="variety" label="Variety" />
          <TabButton id="eras" label="Eras" />
        </div>
      </div>

      {activeTab === 'discovery' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatTile
              label="Total Unique Artists"
              value={discoveryData.uniqueArtistsCount}
              colors={modeColors}
            />
            <StatTile
              label="Average New Artists per Month"
              value={discoveryData.newArtistsByMonth.length > 0 ?
                Math.round(discoveryData.totalArtistsDiscovered / discoveryData.newArtistsByMonth.length) : 0}
              colors={modeColors}
            />
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Artist Discovery Rate</h3>
            <p className={`mb-4 ${modeColors.textLight}`}>New artists discovered over time</p>

            <div className={`h-48 sm:h-64 w-full p-1 sm:p-2 ${modeColors.card}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={discoveryData.newArtistsByMonth}
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis
                    dataKey="month"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    {...axisProps(chart)}
                  />
                  <YAxis {...axisProps(chart)} />
                  <Tooltip
                    formatter={(value) => [value, 'New Artists']}
                    labelFormatter={(value, payload) => payload[0]?.payload?.fullLabel || value}
                    {...tooltipProps(chart)}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={chart.series1}
                    name="New Artists Discovered"
                    strokeWidth={2}
                    dot={{ r: 3, fill: chart.series1 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <Callout icon="🔍" title="Discovery Insights" colors={modeColors}>
            <p>
              {discoveryData.newArtistsByMonth.length > 0 ? (
                <>
                  Your peak discovery month was
                  <span className="font-bold">{' '}
                    {discoveryData.peakDiscoveryMonth?.fullLabel}
                  </span> when you discovered
                  <span className="font-bold">{' '}
                    {discoveryData.peakDiscoveryMonth?.count}
                  </span> new artists.
                </>
              ) : 'No discovery data available.'}
            </p>
            {discoveryData.newArtistsByMonth.length > 6 && (
              <p>
                In the last 6 months, you&apos;ve discovered
                <span className="font-bold">{' '}
                  {discoveryData.newArtistsByMonth.slice(-6).reduce((sum, month) => sum + month.count, 0)}
                </span> new artists.
              </p>
            )}
          </Callout>
        </div>
      )}

      {activeTab === 'loyalty' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Artist Loyalty</h3>
              <p className={`mb-4 ${modeColors.textLight}`}>Your listening time distribution</p>

              <div className={`h-48 sm:h-64 p-1 sm:p-2 ${modeColors.card}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={discoveryData.loyaltyData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="52%"
                      outerRadius="80%"
                      label={loyaltyLabel}
                      labelLine={false}
                      stroke={chart.pieStroke}
                      strokeWidth={2}
                    >
                      {discoveryData.loyaltyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={loyaltyColors[index]} />
                      ))}
                      <Label content={donutCenter({
                        value: `${discoveryData.top5Percentage}%`,
                        caption: 'top 5 artists',
                        ink: chart.axis,
                      })} />
                    </Pie>
                    <Tooltip formatter={(value) => formatDuration(value)} {...tooltipProps(chart)} />
                    <Legend {...legendProps(chart)} />
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
                  <div key={index} className={`p-3 ${modeColors.card} ${modeColors.text}`}>
                    <div className="flex items-center gap-2">
                      <RankBadge rank={index + 1} isDarkMode={isDarkMode} />
                      <span className="font-bold truncate min-w-0" title={artist.name}>{artist.name}</span>
                      <span className={`ml-auto text-sm font-bold shrink-0 ${modeColors.textLight}`}>
                        {Math.round((artist.time / discoveryData.loyaltyData[0].value) * 100)}%
                      </span>
                    </div>
                    <RankBar
                      value={artist.time}
                      max={discoveryData.top5Artists[0]?.time || 0}
                      label={formatDuration(artist.time)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {(() => {
            const p = discoveryData.top5Percentage;
            const [verdict, blurb] =
              p > 75 ? ['super fan', 'You spend most of your time with your favorite artists.'] :
              p > 50 ? ['loyal listener', 'You balance favorites with musical exploration.'] :
              p > 30 ? ['eclectic explorer', 'You enjoy variety and discovering new music.'] :
              ['music adventurer', 'You rarely stick to the same artists for long.'];
            return (
              <Callout icon="❤️" title="Loyalty Profile" verdict={verdict} colors={modeColors}>
                <p>{blurb} Your top 5 artists account for {p}% of your listening time.</p>
              </Callout>
            );
          })()}
        </div>
      )}
      
      {activeTab === 'depth' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatTile
              label="Average Listening Depth Score"
              value={`${depthData.averageDepth} / 100`}
              sub="Higher scores indicate deeper exploration of artists' catalogs"
              colors={modeColors}
            />
            <StatTile
              label="Most Explored Artist"
              value={depthData.artistDepths[0]?.name || "N/A"}
              sub={depthData.artistDepths[0] ?
                `${depthData.artistDepths[0].uniqueTracks} unique tracks listened to` : ""}
              colors={modeColors}
            />
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Artist Catalog Depth</h3>
            <p className={`mb-4 ${modeColors.textLight}`}>Unique tracks you&apos;ve played per artist, for your most-played artists</p>

            <div className={`h-64 sm:h-80 w-full p-1 sm:p-2 ${modeColors.card}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...depthData.artistDepths].sort((a, b) => b.uniqueTracks - a.uniqueTracks).slice(0, 10)}
                  margin={{ top: 5, right: 45, left: 8, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={false} />
                  <XAxis type="number" {...axisProps(chart)} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    {...axisProps(chart)}
                    tick={{ fill: chart.axis, fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, name, props) => [
                      `${value} unique tracks across ${props.payload.totalPlays.toLocaleString()} plays`,
                      'Catalog depth',
                    ]}
                    {...tooltipProps(chart)}
                  />
                  <Bar dataKey="uniqueTracks" fill={chart.series1} radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="uniqueTracks"
                      position="right"
                      fill={chart.axis}
                      fontSize={10}
                      fontWeight={700}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Replay Value Kings</h3>
            <p className={`mb-4 ${modeColors.textLight}`}>Your most repeated tracks</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {depthData.replayValue.map((track, index) => {
                // trackPlays keys are "Artist - Track"
                const sep = track.track.indexOf(' - ');
                const artist = sep > 0 ? track.track.slice(0, sep) : '';
                const title = sep > 0 ? track.track.slice(sep + 3) : track.track;
                return (
                  <div key={index} className={`p-3 ${modeColors.card} ${modeColors.text}`}>
                    <div className="flex items-center gap-2">
                      <RankBadge rank={index + 1} isDarkMode={isDarkMode} />
                      <div className="min-w-0">
                        <div className="font-bold truncate" title={title}>{title}</div>
                        {artist && <div className={`text-xs truncate ${modeColors.textLight}`}>{artist}</div>}
                      </div>
                    </div>
                    <RankBar
                      value={track.plays}
                      max={depthData.replayValue[0]?.plays || 0}
                      label={`${track.plays} plays`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'eras' && (
        <div className="space-y-6">
          {erasData.datedTrackCount === 0 ? (
            <Callout icon="📅" title="No release years yet" colors={modeColors}>
              <p>
                This page shows which musical eras you listen to, based on each song&apos;s release year —
                but none of your tracks have one yet.
              </p>
              <p>
                Add years on the <span className="font-bold">Your Data</span> tab (pencil icon on any track),
                or enable album enrichment on the Upload tab and re-process — MusicBrainz lookups now fill in
                release years automatically where they can.
              </p>
            </Callout>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatTile
                  label="Most-Listened Decade"
                  value={erasData.topDecade ? erasData.topDecade.decade : '—'}
                  sub={erasData.topDecade ? `${formatDuration(erasData.topDecade.ms)} across ${erasData.topDecade.trackCount} song${erasData.topDecade.trackCount === 1 ? '' : 's'}` : ''}
                  colors={modeColors}
                />
                <StatTile
                  label="Oldest Song Played"
                  value={erasData.oldest ? String(erasData.oldest.year) : '—'}
                  sub={erasData.oldest ? `${erasData.oldest.name}${erasData.oldest.artist ? ` — ${erasData.oldest.artist}` : ''}` : ''}
                  colors={modeColors}
                />
                <StatTile
                  label="Songs With a Known Year"
                  value={`${Math.round((erasData.datedTrackCount / Math.max(1, erasData.totalTrackCount)) * 100)}%`}
                  sub={`${erasData.datedTrackCount.toLocaleString()} of ${erasData.totalTrackCount.toLocaleString()} tracks`}
                  colors={modeColors}
                />
              </div>

              <div>
                <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Listening Time by Release Decade</h3>
                <p className={`mb-4 ${modeColors.textLight}`}>When the music you play was originally released</p>

                <div className={`h-64 sm:h-80 w-full p-1 sm:p-2 ${modeColors.card}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={erasData.bars}
                      margin={{ top: 20, right: 10, left: 8, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                      <XAxis dataKey="decade" {...axisProps(chart)} />
                      <YAxis
                        {...axisProps(chart)}
                        label={{ value: 'hours', angle: -90, position: 'insideLeft', fill: chart.axis, fontSize: 10 }}
                      />
                      <Tooltip
                        formatter={(value, name, props) => [
                          `${formatDuration(props.payload.ms)} across ${props.payload.trackCount} song${props.payload.trackCount === 1 ? '' : 's'}`,
                          'Listened',
                        ]}
                        {...tooltipProps(chart)}
                      />
                      <Bar dataKey="hours" fill={chart.series1} radius={[4, 4, 0, 0]}>
                        <LabelList
                          dataKey="hours"
                          position="top"
                          fill={chart.axis}
                          fontSize={10}
                          fontWeight={700}
                          formatter={(v) => (v > 0 ? `${v}h` : '')}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {erasData.datedTrackCount < erasData.totalTrackCount && (
                <Callout icon="🧮" title="Partial picture" colors={modeColors}>
                  <p>
                    Only songs with a known release year are counted here
                    ({erasData.datedTrackCount.toLocaleString()} of {erasData.totalTrackCount.toLocaleString()} tracks).
                    Add more years on the <span className="font-bold">Your Data</span> tab, or enable album
                    enrichment on the Upload tab to fill some in automatically.
                  </p>
                </Callout>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'variety' && (
        <div className="space-y-6">
          <div className="flex justify-center gap-3 mb-4 overflow-x-auto pb-1 sm:hidden">
            <TimeframeButton id="day" label="Daily" />
            <TimeframeButton id="week" label="Weekly" />
            <TimeframeButton id="month" label="Monthly" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatTile
              label="Daily Variety Score"
              value={`${Math.round(varietyData.avgDailyVariety)}%`}
              sub="Average percentage of unique tracks in a day"
              colors={modeColors}
            />
            <StatTile
              label="Weekly Variety Score"
              value={`${Math.round(varietyData.avgWeeklyVariety)}%`}
              sub="Average percentage of unique tracks in a week"
              colors={modeColors}
            />
            <StatTile
              label="Monthly Variety Score"
              value={`${Math.round(varietyData.avgMonthlyVariety)}%`}
              sub="Average percentage of unique tracks in a month"
              colors={modeColors}
            />
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Music Variety Over Time</h3>
            <p className={`mb-4 ${modeColors.textLight}`}>
              Higher percentages indicate more unique tracks (less repetition)
            </p>

            <div className={`h-48 sm:h-64 w-full p-1 sm:p-2 ${modeColors.card}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={
                    timeframe === 'day' ? varietyData.dailyVariety :
                    timeframe === 'week' ? varietyData.weeklyVariety :
                    varietyData.monthlyVariety
                  }
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis
                    dataKey={timeframe === 'month' ? 'label' : 'timeframe'}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    {...axisProps(chart)}
                  />
                  <YAxis domain={[0, 100]} {...axisProps(chart)} />
                  <Tooltip
                    formatter={(value) => [`${value.toFixed(1)}%`, 'Variety Score']}
                    labelFormatter={(value, payload) => {
                      if (timeframe === 'week' || timeframe === 'month') {
                        return payload[0]?.payload?.label || value;
                      }
                      return new Date(value).toLocaleDateString();
                    }}
                    {...tooltipProps(chart)}
                  />
                  <Line
                    type="monotone"
                    dataKey="varietyScore"
                    stroke={chart.series1}
                    name="Variety Score"
                    strokeWidth={2}
                    dot={{ r: 3, fill: chart.series1 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {(() => {
            const avg = Math.round(
              (varietyData.avgDailyVariety + varietyData.avgWeeklyVariety + varietyData.avgMonthlyVariety) / 3
            );
            const [verdict, blurb] =
              avg > 80 ? ['variety seeker', 'You rarely repeat the same tracks and constantly explore new music.'] :
              avg > 60 ? ['diverse taste', 'You keep a good balance between favorites and new discoveries.'] :
              avg > 40 ? ['balanced listener', 'You enjoy both familiar tracks and occasional new music.'] :
              ['comfort listener', 'You stick to favorite tracks and enjoy repeating them.'];
            return (
              <Callout icon="🎲" title="Variety Profile" verdict={verdict} colors={modeColors}>
                <p>{blurb} On average, {avg}% of what you play in a stretch is unique tracks.</p>
              </Callout>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default DiscoveryAnalysis;