import React, { useState, useMemo, useEffect } from 'react';
import { useTheme } from './themeprovider.js';
import { getAnalysisPageColors, getAnalysisChartTheme } from './theme.js';
import { RankBar } from './RankCardBits.js';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// One year strip of the "Year at a Glance" heatmap: columns are weeks,
// rows are weekdays, cells tinted by that day's listening time.
function YearStrip({ year, days, maxMs, scale, gridColor, labelClass, formatDuration, onDayClick }) {
  // Back the grid up to the Sunday on or before Jan 1
  const first = new Date(year, 0, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const weeks = [];
  for (let w = 0; w < 54; w++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + r);
      col.push(d);
    }
    if (col[0].getFullYear() > year) break;
    weeks.push(col);
  }

  const cellColor = (ms) => {
    if (!ms || maxMs <= 0) return null;
    const idx = Math.min(4, Math.floor(Math.sqrt(ms / maxMs) * 5));
    return scale[idx];
  };

  // Label a column when it contains the first day of a month
  const monthLabelFor = (col) => {
    const firstOfMonth = col.find((d) => d.getFullYear() === year && d.getDate() === 1);
    return firstOfMonth ? MONTH_LABELS[firstOfMonth.getMonth()] : '';
  };

  return (
    <div className="min-w-max">
      <div className="flex gap-[2px] ml-9 mb-0.5">
        {weeks.map((col, i) => (
          <span key={i} className={`w-[14px] shrink-0 text-[9px] whitespace-nowrap overflow-visible ${labelClass}`}>
            {monthLabelFor(col)}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-[2px]">
        {Array.from({ length: 7 }, (_, r) => (
          <div key={r} className="flex items-center gap-[2px]">
            <span className={`w-8 shrink-0 text-[10px] font-bold ${labelClass}`}>{DAY_LABELS[r]}</span>
            {weeks.map((col, w) => {
              const d = col[r];
              if (d.getFullYear() !== year) {
                return <span key={w} className="w-[14px] h-[14px] shrink-0" />;
              }
              const stat = days.get(dayKey(d));
              const color = stat ? cellColor(stat.ms) : null;
              return (
                <span
                  key={w}
                  onClick={stat ? () => onDayClick(dayKey(d)) : undefined}
                  className={`w-[14px] h-[14px] shrink-0 rounded-[2px] ${stat ? 'cursor-pointer' : ''}`}
                  style={{
                    backgroundColor: color || 'transparent',
                    boxShadow: color ? 'none' : `inset 0 0 0 1px ${gridColor}`,
                  }}
                  title={`${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${
                    stat ? ` — ${stat.plays} play${stat.plays === 1 ? '' : 's'} · ${formatDuration(stat.ms)}` : ' — no plays'
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

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
  setViewMode = () => {},
  trackDurationMap = null
}) => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [daySelectionMode, setDaySelectionMode] = useState(false);
  const [viewPress, setViewPress] = useState(0);
  const [expandedMonthCards, setExpandedMonthCards] = useState({});
  const [expandedDayCards, setExpandedDayCards] = useState({});
  const [expandedHistoryCards, setExpandedHistoryCards] = useState({});

  useEffect(() => { setViewPress(0); }, [activeTab]);

  // Get the current theme
  const { theme, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Page theming (shared with the analysis pages via theme.js; green accent)
  const modeColors = getAnalysisPageColors('green', isColorful, isDarkMode);

  // Global play filters from the settings panel, shared by every memo below
  const passesFilters = useMemo(() => (entry) => {
    if (entry.ms_played < minPlayDuration) return false;
    if (skipFilter && (entry.reason_end === 'fwdbtn' || entry.reason_end === 'backbtn')) {
      if (!skipEndThreshold || !trackDurationMap) return false;
      const key = `${(entry.master_metadata_track_name || '').toLowerCase().trim()}|||${(entry.master_metadata_album_artist_name || '').toLowerCase().trim()}`;
      const est = trackDurationMap.get(key);
      if (!est || entry.ms_played < est - skipEndThreshold) return false;
    }
    if (fullListenOnly && entry.reason_end !== 'trackdone') return false;
    return true;
  }, [minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);

// Sequential green ramp for the heatmap (grays in minimal mode)
  const chart = useMemo(
    () => getAnalysisChartTheme('green', isColorful, isDarkMode),
    [isColorful, isDarkMode]
  );
  const heatScale = useMemo(() => [...chart.ramp(5)].reverse(), [chart]);

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
  
  // Check if we're viewing a specific month (YYYY-MM format)
  const isMonthView = selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 2 && !selectedYear.startsWith('all-');

  // Per-day listening totals for the "Year at a Glance" heatmap
  const yearHeatmap = useMemo(() => {
    if (activeTab !== 'calendar' || isMonthView) return null;

    const days = new Map(); // 'YYYY-MM-DD' → { ms, plays }
    filteredData.forEach((entry) => {
      if (!passesFilters(entry)) return;
      const d = new Date(entry.ts);
      if (isNaN(d.getTime())) return;
      const key = dayKey(d);
      const t = days.get(key) || { ms: 0, plays: 0 };
      t.ms += entry.ms_played;
      t.plays += 1;
      days.set(key, t);
    });

    let maxMs = 0;
    days.forEach((v) => { if (v.ms > maxMs) maxMs = v.ms; });
    const years = [...new Set([...days.keys()].map((k) => parseInt(k.slice(0, 4))))].sort((a, b) => a - b);
    return { days, maxMs, years };
  }, [filteredData, activeTab, isMonthView, passesFilters]);

  // Listening history data for daily history tab
  const historyData = useMemo(() => {
    if (activeTab !== 'history') {
      return { tracks: [], totalTracks: 0, totalListeningTime: 0, uniqueTracks: 0, uniqueArtists: 0, sessions: 0, formattedDate: 'No date selected' };
    }
    
    // Only show data when a specific date is selected (YYYY-MM-DD or all-MM-DD format)
    const isAllTimeDay = selectedYear && selectedYear.startsWith('all-') && selectedYear.split('-').length === 3;
    const isSpecificDay = selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3 && !selectedYear.startsWith('all-');

    if (!isAllTimeDay && !isSpecificDay) {
      return { tracks: [], totalTracks: 0, totalListeningTime: 0, uniqueTracks: 0, uniqueArtists: 0, sessions: 0, formattedDate: 'No date selected' };
    }

    let dayTracks;
    let formattedDate;

    if (isAllTimeDay) {
      // all-MM-DD: filteredData is already filtered to this month+day across all years
      const parts = selectedYear.split('-');
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      formattedDate = `Every ${monthNames[parseInt(parts[1]) - 1]} ${parseInt(parts[2])}`;

      dayTracks = filteredData
        .filter(entry => passesFilters(entry))
        .sort((a, b) => new Date(a.ts) - new Date(b.ts))
        .map(entry => {
          const d = new Date(entry.ts);
          return {
            ...entry,
            formattedTime: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' +
              d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            formattedDuration: formatDuration(entry.ms_played),
            completionRate: entry.master_metadata_track_name ?
              Math.min(100, Math.round((entry.ms_played / (minPlayDuration || 30000)) * 100)) : 0
          };
        });
    } else {
      const selectedDateObj = new Date(selectedYear);
      const nextDay = new Date(selectedDateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      formattedDate = selectedDateObj.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      dayTracks = filteredData
        .filter(entry => {
          const trackDate = new Date(entry.ts);
          return trackDate >= selectedDateObj && trackDate < nextDay && passesFilters(entry);
        })
        .sort((a, b) => new Date(a.ts) - new Date(b.ts))
        .map(entry => ({
          ...entry,
          formattedTime: new Date(entry.ts).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
          }),
          formattedDuration: formatDuration(entry.ms_played),
          completionRate: entry.master_metadata_track_name ?
            Math.min(100, Math.round((entry.ms_played / (minPlayDuration || 30000)) * 100)) : 0
        }));
    }

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
      formattedDate
    };
  }, [filteredData, selectedYear, formatDuration, activeTab, passesFilters, minPlayDuration]);
  
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
    
    // Find top artist and album for each day ("Unknown …" placeholders are
    // data artifacts, not real top picks)
    daysData.forEach((dayData, index) => {
      // Top artist
      const topArtist = [...dailyArtists[index].entries()]
        .filter(([name]) => name !== 'Unknown Artist')
        .sort((a, b) => b[1].playCount - a[1].playCount)[0];
      if (topArtist) {
        dayData.topArtist = {
          name: topArtist[0],
          playCount: topArtist[1].playCount,
          totalTime: topArtist[1].totalTime
        };
      }

      // Top album
      const topAlbum = [...dailyAlbums[index].entries()]
        .filter(([name]) => name !== 'Unknown Album')
        .sort((a, b) => b[1].playCount - a[1].playCount)[0];
      if (topAlbum) {
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
  }, [filteredData, selectedYear, isMonthView, passesFilters]);

  // Calendar view data - monthly insights with top artist, album, and first listens
  const calendarData = useMemo(() => {
    if (isMonthView) return []; // Don't compute monthly data if we're in daily view
    
    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      name: MONTH_LABELS[i],
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
    
    filteredData.forEach(entry => {
      if (passesFilters(entry)) {
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
    
    // Find top artist and album for each month ("Unknown …" placeholders are
    // data artifacts, not real top picks)
    monthsData.forEach((monthData, index) => {
      // Top artist
      const topArtist = [...monthlyArtists[index].entries()]
        .filter(([name]) => name !== 'Unknown Artist')
        .sort((a, b) => b[1].playCount - a[1].playCount)[0];
      if (topArtist) {
        monthData.topArtist = {
          name: topArtist[0],
          playCount: topArtist[1].playCount,
          totalTime: topArtist[1].totalTime
        };
      }

      // Top album
      const topAlbum = [...monthlyAlbums[index].entries()]
        .filter(([name]) => name !== 'Unknown Album')
        .sort((a, b) => b[1].playCount - a[1].playCount)[0];
      if (topAlbum) {
        monthData.topAlbum = {
          name: topAlbum[0],
          artist: topAlbum[1].artist,
          playCount: topAlbum[1].playCount,
          totalTime: topAlbum[1].totalTime
        };
      }

      // Top song
      const topSong = [...monthlyTrackedSongs[index].entries()]
        .filter(([, s]) => s.name !== 'Unknown Song')
        .sort((a, b) => b[1].playCount - a[1].playCount)[0];
      if (topSong) {
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
  }, [filteredData, isMonthView, passesFilters]);
  
  // Peaks for the intensity bars on month/day cards
  const peakMonthTime = useMemo(
    () => calendarData.reduce((max, m) => Math.max(max, m.totalTime), 0),
    [calendarData]
  );
  const peakDayTime = useMemo(
    () => dailyCalendarData.reduce((max, d) => Math.max(max, d.totalTime), 0),
    [dailyCalendarData]
  );

  // Biggest listening day across the whole library, for the Daily History
  // empty state (days over 24h are data artifacts, not real listening days)
  const biggestDay = useMemo(() => {
    if (activeTab !== 'history') return null;
    const dayMs = new Map();
    rawPlayData.forEach((entry) => {
      if (!entry.ms_played || entry.ms_played < 30000) return;
      const d = new Date(entry.ts);
      if (isNaN(d.getTime())) return;
      const key = dayKey(d);
      dayMs.set(key, (dayMs.get(key) || 0) + entry.ms_played);
    });
    let best = null;
    dayMs.forEach((ms, date) => {
      if (ms > 86400000) return;
      if (!best || ms > best.ms) best = { date, ms };
    });
    return best;
  }, [rawPlayData, activeTab]);

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

      {/* Desktop layout - title, centered tabs, controls */}
      <div className="hidden sm:flex items-center mb-2 gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={`text-xl ${modeColors.text} truncate`}>
            {getPageTitle()} <span className="opacity-50">/</span> <span className="text-base">{{ calendar: 'Calendar', history: 'Daily History' }[activeTab]}</span>
          </h3>
        </div>
        <div className="flex flex-wrap gap-1 items-center justify-center shrink-0">
          <TabButton id="calendar" label="Calendar" />
          <TabButton id="history" label="Daily History" />
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          {activeTab === 'calendar' && isMonthView && (
            <button
              onClick={() => setDaySelectionMode(!daySelectionMode)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                daySelectionMode
                  ? modeColors.buttonActive
                  : modeColors.buttonInactive
              }`}
            >
              {daySelectionMode ? 'Cancel Selection' : 'View in Daily History'}
            </button>
          )}
          <button
            key={`cal-view-${viewPress}`}
            onClick={() => { setViewMode(viewMode === 'grid' ? 'list' : 'grid'); setViewPress(p => p + 1); }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${modeColors.buttonInactive} ${viewPress > 0 ? (isColorful ? (isDarkMode ? 'btn-press-green-dark' : 'btn-press-green-light') : (isDarkMode ? 'btn-press-dark' : 'btn-press-light')) : ''}`}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
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
          {!isMonthView && yearHeatmap && yearHeatmap.maxMs > 0 && (
            <div>
              <h3 className={`text-sm sm:text-lg font-bold mb-1 ${modeColors.text}`}>Year at a Glance</h3>
              <p className={`mb-3 text-sm ${modeColors.textLight}`}>
                Daily listening time — click a day to open it in Daily History
              </p>
              <div className={`p-3 sm:p-4 rounded border ${modeColors.bgCardAlt} ${modeColors.border} ${modeColors.shadow} overflow-x-auto`}>
                <div className="space-y-4 min-w-max">
                  {yearHeatmap.years.map((year) => (
                    <div key={year}>
                      {yearHeatmap.years.length > 1 && (
                        <div className={`text-xs font-bold mb-1 ${modeColors.textLight}`}>{year}</div>
                      )}
                      <YearStrip
                        year={year}
                        days={yearHeatmap.days}
                        maxMs={yearHeatmap.maxMs}
                        scale={heatScale}
                        gridColor={chart.grid}
                        labelClass={modeColors.textLighter}
                        formatDuration={formatDuration}
                        onDayClick={(date) => {
                          if (onYearChange) onYearChange(date);
                          setActiveTab('history');
                        }}
                      />
                    </div>
                  ))}
                  <div className={`flex items-center justify-end gap-1 text-[10px] ${modeColors.textLighter}`}>
                    fewer
                    {heatScale.map((c) => (
                      <span key={c} className="inline-block w-3 h-3 rounded-[2px]" style={{ backgroundColor: c }} />
                    ))}
                    more
                  </div>
                </div>
              </div>
            </div>
          )}
          <div>
            {/* Monthly View - Grid */}
            {!isMonthView && viewMode === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 items-start">
                {calendarData.map((monthData, index) => {
                  const isExpanded = !!expandedMonthCards[index];
                  return (
                    <div key={index} className={`p-3 ${modeColors.bgCardAlt} rounded border ${modeColors.border} text-center relative ${modeColors.shadow}`}>
                      {peakMonthTime > 0 && monthData.totalTime === peakMonthTime && (
                        <div className="absolute -top-2 -right-2 text-yellow-500 text-2xl" title="Biggest month">★</div>
                      )}
                      {/* Row 1: name + toggle */}
                      <div className={`flex items-center justify-between font-bold text-base leading-tight mb-2 ${modeColors.text}`}>
                        <span className="w-5 shrink-0" />
                        <span className="flex-1 text-center">{monthData.fullName}</span>
                        <button type="button" onClick={() => setExpandedMonthCards(p => ({ ...p, [index]: !p[index] }))} className="w-5 text-sm opacity-60 hover:opacity-100 cursor-pointer shrink-0">{isExpanded ? '−' : '+'}</button>
                      </div>
                      {/* Row 2: collapsible stats */}
                      {isExpanded && (
                        <div className={`grid grid-cols-2 gap-1 mb-2 text-xs ${modeColors.textLight}`}>
                          <div><div className="opacity-60">Time</div><div className="font-bold">{formatDuration(monthData.totalTime)}</div></div>
                          <div><div className="opacity-60">Plays</div><div className="font-bold">{monthData.totalPlays.toLocaleString()}</div></div>
                          <div><div className="opacity-60">Songs</div><div className="font-bold">{monthData.uniqueSongCount}</div></div>
                          <div><div className="opacity-60">Artists</div><div className="font-bold">{monthData.uniqueArtistCount}</div></div>
                        </div>
                      )}
                      {/* Full-width fact rows: label left, value right */}
                      <div className={`space-y-1 text-xs ${modeColors.textLight}`}>
                        {monthData.topArtist.name && (
                          <div className="flex justify-between gap-2">
                            <span className="opacity-60 shrink-0">Top Artist</span>
                            <span className={`font-bold text-right min-w-0 ${isExpanded ? 'break-words' : 'truncate'}`} title={monthData.topArtist.name}>{monthData.topArtist.name}</span>
                          </div>
                        )}
                        {monthData.topSong.name && (
                          <div className="flex justify-between gap-2">
                            <span className="opacity-60 shrink-0">Top Song</span>
                            <span className={`font-bold text-right min-w-0 ${isExpanded ? 'break-words' : 'truncate'}`} title={monthData.topSong.name}>{monthData.topSong.name}</span>
                          </div>
                        )}
                        {monthData.topAlbum.name && (
                          <div className="flex justify-between gap-2">
                            <span className="opacity-60 shrink-0">Top Album</span>
                            <span className={`font-bold text-right min-w-0 ${isExpanded ? 'break-words' : 'truncate'}`} title={monthData.topAlbum.name}>{monthData.topAlbum.name}</span>
                          </div>
                        )}
                        <div className="flex justify-between gap-2">
                          <span className="opacity-60 shrink-0">New Songs</span>
                          <span className="font-bold">{monthData.firstListens.length}</span>
                        </div>
                      </div>
                      {/* Listening time relative to the biggest month */}
                      <div className={modeColors.text}>
                        <RankBar
                          value={monthData.totalTime}
                          max={peakMonthTime}
                          label={formatDuration(monthData.totalTime)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Monthly View - List */}
            {!isMonthView && viewMode === 'list' && (
              <>
                {/* Desktop table */}
                <div className={`hidden sm:block overflow-x-auto border rounded ${modeColors.border} ${modeColors.bgCard}`}>
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
                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {calendarData.map((monthData, index) => (
                    <div key={index} className={`p-3 rounded border ${modeColors.bgCardAlt} ${modeColors.border} ${modeColors.shadow}`}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className={`font-bold ${modeColors.text}`}>{monthData.fullName}</span>
                        <span className={`text-xs ${modeColors.textLight}`}>{monthData.totalPlays} plays</span>
                      </div>
                      <div className={`text-xs ${modeColors.text} space-y-0.5`}>
                        <div className="flex justify-between"><span>{monthData.uniqueSongCount} songs</span><span>{monthData.uniqueArtistCount} artists</span></div>
                        {monthData.topArtist.name && <div className="truncate">Top Artist: <span className="font-bold">{monthData.topArtist.name}</span></div>}
                        {monthData.topAlbum.name && <div className="truncate">Top Album: <span className="font-bold">{monthData.topAlbum.name}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Daily View - Grid */}
            {isMonthView && viewMode === 'grid' && (
              <>
                {daySelectionMode && (
                  <p className={`text-sm text-center mb-2 ${modeColors.textLight}`}>
                    Click on any day below to view its detailed history
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 items-start">
                {dailyCalendarData.map((dayData, index) => {
                  const handleDayClick = () => {
                    if (!daySelectionMode) return;
                    if (onYearChange) onYearChange(dayData.date);
                    setActiveTab('history');
                    setDaySelectionMode(false);
                  };

                  const dateObj = new Date(dayData.date);
                  const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                  const day = dateObj.getDate();
                  const suffix = day % 10 === 1 && day !== 11 ? 'st' :
                                 day % 10 === 2 && day !== 12 ? 'nd' :
                                 day % 10 === 3 && day !== 13 ? 'rd' : 'th';
                  const isExpanded = !!expandedDayCards[dayData.date];

                  return (
                  <div
                    key={index}
                    onClick={handleDayClick}
                    className={`p-3 ${modeColors.bgCardAlt} rounded border text-center relative ${
                      daySelectionMode ? 'cursor-pointer' : 'cursor-default'
                    } ${modeColors.border} ${modeColors.shadow} ${
                      daySelectionMode
                        ? isColorful
                          ? 'hover:opacity-80 ring-2 ring-green-500 ring-opacity-50'
                          : isDarkMode
                            ? 'hover:bg-gray-800 ring-2 ring-white ring-opacity-30'
                            : 'hover:bg-gray-100 ring-2 ring-black ring-opacity-30'
                        : ''
                    }`}>
                    {peakDayTime > 0 && dayData.totalTime === peakDayTime && (
                      <div className="absolute -top-2 -right-2 text-yellow-500 text-2xl" title="Biggest day this month">★</div>
                    )}
                    {/* Row 1: date + toggle */}
                    <div className={`flex items-center justify-between font-bold text-base leading-tight mb-2 ${modeColors.text}`}>
                      <span className="w-5 shrink-0" />
                      <span className="flex-1 text-center">{monthName} {day}{suffix}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); setExpandedDayCards(p => ({ ...p, [dayData.date]: !p[dayData.date] })); }} className="w-5 text-sm opacity-60 hover:opacity-100 cursor-pointer shrink-0">{isExpanded ? '−' : '+'}</button>
                    </div>
                    {/* Row 2: collapsible stats */}
                    {isExpanded && (
                      <div className={`grid grid-cols-2 gap-1 mb-2 text-xs ${modeColors.textLight}`}>
                        <div><div className="opacity-60">Time</div><div className="font-bold">{formatDuration(dayData.totalTime)}</div></div>
                        <div><div className="opacity-60">Plays</div><div className="font-bold">{dayData.totalPlays.toLocaleString()}</div></div>
                        <div><div className="opacity-60">Songs</div><div className="font-bold">{dayData.uniqueSongCount}</div></div>
                        <div><div className="opacity-60">Artists</div><div className="font-bold">{dayData.uniqueArtistCount}</div></div>
                      </div>
                    )}
                    {/* Row 3: top artist | top album */}
                    <div className={`flex flex-wrap gap-y-1 text-xs text-center ${modeColors.textLight}`}>
                      {dayData.topArtist.name && (
                        <div className="flex-1 min-w-0 px-1"><div className="opacity-60">Top Artist</div><div className={`font-bold ${isExpanded ? 'break-words' : 'truncate'}`}>{dayData.topArtist.name}</div></div>
                      )}
                      {dayData.topAlbum.name && (
                        <div className="flex-1 min-w-0 px-1"><div className="opacity-60">Top Album</div><div className={`font-bold ${isExpanded ? 'break-words' : 'truncate'}`}>{dayData.topAlbum.name}</div></div>
                      )}
                    </div>
                    {/* Row 4: new songs */}
                    <div className={`text-xs text-center mt-1 ${modeColors.textLight}`}>
                      <div className="opacity-60">New Songs</div>
                      <div className="font-bold">{dayData.firstListens.length}</div>
                    </div>
                    {/* Listening time relative to the biggest day this month */}
                    <div className={modeColors.text}>
                      <RankBar
                        value={dayData.totalTime}
                        max={peakDayTime}
                        label={formatDuration(dayData.totalTime)}
                      />
                    </div>
                  </div>
                  );
                })}
                </div>
              </>
            )}

            {/* Daily View - List */}
            {isMonthView && viewMode === 'list' && (
              <>
                {/* Desktop table */}
                <div className={`hidden sm:block overflow-x-auto border rounded ${modeColors.border} ${modeColors.bgCard}`}>
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
                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {dailyCalendarData.map((dayData, index) => {
                    const dateObj = new Date(dayData.date);
                    const monthName = dateObj.toLocaleDateString('en-US', { month: 'long' });
                    const day = dateObj.getDate();
                    const suffix = day % 10 === 1 && day !== 11 ? 'st' :
                                   day % 10 === 2 && day !== 12 ? 'nd' :
                                   day % 10 === 3 && day !== 13 ? 'rd' : 'th';

                    return (
                      <div
                        key={index}
                        onClick={() => {
                          if (onYearChange) onYearChange(dayData.date);
                          setActiveTab('history');
                        }}
                        className={`p-3 rounded border cursor-pointer ${modeColors.bgCardAlt} ${modeColors.border} ${modeColors.shadow}`}
                      >
                        <div className="flex justify-between items-baseline mb-1">
                          <span className={`font-bold ${modeColors.text}`}>
                            <span className="opacity-50">{monthName}</span> {day}{suffix}
                          </span>
                          <span className={`text-xs ${modeColors.textLight}`}>{dayData.totalPlays} plays</span>
                        </div>
                        <div className={`text-xs ${modeColors.text} space-y-0.5`}>
                          <div className="flex justify-between">
                            <span>{dayData.uniqueSongCount} songs</span>
                            <span>{dayData.uniqueArtistCount} artists</span>
                          </div>
                          {dayData.topArtist.name && (
                            <div className="truncate">Top Artist: <span className="font-bold">{dayData.topArtist.name}</span></div>
                          )}
                          {dayData.topAlbum.name && (
                            <div className="truncate">Top Album: <span className="font-bold">{dayData.topAlbum.name}</span></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
          <div className="flex flex-col gap-4">
            <div>
              {selectedYear && selectedYear.includes('-') && selectedYear.split('-').length === 3 && (
                <div className={`mt-2 text-sm px-3 py-2 rounded ${modeColors.bgCardAlt} ${modeColors.text} border ${modeColors.border} ${modeColors.shadow}`}>
                  Viewing data for: <span className="font-semibold">{historyData.formattedDate}</span>
                </div>
              )}
            </div>
          </div>

          {historyData.formattedDate === 'No date selected' ? (
            <div className={`p-6 sm:p-8 rounded ${modeColors.bgCard} border ${modeColors.borderLight} ${modeColors.shadow} text-center`}>
              <h4 className={`font-bold text-base mb-2 ${modeColors.text}`}>Pick a day to see its full story</h4>
              <p className={`text-sm mb-4 max-w-md mx-auto ${modeColors.textLight}`}>
                Click a day in the Year at a Glance heatmap, open a day card from any month,
                or use the Day control in the year selector.
              </p>
              {biggestDay && (() => {
                const [y, m, d] = biggestDay.date.split('-').map(Number);
                const label = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <button
                    onClick={() => { if (onYearChange) onYearChange(biggestDay.date); }}
                    className={`px-3 py-1.5 rounded text-sm font-medium ${modeColors.buttonInactive}`}
                  >
                    Jump to your biggest day — {label} · {formatDuration(biggestDay.ms)}
                  </button>
                );
              })()}
            </div>
          ) : (
          <>
          <div className={`p-3 sm:p-4 rounded ${modeColors.bgCard} border ${modeColors.borderLight} ${modeColors.shadow}`}>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 items-start">
                {historyData.tracks.map((track, index) => {
                  const isExpanded = !!expandedHistoryCards[index];
                  return (
                    <div key={index} className={`p-3 ${modeColors.bgCardAlt} rounded border text-center ${modeColors.border} ${modeColors.shadow}`}>
                      {/* Row 1: rank + name + artist subline + toggle */}
                      <div className={`flex items-start justify-between font-bold text-base leading-tight mb-2 ${modeColors.text}`}>
                        <span className="opacity-50 text-sm w-5 text-left shrink-0">#{index + 1}</span>
                        <div className="flex-1 min-w-0 text-center px-1">
                          <div className={`${isExpanded ? 'break-words' : 'truncate'}`}>{track.master_metadata_track_name || 'Unknown Track'}</div>
                          <div className={`text-xs font-normal opacity-70 truncate ${modeColors.textLight}`}>{track.master_metadata_album_artist_name || 'Unknown Artist'}</div>
                        </div>
                        <button type="button" onClick={() => setExpandedHistoryCards(p => ({ ...p, [index]: !p[index] }))} className="w-5 text-sm opacity-60 hover:opacity-100 cursor-pointer shrink-0">{isExpanded ? '−' : '+'}</button>
                      </div>
                      {/* Row 2: collapsible time + duration */}
                      {isExpanded && (
                        <div className={`grid grid-cols-2 gap-1 mb-2 text-xs ${modeColors.textLight}`}>
                          <div><div className="opacity-60">Played at</div><div className="font-bold font-mono">{track.formattedTime}</div></div>
                          <div><div className="opacity-60">Duration</div><div className="font-bold">{track.formattedDuration}</div></div>
                        </div>
                      )}
                      {/* Row 3: album + status */}
                      <div className={`flex flex-wrap gap-y-1 text-xs text-center ${modeColors.textLight}`}>
                        {track.master_metadata_album_album_name && (
                          <div className="flex-1 min-w-0 px-1"><div className="opacity-60">Album</div><div className={`font-bold ${isExpanded ? 'break-words' : 'truncate'}`}>{track.master_metadata_album_album_name}</div></div>
                        )}
                        {(track.reason_end === 'trackdone' || track.reason_end === 'fwdbtn' || track.reason_end === 'backbtn') && (
                          <div className="flex-1 min-w-0 px-1">
                            <div className="opacity-60">Status</div>
                            <div className={`font-bold ${track.reason_end === 'trackdone' ? 'text-green-600' : 'text-orange-600'}`}>
                              {track.reason_end === 'trackdone' ? 'Completed' : 'Skipped'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className={`hidden sm:block overflow-x-auto border rounded ${modeColors.border} ${modeColors.bgCard}`}>
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
                {/* Mobile cards */}
                <div className="sm:hidden space-y-2">
                  {historyData.tracks.map((track, index) => (
                    <div key={index} className={`p-3 rounded border ${modeColors.bgCardAlt} ${modeColors.border} ${modeColors.shadow}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-bold ${modeColors.text} truncate mr-2`} style={{maxWidth: 'calc(100% - 70px)'}}>
                          {track.master_metadata_track_name || 'Unknown Track'}
                        </span>
                        <span className={`text-xs font-mono whitespace-nowrap ${modeColors.textLight}`}>{track.formattedTime}</span>
                      </div>
                      <div className={`text-xs ${modeColors.text} space-y-0.5`}>
                        <div className="truncate">{track.master_metadata_album_artist_name || 'Unknown Artist'}</div>
                        {track.master_metadata_album_album_name && (
                          <div className="truncate opacity-70">{track.master_metadata_album_album_name}</div>
                        )}
                        <div className="flex justify-between items-center">
                          <span>{track.formattedDuration}</span>
                          {track.reason_end === 'trackdone' && <span className="text-green-600">Completed</span>}
                          {(track.reason_end === 'fwdbtn' || track.reason_end === 'backbtn') && <span className="text-orange-600">Skipped</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarView;