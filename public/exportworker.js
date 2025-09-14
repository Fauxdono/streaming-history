// exportworker.js
// Service Worker for background Excel and JSON export processing

// Import ExcelJS library for Excel exports
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
      // Determine export format
      const exportFormat = options?.format || 'excel';
      
      if (exportFormat === 'json') {
        // Handle JSON export
        await processJSONExport(data, options);
      } else {
        // Handle Excel export
        await processExcelExport(data, options);
      }
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
    `${hours}h ${remainingMinutes}min` : 
    `${remainingMinutes}min`;
}

// JSON Export Processing Function
async function processJSONExport(data, options) {
  // Send initial progress update
  updateProgress(0, "Initializing JSON export process...");
  
  const { 
    stats, 
    topArtists, 
    topAlbums, 
    processedData, 
    briefObsessions, 
    songsByYear, 
    rawPlayData,
    selectedSheets,
    isMobile,
    lowMemoryMode
  } = data;
  
  try {
    // Create the data structure to export based on selected sheets
    const exportData = {};
    
    // Add metadata
    exportData.metadata = {
      exportDate: new Date().toISOString(),
      exportType: "JSON Background Worker",
      totalEntries: stats.totalEntries,
      totalListeningTime: stats.totalListeningTime,
      serviceBreakdown: stats.serviceListeningTime
    };
    
    let currentProgress = 0;
    
    // Add selected data sections
    if (selectedSheets.summary) {
      exportData.summary = {
        stats: { ...stats }
      };
      currentProgress += 5;
      updateProgress(currentProgress, "Added summary data");
      await sleep(10);
    }
    
    if (selectedSheets.artists && topArtists) {
      // For large datasets, limit on mobile
      exportData.artists = isMobile ? 
        topArtists.slice(0, 1000) : 
        topArtists;
      
      currentProgress += 10;
      updateProgress(currentProgress, "Added artist data");
      await sleep(10);
    }
    
    if (selectedSheets.albums && topAlbums) {
      exportData.albums = isMobile ? 
        topAlbums.slice(0, 1000) : 
        topAlbums;
      
      currentProgress += 10;
      updateProgress(currentProgress, "Added album data");
      await sleep(10);
    }
    
    if (selectedSheets.tracks && processedData) {
      exportData.tracks = isMobile ? 
        processedData.slice(0, 2000) : 
        processedData;
      
      currentProgress += 10;
      updateProgress(currentProgress, "Added track data");
      await sleep(10);
    }
    
    if (selectedSheets.yearly && songsByYear) {
      // For yearly data, take most recent years for mobile
      const years = Object.keys(songsByYear).sort((a, b) => b - a);
      const yearsToInclude = isMobile ? years.slice(0, 5) : years;
      
      exportData.yearly = {};
      for (const year of yearsToInclude) {
        exportData.yearly[year] = isMobile ? 
          songsByYear[year]?.slice(0, 100) : 
          songsByYear[year];
      }
      
      currentProgress += 10;
      updateProgress(currentProgress, "Added yearly data");
      await sleep(10);
    }
    
    if (selectedSheets.obsessions && briefObsessions) {
      exportData.briefObsessions = isMobile ? 
        briefObsessions.slice(0, 500) : 
        briefObsessions;
      
      currentProgress += 10;
      updateProgress(currentProgress, "Added brief obsessions data");
      await sleep(10);
    }
    
    // For streaming history, we process ALL data in smaller chunks
    if (selectedSheets.history && rawPlayData && rawPlayData.length > 0) {
      updateProgress(currentProgress, `Processing complete streaming history (${rawPlayData.length.toLocaleString()} entries)...`);
      
      // Process streaming history in chunks to prevent memory issues
      exportData.streamingHistory = await processStreamingHistoryForJSON(
        rawPlayData, 
        currentProgress, 
        isMobile
      );
      
      currentProgress = 90; // After streaming history processing
    } else {
      // If no streaming history, jump ahead in progress
      currentProgress = 90;
    }
    
    updateProgress(95, "Generating JSON file...");
    
    // Create JSON with appropriate formatting
    // For smaller datasets or non-mobile, use pretty formatting
    const useIndent = rawPlayData.length < 50000 && !isMobile;
    const jsonString = JSON.stringify(exportData, null, useIndent ? 2 : 0);
    
    // Convert string to ArrayBuffer for transfer back to main thread
    const encoder = new TextEncoder();
    const jsonBuffer = encoder.encode(jsonString).buffer;
    
    // Send the completed file back to the main thread
    updateProgress(100, "JSON export complete!", null, jsonBuffer);
    
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error.message || 'Failed to create JSON export'
    });
  }
}

