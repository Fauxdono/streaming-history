import React, { useState, useMemo, useEffect, useRef } from 'react';
import { normalizeString, createMatchKey } from './streaming-adapter.js';
import { Download, Plus, XCircle, Eye } from 'lucide-react';
import PlaylistExporter from './playlist-exporter.js';
import { useTheme } from './themeprovider.js';

const CustomTrackRankings = ({
  rawPlayData = [],
  formatDuration,
  initialArtists = [],
  // Add props for connecting with the YearSelector sidebar
  selectedYear = 'all',
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  onYearChange,
  onYearRangeChange,
  onToggleYearRangeMode,
  colorTheme = 'orange',
  textTheme = null,
  backgroundTheme = null,
  colorMode = 'minimal',
  viewMode = 'grid',
  setViewMode = () => {}
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Flexible theming support - if textTheme and backgroundTheme are provided, use them
  const getFlexibleColors = (textTheme, backgroundTheme) => {
    const textColors = {
      violet: {
        text: isDarkMode ? 'text-violet-300' : 'text-violet-700',
        textLight: isDarkMode ? 'text-violet-400' : 'text-violet-600',
        textLighter: isDarkMode ? 'text-violet-500' : 'text-violet-500',
        textDark: isDarkMode ? 'text-violet-200' : 'text-violet-800',
        hoverText: isDarkMode ? 'hover:text-violet-100' : 'hover:text-violet-200'
      },
      red: {
        text: isDarkMode ? 'text-red-300' : 'text-red-700',
        textLight: isDarkMode ? 'text-red-400' : 'text-red-600',
        textLighter: isDarkMode ? 'text-red-500' : 'text-red-500',
        textDark: isDarkMode ? 'text-red-200' : 'text-red-800',
        hoverText: isDarkMode ? 'hover:text-red-100' : 'hover:text-red-200'
      },
      emerald: {
        text: isDarkMode ? 'text-emerald-300' : 'text-emerald-700',
        textLight: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
        textLighter: isDarkMode ? 'text-emerald-500' : 'text-emerald-500',
        textDark: isDarkMode ? 'text-emerald-200' : 'text-emerald-800',
        hoverText: isDarkMode ? 'hover:text-emerald-100' : 'hover:text-emerald-200'
      },
      orange: {
        text: isDarkMode ? 'text-orange-300' : 'text-orange-700',
        textLight: isDarkMode ? 'text-orange-400' : 'text-orange-600',
        textLighter: isDarkMode ? 'text-orange-500' : 'text-orange-500',
        textDark: isDarkMode ? 'text-orange-200' : 'text-orange-800',
        hoverText: isDarkMode ? 'hover:text-orange-100' : 'hover:text-orange-200'
      }
    };

    const backgroundColors = {
      emerald: isDarkMode ? {
        bg: 'bg-emerald-900',
        bgLight: 'bg-emerald-800',
        bgMed: 'bg-emerald-700',
        bgDark: 'bg-emerald-500',
        bgDarkHover: 'hover:bg-emerald-400',
        border: 'border-emerald-600',
        borderDark: 'border-emerald-500',
        hoverBg: 'hover:bg-emerald-700',
        hoverBgDark: 'hover:bg-emerald-600',
        focusBorder: 'focus:border-emerald-500',
        focusRing: 'focus:ring-emerald-500'
      } : {
        bg: 'bg-emerald-200',
        bgLight: 'bg-emerald-100',
        bgMed: 'bg-emerald-300',
        bgDark: 'bg-emerald-600',
        bgDarkHover: 'hover:bg-emerald-700',
        border: 'border-emerald-300',
        borderDark: 'border-emerald-700',
        hoverBg: 'hover:bg-emerald-200',
        hoverBgDark: 'hover:bg-emerald-900',
        focusBorder: 'focus:border-emerald-400',
        focusRing: 'focus:ring-emerald-400'
      },
      violet: {
        bg: isDarkMode ? 'bg-violet-900' : 'bg-violet-100',
        bgLight: isDarkMode ? 'bg-violet-800' : 'bg-violet-50',
        bgMed: isDarkMode ? 'bg-violet-700' : 'bg-violet-200',
        bgDark: isDarkMode ? 'bg-violet-500' : 'bg-violet-600',
        bgDarkHover: isDarkMode ? 'hover:bg-violet-400' : 'hover:bg-violet-700',
        border: isDarkMode ? 'border-violet-600' : 'border-violet-300',
        borderDark: isDarkMode ? 'border-violet-400' : 'border-violet-700',
        hoverBg: isDarkMode ? 'hover:bg-violet-700' : 'hover:bg-violet-100',
        hoverBgDark: isDarkMode ? 'hover:bg-violet-600' : 'hover:bg-violet-900',
        focusBorder: isDarkMode ? 'focus:border-violet-400' : 'focus:border-violet-400',
        focusRing: 'focus:ring-violet-400'
      },
      orange: {
        bg: isDarkMode ? 'bg-orange-900' : 'bg-orange-100',
        bgLight: isDarkMode ? 'bg-orange-800' : 'bg-orange-50',
        bgMed: isDarkMode ? 'bg-orange-700' : 'bg-orange-200',
        bgDark: isDarkMode ? 'bg-orange-500' : 'bg-orange-600',
        bgDarkHover: isDarkMode ? 'hover:bg-orange-400' : 'hover:bg-orange-700',
        border: isDarkMode ? 'border-orange-600' : 'border-orange-300',
        borderDark: isDarkMode ? 'border-orange-400' : 'border-orange-700',
        hoverBg: isDarkMode ? 'hover:bg-orange-700' : 'hover:bg-orange-100',
        hoverBgDark: isDarkMode ? 'hover:bg-orange-600' : 'hover:bg-orange-900',
        focusBorder: isDarkMode ? 'focus:border-orange-400' : 'focus:border-orange-400',
        focusRing: 'focus:ring-orange-400'
      }
    };

    const textThemeObj = textColors[textTheme] || textColors.orange;
    const backgroundThemeObj = backgroundColors[backgroundTheme] || backgroundColors.orange;

    return {
      ...textThemeObj,
      ...backgroundThemeObj
    };
  };

  // Color theme mapping (legacy support) - uses two-tone design for colorful mode
  const getColors = (theme) => {
    switch (theme) {
      case 'emerald':
        return isDarkMode ? {
          text: 'text-emerald-300',
          textLight: 'text-emerald-400',
          textLighter: 'text-emerald-500',
          textDark: 'text-emerald-200',
          bg: 'bg-emerald-900',
          bgLight: 'bg-emerald-800',
          bgMed: 'bg-emerald-700',
          bgDark: 'bg-emerald-500',
          bgDarkHover: 'hover:bg-emerald-400',
          border: 'border-emerald-600',
          borderDark: 'border-emerald-500',
          hoverBg: 'hover:bg-emerald-700',
          hoverBgDark: 'hover:bg-emerald-600',
          focusBorder: 'focus:border-emerald-500',
          focusRing: 'focus:ring-emerald-500',
          hoverText: 'hover:text-emerald-100'
        } : {
          text: 'text-emerald-700',
          textLight: 'text-emerald-600',
          textLighter: 'text-emerald-500',
          textDark: 'text-emerald-800',
          bg: 'bg-emerald-200',
          bgLight: 'bg-emerald-100',
          bgMed: 'bg-emerald-300',
          bgDark: 'bg-emerald-600',
          bgDarkHover: 'hover:bg-emerald-700',
          border: 'border-emerald-300',
          borderDark: 'border-emerald-700',
          hoverBg: 'hover:bg-emerald-200',
          hoverBgDark: 'hover:bg-emerald-900',
          focusBorder: 'focus:border-emerald-400',
          focusRing: 'focus:ring-emerald-400',
          hoverText: 'hover:text-emerald-200'
        };
      case 'red':
        return isDarkMode ? {
          text: 'text-red-300',
          textLight: 'text-red-400',
          textLighter: 'text-red-500',
          textDark: 'text-red-200',
          bg: 'bg-red-900',
          bgLight: 'bg-red-800',
          bgMed: 'bg-red-700',
          bgDark: 'bg-red-500',
          bgDarkHover: 'hover:bg-red-400',
          border: 'border-red-600',
          borderDark: 'border-red-500',
          hoverBg: 'hover:bg-red-700',
          hoverBgDark: 'hover:bg-red-600',
          focusBorder: 'focus:border-red-500',
          focusRing: 'focus:ring-red-500',
          hoverText: 'hover:text-red-100'
        } : {
          text: 'text-red-700',
          textLight: 'text-red-600',
          textLighter: 'text-red-500',
          textDark: 'text-red-800',
          bg: 'bg-red-100',
          bgLight: 'bg-red-50',
          bgMed: 'bg-red-200',
          bgDark: 'bg-red-600',
          bgDarkHover: 'hover:bg-red-700',
          border: 'border-red-300',
          borderDark: 'border-red-700',
          hoverBg: 'hover:bg-red-100',
          hoverBgDark: 'hover:bg-red-900',
          focusBorder: 'focus:border-red-400',
          focusRing: 'focus:ring-red-400',
          hoverText: 'hover:text-red-200'
        };
      case 'violet':
        return isDarkMode ? {
          text: 'text-violet-300',
          textLight: 'text-violet-400',
          textLighter: 'text-violet-500',
          textDark: 'text-violet-200',
          bg: 'bg-violet-900',
          bgLight: 'bg-violet-800',
          bgMed: 'bg-violet-700',
          bgDark: 'bg-violet-500',
          bgDarkHover: 'hover:bg-violet-400',
          border: 'border-violet-600',
          borderDark: 'border-violet-500',
          hoverBg: 'hover:bg-violet-700',
          hoverBgDark: 'hover:bg-violet-600',
          focusBorder: 'focus:border-violet-500',
          focusRing: 'focus:ring-violet-500',
          hoverText: 'hover:text-violet-100'
        } : {
          text: 'text-violet-700',
          textLight: 'text-violet-600',
          textLighter: 'text-violet-500',
          textDark: 'text-violet-800',
          bg: 'bg-violet-100',
          bgLight: 'bg-violet-50',
          bgMed: 'bg-violet-200',
          bgDark: 'bg-violet-600',
          bgDarkHover: 'hover:bg-violet-700',
          border: 'border-violet-300',
          borderDark: 'border-violet-700',
          hoverBg: 'hover:bg-violet-100',
          hoverBgDark: 'hover:bg-violet-900',
          focusBorder: 'focus:border-violet-400',
          focusRing: 'focus:ring-violet-400',
          hoverText: 'hover:text-violet-200'
        };
      case 'orange':
      default:
        return isDarkMode ? {
          text: 'text-orange-300',
          textLight: 'text-orange-400',
          textLighter: 'text-orange-500',
          textDark: 'text-orange-200',
          bg: 'bg-orange-900',
          bgLight: 'bg-orange-800',
          bgMed: 'bg-orange-700',
          bgDark: 'bg-orange-500',
          bgDarkHover: 'hover:bg-orange-400',
          border: 'border-orange-600',
          borderDark: 'border-orange-500',
          hoverBg: 'hover:bg-orange-700',
          hoverBgDark: 'hover:bg-orange-600',
          focusBorder: 'focus:border-orange-500',
          focusRing: 'focus:ring-orange-500',
          hoverText: 'hover:text-orange-100'
        } : {
          text: 'text-orange-700',
          textLight: 'text-orange-600',
          textLighter: 'text-orange-500',
          textDark: 'text-orange-800',
          bg: 'bg-orange-100',
          bgLight: 'bg-orange-50',
          bgMed: 'bg-orange-200',
          bgDark: 'bg-orange-600',
          bgDarkHover: 'hover:bg-orange-700',
          border: 'border-orange-300',
          borderDark: 'border-orange-700',
          hoverBg: 'hover:bg-orange-100',
          hoverBgDark: 'hover:bg-orange-900',
          focusBorder: 'focus:border-orange-400',
          focusRing: 'focus:ring-orange-400',
          hoverText: 'hover:text-orange-200'
        };
    }
  };

  // Minimal mode colors (black/white) - flat design, no contrast
  const getMinimalColors = () => ({
    text: isDarkMode ? 'text-white' : 'text-black',
    textLight: isDarkMode ? 'text-white' : 'text-black',
    textLighter: isDarkMode ? 'text-white' : 'text-black',
    textDark: isDarkMode ? 'text-white' : 'text-black',
    bg: isDarkMode ? 'bg-black' : 'bg-white',
    bgLight: isDarkMode ? 'bg-black' : 'bg-white',
    bgMed: isDarkMode ? 'bg-black' : 'bg-white',
    bgDark: isDarkMode ? 'bg-black text-white border border-white' : 'bg-white text-black border border-black',
    bgDarkHover: isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100',
    border: isDarkMode ? 'border-white' : 'border-black',
    borderDark: isDarkMode ? 'border-white' : 'border-black',
    hoverBg: isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-50',
    hoverBgDark: isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100',
    focusBorder: isDarkMode ? 'focus:border-white' : 'focus:border-black',
    focusRing: 'focus:ring-gray-400',
    hoverText: isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700'
  });

  // Use minimal colors if not in colorful mode, otherwise use themed colors
  const colors = !isColorful
    ? getMinimalColors()
    : (textTheme && backgroundTheme) ? getFlexibleColors(textTheme, backgroundTheme) : getColors(colorTheme);
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [topN, setTopN] = useState(100);
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [selectedArtists, setSelectedArtists] = useState(initialArtists);
  const [selectedAlbums, setSelectedAlbums] = useState([]);
  const [artistSearch, setArtistSearch] = useState('');
  const [albumSearch, setAlbumSearch] = useState('');
  const [unifiedSearch, setUnifiedSearch] = useState('');
  const [includeFeatures, setIncludeFeatures] = useState(false);
  const [onlyFeatures, setOnlyFeatures] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [musicBasePath, setMusicBasePath] = useState('/Music/Downloads');
  const [fileExtension, setFileExtension] = useState('mp3');
  const [pathFormat, setPathFormat] = useState('default');
  const [customPathFormat, setCustomPathFormat] = useState('{basePath}/{artist}/{artist}-{album}/{track}.{ext}');
  const [playlistName, setPlaylistName] = useState('Custom Date Range Playlist');
  const [showPlaylistExporter, setShowPlaylistExporter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showOmitDropdown, setShowOmitDropdown] = useState(null); // Track which card's dropdown is open

  // Create a ref to hold our normalization cache that persists across renders
  const normalizationCache = useRef(new Map());
  // Also track if we've already processed the raw data
  const processedDataRef = useRef(null);
  const previousRawDataLength = useRef(0);
  
  // New state for omitted content feature
  const [omittedSongs, setOmittedSongs] = useState([]);
  const [omittedArtists, setOmittedArtists] = useState([]);
  const [showOmittedTab, setShowOmittedTab] = useState(false);
  
  // Add check for mobile viewport like other components
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load omitted content from localStorage
  useEffect(() => {
    try {
      const savedOmittedSongs = localStorage.getItem('omittedSongs');
      const savedOmittedArtists = localStorage.getItem('omittedArtists');
      
      if (savedOmittedSongs) {
        setOmittedSongs(JSON.parse(savedOmittedSongs));
      }
      
      if (savedOmittedArtists) {
        setOmittedArtists(JSON.parse(savedOmittedArtists));
      }
    } catch (err) {
      console.error("Error loading omitted content from localStorage:", err);
    }
  }, []);

  // Save omitted songs to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('omittedSongs', JSON.stringify(omittedSongs));
    } catch (err) {
      console.error("Error saving omitted songs to localStorage:", err);
    }
  }, [omittedSongs]);

  // Save omitted artists to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('omittedArtists', JSON.stringify(omittedArtists));
    } catch (err) {
      console.error("Error saving omitted artists to localStorage:", err);
    }
  }, [omittedArtists]);

  // Extract available years from raw play data - memoized to prevent recalculation
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    
    if (!rawPlayData || !Array.isArray(rawPlayData) || rawPlayData.length === 0) {
      return [];
    }
    
    // Only iterate through rawPlayData once by using a for loop instead of forEach
    for (let i = 0; i < rawPlayData.length; i++) {
      const entry = rawPlayData[i];
      if (entry && entry.ts && entry.ms_played >= 30000) {
        try {
          const date = new Date(entry.ts);
          if (!isNaN(date.getTime())) {
            yearsSet.add(date.getFullYear().toString());
          }
        } catch (err) {
          // Skip invalid dates
        }
      }
    }
    
    return Array.from(yearsSet).sort();
  }, [rawPlayData]);
  
  // Add useEffect to log when selectedYear changes
  useEffect(() => {
    console.log("CustomTrackRankings: selectedYear changed to", selectedYear);
    console.log("CustomTrackRankings: yearRangeMode is", yearRangeMode);
  }, [selectedYear, yearRangeMode]);

  // Fixed useEffect in CustomTrackRankings.js to properly handle month/day in ranges
  useEffect(() => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      // Year range mode
      
      // Check if dates include month/day information
      const startHasMonthDay = yearRange.startYear.includes('-');
      const endHasMonthDay = yearRange.endYear.includes('-');
      
      if (startHasMonthDay || endHasMonthDay) {
        // Handle month/day information in range
        try {
          let startDateStr, endDateStr;
          
          // Process start date
          if (startHasMonthDay) {
            const startParts = yearRange.startYear.split('-');
            if (startParts.length === 3) {
              // YYYY-MM-DD format - use as is
              startDateStr = yearRange.startYear;
            } else if (startParts.length === 2) {
              // YYYY-MM format - use first day of month
              startDateStr = `${startParts[0]}-${startParts[1]}-01`;
            }
          } else {
            // Just year - use first day of year
            startDateStr = `${yearRange.startYear}-01-01`;
          }
          
          // Process end date  
          if (endHasMonthDay) {
            const endParts = yearRange.endYear.split('-');
            if (endParts.length === 3) {
              // YYYY-MM-DD format - use as is 
              endDateStr = yearRange.endYear;
            } else if (endParts.length === 2) {
              // YYYY-MM format - use last day of month
              const year = parseInt(endParts[0]);
              const month = parseInt(endParts[1]);
              const lastDay = new Date(year, month, 0).getDate();
              endDateStr = `${endParts[0]}-${endParts[1]}-${lastDay}`;
            }
          } else {
            // Just year - use last day of year
            endDateStr = `${yearRange.endYear}-12-31`;
          }
          
          setStartDate(startDateStr);
          setEndDate(endDateStr);
        } catch (err) {
          console.error("Error processing date range", err);
          // Fallback to full year range
          setStartDate(`${yearRange.startYear}-01-01`);
          setEndDate(`${yearRange.endYear}-12-31`);
        }
      } else {
        // Standard full year range
        setStartDate(`${yearRange.startYear}-01-01`);
        setEndDate(`${yearRange.endYear}-12-31`);
      }
    } else if (selectedYear !== 'all') {
      if (selectedYear.includes('-')) {
        // Handle case with YYYY-MM-DD or YYYY-MM format
        const parts = selectedYear.split('-');
        
        if (parts.length === 3) {
          // Single day selection - set both start and end to the same day
          setStartDate(selectedYear);
          setEndDate(selectedYear);
        } else if (parts.length === 2) {
          // Month selection (YYYY-MM)
          const year = parts[0];
          const month = parts[1];
          
          // Get the last day of the month
          const lastDay = new Date(year, parseInt(month), 0).getDate();
          
          setStartDate(`${year}-${month}-01`);
          setEndDate(`${year}-${month}-${lastDay}`);
        }
      } else {
        // Single year format (YYYY)
        setStartDate(`${selectedYear}-01-01`);
        setEndDate(`${selectedYear}-12-31`);
      }
    } else {
      // All time
      setStartDate('');
      setEndDate('');
    }
  }, [selectedYear, yearRangeMode, yearRange]);

  // Functions to handle omitting and un-omitting songs and artists
  const omitSong = (song) => {
    setOmittedSongs(prev => [...prev, song]);
  };

  const unomitSong = (songKey) => {
    setOmittedSongs(prev => prev.filter(song => song.key !== songKey));
  };

  const omitArtist = (artist) => {
    setOmittedArtists(prev => [...prev, artist]);
  };

  const unomitArtist = (artist) => {
    setOmittedArtists(prev => prev.filter(a => a !== artist));
  };

  const addArtistFromTrack = (artist) => {
    if (!selectedArtists.includes(artist)) {
      setSelectedArtists(prev => [...prev, artist]);
    }
  };
  
  const addAlbumFromTrack = (album, artist) => {
    const albumKey = `${album} - ${artist}`;
    
    if (!selectedAlbums.some(a => a.key === albumKey)) {
      setSelectedAlbums(prev => [...prev, { 
        name: album, 
        artist: artist, 
        key: albumKey 
      }]);
    }
  };

  // Get unique artists from raw play data - optimized to avoid redundant processing
  const allArtists = useMemo(() => {
    // Skip processing if we don't have data
    if (!rawPlayData || rawPlayData.length === 0) return [];
    
    // Use a Set for uniqueness and faster lookups
    const artistsSet = new Set();
    
    // Use a for loop instead of forEach for better performance
    for (let i = 0; i < rawPlayData.length; i++) {
      const entry = rawPlayData[i];
      if (entry.master_metadata_album_artist_name) {
        artistsSet.add(entry.master_metadata_album_artist_name);
      }
    }
    
    return Array.from(artistsSet).sort();
  }, [rawPlayData]);

  // Get unique albums from raw play data - optimized version
  const allAlbums = useMemo(() => {
    // Skip if no data
    if (!rawPlayData || rawPlayData.length === 0) return [];
    
    const albumMap = new Map();
    
    // Loop through entries once
    for (let i = 0; i < rawPlayData.length; i++) {
      const entry = rawPlayData[i];
      if (entry.master_metadata_album_album_name && entry.master_metadata_album_artist_name) {
        const album = entry.master_metadata_album_album_name;
        const artist = entry.master_metadata_album_artist_name;
        const key = `${album} - ${artist}`;
        
        if (!albumMap.has(key)) {
          albumMap.set(key, { name: album, artist: artist, key: key });
        }
      }
    }
    
    return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawPlayData]);

  const filteredArtists = useMemo(() => {
    // Skip if no search or if all artists are already selected
    if (!artistSearch.trim() || allArtists.length === 0) return [];
    
    const searchLower = artistSearch.toLowerCase();
    const results = [];
    
    // Loop through artists once, collect up to 10 matches
    for (let i = 0; i < allArtists.length && results.length < 10; i++) {
      const artist = allArtists[i];
      if (artist.toLowerCase().includes(searchLower) && !selectedArtists.includes(artist)) {
        results.push(artist);
      }
    }
    
    return results;
  }, [allArtists, artistSearch, selectedArtists]);
  
  const filteredAlbums = useMemo(() => {
    // Skip if no search or no albums
    if ((!albumSearch.trim() && !unifiedSearch.trim()) || allAlbums.length === 0) return [];
    
    const searchLower = (albumSearch || unifiedSearch).toLowerCase();
    const results = [];
    
    // Loop through albums once, collect up to 10 matches
    for (let i = 0; i < allAlbums.length && results.length < 10; i++) {
      const album = allAlbums[i];
      if ((album.name.toLowerCase().includes(searchLower) || 
           album.artist.toLowerCase().includes(searchLower)) &&
          !selectedAlbums.some(a => a.key === album.key)) {
        results.push(album);
      }
    }
    
    return results;
  }, [allAlbums, albumSearch, unifiedSearch, selectedAlbums]);

  // Create a mapping of track/artist keys to album names - only computed once
  const albumMap = useMemo(() => {
    // Skip if no data
    if (!rawPlayData || rawPlayData.length === 0) return new Map();
    
    const map = new Map();
    
    // Iterate once through rawPlayData
    for (let i = 0; i < rawPlayData.length; i++) {
      const entry = rawPlayData[i];
      if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
        const albumName = entry.master_metadata_album_album_name;
        
        if (albumName) {
          const trackName = entry.master_metadata_track_name.toLowerCase().trim();
          const artistName = entry.master_metadata_album_artist_name.toLowerCase().trim();
          const trackKey = `${trackName}|||${artistName}`;
          
          // Prefer Spotify source for album names
          if (entry.source === 'spotify' || !map.has(trackKey)) {
            map.set(trackKey, albumName);
          }
        }
      }
    }
    
    return map;
  }, [rawPlayData]);

  // Optimized helper function with caching
  const normalizeTrackForMatching = (trackName, artistName) => {
    if (!trackName || !artistName) return '';
    
    // Check cache first
    const cacheKey = `${trackName}:::${artistName}`;
    if (normalizationCache.current.has(cacheKey)) {
      return normalizationCache.current.get(cacheKey);
    }
    
    // Full normalization only if not in cache
    // Remove all feat./ft. info from track name
    let cleanTrack = trackName
      .toLowerCase()
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\[feat\..*?\]/gi, '')
      .replace(/\(ft\..*?\)/gi, '')
      .replace(/\[ft\..*?\]/gi, '')
      .replace(/\(with.*?\)/gi, '')
      .replace(/\[with.*?\]/gi, '')
      .replace(/\sfeat\..*?(?=\s*[-,]|$)/gi, '')
      .replace(/\sft\..*?(?=\s*[-,]|$)/gi, '')
      .replace(/\sfeaturing.*?(?=\s*[-,]|$)/gi, '')
      .trim();
      
    // Split artist by common collaboration separators
    const artistParts = artistName.split(/\s*(?:&|and|,|feat\.|ft\.)\s*/i);
    
    // Use only the first artist (primary artist)
    const primaryArtist = artistParts[0].toLowerCase().trim();
    
    const result = `${cleanTrack}|||${primaryArtist}`;
    
    // Save to cache
    normalizationCache.current.set(cacheKey, result);
    
    return result;
  };



  // Pre-process raw data once and cache the results - huge optimization
  const preprocessRawData = useMemo(() => {
    // Skip if no data or if we've already processed this exact dataset
    if (!rawPlayData || rawPlayData.length === 0) {
      return { trackVersions: {}, validEntries: [] };
    }
    
    // Check if we need to reprocess the data
    if (processedDataRef.current && previousRawDataLength.current === rawPlayData.length) {
      return processedDataRef.current;
    }

    console.time('preprocessRawData');
    
    // Track valid entries and normalized track versions
    const trackVersions = {};
    const validEntries = [];
    
    // Iterate through raw data once
    for (let i = 0; i < rawPlayData.length; i++) {
      const entry = rawPlayData[i];
      
      try {
        // Skip invalid entries
        if (!entry.ts || !entry.master_metadata_track_name || 
            !entry.master_metadata_album_artist_name || entry.ms_played < 30000) {
          continue;
        }
        
        // Add to valid entries for filtering later
        validEntries.push(entry);
        
        // Create a normalized key for deduplication
        const normalizedKey = normalizeTrackForMatching(
          entry.master_metadata_track_name,
          entry.master_metadata_album_artist_name
        );
        
        // Track all versions of this normalized track
        if (!trackVersions[normalizedKey]) {
          trackVersions[normalizedKey] = [];
        }
        
        // Add this version if not already included
        const versionExists = trackVersions[normalizedKey].some(v => 
          v.trackName === entry.master_metadata_track_name && 
          v.artistName === entry.master_metadata_album_artist_name
        );
        
        if (!versionExists) {
          trackVersions[normalizedKey].push({
            trackName: entry.master_metadata_track_name,
            artistName: entry.master_metadata_album_artist_name,
            albumName: entry.master_metadata_album_album_name || 'Unknown Album',
            source: entry.source || 'unknown'
          });
        }
      } catch (err) {
        // Skip entries that cause errors
      }
    }
    
    // Store result in ref for future renders and update length
    const result = { trackVersions, validEntries };
    processedDataRef.current = result;
    previousRawDataLength.current = rawPlayData.length;
    
    console.timeEnd('preprocessRawData');
    
    return result;
  }, [rawPlayData]);

  // Extract feature artists efficiently
  const extractFeatureArtists = (trackName, artistName) => {
    let featureArtists = [];
    
    try {
      // Check track name for features
      if (trackName) {
        const trackResult = normalizeString(trackName);
        if (trackResult.featureArtists && trackResult.featureArtists.length > 0) {
          featureArtists = [...featureArtists, ...trackResult.featureArtists];
        }
      }
      
      // Check for & in artist name
      if (artistName && artistName.includes('&')) {
        const artistParts = artistName.split(/\s*&\s*/);
        if (artistParts.length > 1) {
          artistParts.slice(1).forEach(part => {
            if (!featureArtists.includes(part.trim())) {
              featureArtists.push(part.trim());
            }
          });
        }
      }
      
      // Check artist name for features
      if (artistName) {
        const artistResult = normalizeString(artistName);
        if (artistResult.featureArtists && artistResult.featureArtists.length > 0) {
          artistResult.featureArtists.forEach(artist => {
            if (!featureArtists.some(a => a.toLowerCase() === artist.toLowerCase())) {
              featureArtists.push(artist);
            }
          });
        }
      }
    } catch (err) {
      // Ignore errors
    }
    
    return featureArtists;
  };

  // More efficient function to get primary artist
  const getPrimaryArtist = (artistName) => {
    if (!artistName) return 'Unknown Artist';
    
    // Split by feature indicators
    const artistParts = artistName.split(/\s+(?:feat|ft|featuring|with)[. ]/i);
    
    // If artist name contains a feature separator
    if (artistParts.length > 1) {
      return artistParts[0].trim();
    }
    
    // Check for & format
    const ampParts = artistName.split(/\s*&\s*/);
    if (ampParts.length > 1) {
      return ampParts[0].trim();
    }
    
    return artistName;
  };

  // The filtered tracks based on all applied filters - optimized
  const filteredTracks = useMemo(() => {
    console.time('filteredTracks');
    
    const { trackVersions, validEntries } = preprocessRawData;
    
    if (validEntries.length === 0) {
      console.timeEnd('filteredTracks');
      return [];
    }
    
    const isAllTime = (!startDate || startDate === "") && (!endDate || endDate === "");
    
    const start = isAllTime ? new Date(0) : new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = isAllTime ? new Date() : new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // First filter by date range to reduce the dataset
    const dateFilteredEntries = isAllTime 
      ? validEntries 
      : validEntries.filter(entry => {
          try {
            const timestamp = new Date(entry.ts);
            return timestamp >= start && timestamp <= end;
          } catch (err) {
            return false;
          }
        });
    
    if (dateFilteredEntries.length === 0) {
      console.timeEnd('filteredTracks');
      return [];
    }
    
    const trackStats = {};
    
    // Process the filtered entries
    for (let i = 0; i < dateFilteredEntries.length; i++) {
      const entry = dateFilteredEntries[i];
      
      try {
        // Extract feature artists - do this once per entry
        const featureArtists = extractFeatureArtists(
          entry.master_metadata_track_name,
          entry.master_metadata_album_artist_name
        );
        
        // Get primary artist - do this once per entry
        const primaryArtist = getPrimaryArtist(entry.master_metadata_album_artist_name);
        
        // Get featured artist separately
        let featuredArtist = null;
        if (entry.master_metadata_album_artist_name !== primaryArtist) {
          const parts = entry.master_metadata_album_artist_name.split(/\s+(?:feat|ft|featuring|with)[. ]/i);
          if (parts.length > 1) {
            featuredArtist = parts.slice(1).join(' ').trim();
          }
        }
        
        // Check for album match
        const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
        let isAlbumMatch = true;
        
        if (selectedAlbums.length > 0) {
          isAlbumMatch = selectedAlbums.some(album => 
            album.name === albumName && 
            album.artist === entry.master_metadata_album_artist_name
          );
        }
        
        // Check if any selected artist matches
        const isArtistMatch = 
          selectedArtists.length === 0 || 
          selectedArtists.includes(entry.master_metadata_album_artist_name) ||
          selectedArtists.includes(primaryArtist);
        
        // Check if featured artist matches
        const isFeatureMatch = 
          (featureArtists.length > 0 && selectedArtists.some(artist => 
            featureArtists.some(feature => 
              feature.toLowerCase().includes(artist.toLowerCase())
            )
          )) || 
          (featuredArtist && selectedArtists.some(artist => 
            featuredArtist.toLowerCase().includes(artist.toLowerCase())
          ));
        
        // Apply all filters
        const shouldInclude = (
          isAlbumMatch &&
          (
            selectedArtists.length === 0 ||
            (onlyFeatures && isFeatureMatch) ||
            (!onlyFeatures && isArtistMatch) ||
            (!onlyFeatures && includeFeatures && isFeatureMatch)
          )
        );
        
        if (!shouldInclude) {
          continue;
        }
        
        // Create a key for tracking
        let key;
        try {
          key = createMatchKey(
            entry.master_metadata_track_name,
            primaryArtist
          );
        } catch (err) {
          key = `${entry.master_metadata_track_name}-${primaryArtist}`;
        }
        
        // Get normalized key for lookups
        const normalizedKey = normalizeTrackForMatching(
          entry.master_metadata_track_name,
          entry.master_metadata_album_artist_name
        );
        
        // Find best version of album name
        const trackLookupKey = `${entry.master_metadata_track_name.toLowerCase().trim()}|||${primaryArtist.toLowerCase().trim()}`;
        let lookupAlbumName = entry.master_metadata_album_album_name;
        
        if (!lookupAlbumName || lookupAlbumName === 'Unknown Album') {
          lookupAlbumName = albumMap.get(trackLookupKey) || 'Unknown Album';
        }
        
        // Update or create track entry
        if (!trackStats[key]) {
          trackStats[key] = {
            key,
            trackName: entry.master_metadata_track_name,
            artist: primaryArtist,
            fullArtist: entry.master_metadata_album_artist_name,
            albumName: lookupAlbumName,
            totalPlayed: 0,
            playCount: 0,
            featureArtists: featureArtists.length > 0 ? featureArtists : null,
            variations: [entry.master_metadata_track_name],
            artistVariations: [entry.master_metadata_album_artist_name],
            isFeatured: isFeatureMatch,
            featuredArtist,
            normalizedKey,
            displayName: entry.master_metadata_track_name,
            displayArtist: entry.master_metadata_album_artist_name
          };
        } else {
          // Add track name variation if new
          if (!trackStats[key].variations.includes(entry.master_metadata_track_name)) {
            trackStats[key].variations.push(entry.master_metadata_track_name);
          }
          
          // Add artist variation if new
          if (!trackStats[key].artistVariations.includes(entry.master_metadata_album_artist_name)) {
            trackStats[key].artistVariations.push(entry.master_metadata_album_artist_name);
          }
          
          // Update feature status if needed
          if (isFeatureMatch && !trackStats[key].isFeatured) {
            trackStats[key].isFeatured = true;
          }
          
          // Update album name if this one is better
          if (lookupAlbumName !== 'Unknown Album' && 
              (trackStats[key].albumName === 'Unknown Album' || entry.source === 'spotify')) {
            trackStats[key].albumName = lookupAlbumName;
          }
        }
        
        // Update play stats
        trackStats[key].totalPlayed += entry.ms_played;
        trackStats[key].playCount += 1;
      } catch (err) {
        console.warn("Error processing entry:", err);
      }
    }
    
    // Process tracks for display
    const tracks = Object.values(trackStats);
    
    // Select best display names
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      
      // Choose best track name: prefer one with "feat." in it if available
      if (track.variations && track.variations.length > 1) {
        const featVersion = track.variations.find(v => 
          v.includes('feat.') || v.includes('ft.') || v.includes('with'));
        if (featVersion) {
          track.displayName = featVersion;
        }
      }
      
      // Choose best artist name
      if (track.artistVariations && track.artistVariations.length > 1) {
        // Prefer format with "&" for display
        const ampersandVersion = track.artistVariations.find(a => a.includes('&'));
        if (ampersandVersion) {
          track.displayArtist = ampersandVersion;
        }
      }
    }
    
    // Filter out omitted content
    const filtered = tracks.filter(track => {
      // Skip if the song is omitted
      if (omittedSongs.some(s => s.key === track.key)) {
        return false;
      }
      
      // Skip if the artist is omitted
      if (omittedArtists.includes(track.artist)) {
        return false;
      }
      
      return true;
    });
    
    // Sort and slice
    const result = filtered.sort((a, b) => b[sortBy] - a[sortBy]).slice(0, topN);
    
    console.timeEnd('filteredTracks');
    return result;
  }, [
    preprocessRawData,
    startDate, 
    endDate, 
    topN, 
    sortBy, 
    selectedArtists, 
    selectedAlbums, 
    includeFeatures, 
    onlyFeatures, 
    albumMap, 
    omittedSongs, 
    omittedArtists
  ]);

  // Organizing tracks by year - memoized more efficiently
  const songsByYear = useMemo(() => {
    const yearGroups = {};
    
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      // Year range case
      const rangeKey = `${yearRange.startYear}-${yearRange.endYear}`;
      
      // Store under the range key (e.g., "2022-2022")
      yearGroups[rangeKey] = filteredTracks;
      
      // ALSO store under single year key if start and end are the same
      if (yearRange.startYear === yearRange.endYear) {
        // Important: Store under BOTH the year itself AND the date format if it's a specific date
        yearGroups[yearRange.startYear] = filteredTracks;
        
        // If this is a specific date format (YYYY-MM-DD), ensure we store it that way too
        if (yearRange.startYear.includes('-') && yearRange.startYear.split('-').length === 3) {
          yearGroups[yearRange.startYear] = filteredTracks;
        }
      }
      
      return yearGroups;
    } else if (selectedYear !== 'all') {
      // Single year case - put tracks under the selected year key
      return { [selectedYear]: filteredTracks };
    }
    
    // Default "all time" case
    return { all: filteredTracks };
  }, [filteredTracks, selectedYear, yearRangeMode, yearRange]);

  // Handle changes to feature toggles
  const handleFeatureToggleChange = (toggleType, value) => {
    if (toggleType === 'include') {
      setIncludeFeatures(value);
      if (onlyFeatures && value) {
        setOnlyFeatures(false);
      }
    } else {
      setOnlyFeatures(value);
      if (includeFeatures && value) {
        setIncludeFeatures(false);
      }
    }
  };

  // Helper function to clean path components for file system compatibility
  const cleanPathComponent = (text) => {
    if (!text) return 'Unknown';
    
    return text
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getDataForYearOrRange = (dataByYear, selectedYear, isRangeMode, yearRange) => {
    // Check for single year first
    if (dataByYear[selectedYear]) {
      return dataByYear[selectedYear];
    }
    
    // If this is a range with same start/end years, try the range key
    if (isRangeMode && yearRange.startYear === yearRange.endYear && 
        yearRange.startYear === selectedYear) {
      const rangeKey = `${yearRange.startYear}-${yearRange.endYear}`;
      return dataByYear[rangeKey] || [];
    }
    
    // Handle other cases...
    return [];
  };
  
  // Create M3U playlist content
  const createM3UContent = () => {
    if (filteredTracks.length === 0) {
      return '';
    }
    
    let content = '#EXTM3U\n';
    
    filteredTracks.forEach((track, index) => {
      const durationSecs = Math.round(track.totalPlayed / (track.playCount || 1) / 1000);
      
      content += `#EXTINF:${durationSecs},${track.artist} - ${track.trackName}\n`;
      
      const artist = cleanPathComponent(track.artist);
      const album = cleanPathComponent(track.albumName || 'Unknown Album');
      const trackName = cleanPathComponent(track.trackName);
      
      let filePath;
      
      if (pathFormat === 'default') {
        filePath = `${musicBasePath}/${artist}/${artist}-${album}/${trackName}.${fileExtension}`;
      } else {
        filePath = customPathFormat
          .replace('{basePath}', musicBasePath)
          .replace('{artist}', artist)
          .replace('{album}', album)
          .replace('{track}', trackName)
          .replace('{ext}', fileExtension)
          .replace('{index}', (index + 1).toString().padStart(3, '0'));
      }
      
      content += `${filePath}\n`;
    });
    
    return content;
  };
  
  // Export the playlist
  const exportPlaylist = () => {
    if (filteredTracks.length === 0) {
      alert('No tracks to export');
      return;
    }
    
    const content = createM3UContent();
    if (!content) {
      alert('Error creating playlist content');
      return;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedPlaylistName = playlistName.replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${sanitizedPlaylistName}-${timestamp}.m3u`;
    
    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Function to get page title based on date selection
  const getPageTitle = () => {
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return <span>Songs <span className="text-xs opacity-75">{yearRange.startYear}-{yearRange.endYear}</span></span>;
    } else if (selectedYear !== 'all') {
      if (selectedYear.includes('-')) {
        const parts = selectedYear.split('-');
        if (parts.length === 3) {
          // Display format for a specific date (YYYY-MM-DD)
          const date = new Date(selectedYear);
          if (!isNaN(date.getTime())) {
            const dateStr = date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            return <span>Songs <span className="text-xs opacity-75">{dateStr}</span></span>;
          }
        } else if (parts.length === 2) {
          // Display format for a specific month (YYYY-MM)
          const year = parts[0];
          const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
          const date = new Date(year, month, 1);
          if (!isNaN(date.getTime())) {
            const dateStr = date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long'
            });
            return <span>Songs <span className="text-xs opacity-75">{dateStr}</span></span>;
          }
        }
        return <span>Songs <span className="text-xs opacity-75">{selectedYear}</span></span>;
      }
      return <span>Songs <span className="text-xs opacity-75">{selectedYear}</span></span>;
    } else {
      return <span>Songs <span className="text-xs opacity-75">all-time</span></span>;
    }
  };

  // Get formatted date range string
  const getFormattedDateRange = () => {
    if ((!startDate && !endDate) || selectedYear === 'all') {
      return "All Time";
    }
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const startStr = start.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        const endStr = end.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        
        return `${startStr} to ${endStr}`;
      }
    } catch (error) {
      console.error("Error formatting date range:", error);
    }
    
    // Fallback if date formatting fails
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `${yearRange.startYear} to ${yearRange.endYear}`;
    } else if (selectedYear !== 'all') {
      return selectedYear;
    }
    
    return "Custom Date Range";
  };

  // Updated renderTrackRow function with omit buttons preserved
  const renderTrackRow = (song, index) => {
    if (viewMode === 'mobile') {
      // Mobile view - simplified 2-column table like artists tab
      return (
        <tr 
          key={song.key} 
          className={`border-b ${colors.border} dark:${colors.borderDark} hover:${colors.bg} dark:${colors.hoverBgDark} ${song.isFeatured ? `${colors.bg} dark:${colors.hoverBgDark}` : ''}`}
        >
          <td className={`p-2 ${colors.text}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">#{index + 1} {song.displayName || song.trackName}</div>
                <div className={`text-sm ${colors.textLighter}`}>
                  {song.displayArtist || song.artist}
                  {song.isFeatured && (
                    <span className={`inline-block px-1 py-0.5 ml-1 ${colors.bgMed} ${colors.text} rounded text-xs`}>
                      FEAT
                    </span>
                  )}
                </div>
                <div className={`text-xs ${colors.textLighter}`}>{song.albumName}</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => omitSong(song)}
                  className={`p-1 ${colors.textLight} hover:${colors.textDark} rounded`}
                  title="Omit this song"
                >
                  <XCircle size={12} />
                </button>
              </div>
            </div>
          </td>
          <td className={`p-2 text-right ${colors.text}`}>
            <div>{formatDuration(song.totalPlayed)}</div>
            <div className={`text-sm ${colors.textLighter}`}>{song.playCount} plays</div>
          </td>
        </tr>
      );
    } else if (viewMode === 'compact') {
      // Compact view - like artists tab compact view
      return (
        <tr 
          key={song.key} 
          className={`border-b ${colors.border} dark:${colors.borderDark} hover:${colors.bg} dark:${colors.hoverBgDark} ${song.isFeatured ? `${colors.bgLight} dark:${colors.hoverBgDark}` : ''}`}
        >
          <td className={`p-1 sm:p-2 ${colors.text} font-medium text-xs sm:text-sm`}>{index + 1}</td>
          <td className={`p-1 sm:p-2 ${colors.text} text-xs sm:text-sm`}>
            <div className="flex items-center">
              {song.isFeatured && (
                <span className={`inline-block px-1 py-0.5 mr-1 ${colors.bgMed} ${colors.text} rounded text-xs`}>
                  FEAT
                </span>
              )}
              <div>{song.displayName || song.trackName}</div>
            </div>
          </td>
          <td className={`p-1 sm:p-2 ${colors.text} text-xs sm:text-sm`}>{song.displayArtist || song.artist}</td>
          <td className={`p-1 sm:p-2 ${colors.text} text-xs sm:text-sm hidden sm:table-cell`}>{song.albumName}</td>
          <td className={`p-1 sm:p-2 text-right ${colors.text} text-xs sm:text-sm`}>{formatDuration(song.totalPlayed)}</td>
          <td className={`p-1 sm:p-2 text-right ${colors.text} text-xs sm:text-sm`}>{song.playCount}</td>
          <td className="p-1 sm:p-2 text-center relative">
            <button
              onClick={() => setShowOmitDropdown(showOmitDropdown === song.key ? null : song.key)}
              className={`p-1 ${colors.textLight} hover:${colors.textDark} rounded`}
              title="Omit options"
            >
              <XCircle size={12} />
            </button>
            
            {showOmitDropdown === song.key && (
              <div className={`absolute bottom-full mb-1 right-full mr-1 ${colors.bg} border ${colors.border} rounded shadow-lg z-50 min-w-max`}>
                <button
                  onClick={() => {
                    omitSong(song);
                    setShowOmitDropdown(null);
                  }}
                  className={`block w-full px-3 py-2 text-left text-xs ${colors.text} ${colors.hoverBg}`}
                >
                  Omit song
                </button>
                <button
                  onClick={() => {
                    omitArtist(song.artist);
                    setShowOmitDropdown(null);
                  }}
                  className={`block w-full px-3 py-2 text-left text-xs ${colors.text} ${colors.hoverBg} border-t ${colors.border}`}
                >
                  Omit artist
                </button>
              </div>
            )}
          </td>
        </tr>
      );
    }
  };
