"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { streamingProcessor, STREAMING_TYPES, STREAMING_SERVICES, filterDataByDate } from './streaming-adapter.js';
import ExportButton from './ExportButton.js';
import CustomTrackRankings from './CustomTrackRankings.js';
import TrackRankings from './TrackRankings.js';
import PodcastRankings from './podcast-rankings.js';
import _ from 'lodash';
import ListeningPatterns from './listening-patterns.js';
import ListeningBehavior from './listening-behavior.js';
import DiscoveryAnalysis from './discovery-analysis.js';
import { X, Trash2, Check, ChevronUp, ChevronDown, Download } from 'lucide-react';
import YearSelector from './year-selector.js';
import SupportOptions from './support-options.js';
import AlbumCard from './albumcard.js';
import CustomPlaylistCreator from './customplaylist.js';
import UpdatesSection from './updatessection.js';
import ExcelPreview from './excelpreview.js';
// Removed imports of exported variables that were conflicting with local state
import DarkModeToggle from './darkmode.js';
import { useTheme } from './themeprovider.js';

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
    selected: 'bg-pink-500 text-white'
  }
};

const SpotifyAnalyzer = ({ activeTab, setActiveTab, TopTabsComponent }) => {
  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Core application state
  const [activeTrackTab, setActiveTrackTab] = useState('top250');
  const [songsByMonth, setSongsByMonth] = useState({});
  const [songsByYear, setSongsByYear] = useState({});
  const [processedData, setProcessedData] = useState([]);
  const [selectedServices, setSelectedServices] = useState(['spotify']);
  const [topArtists, setTopArtists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [topArtistsCount, setTopArtistsCount] = useState(10);
  const [artistsViewMode, setArtistsViewMode] = useState('grid'); // 'grid', 'compact', 'mobile'
  const [topAlbumsCount, setTopAlbumsCount] = useState(20);
  const [albumsCompactView, setAlbumsCompactView] = useState(false);
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
  const [selectedTrackYear, setSelectedTrackYear] = useState('all');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedFileList, setUploadedFileList] = useState(null);
  const [selectedArtistYear, setSelectedArtistYear] = useState('all');
  const [showServiceInfo, setShowServiceInfo] = useState({});
  // Add date range states for artists (like CustomTrackRankings)
  const [artistStartDate, setArtistStartDate] = useState('');
  const [artistEndDate, setArtistEndDate] = useState('');
  const [selectedAlbumYear, setSelectedAlbumYear] = useState('all');
  const [albumYearRangeMode, setAlbumYearRangeMode] = useState(false);
  const [albumYearRange, setAlbumYearRange] = useState({ startYear: '', endYear: '' });
  const [albumsByYear, setAlbumsByYear] = useState({});
  // Add date range states for albums (like CustomTrackRankings)
  const [albumStartDate, setAlbumStartDate] = useState('');
  const [albumEndDate, setAlbumEndDate] = useState('');
  const [customTrackYear, setCustomTrackYear] = useState('all');
  const [customYearRange, setCustomYearRange] = useState({ startYear: '', endYear: '' });
  const [customYearRangeMode, setCustomYearRangeMode] = useState(false);
  const [showYearSidebar, setShowYearSidebar] = useState(true);
  const [yearSelectorExpanded, setYearSelectorExpanded] = useState(false);
  const [yearSelectorPosition, setYearSelectorPosition] = useState('right');
  const [yearSelectorWidth, setYearSelectorWidth] = useState(32);
  const [sidebarColorTheme, setSidebarColorTheme] = useState('teal');
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
      return `${albumYearRange.startYear}-${albumYearRange.endYear} Albums`;
    }
    return `${selectedAlbumYear} Albums`;
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

  // Simplified albums filtering using date range approach (like CustomTrackRankings)  
  const displayedAlbums = useMemo(() => {
    
    // If all-time, use the existing topAlbums
    if (selectedAlbumYear === 'all') {
      return JSON.parse(JSON.stringify(topAlbums));
    }
    
    // Use date range filtering approach
    const isAllTime = (!albumStartDate || albumStartDate === "") && (!albumEndDate || albumEndDate === "");
    const start = isAllTime ? new Date(0) : new Date(albumStartDate);
    start.setHours(0, 0, 0, 0);
    const end = isAllTime ? new Date() : new Date(albumEndDate);
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
    
    // Group by albums
    const albumMap = new Map();
    dateFilteredEntries.forEach(entry => {
      if (!entry.master_metadata_album_artist_name || !entry.master_metadata_album_album_name) return;
      
      const artistName = entry.master_metadata_album_artist_name;
      const albumName = entry.master_metadata_album_album_name;
      const trackName = entry.master_metadata_track_name || 'Unknown Track';
      const key = `${albumName}-${artistName}`;
      const timestamp = new Date(entry.ts);
      
      if (!albumMap.has(key)) {
        albumMap.set(key, {
          name: albumName,
          artist: artistName,
          totalPlayed: 0,
          playCount: 0,
          trackCount: new Set(),
          trackNames: new Set(),
          trackObjects: [],
          firstListen: timestamp.getTime()
        });
      }
      
      const album = albumMap.get(key);
      album.totalPlayed += entry.ms_played || 0;
      album.playCount++;
      
      // Track first listen date
      if (timestamp < new Date(album.firstListen)) {
        album.firstListen = timestamp.getTime();
      }
      
      if (trackName) {
        album.trackNames.add(trackName);
        album.trackCount.add(trackName);
        
        // Find or create track object
        let trackObj = album.trackObjects.find(t => t.trackName === trackName);
        if (!trackObj) {
          trackObj = {
            trackName: trackName,
            artist: artistName,
            totalPlayed: 0,
            playCount: 0,
            albumName: albumName
          };
          album.trackObjects.push(trackObj);
        }
        
        // Update track stats
        trackObj.totalPlayed += entry.ms_played || 0;
        trackObj.playCount++;
      }
    });
    
    // Process albums - convert Sets to values and sort tracks
    albumMap.forEach(album => {
      album.trackCountValue = album.trackCount.size;
      album.trackObjects.sort((a, b) => b.totalPlayed - a.totalPlayed);
      // Clean up Sets as they're not needed anymore
      delete album.trackCount;
      delete album.trackNames;
    });
    
    return Array.from(albumMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
  }, [selectedAlbumYear, albumStartDate, albumEndDate, topAlbums, rawPlayData]);


  // Toggle a service in the selection with useCallback
  const toggleServiceSelection = useCallback((serviceType) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceType)) {
        return prev.filter(s => s !== serviceType);
      } else {
        return [...prev, serviceType];
      }
    });
  }, []);

  // Toggle service info visibility with useCallback
  const toggleServiceInfo = useCallback((serviceType) => {
    setShowServiceInfo(prev => ({
      ...prev,
      [serviceType]: !prev[serviceType]
    }));
  }, []);

  // Get accepted file formats for all selected services with useMemo
  const getAcceptedFormats = useCallback(() => {
    // Use a Set to eliminate duplicates
    const formatSet = new Set();
    
    selectedServices.forEach(service => {
      const formats = STREAMING_SERVICES[service].acceptedFormats.split(',');
      formats.forEach(format => formatSet.add(format));
    });
    
    return Array.from(formatSet).join(',');
  }, [selectedServices]);

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
    
    // If all-time, use the existing topArtists
    if (selectedArtistYear === 'all') {
      return topArtists;
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
    
    // Group by artists
    const artistMap = new Map();
    dateFilteredEntries.forEach(entry => {
      if (!entry.master_metadata_album_artist_name) return;
      
      const artistName = entry.master_metadata_album_artist_name;
      const trackName = entry.master_metadata_track_name || 'Unknown';
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
    
    return Array.from(artistMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
  }, [selectedArtistYear, artistStartDate, artistEndDate, topArtists, rawPlayData]);

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
  const getTracksTabLabel = useCallback(() => { 
    if (selectedTrackYear === 'all') { 
      return 'All-time Brief Obsessions'; 
    } 
    return `Brief Obsessions ${selectedTrackYear}`; 
  }, [selectedTrackYear]);

  const getArtistsTabLabel = useCallback(() => {
    if (selectedArtistYear === 'all') {
      return 'All-time Artists';
    } else if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `${yearRange.startYear}-${yearRange.endYear} Artists`;
    }
    return `${selectedArtistYear} Artists`;
  }, [selectedArtistYear, yearRangeMode, yearRange]);

  const getCustomTabLabel = useCallback(() => {
    if (customYearRangeMode && customYearRange.startYear && customYearRange.endYear) {
      return `${customYearRange.startYear}-${customYearRange.endYear} Custom`;
    } else if (customTrackYear === 'all') {
      return 'All-time Custom';
    }
    return `${customTrackYear} Custom`;
  }, [customYearRangeMode, customYearRange, customTrackYear]);

  const getPatternsTabLabel = useCallback(() => {
    if (patternYearRangeMode && patternYearRange.startYear && patternYearRange.endYear) {
      return `${patternYearRange.startYear}-${patternYearRange.endYear} Patterns`;
    } else if (selectedPatternYear === 'all') {
      return 'All-time Patterns';
    }
    return `${selectedPatternYear} Patterns`;
  }, [patternYearRangeMode, patternYearRange, selectedPatternYear]);

  const getBehaviorTabLabel = useCallback(() => {
    if (behaviorYearRangeMode && behaviorYearRange.startYear && behaviorYearRange.endYear) {
      return `${behaviorYearRange.startYear}-${behaviorYearRange.endYear} Behavior`;
    } else if (selectedBehaviorYear === 'all') {
      return 'All-time Behavior';
    }
    return `${selectedBehaviorYear} Behavior`;
  }, [behaviorYearRangeMode, behaviorYearRange, selectedBehaviorYear]);

  const getDiscoveryTabLabel = useCallback(() => {
    if (discoveryYearRangeMode && discoveryYearRange.startYear && discoveryYearRange.endYear) {
      return `${discoveryYearRange.startYear}-${discoveryYearRange.endYear} Discovery`;
    } else if (selectedDiscoveryYear === 'all') {
      return 'All-time Discovery';
    }
    return `${selectedDiscoveryYear} Discovery`;
  }, [discoveryYearRangeMode, discoveryYearRange, selectedDiscoveryYear]);

  const getPodcastsTabLabel = useCallback(() => {
    if (podcastYearRangeMode && podcastYearRange.startYear && podcastYearRange.endYear) {
      return `${podcastYearRange.startYear}-${podcastYearRange.endYear} Podcasts`;
    } else if (selectedPodcastYear === 'all') {
      return 'All-time Podcasts';
    }
    return `${selectedPodcastYear} Podcasts`;
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
    const sidebarTabs = ['artists', 'albums', 'tracks', 'patterns', 'behavior', 'custom', 'discovery', 'podcasts'];
    return sidebarTabs.includes(tabName);
  }, []);

  // Update sidebar visibility and color theme when tab changes
  useEffect(() => {
    // Determine if sidebar should be shown for the current tab
    const showSidebar = shouldShowSidebar(activeTab);
    setShowYearSidebar(showSidebar);
    
    // Set the appropriate color theme based on the active tab
    switch(activeTab) {
      case 'artists':
        setSidebarColorTheme('teal');
        break;
      case 'albums':
        setSidebarColorTheme('pink');
        break;
      case 'tracks':
        setSidebarColorTheme('blue');
        break;
      case 'patterns':
        setSidebarColorTheme('purple');
        break;
      case 'behavior':
        setSidebarColorTheme('indigo');
        break;
      case 'custom':
        setSidebarColorTheme('orange');
        break;
      case 'discovery':
        setSidebarColorTheme('green');
        break;
      case 'podcasts':
        setSidebarColorTheme('indigo');
        break;
      default:
        setSidebarColorTheme('teal');
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
      case 'tracks':
        setSelectedTrackYear(year);
        break;
      case 'custom':
        handleCustomTrackYearChange(year);
        break;
      case 'patterns':
        setSelectedPatternYear(year);
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

  // Calculate margin based on year selector width using proper Tailwind classes
  const getYearSelectorMargin = () => {
    if (!showYearSidebar) return '';
    
    // Always reset all margins first, then apply the correct one
    let classes = '';
    
    if (typeof yearSelectorWidth === 'number') {
      // Collapsed width (32px = w-8)
      if (yearSelectorPosition === 'left') {
        classes = 'ml-8 mr-0';
      } else if (yearSelectorPosition === 'right') {
        classes = 'mr-8 ml-0';
      } else {
        classes = 'mb-12 ml-0 mr-0';
      }
    } else {
      // Expanded width - use the closest matching Tailwind classes
      const { mobile, desktop } = yearSelectorWidth;
      // mobile: 192px = w-48, desktop: 256px = w-64 for range mode
      // mobile: 64px = w-16, desktop: 128px = w-32 for single mode
      if (mobile === 192 && desktop === 256) {
        // Range mode - match the actual visual width more closely
        if (yearSelectorPosition === 'left') {
          classes = 'ml-48 sm:ml-64 mr-0';
        } else if (yearSelectorPosition === 'right') {
          classes = 'mr-48 sm:mr-64 ml-0';
        } else {
          classes = 'mb-12 ml-0 mr-0';
        }
      } else {
        // Single mode - match the actual visual width more closely
        if (yearSelectorPosition === 'left') {
          classes = 'ml-16 sm:ml-32 mr-0';
        } else if (yearSelectorPosition === 'right') {
          classes = 'mr-16 sm:mr-32 ml-0';
        } else {
          classes = 'mb-12 ml-0 mr-0';
        }
      }
    }
    
    return classes;
  };

  return (
    <div className="w-full h-full">
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
          getTracksTabLabel={getTracksTabLabel}
          getPatternsTabLabel={getPatternsTabLabel}
          getBehaviorTabLabel={getBehaviorTabLabel}
        />
      )}
      
      <div className="flex h-full w-full">
        {/* Main content area that adjusts based on year selector state */}
        <div className={`flex-1 transition-all duration-300 ${getYearSelectorMargin()}`} 
             style={{
               // Debug info
               '--year-selector-width': JSON.stringify(yearSelectorWidth),
               '--year-selector-position': yearSelectorPosition,
               '--year-selector-expanded': yearSelectorExpanded
             }}>
          <div className="flex flex-col h-full w-full">
            <div className="w-full h-full">
              <div className="w-full">
                <div className="flex justify-center mb-4 pt-4">
                  <DarkModeToggle />
                </div>
                <div className="space-y-4 pb-4">
          
          {activeTab === 'upload' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                <div className="p-2 sm:p-4 border rounded bg-blue-50">
                  <h3 className="font-semibold mb-2 text-blue-900">How to use:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700">
                    <li>Select your streaming service below</li>
                    <li>Download your streaming history</li>
                    <li>Upload your file(s)</li>

                    <div className="mt-4">
                      <button
                        onClick={handleLoadSampleData}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm bg-yellow-300 text-black rounded-lg hover:bg-yellow-500 transition-colors"
                      >
                        <Download size={14} className="hidden sm:inline" />
                        DEMO
                      </button>
                      <p className="text-sm text-gray-600 mt-1">
                        Want to test the app without uploading your own data? Click DEMO to load sample streaming history.
                      </p>
                    </div>
                    <li>Click "Calculate Statistics"</li>
                  </ol>
                </div>
                
                <div className="p-4 border rounded bg-green-50">
                  <h3 className="font-semibold mb-2 text-green-900">Install as a Webapp:</h3>
                  <div className="space-y-2 text-green-700">
                
                    <div className="space-y-1">
                      <h4 className="font-medium text-green-800">Desktop:</h4>
                      <p>1. Open the site in Chrome/Edge</p>
                      <p>2. Click the "+" or install icon in the address bar</p>

                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-green-800">Mobile:</h4>
                      <p>1. Open in Safari (iOS) or Chrome (Android)</p>
                      <p>2. Tap "Add to Home Screen"</p>
                
                    </div>
                    <p className="text-sm text-green-600">
                      Enjoy offline access
                    </p>
                  </div>
                </div>
              </div>
                
              <h3 className="font-bold text-orange-700 mb-3 mt-4">Select Streaming Services:</h3>
                         
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 mb-6">
                {/* Service Tiles */}
                {Object.entries(STREAMING_SERVICES)
                  .map(([type, service]) => (
                  <div key={type} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleServiceSelection(type)}
                      className={`w-full aspect-square sm:aspect-auto sm:px-4 sm:py-2 flex flex-col sm:flex-row justify-center sm:justify-between items-center transition-colors ${
                        selectedServices.includes(type)
                          ? SERVICE_COLORS[type]?.selected || 'bg-gray-600 text-white'
                          : SERVICE_COLORS[type]?.unselected || 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-center sm:text-left">{service.name}</span>
                      {selectedServices.includes(type) && <Check size={18} className="mt-2 sm:mt-0" />}
                    </button>
                    
                    <div className="px-2 sm:px-4 py-2 border-t bg-white">
                      <button 
                        onClick={() => toggleServiceInfo(type)}
                        className="flex items-center justify-center w-full text-xs sm:text-sm text-orange-600 hover:text-orange-800"
                      >
                        {showServiceInfo[type] ? 
                          <><ChevronUp size={14} className="mr-1" /> Hide Details</> : 
                          <><ChevronDown size={14} className="mr-1" /> Show Details</>
                        }
                      </button>
                      
                      {showServiceInfo[type] && (
                        <div className="mt-2 text-xs sm:text-sm text-orange-700">
                          <p className="mb-2">{service.instructions}</p>
                          <a
                            href={service.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-800 underline"
                          >
                            Download your data here
                          </a>
                          <p className="mt-1">Accepted formats: {service.acceptedFormats}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
                  
              {selectedServices.length > 0 ? (
                <div>
                  <p className="mb-2 text-orange-700 font-bold">
                    Upload your files from selected services:
                  </p>
                  <input
                    type="file"
                    multiple
                    accept={getAcceptedFormats()}
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-slate-600 
                      file:mr-4 file:py-2 file:px-4 file:rounded-full 
                      file:border-2 file:border-yellow-400 file:text-sm 
                      file:font-semibold file:bg-yellow-300 
                      file:text-yellow-800 hover:file:bg-yellow-400"
                  />
                </div>
              ) : (
                <p className="text-orange-700 font-semibold">
                  Please select at least one streaming service
                </p>
              )}
                  
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
                <div className="mt-4">
                  <h4 className="text-orange-700 font-semibold mb-2">Uploaded Files:</h4>
                  <ul className="list-disc list-inside text-orange-600 space-y-1">
                    {uploadedFiles.map((fileName, index) => (
                      <li key={index} className="flex items-center">
                        <span className="mr-2">{fileName}</span>
                        <button 
                          onClick={() => handleDeleteFile(index)}
                          className="p-1 bg-gray-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 size={14} />
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
                    className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg 
                      hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? "Processing..." : "Calculate Statistics"}
                  </button>
                </div>
              )}
                  
              {error && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}
                  
          {activeTab === 'stats' && stats && (
            <div className="p-2 sm:p-4 bg-purple-100 rounded border-2 border-purple-300">
              <h3 className="font-bold mb-2 text-purple-700">Processing Statistics:</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <ul className="space-y-1 text-purple-700">
                      <li>Files processed: {stats.totalFiles}</li>
                      <li>Total entries: {stats.totalEntries}</li>
                      <li>Processed songs: {stats.processedSongs}</li>
                      <li>Unique songs: {stats.uniqueSongs || 0}</li>
                      <li>Entries with no track name: {stats.nullTrackNames}</li>
                      <li>Plays under 30s: {stats.shortPlays}</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-3 rounded space-y-2">
                    <div className="font-semibold mb-1 text-purple-700">Total Listening Time:</div>
                    <div className="text-2xl text-purple-700">{formatDuration(stats.totalListeningTime)}</div>
                    <div className="text-sm text-purple-600">(only counting plays over 30 seconds)</div>
                    
                    {/* Service breakdown */}
                    {stats.serviceListeningTime && Object.keys(stats.serviceListeningTime).length > 0 && (
                      <div className="mt-4 pt-3 border-t border-purple-200">
                        <div className="font-semibold text-purple-700 mb-2">Listening Time by Service:</div>
                        <ul className="space-y-1">
                          {Object.entries(stats.serviceListeningTime).map(([service, time]) => (
                            <li key={service} className="flex justify-between items-center">
                              <span className="text-purple-600">{service}:</span>
                              <span className="font-medium text-purple-700">{formatDuration(time)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {stats && processedData.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ExportButton
                      stats={stats}
                      topArtists={topArtists}
                      topAlbums={topAlbums}
                      processedData={processedData}
                      briefObsessions={briefObsessions}
                      formatDuration={formatDuration}
                      songsByYear={songsByYear}
                      rawPlayData={rawPlayData}
                    />
                    <SupportOptions className="h-full" />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="p-2 sm:p-4 bg-cyan-200 rounded border-2 border-cyan-400">
              <h3 className="font-bold mb-2 text-cyan-700">App Updates</h3>
              <UpdatesSection />
            </div>
          )}
                          
          {activeTab === 'artists' && (
            <div className="p-2 sm:p-4 bg-teal-100 rounded border-2 border-teal-300">
              {/* Title - mobile gets its own row */}
              <div className="block sm:hidden mb-3">
                <h3 className="font-bold text-teal-700">
                  {selectedArtistYear === 'all' ? 'Most Played Artists (All Time)' : 
                    yearRangeMode && yearRange.startYear && yearRange.endYear ? 
                    `Most Played Artists (${yearRange.startYear}-${yearRange.endYear})` : 
                    `Most Played Artists (${selectedArtistYear})`}
                </h3>
              </div>
              
              {/* Desktop layout - title and controls on same row */}
              <div className="hidden sm:flex justify-between items-center mb-4">
                <h3 className="font-bold text-teal-700">
                  {selectedArtistYear === 'all' ? 'Most Played Artists (All Time)' : 
                    yearRangeMode && yearRange.startYear && yearRange.endYear ? 
                    `Most Played Artists (${yearRange.startYear}-${yearRange.endYear})` : 
                    `Most Played Artists (${selectedArtistYear})`}
                </h3>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-teal-700">Show Top</label>
                    <input
                      type="number" 
                      min="1" 
                      max="999" 
                      value={topArtistsCount} 
                      onChange={(e) => setTopArtistsCount(parseInt(e.target.value))}
                      className="w-16 border rounded px-2 py-1 text-teal-700"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-teal-700">View Mode</label>
                    <button
                      onClick={() => {
                        const modes = ['grid', 'compact', 'mobile'];
                        const currentIndex = modes.indexOf(artistsViewMode);
                        const nextIndex = (currentIndex + 1) % modes.length;
                        setArtistsViewMode(modes[nextIndex]);
                      }}
                      className="px-3 py-1 rounded text-sm font-medium transition-colors bg-teal-600 text-white hover:bg-teal-700"
                    >
                      {artistsViewMode === 'grid' ? 'Grid' : 
                       artistsViewMode === 'compact' ? 'Compact' : 'Mobile'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Mobile controls - separate row */}
              <div className="block sm:hidden mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <label className="text-teal-700 text-sm">Top</label>
                    <input
                      type="number" 
                      min="1" 
                      max="999" 
                      value={topArtistsCount} 
                      onChange={(e) => setTopArtistsCount(parseInt(e.target.value))}
                      className="w-12 border rounded px-1 py-1 text-teal-700 text-sm"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <label className="text-teal-700 text-sm">View</label>
                    <button
                      onClick={() => {
                        const modes = ['grid', 'compact', 'mobile'];
                        const currentIndex = modes.indexOf(artistsViewMode);
                        const nextIndex = (currentIndex + 1) % modes.length;
                        setArtistsViewMode(modes[nextIndex]);
                      }}
                      className="px-2 py-1 rounded text-xs font-medium transition-colors bg-teal-600 text-white hover:bg-teal-700"
                    >
                      {artistsViewMode === 'grid' ? 'Grid' : 
                       artistsViewMode === 'compact' ? 'Compact' : 'Mobile'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Artist Selection */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedArtists.map(artist => (
                    <div 
                      key={artist} 
                      className="flex items-center bg-teal-600 text-white px-2 py-1 rounded text-sm"
                    >
                      {artist}
                      <button 
                        onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                        className="ml-2 text-white hover:text-teal-200"
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
                    className="w-full border border-teal-300 rounded px-2 py-1 text-teal-700 focus:border-teal-400 focus:ring-teal-400 focus:outline-none"
                  />
                  {artistSearch && (
                    <button
                      onClick={() => setArtistSearch('')}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-teal-500 hover:text-teal-700"
                    >
                      ×
                    </button>
                  )}
                  {artistSearch && filteredArtists.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-teal-200 rounded shadow-lg mt-1">
                      {filteredArtists.map(artist => (
                        <div
                          key={artist}
                          onClick={() => {
                            setSelectedArtists(prev => [...prev, artist]);
                            setArtistSearch('');
                          }}
                          className="px-2 py-1 hover:bg-teal-100 text-teal-700 cursor-pointer"
                        >
                          {artist}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {displayedArtists.length === 0 ? (
                <div className="p-6 text-center bg-teal-50 rounded border-2 border-teal-300">
                  <h4 className="text-lg font-bold text-teal-700">No artists found</h4>
                  <p className="text-teal-600 mt-2">
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
                    className="mt-4 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                  >
                    Show All Artists
                  </button>
                </div>
              ) : artistsViewMode === 'mobile' ? (
                <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left text-teal-700">Artist Info</th>
                        <th className="p-2 text-right text-teal-700">Stats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDisplayedArtists
                        .slice(0, topArtistsCount)
                        .map((artist, index) => {
                          // Find original index to preserve ranking
                          const originalIndex = displayedArtists.findIndex(a => a.name === artist.name);
                          const isSelected = selectedArtists.includes(artist.name);
                          
                          return (
                            <tr 
                              key={artist.name} 
                              className={`border-b hover:bg-teal-50 cursor-pointer ${
                                isSelected ? 'bg-teal-100' : ''
                              }`}
                              onClick={() => {
                                // Toggle artist selection
                                if (selectedArtists.includes(artist.name)) {
                                  setSelectedArtists(prev => prev.filter(a => a !== artist.name));
                                } else {
                                  setSelectedArtists(prev => [...prev, artist.name]);
                                }
                              }}
                            >
                              <td className="p-2 text-teal-700">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">#{originalIndex + 1} {artist.name}</div>
                                    <div className="text-sm text-teal-500">
                                      Most Played: {artist.mostPlayedSong?.trackName || "N/A"}
                                      {artist.mostPlayedSong?.playCount && (
                                        <span> ({artist.mostPlayedSong.playCount}x)</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-teal-400">
                                      First Listen: {new Date(artist.firstListen).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected 
                                      ? 'bg-teal-600 border-teal-600 text-white' 
                                      : 'border-teal-400 hover:border-teal-600'
                                  }`}>
                                    {isSelected && '✓'}
                                  </div>
                                </div>
                              </td>
                              <td className="p-2 text-right text-teal-700">
                                <div className="font-medium">{formatDuration(artist.totalPlayed)}</div>
                                <div className="text-sm text-teal-500">{artist.playCount} plays</div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : artistsViewMode === 'compact' ? (
                <div className="border rounded-lg p-3 sm:p-4 bg-teal-50">
                  <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
                    <div className="text-teal-700 font-medium text-sm">
                      {selectedArtistYear === 'all' ? 'All-time artists' : 
                        yearRangeMode && yearRange.startYear && yearRange.endYear ? 
                        `Artists for ${yearRange.startYear}-${yearRange.endYear}` : 
                        `Artists for ${selectedArtistYear}`}
                    </div>
                    <div className="text-teal-700 text-sm">
                      Found <span className="font-bold">{filteredDisplayedArtists.length}</span> artists
                    </div>
                  </div>

                  <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
                    <div className="min-w-full">
                      <table className="w-full border-collapse text-sm sm:text-base">
                        <thead>
                          <tr className="border-b">
                            <th className="p-1 sm:p-2 text-left text-teal-700 text-xs sm:text-sm">Rank</th>
                            <th className="p-1 sm:p-2 text-left text-teal-700 text-xs sm:text-sm">Artist</th>
                            <th className="p-1 sm:p-2 text-right text-teal-700 text-xs sm:text-sm">Time</th>
                            <th className="p-1 sm:p-2 text-right text-teal-700 text-xs sm:text-sm">Plays</th>
                            <th className="p-1 sm:p-2 text-right text-teal-700 text-xs sm:text-sm hidden sm:table-cell">Most Played Song</th>
                            <th className="p-1 sm:p-2 text-right text-teal-700 text-xs sm:text-sm hidden sm:table-cell">First Listen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDisplayedArtists.length > 0 ? (
                            filteredDisplayedArtists
                              .slice(0, topArtistsCount)
                              .map((artist, index) => {
                                const originalIndex = displayedArtists.findIndex(a => a.name === artist.name);
                                const isSelected = selectedArtists.includes(artist.name);
                                
                                return (
                                  <tr 
                                    key={artist.name} 
                                    className={`border-b hover:bg-teal-100 cursor-pointer ${
                                      isSelected ? 'bg-teal-100' : ''
                                    }`}
                                    onClick={() => {
                                      if (selectedArtists.includes(artist.name)) {
                                        setSelectedArtists(prev => prev.filter(a => a !== artist.name));
                                      } else {
                                        setSelectedArtists(prev => [...prev, artist.name]);
                                      }
                                    }}
                                  >
                                    <td className="p-1 sm:p-2 text-teal-700 font-medium text-xs sm:text-sm">{originalIndex + 1}</td>
                                    <td className="p-1 sm:p-2 text-teal-700">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium text-xs sm:text-sm truncate">{artist.name}</span>
                                        <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center ml-1 sm:ml-2 hidden sm:flex ${
                                          isSelected 
                                            ? 'bg-teal-600 border-teal-600 text-white text-xs' 
                                            : 'border-teal-400 hover:border-teal-600'
                                        }`}>
                                          {isSelected && '✓'}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-1 sm:p-2 text-right text-teal-700 font-medium text-xs sm:text-sm">
                                      {formatDuration(artist.totalPlayed)}
                                    </td>
                                    <td className="p-1 sm:p-2 text-right text-teal-700 text-xs sm:text-sm">
                                      {artist.playCount}
                                    </td>
                                    <td className="p-1 sm:p-2 text-right text-teal-700 hidden sm:table-cell">
                                      <div className="text-sm">
                                        <div className="truncate max-w-[120px]">
                                          {artist.mostPlayedSong?.trackName || "N/A"}
                                        </div>
                                        {artist.mostPlayedSong?.playCount && (
                                          <div className="text-xs text-teal-500">
                                            ({artist.mostPlayedSong.playCount}x)
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-1 sm:p-2 text-right text-teal-700 text-sm hidden sm:table-cell">
                                      {new Date(artist.firstListen).toLocaleDateString()}
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan="6" className="p-4 text-center text-teal-500">
                                {yearRangeMode && yearRange.startYear && yearRange.endYear
                                  ? `No artists found for ${yearRange.startYear}-${yearRange.endYear}`
                                  : selectedArtistYear !== 'all' 
                                    ? `No artists found for ${selectedArtistYear}`
                                    : "No artist data available"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredDisplayedArtists
                    .slice(0, topArtistsCount)
                    .map((artist, index) => {
                      // Find original index to preserve ranking
                      const originalIndex = displayedArtists.findIndex(a => a.name === artist.name);
                      
                      return (
                        <div key={artist.name} 
                          className="p-3 bg-white rounded shadow-sm border-2 border-teal-200 hover:border-teal-400 transition-colors cursor-pointer relative"
                          onClick={() => {
                            // Toggle artist selection
                            if (selectedArtists.includes(artist.name)) {
                              setSelectedArtists(prev => prev.filter(a => a !== artist.name));
                            } else {
                              setSelectedArtists(prev => [...prev, artist.name]);
                            }
                          }}
                        >
                          <div className="font-bold text-teal-600">{artist.name}</div>
                    <div className="text-sm text-teal-400">
  Total Time: <span className="font-bold">{formatDuration(artist.totalPlayed)}</span>
  <br/>
  Plays: <span className="font-bold"> {artist.playCount}</span>
  <br/>
  Most Played Song: <span className="font-bold">{artist.mostPlayedSong?.trackName || "N/A"}</span> 
  <br/>
  Plays: <span className="font-bold">{artist.mostPlayedSong?.playCount || 0}</span>
  <br/>
  First Listen: <span className="font-bold">{new Date(artist.firstListen).toLocaleDateString()}</span>
  <br/>
  First Song: <span className="font-bold">
    {artist.firstSong || "Unknown"} 
    {artist.firstSongPlayCount 
      ? ` (${artist.firstSongPlayCount}x)` 
      : ""}
  </span>
  {artist.longestStreak > 1 && (
    <>
      <br/>
      Longest Streak: <span className="font-bold">{artist.longestStreak} days</span>
      <br/>
      <span className="text-xs">
        ({new Date(artist.streakStart).toLocaleDateString()} - {new Date(artist.streakEnd).toLocaleDateString()})
      </span>
    </>
  )}
  {artist.currentStreak > 1 && (
    <>
      <br/>
      Current Streak: <span className="font-bold text-teal-800">{artist.currentStreak} days</span>
    </>
  )}
</div>

                          <div className="absolute top-1 right-3 text-teal-600 text-[2rem]">{originalIndex + 1}</div>
                          {selectedArtists.includes(artist.name) && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center text-white">
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'albums' && (
            <div className="p-2 sm:p-4 bg-pink-100 rounded border-2 border-pink-300">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-pink-700">
                  {selectedAlbumYear === 'all' ? 'Most Played Albums (All Time)' : 
                    albumYearRangeMode && albumYearRange.startYear && albumYearRange.endYear ? 
                    `Most Played Albums (${albumYearRange.startYear}-${albumYearRange.endYear})` : 
                    `Most Played Albums (${selectedAlbumYear})`}
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-pink-700">Show Top</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="999" 
                      value={topAlbumsCount} 
                      onChange={(e) => setTopAlbumsCount(parseInt(e.target.value))}
                      className="w-16 border rounded px-2 py-1 text-pink-700"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-pink-700">Compact View</label>
                    <button
                      onClick={() => setAlbumsCompactView(!albumsCompactView)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        albumsCompactView 
                          ? 'bg-pink-600 text-white' 
                          : 'bg-pink-200 text-pink-700 hover:bg-pink-300'
                      }`}
                    >
                      {albumsCompactView ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
             
              {/* Artist Selection */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedArtists.map(artist => (
                    <div 
                      key={artist} 
                      className="flex items-center bg-pink-600 text-white px-2 py-1 rounded text-sm"
                    >
                      {artist}
                      <button 
                        onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                        className="ml-2 text-white hover:text-pink-200"
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
                    className="w-full border border-pink-300 rounded px-2 py-1 text-pink-700 focus:border-pink-400 focus:ring-pink-400 focus:outline-none"
                  />
                  {artistSearch && filteredArtists.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-pink-200 rounded shadow-lg mt-1">
                      {filteredArtists.map(artist => (
                        <div
                          key={artist}
                          onClick={() => {
                            setSelectedArtists(prev => [...prev, artist]);
                            setArtistSearch('');
                          }}
                          className="px-2 py-1 hover:bg-pink-100 text-pink-700 cursor-pointer"
                        >
                          {artist}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Albums Display */}
              {displayedAlbums.length === 0 ? (
                <div className="p-6 text-center bg-pink-50 rounded border-2 border-pink-300">
                  <h4 className="text-lg font-bold text-pink-700">No albums found</h4>
                  <p className="text-pink-600 mt-2">
                    {albumYearRangeMode 
                      ? `No albums found for the year range ${albumYearRange.startYear} - ${albumYearRange.endYear}.` 
                      : selectedAlbumYear !== 'all' 
                        ? `No albums found for the year ${selectedAlbumYear}.`
                        : "No album data available."}
                  </p>
                  <button
                    onClick={() => {
                      setAlbumYearRangeMode(false);
                      setSelectedAlbumYear('all');
                      setSelectedArtists([]);
                    }}
                    className="mt-4 px-4 py-2 bg-pink-600 text-white rounded hover:bg-pink-700"
                  >
                    Show All Albums
                  </button>
                </div>
              ) : albumsCompactView ? (
                <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="p-2 text-left text-pink-700">Album Info</th>
                        <th className="p-2 text-right text-pink-700">Stats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedAlbums.slice(0, topAlbumsCount).map((album, index) => (
                        <tr 
                          key={`${album.name}-${album.artist}`}
                          className="border-b hover:bg-pink-50"
                        >
                          <td className="p-2 text-pink-700">
                            <div className="font-medium">#{index + 1} {album.name}</div>
                            <div className="text-sm text-pink-500">by {album.artist}</div>
                            <div className="text-xs text-pink-400">
                              {album.trackCountValue || album.trackObjects?.length || 0} tracks
                            </div>
                          </td>
                          <td className="p-2 text-right text-pink-700">
                            <div className="font-medium">{formatDuration(album.totalPlayed)}</div>
                            <div className="text-sm text-pink-500">{album.playCount || 0} plays</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {displayedAlbums.slice(0, topAlbumsCount).map((album, index) => (
                    <AlbumCard 
                      key={`${album.name}-${album.artist}`}
                      album={album}
                      index={index}
                      processedData={processedData}
                      formatDuration={formatDuration}
                      selectedYear={selectedAlbumYear}
                      yearRange={albumYearRange}
                      isYearRangeMode={albumYearRangeMode}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'tracks' && (
            <div className="p-2 sm:p-4 bg-blue-100 rounded border-2 border-blue-300">
              <TrackRankings 
                processedData={processedData} 
                briefObsessions={briefObsessions} 
                formatDuration={formatDuration} 
                songsByYear={songsByYear}
                songsByMonth={songsByMonth}
                initialYear={selectedTrackYear}
                onYearChange={setSelectedTrackYear}
                yearRange={yearRange}
                yearRangeMode={yearRangeMode}
                onYearRangeChange={handleYearRangeChange}
                onToggleYearRangeMode={toggleYearRangeMode}
              />
            </div>
          )}
          
          {activeTab === 'custom' && (
            <div className="p-2 sm:p-4 bg-orange-100 rounded border-2 border-orange-300">
              <CustomTrackRankings 
                rawPlayData={rawPlayData}
                formatDuration={formatDuration}
                initialArtists={selectedArtists}
                selectedYear={customTrackYear}
                yearRange={customYearRange}
                yearRangeMode={customYearRangeMode}
                onYearChange={handleCustomTrackYearChange}
                onYearRangeChange={handleCustomTrackYearRangeChange}
                onToggleYearRangeMode={handleCustomTrackYearRangeModeToggle}
              />
            </div>
          )}

          {activeTab === 'playlists' && (
            <div className="p-2 sm:p-4 bg-red-100 rounded border-2 border-red-300">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-red-700">Custom Playlists</h3>
              </div>
              
              <CustomPlaylistCreator
                processedData={processedData}
                formatDuration={formatDuration}
                rawPlayData={rawPlayData}
              />
            </div>
          )}

          {activeTab === 'podcasts' && (
            <div 
              id="podcast-rankings"
              className="p-2 sm:p-4 bg-indigo-100 rounded border-2 border-indigo-300"
            >
              <PodcastRankings 
                rawPlayData={rawPlayData}
                formatDuration={formatDuration}
                selectedYear={selectedPodcastYear}
                yearRange={podcastYearRange}
                yearRangeMode={podcastYearRangeMode}
              />
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="p-2 sm:p-4 bg-purple-100 rounded border-2 border-purple-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-purple-700">
                  {selectedPatternYear === 'all' ? 'Listening Patterns (All Time)' : 
                    patternYearRangeMode && patternYearRange.startYear && patternYearRange.endYear ? 
                    `Listening Patterns (${patternYearRange.startYear}-${patternYearRange.endYear})` : 
                    `Listening Patterns (${selectedPatternYear})`}
                </h3>
              </div>
              
              <ListeningPatterns 
                rawPlayData={rawPlayData} 
                formatDuration={formatDuration}
                selectedYear={selectedPatternYear}
                yearRange={patternYearRange}
                yearRangeMode={patternYearRangeMode}
              />
            </div>
          )}

          {activeTab === 'behavior' && (
            <div className="p-2 sm:p-4 bg-indigo-100 rounded border-2 border-indigo-300">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-indigo-700">
                  {selectedBehaviorYear === 'all' ? 'Listening Behavior (All Time)' : 
                    behaviorYearRangeMode && behaviorYearRange.startYear && behaviorYearRange.endYear ? 
                    `Listening Behavior (${behaviorYearRange.startYear}-${behaviorYearRange.endYear})` : 
                    `Listening Behavior (${selectedBehaviorYear})`}
                </h3>
              </div>
              
              <ListeningBehavior 
                rawPlayData={rawPlayData} 
                formatDuration={formatDuration}
                selectedYear={selectedBehaviorYear}
                yearRange={behaviorYearRange}
                yearRangeMode={behaviorYearRangeMode}
              />
            </div>
          )}

          {activeTab === 'discovery' && (
            <div className="p-2 sm:p-4 bg-green-100 rounded border-2 border-green-300">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-green-700">
                  {selectedDiscoveryYear === 'all' ? 'Music Discovery (All Time)' : 
                    discoveryYearRangeMode && discoveryYearRange.startYear && discoveryYearRange.endYear ? 
                    `Music Discovery (${discoveryYearRange.startYear}-${discoveryYearRange.endYear})` : 
                    `Music Discovery (${selectedDiscoveryYear})`}
                </h3>
              </div>
              
              <DiscoveryAnalysis 
                rawPlayData={rawPlayData} 
                formatDuration={formatDuration}
                selectedYear={selectedDiscoveryYear}
                yearRange={discoveryYearRange}
                yearRangeMode={discoveryYearRangeMode}
              />
            </div>
          )}
          
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Year Selector - positioned outside the main content flow */}
        {showYearSidebar && (
          <YearSelector
            artistsByYear={artistsByYear}
            rawPlayData={rawPlayData}
            activeTab={activeTab}
            onYearChange={handleSidebarYearChange}
            onYearRangeChange={handleSidebarYearRangeChange}
            onExpandChange={setYearSelectorExpanded}
            onPositionChange={setYearSelectorPosition}
            onWidthChange={setYearSelectorWidth}
            initialYear={
              activeTab === 'artists' ? selectedArtistYear :
              activeTab === 'albums' ? selectedAlbumYear :
              activeTab === 'tracks' ? selectedTrackYear : 
              activeTab === 'custom' ? customTrackYear :
              activeTab === 'patterns' ? selectedPatternYear :
              activeTab === 'behavior' ? selectedBehaviorYear :
              activeTab === 'discovery' ? selectedDiscoveryYear :
              activeTab === 'podcasts' ? selectedPodcastYear : 'all'
            }
            initialYearRange={
              activeTab === 'artists' ? yearRange :
              activeTab === 'albums' ? albumYearRange : 
              activeTab === 'custom' ? customYearRange :
              activeTab === 'patterns' ? patternYearRange :
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
              activeTab === 'behavior' ? behaviorYearRangeMode :
              activeTab === 'discovery' ? discoveryYearRangeMode :
              activeTab === 'podcasts' ? podcastYearRangeMode : false
            }
            onToggleRangeMode={handleSidebarRangeModeToggle}
            colorTheme={sidebarColorTheme}
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