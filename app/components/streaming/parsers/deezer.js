import * as XLSX from 'xlsx';
import { parseDateSafely } from '../dates.js';

export async function processDeezerXLSX(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { 
      type: 'array',
      cellDates: true,
      cellNF: true
    });
    
    // Find the listening history sheet
    const historySheetName = "10_listeningHistory";
    if (!workbook.SheetNames.includes(historySheetName)) {
      console.error('Listening history sheet not found in Deezer file');
      return [];
    }
    
    const historySheet = workbook.Sheets[historySheetName];
    const data = XLSX.utils.sheet_to_json(historySheet);
    
    console.log(`Processing ${data.length} Deezer history entries`);
    
    // Transform Deezer data to common format
    const transformedData = data.map(row => {
      const trackName = row['Song Title'] || '';
      const artistName = row['Artist'] || 'Unknown Artist';
      const albumName = row['Album Title'] || 'Unknown Album';
      const isrc = row['ISRC'] || null;
      
      // Parse listening time (seconds to milliseconds)
      const playDuration = row['Listening Time'] && !isNaN(row['Listening Time']) ? 
                         parseInt(row['Listening Time']) * 1000 : 210000;
      
      // Parse date
      const timestamp = row['Date'] instanceof Date ? row['Date'] : 
                      typeof row['Date'] === 'string' ? parseDateSafely(row['Date']) : new Date();
      
      // Platform info
      const platform = row['Platform Name'] || 'deezer';
      const platformModel = row['Platform Model'] || '';
      
      return {
        master_metadata_track_name: trackName,
        ts: timestamp,
        ms_played: playDuration,
        master_metadata_album_artist_name: artistName,
        master_metadata_album_album_name: albumName,
        isrc: isrc,
        platform: `DEEZER-${platform.toUpperCase()}${platformModel ? '-' + platformModel.toUpperCase() : ''}`,
        reason_end: 'trackdone',
        source: 'deezer'
      };
    });
    
    console.log(`Transformed ${transformedData.length} Deezer entries`);
    return transformedData;
  } catch (error) {
    console.error('Error processing Deezer XLSX file:', error);
    return [];
  }
}

// The Deezer GDPR export also carries every playlist the user created, one
// row per track, in a separate sheet. Extracted independently of the
// listening history so playlist import works even for tracks never played.
export async function extractDeezerPlaylists(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

    const playlistSheetName = '11_playlistCreated';
    if (!workbook.SheetNames.includes(playlistSheetName)) {
      return [];
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[playlistSheetName]);
    const byPlaylist = new Map();

    rows.forEach(row => {
      const playlistName = row['Playlist Title'];
      const trackName = row['Song Title'];
      if (!playlistName || !trackName) return;

      if (!byPlaylist.has(playlistName)) {
        byPlaylist.set(playlistName, {
          name: playlistName,
          url: row['Playlist Link'] || null,
          status: row['Status'] || null,
          service: 'deezer',
          tracks: []
        });
      }

      byPlaylist.get(playlistName).tracks.push({
        trackName,
        artist: row['Artists'] || 'Unknown Artist',
        albumName: row['Album Title'] || 'Unknown Album',
        isrc: row['ISRC'] || null
      });
    });

    const playlists = Array.from(byPlaylist.values());
    if (playlists.length > 0) {
      console.log(`Extracted ${playlists.length} Deezer playlists (${rows.length} track entries)`);
    }
    return playlists;
  } catch (error) {
    console.error('Error extracting Deezer playlists:', error);
    return [];
  }
}

// Favorited songs/albums/artists live in three more sheets of the same
// export. Returned as one service bundle (or null if the file has none) so
// other services' likes/loved tracks can share the shape later.
export async function extractDeezerFavorites(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

    const sheetRows = (name) =>
      workbook.SheetNames.includes(name) ? XLSX.utils.sheet_to_json(workbook.Sheets[name]) : [];

    const songs = sheetRows('8_favoriteSong')
      .filter(row => row['Song Title'])
      .map(row => ({
        trackName: row['Song Title'],
        artist: row['Artists'] || 'Unknown Artist',
        albumName: row['Album Title'] || 'Unknown Album',
        isrc: row['ISRC'] || null
      }));

    const albums = sheetRows('5_favoriteAlbum')
      .filter(row => row['Album Title'])
      .map(row => ({
        albumName: row['Album Title'],
        artist: row['Artist'] || 'Unknown Artist'
      }));

    const artists = sheetRows('4_favoriteArtist')
      .filter(row => row['Artist'])
      .map(row => ({ artist: row['Artist'] }));

    if (songs.length === 0 && albums.length === 0 && artists.length === 0) {
      return null;
    }

    console.log(`Extracted Deezer favorites: ${songs.length} songs, ${albums.length} albums, ${artists.length} artists`);
    return { service: 'deezer', songs, albums, artists };
  } catch (error) {
    console.error('Error extracting Deezer favorites:', error);
    return null;
  }
}

