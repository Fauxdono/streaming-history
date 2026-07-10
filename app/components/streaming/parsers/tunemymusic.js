import Papa from 'papaparse';

// TuneMyMusic (tunemymusic.com) "transfer to file" CSV: one row per item
// with a Type discriminator, exported from whichever service the user
// connected (Spotify, Apple Music, YouTube, Tidal, ...). Carries no play
// history — only playlists and favorites for the Import tab. The last
// column names the source service, e.g. "Spotify - id".
export function parseTuneMyMusicCSV(content) {
  const parsed = Papa.parse(content.replace(/^\uFEFF/, ''), {
    header: true,
    skipEmptyLines: true
  });

  const idField = (parsed.meta.fields || []).find(f => / - id$/i.test(f));
  const service = idField ? idField.replace(/ - id$/i, '').trim().toLowerCase() : 'tunemymusic';

  const byPlaylist = new Map();
  const favoriteSongs = [];
  const favoriteAlbums = [];
  const favoriteArtists = [];

  parsed.data.forEach(row => {
    const type = String(row['Type'] || '').toLowerCase();
    const trackName = row['Track name'];
    const artist = row['Artist name'] || 'Unknown Artist';
    const albumName = row['Album'] || 'Unknown Album';
    const isrc = row['ISRC'] || null;
    const playlistName = row['Playlist name'];

    if (playlistName && trackName) {
      if (!byPlaylist.has(playlistName)) {
        byPlaylist.set(playlistName, {
          name: playlistName,
          url: null,
          status: null,
          service,
          tracks: []
        });
      }
      byPlaylist.get(playlistName).tracks.push({ trackName, artist, albumName, isrc });
    } else if (type === 'album') {
      if (row['Album']) favoriteAlbums.push({ albumName: row['Album'], artist });
    } else if (type === 'artist') {
      if (row['Artist name']) favoriteArtists.push({ artist: row['Artist name'] });
    } else if (trackName) {
      // Favorite / liked-song rows carry no playlist name
      favoriteSongs.push({ trackName, artist, albumName, isrc });
    }
  });

  const playlists = Array.from(byPlaylist.values());
  const favorites = (favoriteSongs.length || favoriteAlbums.length || favoriteArtists.length)
    ? { service, songs: favoriteSongs, albums: favoriteAlbums, artists: favoriteArtists }
    : null;

  console.log(`TuneMyMusic CSV (${service}): ${playlists.length} playlists, ${favoriteSongs.length} favorite songs, ${favoriteAlbums.length} albums, ${favoriteArtists.length} artists`);
  return { playlists, favorites };
}
