import Papa from 'papaparse';

const DEFAULT_MS = 210000;

const makeEntry = ({ ts, track, artist, album, ms }) => ({
  ts,
  ms_played: ms || DEFAULT_MS,
  master_metadata_track_name: String(track),
  master_metadata_album_artist_name: String(artist),
  master_metadata_album_album_name: String(album || 'Unknown Album'),
  reason_start: 'trackdone',
  reason_end: 'trackdone',
  shuffle: false,
  skipped: false,
  platform: 'Last.fm',
  source: 'lastfm'
});

// A track object in the raw Last.fm API shape (as exported by tools like
// lastfm.ghan.nl): { name, artist: {"#text"}, album: {"#text"}, date: {uts} }
function fromApiTrack(t) {
  const uts = t.date?.uts;
  if (!uts || !t.name) return null; // "now playing" entries have no date
  const artist = t.artist?.['#text'] ?? t.artist?.name ?? t.artist;
  if (!artist) return null;
  return makeEntry({
    ts: new Date(parseInt(uts) * 1000).toISOString(),
    track: t.name,
    artist,
    album: t.album?.['#text'],
  });
}

export function processLastfmJSON(content) {
  const data = typeof content === 'string' ? JSON.parse(content) : content;

  // Raw API response wrapper: { recenttracks: { track: [...] } }
  if (data?.recenttracks?.track) {
    return data.recenttracks.track.map(fromApiTrack).filter(Boolean);
  }
  // Single page object: { "@attr": {...}, track: [...] }
  if (!Array.isArray(data) && Array.isArray(data?.track)) {
    return data.track.map(fromApiTrack).filter(Boolean);
  }
  if (!Array.isArray(data)) return [];
  if (data.length === 0) return [];

  // Array of page objects (lastfm.ghan.nl JSON export):
  // [{ "@attr": {...}, track: [...] }, ...]
  if (Array.isArray(data[0]?.track)) {
    return data.flatMap(page => (page.track || []).map(fromApiTrack)).filter(Boolean);
  }

  // Flat array of API-shaped tracks: artist is a {"#text"} object
  if (data[0]?.name && typeof data[0]?.artist === 'object') {
    return data.map(fromApiTrack).filter(Boolean);
  }

  // The app's own Last.fm sync format: flat strings + ISO date
  return data.filter(t => t.name && t.artist).map(track => makeEntry({
    ts: track.date || new Date().toISOString(),
    ms: track.duration_ms,
    track: track.name,
    artist: track.artist,
    album: track.album,
  }));
}

// CSV export from lastfm.ghan.nl:
// uts,utc_time,artist,artist_mbid,album,album_mbid,track,track_mbid
export function processLastfmCSV(content) {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const entries = results.data
          .filter(row => row.uts && row.track && row.artist)
          .map(row => makeEntry({
            ts: new Date(parseInt(row.uts) * 1000).toISOString(),
            track: row.track,
            artist: row.artist,
            album: row.album,
          }))
          .filter(e => !isNaN(new Date(e.ts).getTime()));
        console.log(`Transformed ${entries.length} Last.fm CSV scrobbles`);
        resolve(entries);
      },
      error: (error) => {
        console.error('Error parsing Last.fm CSV:', error);
        resolve([]);
      }
    });
  });
}
