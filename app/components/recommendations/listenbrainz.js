// ---------------------------------------------------------------------------
// ListenBrainz API client for the recommendations engine.
//
// Two tiers:
//  - similar-artists (labs.api.listenbrainz.org): no auth, no rate limit
//    documented. Seeded by artist MBIDs from artistMbid.js.
//  - canonical recording lookup + similar-recordings: track-level precision,
//    gated behind a free personal API token (listenbrainz.org/settings)
//    because /1/metadata/lookup/ requires an Authorization header.
//
// All responses are cached in localStorage — these datasets change slowly
// and there's no reason to re-fetch every time the recommendations tab opens.
// ---------------------------------------------------------------------------

const LABS_BASE = 'https://labs.api.listenbrainz.org';
const API_BASE = 'https://api.listenbrainz.org';

const ARTIST_ALGORITHM = 'session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30';
const RECORDING_ALGORITHM = 'session_based_days_7500_session_300_contribution_5_threshold_15_limit_50_skip_30';

const TOKEN_KEY = 'listenbrainzToken';
const SIMILAR_ARTISTS_CACHE_KEY = 'similarArtistsCache';
const RECORDING_MBID_CACHE_KEY = 'recordingMbidCache';
const SIMILAR_RECORDINGS_CACHE_KEY = 'similarRecordingsCache';

const LOOKUP_BATCH_SIZE = 25;
const SIMILAR_ARTISTS_BATCH_SIZE = 50;

// ---- Token -----------------------------------------------------------------

export function getLbToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setLbToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

// ---- Generic cache helpers ---------------------------------------------------

function loadCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(key, cache) {
  try {
    localStorage.setItem(key, JSON.stringify(cache));
  } catch { /* quota exceeded — silently skip */ }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ---- Similar artists (no auth) ---------------------------------------------

/**
 * @param {string[]} artistMbids - Seed artist MBIDs (already deduped)
 * @returns {Promise<Map<string, Array>>} artist_mbid -> [{ artist_mbid, name, comment, type, score }]
 */
export async function fetchSimilarArtists(artistMbids) {
  const cache = loadCache(SIMILAR_ARTISTS_CACHE_KEY);
  const result = new Map();
  const toFetch = [];

  for (const mbid of artistMbids) {
    if (mbid in cache) result.set(mbid, cache[mbid]);
    else toFetch.push(mbid);
  }

  for (const batch of chunk(toFetch, SIMILAR_ARTISTS_BATCH_SIZE)) {
    if (batch.length === 0) continue;
    try {
      const res = await fetch(`${LABS_BASE}/similar-artists/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ artist_mbids: batch, algorithm: ARTIST_ALGORITHM }]),
      });
      if (!res.ok) continue;
      const rows = await res.json();

      // Group rows by reference_mbid (the seed they came from), then fill in
      // any seeds that came back with zero rows so they're cached as a miss.
      const bySeed = new Map(batch.map(m => [m, []]));
      for (const row of rows) {
        const seed = row.reference_mbid;
        if (!bySeed.has(seed)) bySeed.set(seed, []);
        bySeed.get(seed).push(row);
      }
      for (const [seed, list] of bySeed) {
        cache[seed] = list;
        result.set(seed, list);
      }
    } catch (err) {
      console.warn('similar-artists lookup failed:', err.message);
    }
  }

  saveCache(SIMILAR_ARTISTS_CACHE_KEY, cache);
  return result;
}

// ---- Canonical recording lookup (token-gated) -------------------------------

function recordingCacheKey(artist, track) {
  return `${artist.toLowerCase().trim()}|||${track.toLowerCase().trim()}`;
}

/**
 * Resolve (artist, track) pairs to canonical ListenBrainz recording MBIDs.
 * Requires a personal API token — see getLbToken/setLbToken.
 *
 * @param {Array<{artist: string, track: string}>} tracks
 * @param {string} token
 * @returns {Promise<Map<string, string|null>>} "artist|||track" -> recording_mbid
 */
export async function lookupCanonicalRecordings(tracks, token) {
  const cache = loadCache(RECORDING_MBID_CACHE_KEY);
  const result = new Map();
  const toFetch = [];

  for (const { artist, track } of tracks) {
    const key = recordingCacheKey(artist, track);
    if (key in cache) result.set(key, cache[key]);
    else toFetch.push({ artist, track, key });
  }

  if (!token) return result;

  for (const batch of chunk(toFetch, LOOKUP_BATCH_SIZE)) {
    if (batch.length === 0) continue;
    try {
      const res = await fetch(`${API_BASE}/1/metadata/lookup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify({
          recordings: batch.map(({ artist, track }) => ({
            artist_name: artist,
            recording_name: track,
          })),
        }),
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error('Invalid ListenBrainz token');
        continue;
      }
      const rows = await res.json();
      // The batch response is assumed to be index-aligned with the request
      // (undocumented — the GET/single-lookup shape is all MetaBrainz
      // documents). Guard against a wrong alignment assumption by requiring
      // the returned artist_credit_name to loosely match the query; a
      // misaligned row fails this check and is cached as a miss instead of
      // silently attaching the wrong recording.
      batch.forEach((item, i) => {
        const match = rows[i];
        const returnedArtist = match?.artist_credit_name?.toLowerCase() ?? '';
        const queriedArtist = item.artist.toLowerCase();
        const plausible = returnedArtist && (
          returnedArtist.includes(queriedArtist) || queriedArtist.includes(returnedArtist)
        );
        const mbid = plausible ? (match.recording_mbid || null) : null;
        cache[item.key] = mbid;
        result.set(item.key, mbid);
      });
    } catch (err) {
      if (err.message === 'Invalid ListenBrainz token') throw err;
      console.warn('Canonical recording lookup failed:', err.message);
    }
  }

  saveCache(RECORDING_MBID_CACHE_KEY, cache);
  return result;
}

// ---- Similar recordings (no auth, but needs canonical MBIDs to hit) --------

/**
 * @param {string[]} recordingMbids
 * @returns {Promise<Map<string, Array>>} recording_mbid -> [{ recording_mbid, ...meta, score }]
 */
export async function fetchSimilarRecordings(recordingMbids) {
  const cache = loadCache(SIMILAR_RECORDINGS_CACHE_KEY);
  const result = new Map();
  const toFetch = [];

  for (const mbid of recordingMbids) {
    if (mbid in cache) result.set(mbid, cache[mbid]);
    else toFetch.push(mbid);
  }

  for (const batch of chunk(toFetch, SIMILAR_ARTISTS_BATCH_SIZE)) {
    if (batch.length === 0) continue;
    try {
      const res = await fetch(`${LABS_BASE}/similar-recordings/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ recording_mbids: batch, algorithm: RECORDING_ALGORITHM }]),
      });
      if (!res.ok) continue;
      const rows = await res.json();

      const bySeed = new Map(batch.map(m => [m, []]));
      for (const row of rows) {
        const seed = row.reference_mbid;
        if (!bySeed.has(seed)) bySeed.set(seed, []);
        bySeed.get(seed).push(row);
      }
      for (const [seed, list] of bySeed) {
        cache[seed] = list;
        result.set(seed, list);
      }
    } catch (err) {
      console.warn('similar-recordings lookup failed:', err.message);
    }
  }

  saveCache(SIMILAR_RECORDINGS_CACHE_KEY, cache);
  return result;
}

export function clearListenBrainzCaches() {
  localStorage.removeItem(SIMILAR_ARTISTS_CACHE_KEY);
  localStorage.removeItem(RECORDING_MBID_CACHE_KEY);
  localStorage.removeItem(SIMILAR_RECORDINGS_CACHE_KEY);
}
