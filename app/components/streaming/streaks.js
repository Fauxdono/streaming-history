import { createMatchKey } from './normalize.js';

const streakCache = new Map();

export function calculateArtistStreaks(timestamps) {
  // Use cache key based on timestamps
  const cacheKey = timestamps.sort().join(',');
  if (streakCache.has(cacheKey)) {
    return streakCache.get(cacheKey);
  }
  
  // Convert timestamps to unique days
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

  // Check if current streak is active
  const lastPlay = days.length > 0 ? new Date(days[days.length - 1]) : null;
  const now = new Date();
  const daysSinceLastPlay = lastPlay ? Math.floor((now - lastPlay) / (1000 * 60 * 60 * 24)) : 999;
  const activeStreak = daysSinceLastPlay <= 1 ? currentStreak : 0;

  const result = {
    longestStreak,
    currentStreak: activeStreak,
    streakStart,
    streakEnd
  };
  
  // Store in cache
  streakCache.set(cacheKey, result);
  
  return result;
}

// Calculate consecutive play streaks - back-to-back plays of same song/artist/album
export function calculateConsecutivePlayStreaks(rawPlayData) {
  if (!rawPlayData || rawPlayData.length === 0) {
    return {
      song: null,
      artist: null,
      album: null
    };
  }

  // Sort by timestamp
  const sortedPlays = [...rawPlayData]
    .filter(play => play.master_metadata_track_name)
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));

  if (sortedPlays.length === 0) {
    return { song: null, artist: null, album: null };
  }

  // Track best streaks
  let bestSongStreak = { count: 0, trackName: null, artist: null, startTime: null, endTime: null };
  let bestArtistStreak = { count: 0, name: null, startTime: null, endTime: null };
  let bestAlbumStreak = { count: 0, name: null, artist: null, startTime: null, endTime: null };

  // Current streak tracking
  let currentSong = { key: null, count: 0, trackName: null, artist: null, startTime: null };
  let currentArtist = { name: null, count: 0, startTime: null };
  let currentAlbum = { key: null, count: 0, name: null, artist: null, startTime: null };

  for (const play of sortedPlays) {
    const songKey = createMatchKey(play.master_metadata_track_name, play.master_metadata_album_artist_name);
    const artistName = play.master_metadata_album_artist_name || 'Unknown Artist';
    const albumName = play.master_metadata_album_album_name || 'Unknown Album';
    const albumKey = `${albumName}|||${artistName}`;
    const timestamp = play.ts;

    // Song streak
    if (songKey === currentSong.key) {
      currentSong.count++;
    } else {
      if (currentSong.count > bestSongStreak.count) {
        bestSongStreak = {
          count: currentSong.count,
          trackName: currentSong.trackName,
          artist: currentSong.artist,
          startTime: currentSong.startTime,
          endTime: timestamp
        };
      }
      currentSong = {
        key: songKey,
        count: 1,
        trackName: play.master_metadata_track_name,
        artist: artistName,
        startTime: timestamp
      };
    }

    // Artist streak
    if (artistName === currentArtist.name) {
      currentArtist.count++;
    } else {
      if (currentArtist.count > bestArtistStreak.count) {
        bestArtistStreak = {
          count: currentArtist.count,
          name: currentArtist.name,
          startTime: currentArtist.startTime,
          endTime: timestamp
        };
      }
      currentArtist = { name: artistName, count: 1, startTime: timestamp };
    }

    // Album streak
    if (albumKey === currentAlbum.key) {
      currentAlbum.count++;
    } else {
      if (currentAlbum.count > bestAlbumStreak.count) {
        bestAlbumStreak = {
          count: currentAlbum.count,
          name: currentAlbum.name,
          artist: currentAlbum.artist,
          startTime: currentAlbum.startTime,
          endTime: timestamp
        };
      }
      currentAlbum = {
        key: albumKey,
        count: 1,
        name: albumName,
        artist: artistName,
        startTime: timestamp
      };
    }
  }

  // Check final streaks
  const lastTimestamp = sortedPlays[sortedPlays.length - 1].ts;
  if (currentSong.count > bestSongStreak.count) {
    bestSongStreak = {
      count: currentSong.count,
      trackName: currentSong.trackName,
      artist: currentSong.artist,
      startTime: currentSong.startTime,
      endTime: lastTimestamp
    };
  }
  if (currentArtist.count > bestArtistStreak.count) {
    bestArtistStreak = {
      count: currentArtist.count,
      name: currentArtist.name,
      startTime: currentArtist.startTime,
      endTime: lastTimestamp
    };
  }
  if (currentAlbum.count > bestAlbumStreak.count) {
    bestAlbumStreak = {
      count: currentAlbum.count,
      name: currentAlbum.name,
      artist: currentAlbum.artist,
      startTime: currentAlbum.startTime,
      endTime: lastTimestamp
    };
  }

  return {
    song: bestSongStreak.count > 1 ? bestSongStreak : null,
    artist: bestArtistStreak.count > 1 ? bestArtistStreak : null,
    album: bestAlbumStreak.count > 1 ? bestAlbumStreak : null
  };
}

