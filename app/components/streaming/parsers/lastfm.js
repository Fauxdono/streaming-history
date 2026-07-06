export function processLastfmJSON(content) {
  const data = typeof content === 'string' ? JSON.parse(content) : content;
  if (!Array.isArray(data)) return [];

  return data.filter(t => t.name && t.artist).map(track => ({
    ts: track.date || new Date().toISOString(),
    ms_played: track.duration_ms || 210000,
    master_metadata_track_name: String(track.name),
    master_metadata_album_artist_name: String(track.artist),
    master_metadata_album_album_name: String(track.album || 'Unknown Album'),
    reason_start: 'trackdone',
    reason_end: 'trackdone',
    shuffle: false,
    skipped: false,
    platform: 'Last.fm',
    source: 'lastfm'
  }));
}

