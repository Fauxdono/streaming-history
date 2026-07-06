import { describe, it, expect } from 'vitest';
import { clampSyncBursts } from '../artifacts.js';

// Shape modeled on a real Spotify offline-sync burst: many songs reported
// within seconds, each claiming hours of playback.
const HOURS = 3600000;
const T = Date.parse('2015-01-01T05:07:50Z');

const entry = (offsetSec, ms, source = 'spotify') => ({
  ts: new Date(T + offsetSec * 1000).toISOString(),
  ms_played: ms,
  master_metadata_track_name: 'Song',
  source,
});

describe('clampSyncBursts', () => {
  it('clamps clustered impossible long plays', () => {
    const entries = [0, 2, 4, 6, 8].map(s => entry(s, 2.7 * HOURS));
    const { clamped, reclaimedMs } = clampSyncBursts(entries);
    expect(clamped).toBe(5);
    expect(entries.every(e => e.ms_played === 210000)).toBe(true);
    expect(entries.every(e => e.sync_burst_clamped)).toBe(true);
    expect(reclaimedMs).toBeCloseTo(5 * (2.7 * HOURS - 210000), -3);
  });

  it('never touches a lone long play (podcasts, DJ mixes)', () => {
    const entries = [
      entry(0, 2 * HOURS),          // lone 2h podcast
      entry(7200, 190000),          // normal song 2h later
    ];
    const { clamped } = clampSyncBursts(entries);
    expect(clamped).toBe(0);
    expect(entries[0].ms_played).toBe(2 * HOURS);
  });

  it('leaves a pair of overlapping long plays alone (needs 3+ to be impossible)', () => {
    const entries = [entry(0, HOURS), entry(30, HOURS)];
    expect(clampSyncBursts(entries).clamped).toBe(0);
  });

  it('does not cluster across sources', () => {
    const entries = [
      entry(0, HOURS, 'spotify'),
      entry(5, HOURS, 'lastfm'),
      entry(10, HOURS, 'tidal'),
    ];
    expect(clampSyncBursts(entries).clamped).toBe(0);
  });

  it('ignores normal-length plays entirely', () => {
    const entries = [0, 1, 2, 3, 4].map(s => entry(s, 200000));
    expect(clampSyncBursts(entries).clamped).toBe(0);
    expect(entries[0].ms_played).toBe(200000);
  });
});
