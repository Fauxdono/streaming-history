import React, { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { useTheme } from './themeprovider.js';

const PlaylistExporter = ({
  processedData,
  songsByYear,
  selectedYear = 'all',
  briefObsessions = [],
  colorTheme = 'blue',
  colorMode = 'minimal'
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [musicBasePath, setMusicBasePath] = useState('/Music/Downloads');
  const [playlistType, setPlaylistType] = useState('top');
  const [fileExtension, setFileExtension] = useState('mp3');
  const [exportMode, setExportMode] = useState('current'); // 'current' or 'all'
  const [exportCount, setExportCount] = useState(100); // How many tracks to export
  const [pathFormat, setPathFormat] = useState('default'); // 'default' or 'custom'
  const [customPathFormat, setCustomPathFormat] = useState('{basePath}/{artist}/{artist}-{album}/{track}.{ext}');
  const [sortMethod, setSortMethod] = useState('totalPlayed'); // 'totalPlayed' or 'playCount'

  // Use a ref to store the download queue to prevent issues with stale state
  const downloadQueueRef = useRef([]);
  // Use a ref to track if we're currently processing the queue
  const processingQueueRef = useRef(false);

  // Theme-aware color system
  const ct = colorTheme; // shorthand
  const modeColors = isColorful ? (isDarkMode ? {
    primary: `text-${ct}-300`,
    lighter: `text-${ct}-400`,
    bg: `bg-${ct}-900`,
    bgAccent: `bg-${ct}-800`,
    border: `border-${ct}-600`,
    ring: `ring-${ct}-500`,
    button: `bg-${ct}-600 hover:bg-${ct}-500 text-white`,
    buttonDisabled: `bg-${ct}-800 text-${ct}-500`,
    darkest: `text-${ct}-200`,
    input: `bg-${ct}-800 border-${ct}-600 text-${ct}-200`,
    option: `bg-${ct}-800 text-${ct}-200`,
    error: 'text-red-400 border-red-700 bg-red-900/50'
  } : {
    primary: `text-${ct}-700`,
    lighter: `text-${ct}-600`,
    bg: `bg-${ct}-50`,
    bgAccent: `bg-${ct}-100`,
    border: `border-${ct}-200`,
    ring: `ring-${ct}-500`,
    button: `bg-${ct}-600 hover:bg-${ct}-700 text-white`,
    buttonDisabled: `bg-${ct}-300 text-${ct}-500`,
    darkest: `text-${ct}-800`,
    input: `bg-white border-${ct}-200 text-${ct}-700`,
    option: `bg-${ct}-50 text-${ct}-700`,
    error: 'text-red-500 border-red-200 bg-red-50'
  }) : (isDarkMode ? {
    primary: 'text-white',
    lighter: 'text-gray-400',
    bg: 'bg-black',
    bgAccent: 'bg-black border border-[#4169E1]',
    border: 'border-[#4169E1]',
    ring: 'ring-[#4169E1]',
    button: 'bg-black text-white border border-[#4169E1] shadow-[2px_2px_0_0_#4169E1] hover:bg-gray-900',
    buttonDisabled: 'bg-gray-900 text-gray-600',
    darkest: 'text-white',
    input: 'bg-black border-[#4169E1] text-white',
    option: 'bg-black text-white',
    error: 'text-red-400 border-red-700 bg-red-900/50'
  } : {
    primary: 'text-black',
    lighter: 'text-gray-600',
    bg: 'bg-white',
    bgAccent: 'bg-white border border-black',
    border: 'border-black',
    ring: 'ring-black',
    button: 'bg-white text-black border border-black shadow-[2px_2px_0_0_black] hover:bg-gray-100',
    buttonDisabled: 'bg-gray-100 text-gray-400',
    darkest: 'text-black',
    input: 'bg-white border-black text-black',
    option: 'bg-white text-black',
    error: 'text-red-500 border-red-200 bg-red-50'
  });

  // Create M3U playlist content for a specific year or category
  const createM3UContent = (tracksToExport, yearLabel = null) => {
    if (!tracksToExport || tracksToExport.length === 0) {
      throw new Error('No tracks available for the selected criteria');
    }

    // Sort tracks by the chosen method before creating the playlist
    const sortedTracks = [...tracksToExport].sort((a, b) => b[sortMethod] - a[sortMethod]);

    // Create the M3U content
    let content = '#EXTM3U\n';

    sortedTracks.forEach((track, index) => {
      // Basic info line
      content += `#EXTINF:${Math.round(track.totalPlayed / 1000)},${track.artist} - ${track.trackName}\n`;

      // File path line - create a clean path without special characters
      const artist = cleanPathComponent(track.artist);
      const album = cleanPathComponent(track.albumName || 'Unknown Album');
      const trackName = cleanPathComponent(track.trackName);

      // Build the file path
      let filePath;

      if (pathFormat === 'default') {
        // Default format: BasePath/Artist/Artist-Album/Track.ext
        filePath = `${musicBasePath}/${artist}/${artist}-${album}/${trackName}.${fileExtension}`;
      } else {
        // Custom format using the template
        filePath = customPathFormat
          .replace('{basePath}', musicBasePath)
          .replace('{artist}', artist)
          .replace('{album}', album)
          .replace('{track}', trackName)
          .replace('{ext}', fileExtension)
          .replace('{index}', (index + 1).toString().padStart(3, '0')); // Add track number padding (001, 002, etc.)

        // Handle additional optional placeholders
        if (track.year) {
          filePath = filePath.replace('{year}', track.year);
        } else {
          filePath = filePath.replace('{year}', yearLabel || 'Unknown');
        }

        // If track has a specific ID in the data
        if (track.id) {
          filePath = filePath.replace('{id}', track.id);
        } else {
          filePath = filePath.replace('{id}', '');
        }
      }

      content += `${filePath}\n`;
    });

    return content;
  };

  // Helper function to clean path components for file system compatibility
  const cleanPathComponent = (text) => {
    if (!text) return 'Unknown';

    return text
      .replace(/[/\\?%*:|"<>]/g, '') // Remove characters not allowed in file paths
      .replace(/\s+/g, ' ')          // Normalize whitespace
      .trim();
  };

  // Process the download queue
  const processDownloadQueue = () => {
    // If we're already processing the queue or the queue is empty, do nothing
    if (processingQueueRef.current || downloadQueueRef.current.length === 0) {
      if (downloadQueueRef.current.length === 0) {
        setIsExporting(false);
        setExportProgress({ current: 0, total: 0 });
        processingQueueRef.current = false;
      }
      return;
    }

    // Mark that we're processing the queue
    processingQueueRef.current = true;

    // Process one item from the queue
    const item = downloadQueueRef.current[0];
    // Remove the first item from the queue
    downloadQueueRef.current = downloadQueueRef.current.slice(1);

    // Update progress
    setExportProgress(prev => ({
      current: prev.current + 1,
      total: prev.total
    }));

    // Download the file
    const blob = new Blob([item.content], { type: 'audio/x-mpegurl' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.filename;
    link.click();

    // Clean up the URL and process the next item after a delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      processingQueueRef.current = false;

      // Process the next item after a delay
      setTimeout(() => {
        if (downloadQueueRef.current.length > 0) {
          processDownloadQueue();
        } else {
          setIsExporting(false);
          setExportProgress({ current: 0, total: 0 });
        }
      }, 500);
    }, 100);
  };

  const exportPlaylist = async () => {
    // If already exporting, do nothing
    if (isExporting) return;

    setIsExporting(true);
    setError(null);

    // Clear the download queue
    downloadQueueRef.current = [];
    processingQueueRef.current = false;

    try {
      const timestamp = new Date().toISOString().split('T')[0];

      if (exportMode === 'current') {
        // Export just the currently selected playlist
        let tracks;
        let typeStr;
        let yearStr;

        if (playlistType === 'top') {
          // For top tracks, use selected year
          yearStr = selectedYear === 'all' ? 'all-time' : selectedYear;
          typeStr = 'top-tracks';

          // For all-time, show top 250, otherwise show top X of the year
          tracks = selectedYear === 'all'
            ? processedData.slice(0, exportCount)
            : (songsByYear[selectedYear] || []).slice(0, exportCount);
        } else {
          // For obsessions
          yearStr = 'all-time';
          typeStr = 'obsessions';
          tracks = briefObsessions.slice(0, exportCount);
        }

        if (!tracks || tracks.length === 0) {
          throw new Error('No tracks available for the selected criteria');
        }

        // Generate playlist content
        const playlistContent = createM3UContent(tracks, yearStr);

        // Generate filename
        const filename = `${typeStr}-${yearStr}-${timestamp}.m3u`;

        // Add to download queue
        downloadQueueRef.current.push({ content: playlistContent, filename });
      } else {
        // Export all years as separate playlists
        if (playlistType === 'top') {
          // Get all years with data
          const years = Object.keys(songsByYear)
            .filter(year => songsByYear[year] && songsByYear[year].length > 0)
            .sort((a, b) => b - a);

          if (years.length === 0) {
            throw new Error('No yearly data available for export');
          }

          // Create a playlist for each year
          for (const year of years) {
            const tracks = songsByYear[year].slice(0, exportCount);
            if (tracks.length > 0) {
              const playlistContent = createM3UContent(tracks, year);
              const filename = `top-tracks-${year}-${timestamp}.m3u`;
              downloadQueueRef.current.push({ content: playlistContent, filename });
            }
          }

          // Also create an all-time playlist if requested
          if (processedData.length > 0) {
            const allTimeTracks = processedData.slice(0, exportCount);
            const playlistContent = createM3UContent(allTimeTracks, 'all-time');
            const filename = `top-tracks-all-time-${timestamp}.m3u`;
            downloadQueueRef.current.push({ content: playlistContent, filename });
          }
        } else {
          // For obsessions, just create one playlist as there's no year division
          const tracks = briefObsessions.slice(0, exportCount);
          if (tracks.length > 0) {
            const playlistContent = createM3UContent(tracks);
            const filename = `obsessions-all-time-${timestamp}.m3u`;
            downloadQueueRef.current.push({ content: playlistContent, filename });
          } else {
            throw new Error('No brief obsessions data available for export');
          }
        }
      }

      // Set the progress state
      setExportProgress({ current: 0, total: downloadQueueRef.current.length });

      // Start processing the queue
      if (downloadQueueRef.current.length > 0) {
        setTimeout(() => {
          processDownloadQueue();
        }, 100);
      } else {
        throw new Error('No playlists to export. Please check your data and try again.');
      }
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export playlist. Please try again.');
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
      // Clear the queue on error
      downloadQueueRef.current = [];
      processingQueueRef.current = false;
    }
  };

  return (
    <div className={`space-y-4 p-4 ${modeColors.bg} rounded border ${modeColors.border} mb-6`}>
      <h3 className={`font-bold ${modeColors.primary}`}>Export M3U Playlist</h3>

      <div>
        <label className={`block ${modeColors.primary} mb-1`}>Base Music Path:</label>
        <input
          type="text"
          value={musicBasePath}
          onChange={(e) => setMusicBasePath(e.target.value)}
          className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${modeColors.ring} ${modeColors.input}`}
          placeholder="e.g. /Music/Downloads or C:/Music"
        />
        <p className={`text-xs ${modeColors.lighter} mt-1`}>
          This will be the base path for your music files in the exported playlist.
        </p>
      </div>

      <div>
        <label className={`block ${modeColors.primary} mb-1`}>Path Format:</label>
        <div className="flex gap-4 mb-2">
          <label className={`flex items-center ${modeColors.primary}`}>
            <input
              type="radio"
              checked={pathFormat === 'default'}
              onChange={() => setPathFormat('default')}
              className="mr-2"
            />
            <span>Default (BasePath/Artist/Artist-Album/Track.ext)</span>
          </label>
          <label className={`flex items-center ${modeColors.primary}`}>
            <input
              type="radio"
              checked={pathFormat === 'custom'}
              onChange={() => setPathFormat('custom')}
              className="mr-2"
            />
            <span>Custom Format</span>
          </label>
        </div>

        {pathFormat === 'custom' && (
          <div className="mt-2">
            <input
              type="text"
              value={customPathFormat}
              onChange={(e) => setCustomPathFormat(e.target.value)}
              className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${modeColors.ring} ${modeColors.input}`}
              placeholder="Custom path format"
            />
            <div className={`text-xs ${modeColors.lighter} mt-1`}>
              <p>Available placeholders:</p>
              <ul className={`list-disc list-inside ml-2 ${modeColors.lighter}`}>
                <li>{'{basePath}'} - Your base music path</li>
                <li>{'{artist}'} - Artist name</li>
                <li>{'{album}'} - Album name</li>
                <li>{'{track}'} - Track name</li>
                <li>{'{ext}'} - File extension</li>
                <li>{'{index}'} - Track number (001, 002, etc.)</li>
                <li>{'{year}'} - Year (if available)</li>
              </ul>
              <p className="mt-1">Example: {'{basePath}'}/Music by Artist/{'{artist}'} - {'{album}'}/{'{index}'} - {'{track}'}.{'{ext}'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={`block ${modeColors.primary} mb-1`}>File Extension:</label>
          <select
            value={fileExtension}
            onChange={(e) => setFileExtension(e.target.value)}
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 ${modeColors.ring} ${modeColors.input}`}
          >
            <option value="mp3" className={modeColors.option}>mp3</option>
            <option value="flac" className={modeColors.option}>flac</option>
            <option value="m4a" className={modeColors.option}>m4a</option>
            <option value="ogg" className={modeColors.option}>ogg</option>
            <option value="wav" className={modeColors.option}>wav</option>
          </select>
        </div>

        <div>
          <label className={`block ${modeColors.primary} mb-1`}>Max Tracks to Export:</label>
          <input
            type="number"
            min="1"
            max="69420"
            value={exportCount}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) setExportCount(Math.min(Math.max(val, 1), 69420));
            }}
            className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${modeColors.ring} ${modeColors.input}`}
          />
        </div>

        <div>
          <label className={`block ${modeColors.primary} mb-1`}>Sort Tracks By:</label>
          <select
            value={sortMethod}
            onChange={(e) => setSortMethod(e.target.value)}
            className={`px-3 py-2 border rounded focus:outline-none focus:ring-2 ${modeColors.ring} ${modeColors.input}`}
          >
            <option value="totalPlayed" className={modeColors.option}>Total Listening Time</option>
            <option value="playCount" className={modeColors.option}>Play Count</option>
          </select>
        </div>
      </div>

      <div>
        <label className={`block ${modeColors.primary} mb-1`}>Playlist Type:</label>
        <div className="flex gap-4">
          <label className={`flex items-center ${modeColors.primary}`}>
            <input
              type="radio"
              checked={playlistType === 'top'}
              onChange={() => setPlaylistType('top')}
              className="mr-2"
            />
            <span>Top Tracks</span>
          </label>
          <label className={`flex items-center ${modeColors.primary}`}>
            <input
              type="radio"
              checked={playlistType === 'obsessions'}
              onChange={() => setPlaylistType('obsessions')}
              className="mr-2"
            />
            <span>Brief Obsessions</span>
          </label>
        </div>
      </div>

      <div>
        <label className={`flex items-center ${modeColors.primary} text-xs sm:text-sm`}>Export Mode:</label>
        <div className="flex gap-4">
          <label className={`flex items-center ${modeColors.primary}`}>
            <input
              type="radio"
              checked={exportMode === 'current'}
              onChange={() => setExportMode('current')}
              className="mr-2"
            />
            <span>Current Selection {selectedYear !== 'all' ? `(${selectedYear})` : '(All-time)'}</span>
          </label>
          <label className={`flex items-center ${modeColors.primary}`}>
            <input
              type="radio"
              checked={exportMode === 'all'}
              onChange={() => setExportMode('all')}
              className="mr-2"
            />
            <span>All Years (Separate Files)</span>
          </label>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={exportPlaylist}
          disabled={isExporting}
          className={`flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm rounded ${isExporting ? modeColors.buttonDisabled + ' cursor-not-allowed' : modeColors.button}`}
        >
          <Download size={14} className="hidden sm:inline" />
          {isExporting
            ? `Exporting... ${exportProgress.current}/${exportProgress.total}`
            : 'Export Playlist'}
        </button>
      </div>

      {error && (
        <div className={`p-3 ${modeColors.error} border rounded`}>
          {error}
        </div>
      )}

      <div className={`text-sm ${modeColors.lighter} p-3 ${modeColors.bgAccent} rounded`}>
        <p className="font-medium">Path Preview:</p>
        <p className="font-mono mt-1">
          {pathFormat === 'default'
            ? `${musicBasePath}/Artist/Artist-Album/Track.${fileExtension}`
            : customPathFormat
                .replace('{basePath}', musicBasePath)
                .replace('{artist}', 'Artist')
                .replace('{album}', 'Album')
                .replace('{track}', 'Track')
                .replace('{ext}', fileExtension)
                .replace('{index}', '001')
                .replace('{year}', '2023')
          }
        </p>
        <p className={`mt-2 ${modeColors.primary}`}>
          {exportMode === 'current' ? (
            <>
              The playlist will include the top {exportCount} tracks from {selectedYear === 'all' ? 'all time' : selectedYear}
              {playlistType === 'obsessions' ? ' or your brief obsessions' : ''}, sorted by {sortMethod === 'totalPlayed' ? 'total listening time' : 'play count'}.
            </>
          ) : (
            <>
              This will export separate playlist files for each year plus an all-time playlist, with tracks sorted by {sortMethod === 'totalPlayed' ? 'total listening time' : 'play count'}.
              <span className={`block mt-1 ${modeColors.darkest}`}>Note: Files will download one after another with progress tracking.</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default PlaylistExporter;
