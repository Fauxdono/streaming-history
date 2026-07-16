import React, { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { useTheme } from './themeprovider.js';

const PlaylistExporter = ({
  processedData,
  songsByYear,
  selectedYear = 'all',
  briefObsessions = [],
  colorTheme = 'blue',
  colorMode = 'minimal',
  // Fixed by the host page (Songs exports top tracks, Obsessions exports
  // obsessions) — no longer a user-facing choice
  playlistType = 'top'
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [musicBasePath, setMusicBasePath] = useState('/Music/Downloads');
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

  // Theme-aware color system. Classes are STATIC per theme — Tailwind can't
  // see interpolated names like `text-${ct}-300`, so those never get built.
  const COLORFUL = {
    emerald: {
      dark: {
        primary: 'text-emerald-300', lighter: 'text-emerald-400', darkest: 'text-emerald-200',
        bg: 'bg-emerald-900', bgAccent: 'bg-emerald-800', border: 'border-emerald-600',
        shadow: 'shadow-[1px_1px_0_0_#059669]', accent: 'accent-emerald-400',
        button: 'bg-emerald-800 text-emerald-300 border border-emerald-600 shadow-[2px_2px_0_0_#059669] hover:bg-emerald-700',
        buttonDisabled: 'bg-emerald-900 text-emerald-600 border border-emerald-800',
        input: 'bg-emerald-800 border-emerald-600 text-emerald-200',
        option: 'bg-emerald-800 text-emerald-200',
        error: 'text-red-400 border-red-700 bg-red-900/50',
      },
      light: {
        primary: 'text-emerald-700', lighter: 'text-emerald-600', darkest: 'text-emerald-800',
        bg: 'bg-emerald-100', bgAccent: 'bg-emerald-50', border: 'border-emerald-300',
        shadow: 'shadow-[1px_1px_0_0_#047857]', accent: 'accent-emerald-600',
        button: 'bg-emerald-100 text-emerald-700 border border-emerald-700 shadow-[2px_2px_0_0_#047857] hover:bg-emerald-200',
        buttonDisabled: 'bg-emerald-50 text-emerald-400 border border-emerald-200',
        input: 'bg-emerald-50 border-emerald-300 text-emerald-800',
        option: 'bg-emerald-50 text-emerald-700',
        error: 'text-red-500 border-red-200 bg-red-50',
      },
    },
    yellow: {
      dark: {
        primary: 'text-yellow-300', lighter: 'text-yellow-400', darkest: 'text-yellow-200',
        bg: 'bg-yellow-900', bgAccent: 'bg-yellow-800', border: 'border-yellow-600',
        shadow: 'shadow-[1px_1px_0_0_#ca8a04]', accent: 'accent-yellow-400',
        button: 'bg-yellow-800 text-yellow-300 border border-yellow-600 shadow-[2px_2px_0_0_#ca8a04] hover:bg-yellow-700',
        buttonDisabled: 'bg-yellow-900 text-yellow-600 border border-yellow-800',
        input: 'bg-yellow-800 border-yellow-600 text-yellow-200',
        option: 'bg-yellow-800 text-yellow-200',
        error: 'text-red-400 border-red-700 bg-red-900/50',
      },
      light: {
        primary: 'text-yellow-700', lighter: 'text-yellow-600', darkest: 'text-yellow-800',
        bg: 'bg-yellow-100', bgAccent: 'bg-yellow-50', border: 'border-yellow-300',
        shadow: 'shadow-[1px_1px_0_0_#a16207]', accent: 'accent-yellow-600',
        button: 'bg-yellow-100 text-yellow-700 border border-yellow-700 shadow-[2px_2px_0_0_#a16207] hover:bg-yellow-200',
        buttonDisabled: 'bg-yellow-50 text-yellow-400 border border-yellow-200',
        input: 'bg-yellow-50 border-yellow-300 text-yellow-800',
        option: 'bg-yellow-50 text-yellow-700',
        error: 'text-red-500 border-red-200 bg-red-50',
      },
    },
    blue: {
      dark: {
        primary: 'text-blue-300', lighter: 'text-blue-400', darkest: 'text-blue-200',
        bg: 'bg-blue-900', bgAccent: 'bg-blue-800', border: 'border-blue-600',
        shadow: 'shadow-[1px_1px_0_0_#2563eb]', accent: 'accent-blue-400',
        button: 'bg-blue-800 text-blue-300 border border-blue-600 shadow-[2px_2px_0_0_#2563eb] hover:bg-blue-700',
        buttonDisabled: 'bg-blue-900 text-blue-600 border border-blue-800',
        input: 'bg-blue-800 border-blue-600 text-blue-200',
        option: 'bg-blue-800 text-blue-200',
        error: 'text-red-400 border-red-700 bg-red-900/50',
      },
      light: {
        primary: 'text-blue-700', lighter: 'text-blue-600', darkest: 'text-blue-800',
        bg: 'bg-blue-100', bgAccent: 'bg-blue-50', border: 'border-blue-300',
        shadow: 'shadow-[1px_1px_0_0_#1d4ed8]', accent: 'accent-blue-600',
        button: 'bg-blue-100 text-blue-700 border border-blue-700 shadow-[2px_2px_0_0_#1d4ed8] hover:bg-blue-200',
        buttonDisabled: 'bg-blue-50 text-blue-400 border border-blue-200',
        input: 'bg-blue-50 border-blue-300 text-blue-800',
        option: 'bg-blue-50 text-blue-700',
        error: 'text-red-500 border-red-200 bg-red-50',
      },
    },
  };

  const colorfulTheme = COLORFUL[colorTheme] || COLORFUL.blue;
  const modeColors = isColorful ? (isDarkMode ? colorfulTheme.dark : colorfulTheme.light) : (isDarkMode ? {
    primary: 'text-white',
    lighter: 'text-gray-400',
    bg: 'bg-black',
    bgAccent: 'bg-black border border-[#4169E1]',
    border: 'border-[#4169E1]',
    shadow: 'shadow-[1px_1px_0_0_#4169E1]',
    accent: 'accent-[#4169E1]',
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
    shadow: 'shadow-[1px_1px_0_0_black]',
    accent: 'accent-black',
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

  const labelCls = `block text-xs font-medium mb-1 ${modeColors.primary}`;
  // search-input-sm keeps the mobile anti-zoom 16px font but scales the box
  // so these read text-xs on phones, same as desktop
  const inputCls = `search-input-sm w-full px-2 py-1 text-xs rounded border focus:outline-none ${modeColors.input} ${modeColors.shadow}`;
  const radioCls = `flex items-center gap-1.5 text-xs ${modeColors.primary}`;

  return (
    <div className={`space-y-3 p-3 rounded-lg border mb-4 ${modeColors.bg} ${modeColors.border} ${modeColors.shadow}`}>
      <h3 className={`text-sm font-semibold ${modeColors.primary}`}>export m3u playlist</h3>

      <div>
        <label className={labelCls}>Base music path</label>
        <input
          type="text"
          value={musicBasePath}
          onChange={(e) => setMusicBasePath(e.target.value)}
          className={inputCls}
          placeholder="e.g. /Music/Downloads or C:/Music"
        />
        <p className={`text-xs ${modeColors.lighter} mt-1`}>
          Base path for your music files in the exported playlist.
        </p>
      </div>

      <div>
        <label className={labelCls}>Path format</label>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <label className={radioCls}>
            <input
              type="radio"
              checked={pathFormat === 'default'}
              onChange={() => setPathFormat('default')}
              className={modeColors.accent}
            />
            <span>Default (BasePath/Artist/Artist-Album/Track.ext)</span>
          </label>
          <label className={radioCls}>
            <input
              type="radio"
              checked={pathFormat === 'custom'}
              onChange={() => setPathFormat('custom')}
              className={modeColors.accent}
            />
            <span>Custom format</span>
          </label>
        </div>

        {pathFormat === 'custom' && (
          <div className="mt-2">
            <input
              type="text"
              value={customPathFormat}
              onChange={(e) => setCustomPathFormat(e.target.value)}
              className={inputCls}
              placeholder="Custom path format"
            />
            <div className={`text-xs ${modeColors.lighter} mt-1`}>
              <p>Placeholders: {'{basePath}'}, {'{artist}'}, {'{album}'}, {'{track}'}, {'{ext}'}, {'{index}'} (001, 002, …), {'{year}'}</p>
              <p className="mt-1">Example: {'{basePath}'}/Music by Artist/{'{artist}'} - {'{album}'}/{'{index}'} - {'{track}'}.{'{ext}'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>File extension</label>
          <select
            value={fileExtension}
            onChange={(e) => setFileExtension(e.target.value)}
            className={inputCls}
          >
            <option value="mp3" className={modeColors.option}>mp3</option>
            <option value="flac" className={modeColors.option}>flac</option>
            <option value="m4a" className={modeColors.option}>m4a</option>
            <option value="ogg" className={modeColors.option}>ogg</option>
            <option value="wav" className={modeColors.option}>wav</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Max tracks</label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="69420"
            value={exportCount}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val)) setExportCount(Math.min(Math.max(val, 1), 69420));
            }}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Sort tracks by</label>
          <select
            value={sortMethod}
            onChange={(e) => setSortMethod(e.target.value)}
            className={inputCls}
          >
            <option value="totalPlayed" className={modeColors.option}>Total Listening Time</option>
            <option value="playCount" className={modeColors.option}>Play Count</option>
          </select>
        </div>
      </div>

      {/* Obsessions export is always one all-time file, so the mode choice
          only exists for top tracks */}
      {playlistType === 'top' && (
        <div>
          <label className={labelCls}>Export mode</label>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <label className={radioCls}>
              <input
                type="radio"
                checked={exportMode === 'current'}
                onChange={() => setExportMode('current')}
                className={modeColors.accent}
              />
              <span>Current selection {selectedYear !== 'all' ? `(${selectedYear})` : '(all-time)'}</span>
            </label>
            <label className={radioCls}>
              <input
                type="radio"
                checked={exportMode === 'all'}
                onChange={() => setExportMode('all')}
                className={modeColors.accent}
              />
              <span>All years (separate files)</span>
            </label>
          </div>
        </div>
      )}

      {error && (
        <div className={`p-2 text-xs ${modeColors.error} border rounded`}>
          {error}
        </div>
      )}

      <div className={`text-xs ${modeColors.lighter} p-2 ${modeColors.bgAccent} rounded ${modeColors.shadow}`}>
        <p className={`font-mono truncate ${modeColors.primary}`} title="Path preview">
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
        <p className="mt-1">
          {playlistType === 'obsessions'
            ? `Top ${exportCount} brief obsessions, sorted by ${sortMethod === 'totalPlayed' ? 'total listening time' : 'play count'}.`
            : exportMode === 'current'
              ? `Top ${exportCount} tracks from ${selectedYear === 'all' ? 'all time' : selectedYear}, sorted by ${sortMethod === 'totalPlayed' ? 'total listening time' : 'play count'}.`
              : `Separate playlist files per year plus an all-time playlist, sorted by ${sortMethod === 'totalPlayed' ? 'total listening time' : 'play count'}; files download one after another.`}
        </p>
      </div>

      <button
        onClick={exportPlaylist}
        disabled={isExporting}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isExporting ? modeColors.buttonDisabled + ' cursor-not-allowed shadow-none' : modeColors.button}`}
      >
        <Download size={12} />
        {isExporting
          ? `Exporting… ${exportProgress.current}/${exportProgress.total}`
          : 'export playlist'}
      </button>
    </div>
  );
};

export default PlaylistExporter;
