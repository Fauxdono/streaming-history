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
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 p-4 text-center text-red-400 border border-dashed border-red-300 rounded">
                No tracks selected. Search for tracks to add them to your playlist.
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={savePlaylist}
              disabled={!selectedTracks.some(t => !['processing', 'no-matches', 'error'].includes(t.id))}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              Save Playlist
            </button>
            <button
              onClick={exportPlaylist}
              disabled={!selectedTracks.some(t => !['processing', 'no-matches', 'error'].includes(t.id))}
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
                <div key={playlist.id} className="border border-red-200 rounded p-4 hover:border-red-400">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-red-600">{playlist.name}</h4>
                    <div className="text-sm text-red-500">
                      {new Date(playlist.created).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-sm text-red-600 mt-1">
                    {playlist.tracks.length} tracks • 
                    {formatDuration(playlist.tracks.reduce((total, track) => 
                      total + (track.totalPlayed / Math.max(1, track.playCount)), 0))}
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
            <div className="p-4 text-center text-red-400 border border-dashed border-red-300 rounded">
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
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-700"
              placeholder="e.g. /Music/Downloads or C:/Music"
            />
            <p className="text-xs text-red-600 mt-1">
              This will be the base path for your music files in the exported playlist.
            </p>
          </div>
          
          <div>
            <label className="block text-red-700 mb-1">Path Format:</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center text-red-700">
                <input
                  type="radio"
                  checked={pathFormat === 'default'}
                  onChange={() => setPathFormat('default')}
                  className="mr-2"
                />
                <span>Default (BasePath/Artist/Artist-Album/Track.ext)</span>
              </label>
              <label className="flex items-center text-red-700">
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
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-700"
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
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-red-500 text-red-700"
            >
              <option value="mp3">mp3</option>
              <option value="flac">flac</option>
              <option value="m4a">m4a</option>
              <option value="ogg">ogg</option>
              <option value="wav">wav</option>
            </select>
          </div>
          
          <div className="text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded">
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