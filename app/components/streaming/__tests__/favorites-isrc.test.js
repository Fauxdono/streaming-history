import { describe, it, expect } from 'vitest';
import { buildFavoritesIndex, isFavoriteSong, isFavoriteAlbum, isFavoriteArtist } from '../favorites.js';
import { isrcMergeGroups } from '../isrc.js';
import { createMatchKey } from '../normalize.js';

const bundles = [{
  service: 'deezer',
  songs: [
    { trackName: 'H.Y.B.', artist: 'J. Cole, Bas, Central Cee', albumName: 'Might Delete Later', isrc: 'USUG12402406' },
    { trackName: 'Sticky (feat. GloRilla)', artist: 'Tyler, The Creator', albumName: 'CHROMAKOPIA', isrc: null }
  ],
  albums: [{ albumName: 'Madvillainy', artist: 'Madvillain' }],
  artists: [{ artist: 'MF DOOM' }]
}];

describe('favorites index', () => {
  const index = buildFavoritesIndex(bundles);

  it('matches songs by full credited artist and by primary artist', () => {
    expect(isFavoriteSong(index, 'H.Y.B.', 'J. Cole, Bas, Central Cee')).toBe(true);
    expect(isFavoriteSong(index, 'H.Y.B.', 'J. Cole')).toBe(true);
    expect(isFavoriteSong(index, 'H.Y.B.', 'Drake')).toBe(false);
  });

  it('matches songs across feature-suffix spelling differences', () => {
    // Library spells it without the feature; normalized fallback catches it
    expect(isFavoriteSong(index, 'Sticky', 'Tyler, The Creator')).toBe(true);
  });

  it('matches albums and artists', () => {
    expect(isFavoriteAlbum(index, 'Madvillainy', 'Madvillain')).toBe(true);
    expect(isFavoriteAlbum(index, 'Madvillainy', 'MF DOOM')).toBe(false);
    expect(isFavoriteArtist(index, 'MF DOOM')).toBe(true);
    expect(isFavoriteArtist(index, 'mf doom')).toBe(true);
    expect(isFavoriteArtist(index, 'DOOM')).toBe(false);
  });

  it('returns null for empty bundles so callers can skip work', () => {
    expect(buildFavoritesIndex([])).toBeNull();
    expect(buildFavoritesIndex([{ service: 'x', songs: [], albums: [], artists: [] }])).toBeNull();
  });
});

describe('isrcMergeGroups', () => {
  // Two library spellings of the same recording: a Deezer play carries the
  // ISRC directly, a TuneMyMusic catalog row links the Spotify spelling.
  const deezerKey = createMatchKey('Niggas In Paris', 'JAY Z');
  const spotifyKey = createMatchKey("Ni**as In Paris", 'JAY-Z');
  const plays = [
    {
      master_metadata_track_name: 'Niggas In Paris',
      master_metadata_album_artist_name: 'JAY Z',
      master_metadata_external_ids: { isrc: 'USUM71111595' }
    }
  ];
  const importedPlaylists = [{
    name: 'WTT', service: 'spotify',
    tracks: [{ trackName: "Ni**as In Paris", artist: 'JAY-Z', albumName: 'Watch The Throne', isrc: 'USUM71111595' }]
  }];

  it('groups library keys that share an ISRC across play data and catalogs', () => {
    const groups = isrcMergeGroups({
      plays,
      importedPlaylists,
      importedFavorites: [],
      knownKeys: new Set([deezerKey, spotifyKey])
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].isrc).toBe('USUM71111595');
    expect(new Set(groups[0].keys)).toEqual(new Set([deezerKey, spotifyKey]));
  });

  it('ignores catalog tracks whose spelling matches no library row', () => {
    const groups = isrcMergeGroups({
      plays,
      importedPlaylists,
      importedFavorites: [],
      knownKeys: new Set([deezerKey]) // spotify spelling not in library
    });
    expect(groups).toHaveLength(0);
  });

  it('returns nothing when all references agree on one spelling', () => {
    const groups = isrcMergeGroups({
      plays: [...plays, ...plays],
      importedPlaylists: [],
      importedFavorites: [],
      knownKeys: new Set([deezerKey])
    });
    expect(groups).toHaveLength(0);
  });
});
