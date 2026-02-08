"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { streamingProcessor, STREAMING_TYPES, STREAMING_SERVICES, filterDataByDate, normalizeArtistName, createMatchKey } from './streaming-adapter.js';
import CustomTrackRankings from './CustomTrackRankings.js';
import TrackRankings from './TrackRankings.js';
import CalendarView from './CalendarView.js';
import PodcastRankings from './podcast-rankings.js';
import _ from 'lodash';
import ListeningPatterns from './listening-patterns.js';
import ListeningBehavior from './listening-behavior.js';
import DiscoveryAnalysis from './discovery-analysis.js';
import { X, Trash2, Download } from 'lucide-react';
import YearSelector from './year-selector.js';
import SupportOptions from './support-options.js';
import AlbumCard from './albumcard.js';
import CustomPlaylistCreator from './customplaylist.js';
import UpdatesSection from './updatessection.js';
import ExcelPreview from './excelpreview.js';
// Removed imports of exported variables that were conflicting with local state
import { useTheme } from './themeprovider.js';
// import UnifiedAuth from './unified-auth.js'; // Temporarily disabled due to React error
import GoogleDriveSync from './GoogleDriveSync.js';
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
  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Helper function to get themed colors
  const getTabColors = (textTheme, backgroundTheme) => {
    const textColors = {
      blue: {
        text: isDarkMode ? 'text-blue-300' : 'text-blue-700',
        textLight: isDarkMode ? 'text-blue-400' : 'text-blue-600',
        textDark: isDarkMode ? 'text-blue-200' : 'text-blue-800'
      },
      cyan: {
        text: isDarkMode ? 'text-cyan-300' : 'text-cyan-700',
        textLight: isDarkMode ? 'text-cyan-400' : 'text-cyan-600',
        textDark: isDarkMode ? 'text-cyan-200' : 'text-cyan-800'
      },
      green: {
        text: isDarkMode ? 'text-green-300' : 'text-green-700',
        textLight: isDarkMode ? 'text-green-400' : 'text-green-600',
        textDark: isDarkMode ? 'text-green-200' : 'text-green-800'
      },
      amber: {
        text: isDarkMode ? 'text-amber-300' : 'text-amber-700',
        textLight: isDarkMode ? 'text-amber-400' : 'text-amber-600',
        textDark: isDarkMode ? 'text-amber-200' : 'text-amber-800'
      },
      yellow: {
        text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700',
        textLight: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
        textDark: isDarkMode ? 'text-yellow-200' : 'text-yellow-800'
      },
      orange: {
        text: isDarkMode ? 'text-orange-300' : 'text-orange-700',
        textLight: isDarkMode ? 'text-orange-400' : 'text-orange-600',
        textDark: isDarkMode ? 'text-orange-200' : 'text-orange-800'
      },
      red: {
        text: isDarkMode ? 'text-red-400' : 'text-red-800',
        textLight: isDarkMode ? 'text-red-500' : 'text-red-700',
        textDark: isDarkMode ? 'text-red-300' : 'text-red-900'
      },
      indigo: {
        text: isDarkMode ? 'text-indigo-300' : 'text-indigo-700',
        textLight: isDarkMode ? 'text-indigo-400' : 'text-indigo-600',
        textDark: isDarkMode ? 'text-indigo-200' : 'text-indigo-800'
      },
      emerald: {
        text: isDarkMode ? 'text-emerald-300' : 'text-emerald-700',
        textLight: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
        textDark: isDarkMode ? 'text-emerald-200' : 'text-emerald-800'
      },
      violet: {
        text: isDarkMode ? 'text-violet-300' : 'text-violet-700',
        textLight: isDarkMode ? 'text-violet-400' : 'text-violet-600',
        textDark: isDarkMode ? 'text-violet-200' : 'text-violet-800'
      },
      rose: {
        text: isDarkMode ? 'text-rose-300' : 'text-rose-700',
        textLight: isDarkMode ? 'text-rose-400' : 'text-rose-600',
        textDark: isDarkMode ? 'text-rose-200' : 'text-rose-800'
      }
    };

    const backgroundColors = {
      blue: {
        bg: isDarkMode ? 'bg-black' : 'bg-blue-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-blue-700' : 'border-blue-200',
        borderHover: isDarkMode ? 'border-blue-500' : 'border-blue-400',
        wrapper: isDarkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-100 border-[var(--border)]'
      },
      cyan: {
        bg: isDarkMode ? 'bg-black' : 'bg-cyan-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-cyan-700' : 'border-cyan-200',
        borderHover: isDarkMode ? 'border-cyan-500' : 'border-cyan-400',
        wrapper: isDarkMode ? 'bg-cyan-900 border-cyan-800' : 'bg-cyan-100 border-[var(--border)]'
      },
      green: {
        bg: isDarkMode ? 'bg-black' : 'bg-green-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-green-700' : 'border-green-200',
        borderHover: isDarkMode ? 'border-green-500' : 'border-green-400',
        wrapper: isDarkMode ? 'bg-green-900 border-green-800' : 'bg-green-100 border-green-300'
      },
      amber: {
        bg: isDarkMode ? 'bg-black' : 'bg-amber-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-amber-700' : 'border-amber-200',
        borderHover: isDarkMode ? 'border-amber-500' : 'border-amber-400',
        wrapper: isDarkMode ? 'bg-amber-900 border-amber-800' : 'bg-amber-100 border-amber-300'
      },
      yellow: {
        bg: isDarkMode ? 'bg-black' : 'bg-yellow-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-yellow-700' : 'border-yellow-200',
        borderHover: isDarkMode ? 'border-yellow-500' : 'border-yellow-400',
        wrapper: isDarkMode ? 'bg-yellow-900 border-yellow-800' : 'bg-yellow-100 border-[var(--border)]'
      },
      orange: {
        bg: isDarkMode ? 'bg-black' : 'bg-orange-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-orange-700' : 'border-orange-200',
        borderHover: isDarkMode ? 'border-orange-500' : 'border-orange-400',
        wrapper: isDarkMode ? 'bg-orange-900 border-orange-800' : 'bg-orange-100 border-orange-300'
      },
      red: {
        bg: isDarkMode ? 'bg-black' : 'bg-red-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-red-700' : 'border-red-200',
        borderHover: isDarkMode ? 'border-red-500' : 'border-red-400',
        wrapper: isDarkMode ? 'bg-red-900 border-red-800' : 'bg-red-100 border-[var(--border)]'
      },
      indigo: {
        bg: isDarkMode ? 'bg-black' : 'bg-indigo-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-indigo-700' : 'border-indigo-200',
        borderHover: isDarkMode ? 'border-indigo-500' : 'border-indigo-400',
        wrapper: isDarkMode ? 'bg-indigo-900 border-indigo-800' : 'bg-indigo-100 border-indigo-300'
      },
      emerald: {
        bg: isDarkMode ? 'bg-black' : 'bg-emerald-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-emerald-700' : 'border-emerald-200',
        borderHover: isDarkMode ? 'border-emerald-500' : 'border-emerald-400',
        wrapper: isDarkMode ? 'bg-emerald-900 border-emerald-800' : 'bg-emerald-100 border-[var(--border)]'
      },
      violet: {
        bg: isDarkMode ? 'bg-black' : 'bg-violet-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-violet-700' : 'border-violet-200',
        borderHover: isDarkMode ? 'border-violet-500' : 'border-violet-400',
        wrapper: isDarkMode ? 'bg-violet-900 border-violet-800' : 'bg-violet-100 border-violet-300'
      },
      rose: {
        bg: isDarkMode ? 'bg-black' : 'bg-rose-50',
        bgCard: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-rose-700' : 'border-rose-200',
        borderHover: isDarkMode ? 'border-rose-500' : 'border-rose-400',
        wrapper: isDarkMode ? 'bg-rose-900 border-rose-800' : 'bg-rose-100 border-rose-300'
      }
    };

    const textColorObj = textColors[textTheme] || textColors.blue;
    const backgroundColorObj = backgroundColors[backgroundTheme] || backgroundColors.blue;

    return {
      ...textColorObj,
      ...backgroundColorObj
    };
  };

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
  const [topArtistsCount, setTopArtistsCount] = useState(10);
  const [artistsViewMode, setArtistsViewMode] = useState('grid'); // 'grid', 'list'
  const [artistSelectionMode, setArtistSelectionMode] = useState(false);
  const [artistsSortBy, setArtistsSortBy] = useState('totalPlayed'); // 'totalPlayed', 'playCount'
  const [colorMode, setColorMode] = useState('minimal'); // 'minimal' or 'colorful'
  const [topAlbumsCount, setTopAlbumsCount] = useState(20);
  const [albumsViewMode, setAlbumsViewMode] = useState('grid'); // 'grid', 'list'
  const [albumsSortBy, setAlbumsSortBy] = useState('totalPlayed'); // 'totalPlayed', 'playCount'
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [briefObsessions, setBriefObsessions] = useState([]);
  const [songPlayHistory, setSongPlayHistory] = useState({});
  const [artistsByYear, setArtistsByYear] = useState({});
  const [yearRangeMode, setYearRangeMode] = useState(false);
  const [yearRange, setYearRange] = useState({ startYear: '', endYear: '' });
  const [rawPlayData, setRawPlayData] = useState([]);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [artistSearch, setArtistSearch] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
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
  const [showYearSidebar, setShowYearSidebar] = useState(true);
  const [yearSelectorExpanded, setYearSelectorExpanded] = useState(false);
  const [yearSelectorPosition, setYearSelectorPosition] = useState('right');
  const [yearSelectorWidth, setYearSelectorWidth] = useState(32);
  const [yearSelectorHeight, setYearSelectorHeight] = useState(48);
  const [yearSelectorTransitioning, setYearSelectorTransitioning] = useState(false);
  
  // Fixed dimensions for YearSelector (no caching needed)
  const getYearSelectorDimensions = (expanded, isRangeMode) => {
    if (!expanded) {
      return { width: 32, height: 48 };
    }
    return isRangeMode 
      ? { width: 240, height: 220 }
      : { width: 120, height: 180 };
  };


  const [sidebarColorTheme, setSidebarColorTheme] = useState('teal');
  const [sidebarTextTheme, setSidebarTextTheme] = useState(null);

  // TopTabs position state - initialize based on screen size
  const [topTabsPosition, setTopTabsPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640 ? 'bottom' : 'top';
    }
    return 'top'; // SSR fallback
  });
  const [topTabsHeight, setTopTabsHeight] = useState(56);
  const [topTabsWidth, setTopTabsWidth] = useState(192);
  const [topTabsCollapsed, setTopTabsCollapsed] = useState(false);
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Update dimensions when YearSelector expands/collapses (simplified - no loops)
  useEffect(() => {
    // Use simple static dimensions - no need for complex caching
    const dimensions = yearSelectorExpanded 
      ? { width: 240, height: 220 }  // Conservative max size (range mode)
      : { width: 32, height: 48 };   // Collapsed size
    
    setYearSelectorWidth(dimensions.width);
    setYearSelectorHeight(dimensions.height);
  }, [yearSelectorExpanded]);
  
  useEffect(() => {
    const checkMobile = () => {
      const isMobileNow = window.innerWidth < 640;
      setIsMobile(isMobileNow);
      
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
    
    const searchLower = artistSearch.toLowerCase();
    return allArtists
      .filter(artist => 
        artist.toLowerCase().includes(searchLower) &&
        !selectedArtists.includes(artist)
      )
      .slice(0, 10); // Limit to 10 results for performance
  }, [topArtists, artistSearch, selectedArtists]);

  // Use memo for sorted years to prevent recalculating
  const sortedYears = useMemo(() => {
    return Object.keys(artistsByYear).sort((a, b) => a - b);
  }, [artistsByYear]);

  // Toggle year range mode with useCallback to prevent recreation
  const toggleYearRangeMode = useCallback((value) => {
    // If value is provided, use it directly; otherwise toggle the current state
    const newMode = typeof value === 'boolean' ? value : !yearRangeMode;
    
    // Update the state
    setYearRangeMode(newMode);
    
    // Reset selected year when switching to range mode
    if (newMode) {
      setSelectedArtistYear('all');
      
      // If we're switching to range mode, set a default range
      if (Object.keys(artistsByYear).length > 0) {
        const years = Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
        if (years.length > 0) {
          setYearRange({
            startYear: years[0],
            endYear: years[years.length - 1]
          });
        }
      }
    }
  }, [yearRangeMode, artistsByYear]);

  // Handle album year range changes with useCallback
  const handleAlbumYearRangeChange = useCallback(({ startYear, endYear }) => {
    // Validate the years
    if (!startYear || !endYear) {
      return;
    }
    
    // Ensure we're in year range mode
    setAlbumYearRangeMode(true);
    
    // Update the year range state
    setAlbumYearRange({ startYear, endYear });
  }, []);

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
    // If value is provided, use it directly; otherwise toggle the current state
    const newMode = typeof value === 'boolean' ? value : !albumYearRangeMode;
    
    // Only update if the mode is actually changing
    if (newMode === albumYearRangeMode) {
      return; // No change needed
    }
    
    console.log("toggleAlbumYearRangeMode: changing from", albumYearRangeMode, "to", newMode);
    
    // Update the state
    setAlbumYearRangeMode(newMode);
    
    // Reset selected year when switching to range mode
    if (newMode) {
      console.log("toggleAlbumYearRangeMode: resetting selectedAlbumYear to 'all' (range mode)");
      setSelectedAlbumYear('all');
      
      // Set a default range
      if (Object.keys(artistsByYear).length > 0) {
        const years = Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
        if (years.length > 0) {
          setAlbumYearRange({
            startYear: years[0],
            endYear: years[years.length - 1]
          });
        }
      }
    } else {
      // When switching back to single mode, reset to "all"
      console.log("toggleAlbumYearRangeMode: resetting selectedAlbumYear to 'all' (single mode)");
      setSelectedAlbumYear('all');
    }
  }, [albumYearRangeMode, artistsByYear]);

  // Memoized tab labels to avoid recalculation
  const getAlbumsTabLabel = useCallback(() => {
    if (selectedAlbumYear === 'all') {
      return 'All-time Albums';
    } else if (albumYearRangeMode && albumYearRange.startYear && albumYearRange.endYear) {
      return `Albums - ${albumYearRange.startYear}-${albumYearRange.endYear}`;
    }
    return `Albums - ${selectedAlbumYear}`;
  }, [selectedAlbumYear, albumYearRangeMode, albumYearRange]);

  // useEffect to set album date ranges when year changes (like CustomTrackRankings)
  useEffect(() => {
    if (selectedAlbumYear === 'all') {
      // Clear date filters for all-time
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
    
    // If all-time, use the existing topAlbums but apply artist filtering if needed
    if (selectedAlbumYear === 'all') {
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
    
    // Use date range filtering approach with streaming adapter logic
    const isAllTime = (!albumStartDate || albumStartDate === "") && (!albumEndDate || albumEndDate === "");
    const start = isAllTime ? new Date(0) : new Date(albumStartDate);
    start.setHours(0, 0, 0, 0);
    const end = isAllTime ? new Date() : new Date(albumEndDate);
    end.setHours(23, 59, 59, 999);
    
    // Filter raw data by date range and 30-second minimum
    const dateFilteredEntries = isAllTime 
      ? rawPlayData.filter(entry => entry.ms_played >= 30000)
      : rawPlayData.filter(entry => {
          try {
            if (entry.ms_played < 30000) return false;
            const timestamp = new Date(entry.ts);
            return timestamp >= start && timestamp <= end;
          } catch (err) {
            return false;
          }
        });
    
    // Initialize albums object (like streaming adapter)
    const albums = {};
    
    // Process entries using streaming adapter logic
    dateFilteredEntries.forEach(entry => {
      const playTime = entry.ms_played;
      if (!entry.master_metadata_track_name || playTime < 30000) return;
      
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
  }, [selectedAlbumYear, albumStartDate, albumEndDate, topAlbums, rawPlayData, selectedArtists, albumsSortBy]);



  // useEffect to set artist date ranges when year changes (like CustomTrackRankings)
  useEffect(() => {
    if (selectedArtistYear === 'all') {
      // Clear date filters for all-time
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
    
    // If all-time, use the existing topArtists but sort according to artistsSortBy
    if (selectedArtistYear === 'all') {
      return [...topArtists].sort((a, b) => {
        if (artistsSortBy === 'playCount') {
          return b.playCount - a.playCount;
        } else {
          return b.totalPlayed - a.totalPlayed;
        }
      });
    }
    
    // Use date range filtering approach
    const isAllTime = (!artistStartDate || artistStartDate === "") && (!artistEndDate || artistEndDate === "");
    const start = isAllTime ? new Date(0) : new Date(artistStartDate);
    start.setHours(0, 0, 0, 0);
    const end = isAllTime ? new Date() : new Date(artistEndDate);
    end.setHours(23, 59, 59, 999);
    
    // Filter raw data by date range and 30-second minimum (like CustomTrackRankings)
    const dateFilteredEntries = isAllTime 
      ? rawPlayData.filter(entry => entry.ms_played >= 30000) // Apply 30-second filter
      : rawPlayData.filter(entry => {
          try {
            // Skip plays shorter than 30 seconds (like CustomTrackRankings)
            if (entry.ms_played < 30000) return false;
            
            const timestamp = new Date(entry.ts);
            return timestamp >= start && timestamp <= end;
          } catch (err) {
            return false;
          }
        });
    
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
    });
    
    // Process each artist to find most played song
    artistMap.forEach(artist => {
      if (artist.tracks.size > 0) {
        const mostPlayedTrack = Array.from(artist.tracks.values())
          .sort((a, b) => b.playCount - a.playCount)[0];
        artist.mostPlayedSong = mostPlayedTrack;
      }
      // Remove the tracks map as it's no longer needed
      delete artist.tracks;
    });
    
    return Array.from(artistMap.values()).sort((a, b) => {
      if (artistsSortBy === 'playCount') {
        return b.playCount - a.playCount;
      } else {
        return b.totalPlayed - a.totalPlayed;
      }
    });
  }, [selectedArtistYear, artistStartDate, artistEndDate, topArtists, rawPlayData, artistsSortBy]);

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
      const searchLower = artistSearch.toLowerCase();
      return displayedArtists.filter(artist => 
        artist.name.toLowerCase().includes(searchLower)
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
      const results = await streamingProcessor.processFiles(fileList);
      
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
    }
  }, []);

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
    
    // Save uploaded files to persistent storage if authenticated
    if (isAuthenticated && storageReady) {
      try {
        // Convert files to serializable format for storage
        const fileMetadata = combinedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          uploadedAt: Date.now()
        }));
        
        // Save file metadata
        const storage = {
          saveUploadedFiles: (data) => {
            localStorage.setItem(`streaming_data_${deviceId}_uploaded_files`, JSON.stringify({
              data,
              timestamp: Date.now(),
              version: '1.0'
            }));
          }
        };
        storage.saveUploadedFiles(fileMetadata);
        
        // Note: We don't store file contents due to size limitations (files can be 12MB+ each)
        // Only processed data is stored, which is much smaller and more valuable
        console.log(`File upload detected: ${combinedFiles.length} files. Processed data will be saved after analysis.`);
        
      } catch (saveError) {
        console.error('Failed to save files to persistent storage:', saveError);
      }
    }
  }, [uploadedFileList]);

  // Handle file deletion with useCallback
  const handleDeleteFile = useCallback((indexToDelete) => {
    // Batch state updates for better performance
    if (uploadedFileList) {
      const remainingFiles = uploadedFileList.filter((_, index) => index !== indexToDelete);
      
      // Update both states at once
      setUploadedFileList(remainingFiles.length === 0 ? null : remainingFiles);
      setUploadedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToDelete));
      
      // Update persistent storage if authenticated
      if (isAuthenticated && storageReady && deviceId) {
        try {
          if (remainingFiles.length === 0) {
            // Clear file metadata from storage
            localStorage.removeItem(`streaming_data_${deviceId}_uploaded_files`);
            console.log('Cleared all file metadata from storage');
          } else {
            // Update stored file metadata only (not content)
            const fileMetadata = remainingFiles.map(file => ({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              uploadedAt: Date.now()
            }));
            
            localStorage.setItem(`streaming_data_${deviceId}_uploaded_files`, JSON.stringify({
              data: fileMetadata,
              timestamp: Date.now(),
              version: '1.0'
            }));
            console.log(`Updated file metadata for ${remainingFiles.length} files`);
          }
        } catch (saveError) {
          console.error('Failed to update files in persistent storage:', saveError);
        }
      }
    } else {
      setUploadedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToDelete));
    }
  }, [uploadedFileList]);

  // Process uploaded files with useCallback
  const handleProcessFiles = useCallback(() => {
    if (!uploadedFileList || uploadedFileList.length === 0) {
      setError("Please upload files first");
      return;
    }
    
    setIsProcessing(true);
    
    // Use setTimeout to allow the UI to update before processing starts
    setTimeout(() => {
      processFiles(uploadedFileList)
        .then(() => {
          setActiveTab('stats');
        })
        .catch(err => {
          console.error("Error processing files:", err);
          setError(err.message);
        })
        .finally(() => {
          setIsProcessing(false);
        });
    }, 100);
  }, [uploadedFileList, processFiles]);



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
      if (loadedData.topArtists) setTopArtists(loadedData.topArtists);
      
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
      if (loadedData.rawPlayData) setRawPlayData(loadedData.rawPlayData);
      
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
  }, []);


  // Reset data loaded flag when authentication state changes


  // Handle year range change with useCallback
  const handleYearRangeChange = useCallback(({ startYear, endYear }) => {
    // Validate the years
    if (!startYear || !endYear) {
      console.warn("Invalid year range:", { startYear, endYear });
      return;
    }
    
    // Ensure we're in year range mode
    setYearRangeMode(true);
    
    // Update the year range state
    setYearRange({ startYear, endYear });
  }, []);

  // Tab label functions with useCallback to prevent recreation

  const getArtistsTabLabel = useCallback(() => {
    if (selectedArtistYear === 'all') {
      return 'All-time Artists';
    } else if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `Artists - ${yearRange.startYear}-${yearRange.endYear}`;
    }
    return `Artists - ${selectedArtistYear}`;
  }, [selectedArtistYear, yearRangeMode, yearRange]);

  const getCustomTabLabel = useCallback(() => {
    if (customYearRangeMode && customYearRange.startYear && customYearRange.endYear) {
      return `Songs - ${customYearRange.startYear}-${customYearRange.endYear}`;
    } else if (customTrackYear === 'all') {
      return 'All-time Songs';
    }
    return `Songs - ${customTrackYear}`;
  }, [customYearRangeMode, customYearRange, customTrackYear]);

  const getPatternsTabLabel = useCallback(() => {
    if (patternYearRangeMode && patternYearRange.startYear && patternYearRange.endYear) {
      return `Patterns - ${patternYearRange.startYear}-${patternYearRange.endYear}`;
    } else if (selectedPatternYear === 'all') {
      return 'All-time Patterns';
    }
    return `Patterns - ${selectedPatternYear}`;
  }, [patternYearRangeMode, patternYearRange, selectedPatternYear]);

  const getBehaviorTabLabel = useCallback(() => {
    if (behaviorYearRangeMode && behaviorYearRange.startYear && behaviorYearRange.endYear) {
      return `Behavior - ${behaviorYearRange.startYear}-${behaviorYearRange.endYear}`;
    } else if (selectedBehaviorYear === 'all') {
      return 'All-time Behavior';
    }
    return `Behavior - ${selectedBehaviorYear}`;
  }, [behaviorYearRangeMode, behaviorYearRange, selectedBehaviorYear]);

  const getCalendarTabLabel = useCallback(() => {
    if (calendarYearRangeMode && calendarYearRange.startYear && calendarYearRange.endYear) {
      return `Calendar - ${calendarYearRange.startYear}-${calendarYearRange.endYear}`;
    } else if (selectedCalendarYear === 'all') {
      return 'All-time Calendar';
    }
    return `Calendar - ${selectedCalendarYear}`;
  }, [calendarYearRangeMode, calendarYearRange, selectedCalendarYear]);

  const getDiscoveryTabLabel = useCallback(() => {
    if (discoveryYearRangeMode && discoveryYearRange.startYear && discoveryYearRange.endYear) {
      return `Discovery - ${discoveryYearRange.startYear}-${discoveryYearRange.endYear}`;
    } else if (selectedDiscoveryYear === 'all') {
      return 'All-time Discovery';
    }
    return `Discovery - ${selectedDiscoveryYear}`;
  }, [discoveryYearRangeMode, discoveryYearRange, selectedDiscoveryYear]);

  const getPodcastsTabLabel = useCallback(() => {
    if (podcastYearRangeMode && podcastYearRange.startYear && podcastYearRange.endYear) {
      return `Podcasts - ${podcastYearRange.startYear}-${podcastYearRange.endYear}`;
    } else if (selectedPodcastYear === 'all') {
      return 'All-time Podcasts';
    }
    return `Podcasts - ${selectedPodcastYear}`;
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
    const sidebarTabs = ['artists', 'albums', 'patterns', 'calendar', 'behavior', 'custom', 'discovery', 'podcasts'];
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
      default:
        setSidebarTextTheme('blue');
    }
  }, [activeTab, shouldShowSidebar]);

  // Convert selectedArtistYear to date range (like CustomTrackRankings)
  useEffect(() => {
    if (selectedArtistYear !== 'all') {
      if (selectedArtistYear.includes('-')) {
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
    } else {
      // All time
      setArtistStartDate('');
      setArtistEndDate('');
    }
  }, [selectedArtistYear]);

  // Convert selectedAlbumYear to date range (like CustomTrackRankings)
  useEffect(() => {
    if (selectedAlbumYear !== 'all') {
      if (selectedAlbumYear.includes('-')) {
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
    } else {
      // All time
      setAlbumStartDate('');
      setAlbumEndDate('');
    }
  }, [selectedAlbumYear]);

  // Handle year selection from sidebar based on active tab
  const handleSidebarYearChange = useCallback((year) => {
    // Always use 'all' string (not object reference) for consistency
    const yearValue = year === 'all' ? 'all' : year;
    
    console.log("handleSidebarYearChange called with:", { year, activeTab });
    
    switch(activeTab) {
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
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') {
      return {
        paddingTop: '56px',
        paddingBottom: '0px', 
        paddingLeft: '0px',
        paddingRight: '192px', // Default for right-positioned YearSelector
      };
    }
    
    
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
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
      // Simple fixed dimensions for instant calculation
      const effectiveWidth = yearSelectorExpanded ? (customYearRangeMode ? 240 : 120) : 32;
      
      if (yearSelectorPosition === 'left') {
        leftSpace += effectiveWidth;
      } else if (yearSelectorPosition === 'right') {
        rightSpace += effectiveWidth;
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
      paddingTop: `${topSpace}px`,
      paddingBottom: `${bottomSpace}px`,
      paddingLeft: `${leftSpace}px`,
      paddingRight: `${rightSpace}px`,
    };
  }, [topTabsPosition, topTabsWidth, topTabsHeight, yearSelectorPosition, yearSelectorExpanded, showYearSidebar, customYearRangeMode, isMobile, yearSelectorHeight]);

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
        // Upload tab colors based on colorMode
        const uploadBg = colorMode === 'colorful'
          ? 'bg-violet-200 dark:bg-violet-900'
          : '';
        const uploadBorder = colorMode === 'colorful'
          ? 'border-violet-300 dark:border-violet-700'
          : (isDarkMode ? 'border-white' : 'border-black');
        const uploadText = colorMode === 'colorful'
          ? 'text-violet-700 dark:text-violet-300'
          : '';
        const uploadTextLight = colorMode === 'colorful'
          ? 'text-violet-600 dark:text-violet-400'
          : 'text-gray-600 dark:text-gray-400';
        const uploadCardBg = colorMode === 'colorful'
          ? 'bg-violet-100 dark:bg-violet-800'
          : (isDarkMode ? 'bg-black' : 'bg-white');

        return (
          <div className={`p-2 sm:p-4 rounded border-2 ${uploadBg} ${uploadBorder}`}>
            {/* Title - mobile gets its own row */}
            <div className="block sm:hidden mb-1">
              <h3 className={`text-xl ${uploadText}`}>Upload Files</h3>
            </div>
            {/* Desktop title */}
            <div className="hidden sm:block mb-4">
              <h3 className={`text-xl ${uploadText}`}>Upload Files</h3>
            </div>
            <div>
            {/* Storage Notification */}
            {storageNotification && (
              <div className={`mb-6 p-4 rounded-lg border ${
                storageNotification.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : storageNotification.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : storageNotification.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">
                      {storageNotification.type === 'success' && '✅ '}
                      {storageNotification.type === 'warning' && '⚠️ '}
                      {storageNotification.type === 'error' && '❌ '}
                      {storageNotification.type === 'info' && 'ℹ️ '}
                      {storageNotification.title}
                    </h4>
                    <p className="text-sm mb-2">{storageNotification.message}</p>
                    {storageNotification.action && (
                      <p className="text-xs opacity-75">{storageNotification.action}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setStorageNotification(null)}
                    className="ml-3 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* How to Use + Google Drive - side by side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* How to Use section */}
              <div className={`p-4 sm:p-6 border rounded-lg ${uploadCardBg} ${uploadBorder}`}>
                <h3 className={`font-semibold mb-4 text-sm ${uploadText}`}>How to use:</h3>
                <div className={`text-xs sm:text-sm ${uploadTextLight}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`flex-shrink-0 w-6 h-6 ${colorMode === 'colorful' ? 'bg-violet-600 text-white' : (isDarkMode ? 'bg-black text-white border border-white' : 'bg-white text-black border border-black')} rounded-full flex items-center justify-center text-sm font-bold`}>1</span>
                    <span>Download your streaming history from your service</span>
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`flex-shrink-0 w-6 h-6 ${colorMode === 'colorful' ? 'bg-violet-600 text-white' : (isDarkMode ? 'bg-black text-white border border-white' : 'bg-white text-black border border-black')} rounded-full flex items-center justify-center text-sm font-bold`}>2</span>
                    <span>Upload your file(s) or connect Google Drive for large files</span>
                  </div>
                  <div className="flex items-start gap-3 mb-4">
                    <span className={`flex-shrink-0 w-6 h-6 ${colorMode === 'colorful' ? 'bg-violet-600 text-white' : (isDarkMode ? 'bg-black text-white border border-white' : 'bg-white text-black border border-black')} rounded-full flex items-center justify-center text-sm font-bold`}>3</span>
                    <span>Click "Calculate Statistics" and explore your data</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <div className="flex-1">
                    <button
                      onClick={handleLoadSampleData}
                      disabled={isProcessing}
                      className="flex items-center gap-1 px-3 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors font-medium shadow-sm text-sm"
                    >
                      <Download size={16} />
                      Try Demo
                    </button>
                    <p className={`text-sm mt-2 ${uploadTextLight}`}>
                      Want to test the app? Click to load sample streaming history.
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className={
                      colorMode === 'colorful'
                        ? 'p-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded text-white'
                        : `p-2 rounded border ${isDarkMode ? 'bg-black text-white border-white' : 'bg-white text-black border-black'}`
                    }>
                      <p className="font-bold text-xs">📱 Download as Web App!</p>
                      <p className="text-xs mt-0.5">Install to your device for offline access.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Drive Storage */}
              <div>
                <GoogleDriveSync
                  stats={stats}
                  processedData={processedData}
                  topArtists={topArtists}
                  topAlbums={topAlbums}
                  briefObsessions={briefObsessions}
                  songsByYear={songsByYear}
                  rawPlayData={rawPlayData}
                  artistsByYear={artistsByYear}
                  albumsByYear={albumsByYear}
                  uploadedFiles={uploadedFiles}
                  uploadedFileList={uploadedFileList}
                  onDataLoaded={handleDataLoaded}
                  isDarkMode={isDarkMode}
                  colorMode={colorMode}
                />
              </div>
            </div>
              
            <div className={`p-4 rounded-lg border ${uploadCardBg} ${uploadBorder}`}>
              <p className={`mb-3 font-semibold text-sm ${uploadText}`}>
                Upload your streaming history files:
              </p>
              <p className={`mb-3 text-xs sm:text-sm ${uploadTextLight}`}>
                Supported: Spotify (.json), Apple Music (.csv), YouTube Music (.json), Deezer (.xlsx), Tidal (.csv), SoundCloud (.csv), Cake (.xlsx/.json)
              </p>
              <input
                type="file"
                multiple
                accept=".json,.csv,.xlsx"
                onChange={handleFileUpload}
                className={`block w-full text-sm transition-colors
                  file:mr-4 file:py-2 file:px-4 file:rounded-lg
                  file:border-2 file:border-yellow-400 file:text-sm
                  file:font-semibold file:bg-yellow-300
                  file:text-yellow-800 hover:file:bg-yellow-400 file:cursor-pointer
                  ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}
              />
            </div>
                
            {isProcessing && (
              <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="flex flex-col items-center">
                  <img 
                    src="/loading.png" 
                    alt="Cake is cakeculating..." 
                    className="w-48 h-48 object-contain animate-rock bg-transparent loading-cake-image"
                  />
                  <p 
                    className="text-xl text-blue-600 mt-2 animate-rainbow cakeculating-text" 
                    style={{ 
                      fontFamily: 'var(--font-comic-neue)',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    Cakeculating...
                  </p>
                </div>
              </div>
            )}
                
            {uploadedFiles.length > 0 && (
              <div className={`mt-6 p-4 rounded-lg border ${
                colorMode === 'colorful'
                  ? 'bg-violet-50 dark:bg-violet-800 border-violet-300 dark:border-violet-600'
                  : (isDarkMode ? 'bg-black border-white' : 'bg-gray-50 border-black')
              }`}>
                <h4 className={`font-semibold mb-3 text-lg ${uploadText}`}>Uploaded Files:</h4>
                <ul className="space-y-2">
                  {uploadedFiles.map((fileName, index) => (
                    <li key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                      colorMode === 'colorful'
                        ? 'bg-violet-100 dark:bg-violet-700'
                        : (isDarkMode ? 'bg-gray-900' : 'bg-white')
                    }`}>
                      <span className={`text-sm font-medium truncate mr-3 ${uploadTextLight}`}>
                        {fileName}
                      </span>
                      <button
                        onClick={() => handleDeleteFile(index)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shrink-0"
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>

                {uploadedFileList && uploadedFileList.length === 1 &&
                 uploadedFileList[0].name.endsWith('.xlsx') && (
                  <ExcelPreview file={uploadedFileList[0]} />
                )}

                <button
                  onClick={handleProcessFiles}
                  disabled={isProcessing}
                  className="mt-4 w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-lg font-semibold text-lg
                    hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  {isProcessing ? "Processing..." : "🚀 Calculate Statistics"}
                </button>
              </div>
            )}
                
            {error && (
              <div className={`mt-6 p-4 rounded-lg border ${
                isDarkMode
                  ? 'bg-red-900/20 border-red-600/30 text-red-300'
                  : 'bg-red-100 border-red-300 text-red-700'
              }`}>
                <h4 className="font-semibold mb-2">Error:</h4>
                <p className="text-sm">{error}</p>
              </div>
            )}
            </div>
          </div>
        );
      
      case 'stats':
        return stats ? (
          <div className={
            colorMode === 'colorful'
              ? 'p-4 bg-indigo-200 dark:bg-indigo-900 rounded border-2 border-indigo-300 dark:border-indigo-700'
              : `p-4 border ${isDarkMode ? 'border-white' : 'border-black'}`
          }>
            {/* Title - mobile gets its own row */}
            <div className="block sm:hidden mb-1">
              <h3 className={
                colorMode === 'colorful'
                  ? 'text-xl text-indigo-700 dark:text-indigo-300'
                  : 'text-xl'
              }>Processing Statistics</h3>
            </div>
            {/* Desktop title */}
            <div className="hidden sm:block mb-4">
              <h3 className={
                colorMode === 'colorful'
                  ? 'text-xl text-indigo-700 dark:text-indigo-300'
                  : 'text-xl'
              }>Processing Statistics</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ul className={
                    colorMode === 'colorful'
                      ? 'space-y-1 text-indigo-700 dark:text-indigo-300'
                      : 'space-y-1'
                  }>
                    <li>Files processed: {stats.totalFiles}</li>
                    <li>Total entries: {stats.totalEntries}</li>
                    <li>Processed songs: {stats.processedSongs}</li>
                    <li>Unique songs: {stats.uniqueSongs || 0}</li>
                    <li>Entries with no track name: {stats.nullTrackNames}</li>
                    <li>Plays under 30s: {stats.shortPlays}</li>
                  </ul>
                </div>
                <div className={
                  colorMode === 'colorful'
                    ? 'p-4 border space-y-2 bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 rounded text-indigo-700 dark:text-indigo-300'
                    : `p-4 border space-y-2 ${isDarkMode ? 'border-white' : 'border-black'}`
                }>
                  <div className={
                    colorMode === 'colorful'
                      ? 'mb-1 font-semibold text-indigo-700 dark:text-indigo-300'
                      : 'mb-1'
                  }>Total Listening Time:</div>
                  <div className={
                    colorMode === 'colorful'
                      ? 'text-2xl text-indigo-700 dark:text-indigo-300'
                      : 'text-2xl'
                  }>{formatDuration(stats.totalListeningTime)}</div>
                  <div className={
                    colorMode === 'colorful'
                      ? 'text-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-sm'
                  }>(only counting plays over 30 seconds)</div>

                  {/* Service breakdown */}
                  {stats.serviceListeningTime && Object.keys(stats.serviceListeningTime).length > 0 && (
                    <div className={
                      colorMode === 'colorful'
                        ? 'mt-4 pt-3 border-t border-indigo-300 dark:border-indigo-700'
                        : `mt-4 pt-3 border-t ${isDarkMode ? 'border-white' : 'border-black'}`
                    }>
                      <div className={
                        colorMode === 'colorful'
                          ? 'mb-2 font-semibold text-indigo-700 dark:text-indigo-300'
                          : 'mb-2'
                      }>Listening Time by Service:</div>
                      <ul className={
                        colorMode === 'colorful'
                          ? 'space-y-1 text-indigo-700 dark:text-indigo-300'
                          : 'space-y-1'
                      }>
                        {Object.entries(stats.serviceListeningTime).map(([service, time]) => (
                          <li key={service} className="flex justify-between items-center">
                            <span>{service}:</span>
                            <span>{formatDuration(time)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {stats && processedData.length > 0 && (
                <div className={
                  colorMode === 'colorful'
                    ? 'mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-100 dark:bg-indigo-900'
                    : 'mt-4'
                }>
                  <SupportOptions className="h-full" colorMode={colorMode} />
                </div>
              )}
            </div>
          </div>
        ) : null;
      
      case 'artists':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-4 bg-blue-200 dark:bg-blue-900 rounded border-2 border-blue-300 dark:border-blue-700'
              : `p-4 border ${isDarkMode ? 'border-white' : 'border-black'}`
          }>
            {/* Title - mobile gets its own row */}
            <div className="block sm:hidden mb-1">
              <h3 className={
                colorMode === 'colorful'
                  ? 'text-xl text-blue-700 dark:text-blue-300'
                  : 'text-xl'
              }>
                {getArtistsTabLabel()}
              </h3>
            </div>
            
            {/* Desktop layout - title and controls on same row */}
            <div className="hidden sm:flex justify-between items-center mb-2">
                <h3 className={
                  colorMode === 'colorful'
                    ? 'text-xl text-blue-700 dark:text-blue-300'
                    : 'text-xl'
                }>
                  {getArtistsTabLabel()}
                </h3>

                <div className={`flex items-center gap-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                  <label className="text-xs">Show Top</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={topArtistsCount}
                    onChange={(e) => setTopArtistsCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 10)))}
                    className={
                      colorMode === 'colorful'
                        ? 'w-14 border border-blue-300 dark:border-blue-600 rounded px-1.5 py-1 text-xs bg-blue-50 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                        : `w-14 border rounded px-1.5 py-1 text-xs ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-white text-black'}`
                    }
                  />

                  <label className="text-xs">Sort by</label>
                  <button
                    onClick={() => setArtistsSortBy(artistsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
                    className={
                      colorMode === 'colorful'
                        ? 'px-2 py-1 rounded text-xs font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600'
                        : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-800' : 'bg-white text-black border border-black hover:bg-gray-100'}`
                    }
                  >
                    {artistsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
                  </button>
                </div>
              </div>
              
              {/* Mobile controls */}
              <div className={`block sm:hidden ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <label className="text-xs">Top</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={topArtistsCount}
                      onChange={(e) => setTopArtistsCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 10)))}
                      className={
                        colorMode === 'colorful'
                          ? 'w-12 border border-blue-300 dark:border-blue-600 rounded px-1 py-1 text-xs bg-blue-50 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                          : `w-12 border rounded px-1 py-1 text-xs ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-white text-black'}`
                      }
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setArtistsSortBy(artistsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
                      className={
                        colorMode === 'colorful'
                          ? 'px-2 py-1 rounded text-xs font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600'
                          : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-800' : 'bg-white text-black border border-black hover:bg-gray-100'}`
                      }
                    >
                      {artistsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
                    </button>
                  </div>
                </div>
              </div>
              
            <div className="space-y-4">
              {/* Artist Selection */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedArtists.map(artist => (
                    <div
                      key={artist}
                      className={
                        colorMode === 'colorful'
                          ? 'flex items-center border border-blue-500 bg-blue-500 text-white px-2 py-1 rounded text-sm'
                          : `flex items-center border px-2 py-1 rounded text-sm ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-white text-black'}`
                      }
                    >
                      {artist}
                      <button
                        onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                        className={colorMode === 'colorful' ? 'ml-2 text-white hover:text-blue-200' : 'ml-2 hover:opacity-70'}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={artistSearch}
                    onChange={(e) => setArtistSearch(e.target.value)}
                    placeholder="Search artists..."
                    className={
                      colorMode === 'colorful'
                        ? 'w-full border border-blue-300 dark:border-blue-600 rounded px-2 py-1 bg-blue-50 dark:bg-blue-800 text-blue-700 dark:text-blue-200 focus:border-blue-500 focus:ring-blue-500 focus:outline-none placeholder-blue-400 dark:placeholder-blue-500'
                        : `w-full border rounded px-2 py-1 focus:outline-none ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-white text-black'}`
                    }
                  />
                  {artistSearch && (
                    <button
                      onClick={() => setArtistSearch('')}
                      className={
                        colorMode === 'colorful'
                          ? 'absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200'
                          : 'absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white'
                      }
                    >
                      ×
                    </button>
                  )}
                  {artistSearch && filteredArtists.length > 0 && (
                    <div className={
                      colorMode === 'colorful'
                        ? 'absolute z-10 w-full bg-blue-50 dark:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded shadow-lg mt-1'
                        : `absolute z-10 w-full border rounded shadow-lg mt-1 ${isDarkMode ? 'bg-black border-white' : 'bg-white border-black'}`
                    }>
                      {filteredArtists.map(artist => (
                        <div
                          key={artist}
                          onClick={() => {
                            setSelectedArtists(prev => [...prev, artist]);
                            setArtistSearch('');
                          }}
                          className={
                            colorMode === 'colorful'
                              ? 'px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 cursor-pointer'
                              : `px-2 py-1 cursor-pointer ${isDarkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-black'}`
                          }
                        >
                          {artist}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* View Artist Playlist Button */}
              <div className="mb-4 flex flex-col items-center gap-2">
                <button
                  onClick={() => {
                    setArtistSelectionMode(prev => !prev);
                  }}
                  className={
                    colorMode === 'colorful'
                      ? `px-4 py-2 rounded-lg font-medium transition-colors ${
                          artistSelectionMode
                            ? 'bg-blue-400 text-white border border-blue-400'
                            : 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-500'
                        }`
                      : `px-4 py-2 rounded-lg font-medium transition-colors ${
                          artistSelectionMode
                            ? (isDarkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-gray-300 text-black border border-gray-400')
                            : (isDarkMode ? 'border border-white bg-black text-white hover:bg-gray-800' : 'border border-black bg-white text-black hover:bg-gray-100')
                        }`
                  }
                >
                  🎵 View Artist Playlist
                </button>
                {artistSelectionMode && (
                  <p className={
                    colorMode === 'colorful'
                      ? 'text-sm text-center text-blue-600 dark:text-blue-400'
                      : 'text-sm text-center text-gray-600 dark:text-gray-400'
                  }>
                    👆 Click on any artist below to view their custom track rankings
                  </p>
                )}
              </div>
              
              {/* Artists Display */}
              {displayedArtists && displayedArtists.length > 0 ? (
                artistsViewMode === 'list' ? (
                  // Table-based list view
                  <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
                    <div className="min-w-full">
                      <table className="w-full border-collapse text-sm sm:text-base">
                        <thead>
                          <tr className={`border-b ${colorMode === 'colorful' ? 'border-blue-300 dark:border-blue-600' : (isDarkMode ? 'border-white' : 'border-black')}`}>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>Rank</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>Artist</th>
                            <th className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>Time</th>
                            <th className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>Plays</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden md:table-cell`}>Top Song</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden lg:table-cell`}>First Song</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden lg:table-cell`}>First Listen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(filteredDisplayedArtists.length > 0 ? filteredDisplayedArtists : displayedArtists)
                            .slice(0, topArtistsCount)
                            .map((artist, index) => (
                              <tr
                                key={artist.name}
                                className={`border-b ${colorMode === 'colorful' ? 'border-blue-300 dark:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-700' : (isDarkMode ? 'border-white hover:bg-gray-800' : 'border-black hover:bg-gray-100')}`}
                              >
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} font-medium text-xs sm:text-sm`}>{index + 1}</td>
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>{artist.name}</td>
                                <td className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>{formatDuration(artist.totalPlayed)}</td>
                                <td className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>{artist.playCount?.toLocaleString() || 0}</td>
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden md:table-cell`}>{artist.mostPlayedSong?.trackName || '-'}</td>
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden lg:table-cell`}>{artist.firstSong || '-'}</td>
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden lg:table-cell`}>{artist.firstListen ? new Date(artist.firstListen).toLocaleDateString() : '-'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // Grid view
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(filteredDisplayedArtists.length > 0 ? filteredDisplayedArtists : displayedArtists)
                      .slice(0, topArtistsCount)
                      .map((artist, index) => {
                        const handleArtistClick = () => {
                          if (!artistSelectionMode) {
                            return;
                          }
                          setActiveTab('custom');
                          setSelectedArtists([artist.name]);
                          setArtistSelectionMode(false);
                        };

                        const cardBg = colorMode === 'colorful'
                          ? 'bg-blue-100 dark:bg-blue-800'
                          : (isDarkMode ? 'bg-black' : 'bg-white');
                        const cardBorder = colorMode === 'colorful'
                          ? 'border-blue-300 dark:border-blue-600'
                          : (isDarkMode ? 'border-white' : 'border-black');
                        const cardText = colorMode === 'colorful'
                          ? 'text-blue-700 dark:text-blue-200'
                          : '';
                        const cardTextLight = colorMode === 'colorful'
                          ? 'text-blue-600 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400';

                        return (
                          <div
                            key={artist.name}
                            onClick={handleArtistClick}
                            className={`
                              ${artistSelectionMode ? 'cursor-pointer' : 'cursor-default'}
                              p-3 ${cardBg} rounded shadow-sm border ${cardBorder} relative
                              ${artistSelectionMode
                                ? (colorMode === 'colorful'
                                    ? 'ring-2 ring-blue-300 ring-opacity-50 hover:bg-blue-100 dark:hover:bg-blue-700'
                                    : 'ring-2 ring-gray-400 ring-opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800')
                                : ''
                              }
                            `}
                          >
                            <div className={`font-bold ${cardText}`}>{artist.name}</div>
                            <div className={`text-sm ${cardTextLight}`}>
                              Total Time: <span className="font-bold">{formatDuration(artist.totalPlayed)}</span>
                              <br/>
                              Plays: <span className="font-bold">{artist.playCount?.toLocaleString() || 0}</span>
                              <br/>
                              {artist.mostPlayedSong && (
                                <>Top Song: <span className="font-bold">{artist.mostPlayedSong.trackName}</span> ({artist.mostPlayedSong.playCount} plays)<br/></>
                              )}
                              {artist.firstSong && (
                                <>First Song: <span className="font-bold">{artist.firstSong}</span> ({artist.firstSongPlayCount} plays)<br/></>
                              )}
                              {artist.firstListen && (
                                <>First Listen: <span className="font-bold">{new Date(artist.firstListen).toLocaleDateString()}</span></>
                              )}
                            </div>
                            <div className={`absolute top-1 right-3 ${cardText} text-[2rem]`}>{index + 1}</div>
                          </div>
                        );
                      })}
                  </div>
                )
              ) : (
                <div className={
                  colorMode === 'colorful'
                    ? 'p-6 text-center bg-blue-100 dark:bg-blue-800 rounded border-2 border-blue-300 dark:border-blue-600'
                    : `p-6 text-center rounded border-2 ${isDarkMode ? 'bg-black border-white' : 'bg-white border-black'}`
                }>
                  <h4 className={
                    colorMode === 'colorful'
                      ? 'text-lg font-bold text-blue-700 dark:text-blue-200'
                      : 'text-lg font-bold'
                  }>No artists found</h4>
                  <p className={
                    colorMode === 'colorful'
                      ? 'text-blue-600 dark:text-blue-300 mt-2'
                      : 'text-gray-600 dark:text-gray-400 mt-2'
                  }>
                    {yearRangeMode
                      ? `No artists found for the year range ${yearRange.startYear} - ${yearRange.endYear}.`
                      : selectedArtistYear !== 'all'
                        ? `No artists found for the year ${selectedArtistYear}.`
                        : "No artist data available."}
                  </p>
                  <button
                    onClick={() => {
                      setYearRangeMode(false);
                      setSelectedArtistYear('all');
                      setSelectedArtists([]);
                    }}
                    className={
                      colorMode === 'colorful'
                        ? 'mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                        : `mt-4 px-4 py-2 rounded ${isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-800' : 'bg-white text-black border border-black hover:bg-gray-100'}`
                    }
                  >
                    Show All Artists
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      
      case 'albums':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-cyan-200 dark:bg-cyan-900 rounded border-2 border-cyan-300 dark:border-cyan-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-white' : 'border-black'}`
          }>
            {/* Title - mobile gets its own row */}
            <div className="block sm:hidden mb-1">
              <h3 className={
                colorMode === 'colorful'
                  ? 'text-xl text-cyan-700 dark:text-cyan-300'
                  : 'text-xl'
              }>
                {getAlbumsTabLabel()}
              </h3>
            </div>

            {/* Desktop layout - title and controls on same row */}
            <div className="hidden sm:flex justify-between items-center mb-2">
                <h3 className={
                  colorMode === 'colorful'
                    ? 'text-xl text-cyan-700 dark:text-cyan-300'
                    : 'text-xl'
                }>
                  {getAlbumsTabLabel()}
                </h3>

                <div className={`flex items-center gap-2 ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-300' : ''}`}>
                  <label className="text-xs">Show Top</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={topAlbumsCount}
                    onChange={(e) => setTopAlbumsCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 20)))}
                    className={
                      colorMode === 'colorful'
                        ? 'w-14 border border-cyan-300 dark:border-cyan-600 rounded px-1.5 py-1 text-xs bg-cyan-50 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200'
                        : `w-14 border rounded px-1.5 py-1 text-xs ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-white text-black'}`
                    }
                  />

                  <label className="text-xs">Sort by</label>
                  <button
                    onClick={() => setAlbumsSortBy(albumsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
                    className={
                      colorMode === 'colorful'
                        ? 'px-2 py-1 rounded text-xs font-medium transition-colors bg-cyan-500 text-white hover:bg-cyan-600'
                        : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-800' : 'bg-white text-black border border-black hover:bg-gray-100'}`
                    }
                  >
                    {albumsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
                  </button>
                </div>
              </div>

              {/* Mobile controls */}
              <div className={`block sm:hidden ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-300' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <label className="text-xs">Top</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={topAlbumsCount}
                      onChange={(e) => setTopAlbumsCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 20)))}
                      className={
                        colorMode === 'colorful'
                          ? 'w-12 border border-cyan-300 dark:border-cyan-600 rounded px-1 py-1 text-xs bg-cyan-50 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200'
                          : `w-12 border rounded px-1 py-1 text-xs ${isDarkMode ? 'border-white bg-black text-white' : 'border-black bg-white text-black'}`
                      }
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAlbumsSortBy(albumsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
                      className={
                        colorMode === 'colorful'
                          ? 'px-2 py-1 rounded text-xs font-medium transition-colors bg-cyan-500 text-white hover:bg-cyan-600'
                          : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-white hover:bg-gray-800' : 'bg-white text-black border border-black hover:bg-gray-100'}`
                      }
                    >
                      {albumsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
                    </button>
                  </div>
                </div>
              </div>
              
            <div className="space-y-4">
              {/* Artist Filter */}
              {selectedArtists.length > 0 && (
                <div className={
                  colorMode === 'colorful'
                    ? 'bg-cyan-50 dark:bg-cyan-800 p-3 rounded-lg border border-cyan-200 dark:border-cyan-600'
                    : `p-3 rounded-lg border ${isDarkMode ? 'bg-black border-white' : 'bg-white border-black'}`
                }>
                  <div className="flex items-center justify-between mb-2">
                    <span className={
                      colorMode === 'colorful'
                        ? 'text-cyan-700 dark:text-cyan-200 font-medium'
                        : 'font-medium'
                    }>Filtered Artists ({selectedArtists.length}):</span>
                    <button
                      onClick={() => setSelectedArtists([])}
                      className={
                        colorMode === 'colorful'
                          ? 'text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200 text-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white text-sm'
                      }
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedArtists.map(artist => (
                      <span
                        key={artist}
                        className={
                          colorMode === 'colorful'
                            ? 'inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-200 rounded-full text-xs'
                            : `inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'}`
                        }
                      >
                        {artist}
                        <button
                          onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                          className={
                            colorMode === 'colorful'
                              ? 'ml-1 text-cyan-500 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-200'
                              : 'ml-1 text-gray-500 hover:text-black dark:hover:text-white'
                          }
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Albums Display */}
              {displayedAlbums && displayedAlbums.length > 0 ? (
                albumsViewMode === 'list' ? (
                  // Table-based list view
                  <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
                    <div className="min-w-full">
                      <table className="w-full border-collapse text-sm sm:text-base">
                        <thead>
                          <tr className={`border-b ${colorMode === 'colorful' ? 'border-cyan-300 dark:border-cyan-600' : (isDarkMode ? 'border-white' : 'border-black')}`}>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>Rank</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>Album</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>Artist</th>
                            <th className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>Time</th>
                            <th className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>Plays</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedAlbums.slice(0, topAlbumsCount).map((album, index) => (
                            <tr
                              key={`${album.artist}-${album.name}`}
                              className={`border-b ${colorMode === 'colorful' ? 'border-cyan-300 dark:border-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-700' : (isDarkMode ? 'border-white hover:bg-gray-800' : 'border-black hover:bg-gray-100')}`}
                            >
                              <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} font-medium text-xs sm:text-sm`}>{index + 1}</td>
                              <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>{album.name}</td>
                              <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>{album.artist}</td>
                              <td className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>{formatDuration(album.totalPlayed)}</td>
                              <td className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>{(album.playCount || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // Grid or Mobile view
                  <div className={`
                    ${albumsViewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-1'}
                  `}>
                    {displayedAlbums.slice(0, topAlbumsCount).map((album, index) => {
                      const albumCardBg = colorMode === 'colorful'
                        ? 'bg-cyan-50 dark:bg-cyan-800'
                        : (isDarkMode ? 'bg-black' : 'bg-white');
                      const albumCardBorder = colorMode === 'colorful'
                        ? 'border-cyan-300 dark:border-cyan-600'
                        : (isDarkMode ? 'border-white' : 'border-black');
                      const albumCardText = colorMode === 'colorful'
                        ? 'text-cyan-700 dark:text-cyan-200'
                        : '';
                      const albumCardTextLight = colorMode === 'colorful'
                        ? 'text-cyan-600 dark:text-cyan-300'
                        : 'text-gray-600 dark:text-gray-400';

                      return albumsViewMode === 'grid' ? (
                        <AlbumCard
                          key={`${album.artist}-${album.name}`}
                          album={{...album, rank: index + 1}}
                          index={index}
                          processedData={processedData}
                          formatDuration={formatDuration}
                          textTheme={albumTextTheme}
                          backgroundTheme={albumBackgroundTheme}
                          colorMode={colorMode}
                        />
                      ) : (
                        <div
                          key={`${album.artist}-${album.name}`}
                          className={`p-2 ${albumCardBg} rounded border ${albumCardBorder}`}
                        >
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex-1">
                              <div className={`font-bold ${albumCardText} text-sm`}>
                                #{index + 1} {album.name}
                              </div>
                              <div className={`${albumCardTextLight} text-xs`}>
                                {album.artist}
                              </div>
                            </div>
                            <div className={`text-right text-xs ${albumCardTextLight}`}>
                              <div className="font-medium">{formatDuration(album.totalPlayed)}</div>
                              <div>{(album.playCount || 0).toLocaleString()} plays</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className={
                  colorMode === 'colorful'
                    ? 'text-center py-8 text-cyan-600 dark:text-cyan-400'
                    : 'text-center py-8 text-gray-600 dark:text-gray-400'
                }>
                  {selectedAlbumYear === 'all' ?
                    'No album data available' :
                    `No album data for ${selectedAlbumYear}`
                  }
                </div>
              )}
            </div>
          </div>
        );
      
      case 'custom':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-emerald-200 dark:bg-emerald-900 rounded border-2 border-emerald-300 dark:border-emerald-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-white' : 'border-black'}`
          }>
            <CustomTrackRankings
              rawPlayData={rawPlayData}
              formatDuration={formatDuration}
              selectedYear={customTrackYear}
              yearRangeMode={customYearRangeMode}
              yearRange={customYearRange}
              textTheme={customTextTheme}
              backgroundTheme={customBackgroundTheme}
              initialArtists={selectedArtists}
              colorMode={colorMode}
              viewMode={customViewMode}
            />
          </div>
        );
      
      case 'tracks':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-red-200 dark:bg-red-900 rounded border-2 border-red-300 dark:border-red-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-white' : 'border-black'}`
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
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-white' : 'border-black'}`
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
            />
          </div>
        );
      
      case 'calendar':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-green-200 dark:bg-green-900 rounded border-2 border-green-300 dark:border-green-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-white' : 'border-black'}`
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
            />
          </div>
        );
      
      case 'behavior':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-amber-200 dark:bg-amber-900 rounded border-2 border-amber-300 dark:border-amber-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-white' : 'border-black'}`
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
            />
          </div>
        );
      
      case 'discovery':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-orange-200 dark:bg-orange-900 rounded border-2 border-orange-300 dark:border-orange-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-white' : 'border-black'}`
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
            />
          </div>
        );
      
      case 'podcasts':
        return (
          <div id="podcast-rankings" className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-red-200 dark:bg-red-900 rounded border-2 border-red-300 dark:border-red-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-white' : 'border-black'}`
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
            />
          </div>
        );
      
      case 'playlists':
        return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-rose-200 dark:bg-rose-900 rounded border-2 border-rose-300 dark:border-rose-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-white' : 'border-black'}`
          }>
            <CustomPlaylistCreator processedData={processedData} formatDuration={formatDuration} colorMode={colorMode} />
          </div>
        );
      
      case 'updates':
        return (
          <div className={`p-4 border ${isDarkMode ? 'border-white' : 'border-black'}`}>
            {/* Title - mobile gets its own row */}
            <div className="block sm:hidden mb-1">
              <h3 className="text-xl">App Updates</h3>
            </div>
            {/* Desktop title */}
            <div className="hidden sm:block mb-4">
              <h3 className="text-xl">App Updates</h3>
            </div>
            <UpdatesSection />
          </div>
        );

      case 'settings':
        return (
          <div className="p-2 sm:p-4">
            <SettingsPanel />
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
    handleLoadSampleData,
    handleFileUpload,
    handleDeleteFile,
    handleProcessFiles,
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
    patternsViewMode
  ]);

  // Get current view mode based on active tab
  const getCurrentViewMode = () => {
    switch (activeTab) {
      case 'artists': return artistsViewMode;
      case 'albums': return albumsViewMode;
      case 'custom': return customViewMode;
      case 'podcasts': return podcastViewMode;
      case 'patterns': return patternsViewMode;
      default: return 'grid';
    }
  };

  // Set view mode for current tab
  const setCurrentViewMode = (mode) => {
    switch (activeTab) {
      case 'artists': setArtistsViewMode(mode); break;
      case 'albums': setAlbumsViewMode(mode); break;
      case 'custom': setCustomViewMode(mode); break;
      case 'podcasts': setPodcastViewMode(mode); break;
      case 'patterns': setPatternsViewMode(mode); break;
    }
  };

  return (
    <div className="w-full h-full">
      <FixedSettingsBar
        togglePosition={togglePosition}
        toggleCollapsed={toggleCollapsed}
        isMobile={isMobile}
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
        <div className="transition-all duration-300" 
             style={{
               ...contentAreaStyles,
               // Calculate actual width reduction instead of just padding
               width: (() => {
                 let totalWidthReduction = 0;

                 // Calculate width reduction from TopTabs (always applies)
                 if (topTabsPosition === 'left' || topTabsPosition === 'right') {
                   totalWidthReduction += topTabsWidth;
                 }

                 // Calculate width reduction from YearSelector (only when sidebar is shown)
                 if (showYearSidebar && shouldShowSidebar(activeTab)) {
                   if (yearSelectorPosition === 'left' || yearSelectorPosition === 'right') {
                     const effectiveWidth = yearSelectorExpanded ? (customYearRangeMode ? 240 : 120) : 32;
                     totalWidthReduction += effectiveWidth;
                   }
                 }

                 if (totalWidthReduction === 0) return '100%';
                 return `calc(100% - ${totalWidthReduction}px)`;
               })(),
               // Use margin to position content away from left-side sidebars
               marginLeft: (() => {
                 let totalLeftMargin = 0;

                 // Add margin for left-positioned TopTabs (always applies)
                 if (topTabsPosition === 'left') {
                   totalLeftMargin += topTabsWidth;
                 }

                 // Add margin for left-positioned YearSelector (only when sidebar is shown)
                 if (showYearSidebar && shouldShowSidebar(activeTab)) {
                   if (yearSelectorPosition === 'left') {
                     const effectiveWidth = yearSelectorExpanded ? (customYearRangeMode ? 240 : 120) : 32;
                     totalLeftMargin += effectiveWidth;
                   }
                 }

                 return `${totalLeftMargin}px`;
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
               paddingBottom: isMobile ? `calc(${contentAreaStyles.paddingBottom} + env(safe-area-inset-bottom, 0px))` : contentAreaStyles.paddingBottom,
               // Debug info
               '--year-selector-width': JSON.stringify(yearSelectorWidth),
               '--year-selector-height': JSON.stringify(yearSelectorHeight),
               '--year-selector-position': yearSelectorPosition,
               '--year-selector-expanded': yearSelectorExpanded,
               '--top-tabs-position': topTabsPosition,
               '--top-tabs-height': topTabsHeight
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
            onExpandChange={(expanded) => {
              console.log('SpotifyAnalyzer: Received year selector expansion change:', expanded);
              setYearSelectorExpanded(expanded);
            }}
            onPositionChange={setYearSelectorPosition}
            onWidthChange={setYearSelectorWidth}
            onHeightChange={setYearSelectorHeight}
            onTransitionChange={setYearSelectorTransitioning}
            topTabsPosition={topTabsPosition}
            topTabsHeight={topTabsHeight}
            topTabsWidth={topTabsWidth}
            initialYear={
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

