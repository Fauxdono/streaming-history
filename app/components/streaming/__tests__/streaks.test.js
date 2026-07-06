import { describe, it, expect } from 'vitest';
import { calculateConsecutivePlayStreaks, calculateOverallDailyStreak } from '../streaks.js';

const play = (iso, track, artist, album = 'Album') => ({
  ts: iso,
  master_metadata_track_name: track,
  master_metadata_album_artist_name: artist,
  master_metadata_album_album_name: album,
});

describe('calculateConsecutivePlayStreaks', () => {
  it('returns the best run and per-entity top3 lists', () => {
    const data = [
      // Song A ×4 (also artist X ×4)
      play('2024-01-01T10:00:00Z', 'A', 'X'),
      play('2024-01-01T10:03:00Z', 'A', 'X'),
      play('2024-01-01T10:06:00Z', 'A', 'X'),
      play('2024-01-01T10:09:00Z', 'A', 'X'),
      // Song B ×3 (artist Y)
      play('2024-01-01T11:00:00Z', 'B', 'Y'),
      play('2024-01-01T11:03:00Z', 'B', 'Y'),
      play('2024-01-01T11:06:00Z', 'B', 'Y'),
      // Song C ×2 (artist Z)
      play('2024-01-01T12:00:00Z', 'C', 'Z'),
      play('2024-01-01T12:03:00Z', 'C', 'Z'),
      // Song A again ×2 — must not appear twice in top3
      play('2024-01-01T13:00:00Z', 'A', 'X'),
      play('2024-01-01T13:03:00Z', 'A', 'X'),
    ];
    const r = calculateConsecutivePlayStreaks(data);
    expect(r.song.trackName).toBe('A');
    expect(r.song.count).toBe(4);
    expect(r.top3.songs.map(s => s.trackName)).toEqual(['A', 'B', 'C']);
    expect(r.top3.songs.map(s => s.count)).toEqual([4, 3, 2]);
    // deduped: A appears once despite two separate runs
    expect(r.top3.songs.filter(s => s.trackName === 'A')).toHaveLength(1);
    expect(r.top3.artists[0].name).toBe('X');
  });

  it('returns empty top3 shape for no data', () => {
    expect(calculateConsecutivePlayStreaks([]).top3).toEqual({ songs: [], artists: [], albums: [] });
  });
});

describe('calculateOverallDailyStreak', () => {
  it('returns the longest run plus ranked top3', () => {
    const days = [
      // 4-day run
      '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04',
      // 2-day run
      '2024-02-01', '2024-02-02',
      // 3-day run
      '2024-03-01', '2024-03-02', '2024-03-03',
    ];
    const data = days.map(d => play(`${d}T12:00:00Z`, 'T', 'A'));
    const r = calculateOverallDailyStreak(data);
    expect(r.count).toBe(4);
    expect(r.startDate).toBe('2024-01-01');
    expect(r.top3.map(s => s.count)).toEqual([4, 3, 2]);
  });

  it('returns null when no multi-day streak exists', () => {
    const data = [play('2024-01-01T12:00:00Z', 'T', 'A'), play('2024-01-05T12:00:00Z', 'T', 'A')];
    expect(calculateOverallDailyStreak(data)).toBeNull();
  });
});