// Helper function to process streaming history for JSON
async function processStreamingHistoryForJSON(rawData, startProgress, isMobile) {
  const result = [];
  const totalEntries = rawData.length;
  
  // Use appropriate chunk size based on device
  const chunkSize = isMobile ? 500 : 2000;
  const totalChunks = Math.ceil(totalEntries / chunkSize);
  
  // Calculate how much progress this section gets (from current to 90%)
  const progressRange = 90 - startProgress;
  
  // Process in chunks
  for (let i = 0; i < totalEntries; i += chunkSize) {
    const chunk = rawData.slice(i, i + chunkSize);
    
    // Process each entry in chunk - preserve exact Spotify field names and structure
    chunk.forEach(entry => {
      // Create a clean copy of the original entry (exclude internal properties)
      const cleanEntry = { ...entry };
      
      // Remove any internal properties that might have been added during processing
      delete cleanEntry._dateObj;
      
      // Make sure we preserve all the critical Spotify fields exactly
      // If any are missing but we have alternative versions, map them back to Spotify format
      if (!cleanEntry.master_metadata_track_name && cleanEntry.track) {
        cleanEntry.master_metadata_track_name = cleanEntry.track;
      }
      
      if (!cleanEntry.master_metadata_album_artist_name && cleanEntry.artist) {
        cleanEntry.master_metadata_album_artist_name = cleanEntry.artist;
      }
      
      if (!cleanEntry.master_metadata_album_album_name && cleanEntry.album) {
        cleanEntry.master_metadata_album_album_name = cleanEntry.album;
      }
      
      result.push(cleanEntry);
    });
    
    // Calculate progress
    const chunkPercentComplete = (i + chunk.length) / totalEntries;
    const progress = Math.floor(startProgress + (progressRange * chunkPercentComplete));
    
    // Update progress - only update occasionally to reduce message overhead
    if (i === 0 || i + chunkSize >= totalEntries || i % (chunkSize * 5) === 0) {
      updateProgress(
        progress,
        `Processing streaming history... ${Math.min(100, Math.floor(chunkPercentComplete * 100))}%`
      );
    }
    
    // Yield to prevent blocking - sleep less often for better performance
    if (i % (chunkSize * 10) === 0) {
      await sleep(5);
    }
  }
  
  return result;
}

