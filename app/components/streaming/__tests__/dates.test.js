import { describe, it, expect } from 'vitest';
import { filterDataByDate, parseDateSafely, parseTimeString } from '../dates.js';

const entry = (ts) => ({ ts });

const DATA = [
  entry('2023-03-15T10:00:00Z'),
  entry('2023-07-04T12:00:00Z'),
  entry('2024-03-15T09:00:00Z'),
  entry('2024-12-31T23:00:00Z'),
];

describe('filterDataByDate', () => {
  it('passes everything through for "all" or empty filter', () => {
    expect(filterDataByDate(DATA, 'all')).toHaveLength(4);
    expect(filterDataByDate(DATA, null)).toHaveLength(4);
  });

  it('filters by year', () => {
    const r = filterDataByDate(DATA, '2023');
    expect(r).toHaveLength(2);
  });

  it('filters by year-month', () => {
    const r = filterDataByDate(DATA, '2023-07');
    expect(r).toHaveLength(1);
    expect(r[0].ts).toContain('2023-07');
  });

  it('filters by all-MM across years', () => {
    const r = filterDataByDate(DATA, 'all-03');
    expect(r).toHaveLength(2); // March 2023 + March 2024
  });

  it('returns data unchanged for an unparseable filter', () => {
    expect(filterDataByDate(DATA, 'nonsense')).toHaveLength(4);
  });
});

describe('parseDateSafely', () => {
  it('parses a valid ISO string', () => {
    expect(parseDateSafely('2023-01-02T03:04:05Z').getUTCFullYear()).toBe(2023);
  });

  it('falls back to now for garbage', () => {
    const before = Date.now();
    const d = parseDateSafely('not a date');
    expect(d.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });
});

describe('parseTimeString', () => {
  it('parses h/m/s combinations', () => {
    expect(parseTimeString('3m 20s')).toBe(200000);
    expect(parseTimeString('1h')).toBe(3600000);
    expect(parseTimeString('1h 1m 1s')).toBe(3661000);
  });

  it('defaults to 3.5 minutes for garbage or missing input', () => {
    expect(parseTimeString('')).toBe(210000);
    expect(parseTimeString(null)).toBe(210000);
    expect(parseTimeString('banana')).toBe(210000);
  });
});
