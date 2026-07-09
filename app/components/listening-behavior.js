import React, { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, ScatterChart, Scatter, ZAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label, LabelList } from 'recharts';
import ArtistByTimeOfDay from './ArtistByTimeOfDay.js';
import { useTheme } from './themeprovider.js';
import { getAnalysisPageColors, getAnalysisChartTheme } from './theme.js';
import { StatTile, makePieLabel, donutCenter, tooltipProps, legendProps, axisProps } from './ChartBits.js';
import {
  COUNTRY_CAPITALS, categorizeWeatherCode, broadWeatherCategory, tempBucket,
  TEMP_BUCKETS, WEATHER_COLORS, TEMP_COLORS,
  geocodeCity, fetchAllWeather
} from './weather-utils.js';

// Removed exported variables to prevent conflicts with SpotifyAnalyzer state management

const IPHONE_MODELS = {
  'iPhone1,1': 'iPhone', 'iPhone1,2': 'iPhone 3G',
  'iPhone2,1': 'iPhone 3GS',
  'iPhone3,1': 'iPhone 4', 'iPhone3,2': 'iPhone 4', 'iPhone3,3': 'iPhone 4',
  'iPhone4,1': 'iPhone 4S',
  'iPhone5,1': 'iPhone 5', 'iPhone5,2': 'iPhone 5', 'iPhone5,3': 'iPhone 5c', 'iPhone5,4': 'iPhone 5c',
  'iPhone6,1': 'iPhone 5s', 'iPhone6,2': 'iPhone 5s',
  'iPhone7,1': 'iPhone 6 Plus', 'iPhone7,2': 'iPhone 6',
  'iPhone8,1': 'iPhone 6s', 'iPhone8,2': 'iPhone 6s Plus', 'iPhone8,4': 'iPhone SE',
  'iPhone9,1': 'iPhone 7', 'iPhone9,2': 'iPhone 7 Plus', 'iPhone9,3': 'iPhone 7', 'iPhone9,4': 'iPhone 7 Plus',
  'iPhone10,1': 'iPhone 8', 'iPhone10,2': 'iPhone 8 Plus', 'iPhone10,3': 'iPhone X',
  'iPhone10,4': 'iPhone 8', 'iPhone10,5': 'iPhone 8 Plus', 'iPhone10,6': 'iPhone X',
  'iPhone11,2': 'iPhone XS', 'iPhone11,4': 'iPhone XS Max', 'iPhone11,6': 'iPhone XS Max', 'iPhone11,8': 'iPhone XR',
  'iPhone12,1': 'iPhone 11', 'iPhone12,3': 'iPhone 11 Pro', 'iPhone12,5': 'iPhone 11 Pro Max', 'iPhone12,8': 'iPhone SE 2',
  'iPhone13,1': 'iPhone 12 mini', 'iPhone13,2': 'iPhone 12', 'iPhone13,3': 'iPhone 12 Pro', 'iPhone13,4': 'iPhone 12 Pro Max',
  'iPhone14,2': 'iPhone 13 Pro', 'iPhone14,3': 'iPhone 13 Pro Max', 'iPhone14,4': 'iPhone 13 mini', 'iPhone14,5': 'iPhone 13',
  'iPhone14,6': 'iPhone SE 3', 'iPhone14,7': 'iPhone 14', 'iPhone14,8': 'iPhone 14 Plus',
  'iPhone15,2': 'iPhone 14 Pro', 'iPhone15,3': 'iPhone 14 Pro Max', 'iPhone15,4': 'iPhone 15', 'iPhone15,5': 'iPhone 15 Plus',
  'iPhone16,1': 'iPhone 15 Pro', 'iPhone16,2': 'iPhone 15 Pro Max',
};

function extractIPhoneModel(raw) {
  if (!raw) return null;
  const match = raw.match(/\((iPhone\d+,\d+)\)/);
  if (match) return IPHONE_MODELS[match[1]] || match[1];
  return null;
}

// Human labels for Spotify's reason_start / reason_end enums — the raw values
// (fwdbtn, trackdone, …) should never reach the UI.
const REASON_LABELS = {
  trackdone: 'Track finished',
  fwdbtn: 'Skip button',
  backbtn: 'Back button',
  clickrow: 'Clicked a song',
  clickside: 'Clicked in sidebar',
  appload: 'App opened',
  playbtn: 'Play button',
  remote: 'Remote control',
  trackerror: 'Track error',
  endplay: 'Stopped playback',
  logout: 'Logged out',
  'unexpected-exit': 'App closed',
  'unexpected-exit-while-paused': 'Closed while paused',
  popup: 'Popup',
  uriopen: 'Opened via link',
  'switched-to-audiocast': 'Switched to cast',
  unknown: 'Unknown',
  undefined: 'Unknown',
  '': 'Unknown',
};