return (
  <div>
    {/* Title - mobile gets its own row */}
    <div className="hidden">
      <h3 className={`text-xl ${colors.text}`}>
        {getPageTitle()}
      </h3>
    </div>

    {/* Desktop layout - title, controls, and search on same row */}
    <div className="hidden sm:flex justify-between items-center gap-2 mb-2">
      <h3 className={`text-xl ${colors.text} whitespace-nowrap`}>
        {getPageTitle()}
      </h3>

      <div className="flex items-center gap-2 flex-1">
        <div className="relative flex-1">
          <input
            type="text"
            value={unifiedSearch}
            onChange={(e) => {
              setUnifiedSearch(e.target.value);
              setArtistSearch(e.target.value);
              setAlbumSearch(e.target.value);
            }}
            placeholder="Search artists or albums..."
            className={`w-full border rounded px-2 py-1 text-sm ${colors.bg} ${colors.border} ${colors.text} ${colors.focusBorder} ${colors.focusRing}`}
          />
          {unifiedSearch && (
            <button
              onClick={() => { setUnifiedSearch(''); setArtistSearch(''); setAlbumSearch(''); }}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${colors.text} hover:opacity-70`}
            >
              ×
            </button>
          )}
          {unifiedSearch && (filteredArtists.length > 0 || filteredAlbums.length > 0) && (
            <div className={`absolute z-10 mt-1 w-full ${colors.bg} border ${colors.border} rounded-md shadow-lg max-h-60 overflow-y-auto`}>
              {filteredArtists.length > 0 && (
                <div>
                  <div className={`px-2 py-1 ${colors.bgLight} ${colors.textDark} font-semibold text-xs`}>ARTISTS</div>
                  {filteredArtists.map(artist => (
                    <div
                      key={artist}
                      onClick={() => {
                        addArtistFromTrack(artist);
                        setUnifiedSearch('');
                      }}
                      className={`px-2 py-1 ${colors.text} ${colors.hoverBg} cursor-pointer`}
                    >
                      <span className="mr-1">👤</span> {artist}
                    </div>
                  ))}
                </div>
              )}
              {filteredAlbums.length > 0 && (
                <div>
                  <div className={`px-2 py-1 ${colors.bgLight} ${colors.textDark} font-semibold text-xs`}>ALBUMS</div>
                  {filteredAlbums.map(album => (
                    <div
                      key={album.key}
                      onClick={() => {
                        addAlbumFromTrack(album.name, album.artist);
                        setUnifiedSearch('');
                      }}
                      className={`px-2 py-1 ${colors.text} ${colors.hoverBg} cursor-pointer`}
                    >
                      <span className="mr-1">💿</span> {album.name} <span className={`text-xs ${colors.textLight}`}>({album.artist})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <label className={`${colors.text} text-xs`}>Show Top</label>
        <input
          type="number"
          min="1"
          max="999"
          defaultValue={topN}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
          onBlur={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= 999) setTopN(v); else e.target.value = topN; }}
          className={`w-14 border rounded px-1.5 py-1 text-xs ${colors.bg} ${colors.border} ${colors.text}`}
        />

        <label className={`${colors.text} text-xs`}>Sort by</label>
        <button
          onClick={() => setSortBy(sortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.bgDark} ${colors.bgDarkHover}`}
        >
          {sortBy === 'totalPlayed' ? 'Time' : 'Plays'}
        </button>
        <button
          onClick={() => setViewMode(viewMode === 'grid' ? 'compact' : 'grid')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.bgDark} ${colors.bgDarkHover}`}
        >
          {viewMode === 'grid' ? '☰' : '▦'}
        </button>
        <button
          onClick={() => setShowOmittedTab(!showOmittedTab)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${showOmittedTab ? colors.bgDark : `${colors.bgLight} ${colors.text} border ${colors.border} hover:${colors.bgMed}`}`}
        >
          <Eye size={12} />
          {showOmittedTab ? 'Results' : `Omitted (${omittedSongs.length + omittedArtists.length})`}
        </button>
        <button
          onClick={() => setShowPlaylistExporter(true)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${colors.bgDark} ${colors.bgDarkHover}`}
        >
          <Download size={12} />
          M3U
        </button>
      </div>
    </div>

    {/* Mobile controls - single row with search */}
    <div className="block sm:hidden mb-2">
      <div className="flex items-center gap-1 flex-wrap">
        <label className={`${colors.text} text-xs`}>Top</label>
        <input
          type="number"
          min="1"
          max="999"
          defaultValue={topN}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
          onBlur={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= 999) setTopN(v); else e.target.value = topN; }}
          className={`w-10 border rounded px-1 py-1 ${colors.bg} ${colors.border} ${colors.text} text-xs`}
        />
        <button
          onClick={() => setSortBy(sortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${colors.bgDark} ${colors.bgDarkHover}`}
        >
          {sortBy === 'totalPlayed' ? 'Time' : 'Plays'}
        </button>
        <button
          onClick={() => setShowOmittedTab(!showOmittedTab)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${showOmittedTab ? colors.bgDark : `${colors.bgLight} ${colors.text} border ${colors.border}`}`}
        >
          <Eye size={10} />
          {showOmittedTab ? 'Results' : `Omit (${omittedSongs.length + omittedArtists.length})`}
        </button>
        <button
          onClick={() => setShowPlaylistExporter(true)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${colors.bgDark} ${colors.bgDarkHover}`}
        >
          M3U
        </button>
        <div className="relative flex-1">
          <input
            type="text"
            value={unifiedSearch}
            onChange={(e) => {
              setUnifiedSearch(e.target.value);
              setArtistSearch(e.target.value);
              setAlbumSearch(e.target.value);
            }}
            placeholder="Search..."
            className={`w-full border rounded px-2 py-1 text-xs ${colors.bg} ${colors.border} ${colors.text} ${colors.focusBorder} ${colors.focusRing}`}
          />
          {unifiedSearch && (
            <button
              onClick={() => { setUnifiedSearch(''); setArtistSearch(''); setAlbumSearch(''); }}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${colors.text} hover:opacity-70`}
            >
              ×
            </button>
          )}
          {unifiedSearch && (filteredArtists.length > 0 || filteredAlbums.length > 0) && (
            <div className={`absolute z-10 mt-1 w-full ${colors.bg} border ${colors.border} rounded-md shadow-lg max-h-60 overflow-y-auto`}>
              {filteredArtists.length > 0 && (
                <div>
                  <div className={`px-2 py-1 ${colors.bgLight} ${colors.textDark} font-semibold text-xs`}>ARTISTS</div>
                  {filteredArtists.map(artist => (
                    <div
                      key={artist}
                      onClick={() => {
                        addArtistFromTrack(artist);
                        setUnifiedSearch('');
                      }}
                      className={`px-2 py-1 ${colors.text} ${colors.hoverBg} cursor-pointer`}
                    >
                      <span className="mr-1">👤</span> {artist}
                    </div>
                  ))}
                </div>
              )}
              {filteredAlbums.length > 0 && (
                <div>
                  <div className={`px-2 py-1 ${colors.bgLight} ${colors.textDark} font-semibold text-xs`}>ALBUMS</div>
                  {filteredAlbums.map(album => (
                    <div
                      key={album.key}
                      onClick={() => {
                        addAlbumFromTrack(album.name, album.artist);
                        setUnifiedSearch('');
                      }}
                      className={`px-2 py-1 ${colors.text} ${colors.hoverBg} cursor-pointer`}
                    >
                      <span className="mr-1">💿</span> {album.name} <span className={`text-xs ${colors.textLight}`}>({album.artist})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Selected filters display */}
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedArtists.map(artist => (
          <div
            key={artist}
            className={`flex items-center ${colors.bgDark} px-2 py-1 rounded text-xs`}
          >
            {artist}
            <button 
              onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
              className={`ml-1 text-white ${colors.hoverText}`}
            >
              ×
            </button>
          </div>
        ))}
        
        {selectedAlbums.map(album => (
          <div 
            key={album.key} 
            className={`flex items-center ${colors.bg}0 text-white px-2 py-1 rounded text-xs`}
          >
            <span className="mr-1">💿</span> {album.name} 
            <button 
              onClick={() => setSelectedAlbums(prev => prev.filter(a => a.key !== album.key))}
              className={`ml-1 text-white ${colors.hoverText}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      
      {/* Feature Toggles + Sort Controls in one row */}
      <div className="flex flex-wrap justify-between items-center mt-3">
        {/* Feature Toggles */}
        {selectedArtists.length > 0 && (
          <label className={`flex items-center cursor-pointer ${onlyFeatures ? 'opacity-50' : ''}`}>
            <div className="relative">
              <input 
                type="checkbox" 
                checked={includeFeatures} 
                disabled={onlyFeatures}
                onChange={() => handleFeatureToggleChange('include', !includeFeatures)}
                className="sr-only"
              />
              <div className={`block w-8 sm:w-10 h-5 sm:h-6 rounded-full ${includeFeatures ? `${colors.bg}0` : 'bg-gray-300'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-3 sm:w-4 h-3 sm:h-4 rounded-full transition-transform ${includeFeatures ? 'transform translate-x-3 sm:translate-x-4' : ''}`}></div>
            </div>
            <span className={`ml-2 ${colors.text} text-xs sm:text-sm`}>
              Include features 
            </span>
          </label>
        )}

      </div>

    {/* Playlist Exporter */}
    {showPlaylistExporter && (
      <PlaylistExporter
        processedData={filteredTracks}
        songsByYear={songsByYear}
        selectedYear={selectedYear !== 'all' ? selectedYear : 'all'}
        colorTheme={colorTheme}
      />
    )}

    <div className="mt-4"></div>

    {/* Show either omitted content tab or normal results */}
    {showOmittedTab ? (
      <div className={`border rounded-lg p-3 sm:p-4 ${colors.bg} ${colors.border}`}>
        <h3 className={`text-xl font-normal ${colors.text} mb-4`}>Omitted Content</h3>
        
        {omittedArtists.length > 0 && (
          <div className="mb-4">
            <h4 className={`font-semibold ${colors.textLight} mb-2`}>Omitted Artists</h4>
            <div className="flex flex-wrap gap-2">
              {omittedArtists.map(artist => (
                <div
                  key={artist}
                  className={`flex items-center ${colors.bgDark} px-2 py-1 rounded text-xs`}
                >
                  {artist}
                  <button 
                    onClick={() => unomitArtist(artist)}
                    className={`ml-2 text-white ${colors.hoverText}`}
                  >
                    Un-omit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {omittedSongs.length > 0 && (
          <div>
            <h4 className={`font-semibold ${colors.textLight} mb-2`}>Omitted Songs</h4>
            <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4">
              <table className={`w-full border-collapse ${colors.bg}`}>
                <thead>
                  <tr className={`border-b ${colors.border}`}>
                    <th className={`p-2 text-left ${colors.text}`}>Track</th>
                    <th className={`p-2 text-left ${colors.text}`}>Artist</th>
                    <th className={`p-2 text-left ${colors.text}`}>Album</th>
                    <th className={`p-2 text-right ${colors.text}`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {omittedSongs.map(song => (
                    <tr key={song.key} className={`border-b ${colors.border} hover:${colors.hoverBg}`}>
                      <td className={`p-2 ${colors.text}`}>{song.trackName}</td>
                      <td className={`p-2 ${colors.text}`}>{song.artist}</td>
                      <td className={`p-2 ${colors.text}`}>{song.albumName}</td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => unomitSong(song.key)}
                          className={`px-2 py-1 ${colors.bgDark} rounded text-xs ${colors.bgDarkHover}`}
                        >
                          Un-omit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {omittedSongs.length === 0 && omittedArtists.length === 0 && (
          <div className={`text-center py-4 ${colors.textLighter}`}>
            No songs or artists have been omitted yet
          </div>
        )}
      </div>
    ) : (
      /* Results section */
      <div>
        {filteredTracks.length > 0 ? (
          viewMode === 'grid' ? (
            // Grid view - like artists tab grid
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredTracks.map((song, index) => (
                <div
                  key={song.key}
                  className={`p-3 border rounded-lg ${colors.bgLight} ${colors.border} shadow-sm hover:shadow-md transition-shadow relative`}
                >
                  {song.isFeatured && (
                    <span className={`inline-block px-1 py-0.5 mb-2 ${colors.bgMed} ${colors.text} rounded text-xs`}>
                      FEAT
                    </span>
                  )}

                  <div className={`font-bold ${colors.text}`}>{song.displayName || song.trackName}</div>
                  <div className={`text-sm ${colors.textLight}`}>
                    Artist: <span
                      className="font-bold cursor-pointer hover:underline"
                      onClick={() => addArtistFromTrack(song.displayArtist || song.artist)}
                    >
                      {song.displayArtist || song.artist}
                    </span>
                    <br/>
                    Album: <span
                      className="font-bold cursor-pointer hover:underline"
                      onClick={() => addAlbumFromTrack(song.albumName, song.artist)}
                    >
                      {song.albumName}
                    </span>
                    <br/>
                    Total Time: <span className="font-bold">{formatDuration(song.totalPlayed)}</span>
                    <br/>
                    Plays: <span className="font-bold">{song.playCount}</span>
                  </div>

                  <div className={`absolute top-1 right-3 ${colors.text} text-[2rem]`}>{index + 1}</div>

                  <div className="mt-2">
                    <div className="flex justify-center relative">
                      <button
                        onClick={() => setShowOmitDropdown(showOmitDropdown === song.key ? null : song.key)}
                        className={`p-1 ${colors.textLight} hover:${colors.textDark} rounded`}
                        title="Omit options"
                      >
                        <XCircle size={12} />
                      </button>
                      
                      {showOmitDropdown === song.key && (
                        <div className={`absolute bottom-full mb-1 ${colors.bg} border ${colors.border} rounded shadow-lg z-50 min-w-max`}>
                          <button
                            onClick={() => {
                              omitSong(song);
                              setShowOmitDropdown(null);
                            }}
                            className={`block w-full px-3 py-2 text-left text-xs ${colors.text} ${colors.hoverBg}`}
                          >
                            Omit song
                          </button>
                          <button
                            onClick={() => {
                              omitArtist(song.artist);
                              setShowOmitDropdown(null);
                            }}
                            className={`block w-full px-3 py-2 text-left text-xs ${colors.text} ${colors.hoverBg} border-t ${colors.border}`}
                          >
                            Omit artist
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'mobile' ? (
            // Mobile view - 2-column table like artists tab
            <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={`border-b ${colors.border} dark:${colors.borderDark}`}>
                    <th className={`p-2 text-left ${colors.text}`}>Track Info</th>
                    <th className={`p-2 text-right ${colors.text}`}>Stats</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTracks.map(renderTrackRow)}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'compact' ? (
            // Compact view - list table
            <div className="overflow-x-auto mt-2">
                <div className="w-full">
                  <table className="w-full border-collapse text-sm sm:text-base">
                    <thead>
                      <tr className={`border-b ${colors.border} dark:${colors.borderDark}`}>
                        <th className={`p-1 sm:p-2 text-left ${colors.text} text-xs sm:text-sm`}>Rank</th>
                        <th className={`p-1 sm:p-2 text-left ${colors.text} text-xs sm:text-sm`}>Track</th>
                        <th className={`p-1 sm:p-2 text-left ${colors.text} text-xs sm:text-sm`}>Artist</th>
                        <th className={`p-1 sm:p-2 text-left ${colors.text} text-xs sm:text-sm hidden sm:table-cell`}>Album</th>
                        <th className={`p-1 sm:p-2 text-right ${colors.text} text-xs sm:text-sm`}>Time</th>
                        <th className={`p-1 sm:p-2 text-right ${colors.text} text-xs sm:text-sm`}>Plays</th>
                        <th className={`p-1 sm:p-2 text-center ${colors.text} text-xs sm:text-sm`}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTracks.map(renderTrackRow)}
                    </tbody>
                  </table>
                </div>
              </div>
          ) : (
            // Default view - should not happen
            <div>Unknown view mode</div>
          )
        ) : (
          <div className={`text-center py-4 ${colors.textLighter}`}>
            {startDate || endDate || selectedArtists.length > 0 || selectedAlbums.length > 0 
              ? 'No tracks found matching your filters' 
              : 'Select filters to view tracks'}
          </div>
        )}
      </div>
    )}
  </div>
); 
};

export default CustomTrackRankings;