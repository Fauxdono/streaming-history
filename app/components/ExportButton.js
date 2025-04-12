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

  // Function to extract all songs from raw play data
  // This is used during initial statistics processing and remains synchronous
  const extractAllSongs = () => {
    if (!rawPlayData || rawPlayData.length === 0) {
      return processedData; // Fall back to regular processed data
    }
    
    // Track unique songs
    const songMap = new Map();
    
    // Process raw play data to extract all songs
    rawPlayData.forEach(entry => {
      if (entry.ms_played < 30000 || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) {
        return; // Skip invalid entries
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
    });
    
    // Convert map to array and sort by total time played
    return Array.from(songMap.values())
      .sort((a, b) => b.totalPlayed - a.totalPlayed);
  };

  // This async function is only used during export, not during initial processing
  const createWorkbookForExport = async () => {
    const workbook = new ExcelJS.Workbook();
    setExportProgress(5);
    
    // Summary Sheet
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

    setExportProgress(10);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Top Artists Sheet - with mobile limits if needed
    const artistLimit = isMobile ? Math.min(300, topArtists.length) : topArtists.length;
    const artistsSheet = workbook.addWorksheet('Top Artists');
    artistsSheet.addRow(['Top Artists']);
    artistsSheet.addRow([]);
    artistsSheet.addRow(['Rank', 'Artist', 'Total Time', 'Play Count', 'Average Time per Play']);
    
    // Add in batches on mobile
    const artistBatchSize = isMobile ? 50 : 500;
    for (let i = 0; i < artistLimit; i += artistBatchSize) {
      const batch = topArtists.slice(i, Math.min(i + artistBatchSize, artistLimit));
      batch.forEach((artist, index) => {
        artistsSheet.addRow([
          i + index + 1,
          artist.name,
          formatDuration(artist.totalPlayed),
          artist.playCount,
          formatDuration(artist.totalPlayed / artist.playCount)
        ]);
      });
      
      if (isMobile) {
        // Allow UI to update on mobile
        setExportProgress(10 + Math.floor((i / artistLimit) * 10));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    setExportProgress(20);
    
    // Top Albums Sheet - with mobile limits if needed
    const albumLimit = isMobile ? Math.min(300, topAlbums.length) : topAlbums.length;
    const albumsSheet = workbook.addWorksheet('Top Albums');
    albumsSheet.addRow(['Top Albums']);
    albumsSheet.addRow([]);
    albumsSheet.addRow(['Rank', 'Album', 'Artist', 'Total Time', 'Play Count', 'Track Count', 'Average Time per Play']);
    
    // Add in batches on mobile
    const albumBatchSize = isMobile ? 50 : 500;
    for (let i = 0; i < albumLimit; i += albumBatchSize) {
      const batch = topAlbums.slice(i, Math.min(i + albumBatchSize, albumLimit));
      batch.forEach((album, index) => {
        albumsSheet.addRow([
          i + index + 1,
          album.name,
          album.artist,
          formatDuration(album.totalPlayed),
          album.playCount,
          album.trackCount,
          formatDuration(album.totalPlayed / album.playCount)
        ]);
      });
      
      if (isMobile) {
        // Allow UI to update on mobile
        setExportProgress(20 + Math.floor((i / albumLimit) * 10));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    setExportProgress(30);

    // Process track data - get all songs for export with processing adjusted for mobile
    let allSongs;
    if (isMobile) {
      // On mobile, use a limited set directly from processedData
      allSongs = processedData.slice(0, 500);
      setExportProgress(40);
    } else {
      // On desktop, process the full dataset
      allSongs = extractAllSongs();
      setExportProgress(40);
    }

    // All-Time Top 2000 Sheet - with mobile-friendly limits
    const topLimit = isMobile ? 500 : 2000;
    const topTracksSheet = workbook.addWorksheet(`Top ${topLimit} All-Time`);
    topTracksSheet.addRow([`All-Time Top ${topLimit} Tracks`]);
    topTracksSheet.addRow([]);
    topTracksSheet.addRow(['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play']);
    
    // Add in batches, especially important on mobile
    const trackBatchSize = isMobile ? 50 : 200;
    for (let i = 0; i < Math.min(allSongs.length, topLimit); i += trackBatchSize) {
      const batch = allSongs.slice(i, Math.min(i + trackBatchSize, topLimit));
      batch.forEach((track, index) => {
        topTracksSheet.addRow([
          i + index + 1,
          track.trackName,
          track.artist,
          track.albumName || 'N/A',
          formatDuration(track.totalPlayed),
          track.playCount,
          formatDuration(track.totalPlayed / track.playCount)
        ]);
      });
      
      if (isMobile) {
        // Allow UI to update on mobile
        setExportProgress(40 + Math.floor((i / Math.min(allSongs.length, topLimit)) * 20));
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    setExportProgress(60);

    // Yearly Top 100s - skip on mobile or limit to recent years
    if (songsByYear && Object.keys(songsByYear).length > 0) {
      let years = Object.keys(songsByYear).sort((a, b) => b - a);
      
      // On mobile, limit to 3 most recent years
      if (isMobile && years.length > 3) {
        years = years.slice(0, 3);
      }
      
      for (let i = 0; i < years.length; i++) {
        const year = years[i];
        const tracks = songsByYear[year];
        
        if (!tracks || tracks.length === 0) continue;
        
        const yearSheet = workbook.addWorksheet(`Top 100 ${year}`);
        yearSheet.addRow([`Top 100 Tracks of ${year}`]);
        yearSheet.addRow([]);
        yearSheet.addRow(['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play']);
        
        // Add up to 100 tracks, or fewer on mobile
        const trackLimit = isMobile ? 50 : 100;
        tracks.slice(0, trackLimit).forEach((track, index) => {
          yearSheet.addRow([
            index + 1,
            track.trackName,
            track.artist,
            track.albumName || 'N/A',
            formatDuration(track.totalPlayed),
            track.playCount,
            formatDuration(track.totalPlayed / track.playCount)
          ]);
        });
        
        if (isMobile) {
          // Allow UI to update on mobile
          setExportProgress(60 + Math.floor((i / years.length) * 15));
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    
    setExportProgress(75);

    // Brief Obsessions Sheet - limited on mobile
    const obsessionLimit = isMobile ? 50 : briefObsessions.length;
    const obsessionsSheet = workbook.addWorksheet('Brief Obsessions');
    obsessionsSheet.addRow(['Brief Obsessions (Songs with intense listening periods)']);
    obsessionsSheet.addRow([]);
    obsessionsSheet.addRow(['Rank', 'Track', 'Artist', 'Peak Week Start', 'Plays in Peak Week', 'Total Plays', 'Average Plays per Day in Peak Week']);
    briefObsessions.slice(0, obsessionLimit).forEach((track, index) => {
      obsessionsSheet.addRow([
        index + 1,
        track.trackName,
        track.artist,
        track.intensePeriod.weekStart.toLocaleDateString(),
        track.intensePeriod.playsInWeek,
        track.playCount,
        (track.intensePeriod.playsInWeek / 7).toFixed(1)
      ]);
    });

    setExportProgress(85);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Complete Streaming History - only on non-mobile or limited on mobile
    if (rawPlayData && rawPlayData.length > 0) {
      // Limit rows on mobile
      const historyLimit = isMobile ? Math.min(500, rawPlayData.length) : rawPlayData.length;
      
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
  
        // Sort data chronologically
        const sortedData = [...rawPlayData].slice(0, historyLimit).sort((a, b) => {
          try {
            const dateA = a._dateObj || new Date(a.ts);
            const dateB = b._dateObj || new Date(b.ts);
            return dateA - dateB;
          } catch (e) {
            return 0;
          }
        });
  
        // Process in smaller batches
        const historyBatchSize = isMobile ? 50 : 500;
        for (let i = 0; i < sortedData.length; i += historyBatchSize) {
          const batch = sortedData.slice(i, Math.min(i + historyBatchSize, sortedData.length));
          
          // Add each play to the sheet
          batch.forEach(play => {
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
              console.error('Error processing row:', e);
            }
          });
          
          if (isMobile) {
            // Allow UI to update on mobile
            setExportProgress(85 + Math.floor((i / sortedData.length) * 15));
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
  
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
    
    setExportProgress(100);

    // Format all sheets - in smaller batches for mobile
    for (const sheet of workbook.worksheets) {
      // Style headers
      if (sheet.getRow(1)) sheet.getRow(1).font = { bold: true, size: 14 };
      if (sheet.getRow(3)) sheet.getRow(3).font = { bold: true };
    }

    return workbook;
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    setError(null);
    setExportProgress(0);

    try {
      const workbook = await createWorkbookForExport();
      
      // Generate filename with timestamp - changed to "cake dreamin" as requested
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `cake-dreamin-${timestamp}.xlsx`;

      // Export to blob and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      
      setExportProgress(0);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data. Please try again. Error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={exportToExcel}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors"
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
          <div className="overflow-hidden h-2 text-xs flex rounded bg-purple-200">
            <div 
              style={{ width: `${exportProgress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500 transition-all duration-300"
            ></div>
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {exportProgress < 100 
              ? 'Processing data in chunks to optimize memory usage...' 
              : 'Finalizing export...'}
          </div>
        </div>
      )}
      
      {isMobile && !isExporting && (
        <p className="text-xs text-purple-600">
          For mobile devices, export will include limited data to prevent browser crashes.
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