// Calculate overall daily listening streak - consecutive days with any listening activity
export function calculateOverallDailyStreak(rawPlayData) {
  if (!rawPlayData || rawPlayData.length === 0) {
    return null;
  }

  // Get unique listening days
  const days = [...new Set(
    rawPlayData
      .filter(play => play.ts)
      .map(play => new Date(play.ts).toISOString().split('T')[0])
  )].sort();

  if (days.length === 0) {
    return null;
  }

  let longestStreak = 0;
  let currentStreak = 1;
  let streakStart = days[0];
  let streakEnd = days[0];
  let bestStreakStart = days[0];
  let bestStreakEnd = days[0];

  for (let i = 1; i < days.length; i++) {
    const currentDate = new Date(days[i]);
    const previousDate = new Date(days[i - 1]);
    const diffDays = (currentDate - previousDate) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentStreak++;
      streakEnd = days[i];
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        bestStreakStart = streakStart;
        bestStreakEnd = streakEnd;
      }
    } else {
      currentStreak = 1;
      streakStart = days[i];
      streakEnd = days[i];
    }
  }

  // Check if final streak is the longest
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
    bestStreakStart = streakStart;
    bestStreakEnd = streakEnd;
  }

  return longestStreak > 1 ? {
    count: longestStreak,
    startDate: bestStreakStart,
    endDate: bestStreakEnd
  } : null;
}

// Calculate top song daily streak - consecutive days listening to the same song
export function calculateTopSongDailyStreak(songs, playHistory) {
  if (!songs || songs.length === 0 || !playHistory) {
    return null;
  }

  let bestStreak = null;

  for (const song of songs.slice(0, 100)) { // Check top 100 songs for performance
    const timestamps = playHistory[song.key] || [];
    if (timestamps.length < 2) continue;

    const streakResult = calculateArtistStreaks(timestamps);
    if (streakResult.longestStreak > 1 && (!bestStreak || streakResult.longestStreak > bestStreak.count)) {
      bestStreak = {
        trackName: song.trackName,
        artist: song.artist,
        count: streakResult.longestStreak,
        startDate: streakResult.streakStart,
        endDate: streakResult.streakEnd
      };
    }
  }

  return bestStreak;
}

// Calculate top album daily streak - consecutive days listening to the same album
export function calculateTopAlbumDailyStreak(albums, rawPlayData) {
  if (!albums || albums.length === 0 || !rawPlayData) {
    return null;
  }

  // Build album play history
  const albumPlayHistory = {};
  for (const play of rawPlayData) {
    if (!play.master_metadata_album_album_name || !play.ts) continue;
    const albumKey = `${play.master_metadata_album_album_name}|||${play.master_metadata_album_artist_name || 'Unknown Artist'}`;
    if (!albumPlayHistory[albumKey]) {
      albumPlayHistory[albumKey] = [];
    }
    albumPlayHistory[albumKey].push(new Date(play.ts).getTime());
  }

  let bestStreak = null;

  for (const album of albums.slice(0, 100)) { // Check top 100 albums for performance
    const albumKey = `${album.name}|||${album.artist}`;
    const timestamps = albumPlayHistory[albumKey] || [];
    if (timestamps.length < 2) continue;

    const streakResult = calculateArtistStreaks(timestamps);
    if (streakResult.longestStreak > 1 && (!bestStreak || streakResult.longestStreak > bestStreak.count)) {
      bestStreak = {
        name: album.name,
        artist: album.artist,
        count: streakResult.longestStreak,
        startDate: streakResult.streakStart,
        endDate: streakResult.streakEnd
      };
    }
  }

  return bestStreak;
}

