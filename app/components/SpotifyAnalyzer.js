"use client";

// Normalize strings for loose search matching (strips all non-alphanumeric characters)
const normalizeForSearch = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { streamingProcessor, computeStatsFromEntries, loadOverrides, applyOverrides, STREAMING_TYPES, STREAMING_SERVICES, filterDataByDate, normalizeArtistName, createMatchKey, calculateConsecutivePlayStreaks, calculateOverallDailyStreak, calculateTopSongDailyStreak, calculateTopAlbumDailyStreak } from './streaming-adapter.js';
import CustomTrackRankings from './CustomTrackRankings.js';
import TrackRankings from './TrackRankings.js';
import CalendarView from './CalendarView.js';
import PodcastRankings from './podcast-rankings.js';
import _ from 'lodash';
import ListeningPatterns from './listening-patterns.js';
import ListeningBehavior from './listening-behavior.js';
import DiscoveryAnalysis from './discovery-analysis.js';
import { X, Trash2, Download } from 'lucide-react';
import { YearSelectorCompat as YearSelector } from './YearSelector.js';
import AlbumCard from './albumcard.js';
import AlbumsTab from './tabs/AlbumsTab.js';
import ArtistsTab from './tabs/ArtistsTab.js';
import DataTab from './tabs/DataTab.js';
import StatsTab from './tabs/StatsTab.js';
import UploadTab from './tabs/UploadTab.js';
import { RankBadge, RankBar } from './RankCardBits.js';
import { getTabColors as getSharedTabColors, getChromeTint } from './theme.js';
import CustomPlaylistCreator from './customplaylist.js';
import UpdatesSection from './updatessection.js';
import ExcelPreview from './excelpreview.js';
import ExportButton from './ExportButton.js';
import Top100Export from './Top100Export.js';
// Removed imports of exported variables that were conflicting with local state
import { useTheme } from './themeprovider.js';
// import UnifiedAuth from './unified-auth.js'; // Temporarily disabled due to React error
import GoogleDriveSync from './GoogleDriveSync.js';
import RockboxScrobbler from './RockboxScrobbler.js';
import LastfmConnect from './LastfmConnect.js';
import { getTotalCount as getLastfmCount, loadAllScrobbles as loadLastfmScrobbles } from './lastfm-db.js';
import FixedSettingsBar from './FixedSettingsBar.js';
import SettingsPanel from './SettingsPanel.js';

// Cache for service colors to avoid recreating on each render
const SERVICE_COLORS = {
  spotify: {
    unselected: 'bg-green-500 text-black',
    selected: 'bg-lime-400 text-black'
  },
  apple_music: {
    unselected: 'bg-red-400 text-white',
    selected: 'bg-red-500 text-white'
  },
  youtube_music: {
    unselected: 'bg-red-600 text-black',
    selected: 'bg-white text-red-600'
  },
  deezer: {
    unselected: 'bg-purple-400 text-black',
    selected: 'bg-purple-600 text-black'
  },
  soundcloud: {
    unselected: 'bg-orange-400 text-white',
    selected: 'bg-orange-600 text-white'
  },
  tidal: {
    unselected: 'bg-white text-black',
    selected: 'bg-black text-white'
  },
  cake: {
    unselected: 'bg-pink-300 text-black',
    selected: 'bg-cyan-500 text-white'
  }
};

