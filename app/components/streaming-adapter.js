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

function calculatePlayStats(entries) {
  const allSongs = [];
  const artistStats = {};
  const albumStats = {};
  const songPlayHistory = {};
  let totalListeningTime = 0;
  let processedSongs = 0;
  let shortPlays = 0;

  entries.forEach(entry => {
    const playTime = entry.ms_played;
    
    // Skip invalid entries
    if (!entry.master_metadata_track_name || playTime < 30000) {
      if (playTime < 30000) shortPlays++;
      return;
    }

    processedSongs++;
    totalListeningTime += playTime;

    const key = `${entry.master_metadata_track_name}-${entry.master_metadata_album_artist_name}`;
    const timestamp = new Date(entry.ts);

    // Track play history
    if (!songPlayHistory[key]) {
      songPlayHistory[key] = [];
    }
    songPlayHistory[key].push(timestamp.getTime());

    // Artist stats
    const artistName = entry.master_metadata_album_artist_name;
    if (artistName) {
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
    }

    // Album stats
    const albumName = entry.master_metadata_album_album_name;
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
      albumStats[albumKey].trackCount.add(entry.master_metadata_track_name);
      albumStats[albumKey].firstListen = Math.min(
        albumStats[albumKey].firstListen, 
        timestamp.getTime()
      );
    }

    // Song stats
    const existingSong = allSongs.find(s => s.key === key);
    if (existingSong) {
      existingSong.totalPlayed += playTime;
      existingSong.playCount++;
    } else {
      allSongs.push({
        key,
        trackName: entry.master_metadata_track_name,
        artist: artistName,
        albumName,
        totalPlayed: playTime,
        playCount: 1
      });
    }
  });

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

function calculateSpotifyScore(playCount, totalPlayed, lastPlayedTimestamp) {
  const now = new Date();
  const daysSinceLastPlay = (now - lastPlayedTimestamp) / (1000 * 60 * 60 * 24);
  const recencyWeight = Math.exp(-daysSinceLastPlay / 180);
  const playTimeWeight = Math.min(totalPlayed / (3 * 60 * 1000), 1);
  return playCount * recencyWeight * playTimeWeight;
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

  Object.keys(songsByYear).forEach(year => {
    songsByYear[year] = _.orderBy(songsByYear[year], ['spotifyScore'], ['desc'])
      .slice(0, 100);
  });

  return songsByYear;
}
export const streamingProcessor = {
  async processFiles(files) {
    try {
      // Convert FileList or array-like object to a proper array
      const fileArray = Array.isArray(files) 
        ? files 
        : files.length 
          ? Array.from(files) 
          : [];

      console.log('Processing files:', fileArray.length);
      
      const allProcessedData = [];
      
      for (const file of fileArray) {
        console.log(`Processing file: ${file.name}`);
        const content = await file.text();
        
        // Spotify JSON files
        if (file.name.includes('Streaming_History') && file.name.endsWith('.json')) {
          try {
            const data = JSON.parse(content);
            console.log(`Spotify JSON entries: ${data.length}`);
            allProcessedData.push(...data);
          } catch (error) {
            console.error('Error parsing Spotify JSON:', error);
          }
        }
        
        // Apple Music CSV
        if (file.name.toLowerCase().includes('apple') && file.name.endsWith('.csv')) {
          const transformedData = await new Promise((resolve, reject) => {
            Papa.parse(content, {
              header: false, 
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results) => {
                try {
                  console.log(`Apple Music CSV entries: ${results.data.length}`);

                  const uniqueEntries = new Set();
                  
                  const processedEntries = results.data
                    .filter(row => {
                      if (!row || row.length < 3) {
                        console.warn('Skipping invalid row:', row);
                        return false;
                      }
                      return true;
                    })
                    .reduce((acc, row) => {
                      try {
                        const timestampStr = String(row[1]);
                        let timestamp;
                        if (/^\d+$/.test(timestampStr)) {
                          timestamp = new Date(parseInt(timestampStr));
                        } else {
                          timestamp = new Date(timestampStr);
                        }

                        if (isNaN(timestamp.getTime())) {
                          console.warn('Invalid timestamp:', timestampStr);
                          return acc;
                        }

                        const trackParts = String(row[0]).split(' - ');
                        const artistName = trackParts[0];
                        const trackName = trackParts.slice(1).join(' - ');
                        
                        const key = `${trackName}-${timestamp.toISOString()}`;
                        
                        if (uniqueEntries.has(key)) {
                          return acc;
                        }
                        uniqueEntries.add(key);

                        const estimatedPlayTime = 3 * 60 * 1000; // 3 minutes default

                        const entry = {
                          master_metadata_track_name: trackName,
                          master_metadata_album_artist_name: artistName,
                          master_metadata_album_album_name: 'Unknown Album',
                          ts: timestamp.toISOString(),
                          ms_played: estimatedPlayTime
                        };

                        acc.push(entry);
                        return acc;
                      } catch (entryError) {
                        console.warn('Error processing entry:', row, entryError);
                        return acc;
                      }
                    }, []);
                
                  console.log(`Transformed Apple Music entries: ${processedEntries.length}`);
                  resolve(processedEntries);
                } catch (processingError) {
                  console.error('Error processing Apple Music data:', processingError);
                  reject(processingError);
                }
              },
              error: (error) => {
                console.error('Papa Parse Error:', error);
                reject(error);
              }
            });
          });

          allProcessedData.push(...transformedData);
        }
      }

      // Add global logging
      console.log('FINAL Total entries processed:', allProcessedData.length);
      console.log('Total listening time (days):', 
        allProcessedData.reduce((total, entry) => total + entry.ms_played, 0) / (1000 * 60 * 60 * 24)
      );

      // Calculate stats
      const stats = calculatePlayStats(allProcessedData);

      // Prepare sorted artists and albums
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
            mostPlayedSong: mostPlayed,
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

      return {
        stats: {
          totalFiles: fileArray.length,
          totalEntries: allProcessedData.length,
          processedSongs: stats.processedSongs,
          nullTrackNames: allProcessedData.filter(e => !e.master_metadata_track_name).length,
          skippedEntries: 0,
          shortPlays: stats.shortPlays,
          totalListeningTime: stats.totalListeningTime,
          fileNames: fileArray.map(file => file.name)
        },
        topArtists: sortedArtists,
        topAlbums: sortedAlbums,
        processedTracks: stats.songs,
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