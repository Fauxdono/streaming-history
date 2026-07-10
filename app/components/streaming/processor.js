import _ from 'lodash';
import { enrichAlbums } from '../albumEnrichment';
import { calculateAlbumsByYear, calculateArtistsByYear, calculateBriefObsessions, calculatePlayStats, calculateSongsByYear } from './aggregate.js';
import { deduplicateCrossSources } from './dedup.js';
import { clampSyncBursts } from './artifacts.js';
import { detectFileType } from './detect.js';
import { normalizeArtistName } from './normalize.js';
import { processAppleMusicCSV } from './parsers/apple-music.js';
import { processCakeExcelFile } from './parsers/cake.js';
import { processDeezerXLSX, extractDeezerPlaylists, extractDeezerFavorites } from './parsers/deezer.js';
import { processLastfmJSON, processLastfmCSV } from './parsers/lastfm.js';
import { processRockboxScrobblerLog } from './parsers/rockbox.js';
import { processSoundcloudCSV } from './parsers/soundcloud.js';
import { processTidalCSV } from './parsers/tidal.js';
import { calculateArtistStreaks, calculateConsecutivePlayStreaks, calculateOverallDailyStreak, calculateTopAlbumDailyStreak, calculateTopSongDailyStreak } from './streaks.js';
import { applyOverrides, countOverrides } from './overrides.js';

// Everything derived from a flat array of play entries: stats, rankings,
// yearly breakdowns, streaks. Split out of processFiles so user edits can
// recompute without re-parsing the uploaded files.
export async function computeStatsFromEntries(allProcessedData, { totalFiles = 0, enrichResult = null } = {}) {
  console.log(`Calculating stats for ${allProcessedData.length} entries`);
  const stats = await calculatePlayStats(allProcessedData);

  // Pre-build a map of songs by normalized artist name for faster lookup
  console.log('Processing artist statistics...');
  const songsByArtist = new Map();
  stats.songs.forEach(song => {
    const normalizedName = normalizeArtistName(song.fullArtist || song.artist);
    if (!songsByArtist.has(normalizedName)) {
      songsByArtist.set(normalizedName, []);
    }
    songsByArtist.get(normalizedName).push(song);
  });

  // Pre-build a map of albums by normalized artist name for mostPlayedAlbum
  const albumsByArtist = new Map();
  Object.values(stats.albums).forEach(album => {
    const normalizedName = normalizeArtistName(album.artist);
    if (!albumsByArtist.has(normalizedName)) {
      albumsByArtist.set(normalizedName, []);
    }
    albumsByArtist.get(normalizedName).push(album);
  });

  const sortedArtists = Object.values(stats.artists)
    .map(artist => {
      const normalizedArtistName = normalizeArtistName(artist.name);
      const artistSongs = songsByArtist.get(normalizedArtistName) || [];

      const mostPlayed = _.maxBy(artistSongs, 'playCount') || { trackName: 'Unknown', playCount: 0 };

      // Find most played album for this artist
      const artistAlbums = albumsByArtist.get(normalizedArtistName) || [];
      const topAlbum = _.maxBy(artistAlbums, 'playCount');
      const mostPlayedAlbum = topAlbum ? { albumName: topAlbum.name, playCount: topAlbum.playCount } : null;

      // Get all play timestamps for this artist
      const artistPlays = [];
      artistSongs.forEach(song => {
        if (stats.playHistory[song.key]) {
          artistPlays.push(...stats.playHistory[song.key]);
        }
      });

      const streaks = calculateArtistStreaks(artistPlays);

      return {
        ...artist,
        mostPlayedSong: mostPlayed,
        mostPlayedAlbum,
        ...streaks
      };
    })
    .sort((a, b) => b.totalPlayed - a.totalPlayed);

  console.log('Processing album statistics...');
  const sortedAlbums = _.orderBy(
    Object.values(stats.albums).map(album => ({
      ...album,
      trackCount: album.trackCount.size
    })),
    ['totalPlayed'],
    ['desc']
  );

  console.log('Processing song rankings...');
  const sortedSongs = _.orderBy(stats.songs, ['totalPlayed'], ['desc']).slice(0, 250);

  console.log('Calculating yearly breakdowns...');
  const songsByYear = calculateSongsByYear(stats.songs, stats.playHistory);

  console.log('Calculating brief obsessions...');
  const briefObsessions = calculateBriefObsessions(stats.songs, stats.playHistory);

  console.log('Processing artists by year...');
  const artistsByYear = calculateArtistsByYear(stats.songs, stats.playHistory, allProcessedData);

  console.log('Processing albums by year...');
  const albumsByYear = calculateAlbumsByYear(sortedAlbums, allProcessedData);

  console.log('Calculating streak statistics...');
  const consecutivePlayStreaks = calculateConsecutivePlayStreaks(allProcessedData);
  const overallDailyStreak = calculateOverallDailyStreak(allProcessedData);
  const topSongDailyStreak = calculateTopSongDailyStreak(stats.songs, stats.playHistory);
  const topAlbumDailyStreak = calculateTopAlbumDailyStreak(sortedAlbums, allProcessedData);

  return {
    stats: {
      totalFiles,
      totalEntries: allProcessedData.length,
      processedSongs: stats.processedSongs,
      nullTrackNames: allProcessedData.filter(e => !e.master_metadata_track_name).length,
      uniqueSongs: stats.songs.length,
      shortPlays: stats.shortPlays,
      totalListeningTime: stats.totalListeningTime,
      serviceListeningTime: stats.serviceListeningTime,
      albumEnrichment: enrichResult
    },
    topArtists: sortedArtists,
    topAlbums: sortedAlbums,
    processedTracks: sortedSongs,
    songsByYear: songsByYear,
    briefObsessions: briefObsessions,
    artistsByYear: artistsByYear,
    albumsByYear: albumsByYear,
    rawPlayData: allProcessedData,
    trackDurationMap: stats.trackDurationMap,
    streaks: {
      consecutivePlays: consecutivePlayStreaks,
      overallDaily: overallDailyStreak,
      topSongDaily: topSongDailyStreak,
      topAlbumDaily: topAlbumDailyStreak
    }
  };
}

