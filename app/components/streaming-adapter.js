import Papa from 'papaparse';
import _ from 'lodash';
import * as XLSX from 'xlsx'; // Make sure XLSX is imported for Deezer XLSX support

// Define a common structure for streaming data
export const STREAMING_TYPES = {
  SPOTIFY: 'spotify',
  APPLE_MUSIC: 'apple_music',
  YOUTUBE_MUSIC: 'youtube_music',
  TIDAL: 'tidal',
  DEEZER: 'deezer'
};

// Service metadata for UI
export const STREAMING_SERVICES = {
  [STREAMING_TYPES.SPOTIFY]: {
    name: 'Spotify',
    downloadUrl: 'https://www.spotify.com/account/privacy/',
    instructions: 'Request your "Extended streaming history" and wait for the email (can take up to 5 days)',
    acceptedFormats: '.json'
  },
  [STREAMING_TYPES.APPLE_MUSIC]: {
    name: 'Apple Music',
    downloadUrl: 'https://privacy.apple.com/',
    instructions: 'Go to URL and request a copy of your data and Apple_Media_Services/Apple Music Activity/Apple Music - Play History Daily Tracks',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.YOUTUBE_MUSIC]: {
    name: 'YouTube Music',
    downloadUrl: 'https://takeout.google.com/',
    instructions: 'Select YouTube and YouTube Music data in Google Takeout',
    acceptedFormats: '.json,.csv'
  },
  [STREAMING_TYPES.DEEZER]: {
    name: 'Deezer',
    downloadUrl: 'https://www.deezer.com/account/privacy',
    instructions: 'Go to Account Settings and in the third tab Private information above your birthdate you see My personal data next to Privacy Settings press then download your listening history',
    acceptedFormats: '.csv,.xlsx' // Updated to include XLSX format
  }
};

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\(feat\..*?\)/g, '') // Remove featuring artists
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function createMatchKey(trackName, artistName) {
  // Special case for "Just Dropped In"
  if (trackName && artistName && 
      trackName.toLowerCase().includes("just dropped in") && 
      artistName.toLowerCase().includes("kenny rogers")) {
    return "just-dropped-in-kenny-rogers";
  }
  return `${normalizeString(trackName)}-${normalizeString(artistName)}`;
}