const SpotifyAnalyzer = ({ 
  activeTab, 
  setActiveTab, 
  TopTabsComponent,
  // Flexible theming props - shifted text colors (4 positions down from original)
  uploadTextTheme = 'emerald',
  uploadBackgroundTheme = 'violet',
  statsTextTheme = 'green',
  statsBackgroundTheme = 'indigo',
  artistTextTheme = 'yellow',
  artistBackgroundTheme = 'blue', 
  albumTextTheme = 'cyan',
  albumBackgroundTheme = 'cyan',
  customTextTheme = 'emerald',
  customBackgroundTheme = 'emerald',
  tracksTextTheme = 'rose',
  tracksBackgroundTheme = 'red',
  patternTextTheme = 'yellow',
  patternBackgroundTheme = 'yellow',
  calendarTextTheme = 'red',
  calendarBackgroundTheme = 'green',
  behaviorTextTheme = 'cyan',
  behaviorBackgroundTheme = 'amber',
  discoveryTextTheme = 'emerald',
  discoveryBackgroundTheme = 'orange'
}) => {
  // Get the current theme and font size
  const { theme, fontSize, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Helper function to get themed colors (shared design system — see theme.js)
  const getTabColors = (textTheme, backgroundTheme) => getSharedTabColors(textTheme, backgroundTheme, isDarkMode);

  // Get themed colors for each tab
  const uploadColors = getTabColors(uploadTextTheme, uploadBackgroundTheme);
  const statsColors = getTabColors(statsTextTheme, statsBackgroundTheme);
  const artistColors = getTabColors(artistTextTheme, artistBackgroundTheme);
  const albumColors = getTabColors(albumTextTheme, albumBackgroundTheme);
  const customColors = getTabColors(customTextTheme, customBackgroundTheme);
  const tracksColors = getTabColors(tracksTextTheme, tracksBackgroundTheme);
  const patternColors = getTabColors(patternTextTheme, patternBackgroundTheme);
  const calendarColors = getTabColors(calendarTextTheme, calendarBackgroundTheme);
  const behaviorColors = getTabColors(behaviorTextTheme, behaviorBackgroundTheme);
  const discoveryColors = getTabColors(discoveryTextTheme, discoveryBackgroundTheme);
  
  // Core application state
  const [activeTrackTab, setActiveTrackTab] = useState('top250');
  const [songsByMonth, setSongsByMonth] = useState({});
  const [songsByYear, setSongsByYear] = useState({});
  const [processedData, setProcessedData] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [topArtistsCount, setTopArtistsCount] = useState(50);
  const [artistsViewMode, setArtistsViewMode] = useState('grid'); // 'grid', 'list'
  const [expandedArtistCards, setExpandedArtistCards] = useState({});
  const [artistSelectionMode, setArtistSelectionMode] = useState(false);
  const [artistsSortBy, setArtistsSortBy] = useState('totalPlayed'); // 'totalPlayed', 'playCount'
  const [artistsSortPress, setArtistsSortPress] = useState(0);
  const [artistsViewPress, setArtistsViewPress] = useState(0);
  const [colorMode, setColorMode] = useState('colorful'); // 'minimal' or 'colorful'

  // 🌈 Secret rainbow mode — cycle through all four theme variants
  // (colorful/minimal x light/dark) twice each to toggle animated rainbow
  // text across every page. Doing the sequence again turns it back off.
  // Once discovered, a plain toggle also appears at the bottom of Settings.
  const rainbowRef = useRef(false);
  const [rainbowMode, setRainbowMode] = useState(false);
  const [rainbowDiscovered, setRainbowDiscovered] = useState(false);
  const applyRainbow = useCallback((on) => {
    rainbowRef.current = on;
    setRainbowMode(on);
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('rainbow-mode', on);
    try { localStorage.setItem('rainbowMode', on ? '1' : '0'); } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem('rainbowDiscovered') === '1') setRainbowDiscovered(true);
      if (localStorage.getItem('rainbowMode') === '1') { rainbowRef.current = true; setRainbowMode(true); document.documentElement.classList.add('rainbow-mode'); }
    } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `${colorMode}-${theme}`;
    let counts;
    try { counts = JSON.parse(localStorage.getItem('themeVariantCounts') || '{}'); } catch { counts = {}; }
    counts[key] = (counts[key] || 0) + 1;
    const variants = ['colorful-light', 'colorful-dark', 'minimal-light', 'minimal-dark'];
    if (variants.every(v => (counts[v] || 0) >= 2)) {
      applyRainbow(!rainbowRef.current);
      setRainbowDiscovered(true);
      try { localStorage.setItem('rainbowDiscovered', '1'); } catch {}
      counts = {}; // reset for the next toggle
    }
    try { localStorage.setItem('themeVariantCounts', JSON.stringify(counts)); } catch {}
  }, [colorMode, theme, applyRainbow]);

  const [topAlbumsCount, setTopAlbumsCount] = useState(50);
  const [albumsViewMode, setAlbumsViewMode] = useState('grid'); // 'grid', 'list'
  const [expandedAlbumListRows, setExpandedAlbumListRows] = useState({});
  const [albumsSortBy, setAlbumsSortBy] = useState('totalPlayed'); // 'totalPlayed', 'playCount'
  const [albumsSortPress, setAlbumsSortPress] = useState(0);
  const [albumsViewPress, setAlbumsViewPress] = useState(0);
  useEffect(() => { setArtistsSortPress(0); setArtistsViewPress(0); setAlbumsSortPress(0); setAlbumsViewPress(0); }, [activeTab, isDarkMode, colorMode]);

  // Refresh stored scrobble count whenever the upload tab is active
  useEffect(() => {
    if (activeTab === 'upload') {
      try {
        const raw = localStorage.getItem('rockbox_scrobbles');
        const map = raw ? JSON.parse(raw) : {};
        const count = Object.values(map).reduce((s, a) => s + a.length, 0);
        setStoredScrobbleCount(count);
      } catch { setStoredScrobbleCount(0); }
      getLastfmCount().then(count => setStoredLastfmCount(count)).catch(() => setStoredLastfmCount(0));
    }
  }, [activeTab]);

  // Sync theme-color meta for Safari tab bar tinting + iOS safe areas
  useEffect(() => {
    // Clean up any stale style tag from previous versions
    const stale = document.getElementById('tab-tint-style');
    if (stale) stale.remove();

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getChromeTint(activeTab, colorMode === 'colorful', isDarkMode));
  }, [activeTab, isDarkMode, colorMode]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enableEnrichment, setEnableEnrichment] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return JSON.parse(localStorage.getItem('enableAlbumEnrichment') ?? 'false'); } catch { return false; }
  });
  const [enrichmentProgress, setEnrichmentProgress] = useState(null); // { done, total }
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [briefObsessions, setBriefObsessions] = useState([]);
  const [songPlayHistory, setSongPlayHistory] = useState({});
  const [artistsByYear, setArtistsByYear] = useState({});
  const [yearRangeMode, setYearRangeMode] = useState(false);
  const [yearRange, setYearRange] = useState({ startYear: '', endYear: '' });
  const [rawPlayData, setRawPlayData] = useState([]);
  // Pristine parse output, before user edits — overrides are always
  // re-applied to this so edits stay idempotent and resettable.
  const [basePlayData, setBasePlayData] = useState([]);
  const [streaks, setStreaks] = useState(null);
  const [selectedStreaksYear, setSelectedStreaksYear] = useState('all');
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [artistSearch, setArtistSearch] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadInnerTab, setUploadInnerTab] = useState('upload');
  const [includeScrobblerData, setIncludeScrobblerData] = useState(false);
  const [storedScrobbleCount, setStoredScrobbleCount] = useState(0);
  const [includeLastfmData, setIncludeLastfmData] = useState(false);
  const [storedLastfmCount, setStoredLastfmCount] = useState(0);
  const [uploadedFileList, setUploadedFileList] = useState(null);
  const [selectedArtistYear, setSelectedArtistYear] = useState('all');
  
  // Simplified state - removed authentication
  const [storageNotification, setStorageNotification] = useState(null);
  
  // Ref to track if initial data loading has completed
  const dataLoadedRef = useRef(false);
  // Add date range states for artists (like CustomTrackRankings)
  const [artistStartDate, setArtistStartDate] = useState('');
  const [artistEndDate, setArtistEndDate] = useState('');
  const [selectedAlbumYear, setSelectedAlbumYear] = useState('all');
  const [albumYearRangeMode, setAlbumYearRangeMode] = useState(false);
  const [albumYearRange, setAlbumYearRange] = useState({ startYear: '', endYear: '' });
  const [albumsByYear, setAlbumsByYear] = useState({});
  
  // Add date range states for calendar tab
  const [selectedCalendarYear, setSelectedCalendarYear] = useState('all');
  const [calendarYearRange, setCalendarYearRange] = useState({ startYear: '', endYear: '' });
  const [calendarYearRangeMode, setCalendarYearRangeMode] = useState(false);
  // Add date range states for albums (like CustomTrackRankings)
  const [albumStartDate, setAlbumStartDate] = useState('');
  const [albumEndDate, setAlbumEndDate] = useState('');
  const [customTrackYear, setCustomTrackYear] = useState('all');
  const [customYearRange, setCustomYearRange] = useState({ startYear: '', endYear: '' });
  const [customYearRangeMode, setCustomYearRangeMode] = useState(false);
  const [customViewMode, setCustomViewMode] = useState('grid'); // 'grid', 'compact'
  const [podcastViewMode, setPodcastViewMode] = useState('grid'); // 'grid', 'compact'
  const [patternsViewMode, setPatternsViewMode] = useState('grid'); // 'grid', 'list'
  const [calendarViewMode, setCalendarViewMode] = useState('grid'); // 'grid', 'list'
  const [showYearSidebar, setShowYearSidebar] = useState(true);
  const [yearSelectorExpanded, setYearSelectorExpanded] = useState(false);
  const [yearSelectorPosition, setYearSelectorPosition] = useState('right');
  const [yearSelectorWidth, setYearSelectorWidth] = useState(32);
  const [yearSelectorHeight, setYearSelectorHeight] = useState(48);
  const [yearSelectorTransitioning, setYearSelectorTransitioning] = useState(false);
  
  const [sidebarColorTheme, setSidebarColorTheme] = useState('teal');
  const [sidebarTextTheme, setSidebarTextTheme] = useState(null);

  // TopTabs position state - initialize based on screen size
  const [topTabsPosition, setTopTabsPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      return 'top';
    }
    return 'top'; // SSR fallback
  });
  const [topTabsHeight, setTopTabsHeight] = useState(56);
  const [topTabsWidth, setTopTabsWidth] = useState(192);
  const [topTabsCollapsed, setTopTabsCollapsed] = useState(false);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Note: YearSelector reports its own dimensions via onWidthChange/onHeightChange callbacks.
  // No need to duplicate dimension logic here — the callbacks handle all mode/position changes.

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const checkMobile = () => {
      const isNarrow = window.innerWidth < 640;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const landscapeMobile = isTouch && window.innerHeight < 500;
      const isMobileNow = isNarrow || landscapeMobile;
      setIsMobile(isMobileNow);
      setIsLandscapeMobile(landscapeMobile && !isNarrow);
      
      // Allow user to manually control position on both mobile and desktop
      // Remove auto-positioning to prevent oscillation between bottom and top on desktop
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [topTabsPosition]); // Default width for side positioning
  const [selectedPatternYear, setSelectedPatternYear] = useState('all');
  const [patternYearRange, setPatternYearRange] = useState({ startYear: '', endYear: '' });
  const [patternYearRangeMode, setPatternYearRangeMode] = useState(false);
  const [selectedBehaviorYear, setSelectedBehaviorYear] = useState('all');
  const [behaviorYearRange, setBehaviorYearRange] = useState({ startYear: '', endYear: '' });
  const [behaviorYearRangeMode, setBehaviorYearRangeMode] = useState(false);
  const [selectedDiscoveryYear, setSelectedDiscoveryYear] = useState('all');
  const [discoveryYearRange, setDiscoveryYearRange] = useState({ startYear: '', endYear: '' });
  const [discoveryYearRangeMode, setDiscoveryYearRangeMode] = useState(false);
  const [selectedPodcastYear, setSelectedPodcastYear] = useState('all');
  const [podcastYearRange, setPodcastYearRange] = useState({ startYear: '', endYear: '' });
  const [podcastYearRangeMode, setPodcastYearRangeMode] = useState(false);

  // Add refs for caching expensive operations
  const formatDurationCache = useRef(new Map());

  // Memoized duration formatting function - caches results for performance
  const formatDuration = useCallback((ms) => {
    // Check cache first
    if (formatDurationCache.current.has(ms)) {
      return formatDurationCache.current.get(ms);
    }
    
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let result;
    if (days > 0) {
      const remainingHours = hours % 24;
      result = `${days}d ${remainingHours}h`;
    } else {
      const remainingMinutes = minutes % 60;
      result = hours > 0 ?
        `${hours}h ${remainingMinutes}m` :
        `${remainingMinutes}m`;
    }
    
    // Store in cache for future use
    formatDurationCache.current.set(ms, result);
    
    return result;
  }, []);


  // Effect to add "All-Time" text to year display
  useEffect(() => {
    if (!yearRangeMode && selectedArtistYear === 'all') {
      const updateAllTimeText = () => {
        const yearDisplays = document.querySelectorAll('.year-display');
        yearDisplays.forEach(yearDisplay => {
          if (yearDisplay && yearDisplay.textContent !== 'All-Time') {
            yearDisplay.textContent = 'All-Time';
          }
        });
      };
      
      // Try multiple times - use a more efficient approach with fewer timeouts
      updateAllTimeText();
      const timeouts = [50, 100, 300, 500].map(delay => 
        setTimeout(updateAllTimeText, delay)
      );
      
      return () => timeouts.forEach(id => clearTimeout(id));
    }
  }, [yearRangeMode, selectedArtistYear]);

  // Filtered artists list - memoized for performance
  const filteredArtists = useMemo(() => {
    // Get unique artist names from topArtists - use a Set for efficiency
    const allArtists = Array.from(new Set(topArtists.map(artist => artist.name))).sort();
    
    // Skip filtering if search is empty or if already selected
    if (!artistSearch.trim()) return [];
    
    const searchNorm = normalizeForSearch(artistSearch);
    return allArtists
      .filter(artist =>
        normalizeForSearch(artist).includes(searchNorm) &&
        !selectedArtists.includes(artist)
      )
      .slice(0, 10); // Limit to 10 results for performance
  }, [topArtists, artistSearch, selectedArtists]);

  // Use memo for sorted years to prevent recalculating
  const sortedYears = useMemo(() => {
    return Object.keys(artistsByYear).sort((a, b) => a - b);
  }, [artistsByYear]);

  // Calculate filtered streaks based on selected year
  const filteredStreaks = useMemo(() => {
    if (selectedStreaksYear === 'all') {
      return streaks;
    }
    if (!rawPlayData || rawPlayData.length === 0) {
      return null;
    }
    let filteredData;
    if (selectedStreaksYear.startsWith('all-')) {
      // All-time with month or month+day filter (all-MM or all-MM-DD)
      const parts = selectedStreaksYear.split('-');
      const month = parseInt(parts[1]);
      const day = parts.length === 3 ? parseInt(parts[2]) : null;
      filteredData = rawPlayData.filter(play => {
        if (!play.ts) return false;
        const d = new Date(play.ts);
        if ((d.getMonth() + 1) !== month) return false;
        if (day !== null && d.getDate() !== day) return false;
        return true;
      });
    } else {
      // Filter rawPlayData by selected year (supports YYYY, YYYY-MM, YYYY-MM-DD)
      const parts = selectedStreaksYear.split('-');
      filteredData = rawPlayData.filter(play => {
        if (!play.ts) return false;
        const d = new Date(play.ts);
        if (d.getFullYear().toString() !== parts[0]) return false;
        if (parts.length >= 2 && (d.getMonth() + 1) !== parseInt(parts[1])) return false;
        if (parts.length >= 3 && d.getDate() !== parseInt(parts[2])) return false;
        return true;
      });
    }
    if (filteredData.length === 0) {
      return null;
    }
    // Recalculate streaks for filtered data
    const consecutivePlays = calculateConsecutivePlayStreaks(filteredData);
    const overallDaily = calculateOverallDailyStreak(filteredData);
    const topAlbumDaily = topAlbums ?
      calculateTopAlbumDailyStreak(topAlbums, filteredData) : null;
    return {
      consecutivePlays,
      overallDaily,
      topSongDaily: null, // Would need playHistory which we don't have for filtered data
      topAlbumDaily
    };
  }, [selectedStreaksYear, streaks, rawPlayData, topAlbums]);

  const [trackDurationMap, setTrackDurationMap] = useState(null);

  // Calculate filtered stats based on selected year
  const filteredStats = useMemo(() => {
    if (!stats) return null;
    if (selectedStreaksYear === 'all') {
      // Compute date window from all raw data
      let earliestDate = null;
      let latestDate = null;
      if (rawPlayData) {
        for (const play of rawPlayData) {
          if (!play.ts) continue;
          const t = new Date(play.ts).getTime();
          if (earliestDate === null || t < earliestDate) earliestDate = t;
          if (latestDate === null || t > latestDate) latestDate = t;
        }
      }
      return { ...stats, earliestDate, latestDate };
    }
    if (!rawPlayData || rawPlayData.length === 0) {
      return stats;
    }
    let filteredData;
    if (selectedStreaksYear.startsWith('all-')) {
      // All-time with month or month+day filter (all-MM or all-MM-DD)
      const parts = selectedStreaksYear.split('-');
      const month = parseInt(parts[1]);
      const day = parts.length === 3 ? parseInt(parts[2]) : null;
      filteredData = rawPlayData.filter(play => {
        if (!play.ts) return false;
        const d = new Date(play.ts);
        if ((d.getMonth() + 1) !== month) return false;
        if (day !== null && d.getDate() !== day) return false;
        return true;
      });
    } else {
      // Filter rawPlayData by selected year (supports YYYY, YYYY-MM, YYYY-MM-DD)
      const statsParts = selectedStreaksYear.split('-');
      filteredData = rawPlayData.filter(play => {
        if (!play.ts) return false;
        const d = new Date(play.ts);
        if (d.getFullYear().toString() !== statsParts[0]) return false;
        if (statsParts.length >= 2 && (d.getMonth() + 1) !== parseInt(statsParts[1])) return false;
        if (statsParts.length >= 3 && d.getDate() !== parseInt(statsParts[2])) return false;
        return true;
      });
    }

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

    // Calculate filtered stats
    const totalListeningTime = filteredData
      .filter(play => passesFilters(play))
      .reduce((sum, play) => sum + (play.ms_played || 0), 0);

    const shortPlays = filteredData.filter(play => play.ms_played < minPlayDuration).length;

    // Calculate unique songs for filtered data
    const uniqueSongs = new Set(
      filteredData
        .filter(play => play.master_metadata_track_name)
        .map(play => `${play.master_metadata_track_name}|||${play.master_metadata_album_artist_name}`)
    ).size;

    // Calculate service listening time
    const serviceListeningTime = {};
    filteredData.forEach(play => {
      if (passesFilters(play)) {
        const service = play._source || 'Unknown';
        serviceListeningTime[service] = (serviceListeningTime[service] || 0) + play.ms_played;
      }
    });

    // Date window
    let earliestDate = null;
    let latestDate = null;
    for (const play of filteredData) {
      if (!play.ts) continue;
      const t = new Date(play.ts).getTime();
      if (earliestDate === null || t < earliestDate) earliestDate = t;
      if (latestDate === null || t > latestDate) latestDate = t;
    }

    return {
      ...stats,
      totalEntries: filteredData.length,
      processedSongs: filteredData.filter(play => play.master_metadata_track_name).length,
      uniqueSongs,
      shortPlays,
      totalListeningTime,
      serviceListeningTime,
      nullTrackNames: filteredData.filter(e => !e.master_metadata_track_name).length,
      earliestDate,
      latestDate,
    };
  }, [selectedStreaksYear, stats, rawPlayData, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);

  // Parse range value to a date string
  const parseRangeValue = useCallback((val, isEnd) => {
    const str = String(val);
    const parts = str.split('-');
    if (parts.length === 3) return str; // YYYY-MM-DD
    if (parts.length === 2) {
      if (isEnd) {
        const lastDay = new Date(parseInt(parts[0]), parseInt(parts[1]), 0).getDate();
        return `${parts[0]}-${parts[1]}-${lastDay.toString().padStart(2, '0')}`;
      }
      return `${parts[0]}-${parts[1]}-01`;
    }
    return isEnd ? `${str}-12-31` : `${str}-01-01`;
  }, []);

  // Toggle year range mode with useCallback to prevent recreation
  const toggleYearRangeMode = useCallback((value) => {
    const newMode = typeof value === 'boolean' ? value : !yearRangeMode;
    setYearRangeMode(newMode);

    if (newMode) {
      if (Object.keys(artistsByYear).length > 0) {
        const years = Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
        if (years.length > 0) {
          setYearRange({ startYear: years[0], endYear: years[years.length - 1] });
          setSelectedArtistYear('range');
          setArtistStartDate(`${years[0]}-01-01`);
          setArtistEndDate(`${years[years.length - 1]}-12-31`);
        }
      }
    } else {
      setSelectedArtistYear('all');
      setArtistStartDate('');
      setArtistEndDate('');
    }
  }, [yearRangeMode, artistsByYear]);

  // Handle album year range changes with useCallback
  const handleAlbumYearRangeChange = useCallback(({ startYear, endYear }) => {
    if (!startYear || !endYear) return;
    setAlbumYearRangeMode(true);
    setAlbumYearRange({ startYear, endYear });
    setSelectedAlbumYear('range');
    setAlbumStartDate(parseRangeValue(startYear, false));
    setAlbumEndDate(parseRangeValue(endYear, true));
  }, [parseRangeValue]);

  // Calendar year handlers
  const handleCalendarYearChange = useCallback((year) => {
    const yearValue = year === 'all' ? 'all' : year;
    setSelectedCalendarYear(yearValue);
  }, []);

  const handleCalendarYearRangeChange = useCallback(({ startYear, endYear }) => {
    if (!startYear || !endYear) {
      return;
    }
    setCalendarYearRangeMode(true);
    setCalendarYearRange({ startYear, endYear });
  }, []);

  const toggleCalendarYearRangeMode = useCallback((isRange) => {
    setCalendarYearRangeMode(isRange);
    if (!isRange) {
      setCalendarYearRange({ startYear: '', endYear: '' });
    }
  }, []);

  // Toggle album year range mode with useCallback
  const toggleAlbumYearRangeMode = useCallback((value) => {
    const newMode = typeof value === 'boolean' ? value : !albumYearRangeMode;
    if (newMode === albumYearRangeMode) return;

    setAlbumYearRangeMode(newMode);

    if (newMode) {
      if (Object.keys(artistsByYear).length > 0) {
        const years = Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
        if (years.length > 0) {
          setAlbumYearRange({ startYear: years[0], endYear: years[years.length - 1] });
          setSelectedAlbumYear('range');
          setAlbumStartDate(`${years[0]}-01-01`);
          setAlbumEndDate(`${years[years.length - 1]}-12-31`);
        }
      }
    } else {
      setSelectedAlbumYear('all');
      setAlbumStartDate('');
      setAlbumEndDate('');
    }
  }, [albumYearRangeMode, artistsByYear]);

  // Memoized tab labels to avoid recalculation
  const getAlbumsTabLabel = useCallback(() => {
    if (selectedAlbumYear === 'all') {
      return <span>Albums <span className="text-xs opacity-75">all-time</span></span>;
    } else if (albumYearRangeMode && albumYearRange.startYear && albumYearRange.endYear) {
      return <span>Albums <span className="text-xs opacity-75">{albumYearRange.startYear}-{albumYearRange.endYear}</span></span>;
    }
    return <span>Albums <span className="text-xs opacity-75">{selectedAlbumYear}</span></span>;
  }, [selectedAlbumYear, albumYearRangeMode, albumYearRange]);

  // useEffect to set album date ranges when year changes (like CustomTrackRankings)
  useEffect(() => {
    if (selectedAlbumYear === 'all' || selectedAlbumYear.startsWith('all-')) {
      // Clear date filters for all-time (month/day filtering handled in useMemo)
      setAlbumStartDate('');
      setAlbumEndDate('');
    } else if (selectedAlbumYear.includes('-')) {
      // Handle YYYY-MM or YYYY-MM-DD format
      if (selectedAlbumYear.split('-').length === 3) {
        // YYYY-MM-DD format - set to exact day
        setAlbumStartDate(selectedAlbumYear);
        setAlbumEndDate(selectedAlbumYear);
      } else if (selectedAlbumYear.split('-').length === 2) {
        // YYYY-MM format - set to whole month
        const [year, month] = selectedAlbumYear.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
        setAlbumStartDate(startDate);
        setAlbumEndDate(endDate);
      }
    } else {
      // Regular year - set to whole year
      setAlbumStartDate(`${selectedAlbumYear}-01-01`);
      setAlbumEndDate(`${selectedAlbumYear}-12-31`);
    }
  }, [selectedAlbumYear]);

  // Albums filtering using same logic as streaming adapter
  const displayedAlbums = useMemo(() => {

    // If all-time (and not in range mode) and using default filters, use the existing topAlbums
    const usingDefaultFilters = minPlayDuration === 30000 && !skipFilter && !fullListenOnly;
    if (!albumYearRangeMode && selectedAlbumYear === 'all' && usingDefaultFilters) {
      let filteredAlbums = [...topAlbums];

      // Apply artist filtering if any artists are selected
      if (selectedArtists.length > 0) {
        const normalizedSelectedArtists = selectedArtists.map(artist =>
          normalizeArtistName(artist)
        );
        filteredAlbums = filteredAlbums.filter(album =>
          normalizedSelectedArtists.includes(normalizeArtistName(album.artist))
        );
      }

      return filteredAlbums.sort((a, b) => {
        if (albumsSortBy === 'playCount') {
          return b.playCount - a.playCount;
        } else {
          return b.totalPlayed - a.totalPlayed;
        }
      });
    }

    // Compute dates - use albumYearRange directly when in range mode
    let startDateStr, endDateStr;
    if (albumYearRangeMode && albumYearRange.startYear && albumYearRange.endYear) {
      startDateStr = parseRangeValue(albumYearRange.startYear, false);
      endDateStr = parseRangeValue(albumYearRange.endYear, true);
    } else {
      startDateStr = albumStartDate;
      endDateStr = albumEndDate;
    }

    // Use date range filtering approach with streaming adapter logic
    const isAllTime = (!startDateStr || startDateStr === "") && (!endDateStr || endDateStr === "");
    const start = isAllTime ? new Date(0) : new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = isAllTime ? new Date() : new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    
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

    // Filter raw data by date range and minimum duration
    let dateFilteredEntries = isAllTime
      ? rawPlayData.filter(entry => passesFilters(entry))
      : rawPlayData.filter(entry => {
          try {
            if (!passesFilters(entry)) return false;
            const timestamp = new Date(entry.ts);
            return timestamp >= start && timestamp <= end;
          } catch (err) {
            return false;
          }
        });

    // Apply all-time month/day filter (all-MM or all-MM-DD)
    if (selectedAlbumYear.startsWith('all-')) {
      const parts = selectedAlbumYear.split('-');
      dateFilteredEntries = dateFilteredEntries.filter(entry => {
        try {
          const d = new Date(entry.ts);
          if (parts.length === 3) return (d.getMonth() + 1) === parseInt(parts[1]) && d.getDate() === parseInt(parts[2]);
          return (d.getMonth() + 1) === parseInt(parts[1]);
        } catch (err) { return false; }
      });
    }

    // Initialize albums object (like streaming adapter)
    const albums = {};

    // Process entries using streaming adapter logic
    dateFilteredEntries.forEach(entry => {
      const playTime = entry.ms_played;
      if (!entry.master_metadata_track_name || playTime < minPlayDuration) return;
      
      const trackName = entry.master_metadata_track_name;
      const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
      const albumName = entry.master_metadata_album_album_name || 'Unknown Album';

      // Ensure timestamp is a valid Date object
      let timestamp = entry._dateObj;
      if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
        timestamp = new Date(entry.ts);
      }
      // Skip if still invalid
      if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) return;

      // Skip if no valid album info
      if (!albumName || albumName === 'Unknown Album' || !artistName) return;
      
      // Use same normalization as streaming adapter
      const normalizeAlbumName = (name) => {
        if (!name) return '';
        return name.toLowerCase()
          .replace(/\s*\(.*?\)\s*/g, ' ')  // Remove parentheses
          .replace(/\s*\[.*?\]\s*/g, ' ')  // Remove brackets
          .replace(/\s+/g, ' ')
          .trim();
      };
      
      const normalizedAlbumName = normalizeAlbumName(albumName);
      const normalizedArtistName = normalizeArtistName(artistName);
      const albumKey = `${normalizedAlbumName}-${normalizedArtistName}`;
      
      // Use enhanced track matching like streaming adapter
      const trackMatchKey = createMatchKey(trackName, artistName);
      
      if (!albums[albumKey]) {
        albums[albumKey] = {
          name: albumName,
          artist: artistName,
          totalPlayed: 0,
          playCount: 0,
          trackMap: new Map(), // Use Map for better track deduplication
          trackObjects: [],
          firstListen: timestamp.getTime(),
          years: new Set()
        };
      }

      // Add year to set
      if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
        albums[albumKey].years.add(timestamp.getFullYear());
      }
          
      albums[albumKey].totalPlayed += playTime;
      albums[albumKey].playCount++;
      
      // Track handling with proper deduplication using match keys
      if (albums[albumKey].trackMap.has(trackMatchKey)) {
        // Update existing track
        const track = albums[albumKey].trackMap.get(trackMatchKey);
        track.totalPlayed += playTime;
        track.playCount++;
        
        // Update display name if we get a better version (prefer non-"with" versions)
        if (trackName.includes('feat') && track.trackName.includes('with')) {
          track.trackName = trackName;
        }
      } else {
        // Create new track
        albums[albumKey].trackMap.set(trackMatchKey, {
          trackName,
          artist: artistName,
          totalPlayed: playTime,
          playCount: 1,
          albumName
        });
      }
      
      // Update first listen time if earlier
      albums[albumKey].firstListen = Math.min(
        albums[albumKey].firstListen, 
        timestamp.getTime()
      );
    });
    
    // Process albums like streaming adapter
    Object.values(albums).forEach(album => {
      // Convert trackMap to trackObjects array
      album.trackObjects = Array.from(album.trackMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
      album.trackCountValue = album.trackMap.size;
      album.yearsArray = Array.from(album.years).sort();
      
      // Clean up trackMap as it's not needed anymore
      delete album.trackMap;
    });
    
    let result = Object.values(albums).sort((a, b) => b.totalPlayed - a.totalPlayed);
    
    // Apply artist filtering if any artists are selected
    if (selectedArtists.length > 0) {
      const normalizedSelectedArtists = selectedArtists.map(artist => 
        normalizeArtistName(artist)
      );
      result = result.filter(album => 
        normalizedSelectedArtists.includes(normalizeArtistName(album.artist))
      );
    }
    
    return result.sort((a, b) => {
      if (albumsSortBy === 'playCount') {
        return b.playCount - a.playCount;
      } else {
        return b.totalPlayed - a.totalPlayed;
      }
    });
  }, [selectedAlbumYear, albumStartDate, albumEndDate, topAlbums, rawPlayData, selectedArtists, albumsSortBy, albumYearRangeMode, albumYearRange, parseRangeValue, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);



  // useEffect to set artist date ranges when year changes (like CustomTrackRankings)
  useEffect(() => {
    if (selectedArtistYear === 'all' || selectedArtistYear.startsWith('all-')) {
      // Clear date filters for all-time (month/day filtering handled in useMemo)
      setArtistStartDate('');
      setArtistEndDate('');
    } else if (selectedArtistYear.includes('-')) {
      // Handle YYYY-MM or YYYY-MM-DD format
      if (selectedArtistYear.split('-').length === 3) {
        // YYYY-MM-DD format - set to exact day
        setArtistStartDate(selectedArtistYear);
        setArtistEndDate(selectedArtistYear);
      } else if (selectedArtistYear.split('-').length === 2) {
        // YYYY-MM format - set to whole month
        const [year, month] = selectedArtistYear.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
        setArtistStartDate(startDate);
        setArtistEndDate(endDate);
      }
    } else {
      // Regular year - set to whole year
      setArtistStartDate(`${selectedArtistYear}-01-01`);
      setArtistEndDate(`${selectedArtistYear}-12-31`);
    }
  }, [selectedArtistYear]);

  // Simple displayedArtists logic using CustomTrackRankings pattern
  const displayedArtists = useMemo(() => {

    // If all-time (and not in range mode) and using default filters, use the existing topArtists
    const usingDefaultFilters = minPlayDuration === 30000 && !skipFilter && !fullListenOnly;
    if (!yearRangeMode && selectedArtistYear === 'all' && usingDefaultFilters) {
      return [...topArtists].sort((a, b) => {
        if (artistsSortBy === 'playCount') {
          return b.playCount - a.playCount;
        } else {
          return b.totalPlayed - a.totalPlayed;
        }
      });
    }

    // Compute dates - use yearRange directly when in range mode
    let startDateStr, endDateStr;
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      startDateStr = parseRangeValue(yearRange.startYear, false);
      endDateStr = parseRangeValue(yearRange.endYear, true);
    } else {
      startDateStr = artistStartDate;
      endDateStr = artistEndDate;
    }

    // Use date range filtering approach
    const isAllTime = (!startDateStr || startDateStr === "") && (!endDateStr || endDateStr === "");
    const start = isAllTime ? new Date(0) : new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = isAllTime ? new Date() : new Date(endDateStr);
    end.setHours(23, 59, 59, 999);
    
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

    // Filter raw data by date range and minimum duration
    let dateFilteredEntries = isAllTime
      ? rawPlayData.filter(entry => passesFilters(entry))
      : rawPlayData.filter(entry => {
          try {
            if (!passesFilters(entry)) return false;
            const timestamp = new Date(entry.ts);
            return timestamp >= start && timestamp <= end;
          } catch (err) {
            return false;
          }
        });

    // Apply all-time month/day filter (all-MM or all-MM-DD)
    if (selectedArtistYear.startsWith('all-')) {
      const parts = selectedArtistYear.split('-');
      dateFilteredEntries = dateFilteredEntries.filter(entry => {
        try {
          const d = new Date(entry.ts);
          if (parts.length === 3) return (d.getMonth() + 1) === parseInt(parts[1]) && d.getDate() === parseInt(parts[2]);
          return (d.getMonth() + 1) === parseInt(parts[1]);
        } catch (err) { return false; }
      });
    }

    // Helper function to normalize artist names
    const normalizeArtistName = (name) => {
      if (!name) return null;
      // Convert to lowercase, remove extra spaces, and normalize punctuation
      return name.toLowerCase()
        .replace(/,\s+the\s+/g, ' the ')  // "Tyler, The Creator" -> "tyler the creator"
        .replace(/\s+/g, ' ')             // normalize spaces
        .trim();
    };

    // Helper function to extract artist name from episode name
    const extractArtistFromEpisode = (episodeName) => {
      if (!episodeName) return null;
      
      // Look for patterns like "title - artist" where artist contains "tyler" and "creator"
      const dashMatch = episodeName.match(/^.+?\s*-\s*(.+)$/);
      if (dashMatch) {
        const extractedName = dashMatch[1].trim();
        const lowerName = extractedName.toLowerCase();
        if (lowerName.includes('tyler') && lowerName.includes('creator')) {
          // Convert to proper case: "tyler the creator" -> "Tyler, The Creator"
          return extractedName.replace(/\b\w/g, l => l.toUpperCase())
                             .replace(/\bThe\b/g, 'The')
                             .replace(/^Tyler The Creator$/i, 'Tyler, The Creator');
        }
      }
      
      return null;
    };

    // Group by artists - use original names as keys for consistency
    const artistMap = new Map();
    dateFilteredEntries.forEach(entry => {
      // Get artist name from primary field or extract from episode name
      let rawArtistName = entry.master_metadata_album_artist_name;
      
      // If no primary artist name, try to extract from episode name
      if (!rawArtistName && entry.episode_name) {
        rawArtistName = extractArtistFromEpisode(entry.episode_name);
      }
      
      if (!rawArtistName) return;
      
      // Use the raw artist name as key to maintain consistency with individual year logic
      const artistName = rawArtistName;
      const trackName = entry.master_metadata_track_name || entry.episode_name || 'Unknown';
      const timestamp = new Date(entry.ts);
      
      if (!artistMap.has(artistName)) {
        artistMap.set(artistName, {
          name: artistName,
          totalPlayed: 0,
          playCount: 0,
          firstListen: timestamp.getTime(),
          firstSong: trackName,
          firstSongPlayCount: 1,
          tracks: new Map(), // Track all songs and their play counts
          albums: new Map(), // Track all albums and their play counts
          longestStreak: 1,
          currentStreak: 1,
          streakStart: timestamp.getTime(),
          streakEnd: timestamp.getTime()
        });
      }
      
      const artist = artistMap.get(artistName);
      artist.totalPlayed += entry.ms_played || 0;
      artist.playCount++;
      
      // Track first listen date
      if (timestamp < new Date(artist.firstListen)) {
        artist.firstListen = timestamp.getTime();
        artist.firstSong = trackName;
        artist.firstSongPlayCount = 1;
      } else if (trackName === artist.firstSong) {
        artist.firstSongPlayCount++;
      }
      
      // Track all songs for mostPlayedSong
      if (!artist.tracks.has(trackName)) {
        artist.tracks.set(trackName, { trackName, playCount: 0, totalPlayed: 0 });
      }
      const trackData = artist.tracks.get(trackName);
      trackData.playCount++;
      trackData.totalPlayed += entry.ms_played || 0;

      // Track albums for mostPlayedAlbum
      const albumName = entry.master_metadata_album_album_name;
      if (albumName) {
        artist.albums.set(albumName, (artist.albums.get(albumName) || 0) + 1);
      }
    });

    // Process each artist to find most played song and album
    artistMap.forEach(artist => {
      if (artist.tracks.size > 0) {
        const mostPlayedTrack = Array.from(artist.tracks.values())
          .sort((a, b) => b.playCount - a.playCount)[0];
        artist.mostPlayedSong = mostPlayedTrack;
      }
      if (artist.albums.size > 0) {
        const [albumName, playCount] = Array.from(artist.albums.entries())
          .sort((a, b) => b[1] - a[1])[0];
        artist.mostPlayedAlbum = { albumName, playCount };
      }
      delete artist.tracks;
      delete artist.albums;
    });
    
    return Array.from(artistMap.values()).sort((a, b) => {
      if (artistsSortBy === 'playCount') {
        return b.playCount - a.playCount;
      } else {
        return b.totalPlayed - a.totalPlayed;
      }
    });
  }, [selectedArtistYear, artistStartDate, artistEndDate, topArtists, rawPlayData, artistsSortBy, yearRangeMode, yearRange, parseRangeValue, minPlayDuration, skipFilter, fullListenOnly, skipEndThreshold, trackDurationMap]);

  // Filtered displayed artists - memoized to prevent recalculation
  const filteredDisplayedArtists = useMemo(() => {
    // If no artists displayed, return empty array to avoid issues
    if (!displayedArtists || displayedArtists.length === 0) return [];
    
    // If we have selected artists, only show those using a Set for faster lookups
    if (selectedArtists.length > 0) {
      const selectedArtistsSet = new Set(selectedArtists);
      return displayedArtists.filter(artist => selectedArtistsSet.has(artist.name));
    }
    
    // Otherwise, apply search term filter if search exists
    if (artistSearch.trim()) {
      const searchNorm = normalizeForSearch(artistSearch);
      return displayedArtists.filter(artist =>
        normalizeForSearch(artist.name).includes(searchNorm)
      );
    }
    
    // If no filters, show all
    return displayedArtists;
  }, [displayedArtists, artistSearch, selectedArtists]);

  // Process files with useCallback to prevent recreation
  const processFiles = useCallback(async (fileList) => {
    // Set loading state 
    setIsProcessing(true);
    
    try {
      setEnrichmentProgress(null);
      // Read enrichment preference directly from localStorage to avoid stale closures
      const shouldEnrich = JSON.parse(localStorage.getItem('enableAlbumEnrichment') ?? 'false');
      const results = await streamingProcessor.processFiles(fileList, {
        enableEnrichment: shouldEnrich,
        onEnrichmentProgress: (done, total) => setEnrichmentProgress({ done, total }),
        overrides: loadOverrides(),
      });
      
      // Update all state in batch
      setStats(results.stats);
      setTopArtists(results.topArtists);
      setArtistsByYear(results.artistsByYear || {});
      setTopAlbums(results.topAlbums);
      setAlbumsByYear(results.albumsByYear || {});
      
      // Sort tracks by totalPlayed for consistency
      const sortedTracks = _.orderBy(results.processedTracks, ['totalPlayed'], ['desc']);
      setProcessedData(sortedTracks);
      
      setSongsByYear(results.songsByYear);
      setBriefObsessions(results.briefObsessions);
      setRawPlayData(results.rawPlayData);
      setBasePlayData(results.basePlayData || results.rawPlayData);
      setTrackDurationMap(results.trackDurationMap || null);
      setStreaks(results.streaks);

      // Update file list
      const fileNames = Array.from(fileList).map(file => file.name);
      setUploadedFiles(fileNames);

      // Data is processed and ready - you can save it to Google Drive from the upload page

      // Switch to stats tab
      setActiveTab('stats');
      
      return results;
    } catch (err) {
      console.error("Error processing files:", err);
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
      setEnrichmentProgress(null);
    }
  }, []);

  // Re-derive all stats after the user edits their data on the Your Data
  // tab. Overrides are re-applied to the pristine base, so no file re-parse
  // is needed and edits/reverts are always consistent.
  const handleDataEdited = useCallback(async () => {
    const base = basePlayData.length > 0 ? basePlayData : rawPlayData;
    if (base.length === 0) return;
    const effective = applyOverrides(base, loadOverrides());
    const results = await computeStatsFromEntries(effective, {
      totalFiles: stats?.totalFiles || 0,
    });
    setStats(results.stats);
    setTopArtists(results.topArtists);
    setArtistsByYear(results.artistsByYear || {});
    setTopAlbums(results.topAlbums);
    setAlbumsByYear(results.albumsByYear || {});
    setProcessedData(_.orderBy(results.processedTracks, ['totalPlayed'], ['desc']));
    setSongsByYear(results.songsByYear);
    setBriefObsessions(results.briefObsessions);
    setRawPlayData(results.rawPlayData);
    setTrackDurationMap(results.trackDurationMap || null);
    setStreaks(results.streaks);
  }, [basePlayData, rawPlayData, stats]);

  // Handle file upload with useCallback
  const handleFileUpload = useCallback((e) => {
    const newFiles = e.target.files;
    if (!newFiles || newFiles.length === 0) return;
    
    // Create an array to store the new file objects
    const newFileObjects = Array.from(newFiles);
    
    // Combine existing files with new files efficiently
    const combinedFiles = uploadedFileList 
      ? [...uploadedFileList, ...newFileObjects]
      : newFileObjects;
    
    // Update file names for display
    const updatedFileNames = combinedFiles.map(file => file.name);
    
    // Update state
    setUploadedFileList(combinedFiles);
    setUploadedFiles(updatedFileNames);
    
    console.log(`File upload: ${combinedFiles.length} files queued for processing.`);
  }, [uploadedFileList]);

  // Handle file deletion with useCallback
  const handleDeleteFile = useCallback((indexToDelete) => {
    // Batch state updates for better performance
    if (uploadedFileList) {
      const remainingFiles = uploadedFileList.filter((_, index) => index !== indexToDelete);
      
      // Update both states at once
      setUploadedFileList(remainingFiles.length === 0 ? null : remainingFiles);
      setUploadedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToDelete));
      
    } else {
      setUploadedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToDelete));
    }
  }, [uploadedFileList]);

  // Process uploaded files with useCallback
  const handleProcessFiles = useCallback(() => {
    const hasUploadedFiles = uploadedFileList && uploadedFileList.length > 0;
    const hasScrobblerData = includeScrobblerData && storedScrobbleCount > 0;
    const hasLastfmData = includeLastfmData && storedLastfmCount > 0;

    if (!hasUploadedFiles && !hasScrobblerData && !hasLastfmData) {
      setError("Please upload files or include scrobbler data first");
      return;
    }

    setIsProcessing(true);

    setTimeout(async () => {
      try {
        let filesToProcess = uploadedFileList ? Array.from(uploadedFileList) : [];

        if (hasScrobblerData) {
          const raw = localStorage.getItem('rockbox_scrobbles');
          const map = raw ? JSON.parse(raw) : {};
          const entries = Object.values(map).flat().sort((a, b) => new Date(a.ts) - new Date(b.ts));
          const lines = entries.map(e =>
            [
              e.master_metadata_album_artist_name,
              e.master_metadata_album_album_name || '',
              e.master_metadata_track_name,
              '',
              Math.round((e.ms_played || 210000) / 1000),
              e.skipped ? 'S' : '',
              Math.floor(new Date(e.ts).getTime() / 1000),
              ''
            ].join('\t')
          ).join('\n');
          const header = '#AUDIOSCROBBLER/1.1\n#TZ/UNKNOWN\n#CLIENT/Rockbox\n';
          const blob = new Blob([header + lines], { type: 'text/plain' });
          filesToProcess = [new File([blob], '.scrobbler.log', { type: 'text/plain' }), ...filesToProcess];
        }

        if (hasLastfmData) {
          const allYears = await loadLastfmScrobbles();
          const entries = Object.values(allYears).flat().map(e => ({ ...e, source: 'lastfm' }));
          entries.sort((a, b) => new Date(a.date) - new Date(b.date));
          const lastfmJson = JSON.stringify(entries);
          const blob = new Blob([lastfmJson], { type: 'application/json' });
          filesToProcess = [new File([blob], 'lastfm-scrobbles.json', { type: 'application/json' }), ...filesToProcess];
        }

        const dt = new DataTransfer();
        filesToProcess.forEach(f => dt.items.add(f));
        await processFiles(dt.files);
        setActiveTab('stats');
      } catch (err) {
        console.error("Error processing files:", err);
        setError(err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  }, [uploadedFileList, processFiles, includeScrobblerData, storedScrobbleCount, includeLastfmData, storedLastfmCount]);



  // Handle loading data from Google Drive with mobile optimizations
  const handleDataLoaded = useCallback(async (loadedData) => {
    try {
      console.log('🔄 Loading data from Google Drive...', {
        tracks: loadedData?.processedTracks?.length || 0,
        artists: loadedData?.topArtists?.length || 0,
        albums: loadedData?.topAlbums?.length || 0,
        dataType: typeof loadedData,
        hasData: !!loadedData
      });

      if (!loadedData) {
        console.warn('⚠️ No data provided to handleDataLoaded');
        return;
      }

      // If scrobbler or Last.fm data should be included, re-process through the full pipeline
      const hasScrobblerData = includeScrobblerData && storedScrobbleCount > 0;
      const hasLastfmData = includeLastfmData && storedLastfmCount > 0;
      if ((hasScrobblerData || hasLastfmData) && loadedData.rawPlayData && loadedData.rawPlayData.length > 0) {
        console.log('🔄 Re-processing Google Drive data with scrobbler/Last.fm data...');
        setIsProcessing(true);
        try {
          // Create a JSON blob from rawPlayData (detected as Spotify format, source preserved)
          const driveBlob = new Blob([JSON.stringify(loadedData.rawPlayData)], { type: 'application/json' });
          let filesToProcess = [new File([driveBlob], 'drive-data.json', { type: 'application/json' })];

          if (hasScrobblerData) {
            const raw = localStorage.getItem('rockbox_scrobbles');
            const map = raw ? JSON.parse(raw) : {};
            const entries = Object.values(map).flat().sort((a, b) => new Date(a.ts) - new Date(b.ts));
            const lines = entries.map(e =>
              [
                e.master_metadata_album_artist_name,
                e.master_metadata_album_album_name || '',
                e.master_metadata_track_name,
                '',
                Math.round((e.ms_played || 210000) / 1000),
                e.skipped ? 'S' : '',
                Math.floor(new Date(e.ts).getTime() / 1000),
                ''
              ].join('\t')
            ).join('\n');
            const header = '#AUDIOSCROBBLER/1.1\n#TZ/UNKNOWN\n#CLIENT/Rockbox\n';
            const blob = new Blob([header + lines], { type: 'text/plain' });
            filesToProcess.push(new File([blob], '.scrobbler.log', { type: 'text/plain' }));
          }

          if (hasLastfmData) {
            const allYears = await loadLastfmScrobbles();
            const entries = Object.values(allYears).flat().map(e => ({ ...e, source: 'lastfm' }));
            entries.sort((a, b) => new Date(a.date) - new Date(b.date));
            const lastfmJson = JSON.stringify(entries);
            const blob = new Blob([lastfmJson], { type: 'application/json' });
            filesToProcess.push(new File([blob], 'lastfm-scrobbles.json', { type: 'application/json' }));
          }

          const dt = new DataTransfer();
          filesToProcess.forEach(f => dt.items.add(f));
          await processFiles(dt.files);
          return; // processFiles handles setting all state and switching tabs
        } catch (err) {
          console.error('Error re-processing with scrobbler data:', err);
          setError(err.message);
          return;
        } finally {
          setIsProcessing(false);
        }
      }

      // Check if we're on a mobile device and have a large dataset
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      const isLargeDataset = (loadedData?.processedTracks?.length || 0) > 15000;
      const isVeryLargeDataset = (loadedData?.processedTracks?.length || 0) > 30000;
      const isUltraLargeDataset = (loadedData?.processedTracks?.length || 0) > 50000;
      
      if (isMobile && isLargeDataset) {
        console.log('📱 Mobile device with large dataset - using optimized loading...', {
          tracks: loadedData?.processedTracks?.length,
          isVeryLarge: isVeryLargeDataset,
          isUltraLarge: isUltraLargeDataset
        });
      }

      // Set all the loaded data with safety checks and mobile optimization
      console.log('🔧 Setting stats...');
      if (loadedData.stats) setStats(loadedData.stats);
      
      // Add yield point for mobile to prevent freezing
      if (isMobile && isLargeDataset) {
        const delay = isUltraLargeDataset ? 150 : isVeryLargeDataset ? 100 : 50;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log('🔧 Setting processed data...');
      if (loadedData.processedTracks) setProcessedData(loadedData.processedTracks);
      
      if (isMobile && isLargeDataset) {
        const delay = isUltraLargeDataset ? 150 : isVeryLargeDataset ? 100 : 50;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log('🔧 Setting top artists...');
      if (loadedData.topArtists) {
        // Enrich artists with mostPlayedAlbum if missing (for data saved before this feature)
        if (loadedData.topAlbums && loadedData.topArtists.length > 0 && !loadedData.topArtists[0].mostPlayedAlbum) {
          const albumsByArtist = {};
          loadedData.topAlbums.forEach(album => {
            const key = (album.artist || '').toLowerCase().trim();
            if (!albumsByArtist[key] || album.playCount > albumsByArtist[key].playCount) {
              albumsByArtist[key] = { albumName: album.name, playCount: album.playCount };
            }
          });
          loadedData.topArtists.forEach(artist => {
            const key = (artist.name || '').toLowerCase().trim();
            if (albumsByArtist[key]) {
              artist.mostPlayedAlbum = albumsByArtist[key];
            }
          });
        }
        setTopArtists(loadedData.topArtists);
      }

      console.log('🔧 Setting top albums...');
      if (loadedData.topAlbums) setTopAlbums(loadedData.topAlbums);
      
      console.log('🔧 Setting brief obsessions...');
      if (loadedData.briefObsessions) setBriefObsessions(loadedData.briefObsessions);
      
      if (isMobile && isLargeDataset) {
        const delay = isUltraLargeDataset ? 150 : isVeryLargeDataset ? 100 : 50;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log('🔧 Setting songs by year...');
      if (loadedData.songsByYear) setSongsByYear(loadedData.songsByYear);
      
      console.log('🔧 Setting raw play data...');
      if (loadedData.rawPlayData) {
        setRawPlayData(loadedData.rawPlayData);
        // Saved snapshots are treated as the pristine base for future edits
        setBasePlayData(loadedData.rawPlayData);
        // Rebuild trackDurationMap from rawPlayData (Map doesn't survive serialization)
        const durMap = new Map();
        loadedData.rawPlayData.forEach(entry => {
          if (entry.reason_end === 'trackdone' && entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
            const key = `${entry.master_metadata_track_name.toLowerCase().trim()}|||${entry.master_metadata_album_artist_name.toLowerCase().trim()}`;
            const current = durMap.get(key) || 0;
            if (entry.ms_played > current) durMap.set(key, entry.ms_played);
          }
        });
        setTrackDurationMap(durMap);
      }

      console.log('🔧 Setting streaks...');
      if (loadedData.streaks) {
        setStreaks(loadedData.streaks);
      } else if (loadedData.rawPlayData && loadedData.rawPlayData.length > 0) {
        // Calculate streaks from rawPlayData for older saved data
        console.log('⚙️ Calculating streaks from rawPlayData...');
        const consecutivePlays = calculateConsecutivePlayStreaks(loadedData.rawPlayData);
        const overallDaily = calculateOverallDailyStreak(loadedData.rawPlayData);
        // topSongDaily requires playHistory which isn't in saved data, so skip it
        const topAlbumDaily = loadedData.topAlbums ?
          calculateTopAlbumDailyStreak(loadedData.topAlbums, loadedData.rawPlayData) : null;

        setStreaks({
          consecutivePlays,
          overallDaily,
          topSongDaily: null,
          topAlbumDaily
        });
      }

      // Set artistsByYear for YearSelector functionality
      console.log('🔧 Setting artists by year...');
      if (loadedData.artistsByYear) {
        console.log('📊 Using existing artistsByYear:', Object.keys(loadedData.artistsByYear));
        setArtistsByYear(loadedData.artistsByYear);
      } else {
        // If artistsByYear is missing from loaded data, calculate it from songsByYear
        console.log('⚙️ Calculating artistsByYear from songsByYear...');
        console.log('📊 songsByYear available:', !!loadedData.songsByYear, loadedData.songsByYear ? Object.keys(loadedData.songsByYear) : 'none');
        
        if (isMobile && isLargeDataset) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const calculatedArtistsByYear = {};
        if (loadedData.songsByYear && Object.keys(loadedData.songsByYear).length > 0) {
          const yearKeys = Object.keys(loadedData.songsByYear);
          
          for (let yearIndex = 0; yearIndex < yearKeys.length; yearIndex++) {
            const year = yearKeys[yearIndex];
            calculatedArtistsByYear[year] = {};
            const yearSongs = loadedData.songsByYear[year];
            
            if (Array.isArray(yearSongs)) {
              yearSongs.forEach(song => {
                const artistName = song.artistName || song.artist;
                if (artistName) {
                  if (!calculatedArtistsByYear[year][artistName]) {
                    calculatedArtistsByYear[year][artistName] = 0;
                  }
                  calculatedArtistsByYear[year][artistName] += song.totalPlayed || song.playCount || 1;
                }
              });
            } else {
              console.warn('⚠️ songsByYear[' + year + '] is not an array:', typeof yearSongs);
            }
            
            // Yield every few years on mobile to prevent freezing
            if (isMobile && yearIndex % 2 === 0 && yearIndex > 0) {
              await new Promise(resolve => setTimeout(resolve, 25));
            }
          }
          
          console.log('✅ Calculated artistsByYear with years:', Object.keys(calculatedArtistsByYear));
          console.log('📊 Sample year data:', calculatedArtistsByYear[Object.keys(calculatedArtistsByYear)[0]] ? Object.keys(calculatedArtistsByYear[Object.keys(calculatedArtistsByYear)[0]]).slice(0, 5) : 'no data');
        } else {
          console.warn('⚠️ No songsByYear data available for artistsByYear calculation');
        }
        setArtistsByYear(calculatedArtistsByYear);
      }
      
      // Set albumsByYear for album year filtering functionality  
      console.log('🔧 Setting albums by year...');
      if (loadedData.albumsByYear) {
        setAlbumsByYear(loadedData.albumsByYear);
      } else {
        // Calculate albumsByYear from songsByYear if missing
        console.log('⚙️ Calculating albumsByYear from songsByYear...');
        
        if (isMobile && isLargeDataset) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const calculatedAlbumsByYear = {};
        if (loadedData.songsByYear) {
          const yearKeys = Object.keys(loadedData.songsByYear);
          
          for (let yearIndex = 0; yearIndex < yearKeys.length; yearIndex++) {
            const year = yearKeys[yearIndex];
            calculatedAlbumsByYear[year] = {};
            const yearSongs = loadedData.songsByYear[year];
            
            if (Array.isArray(yearSongs)) {
              yearSongs.forEach(song => {
                const albumName = song.albumName || song.album;
                if (albumName) {
                  if (!calculatedAlbumsByYear[year][albumName]) {
                    calculatedAlbumsByYear[year][albumName] = 0;
                  }
                  calculatedAlbumsByYear[year][albumName] += song.totalPlayed || song.playCount || 1;
                }
              });
            }
            
            // Yield every few years on mobile to prevent freezing
            if (isMobile && yearIndex % 2 === 0 && yearIndex > 0) {
              await new Promise(resolve => setTimeout(resolve, 25));
            }
          }
        }
        setAlbumsByYear(calculatedAlbumsByYear);
        console.log('✅ Calculated albumsByYear:', Object.keys(calculatedAlbumsByYear));
      }
      
      // Final yield for mobile before switching tabs - be more aggressive
      if (isMobile && isLargeDataset) {
        console.log('📱 Mobile: Allowing extra time for React to process large dataset...');
        
        // Suggest garbage collection if available (Chrome DevTools)
        if (window.gc && isVeryLargeDataset) {
          console.log('📱 Mobile: Triggering garbage collection for very large dataset...');
          try {
            window.gc();
          } catch (e) {
            // Ignore - gc not available in production
          }
        }
        
        // Give React more time to process all the state updates before switching tabs
        const finalDelay = isUltraLargeDataset ? 2000 : isVeryLargeDataset ? 1200 : 600;
        await new Promise(resolve => setTimeout(resolve, finalDelay));
      }
      
      // Switch to stats view after loading
      console.log('🔧 Setting active tab to stats...');
      
      if (isMobile && isLargeDataset) {
        // For mobile with large datasets, use a two-step tab switch to reduce render load
        console.log('📱 Mobile: Using staged tab switching to prevent render overload...');
        
        // First, briefly stay on upload tab to let data settle
        setTimeout(() => {
          console.log('📱 Mobile: Switching to stats tab...');
          setActiveTab('stats');
          console.log('✅ Google Drive data loaded successfully - tab switched');
        }, isUltraLargeDataset ? 1200 : isVeryLargeDataset ? 800 : 400);
      } else {
        setActiveTab('stats');
        console.log('✅ Google Drive data loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to load Google Drive data:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        loadedData: loadedData
      });
    }
  }, [includeScrobblerData, storedScrobbleCount, includeLastfmData, storedLastfmCount, processFiles]);


  // Reset data loaded flag when authentication state changes


  // Handle year range change with useCallback
  const handleYearRangeChange = useCallback(({ startYear, endYear }) => {
    if (!startYear || !endYear) {
      console.warn("Invalid year range:", { startYear, endYear });
      return;
    }
    setYearRangeMode(true);
    setYearRange({ startYear, endYear });
    setSelectedArtistYear('range');
    setArtistStartDate(parseRangeValue(startYear, false));
    setArtistEndDate(parseRangeValue(endYear, true));
  }, [parseRangeValue]);

  // Tab label functions with useCallback to prevent recreation

  const getArtistsTabLabel = useCallback(() => {
    if (selectedArtistYear === 'all') {
      return <span>Artists <span className="text-xs opacity-75">all-time</span></span>;
    } else if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return <span>Artists <span className="text-xs opacity-75">{yearRange.startYear}-{yearRange.endYear}</span></span>;
    }
    return <span>Artists <span className="text-xs opacity-75">{selectedArtistYear}</span></span>;
  }, [selectedArtistYear, yearRangeMode, yearRange]);

  const getCustomTabLabel = useCallback(() => {
    if (customYearRangeMode && customYearRange.startYear && customYearRange.endYear) {
      return <span>Songs <span className="text-xs opacity-75">{customYearRange.startYear}-{customYearRange.endYear}</span></span>;
    } else if (customTrackYear === 'all') {
      return <span>Songs <span className="text-xs opacity-75">all-time</span></span>;
    }
    return <span>Songs <span className="text-xs opacity-75">{customTrackYear}</span></span>;
  }, [customYearRangeMode, customYearRange, customTrackYear]);

  const getPatternsTabLabel = useCallback(() => {
    if (patternYearRangeMode && patternYearRange.startYear && patternYearRange.endYear) {
      return <span>Patterns <span className="text-xs opacity-75">{patternYearRange.startYear}-{patternYearRange.endYear}</span></span>;
    } else if (selectedPatternYear === 'all') {
      return <span>Patterns <span className="text-xs opacity-75">all-time</span></span>;
    }
    return <span>Patterns <span className="text-xs opacity-75">{selectedPatternYear}</span></span>;
  }, [patternYearRangeMode, patternYearRange, selectedPatternYear]);

  const getBehaviorTabLabel = useCallback(() => {
    if (behaviorYearRangeMode && behaviorYearRange.startYear && behaviorYearRange.endYear) {
      return <span>Behavior <span className="text-xs opacity-75">{behaviorYearRange.startYear}-{behaviorYearRange.endYear}</span></span>;
    } else if (selectedBehaviorYear === 'all') {
      return <span>Behavior <span className="text-xs opacity-75">all-time</span></span>;
    }
    return <span>Behavior <span className="text-xs opacity-75">{selectedBehaviorYear}</span></span>;
  }, [behaviorYearRangeMode, behaviorYearRange, selectedBehaviorYear]);

  const getCalendarTabLabel = useCallback(() => {
    if (calendarYearRangeMode && calendarYearRange.startYear && calendarYearRange.endYear) {
      return <span>Calendar <span className="text-xs opacity-75">{calendarYearRange.startYear}-{calendarYearRange.endYear}</span></span>;
    } else if (selectedCalendarYear === 'all') {
      return <span>Calendar <span className="text-xs opacity-75">all-time</span></span>;
    }
    return <span>Calendar <span className="text-xs opacity-75">{selectedCalendarYear}</span></span>;
  }, [calendarYearRangeMode, calendarYearRange, selectedCalendarYear]);

  const getDiscoveryTabLabel = useCallback(() => {
    if (discoveryYearRangeMode && discoveryYearRange.startYear && discoveryYearRange.endYear) {
      return <span>Discovery <span className="text-xs opacity-75">{discoveryYearRange.startYear}-{discoveryYearRange.endYear}</span></span>;
    } else if (selectedDiscoveryYear === 'all') {
      return <span>Discovery <span className="text-xs opacity-75">all-time</span></span>;
    }
    return <span>Discovery <span className="text-xs opacity-75">{selectedDiscoveryYear}</span></span>;
  }, [discoveryYearRangeMode, discoveryYearRange, selectedDiscoveryYear]);

  const getPodcastsTabLabel = useCallback(() => {
    if (podcastYearRangeMode && podcastYearRange.startYear && podcastYearRange.endYear) {
      return <span>Podcasts <span className="text-xs opacity-75">{podcastYearRange.startYear}-{podcastYearRange.endYear}</span></span>;
    } else if (selectedPodcastYear === 'all') {
      return <span>Podcasts <span className="text-xs opacity-75">all-time</span></span>;
    }
    return <span>Podcasts <span className="text-xs opacity-75">{selectedPodcastYear}</span></span>;
  }, [podcastYearRangeMode, podcastYearRange, selectedPodcastYear]);

  // Handle loading sample data with useCallback
  const handleLoadSampleData = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // URLs to sample JSON files
      const sampleFileUrls = [
        '/sampledata/Streaming1.json',
        '/sampledata/Streaming2.json',
        '/sampledata/Streaming3.json',
        '/sampledata/Streaming4.json'
      ];
      
      // Fetch all files in parallel
      const files = await Promise.all(
        sampleFileUrls.map(async (url, index) => {
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
          }
          
          const blob = await response.blob();
          // Use a filename that the adapter will recognize
          return new File([blob], `Streaming_History_${index+1}.json`, { type: 'application/json' });
        })
      );
      
      // Update UI to show the sample files
      setUploadedFileList(files);
      setUploadedFiles(files.map(file => file.name));
      
      // Process the files
      await processFiles(files);
      
      // After processing completes, switch to stats tab
      setActiveTab('stats');
    } catch (err) {
      console.error("Error loading sample data:", err);
      setError("Failed to load sample data: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [processFiles]);

  // Handle custom track year change with useCallback
  const handleCustomTrackYearChange = useCallback((year) => {
    // Ensure 'all' is handled consistently
    const isAllTime = year === 'all';
    
    // Use the right string value
    const yearValue = isAllTime ? 'all' : year;
    setCustomTrackYear(yearValue);
    setCustomYearRangeMode(false);
  }, []);

  // Handle custom track year range change with useCallback
  const handleCustomTrackYearRangeChange = useCallback(({ startYear, endYear }) => {
    setCustomYearRange({ startYear, endYear });
    setCustomYearRangeMode(true);
  }, []);

  // Handle toggling custom track year range mode with useCallback
  const handleCustomTrackYearRangeModeToggle = useCallback((isRange) => {
    setCustomYearRangeMode(isRange);
    
    // If switching to range mode, also set a default range if needed
    if (isRange && (!customYearRange.startYear || !customYearRange.endYear)) {
      const availableYears = Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
      if (availableYears.length >= 2) {
        setCustomYearRange({
          startYear: availableYears[0],
          endYear: availableYears[availableYears.length - 1]
        });
      }
    }
  }, [artistsByYear, customYearRange]);

  // Determine if sidebar should be shown based on current tab
  const shouldShowSidebar = useCallback((tabName) => {
    const sidebarTabs = ['stats', 'artists', 'albums', 'patterns', 'calendar', 'behavior', 'custom', 'discovery', 'podcasts'];
    return sidebarTabs.includes(tabName);
  }, []);

  // Update sidebar visibility and color theme when tab changes
  useEffect(() => {
    // Determine if sidebar should be shown for the current tab
    const showSidebar = shouldShowSidebar(activeTab);
    setShowYearSidebar(showSidebar);
    
    // Set the appropriate color theme based on the active tab (reverted to original TopTabs background colors)
    switch(activeTab) {
      case 'updates':
        setSidebarColorTheme('fuchsia'); // Original TopTabs color for updates
        break;
      case 'upload':
        setSidebarColorTheme('violet'); // Original TopTabs color for upload
        break;
      case 'stats':
        setSidebarColorTheme('indigo'); // Original TopTabs color for stats
        break;
      case 'artists':
        setSidebarColorTheme('blue'); // Original TopTabs color for artists
        break;
      case 'albums':
        setSidebarColorTheme('cyan'); // Original TopTabs color for albums
        break;
      case 'custom':
        setSidebarColorTheme('emerald'); // Original TopTabs color for custom/songs
        break;
      case 'calendar':
        setSidebarColorTheme('green'); // Original TopTabs color for calendar
        break;
      case 'patterns':
        setSidebarColorTheme('yellow'); // Original TopTabs color for patterns
        break;
      case 'behavior':
        setSidebarColorTheme('amber'); // Original TopTabs color for behavior
        break;
      case 'discovery':
        setSidebarColorTheme('orange'); // Original TopTabs color for discovery
        break;
      case 'podcasts':
        setSidebarColorTheme('red'); // Original TopTabs color for podcasts
        break;
      case 'playlists':
        setSidebarColorTheme('rose'); // Original TopTabs color for playlists
        break;
      case 'data':
        setSidebarColorTheme('green'); // Terminal green for data
        break;
      default:
        setSidebarColorTheme('blue');
    }

    // Set the appropriate text theme based on the active tab (shifted text colors - 4 positions down)
    switch(activeTab) {
      case 'updates':
        setSidebarTextTheme('cyan'); // Shifted text color for updates
        break;
      case 'upload':
        setSidebarTextTheme('emerald'); // Shifted text color for upload
        break;
      case 'stats':
        setSidebarTextTheme('green'); // Shifted text color for stats
        break;
      case 'artists':
        setSidebarTextTheme('yellow'); // Shifted text color for artists
        break;
      case 'albums':
        setSidebarTextTheme('amber'); // Shifted text color for albums
        break;
      case 'custom':
        setSidebarTextTheme('orange'); // Shifted text color for custom/songs
        break;
      case 'calendar':
        setSidebarTextTheme('red'); // Shifted text color for calendar
        break;
      case 'patterns':
        setSidebarTextTheme('rose'); // Shifted text color for patterns
        break;
      case 'behavior':
        setSidebarTextTheme('fuchsia'); // Shifted text color for behavior
        break;
      case 'discovery':
        setSidebarTextTheme('violet'); // Shifted text color for discovery
        break;
      case 'podcasts':
        setSidebarTextTheme('indigo'); // Shifted text color for podcasts
        break;
      case 'playlists':
        setSidebarTextTheme('blue'); // Shifted text color for playlists
        break;
      case 'data':
        setSidebarTextTheme('green'); // Terminal green for data
        break;
      default:
        setSidebarTextTheme('blue');
    }
  }, [activeTab, shouldShowSidebar]);

  // Convert selectedArtistYear to date range (like CustomTrackRankings)
  useEffect(() => {
    if (selectedArtistYear === 'range') return; // Range mode sets dates directly
    if (selectedArtistYear === 'all' || selectedArtistYear.startsWith('all-')) {
      // All time (month/day filtering handled in useMemo)
      setArtistStartDate('');
      setArtistEndDate('');
    } else if (selectedArtistYear.includes('-')) {
      const parts = selectedArtistYear.split('-');
      if (parts.length === 3) {
        // Single day selection
        setArtistStartDate(selectedArtistYear);
        setArtistEndDate(selectedArtistYear);
      } else if (parts.length === 2) {
        // Month selection (YYYY-MM)
        const year = parts[0];
        const month = parts[1];
        // Calculate last day of month
        const lastDay = new Date(year, month, 0).getDate();
        setArtistStartDate(`${year}-${month}-01`);
        setArtistEndDate(`${year}-${month}-${lastDay}`);
      }
    } else {
      // Single year format (YYYY)
      setArtistStartDate(`${selectedArtistYear}-01-01`);
      setArtistEndDate(`${selectedArtistYear}-12-31`);
    }
  }, [selectedArtistYear]);

  // Convert selectedAlbumYear to date range (like CustomTrackRankings)
  useEffect(() => {
    if (selectedAlbumYear === 'range') return; // Range mode sets dates directly
    if (selectedAlbumYear === 'all' || selectedAlbumYear.startsWith('all-')) {
      // All time (month/day filtering handled in useMemo)
      setAlbumStartDate('');
      setAlbumEndDate('');
    } else if (selectedAlbumYear.includes('-')) {
      const parts = selectedAlbumYear.split('-');
      if (parts.length === 3) {
        // Single day selection
        setAlbumStartDate(selectedAlbumYear);
        setAlbumEndDate(selectedAlbumYear);
      } else if (parts.length === 2) {
        // Month selection (YYYY-MM)
        const year = parts[0];
        const month = parts[1];
        // Calculate last day of month
        const lastDay = new Date(year, month, 0).getDate();
        setAlbumStartDate(`${year}-${month}-01`);
        setAlbumEndDate(`${year}-${month}-${lastDay}`);
      }
    } else {
      // Single year format (YYYY)
      setAlbumStartDate(`${selectedAlbumYear}-01-01`);
      setAlbumEndDate(`${selectedAlbumYear}-12-31`);
    }
  }, [selectedAlbumYear]);

  // Handle year selection from sidebar based on active tab
  const handleSidebarYearChange = useCallback((year) => {
    // Always use 'all' string (not object reference) for consistency
    const yearValue = year === 'all' ? 'all' : year;
    
    console.log("handleSidebarYearChange called with:", { year, activeTab });
    
    switch(activeTab) {
      case 'stats':
        console.log("Setting selectedStatsYear to:", year);
        setSelectedStreaksYear(year);
        break;
      case 'artists':
        console.log("Setting selectedArtistYear to:", year);
        setSelectedArtistYear(year);
        break;
      case 'albums':
        console.log("Setting selectedAlbumYear to:", year, "current value was:", selectedAlbumYear);
        setSelectedAlbumYear(year);
        break;
      case 'custom':
        handleCustomTrackYearChange(year);
        break;
      case 'patterns':
        setSelectedPatternYear(year);
        break;
      case 'calendar':
        handleCalendarYearChange(year);
        break;
      case 'behavior':
        setSelectedBehaviorYear(year);
        break;
      case 'discovery':
        setSelectedDiscoveryYear(year);
        break;
      case 'podcasts':
        setSelectedPodcastYear(year);
        break;
      default:
        // Default behavior
        break;
    }
  }, [activeTab, handleCustomTrackYearChange]);

  // Handle year range selection from sidebar
  const handleSidebarYearRangeChange = useCallback(({ startYear, endYear }) => {
    switch(activeTab) {
      case 'artists':
        handleYearRangeChange({ startYear, endYear });
        break;
      case 'albums':
        handleAlbumYearRangeChange({ startYear, endYear });
        break;
      case 'custom':
        handleCustomTrackYearRangeChange({ startYear, endYear });
        break;
      case 'patterns':
        setPatternYearRange({ startYear, endYear });
        break;
      case 'calendar':
        handleCalendarYearRangeChange({ startYear, endYear });
        break;
      case 'behavior':
        setBehaviorYearRange({ startYear, endYear });
        break;
      case 'discovery':
        setDiscoveryYearRange({ startYear, endYear });
        break;
      case 'podcasts':
        setPodcastYearRange({ startYear, endYear });
        break;
      default:
        // Default behavior
        break;
    }
  }, [activeTab, handleYearRangeChange, handleAlbumYearRangeChange, handleCustomTrackYearRangeChange]);

  // Stable callback for year selector expand state — must be memoized to avoid
  // React 18 "Cannot update while rendering" warning from Strict Mode double-effect firing
  const handleYearSelectorExpandChange = useCallback((expanded) => {
    setYearSelectorExpanded(expanded);
  }, []);

  // Handle range mode toggle from sidebar
  const handleSidebarRangeModeToggle = useCallback((isRange) => {
    console.log("handleSidebarRangeModeToggle called with:", { isRange, activeTab });
    const availableYears = Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
    
    switch(activeTab) {
      case 'artists':
        toggleYearRangeMode(isRange);
        // If switching to range mode, also set a default range
        if (isRange && availableYears.length >= 2) {
          handleYearRangeChange({
            startYear: availableYears[0],
            endYear: availableYears[availableYears.length - 1]
          });
        }
        break;
      case 'albums':
        toggleAlbumYearRangeMode(isRange);
        // If switching to range mode, also set a default range
        if (isRange && availableYears.length >= 2) {
          handleAlbumYearRangeChange({
            startYear: availableYears[0],
            endYear: availableYears[availableYears.length - 1]
          });
        }
        break;
      case 'custom':
        setCustomYearRangeMode(isRange);
        if (isRange && availableYears.length >= 2) {
          setCustomYearRange({
            startYear: availableYears[0],
            endYear: availableYears[availableYears.length - 1]
          });
        }
        break;
      case 'patterns':
        setPatternYearRangeMode(isRange);
        if (isRange && availableYears.length >= 2) {
          setPatternYearRange({
            startYear: availableYears[0],
            endYear: availableYears[availableYears.length - 1]
          });
        }
        break;
      case 'calendar':
        toggleCalendarYearRangeMode(isRange);
        if (isRange && availableYears.length >= 2) {
          setCalendarYearRange({
            startYear: availableYears[0],
            endYear: availableYears[availableYears.length - 1]
          });
        }
        break;
      case 'behavior':
        setBehaviorYearRangeMode(isRange);
        if (isRange && availableYears.length >= 2) {
          setBehaviorYearRange({
            startYear: availableYears[0],
            endYear: availableYears[availableYears.length - 1]
          });
        }
        break;
      case 'discovery':
        setDiscoveryYearRangeMode(isRange);
        if (isRange && availableYears.length >= 2) {
          setDiscoveryYearRange({
            startYear: availableYears[0],
            endYear: availableYears[availableYears.length - 1]
          });
        }
        break;
      case 'podcasts':
        setPodcastYearRangeMode(isRange);
        if (isRange && availableYears.length >= 2) {
          setPodcastYearRange({
            startYear: availableYears[0],
            endYear: availableYears[availableYears.length - 1]
          });
        }
        break;
      default:
        // Default behavior
        break;
    }
  }, [activeTab, artistsByYear, toggleYearRangeMode, toggleAlbumYearRangeMode, handleYearRangeChange, handleAlbumYearRangeChange]);

  // Simple content area calculation: screen size minus component widths/heights
  const contentAreaStyles = useMemo(() => {
    // Return SSR-matching values until after mount to avoid hydration mismatch
    if (!mounted) {
      return {
        paddingTop: '56px',
        paddingBottom: '0px', 
        paddingLeft: '0px',
        paddingRight: '192px', // Default for right-positioned YearSelector
      };
    }
    
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    // FixedSettingsBar is always 40px on desktop (icon buttons only, no text)
    const settingsBarHeight = isMobile ? 85 : 40;
    
    let leftSpace = 0;
    let rightSpace = 0;
    let topSpace = isMobile ? 0 : settingsBarHeight;
    let bottomSpace = isMobile ? settingsBarHeight : 0;
    
    // Calculate space taken by components on left/right
    if (topTabsPosition === 'left') {
      leftSpace += topTabsWidth;
    }
    if (topTabsPosition === 'right') {
      rightSpace += topTabsWidth;
    }
    
    if (showYearSidebar && shouldShowSidebar(activeTab)) {
      if (yearSelectorPosition === 'left') {
        leftSpace += yearSelectorWidth;
      } else if (yearSelectorPosition === 'right') {
        rightSpace += yearSelectorWidth;
      }
    }
    
    // Calculate space taken by components on top/bottom
    if (topTabsPosition === 'top') {
      topSpace += topTabsHeight;
    }
    if (topTabsPosition === 'bottom') {
      bottomSpace += topTabsHeight;
    }
    
    if (showYearSidebar && shouldShowSidebar(activeTab)) {
      // Use measured height instead of static dimensions
      if (yearSelectorPosition === 'top') {
        topSpace += yearSelectorHeight;
      } else if (yearSelectorPosition === 'bottom') {
        bottomSpace += yearSelectorHeight;
      }
    }
    
    return {
      // On mobile with top-positioned TopTabs, the TopTabs height (JS-measured) excludes the
      // safe-area inset. We add env(safe-area-inset-top) in CSS so it's always in sync with
      // the actual device inset, regardless of orientation-change timing issues.
      paddingTop: (isMobile && topTabsPosition === 'top')
        ? `calc(env(safe-area-inset-top) + ${topSpace}px)`
        : `${topSpace}px`,
      paddingBottom: `${bottomSpace}px`,
      paddingLeft: `${leftSpace}px`,
      paddingRight: `${rightSpace}px`,
    };
  }, [mounted, topTabsPosition, topTabsWidth, topTabsHeight, yearSelectorPosition, yearSelectorWidth, showYearSidebar, isMobile, yearSelectorHeight, fontSize]);

  // Toggle position function for settings bar
  const togglePosition = useCallback(() => {
    setTopTabsPosition(prev => {
      // Mobile cycle: bottom → left → top → right → bottom (matches YearSelector)
      // Desktop cycle: top → right → bottom → left → top (treats top as primary)
      if (isMobile) {
        if (prev === 'bottom') return 'left';
        if (prev === 'left') return 'top';
        if (prev === 'top') return 'right';
        return 'bottom';
      } else {
        if (prev === 'top') return 'right';
        if (prev === 'right') return 'bottom';
        if (prev === 'bottom') return 'left';
        return 'top';
      }
    });
  }, [isMobile]);

  // Toggle collapsed function for settings bar
  const toggleCollapsed = useCallback(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        setTopTabsCollapsed(prev => !prev);
      }
    }
  }, []);

  // Memoized tab content renderer for performance optimization
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'upload':
        return (
          <UploadTab
            albumsByYear={albumsByYear}
            artistsByYear={artistsByYear}
            briefObsessions={briefObsessions}
            colorMode={colorMode}
            enableEnrichment={enableEnrichment}
            setEnableEnrichment={setEnableEnrichment}
            enrichmentProgress={enrichmentProgress}
            error={error}
            handleDataLoaded={handleDataLoaded}
            handleDeleteFile={handleDeleteFile}
            handleFileUpload={handleFileUpload}
            handleLoadSampleData={handleLoadSampleData}
            handleProcessFiles={handleProcessFiles}
            processFiles={processFiles}
            includeLastfmData={includeLastfmData}
            setIncludeLastfmData={setIncludeLastfmData}
            includeScrobblerData={includeScrobblerData}
            setIncludeScrobblerData={setIncludeScrobblerData}
            isDarkMode={isDarkMode}
            isProcessing={isProcessing}
            processedData={processedData}
            rawPlayData={rawPlayData}
            setStorageNotification={setStorageNotification}
            storageNotification={storageNotification}
            storedLastfmCount={storedLastfmCount}
            storedScrobbleCount={storedScrobbleCount}
            songsByYear={songsByYear}
            stats={stats}
            streaks={streaks}
            topAlbums={topAlbums}
            topArtists={topArtists}
            uploadInnerTab={uploadInnerTab}
            setUploadInnerTab={setUploadInnerTab}
            uploadedFileList={uploadedFileList}
            uploadedFiles={uploadedFiles}
          />
        );

      case 'stats':
        return (
          <StatsTab
            colorMode={colorMode}
            setColorMode={setColorMode}
            isDarkMode={isDarkMode}
            filteredStats={filteredStats}
            filteredStreaks={filteredStreaks}
            formatDuration={formatDuration}
            rawPlayData={rawPlayData}
            selectedStreaksYear={selectedStreaksYear}
            stats={stats}
          />
        );

      case 'artists':
        return (
          <ArtistsTab
            artistSearch={artistSearch}
            setArtistSearch={setArtistSearch}
            artistSelectionMode={artistSelectionMode}
            setArtistSelectionMode={setArtistSelectionMode}
            artistsSortBy={artistsSortBy}
            setArtistsSortBy={setArtistsSortBy}
            artistsSortPress={artistsSortPress}
            setArtistsSortPress={setArtistsSortPress}
            artistsViewMode={artistsViewMode}
            setArtistsViewMode={setArtistsViewMode}
            artistsViewPress={artistsViewPress}
            setArtistsViewPress={setArtistsViewPress}
            colorMode={colorMode}
            isDarkMode={isDarkMode}
            displayedArtists={displayedArtists}
            filteredArtists={filteredArtists}
            filteredDisplayedArtists={filteredDisplayedArtists}
            formatDuration={formatDuration}
            getArtistsTabLabel={getArtistsTabLabel}
            selectedArtistYear={selectedArtistYear}
            setSelectedArtistYear={setSelectedArtistYear}
            artistsByYear={artistsByYear}
            rawPlayData={rawPlayData}
            selectedArtists={selectedArtists}
            setSelectedArtists={setSelectedArtists}
            setActiveTab={setActiveTab}
            expandedArtistCards={expandedArtistCards}
            setExpandedArtistCards={setExpandedArtistCards}
            topArtistsCount={topArtistsCount}
            setTopArtistsCount={setTopArtistsCount}
            yearRange={yearRange}
            yearRangeMode={yearRangeMode}
            setYearRangeMode={setYearRangeMode}
          />
        );

      case 'albums':
        return (
          <AlbumsTab
            albumsSortBy={albumsSortBy}
            setAlbumsSortBy={setAlbumsSortBy}
            albumsSortPress={albumsSortPress}
            setAlbumsSortPress={setAlbumsSortPress}
            albumsViewMode={albumsViewMode}
            setAlbumsViewMode={setAlbumsViewMode}
            albumsViewPress={albumsViewPress}
            setAlbumsViewPress={setAlbumsViewPress}
            artistSearch={artistSearch}
            setArtistSearch={setArtistSearch}
            colorMode={colorMode}
            isDarkMode={isDarkMode}
            displayedAlbums={displayedAlbums}
            filteredArtists={filteredArtists}
            formatDuration={formatDuration}
            getAlbumsTabLabel={getAlbumsTabLabel}
            processedData={processedData}
            selectedAlbumYear={selectedAlbumYear}
            albumsByYear={albumsByYear}
            albumYearRangeMode={albumYearRangeMode}
            rawPlayData={rawPlayData}
            selectedArtists={selectedArtists}
            setSelectedArtists={setSelectedArtists}
            expandedAlbumListRows={expandedAlbumListRows}
            setExpandedAlbumListRows={setExpandedAlbumListRows}
            topAlbumsCount={topAlbumsCount}
            setTopAlbumsCount={setTopAlbumsCount}
            albumTextTheme={albumTextTheme}
            albumBackgroundTheme={albumBackgroundTheme}
          />
        );

      case 'custom':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-emerald-200 dark:bg-emerald-900 rounded border-2 border-emerald-300 dark:border-emerald-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            <CustomTrackRankings
              rawPlayData={rawPlayData}
              formatDuration={formatDuration}
              selectedYear={customTrackYear}
              yearRangeMode={customYearRangeMode}
              statsSongsByYear={songsByYear}
              yearRange={customYearRange}
              textTheme={customTextTheme}
              backgroundTheme={customBackgroundTheme}
              colorTheme="emerald"
              initialArtists={selectedArtists}
              colorMode={colorMode}
              viewMode={customViewMode}
              setViewMode={setCustomViewMode}
            />
          </div>
        );
      
      case 'tracks':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-red-200 dark:bg-red-900 rounded border-2 border-red-300 dark:border-red-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            <TrackRankings
              processedData={processedData}
              formatDuration={formatDuration}
              textTheme={tracksTextTheme}
              backgroundTheme={tracksBackgroundTheme}
              colorMode={colorMode}
            />
          </div>
        );
      
      case 'patterns':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-yellow-200 dark:bg-yellow-900 rounded border-2 border-yellow-300 dark:border-yellow-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            <ListeningPatterns
              rawPlayData={rawPlayData}
              formatDuration={formatDuration}
              selectedYear={selectedPatternYear}
              yearRange={patternYearRange}
              yearRangeMode={patternYearRangeMode}
              textTheme={patternTextTheme}
              backgroundTheme={patternBackgroundTheme}
              briefObsessions={briefObsessions}
              songsByYear={songsByYear}
              colorMode={colorMode}
              viewMode={patternsViewMode}
              setViewMode={setPatternsViewMode}
              trackDurationMap={trackDurationMap}
            />
          </div>
        );
      
      case 'calendar':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-green-200 dark:bg-green-900 rounded border-2 border-green-300 dark:border-green-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            <CalendarView
              rawPlayData={rawPlayData}
              formatDuration={formatDuration}
              selectedYear={selectedCalendarYear}
              yearRange={calendarYearRange}
              yearRangeMode={calendarYearRangeMode}
              colorTheme={calendarBackgroundTheme}
              textTheme={calendarTextTheme}
              backgroundTheme={calendarBackgroundTheme}
              onYearChange={setSelectedCalendarYear}
              colorMode={colorMode}
              viewMode={calendarViewMode}
              setViewMode={setCalendarViewMode}
              trackDurationMap={trackDurationMap}
            />
          </div>
        );
      
      case 'behavior':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-amber-200 dark:bg-amber-900 rounded border-2 border-amber-300 dark:border-amber-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            <ListeningBehavior
              rawPlayData={rawPlayData}
              formatDuration={formatDuration}
              selectedYear={selectedBehaviorYear}
              yearRange={behaviorYearRange}
              yearRangeMode={behaviorYearRangeMode}
              colorTheme={behaviorBackgroundTheme}
              textTheme={behaviorTextTheme}
              backgroundTheme={behaviorBackgroundTheme}
              colorMode={colorMode}
              trackDurationMap={trackDurationMap}
            />
          </div>
        );
      
      case 'discovery':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-orange-200 dark:bg-orange-900 rounded border-2 border-orange-300 dark:border-orange-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            <DiscoveryAnalysis
              rawPlayData={rawPlayData}
              formatDuration={formatDuration}
              selectedYear={selectedDiscoveryYear}
              yearRange={discoveryYearRange}
              yearRangeMode={discoveryYearRangeMode}
              colorTheme={discoveryBackgroundTheme}
              textTheme={discoveryTextTheme}
              backgroundTheme={discoveryBackgroundTheme}
              colorMode={colorMode}
              trackDurationMap={trackDurationMap}
            />
          </div>
        );
      
      case 'podcasts':
        return (
          <div id="podcast-rankings" className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-red-200 dark:bg-red-900 rounded border-2 border-red-300 dark:border-red-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            <PodcastRankings
              rawPlayData={rawPlayData}
              formatDuration={formatDuration}
              selectedYear={selectedPodcastYear}
              yearRange={podcastYearRange}
              yearRangeMode={podcastYearRangeMode}
              colorTheme="red"
              colorMode={colorMode}
              viewMode={podcastViewMode}
              setViewMode={setPodcastViewMode}
            />
          </div>
        );

      case 'playlists':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-rose-200 dark:bg-rose-900 rounded border-2 border-rose-300 dark:border-rose-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            <CustomPlaylistCreator processedData={processedData} formatDuration={formatDuration} colorMode={colorMode} trackDurationMap={trackDurationMap} />
          </div>
        );
      
      case 'updates':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-fuchsia-200 dark:bg-fuchsia-900 rounded border-2 border-fuchsia-300 dark:border-fuchsia-700'
              : `p-2 sm:p-4 border ${isDarkMode ? 'border-[#4169E1]' : 'border-black'}`
          }>
            {/* Desktop title */}
            <div className="hidden sm:block mb-4">
              <h3 className="text-xl">App Updates</h3>
            </div>
            <UpdatesSection colorMode={colorMode} />
          </div>
        );

      case 'data':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-black rounded border-2 border-green-600'
              : `p-2 sm:p-4 border ${isDarkMode ? 'border-[#4169E1]' : 'border-black'}`
          }>
            <DataTab
              stats={stats}
              processedData={processedData}
              rawPlayData={rawPlayData}
              onDataEdited={handleDataEdited}
              topArtists={topArtists}
              topAlbums={topAlbums}
              briefObsessions={briefObsessions}
              songsByYear={songsByYear}
              formatDuration={formatDuration}
              colorMode={colorMode}
              isDarkMode={isDarkMode}
            />
          </div>
        );

      case 'settings':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-gray-100 dark:bg-gray-800 rounded border-2 border-gray-300 dark:border-gray-600'
              : 'p-2 sm:p-4'
          }>
            <SettingsPanel
              colorMode={colorMode}
              setColorMode={setColorMode}
              rainbowMode={rainbowMode}
              setRainbowMode={applyRainbow}
              rainbowDiscovered={rainbowDiscovered}
            />
          </div>
        );

      default:
        return null;
    }
  }, [
    activeTab,
    storageNotification,
    stats,
    processedData,
    rawPlayData,
    customTrackYear,
    customYearRangeMode,
    customYearRange,
    selectedPatternYear,
    patternYearRange,
    patternYearRangeMode,
    selectedCalendarYear,
    calendarYearRange,
    calendarYearRangeMode,
    selectedBehaviorYear,
    behaviorYearRange,
    behaviorYearRangeMode,
    selectedDiscoveryYear,
    discoveryYearRange,
    discoveryYearRangeMode,
    selectedPodcastYear,
    podcastYearRange,
    podcastYearRangeMode,
    formatDuration,
    isDarkMode,
    isProcessing,
    uploadedFiles,
    uploadedFileList,
    error,
    uploadInnerTab,
    setUploadInnerTab,
    includeScrobblerData,
    setIncludeScrobblerData,
    storedScrobbleCount,
    handleLoadSampleData,
    handleFileUpload,
    handleDeleteFile,
    handleProcessFiles,
    processFiles,
    handleDataEdited,
    topArtists,
    topAlbums,
    briefObsessions,
    songsByYear,
    artistsByYear,
    albumsByYear,
    handleDataLoaded,
    // Added for restored tab content
    displayedArtists,
    filteredDisplayedArtists,
    selectedArtists,
    topArtistsCount,
    artistsViewMode,
    artistsSortBy,
    getArtistsTabLabel,
    selectedArtistYear,
    displayedAlbums,
    topAlbumsCount,
    albumsViewMode,
    albumsSortBy,
    getAlbumsTabLabel,
    selectedAlbumYear,
    // Artist search functionality
    filteredArtists,
    artistSearch,
    yearRangeMode,
    yearRange,
    setSelectedArtists,
    setArtistSearch,
    setYearRangeMode,
    setSelectedArtistYear,
    colorMode,
    customViewMode,
    podcastViewMode,
    patternsViewMode,
    calendarViewMode,
    artistSelectionMode,
    expandedArtistCards,
    expandedAlbumListRows,
    filteredStats,
    filteredStreaks,
    rainbowMode,
    rainbowDiscovered,
    applyRainbow
  ]);

  // Get/set current view mode for mobile settings bar
  const getCurrentViewMode = () => {
    switch (activeTab) {
      case 'artists': return artistsViewMode;
      case 'albums': return albumsViewMode;
      case 'custom': return customViewMode;
      case 'podcasts': return podcastViewMode;
      case 'patterns': return patternsViewMode;
      case 'calendar': return calendarViewMode;
      default: return 'grid';
    }
  };

  const setCurrentViewMode = (mode) => {
    switch (activeTab) {
      case 'artists': setArtistsViewMode(mode); break;
      case 'albums': setAlbumsViewMode(mode); break;
      case 'custom': setCustomViewMode(mode); break;
      case 'podcasts': setPodcastViewMode(mode); break;
      case 'patterns': setPatternsViewMode(mode); break;
      case 'calendar': setCalendarViewMode(mode); break;
    }
  };

  // Get page background class based on colorMode and activeTab
  const getPageBackground = () => {
    if (colorMode !== 'colorful') return '';

    const tabColors = {
      upload: isDarkMode ? 'bg-violet-900' : 'bg-violet-200',
      stats: isDarkMode ? 'bg-indigo-900' : 'bg-indigo-200',
      artists: isDarkMode ? 'bg-blue-900' : 'bg-blue-200',
      albums: isDarkMode ? 'bg-cyan-900' : 'bg-cyan-200',
      custom: isDarkMode ? 'bg-emerald-900' : 'bg-emerald-200',
      tracks: isDarkMode ? 'bg-red-900' : 'bg-red-200',
      calendar: isDarkMode ? 'bg-green-900' : 'bg-green-200',
      patterns: isDarkMode ? 'bg-yellow-900' : 'bg-yellow-200',
      behavior: isDarkMode ? 'bg-amber-900' : 'bg-amber-200',
      discovery: isDarkMode ? 'bg-orange-900' : 'bg-orange-200',
      podcasts: isDarkMode ? 'bg-red-900' : 'bg-red-200',
      playlists: isDarkMode ? 'bg-rose-900' : 'bg-rose-200',
      updates: isDarkMode ? 'bg-fuchsia-900' : 'bg-fuchsia-200',
      data: 'bg-black'
    };

    return tabColors[activeTab] || '';
  };

  return (
    <div className={`w-full h-full min-h-screen ${getPageBackground()}`} data-bg-debug={getPageBackground()}>
      {/* Always own the iOS status-bar strip: when TopTabs isn't docked at the
          top, nothing else paints under the notch and iOS keeps showing the
          last color it saw. Sits below TopTabs (z-99), which covers it with
          the same accent when docked top. */}
      {mounted && isMobile && (
        <div
          aria-hidden
          className="fixed top-0 left-0 right-0 z-[98] pointer-events-none"
          style={{
            height: 'env(safe-area-inset-top)',
            backgroundColor: getChromeTint(activeTab, colorMode === 'colorful', isDarkMode),
            transform: 'translateZ(0)',
          }}
        />
      )}
      <FixedSettingsBar
        togglePosition={togglePosition}
        toggleCollapsed={toggleCollapsed}
        isMobile={isMobile}
        isLandscapeMobile={isLandscapeMobile}
        isCollapsed={topTabsCollapsed}
        colorMode={colorMode}
        setColorMode={setColorMode}
        activeTab={activeTab}
        viewMode={getCurrentViewMode()}
        setViewMode={setCurrentViewMode}
      />
      {TopTabsComponent && (
        <TopTabsComponent
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          stats={stats}
          topArtists={topArtists}
          topAlbums={topAlbums}
          processedData={processedData}
          rawPlayData={rawPlayData}
          getArtistsTabLabel={getArtistsTabLabel}
          getAlbumsTabLabel={getAlbumsTabLabel}
          getCustomTabLabel={getCustomTabLabel}
          getPatternsTabLabel={getPatternsTabLabel}
          getBehaviorTabLabel={getBehaviorTabLabel}
          getCalendarTabLabel={getCalendarTabLabel}
          onPositionChange={setTopTabsPosition}
          onHeightChange={isMobile && (topTabsPosition === 'left' || topTabsPosition === 'right') ? null : setTopTabsHeight}
          onWidthChange={isMobile && (topTabsPosition === 'top' || topTabsPosition === 'bottom') ? null : setTopTabsWidth}
          onCollapseChange={setTopTabsCollapsed}
          isCollapsed={topTabsCollapsed}
          yearSelectorPosition={yearSelectorPosition}
          position={topTabsPosition}
          colorMode={colorMode}
          setColorMode={setColorMode}
        />
      )}
      
      <div className="flex h-full w-full justify-start">
        {/* Main content area that adjusts based on year selector state */}
        <div style={{
               ...contentAreaStyles,
               // Use GPU-accelerated transform for smooth positioning
               transform: (() => {
                 let translateX = 0;

                 // Add transform for left-positioned TopTabs (always applies)
                 if (topTabsPosition === 'left') {
                   translateX += topTabsWidth;
                 }

                 // Add transform for left-positioned YearSelector (only when sidebar is shown)
                 if (showYearSidebar && shouldShowSidebar(activeTab)) {
                   if (yearSelectorPosition === 'left') {
                     translateX += yearSelectorWidth;
                   }
                 }

                 return translateX > 0 ? `translateX(${translateX}px)` : 'none';
               })(),
               // GPU acceleration hints
               willChange: 'transform',
               transition: 'transform 0.15s ease-out',
               // Calculate width to prevent content overflow
               width: (() => {
                 let totalWidthReduction = 0;

                 // Calculate width reduction from TopTabs (always applies)
                 if (topTabsPosition === 'left' || topTabsPosition === 'right') {
                   totalWidthReduction += topTabsWidth;
                 }

                 // Calculate width reduction from YearSelector (only when sidebar is shown)
                 if (showYearSidebar && shouldShowSidebar(activeTab)) {
                   if (yearSelectorPosition === 'left' || yearSelectorPosition === 'right') {
                     totalWidthReduction += yearSelectorWidth;
                   }
                 }

                 if (totalWidthReduction === 0) return '100%';
                 return `calc(100% - ${totalWidthReduction}px)`;
               })(),
               // Keep original padding for top/bottom spacing
               paddingLeft: (() => {
                 if (yearSelectorPosition === 'left' || topTabsPosition === 'left') return '0px';
                 return contentAreaStyles.paddingLeft;
               })(),
               paddingRight: (() => {
                 if (yearSelectorPosition === 'right' || topTabsPosition === 'right') return '0px';
                 return contentAreaStyles.paddingRight;
               })(),
               // Add safe area support on mobile
               paddingBottom: isMobile ? `calc(${contentAreaStyles.paddingBottom} + env(safe-area-inset-bottom, 0px))` : contentAreaStyles.paddingBottom
             }}>
          <div className="flex flex-col h-full w-full">
            <div className="w-full h-full">
              <div className="w-full">
                <div>
                  {renderTabContent}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Year Selector - positioned outside the main content flow */}
        {showYearSidebar && shouldShowSidebar(activeTab) && (
          <YearSelector
            artistsByYear={artistsByYear}
            rawPlayData={rawPlayData}
            activeTab={activeTab}
            onYearChange={handleSidebarYearChange}
            onYearRangeChange={handleSidebarYearRangeChange}
            onExpandChange={handleYearSelectorExpandChange}
            onPositionChange={setYearSelectorPosition}
            onWidthChange={setYearSelectorWidth}
            onHeightChange={setYearSelectorHeight}
            onTransitionChange={setYearSelectorTransitioning}
            topTabsPosition={topTabsPosition}
            topTabsHeight={topTabsHeight}
            topTabsWidth={topTabsWidth}
            initialYear={
              activeTab === 'stats' ? selectedStreaksYear :
              activeTab === 'artists' ? selectedArtistYear :
              activeTab === 'albums' ? selectedAlbumYear :
              activeTab === 'custom' ? customTrackYear :
              activeTab === 'patterns' ? selectedPatternYear :
              activeTab === 'calendar' ? selectedCalendarYear :
              activeTab === 'behavior' ? selectedBehaviorYear :
              activeTab === 'discovery' ? selectedDiscoveryYear :
              activeTab === 'podcasts' ? selectedPodcastYear : 'all'
            }
            initialYearRange={
              activeTab === 'stats' ? { startYear: '', endYear: '' } :
              activeTab === 'artists' ? yearRange :
              activeTab === 'albums' ? albumYearRange :
              activeTab === 'custom' ? customYearRange :
              activeTab === 'patterns' ? patternYearRange :
              activeTab === 'calendar' ? calendarYearRange :
              activeTab === 'behavior' ? behaviorYearRange :
              activeTab === 'discovery' ? discoveryYearRange :
              activeTab === 'podcasts' ? podcastYearRange :
              { startYear: '', endYear: '' }
            }
            isRangeMode={
              activeTab === 'artists' ? yearRangeMode :
              activeTab === 'albums' ? albumYearRangeMode :
              activeTab === 'custom' ? customYearRangeMode :
              activeTab === 'patterns' ? patternYearRangeMode :
              activeTab === 'calendar' ? calendarYearRangeMode :
              activeTab === 'behavior' ? behaviorYearRangeMode :
              activeTab === 'discovery' ? discoveryYearRangeMode :
              activeTab === 'podcasts' ? podcastYearRangeMode : false
            }
            onToggleRangeMode={handleSidebarRangeModeToggle}
            colorTheme={sidebarColorTheme}
            textTheme={sidebarTextTheme}
            colorMode={colorMode}
            asSidebar={true}
            position="right"
            startMinimized={false}
          />
        )}
      </div>
    </div>
  );
};

export default SpotifyAnalyzer;

