import { createMatchKey } from './normalize.js';

// ISRC-based merge suggestions for the Data tab. An ISRC identifies a
// recording independent of any service's spelling, so when two library
// rows resolve to the same ISRC they are versions of the same song.
//
// ISRCs come from two places: Deezer play entries carry one directly, and
// imported catalogs (playlists, favorites, TuneMyMusic CSVs) map their own
// spelling of a track to one. Catalog spellings are linked to library rows
// by exact match key only — no fuzzy matching, since a wrong suggestion
// here would corrupt the user's stats via a bad merge.
export function isrcMergeGroups({ plays = [], importedPlaylists = [], importedFavorites = [], knownKeys }) {
  const byIsrc = new Map();
  const add = (isrc, key) => {
    if (!isrc || !key) return;
    if (!byIsrc.has(isrc)) byIsrc.set(isrc, new Set());
    byIsrc.get(isrc).add(key);
  };

  for (const play of plays) {
    const isrc = play.master_metadata_external_ids?.isrc || play.isrc;
    if (!isrc || !play.master_metadata_track_name) continue;
    add(isrc, createMatchKey(play.master_metadata_track_name, play.master_metadata_album_artist_name || 'Unknown Artist'));
  }

  const catalogTracks = [];
  importedPlaylists.forEach(playlist => catalogTracks.push(...playlist.tracks));
  importedFavorites.forEach(bundle => catalogTracks.push(...(bundle.songs || [])));
  for (const track of catalogTracks) {
    if (!track.isrc || !track.trackName) continue;
    const artist = track.artist || 'Unknown Artist';
    const fullKey = createMatchKey(track.trackName, artist);
    if (knownKeys.has(fullKey)) add(track.isrc, fullKey);
    const primaryArtist = String(artist).split(',')[0].trim();
    if (primaryArtist && primaryArtist !== artist) {
      const primaryKey = createMatchKey(track.trackName, primaryArtist);
      if (knownKeys.has(primaryKey)) add(track.isrc, primaryKey);
    }
  }

  const groups = [];
  for (const [isrc, keys] of byIsrc) {
    if (keys.size >= 2) groups.push({ isrc, keys: [...keys] });
  }
  return groups;
}
