import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { Download } from 'lucide-react';

const ExportButton = ({ 
  stats, 
  topArtists, 
  topAlbums, 
  processedData, 
  briefObsessions,
  songsByYear,
  formatDuration,
  rawPlayData  // Added rawPlayData parameter
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

  // Check if we're on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 || 
                             /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Function to extract all songs from raw play data - extracted outside the export process
  // This is pre-calculated before the export to reduce memory pressure during export
  const allSongsRef = React.useRef(null);
  
  // Pre-calculate allSongs once
  useEffect(() => {
    if (rawPlayData && rawPlayData.length > 0 && !allSongsRef.current) {
      try {
        const songMap = new Map();
        
        // Process raw play data to extract all songs
        for (let i = 0; i < rawPlayData.length; i++) {
          const entry = rawPlayData[i];
          if (entry.ms_played < 30000 || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) {
            continue; // Skip invalid entries
          }
          
          const trackName = entry.master_metadata_track_name;
          const artistName = entry.master_metadata_album_artist_name;
          const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
          const key = `${trackName}|||${artistName}`;
          
          if (!songMap.has(key)) {
            songMap.set(key, {
              trackName,
              artist: artistName,
              albumName,
              totalPlayed: entry.ms_played,
              playCount: 1
            });
          } else {
            // Update existing song
            const song = songMap.get(key);
            song.totalPlayed += entry.ms_played;
            song.playCount += 1;
          }
        }
        
        // Convert map to array and sort by total time played
        allSongsRef.current = Array.from(songMap.values())
          .sort((a, b) => b.totalPlayed - a.totalPlayed);
      } catch (error) {
        console.error("Error pre-calculating songs:", error);
        // Fallback to empty array
        allSongsRef.current = [];
      }
    }
  }, [rawPlayData]);

  // Safer async update function for progress to ensure UI updates
  const updateProgress = async (value, operation) => {
    return new Promise(resolve => {
      // Use requestAnimationFrame to ensure smooth UI updates
      requestAnimationFrame(() => {
        setExportProgress(value);
        if (operation) {
          setCurrentOperation(operation);
        }
        // Small delay to ensure the UI has time to update
        setTimeout(resolve, 10);
      });
    });
  };

  // Add data to worksheet in smaller batches with progress updates
  const addDataInBatches = async (sheet, data, offset, callback, progressStart, progressEnd, operationName) => {
    // Calculate how many items to process per batch
    const totalItems = data.length;
    const batchSize = isMobile ? 20 : 200; // Smaller batches on mobile
    const totalBatches = Math.ceil(totalItems / batchSize);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, totalItems);
      const batchItems = data.slice(start, end);
      
      // Process this batch
      batchItems.forEach((item, index) => {
        callback(item, offset + start + index);
      });
      
      // Calculate progress percentage
      const batchProgress = batchIndex / totalBatches;
      const progressValue = progressStart + (progressEnd - progressStart) * batchProgress;
      
      // Update progress with current operation
      await updateProgress(Math.floor(progressValue), operationName);
      
      // Short yield to allow UI updates and prevent freezing
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
    
    // Mark this operation as complete
    await updateProgress(progressEnd, `${operationName} - Complete`);
  };

  const createWorkbookForExport = async () => {
    const workbook = new ExcelJS.Workbook();
    
    try {
      // Always start fresh
      await updateProgress(0, "Creating workbook...");
      
      // Summary Sheet (lightweight)
      await updateProgress(5, "Creating summary sheet...");
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Streaming History Analysis Summary']);
      summarySheet.addRow([]);
      summarySheet.addRow(['Metric', 'Value']);
      summarySheet.addRows([
        ['Total Files Processed', stats.totalFiles],
        ['Total Entries', stats.totalEntries],
        ['Total Songs', stats.processedSongs],
        ['Total Listening Time', formatDuration(stats.totalListeningTime)],
        ['Very Short Plays (<30s)', stats.shortPlays],
        ['Entries with No Track Name', stats.nullTrackNames],
      ]);

      // Add service listening time breakdown if available
      if (stats.serviceListeningTime && Object.keys(stats.serviceListeningTime).length > 0) {
        summarySheet.addRow([]);
        summarySheet.addRow(['Listening Time by Service']);
        Object.entries(stats.serviceListeningTime).forEach(([service, time]) => {
          summarySheet.addRow([service, formatDuration(time)]);
        });
      }

      // Top Artists Sheet - with mobile limits if needed
      await updateProgress(10, "Processing top artists...");
      const artistLimit = isMobile ? Math.min(200, topArtists.length) : topArtists.length;
      const artistsSheet = workbook.addWorksheet('Top Artists');
      artistsSheet.addRow(['Top Artists']);
      artistsSheet.addRow([]);
      artistsSheet.addRow(['Rank', 'Artist', 'Total Time', 'Play Count', 'Average Time per Play']);
      
      // Add artists in batches
      await addDataInBatches(
        artistsSheet,
        topArtists.slice(0, artistLimit),
        1, // offset (0-based rank, add 1 for display)
        (artist, rank) => {
          artistsSheet.addRow([
            rank,
            artist.name,
            formatDuration(artist.totalPlayed),
            artist.playCount,
            formatDuration(artist.totalPlayed / artist.playCount)
          ]);
        },
        10, 20, "Adding artists"
      );
      
      // Top Albums Sheet - with mobile limits if needed
      await updateProgress(25, "Processing top albums...");
      const albumLimit = isMobile ? Math.min(200, topAlbums.length) : topAlbums.length;
      const albumsSheet = workbook.addWorksheet('Top Albums');
      albumsSheet.addRow(['Top Albums']);
      albumsSheet.addRow([]);
      albumsSheet.addRow(['Rank', 'Album', 'Artist', 'Total Time', 'Play Count', 'Track Count', 'Average Time per Play']);
      
      // Add albums in batches
      await addDataInBatches(
        albumsSheet,
        topAlbums.slice(0, albumLimit),
        1, // offset
        (album, rank) => {
          albumsSheet.addRow([
            rank,
            album.name,
            album.artist,
            formatDuration(album.totalPlayed),
            album.playCount,
            album.trackCount,
            formatDuration(album.totalPlayed / album.playCount)
          ]);
        },
        25, 35, "Adding albums"
      );

      // All-Time Top Tracks Sheet - with mobile-friendly limits
      await updateProgress(35, "Processing top tracks...");
      const topLimit = isMobile ? 300 : 2000;
      const tracksToProcess = allSongsRef.current ? 
                             allSongsRef.current.slice(0, topLimit) : 
                             processedData.slice(0, topLimit);
      
      const topTracksSheet = workbook.addWorksheet(`Top ${topLimit} All-Time`);
      topTracksSheet.addRow([`All-Time Top ${topLimit} Tracks`]);
      topTracksSheet.addRow([]);
      topTracksSheet.addRow(['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play']);
      
      // Add tracks in batches
      await addDataInBatches(
        topTracksSheet,
        tracksToProcess,
        1, // offset
        (track, rank) => {
          topTracksSheet.addRow([
            rank,
            track.trackName,
            track.artist,
            track.albumName || 'N/A',
            formatDuration(track.totalPlayed),
            track.playCount,
            formatDuration(track.totalPlayed / track.playCount)
          ]);
        },
        35, 50, "Adding top tracks"
      );
      
      // Yearly Top tracks - skip on mobile or limit to recent years
      if (songsByYear && Object.keys(songsByYear).length > 0) {
        await updateProgress(50, "Processing yearly top tracks...");
        
        let years = Object.keys(songsByYear).sort((a, b) => b - a);
        
        // On mobile, limit to most recent 2 years to save memory
        if (isMobile && years.length > 2) {
          years = years.slice(0, 2);
        }
        
        // Process each year
        for (let i = 0; i < years.length; i++) {
          const year = years[i];
          const tracks = songsByYear[year];
          
          if (!tracks || tracks.length === 0) continue;
          
          const yearProgress = 50 + (i / years.length) * 15;
          await updateProgress(yearProgress, `Processing ${year} top tracks...`);
          
          const yearSheet = workbook.addWorksheet(`Top 100 ${year}`);
          yearSheet.addRow([`Top 100 Tracks of ${year}`]);
          yearSheet.addRow([]);
          yearSheet.addRow(['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play']);
          
          // Add up to 100 tracks, or fewer on mobile
          const trackLimit = isMobile ? 50 : 100;
          
          // Add tracks in smaller batches
          await addDataInBatches(
            yearSheet,
            tracks.slice(0, trackLimit),
            1, // offset
            (track, rank) => {
              yearSheet.addRow([
                rank,
                track.trackName,
                track.artist,
                track.albumName || 'N/A',
                formatDuration(track.totalPlayed),
                track.playCount,
                formatDuration(track.totalPlayed / track.playCount)
              ]);
            },
            yearProgress, 
            yearProgress + (15 / years.length) * 0.9, // Leave some room for the next step
            `Adding ${year} tracks`
          );
        }
      }
      
      // Brief Obsessions Sheet - limited on mobile
      await updateProgress(65, "Processing brief obsessions...");
      const obsessionLimit = isMobile ? 50 : briefObsessions.length;
      const obsessionsSheet = workbook.addWorksheet('Brief Obsessions');
      obsessionsSheet.addRow(['Brief Obsessions (Songs with intense listening periods)']);
      obsessionsSheet.addRow([]);
      obsessionsSheet.addRow(['Rank', 'Track', 'Artist', 'Peak Week Start', 'Plays in Peak Week', 'Total Plays', 'Average Plays per Day in Peak Week']);
      
      await addDataInBatches(
        obsessionsSheet,
        briefObsessions.slice(0, obsessionLimit),
        1, // offset
        (track, rank) => {
          try {
            obsessionsSheet.addRow([
              rank,
              track.trackName,
              track.artist,
              track.intensePeriod.weekStart.toLocaleDateString(),
              track.intensePeriod.playsInWeek,
              track.playCount,
              (track.intensePeriod.playsInWeek / 7).toFixed(1)
            ]);
          } catch (err) {
            console.error("Error adding obsession row:", err);
          }
        },
        65, 75, "Adding brief obsessions"
      );

      // Complete Streaming History - be even more careful on mobile
      if (rawPlayData && rawPlayData.length > 0) {
        await updateProgress(75, "Processing streaming history...");
        
        // Limit rows even more aggressively on mobile
        const historyLimit = isMobile ? Math.min(300, rawPlayData.length) : rawPlayData.length;
        
        if (historyLimit > 0) {
          const historySheet = workbook.addWorksheet('Complete Streaming History');
          historySheet.addRow(['Complete Streaming History (Chronological Order)']);
          historySheet.addRow([]);
          historySheet.addRow([
            'Date & Time', 
            'Track', 
            'Artist', 
            'Album',
            'Duration (ms)',
            'Duration', 
            'Service',
            'Platform',
            'Reason End',
            'Reason Start',
            'Shuffle',
            'ISRC',
            'Track ID',
            'Episode Name',
            'Episode Show'
          ]);
    
          // Sort data chronologically - do this in a memory-efficient way
          let sortedData;
          if (isMobile) {
            // On mobile, just take the first N entries without sorting to save memory
            sortedData = rawPlayData.slice(0, historyLimit);
          } else {
            // On desktop, we can afford to sort
            sortedData = [...rawPlayData].slice(0, historyLimit).sort((a, b) => {
              try {
                const dateA = a._dateObj || new Date(a.ts);
                const dateB = b._dateObj || new Date(b.ts);
                return dateA - dateB;
              } catch (e) {
                return 0;
              }
            });
          }
          
          // Process in smaller batches
          await addDataInBatches(
            historySheet,
            sortedData,
            0, // No rank for history
            (play, index) => {
              try {
                const date = play._dateObj || new Date(play.ts);
                const dateStr = date.toISOString();
    
                // Get ISRC code if available
                let isrc = '';
                if (play.master_metadata_external_ids && play.master_metadata_external_ids.isrc) {
                  isrc = play.master_metadata_external_ids.isrc;
                } else if (play.isrc) {
                  isrc = play.isrc;
                }
    
                historySheet.addRow([
                  dateStr,
                  play.master_metadata_track_name || '',
                  play.master_metadata_album_artist_name || '',
                  play.master_metadata_album_album_name || '',
                  play.ms_played || 0,
                  formatDuration(play.ms_played || 0),
                  play.source || '',
                  play.platform || '',
                  play.reason_end || '',
                  play.reason_start || '',
                  play.shuffle !== undefined ? (play.shuffle ? 'Yes' : 'No') : '',
                  isrc,
                  play.spotify_track_uri || play.track_id || '',
                  play.episode_name || '',
                  play.episode_show_name || ''
                ]);
              } catch (e) {
                console.error('Error processing history row:', e);
              }
            },
            75, 95, "Adding streaming history"
          );
    
          // Optimize column widths for history sheet
          historySheet.columns = [
            { header: 'Date & Time', key: 'date', width: 22 },
            { header: 'Track', key: 'track', width: 30 },
            { header: 'Artist', key: 'artist', width: 25 },
            { header: 'Album', key: 'album', width: 25 },
            { header: 'Duration (ms)', key: 'ms', width: 15 },
            { header: 'Duration', key: 'duration', width: 15 },
            { header: 'Service', key: 'source', width: 15 },
            { header: 'Platform', key: 'platform', width: 18 },
            { header: 'Reason End', key: 'reason_end', width: 15 },
            { header: 'Reason Start', key: 'reason_start', width: 15 },
            { header: 'Shuffle', key: 'shuffle', width: 10 },
            { header: 'ISRC', key: 'isrc', width: 15 },
            { header: 'Track ID', key: 'track_id', width: 15 },
            { header: 'Episode Name', key: 'episode_name', width: 25 },
            { header: 'Episode Show', key: 'episode_show', width: 25 }
          ];
        }
      }
      
      await updateProgress(95, "Finalizing workbook...");

      // Format all sheets - minimal formatting to save memory
      for (const sheet of workbook.worksheets) {
        // Style just the key header rows
        if (sheet.getRow(1)) sheet.getRow(1).font = { bold: true, size: 14 };
        if (sheet.getRow(3)) sheet.getRow(3).font = { bold: true };
      }

      await updateProgress(100, "Export complete!");
      return workbook;
      
    } catch (error) {
      console.error("Error in createWorkbookForExport:", error);
      throw error;
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    setError(null);
    setExportProgress(0);
    setCurrentOperation("Starting export...");

    try {
      // For mobile, warn about potential limitations
      if (isMobile) {
        setCurrentOperation("Optimizing for mobile device...");
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const workbook = await createWorkbookForExport();
      
      setCurrentOperation("Preparing download...");
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `cake-dreamin-${timestamp}.xlsx`;

      // On mobile, add additional memory safeguards
      if (isMobile) {
        // Force a small delay to ensure UI is responsive
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setCurrentOperation("Creating file...");
      
      // Wrap the file generation in a promise to catch any errors
      const buffer = await workbook.xlsx.writeBuffer();
      
      setCurrentOperation("Creating download...");
      
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      
      // Use timeout to ensure UI has time to update
      setTimeout(() => {
        try {
          setCurrentOperation("Downloading file...");
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link); // Append to body on mobile for better compatibility
          link.click();
          
          // Clean up
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(link);
            setCurrentOperation("Download complete");
            setExportProgress(0);
          }, 100);
        } catch (err) {
          console.error("Download error:", err);
          setError("Failed to download file: " + err.message);
        }
      }, 50);
      
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data. Please try again. Error: ' + (err.message || 'Unknown error'));
    } finally {
      // Small delay before resetting isExporting to allow download to complete
      setTimeout(() => {
        setIsExporting(false);
      }, 500);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={exportToExcel}
        disabled={isExporting}
        className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={16} />
        {isExporting ? 'Exporting...' : 'Export Cake Dreamin'}
      </button>
      
      {isExporting && (
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block text-purple-600">
                Progress: {exportProgress}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-purple-200">
            <div 
              style={{ width: `${exportProgress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500 transition-all duration-300"
            ></div>
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {currentOperation || (exportProgress < 100 
              ? 'Processing data in chunks to optimize memory usage...' 
              : 'Finalizing export...')}
          </div>
        </div>
      )}
      
      {isMobile && !isExporting && (
        <p className="text-xs text-purple-600">
          For mobile devices, export includes limited data to prevent browser crashes. The export may take longer on mobile.
        </p>
      )}
      
      {error && (
        <div className="p-4 text-red-500 border border-red-200 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ExportButton;