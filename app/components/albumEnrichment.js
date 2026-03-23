// ---------------------------------------------------------------------------
// Album Enrichment via MusicBrainz API
//
// Looks up album names for tracks missing album data (e.g. YouTube Music,
// SoundCloud, some Apple Music exports). Results are cached in localStorage
// to avoid redundant API calls across sessions.
//
// MusicBrainz rate limit: 1 request per second (we use 1.1s spacing).
// ---------------------------------------------------------------------------

const CACHE_KEY = 'albumEnrichmentCache';
const REQUEST_INTERVAL = 1100; // ms between API calls
const MB_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'StreamingHistoryAnalyzer/1.0 (https://github.com)';

// ---- Cache ----------------------------------------------------------------

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* quota exceeded — silently skip */ }
}

function cacheKey(artist, track) {
  return `${artist.toLowerCase().trim()}|||${track.toLowerCase().trim()}`;
}

// ---- MusicBrainz lookup ---------------------------------------------------

async function queryMusicBrainz(artist, track) {
  const q = encodeURIComponent(`recording:"${track}" AND artist:"${artist}"`);
  const url = `${MB_BASE}/recording?query=${q}&fmt=json&limit=5`;

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (res.status === 503 || res.status === 429) {
    // Rate limited — back off and retry once
    await sleep(3000);
    const retry = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!retry.ok) return null;
    return retry.json();
  }

  if (!res.ok) return null;
  return res.json();
}

function extractAlbum(data, artistHint) {
  if (!data?.recordings?.length) return null;

  const artistLower = artistHint.toLowerCase();

  for (const rec of data.recordings) {
    // Prefer official album releases over singles/compilations
    const releases = rec.releases ?? [];
    for (const rel of releases) {
      // Check the recording's artist credit matches
      const creditMatch = rec['artist-credit']?.some(
        ac => ac.artist?.name?.toLowerCase().includes(artistLower) ||
              artistLower.includes(ac.artist?.name?.toLowerCase() ?? '')
      );
      if (!creditMatch) continue;

      // Skip compilations and prefer albums
      const group = rel['release-group'];
      const type = group?.['primary-type'] ?? '';
      if (type === 'Album' || type === 'EP') {
        return rel.title;
      }
    }
  }

  // Fallback: take first release from first matching recording
  for (const rec of data.recordings) {
    const creditMatch = rec['artist-credit']?.some(
      ac => ac.artist?.name?.toLowerCase().includes(artistLower) ||
            artistLower.includes(ac.artist?.name?.toLowerCase() ?? '')
    );
    if (creditMatch && rec.releases?.length) {
      return rec.releases[0].title;
    }
  }

  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Public API -----------------------------------------------------------

/**
 * Enrich entries that have "Unknown Album" with album names from MusicBrainz.
 *
 * @param {Array} entries - Processed streaming entries (mutated in place)
 * @param {Function} onProgress - Optional callback: (done, total) => void
 * @returns {Object} { enriched: number, total: number, cached: number }
 */
export async function enrichAlbums(entries, onProgress) {
  // Collect unique artist+track combos that need enrichment
  const needsLookup = new Map(); // cacheKey → { artist, track, indices[] }

  entries.forEach((entry, i) => {
    const album = entry.master_metadata_album_album_name;
    if (album && album !== 'Unknown Album') return;

    const artist = entry.master_metadata_album_artist_name;
    const track = entry.master_metadata_track_name;
    if (!artist || !track) return;

    const key = cacheKey(artist, track);
    if (needsLookup.has(key)) {
      needsLookup.get(key).indices.push(i);
    } else {
      needsLookup.set(key, { artist, track, indices: [i] });
    }
  });

  if (needsLookup.size === 0) {
    return { enriched: 0, total: 0, cached: 0 };
  }

  const cache = loadCache();
  let enriched = 0;
  let cached = 0;
  let done = 0;
  const total = needsLookup.size;

  for (const [key, { artist, track, indices }] of needsLookup) {
    // Check cache first
    if (key in cache) {
      const albumName = cache[key];
      if (albumName) {
        indices.forEach(i => {
          entries[i].master_metadata_album_album_name = albumName;
        });
        enriched += indices.length;
      }
      cached++;
      done++;
      if (onProgress) {
        onProgress(done, total);
        // Yield every 5 cached items so the browser can repaint the progress bar
        if (done % 5 === 0) await new Promise(r => setTimeout(r, 16));
      }
      continue;
    }

    // Query MusicBrainz
    try {
      const data = await queryMusicBrainz(artist, track);
      const albumName = extractAlbum(data, artist);

      // Cache the result (even null, to avoid re-querying)
      cache[key] = albumName;

      if (albumName) {
        indices.forEach(i => {
          entries[i].master_metadata_album_album_name = albumName;
        });
        enriched += indices.length;
      }
    } catch (err) {
      console.warn(`Album enrichment failed for "${track}" by "${artist}":`, err.message);
      cache[key] = null; // cache the miss
    }

    done++;
    if (onProgress) onProgress(done, total);

    // Save cache periodically (every 20 lookups)
    if (done % 20 === 0) saveCache(cache);

    // Rate limit
    await sleep(REQUEST_INTERVAL);
  }

  saveCache(cache);

  console.log(`Album enrichment: ${enriched} entries enriched, ${cached} from cache, ${total} unique lookups`);
  return { enriched, total, cached };
}

/**
 * Clear the album enrichment cache.
 */
export function clearEnrichmentCache() {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Get stats about the current cache.
 */
export function getEnrichmentCacheStats() {
  const cache = loadCache();
  const keys = Object.keys(cache);
  const hits = keys.filter(k => cache[k] !== null).length;
  return { total: keys.length, hits, misses: keys.length - hits };
}
