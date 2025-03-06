import React, { useState } from 'react';
import { Download } from 'lucide-react';

const PlaylistExporter = ({ 
  processedData, 
  songsByYear, 
  selectedYear = 'all',
  briefObsessions = []
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [musicBasePath, setMusicBasePath] = useState('/Music/Downloads');
  const [playlistType, setPlaylistType] = useState('top');
  const [fileExtension, setFileExtension] = useState('mp3');
  const [exportMode, setExportMode] = useState('current'); // 'current' or 'all'
  const [exportCount, setExportCount] = useState(100); // How many tracks to export
  const [pathFormat, setPathFormat] = useState('default'); // 'default' or 'custom'
  const [customPathFormat, setCustomPathFormat] = useState('{basePath}/{artist}/{album}/{track}.{ext}');

  // Create M3U playlist content for a specific year or category
  const createM3UContent = (tracksToExport, yearLabel = null) => {
    if (!tracksToExport || tracksToExport.length === 0) {
      throw new Error('No tracks available for the selected criteria');
    }
    
    // Create the M3U content
    let content = '#EXTM3U\n';
    
    tracksToExport.forEach((track, index) => {
      // Basic info line
      content += `#EXTINF:${Math.round(track.totalPlayed / 1000)},${track.artist} - ${track.trackName}\n`;
      
      // File path line - create a clean path without special characters
      const artist = cleanPathComponent(track.artist);
      const album = cleanPathComponent(track.albumName || 'Unknown Album');
      const trackName = cleanPathComponent(track.trackName);
      
      // Build the file path
      let filePath;
      
      if (pathFormat === 'default') {
        // Default format: BasePath/Artist/Album/Track.ext
        filePath = `${musicBasePath}/${artist}/${album}/${trackName}.${fileExtension}`;
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

  const exportPlaylist = async () => {
    setIsExporting(true);
    setError(null);

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
            ? processedData.slice(0, exportCount === 250 ? 250 : 100) 
            : (songsByYear[selectedYear] || []).slice(0, exportCount);
        } else {
          // For obsessions
          yearStr = 'all-time';
          typeStr = 'obsessions';
          tracks = briefObsessions.slice(0, exportCount);
        }
        
        // Generate playlist content
        const playlistContent = createM3UContent(tracks, yearStr);
        
        // Generate filename
        const filename = `${typeStr}-${yearStr}-${timestamp}.m3u`;
        
        // Download the file
        downloadPlaylist(playlistContent, filename);
      } else {
        // Export all years as separate playlists
        if (playlistType === 'top') {
          // Get all years
          const years = Object.keys(songsByYear).sort((a, b) => b - a);
          
          // Create and download a playlist for each year
          for (const year of years) {
            const tracks = songsByYear[year].slice(0, exportCount);
            const playlistContent = createM3UContent(tracks, year);
            const filename = `top-tracks-${year}-${timestamp}.m3u`;
            downloadPlaylist(playlistContent, filename);
          }
          
          // Also create an all-time playlist if requested
          if (processedData.length > 0) {
            const allTimeTracks = processedData.slice(0, exportCount === 250 ? 250 : 100);
            const playlistContent = createM3UContent(allTimeTracks, 'all-time');
            const filename = `top-tracks-all-time-${timestamp}.m3u`;
            downloadPlaylist(playlistContent, filename);
          }
        } else {
          // For obsessions, just create one playlist as there's no year division
          const tracks = briefObsessions.slice(0, exportCount);
          const playlistContent = createM3UContent(tracks);
          const filename = `obsessions-all-time-${timestamp}.m3u`;
          downloadPlaylist(playlistContent, filename);
        }
      }
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export playlist. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Helper function to download a playlist file
  const downloadPlaylist = (content, filename) => {
    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded border border-blue-200 mb-6">
      <h3 className="font-bold text-blue-700">Export M3U Playlist</h3>
      
      <div>
        <label className="block text-blue-700 mb-1">Base Music Path:</label>
        <input
          type="text"
          value={musicBasePath}
          onChange={(e) => setMusicBasePath(e.target.value)}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. /Music/Downloads or C:/Music"
        />
        <p className="text-xs text-blue-600 mt-1">
          This will be the base path for your music files in the exported playlist.
        </p>
      </div>
      
      <div>
        <label className="block text-blue-700 mb-1">Path Format:</label>
        <div className="flex gap-4 mb-2">
          <label className="flex items-center">
            <input
              type="radio"
              checked={pathFormat === 'default'}
              onChange={() => setPathFormat('default')}
              className="mr-2"
            />
            <span>Default (BasePath/Artist/Album/Track.ext)</span>
          </label>
          <label className="flex items-center">
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
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Custom path format"
            />
            <div className="text-xs text-blue-600 mt-1">
              <p>Available placeholders:</p>
              <ul className="list-disc list-inside ml-2">
                <li>{'{basePath}'} - Your base music path</li>
                <li>{'{artist}'} - Artist name</li>
                <li>{'{album}'} - Album name</li>
                <li>{'{track}'} - Track name</li>
                <li>{'{ext}'} - File extension</li>
                <li>{'{index}'} - Track number (001, 002, etc.)</li>
                <li>{'{year}'} - Year (if available)</li>
              </ul>
              <p className="mt-1">Example: {'{basePath}'}/Music/{'{artist}'} - {'{album}'}/{'{index}'} - {'{track}'}.{'{ext}'}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-blue-700 mb-1">File Extension:</label>
          <select
            value={fileExtension}
            onChange={(e) => setFileExtension(e.target.value)}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="mp3">mp3</option>
            <option value="flac">flac</option>
            <option value="m4a">m4a</option>
            <option value="ogg">ogg</option>
            <option value="wav">wav</option>
          </select>
        </div>
        
        <div>
          <label className="block text-blue-700 mb-1">Max Tracks to Export:</label>
          <select
            value={exportCount}
            onChange={(e) => setExportCount(parseInt(e.target.value))}
            className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="100">Top 100</option>
            <option value="250">Top 250 (All-time only)</option>
          </select>
        </div>
      </div>
      
      <div>
        <label className="block text-blue-700 mb-1">Playlist Type:</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={playlistType === 'top'}
              onChange={() => setPlaylistType('top')}
              className="mr-2"
            />
            <span>Top Tracks</span>
          </label>
          <label className="flex items-center">
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
        <label className="block text-blue-700 mb-1">Export Mode:</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={exportMode === 'current'}
              onChange={() => setExportMode('current')}
              className="mr-2"
            />
            <span>Current Selection {selectedYear !== 'all' ? `(${selectedYear})` : '(All-time)'}</span>
          </label>
          <label className="flex items-center">
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={16} />
          {isExporting ? 'Exporting...' : 'Export M3U Playlist'}
        </button>
      </div>
      
      {error && (
        <div className="p-3 text-red-500 border border-red-200 rounded bg-red-50">
          {error}
        </div>
      )}
      
      <div className="text-sm text-blue-600 p-3 bg-blue-100 rounded">
        <p className="font-medium">Path Preview:</p>
        <p className="font-mono mt-1">
          {pathFormat === 'default' 
            ? `${musicBasePath}/Artist/Album/Track.${fileExtension}`
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
        <p className="mt-2">
          {exportMode === 'current' ? (
            <>
              The playlist will include the {exportCount === 250 && selectedYear === 'all' ? 'top 250' : 'top 100'} tracks from {selectedYear === 'all' ? 'all time' : selectedYear} 
              {playlistType === 'obsessions' ? ' or your brief obsessions' : ''}.
            </>
          ) : (
            <>
              This will export separate playlist files for each year plus an all-time playlist.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default PlaylistExporter;