function calculatePlayStats(entries) {
  const allSongs = [];
  const artistStats = {};
  const albumStats = {};
  const songPlayHistory = {};
  const serviceListeningTime = {};
  let totalListeningTime = 0;
  let processedSongs = 0;
  let shortPlays = 0;

  // Simple track map for combining same tracks
  const trackMap = {};
  
  // Track album information by track/artist combination in a more direct way
  const albumLookup = {};
  
  // First, collect all album information from all sources
  entries.forEach(entry => {
    if (entry.master_metadata_track_name && 
        entry.master_metadata_album_artist_name) {
      
      // Create a simple lookup key based on track name and artist
      const lookupKey = `${entry.master_metadata_track_name.toLowerCase()}|||${entry.master_metadata_album_artist_name.toLowerCase()}`;
      
      // Prioritize Spotify album info over other sources
      if (entry.source === 'spotify' && entry.master_metadata_album_album_name) {
        albumLookup[lookupKey] = entry.master_metadata_album_album_name;
      } 
      // If no album info for this track yet, use whatever we have
      else if (!albumLookup[lookupKey] && entry.master_metadata_album_album_name) {
        albumLookup[lookupKey] = entry.master_metadata_album_album_name;
      }
    }
  });
  
  console.log("Album lookup map created with", Object.keys(albumLookup).length, "entries");
  
  // Now process all entries with the album information
  entries.forEach(entry => {
    const playTime = entry.ms_played;
    
    // Skip invalid entries
    if (!entry.master_metadata_track_name || playTime < 30000) {
      if (playTime < 30000) shortPlays++;
      return;
    }

    processedSongs++;
    totalListeningTime += playTime;

const service = entry.source || 'unknown';
if (!serviceListeningTime[service]) {
  serviceListeningTime[service] = 0;
}
serviceListeningTime[service] += playTime;

    const trackName = entry.master_metadata_track_name;
    const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
    
    // Lookup key for album information
    const lookupKey = `${trackName.toLowerCase()}|||${artistName.toLowerCase()}`;
    
    // Get album name from our lookup first, fall back to the entry's album name
    let albumName = albumLookup[lookupKey] || 
                  entry.master_metadata_album_album_name || 
                  'Unknown Album';
    
    // Create keys for lookups
    const standardKey = `${trackName}-${artistName}`;
    const matchKey = createMatchKey(trackName, artistName);
    
    // Parse timestamp safely
    let timestamp;
    if (entry.ts instanceof Date) {
      timestamp = entry.ts;
    } else if (typeof entry.ts === 'string') {
      timestamp = new Date(entry.ts);
    } else {
      timestamp = new Date();
    }

    // Track play history - FIXED to handle different timestamp formats
    if (!songPlayHistory[standardKey]) {
      songPlayHistory[standardKey] = [];
    }
    
    // Handle different timestamp formats safely
    if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
      songPlayHistory[standardKey].push(timestamp.getTime());
    } else if (typeof timestamp === 'number') {
      songPlayHistory[standardKey].push(timestamp);
    } else {
      console.warn('Unexpected timestamp format or invalid date:', timestamp);
      songPlayHistory[standardKey].push(new Date().getTime());
    }

    // Artist stats
    if (!artistStats[artistName]) {
      artistStats[artistName] = {
        name: artistName,
        totalPlayed: 0,
        playCount: 0,
        firstListen: timestamp.getTime(),
        firstSong: trackName
      };
    }
    artistStats[artistName].totalPlayed += playTime;
    artistStats[artistName].playCount++;
    artistStats[artistName].firstListen = Math.min(
      artistStats[artistName].firstListen, 
      timestamp.getTime()
    );

// Optionally track the first song if it wasn't set before
if (!artistStats[artistName].firstSong) {
  artistStats[artistName].firstSong = trackName;
}

    // Album stats
    if (albumName && artistName) {
      const albumKey = `${albumName}-${artistName}`;
      if (!albumStats[albumKey]) {
        albumStats[albumKey] = {
          name: albumName,
          artist: artistName,
          totalPlayed: 0,
          playCount: 0,
          trackCount: new Set(),
          firstListen: timestamp.getTime()
        };
      }
      albumStats[albumKey].totalPlayed += playTime;
      albumStats[albumKey].playCount++;
      albumStats[albumKey].trackCount.add(trackName);
      albumStats[albumKey].firstListen = Math.min(
        albumStats[albumKey].firstListen, 
        timestamp.getTime()
      );
    }

    // Use simple object instead of Map for better performance
    if (trackMap[matchKey]) {
      // Update existing track
      trackMap[matchKey].totalPlayed += playTime;
      trackMap[matchKey].playCount++;
      
      // Always take the known album name if we've found a better one
      if (albumName !== 'Unknown Album' && trackMap[matchKey].albumName === 'Unknown Album') {
        trackMap[matchKey].albumName = albumName;
      }
    } else {
      // Add new track
      trackMap[matchKey] = {
        key: standardKey,
        trackName,
        artist: artistName,
        albumName,
        totalPlayed: playTime,
        playCount: 1
      };
    }
  });

  // Convert track map to array
  for (const key in trackMap) {
    allSongs.push(trackMap[key]);
  }

  return {
    songs: allSongs,
    artists: artistStats,
    albums: albumStats,
    playHistory: songPlayHistory,
    totalListeningTime,
    serviceListeningTime,
    processedSongs,
    shortPlays
  };
}

