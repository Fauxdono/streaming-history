import Papa from 'papaparse';
import _ from 'lodash';

// Define a common structure for streaming data
export const STREAMING_TYPES = {
  SPOTIFY: 'spotify',
  APPLE_MUSIC: 'apple_music',
  YOUTUBE_MUSIC: 'youtube_music',
  TIDAL: 'tidal'
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


// Service-specific adapters
const adapters = {
[STREAMING_TYPES.SPOTIFY]: {
    canHandle: (file) => {
      console.log("Checking file:", file.name); // Debug log
      const canHandle = file.name.toLowerCase().includes('spotify') && file.name.endsWith('.json');
      console.log("Can handle?", canHandle);
      return canHandle;
    },
    parse: async (content) => {
      try {
        console.log("Parsing content first 100 chars:", content.substring(0, 100)); // Debug log
        const data = JSON.parse(content);
        console.log("Parsed data length:", data.length); // Debug log
        console.log("First entry sample:", data[0]); // Debug log
        
        // Check if we have the expected Spotify data structure
        if (!data[0]?.master_metadata_track_name && !data[0]?.ms_played) {
          console.error("Unexpected data structure:", data[0]);
          return [];
        }

        const processed = processEntries(data, 'spotify');
        console.log("Processed entries length:", processed.length); // Debug log
        return processed;
      } catch (error) {
        console.error('Error parsing Spotify data:', error);
        return [];
      }
    }
},

  [STREAMING_TYPES.APPLE_MUSIC]: {
    canHandle: (file) => {
      return file.name.toLowerCase().includes('apple') && file.name.endsWith('.csv');
    },
    parse: async (content) => {
      return new Promise((resolve) => {
        Papa.parse(content, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            const processed = processEntries(results.data, 'apple');
            resolve(processed);
          },
          error: (error) => {
            console.error('Error parsing Apple Music data:', error);
            resolve([]);
          }
        });
      });
    }
  },

  [STREAMING_TYPES.YOUTUBE_MUSIC]: {
    canHandle: (file) => {
      return file.name.toLowerCase().includes('youtube') && 
             (file.name.endsWith('.json') || file.name.endsWith('.csv'));
    },
    parse: async (content, file) => {
      try {
        if (file.name.endsWith('.csv')) {
          return new Promise((resolve) => {
            Papa.parse(content, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results) => {
                const processed = processEntries(results.data, 'youtube');
                resolve(processed);
              }
            });
          });
        } else {
          const data = JSON.parse(content);
          const processed = processEntries(data, 'youtube');
          return processed;
        }
      } catch (error) {
        console.error('Error parsing YouTube Music data:', error);
        return [];
      }
    }
  }
};

function calculatePlayStats(entries) {
  const allSongs = [];
  const artistStats = {};
  const albumStats = {};
  const songPlayHistory = {};

  entries.forEach(entry => {
    if (!entry.trackName || entry.playedMs < 30000 || entry.isPodcast) return;

    const key = `${entry.trackName}-${entry.artistName}`;
    
    // Track play history
    if (!songPlayHistory[key]) {
      songPlayHistory[key] = [];
    }
    songPlayHistory[key].push(new Date(entry.playedAt).getTime());

    // Update artist stats
    if (entry.artistName) {
      if (!artistStats[entry.artistName]) {
        artistStats[entry.artistName] = {
          name: entry.artistName,
          totalPlayed: 0,
          playCount: 0,
          firstListen: new Date(entry.playedAt).getTime()
        };
      }
      artistStats[entry.artistName].totalPlayed += entry.playedMs;
      artistStats[entry.artistName].playCount += 1;
    }

    // Update album stats
    if (entry.albumName && entry.artistName) {
      const albumKey = `${entry.albumName}-${entry.artistName}`;
      if (!albumStats[albumKey]) {
        albumStats[albumKey] = {
          name: entry.albumName,
          artist: entry.artistName,
          totalPlayed: 0,
          playCount: 0,
          trackCount: new Set(),
          firstListen: new Date(entry.playedAt).getTime()
        };
      }
      albumStats[albumKey].totalPlayed += entry.playedMs;
      albumStats[albumKey].playCount += 1;
      albumStats[albumKey].trackCount.add(entry.trackName);
    }

    // Update song stats
    const existing = allSongs.find(s => s.key === key);
    if (existing) {
      existing.totalPlayed += entry.playedMs;
      existing.playCount += 1;
    } else {
      allSongs.push({
        key,
        trackName: entry.trackName,
        artistName: entry.artistName,
        albumName: entry.albumName,
        totalPlayed: entry.playedMs,
        playCount: 1
      });
    }
  });

  return {
    songs: allSongs,
    artists: artistStats,
    albums: albumStats,
    playHistory: songPlayHistory
  };
}

