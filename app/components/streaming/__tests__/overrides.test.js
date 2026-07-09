import { describe, it, expect } from 'vitest';
import { applyOverrides, entryMatchKey, playOverrideKey, countOverrides } from '../overrides.js';

const entry = (track, artist, ts, ms = 200000, source = 'lastfm') => ({
  ts,
  ms_played: ms,
  master_metadata_track_name: track,
  master_metadata_album_artist_name: artist,
  master_metadata_album_album_name: 'Some Album',
  source,
});

const empty = { version: 1, tracks: {}, plays: {} };

describe('applyOverrides', () => {
  it('returns the input array untouched when there are no overrides', () => {
    const entries = [entry('Song A', 'Artist X', '2024-01-01T10:00:00Z')];
    expect(applyOverrides(entries, empty)).toBe(entries);
    expect(applyOverrides(entries, null)).toBe(entries);
  });

  it('renames track/artist/album on all matching plays and stamps __origKey', () => {
    const e1 = entry('Song A', 'Artist X', '2024-01-01T10:00:00Z');
    const e2 = entry('Song A', 'Artist X', '2024-02-01T10:00:00Z');
    const other = entry('Song B', 'Artist Y', '2024-01-01T11:00:00Z');
    const key = entryMatchKey(e1);
    const out = applyOverrides([e1, e2, other], {
      ...empty,
      tracks: { [key]: { name: 'Song A (fixed)', artist: 'Artist X', album: 'Right Album' } },
    });
    expect(out).toHaveLength(3);
    expect(out[0].master_metadata_track_name).toBe('Song A (fixed)');
    expect(out[0].master_metadata_album_album_name).toBe('Right Album');
    expect(out[0].__origKey).toBe(key);
    expect(out[1].master_metadata_track_name).toBe('Song A (fixed)');
    // Untouched entry is the same object, not a copy
    expect(out[2]).toBe(other);
  });

  it('does not mutate the original entries', () => {
    const e1 = entry('Song A', 'Artist X', '2024-01-01T10:00:00Z');
    const key = entryMatchKey(e1);
    applyOverrides([e1], { ...empty, tracks: { [key]: { name: 'Renamed' } } });
    expect(e1.master_metadata_track_name).toBe('Song A');
  });

  it('adjusts the duration of a single play', () => {
    const e1 = entry('Song A', 'Artist X', '2024-01-01T10:00:00Z');
    const e2 = entry('Song A', 'Artist X', '2024-02-01T10:00:00Z');
    const key = entryMatchKey(e1);
    const out = applyOverrides([e1, e2], {
      ...empty,
      plays: { [playOverrideKey(key, e1.ts)]: { ms_played: 123000 } },
    });
    expect(out[0].ms_played).toBe(123000);
    expect(out[1].ms_played).toBe(200000);
  });

  it('applies a track-level length correction to every play, per-play edits win', () => {
    const e1 = entry('Song A', 'Artist X', '2024-01-01T10:00:00Z');
    const e2 = entry('Song A', 'Artist X', '2024-02-01T10:00:00Z');
    const key = entryMatchKey(e1);
    const out = applyOverrides([e1, e2], {
      ...empty,
      tracks: { [key]: { lengthMs: 180000 } },
      plays: { [playOverrideKey(key, e2.ts)]: { ms_played: 90000 } },
    });
    expect(out[0].ms_played).toBe(180000);
    expect(out[1].ms_played).toBe(90000);
  });

  it('removes deleted plays', () => {
    const e1 = entry('Song A', 'Artist X', '2024-01-01T10:00:00Z');
    const e2 = entry('Song A', 'Artist X', '2024-02-01T10:00:00Z');
    const key = entryMatchKey(e1);
    const out = applyOverrides([e1, e2], {
      ...empty,
      plays: { [playOverrideKey(key, e2.ts)]: { removed: true } },
    });
    expect(out).toHaveLength(1);
    expect(out[0].ts).toBe(e1.ts);
  });

  it('is stable when re-applied to the pristine base after a rename (edit chaining)', () => {
    const e1 = entry('Song A', 'Artist X', '2024-01-01T10:00:00Z');
    const key = entryMatchKey(e1);
    // First edit: rename. Second edit saved under the SAME orig key.
    const out1 = applyOverrides([e1], { ...empty, tracks: { [key]: { name: 'B' } } });
    expect(out1[0].__origKey).toBe(key);
    const out2 = applyOverrides([e1], { ...empty, tracks: { [key]: { name: 'C' } } });
    expect(out2[0].master_metadata_track_name).toBe('C');
  });

  it('passes through entries without a track name', () => {
    const podcast = { ts: '2024-01-01T10:00:00Z', ms_played: 100000, source: 'spotify' };
    const out = applyOverrides([podcast], { ...empty, tracks: { x: { name: 'Y' } } });
    expect(out[0]).toBe(podcast);
  });
});

describe('countOverrides', () => {
  it('counts track and play overrides', () => {
    expect(countOverrides(empty)).toBe(0);
    expect(countOverrides({ ...empty, tracks: { a: {} }, plays: { 'a|t': {} } })).toBe(2);
    expect(countOverrides(null)).toBe(0);
  });
});
