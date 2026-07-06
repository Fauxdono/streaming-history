import { describe, it, expect } from 'vitest';
import { processRockboxScrobblerLog } from '../parsers/rockbox.js';
import { processLastfmJSON, processLastfmCSV } from '../parsers/lastfm.js';
import { processTidalCSV } from '../parsers/tidal.js';
import { detectFileType } from '../detect.js';

describe('processRockboxScrobblerLog', () => {
  const T = 1700000000; // Unix seconds

  const log = [
    '#AUDIOSCROBBLER/1.1',
    '#TZ/UNKNOWN',
    `Kendrick Lamar\tGNX\tsquabble up\t3\t158\tL\t${T}\t`,
    `MF DOOM; Madlib\tMadvillainy\tAccordion\t2\t119\t\t${T + 200}\t`,
    `Skipped Artist\tAlbum\tSkipped Track\t1\t300\tS\t${T + 400}\t`,
    `Some Artist\tAlbum\t\t1\t200\t\t${T + 600}\t`, // missing track → skipped
    'garbage line without tabs',
  ].join('\n');

  it('parses valid entries and skips headers/garbage', () => {
    const out = processRockboxScrobblerLog(log);
    expect(out).toHaveLength(3);
  });

  it('converts epoch seconds to ISO timestamps and seconds to ms', () => {
    const [first] = processRockboxScrobblerLog(log);
    expect(first.ts).toBe(new Date(T * 1000).toISOString());
    expect(first.ms_played).toBe(158000);
    expect(first.source).toBe('ipod');
  });

  it('keeps only the primary artist when artists are joined with ";"', () => {
    const doom = processRockboxScrobblerLog(log)[1];
    expect(doom.master_metadata_album_artist_name).toBe('MF DOOM');
  });

  it('marks S-rated entries as skipped with capped play time', () => {
    const skipped = processRockboxScrobblerLog(log)[2];
    expect(skipped.skipped).toBe(true);
    expect(skipped.reason_end).toBe('fwdbtn');
    expect(skipped.ms_played).toBeLessThanOrEqual(15000);
  });
});

describe('processLastfmJSON', () => {
  it('maps scrobbles to the internal entry shape', () => {
    const out = processLastfmJSON(JSON.stringify([
      { name: 'Track A', artist: 'Artist A', album: 'Album A', date: '2023-05-01T10:00:00Z', duration_ms: 180000 },
    ]));
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      ts: '2023-05-01T10:00:00Z',
      ms_played: 180000,
      master_metadata_track_name: 'Track A',
      master_metadata_album_artist_name: 'Artist A',
      source: 'lastfm',
    });
  });

  it('filters entries missing name or artist and defaults album/duration', () => {
    const out = processLastfmJSON([
      { name: 'Kept', artist: 'Someone' },
      { name: 'No Artist' },
      { artist: 'No Name' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].master_metadata_album_album_name).toBe('Unknown Album');
    expect(out[0].ms_played).toBe(210000);
  });

  it('returns [] for non-array payloads', () => {
    expect(processLastfmJSON('{"not":"an array"}')).toEqual([]);
  });
});

describe('lastfm.ghan.nl export support', () => {
  // Shape taken from a real lastfm.ghan.nl JSON export: array of API pages
  const apiTrack = (name, artist, album, uts) => ({
    artist: { mbid: '', '#text': artist },
    album: { mbid: '', '#text': album },
    name,
    streamable: '0',
    image: [],
    mbid: '',
    url: 'https://www.last.fm/music/x',
    ...(uts ? { date: { uts: String(uts), '#text': 'whatever' } } : {}),
  });

  const pageExport = [
    {
      '@attr': { page: '1', perPage: '200', total: '3', totalPages: '2', user: 'Someone' },
      track: [
        apiTrack('Song A', 'Artist A', 'Album A', 1700000000),
        apiTrack('Now Playing', 'Artist B', 'Album B', null), // no date → skipped
      ],
    },
    {
      '@attr': { page: '2' },
      track: [apiTrack('Song C', 'Artist C', '', 1700000600)],
    },
  ];

  it('detects the paged JSON export as lastfm', () => {
    expect(detectFileType('recenttracks-user-123.json', JSON.stringify(pageExport))).toBe('lastfm');
  });

  it('parses paged JSON export, skipping dateless now-playing entries', () => {
    const out = processLastfmJSON(JSON.stringify(pageExport));
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      ts: new Date(1700000000 * 1000).toISOString(),
      master_metadata_track_name: 'Song A',
      master_metadata_album_artist_name: 'Artist A',
      master_metadata_album_album_name: 'Album A',
      source: 'lastfm',
    });
    expect(out[1].master_metadata_album_album_name).toBe('Unknown Album');
  });

  it('parses a flat array of API-shaped tracks', () => {
    const out = processLastfmJSON([apiTrack('Solo', 'Artist', 'Album', 1700000000)]);
    expect(out).toHaveLength(1);
    expect(out[0].master_metadata_track_name).toBe('Solo');
  });

  it('parses a raw API response wrapper', () => {
    const out = processLastfmJSON({ recenttracks: { track: [apiTrack('Wrapped', 'A', 'B', 1700000000)] } });
    expect(out).toHaveLength(1);
  });

  const csv = [
    'uts,utc_time,artist,artist_mbid,album,album_mbid,track,track_mbid',
    '"1700000000","14 Nov 2023, 22:13","mgk","","mainstream sellout","","fake love don\'t last",""',
    '"1700000600","14 Nov 2023, 22:23","The Wombats","abc","A Guide to Love","","Kill The Director","xyz"',
  ].join('\n');

  it('detects the CSV export as lastfm', () => {
    expect(detectFileType('recenttracks-user-123.csv', csv)).toBe('lastfm');
  });

  it('parses the CSV export', async () => {
    const out = await processLastfmCSV(csv);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      ts: new Date(1700000000 * 1000).toISOString(),
      master_metadata_track_name: "fake love don't last",
      master_metadata_album_artist_name: 'mgk',
      source: 'lastfm',
    });
  });
});

describe('processTidalCSV', () => {
  const csv = [
    'entry_date,track_title,artist_name,album_name,stream_duration_ms,product_type,client_name_from_session,country_name,region_name,city_name',
    '2023-06-01T12:00:00Z,Song One,Artist One,Album One,200000,HIFI,TIDAL Android,Netherlands,Noord-Holland,Amsterdam',
    '2023-06-01T13:00:00Z,,Artist Two,Album Two,100000,HIFI,TIDAL Android,Netherlands,,', // no track title → dropped
  ].join('\n');

  it('parses rows and maps Tidal columns to the internal shape', async () => {
    const out = await processTidalCSV(csv);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      master_metadata_track_name: 'Song One',
      master_metadata_album_artist_name: 'Artist One',
      ms_played: 200000,
      source: 'tidal',
      country: 'Netherlands',
      city: 'Amsterdam',
    });
  });
});
