import React, { useState, useMemo } from 'react';
import { Download, Plus, Trash2, Save, Music, Filter } from 'lucide-react';

const CustomPlaylistCreator = ({ 
  processedData = [], 
  formatDuration,
  rawPlayData = []
}) => {
  const [playlistName, setPlaylistName] = useState('My Custom Playlist');
  const [searchTerm, setSearchTerm] = useState('');
  const [creationMode, setCreationMode] = useState('manual'); // 'manual' or 'smart'
  const [smartRules, setSmartRules] = useState([
    { type: 'artist', operator: 'contains', value: '', id: Date.now() }
  ]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [musicBasePath, setMusicBasePath] = useState('/Music/Downloads');
  const [fileExtension, setFileExtension] = useState('mp3');
  const [pathFormat, setPathFormat] = useState('default');
  const [customPathFormat, setCustomPathFormat] = useState('{basePath}/{artist}/{artist}-{album}/{track}.{ext}');
  const [savedPlaylists, setSavedPlaylists] = useState([]);
  const [activeTab, setActiveTab] = useState('create');
  
  // Combine all tracks from processedData for searching
  const allTracks = useMemo(() => {
    return processedData.map(track => ({
      ...track,
      id: `${track.trackName}-${track.artist}`
    }));
  }, [processedData]);
  
  // Filter tracks based on search term
  const filteredTracks = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return allTracks
      .filter(track => 
        track.trackName.toLowerCase().includes(term) || 
        track.artist.toLowerCase().includes(term) ||
        (track.albumName && track.albumName.toLowerCase().includes(term))
      )
      .slice(0, 20); // Limit to 20 results for performance
  }, [searchTerm, allTracks]);
  
  // Add track to selection
  const addTrack = (track) => {
    if (!selectedTracks.some(t => t.id === track.id)) {
      setSelectedTracks(prev => [...prev, track]);
    }
    setSearchTerm('');
  };
  
  // Add a smart rule
  const addRule = () => {
    setSmartRules(prev => [
      ...prev, 
      { type: 'artist', operator: 'contains', value: '', id: Date.now() }
    ]);
  };
  
  // Update a smart rule
  const updateRule = (id, field, value) => {
    setSmartRules(prev => 
      prev.map(rule => 
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    );
  };
  
  // Remove a smart rule
  const removeRule = (id) => {
    setSmartRules(prev => prev.filter(rule => rule.id !== id));
  };
  
  // Generate a playlist from rules
  const generateFromRules = () => {
    // Filter tracks based on all rules (AND logic)
    const filteredTracks = allTracks.filter(track => {
      return smartRules.every(rule => {
        const value = rule.value.toLowerCase();
        
        // Skip empty rules
        if (!value) return true;
        
        switch(rule.type) {
          case 'artist':
            return applyOperator(track.artist.toLowerCase(), rule.operator, value);
          case 'album':
            return track.albumName && applyOperator(track.albumName.toLowerCase(), rule.operator, value);
          case 'track':
            return applyOperator(track.trackName.toLowerCase(), rule.operator, value);
          case 'playCount':
            return applyOperator(track.playCount, rule.operator, parseInt(value) || 0);
          case 'playTime':
            return applyOperator(track.totalPlayed / 60000, rule.operator, parseInt(value) || 0);
          default:
            return true;
        }
      });
    });
    
    // Limit to 100 tracks to avoid excessive lists
    setSelectedTracks(filteredTracks.slice(0, 100));
  };
  
  // Helper function to apply operators
  const applyOperator = (fieldValue, operator, ruleValue) => {
    switch(operator) {
      case 'contains':
        return String(fieldValue).includes(ruleValue);
      case 'equals':
        return String(fieldValue) === ruleValue;
      case 'startsWith':
        return String(fieldValue).startsWith(ruleValue);
      case 'endsWith':
        return String(fieldValue).endsWith(ruleValue);
      case 'greaterThan':
        return Number(fieldValue) > Number(ruleValue);
      case 'lessThan':
        return Number(fieldValue) < Number(ruleValue);
      default:
        return true;
    }
  };
  
  // Remove track from selection
  const removeTrack = (trackId) => {
    setSelectedTracks(prev => prev.filter(track => track.id !== trackId));
  };
  
  // Reorder tracks
  const moveTrack = (index, direction) => {
    const newTracks = [...selectedTracks];
    
    if (direction === 'up' && index > 0) {
      [newTracks[index], newTracks[index - 1]] = [newTracks[index - 1], newTracks[index]];
      setSelectedTracks(newTracks);
    } else if (direction === 'down' && index < selectedTracks.length - 1) {
      [newTracks[index], newTracks[index + 1]] = [newTracks[index + 1], newTracks[index]];
      setSelectedTracks(newTracks);
    }
  };
  
  // Helper function to clean path components for file system compatibility
  const cleanPathComponent = (text) => {
    if (!text) return 'Unknown';
    
    return text
      .replace(/[/\\?%*:|"<>]/g, '') // Remove characters not allowed in file paths
      .replace(/\s+/g, ' ')          // Normalize whitespace
      .trim();
  };
  
  // Create M3U playlist content
  const createM3UContent = () => {
    if (selectedTracks.length === 0) {
      return '';
    }
    
    // Create the M3U content
    let content = '#EXTM3U\n';
    
    selectedTracks.forEach((track, index) => {
      // Basic info line
      content += `#EXTINF:${Math.round(track.totalPlayed / (track.playCount * 1000))},${track.artist} - ${track.trackName}\n`;
      
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
          .replace('{index}', (index + 1).toString().padStart(3, '0'));
      }
      
      content += `${filePath}\n`;
    });
    
    return content;
  };
  
  // Export the playlist
  const exportPlaylist = () => {
    const content = createM3UContent();
    if (!content) {
      alert('Please add tracks to your playlist first');
      return;
    }
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedPlaylistName = playlistName.replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${sanitizedPlaylistName}-${timestamp}.m3u`;
    
    // Download the file
    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };
  
  // Save the current playlist
  const savePlaylist = () => {
    if (selectedTracks.length === 0) {
      alert('Please add tracks to your playlist first');
      return;
    }
    
    const newPlaylist = {
      id: Date.now().toString(),
      name: playlistName,
      tracks: selectedTracks,
      created: new Date().toISOString()
    };
    
    setSavedPlaylists(prev => [...prev, newPlaylist]);
    
    // Optional: Save to localStorage for persistence
    try {
      const existingPlaylists = JSON.parse(localStorage.getItem('savedPlaylists') || '[]');
      localStorage.setItem('savedPlaylists', JSON.stringify([...existingPlaylists, newPlaylist]));
    } catch (e) {
      console.warn('Failed to save playlist to localStorage:', e);
    }
  };
  
  // Load saved playlists from localStorage on mount
  React.useEffect(() => {
    try {
      const storedPlaylists = JSON.parse(localStorage.getItem('savedPlaylists') || '[]');
      if (storedPlaylists.length > 0) {
        setSavedPlaylists(storedPlaylists);
      }
    } catch (e) {
      console.warn('Failed to load playlists from localStorage:', e);
    }
  }, []);
  
  // Delete a saved playlist
  const deletePlaylist = (playlistId) => {
    setSavedPlaylists(prev => prev.filter(playlist => playlist.id !== playlistId));
    
    // Update localStorage
    try {
      const existingPlaylists = JSON.parse(localStorage.getItem('savedPlaylists') || '[]');
      localStorage.setItem('savedPlaylists', 
        JSON.stringify(existingPlaylists.filter(playlist => playlist.id !== playlistId))
      );
    } catch (e) {
      console.warn('Failed to update localStorage:', e);
    }
  };
  
  // Load a saved playlist
  const loadPlaylist = (playlist) => {
    setPlaylistName(playlist.name);
    setSelectedTracks(playlist.tracks);
    setActiveTab('create');
  };
  
  // Track stats
  const totalDuration = useMemo(() => {
    return selectedTracks.reduce((total, track) => total + (track.totalPlayed / track.playCount), 0);
  }, [selectedTracks]);
  
  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'create' 
              ? 'text-red-600 border-b-2 border-red-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Create Playlist
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'saved' 
              ? 'text-red-600 border-b-2 border-red-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Saved Playlists ({savedPlaylists.length})
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'export' 
              ? 'text-red-600 border-b-2 border-red-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Export Settings
        </button>
      </div>
      
      {activeTab === 'create' && (
        <div className="space-y-4">
          {/* Playlist Name */}
          <div>
            <label className="block text-red-700 mb-1">Playlist Name:</label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Enter playlist name"
            />
          </div>
          
          {/* Creation Mode Switch */}
          <div className="flex border-b mb-4">
            <button
              onClick={() => setCreationMode('manual')}
              className={`px-4 py-2 font-medium ${
                creationMode === 'manual' 
                  ? 'bg-red-50 text-red-600 border-b-2 border-red-600' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              Manual Selection
            </button>
            <button
              onClick={() => setCreationMode('smart')}
              className={`px-4 py-2 font-medium ${
                creationMode === 'smart' 
                  ? 'bg-red-50 text-red-600 border-b-2 border-red-600' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              Smart Playlist
            </button>
          </div>
          
          {creationMode === 'manual' ? (
            /* Track Search */
            <div>
              <label className="block text-red-700 mb-1">Search for tracks to add:</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Search by track name, artist or album..."
                />
                
                {filteredTracks.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredTracks.map(track => (
                      <div 
                        key={track.id}
                        onClick={() => addTrack(track)}
                        className="px-4 py-2 hover:bg-red-50 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium">{track.trackName}</div>
                          <div className="text-sm text-red-600">
                            {track.artist} {track.albumName ? `• ${track.albumName}` : ''}
                          </div>
                        </div>
                        <button className="text-red-600 hover:text-red-800">
                          <Plus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Smart Rules */
            <div className="space-y-4 border p-4 rounded bg-red-50">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-red-700">Smart Playlist Rules</h4>
                <div className="text-sm text-red-600">All rules must match (AND logic)</div>
              </div>
              
              {smartRules.map((rule) => (
                <div key={rule.id} className="flex flex-wrap gap-2 items-center border-b pb-3">
                  <select
                    value={rule.type}
                    onChange={(e) => updateRule(rule.id, 'type', e.target.value)}
                    className="px-3 py-2 border rounded"
                  >
                    <option value="artist">Artist</option>
                    <option value="album">Album</option>
                    <option value="track">Track Name</option>
                    <option value="playCount">Play Count</option>
                    <option value="playTime">Play Time (minutes)</option>
                  </select>
                  
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                    className="px-3 py-2 border rounded"
                  >
                    {(rule.type === 'artist' || rule.type === 'album' || rule.type === 'track') ? (
                      <>
                        <option value="contains">contains</option>
                        <option value="equals">equals</option>
                        <option value="startsWith">starts with</option>
                        <option value="endsWith">ends with</option>
                      </>
                    ) : (
                      <>
                        <option value="greaterThan">greater than</option>
                        <option value="lessThan">less than</option>
                        <option value="equals">equals</option>
                      </>
                    )}
                  </select>
                  
                  <input
                    type={rule.type === 'playCount' || rule.type === 'playTime' ? 'number' : 'text'}
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded"
                    placeholder={`Enter ${rule.type} value...`}
                    min={rule.type === 'playCount' || rule.type === 'playTime' ? "0" : undefined}
                  />
                  
                  <button 
                    onClick={() => removeRule(rule.id)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              
              <div className="flex justify-between">
                <button
                  onClick={addRule}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  <Plus size={16} className="inline mr-1" /> Add Rule
                </button>
                
                <button
                  onClick={generateFromRules}
                  disabled={smartRules.every(rule => !rule.value)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  <Filter size={16} className="inline mr-1" /> Generate Playlist
                </button>
              </div>
            </div>
          )}
          
          {/* Selected Tracks */}
          <div>
            <div className="flex justify-between items-center">
              <div className="font-bold text-red-700">
                Selected Tracks ({selectedTracks.length})
              </div>
              <div className="text-sm text-red-600">
                Total Duration: {formatDuration(totalDuration)}
              </div>
            </div>
            
            {selectedTracks.length > 0 ? (
              <div className="mt-2 border rounded overflow-hidden">
                {selectedTracks.map((track, index) => (
                  <div 
                    key={track.id}
                    className={`p-2 flex justify-between items-center ${
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className="text-red-500 mr-2">{index + 1}.</div>
                      <div>
                        <div className="font-medium">{track.trackName}</div>
                        <div className="text-sm text-red-600">
                          {track.artist} {track.albumName ? `• ${track.albumName}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => moveTrack(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-red-600 hover:text-red-800 disabled:text-gray-400"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button 
                        onClick={() => moveTrack(index, 'down')}
                        disabled={index === selectedTracks.length - 1}
                        className="p-1 text-red-600 hover:text-red-800 disabled:text-gray-400"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button 
                        onClick={() => removeTrack(track.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Remove track"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 p-4 text-center text-gray-500 border border-dashed rounded">
                No tracks selected. Search for tracks to add them to your playlist.
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={savePlaylist}
              disabled={selectedTracks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              Save Playlist
            </button>
            <button
              onClick={exportPlaylist}
              disabled={selectedTracks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              <Download size={16} />
              Export as M3U
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <h3 className="font-bold text-red-700">Saved Playlists</h3>
          
          {savedPlaylists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedPlaylists.map(playlist => (
                <div key={playlist.id} className="border rounded p-4 hover:border-red-400">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-red-600">{playlist.name}</h4>
                    <div className="text-sm text-gray-500">
                      {new Date(playlist.created).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {playlist.tracks.length} tracks • 
                    {formatDuration(playlist.tracks.reduce((total, track) => 
                      total + (track.totalPlayed / track.playCount), 0))}
                  </div>
                  <div className="mt-3 flex justify-between">
                    <button
                      onClick={() => loadPlaylist(playlist)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePlaylist(playlist.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 border border-dashed rounded">
              No saved playlists. Create and save a playlist to see it here.
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'export' && (
        <div className="space-y-4">
          <div>
            <label className="block text-red-700 mb-1">Base Music Path:</label>
            <input
              type="text"
              value={musicBasePath}
              onChange={(e) => setMusicBasePath(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="e.g. /Music/Downloads or C:/Music"
            />
            <p className="text-xs text-red-600 mt-1">
              This will be the base path for your music files in the exported playlist.
            </p>
          </div>
          
          <div>
            <label className="block text-red-700 mb-1">Path Format:</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={pathFormat === 'default'}
                  onChange={() => setPathFormat('default')}
                  className="mr-2"
                />
                <span>Default (BasePath/Artist/Artist-Album/Track.ext)</span>
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
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Custom path format"
                />
                <div className="text-xs text-red-600 mt-1">
                  <p>Available placeholders:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li>{'{basePath}'} - Your base music path</li>
                    <li>{'{artist}'} - Artist name</li>
                    <li>{'{album}'} - Album name</li>
                    <li>{'{track}'} - Track name</li>
                    <li>{'{ext}'} - File extension</li>
                    <li>{'{index}'} - Track number (001, 002, etc.)</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-red-700 mb-1">File Extension:</label>
            <select
              value={fileExtension}
              onChange={(e) => setFileExtension(e.target.value)}
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="mp3">mp3</option>
              <option value="flac">flac</option>
              <option value="m4a">m4a</option>
              <option value="ogg">ogg</option>
              <option value="wav">wav</option>
            </select>
          </div>
          
          <div className="text-sm text-red-600 p-3 bg-red-100 rounded">
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
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomPlaylistCreator;