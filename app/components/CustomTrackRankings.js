import React, { useState, useMemo, useEffect, useRef } from 'react';
import { normalizeString, createMatchKey } from './streaming-adapter.js';
import { Download, Plus, XCircle, Eye } from 'lucide-react';
import PlaylistExporter from './playlist-exporter.js';

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
  onToggleYearRangeMode
}) => {

  
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

  // Create a ref to hold our normalization cache that persists across renders
  const normalizationCache = useRef(new Map());
  // Also track if we've already processed the raw data
  const processedDataRef = useRef(null);
  const previousRawDataLength = useRef(0);
  
  // New state for omitted content feature
  const [omittedSongs, setOmittedSongs] = useState([]);
  const [omittedArtists, setOmittedArtists] = useState([]);
  const [showOmittedTab, setShowOmittedTab] = useState(false);
  
  // Update the check to consider orientation instead of just width
  useEffect(() => {
    const checkOrientation = () => {
      // Check if we're in portrait mode (height > width)
      const isPortrait = window.innerHeight > window.innerWidth;
      setIsMobile(isPortrait);
    };
    
    // Initial check
    checkOrientation();
    
    // Add both resize and orientation change listeners
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
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
      return `Custom Track Range (${yearRange.startYear}-${yearRange.endYear})`;
    } else if (selectedYear !== 'all') {
      if (selectedYear.includes('-')) {
        const parts = selectedYear.split('-');
        if (parts.length === 3) {
          // Display format for a specific date (YYYY-MM-DD)
          const date = new Date(selectedYear);
          if (!isNaN(date.getTime())) {
            return `Custom Track Range for ${date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}`;
          }
        } else if (parts.length === 2) {
          // Display format for a specific month (YYYY-MM)
          const year = parts[0];
          const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
          const date = new Date(year, month, 1);
          if (!isNaN(date.getTime())) {
            return `Custom Track Range for ${date.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long'
            })}`;
          }
        }
        return `Custom Track Range for ${selectedYear}`;
      }
      return `Custom Track Range (${selectedYear})`;
    } else {
      return 'Custom Date Range (All Time)';
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
    if (isMobile) {
      // Mobile view - compact layout
      return (
        <tr 
          key={song.key} 
          className={`border-b hover:bg-orange-50 ${song.isFeatured ? 'bg-orange-50' : ''}`}
        >
          <td className="p-2 text-orange-700">
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-bold text-xs mr-2 text-orange-800">{index + 1}.</span>
                {song.isFeatured && (
                  <span className="inline-block px-1 py-0.5 mr-1 bg-orange-200 text-orange-700 rounded text-xs">
                    FEAT
                  </span>
                )}
                <div className="font-medium">{song.displayName || song.trackName}</div>
                
                {/* Add omit buttons */}
                <div className="ml-auto flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      omitSong(song);
                    }}
                    className="text-orange-600 hover:text-orange-800"
                    title="Omit this song"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </div>
              <div 
                className="text-xs text-orange-600 cursor-pointer hover:underline flex items-center"
              >
                <span onClick={() => addArtistFromTrack(song.displayArtist || song.artist)}>
                  {song.displayArtist || song.artist}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    omitArtist(song.artist);
                  }}
                  className="ml-1 text-orange-600 hover:text-orange-800"
                  title="Omit this artist"
                >
                  <XCircle size={14} />
                </button>
              </div>
              <div 
                className="text-xs text-orange-500 cursor-pointer hover:underline truncate max-w-[200px]"
                onClick={() => addAlbumFromTrack(song.albumName, song.artist)}
              >
                {song.albumName}
              </div>
            </div>
          </td>
          <td className="p-2 align-top text-right text-orange-700">
            <div className="flex flex-col">
              <span className="font-medium">{formatDuration(song.totalPlayed)}</span>
              <span className="text-xs">{song.playCount} plays</span>
            </div>
          </td>
        </tr>
      );
    }
    
    // Desktop view - full table
    return (
      <tr 
        key={song.key} 
        className={`border-b hover:bg-orange-50 ${song.isFeatured ? 'bg-orange-50' : ''}`}
      >
        <td className="p-2 text-orange-700">{index + 1}</td>
        <td className="p-2 text-orange-700">
          <div className="flex items-center">
            {song.isFeatured && (
              <span className="inline-block px-1.5 py-0.5 mr-2 bg-orange-200 text-orange-700 rounded text-xs">
                FEAT
              </span>
            )}
            <div>
              {song.displayName || song.trackName}
            </div>
          </div>
        </td>
        <td 
          className="p-2 text-orange-700" 
        > 
          <div className="flex items-center">
            <span 
              className="cursor-pointer hover:underline"
              onClick={() => addArtistFromTrack(song.displayArtist || song.artist)}
            >
              {song.displayArtist || song.artist}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                omitArtist(song.artist);
              }}
              className="ml-2 text-orange-600 hover:text-orange-800"
              title="Omit this artist"
            >
              <XCircle size={16} />
            </button>
          </div>
        </td>
        <td 
          className="p-2 text-orange-700 cursor-pointer hover:underline" 
          onClick={() => addAlbumFromTrack(song.albumName, song.artist)}
        >
          {song.albumName}
        </td>
        <td className="p-2 text-right text-orange-700">{formatDuration(song.totalPlayed)}</td>
        <td className="p-2 text-right text-orange-700">{song.playCount}</td>
        <td className="p-2 text-right text-orange-700">
          <button
            onClick={() => omitSong(song)}
            className="p-1 text-orange-600 hover:text-orange-800 rounded"
            title="Omit this song"
          >
            <XCircle size={16} />
          </button>
        </td>
      </tr>
    );
  };
