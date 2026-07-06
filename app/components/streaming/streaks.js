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
      album: null,
      top3: { songs: [], artists: [], albums: [] }
    };
  }

  // Sort by timestamp
  const sortedPlays = [...rawPlayData]
    .filter(play => play.master_metadata_track_name)
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));

  if (sortedPlays.length === 0) {
    return { song: null, artist: null, album: null, top3: { songs: [], artists: [], albums: [] } };
  }

  // Best finished run per entity (song/artist/album), so the top-3 lists
  // contain three DIFFERENT songs/artists/albums, not three runs of one.
  const songRuns = new Map();
  const artistRuns = new Map();
  const albumRuns = new Map();
  const noteRun = (map, key, run) => {
    if (run.count < 2) return;
    const prev = map.get(key);
    if (!prev || run.count > prev.count) map.set(key, run);
  };

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
      noteRun(songRuns, currentSong.key, {
        count: currentSong.count,
        trackName: currentSong.trackName,
        artist: currentSong.artist,
        startTime: currentSong.startTime,
        endTime: timestamp
      });
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
      noteRun(artistRuns, currentArtist.name, {
        count: currentArtist.count,
        name: currentArtist.name,
        startTime: currentArtist.startTime,
        endTime: timestamp
      });
      currentArtist = { name: artistName, count: 1, startTime: timestamp };
    }

    // Album streak
    if (albumKey === currentAlbum.key) {
      currentAlbum.count++;
    } else {
      noteRun(albumRuns, currentAlbum.key, {
        count: currentAlbum.count,
        name: currentAlbum.name,
        artist: currentAlbum.artist,
        startTime: currentAlbum.startTime,
        endTime: timestamp
      });
      currentAlbum = {
        key: albumKey,
        count: 1,
        name: albumName,
        artist: artistName,
        startTime: timestamp
      };
    }
  }

  // Flush final streaks
  const lastTimestamp = sortedPlays[sortedPlays.length - 1].ts;
  noteRun(songRuns, currentSong.key, {
    count: currentSong.count, trackName: currentSong.trackName, artist: currentSong.artist,
    startTime: currentSong.startTime, endTime: lastTimestamp
  });
  noteRun(artistRuns, currentArtist.name, {
    count: currentArtist.count, name: currentArtist.name,
    startTime: currentArtist.startTime, endTime: lastTimestamp
  });
  noteRun(albumRuns, currentAlbum.key, {
    count: currentAlbum.count, name: currentAlbum.name, artist: currentAlbum.artist,
    startTime: currentAlbum.startTime, endTime: lastTimestamp
  });

  const top3 = (map) => [...map.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  const songsTop = top3(songRuns);
  const artistsTop = top3(artistRuns);
  const albumsTop = top3(albumRuns);

  return {
    song: songsTop[0] || null,
    artist: artistsTop[0] || null,
    album: albumsTop[0] || null,
    top3: { songs: songsTop, artists: artistsTop, albums: albumsTop }
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

  // Collect every consecutive-day run, then rank
  const runs = [];
  let currentStreak = 1;
  let streakStart = days[0];

  for (let i = 1; i < days.length; i++) {
    const diffDays = (new Date(days[i]) - new Date(days[i - 1])) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      currentStreak++;
    } else {
      if (currentStreak > 1) runs.push({ count: currentStreak, startDate: streakStart, endDate: days[i - 1] });
      currentStreak = 1;
      streakStart = days[i];
    }
  }
  if (currentStreak > 1) runs.push({ count: currentStreak, startDate: streakStart, endDate: days[days.length - 1] });

  runs.sort((a, b) => b.count - a.count);
  const top3 = runs.slice(0, 3);
  return top3.length ? { ...top3[0], top3 } : null;
}

// Calculate top song daily streak - consecutive days listening to the same song
export function calculateTopSongDailyStreak(songs, playHistory) {
  if (!songs || songs.length === 0 || !playHistory) {
    return null;
  }

  const candidates = [];

  for (const song of songs.slice(0, 100)) { // Check top 100 songs for performance
    const timestamps = playHistory[song.key] || [];
    if (timestamps.length < 2) continue;

    const streakResult = calculateArtistStreaks(timestamps);
    if (streakResult.longestStreak > 1) {
      candidates.push({
        trackName: song.trackName,
        artist: song.artist,
        count: streakResult.longestStreak,
        startDate: streakResult.streakStart,
        endDate: streakResult.streakEnd
      });
    }
  }

  candidates.sort((a, b) => b.count - a.count);
  const top3 = candidates.slice(0, 3);
  return top3.length ? { ...top3[0], top3 } : null;
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

  const candidates = [];

  for (const album of albums.slice(0, 100)) { // Check top 100 albums for performance
    const albumKey = `${album.name}|||${album.artist}`;
    const timestamps = albumPlayHistory[albumKey] || [];
    if (timestamps.length < 2) continue;

    const streakResult = calculateArtistStreaks(timestamps);
    if (streakResult.longestStreak > 1) {
      candidates.push({
        name: album.name,
        artist: album.artist,
        count: streakResult.longestStreak,
        startDate: streakResult.streakStart,
        endDate: streakResult.streakEnd
      });
    }
  }

  candidates.sort((a, b) => b.count - a.count);
  const top3 = candidates.slice(0, 3);
  return top3.length ? { ...top3[0], top3 } : null;
}

