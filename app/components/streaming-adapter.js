import Papa from 'papaparse';
import _ from 'lodash';

// Define streaming service types
export const STREAMING_TYPES = {
  SPOTIFY: 'spotify',
  APPLE_MUSIC: 'apple_music',
  YOUTUBE_MUSIC: 'youtube_music'
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
    instructions: 'Request a copy of your data and select "Apple Music Activity"',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.YOUTUBE_MUSIC]: {
    name: 'YouTube Music',
    downloadUrl: 'https://takeout.google.com/',
    instructions: 'Select YouTube and YouTube Music data in Google Takeout',
    acceptedFormats: '.json,.csv'
  }
};

// Normalize track names and artist names for better matching
function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\(feat\..*?\)/g, '') // Remove featuring artists
    .replace(/\(ft\..*?\)/g, '')   // Another format of featuring artists
    .replace(/\(with.*?\)/g, '')   // Remove "with" collaborations
    .replace(/\(.*?version.*?\)/gi, '') // Remove version info
    .replace(/\(.*?remix.*?\)/gi, '') // Remove remix info
    .replace(/\(.*?edit.*?\)/gi, '') // Remove edit info
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Additional cleaner for track titles to handle common variations
function deepNormalizeTrack(track) {
  if (!track) return '';
  
  // First apply basic normalization
  let normalized = normalizeString(track);
  
  // Handle common variations in condition/state words
  normalized = normalized
    .replace(/\b(is|was)\b/g, '') // Remove "is" vs "was" variations
    .replace(/\b(are|were)\b/g, '') // Remove "are" vs "were" variations
    .replace(/\b(has|had)\b/g, '') // Remove "has" vs "had" variations
    .replace(/\bcondition\b/g, 'cond') // Normalize "condition"
    .replace(/\bpt\b|\bpart\b/, 'p') // Normalize "part" vs "pt"
    .replace(/\bone\b|\b1\b/, '1') // Normalize "one" vs "1"
    .replace(/\btwo\b|\b2\b/, '2') // Normalize "two" vs "2"
    .replace(/\bthree\b|\b3\b/, '3') // Normalize "three" vs "3"
    
    // Remove common filler words that might differ across versions
    .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|with|by)\b/g, '')
    
    .replace(/\s+/g, ' ') // Re-normalize whitespace
    .trim();
    
  return normalized;
}

// Create a normalized key for track matching
function createMatchKey(trackName, artistName) {
  return `${normalizeString(trackName)}-${normalizeString(artistName)}`;
}

// Create a more aggressive normalized key for fuzzy track matching
function createFuzzyMatchKey(trackName, artistName) {
  return `${deepNormalizeTrack(trackName)}-${normalizeString(artistName)}`;
}

