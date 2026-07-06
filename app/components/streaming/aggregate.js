import _ from 'lodash';
import { createMatchKey, normalizeAlbumName, normalizeString } from './normalize.js';

export function calculateBriefObsessions(songs, songPlayHistory) {
  const briefObsessionsArray = [];
 
  for (const song of songs) {
    if (song.playCount <= 50) {
      const timestamps = songPlayHistory[song.key] || [];
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a - b);
        
        let maxPlaysInWeek = 0;
        let bestWeekEnd = null;

        // Sliding window: two pointers on sorted timestamps
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        let left = 0;
        for (let right = 0; right < timestamps.length; right++) {
          // Advance left pointer when window exceeds 7 days
          while (timestamps[right] - timestamps[left] > SEVEN_DAYS_MS) {
            left++;
          }
          const playsInWeek = right - left + 1;
          if (playsInWeek > maxPlaysInWeek) {
            maxPlaysInWeek = playsInWeek;
            bestWeekEnd = timestamps[right];
          }
        }
        
        if (maxPlaysInWeek >= 5) {
          briefObsessionsArray.push({
            ...song,
            intensePeriod: {
              weekStart: new Date(bestWeekEnd - SEVEN_DAYS_MS),
              playsInWeek: maxPlaysInWeek
            }
          });
        }
      }
    }
  }

  return _.orderBy(
    briefObsessionsArray,
    ['intensePeriod.playsInWeek', 'intensePeriod.weekStart'],
    ['desc', 'asc']
  ).slice(0, 100);
}

export function calculateSongsByYear(songs, songPlayHistory) {
  const songsByYear = {};
  const now = Date.now();

  for (const song of songs) {
    const timestamps = songPlayHistory[song.key] || [];
    if (timestamps.length > 0) {
      // Group by year more efficiently
      const yearCounts = new Map();
      
      for (const ts of timestamps) {
        try {
          const date = new Date(ts);
          if (isNaN(date.getTime()) || ts > now) continue;
          
          const year = date.getFullYear();
          yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
        } catch (e) {
          // Skip invalid dates
        }
      }
      
      // Add songs to each year
      yearCounts.forEach((count, year) => {
        if (!songsByYear[year]) {
          songsByYear[year] = [];
        }
        
        songsByYear[year].push({
          ...song,
          totalPlayed: song.totalPlayed * (count / timestamps.length),
          playCount: count,
          spotifyScore: Math.pow(count, 1.5)
        });
      });
    }
  }

  // Sort and limit each year's entries
  Object.keys(songsByYear).forEach(year => {
    songsByYear[year] = _.orderBy(songsByYear[year], ['spotifyScore'], ['desc'])
      .slice(0, 100);
  });

  return songsByYear;
}

export function calculateAlbumsByYear(albums, rawPlayData, minPlayDuration = 30000) {
  // Create album ID mapping from all-time data
  const albumMapping = {};
  
  // Store album reference data
  albums.forEach(album => {
    if (!album) return;
    
    const albumKey = `${album.artist}:::${album.name}`.toLowerCase();
    
    // Get track names
    let trackNames = [];
    if (album.trackNames && album.trackNames instanceof Set) {
      trackNames = Array.from(album.trackNames);
    } else if (album.trackObjects && Array.isArray(album.trackObjects)) {
      trackNames = album.trackObjects.map(t => t.trackName || t.displayName).filter(Boolean);
    }
    
    // Store reference data
    albumMapping[albumKey] = {
      name: album.name,
      artist: album.artist,
      allTimeReference: album,
      trackNames: trackNames,
      trackCount: album.trackCount instanceof Set ? 
                album.trackCount.size : 
                (typeof album.trackCount === 'number' ? album.trackCount : 
                 album.trackCountValue || 0)
    };
    
    // Add alternative keys for similar album names
    if (album.name !== 'Unknown Album') {
      const simplifiedName = album.name.split(/\s+&|\s+and/i)[0].trim();
      if (simplifiedName !== album.name && simplifiedName.length > 5) {
        const altKey = `${album.artist}:::${simplifiedName}`.toLowerCase();
        albumMapping[altKey] = albumMapping[albumKey];
      }
    }
  });
  
  // Create a function for normalizing track names
  const normalizeTrackCache = new Map();
  function normalizeTrackName(trackName) {
    if (!trackName) return '';
    
    // Check cache
    if (normalizeTrackCache.has(trackName)) {
      return normalizeTrackCache.get(trackName);
    }
    
    const normalizedTrack = trackName.toLowerCase()
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\(ft\..*?\)/gi, '')
      .replace(/\(.*?version\)/gi, '')
      .replace(/\(.*?remix\)/gi, '')
      .replace(/\(.*?\)/gi, '')
      .replace(/\[.*?\]/gi, '')
      .replace(/[|\-\.l]/g, ' ')
      .replace(/[.,\/#!$%\^&\*;:{}=\_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Store in cache
    normalizeTrackCache.set(trackName, normalizedTrack);
    
    return normalizedTrack;
  }
  
  // Group plays by year and album more efficiently
  const playsByYearAndAlbum = {};
  const normalizedToOriginalTrack = {};
  const trackToAlbumMap = new Map();
  
  // Single pass: build normalized track mappings AND track-to-album mappings
  for (const entry of rawPlayData) {
    if (entry.ms_played < minPlayDuration || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) {
      continue;
    }

    const trackName = entry.master_metadata_track_name;
    const artist = entry.master_metadata_album_artist_name;
    const normalizedTrack = createMatchKey(trackName, artist);

    // Build normalized track mappings (was pass 1)
    if (normalizedTrack) {
      if (!normalizedToOriginalTrack[normalizedTrack]) {
        normalizedToOriginalTrack[normalizedTrack] = [trackName];
      } else if (!normalizedToOriginalTrack[normalizedTrack].includes(trackName)) {
        normalizedToOriginalTrack[normalizedTrack].push(trackName);
      }
    }

    // Build track-to-album mappings (was pass 2)
    const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
    if (albumName !== 'Unknown Album') {
      const trackKey = `${artist}:::${normalizedTrack}`.toLowerCase();

      if (!trackToAlbumMap.has(trackKey)) {
        trackToAlbumMap.set(trackKey, []);
      }

      const albumList = trackToAlbumMap.get(trackKey);
      const existingIndex = albumList.findIndex(a => a.name.toLowerCase() === albumName.toLowerCase());

      if (existingIndex >= 0) {
        albumList[existingIndex].count++;
      } else {
        albumList.push({
          name: albumName,
          count: 1,
          source: entry.source || 'unknown'
        });
      }
    }
  }
  
  // Determine main album for each track
  const trackMainAlbum = new Map();
  
  trackToAlbumMap.forEach((albums, trackKey) => {
    if (albums.length === 0) return;
    if (albums.length === 1) {
      trackMainAlbum.set(trackKey, albums[0].name);
      return;
    }
    
    // Sort by count and source
    albums.sort((a, b) => {
      const countDiff = b.count - a.count;
      if (Math.abs(countDiff) > 5) return countDiff;
      
      if (a.source === 'spotify' && b.source !== 'spotify') return -1;
      if (b.source === 'spotify' && a.source !== 'spotify') return 1;
      
      return countDiff;
    });
    
    trackMainAlbum.set(trackKey, albums[0].name);
  });
  
  // Third pass: build year-specific album data
  const yearCache = new Map();
  
  for (const entry of rawPlayData) {
    if (entry.ms_played < minPlayDuration || !entry.master_metadata_album_artist_name) continue;
    
    try {
      // Skip invalid dates - ensure _dateObj is actually a Date object
      let timestamp = entry._dateObj;
      if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
        timestamp = new Date(entry.ts);
      }
      if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) continue;
      
      const year = timestamp.getFullYear();
      const artist = entry.master_metadata_album_artist_name;
      let albumName = entry.master_metadata_album_album_name || 'Unknown Album';
      const trackName = entry.master_metadata_track_name;
      
      if (!trackName) continue;
      
      // Check for better album match
      const normalizedTrack = createMatchKey(trackName, artist);
      const trackKey = `${artist}:::${normalizedTrack}`.toLowerCase();
      const mainAlbum = trackMainAlbum.get(trackKey);
      
      // If unknown album but we have a main album, use it
      if (albumName === 'Unknown Album' && mainAlbum) {
        albumName = mainAlbum;
      }
      
      // Look up album in our mapping
      const albumKey = `${artist}:::${albumName}`.toLowerCase();
      let resolvedAlbumKey = albumKey;
      let resolvedAlbumData = albumMapping[albumKey];
      
      // If not found, try to find matching album
      if (!resolvedAlbumData && trackName) {
        // Try main album
        if (mainAlbum) {
          const mainAlbumKey = `${artist}:::${mainAlbum}`.toLowerCase();
          if (albumMapping[mainAlbumKey]) {
            resolvedAlbumKey = mainAlbumKey;
            resolvedAlbumData = albumMapping[mainAlbumKey];
          }
        }
        
        // If still not found, try to match by track
        if (!resolvedAlbumData) {
          for (const [key, data] of Object.entries(albumMapping)) {
            if (key.startsWith(`${artist.toLowerCase()}:::`) && 
                data.trackNames && data.trackNames.some(t => {
                  if (!t) return false;
                  return normalizeTrackName(t) === normalizedTrack;
                })) {
              resolvedAlbumKey = key;
              resolvedAlbumData = data;
              break;
            }
          }
        }
      }
      
      // Get cached year data
      let yearData = yearCache.get(year);
      if (!yearData) {
        yearData = {};
        yearCache.set(year, yearData);
      }
      
      // Init album if needed
      if (!yearData[resolvedAlbumKey]) {
        yearData[resolvedAlbumKey] = {
          name: resolvedAlbumData ? resolvedAlbumData.name : albumName,
          artist: artist,
          totalPlayed: 0,
          playCount: 0,
          normalizedTracks: new Set(),
          tracks: new Set(),
          trackMap: new Map(),
          firstListen: timestamp.getTime(),
          allTimeReference: resolvedAlbumData?.allTimeReference || null
        };
      }
      
      // Update stats
      yearData[resolvedAlbumKey].totalPlayed += entry.ms_played;
      yearData[resolvedAlbumKey].playCount++;
      
      if (trackName) {
        yearData[resolvedAlbumKey].normalizedTracks.add(normalizedTrack);
        yearData[resolvedAlbumKey].tracks.add(trackName);
        
        // Update track objects using Map-based deduplication like all-time processing
        if (!yearData[resolvedAlbumKey].trackMap) {
          yearData[resolvedAlbumKey].trackMap = new Map();
        }
        
        if (yearData[resolvedAlbumKey].trackMap.has(normalizedTrack)) {
          // Update existing track
          const track = yearData[resolvedAlbumKey].trackMap.get(normalizedTrack);
          track.totalPlayed += entry.ms_played;
          track.playCount++;
          
          // Update display name if we get a better version (prefer "feat" over "with")
          if (trackName.includes('feat') && track.trackName.includes('with')) {
            track.trackName = trackName;
          }
          
          // Add variation if new
          if (!track.variations.includes(trackName)) {
            track.variations.push(trackName);
          }
        } else {
          // Create new track
          yearData[resolvedAlbumKey].trackMap.set(normalizedTrack, {
            trackName: trackName,
            normalizedTrack: normalizedTrack,
            artist: artist,
            totalPlayed: entry.ms_played,
            playCount: 1,
            albumName: albumName,
            variations: normalizedToOriginalTrack[normalizedTrack] || [trackName]
          });
        }
      }
      
      // Update first listen if earlier
      if (timestamp.getTime() < yearData[resolvedAlbumKey].firstListen) {
        yearData[resolvedAlbumKey].firstListen = timestamp.getTime();
      }
    } catch (err) {
      // Skip errors
    }
  }
  
  // Convert to final format
  const result = {};
  
  yearCache.forEach((albumData, year) => {
    result[year] = Object.values(albumData).map(album => {
      // Convert track objects from Map to array
      const trackObjectsArray = album.trackMap ? 
        Array.from(album.trackMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed) :
        [];
      
      // Create year-specific album
      let yearAlbum = {
        name: album.name,
        artist: album.artist,
        totalPlayed: album.totalPlayed,
        playCount: album.playCount,
        firstListen: album.firstListen,
        trackCountValue: album.normalizedTracks ? album.normalizedTracks.size : 0,
        trackObjects: trackObjectsArray
      };
      
      // Add metadata from all-time reference
      if (album.allTimeReference) {
        const allTimeRef = album.allTimeReference;
        
        yearAlbum.trackCount = allTimeRef.trackCount;
        
        // Use highest track count
        if (allTimeRef && allTimeRef.trackCountValue > yearAlbum.trackCountValue) {
          yearAlbum.trackCountValue = allTimeRef.trackCountValue;
        }
        
        yearAlbum.isComplete = allTimeRef.isComplete;
      }
      
      return yearAlbum;
    }).sort((a, b) => b.totalPlayed - a.totalPlayed);
  });
  
  return result;
}

export function calculateArtistsByYear(songs, songPlayHistory, rawPlayData, minPlayDuration = 30000) {
  const artistsByYear = {};
  
  // Pre-process and index raw data for more efficient lookups
  const dateIndex = new Map(); // Map artist -> year -> timestamps
  
  for (const entry of rawPlayData) {
    if (!entry.master_metadata_album_artist_name || entry.ms_played < minPlayDuration) continue;
    
    const artist = entry.master_metadata_album_artist_name;
    let timestamp;
    try {
      // Ensure _dateObj is actually a Date object
      timestamp = entry._dateObj;
      if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
        timestamp = new Date(entry.ts);
      }
      if (!(timestamp instanceof Date) || isNaN(timestamp.getTime()) || timestamp > new Date()) continue;
    } catch (e) {
      continue;
    }
    
    const year = timestamp.getFullYear();
    
    // Initialize nested structure if needed
    if (!dateIndex.has(artist)) {
      dateIndex.set(artist, new Map());
    }
    
    if (!dateIndex.get(artist).has(year)) {
      dateIndex.get(artist).set(year, {
        timestamps: [],
        tracks: new Set(),
        totalPlayed: 0,
        playCount: 0,
        trackPlays: new Map(), // Track plays per song
        albumPlays: new Map(), // Track plays per album
        // Track first play info
        firstPlay: {
          timestamp: timestamp.getTime(),
          trackName: entry.master_metadata_track_name || 'Unknown'
        }
      });
    }
    
    // Add data
    const artistData = dateIndex.get(artist).get(year);
    artistData.timestamps.push(timestamp.getTime());
    
    // Update first play if this is earlier
    if (timestamp.getTime() < artistData.firstPlay.timestamp) {
      artistData.firstPlay = {
        timestamp: timestamp.getTime(),
        trackName: entry.master_metadata_track_name || 'Unknown'
      };
    }
    
    if (entry.master_metadata_track_name) {
      artistData.tracks.add(entry.master_metadata_track_name);
      // Track play count for this track
      const count = artistData.trackPlays.get(entry.master_metadata_track_name) || 0;
      artistData.trackPlays.set(entry.master_metadata_track_name, count + 1);
    }

    // Track album plays
    const albumName = entry.master_metadata_album_album_name;
    if (albumName && albumName !== 'Unknown Album') {
      const albumCount = artistData.albumPlays.get(albumName) || 0;
      artistData.albumPlays.set(albumName, albumCount + 1);
    }

    artistData.totalPlayed += entry.ms_played;
    artistData.playCount++;
  }
  
  // Process data into the final format
  dateIndex.forEach((yearData, artist) => {
    yearData.forEach((data, year) => {
      // Initialize year if needed
      if (!artistsByYear[year]) {
        artistsByYear[year] = [];
      }
      
      // Sort timestamps chronologically
      const sortedTimestamps = data.timestamps.sort((a, b) => a - b);
      const firstListen = sortedTimestamps[0];
      
      // Find most played song directly from trackPlays (already built per artist per year)
      let mostPlayedSong = { trackName: 'Unknown', playCount: 0 };
      for (const [trackName, playCount] of data.trackPlays) {
        if (playCount > mostPlayedSong.playCount) {
          mostPlayedSong = { trackName, playCount };
        }
      }

      // Find most played album
      const sortedAlbums = Array.from(data.albumPlays.entries())
        .sort((a, b) => b[1] - a[1]);
      const mostPlayedAlbum = sortedAlbums.length > 0 ?
        { albumName: sortedAlbums[0][0], playCount: sortedAlbums[0][1] } : null;
      
      // Calculate streaks using day-numbers (no Date objects needed)
      const MS_PER_DAY = 86400000;
      const playDayNumbers = [...new Set(
        sortedTimestamps.map(ts => Math.floor(ts / MS_PER_DAY))
      )].sort((a, b) => a - b);

      let currentStreak = 0;
      let longestStreak = 0;
      let streakStartDay = null;
      let streakEndDay = null;

      for (let i = 0; i < playDayNumbers.length; i++) {
        if (i === 0 || playDayNumbers[i] - playDayNumbers[i - 1] === 1) {
          currentStreak++;
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
            streakEndDay = playDayNumbers[i];
            streakStartDay = playDayNumbers[i - currentStreak + 1];
          }
        } else {
          currentStreak = 1;
        }
      }

      const streakStart = streakStartDay != null ? new Date(streakStartDay * MS_PER_DAY) : null;
      const streakEnd = streakEndDay != null ? new Date(streakEndDay * MS_PER_DAY) : null;

      // Check if current streak is still active
      const todayDayNumber = Math.floor(Date.now() / MS_PER_DAY);
      const lastPlayDay = playDayNumbers.length > 0 ? playDayNumbers[playDayNumbers.length - 1] : -999;
      const daysSinceLastPlay = todayDayNumber - lastPlayDay;
      const activeStreak = daysSinceLastPlay <= 1 ? currentStreak : 0;
      
      // Calculate sort score
      const artistScore = Math.pow(data.playCount, 1.5);
      
      // Get first song listened to and its play count
      const firstSong = data.firstPlay.trackName;
      const firstSongPlayCount = data.trackPlays.get(firstSong) || 0;
      
      // Add to final result
      artistsByYear[year].push({
        name: artist,
        totalPlayed: data.totalPlayed,
        playCount: data.playCount,
        tracks: data.tracks.size,
        firstListen,
        firstSong,
        firstSongPlayCount,
        mostPlayedSong,
        mostPlayedAlbum,
        longestStreak,
        currentStreak: activeStreak,
        streakStart,
        streakEnd,
        artistScore
      });
    });
  });
  
  // Sort each year's artists by score
  Object.keys(artistsByYear).forEach(year => {
    artistsByYear[year].sort((a, b) => b.artistScore - a.artistScore);
  });
  
  return artistsByYear;
}

export async function calculatePlayStats(entries, minPlayDuration = 30000) {
  if (!entries || entries.length === 0) {
    return { songs: [], artists: {}, albums: {}, playHistory: {}, totalListeningTime: 0, 
             serviceListeningTime: {}, processedSongs: 0, shortPlays: 0 };
  }
  
  console.time('calculatePlayStats');
  
  // Initialize result objects
  const artists = {};
  const albums = {};
  const playHistory = {};
  const serviceTime = {};
  let totalListeningTime = 0;
  let processedSongs = 0;
  let shortPlays = 0;

  // Use Maps for better performance
  const trackMap = new Map();
  const albumLookup = new Map();
  const featureArtistLookup = new Map();
  const isrcMap = new Map();
  const trackToAlbumMap = new Map();
  const albumToTracksMap = new Map();
  
  // Pre-process all entries once - parse dates, etc.
  // Ensure _dateObj is a valid Date object (handles serialized strings from storage)
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.ts && (!(entry._dateObj instanceof Date) || isNaN(entry._dateObj.getTime()))) {
      try {
        entry._dateObj = entry.ts instanceof Date ? entry.ts : new Date(entry.ts);
      } catch (e) {
        // Skip invalid dates
      }
    }
  }

  // Build track duration map from completed plays (reason_end === 'trackdone')
  // This maps "trackname|||artistname" → max ms_played, used for skip tolerance
  const trackDurationMap = new Map();
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.reason_end === 'trackdone' && entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
      const key = `${entry.master_metadata_track_name.toLowerCase().trim()}|||${entry.master_metadata_album_artist_name.toLowerCase().trim()}`;
      const current = trackDurationMap.get(key) || 0;
      if (entry.ms_played > current) {
        trackDurationMap.set(key, entry.ms_played);
      }
    }
  }

  // First pass - collect metadata and reference information
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
      const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
      
      if (albumName !== 'Unknown Album') {
        const trackName = entry.master_metadata_track_name.toLowerCase().trim();
        const artistName = entry.master_metadata_album_artist_name.toLowerCase().trim();
        const trackKey = `${trackName}|||${artistName}`;
        
        // Store album information
        trackToAlbumMap.set(trackKey, {
          albumName: albumName,
          normalizedAlbumName: normalizeAlbumName(albumName),
          source: entry.source || 'unknown'
        });
        
        // Track which tracks belong to each album
        const albumKey = `${normalizeAlbumName(albumName)}|||${artistName}`;
        if (!albumToTracksMap.has(albumKey)) {
          albumToTracksMap.set(albumKey, new Set());
        }
        albumToTracksMap.get(albumKey).add(trackName);
      }
      
      // Process track info once for lookups
      const trackInfo = normalizeString(entry.master_metadata_track_name);
      const artistInfo = normalizeString(entry.master_metadata_album_artist_name || 'Unknown Artist');
      const lookupKey = `${trackInfo.normalized}|||${artistInfo.normalized}`;
      
      // Store feature artists
      if (trackInfo.featureArtists && trackInfo.featureArtists.length > 0) {
        featureArtistLookup.set(lookupKey, trackInfo.featureArtists);
      }
      
      // Store ISRC codes
      if (entry.master_metadata_external_ids?.isrc) {
        isrcMap.set(entry.master_metadata_external_ids.isrc, lookupKey);
      } else if (entry.isrc) {
        isrcMap.set(entry.isrc, lookupKey);
      }
      
      // Store album info, preferring Spotify source
      if (entry.master_metadata_album_album_name) {
        if (entry.source === 'spotify' || !albumLookup.has(lookupKey)) {
          albumLookup.set(lookupKey, entry.master_metadata_album_album_name);
        }
      }
    }
  }

  // Main processing pass - process in chunks to avoid blocking UI
  const chunkSize = 5000; // Process 5000 entries at a time
  const totalChunks = Math.ceil(entries.length / chunkSize);
  console.log(`Processing ${entries.length} entries in ${totalChunks} chunks of ${chunkSize}`);
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const startIndex = chunkIndex * chunkSize;
    const endIndex = Math.min(startIndex + chunkSize, entries.length);
    
    console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} (${startIndex}-${endIndex})`);
    
    // Process chunk
    for (let i = startIndex; i < endIndex; i++) {
    const entry = entries[i];
    const playTime = entry.ms_played;
    
    // Skip invalid entries
    if (!entry.master_metadata_track_name || playTime < minPlayDuration) {
      if (playTime < minPlayDuration) shortPlays++;
      continue;
    }
    // Skip untagged iPod files (filenames like KRPL.m4a with no real metadata)
    if (entry.master_metadata_album_artist_name === '<Untagged>' || /\.\w{2,4}$/.test(entry.master_metadata_track_name)) {
      continue;
    }

    processedSongs++;
    totalListeningTime += playTime;

    // Track service listening time
    const service = entry.source || 'unknown';
    serviceTime[service] = (serviceTime[service] || 0) + playTime;

    const trackName = entry.master_metadata_track_name;
    const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
    
    // Get normalized versions
    const trackInfo = normalizeString(trackName);
    const artistInfo = normalizeString(artistName);
    const normTrack = trackInfo.normalized;
    const normArtist = artistInfo.normalized;
    
    // Extract feature artists
    let featureArtists = [];
    if (trackInfo.featureArtists) featureArtists = [...featureArtists, ...trackInfo.featureArtists];
    if (artistInfo.featureArtists) featureArtists = [...featureArtists, ...artistInfo.featureArtists];
    
    // Check for & in artist name
    if (artistName.includes('&')) {
      const artistParts = artistName.split(/\s*&\s*/);
      if (artistParts.length > 1) {
        artistParts.slice(1).forEach(part => {
          if (!featureArtists.includes(part.trim())) {
            featureArtists.push(part.trim());
          }
        });
      }
    }
    
    // Get primary artist efficiently
    let primaryArtist = artistName;
    if (artistName.includes('&')) {
      primaryArtist = artistName.split('&')[0].trim();
    } else if (artistName.includes(',')) {
      primaryArtist = artistName.split(',')[0].trim();
    } else if (artistName.toLowerCase().includes(' feat')) {
      primaryArtist = artistName.split(/\s+feat/i)[0].trim();
    } else if (artistName.toLowerCase().includes(' ft')) {
      primaryArtist = artistName.split(/\s+ft/i)[0].trim();
    }
    
    // Match keys for deduplication
    const lookupKey = `${normTrack}|||${normArtist}`;
    let matchKeyFromIsrc = null;
    if (entry.master_metadata_external_ids?.isrc && isrcMap.has(entry.master_metadata_external_ids.isrc)) {
      matchKeyFromIsrc = isrcMap.get(entry.master_metadata_external_ids.isrc);
    } else if (entry.isrc && isrcMap.has(entry.isrc)) {
      matchKeyFromIsrc = isrcMap.get(entry.isrc);
    }
    const finalLookupKey = matchKeyFromIsrc || lookupKey;
    
    // Determine album name
    let albumName = 'Unknown Album';
    if (entry.source === 'spotify' && entry.master_metadata_album_album_name) {
      albumName = entry.master_metadata_album_album_name;
    } else {
      const trackKey = `${normTrack}|||${normArtist}`;
      if (trackToAlbumMap.has(trackKey)) {
        albumName = trackToAlbumMap.get(trackKey).albumName;
      } else if (albumLookup.has(finalLookupKey)) {
        albumName = albumLookup.get(finalLookupKey);
      }
    }
    
    // Check for additional feature artists
    if (featureArtistLookup.has(finalLookupKey)) {
      const lookupFeatures = featureArtistLookup.get(finalLookupKey);
      for (const artist of lookupFeatures) {
        if (!featureArtists.includes(artist)) {
          featureArtists.push(artist);
        }
      }
    }
    
    // Create a match key for deduplication
    const enhancedMatchKey = createMatchKey(trackName, primaryArtist);
    
    // Get timestamp - ensure _dateObj is actually a Date object
    let timestamp = entry._dateObj;
    if (!(timestamp instanceof Date) || isNaN(timestamp.getTime())) {
      timestamp = entry.ts ? new Date(entry.ts) : new Date();
    }

    // Track play history
    const standardKey = `${trackName}-${artistName}`;
    if (!playHistory[standardKey]) {
      playHistory[standardKey] = [];
    }
    if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
      playHistory[standardKey].push(timestamp.getTime());
    }

    // Artist stats
    if (!artists[artistName]) {
      artists[artistName] = {
        name: artistName,
        totalPlayed: 0,
        playCount: 0,
        firstListen: timestamp.getTime(),
        firstSong: trackName,
        firstSongPlayCount: 1
      };
    } else {
      artists[artistName].totalPlayed += playTime;
      artists[artistName].playCount++;
      
      if (timestamp.getTime() < artists[artistName].firstListen) {
        artists[artistName].firstListen = timestamp.getTime();
        artists[artistName].firstSong = trackName;
        artists[artistName].firstSongPlayCount = 1;
      } else if (trackName === artists[artistName].firstSong) {
        artists[artistName].firstSongPlayCount = (artists[artistName].firstSongPlayCount || 0) + 1;
      }
    }

    // Album stats
    if (albumName && artistName) {
      const normalizedAlbumName = normalizeAlbumName(albumName);
      const normalizedArtistName = artistName.toLowerCase().trim();
      const albumKey = `${normalizedAlbumName}-${normalizedArtistName}`;
      
      const fullAlbumKey = `${normalizedAlbumName}|||${normalizedArtistName}`;
      const expectedTrackCount = albumToTracksMap.has(fullAlbumKey) ? 
                               albumToTracksMap.get(fullAlbumKey).size : 0;
      
      if (!albums[albumKey]) {
        albums[albumKey] = {
          name: albumName,
          artist: artistName,
          totalPlayed: 0,
          playCount: 0,
          trackCount: new Set(),
          trackNames: new Set(),
          trackObjects: [],
          expectedTrackCount: expectedTrackCount,
          firstListen: timestamp.getTime(),
          isComplete: false,
          years: new Set()
        };
      }

      // Add year to set
      if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
        albums[albumKey].years.add(timestamp.getFullYear());
      }
          
      albums[albumKey].totalPlayed += playTime;
      albums[albumKey].playCount++;
      albums[albumKey].trackCount.add(normTrack);
      albums[albumKey].trackNames.add(trackName);
      
      // Update track objects using enhanced matching
      const trackMatchKey = createMatchKey(trackName, artistName);
      
      // Use trackMap for better deduplication (convert to array later)
      if (!albums[albumKey].trackMap) {
        albums[albumKey].trackMap = new Map();
      }
      
      if (albums[albumKey].trackMap.has(trackMatchKey)) {
        // Update existing track
        const track = albums[albumKey].trackMap.get(trackMatchKey);
        track.totalPlayed += playTime;
        track.playCount++;
        
        // Update display name if we get a better version (prefer "feat" over "with")
        if (trackName.includes('feat') && track.trackName.includes('with')) {
          track.trackName = trackName;
        }
      } else {
        // Create new track
        albums[albumKey].trackMap.set(trackMatchKey, {
          trackName,
          artist: artistName,
          totalPlayed: playTime,
          playCount: 1,
          albumName
        });
      }
      
      // Update expected track count if needed
      if (albums[albumKey].trackCount.size > albums[albumKey].expectedTrackCount) {
        albums[albumKey].expectedTrackCount = albums[albumKey].trackCount.size;
      }
      
      // Check if album is complete
      if (expectedTrackCount > 0 && albums[albumKey].trackCount.size >= expectedTrackCount) {
        albums[albumKey].isComplete = true;
      }
      
      // Update first listen time if earlier
      albums[albumKey].firstListen = Math.min(
        albums[albumKey].firstListen, 
        timestamp.getTime()
      );
    }

    // Track handling
    if (trackMap.has(enhancedMatchKey)) {
      // Update existing track
      const track = trackMap.get(enhancedMatchKey);
      track.totalPlayed += playTime;
      track.playCount++;
      
      // Update album if better info available
      if (albumName !== 'Unknown Album' && 
          (track.albumName === 'Unknown Album' || entry.source === 'spotify')) {
        track.albumName = albumName;
      }
      
      // Add variation if new
      if (!track.variations.some(v => 
          v.trackName === trackName && v.artistName === artistName)) {
        track.variations.push({ 
          trackName, 
          artistName, 
          source: entry.source || 'unknown',
          isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
        });
      }
      
      // Update feature artists
      for (const artist of featureArtists) {
        if (!track.featureArtists.some(a => a.toLowerCase() === artist.toLowerCase())) {
          track.featureArtists.push(artist);
        }
      }
      
      // Store ISRC if available
      if ((entry.master_metadata_external_ids?.isrc || entry.isrc) && !track.isrc) {
        track.isrc = entry.master_metadata_external_ids?.isrc || entry.isrc;
      }
    } else {
      // Create new track
      trackMap.set(enhancedMatchKey, {
        key: standardKey,
        trackName,
        artist: primaryArtist,
        fullArtist: artistName,
        albumName,
        totalPlayed: playTime,
        playCount: 1,
        variations: [{ 
          trackName, 
          artistName, 
          source: entry.source || 'unknown',
          isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
        }],
        featureArtists: featureArtists.length > 0 ? featureArtists : [],
        isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
      });
    }
    } // End of chunk processing
    
    // Yield to prevent UI blocking after each chunk
    if (chunkIndex < totalChunks - 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  // Process tracks for display - convert map to array
  const songs = [];
  trackMap.forEach((track) => {
    // Choose best version for display
    if (track.variations && track.variations.length > 1) {
      // Sort variations by preference
      const sortedVariations = [...track.variations].sort((a, b) => {
        // Spotify source is preferred
        if (a.source === 'spotify' && b.source !== 'spotify') return -1;
        if (b.source === 'spotify' && a.source !== 'spotify') return 1;
        
        // Prefer entries with feat/ft in track name
        const aHasFeat = /feat\.|ft\.|with/i.test(a.trackName);
        const bHasFeat = /feat\.|ft\.|with/i.test(b.trackName);
        if (aHasFeat && !bHasFeat) return -1;
        if (bHasFeat && !aHasFeat) return 1;
        
        // Prefer entries with & in artist name
        const aHasAmp = a.artistName.includes('&');
        const bHasAmp = b.artistName.includes('&');
        if (aHasAmp && !bHasAmp) return -1;
        if (bHasAmp && !aHasAmp) return 1;
        
        return 0;
      });
      
      // Use best variation
      const bestVariation = sortedVariations[0];
      track.displayName = bestVariation.trackName;
      track.displayArtist = bestVariation.artistName;
    } else {
      track.displayName = track.trackName;
      track.displayArtist = track.fullArtist || track.artist;
    }
    
    songs.push(track);
  });

  // Process album stats
  Object.values(albums).forEach(album => {
    // Convert trackMap to trackObjects array if it exists
    if (album.trackMap) {
      album.trackObjects = Array.from(album.trackMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
      delete album.trackMap; // Clean up
    } else {
      album.trackObjects.sort((a, b) => b.totalPlayed - a.totalPlayed);
    }
    album.trackCountValue = album.trackCount.size;
    album.yearsArray = Array.from(album.years).sort();
  });

  console.timeEnd('calculatePlayStats');
  
  return {
    songs,
    artists,
    albums,
    playHistory,
    totalListeningTime,
    serviceListeningTime: serviceTime,
    processedSongs,
    shortPlays,
    trackDurationMap
  };
}
