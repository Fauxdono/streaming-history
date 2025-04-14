
importScripts('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js');

// Listen for messages from the main thread
self.addEventListener('message', async event => {
  const { 
    type, 
    data, 
    options 
  } = event.data;
  
  if (type === 'start-export') {
    try {
      await processExport(data, options);
    } catch (error) {
      self.postMessage({ 
        type: 'error', 
        error: error.message || 'Unknown error during export' 
      });
    }
  }
});

// Format duration helper function
function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  
  const remainingMinutes = minutes % 60;
  return hours > 0 ? 
    `${hours}h ${remainingMinutes}m` : 
    `${remainingMinutes}m`;
}

// Main export processing function
async function processExport(data, options) {
  // Send initial progress update
  updateProgress(0, "Initializing export process...");
  
  const { 
    stats, 
    topArtists, 
    topAlbums, 
    processedData, 
    briefObsessions, 
    songsByYear, 
    rawPlayData,
    selectedSheets
  } = data;
  
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  
  try {
    // Calculate enabled sheet count for progress tracking
    const enabledSheetCount = getEnabledSheetCount(selectedSheets, songsByYear, briefObsessions, rawPlayData);
    
    // Calculate progress weights
    const historyWeight = selectedSheets.history ? 5 : 0; // History is 5x more work
    const totalWeight = enabledSheetCount + historyWeight - (selectedSheets.history ? 1 : 0);
    
    // Calculate progress per sheet
    const baseProgressPerSheet = selectedSheets.history ?
      (100 - 5) / totalWeight : // Save 5% for finalization
      95 / totalWeight; // Save 5% for finalization
    
    const historyProgress = selectedSheets.history ? baseProgressPerSheet * historyWeight : 0;
    
    // Track current progress
    let currentProgress = 0;
    
    // Summary Sheet
    if (selectedSheets.summary) {
      updateProgress(currentProgress, "Creating summary sheet...", "Summary");
      await addSummarySheet(workbook, stats, selectedSheets, rawPlayData);
      
      // Update progress
      currentProgress += baseProgressPerSheet;
      updateProgress(currentProgress, "Summary sheet complete");
      
      // Yield to prevent blocking
      await sleep(50);
    }
    
    // Artists Sheet
    if (selectedSheets.artists && topArtists && topArtists.length > 0) {
      await createStreamingSheet(
        workbook,
        'Top Artists',
        ['Rank', 'Artist', 'Total Time', 'Play Count', 'Average Time per Play'],
        topArtists,
        currentProgress,
        currentProgress + baseProgressPerSheet,
        processArtistRow
      );
      
      // Update progress
      currentProgress += baseProgressPerSheet;
      
      // Yield to prevent blocking
      await sleep(50);
    }
    
    // Albums Sheet
    if (selectedSheets.albums && topAlbums && topAlbums.length > 0) {
      await createStreamingSheet(
        workbook,
        'Top Albums',
        ['Rank', 'Album', 'Artist', 'Total Time', 'Play Count', 'Track Count', 'Average Time per Play'],
        topAlbums,
        currentProgress,
        currentProgress + baseProgressPerSheet,
        processAlbumRow
      );
      
      // Update progress
      currentProgress += baseProgressPerSheet;
      
      // Yield to prevent blocking
      await sleep(50);
    }
    
    // All-Time Top Tracks
    if (selectedSheets.tracks && processedData && processedData.length > 0) {
      await createStreamingSheet(
        workbook,
        'Top All-Time Tracks',
        ['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play'],
        processedData,
        currentProgress,
        currentProgress + baseProgressPerSheet,
        processTrackRow
      );
      
      // Update progress
      currentProgress += baseProgressPerSheet;
      
      // Yield to prevent blocking
      await sleep(50);
    }
    
    // Yearly Top tracks
    if (selectedSheets.yearly && songsByYear && Object.keys(songsByYear).length > 0) {
      updateProgress(currentProgress, "Processing yearly top tracks...");
      
      // Sort years by most recent first
      const years = Object.keys(songsByYear).sort((a, b) => b - a);
      const yearCount = years.length;
      
      // Calculate progress increment per year
      const progressPerYear = baseProgressPerSheet / yearCount;
      
      // Process each year's data
      for (let i = 0; i < years.length; i++) {
        const year = years[i];
        const tracks = songsByYear[year];
        
        if (!tracks || tracks.length === 0) continue;
        
        // Process this year's data
        await createStreamingSheet(
          workbook,
          `Top Tracks ${year}`,
          ['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play'],
          tracks,
          currentProgress + (i * progressPerYear),
          currentProgress + ((i + 1) * progressPerYear),
          processTrackRow
        );
        
        // Yield between years
        await sleep(20);
      }
      
      // Update progress
      currentProgress += baseProgressPerSheet;
    }
    
    // Brief Obsessions
    if (selectedSheets.obsessions && briefObsessions && briefObsessions.length > 0) {
      await createStreamingSheet(
        workbook,
        'Brief Obsessions',
        [
          'Rank', 'Track', 'Artist', 'Peak Week Start', 
          'Plays in Peak Week', 'Total Plays', 'Average Plays per Day in Peak Week'
        ],
        briefObsessions,
        currentProgress,
        currentProgress + baseProgressPerSheet,
        processObsessionRow
      );
      
      // Update progress
      currentProgress += baseProgressPerSheet;
      
      // Yield to prevent blocking
      await sleep(50);
    }
    
    // Complete Streaming History
    if (selectedSheets.history && rawPlayData && rawPlayData.length > 0) {
      updateProgress(currentProgress, "Preparing streaming history...");
      
      // Create the sheet with headers
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
      
      // Process in very small batches to provide regular progress updates
      const historyBatchSize = 200; // Can be larger in service worker context since we're off the main thread
      const historyBatchCount = Math.ceil(rawPlayData.length / historyBatchSize);
      
      for (let batchIndex = 0; batchIndex < historyBatchCount; batchIndex++) {
        const start = batchIndex * historyBatchSize;
        const end = Math.min(start + historyBatchSize, rawPlayData.length);
        const batch = rawPlayData.slice(start, end);
        
        // Process this batch
        for (let i = 0; i < batch.length; i++) {
          try {
            const rowData = processHistoryRow(batch[i], start + i);
            historySheet.addRow(rowData);
          } catch (err) {
            // Skip problematic entries
            console.error("Error processing history row:", err);
          }
        }
        
        // Calculate and update progress
        const progress = currentProgress + ((batchIndex + 1) / historyBatchCount) * historyProgress;
        
        updateProgress(
          Math.floor(progress),
          `Processing streaming history... (${batchIndex + 1}/${historyBatchCount})`,
          'Streaming History'
        );
        
        // Yield to allow progress updates to be sent
        await sleep(5);
      }
      
      // Update progress
      currentProgress += historyProgress;
    }
    
    // Final formatting
    updateProgress(95, "Finalizing workbook...");
    
    // Apply minimal formatting to headers only
    for (const sheet of workbook.worksheets) {
      try {
        // Make title bold
        if (sheet.getRow(1).cells.length) {
          sheet.getRow(1).font = { bold: true };
        }
        
        // Make headers bold
        if (sheet.getRow(3).cells.length) {
          sheet.getRow(3).font = { bold: true };
        }
      } catch (err) {
        // Skip formatting if there's an error
      }
    }
    
    updateProgress(98, "Generating Excel file...");
    
    // Generate the Excel binary data
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Send the completed file back to the main thread
    updateProgress(100, "Export complete!", null, buffer);
    
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error.message || 'Failed to create export'
    });
  }
}

