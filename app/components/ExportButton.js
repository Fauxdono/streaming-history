import React, { useState } from 'react';
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

  // Function to extract all songs from raw play data
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

  const createWorkbook = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Get all songs for export
    const allSongs = extractAllSongs();
    
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

    // Top Artists Sheet
    const artistsSheet = workbook.addWorksheet('Top Artists');
    artistsSheet.addRow(['Top Artists']);
    artistsSheet.addRow([]);
    artistsSheet.addRow(['Rank', 'Artist', 'Total Time', 'Play Count', 'Average Time per Play']);
    topArtists.forEach((artist, index) => {
      artistsSheet.addRow([
        index + 1,
        artist.name,
        formatDuration(artist.totalPlayed),
        artist.playCount,
        formatDuration(artist.totalPlayed / artist.playCount)
      ]);
    });

    // Top Albums Sheet
    const albumsSheet = workbook.addWorksheet('Top Albums');
    albumsSheet.addRow(['Top Albums']);
    albumsSheet.addRow([]);
    albumsSheet.addRow(['Rank', 'Album', 'Artist', 'Total Time', 'Play Count', 'Track Count', 'Average Time per Play']);
    topAlbums.forEach((album, index) => {
      albumsSheet.addRow([
        index + 1,
        album.name,
        album.artist,
        formatDuration(album.totalPlayed),
        album.playCount,
        album.trackCount,
        formatDuration(album.totalPlayed / album.playCount)
      ]);
    });

    // All-Time Top 2000 Sheet
    const tracks2000Sheet = workbook.addWorksheet('Top 2000 All-Time');
    tracks2000Sheet.addRow(['All-Time Top 2000 Tracks']);
    tracks2000Sheet.addRow([]);
    tracks2000Sheet.addRow(['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play']);
    allSongs.slice(0, 2000).forEach((track, index) => {
      tracks2000Sheet.addRow([
        index + 1,
        track.trackName,
        track.artist,
        track.albumName || 'N/A',
        formatDuration(track.totalPlayed),
        track.playCount,
        formatDuration(track.totalPlayed / track.playCount)
      ]);
    });

    // Yearly Top 100s
    if (songsByYear && Object.keys(songsByYear).length > 0) {
      Object.entries(songsByYear)
        .sort((a, b) => b[0] - a[0])
        .forEach(([year, tracks]) => {
        const yearSheet = workbook.addWorksheet(`Top 100 ${year}`);
        yearSheet.addRow([`Top 100 Tracks of ${year}`]);
        yearSheet.addRow([]);
        yearSheet.addRow(['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play']);
        tracks.slice(0, 100).forEach((track, index) => {
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
      });
    }

    // Brief Obsessions Sheet
    const obsessionsSheet = workbook.addWorksheet('Brief Obsessions');
    obsessionsSheet.addRow(['Brief Obsessions (Songs with intense listening periods)']);
    obsessionsSheet.addRow([]);
    obsessionsSheet.addRow(['Rank', 'Track', 'Artist', 'Peak Week Start', 'Plays in Peak Week', 'Total Plays', 'Average Plays per Day in Peak Week']);
    briefObsessions.forEach((track, index) => {
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

    // NEW SHEET: All Streaming History in chronological order
    if (rawPlayData && rawPlayData.length > 0) {
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
      const sortedData = [...rawPlayData].sort((a, b) => {
        try {
          const dateA = a._dateObj || new Date(a.ts);
          const dateB = b._dateObj || new Date(b.ts);
          return dateA - dateB;
        } catch (e) {
          return 0;
        }
      });

      // Add each play to the sheet
      sortedData.forEach(play => {
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

    // Format all sheets
    workbook.worksheets.forEach(sheet => {
      // Set default column widths if not already set
      if (!sheet.columns || sheet.columns.length === 0) {
        sheet.columns.forEach((column) => {
          column.width = 20;
        });
      }

      // Style headers
      sheet.getRow(1).font = { bold: true, size: 14 };
      sheet.getRow(3).font = { bold: true };

      // Add borders to data
      const dataStartRow = 4;
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber >= dataStartRow) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        }
      });
    });

    return workbook;
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const workbook = await createWorkbook();
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `streaming-history-analysis-${timestamp}.xlsx`;

      // Export to blob and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data. Please try again.');
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
        {isExporting ? 'Exporting...' : 'Export Complete History'}
      </button>
      
      {error && (
        <div className="p-4 text-red-500 border border-red-200 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ExportButton;