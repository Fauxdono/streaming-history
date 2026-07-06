import { describe, it, expect } from 'vitest';
import { deduplicateCrossSources } from '../dedup.js';

// Spotify ts is END of play; Last.fm ts is START of play.
const spotify = (track, artist, startMs, durMs = 200000) => ({
  ts: new Date(startMs + durMs).toISOString(),
  ms_played: durMs,
  master_metadata_track_name: track,
  master_metadata_album_artist_name: artist,
  source: 'spotify',
});

const lastfm = (track, artist, startMs) => ({
  ts: new Date(startMs).toISOString(),
  ms_played: 210000,
  master_metadata_track_name: track,
  master_metadata_album_artist_name: artist,
  source: 'lastfm',
});

const T = Date.parse('2024-01-15T20:00:00Z');

describe('deduplicateCrossSources', () => {
  it('removes the lower-priority copy of a cross-source duplicate', () => {
    const out = deduplicateCrossSources([
      spotify('Nights', 'Frank Ocean', T),
      lastfm('Nights', 'Frank Ocean', T),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('spotify');
  });

  it('keeps plays of different tracks at the same time', () => {
    const out = deduplicateCrossSources([
      spotify('Nights', 'Frank Ocean', T),
      lastfm('Pink + White', 'Frank Ocean', T),
    ]);
    expect(out).toHaveLength(2);
  });

  it('never dedupes within the same source', () => {
    const out = deduplicateCrossSources([
      spotify('Nights', 'Frank Ocean', T),
      spotify('Nights', 'Frank Ocean', T + 1000),
    ]);
    expect(out).toHaveLength(2);
  });

  it('keeps plays outside the time window', () => {
    const out = deduplicateCrossSources([
      spotify('Nights', 'Frank Ocean', T),
      lastfm('Nights', 'Frank Ocean', T + 60 * 60 * 1000), // an hour later
    ]);
    expect(out).toHaveLength(2);
  });

  it('matches remaster suffixes and "The" prefix variants', () => {
    const out = deduplicateCrossSources([
      spotify('Come Together - Remastered 2009', 'The Beatles', T),
      lastfm('Come Together', 'Beatles', T),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe('spotify');
  });
});