export const streamingProcessor = {
  async processFiles(files, { enableEnrichment = false, onEnrichmentProgress, overrides = null } = {}) {
    console.time('processFiles');
    try {
      const allProcessedArrays = [];
      // Playlists and favorites ride along with the play entries but stay
      // separate from stats: collected per-file here, returned as
      // importedPlaylists / importedFavorites (one bundle per service).
      const importedPlaylists = [];
      const importedFavorites = [];

      // Process files in smaller batches to prevent memory issues
      const batchSize = Math.min(3, files.length); // Reduce batch size for better memory management
      const fileBatches = [];
      
      // Split files into batches
      for (let i = 0; i < files.length; i += batchSize) {
        fileBatches.push(Array.from(files).slice(i, i + batchSize));
      }
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < fileBatches.length; batchIndex++) {
        const batch = fileBatches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1} of ${fileBatches.length} (${batch.length} files)`);
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            try {
              // Get file content first for detection
              let content;
              let fileType;
              
              if (file.name.endsWith('.xlsx')) {
                // For Excel files, we need to detect after opening
                // Try Cake first, then Deezer
                const cakeData = await processCakeExcelFile(file);
                if (cakeData && cakeData.length > 0) {
                  console.log(`Auto-detected and processed ${cakeData.length} entries from Cake Excel file: ${file.name}`);
                  return cakeData;
                }
                
                // Fallback to Deezer
                console.log(`Auto-detected as Deezer Excel file: ${file.name}`);
                const playlists = await extractDeezerPlaylists(file);
                if (playlists.length > 0) {
                  importedPlaylists.push(...playlists);
                }
                const favorites = await extractDeezerFavorites(file);
                if (favorites) {
                  importedFavorites.push(favorites);
                }
                return await processDeezerXLSX(file);
              } else {
                // For text files, read content and detect type
                content = await file.text();
                fileType = detectFileType(file.name, content);
              }
              
              console.log(`Auto-detected file type: ${fileType} for file: ${file.name}`);
              
              switch (fileType) {
                case 'spotify':
                  const data = JSON.parse(content);
                  return data.map(entry => ({
                    ...entry,
                    source: entry.source || 'spotify'
                  }));
                  
                case 'cake-export':
                  const parsedData = JSON.parse(content);
                  console.log(`Processing ${parsedData.streamingHistory.length} entries from cake-dreamin export`);
                  return parsedData.streamingHistory.map(entry => ({
                    ts: entry.ts,
                    master_metadata_track_name: entry.track,
                    master_metadata_album_artist_name: entry.artist,
                    master_metadata_album_album_name: entry.album,
                    ms_played: entry.ms_played,
                    platform: entry.platform,
                    source: entry.source || 'cake-export',
                    reason_end: entry.reason_end,
                    reason_start: entry.reason_start,
                    shuffle: entry.shuffle
                  }));
                  
                case 'apple_music':
                  return await processAppleMusicCSV(content);
                  
                case 'soundcloud':
                  return await processSoundcloudCSV(content);
                  
                case 'tidal':
                  return await processTidalCSV(content);

                case 'ipod':
                  return processRockboxScrobblerLog(content);

                case 'lastfm':
                  return file.name.endsWith('.csv')
                    ? await processLastfmCSV(content)
                    : processLastfmJSON(content);

                case 'youtube_music':
                  // TODO: Add YouTube Music processing
                  console.log(`YouTube Music format detected but not yet supported: ${file.name}`);
                  return [];
                  
                default:
                  console.log(`Unknown file format for ${file.name}, trying Apple Music as fallback`);
                  if (content && file.name.endsWith('.csv')) {
                    return await processAppleMusicCSV(content);
                  }
                  return [];
              }
              
              return [];
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
              return [];
            }
          })
        );
        
        // Collect batch results (flatten at the end to avoid O(n²) spread)
        batchResults.forEach(dataArray => {
          if (dataArray && dataArray.length > 0) {
            allProcessedArrays.push(dataArray);
          }
        });
        
        // Yield between batches to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      // Flatten all batch arrays into a single array
      let allProcessedData = allProcessedArrays.flat();

      // Repair corrupted durations from offline-sync bursts before any
      // stats are computed (see streaming/artifacts.js).
      const burstResult = clampSyncBursts(allProcessedData);
      if (burstResult.clamped > 0) {
        console.log(`Sync-burst repair: clamped ${burstResult.clamped} corrupted plays, reclaimed ${Math.round(burstResult.reclaimedMs / 3600000)}h of phantom listening time`);
      }

      // Cross-source deduplication: when the same play appears in multiple services
      // (e.g. Spotify + Last.fm scrobbler), keep the entry with more data.
      // Two entries are duplicates if they have the same track+artist within 3 minutes.
      const sources = new Set(allProcessedData.map(e => e.source));
      if (sources.size > 1) {
        const before = allProcessedData.length;
        allProcessedData = deduplicateCrossSources(allProcessedData);
        const removed = before - allProcessedData.length;
        if (removed > 0) {
          console.log(`Cross-source dedup: removed ${removed} duplicate entries across ${sources.size} sources`);
        }
      }

      // Process ISRC codes from Deezer data
      allProcessedData.forEach(item => {
        if (item.source === 'deezer' && item.isrc) {
          item.master_metadata_external_ids = { isrc: item.isrc };
        }
      });

      // Enrich missing album data via MusicBrainz (opt-in)
      let enrichResult = null;
      if (enableEnrichment) {
        const unknownAlbumCount = allProcessedData.filter(
          e => !e.master_metadata_album_album_name || e.master_metadata_album_album_name === 'Unknown Album'
        ).length;
        if (unknownAlbumCount > 0) {
          console.log(`Enriching album data for ${unknownAlbumCount} entries with missing albums...`);
          // Fire initial progress and yield so the UI renders the bar before enrichment starts
          if (onEnrichmentProgress) {
            onEnrichmentProgress(0, unknownAlbumCount);
            await new Promise(r => setTimeout(r, 50));
          }
          enrichResult = await enrichAlbums(allProcessedData, (done, total) => {
            if (onEnrichmentProgress) onEnrichmentProgress(done, total);
            if (done % 50 === 0 || done === total) {
              console.log(`Album enrichment: ${done}/${total} lookups complete`);
            }
          }, { trackOverrides: overrides?.tracks });
          console.log(`Album enrichment complete: ${enrichResult.enriched} entries updated`);
        }
      }

      // Keep the pristine parse output, then apply any saved user edits
      // before stats are computed (see streaming/overrides.js).
      const basePlayData = allProcessedData;
      if (overrides && countOverrides(overrides) > 0) {
        allProcessedData = applyOverrides(allProcessedData, overrides);
        console.log(`Applied ${countOverrides(overrides)} saved data edits`);
      }

      const result = await computeStatsFromEntries(allProcessedData, {
        totalFiles: files.length,
        enrichResult
      });

      console.timeEnd('processFiles');
      return { ...result, basePlayData, importedPlaylists, importedFavorites };
    } catch (error) {
      console.error('Error processing files:', error);
      throw error;
    }
  }
};

