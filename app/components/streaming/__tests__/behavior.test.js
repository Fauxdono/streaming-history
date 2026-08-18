import { describe, it, expect } from 'vitest';
import { categorizePlatform, extractIPhoneModel, reasonLabel, foldReasons, computeBehaviorStats } from '../behavior.js';

describe('categorizePlatform', () => {
  it('extracts device type from iOS platform strings', () => {
    expect(categorizePlatform('iOS 15.5 (iPhone14,5)')).toBe('iPhone');
    expect(categorizePlatform('iOS 14.6 (iPad8,11)')).toBe('iPad');
    expect(categorizePlatform('iOS 12.4.9 (iPod7,1)')).toBe('iPod');
    expect(categorizePlatform('iOS 16.1')).toBe('iPhone');
  });

  it('categorizes the other major platforms', () => {
    expect(categorizePlatform('Android OS 9 API 28 (motorola, moto g(6))')).toBe('Android');
    expect(categorizePlatform('Windows 10 (10.0.19041; x64)')).toBe('Windows');
    expect(categorizePlatform('OS X 10.12.6 [x86 4]')).toBe('Mac');
    expect(categorizePlatform('web_player windows 10;chrome 83.0.4103.61;desktop')).toBe('Web Player');
  });

  it('categorizes partner devices', () => {
    expect(categorizePlatform('Partner google cast_tv;Chromecast;;')).toBe('Chromecast');
    expect(categorizePlatform('Partner SCEI sony_tv;ps4;;')).toBe('PlayStation');
    expect(categorizePlatform('Partner some_unknown_thing')).toBe('Other');
  });

  it('falls back sensibly', () => {
    expect(categorizePlatform(null)).toBe('Unknown');
    expect(categorizePlatform('')).toBe('Unknown');
    expect(categorizePlatform('deezer web')).toBe('Deezer');
    expect(categorizePlatform('something new')).toBe('Other');
  });
});

describe('extractIPhoneModel', () => {
  it('maps known model identifiers to marketing names', () => {
    expect(extractIPhoneModel('iOS 15.5 (iPhone14,5)')).toBe('iPhone 13');
    expect(extractIPhoneModel('iOS 16.1 (iPhone16,2)')).toBe('iPhone 15 Pro Max');
  });

  it('passes through unknown identifiers and handles non-iPhones', () => {
    expect(extractIPhoneModel('iOS 19.0 (iPhone99,9)')).toBe('iPhone99,9');
    expect(extractIPhoneModel('iOS 14.6 (iPad8,11)')).toBeNull();
    expect(extractIPhoneModel(null)).toBeNull();
  });
});

describe('reasonLabel and foldReasons', () => {
  it('labels known reasons and prettifies unknown ones', () => {
    expect(reasonLabel('trackdone')).toBe('Track finished');
    expect(reasonLabel('fwdbtn')).toBe('Skip button');
    expect(reasonLabel('some-new_reason')).toBe('Some new reason');
    expect(reasonLabel(undefined)).toBe('Unknown');
  });

  it('keeps up to 8 rows unfolded', () => {
    const counts = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`r${i}`, i + 1]));
    expect(foldReasons(counts, 36)).toHaveLength(8);
  });

  it('folds beyond 8 rows into top 7 + Other', () => {
    const counts = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`r${i}`, 10 - i]));
    const rows = foldReasons(counts, 55);
    expect(rows).toHaveLength(8);
    expect(rows[0].count).toBe(10);
    const other = rows[7];
    expect(other.name).toBe('Other');
    expect(other.count).toBe(3 + 2 + 1); // r7, r8, r9
  });
});

describe('computeBehaviorStats', () => {
  const entry = (over = {}) => ({
    ts: '2024-03-10T12:00:00Z',
    ms_played: 60000,
    platform: 'iOS 15.5 (iPhone14,5)',
    shuffle: false,
    reason_start: 'clickrow',
    reason_end: 'trackdone',
    ...over,
  });

  it('ignores plays under one second', () => {
    const stats = computeBehaviorStats([entry(), entry({ ms_played: 500 })]);
    expect(stats.totalTracks).toBe(1);
  });

  it('counts shuffle, skips, and completions with percentages', () => {
    const stats = computeBehaviorStats([
      entry({ shuffle: true, reason_end: 'fwdbtn' }),
      entry({ shuffle: true, reason_end: 'backbtn' }),
      entry({ reason_end: 'trackdone' }),
      entry({ reason_end: 'endplay' }),
    ]);
    expect(stats.totalTracks).toBe(4);
    expect(stats.shufflePlays).toBe(2);
    expect(stats.normalPlays).toBe(2);
    expect(stats.shufflePercentage).toBe(50);
    expect(stats.skippedTracks).toBe(2);
    expect(stats.completedTracks).toBe(1);
    expect(stats.completedPercentage).toBe(25);
  });

  it('sorts platforms by play count', () => {
    const stats = computeBehaviorStats([
      entry({ platform: 'Windows 10' }),
      entry({ platform: 'Windows 10' }),
      entry(),
    ]);
    expect(stats.platformData.map(p => p.name)).toEqual(['Windows', 'iPhone']);
    expect(stats.platformNames).toEqual(['Windows', 'iPhone']);
    expect(stats.platformData[0].percentage).toBe(67);
  });

  it('buckets the timeline per local day and platform, per model for iPhones', () => {
    const stats = computeBehaviorStats([
      entry({ ts: '2024-03-10T10:00:00Z' }),
      entry({ ts: '2024-03-10T11:00:00Z' }), // same day, same iPhone model
      entry({ ts: '2024-03-10T10:30:00Z', platform: 'iOS 16.1 (iPhone16,2)' }), // same day, other model
      entry({ ts: '2024-03-12T10:00:00Z', platform: 'Windows 10' }),
    ]);
    expect(stats.platformTimeline).toHaveLength(3);
    const thirteens = stats.platformTimeline.find(d => d.model === 'iPhone 13');
    expect(thirteens.count).toBe(2);
    expect(stats.iphoneModels).toEqual(['iPhone 13', 'iPhone 15 Pro Max']);
    const windows = stats.platformTimeline.find(d => d.platform === 'Windows');
    expect(windows.platformIndex).toBe(stats.platformNames.indexOf('Windows'));
  });

  it('folds reasons through foldReasons with human labels', () => {
    const stats = computeBehaviorStats([entry(), entry({ reason_end: 'fwdbtn' })]);
    const names = stats.endReasons.map(r => r.name);
    expect(names).toContain('Track finished');
    expect(names).toContain('Skip button');
  });
});
