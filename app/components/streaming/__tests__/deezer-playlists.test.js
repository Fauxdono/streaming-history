import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { extractDeezerPlaylists } from '../parsers/deezer.js';

// Build an in-memory Deezer export xlsx and wrap it like a browser File
function makeDeezerFile(playlistRows, { includePlaylistSheet = true } = {}) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([{ 'Song Title': 'x', Artist: 'y', 'Album Title': 'z', Date: '2024-01-01', 'Listening Time': 100 }]),
    '10_listeningHistory'
  );
  if (includePlaylistSheet) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(playlistRows), '11_playlistCreated');
  }
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return { arrayBuffer: async () => buffer };
}

const rows = [
  { 'Playlist Title': 'wicks', 'Playlist Link': 'www.deezer.com/playlist/1', Status: 'Public', 'Song Title': 'gnx', Artists: 'Kendrick Lamar', 'Album Title': 'GNX', ISRC: 'USUG12408505', 'Track Link': 'www.deezer.com/track/1' },
  { 'Playlist Title': 'wicks', 'Playlist Link': 'www.deezer.com/playlist/1', Status: 'Public', 'Song Title': 'H.Y.B.', Artists: 'J. Cole, Bas, Central Cee', 'Album Title': 'Might Delete Later', ISRC: 'USUG12402406', 'Track Link': 'www.deezer.com/track/2' },
  { 'Playlist Title': 'Faced', 'Playlist Link': 'www.deezer.com/playlist/2', Status: 'Private', 'Song Title': 'Accordion', Artists: 'MF DOOM', 'Album Title': 'Madvillainy', ISRC: null, 'Track Link': 'www.deezer.com/track/3' },
  // Rows missing a playlist or song title are dropped
  { 'Playlist Title': '', 'Song Title': 'orphan' },
  { 'Playlist Title': 'Faced', 'Song Title': '' },
];

describe('extractDeezerPlaylists', () => {
  it('groups rows into playlists with track metadata', async () => {
    const playlists = await extractDeezerPlaylists(makeDeezerFile(rows));
    expect(playlists).toHaveLength(2);

    const wicks = playlists.find(p => p.name === 'wicks');
    expect(wicks.service).toBe('deezer');
    expect(wicks.url).toBe('www.deezer.com/playlist/1');
    expect(wicks.status).toBe('Public');
    expect(wicks.tracks).toHaveLength(2);
    expect(wicks.tracks[1]).toEqual({
      trackName: 'H.Y.B.',
      artist: 'J. Cole, Bas, Central Cee',
      albumName: 'Might Delete Later',
      isrc: 'USUG12402406'
    });
  });

  it('defaults missing artist/album and keeps null isrc', async () => {
    const playlists = await extractDeezerPlaylists(makeDeezerFile([
      { 'Playlist Title': 'sparse', 'Song Title': 'Mystery Track' }
    ]));
    expect(playlists[0].tracks[0]).toEqual({
      trackName: 'Mystery Track',
      artist: 'Unknown Artist',
      albumName: 'Unknown Album',
      isrc: null
    });
  });

  it('returns empty array when the playlist sheet is absent', async () => {
    const playlists = await extractDeezerPlaylists(makeDeezerFile([], { includePlaylistSheet: false }));
    expect(playlists).toEqual([]);
  });
});
