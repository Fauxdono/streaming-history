// ---------------------------------------------------------------------------
// Album Enrichment via MusicBrainz API
//
// Looks up album names for tracks missing album data (e.g. YouTube Music,
// SoundCloud, some Apple Music exports). Results are cached in localStorage
// to avoid redundant API calls across sessions.
//
// MusicBrainz rate limit: 1 request per second (we use 1.1s spacing).
// ---------------------------------------------------------------------------

import { entryMatchKey } from './streaming/overrides.js';

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

function releaseYear(rel) {
  const date = rel['release-group']?.['first-release-date'] || rel.date || '';
  const y = parseInt(String(date).slice(0, 4), 10);
  return y >= 1000 && y <= 9999 ? y : null;
}

// Returns { album, year } or null. Year is the earliest release date seen
// across credit-matched releases (original release beats reissues).
function extractAlbum(data, artistHint) {
  if (!data?.recordings?.length) return null;

  const artistLower = artistHint.toLowerCase();
  let album = null;
  let year = null;

  for (const rec of data.recordings) {
    const releases = rec.releases ?? [];
    // Check the recording's artist credit matches
    const creditMatch = rec['artist-credit']?.some(
      ac => ac.artist?.name?.toLowerCase().includes(artistLower) ||
            artistLower.includes(ac.artist?.name?.toLowerCase() ?? '')
    );
    if (!creditMatch) continue;

    for (const rel of releases) {
      const y = releaseYear(rel);
      if (y && (!year || y < year)) year = y;

      // Skip compilations and prefer albums
      if (!album) {
        const type = rel['release-group']?.['primary-type'] ?? '';
        if (type === 'Album' || type === 'EP') {
          album = rel.title;
        }
      }
    }
  }

  if (album) return { album, year };

  // Fallback: take first release from first matching recording
  for (const rec of data.recordings) {
    const creditMatch = rec['artist-credit']?.some(
      ac => ac.artist?.name?.toLowerCase().includes(artistLower) ||
            artistLower.includes(ac.artist?.name?.toLowerCase() ?? '')
    );
    if (creditMatch && rec.releases?.length) {
      return { album: rec.releases[0].title, year };
    }
  }

  return year ? { album: null, year } : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Public API -----------------------------------------------------------

/**
 * Enrich entries with album names and release years from MusicBrainz.
 * By default only tracks with "Unknown Album" are looked up (the upload-time
 * behavior); pass lookupYears to also cover tracks that have an album but no
 * release year (the Your Data tab's Run-now behavior).
 *
 * @param {Array} entries - Processed streaming entries (mutated in place)
 * @param {Function} onProgress - Optional callback: (done, total) => void
 * @param {Object} options - { lookupYears?: boolean, shouldStop?: () => boolean,
 *                             entryFilter?: (entry) => boolean,
 *                             trackOverrides?: object } — entryFilter scopes the
 *                             run (e.g. to the user's current search);
 *                             trackOverrides (overrides.tracks) makes lookups
 *                             use the user's merged/corrected names, so merged
 *                             variants share ONE query and clean names search
 *                             better
 * @returns {Object} { enriched: number, total: number, cached: number, stopped: boolean }
 */
export async function enrichAlbums(entries, onProgress, { lookupYears = false, shouldStop, entryFilter, trackOverrides } = {}) {
  // Collect unique artist+track combos that need enrichment
  const needsLookup = new Map(); // cacheKey → { artist, track, indices[] }

  entries.forEach((entry, i) => {
    if (entryFilter && !entryFilter(entry)) return;
    const rawArtist = entry.master_metadata_album_artist_name;
    const rawTrack = entry.master_metadata_track_name;
    if (!rawArtist || !rawTrack) return;

    const edit = trackOverrides ? trackOverrides[entryMatchKey(entry)] : null;
    const album = entry.master_metadata_album_album_name;
    // A user-supplied album or year counts as known
    const albumMissing = !edit?.album && (!album || album === 'Unknown Album');
    const yearMissing = lookupYears && !entry.release_year && edit?.releaseYear == null;
    if (!albumMissing && !yearMissing) return;

    // Query under the user's corrected identity when there is one
    const artist = edit?.artist || rawArtist;
    const track = edit?.name || rawTrack;

    const key = cacheKey(artist, track);
    if (needsLookup.has(key)) {
      needsLookup.get(key).indices.push(i);
    } else {
      needsLookup.set(key, { artist, track, indices: [i] });
    }
  });

  if (needsLookup.size === 0) {
    return { enriched: 0, total: 0, cached: 0, stopped: false };
  }

  const cache = loadCache();
  let enriched = 0;
  let cached = 0;
  let done = 0;
  let stopped = false;
  const total = needsLookup.size;

  // Cache values: legacy plain string (album only), { album, year }, or null.
  // Never overwrite an album the data already knows; years fill blanks only.
  const applyResult = (result, indices) => {
    const album = typeof result === 'string' ? result : result?.album;
    const year = typeof result === 'object' && result ? result.year : null;
    if (!album && !year) return false;
    let applied = false;
    indices.forEach(i => {
      const cur = entries[i].master_metadata_album_album_name;
      if (album && (!cur || cur === 'Unknown Album')) {
        entries[i].master_metadata_album_album_name = album;
        applied = true;
      }
      if (year && !entries[i].release_year) {
        entries[i].release_year = year;
        applied = true;
      }
    });
    return applied;
  };

  // A legacy string cache entry has no year info — when years are wanted,
  // re-query it once so the cache upgrades to { album, year }.
  const cacheIsFinal = (value) =>
    value === null || typeof value === 'object' || !lookupYears;

  for (const [key, { artist, track, indices }] of needsLookup) {
    if (shouldStop?.()) {
      stopped = true;
      break;
    }
    // Check cache first
    if (key in cache && cacheIsFinal(cache[key])) {
      if (applyResult(cache[key], indices)) {
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
      const result = extractAlbum(data, artist);

      // Cache the result (even null, to avoid re-querying)
      cache[key] = result;

      if (applyResult(result, indices)) {
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

  console.log(`Album enrichment: ${enriched} entries enriched, ${cached} from cache, ${total} unique lookups${stopped ? ' (stopped early)' : ''}`);
  return { enriched, total, cached, stopped };
}

/**
 * Clear the album enrichment cache.
 */
export function clearEnrichmentCache() {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Snapshot of the cache for backup (e.g. the Google Drive save file).
 */
export function exportEnrichmentCache() {
  return loadCache();
}

/**
 * Merge a backed-up cache into the local one (used when loading from Drive).
 * Richer values win: { album, year } beats a legacy album-only string, which
 * beats a cached miss (null) — so a restore never downgrades local lookups.
 * Returns the number of keys added or upgraded.
 */
export function mergeEnrichmentCache(imported) {
  if (!imported || typeof imported !== 'object') return 0;
  const rank = (v) => (v && typeof v === 'object' ? 2 : typeof v === 'string' ? 1 : 0);
  const cache = loadCache();
  let changed = 0;
  for (const [key, value] of Object.entries(imported)) {
    if (!(key in cache) || rank(value) > rank(cache[key])) {
      cache[key] = value;
      changed++;
    }
  }
  if (changed > 0) saveCache(cache);
  return changed;
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
