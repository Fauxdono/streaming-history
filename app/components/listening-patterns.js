import React, { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Download } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Label } from 'recharts';
import StreamingByYear from './streaming-by-year.js';
import TrackRankings from './TrackRankings.js';
import { useTheme } from './themeprovider.js'; // Import the theme hook
import { getAnalysisPageColors, getAnalysisChartTheme } from './theme.js';
import { SliceDot, makePieLabel, donutCenter, tooltipProps, legendProps, axisProps } from './ChartBits.js';
import { RankBadge, RankBar } from './RankCardBits.js';

const WorldMap = dynamic(() => import('react-svg-worldmap').then(mod => mod.WorldMap ? { default: mod.WorldMap } : mod), { ssr: false });
const HologramGlobe = dynamic(() => import('./HologramGlobe.js'), { ssr: false });

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });

// Build reverse lookup: country name → ISO code (for Tidal full country names)
const countryNameToCode = (() => {
  const map = {};
  const codes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
  for (const code of codes) {
    try {
      const name = countryNames.of(code);
      if (name) map[name.toLowerCase()] = code;
    } catch {}
  }
  return map;
})();

// Removed exported variables to prevent conflicts with SpotifyAnalyzer state management

const ListeningPatterns = ({
  rawPlayData = [],
  formatDuration,
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  colorTheme = 'purple',
  textTheme = null,
  backgroundTheme = null,
  briefObsessions = [],
  songsByYear = {},
  colorMode = 'minimal',
  viewMode = 'grid',
  setViewMode = () => {},
  trackDurationMap = null
}) => {
  const [activeTab, setActiveTab] = useState('timeOfDay');

  // Narrow screens transpose the Weekly Rhythm heatmap (hours down, days
  // across) so it fits without horizontal scrolling.
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Which hemisphere's season definitions to use (persisted)
  const [hemisphere, setHemisphere] = useState(() => {
    if (typeof window === 'undefined') return 'north';
    try { return localStorage.getItem('seasonalHemisphere') || 'north'; } catch { return 'north'; }
  });
  const toggleHemisphere = () => {
    setHemisphere(prev => {
      const next = prev === 'north' ? 'south' : 'north';
      try { localStorage.setItem('seasonalHemisphere', next); } catch {}
      return next;
    });
  };
  const [viewPress, setViewPress] = useState(0);
  const [dayOfWeekPress, setDayOfWeekPress] = useState(0);
  const [obsSortPress, setObsSortPress] = useState(0);
  const [mapViewPress, setMapViewPress] = useState(0);
  const [dayOfWeekViewMode, setDayOfWeekViewMode] = useState('plays');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [mapView, setMapView] = useState('flat');
  const [obsTopN, setObsTopN] = useState(100);
  const [obsIntensityThreshold, setObsIntensityThreshold] = useState(5);
  const [obsSortBy, setObsSortBy] = useState('playsInWeek');
  const [obsShowExporter, setObsShowExporter] = useState(false);

  useEffect(() => { setViewPress(0); setDayOfWeekPress(0); setObsSortPress(0); setMapViewPress(0); }, [activeTab]);

  // Get the current theme
  const { theme, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Page + chart theming (shared with the other analysis pages via theme.js)
  const colors = getAnalysisPageColors('yellow', isColorful, isDarkMode);
  const chart = useMemo(
    () => getAnalysisChartTheme('yellow', isColorful, isDarkMode),
    [isColorful, isDarkMode]
  );

  // Ordered-category colors: sequential accent ramps from the chart theme
  const chartColors = useMemo(() => {
    const ramp4 = chart.ramp(4);
    return {
      // Time periods (morning → night)
      timePeriods: [
        { name: 'Morning', fullName: 'Morning (5-11)', count: 0, totalMs: 0, color: ramp4[0] },
        { name: 'Afternoon', fullName: 'Afternoon (12-16)', count: 0, totalMs: 0, color: ramp4[1] },
        { name: 'Evening', fullName: 'Evening (17-21)', count: 0, totalMs: 0, color: ramp4[2] },
        { name: 'Night', fullName: 'Night (22-4)', count: 0, totalMs: 0, color: ramp4[3] }
      ],

      // Seasons (spring → winter)
      seasonColors: {
        spring: ramp4[0],
        summer: ramp4[1],
        fall: ramp4[2],
        winter: ramp4[3]
      }
    };
  }, [chart]);

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

    filteredData.forEach(entry => {
      if (passesFilters(entry)) {
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
  }, [filteredData, chartColors.timePeriods, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);

  // Hour-of-day × day-of-week play counts for the weekly rhythm heatmap
  const heatmapData = useMemo(() => {
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

    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    filteredData.forEach(entry => {
      if (!passesFilters(entry)) return;
      const date = new Date(entry.ts);
      if (isNaN(date.getTime())) return;
      grid[date.getDay()][date.getHours()] += 1;
    });
    let max = 0;
    grid.forEach(row => row.forEach(v => { if (v > max) max = v; }));
    return { grid, max };
  }, [filteredData, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);

  const dayOfWeekData = useMemo(() => {
    const days = [
      { name: 'Sun', fullName: 'Sunday', dayNum: 0, count: 0, totalMs: 0 },
      { name: 'Mon', fullName: 'Monday', dayNum: 1, count: 0, totalMs: 0 },
      { name: 'Tue', fullName: 'Tuesday', dayNum: 2, count: 0, totalMs: 0 },
      { name: 'Wed', fullName: 'Wednesday', dayNum: 3, count: 0, totalMs: 0 },
      { name: 'Thu', fullName: 'Thursday', dayNum: 4, count: 0, totalMs: 0 },
      { name: 'Fri', fullName: 'Friday', dayNum: 5, count: 0, totalMs: 0 },
      { name: 'Sat', fullName: 'Saturday', dayNum: 6, count: 0, totalMs: 0 }
    ];
    
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

    filteredData.forEach(entry => {
      if (passesFilters(entry)) {
        const date = new Date(entry.ts);
        const day = date.getDay();

        days[day].count += 1;
        days[day].totalMs += entry.ms_played;
      }
    });

    // Calculate average time per day
    const totalDays = {};

    filteredData.forEach(entry => {
      if (passesFilters(entry)) {
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
  }, [filteredData, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);
  
  // Monthly/seasonal analysis
  const monthlyData = useMemo(() => {
    const south = hemisphere === 'south';
    // Season of each calendar month (0=spring, 1=summer, 2=fall, 3=winter)
    const seasonOfMonth = south
      ? [1, 1, 2, 2, 2, 3, 3, 3, 0, 0, 0, 1]
      : [3, 3, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3];
    const seasonKeys = ['spring', 'summer', 'fall', 'winter'];

    const MONTH_NAMES = [
      ['Jan', 'January'], ['Feb', 'February'], ['Mar', 'March'], ['Apr', 'April'],
      ['May', 'May'], ['Jun', 'June'], ['Jul', 'July'], ['Aug', 'August'],
      ['Sep', 'September'], ['Oct', 'October'], ['Nov', 'November'], ['Dec', 'December'],
    ];
    const months = MONTH_NAMES.map(([name, fullName], i) => ({
      name, fullName, monthNum: i, count: 0, totalMs: 0,
      color: chartColors.seasonColors[seasonKeys[seasonOfMonth[i]]],
    }));

    // Group months into seasons (month ranges depend on hemisphere)
    const seasons = [
      { name: 'Spring', fullName: south ? 'Spring (Sep-Nov)' : 'Spring (Mar-May)', count: 0, totalMs: 0, color: chartColors.seasonColors.spring },
      { name: 'Summer', fullName: south ? 'Summer (Dec-Feb)' : 'Summer (Jun-Aug)', count: 0, totalMs: 0, color: chartColors.seasonColors.summer },
      { name: 'Fall', fullName: south ? 'Fall (Mar-May)' : 'Fall (Sep-Nov)', count: 0, totalMs: 0, color: chartColors.seasonColors.fall },
      { name: 'Winter', fullName: south ? 'Winter (Jun-Aug)' : 'Winter (Dec-Feb)', count: 0, totalMs: 0, color: chartColors.seasonColors.winter }
    ];
    
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

    filteredData.forEach(entry => {
      if (passesFilters(entry)) {
        const date = new Date(entry.ts);
        const month = date.getMonth();

        months[month].count += 1;
        months[month].totalMs += entry.ms_played;

        // Add to seasons
        const si = seasonOfMonth[month];
        seasons[si].count += 1;
        seasons[si].totalMs += entry.ms_played;
      }
    });

    return { months, seasons };
  }, [filteredData, chartColors.seasonColors, hemisphere, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);

  // Location data aggregation from conn_country
  const { locationData, unmatchedCodes, regionData, countrySongs } = useMemo(() => {
    const countryMap = {};
    const regionMap = {};
    const songMap = {};
    const invalidCodes = {};

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

    filteredData.forEach(entry => {
      // Support both Spotify (conn_country: 2-letter code) and Tidal (country: full name)
      const rawCountry = entry.conn_country || entry.country;
      if (passesFilters(entry) && rawCountry) {
        const raw = rawCountry.trim();
        // Try as 2-letter ISO code first, then look up full country name
        let code;
        const upper = raw.toUpperCase();
        if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
          code = upper;
        } else {
          code = countryNameToCode[raw.toLowerCase()];
        }
        if (!code) {
          invalidCodes[raw] = (invalidCodes[raw] || 0) + 1;
          return;
        }
        if (!countryMap[code]) {
          countryMap[code] = { country: code.toLowerCase(), plays: 0, totalMs: 0, artists: new Set(), songs: new Set() };
        }
        countryMap[code].plays += 1;
        countryMap[code].totalMs += entry.ms_played;
        if (entry.master_metadata_album_artist_name) countryMap[code].artists.add(entry.master_metadata_album_artist_name);
        if (entry.master_metadata_track_name) countryMap[code].songs.add(entry.master_metadata_track_name);

        // Collect region/city data (Tidal entries have region and city fields)
        const regionName = entry.region;
        const cityName = entry.city;
        if (regionName || cityName) {
          if (!regionMap[code]) regionMap[code] = { regions: {}, cities: {} };
          if (regionName) {
            if (!regionMap[code].regions[regionName]) {
              regionMap[code].regions[regionName] = { plays: 0, totalMs: 0, artists: new Set(), songs: new Set() };
            }
            const r = regionMap[code].regions[regionName];
            r.plays += 1;
            r.totalMs += entry.ms_played;
            if (entry.master_metadata_album_artist_name) r.artists.add(entry.master_metadata_album_artist_name);
            if (entry.master_metadata_track_name) r.songs.add(entry.master_metadata_track_name);
          }
          if (cityName) {
            if (!regionMap[code].cities[cityName]) {
              regionMap[code].cities[cityName] = { plays: 0, totalMs: 0, artists: new Set(), songs: new Set() };
            }
            const c = regionMap[code].cities[cityName];
            c.plays += 1;
            c.totalMs += entry.ms_played;
            if (entry.master_metadata_album_artist_name) c.artists.add(entry.master_metadata_album_artist_name);
            if (entry.master_metadata_track_name) c.songs.add(entry.master_metadata_track_name);
          }
        }

        // Collect per-country song data for countries without regional info
        const track = entry.master_metadata_track_name;
        const artist = entry.master_metadata_album_artist_name;
        if (track && artist) {
          if (!songMap[code]) songMap[code] = {};
          const key = `${track}\0${artist}`;
          if (!songMap[code][key]) songMap[code][key] = { track, artist, plays: 0, totalMs: 0 };
          songMap[code][key].plays += 1;
          songMap[code][key].totalMs += entry.ms_played;
        }
      }
    });

    const matched = [];
    const unmatched = [];

    const ignoredCodes = new Set(['ZZ']);

    Object.entries(countryMap).forEach(([code, d]) => {
      if (ignoredCodes.has(code)) return;
      let name;
      try { const n = countryNames.of(code); name = (n && !n.toLowerCase().includes('unknown')) ? n : null; } catch { name = null; }

      const entry = {
        country: d.country,
        code,
        name: name || code,
        value: d.plays,
        plays: d.plays,
        totalMs: d.totalMs,
        artists: d.artists.size,
        songs: d.songs.size,
      };

      if (name) {
        matched.push(entry);
      } else {
        unmatched.push(entry);
      }
    });

    // Also add fully invalid codes to unmatched
    Object.entries(invalidCodes).forEach(([raw, plays]) => {
      unmatched.push({ code: raw, name: raw, plays, totalMs: 0, artists: 0, songs: 0, country: raw.toLowerCase(), value: plays });
    });

    matched.sort((a, b) => b.plays - a.plays);
    unmatched.sort((a, b) => b.plays - a.plays);

    // Convert regionMap sets to counts for serialization
    const regionDataFinal = {};
    Object.entries(regionMap).forEach(([code, data]) => {
      regionDataFinal[code] = {
        regions: Object.entries(data.regions)
          .map(([name, r]) => ({ name, plays: r.plays, totalMs: r.totalMs, artists: r.artists.size, songs: r.songs.size }))
          .sort((a, b) => b.plays - a.plays),
        cities: Object.entries(data.cities)
          .map(([name, c]) => ({ name, plays: c.plays, totalMs: c.totalMs, artists: c.artists.size, songs: c.songs.size }))
          .sort((a, b) => b.plays - a.plays),
      };
    });

    // Convert songMap to sorted arrays
    const countrySongsFinal = {};
    Object.entries(songMap).forEach(([code, songs]) => {
      countrySongsFinal[code] = Object.values(songs).sort((a, b) => b.plays - a.plays);
    });

    return { locationData: matched, unmatchedCodes: unmatched, regionData: regionDataFinal, countrySongs: countrySongsFinal };
  }, [filteredData, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);

  // Pie slice % labels — ink picked per slice, thin slices labeled outside
  const pieLabel = makePieLabel({ outsideInk: chart.axis });

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded font-medium ${
        activeTab === id ? colors.buttonActive : colors.buttonInactive
      }`}
    >
      {label}
    </button>
  );

  // Function to get title based on year selection mode
  const getPageTitle = () => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return <span>Listening Patterns <span className="text-xs opacity-75">{yearRange.startYear}-{yearRange.endYear}</span></span>;
    } else if (selectedYear === 'all') {
      return <span>Listening Patterns <span className="text-xs opacity-75">all-time</span></span>;
    } else {
      return <span>Listening Patterns <span className="text-xs opacity-75">{selectedYear}</span></span>;
    }
  };

  return (
   <div className={`w-full ${colors.text}`}>
    {/* Title - mobile gets its own row */}
    <div className="hidden">
      <h3 className={`text-xl ${colors.text}`}>
        {getPageTitle()}
      </h3>
    </div>

    {/* Desktop layout - title, tabs, and controls all on one row */}
    <div className="hidden sm:flex items-center mb-2 gap-2">
      <div className="flex-1 min-w-0">
        <h3 className={`text-xl ${colors.text} truncate`}>
          {getPageTitle()} <span className="opacity-50">/</span> <span className="text-base">{{ timeOfDay: 'Time of Day', dayOfWeek: 'Day of Week', seasonal: 'Seasonal', obsessions: 'Obsessions', streaming: 'Streaming', locations: 'Locations' }[activeTab]}</span>
        </h3>
      </div>
      <div className="flex flex-wrap gap-1 items-center justify-center shrink-0">
        <TabButton id="timeOfDay" label="Time of Day" />
        <TabButton id="dayOfWeek" label="Day of Week" />
        <TabButton id="seasonal" label="Seasonal" />
        <TabButton id="obsessions" label="Obsessions" />
        <TabButton id="streaming" label="Streaming" />
        <TabButton id="locations" label="Locations" />
      </div>
      <div className="flex-1 flex justify-end">
      {activeTab === 'obsessions' && (
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 ${colors.text}`}>
            <label className="text-xs">Top</label>
            <input
              type="number"
              min="1"
              max="250"
              defaultValue={obsTopN}
              key={`topn-${obsTopN}`}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
              onBlur={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= 250) setObsTopN(v); else e.target.value = obsTopN; }}
              className={`border rounded w-14 px-1 py-1 text-xs ${colors.text} ${colors.input}`}
            />
          </div>
          <div className={`flex items-center gap-1 ${colors.text}`}>
            <label className="text-xs">Min/wk</label>
            <input
              type="number"
              min="1"
              max="20"
              value={obsIntensityThreshold}
              onChange={(e) => setObsIntensityThreshold(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className={`border rounded w-14 px-1 py-1 text-xs ${colors.text} ${colors.input}`}
            />
          </div>
          <button
            onClick={() => setObsShowExporter(!obsShowExporter)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${obsShowExporter ? colors.buttonActive : colors.buttonInactive}`}
          >
            <Download size={12} />
            m3u
          </button>
          <button
            key={`obs-sort-${obsSortPress}`}
            onClick={() => { setObsSortBy(obsSortBy === 'playsInWeek' ? 'playCount' : obsSortBy === 'playCount' ? 'weekStart' : 'playsInWeek'); setObsSortPress(p => p + 1); }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.buttonInactive} ${obsSortPress > 0 ? (isColorful ? (isDarkMode ? 'btn-press-yellow-dark' : 'btn-press-yellow-light') : (isDarkMode ? 'btn-press-dark' : 'btn-press-light')) : ''}`}
          >
            {{ playsInWeek: 'Weekly Plays', playCount: 'Total Plays', weekStart: 'Recent First' }[obsSortBy]}
          </button>
          <button
            key={`obs-view-${viewPress}`}
            onClick={() => { setViewMode(viewMode === 'grid' ? 'list' : 'grid'); setViewPress(p => p + 1); }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.buttonInactive} ${viewPress > 0 ? (isColorful ? (isDarkMode ? 'btn-press-yellow-dark' : 'btn-press-yellow-light') : (isDarkMode ? 'btn-press-dark' : 'btn-press-light')) : ''}`}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </button>
        </div>
      )}
      {activeTab === 'dayOfWeek' && (
        <button
          key={`dow-${dayOfWeekPress}`}
          onClick={() => { setDayOfWeekViewMode(dayOfWeekViewMode === 'plays' ? 'average' : 'plays'); setDayOfWeekPress(p => p + 1); }}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.buttonInactive} ${dayOfWeekPress > 0 ? (isColorful ? (isDarkMode ? 'btn-press-yellow-dark' : 'btn-press-yellow-light') : (isDarkMode ? 'btn-press-dark' : 'btn-press-light')) : ''}`}
        >
          {dayOfWeekViewMode === 'plays' ? 'Total' : 'Average'}
        </button>
      )}
      {activeTab === 'locations' && (
        <div className="flex items-center gap-2">
          <button
            key={`map-${mapViewPress}`}
            onClick={() => { setMapView(mapView === 'flat' ? 'globe' : 'flat'); setMapViewPress(p => p + 1); }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.buttonInactive} ${mapViewPress > 0 ? (isColorful ? (isDarkMode ? 'btn-press-yellow-dark' : 'btn-press-yellow-light') : (isDarkMode ? 'btn-press-dark' : 'btn-press-light')) : ''}`}
          >
            {mapView === 'flat' ? 'Globe' : 'Map'}
          </button>
          <button
            key={`loc-view-${viewPress}`}
            onClick={() => { setViewMode(viewMode === 'grid' ? 'list' : 'grid'); setViewPress(p => p + 1); }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.buttonInactive} ${viewPress > 0 ? (isColorful ? (isDarkMode ? 'btn-press-yellow-dark' : 'btn-press-yellow-light') : (isDarkMode ? 'btn-press-dark' : 'btn-press-light')) : ''}`}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </button>
        </div>
      )}
      </div>
    </div>

    {/* Mobile controls - separate row */}
    <div className="block sm:hidden mb-2">
      <div className="flex flex-wrap gap-1 justify-center">
        <TabButton id="timeOfDay" label="Time" />
        <TabButton id="dayOfWeek" label="Day" />
        <TabButton id="seasonal" label="Season" />
        <TabButton id="obsessions" label="Obsess" />
        <TabButton id="streaming" label="Stream" />
        <TabButton id="locations" label="Map" />
      </div>
    </div>

    {activeTab === 'timeOfDay' && (
      <div className="space-y-6">
        <div>
          <h3 className={`text-sm font-bold mb-2 sm:hidden ${
            colors.text
          }`}>Listening by Time of Day</h3>
          <p className={`mb-4 ${
            colors.textLight
          }`}>When do you listen to music the most?</p>
          
          <div className={`h-48 sm:h-64 w-full p-1 sm:p-2 ${colors.card}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timeOfDayData.hourly}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis
                  dataKey="displayHour"
                  interval="preserveStartEnd"
                  {...axisProps(chart)}
                />
                <YAxis {...axisProps(chart)} />
                <Tooltip
                  formatter={(value, name) => {
                    return name === 'totalMs' ? formatDuration(value) : value;
                  }}
                  labelFormatter={(value) => `Hour: ${value}`}
                  {...tooltipProps(chart)}
                />
                <Bar name="Number of Plays" dataKey="count" fill={chart.series1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {heatmapData.max > 0 && (
          <div>
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${colors.text}`}>Weekly Rhythm</h3>
            <p className={`mb-4 ${colors.textLight}`}>Your listening by hour and day of the week</p>
            <div className={`p-3 sm:p-4 ${colors.card} overflow-x-auto`}>
              <div className={isNarrow ? undefined : 'min-w-[560px]'}>
                {(() => {
                  const scale = [...chart.ramp(5)].reverse();
                  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const cellColor = (count) => {
                    if (count === 0) return null;
                    const idx = Math.min(4, Math.floor(Math.sqrt(count / heatmapData.max) * 5));
                    return scale[idx];
                  };
                  const hourName = (h) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
                  const legend = (
                    <div className={`mt-3 flex items-center justify-end gap-1 text-[10px] ${colors.textLighter}`}>
                      fewer
                      {scale.map((c) => (
                        <span key={c} className="inline-block w-3 h-3 rounded-[2px]" style={{ backgroundColor: c }} />
                      ))}
                      more
                    </div>
                  );

                  if (isNarrow) {
                    // Transposed for phones: hours run down, days across
                    return (
                      <>
                        <div className="flex items-center gap-[2px] mb-0.5">
                          <span className="w-9 shrink-0" />
                          {DAYS.map((day) => (
                            <span key={day} className={`flex-1 text-center text-[10px] font-bold ${colors.textLight}`}>{day}</span>
                          ))}
                        </div>
                        {Array.from({ length: 24 }, (_, h) => (
                          <div key={h} className="flex items-center gap-[2px] mb-[2px]">
                            <span className={`w-9 shrink-0 text-[9px] ${colors.textLighter}`}>
                              {h % 3 === 0 ? hourName(h).replace(' ', '') : ''}
                            </span>
                            {DAYS.map((day, d) => {
                              const count = heatmapData.grid[d][h];
                              return (
                                <div
                                  key={d}
                                  className="flex-1 h-3.5 rounded-[2px]"
                                  style={{
                                    backgroundColor: cellColor(count) || 'transparent',
                                    boxShadow: count === 0 ? `inset 0 0 0 1px ${chart.grid}` : 'none',
                                  }}
                                  title={`${day} ${hourName(h)} — ${count} play${count === 1 ? '' : 's'}`}
                                />
                              );
                            })}
                          </div>
                        ))}
                        {legend}
                      </>
                    );
                  }

                  return (
                    <>
                      {DAYS.map((day, d) => (
                        <div key={day} className="flex items-center gap-[2px] mb-[2px]">
                          <span className={`w-9 shrink-0 text-[10px] font-bold ${colors.textLight}`}>{day}</span>
                          {heatmapData.grid[d].map((count, h) => (
                            <div
                              key={h}
                              className="flex-1 h-4 rounded-[2px]"
                              style={{
                                backgroundColor: cellColor(count) || 'transparent',
                                boxShadow: count === 0 ? `inset 0 0 0 1px ${chart.grid}` : 'none',
                              }}
                              title={`${day} ${hourName(h)} — ${count} play${count === 1 ? '' : 's'}`}
                            />
                          ))}
                        </div>
                      ))}
                      <div className="flex items-center gap-[2px]">
                        <span className="w-9 shrink-0" />
                        {Array.from({ length: 24 }, (_, h) => (
                          <span key={h} className={`flex-1 text-center text-[9px] ${colors.textLighter}`}>
                            {h % 6 === 0 ? hourName(h).replace(' ', '') : ''}
                          </span>
                        ))}
                      </div>
                      {legend}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="timeOfDay">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              colors.text
            }`}>Time Periods</h3>
            <div className={`h-48 sm:h-64 p-1 sm:p-2 ${colors.card}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeOfDayData.periods}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="80%"
                    labelLine={false}
                    label={pieLabel}
                    stroke={chart.pieStroke}
                    strokeWidth={2}
                  >
                    {timeOfDayData.periods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    {(() => {
                      const total = timeOfDayData.periods.reduce((sum, p) => sum + p.count, 0);
                      const peak = timeOfDayData.periods.reduce((m, p) => (p.count > (m?.count || 0) ? p : m), null);
                      return peak && total > 0 ? (
                        <Label content={donutCenter({
                          value: `${Math.round((peak.count / total) * 100)}%`,
                          caption: peak.name.toLowerCase(),
                          ink: chart.axis,
                        })} />
                      ) : null;
                    })()}
                  </Pie>
                  <Tooltip
                    formatter={(value) => value}
                    labelFormatter={(name) => {
                      const period = timeOfDayData.periods.find(p => p.name === name);
                      return period ? period.fullName : name;
                    }}
                    {...tooltipProps(chart)}
                  />
                  <Legend {...legendProps(chart)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              colors.text
            }`}>Time Period Stats</h3>
            <ul className="space-y-2">
              {timeOfDayData.periods.map((period, index) => (
                <li key={index} className={`p-2 ${colors.card}`}>
                  <span className={`font-bold flex items-center gap-2 ${colors.text}`}>
                    <SliceDot color={period.color} />
                    {period.fullName}:
                  </span>
                  <div className={`ml-5 ${colors.textLight}`}>
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
              <h3 className={`text-sm font-bold sm:hidden ${
                colors.text
              }`}>Listening by Day of Week</h3>
              <p className={`${
                colors.textLight
              }`}>Which days do you stream music the most?</p>
            </div>
            <div className={`flex rounded-lg p-1 sm:hidden ${colors.toggleBg}`}>
              <button
                onClick={() => setDayOfWeekViewMode('plays')}
                className={`px-2 py-1 rounded-lg text-xs flex-1 ${
                  dayOfWeekViewMode === 'plays' ? colors.toggleActive : colors.toggleInactive
                }`}
              >
                Total
              </button>
              <button
                onClick={() => setDayOfWeekViewMode('average')}
                className={`px-2 py-1 rounded-lg text-xs flex-1 ${
                  dayOfWeekViewMode === 'average' ? colors.toggleActive : colors.toggleInactive
                }`}
              >
                Average
              </button>
            </div>
          </div>
          
          <div className={`h-48 sm:h-64 w-full p-1 sm:p-2 ${colors.card}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dayOfWeekData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="name" {...axisProps(chart)} />
                <YAxis {...axisProps(chart)} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'totalMs') return formatDuration(value);
                    if (name === 'Number of Plays') return `${value} plays`;
                    if (name === 'Average per Day') return `${value.toFixed(1)} plays per day`;
                    return value;
                  }}
                  labelFormatter={(label) => {
                    const day = dayOfWeekData.find(d => d.name === label);
                    return day ? day.fullName : label;
                  }}
                  {...tooltipProps(chart)}
                />
                {dayOfWeekViewMode === 'plays' ? (
                  <Bar name="Number of Plays" dataKey="count" fill={chart.series1} radius={[4, 4, 0, 0]} />
                ) : (
                  <Bar name="Average per Day" dataKey="avgPerDay" fill={chart.series2} radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div>
          <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
            colors.text
          }`}>Day of Week Stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
            {dayOfWeekData.map((day, index) => {
              const byAverage = dayOfWeekViewMode === 'average';
              const maxVal = Math.max(...dayOfWeekData.map(d => (byAverage ? d.avgPerDay : d.count)), 0);
              return (
              <div key={index} className={`p-3 relative ${colors.card}`}>
                {(dayOfWeekViewMode === 'plays' && day.isTopByCount) ||
                (dayOfWeekViewMode === 'average' && day.isTopByAverage) ? (
                  <div className="absolute -top-2 -right-2 text-yellow-500 text-2xl">★</div>
                ) : null}
                <h4 className={`font-bold ${
                  colors.text
                }`}>{day.fullName}</h4>
                <div className={`text-sm ${
                  colors.textLight
                }`}>
                  <div>Total Plays: {day.count}</div>
                  <div>Listening Time: {formatDuration(day.totalMs)}</div>
                  <div>Avg. Plays Per Day: {day.avgPerDay.toFixed(1)}</div>
                </div>
                {/* Relative to the busiest day, following the Total/Average toggle */}
                <div className={colors.text}>
                  <RankBar
                    value={byAverage ? day.avgPerDay : day.count}
                    max={maxVal}
                    label={byAverage ? `${day.avgPerDay.toFixed(1)}/day` : `${day.count.toLocaleString()} plays`}
                  />
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {activeTab === 'seasonal' && (
      <div className="space-y-6">
        <div>
          <h3 className={`text-sm font-bold mb-2 sm:hidden ${
            colors.text
          }`}>Listening by Month</h3>
          <div className="flex items-start justify-between gap-2 mb-4">
            <p className={colors.textLight}>How does your listening change throughout the year?</p>
            <button
              onClick={toggleHemisphere}
              title="Seasons differ by hemisphere — switch to match where you live"
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded font-medium shrink-0 ${colors.buttonInactive}`}
            >
              {hemisphere === 'north' ? '🌍 Northern seasons' : '🌏 Southern seasons'}
            </button>
          </div>
          
          <div className={`h-48 sm:h-64 w-full p-1 sm:p-2 ${colors.card}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData.months}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="name" {...axisProps(chart)} />
                <YAxis {...axisProps(chart)} />
                <Tooltip
                  formatter={(value, name) => {
                    return name === 'totalMs' ? formatDuration(value) : value;
                  }}
                  labelFormatter={(label) => {
                    const month = monthlyData.months.find(m => m.name === label);
                    return month ? month.fullName : label;
                  }}
                  {...tooltipProps(chart)}
                />
                <Bar name="Number of Plays" dataKey="count" radius={[4, 4, 0, 0]}>
                  {monthlyData.months.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="seasonal">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              colors.text
            }`}>Seasonal Listening</h3>
            <div className={`h-48 sm:h-64 p-1 sm:p-2 ${colors.card}`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={monthlyData.seasons}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="52%"
                    outerRadius="80%"
                    labelLine={false}
                    label={pieLabel}
                    stroke={chart.pieStroke}
                    strokeWidth={2}
                  >
                    {monthlyData.seasons.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    {(() => {
                      const total = monthlyData.seasons.reduce((sum, s) => sum + s.count, 0);
                      const peak = monthlyData.seasons.reduce((m, s) => (s.count > (m?.count || 0) ? s : m), null);
                      return peak && total > 0 ? (
                        <Label content={donutCenter({
                          value: `${Math.round((peak.count / total) * 100)}%`,
                          caption: peak.name.toLowerCase(),
                          ink: chart.axis,
                        })} />
                      ) : null;
                    })()}
                  </Pie>
                  <Tooltip
                    formatter={(value) => value}
                    labelFormatter={(name) => {
                      const season = monthlyData.seasons.find(s => s.name === name);
                      return season ? season.fullName : name;
                    }}
                    {...tooltipProps(chart)}
                  />
                  <Legend {...legendProps(chart)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <h3 className={`text-sm sm:text-lg font-bold mb-2 ${
              colors.text
            }`}>Seasonal Stats</h3>
            <ul className="space-y-2">
              {monthlyData.seasons.map((season, index) => (
                <li key={index} className={`p-2 ${colors.card}`}>
                  <span className={`font-bold flex items-center gap-2 ${colors.text}`}>
                    <SliceDot color={season.color} />
                    {season.fullName}:
                  </span>
                  <div className={`ml-5 ${colors.textLight}`}>
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

    {activeTab === 'obsessions' && (
      <div className="space-y-6">
        <TrackRankings
          processedData={[]}
          briefObsessions={briefObsessions}
          songsByYear={songsByYear}
          formatDuration={formatDuration}
          initialYear={selectedYear}
          yearRange={yearRange}
          yearRangeMode={yearRangeMode}
          textTheme="yellow"
          backgroundTheme="yellow"
          colorTheme="yellow"
          colorMode={colorMode}
          viewMode={viewMode}
          externalControls={{
            topN: obsTopN,
            setTopN: setObsTopN,
            intensityThreshold: obsIntensityThreshold,
            setIntensityThreshold: setObsIntensityThreshold,
            sortBy: obsSortBy,
            setSortBy: setObsSortBy,
            showExporter: obsShowExporter,
            setShowExporter: setObsShowExporter
          }}
          gridToggle={
            <button
              key={`obs-grid-${viewPress}`}
              onClick={() => { setViewMode(viewMode === 'grid' ? 'list' : 'grid'); setViewPress(p => p + 1); }}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.buttonInactive} ${viewPress > 0 ? (isColorful ? (isDarkMode ? 'btn-press-yellow-dark' : 'btn-press-yellow-light') : (isDarkMode ? 'btn-press-dark' : 'btn-press-light')) : ''}`}
            >
              {viewMode === 'grid' ? '☰' : '⊞'}
            </button>
          }
        />
      </div>
    )}

    {activeTab === 'streaming' && (
      <StreamingByYear
        rawPlayData={filteredData}
        formatDuration={formatDuration}
        isDarkMode={isDarkMode}
        textTheme="yellow"
        backgroundTheme="yellow"
        colorMode={colorMode}
        trackDurationMap={trackDurationMap}
      />
    )}

    {activeTab === 'locations' && (
      <div className="space-y-6">
        <div>
          <h3 className={`text-sm font-bold mb-2 sm:hidden ${colors.text}`}>Listening Locations</h3>
          <p className={`mb-4 ${colors.textLight}`}>
            {selectedCountry ? (
              <>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className={`inline-flex items-center gap-1 mr-2 px-2 py-0.5 rounded text-xs font-bold border ${colors.border} ${colors.bgCard} ${colors.text} hover:opacity-80`}
                >
                  ← Back to world
                </button>
                {selectedCountry.name}
              </>
            ) : (
              'Countries where you\'ve listened to music'
            )}
          </p>

          {locationData.length > 0 ? (
            <>
              {!selectedCountry && (
                <>
                  <div className="flex justify-end mb-2 sm:hidden">
                    <button
                      key={`map-mobile-${mapViewPress}`}
                      onClick={() => { setMapView(mapView === 'flat' ? 'globe' : 'flat'); setMapViewPress(p => p + 1); }}
                      className={`px-3 py-1 text-xs font-bold rounded border transition-all ${colors.buttonInactive} ${mapViewPress > 0 ? (isColorful ? (isDarkMode ? 'btn-press-yellow-dark' : 'btn-press-yellow-light') : (isDarkMode ? 'btn-press-dark' : 'btn-press-light')) : ''}`}
                    >
                      {mapView === 'flat' ? 'Globe' : 'Map'}
                    </button>
                  </div>
                  {mapView === 'flat' ? (
                    <div className={`p-2 sm:p-4 ${colors.card} flex justify-center overflow-x-auto`}>
                      <WorldMap
                        color={isColorful ? chart.series1 : (isDarkMode ? '#ffffff' : '#000000')}
                        valueSuffix=" plays"
                        size="xxl"
                        data={locationData}
                        backgroundColor={isColorful ? chart.pieStroke : (isDarkMode ? '#000000' : '#ffffff')}
                        tooltipBgColor={chart.tooltip.backgroundColor}
                        tooltipTextColor={chart.tooltip.color}
                        borderColor={isColorful ? chart.series1 : (isDarkMode ? '#ffffff' : '#000000')}
                        strokeOpacity={isColorful ? 0.6 : 0.3}
                        richInteraction
                        onClickFunction={({ countryCode, countryName }) => {
                          const code = countryCode.toUpperCase();
                          const loc = locationData.find(l => l.code === code);
                          if (loc) setSelectedCountry({ code, name: loc.name });
                        }}
                        styleFunction={({ countryCode, color, minValue, maxValue, countryValue }) => ({
                          fill: countryValue ? color : isColorful ? chart.pieStroke : (isDarkMode ? '#1a1a1a' : '#f0f0f0'),
                          stroke: isColorful ? chart.series1 : (isDarkMode ? '#ffffff' : '#000000'),
                          strokeWidth: 0.5,
                          strokeOpacity: isColorful ? 0.6 : 0.3,
                          cursor: countryValue ? 'pointer' : 'default',
                        })}
                      />
                    </div>
                  ) : (
                    <div className={`p-2 sm:p-4 ${colors.card} flex justify-center`}>
                      <HologramGlobe
                        locationData={locationData}
                        onCountryClick={({ countryCode, countryName }) => {
                          const code = countryCode.toUpperCase();
                          const loc = locationData.find(l => l.code === code);
                          if (loc) setSelectedCountry({ code, name: loc.name });
                        }}
                        isDarkMode={isDarkMode}
                        isColorful={isColorful}
                        colors={colors}
                      />
                    </div>
                  )}
                </>
              )}

              {selectedCountry ? (() => {
                const countryLoc = locationData.find(l => l.code === selectedCountry.code);
                const rd = regionData[selectedCountry.code];
                return (
                  <div className="space-y-4">
                    {/* Country summary */}
                    <div className={`p-4 ${colors.card}`}>
                      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 text-center`}>
                        <div>
                          <div className={`text-lg font-bold ${colors.text}`}>{countryLoc?.plays.toLocaleString() || 0}</div>
                          <div className={`text-xs ${colors.textLighter}`}>plays</div>
                        </div>
                        <div>
                          <div className={`text-lg font-bold ${colors.text}`}>{countryLoc ? formatDuration(countryLoc.totalMs) : '0s'}</div>
                          <div className={`text-xs ${colors.textLighter}`}>listening time</div>
                        </div>
                        <div>
                          <div className={`text-lg font-bold ${colors.text}`}>{countryLoc?.artists.toLocaleString() || 0}</div>
                          <div className={`text-xs ${colors.textLighter}`}>artists</div>
                        </div>
                        <div>
                          <div className={`text-lg font-bold ${colors.text}`}>{countryLoc?.songs.toLocaleString() || 0}</div>
                          <div className={`text-xs ${colors.textLighter}`}>songs</div>
                        </div>
                      </div>
                    </div>

                    {rd ? (
                      <>
                        {/* Regions */}
                        {rd.regions.length > 0 && (
                          <div>
                            <h4 className={`text-sm font-bold mb-2 ${colors.text}`}>Regions / States</h4>
                            {viewMode === 'grid' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                                {rd.regions.map((r, i) => (
                                  <div key={r.name} className={`p-3 relative ${colors.card}`}>
                                    <div className={`absolute top-2 right-2 text-xs font-bold ${colors.textLighter}`}>#{i + 1}</div>
                                    <h4 className={`font-bold ${colors.text}`}>{r.name}</h4>
                                    <div className={`text-sm ${colors.textLight}`}>
                                      <div>{r.plays.toLocaleString()} plays</div>
                                      <div>{formatDuration(r.totalMs)}</div>
                                      <div>{r.artists.toLocaleString()} artists</div>
                                      <div>{r.songs.toLocaleString()} songs</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={`overflow-x-auto rounded border ${colors.border}`}>
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className={`${colors.bgCard} border-b ${colors.border}`}>
                                      <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>#</th>
                                      <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>Region</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Plays</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Time</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Artists</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Songs</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rd.regions.map((r, i) => (
                                      <tr key={r.name} className={`border-b ${colors.border} ${colors.bgCardAlt}`}>
                                        <td className={`px-3 py-2 ${colors.textLighter}`}>{i + 1}</td>
                                        <td className={`px-3 py-2 font-medium ${colors.text}`}>{r.name}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{r.plays.toLocaleString()}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{formatDuration(r.totalMs)}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{r.artists.toLocaleString()}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{r.songs.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Cities */}
                        {rd.cities.length > 0 && (
                          <div>
                            <h4 className={`text-sm font-bold mb-2 ${colors.text}`}>Cities</h4>
                            {viewMode === 'grid' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                                {rd.cities.map((c, i) => (
                                  <div key={c.name} className={`p-3 relative ${colors.card}`}>
                                    <div className={`absolute top-2 right-2 text-xs font-bold ${colors.textLighter}`}>#{i + 1}</div>
                                    <h4 className={`font-bold ${colors.text}`}>{c.name}</h4>
                                    <div className={`text-sm ${colors.textLight}`}>
                                      <div>{c.plays.toLocaleString()} plays</div>
                                      <div>{formatDuration(c.totalMs)}</div>
                                      <div>{c.artists.toLocaleString()} artists</div>
                                      <div>{c.songs.toLocaleString()} songs</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={`overflow-x-auto rounded border ${colors.border}`}>
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className={`${colors.bgCard} border-b ${colors.border}`}>
                                      <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>#</th>
                                      <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>City</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Plays</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Time</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Artists</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Songs</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rd.cities.map((c, i) => (
                                      <tr key={c.name} className={`border-b ${colors.border} ${colors.bgCardAlt}`}>
                                        <td className={`px-3 py-2 ${colors.textLighter}`}>{i + 1}</td>
                                        <td className={`px-3 py-2 font-medium ${colors.text}`}>{c.name}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{c.plays.toLocaleString()}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{formatDuration(c.totalMs)}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{c.artists.toLocaleString()}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{c.songs.toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className={`p-4 ${colors.card}`}>
                          <p className={`text-sm ${colors.textLight}`}>Regional data is only available for Tidal plays. This country only has country-level data from Spotify.</p>
                        </div>

                        {countrySongs[selectedCountry.code]?.length > 0 && (
                          <div>
                            <h4 className={`text-sm font-bold mb-2 ${colors.text}`}>Top Songs</h4>
                            {viewMode === 'grid' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                                {countrySongs[selectedCountry.code].slice(0, 50).map((s, i) => (
                                  <div key={`${s.track}-${s.artist}`} className={`p-3 relative ${colors.card}`}>
                                    <div className={`absolute top-2 right-2 text-xs font-bold ${colors.textLighter}`}>#{i + 1}</div>
                                    <h4 className={`font-bold text-sm ${colors.text} pr-8`}>{s.track}</h4>
                                    <div className={`text-xs ${colors.textLight}`}>{s.artist}</div>
                                    <div className={`text-sm mt-1 ${colors.textLight}`}>
                                      <span>{s.plays.toLocaleString()} plays</span>
                                      <span className="mx-1">&middot;</span>
                                      <span>{formatDuration(s.totalMs)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={`overflow-x-auto rounded border ${colors.border}`}>
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className={`${colors.bgCard} border-b ${colors.border}`}>
                                      <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>#</th>
                                      <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>Song</th>
                                      <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>Artist</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Plays</th>
                                      <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Time</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {countrySongs[selectedCountry.code].slice(0, 50).map((s, i) => (
                                      <tr key={`${s.track}-${s.artist}`} className={`border-b ${colors.border} ${colors.bgCardAlt}`}>
                                        <td className={`px-3 py-2 ${colors.textLighter}`}>{i + 1}</td>
                                        <td className={`px-3 py-2 font-medium ${colors.text}`}>{s.track}</td>
                                        <td className={`px-3 py-2 ${colors.textLight}`}>{s.artist}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{s.plays.toLocaleString()}</td>
                                        <td className={`px-3 py-2 text-right ${colors.textLight}`}>{formatDuration(s.totalMs)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })() : (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 mt-4">
                      {locationData.map((loc, index) => (
                        <div
                          key={loc.code}
                          className={`p-3 ${colors.card} ${colors.text} cursor-pointer hover:opacity-80 transition-opacity`}
                          onClick={() => setSelectedCountry({ code: loc.code, name: loc.name })}
                        >
                          <div className="flex items-center gap-2">
                            <RankBadge rank={index + 1} isDarkMode={isDarkMode} />
                            <h4 className="font-bold truncate min-w-0" title={loc.name}>{loc.name}</h4>
                          </div>
                          <div className={`text-sm mt-1 ${colors.textLight}`}>
                            <div>{formatDuration(loc.totalMs)}</div>
                            <div>{loc.artists.toLocaleString()} artists</div>
                            <div>{loc.songs.toLocaleString()} songs</div>
                          </div>
                          <RankBar
                            value={loc.plays}
                            max={locationData[0]?.plays || 0}
                            label={`${loc.plays.toLocaleString()} plays`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`mt-4 overflow-x-auto rounded border ${colors.border}`}>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`${colors.bgCard} border-b ${colors.border}`}>
                            <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>#</th>
                            <th className={`px-3 py-2 text-left font-bold ${colors.text}`}>Country</th>
                            <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Plays</th>
                            <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Time</th>
                            <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Artists</th>
                            <th className={`px-3 py-2 text-right font-bold ${colors.text}`}>Songs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locationData.map((loc, index) => (
                            <tr
                              key={loc.code}
                              className={`border-b ${colors.border} ${colors.bgCardAlt} cursor-pointer hover:opacity-80 transition-opacity`}
                              onClick={() => setSelectedCountry({ code: loc.code, name: loc.name })}
                            >
                              <td className={`px-3 py-2 ${colors.textLighter}`}>{index + 1}</td>
                              <td className={`px-3 py-2 font-medium ${colors.text}`}>{loc.name}</td>
                              <td className={`px-3 py-2 text-right ${colors.textLight}`}>{loc.plays.toLocaleString()}</td>
                              <td className={`px-3 py-2 text-right ${colors.textLight}`}>{formatDuration(loc.totalMs)}</td>
                              <td className={`px-3 py-2 text-right ${colors.textLight}`}>{loc.artists.toLocaleString()}</td>
                              <td className={`px-3 py-2 text-right ${colors.textLight}`}>{loc.songs.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <p className={`${colors.textLight}`}>No location data available. The conn_country field was not found in your streaming data.</p>
          )}

          {unmatchedCodes.length > 0 && (
            <div className={`mt-6 p-3 ${colors.card}`}>
              <h4 className={`text-sm font-bold mb-2 ${colors.textLight}`}>Unrecognized region codes</h4>
              <div className={`text-xs space-y-1 ${colors.textLighter}`}>
                {unmatchedCodes.map(u => (
                  <div key={u.code}>
                    <span className="font-mono font-bold">{u.code}</span> — {u.plays.toLocaleString()} play{u.plays !== 1 ? 's' : ''}
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

export default ListeningPatterns;