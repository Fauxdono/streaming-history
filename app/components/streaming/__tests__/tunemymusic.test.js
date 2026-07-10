import { describe, it, expect } from 'vitest';
import { parseTuneMyMusicCSV } from '../parsers/tunemymusic.js';
import { detectFileType } from '../detect.js';

const HEADER = 'Track name,Artist name,Album,Playlist name,Type,ISRC,Spotify - id';
const csv = [
  '﻿' + HEADER,
  '"luther (with sza)","Kendrick Lamar","GNX","Your Top Songs 2025","Playlist","USUG12408496","45J4avUb9Ni0bnETYaYFVJ"',
  '"Colors of the Wind","Judy Kuhn","Pocahontas","Your Top Songs 2025","Playlist","USWD10423005","1OYOLWqKmhkFIx2KC9ek1a"',
  '"Accordion","Madvillain","Madvillainy","Crate Diggers","Playlist","USEW10312345","3F5CgOj3wFlRv51JsHbxhe"',
  // Favorite rows carry no playlist name
  '"Runnin On E","2Pac","Until The End Of Time","","Favorite","USIR10110236","5tEuqhLiQxpUFOsUtQVIWL"',
  '"","Madvillain","Madvillainy","","Album","","abc"',
  '"","MF DOOM","","","Artist","","def"'
].join('\n');

describe('parseTuneMyMusicCSV', () => {
  it('detects the source service from the id column header', () => {
    const { playlists, favorites } = parseTuneMyMusicCSV(csv);
    expect(playlists.every(p => p.service === 'spotify')).toBe(true);
    expect(favorites.service).toBe('spotify');
  });

  it('groups playlist rows and strips the BOM from the first header', () => {
    const { playlists } = parseTuneMyMusicCSV(csv);
    expect(playlists).toHaveLength(2);
    const top = playlists.find(p => p.name === 'Your Top Songs 2025');
    expect(top.tracks).toHaveLength(2);
    expect(top.tracks[0]).toEqual({
      trackName: 'luther (with sza)',
      artist: 'Kendrick Lamar',
      albumName: 'GNX',
      isrc: 'USUG12408496'
    });
  });

  it('routes favorite/album/artist rows into a favorites bundle', () => {
    const { favorites } = parseTuneMyMusicCSV(csv);
    expect(favorites.songs).toEqual([
      { trackName: 'Runnin On E', artist: '2Pac', albumName: 'Until The End Of Time', isrc: 'USIR10110236' }
    ]);
    expect(favorites.albums).toEqual([{ albumName: 'Madvillainy', artist: 'Madvillain' }]);
    expect(favorites.artists).toEqual([{ artist: 'MF DOOM' }]);
  });

  it('returns null favorites when the export only has playlists', () => {
    const playlistOnly = ['﻿' + HEADER, '"A","B","C","List","Playlist","X","y"'].join('\n');
    expect(parseTuneMyMusicCSV(playlistOnly).favorites).toBeNull();
  });
});

describe('detectFileType for TuneMyMusic', () => {
  it('detects TuneMyMusic CSVs before the Apple Music fallback', () => {
    expect(detectFileType('My Spotify Library.csv', csv)).toBe('tunemymusic');
  });

  it('still detects Apple Music track-name CSVs', () => {
    const apple = 'Track Name,Last Played Date,Is User Initiated\nSong,2024-01-01,true';
    expect(detectFileType('Apple Music - Track Play History.csv', apple)).toBe('apple_music');
  });
});