return (
  <div className="space-y-4">
    {/* Header with title and controls */}
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-bold text-orange-700">
        {getPageTitle()}
      </h3>
      
      <div className="flex items-center gap-2">
        <label className="text-orange-700 ml-2">Show Top</label>
        <input
          type="number"
          min="1"
          max="999"
          value={topN}
          onChange={(e) => setTopN(Math.min(999, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-16 border rounded px-2 py-1 text-orange-700"
        />
      </div>
    </div>
   

    {/* Date Range Selection */}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={unifiedSearch}
          onChange={(e) => {
            setUnifiedSearch(e.target.value);
            setArtistSearch(e.target.value);
            setAlbumSearch(e.target.value);
          }}
          placeholder="Search artists or albums..."
          className="w-full border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
        />
        
        {unifiedSearch && (filteredArtists.length > 0 || filteredAlbums.length > 0) && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto text-orange-600">
            {filteredArtists.length > 0 && (
              <div>
                <div className="px-2 py-1 bg-orange-100 text-orange-800 font-semibold text-xs">ARTISTS</div>
                {filteredArtists.map(artist => (
                  <div
                    key={artist}
                    onClick={() => {
                      addArtistFromTrack(artist);
                      setUnifiedSearch('');
                    }}
                    className="px-2 py-1 hover:bg-orange-50 cursor-pointer"
                  >
                    <span className="mr-1">👤</span> {artist}
                  </div>
                ))}
              </div>
            )}
            
            {filteredAlbums.length > 0 && (
              <div>
                <div className="px-2 py-1 bg-orange-100 text-orange-800 font-semibold text-xs">ALBUMS</div>
                {filteredAlbums.map(album => (
                  <div
                    key={album.key}
                    onClick={() => {
                      addAlbumFromTrack(album.name, album.artist);
                      setUnifiedSearch('');
                    }}
                    className="px-2 py-1 hover:bg-orange-50 cursor-pointer"
                  >
                    <span className="mr-1">💿</span> {album.name} <span className="text-xs">({album.artist})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
     
      
      {/* Selected filters display */}
      <div className="flex flex-wrap gap-2 mt-2">
        {selectedArtists.map(artist => (
          <div 
            key={artist} 
            className="flex items-center bg-orange-600 text-white px-2 py-1 rounded text-xs"
          >
            {artist}
            <button 
              onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
              className="ml-1 text-white hover:text-orange-200"
            >
              ×
            </button>
          </div>
        ))}
        
        {selectedAlbums.map(album => (
          <div 
            key={album.key} 
            className="flex items-center bg-orange-500 text-white px-2 py-1 rounded text-xs"
          >
            <span className="mr-1">💿</span> {album.name} 
            <button 
              onClick={() => setSelectedAlbums(prev => prev.filter(a => a.key !== album.key))}
              className="ml-1 text-white hover:text-orange-200"
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
              <div className={`block w-8 sm:w-10 h-5 sm:h-6 rounded-full ${includeFeatures ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-3 sm:w-4 h-3 sm:h-4 rounded-full transition-transform ${includeFeatures ? 'transform translate-x-3 sm:translate-x-4' : ''}`}></div>
            </div>
            <span className="ml-2 text-orange-700 text-xs sm:text-sm">
              Include features 
            </span>
          </label>
        )}

  <button
          onClick={() => setShowPlaylistExporter(!showPlaylistExporter)}
          className="flex items-center gap-1 px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs"
        >
          <Download size={14} className="hidden sm:inline" />
          Export M3u
        </button>
        
        {/* Sort Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-orange-700 text-sm">Sort:</span>
          <button
            onClick={() => setSortBy('totalPlayed')}
            className={`px-2 py-1 rounded text-xs ${
              sortBy === 'totalPlayed'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            Time
          </button>
          <button
            onClick={() => setSortBy('playCount')}
            className={`px-2 py-1 rounded text-xs ${
              sortBy === 'playCount'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            Plays
          </button>
        </div>
      </div>
    </div>

    {/* Playlist Exporter */}
    {showPlaylistExporter && (
      <PlaylistExporter
        processedData={filteredTracks}
        songsByYear={songsByYear}
        selectedYear={selectedYear !== 'all' ? selectedYear : 'all'}
        colorTheme="orange"
      />
    )}

    {/* Tabs for switching between main content and omitted content */}
    <div className="flex gap-2 mb-4">
      <button
        onClick={() => setShowOmittedTab(false)}
        className={`px-4 py-2 rounded-t text-sm ${
          !showOmittedTab
            ? 'bg-orange-600 text-white'
            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
        }`}
      >
        Track Results
      </button>
      <button
        onClick={() => setShowOmittedTab(true)}
        className={`px-4 py-2 rounded-t text-sm flex items-center gap-1 ${
          showOmittedTab
            ? 'bg-orange-600 text-white'
            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
        }`}
      >
        <Eye size={14} />
        Omitted Content ({omittedSongs.length + omittedArtists.length})
      </button>
    </div>

    {/* Show either omitted content tab or normal results */}
    {showOmittedTab ? (
      <div className="border rounded-lg p-3 sm:p-4 bg-orange-50">
        <h3 className="font-bold text-orange-700 mb-4">Omitted Content</h3>
        
        {omittedArtists.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold text-orange-600 mb-2">Omitted Artists</h4>
            <div className="flex flex-wrap gap-2">
              {omittedArtists.map(artist => (
                <div 
                  key={artist} 
                  className="flex items-center bg-orange-600 text-white px-2 py-1 rounded text-xs"
                >
                  {artist}
                  <button 
                    onClick={() => unomitArtist(artist)}
                    className="ml-2 text-white hover:text-orange-200"
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
            <h4 className="font-semibold text-orange-600 mb-2">Omitted Songs</h4>
            <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left text-orange-700">Track</th>
                    <th className="p-2 text-left text-orange-700">Artist</th>
                    <th className="p-2 text-left text-orange-700">Album</th>
                    <th className="p-2 text-right text-orange-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {omittedSongs.map(song => (
                    <tr key={song.key} className="border-b hover:bg-orange-50">
                      <td className="p-2 text-orange-700">{song.trackName}</td>
                      <td className="p-2 text-orange-700">{song.artist}</td>
                      <td className="p-2 text-orange-700">{song.albumName}</td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => unomitSong(song.key)}
                          className="px-2 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700"
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
          <div className="text-center py-4 text-orange-500">
            No songs or artists have been omitted yet
          </div>
        )}
      </div>
    ) : (
      /* Results section with date range info */
      <div className="border rounded-lg p-3 sm:p-4 bg-orange-50">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="text-orange-700 font-medium text-sm">
            Date Range: <span className="text-orange-800">{getFormattedDateRange()}</span>
          </div>
          <div className="text-orange-700 text-sm">
            Found <span className="font-bold">{filteredTracks.length}</span> tracks
          </div>
        </div>

        {filteredTracks.length > 0 ? (
          <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {!isMobile && (
                    <>
                      <th className="p-2 text-left text-orange-700">Rank</th>
                      <th className="p-2 text-left text-orange-700">Track</th>
                      <th className="p-2 text-left text-orange-700">Artist</th>
                      <th className="p-2 text-left text-orange-700">Album</th>
                      <th 
                        className={`p-2 text-right text-orange-700 cursor-pointer hover:bg-orange-100 ${
                          sortBy === 'totalPlayed' ? 'font-bold' : ''
                        }`}
                        onClick={() => setSortBy('totalPlayed')}
                      >
                        Time {sortBy === 'totalPlayed' && '▼'}
                      </th>
                      <th 
                        className={`p-2 text-right text-orange-700 cursor-pointer hover:bg-orange-100 ${
                          sortBy === 'playCount' ? 'font-bold' : ''
                        }`}
                        onClick={() => setSortBy('playCount')}
                      >
                        Plays {sortBy === 'playCount' && '▼'}
                      </th>
                      <th className="p-2 text-right text-orange-700">Actions</th>
                    </>
                  )}
                  {isMobile && (
                    <>
                      <th className="p-2 text-left text-orange-700">Track Info</th>
                      <th className="p-2 text-right text-orange-700">Stats</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredTracks.map(renderTrackRow)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-orange-500">
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