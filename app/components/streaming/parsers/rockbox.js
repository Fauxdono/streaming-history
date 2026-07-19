export function processRockboxScrobblerLog(content) {
  const lines = content.split('\n');
  const transformedData = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and header/comment lines
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

    // Rockbox .scrobbler.log format (tab-separated):
    // artist \t album \t track \t track_number \t duration \t rating \t timestamp \t MusicBrainzID
    let fields = trimmed.split('\t');
    // Fallback: if tab split doesn't produce enough fields, try multiple spaces
    if (fields.length < 6) {
      fields = trimmed.split(/  +/);
    }
    if (fields.length < 6) continue;

    const [artist, album, track, trackNumber, durationSecs, rating, timestamp, mbid] = fields;

    // Skip entries without essential data
    if (!artist || !track) continue;

    // Parse timestamp - Rockbox uses Unix epoch seconds
    const ts = timestamp ? new Date(parseInt(timestamp) * 1000) : new Date();
    if (isNaN(ts.getTime())) continue;

    // Duration is in seconds in the scrobbler log, convert to ms
    const durationMs = parseInt(durationSecs) * 1000 || 210000;

    // Rating: L = loved, B = banned, S = skipped, empty = normal
    const skipped = rating === 'S';

    // Rockbox stores all featured artists joined by ';' — use only the primary artist
    const primaryArtist = String(artist).split(';')[0].trim();

    const trackNum = parseInt(trackNumber, 10);

    transformedData.push({
      ts: ts.toISOString(),
      ms_played: skipped ? Math.min(durationMs, 15000) : durationMs,
      master_metadata_track_name: String(track),
      master_metadata_album_artist_name: primaryArtist,
      master_metadata_album_album_name: String(album || 'Unknown Album'),
      reason_start: 'trackdone',
      reason_end: skipped ? 'fwdbtn' : 'trackdone',
      shuffle: false,
      skipped: skipped,
      platform: 'iPod',
      source: 'ipod',
      offline: true,
      ...(trackNum > 0 ? { track_number: trackNum } : {})
    });
  }

  console.log(`Transformed ${transformedData.length} iPod/Rockbox scrobbler entries`);
  return transformedData;
}

// Cross-source deduplication: removes duplicate plays that appear in multiple services.
// E.g. a Spotify play that was also scrobbled to Last.fm.
// Keeps the entry with more metadata (prefers sources with real ms_played over defaults).