// Update progress function
function updateProgress(value, operation, sheetName, buffer = null) {
  self.postMessage({ 
    type: 'progress', 
    progress: value, 
    operation, 
    sheetName,
    buffer
  });
}

// Helper to add the summary sheet
async function addSummarySheet(workbook, stats, selectedSheets, rawPlayData) {
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
  
  // Add export details to the summary
  summarySheet.addRow([]);
  summarySheet.addRow(['Export Details']);
  summarySheet.addRow(['Export Date', new Date().toISOString().split('T')[0]]);
  summarySheet.addRow(['Data Size', `${rawPlayData.length} entries`]);
  summarySheet.addRow(['Export Method', 'Background Service Worker (for large datasets)']);
  summarySheet.addRow(['Sheets Included', Object.entries(selectedSheets)
    .filter(([_, included]) => included)
    .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1))
    .join(', ')
  ]);
  
  return summarySheet;
}

// Create streaming sheet with batch processing
async function createStreamingSheet(workbook, sheetTitle, headerRow, dataSource, progressStart, progressEnd, processRowCallback) {
  // Add the sheet to workbook
  const sheet = workbook.addWorksheet(sheetTitle);
  
  // Add title and header rows
  sheet.addRow([sheetTitle]);
  sheet.addRow([]);
  sheet.addRow(headerRow);
  
  // Skip processing if no data
  if (!dataSource || !Array.isArray(dataSource) || dataSource.length === 0) {
    updateProgress(progressEnd, `Completed ${sheetTitle}`, sheetTitle);
    return sheet;
  }
  
  // Determine batch size - can be larger in service worker context
  const batchSize = 250;
  const totalBatches = Math.ceil(dataSource.length / batchSize);
  
  // Process data in batches
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
        // Add a placeholder row to maintain count
        sheet.addRow(['Error processing row']);
      }
    }
    
    // Calculate and update progress
    const progress = progressStart + ((batchIndex + 1) / totalBatches) * (progressEnd - progressStart);
    
    // Update progress
    updateProgress(
      Math.floor(progress), 
      `Processing ${sheetTitle}... (${batchIndex + 1}/${totalBatches})`,
      sheetTitle
    );
    
    // Small yield to allow progress updates
    await sleep(5);
  }
  
  updateProgress(progressEnd, `Completed ${sheetTitle}`, sheetTitle);
  return sheet;
}

