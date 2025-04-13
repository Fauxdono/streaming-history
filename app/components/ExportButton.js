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
  rawPlayData 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');
  const [currentSheetName, setCurrentSheetName] = useState('');
  
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

  // Pre-calculate allSongs once
  const allSongsRef = React.useRef(null);
  
  useEffect(() => {
    if (rawPlayData && rawPlayData.length > 0 && !allSongsRef.current) {
      try {
        const songMap = new Map();
        
        // Process raw play data to extract all songs
        for (let i = 0; i < rawPlayData.length; i++) {
          const entry = rawPlayData[i];
          if (entry.ms_played < 30000 || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) {
            continue; 
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
        allSongsRef.current = [];
      }
    }
  }, [rawPlayData]);

  // Simplified progress update - focus on minimal UI updates
  const updateProgress = async (value, operation, sheetName) => {
    return new Promise(resolve => {
      // Use RAF to ensure smooth UI updates
      requestAnimationFrame(() => {
        // Only update if value has changed significantly to reduce renders
        if (Math.abs(value - exportProgress) >= 1) {
          setExportProgress(value);
        }
        
        // Only update operation text if it's changed
        if (operation && operation !== currentOperation) {
          setCurrentOperation(operation);
        }
        
        // Track current sheet for better user feedback
        if (sheetName && sheetName !== currentSheetName) {
          setCurrentSheetName(sheetName);
        }
        
        // Use a longer timeout on mobile to ensure UI has time to update
        setTimeout(resolve, isMobile ? 30 : 10);
      });
    });
  };

  // Create separate streams for each sheet to avoid memory buildup
  const createStreamingSheet = async (workbook, sheetTitle, headerRow, dataSource, progressStart, progressEnd, processRowCallback) => {
    // Add the sheet to workbook
    const sheet = workbook.addWorksheet(sheetTitle);
    
    // Add title and header rows
    sheet.addRow([sheetTitle]);
    sheet.addRow([]);
    sheet.addRow(headerRow);
    
    // Skip processing if no data
    if (!dataSource || !Array.isArray(dataSource) || dataSource.length === 0) {
      await updateProgress(progressEnd, `Completed ${sheetTitle}`, sheetTitle);
      return sheet;
    }
    
    // Determine optimal batch size based on device
    const batchSize = isMobile ? 50 : 250;
    const totalBatches = Math.ceil(dataSource.length / batchSize);
    
    // Process data in smaller chunks with more frequent UI updates
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, dataSource.length);
      const batchItems = dataSource.slice(start, end);
      
      // Process items in this batch
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        const rowIndex = start + i + 1; // +1 for header offset
        
        // Add row with error handling
        try {
          // Add the row with properly mapped data based on the callback
          const rowData = processRowCallback(item, rowIndex);
          sheet.addRow(rowData);
        } catch (error) {
          console.warn(`Error adding row ${rowIndex}:`, error);
          // Add a placeholder row to maintain count
          sheet.addRow(['Error processing row']);
        }
        
        // Yield briefly every 10 rows to prevent UI freezing
        if (i % 10 === 0 && i > 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }
      
      // Calculate and update progress
      const progress = progressStart + ((batchIndex + 1) / totalBatches) * (progressEnd - progressStart);
      
      // Update progress and UI, but only for sufficiently large progress changes
      if (batchIndex % 2 === 0 || batchIndex === totalBatches - 1) {
        await updateProgress(
          Math.floor(progress), 
          `Processing ${sheetTitle}... (${batchIndex + 1}/${totalBatches})`,
          sheetTitle
        );
      }
      
      // Yield between batches to maintain UI responsiveness
      // Use longer yields in the critical ~80% zone where mobile devices struggle
      if (progress >= 75 && progress <= 85) {
        await new Promise(r => setTimeout(r, isMobile ? 100 : 20));
      } else {
        await new Promise(r => setTimeout(r, isMobile ? 30 : 10));
      }
    }
    
    await updateProgress(progressEnd, `Completed ${sheetTitle}`, sheetTitle);
    return sheet;
  };

  // Helper to process row data for each sheet
  const processArtistRow = (artist, rank) => {
    return [
      rank,
      artist.name || '',
      formatDuration(artist.totalPlayed || 0),
      artist.playCount || 0,
      formatDuration((artist.totalPlayed || 0) / (artist.playCount || 1))
    ];
  };
  
  const processAlbumRow = (album, rank) => {
    return [
      rank,
      album.name || '',
      album.artist || '',
      formatDuration(album.totalPlayed || 0),
      album.playCount || 0,
      album.trackCount || 0,
      formatDuration((album.totalPlayed || 0) / (album.playCount || 1))
    ];
  };
  
  const processTrackRow = (track, rank) => {
    return [
      rank,
      track.trackName || '',
      track.artist || '',
      track.albumName || 'N/A',
      formatDuration(track.totalPlayed || 0),
      track.playCount || 0,
      formatDuration((track.totalPlayed || 0) / (track.playCount || 1))
    ];
  };
  
  const processObsessionRow = (track, rank) => {
    try {
      return [
        rank,
        track.trackName || '',
        track.artist || '',
        track.intensePeriod?.weekStart ? track.intensePeriod.weekStart.toLocaleDateString() : 'Unknown',
        track.intensePeriod?.playsInWeek || 0,
        track.playCount || 0,
        track.intensePeriod?.playsInWeek ? (track.intensePeriod.playsInWeek / 7).toFixed(1) : '0'
      ];
    } catch (err) {
      return [rank, 'Error processing obsession data', '', '', 0, 0, 0];
    }
  };
  
  const processHistoryRow = (play, index) => {
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

      return [
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
      ];
    } catch (err) {
      return [new Date().toISOString(), 'Error processing history entry', '', '', 0, 0, '', '', '', '', '', '', '', '', ''];
    }
  };

  // Main export function that handles the entire process in a streaming fashion
  const createWorkbookForExport = async () => {
    const workbook = new ExcelJS.Workbook();
    
    try {
      await updateProgress(0, "Initializing export process...");
      
      // Summary Sheet - these are small and fast to create
      await updateProgress(2, "Creating summary sheet...", "Summary");
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

      if (stats.serviceListeningTime && Object.keys(stats.serviceListeningTime).length > 0) {
        summarySheet.addRow([]);
        summarySheet.addRow(['Listening Time by Service']);
        Object.entries(stats.serviceListeningTime).forEach(([service, time]) => {
          summarySheet.addRow([service, formatDuration(time)]);
        });
      }
      
      // This is a more UI-responsive approach to creating the workbook
      await updateProgress(5, "Starting data processing...");
      
      // Process each section using streaming approach that minimizes memory usage
      
      // Artists Sheet - Full dataset for all devices
      await createStreamingSheet(
        workbook,
        'Top Artists',
        ['Rank', 'Artist', 'Total Time', 'Play Count', 'Average Time per Play'],
        topArtists,
        5, 15,
        processArtistRow
      );
      
      // Albums Sheet - Full dataset for all devices
      await createStreamingSheet(
        workbook,
        'Top Albums',
        ['Rank', 'Album', 'Artist', 'Total Time', 'Play Count', 'Track Count', 'Average Time per Play'],
        topAlbums,
        15, 25,
        processAlbumRow
      );
      
      // All-Time Top Tracks - Full data, processed in small chunks
      const tracksToProcess = allSongsRef.current || processedData;
      const trackSheetName = "Top All-Time Tracks";
      
      await createStreamingSheet(
        workbook,
        trackSheetName,
        ['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play'],
        tracksToProcess,
        25, 40,
        processTrackRow
      );
      
      // Yearly Top tracks - process all years for all devices
      if (songsByYear && Object.keys(songsByYear).length > 0) {
        await updateProgress(40, "Processing yearly top tracks...");
        
        // Sort years by most recent first
        const years = Object.keys(songsByYear).sort((a, b) => b - a);
        const yearCount = years.length;
        
        // Process each year's data
        for (let i = 0; i < years.length; i++) {
          const year = years[i];
          const tracks = songsByYear[year];
          
          if (!tracks || tracks.length === 0) continue;
          
          // Calculate progress range for this year
          const yearStartProgress = 40 + (i / yearCount) * 20;
          const yearEndProgress = 40 + ((i + 1) / yearCount) * 20;
          
          // Process this year's data
          await createStreamingSheet(
            workbook,
            `Top Tracks ${year}`,
            ['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play'],
            tracks,
            yearStartProgress,
            yearEndProgress,
            processTrackRow
          );
          
          // Brief yield between years to maintain UI responsiveness
          await new Promise(r => setTimeout(r, 20));
        }
      }
      
      // Brief Obsessions - full dataset for all devices
      await createStreamingSheet(
        workbook,
        'Brief Obsessions',
        [
          'Rank', 'Track', 'Artist', 'Peak Week Start', 
          'Plays in Peak Week', 'Total Plays', 'Average Plays per Day in Peak Week'
        ],
        briefObsessions,
        60, 70,
        processObsessionRow
      );

      // Complete Streaming History - process in very small chunks
      if (rawPlayData && rawPlayData.length > 0) {
        await updateProgress(70, "Preparing streaming history...");
        
        // This is the most memory-intensive section - the key problematic area around 80%
        // Create the history sheet with all headers
        const historySheet = workbook.addWorksheet('Streaming History');
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
        
        // Determine optimal number of entries to include - full dataset, but processed in smaller chunks
        const historyData = rawPlayData;
        
        // Use much smaller batches for the streaming history to prevent memory pressure
        const historyBatchSize = isMobile ? 25 : 100;
        const historyBatchCount = Math.ceil(historyData.length / historyBatchSize);
        
        for (let batchIndex = 0; batchIndex < historyBatchCount; batchIndex++) {
          const start = batchIndex * historyBatchSize;
          const end = Math.min(start + historyBatchSize, historyData.length);
          const batch = historyData.slice(start, end);
          
          // Critical section - process streaming history entries
          for (let i = 0; i < batch.length; i++) {
            const entry = batch[i];
            
            try {
              const rowData = processHistoryRow(entry, start + i);
              historySheet.addRow(rowData);
              
              // Yield more frequently during history processing to avoid UI freezes
              if (i % 5 === 0) {
                await new Promise(r => setTimeout(r, 0));
              }
            } catch (err) {
              console.warn("Error adding history row:", err);
            }
          }
          
          // Calculate progress - this is the critical 80% area
          const progress = 70 + ((batchIndex + 1) / historyBatchCount) * 25;
          
          // Update progress less frequently to reduce UI pressure
          if (batchIndex % 4 === 0 || batchIndex === historyBatchCount - 1) {
            await updateProgress(
              Math.floor(progress),
              `Adding streaming history... (${batchIndex + 1}/${historyBatchCount})`,
              'Streaming History'
            );
          }
          
          // Critical section yield - longer pauses around 80% mark
          if (progress >= 75 && progress <= 85) {
            // Extra long yield in the problem zone
            await new Promise(r => setTimeout(r, isMobile ? 200 : 50));
          } else {
            // Standard yield between batches
            await new Promise(r => setTimeout(r, isMobile ? 50 : 20));
          }
        }
      }
      
      // Final formatting - minimal since we want to preserve memory
      await updateProgress(95, "Finalizing workbook...");
      
      // Apply minimal, efficient formatting
      for (const sheet of workbook.worksheets) {
        try {
          // Make the first row bold (sheet title)
          if (sheet.getRow(1).cells.length) {
            sheet.getRow(1).font = { bold: true };
          }
          
          // Make header row bold
          if (sheet.getRow(3).cells.length) {
            sheet.getRow(3).font = { bold: true };
          }
        } catch (err) {
          // Skip formatting if there's an error
        }
      }
      
      await updateProgress(100, "Export complete!");
      return workbook;
    } catch (error) {
      console.error("Error creating export:", error);
      throw error;
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    setError(null);
    setExportProgress(0);
    setCurrentOperation("Starting export...");

    try {
      // Create workbook using streaming approach
      const workbook = await createWorkbookForExport();
      
      // Generate file name
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `cake-dreamin-${timestamp}.xlsx`;

      setCurrentOperation("Generating Excel file...");
      
      // Use a more memory-efficient approach to generate the file
      // Break it into steps with UI updates between
      await updateProgress(95, "Creating Excel file...");
      const buffer = await workbook.xlsx.writeBuffer();
      
      await updateProgress(98, "Preparing download...");
      
      // Create blob and trigger download
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Create download URL
      const url = window.URL.createObjectURL(blob);
      
      setCurrentOperation("Starting download...");
      
      // Create download link and trigger it
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      
      // Use requestAnimationFrame to ensure UI is updated before click
      requestAnimationFrame(() => {
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          setCurrentOperation("Download complete!");
          setExportProgress(0);
          setIsExporting(false);
        }, 1000);
      });
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data: ' + (err.message || 'Unknown error'));
      setIsExporting(false);
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
            {currentOperation || 'Processing...'}
            {currentSheetName && ` (${currentSheetName})`}
          </div>
        </div>
      )}
      
      {isMobile && !isExporting && (
        <p className="text-xs text-purple-600">
          Export optimized for all devices. The process may take several minutes for large datasets.
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