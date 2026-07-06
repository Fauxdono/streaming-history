// ---------------------------------------------------------------------------
// streaming-adapter.js — public API barrel.
//
// Phase 2 of the refactor: the ~3,000-line implementation now lives in
// ./streaming/ split by concern:
//   constants.js   service ids and display names
//   normalize.js   track/artist/album string normalization + match keys
//   dates.js       date parsing and range filtering
//   detect.js      file-type sniffing
//   parsers/       one module per streaming service
//   dedup.js       cross-source duplicate removal
//   streaks.js     listening-streak calculations
//   aggregate.js   top-lists, by-year rollups, calculatePlayStats
//   processor.js   the streamingProcessor.processFiles orchestrator
//
// Import paths and the exported surface are unchanged.
// ---------------------------------------------------------------------------

export { STREAMING_TYPES, STREAMING_SERVICES } from './streaming/constants.js';
export { streamingProcessor } from './streaming/processor.js';
export { normalizeString, normalizeArtistName, createMatchKey } from './streaming/normalize.js';
export { filterDataByDate } from './streaming/dates.js';
export {
  calculateConsecutivePlayStreaks,
  calculateOverallDailyStreak,
  calculateTopSongDailyStreak,
  calculateTopAlbumDailyStreak,
} from './streaming/streaks.js';
export { processRockboxScrobblerLog } from './streaming/parsers/rockbox.js';
export { processLastfmJSON, processLastfmCSV } from './streaming/parsers/lastfm.js';
