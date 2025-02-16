import _ from 'lodash';
import Papa from 'papaparse';

export const spotifyApi = {
  async processFiles(files) {
    const processedData = await Promise.all(
      Array.from(files).map(async (file) => {
        const content = await file.text();
        
// Handle Apple Music CSV files
        if (file.name.toLowerCase().includes('apple') && file.name.endsWith('.csv')) {
          return new Promise((resolve) => {
            Papa.parse(content, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results) => {
                let transformedData = [];
                
                // Handle Play Activity CSV
                if (file.name.includes('Play Activity')) {
                  transformedData = results.data
                    .filter(row => row['Song Name'] && row['Play Duration Milliseconds'])
                    .map(row => ({
                      master_metadata_track_name: row['Song Name'],
                      ts: new Date(row['Event Start Timestamp']).toISOString(),
                      ms_played: row['Play Duration Milliseconds'] || 0,
                      master_metadata_album_artist_name: row['Container Artist Name'] || 'Unknown Artist',
                      master_metadata_album_album_name: row['Album Name'] || 'Unknown Album'
                    }));
                }
                // Handle Track Play History CSV
                else if (file.name.includes('Track Play History')) {
                  transformedData = results.data
                    .filter(row => row['Track Name'])
                    .map(row => {
                      const trackParts = row['Track Name'].split(' - ');
                      const artist = trackParts.length > 1 ? trackParts[0] : 'Unknown Artist';
                      const trackName = trackParts.length > 1 ? trackParts[1] : row['Track Name'];

                      return {
                        master_metadata_track_name: trackName,
                        ts: new Date(row['Last Played Date']).toISOString(),
                        ms_played: row['Is User Initiated'] ? 240000 : 30000,
                        master_metadata_album_artist_name: artist,
                        master_metadata_album_album_name: 'Unknown Album'
                      };
                    });
                }

                resolve(transformedData);
              },
              error: (error) => {
                console.error('Error parsing CSV:', error);
                resolve([]); // Return empty array on error
              }
            });
          });
        }
        // Handle Spotify JSON files
        try {
          return JSON.parse(content);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          return [];
        }
      })
    );

    const allSongs = [];
    const artistStats = {};
    const albumStats = {};
    const songPlayHistory = {};
    let totalEntries = 0;
    let skippedEntries = 0;
    let nullTrackNames = 0;
    let shortPlays = 0;
    let totalListeningTime = 0;
    let allRawData = [];

    processedData.forEach(jsonData => {
      if (!Array.isArray(jsonData)) return; // Skip if data is invalid
      
      allRawData = [...allRawData, ...jsonData];
      totalEntries += jsonData.length;

      jsonData.forEach(entry => {
        const trackName = entry.master_metadata_track_name;
        const artistName = entry.master_metadata_album_artist_name;
        const albumName = entry.master_metadata_album_album_name;
        const playTime = parseInt(entry.ms_played);
        const timestamp = new Date(entry.ts);

        if (!trackName) nullTrackNames++;
        if (playTime < 30000) shortPlays++;

        if (trackName && playTime >= 30000) {
          totalListeningTime += playTime;
          
          const key = `${trackName}-${artistName}`;
          
          if (!songPlayHistory[key]) {
            songPlayHistory[key] = [];
          }
          songPlayHistory[key].push(timestamp.getTime());

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
            artistStats[artistName].playCount += 1;
            artistStats[artistName].firstListen = Math.min(artistStats[artistName].firstListen, timestamp.getTime());
          }

          if (albumName) {
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
            albumStats[albumKey].playCount += 1;
            albumStats[albumKey].trackCount.add(trackName);
            albumStats[albumKey].firstListen = Math.min(albumStats[albumKey].firstListen, timestamp.getTime());
          }

          const existing = allSongs.find(s => s.key === key);
          if (existing) {
            existing.totalPlayed += playTime;
            existing.playCount += 1;
          } else {
            allSongs.push({
              key,
              trackName,
              artist: artistName,
              albumName,
              totalPlayed: playTime,
              playCount: 1
            });
          }
        }
      });
    });

   allSongs.forEach(song => {
     const lastPlayed = Math.max(...(songPlayHistory[song.key] || []));
     song.spotifyScore = calculateSpotifyScore(song.playCount, song.totalPlayed, lastPlayed);
   });

   const processedAlbumStats = Object.values(albumStats).map(album => ({
     ...album,
     trackCount: album.trackCount.size
   }));

   const sortedSongs = _.orderBy(allSongs, ['spotifyScore'], ['desc']).slice(0, 250);
  let sortedArtists = Object.values(artistStats).map(artist => {
     const artistPlays = [];
     allSongs.forEach(song => {
       if (song.artist === artist.name && songPlayHistory[song.key]) {
         artistPlays.push(...songPlayHistory[song.key]);
       }
     });
     const streaks = calculateArtistStreaks(artistPlays);
     return {
       ...artist,
       ...streaks
     };
   });
   sortedArtists = _.orderBy(Object.values(artistStats), ['totalPlayed'], ['desc']);
   const sortedAlbums = _.orderBy(processedAlbumStats, ['totalPlayed'], ['desc']);

   const briefObsessionsArray = calculateBriefObsessions(allSongs, songPlayHistory);
   const songsByYear = calculateSongsByYear(allSongs, songPlayHistory);// Add most played song info to artists
  // Add most played song info and streaks to artists
   sortedArtists = sortedArtists.map(artist => {
     // Get most played song
     const artistSongs = allSongs.filter(song => song.artist === artist.name);
     const mostPlayed = _.maxBy(artistSongs, 'playCount');
     
     // Calculate streaks
     const artistPlays = [];
     artistSongs.forEach(song => {
       if (songPlayHistory[song.key]) {
         artistPlays.push(...songPlayHistory[song.key]);
       }
     });

     console.log('Artist:', artist.name, 'Plays:', artistPlays.length);  // Debug log
     const streaks = calculateArtistStreaks(artistPlays);
     console.log('Streaks:', streaks);  // Debug log

     return {
       ...artist,
       mostPlayedSong: mostPlayed,
       ...streaks
     };
   });
   return {
     stats: {
       totalFiles: files.length,
       totalEntries,
       processedSongs: allSongs.length,
       nullTrackNames,
       skippedEntries,
       shortPlays,
       totalListeningTime
     },
     topArtists: sortedArtists,
     topAlbums: sortedAlbums,
     processedTracks: sortedSongs,
     songsByYear,
     briefObsessions: briefObsessionsArray,
     rawPlayData: allRawData,
   };
 }
};
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
function calculateSpotifyScore(playCount, totalPlayed, lastPlayedTimestamp) {
 const now = new Date();
 const daysSinceLastPlay = (now - lastPlayedTimestamp) / (1000 * 60 * 60 * 24);
 const recencyWeight = Math.exp(-daysSinceLastPlay / 180);
 const playTimeWeight = Math.min(totalPlayed / (3 * 60 * 1000), 1);
 return playCount * recencyWeight * playTimeWeight;
}

function calculateBriefObsessions(allSongs, songPlayHistory) {
 const briefObsessionsArray = [];
 
 allSongs.forEach(song => {
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

function calculateSongsByYear(allSongs, songPlayHistory) {
 const songsByYear = {};
 
 allSongs.forEach(song => {
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