function calculateArtistStreaks(timestamps) {
  // Sort timestamps and convert to unique days (YYYY-MM-DD format)
  const days = [...new Set(
    timestamps.map(ts => new Date(ts).toISOString().split('T')[0])
  )].sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let streakStart = null;
  let streakEnd = null;

  for (let i = 0; i < days.length; i++) {
    const currentDate = new Date(days[i]);
    const previousDate = i > 0 ? new Date(days[i - 1]) : null;
    
    if (!previousDate || 
        (currentDate - previousDate) / (1000 * 60 * 60 * 24) === 1) {
      // Continuing streak
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        streakEnd = currentDate;
        streakStart = new Date(days[i - currentStreak + 1]);
      }
    } else {
      // Break in streak
      currentStreak = 1;
    }
  }

  // Check if current streak is still active
  const lastPlay = new Date(days[days.length - 1]);
  const now = new Date();
  const daysSinceLastPlay = Math.floor((now - lastPlay) / (1000 * 60 * 60 * 24));
  const activeStreak = daysSinceLastPlay <= 1 ? currentStreak : 0;

  return {
    longestStreak,
    currentStreak: activeStreak,
    streakStart,
    streakEnd
  };
}

function calculateBriefObsessions(songs, songPlayHistory) {
  const briefObsessionsArray = [];
 
  songs.forEach(song => {
    if (song.playCount <= 50) {
      const timestamps = songPlayHistory[song.key] || [];
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a - b);
        
        let maxPlaysInWeek = 0;
        let bestWeekStart = null;
        
        for (let i = 0; i < timestamps.length; i++) {
          const weekEnd = new Date(timestamps[i]);
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekStart.getDate() - 7);
          
          const playsInWeek = timestamps.filter(t => t >= weekStart && t <= weekEnd).length;
          
          if (playsInWeek > maxPlaysInWeek) {
            maxPlaysInWeek = playsInWeek;
            bestWeekStart = weekStart;
          }
        }
        
        if (maxPlaysInWeek >= 5) {
          briefObsessionsArray.push({
            ...song,
            intensePeriod: {
              weekStart: bestWeekStart,
              playsInWeek: maxPlaysInWeek
            }
          });
        }
      }
    }
  });

  return _.orderBy(
    briefObsessionsArray,
    ['intensePeriod.playsInWeek', 'intensePeriod.weekStart'],
    ['desc', 'asc']
  ).slice(0, 100);
}

function calculateSongsByYear(songs, songPlayHistory) {
  const songsByYear = {};
  let dateErrors = 0;
  
  songs.forEach(song => {
    const timestamps = songPlayHistory[song.key] || [];
    if (timestamps.length > 0) {
      // Group by year with extra validation
      const playsByYear = _.groupBy(timestamps, ts => {
        try {
          const date = new Date(ts);
          
          // Check if date is valid
          if (isNaN(date.getTime())) {
            dateErrors++;
            return 2022; // Default to 2022 for invalid dates
          }
          
          // Check if date is from the future
          const currentYear = new Date().getFullYear();
          const year = date.getFullYear();
          
          if (year > currentYear) {
            console.warn(`Future year detected: ${year} for song ${song.trackName}. Defaulting to ${currentYear}.`);
            dateErrors++;
            return 2022; // Default to 2022 for future dates
          }
          
          return year;
        } catch (e) {
          console.error('Error processing timestamp:', ts, e);
          dateErrors++;
          return 2022; // Default to 2022 for errors
        }
      });
      
      Object.entries(playsByYear).forEach(([year, yearTimestamps]) => {
        if (!songsByYear[year]) {
          songsByYear[year] = [];
        }
        
        songsByYear[year].push({
          ...song,
          totalPlayed: song.totalPlayed * (yearTimestamps.length / timestamps.length),
          playCount: yearTimestamps.length,
          spotifyScore: Math.pow(yearTimestamps.length, 1.5)
        });
      });
    }
  });

  if (dateErrors > 0) {
    console.warn(`Detected ${dateErrors} date parsing issues while grouping songs by year`);
  }

  Object.keys(songsByYear).forEach(year => {
    songsByYear[year] = _.orderBy(songsByYear[year], ['spotifyScore'], ['desc'])
      .slice(0, 100);
  });

  return songsByYear;
}

