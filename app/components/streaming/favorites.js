// Favorites lookup shared by the rankings pages and the Data tab. Bundles
// come from service exports (see parsers/deezer.js extractDeezerFavorites and
// parsers/tunemymusic.js) as { service, songs, albums, artists }.
//
// Song keys mirror the playlist page's matching: exact lowercase
// title-artist (full credited string and primary artist), plus a normalized
// fallback that strips features/parentheticals for cross-service spelling.

function normalizeTitle(title) {
  if (!title) return '';
  return String(title).toLowerCase()
    .replace(/[àáâäæãåā]/g, 'a')
    .replace(/[èéêëēėę]/g, 'e')
    .replace(/[îïíīįì]/g, 'i')
    .replace(/[ôöòóœøōõ]/g, 'o')
    .replace(/[ûüùúū]/g, 'u')
    .replace(/\b(feat|ft|featuring|with|prod|produced by)\b/g, '')
    .replace(/\([^\)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/['",.!?-]/g, '')
    .trim();
}

function normalizeArtist(name) {
  if (!name) return '';
  return String(name).toLowerCase()
    .replace(/[àáâäæãåā]/g, 'a')
    .replace(/[èéêëēėę]/g, 'e')
    .replace(/[îïíīįì]/g, 'i')
    .replace(/[ôöòóœøōõ]/g, 'o')
    .replace(/[ûüùúū]/g, 'u')
    .replace(/\ba\$ap\b/gi, 'asap')
    .replace(/['",.!?-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildFavoritesIndex(bundles) {
  const songsExact = new Set();
  const songsNormalized = new Set();
  const albums = new Set();
  const artists = new Set();

  (bundles || []).forEach(bundle => {
    (bundle.songs || []).forEach(song => {
      const title = String(song.trackName || '').toLowerCase();
      const fullArtist = String(song.artist || '').toLowerCase();
      // Comma may be a multi-artist join OR part of the name ("Tyler, The
      // Creator"), so index both interpretations
      const primaryArtist = fullArtist.split(',')[0].trim();
      songsExact.add(`${title}-${fullArtist}`);
      songsExact.add(`${title}-${primaryArtist}`);
      const normalizedTitle = normalizeTitle(song.trackName);
      songsNormalized.add(`${normalizedTitle}-${normalizeArtist(fullArtist)}`);
      songsNormalized.add(`${normalizedTitle}-${normalizeArtist(primaryArtist)}`);
    });
    (bundle.albums || []).forEach(album => {
      albums.add(`${String(album.albumName || '').toLowerCase()}-${normalizeArtist(album.artist)}`);
    });
    (bundle.artists || []).forEach(entry => {
      artists.add(normalizeArtist(entry.artist));
    });
  });

  const empty = songsExact.size === 0 && albums.size === 0 && artists.size === 0;
  return empty ? null : { songsExact, songsNormalized, albums, artists };
}

export function isFavoriteSong(index, trackName, artist) {
  if (!index) return false;
  const key = `${String(trackName || '').toLowerCase()}-${String(artist || '').toLowerCase()}`;
  if (index.songsExact.has(key)) return true;
  return index.songsNormalized.has(`${normalizeTitle(trackName)}-${normalizeArtist(artist)}`);
}

export function isFavoriteAlbum(index, albumName, artist) {
  if (!index) return false;
  return index.albums.has(`${String(albumName || '').toLowerCase()}-${normalizeArtist(artist)}`);
}

export function isFavoriteArtist(index, artist) {
  if (!index) return false;
  return index.artists.has(normalizeArtist(artist));
}
