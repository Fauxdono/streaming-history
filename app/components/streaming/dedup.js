import _ from 'lodash';

export function deduplicateCrossSources(entries) {
  // Sort by estimated start time so we can efficiently compare nearby entries.
  // Last.fm records start time, Spotify records end time — compare start times
  // to catch duplicates regardless of song length.
  const getStartTime = (e) => {
    const t = new Date(e.ts).getTime();
    // Spotify/Tidal/etc ts is end-of-play: estimate start by subtracting duration
    if (e.source !== 'lastfm' && e.ms_played && e.ms_played > 0) {
      return t - e.ms_played;
    }
    // Last.fm ts is already the start time
    return t;
  };

  // Normalize track name: strip non-alphanumeric, remove common suffixes
  const normTrack = (name) => {
    return (name || '').toLowerCase()
      .replace(/\s*[-–—]\s*(remaster|remastered|remix|deluxe|bonus|live|mono|stereo|anniversary|edition|version|single|extended|original|explicit|clean|radio|acoustic|demo|instrumental|alt)\b.*/i, '')
      .replace(/\s*\(?(feat\.?|ft\.?|featuring)\s+[^)]*\)?/i, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Normalize artist: strip non-alphanumeric, remove leading "the"
  const normArtist = (name) => {
    return (name || '').toLowerCase()
      .replace(/^the\s+/, '')
      .replace(/[^a-z0-9]/g, '');
  };

  // Check if two track names match (exact or one contains the other)
  const tracksMatch = (a, b) => {
    if (a === b) return true;
    if (!a || !b) return false;
    // Shorter name is a prefix of longer (handles "song" vs "songremasteredversion")
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length <= b.length ? b : a;
    return shorter.length >= 4 && longer.startsWith(shorter);
  };

  const sorted = entries.slice().sort((a, b) => getStartTime(a) - getStartTime(b));

  // Source priority: prefer entries with real play duration data
  const SOURCE_PRIORITY = { spotify: 5, apple_music: 4, tidal: 3, deezer: 3, youtube_music: 3, soundcloud: 2, ipod: 2, cake: 1, lastfm: 0 };

  const removed = new Set();
  // Use wider window when lastfm is involved (stored timestamps may have timezone offset from old bug)
  const WINDOW_MS = 3 * 60 * 1000;
  const WINDOW_MS_LASTFM = 15 * 60 * 1000;

  for (let i = 0; i < sorted.length; i++) {
    if (removed.has(i)) continue;
    const a = sorted[i];
    const aStart = getStartTime(a);
    const aTrack = normTrack(a.master_metadata_track_name);
    const aArtist = normArtist(a.master_metadata_album_artist_name);

    if (!aTrack || !aArtist) continue;

    // Look ahead within the time window
    for (let j = i + 1; j < sorted.length; j++) {
      if (removed.has(j)) continue;
      const b = sorted[j];
      const bStart = getStartTime(b);

      // Use wider window when lastfm is one of the sources
      const window = (a.source === 'lastfm' || b.source === 'lastfm') ? WINDOW_MS_LASTFM : WINDOW_MS;

      // Past the window — stop looking
      if (bStart - aStart > window) break;

      // Same source — not a cross-source duplicate
      if (a.source === b.source) continue;

      const bTrack = normTrack(b.master_metadata_track_name);
      const bArtist = normArtist(b.master_metadata_album_artist_name);

      if (tracksMatch(aTrack, bTrack) && tracksMatch(aArtist, bArtist)) {
        // Keep the one with higher priority (more data)
        const aPri = SOURCE_PRIORITY[a.source] ?? 1;
        const bPri = SOURCE_PRIORITY[b.source] ?? 1;
        if (aPri >= bPri) {
          removed.add(j);
        } else {
          removed.add(i);
          break; // a is removed, stop comparing it
        }
      }
    }
  }

  const result = sorted.filter((_, i) => !removed.has(i));
  if (removed.size > 0) {
    console.log(`Cross-source dedup: removed ${removed.size} duplicates`);
  }
  return result;
}

