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
  formatDuration 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  const createWorkbook = async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Spotify Listening History Summary']);
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

    // All-Time Top 250 Sheet
    const tracks250Sheet = workbook.addWorksheet('Top 250 All-Time');
    tracks250Sheet.addRow(['All-Time Top 250 Tracks']);
    tracks250Sheet.addRow([]);
    tracks250Sheet.addRow(['Rank', 'Track', 'Artist', 'Album', 'Total Time', 'Play Count', 'Average Time per Play']);
    processedData.forEach((track, index) => {
      tracks250Sheet.addRow([
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

    // Format all sheets
    workbook.worksheets.forEach(sheet => {
      // Set column widths
      sheet.columns.forEach((column) => {
        column.width = 20;
      });

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
      const filename = `spotify-history-analysis-${timestamp}.xlsx`;

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
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={16} />
        {isExporting ? 'Exporting...' : 'Export to Excel'}
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