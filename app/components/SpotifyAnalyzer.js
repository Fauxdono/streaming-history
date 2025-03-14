"use client";

import React, { useState, useCallback, useMemo, useEffect} from 'react';
import { streamingProcessor, STREAMING_TYPES, STREAMING_SERVICES } from './streaming-adapter.js';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import ExportButton from './ExportButton.js';
import CustomTrackRankings from './CustomTrackRankings.js';
import TrackRankings from './TrackRankings.js';
import PodcastRankings from './podcast-rankings.js';
import _ from 'lodash';
import ListeningPatterns from './listening-patterns.js';
import ListeningBehavior from './listening-behavior.js';
import DiscoveryAnalysis from './discovery-analysis.js';
import { X, Trash2, Check, ChevronUp, ChevronDown } from 'lucide-react';
import YearSelector from './year-selector.js';
import SupportOptions from './support-options.js';
import AlbumCard from './albumcard.js';

const calculateSpotifyScore = (playCount, totalPlayed, lastPlayedTimestamp) => {
  const now = new Date();
  const daysSinceLastPlay = (now - lastPlayedTimestamp) / (1000 * 60 * 60 * 24);
  const recencyWeight = Math.exp(-daysSinceLastPlay / 180);
  const playTimeWeight = Math.min(totalPlayed / (3 * 60 * 1000), 1);
  return playCount * recencyWeight * playTimeWeight;
};

const SpotifyAnalyzer = () => {
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
  const [selectedAlbumYear, setSelectedAlbumYear] = useState('all');
  const [albumYearRangeMode, setAlbumYearRangeMode] = useState(false);
  const [albumYearRange, setAlbumYearRange] = useState({ startYear: '', endYear: '' });
  const [albumsByYear, setAlbumsByYear] = useState({});


  // Define service colors
  const serviceColors = {
    spotify: {
      unselected: 'bg-green-400 text-black',
      selected: 'bg-green-500 text-black'
    },
    apple_music: {
      unselected: 'bg-red-400 text-white',
      selected: 'bg-red-500 text-white'
    },
    youtube_music: {
      unselected: 'bg-red-400 text-black',
      selected: 'bg-red-600 text-black'
    },
    deezer: {
      unselected: 'bg-purple-300 text-black',
      selected: 'bg-purple-600 text-black'
    },
    soundcloud: {
      unselected: 'bg-orange-400 text-white',
      selected: 'bg-orange-600 text-white'
    }
  };
  
const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    
    const remainingMinutes = minutes % 60;
    return hours > 0 ? 
      `${hours}h ${remainingMinutes}m` : 
      `${remainingMinutes}m`;
  };

  useEffect(() => {
    // When in single year mode and the selected year is 'all',
    // update the year display text
    if (!yearRangeMode && selectedArtistYear === 'all') {
      // Force the BetterYearSlider to show "All-Time" instead of a specific year
      const updateAllTimeText = () => {
        const yearDisplay = document.querySelector('.year-display');
        if (yearDisplay && yearDisplay.textContent !== 'All-Time') {
          console.log("Forcing All-Time text");
          yearDisplay.textContent = 'All-Time';
        }
      };
      
      // Try multiple times to ensure it persists
      updateAllTimeText();
      setTimeout(updateAllTimeText, 50);
      setTimeout(updateAllTimeText, 100);
      setTimeout(updateAllTimeText, 300);
    }
  }, [yearRangeMode, selectedArtistYear]);

  const filteredArtists = useMemo(() => {
    const allArtists = Array.from(new Set(topAlbums.map(album => album.artist))).sort();
    return allArtists
      .filter(artist => 
        artist.toLowerCase().includes(artistSearch.toLowerCase()) &&
        !selectedArtists.includes(artist)
      )
      .slice(0, 10);
  }, [topAlbums, artistSearch, selectedArtists]);

  const sortedYears = useMemo(() => {
    return Object.keys(artistsByYear).sort((a, b) => a - b);
  }, [artistsByYear]);

  const toggleYearRangeMode = (value) => {
    // If value is provided, use it directly; otherwise toggle the current state
    const newMode = typeof value === 'boolean' ? value : !yearRangeMode;
    console.log("Setting year range mode to:", newMode);
    
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
  };