// Row processing helper functions
function processArtistRow(artist, rank) {
  return [
    rank,
    artist.name || '',
    formatDuration(artist.totalPlayed || 0),
    artist.playCount || 0,
    formatDuration((artist.totalPlayed || 0) / (artist.playCount || 1))
  ];
}

function processAlbumRow(album, rank) {
  return [
    rank,
    album.name || '',
    album.artist || '',
    formatDuration(album.totalPlayed || 0),
    album.playCount || 0,
    album.trackCount || 0,
    formatDuration((album.totalPlayed || 0) / (album.playCount || 1))
  ];
}

function processTrackRow(track, rank) {
  return [
    rank,
    track.trackName || '',
    track.artist || '',
    track.albumName || 'N/A',
    formatDuration(track.totalPlayed || 0),
    track.playCount || 0,
    formatDuration((track.totalPlayed || 0) / (track.playCount || 1))
  ];
}

function processObsessionRow(track, rank) {
  try {
    return [
      rank,
      track.trackName || '',
      track.artist || '',
      track.intensePeriod?.weekStart ? new Date(track.intensePeriod.weekStart).toLocaleDateString() : 'Unknown',
      track.intensePeriod?.playsInWeek || 0,
      track.playCount || 0,
      track.intensePeriod?.playsInWeek ? (track.intensePeriod.playsInWeek / 7).toFixed(1) : '0'
    ];
  } catch (err) {
    return [rank, 'Error processing obsession data', '', '', 0, 0, 0];
  }
}

function processHistoryRow(play, index) {
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
}

// Get the count of enabled sheets for progress calculation
function getEnabledSheetCount(selectedSheets, songsByYear, briefObsessions, rawPlayData) {
  let count = 0;
  if (selectedSheets.summary) count++; 
  if (selectedSheets.artists) count++;
  if (selectedSheets.albums) count++;
  if (selectedSheets.tracks) count++;
  if (selectedSheets.yearly && Object.keys(songsByYear || {}).length > 0) count++;
  if (selectedSheets.obsessions && briefObsessions?.length > 0) count++;
  if (selectedSheets.history && rawPlayData?.length > 0) count++;
  return Math.max(count, 1); // Ensure at least 1 to avoid division by zero
}

// Helper function to pause execution
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