function reasonLabel(reason) {
  const key = String(reason ?? '').trim();
  if (REASON_LABELS[key]) return REASON_LABELS[key];
  const pretty = key.replace(/[-_]+/g, ' ');
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

// Top 7 reasons + an aggregated "Other" row, with share-of-total percentages.
function foldReasons(counts, total) {
  const rows = Object.entries(counts)
    .map(([reason, count]) => ({
      name: reasonLabel(reason),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
  if (rows.length <= 8) return rows;
  const rest = rows.slice(7);
  const restCount = rest.reduce((sum, r) => sum + r.count, 0);
  return [
    ...rows.slice(0, 7),
    { name: 'Other', count: restCount, percentage: total > 0 ? Math.round((restCount / total) * 100) : 0 },
  ];
}

function categorizePlatform(raw) {
  if (!raw) return 'Unknown';
  const p = raw.toLowerCase();

  // "iOS 15.5 (iPhone14,5)" / "iOS 14.6 (iPad8,11)" / "iOS 12.4.9 (iPod7,1)"
  // Extract the device type from parentheses
  if (p.startsWith('ios ')) {
    const match = raw.match(/\((iPhone|iPad|iPod)/i);
    if (match) return match[1].startsWith('iPhone') ? 'iPhone' : match[1].startsWith('iPad') ? 'iPad' : 'iPod';
    return 'iPhone'; // bare "iOS x.x" without device → likely iPhone
  }

  // "Android OS 9 API 28 (motorola, ...)" / "Android-tablet OS ..."
  if (p.startsWith('android')) return 'Android';

  // "Windows 10 (...)" / "Windows XP (...)"
  if (p.startsWith('windows')) return 'Windows';

  // "OS X 10.12.6 [x86 4]"
  if (p.startsWith('os x') || p.startsWith('macos')) return 'Mac';

  // "web_player windows 10;chrome 83..." / "WebPlayer (websocket RFC6455)"
  if (p.startsWith('web_player') || p.startsWith('webplayer')) return 'Web Player';

  // "Partner google cast_tv;Chromecast;;" / "Partner SCEI sony_tv;ps4;;" / etc.
  if (p.startsWith('partner ')) {
    if (p.includes('cast_tv') || p.includes('chromecast')) return 'Chromecast';
    if (p.includes('scei') || p.includes('ps4') || p.includes('playstation')) return 'PlayStation';
    if (p.includes('applewatch')) return 'Apple Watch';
    if (p.includes('denon') || p.includes('marantz') || p.includes('heos')) return 'Denon/Marantz';
    if (p.includes('android_tv')) return 'Smart TV';
    if (p.includes('spotify')) return 'Web Player';
    if (p.includes('ios_sdk')) return 'iPhone';
    return 'Other';
  }

  // Simple keyword matches
  const keywords = {
    'ios': 'iPhone', 'osx': 'Mac', 'cast': 'Chromecast',
    'playstation': 'PlayStation', 'ipod': 'iPod',
    'tidal': 'Tidal', 'soundcloud': 'SoundCloud',
    'not_applicable': 'Other', 'unknown': 'Unknown',
  };
  if (keywords[p]) return keywords[p];
  if (p.startsWith('deezer')) return 'Deezer';

  return 'Other';
}

const ListeningBehavior = ({
  rawPlayData = [],
  formatDuration,
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  colorTheme = 'indigo',
  colorMode = 'minimal',
  trackDurationMap = null
}) => {
  const [activeTab, setActiveTab] = useState('behavior');

  // Defer heavy computations to prevent blocking during tab switch
  const deferredRawPlayData = useDeferredValue(rawPlayData);
  const deferredActiveTab = useDeferredValue(activeTab);
  // Use selectedYear if it's a specific date (YYYY-MM-DD), otherwise use today
  const [selectedDate, setSelectedDate] = useState(() => {
    if (selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3 && !selectedYear.startsWith('all-')) {
      return selectedYear; // Use the date from year selector
    }
    return null; // No automatic date selection
  });

  // Weather tab state
  const [weatherData, setWeatherData] = useState({});
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherProgress, setWeatherProgress] = useState({ loaded: 0, total: 0 });
  const [weatherError, setWeatherError] = useState('');
  const [homeCity, setHomeCity] = useState(() => {
    try {
      const saved = localStorage.getItem('weatherHomeCity');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [citySearch, setCitySearch] = useState('');
  const [cityResults, setCityResults] = useState([]);
  const [citySearching, setCitySearching] = useState(false);
  const [expandedWeatherCards, setExpandedWeatherCards] = useState({});

  // Get the current theme
  const { theme, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Page + chart theming (shared with the other analysis pages via theme.js)
  const modeColors = getAnalysisPageColors('amber', isColorful, isDarkMode);
  const chart = useMemo(
    () => getAnalysisChartTheme('amber', isColorful, isDarkMode),
    [isColorful, isDarkMode]
  );

// Update the filteredData useMemo in ListeningBehavior.js
const filteredData = useMemo(() => {
  // Use deferred data for non-blocking computation
  const dataToUse = deferredRawPlayData;
  
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
        return dataToUse.filter(entry => {
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
        
        return dataToUse.filter(entry => {
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
      
      return dataToUse.filter(entry => {
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
      return dataToUse.filter(entry => {
        try {
          const date = new Date(entry.ts);
          if (isNaN(date.getTime())) return false;
          return (date.getMonth() + 1) === month && date.getDate() === day;
        } catch (err) { return false; }
      });
    } else {
      const month = parseInt(parts[1]);
      return dataToUse.filter(entry => {
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
      return dataToUse.filter(entry => {
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
      return dataToUse.filter(entry => {
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
    return dataToUse;
  }
}, [deferredRawPlayData, selectedYear, yearRangeMode, yearRange]);
  
  // Add loading state for heavy computations
  const [isComputing, setIsComputing] = useState(false);
  
  // Analyze user behavior (skips, shuffle, etc.) - only compute for active behavior tab
  const behaviorData = useMemo(() => {
    if (deferredActiveTab !== 'behavior' && activeTab !== 'behavior') {
      return { shuffleData: [], skipData: [], endReasons: [], startReasons: [], platformData: [] };
    }
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
        
        // Count platform usage (categorized)
        const platform = categorizePlatform(entry.platform);
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
    
    // Pie data — slice colors from the accent ramp
    const shuffle2 = chart.ramp(2);
    const shuffleData = [
      { name: 'Shuffle On', value: shufflePlays, color: shuffle2[0] },
      { name: 'Shuffle Off', value: normalPlays, color: shuffle2[1] }
    ];

    const skip3 = chart.ramp(3);
    const skipData = [
      { name: 'Completed', value: completedTracks, color: skip3[0] },
      { name: 'Skipped', value: skippedTracks, color: skip3[1] },
      { name: 'Other End', value: totalTracks - completedTracks - skippedTracks, color: skip3[2] }
    ];
    
    // Format reasons for bar charts — human labels, top 7 + "Other"
    const endReasons = foldReasons(reasonEndCounts, totalTracks);
    const startReasons = foldReasons(reasonStartCounts, totalTracks);
    
    // Format platforms for bar chart
    const platformData = Object.entries(platforms).map(([platform, count]) => ({
      name: platform,
      count,
      percentage: Math.round((count / totalTracks) * 100)
    })).sort((a, b) => b.count - a.count);

    // Build platform timeline data (scatter plot: dots per day per platform)
    const platformNames = Object.entries(platforms)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
    const platformIndexMap = {};
    platformNames.forEach((name, i) => { platformIndexMap[name] = i; });

    const dayPlatformCounts = {};
    const iphoneModelsSet = new Set();
    filteredData.forEach(entry => {
      if (entry.ms_played >= 1000) {
        const platform = categorizePlatform(entry.platform);
        const model = platform === 'iPhone' ? (extractIPhoneModel(entry.platform) || 'iPhone') : null;
        if (model) iphoneModelsSet.add(model);
        const d = new Date(entry.ts);
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const key = model ? `${dayKey}|${model}` : `${dayKey}|${platform}`;
        if (!dayPlatformCounts[key]) {
          dayPlatformCounts[key] = { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(), platform, count: 0, model };
        }
        dayPlatformCounts[key].count++;
      }
    });
    const iphoneModels = [...iphoneModelsSet].sort((a, b) => {
      const na = a.match(/\d+/) ? parseInt(a.match(/\d+/)[0]) : 0;
      const nb = b.match(/\d+/) ? parseInt(b.match(/\d+/)[0]) : 0;
      return na - nb || a.localeCompare(b);
    });
    const platformTimeline = Object.values(dayPlatformCounts).map(d => ({
      ...d,
      platformIndex: platformIndexMap[d.platform]
    }));

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
      platformData,
      platformTimeline,
      platformNames,
      iphoneModels
    };
  }, [filteredData, deferredActiveTab, activeTab, chart]);
  
  // Analyze listening sessions - only compute for active sessions tab
  const sessionData = useMemo(() => {
    if (deferredActiveTab !== 'sessions' && activeTab !== 'sessions') {
      return { sessions: [], sessionLengths: [], totalSessions: 0, durationGroups: [] };
    }
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
    sortedEntries.forEach(entry => {
      if (!passesFilters(entry)) return;
      
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
    
    // Group sessions by duration - grey in minimal mode, colorful otherwise
    const duration5 = chart.ramp(5);
    const durationGroups = [
      { name: "< 15 min", count: 0, color: duration5[0] },
      { name: "15-30 min", count: 0, color: duration5[1] },
      { name: "30-60 min", count: 0, color: duration5[2] },
      { name: "1-2 hours", count: 0, color: duration5[3] },
      { name: "> 2 hours", count: 0, color: duration5[4] }
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
  }, [filteredData, chart, deferredActiveTab, activeTab, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);

  // Update selectedDate when selectedYear changes to a specific date
  React.useEffect(() => {
    if (selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3 && !selectedYear.startsWith('all-')) {
      setSelectedDate(selectedYear);
    }
  }, [selectedYear]);

  // --- Weather tab handlers ---
  const handleCitySearch = useCallback(async () => {
    if (!citySearch.trim()) return;
    setCitySearching(true);
    setCityResults([]);
    try {
      const results = await geocodeCity(citySearch.trim());
      setCityResults(results);
    } catch (e) {
      setWeatherError('City search failed: ' + e.message);
    } finally {
      setCitySearching(false);
    }
  }, [citySearch]);

  const handleSelectCity = useCallback((city) => {
    const saved = { name: city.name, lat: city.lat, lon: city.lon, country: city.country, admin1: city.admin1 };
    setHomeCity(saved);
    localStorage.setItem('weatherHomeCity', JSON.stringify(saved));
    setCityResults([]);
    setCitySearch('');
    setWeatherData({});
  }, []);

  const handleFetchWeather = useCallback(async () => {
    if (!homeCity) return;
    setWeatherLoading(true);
    setWeatherError('');
    setWeatherProgress({ loaded: 0, total: 0 });
    try {
      // Build play list with date + country from filteredData
      const plays = [];
      const seen = new Set();
      filteredData.forEach(entry => {
        if (!entry.ts || entry.ms_played < 1000) return;
        const d = new Date(entry.ts);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const country = entry.conn_country || homeCity.country;
        const key = dateStr + '|' + country;
        if (!seen.has(key)) {
          seen.add(key);
          plays.push({ date: dateStr, country });
        }
      });

      const data = await fetchAllWeather(plays, homeCity, (loaded, total) => {
        setWeatherProgress({ loaded, total });
      });
      setWeatherData(data);
    } catch (e) {
      setWeatherError('Failed to fetch weather: ' + e.message);
    } finally {
      setWeatherLoading(false);
    }
  }, [homeCity, filteredData]);

  // Weather analysis — join filteredData with weatherData
  const weatherAnalysis = useMemo(() => {
    if (deferredActiveTab !== 'weather' && activeTab !== 'weather') {
      return null;
    }
    const wKeys = Object.keys(weatherData);
    if (wKeys.length === 0) return null;

    const categoryStats = {}; // category → {plays, msPlayed, artists:{}, songs:{}}
    const tempBucketStats = {}; // bucket → {plays, msPlayed}

    filteredData.forEach(entry => {
      if (entry.ms_played < 1000) return;
      const d = new Date(entry.ts);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const country = entry.conn_country || (homeCity ? homeCity.country : '');
      const wKey = dateStr + '|' + country;
      const w = weatherData[wKey];
      if (!w) return;

      // Weather category
      const cat = broadWeatherCategory(w.code);
      if (!categoryStats[cat]) categoryStats[cat] = { plays: 0, msPlayed: 0, artists: {}, songs: {} };
      categoryStats[cat].plays++;
      categoryStats[cat].msPlayed += entry.ms_played;

      const artistName = entry.master_metadata_album_artist_name || 'Unknown';
      const trackName = entry.master_metadata_track_name || 'Unknown';
      categoryStats[cat].artists[artistName] = (categoryStats[cat].artists[artistName] || 0) + 1;
      const songKey = `${trackName} — ${artistName}`;
      categoryStats[cat].songs[songKey] = (categoryStats[cat].songs[songKey] || 0) + 1;

      // Temperature bucket
      if (w.tempMax != null) {
        const bucket = tempBucket(w.tempMax);
        if (!tempBucketStats[bucket]) tempBucketStats[bucket] = { plays: 0, msPlayed: 0 };
        tempBucketStats[bucket].plays++;
        tempBucketStats[bucket].msPlayed += entry.ms_played;
      }
    });

    // Pie chart data
    const pieData = Object.entries(categoryStats)
      .filter(([, s]) => s.plays > 0)
      .map(([cat, s]) => ({
        name: cat,
        value: s.plays,
        hours: Math.round(s.msPlayed / 3600000 * 10) / 10,
        color: WEATHER_COLORS[cat] || '#999',
      }))
      .sort((a, b) => b.value - a.value);

    // Top artists/songs per category
    const categoryDetails = {};
    for (const [cat, s] of Object.entries(categoryStats)) {
      const allSongsSorted = Object.entries(s.songs).sort((a, b) => b[1] - a[1]);
      categoryDetails[cat] = {
        plays: s.plays,
        hours: Math.round(s.msPlayed / 3600000 * 10) / 10,
        topArtists: Object.entries(s.artists).sort((a, b) => b[1] - a[1]).slice(0, 5),
        topSongs: allSongsSorted.slice(0, 5),
        playlist: allSongsSorted.slice(0, 20),
      };
    }

    // Temperature bar chart
    const tempData = TEMP_BUCKETS.map(bucket => ({
      name: bucket,
      hours: tempBucketStats[bucket] ? Math.round(tempBucketStats[bucket].msPlayed / 3600000 * 10) / 10 : 0,
      plays: tempBucketStats[bucket] ? tempBucketStats[bucket].plays : 0,
      color: TEMP_COLORS[bucket],
    }));

    // Rainy vs Sunny
    const rainy = categoryStats['Rain'] || { plays: 0, msPlayed: 0, artists: {} };
    const sunny = categoryStats['Clear'] || { plays: 0, msPlayed: 0, artists: {} };
    const rainyVsSunny = {
      rainy: {
        plays: rainy.plays,
        hours: Math.round(rainy.msPlayed / 3600000 * 10) / 10,
        topArtists: Object.entries(rainy.artists).sort((a, b) => b[1] - a[1]).slice(0, 5),
      },
      sunny: {
        plays: sunny.plays,
        hours: Math.round(sunny.msPlayed / 3600000 * 10) / 10,
        topArtists: Object.entries(sunny.artists).sort((a, b) => b[1] - a[1]).slice(0, 5),
      },
    };

    const totalPlays = pieData.reduce((sum, d) => sum + d.value, 0);

    return { pieData, categoryDetails, tempData, rainyVsSunny, totalPlays };
  }, [filteredData, weatherData, deferredActiveTab, activeTab, homeCity]);

  // Pie slice % labels — ink picked per slice, thin slices labeled outside
  const renderCustomizedLabel = useMemo(() => makePieLabel({ outsideInk: chart.axis }), [chart]);

  // Memoized donut with a headline stat in the hole; used for shuffle,
  // completion, session-duration, and weather pies.
  const DonutChart = React.memo(({ data, center, chartKey, isDarkMode, colorTheme, tooltipFormatter }) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart key={`pie-${chartKey}-${isDarkMode}-${colorTheme}`}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="52%"
          outerRadius="80%"
          labelLine={false}
          label={renderCustomizedLabel}
          stroke={chart.pieStroke}
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          {center && <Label content={donutCenter({ ...center, ink: chart.axis })} />}
        </Pie>
        <Tooltip formatter={tooltipFormatter || ((value) => value)} {...tooltipProps(chart)} />
        <Legend {...legendProps(chart)} />
      </PieChart>
    </ResponsiveContainer>
  ));

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
      return <span>Listening Behavior <span className="text-xs opacity-75">{yearRange.startYear}-{yearRange.endYear}</span></span>;
    } else if (selectedYear === 'all') {
      return <span>Listening Behavior <span className="text-xs opacity-75">all-time</span></span>;
    } else {
      return <span>Listening Behavior <span className="text-xs opacity-75">{selectedYear}</span></span>;
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

      {/* Desktop layout - title, centered tabs, controls */}
      <div className="hidden sm:flex items-center mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={`text-xl ${modeColors.text} truncate`}>
            {getPageTitle()} <span className="opacity-50">/</span> <span className="text-base">{{ behavior: 'Behavior', sessions: 'Sessions', artistsTime: 'Artists by Time', weather: 'Weather' }[activeTab]}</span>
          </h3>
        </div>
        <div className="flex flex-wrap gap-1 items-center justify-center shrink-0">
          <TabButton id="behavior" label="Behavior" />
          <TabButton id="sessions" label="Sessions" />
          <TabButton id="artistsTime" label="Artists by Time" />
          <TabButton id="weather" label="Weather" />
        </div>
        <div className="flex-1"></div>
      </div>

      {/* Mobile controls - separate row */}
      <div className="block sm:hidden mb-2">
        <div className="flex flex-wrap gap-1">
          <TabButton id="behavior" label="Behavior" />
          <TabButton id="sessions" label="Sessions" />
          <TabButton id="artistsTime" label="By Time" />
          <TabButton id="weather" label="Weather" />
        </div>
      </div>

      {activeTab === 'behavior' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Shuffle vs. Normal Play</h3>
              <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                <DonutChart
                  data={behaviorData.shuffleData}
                  center={{ value: `${behaviorData.shufflePercentage}%`, caption: 'shuffle on' }}
                  chartKey="shuffle"
                  isDarkMode={isDarkMode}
                  colorTheme={colorTheme}
                />
              </div>

              <div className={`text-sm text-center mt-2 ${modeColors.textLight}`}>
                You listen in shuffle mode {behaviorData.shufflePercentage}% of the time
              </div>
            </div>

            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Track Completion</h3>
              <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                <DonutChart
                  data={behaviorData.skipData}
                  center={{ value: `${behaviorData.completedPercentage}%`, caption: 'completed' }}
                  chartKey="completion"
                  isDarkMode={isDarkMode}
                  colorTheme={colorTheme}
                />
              </div>
              <div className={`text-sm text-center mt-2 ${modeColors.textLight}`}>
                You completed {behaviorData.completedPercentage}% of tracks, skipped {behaviorData.skippedPercentage}%
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>How You Start Tracks</h3>
            <div className={`h-64 sm:h-80 w-full rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={behaviorData.startReasons}
                  layout="vertical"
                  margin={{ top: 5, right: 45, left: 8, bottom: 5 }}
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
                    formatter={(value, name, props) => [`${value.toLocaleString()} plays (${props.payload.percentage}%)`, 'Started']}
                    {...tooltipProps(chart)}
                  />
                  <Bar dataKey="count" fill={chart.series1} radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="percentage"
                      position="right"
                      formatter={(v) => `${v}%`}
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
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>How Tracks End</h3>
            <div className={`h-64 sm:h-80 w-full rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={behaviorData.endReasons}
                  layout="vertical"
                  margin={{ top: 5, right: 45, left: 8, bottom: 5 }}
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
                    formatter={(value, name, props) => [`${value.toLocaleString()} plays (${props.payload.percentage}%)`, 'Ended']}
                    {...tooltipProps(chart)}
                  />
                  <Bar dataKey="count" fill={chart.series1} radius={[0, 4, 4, 0]}>
                    <LabelList
                      dataKey="percentage"
                      position="right"
                      formatter={(v) => `${v}%`}
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
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Platforms Used</h3>
            <div className={`h-72 sm:h-96 w-full rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis
                    type="number"
                    dataKey="date"
                    domain={['dataMin', 'dataMax']}
                    ticks={(() => {
                      const pts = behaviorData.platformTimeline || [];
                      if (!pts.length) return [];
                      let minY = Infinity, maxY = -Infinity;
                      pts.forEach(p => { const y = new Date(p.date).getFullYear(); if (y < minY) minY = y; if (y > maxY) maxY = y; });
                      const ticks = [];
                      for (let y = minY; y <= maxY; y++) ticks.push(new Date(y, 0, 1).getTime());
                      return ticks;
                    })()}
                    tickFormatter={(ts) => new Date(ts).getFullYear()}
                    stroke={chart.axis}
                    tick={{ fill: chart.axis, fontSize: 10 }}
                    name="Date"
                  />
                  <YAxis
                    type="number"
                    dataKey="platformIndex"
                    domain={[-0.5, (behaviorData.platformNames?.length || 1) - 0.5]}
                    ticks={behaviorData.platformNames?.map((_, i) => i) || []}
                    tickFormatter={(i) => behaviorData.platformNames?.[i] || ''}
                    stroke={chart.axis}
                    tick={{ fill: chart.axis, fontSize: 10 }}
                    width={80}
                    name="Platform"
                  />
                  <ZAxis type="number" dataKey="count" range={[20, 200]} name="Plays" />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload;
                      const date = new Date(d.date);
                      return (
                        <div style={{
                          ...chart.tooltip,
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          <div style={{ fontWeight: 'bold' }}>{d.model || d.platform}</div>
                          <div>{date.toLocaleDateString()}</div>
                          <div>{d.count} play{d.count !== 1 ? 's' : ''}</div>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  {(() => {
                    const scatterColors = isColorful
                      ? ['#8884d8', '#82ca9d', '#ff8042', '#00C49F', '#FFBB28', '#FF6B6B', '#4ECDC4', '#A855F7']
                      : isDarkMode
                        ? ['#9CA3AF', '#6B7280', '#D1D5DB', '#4B5563', '#E5E7EB', '#374151', '#F3F4F6', '#1F2937']
                        : ['#6B7280', '#9CA3AF', '#374151', '#D1D5DB', '#4B5563', '#E5E7EB', '#1F2937', '#F3F4F6'];
                    const iphoneColors = isColorful
                      ? ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#14B8A6']
                      : isDarkMode
                        ? ['#F9FAFB', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#F3F4F6', '#111827']
                        : ['#111827', '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB'];
                    const scatters = [];
                    let colorIdx = 0;
                    behaviorData.platformNames?.forEach((platform, i) => {
                      if (platform === 'iPhone') {
                        (behaviorData.iphoneModels || []).forEach((model, mi) => {
                          scatters.push(
                            <Scatter
                              key={model}
                              name={model}
                              data={behaviorData.platformTimeline?.filter(d => d.model === model) || []}
                              fill={iphoneColors[mi % iphoneColors.length]}
                            />
                          );
                        });
                      } else {
                        scatters.push(
                          <Scatter
                            key={platform}
                            name={platform}
                            data={behaviorData.platformTimeline?.filter(d => d.platformIndex === i) || []}
                            fill={scatterColors[colorIdx % scatterColors.length]}
                          />
                        );
                        colorIdx++;
                      }
                    });
                    return scatters;
                  })()}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatTile label="Total Sessions" value={sessionData.totalSessions} colors={modeColors} />
            <StatTile label="Avg. Session Length" value={`${sessionData.averageSessionDuration} min`} colors={modeColors} />
            <StatTile label="Avg. Tracks per Session" value={sessionData.averageTracksPerSession} colors={modeColors} />
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Session Duration Distribution</h3>
            <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
              {(() => {
                const topGroup = [...sessionData.durationGroups].sort((a, b) => b.count - a.count)[0];
                const center = topGroup && sessionData.totalSessions > 0
                  ? { value: `${Math.round((topGroup.count / sessionData.totalSessions) * 100)}%`, caption: topGroup.name }
                  : null;
                return (
                  <DonutChart
                    data={sessionData.durationGroups.map(g => ({ name: g.name, value: g.count, color: g.color }))}
                    center={center}
                    chartKey="session"
                    isDarkMode={isDarkMode}
                    colorTheme={colorTheme}
                  />
                );
              })()}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Session Statistics</h3>
              <ul className="space-y-2">
                {sessionData.longestSession && (
                  <li className={`p-2 rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                    <span className={`font-bold ${modeColors.text}`}>Longest Session:</span>
                    <span className={`ml-2 ${modeColors.text}`}>{sessionData.longestSession.durationMinutes} minutes</span>
                    <div className={`text-sm ${modeColors.textLight}`}>
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
                  <li className={`p-2 rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                    <span className={`font-bold ${modeColors.text}`}>Most Tracks in a Session:</span>
                    <span className={`ml-2 ${modeColors.text}`}>{sessionData.mostTracksSession.tracksCount} tracks</span>
                    <div className={`text-sm ${modeColors.textLight}`}>
                      on {sessionData.mostTracksSession.fullDate.toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </li>
                )}

                <li className={`p-2 rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                  <span className={`font-bold ${modeColors.text}`}>Total Listening Time:</span>
                  <span className={`ml-2 ${modeColors.text}`}>
                    {formatDuration(sessionData.sessionLengths.reduce((sum, session) => sum + (session.durationMinutes * 60000), 0))}
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Notable Days & Months</h3>
              <div className="space-y-3">
                {sessionData.mostActiveDay && (
                  <div className={`p-3 rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                    <h4 className={`font-medium ${modeColors.text}`}>Most Active Day:</h4>
                    <div className={`font-bold ${modeColors.text}`}>{sessionData.mostActiveDay.displayDate}</div>
                    <div className={`text-sm ${modeColors.textLight}`}>
                      {sessionData.mostActiveDay.totalPlays} tracks played
                    </div>
                  </div>
                )}

                {sessionData.longestListeningDay && (
                  <div className={`p-3 rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                    <h4 className={`font-medium ${modeColors.text}`}>Longest Listening Day:</h4>
                    <div className={`font-bold ${modeColors.text}`}>{sessionData.longestListeningDay.displayDate}</div>
                    <div className={`text-sm ${modeColors.textLight}`}>
                      {formatDuration(sessionData.longestListeningDay.totalTime)} of listening
                    </div>
                  </div>
                )}

                {sessionData.mostActiveMonth && (
                  <div className={`p-3 rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                    <h4 className={`font-medium ${modeColors.text}`}>Most Active Month:</h4>
                    <div className={`font-bold ${modeColors.text}`}>{sessionData.mostActiveMonth.displayDate}</div>
                    <div className={`text-sm ${modeColors.textLight}`}>
                      {sessionData.mostActiveMonth.totalPlays} tracks played
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Session Insights</h3>
            <div className={`p-3 rounded space-y-2 border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
              <p className={modeColors.textLight}>
                Most of your listening sessions are
                <span className="font-bold"> {
                  [...sessionData.durationGroups].sort((a, b) => b.count - a.count)[0]?.name.toLowerCase()
                }</span>.
              </p>
              <p className={modeColors.textLight}>
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
        colorMode={colorMode}
        trackDurationMap={trackDurationMap}
      />
    )}

    {activeTab === 'weather' && (
      <div className="space-y-6">
        {/* City Setup */}
        <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
          <h3 className={`text-sm sm:text-lg font-bold mb-3 ${modeColors.text}`}>Home City</h3>
          {homeCity && (
            <div className={`mb-3 text-sm ${modeColors.text}`}>
              Current: <span className="font-bold">{homeCity.name}{homeCity.admin1 ? `, ${homeCity.admin1}` : ''}, {homeCity.country}</span>
              <button
                onClick={() => { setHomeCity(null); localStorage.removeItem('weatherHomeCity'); setWeatherData({}); }}
                className={`ml-2 text-xs px-2 py-0.5 rounded ${modeColors.buttonInactive}`}
              >
                Change
              </button>
            </div>
          )}
          {!homeCity && (
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
                placeholder="Search for your city..."
                className={`flex-1 px-3 py-1.5 rounded border text-sm ${modeColors.input} ${modeColors.text}`}
              />
              <button
                onClick={handleCitySearch}
                disabled={citySearching}
                className={`px-3 py-1.5 text-sm rounded ${modeColors.buttonInactive}`}
              >
                {citySearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          )}
          {cityResults.length > 0 && (
            <div className="space-y-1 mb-3">
              {cityResults.map((city, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectCity(city)}
                  className={`block w-full text-left px-3 py-1.5 rounded text-sm ${modeColors.buttonInactive}`}
                >
                  {city.name}{city.admin1 ? `, ${city.admin1}` : ''}, {city.country} ({city.lat}, {city.lon})
                </button>
              ))}
            </div>
          )}
          {homeCity && (
            <button
              onClick={handleFetchWeather}
              disabled={weatherLoading}
              className={`px-4 py-2 text-sm rounded font-medium ${modeColors.buttonInactive}`}
            >
              {weatherLoading
                ? `Fetching weather... ${weatherProgress.total > 0 ? `(${weatherProgress.loaded}/${weatherProgress.total})` : ''}`
                : Object.keys(weatherData).length > 0 ? 'Re-fetch Weather Data' : 'Fetch Weather Data'}
            </button>
          )}
          {weatherError && <p className="text-red-500 text-sm mt-2">{weatherError}</p>}
        </div>

        {/* Weather content */}
        {weatherAnalysis && (
          <>
            {/* Weather Mood Breakdown - Pie Chart */}
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Weather Mood Breakdown</h3>
              <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                {(() => {
                  const topCat = [...weatherAnalysis.pieData].sort((a, b) => b.value - a.value)[0];
                  const center = topCat && weatherAnalysis.totalPlays > 0
                    ? { value: `${Math.round((topCat.value / weatherAnalysis.totalPlays) * 100)}%`, caption: topCat.name.toLowerCase() }
                    : null;
                  return (
                    <DonutChart
                      data={weatherAnalysis.pieData}
                      center={center}
                      chartKey="weather"
                      isDarkMode={isDarkMode}
                      colorTheme={colorTheme}
                      tooltipFormatter={(value, name, props) => [`${value} plays (${props.payload.hours}h)`, name]}
                    />
                  );
                })()}
              </div>
              <div className={`text-sm text-center mt-2 ${modeColors.textLight}`}>
                {weatherAnalysis.totalPlays.toLocaleString()} plays matched with weather data
              </div>
            </div>

            {/* Top Artists & Songs by Weather */}
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Top Artists & Songs by Weather</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(weatherAnalysis.categoryDetails)
                  .sort((a, b) => b[1].plays - a[1].plays)
                  .map(([cat, detail]) => (
                  <div key={cat} className={`rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                    <button
                      onClick={() => setExpandedWeatherCards(prev => ({ ...prev, [cat]: !prev[cat] }))}
                      className={`w-full text-left p-3 flex items-center justify-between ${modeColors.text}`}
                    >
                      <span className="font-bold flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: WEATHER_COLORS[cat] || '#999' }}></span>
                        {cat}
                        <span className={`font-normal text-sm ${modeColors.textLight}`}>({detail.plays.toLocaleString()} plays, {detail.hours}h)</span>
                      </span>
                      <span className="text-sm">{expandedWeatherCards[cat] ? '\u25B2' : '\u25BC'}</span>
                    </button>
                    {expandedWeatherCards[cat] && (
                      <div className="px-3 pb-3 grid grid-cols-2 gap-3">
                        <div>
                          <h4 className={`text-xs font-bold mb-1 ${modeColors.textLight}`}>Top Artists</h4>
                          <ol className="space-y-0.5">
                            {detail.topArtists.map(([name, count], i) => (
                              <li key={i} className={`text-xs ${modeColors.text}`}>
                                <span className={modeColors.textLighter}>{i + 1}.</span> {name} <span className={modeColors.textLighter}>({count})</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold mb-1 ${modeColors.textLight}`}>Top Songs</h4>
                          <ol className="space-y-0.5">
                            {detail.topSongs.map(([name, count], i) => (
                              <li key={i} className={`text-xs ${modeColors.text} truncate`} title={name}>
                                <span className={modeColors.textLighter}>{i + 1}.</span> {name} <span className={modeColors.textLighter}>({count})</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Temperature Analysis - Bar Chart */}
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Listening by Temperature</h3>
              <div className={`h-48 sm:h-64 rounded p-1 sm:p-2 border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weatherAnalysis.tempData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis
                      dataKey="name"
                      {...axisProps(chart)}
                      tick={{ fill: chart.axis, fontSize: 11 }}
                    />
                    <YAxis
                      {...axisProps(chart)}
                      tick={{ fill: chart.axis, fontSize: 11 }}
                      label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: chart.axis, fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value, name, props) => [`${value}h (${props.payload.plays} plays)`, 'Listening']}
                      {...tooltipProps(chart)}
                    />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {weatherAnalysis.tempData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weather Playlists */}
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Weather Playlists</h3>
              <p className={`text-xs mb-3 ${modeColors.textLight}`}>Your top 20 most-played songs for each weather condition</p>
              <div className="space-y-4">
                {Object.entries(weatherAnalysis.categoryDetails)
                  .filter(([, d]) => d.playlist.length > 0)
                  .sort((a, b) => b[1].plays - a[1].plays)
                  .map(([cat, detail]) => {
                    const playlistLabels = {
                      'Clear': 'Sunny Day Playlist',
                      'Cloudy': 'Overcast Playlist',
                      'Rain': 'Rainy Day Playlist',
                      'Snow': 'Snow Day Playlist',
                      'Fog': 'Foggy Day Playlist',
                      'Thunderstorm': 'Thunderstorm Playlist',
                    };
                    const isExpanded = expandedWeatherCards['playlist_' + cat];
                    return (
                      <div key={cat} className={`rounded border overflow-hidden ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                        <button
                          onClick={() => setExpandedWeatherCards(prev => ({ ...prev, ['playlist_' + cat]: !prev['playlist_' + cat] }))}
                          className={`w-full text-left p-3 flex items-center justify-between`}
                        >
                          <span className={`font-bold flex items-center gap-2 ${modeColors.text}`}>
                            <span className="inline-block w-4 h-4 rounded-sm" style={{ backgroundColor: WEATHER_COLORS[cat] || '#999' }}></span>
                            {playlistLabels[cat] || cat + ' Playlist'}
                            <span className={`font-normal text-sm ${modeColors.textLight}`}>{detail.playlist.length} songs</span>
                          </span>
                          <span className={`text-sm ${modeColors.text}`}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3">
                            <table className="w-full">
                              <thead>
                                <tr className={`text-xs ${modeColors.textLight} border-b ${modeColors.borderLight}`}>
                                  <th className="text-left py-1 w-8">#</th>
                                  <th className="text-left py-1">Song</th>
                                  <th className="text-left py-1 hidden sm:table-cell">Artist</th>
                                  <th className="text-right py-1 w-16">Plays</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detail.playlist.map(([songKey, count], i) => {
                                  const parts = songKey.split(' — ');
                                  const track = parts[0];
                                  const artist = parts.slice(1).join(' — ');
                                  return (
                                    <tr key={i} className={`text-xs border-b ${modeColors.borderLight} border-opacity-30`}>
                                      <td className={`py-1.5 ${modeColors.textLighter}`}>{i + 1}</td>
                                      <td className={`py-1.5 ${modeColors.text} truncate max-w-0`}>
                                        <div className="truncate">{track}</div>
                                        <div className={`sm:hidden text-xs ${modeColors.textLighter} truncate`}>{artist}</div>
                                      </td>
                                      <td className={`py-1.5 hidden sm:table-cell ${modeColors.textLight} truncate max-w-0`}>
                                        <div className="truncate">{artist}</div>
                                      </td>
                                      <td className={`py-1.5 text-right tabular-nums ${modeColors.text}`}>{count}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Rainy vs Sunny Comparison */}
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-2 ${modeColors.text}`}>Rainy vs Sunny Days</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rainy */}
                <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                  <h4 className={`font-bold mb-2 flex items-center gap-2 ${modeColors.text}`}>
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: WEATHER_COLORS['Rain'] }}></span>
                    Rainy Days
                  </h4>
                  <p className={`text-sm mb-2 ${modeColors.textLight}`}>
                    {weatherAnalysis.rainyVsSunny.rainy.plays.toLocaleString()} plays &middot; {weatherAnalysis.rainyVsSunny.rainy.hours}h
                  </p>
                  {weatherAnalysis.rainyVsSunny.rainy.topArtists.length > 0 && (
                    <div>
                      <h5 className={`text-xs font-bold mb-1 ${modeColors.textLight}`}>Top Artists</h5>
                      <ol className="space-y-0.5">
                        {weatherAnalysis.rainyVsSunny.rainy.topArtists.map(([name, count], i) => (
                          <li key={i} className={`text-xs ${modeColors.text}`}>
                            <span className={modeColors.textLighter}>{i + 1}.</span> {name} <span className={modeColors.textLighter}>({count})</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                {/* Sunny */}
                <div className={`p-4 rounded border ${modeColors.bgCard} ${modeColors.border} ${modeColors.shadow}`}>
                  <h4 className={`font-bold mb-2 flex items-center gap-2 ${modeColors.text}`}>
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: WEATHER_COLORS['Clear'] }}></span>
                    Sunny Days
                  </h4>
                  <p className={`text-sm mb-2 ${modeColors.textLight}`}>
                    {weatherAnalysis.rainyVsSunny.sunny.plays.toLocaleString()} plays &middot; {weatherAnalysis.rainyVsSunny.sunny.hours}h
                  </p>
                  {weatherAnalysis.rainyVsSunny.sunny.topArtists.length > 0 && (
                    <div>
                      <h5 className={`text-xs font-bold mb-1 ${modeColors.textLight}`}>Top Artists</h5>
                      <ol className="space-y-0.5">
                        {weatherAnalysis.rainyVsSunny.sunny.topArtists.map(([name, count], i) => (
                          <li key={i} className={`text-xs ${modeColors.text}`}>
                            <span className={modeColors.textLighter}>{i + 1}.</span> {name} <span className={modeColors.textLighter}>({count})</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty state when no weather data yet */}
        {!weatherAnalysis && homeCity && !weatherLoading && Object.keys(weatherData).length === 0 && (
          <div className={`text-center py-8 ${modeColors.textLight}`}>
            <p className="text-lg mb-2">Click "Fetch Weather Data" to load historical weather</p>
            <p className="text-sm">This will fetch weather for all dates in your listening history using the Open-Meteo API.</p>
          </div>
        )}

        {!homeCity && (
          <div className={`text-center py-8 ${modeColors.textLight}`}>
            <p className="text-lg mb-2">Set your home city to get started</p>
            <p className="text-sm">We'll use your city's weather to correlate with your listening habits.</p>
          </div>
        )}
      </div>
    )}

  </div>
);
};

export default ListeningBehavior;