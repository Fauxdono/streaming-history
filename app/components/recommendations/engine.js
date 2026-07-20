// ---------------------------------------------------------------------------
// Recommendation engine — blends two candidate piles into ranked lists:
//
//  Layer 1a (always on): top artists -> MusicBrainz MBIDs -> ListenBrainz
//    similar-artists. No account needed.
//  Layer 1b (needs a ListenBrainz token): top tracks -> canonical recording
//    MBIDs -> ListenBrainz similar-recordings.
//  Layer 3: candidate scores are weighted by how much the user actually
//    played the seed that surfaced them, candidates already in the user's
//    library are dropped, and what's left is sorted.
//
// Sound-matching (audio feature vectors) is intentionally not part of this —
// see the recommendations page discussion: neither available source
// (AcousticBrainz's frozen 2022 dump, paid third-party APIs) was a clean fit,
// so it was deferred rather than bolted on.
// ---------------------------------------------------------------------------

import { normalizeArtistName, createMatchKey } from '../streaming/normalize.js';
import { matchArtistMbids } from './artistMbid.js';
import { fetchSimilarArtists, lookupCanonicalRecordings, fetchSimilarRecordings } from './listenbrainz.js';

const SEED_ARTIST_LIMIT = 100;
const SEED_TRACK_LIMIT = 150;
const RESULT_LIMIT = 40;

function trackKey(artist, track) {
  return createMatchKey(track, artist);
}

// Weight each seed by its share of play count among the seed set — a track
// played 500 times counts for more than one played twice, but no single
// mega-favorite can single-handedly dominate the candidate pool.
function buildWeights(seeds, countKey) {
  const total = seeds.reduce((sum, s) => sum + (s[countKey] || 0), 0) || 1;
  return new Map(seeds.map(s => [s, (s[countKey] || 0) / total]));
}

/**
 * @param {Object} params
 * @param {Array} params.topArtists - Seed pool, sorted by relevance ({ name, playCount, totalPlayed, ... }).
 *   Callers may pass a date-scoped list here (e.g. "top artists in 2023") to seed
 *   recommendations off a specific period instead of all-time listening.
 * @param {Array} params.knownArtistNames - Full all-time artist names, used only to
 *   exclude candidates you already know — kept separate from the seed pool so a
 *   period-scoped seed list doesn't accidentally let old favorites back in as "new".
 *   Defaults to topArtists' names if not provided.
 * @param {number} params.seedArtistLimit - How many of topArtists to actually use as seeds
 * @param {Array} params.topTracks - Full sorted track list ({ artist, fullArtist, trackName, playCount, ... })
 * @param {Array} params.rawPlayData - Raw play entries, used only to build a complete
 *   "already known" track set (topTracks is capped at 250 upstream, which would
 *   otherwise let already-heard deep-catalog tracks slip through as "new")
 * @param {string} params.token - ListenBrainz personal API token, or '' to skip track-level recs
 * @param {Function} params.onProgress - (phase, done, total) => void
 * @param {Function} params.shouldStop - () => boolean
 */
export async function buildRecommendations({
  topArtists = [],
  knownArtistNames = null,
  seedArtistLimit = SEED_ARTIST_LIMIT,
  topTracks = [],
  rawPlayData = [],
  token = '',
  onProgress,
  shouldStop,
} = {}) {
  const knownArtists = new Set(
    (knownArtistNames || topArtists.map(a => a.name)).map(normalizeArtistName)
  );
  const knownTracks = new Set();
  for (const e of rawPlayData) {
    const artist = e.master_metadata_album_artist_name;
    const track = e.master_metadata_track_name;
    if (artist && track) knownTracks.add(trackKey(artist, track));
  }
  for (const t of topTracks) {
    knownTracks.add(trackKey(t.fullArtist || t.artist, t.trackName));
  }

  // ---- Layer 1a: artist recommendations (always available) ----
  const seedArtists = topArtists.slice(0, seedArtistLimit).filter(a => a.name);
  const artistWeights = buildWeights(seedArtists, 'playCount');

  onProgress?.('matching-artists', 0, seedArtists.length);
  const { mbids: artistMbidMap } = await matchArtistMbids(
    seedArtists.map(a => a.name),
    (done, total) => onProgress?.('matching-artists', done, total),
    { shouldStop }
  );
  if (shouldStop?.()) return { artists: [], tracks: [], stopped: true };

  const seedMbidToArtist = new Map();
  for (const seed of seedArtists) {
    const mbid = artistMbidMap.get(normalizeArtistName(seed.name));
    if (mbid) seedMbidToArtist.set(mbid, seed);
  }

  onProgress?.('fetching-similar-artists', 0, 1);
  const similarByMbid = await fetchSimilarArtists([...seedMbidToArtist.keys()]);
  onProgress?.('fetching-similar-artists', 1, 1);

  // candidate normalized name -> { name, type, score, matchedComment, sources: [{seedName, weight}] }
  const artistCandidates = new Map();
  for (const [seedMbid, similarList] of similarByMbid) {
    const seed = seedMbidToArtist.get(seedMbid);
    if (!seed) continue;
    const weight = artistWeights.get(seed) || 0;
    for (const row of similarList) {
      const norm = normalizeArtistName(row.name);
      if (!norm || knownArtists.has(norm)) continue;
      const contribution = (row.score || 0) * weight;
      let entry = artistCandidates.get(norm);
      if (!entry) {
        entry = { name: row.name, type: row.type, comment: row.comment, score: 0, sources: [] };
        artistCandidates.set(norm, entry);
      }
      entry.score += contribution;
      entry.sources.push({ seedName: seed.name, contribution });
    }
  }

  const rankedArtists = [...artistCandidates.values()]
    .map(entry => ({
      ...entry,
      sources: entry.sources.sort((a, b) => b.contribution - a.contribution).slice(0, 3),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, RESULT_LIMIT);

  if (shouldStop?.()) return { artists: rankedArtists, tracks: [], stopped: true };

  // ---- Layer 1b: track recommendations (needs a ListenBrainz token) ----
  let rankedTracks = [];
  if (token) {
    const seedTracks = topTracks.slice(0, SEED_TRACK_LIMIT).filter(t => t.trackName && (t.fullArtist || t.artist));
    const trackWeights = buildWeights(seedTracks, 'playCount');

    onProgress?.('matching-tracks', 0, seedTracks.length);
    const lookupInput = seedTracks.map(t => ({ artist: t.fullArtist || t.artist, track: t.trackName }));
    const recordingMbidMap = await lookupCanonicalRecordings(lookupInput, token);
    onProgress?.('matching-tracks', seedTracks.length, seedTracks.length);
    if (shouldStop?.()) return { artists: rankedArtists, tracks: [], stopped: true };

    const seedMbidToTrack = new Map();
    for (const t of seedTracks) {
      const key = `${(t.fullArtist || t.artist).toLowerCase().trim()}|||${t.trackName.toLowerCase().trim()}`;
      const mbid = recordingMbidMap.get(key);
      if (mbid) seedMbidToTrack.set(mbid, t);
    }

    onProgress?.('fetching-similar-tracks', 0, 1);
    const similarRecByMbid = await fetchSimilarRecordings([...seedMbidToTrack.keys()]);
    onProgress?.('fetching-similar-tracks', 1, 1);

    const trackCandidates = new Map(); // trackKey -> entry
    for (const [seedMbid, similarList] of similarRecByMbid) {
      const seed = seedMbidToTrack.get(seedMbid);
      if (!seed) continue;
      const weight = trackWeights.get(seed) || 0;
      for (const row of similarList) {
        if (!row.recording_name || !row.artist_credit_name) continue;
        const key = trackKey(row.artist_credit_name, row.recording_name);
        if (knownTracks.has(key)) continue;
        const contribution = (row.score || 0) * weight;
        let entry = trackCandidates.get(key);
        if (!entry) {
          entry = {
            trackName: row.recording_name,
            artist: row.artist_credit_name,
            album: row.release_name,
            releaseMbid: row.release_mbid || null,
            score: 0,
            sources: [],
          };
          trackCandidates.set(key, entry);
        }
        entry.score += contribution;
        entry.sources.push({ seedName: `${seed.trackName} — ${seed.fullArtist || seed.artist}`, contribution });
      }
    }

    rankedTracks = [...trackCandidates.values()]
      .map(entry => ({
        ...entry,
        sources: entry.sources.sort((a, b) => b.contribution - a.contribution).slice(0, 3),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, RESULT_LIMIT);
  }

  return {
    artists: rankedArtists,
    tracks: rankedTracks,
    matchedArtistCount: seedMbidToArtist.size,
    seedArtistCount: seedArtists.length,
    stopped: false,
  };
}