// Extract listening time from various formats
function parseListeningTime(timeValue) {
  // Default play time (3.5 minutes)
  let ms_played = 210000;
  
  try {
    if (!timeValue) return ms_played;
    
    if (typeof timeValue === 'number') {
      // If it's already a number, assume it's in seconds
      return timeValue * 1000;
    }
    
    if (typeof timeValue === 'string') {
      // Check if format is "MM:SS" or "HH:MM:SS"
      const timeParts = timeValue.split(':').map(Number);
      if (timeParts.length === 2) {
        // MM:SS format
        return (timeParts[0] * 60 + timeParts[1]) * 1000;
      } else if (timeParts.length === 3) {
        // HH:MM:SS format
        return ((timeParts[0] * 60 + timeParts[1]) * 60 + timeParts[2]) * 1000;
      } else {
        // Try to parse as a simple number (minutes or seconds)
        const num = parseFloat(timeValue);
        if (!isNaN(num)) {
          // Assume minutes if small, seconds if larger
          return (num < 30 ? num * 60 : num) * 1000;
        }
      }
    }
  } catch (e) {
    console.warn('Error parsing listening time:', timeValue, e);
  }
  
  return ms_played;
}

export const streamingProcessor = {
  async processFiles(files) {
    try {
      let allProcessedData = [];
      
      const processedData = await Promise.all(
        Array.from(files).map(async (file) => {
          const content = await file.text();
          
          // Spotify JSON files
          if (file.name.includes('Streaming_History') && file.name.endsWith('.json')) {
            try {
              const data = JSON.parse(content);
              const dataWithSource = data.map(entry => ({
                ...entry,
                source: 'spotify'
              }));
              allProcessedData = [...allProcessedData, ...dataWithSource];
              return dataWithSource;
            } catch (error) {
              console.error('Error parsing JSON:', error);
              return [];
            }
          }
          
          // Apple Music CSV files
          if (file.name.toLowerCase().includes('apple') && file.name.endsWith('.csv')) {
            return new Promise((resolve) => {
              Papa.parse(content, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                delimitersToGuess: [',', '\t', '|', ';'],
                complete: (results) => {
                  console.log('Apple Music CSV headers:', results.meta.fields);
                  let transformedData = [];
                  
                  // Detect which Apple Music file format we're working with
                  const isTrackPlayHistory = results.meta.fields.includes('Track Name') && 
                                          results.meta.fields.includes('Last Played Date');
                  
                  const isDailyTracks = results.meta.fields.includes('Track Description') && 
                                      (results.meta.fields.includes('Date Played') || 
                                       results.meta.fields.includes('Play Duration Milliseconds'));
                  
                  const isRecentlyPlayedTracks = results.meta.fields.includes('Total play duration in millis') && 
                                              results.meta.fields.includes('Track Description') &&
                                              results.meta.fields.includes('Media duration in millis');
                                              
                  if (isRecentlyPlayedTracks) {
                    // Process the detailed Recently Played Tracks format
                    console.log('Processing Apple Music Recently Played Tracks format');
                    transformedData = results.data
                      .filter(row => row['Track Description'] && row['Total plays'] > 0)
                      .map(row => {
                        // Parse track information from Track Description
                        let trackDescription = row['Track Description'] || '';
                        let trackName = trackDescription;
                        let artistName = 'Unknown Artist';
                        
                        // Format is typically "Artist - Track Name"
                        const dashIndex = trackDescription.indexOf(' - ');
                        if (dashIndex > 0) {
                          artistName = trackDescription.substring(0, dashIndex).trim();
                          trackName = trackDescription.substring(dashIndex + 3).trim();
                        }
                        
                        // For the more accurate file, we'll create multiple play entries
                        // based on the number of plays, distributed over time
                        const plays = [];
                        const totalPlays = parseInt(row['Total plays']) || 1;
                        const totalDuration = parseInt(row['Total play duration in millis']) || 0;
                        const trackDuration = parseInt(row['Media duration in millis']) || 0;
                        
                        // Get the timestamps
                        let firstPlayed, lastPlayed;
                        try {
                          firstPlayed = row['First Event Timestamp'] ? 
                                        new Date(row['First Event Timestamp']) : 
                                        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // fallback to 30 days ago
                          
                          lastPlayed = row['Last Event End Timestamp'] ? 
                                      new Date(row['Last Event End Timestamp']) : 
                                      new Date();
                        } catch (e) {
                          console.warn('Error parsing timestamps in Recently Played Tracks:', e);
                          firstPlayed = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                          lastPlayed = new Date();
                        }
                        
                        // Calculate average play duration
                        const avgPlayDuration = totalPlays > 0 ? 
                                              Math.floor(totalDuration / totalPlays) : 
                                              trackDuration;
                        
                        // Determine if this is a podcast based on media type and duration
                        const isPodcast = (row['Media type'] === 'PODCAST' || 
                                         (trackDescription.toLowerCase().includes('podcast')) ||
                                         (trackDuration > 1800000)); // Over 30 minutes
                        
                        // Create album information if available
                        let albumName = 'Unknown Album';
                        if (row['Container Description'] && 
                            row['Container Type'] && 
                            row['Container Type'].includes('ALBUM')) {
                          albumName = row['Container Description'];
                        }
                        
                        // For accurate statistics, we'll create one entry per play
                        // We'll distribute these plays between first and last played timestamps
                        if (totalPlays === 1) {
                          // Just one play - use the last timestamp
                          plays.push({
                            master_metadata_track_name: trackName,
                            ts: lastPlayed, // FIXED: Store Date object instead of ISO string
                            ms_played: avgPlayDuration,
                            master_metadata_album_artist_name: artistName,
                            master_metadata_album_album_name: albumName,
                            duration_ms: trackDuration,
                            platform: 'APPLE',
                            source: 'apple_music'
                          });
                        } else {
                          // Multiple plays - distribute them between first and last
                          const timeRange = lastPlayed.getTime() - firstPlayed.getTime();
                          const timeStep = timeRange / (totalPlays - 1);
                          
                          for (let i = 0; i < totalPlays; i++) {
                            const playTime = new Date(firstPlayed.getTime() + (timeStep * i));
                            plays.push({
                              master_metadata_track_name: trackName,
                              ts: playTime, // FIXED: Store Date object instead of ISO string
                              ms_played: avgPlayDuration,
                              master_metadata_album_artist_name: artistName,
                              master_metadata_album_album_name: albumName,
                              duration_ms: trackDuration,
                              platform: 'APPLE',
                              source: 'apple_music'
                            });
                          }
                        }
                        
                        // Add podcast information if relevant
                        if (isPodcast) {
                          plays.forEach(play => {
                            play.episode_name = trackName;
                            play.episode_show_name = artistName;
                          });
                        }
                        
                        return plays;
                      });
                    
                    // Flatten the array of arrays
                    transformedData = transformedData.flat();
                    
                  } else if (isTrackPlayHistory) {
                    // Process the simpler Track Play History format
                    transformedData = results.data
                      .filter(row => row['Track Name'] && row['Last Played Date'])
                      .map(row => {
                        // Handle special case for Kenny Rogers
                        if (row['Track Name'] && 
                            row['Track Name'].toLowerCase().includes("just dropped in") && 
                            row['Track Name'].toLowerCase().includes("kenny rogers")) {
                          return {
                            master_metadata_track_name: 'Just Dropped In (To See What Condition My Condition Is In)',
                            ts: new Date(parseInt(row['Last Played Date'])), // FIXED: Store Date object
                            ms_played: row['Is User Initiated'] ? 240000 : 30000,
                            master_metadata_album_artist_name: 'Kenny Rogers & The First Edition',
                            master_metadata_album_album_name: 'Unknown Album',
                            source: 'apple_music'
                          };
                        }
                    
                        // Parse track name from Apple Music format
                        let trackName = row['Track Name'] || '';
                        let artistName = 'Unknown Artist';
                        
                        // Apple format is often "Artist - Track" or "Artist, Artist - Track"
                        const dashIndex = trackName.indexOf(' - ');
                        if (dashIndex > 0) {
                          artistName = trackName.substring(0, dashIndex).trim();
                          trackName = trackName.substring(dashIndex + 3).trim();
                        }
                        
                        // Convert timestamp from milliseconds to Date object
                        let timestamp;
                        try {
                          timestamp = new Date(parseInt(row['Last Played Date'])); // FIXED: Store Date object
                        } catch (e) {
                          // Fallback if timestamp parsing fails
                          timestamp = new Date();
                        }
                        
                        // Estimate play time (Apple doesn't provide this)
                        // User-initiated plays likely involve full tracks
                        const estimatedPlayTime = row['Is User Initiated'] ? 240000 : 30000;
                        
                        return {
                          master_metadata_track_name: trackName,
                          ts: timestamp, // FIXED: Store Date object instead of ISO string
                          ms_played: estimatedPlayTime,
                          master_metadata_album_artist_name: artistName,
                          master_metadata_album_album_name: 'Unknown Album',
                          source: 'apple_music'
                        };
                      });
// Replace your isDailyTracks section with this fixed version:
} else if (isDailyTracks) {
  // Process the more detailed Daily Tracks format
  transformedData = results.data
    .filter(row => row['Track Description'] && row['Date Played'])
    .map(row => {
      // Parse track information from Track Description
      let trackDescription = row['Track Description'] || '';
      let trackName = trackDescription;
      let artistName = 'Unknown Artist';
      
      // Format is typically "Artist - Track Name"
      const dashIndex = trackDescription.indexOf(' - ');
      if (dashIndex > 0) {
        artistName = trackDescription.substring(0, dashIndex).trim();
        trackName = trackDescription.substring(dashIndex + 3).trim();
      }
      
      // Parse date (format is typically YYYYMMDD)
      let timestamp;
      try {
        const datePlayed = row['Date Played'].toString();
        // Format YYYYMMDD to YYYY-MM-DD
        if (datePlayed.length === 8) {
          const year = parseInt(datePlayed.substring(0, 4));
          const month = parseInt(datePlayed.substring(4, 6)) - 1; // Months are 0-indexed in JS
          const day = parseInt(datePlayed.substring(6, 8));
          
          // If hours field exists, use it for more precise timestamp
          let hours = 12; // Default to noon if no hour specified
          if (row['Hours']) {
            // Hours field might be like "19, 20" (meaning spanning multiple hours)
            // Just take the first number
            const hoursStr = row['Hours'].toString().split(',')[0].trim();
            hours = parseInt(hoursStr) || 12;
          }
          
          // Create date using proper component values
          timestamp = new Date(year, month, day, hours, 0, 0);
          
          // Validate the date - if it's invalid or in the future, log and use fallback
          if (isNaN(timestamp.getTime()) || timestamp > new Date()) {
            console.warn('Invalid or future date detected:', datePlayed, 'Using fallback date');
            timestamp = new Date(2022, 0, 1); // Fallback to January 1, 2022
          }
        } else {
          // Fallback to parsing as integer timestamp
          const parsed = new Date(parseInt(datePlayed));
          
          // Validate the parsed date
          if (!isNaN(parsed.getTime()) && parsed <= new Date()) {
            timestamp = parsed;
          } else {
            console.warn('Invalid timestamp detected:', datePlayed, 'Using fallback date');
            timestamp = new Date(2022, 0, 1); // Fallback to January 1, 2022
          }
        }
      } catch (e) {
        console.warn('Error parsing Daily Tracks date:', row['Date Played'], e);
        timestamp = new Date(2022, 0, 1); // Fallback to January 1, 2022
      }
      
      // Get play duration in milliseconds
      const playDuration = row['Play Duration Milliseconds'] || 210000; // Default to 3.5 min
      
      // Handle podcast vs music distinction if possible
      const isPodcast = trackDescription.toLowerCase().includes('podcast') || 
                       (row['Media type'] === 'VIDEO' && playDuration > 1200000);
      
      const result = {
        master_metadata_track_name: trackName,
        ts: timestamp, // Store Date object directly
        ms_played: playDuration,
        master_metadata_album_artist_name: artistName,
        master_metadata_album_album_name: 'Unknown Album',
        platform: row['Source Type'] || 'APPLE',
        source: 'apple_music'
      };
      
      // Add podcast fields if it appears to be a podcast
      if (isPodcast) {
        result.episode_name = trackName;
        result.episode_show_name = artistName;
      }
      
      return result;
    });
  
  console.log(`Transformed ${transformedData.length} Apple Music Data entries`);
} else {
                    // Unknown Apple Music format, try a generic approach
                    console.log('Unknown Apple Music CSV format, attempting generic parsing');
                    
                    // Look for possible track name and date fields
                    const nameFields = results.meta.fields.filter(f => 
                      f.toLowerCase().includes('track') || 
                      f.toLowerCase().includes('song') || 
                      f.toLowerCase().includes('name') || 
                      f.toLowerCase().includes('title') || 
                      f.toLowerCase().includes('description')
                    );
                    
                    const dateFields = results.meta.fields.filter(f => 
                      f.toLowerCase().includes('date') || 
                      f.toLowerCase().includes('played') || 
                      f.toLowerCase().includes('time')
                    );
                    
                    if (nameFields.length > 0 && dateFields.length > 0) {
                      const nameField = nameFields[0];
                      const dateField = dateFields[0];
                      
                      transformedData = results.data
                        .filter(row => row[nameField])
                        .map(row => {
                          let trackDescription = row[nameField] || '';
                          let trackName = trackDescription;
                          let artistName = 'Unknown Artist';
                          
                          const dashIndex = trackDescription.indexOf(' - ');
                          if (dashIndex > 0) {
                            artistName = trackDescription.substring(0, dashIndex).trim();
                            trackName = trackDescription.substring(dashIndex + 3).trim();
                          }
                          
                          let timestamp;
                          try {
                            if (typeof row[dateField] === 'number') {
                              timestamp = new Date(row[dateField]); // FIXED: Store Date object
                            } else if (typeof row[dateField] === 'string') {
                              timestamp = new Date(row[dateField]); // FIXED: Store Date object
                            } else {
                              timestamp = new Date(); // FIXED: Store Date object
                            }
                          } catch (e) {
                            timestamp = new Date(); // FIXED: Store Date object
                          }
                          
                          return {
                            master_metadata_track_name: trackName,
                            ts: timestamp, // FIXED: Store Date object instead of ISO string
                            ms_played: 180000, // Default 3 minutes
                            master_metadata_album_artist_name: artistName,
                            master_metadata_album_album_name: 'Unknown Album',
                            source: 'apple_music'
                          };
                        });
                    }
                  }
                  
                  console.log('Transformed Apple Music Data:', transformedData.length);
                  allProcessedData = [...allProcessedData, ...transformedData];
                  resolve(transformedData);
                },
                error: (error) => {
                  console.error('Error parsing Apple Music CSV:', error);
                  resolve([]);
                }
              });
            });
          }
          
          // Deezer XLSX file
          if (file.name.toLowerCase().includes('deezer') && file.name.endsWith('.xlsx')) {
            return new Promise(async (resolve) => {
              try {
                // For XLSX files, we need to get the content as ArrayBuffer instead of text
                const buffer = await file.arrayBuffer();
                
                // Parse the XLSX file
                const workbook = XLSX.read(new Uint8Array(buffer), { 
                  type: 'array',
                  cellDates: true,
                  cellNF: true
                });
                
                // Find the listening history sheet
                const historySheetName = "10_listeningHistory";
                if (!workbook.SheetNames.includes(historySheetName)) {
                  console.error('Listening history sheet not found in Deezer file');
                  resolve([]);
                  return;
                }
                
                const historySheet = workbook.Sheets[historySheetName];
                const data = XLSX.utils.sheet_to_json(historySheet);
                
                console.log(`Processing ${data.length} Deezer history entries`);
                
                // Transform Deezer data to common format
                const transformedData = data.map(row => {
                  // Extract required fields, handling potential missing fields
                  const trackName = row['Song Title'] || '';
                  const artistName = row['Artist'] || 'Unknown Artist';
                  const albumName = row['Album Title'] || 'Unknown Album';
                  const isrc = row['ISRC'] || null;
                  
                  // Parse listening time (in seconds) 
                  let playDuration = 0;
                  if (row['Listening Time'] && !isNaN(row['Listening Time'])) {
                    // Convert seconds to milliseconds
                    playDuration = parseInt(row['Listening Time']) * 1000;
                  } else {
                    // Default to 3.5 minutes if no valid duration
                    playDuration = 210000;
                  }
                  
                  // Parse date
                  let timestamp;
                  try {
                    // If it's already a Date object, use it
                    if (row['Date'] instanceof Date) {
                      timestamp = row['Date'];
                    } else if (typeof row['Date'] === 'string') {
                      // Parse the date string
                      timestamp = new Date(row['Date']);
                    } else {
                      // Fallback to current time
                      timestamp = new Date();
                    }
                  } catch (e) {
                    console.warn('Error parsing Deezer timestamp:', e);
                    timestamp = new Date();
                  }
                  
                  // Get platform info
                  const platform = row['Platform Name'] || 'deezer';
                  const platformModel = row['Platform Model'] || '';
                  
                  // Create the standardized entry
                  return {
                    master_metadata_track_name: trackName,
                    ts: timestamp,
                    ms_played: playDuration,
                    master_metadata_album_artist_name: artistName,
                    master_metadata_album_album_name: albumName,
                    isrc: isrc, // Store ISRC for better track matching
                    platform: `DEEZER-${platform.toUpperCase()}${platformModel ? '-' + platformModel.toUpperCase() : ''}`,
                    source: 'deezer'
                  };
                });
                
                console.log(`Transformed ${transformedData.length} Deezer entries`);
                allProcessedData = [...allProcessedData, ...transformedData];
                resolve(transformedData);
              } catch (error) {
                console.error('Error processing Deezer XLSX file:', error);
                resolve([]);
              }
            });
          }
          
          return [];
        })
      );

      // Handle ISRC codes from Deezer data
      allProcessedData.forEach(item => {
        if (item.source === 'deezer' && item.isrc) {
          // Store the ISRC code if available for better track matching
          item.master_metadata_external_ids = {
            isrc: item.isrc
          };
        }
      });

      // Calculate comprehensive stats using allProcessedData
      const stats = calculatePlayStats(allProcessedData);

      const sortedArtists = Object.values(stats.artists)
        .map(artist => {
          const artistSongs = stats.songs.filter(song => song.artist === artist.name);
          const mostPlayed = _.maxBy(artistSongs, 'playCount');
          const artistPlays = [];
          artistSongs.forEach(song => {
            if (stats.playHistory[song.key]) {
              artistPlays.push(...stats.playHistory[song.key]);
            }
          });

          const streaks = calculateArtistStreaks(artistPlays);

          return {
            ...artist,
            mostPlayedSong: mostPlayed || { trackName: 'Unknown', playCount: 0 },
            ...streaks
          };
        })
        .sort((a, b) => b.totalPlayed - a.totalPlayed);

      const sortedAlbums = _.orderBy(
        Object.values(stats.albums).map(album => ({
          ...album,
          trackCount: album.trackCount.size
        })),
        ['totalPlayed'],
        ['desc']
      );

      const sortedSongs = _.orderBy(stats.songs, ['totalPlayed'], ['desc']).slice(0, 250);

      return {
        stats: {
          totalFiles: files.length,
          totalEntries: allProcessedData.length,
          processedSongs: stats.processedSongs,
          nullTrackNames: allProcessedData.filter(e => !e.master_metadata_track_name).length,
          skippedEntries: 0,
          shortPlays: stats.shortPlays,
          totalListeningTime: stats.totalListeningTime,
          serviceListeningTime: stats.serviceListeningTime
        },
        topArtists: sortedArtists,
        topAlbums: sortedAlbums,
        processedTracks: sortedSongs,
        songsByYear: calculateSongsByYear(stats.songs, stats.playHistory),
        briefObsessions: calculateBriefObsessions(stats.songs, stats.playHistory),
        rawPlayData: allProcessedData
      };
    } catch (error) {
      console.error('Error processing files:', error);
      throw error;
    }
  }
};