// ---------------------------------------------------------------------------
// Artist MBID matching via MusicBrainz — the foundation the recommendation
// engine sits on. Resolves the user's top artists to MusicBrainz artist IDs
// so they can be used as seeds for ListenBrainz's similar-artists dataset.
//
// Mirrors the rate-limit/cache pattern in ../albumEnrichment.js: MusicBrainz
// asks for 1 request/second, so lookups are spaced 1.1s apart and cached in
// localStorage across sessions.
// ---------------------------------------------------------------------------

import { normalizeArtistName } from '../streaming/normalize.js';

const CACHE_KEY = 'artistMbidCache';
const REQUEST_INTERVAL = 1100;
const MB_BASE = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'StreamingHistoryAnalyzer/1.0 (https://github.com)';

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queryArtist(name) {
  const q = encodeURIComponent(`artist:"${name}"`);
  const url = `${MB_BASE}/artist?query=${q}&fmt=json&limit=5`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (res.status === 503 || res.status === 429) {
    await sleep(3000);
    const retry = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!retry.ok) return null;
    return retry.json();
  }

  if (!res.ok) return null;
  return res.json();
}

// Pick the best candidate: exact case-insensitive name match wins (ties
// broken by MB's own relevance score, which the API already sorts by);
// otherwise fall back to the top-scored result.
function pickBestMatch(data, name) {
  if (!data?.artists?.length) return null;
  const lower = name.toLowerCase().trim();
  const exact = data.artists.find(a => a.name?.toLowerCase().trim() === lower);
  const best = exact || data.artists[0];
  return best?.id || null;
}

/**
 * Resolve artist names to MusicBrainz artist MBIDs.
 *
 * @param {string[]} artistNames - Raw (non-normalized) artist names to match
 * @param {Function} onProgress - Optional callback: (done, total) => void
 * @param {Object} options - { shouldStop?: () => boolean }
 * @returns {Promise<Map<string, string|null>>} normalized name -> mbid (or null for no match)
 */
export async function matchArtistMbids(artistNames, onProgress, { shouldStop } = {}) {
  const cache = loadCache();
  const result = new Map();

  // Dedup by normalized name — several raw spellings can share one lookup.
  const uniqueByNorm = new Map();
  for (const name of artistNames) {
    if (!name) continue;
    const norm = normalizeArtistName(name);
    if (!uniqueByNorm.has(norm)) uniqueByNorm.set(norm, name);
  }

  const toFetch = [];
  for (const [norm, rawName] of uniqueByNorm) {
    if (norm in cache) {
      result.set(norm, cache[norm]);
    } else {
      toFetch.push([norm, rawName]);
    }
  }

  const total = uniqueByNorm.size;
  let done = total - toFetch.length;
  if (onProgress) onProgress(done, total);

  let stopped = false;
  for (const [norm, rawName] of toFetch) {
    if (shouldStop?.()) { stopped = true; break; }
    try {
      const data = await queryArtist(rawName);
      const mbid = pickBestMatch(data, rawName);
      cache[norm] = mbid;
      result.set(norm, mbid);
    } catch (err) {
      console.warn(`Artist MBID lookup failed for "${rawName}":`, err.message);
      cache[norm] = null;
      result.set(norm, null);
    }

    done++;
    if (onProgress) onProgress(done, total);
    if (done % 20 === 0) saveCache(cache);
    await sleep(REQUEST_INTERVAL);
  }

  saveCache(cache);
  return { mbids: result, stopped };
}

export function clearArtistMbidCache() {
  localStorage.removeItem(CACHE_KEY);
}
