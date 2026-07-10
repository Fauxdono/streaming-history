// User edits to the streaming library, persisted in localStorage and
// re-applied to the pristine parse output after every upload. Track
// overrides (rename track/artist/album) are keyed by the original entry's
// match key; play overrides (duration change, deletion) by matchKey + ts.
import { createMatchKey } from './normalize.js';

const STORAGE_KEY = 'cakeculator_data_overrides';

// Sources whose ms_played field holds the track length rather than the
// actually-listened duration (scrobble logs record whole-song lengths).
export const LENGTH_IS_DURATION_SOURCES = new Set(['lastfm', 'ipod']);

export function entryMatchKey(entry) {
  const name = entry.master_metadata_track_name;
  const artist = entry.master_metadata_album_artist_name || 'Unknown Artist';
  return createMatchKey(name, artist) || `${name}:::${artist}`;
}

export function playOverrideKey(trackKey, ts) {
  return `${trackKey}|${ts}`;
}

export function loadOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && parsed.version === 1) {
      return { version: 1, tracks: parsed.tracks || {}, plays: parsed.plays || {} };
    }
  } catch {}
  return { version: 1, tracks: {}, plays: {} };
}

export function saveOverrides(overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {}
}

export function clearOverrides() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function countOverrides(overrides) {
  if (!overrides) return 0;
  return Object.keys(overrides.tracks).length + Object.keys(overrides.plays).length;
}

// Apply overrides to pristine entries (never to an already-overridden
// array). Returns the input array untouched when there is nothing to do.
// Modified entries are copies stamped with __origKey so the UI can group
// renamed plays under their original identity and chain further edits.
export function applyOverrides(entries, overrides) {
  if (!overrides || countOverrides(overrides) === 0) return entries;
  const out = [];
  for (const entry of entries) {
    if (!entry.master_metadata_track_name) {
      out.push(entry);
      continue;
    }
    const key = entryMatchKey(entry);
    const trackEdit = overrides.tracks[key];
    const playEdit = overrides.plays[playOverrideKey(key, entry.ts)];
    if (!trackEdit && !playEdit) {
      out.push(entry);
      continue;
    }
    if (playEdit && playEdit.removed) continue;
    const copy = { ...entry, __origKey: key };
    if (trackEdit) {
      if (trackEdit.name) copy.master_metadata_track_name = trackEdit.name;
      if (trackEdit.artist) copy.master_metadata_album_artist_name = trackEdit.artist;
      if (trackEdit.album) copy.master_metadata_album_album_name = trackEdit.album;
      if (trackEdit.releaseYear != null) copy.release_year = trackEdit.releaseYear;
      if (trackEdit.lengthMs != null) {
        // Corrected song runtime, carried as metadata on every play.
        copy.track_length_ms = trackEdit.lengthMs;
        // Only scrobble logs store the track length as the play duration;
        // for real streaming exports ms_played is actual listening time
        // and must not be rewritten.
        if (LENGTH_IS_DURATION_SOURCES.has(entry.source)) {
          copy.ms_played = trackEdit.lengthMs;
        }
      }
    }
    // A per-play time edit wins over the track-level length
    if (playEdit && playEdit.ms_played != null) copy.ms_played = playEdit.ms_played;
    out.push(copy);
  }
  return out;
}