const handleAlbumYearRangeChange = ({ startYear, endYear }) => {
  // Validate the years
  if (!startYear || !endYear) {
    return;
  }
  
  // Ensure we're in year range mode
  setAlbumYearRangeMode(true);
  
  // Update the year range state
  setAlbumYearRange({ startYear, endYear });
};

const toggleAlbumYearRangeMode = (value) => {
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
};

const getAlbumsTabLabel = () => {
  if (selectedAlbumYear === 'all') {
    return 'All-time Albums';
  } else if (albumYearRangeMode && albumYearRange.startYear && albumYearRange.endYear) {
    return `${albumYearRange.startYear}-${albumYearRange.endYear} Albums`;
  }
  return `${selectedAlbumYear} Albums`;
};


const displayedAlbums = useMemo(() => {
  console.log("Calculating displayedAlbums with filter:", {
    selectedAlbumYear,
    mode: albumYearRangeMode ? "range" : "single"
  });

  // First determine which albums to show based on year filter
  let filteredAlbums;
  
  if (albumYearRangeMode && albumYearRange.startYear && albumYearRange.endYear) {
    // Year range mode - collect albums from multiple years
    filteredAlbums = [];
    const startYear = parseInt(albumYearRange.startYear);
    const endYear = parseInt(albumYearRange.endYear);
    
    // Collect albums from each year in the range
    for (let year = startYear; year <= endYear; year++) {
      if (albumsByYear[year]) {
        filteredAlbums = [...filteredAlbums, ...albumsByYear[year]];
      }
    }
    
    // Remove duplicates (same album might appear in multiple years)
    // When removing duplicates, combine the play counts
    const albumIdMap = new Map();
    
    filteredAlbums.forEach(album => {
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
  } else if (selectedAlbumYear !== 'all') {
    // Single year mode - use the year-specific album data
    // Important: make deep copies to avoid modifying the original
    filteredAlbums = albumsByYear[selectedAlbumYear] ? 
                   JSON.parse(JSON.stringify(albumsByYear[selectedAlbumYear])) : 
                   [];
  } else {
    // All-time mode - use the complete album data
    filteredAlbums = JSON.parse(JSON.stringify(topAlbums));
  }
  
  // Then apply artist filtering if needed
  if (selectedArtists.length > 0) {
    filteredAlbums = filteredAlbums.filter(album => selectedArtists.includes(album.artist));
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
      // Group tracks by name to handle duplicates
      const trackGroups = {};
      
      albumTracks.forEach(track => {
        const key = track.trackName.toLowerCase();
        
        if (!trackGroups[key]) {
          trackGroups[key] = {
            trackName: track.trackName,
            artist: track.artist,
            totalPlayed: 0,
            playCount: 0,
            variations: [track.trackName]
          };
        }
        
        // Only include actual year-specific play stats
        if (selectedAlbumYear !== 'all') {
          // For year-specific mode, scale down the track stats
          // This is a rough approximation that should still align with the album totals
          const yearRatio = album.playCount / track.playCount;
          trackGroups[key].totalPlayed += track.totalPlayed * yearRatio;
          trackGroups[key].playCount += track.playCount * yearRatio;
        } else {
          // For all-time mode, use the full play stats
          trackGroups[key].totalPlayed += track.totalPlayed;
          trackGroups[key].playCount += track.playCount;
        }
        
        // Add variation if not already present
        if (!trackGroups[key].variations.includes(track.trackName)) {
          trackGroups[key].variations.push(track.trackName);
        }
      });
      
      // Convert to array and sort
      album.trackObjects = Object.values(trackGroups)
        .sort((a, b) => b.totalPlayed - a.totalPlayed);
    } else {
      album.trackObjects = [];
    }
    
    return album;
  }).filter(Boolean); // Remove any null results
}, [topAlbums, albumsByYear, selectedAlbumYear, albumYearRangeMode, albumYearRange, selectedArtists, processedData]);
  // Toggle a service in the selection
  const toggleServiceSelection = (serviceType) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceType)) {
        return prev.filter(s => s !== serviceType);
      } else {
        return [...prev, serviceType];
      }
    });
  };

  // Toggle service info visibility
  const toggleServiceInfo = (serviceType) => {
    setShowServiceInfo(prev => ({
      ...prev,
      [serviceType]: !prev[serviceType]
    }));
  };

  // Get accepted file formats for all selected services
  const getAcceptedFormats = () => {
    return selectedServices
      .map(service => STREAMING_SERVICES[service].acceptedFormats)
      .join(',');
  };

  // Update the displayedArtists useMemo function in SpotifyAnalyzer.js
  // This is the critical part that filters the artists based on the selected year or year range
  const displayedArtists = useMemo(() => {
    console.log("Re-calculating displayed artists:", {
      mode: yearRangeMode ? "range" : "single",
      selectedYear: selectedArtistYear,
      range: yearRangeMode ? `${yearRange.startYear}-${yearRange.endYear}` : "none"
    });

    // Important: Check yearRangeMode first, then check selectedArtistYear
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      // Year range mode: collect and merge artists from the range
      const startYear = parseInt(yearRange.startYear);
      const endYear = parseInt(yearRange.endYear);
      
      console.log(`Filtering artists for range ${startYear}-${endYear}`, 
        "Available years:", Object.keys(artistsByYear));
      
      // Check if artistsByYear has any entries
      const availableYears = Object.keys(artistsByYear);
      console.log("Available years:", availableYears);
      
      if (availableYears.length === 0) {
        console.warn("artistsByYear is empty!");
        return [];
      }
      
      // Collect artists from years within the range
      const rangeArtists = Object.entries(artistsByYear)
        .filter(([year]) => {
          const yearNum = parseInt(year);
          const isInRange = yearNum >= startYear && yearNum <= endYear;
          console.log(`Year ${year} in range ${startYear}-${endYear}? ${isInRange}`);
          return isInRange;
        })
        .flatMap(([year, artists]) => {
          console.log(`Adding ${artists.length} artists from year ${year}`);
          return artists;
        });
      
      console.log(`Found ${rangeArtists.length} artists within the range`);
      
      if (rangeArtists.length === 0) {
        console.log("No artists found in the selected year range");
        return [];
      }
      
      // Merge artists from different years
      const mergedArtists = {};
      rangeArtists.forEach(artist => {
        const name = artist.name;
        
        if (!mergedArtists[name]) {
          // First time seeing this artist
          mergedArtists[name] = {...artist};
        } else {
          // Merge with existing artist data
          mergedArtists[name].totalPlayed += artist.totalPlayed;
          mergedArtists[name].playCount += artist.playCount;
          
          // Update most played song if necessary
          if (artist.mostPlayedSong && mergedArtists[name].mostPlayedSong &&
              artist.mostPlayedSong.playCount > mergedArtists[name].mostPlayedSong.playCount) {
            mergedArtists[name].mostPlayedSong = artist.mostPlayedSong;
          }
        }
      });
      
      // Convert back to array and sort by total play time
      const result = Object.values(mergedArtists)
        .sort((a, b) => b.totalPlayed - a.totalPlayed);
      
      console.log(`Returning ${result.length} artists for year range ${startYear}-${endYear}`);
      return result;
    } else if (selectedArtistYear === 'all') {
      // All-time mode: show the top artists
      return topArtists;
    } else {
      // Single year mode
      const yearArtists = artistsByYear[selectedArtistYear] || [];
      console.log(`Found ${yearArtists.length} artists for year ${selectedArtistYear}`);
      return yearArtists;
    }
  }, [topArtists, artistsByYear, selectedArtistYear, yearRangeMode, yearRange]);

  const processFiles = useCallback(async (fileList) => {
    // Set loading state and wait for next render cycle
    setIsProcessing(true);
    console.log("Starting to process files:", fileList);
    await new Promise(resolve => setTimeout(resolve, 0));
    
    try {
      const results = await streamingProcessor.processFiles(fileList);
      console.log("Got results:", results);
      console.log('Total Artists:', results.topArtists.length);
      setStats(results.stats);
      setTopArtists(results.topArtists);
      setArtistsByYear(results.artistsByYear || {});
      setTopAlbums(results.topAlbums);
      setAlbumsByYear(results.albumsByYear || {});

      
      // Make sure we're using the totalPlayed value for sorting in the main list too
      const sortedTracks = _.orderBy(results.processedTracks, ['totalPlayed'], ['desc']);
      setProcessedData(sortedTracks);
      
      setSongsByYear(results.songsByYear);
      setBriefObsessions(results.briefObsessions);
      setRawPlayData(results.rawPlayData);

      const fileNames = Array.from(fileList).map(file => file.name);
      setUploadedFiles(fileNames);

      setActiveTab('stats');
    } catch (err) {
      console.error("Error processing files:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileUpload = (e) => {
    const newFiles = e.target.files;
    if (!newFiles || newFiles.length === 0) return;
    
    // Create an array to store the new file objects
    const newFileObjects = Array.from(newFiles);
    
    // Combine existing files with new files
    let combinedFiles;
    if (uploadedFileList) {
      combinedFiles = [...uploadedFileList, ...newFileObjects];
    } else {
      combinedFiles = newFileObjects;
    }
    
    // Update file names for display - just using the names
    const updatedFileNames = combinedFiles.map(file => file.name);
    
    // Update state with combined files
    setUploadedFileList(combinedFiles);
    setUploadedFiles(updatedFileNames);
  };

  // Add the handleDeleteFile function here
  const handleDeleteFile = (indexToDelete) => {
    // Remove the file from uploadedFiles array
    const updatedFileNames = uploadedFiles.filter((_, index) => index !== indexToDelete);
    
    // Create a new array without the deleted file
    if (uploadedFileList) {
      const remainingFiles = uploadedFileList.filter((_, index) => index !== indexToDelete);
      
      // Check if we've removed all files
      if (remainingFiles.length === 0) {
        setUploadedFileList(null);
      } else {
        setUploadedFileList(remainingFiles);
      }
    }
    
    setUploadedFiles(updatedFileNames);
  };

  const handleProcessFiles = () => {
    if (!uploadedFileList || uploadedFileList.length === 0) {
      setError("Please upload files first");
      return;
    }
    
    setIsProcessing(true);
    
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
  };

  const handleYearRangeChange = ({ startYear, endYear }) => {
    console.log("Year range changed:", startYear, endYear);
    
    // Validate the years
    if (!startYear || !endYear) {
      console.warn("Invalid year range:", { startYear, endYear });
      return;
    }
    
    // Ensure we're in year range mode
    setYearRangeMode(true);
    
    // Update the year range state
    setYearRange({ startYear, endYear });
    
    // Log the range for debugging
    console.log("Set year range to:", { startYear, endYear });
  };

  const getTracksTabLabel = () => { 
    if (selectedTrackYear === 'all') { 
      return 'All-time Top 250'; 
    } 
    return `Top 100 ${selectedTrackYear}`; 
  };

  const getArtistsTabLabel = () => {
    if (selectedArtistYear === 'all') {
      return 'All-time Artists';
    } else if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `${yearRange.startYear}-${yearRange.endYear} Artists`;
    }
    return `${selectedArtistYear} Artists`;
  };

  const TabButton = ({ id, label }) => {
    const getTabColor = (tabId) => {
      switch (tabId) {
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
        className={`px-4 py-2 font-medium ${getTabColor(id)}`}
      >
        {label}
      </button>
    );
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-yellow-400">Streaming History Analyzer</CardTitle>
      </CardHeader>
      <CardContent>
       <div className="space-y-4">
         <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 border-b border-violet-200 min-w-max"> 
            <TabButton id="upload" label="Upload" />
            {stats && <TabButton id="stats" label="Statistics" />}
            {topArtists.length > 0 && <TabButton id="artists" label={getArtistsTabLabel()} />}
      {topAlbums.length > 0 && <TabButton id="albums" label={getAlbumsTabLabel()} />}
            {processedData.length > 0 && <TabButton id="tracks" label={getTracksTabLabel()} />}
            {processedData.length > 0 && <TabButton id="custom" label="Custom Date Range" />}
            {rawPlayData.length > 0 && <TabButton id="podcasts" label="Podcasts" />}
            {processedData.length > 0 && <TabButton id="patterns" label="Listening Patterns" />}
            {processedData.length > 0 && <TabButton id="behavior" label="Listening Behavior" />}
            {processedData.length > 0 && <TabButton id="discovery" label="Music Discovery" />}
          </div>
        </div>
        
        {activeTab === 'upload' && (
          <div>
            <div className="p-4 border rounded bg-blue-50">
              <h3 className="font-semibold mb-2 text-blue-900">How to use:</h3>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Select your streaming service below</li>
                <li>Download your streaming history</li>
                <li>Upload your file(s)</li>
                <li>Click "Calculate Statistics"</li>
              </ol>
            </div>
            
            <h3 className="font-bold text-orange-700 mb-3">Select Streaming Services:</h3>
                     
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {Object.entries(STREAMING_SERVICES).map(([type, service]) => (
                <div key={type} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleServiceSelection(type)}
                    className={`w-full px-4 py-2 flex justify-between items-center transition-colors ${
                      selectedServices.includes(type)
                       ? serviceColors[type]?.selected || 'bg-gray-600 text-white'
                        : serviceColors[type]?.unselected || 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{service.name}</span>
                    {selectedServices.includes(type) && <Check size={18} />}
                  </button>
                  
                  <div className="px-4 py-2 border-t bg-white">
                    <button 
                      onClick={() => toggleServiceInfo(type)}
                      className="flex items-center text-sm text-orange-600 hover:text-orange-800"
                    >
                      {showServiceInfo[type] ? 
                        <><ChevronUp size={16} className="mr-1" /> Hide Details</> : 
                        <><ChevronDown size={16} className="mr-1" /> Show Details</>
                      }
                    </button>
                    
                    {showServiceInfo[type] && (
                      <div className="mt-2 text-sm text-orange-700">
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
                    className="w-48 h-48 object-contain animate-rock bg-transparent"
                    style={{ 
                      backgroundColor: 'transparent',
                      mixBlendMode: 'multiply'
                    }}
                  />
                  <p 
                    className="text-xl text-blue-600 mt-2 animate-rainbow" 
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
          <div className="p-4 bg-purple-100 rounded border-2 border-purple-300">
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
    />
    <SupportOptions className="h-full" />
  </div>
)}
            </div>
          </div>
        )}
                
        {activeTab === 'artists' && (
          <div className="p-4 bg-teal-100 rounded border-2 border-teal-300">
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
            
            <YearSelector 
              artistsByYear={artistsByYear}
              onYearChange={setSelectedArtistYear}
              onYearRangeChange={handleYearRangeChange}
              initialYear={selectedArtistYear !== 'all' ? selectedArtistYear : null}
              initialYearRange={yearRange}
              isRangeMode={yearRangeMode}
              onToggleRangeMode={toggleYearRangeMode}
              colorTheme="teal"
            />

            {/* Add empty state handling */}
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
                  }}
                  className="mt-4 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
                >
                  Show All Artists
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedArtists.slice(0,topArtistsCount).map((artist, index) => (
                  <div key={artist.name} 
                    className="p-3 bg-white rounded shadow-sm border-2 border-teal-200 hover:border-teal-400 transition-colors cursor-pointer relative"
                    onClick={() => {
                      setSelectedArtists([artist.name]);
                      setActiveTab('custom');
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
                      {artist.longestStreak > 1 && (
                        <>
                          <br/>
                          First Song: <span className="font-bold">
                            {artist.firstSong || "Unknown"} 
                            {artist.firstSongPlayCount 
                              ? ` (${artist.firstSongPlayCount}x)` 
                              : ""}
                          </span>
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
                    <div className="absolute bottom-1 right-3 text-teal-600 text-[2rem]">{index + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
{activeTab === 'albums' && (
  <div className="p-4 bg-pink-100 rounded border-2 border-pink-300">
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
    
    {/* Year Selector for Albums */}
    <YearSelector 
      artistsByYear={artistsByYear}
      onYearChange={setSelectedAlbumYear}
      onYearRangeChange={handleAlbumYearRangeChange}
      initialYear={selectedAlbumYear !== 'all' ? selectedAlbumYear : null}
      initialYearRange={albumYearRange}
      isRangeMode={albumYearRangeMode}
      onToggleRangeMode={toggleAlbumYearRangeMode}
      colorTheme="pink"
    />
    
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="p-4 bg-blue-100 rounded border-2 border-blue-300">
            <h3 className="font-bold mb-2 text-blue-700">Track Rankings</h3>
            <TrackRankings 
              processedData={processedData} 
              briefObsessions={briefObsessions} 
              formatDuration={formatDuration} 
              songsByYear={songsByYear}
              songsByMonth={songsByMonth}
              onYearChange={setSelectedTrackYear}
            />
          </div>
        )}

        {activeTab === 'custom' && (
          <div 
            id="custom-track-rankings"
            className="p-4 bg-orange-100 rounded border-2 border-orange-300"
          >
            <h3 className="font-bold mb-2 text-orange-700">Custom Date Range Analysis</h3>
            <CustomTrackRankings 
              rawPlayData={rawPlayData}
              formatDuration={formatDuration}
              initialArtists={selectedArtists}
            />
          </div>
        )}
        
        {activeTab === 'podcasts' && (
          <div 
            id="podcast-rankings"
            className="p-4 bg-indigo-100 rounded border-2 border-indigo-300"
          >
            <h3 className="font-bold mb-2 text-indigo-700">Podcast Analysis</h3>
            <PodcastRankings 
              rawPlayData={rawPlayData}
              formatDuration={formatDuration}
            />
          </div>
        )}
        
        {activeTab === 'patterns' && (
          <div className="p-4 bg-purple-100 rounded border-2 border-purple-300">
            <h3 className="font-bold mb-2 text-purple-700">Listening Patterns</h3>
            <ListeningPatterns 
              rawPlayData={rawPlayData} 
              formatDuration={formatDuration} 
            />
          </div>
        )}

        {activeTab === 'behavior' && (
          <div className="p-4 bg-indigo-100 rounded border-2 border-indigo-300">
            <h3 className="font-bold mb-2 text-indigo-700">Listening Behavior</h3>
            <ListeningBehavior 
              rawPlayData={rawPlayData} 
              formatDuration={formatDuration} 
            />
          </div>
        )}

        {activeTab === 'discovery' && (
          <div className="p-4 bg-green-100 rounded border-2 border-green-300">
            <h3 className="font-bold mb-2 text-green-700">Music Discovery</h3>
            <DiscoveryAnalysis 
              rawPlayData={rawPlayData} 
              formatDuration={formatDuration} 
            />
          </div>
        )}
       </div>
      </CardContent>
    </Card>
  );
};

export default SpotifyAnalyzer;