// Excel Export Processing Function
async function processExcelExport(data, options) {
  // Send initial progress update
  updateProgress(0, "Initializing Excel export process...");
  
  const { 
    stats, 
    topArtists, 
    topAlbums, 
    processedData, 
    briefObsessions, 
    songsByYear, 
    rawPlayData,
    selectedSheets,
    isMobile,
    lowMemoryMode
  } = data;
  
  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  
  try {
    // Calculate enabled sheet count for progress tracking
    const enabledSheetCount = getEnabledSheetCount(selectedSheets, songsByYear, briefObsessions, rawPlayData);
    
    // Calculate progress weights
    const historyWeight = selectedSheets.history ? (isMobile ? 8 : 5) : 0; // History is even heavier on mobile
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
      await addSummarySheet(workbook, stats, selectedSheets, rawPlayData, isMobile);
      
      // Update progress
      currentProgress += baseProgressPerSheet;
      updateProgress(currentProgress, "Summary sheet complete");
      
      // Yield to prevent blocking
      await sleep(50);
    }
    
    // Artists Sheet
    if (selectedSheets.artists && topArtists && topArtists.length > 0) {
      // Limit the number of artists on mobile to improve performance
      const artistLimit = isMobile ? Math.min(500, topArtists.length) : topArtists.length;
      
      await createStreamingSheet(
        workbook,
        'Top Artists',
        ['Rank', 'Artist', 'Total Time', 'Play Count', 'Average Time per Play'],
        topArtists.slice(0, artistLimit),
        currentProgress,
        currentProgress + baseProgressPerSheet,
        processArtistRow,
        isMobile
      );
      
      // Update progress
      currentProgress += baseProgressPerSheet;
      
      // Yield to prevent blocking
      await sleep(50);
    }
    
    // Albums Sheet
    if (selectedSheets.albums && topAlbums && topAlbums.length > 0) {
      // Limit the number of albums on mobile
      const albumLimit = isMobile ? Math.min(500, topAlbums.length) : topAlbums.length;
      
      await createStreamingSheet(
        workbook,
        'Top Albums',
        ['Rank', 'Album', 'Artist', 'Total Time', 'Play Count', 'Track Count', 'Average Time per Play'],
        topAlbums.slice(0, albumLimit),
        currentProgress,
        currentProgress + baseProgressPerSheet,
        processAlbumRow,
        isMobile
      );
      
      // Update progress
      currentProgress += baseProgressPerSheet;
      
      // Yield to prevent blocking
      await sleep(50);
    }
    
    // All-Time Top Tracks
    if (selectedSheets.tracks && processedData && processedData.length > 0) {
      // Limit the number of tracks on mobile
      const trackLimit = isMobile ? Math.min(1000, processedData.length) : 2000;
      
      await createStreamingSheet(
        workbook,
        'Top All-Time Tracks',
        ['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play'],
        processedData.slice(0, trackLimit),
        currentProgress,
        currentProgress + baseProgressPerSheet,
        processTrackRow,
        isMobile
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
      let years = Object.keys(songsByYear).sort((a, b) => b - a);
      
      // On mobile, limit to last 5 years to improve performance
      if (isMobile && years.length > 5) {
        years = years.slice(0, 5);
      }
      
      const yearCount = years.length;
      
      // Calculate progress increment per year
      const progressPerYear = baseProgressPerSheet / Math.max(yearCount, 1);
      
      // Process each year's data
      for (let i = 0; i < years.length; i++) {
        const year = years[i];
        const tracks = songsByYear[year];
        
        if (!tracks || tracks.length === 0) continue;
        
        // Limit tracks per year on mobile
        const yearlyTrackLimit = isMobile ? Math.min(100, tracks.length) : tracks.length;
        
        // Process this year's data
        await createStreamingSheet(
          workbook,
          `Top Tracks ${year}`,
          ['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play'],
          tracks.slice(0, yearlyTrackLimit),
          currentProgress + (i * progressPerYear),
          currentProgress + ((i + 1) * progressPerYear),
          processTrackRow,
          isMobile
        );
        
        // Yield between years
        await sleep(20);
      }
      
      // Update progress
      currentProgress += baseProgressPerSheet;
    }
    
    // Brief Obsessions
    if (selectedSheets.obsessions && briefObsessions && briefObsessions.length > 0) {
      // Limit obsessions on mobile
      const obsessionLimit = isMobile ? Math.min(100, briefObsessions.length) : briefObsessions.length;
      
      await createStreamingSheet(
        workbook,
        'Brief Obsessions',
        [
          'Rank', 'Track', 'Artist', 'Peak Week Start', 
          'Plays in Peak Week', 'Total Plays', 'Average Plays per Day in Peak Week'
        ],
        briefObsessions.slice(0, obsessionLimit),
        currentProgress,
        currentProgress + baseProgressPerSheet,
        processObsessionRow,
        isMobile
      );
      
      // Update progress
      currentProgress += baseProgressPerSheet;
      
      // Yield to prevent blocking
      await sleep(50);
    }
    
    // Complete Streaming History - This is where performance issues are most likely
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
      
      // OPTIMIZATIONS FOR MOBILE:
      // 1. Use much smaller batch sizes to prevent memory pressure
      // 2. Skip sorting to reduce memory usage
      // 3. Increase frequency of progress updates and yields
      
      let dataToProcess = rawPlayData;
      
      // Use smaller batch size on mobile
      const historyBatchSize = isMobile ? 50 : 200;
      const historyBatchCount = Math.ceil(dataToProcess.length / historyBatchSize);
      
      for (let batchIndex = 0; batchIndex < historyBatchCount; batchIndex++) {
        // Exit early if there's an error
        if (error) break;
        
        // Get this batch
        const start = batchIndex * historyBatchSize;
        const end = Math.min(start + historyBatchSize, dataToProcess.length);
        const batch = dataToProcess.slice(start, end);
        
        // On mobile, insert yield points more frequently to prevent freezing
        if (isMobile && batchIndex % 5 === 0) {
          await sleep(10);
        }
        
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
        
        // Calculate and update progress - more frequent updates on mobile
        const progressUpdateInterval = isMobile ? 2 : 5;
        if (batchIndex % progressUpdateInterval === 0 || batchIndex === historyBatchCount - 1) {
          const progress = currentProgress + ((batchIndex + 1) / historyBatchCount) * historyProgress;
          
          updateProgress(
            Math.floor(progress),
            `Processing streaming history... (${batchIndex + 1}/${historyBatchCount})`,
            'Streaming History'
          );
          
          // Longer yield on mobile to allow UI updates
          await sleep(isMobile ? 15 : 5);
        }
      }
      
      // Update progress
      currentProgress += historyProgress;
    }
    
    // Final formatting
    updateProgress(95, "Finalizing workbook...");
    
    // Apply minimal formatting to headers only
    // Skip extensive formatting on mobile to save memory and time
    if (!isMobile) {
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
    }
    
    updateProgress(98, "Generating Excel file...");
    
    // Generate the Excel binary data
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Send the completed file back to the main thread
    updateProgress(100, "Excel export complete!", null, buffer);
    
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
async function addSummarySheet(workbook, stats, selectedSheets, rawPlayData, isMobile) {
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
  summarySheet.addRow(['Export Method', 'Background Service Worker']);
  
  if (isMobile) {
    summarySheet.addRow(['Device Type', 'Mobile']);
    summarySheet.addRow(['Optimization', 'Mobile-optimized export']);
  }
  
  summarySheet.addRow(['Sheets Included', Object.entries(selectedSheets)
    .filter(([_, included]) => included)
    .map(([name]) => name.charAt(0).toUpperCase() + name.slice(1))
    .join(', ')
  ]);
  
  return summarySheet;
}

// Create streaming sheet with batch processing
async function createStreamingSheet(workbook, sheetTitle, headerRow, dataSource, progressStart, progressEnd, processRowCallback, isMobile) {
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
  
  // Determine batch size - use smaller batches on mobile
  const batchSize = isMobile ? 100 : 250;
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
    
    // Update progress less frequently on mobile to reduce message overhead
    const updateInterval = isMobile ? 5 : 1;
    if (batchIndex % updateInterval === 0 || batchIndex === totalBatches - 1) {
      updateProgress(
        Math.floor(progress), 
        `Processing ${sheetTitle}... (${batchIndex + 1}/${totalBatches})`,
        sheetTitle
      );
    }
    
    // Small yield to allow progress updates - longer on mobile
    if (batchIndex % (isMobile ? 2 : 10) === 0) {
      await sleep(isMobile ? 10 : 5);
    }
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
    album.trackCount || album.trackCountValue || 0,
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
    // Handle date parsing safely - just use ISO string if possible
    let dateStr;
    try {
      const date = play._dateObj || new Date(play.ts);
      dateStr = date.toISOString();
    } catch (e) {
      dateStr = String(play.ts || '');
    }

    // Get ISRC code if available
    let isrc = '';
    if (play.master_metadata_external_ids && play.master_metadata_external_ids.isrc) {
      isrc = play.master_metadata_external_ids.isrc;
    } else if (play.isrc) {
      isrc = play.isrc;
    }

    // Create row with all data
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
      isrc || '',
      play.spotify_track_uri || play.track_id || '',
      play.episode_name || '',
      play.episode_show_name || ''
    ];
  } catch (err) {
    // Very simple fallback row
    return [new Date().toISOString(), 'Error', '', '', 0, '', '', '', '', '', '', '', '', '', ''];
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

// Helper function to pause execution - variable timing based on mobile status
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Track if we have an error
let error = null;

// Handle errors globally to allow early termination
self.addEventListener('error', function(e) {
  error = e.message || 'Unknown worker error';
  self.postMessage({ 
    type: 'error', 
    error: error
  });
});