function processEntries(data, serviceType = 'spotify') {
  console.log("Processing entries for service:", serviceType); // Debug log
  
  switch (serviceType) {
    case 'spotify':
      return data.map(entry => {
        // Debug log for first entry
        if (data.indexOf(entry) === 0) {
          console.log("Processing entry:", entry);
        }
        
        const processed = {
          trackName: entry.master_metadata_track_name,
          artistName: entry.master_metadata_album_artist_name,
          albumName: entry.master_metadata_album_album_name,
          playedAt: entry.ts,
          playedMs: parseInt(entry.ms_played),
          durationMs: entry.duration_ms,
          isPodcast: Boolean(entry.episode_show_name),
          podcastName: entry.episode_show_name,
          podcastEpisode: entry.episode_name
        };
        
        // Debug log for first processed entry
        if (data.indexOf(entry) === 0) {
          console.log("Processed entry:", processed);
        }
        
        return processed;
      });

    case 'apple':
      return data.map(row => {
        const [artist, track] = (row['Song Name'] || row['Track Name'] || '').split(' - ');
        return {
          trackName: track || row['Song Name'] || row['Track Name'],
          artistName: artist || row['Artist Name'] || 'Unknown Artist',
          albumName: row['Album Name'] || 'Unknown Album',
          playedAt: new Date(row['Play Date'] || row['Last Played Date']).toISOString(),
          playedMs: row['Play Duration Milliseconds'] || (row['Is User Initiated'] ? 240000 : 30000),
          durationMs: row['Total Time Milliseconds'],
          isPodcast: false
        };
      });

    case 'youtube':
      return data.map(row => ({
        trackName: row['Title'] || row['Video Title'],
        artistName: row['Artist'] || row['Channel Name'],
        albumName: row['Album'] || 'YouTube Music',
        playedAt: new Date(row['Time'] || row['Watched Time']).toISOString(),
        playedMs: row['Duration Ms'] || 240000,
        isPodcast: false
      }));

    default:
      return data;
  }
}

// Main processor that detects file type and uses appropriate adapter
export const streamingProcessor = {
  async processFiles(files) {
    try {
      console.log('Starting to process files:', files.length);
      
      const processedEntries = await Promise.all(
        Array.from(files).map(async (file) => {
          console.log('Processing file:', file.name);
          const content = await file.text();
          
          // Find appropriate adapter
          const adapter = Object.values(adapters).find(a => a.canHandle(file));
          if (!adapter) {
            console.warn(`No adapter found for file: ${file.name}`);
            return { entries: [], stats: null };
          }

          try {
            const entries = await adapter.parse(content, file);
            console.log(`Processed ${entries.length} entries from ${file.name}`);
            
            // Calculate stats for this file
            const stats = calculatePlayStats(entries);
            return { entries, stats };
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            return { entries: [], stats: null };
          }
        })
      );

      // Log processing results
      console.log('Processed all files:', processedEntries.map(p => p.entries.length));

      // Combine all processed entries
      const allEntries = processedEntries.flatMap(result => result.entries || []);
      console.log('Total combined entries:', allEntries.length);

      // Calculate combined stats
      const combinedStats = calculatePlayStats(allEntries);
      
      // Prepare final result
      const result = {
stats: {
  totalFiles: files.length,
  totalEntries: allEntries.length,
  processedSongs: allEntries.filter(e => !e.isPodcast).length,
  nullTrackNames: allEntries.filter(e => !e.trackName).length,
  skippedEntries: 0,
  shortPlays: allEntries.filter(e => e.playedMs < 30000).length,
  totalListeningTime: allEntries
    .filter(e => e.playedMs >= 30000)  // Only count plays over 30 seconds
    .reduce((total, e) => total + e.playedMs, 0)
},
        topArtists: _.orderBy(Object.values(combinedStats.artists), ['totalPlayed'], ['desc']),
        topAlbums: _.orderBy(
          Object.values(combinedStats.albums).map(album => ({
            ...album,
            trackCount: album.trackCount.size
          })),
          ['totalPlayed'],
          ['desc']
        ),
        processedTracks: _.orderBy(combinedStats.songs, ['totalPlayed'], ['desc']).slice(0, 250),
        songsByYear: processSongsByYear(allEntries, combinedStats.playHistory),
        briefObsessions: calculateBriefObsessions(combinedStats.songs, combinedStats.playHistory),
        rawPlayData: allEntries
      };

      console.log('Final processing results:', {
        totalFiles: result.stats.totalFiles,
        totalEntries: result.stats.totalEntries,
        topArtists: result.topArtists.length,
        topAlbums: result.topAlbums.length,
        processedTracks: result.processedTracks.length
      });

      return result;
    } catch (error) {
      console.error('Error in streamingProcessor:', error);
      throw error;
    }
  }
};

function processSongsByYear(entries, playHistory) {
  const songsByYear = {};
  
  Object.entries(playHistory).forEach(([key, timestamps]) => {
    const song = entries.find(e => `${e.trackName}-${e.artistName}` === key);
    if (!song) return;

    const playsByYear = _.groupBy(timestamps, ts => new Date(ts).getFullYear());
    
    Object.entries(playsByYear).forEach(([year, yearTimestamps]) => {
      if (!songsByYear[year]) {
        songsByYear[year] = [];
      }
      
      songsByYear[year].push({
        key,
        trackName: song.trackName,
        artistName: song.artistName,
        albumName: song.albumName,
        totalPlayed: song.playedMs * (yearTimestamps.length / timestamps.length),
        playCount: yearTimestamps.length,
        spotifyScore: Math.pow(yearTimestamps.length, 1.5)
      });
    });
  });

  Object.keys(songsByYear).forEach(year => {
    songsByYear[year] = _.orderBy(songsByYear[year], ['spotifyScore'], ['desc'])
      .slice(0, 100);
  });

  return songsByYear;
}

function calculateBriefObsessions(songs, playHistory) {
  const obsessions = songs
    .filter(song => song.playCount <= 50)
    .map(song => {
      const timestamps = playHistory[song.key] || [];
      if (timestamps.length === 0) return null;

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
        return {
          ...song,
          intensePeriod: {
            weekStart: bestWeekStart,
            playsInWeek: maxPlaysInWeek
          }
        };
      }
      return null;
    })
    .filter(Boolean);

  return _.orderBy(
    obsessions,
    ['intensePeriod.playsInWeek', 'intensePeriod.weekStart'],
    ['desc', 'asc']
  ).slice(0, 100);
}