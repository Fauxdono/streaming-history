import { describe, it, expect } from 'vitest';
import { normalizeString, normalizeArtistName, createMatchKey } from '../normalize.js';

describe('normalizeString', () => {
  it('returns empty result for falsy input', () => {
    expect(normalizeString('')).toEqual({ normalized: '', featureArtists: [] });
    expect(normalizeString(null)).toEqual({ normalized: '', featureArtists: [] });
  });

  it('lowercases and strips punctuation', () => {
    expect(normalizeString('HUMBLE.').normalized).toBe('humble');
  });

  it('extracts (feat. X) into featureArtists and removes it from the name', () => {
    const r = normalizeString('Best Song (feat. Drake)');
    expect(r.normalized).toBe('best song');
    expect(r.featureArtists).toEqual(['drake']);
  });

  it('extracts multiple features split on comma/ampersand', () => {
    const r = normalizeString('Anthem (with SZA & Drake)');
    expect(r.normalized).toBe('anthem');
    expect(r.featureArtists).toEqual(['sza', 'drake']);
  });

  it('returns null featureArtists when there are none', () => {
    expect(normalizeString('Plain Song').featureArtists).toBeNull();
  });

  it('strips hyphenated remix suffixes', () => {
    expect(normalizeString('Cola - CamelPhat Remix').normalized).toBe('cola');
  });

  it('strips parenthesized version/edit/remix qualifiers', () => {
    expect(normalizeString('Song (Radio Edit)').normalized).toBe('song');
    expect(normalizeString('Song (Extended Version)').normalized).toBe('song');
  });
});

describe('normalizeArtistName', () => {
  it('returns empty string for falsy input', () => {
    expect(normalizeArtistName('')).toBe('');
    expect(normalizeArtistName(null)).toBe('');
  });

  it('converts &, +, / to "and"', () => {
    expect(normalizeArtistName('Simon & Garfunkel')).toBe('simon and garfunkel');
    expect(normalizeArtistName('AC/DC')).toBe('ac and dc');
  });

  it('strips punctuation and normalizes whitespace', () => {
    expect(normalizeArtistName('Tyler,  The Creator')).toBe('tyler the creator');
  });
});

describe('createMatchKey', () => {
  it('returns empty string when either part is missing', () => {
    expect(createMatchKey('', 'Artist')).toBe('');
    expect(createMatchKey('Track', '')).toBe('');
  });

  it('is stable for identical input', () => {
    expect(createMatchKey('Song', 'Artist')).toBe(createMatchKey('Song', 'Artist'));
  });

  it('matches across case differences', () => {
    expect(createMatchKey('SONG', 'ARTIST')).toBe(createMatchKey('song', 'artist'));
  });

  it('treats featured versions as distinct tracks (feat is part of the key)', () => {
    expect(createMatchKey('Best Song (feat. Drake)', 'Artist')).toBe('best song-artist-feat-drake');
    expect(createMatchKey('Best Song', 'Artist')).toBe('best song-artist');
  });

  it('produces the same key whether the feature lives in the track or artist field', () => {
    expect(createMatchKey('Best Song (feat. Drake)', 'Artist'))
      .toBe(createMatchKey('Best Song', 'Artist feat. Drake'));
  });
});