function calculatePlayStats(entries) {
  const trackMap = new Map(); // For combining tracks across services
  const artistStats = {};
  const albumStats = {};
  const songPlayHistory = {};
  let totalListeningTime = 0;
  let processedSongs = 0;
  let shortPlays = 0;
  
  // Create indices for Spotify tracks by artist to help with album matching
  const spotifyTracksByArtist = {};
  const spotifyTracksByTitle = {};

  // First pass - index all Spotify tracks for album matching
  entries.forEach(entry => {
    if (entry.source === 'spotify' && 
        entry.master_metadata_track_name && 
        entry.master_metadata_album_artist_name &&
        entry.master_metadata_album_album_name) {
        
      const trackName = entry.master_metadata_track_name;
      const artistName = entry.master_metadata_album_artist_name;
      const normalizedTrack = normalizeString(trackName);
      const normalizedArtist = normalizeString(artistName);
      
      // Index by artist
      if (!spotifyTracksByArtist[normalizedArtist]) {
        spotifyTracksByArtist[normalizedArtist] = [];
      }
      spotifyTracksByArtist[normalizedArtist].push(entry);
      
      // Index by track name
      if (!spotifyTracksByTitle[normalizedTrack]) {
        spotifyTracksByTitle[normalizedTrack] = [];
      }
      spotifyTracksByTitle[normalizedTrack].push(entry);
    }
  });
  
  // Create a fuzzy track map for handling subtle variations
  const fuzzyTrackMap = new Map();
  
  // Second pass - process all entries
  entries.forEach(entry => {
    const playTime = entry.ms_played;
    
    // Skip invalid entries
    if (!entry.master_metadata_track_name || playTime < 30000) {
      if (playTime < 30000) shortPlays++;
      return;
    }

    processedSongs++;
    totalListeningTime += playTime;

    const trackName = entry.master_metadata_track_name;
    const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
    const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
    
    // Create keys for lookups
    const standardKey = `${trackName}-${artistName}`;
    const matchKey = createMatchKey(trackName, artistName);
    const fuzzyKey = createFuzzyMatchKey(trackName, artistName);
    
    const timestamp = new Date(entry.ts);

    // Track play history
    if (!songPlayHistory[standardKey]) {
      songPlayHistory[standardKey] = [];
    }
    songPlayHistory[standardKey].push(timestamp.getTime());

    // Artist stats
    if (!artistStats[artistName]) {
      artistStats[artistName] = {
        name: artistName,
        totalPlayed: 0,
        playCount: 0,
        firstListen: timestamp.getTime()
      };
    }
    artistStats[artistName].totalPlayed += playTime;
    artistStats[artistName].playCount++;
    artistStats[artistName].firstListen = Math.min(
      artistStats[artistName].firstListen, 
      timestamp.getTime()
    );

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

    // Use the matchKey to combine similar tracks from different services
    if (trackMap.has(matchKey)) {
      // Update existing track
      const existingTrack = trackMap.get(matchKey);
      existingTrack.totalPlayed += playTime;
      existingTrack.playCount++;
      
      // If this entry has more complete metadata, use it
      if (entry.source === 'spotify' && !existingTrack.hasSpotifyData) {
        existingTrack.albumName = albumName;
        existingTrack.hasSpotifyData = true;
      }
    } else {
      // Add new track
      trackMap.set(matchKey, {
        key: standardKey,
        trackName,
        artist: artistName,
        albumName,
        totalPlayed: playTime,
        playCount: 1,
        hasSpotifyData: entry.source === 'spotify'
      });
    }
  });

  // Post-processing to find and combine similar tracks that weren't matched
  const processedKeys = new Set();
  const combinedTracks = [];
  
  // First, go through each track and look for near-duplicates
  for (const [key, track] of trackMap.entries()) {
    // Skip if we've already processed this track
    if (processedKeys.has(key)) continue;
    
    // Mark as processed
    processedKeys.add(key);
    
    // Start with this track's data
    const combinedTrack = {...track};
    let foundDuplicates = false;
    
    // Look for similar tracks to combine
    for (const [otherKey, otherTrack] of trackMap.entries()) {
      // Skip if same track or already processed
      if (otherKey === key || processedKeys.has(otherKey)) continue;
      
      // Check if tracks are similar enough to combine
      if (isSimilarTrack(track, otherTrack)) {
        // Combine stats
        combinedTrack.totalPlayed += otherTrack.totalPlayed;
        combinedTrack.playCount += otherTrack.playCount;
        
        // Use Spotify data if available
        if (otherTrack.hasSpotifyData && !combinedTrack.hasSpotifyData) {
          combinedTrack.albumName = otherTrack.albumName;
          combinedTrack.hasSpotifyData = true;
        }
        
        // Combine play history
        if (songPlayHistory[otherTrack.key]) {
          if (!songPlayHistory[combinedTrack.key]) {
            songPlayHistory[combinedTrack.key] = [];
          }
          songPlayHistory[combinedTrack.key].push(...songPlayHistory[otherTrack.key]);
        }
        
        // Mark as processed
        processedKeys.add(otherKey);
        foundDuplicates = true;
      }
    }
    
    // Add the combined track to results
    combinedTracks.push(combinedTrack);
  }
  
  // Function to check if two tracks are similar enough to combine
  function isSimilarTrack(track1, track2) {
    // If exact match on fuzzy normalized key
    const fuzzyKey1 = createFuzzyMatchKey(track1.trackName, track1.artist);
    const fuzzyKey2 = createFuzzyMatchKey(track2.trackName, track2.artist);
    if (fuzzyKey1 === fuzzyKey2) return true;
    
    // Handle specific cases like "Just Dropped In"
    if (track1.trackName.includes("Just Dropped In") && 
        track2.trackName.includes("Just Dropped In") &&
        track1.artist.includes("Kenny Rogers") && 
        track2.artist.includes("Kenny Rogers")) {
      return true;
    }
    
    // Add other specific matching rules here
    
    return false;
  }
  
  // Use the combined tracks instead of just the trackMap values
  const allSongs = combinedTracks;

  return {
    songs: allSongs,
    artists: artistStats,
    albums: albumStats,
    playHistory: songPlayHistory,
    totalListeningTime,
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
    if (song.playCount <= 50) { // Focus on songs that aren't continually played a lot
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
        
        if (maxPlaysInWeek >= 5) { // Only include if there was an intense period
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
  
  songs.forEach(song => {
    const timestamps = songPlayHistory[song.key] || [];
    if (timestamps.length > 0) {
      const playsByYear = _.groupBy(timestamps, ts => new Date(ts).getFullYear());
      
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

  // Sort and limit to top 100 per year
  Object.keys(songsByYear).forEach(year => {
    songsByYear[year] = _.orderBy(songsByYear[year], ['spotifyScore'], ['desc'])
      .slice(0, 100);
  });

  return songsByYear;
}

export const streamingProcessor = {
  async processFiles(files) {
    try {
      let allProcessedData = [];
      
      const processedData = await Promise.all(
        Array.from(files).map(async (file) => {
          const content = await file.text();
          const fileName = file.name.toLowerCase();
          
          // Spotify JSON files
          if ((fileName.includes('streaming_history') || fileName.includes('endsong')) && 
              fileName.endsWith('.json')) {
            try {
              const data = JSON.parse(content);
              // Add source tag to identify platform
              const dataWithSource = data.map(entry => ({
                ...entry,
                source: 'spotify'
              }));
              allProcessedData = [...allProcessedData, ...dataWithSource];
              return dataWithSource;
            } catch (error) {
              console.error('Error parsing Spotify JSON:', error);
              return [];
            }
          }
          
          // Apple Music CSV files
          if (fileName.includes('apple') && fileName.endsWith('.csv')) {
            return new Promise((resolve) => {
              Papa.parse(content, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                  console.log('Apple Music CSV Parsing Results:');
                  console.log('Total Rows:', results.data.length);
                  console.log('Headers:', results.meta.fields);
                  
                  const transformedData = results.data
                    .filter(row => row['Track Name'] && row['Last Played Date'])
                    .map(row => {
                      // Parse track name from Apple Music format
                      let trackName = row['Track Name'] || '';
                      let artistName = 'Unknown Artist';
                      
                      // Handle different Apple Music formats
                      if (trackName.includes(' - ')) {
                        // Format: "Artist - Track" or "Artist, Artist - Track"
                        const dashIndex = trackName.indexOf(' - ');
                        artistName = trackName.substring(0, dashIndex).trim();
                        trackName = trackName.substring(dashIndex + 3).trim();
                      } else if (trackName.includes(', ') && !trackName.includes(' - ')) {
                        // Alternative format sometimes seen: "Track, Artist"
                        const parts = trackName.split(', ');
                        if (parts.length >= 2) {
                          // Assume last part is the artist
                          artistName = parts[parts.length - 1].trim();
                          // All other parts form the track name
                          trackName = parts.slice(0, parts.length - 1).join(', ').trim();
                        }
                      }
                      
                      // Extract featuring artists from track name if present
                      if (trackName.includes('(feat.') && !artistName.includes('feat.')) {
                        const featIndex = trackName.indexOf('(feat.');
                        const featEndIndex = trackName.indexOf(')', featIndex);
                        
                        if (featEndIndex !== -1) {
                          // Leave the featuring info with the track name as Spotify does
                          // This helps with matching
                        }
                      }
                      
                      // Convert timestamp from milliseconds to ISO date
                      let timestamp;
                      try {
                        timestamp = new Date(parseInt(row['Last Played Date'])).toISOString();
                      } catch (e) {
                        // Fallback if timestamp parsing fails
                        timestamp = new Date().toISOString();
                      }
                      
                      // Estimate play time based on user initiation
                      const estimatedPlayTime = row['Is User Initiated'] ? 240000 : 30000;
                      
                      return {
                        master_metadata_track_name: trackName,
                        ts: timestamp,
                        ms_played: estimatedPlayTime,
                        master_metadata_album_artist_name: artistName,
                        master_metadata_album_album_name: 'Unknown Album',
                        source: 'apple_music'
                      };
                    });
                  
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
          
          return [];
        })
      );

      // No data processed
      if (allProcessedData.length === 0) {
        throw new Error('No valid streaming data found in the uploaded files.');
      }

      // Calculate comprehensive stats using allProcessedData
      const stats = calculatePlayStats(allProcessedData);

      // Process artist data with streaks and most played songs
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

      // Process album data
      const sortedAlbums = _.orderBy(
        Object.values(stats.albums).map(album => ({
          ...album,
          trackCount: album.trackCount.size
        })),
        ['totalPlayed'],
        ['desc']
      );

      // Sort songs by play count
      const sortedSongs = _.orderBy(stats.songs, ['playCount'], ['desc']).slice(0, 250);

      return {
        stats: {
          totalFiles: files.length,
          totalEntries: allProcessedData.length,
          processedSongs: stats.processedSongs,
          nullTrackNames: allProcessedData.filter(e => !e.master_metadata_track_name).length,
          skippedEntries: 0, 
          shortPlays: stats.shortPlays,
          totalListeningTime: stats.totalListeningTime
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