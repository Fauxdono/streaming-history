"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { streamingProcessor, STREAMING_TYPES, STREAMING_SERVICES, filterDataByDate } from './streaming-adapter.js';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
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
import { selectedPatternYear, yearPatternRange, patternYearRangeMode } from './listening-patterns.js';
import { selectedBehaviorYear, yearBehaviorRange, behaviorYearRangeMode } from './listening-behavior.js';
import DarkModeToggle from './darkmode.js';

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

const SpotifyAnalyzer = () => {
  // Core application state
  const [activeTab, setActiveTab] = useState('upload');
  const [activeTrackTab, setActiveTrackTab] = useState('top250');
  const [songsByMonth, setSongsByMonth] = useState({});
  const [songsByYear, setSongsByYear] = useState({});
  const [processedData, setProcessedData] = useState([]);
  const [selectedServices, setSelectedServices] = useState(['spotify']);
  const [topArtists, setTopArtists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [topArtistsCount, setTopArtistsCount] = useState(10);
  const [topAlbumsCount, setTopAlbumsCount] = useState(20);
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
    
    // Update the state
    setAlbumYearRangeMode(newMode);
    
    // Reset selected year when switching to range mode
    if (newMode) {
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
    
    // Filter raw data by date range
    const dateFilteredEntries = isAllTime 
      ? rawPlayData 
      : rawPlayData.filter(entry => {
          try {
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
      const key = `${albumName}-${artistName}`;
      
      if (!albumMap.has(key)) {
        albumMap.set(key, {
          name: albumName,
          artist: artistName,
          totalPlayed: 0,
          playCount: 0,
          trackCount: new Set(),
          trackNames: new Set(),
        });
      }
      
      const album = albumMap.get(key);
      album.totalPlayed += entry.ms_played || 0;
      album.playCount++;
      if (entry.master_metadata_track_name) {
        album.trackNames.add(entry.master_metadata_track_name);
        album.trackCount.add(entry.master_metadata_track_name);
      }
    });
    
    return Array.from(albumMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
  }, [selectedAlbumYear, albumStartDate, albumEndDate, topAlbums, rawPlayData]);

  // PLACEHOLDER - Remove old displayedAlbums logic below this line
  const oldDisplayedAlbumsRemoved = () => {
    // Old logic removed - keeping this as placeholder
    if (albumYearRangeMode && albumYearRange.startYear && albumYearRange.endYear) {
      // Check if dates include month/day information
      const startHasMonthDay = albumYearRange.startYear.includes('-');
      const endHasMonthDay = albumYearRange.endYear.includes('-');
      
      if (startHasMonthDay || endHasMonthDay) {
        // Use direct filtering on raw play data for precise date ranges
        // Parse dates into Date objects
        let startDate, endDate;
        
        try {
          // Parse start date with proper time bounds
          if (startHasMonthDay) {
            if (albumYearRange.startYear.split('-').length === 3) {
              // YYYY-MM-DD format
              startDate = new Date(albumYearRange.startYear);
              startDate.setHours(0, 0, 0, 0); // Start of day
            } else {
              // YYYY-MM format
              const [year, month] = albumYearRange.startYear.split('-').map(Number);
              startDate = new Date(year, month - 1, 1); // First day of month
            }
          } else {
            // Just year
            startDate = new Date(parseInt(albumYearRange.startYear), 0, 1); // January 1st
          }
          
          // Parse end date with proper time bounds
          if (endHasMonthDay) {
            if (albumYearRange.endYear.split('-').length === 3) {
              // YYYY-MM-DD format
              endDate = new Date(albumYearRange.endYear);
              endDate.setHours(23, 59, 59, 999); // End of day
            } else {
              // YYYY-MM format
              const [year, month] = albumYearRange.endYear.split('-').map(Number);
              // Last day of month
              endDate = new Date(year, month, 0, 23, 59, 59, 999);
            }
          } else {
            // Just year
            endDate = new Date(parseInt(albumYearRange.endYear), 11, 31, 23, 59, 59, 999); // December 31st
          }
          
          // Filter raw play data by date range - use a for loop for efficiency
          const filteredPlayData = [];
          for (let i = 0; i < rawPlayData.length; i++) {
            const entry = rawPlayData[i];
            try {
              if (!entry.ts) continue;
              
              // Reuse parsed date if available
              let entryDate = entry._dateObj || new Date(entry.ts);
              if (isNaN(entryDate.getTime())) continue;
              
              // Store parsed date on entry to avoid reparsing
              if (!entry._dateObj) entry._dateObj = entryDate;
              
              if (entryDate >= startDate && entryDate <= endDate) {
                filteredPlayData.push(entry);
              }
            } catch (err) {
              continue;
            }
          }
          
          // Group the filtered play data by album - use a Map for better performance
          const albumMap = new Map();
          
          for (let i = 0; i < filteredPlayData.length; i++) {
            const entry = filteredPlayData[i];
            if (!entry.master_metadata_album_artist_name || !entry.master_metadata_album_album_name) continue;
            
            const artistName = entry.master_metadata_album_artist_name;
            const albumName = entry.master_metadata_album_album_name;
            const key = `${albumName}-${artistName}`;
            
            if (!albumMap.has(key)) {
              albumMap.set(key, {
                name: albumName,
                artist: artistName,
                totalPlayed: 0,
                playCount: 0,
                trackCount: new Set(),
                trackNames: new Set(),
                trackObjects: [],
                firstListen: entry.ts ? new Date(entry.ts).getTime() : Date.now()
              });
            }
            
            const album = albumMap.get(key);
            album.totalPlayed += entry.ms_played || 0;
            album.playCount += 1;
            
            if (entry.master_metadata_track_name) {
              album.trackCount.add(entry.master_metadata_track_name.toLowerCase());
              album.trackNames.add(entry.master_metadata_track_name);
              
              // Add this track to trackObjects if not already present
              const trackExists = album.trackObjects.some(
                t => t.trackName === entry.master_metadata_track_name
              );
              
              if (!trackExists) {
                album.trackObjects.push({
                  trackName: entry.master_metadata_track_name,
                  artist: entry.master_metadata_album_artist_name,
                  totalPlayed: entry.ms_played || 0,
                  playCount: 1,
                  albumName
                });
              } else {
                // Update existing track
                const track = album.trackObjects.find(
                  t => t.trackName === entry.master_metadata_track_name
                );
                track.totalPlayed += entry.ms_played || 0;
                track.playCount += 1;
              }
            }
            
            const timestamp = new Date(entry.ts);
            if (timestamp < new Date(album.firstListen)) {
              album.firstListen = timestamp.getTime();
            }
          }
          
          // Process for final output - sort track objects
          albumMap.forEach(album => {
            album.trackObjects.sort((a, b) => b.totalPlayed - a.totalPlayed);
            album.trackCountValue = album.trackCount.size;
          });
          
          // Convert map to array
          filteredAlbums = Array.from(albumMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
        } catch (err) {
          console.error("Error processing album date range:", err);
          filteredAlbums = [];
        }
      } else {
        // Year range mode without month/day - collect albums from multiple years
        filteredAlbums = [];
        const startYear = parseInt(albumYearRange.startYear);
        const endYear = parseInt(albumYearRange.endYear);
        
        // Collect albums from each year in the range
        for (let year = startYear; year <= endYear; year++) {
          if (albumsByYear[year]) {
            filteredAlbums = [...filteredAlbums, ...albumsByYear[year]];
          }
        }
        
        // Remove duplicates efficiently using a Map
        const albumIdMap = new Map();
        
        filteredAlbums.forEach(album => {
          if (!album) return;
          
          const id = `${album.name}-${album.artist}`;
          
          if (!albumIdMap.has(id)) {
            // First time seeing this album - use a deep copy to avoid modifying the original
            albumIdMap.set(id, JSON.parse(JSON.stringify(album)));
          } else {
            // Combine with existing album data
            const existingAlbum = albumIdMap.get(id);
            
            // Sum the play counts and total played time
            existingAlbum.totalPlayed = (existingAlbum.totalPlayed || 0) + (album.totalPlayed || 0);
            existingAlbum.playCount = (existingAlbum.playCount || 0) + (album.playCount || 0);
            
            // Take the earlier first listen date
            if (album.firstListen && existingAlbum.firstListen && 
                album.firstListen < existingAlbum.firstListen) {
              existingAlbum.firstListen = album.firstListen;
            }
            
            // Merge track objects if available
            if (album.trackObjects && existingAlbum.trackObjects) {
              // Create a map of existing tracks by name/key
              const trackMap = new Map();
              existingAlbum.trackObjects.forEach(track => {
                if (track && track.trackName) {
                  // Use normalized track name as key when available
                  const key = track.normalizedTrack || track.trackName.toLowerCase();
                  trackMap.set(key, track);
                }
              });
              
              // Add or update tracks from this year
              album.trackObjects && album.trackObjects.forEach(track => {
                if (!track || !track.trackName) return;
                
                // Use normalized track name as key when available
                const key = track.normalizedTrack || track.trackName.toLowerCase();
                
                if (trackMap.has(key)) {
                  // Update existing track stats
                  const existingTrack = trackMap.get(key);
                  existingTrack.totalPlayed = (existingTrack.totalPlayed || 0) + (track.totalPlayed || 0);
                  existingTrack.playCount = (existingTrack.playCount || 0) + (track.playCount || 0);
                  
                  // Combine variations if needed
                  if (track.variations && Array.isArray(track.variations)) {
                    if (!existingTrack.variations) {
                      existingTrack.variations = [...track.variations];
                    } else {
                      // Add any new variations
                      track.variations.forEach(variation => {
                        if (!existingTrack.variations.includes(variation)) {
                          existingTrack.variations.push(variation);
                        }
                      });
                    }
                  }
                } else {
                  // Add new track
                  trackMap.set(key, JSON.parse(JSON.stringify(track)));
                }
              });
              
              // Replace track objects with the merged and sorted list
              existingAlbum.trackObjects = Array.from(trackMap.values())
                .sort((a, b) => (b.totalPlayed || 0) - (a.totalPlayed || 0));
            }
          }
        });
        
        // Convert map back to array
        filteredAlbums = Array.from(albumIdMap.values());
      }
    } else if (selectedAlbumYear !== 'all') {
      // Check if the selectedAlbumYear includes month/day information
      if (selectedAlbumYear.includes('-')) {
        // Filter raw data directly for more precise date filtering
        console.log("Calling filterDataByDate with:", { selectedAlbumYear, rawPlayDataLength: rawPlayData.length });
        const filteredPlayData = filterDataByDate(rawPlayData, selectedAlbumYear);
        console.log("filterDataByDate returned:", { filteredLength: filteredPlayData.length });
        
        // Group the filtered play data by album using a Map for better performance
        const albumMap = new Map();
        
        for (let i = 0; i < filteredPlayData.length; i++) {
          const entry = filteredPlayData[i];
          if (!entry.master_metadata_album_artist_name || !entry.master_metadata_album_album_name) continue;
          
          const artistName = entry.master_metadata_album_artist_name;
          const albumName = entry.master_metadata_album_album_name;
          const key = `${albumName}-${artistName}`;
          
          if (!albumMap.has(key)) {
            albumMap.set(key, {
              name: albumName,
              artist: artistName,
              totalPlayed: 0,
              playCount: 0,
              trackCount: new Set(),
              trackNames: new Set(),
              trackObjects: [],
              firstListen: entry.ts ? new Date(entry.ts).getTime() : Date.now()
            });
          }
          
          const album = albumMap.get(key);
          album.totalPlayed += entry.ms_played || 0;
          album.playCount += 1;
          
          if (entry.master_metadata_track_name) {
            album.trackCount.add(entry.master_metadata_track_name.toLowerCase());
            album.trackNames.add(entry.master_metadata_track_name);
            
            // Add this track to trackObjects if not already present - use find for efficiency
            const existingTrackIndex = album.trackObjects.findIndex(
              t => t.trackName === entry.master_metadata_track_name
            );
            
            if (existingTrackIndex === -1) {
              album.trackObjects.push({
                trackName: entry.master_metadata_track_name,
                artist: entry.master_metadata_album_artist_name,
                totalPlayed: entry.ms_played || 0,
                playCount: 1,
                albumName
              });
            } else {
              // Update existing track
              album.trackObjects[existingTrackIndex].totalPlayed += entry.ms_played || 0;
              album.trackObjects[existingTrackIndex].playCount += 1;
            }
          }
          
          const timestamp = new Date(entry.ts);
          if (timestamp < new Date(album.firstListen)) {
            album.firstListen = timestamp.getTime();
          }
        }
        
        // Process for final output - sort track objects
        albumMap.forEach(album => {
          album.trackObjects.sort((a, b) => b.totalPlayed - a.totalPlayed);
          album.trackCountValue = album.trackCount.size;
        });
        
        // Convert to array and sort
        filteredAlbums = Array.from(albumMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
      } else {
        // Regular single year, use the existing data structure
        filteredAlbums = albumsByYear[selectedAlbumYear] ? 
               JSON.parse(JSON.stringify(albumsByYear[selectedAlbumYear])) : 
               [];
      }
    } else {
      // All-time mode
      filteredAlbums = JSON.parse(JSON.stringify(topAlbums));
    }
    
    // Then apply artist filtering if needed using a Set for faster lookups
    if (selectedArtists.length > 0) {
      const selectedArtistsSet = new Set(selectedArtists);
      filteredAlbums = filteredAlbums.filter(album => selectedArtistsSet.has(album.artist));
    }
    
    // Make sure all albums have trackObjects even in all-time mode
    return filteredAlbums.map(album => {
      if (!album) return null;
      
      // If we already have track objects, just use them
      if (album.trackObjects && Array.isArray(album.trackObjects) && album.trackObjects.length > 0) {
        // Ensure they're sorted
        album.trackObjects.sort((a, b) => (b.totalPlayed || 0) - (a.totalPlayed || 0));
        return album;
      }
      
      // For albums without track objects, try to find matching tracks
      const albumTracks = processedData.filter(track => 
        track && track.artist === album.artist && 
        track.albumName && (
          track.albumName.toLowerCase().includes(album.name.toLowerCase()) ||
          album.name.toLowerCase().includes(track.albumName.toLowerCase()) ||
          (album.name === 'Unknown Album' && track.albumName === 'Unknown Album')
        )
      );
      
      if (albumTracks.length > 0) {
        // Group tracks by name to handle duplicates using a Map for efficiency
        const trackGroups = new Map();
        
        albumTracks.forEach(track => {
          const key = track.trackName.toLowerCase();
          
          if (!trackGroups.has(key)) {
            trackGroups.set(key, {
              trackName: track.trackName,
              artist: track.artist,
              totalPlayed: 0,
              playCount: 0,
              variations: [track.trackName]
            });
          }
          
          const group = trackGroups.get(key);
          
          // Only include actual year-specific play stats
          if (selectedAlbumYear !== 'all') {
            // For year-specific mode, scale down the track stats
            // This is a rough approximation that should still align with the album totals
            const yearRatio = album.playCount / track.playCount;
            group.totalPlayed += track.totalPlayed * yearRatio;
            group.playCount += track.playCount * yearRatio;
          } else {
            // For all-time mode, use the full play stats
            group.totalPlayed += track.totalPlayed;
            group.playCount += track.playCount;
          }
          
          // Add variation if not already present
          if (!group.variations.includes(track.trackName)) {
            group.variations.push(track.trackName);
          }
        });
        
        // Convert to array and sort
        album.trackObjects = Array.from(trackGroups.values())
          .sort((a, b) => b.totalPlayed - a.totalPlayed);
      } else {
        album.trackObjects = [];
      }
      
      return album;
    }).filter(Boolean); // Remove any null results
  }, [topAlbums, albumsByYear, selectedAlbumYear, albumYearRangeMode, albumYearRange, selectedArtists, processedData, rawPlayData]);

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

  // Complex displayedArtists logic - memoized for performance
  const displayedArtists = useMemo(() => {
    // Important: Check yearRangeMode first, then check selectedArtistYear
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      // Check if dates include month/day information
      const startHasMonthDay = yearRange.startYear.includes('-');
      const endHasMonthDay = yearRange.endYear.includes('-');
      
      if (startHasMonthDay || endHasMonthDay) {
        // Parse dates into Date objects
        let startDate, endDate;
        
        try {
          // Parse start date with proper time bounds
          if (startHasMonthDay) {
            if (yearRange.startYear.split('-').length === 3) {
              // YYYY-MM-DD format
              startDate = new Date(yearRange.startYear);
              startDate.setHours(0, 0, 0, 0); // Start of day
            } else {
              // YYYY-MM format
              const [year, month] = yearRange.startYear.split('-').map(Number);
              startDate = new Date(year, month - 1, 1); // First day of month
            }
          } else {
            // Just year
            startDate = new Date(parseInt(yearRange.startYear), 0, 1); // January 1st
          }
          
          // Parse end date with proper time bounds
          if (endHasMonthDay) {
            if (yearRange.endYear.split('-').length === 3) {
              // YYYY-MM-DD format
              endDate = new Date(yearRange.endYear);
              endDate.setHours(23, 59, 59, 999); // End of day
            } else {
              // YYYY-MM format
              const [year, month] = yearRange.endYear.split('-').map(Number);
              // Last day of month
              endDate = new Date(year, month, 0, 23, 59, 59, 999);
            }
          } else {
            // Just year
            endDate = new Date(parseInt(yearRange.endYear), 11, 31, 23, 59, 59, 999); // December 31st
          }
          
          // Filter raw play data by date range - more efficiently with for loop
          const filteredPlayData = [];
          for (let i = 0; i < rawPlayData.length; i++) {
            const entry = rawPlayData[i];
            try {
              if (!entry.ts) continue;
              
              // Reuse parsed date if available
              let entryDate = entry._dateObj || new Date(entry.ts);
              if (isNaN(entryDate.getTime())) continue;
              
              // Cache parsed date
              if (!entry._dateObj) entry._dateObj = entryDate;
              
              if (entryDate >= startDate && entryDate <= endDate) {
                filteredPlayData.push(entry);
              }
            } catch (err) {
              continue;
            }
          }
          
          // Group data by artist using a Map for efficiency
          const artistMap = new Map();
          
          for (let i = 0; i < filteredPlayData.length; i++) {
            const entry = filteredPlayData[i];
            if (!entry.master_metadata_album_artist_name) continue;
            
            const artistName = entry.master_metadata_album_artist_name;
            
            if (!artistMap.has(artistName)) {
              artistMap.set(artistName, {
                name: artistName,
                totalPlayed: 0,
                playCount: 0,
                firstListen: entry.ts ? new Date(entry.ts).getTime() : Date.now(),
                firstSong: entry.master_metadata_track_name || 'Unknown',
                firstSongPlayCount: 1
              });
            }
            
            const artist = artistMap.get(artistName);
            artist.totalPlayed += entry.ms_played || 0;
            artist.playCount += 1;
            
            const timestamp = new Date(entry.ts);
            if (timestamp < new Date(artist.firstListen)) {
              artist.firstListen = timestamp.getTime();
              artist.firstSong = entry.master_metadata_track_name;
              artist.firstSongPlayCount = 1;
            } else if (entry.master_metadata_track_name === artist.firstSong) {
              artist.firstSongPlayCount += 1;
            }
          }
          
          // Convert to array and sort - more efficiently
          return Array.from(artistMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
        } catch (err) {
          console.error("Error processing date range:", err);
          return []; 
        }
      } else {
        // Year-only range without month/day specificity
        const startYear = parseInt(yearRange.startYear);
        const endYear = parseInt(yearRange.endYear);
        
        // Collect artists from years within the range - use a Map for deduplication
        const mergedArtists = new Map();
        
        for (let year = startYear; year <= endYear; year++) {
          const yearStr = year.toString();
          if (artistsByYear[yearStr] && Array.isArray(artistsByYear[yearStr])) {
            artistsByYear[yearStr].forEach(artist => {
              if (!artist || !artist.name) return;
              
              if (!mergedArtists.has(artist.name)) {
                // First time seeing this artist
                mergedArtists.set(artist.name, {...artist});
              } else {
                // Merge with existing artist data
                const existing = mergedArtists.get(artist.name);
                existing.totalPlayed += artist.totalPlayed || 0;
                existing.playCount += artist.playCount || 0;
                
                // Update most played song if necessary
                if (artist.mostPlayedSong && existing.mostPlayedSong &&
                    artist.mostPlayedSong.playCount > existing.mostPlayedSong.playCount) {
                  existing.mostPlayedSong = artist.mostPlayedSong;
                }
              }
            });
          }
        }
        
        return Array.from(mergedArtists.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
      }
    } else if (selectedArtistYear !== 'all') {
      // Check if the selectedArtistYear includes month/day information
      if (selectedArtistYear.includes('-')) {
        // Filter rawPlayData directly for more precise filtering
        const filteredPlayData = filterDataByDate(rawPlayData, selectedArtistYear);
        
        // Group the filtered play data by artist using a Map for efficiency
        const artistMap = new Map();
        
        for (let i = 0; i < filteredPlayData.length; i++) {
          const entry = filteredPlayData[i];
          if (!entry.master_metadata_album_artist_name) continue;
          
          const artistName = entry.master_metadata_album_artist_name;
          
          if (!artistMap.has(artistName)) {
            artistMap.set(artistName, {
              name: artistName,
              totalPlayed: 0,
              playCount: 0,
              firstListen: entry.ts ? new Date(entry.ts).getTime() : Date.now(),
              firstSong: entry.master_metadata_track_name || 'Unknown',
              firstSongPlayCount: 1
            });
          }
          
          const artist = artistMap.get(artistName);
          artist.totalPlayed += entry.ms_played || 0;
          artist.playCount += 1;
          
          const timestamp = new Date(entry.ts);
          if (timestamp < new Date(artist.firstListen)) {
            artist.firstListen = timestamp.getTime();
            artist.firstSong = entry.master_metadata_track_name;
            artist.firstSongPlayCount = 1;
          } else if (entry.master_metadata_track_name === artist.firstSong) {
            artist.firstSongPlayCount += 1;
          }
        }
        
        // Convert to array and sort
        return Array.from(artistMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
      } else {
        // Regular single year, use the existing data structure
        const yearArtists = artistsByYear[selectedArtistYear] || [];
        return yearArtists;
      }
    } else {
      // All-time mode: show the top artists
      return topArtists;
    }
  }, [topArtists, artistsByYear, selectedArtistYear, yearRangeMode, yearRange, rawPlayData]);

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
        console.log("Setting selectedAlbumYear to:", year);
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

  // Memoized TabButton component to prevent recreation
  const TabButton = useCallback(({ id, label }) => {
    // Helper function to get the color based on tab ID
    const getTabColor = (tabId) => {
      switch (tabId) {
        case 'updates':
          return activeTab === tabId 
            ? 'bg-cyan-50 text-cyan-600 border-b-2 border-cyan-600' 
            : 'bg-cyan-200 text-cyan-600 hover:bg-cyan-300';
        case 'upload':
          return activeTab === tabId 
            ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' 
            : 'bg-orange-200 text-orange-600 hover:bg-orange-300';
        case 'stats':
          return activeTab === tabId 
            ? 'bg-purple-100 text-purple-600 border-b-2 border-purple-600' 
            : 'bg-purple-200 text-purple-600 hover:bg-purple-300';
        case 'artists':
          return activeTab === tabId 
            ? 'bg-emerald-50 text-teal-600 border-b-2 border-teal-600' 
            : 'bg-emerald-100 text-teal-600 hover:bg-teal-200';
        case 'albums':
          return activeTab === tabId 
            ? 'bg-rose-50 text-pink-600 border-b-2 border-pink-600' 
            : 'bg-rose-200 text-pink-600 hover:bg-pink-300';
        case 'tracks':
          return activeTab === tabId 
            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
            : 'bg-blue-200 text-blue-600 hover:bg-blue-300';
        case 'custom':
          return activeTab === tabId 
            ? 'bg-yellow-100 text-yellow-600 border-b-2 border-yellow-600' 
            : 'bg-yellow-200 text-yellow-600 hover:bg-yellow-300';
        case 'playlists':
          return activeTab === tabId 
            ? 'bg-red-50 text-red-600 border-b-2 border-red-600' 
            : 'bg-red-200 text-red-600 hover:bg-red-300';
        case 'podcasts':
          return activeTab === tabId 
            ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' 
            : 'bg-indigo-200 text-indigo-600 hover:bg-indigo-300';
        case 'patterns':
          return activeTab === tabId 
            ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' 
            : 'bg-purple-200 text-purple-600 hover:bg-purple-300';
        case 'behavior':
          return activeTab === tabId 
            ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' 
            : 'bg-indigo-200 text-indigo-600 hover:bg-indigo-300';
        case 'discovery':
          return activeTab === tabId 
            ? 'bg-green-50 text-green-600 border-b-2 border-green-600' 
            : 'bg-green-200 text-green-600 hover:bg-green-300';
        default:
          return '';
      }
    };

    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-2 sm:px-4 py-2 font-medium text-sm sm:text-base ${getTabColor(id)}`}
      >
        {label}
      </button>
    );
  }, [activeTab]);

  return (
    <Card className="w-full max-w-full sm:max-w-4xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl h-full">
      <CardHeader className="px-2 sm:px-6 flex justify-between items-center">
        <CardTitle className="text-yellow-400 dark:text-yellow-300">Streaming History Analyzer</CardTitle>
        <DarkModeToggle />
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="space-y-4">
          <div className="overflow-x-auto -mx-2 sm:-mx-4 px-2 sm:px-4">
            <div className="flex gap-1 sm:gap-2 border-b border-violet-200 min-w-max text-sm sm:text-base">
              {stats && <TabButton id="updates" label="Updates" />} 
              <TabButton id="upload" label="Upload" />
              {stats && <TabButton id="stats" label="Statistics" />}
              {topArtists.length > 0 && <TabButton id="artists" label={getArtistsTabLabel()} />}
              {topAlbums.length > 0 && <TabButton id="albums" label={getAlbumsTabLabel()} />}
              {processedData.length > 0 && <TabButton id="custom" label={getCustomTabLabel()}  />}
              {processedData.length > 0 && <TabButton id="tracks" label={getTracksTabLabel()} />}
              {processedData.length > 0 && <TabButton id="patterns" label={getPatternsTabLabel()} />}
              {processedData.length > 0 && <TabButton id="behavior" label={getBehaviorTabLabel()} />}
              {processedData.length > 0 && <TabButton id="discovery" label="Music Discovery" />}
              {rawPlayData.length > 0 && <TabButton id="podcasts" label="Podcasts" />}
              {processedData.length > 0 && <TabButton id="playlists" label="Custom Playlists" />}
            </div>
          </div>
          
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-teal-700">
                  {selectedArtistYear === 'all' ? 'Most Played Artists (All Time)' : 
                    yearRangeMode && yearRange.startYear && yearRange.endYear ? 
                    `Most Played Artists (${yearRange.startYear}-${yearRange.endYear})` : 
                    `Most Played Artists (${selectedArtistYear})`}
                </h3>
                
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

                          <div className="absolute bottom-1 right-3 text-teal-600 text-[2rem]">{originalIndex + 1}</div>
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
          
          {showYearSidebar && (
            <YearSelector
              artistsByYear={artistsByYear}
              rawPlayData={rawPlayData}
              activeTab={activeTab}
              onYearChange={handleSidebarYearChange}
              onYearRangeChange={handleSidebarYearRangeChange}
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
      </CardContent>
    </Card>
  );
};

export default SpotifyAnalyzer;