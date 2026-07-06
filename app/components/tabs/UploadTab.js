'use client';
import React from 'react';
import { Download, Trash2 } from 'lucide-react';
import ExcelPreview from '../excelpreview.js';
import GoogleDriveSync from '../GoogleDriveSync.js';
import LastfmConnect from '../LastfmConnect.js';
import RockboxScrobbler from '../RockboxScrobbler.js';

// Upload tab content — extracted verbatim from SpotifyAnalyzer's renderTabContent.
export default function UploadTab({
  albumsByYear,
  artistsByYear,
  briefObsessions,
  colorMode,
  enableEnrichment,
  setEnableEnrichment,
  enrichmentProgress,
  error,
  handleDataLoaded,
  handleDeleteFile,
  handleFileUpload,
  handleLoadSampleData,
  handleProcessFiles,
  processFiles,
  includeLastfmData,
  setIncludeLastfmData,
  includeScrobblerData,
  setIncludeScrobblerData,
  isDarkMode,
  isProcessing,
  processedData,
  rawPlayData,
  setStorageNotification,
  storageNotification,
  storedLastfmCount,
  storedScrobbleCount,
  songsByYear,
  stats,
  streaks,
  topAlbums,
  topArtists,
  uploadInnerTab,
  setUploadInnerTab,
  uploadedFileList,
  uploadedFiles,
}) {
        // Upload tab colors based on colorMode
        const uploadBg = colorMode === 'colorful'
          ? 'bg-violet-200 dark:bg-violet-900'
          : '';
        const uploadBorder = colorMode === 'colorful'
          ? 'border-violet-300 dark:border-violet-700'
          : (isDarkMode ? 'border-[#4169E1]' : 'border-black');
        const uploadText = colorMode === 'colorful'
          ? 'text-violet-700 dark:text-violet-300'
          : '';
        const uploadTextLight = colorMode === 'colorful'
          ? 'text-violet-600 dark:text-violet-400'
          : 'text-gray-600 dark:text-gray-400';
        const uploadCardBg = colorMode === 'colorful'
          ? 'bg-violet-100 dark:bg-violet-800'
          : (isDarkMode ? 'bg-black' : 'bg-white');

        const uploadInnerBtnActive = colorMode === 'colorful'
          ? 'bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#7c3aed]'
          : isDarkMode
            ? 'bg-black text-white border border-[#4169E1] translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#4169E1]'
            : 'bg-white text-black border border-black translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_black]';
        const uploadInnerBtnInactive = colorMode === 'colorful'
          ? 'bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700 hover:opacity-80 shadow-[2px_2px_0_0_#7c3aed]'
          : isDarkMode
            ? 'bg-black text-white border border-[#4169E1] hover:opacity-80 shadow-[2px_2px_0_0_#4169E1]'
            : 'bg-white text-black border border-black hover:opacity-80 shadow-[2px_2px_0_0_black]';

        return (
          <div className={`p-2 sm:p-4 rounded border-2 ${uploadBg} ${uploadBorder} ${colorMode !== 'colorful' ? (isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]') : ''}`}>
            {/* Title + inner tabs + web app row */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h3 className={`text-xl hidden sm:block ${uploadText}`}>
                {uploadInnerTab === 'upload' ? 'Upload Files' : uploadInnerTab === 'lastfm' ? 'Last.fm' : 'Scrobbler'}
              </h3>
              <div className="flex gap-1">
                <button onClick={() => setUploadInnerTab('upload')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded font-medium ${uploadInnerTab === 'upload' ? uploadInnerBtnActive : uploadInnerBtnInactive}`}>Upload</button>
                <button onClick={() => setUploadInnerTab('scrobbler')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded font-medium ${uploadInnerTab === 'scrobbler' ? uploadInnerBtnActive : uploadInnerBtnInactive}`}>Scrobbler</button>
                <button onClick={() => setUploadInnerTab('lastfm')} className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded font-medium ${uploadInnerTab === 'lastfm' ? uploadInnerBtnActive : uploadInnerBtnInactive}`}>Last.fm</button>
              </div>
              <div className={`ml-auto ${
                colorMode === 'colorful'
                  ? 'px-2 py-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded text-white'
                  : `px-2 py-1 rounded border ${isDarkMode ? 'bg-black text-white border-[#4169E1]' : 'bg-white text-black border-black'}`
              }`}>
                <p className="font-bold text-xs">📱 Download as Web App!</p>
              </div>
            </div>
            <div>
            {uploadInnerTab === 'scrobbler' ? (
              <RockboxScrobbler
                isDarkMode={isDarkMode}
                colorMode={colorMode}
                onScrobblesLoaded={(entries) => {
                  const content = entries.map(e =>
                    [
                      e.master_metadata_album_artist_name,
                      e.master_metadata_album_album_name || '',
                      e.master_metadata_track_name,
                      '',
                      Math.round((e.ms_played || 210000) / 1000),
                      e.skipped ? 'S' : '',
                      Math.floor(new Date(e.ts).getTime() / 1000),
                      ''
                    ].join('\t')
                  ).join('\n');
                  const header = '#AUDIOSCROBBLER/1.1\n#TZ/UNKNOWN\n#CLIENT/Rockbox\n';
                  const blob = new Blob([header + content], { type: 'text/plain' });
                  const file = new File([blob], '.scrobbler.log', { type: 'text/plain' });
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  processFiles(dt.files);
                }}
              />
            ) : uploadInnerTab === 'lastfm' ? (
              <LastfmConnect
                isDarkMode={isDarkMode}
                colorMode={colorMode}
                onScrobblesLoaded={(entries) => {
                  // Convert Last.fm scrobbles to JSON file for processing
                  const lastfmData = entries.map(e => ({
                    ...e,
                    source: 'lastfm'
                  }));
                  const blob = new Blob([JSON.stringify(lastfmData)], { type: 'application/json' });
                  const file = new File([blob], 'lastfm-scrobbles.json', { type: 'application/json' });
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  processFiles(dt.files);
                }}
              />
            ) : (<>
            {/* Storage Notification */}
            {storageNotification && (
              <div className={`mb-6 p-4 rounded-lg border ${
                storageNotification.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : storageNotification.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : storageNotification.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">
                      {storageNotification.type === 'success' && '✅ '}
                      {storageNotification.type === 'warning' && '⚠️ '}
                      {storageNotification.type === 'error' && '❌ '}
                      {storageNotification.type === 'info' && 'ℹ️ '}
                      {storageNotification.title}
                    </h4>
                    <p className="text-sm mb-2">{storageNotification.message}</p>
                    {storageNotification.action && (
                      <p className="text-xs opacity-75">{storageNotification.action}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setStorageNotification(null)}
                    className="ml-3 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* How to Use + Google Drive - side by side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* How to Use section */}
              <div className={`p-4 border rounded-lg flex flex-col ${uploadCardBg} ${uploadBorder} ${colorMode !== 'colorful' ? (isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]') : ''}`}>
                <h3 className={`font-semibold mb-3 text-sm ${uploadText}`}>How to use:</h3>
                <div className={`text-xs sm:text-sm ${uploadTextLight}`}>
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`flex-shrink-0 w-6 h-6 ${colorMode === 'colorful' ? 'bg-violet-600 text-white' : (isDarkMode ? 'bg-black text-white border border-[#4169E1]' : 'bg-white text-black border border-black')} rounded-full flex items-center justify-center text-sm font-bold`}>1</span>
                    <span>Download your streaming history from your service</span>
                  </div>
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`flex-shrink-0 w-6 h-6 ${colorMode === 'colorful' ? 'bg-violet-600 text-white' : (isDarkMode ? 'bg-black text-white border border-[#4169E1]' : 'bg-white text-black border border-black')} rounded-full flex items-center justify-center text-sm font-bold`}>2</span>
                    <span>Upload your file(s) or connect Google Drive for large files</span>
                  </div>
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`flex-shrink-0 w-6 h-6 ${colorMode === 'colorful' ? 'bg-violet-600 text-white' : (isDarkMode ? 'bg-black text-white border border-[#4169E1]' : 'bg-white text-black border border-black')} rounded-full flex items-center justify-center text-sm font-bold`}>3</span>
                    <span>Click "Calculate Statistics" and explore your data</span>
                  </div>
                </div>
                <div className="mt-auto pt-3">
                  <button
                    onClick={handleLoadSampleData}
                    disabled={isProcessing}
                    className={
                      colorMode === 'colorful'
                        ? 'flex items-center gap-1 px-3 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition-colors font-medium shadow-sm text-sm'
                        : `flex items-center gap-1 px-3 py-2 rounded-lg transition-colors font-medium shadow-sm text-sm ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`
                    }
                  >
                    <Download size={16} />
                    Try Demo
                  </button>
                  <p className={`text-xs mt-1.5 ${uploadTextLight}`}>
                    Load sample streaming history to test the app.
                  </p>
                </div>
              </div>

              {/* Google Drive Storage */}
              <div>
                <GoogleDriveSync
                  stats={stats}
                  processedData={processedData}
                  topArtists={topArtists}
                  topAlbums={topAlbums}
                  briefObsessions={briefObsessions}
                  songsByYear={songsByYear}
                  rawPlayData={rawPlayData}
                  artistsByYear={artistsByYear}
                  albumsByYear={albumsByYear}
                  streaks={streaks}
                  uploadedFiles={uploadedFiles}
                  uploadedFileList={uploadedFileList}
                  onDataLoaded={handleDataLoaded}
                  isDarkMode={isDarkMode}
                  colorMode={colorMode}
                />
              </div>
            </div>

              
            <div className={`p-4 rounded-lg border ${uploadCardBg} ${uploadBorder} ${colorMode !== 'colorful' ? (isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]') : ''}`}>
              <p className={`mb-3 font-semibold text-sm ${uploadText}`}>
                Upload your streaming history files:
              </p>
              <p className={`mb-3 text-xs sm:text-sm ${uploadTextLight}`}>
                Supported: Spotify (.json), Apple Music (.csv), YouTube Music (.json), Deezer (.xlsx), Tidal (.csv), SoundCloud (.csv), iPod/Rockbox (.log), Last.fm (.json), Cake (.xlsx/.json)
              </p>
              <input
                type="file"
                multiple
                accept=".json,.csv,.xlsx,.log,.scrobbler.log,*/*"
                onChange={handleFileUpload}
                className={`block w-full text-sm transition-colors
                  file:mr-4 file:py-2 file:px-4 file:rounded-lg
                  file:border-2 file:text-sm
                  file:font-semibold file:cursor-pointer
                  ${colorMode === 'colorful'
                    ? 'file:border-yellow-400 file:bg-yellow-300 file:text-yellow-800 hover:file:bg-yellow-400'
                    : isDarkMode
                      ? 'file:border-[#4169E1] file:bg-black file:text-white hover:file:bg-gray-800'
                      : 'file:border-black file:bg-white file:text-black hover:file:bg-gray-100'
                  }
                  ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}
              />
            </div>
                
            {isProcessing && (
              <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="flex flex-col items-center">
                  <img
                    src="/loading.png"
                    alt="Cake is cakeculating..."
                    className="w-48 h-48 object-contain animate-rock bg-transparent loading-cake-image"
                  />
                  <p
                    className="text-xl text-blue-600 mt-2 animate-rainbow cakeculating-text"
                    style={{
                      fontFamily: 'var(--font-comic-neue)',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    {enrichmentProgress ? 'Looking up albums...' : 'Cakeculating...'}
                  </p>
                  {enrichmentProgress && (
                    <div className="w-64 mt-3">
                      <div className={`w-full h-3 rounded-full overflow-hidden ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <div
                          className="h-full rounded-full transition-all duration-300 ease-out"
                          style={{
                            width: `${Math.round((enrichmentProgress.done / enrichmentProgress.total) * 100)}%`,
                            background: colorMode === 'colorful'
                              ? 'linear-gradient(90deg, #8b5cf6, #3b82f6)'
                              : isDarkMode ? '#4169E1' : '#000',
                          }}
                        />
                      </div>
                      <p className={`text-xs mt-1 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        MusicBrainz: {enrichmentProgress.done} / {enrichmentProgress.total} tracks
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
                
            {uploadedFiles.length > 0 && (
              <div className={`mt-4 p-2 rounded-lg border ${
                colorMode === 'colorful'
                  ? 'bg-violet-50 dark:bg-violet-800 border-violet-300 dark:border-violet-600'
                  : (isDarkMode ? 'bg-black border-[#4169E1]' : 'bg-gray-50 border-black')
              }`}>
                <h4 className={`font-semibold mb-1 text-lg ${uploadText}`}>Uploaded Files:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
                  {uploadedFiles.map((fileName, index) => (
                    <div key={index} className={`flex items-center justify-between px-2 py-1 rounded ${
                      colorMode === 'colorful'
                        ? 'bg-violet-100 dark:bg-violet-700'
                        : (isDarkMode ? 'bg-gray-900' : 'bg-white')
                    }`}>
                      <span className={`text-sm font-medium truncate mr-3 ${uploadTextLight}`}>
                        {fileName}
                      </span>
                      <button
                        onClick={() => handleDeleteFile(index)}
                        className={
                          colorMode === 'colorful'
                            ? 'p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shrink-0'
                            : `p-2 rounded-lg transition-colors shrink-0 ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'}`
                        }
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {uploadedFileList && uploadedFileList.length === 1 &&
                 uploadedFileList[0].name.endsWith('.xlsx') && (
                  <ExcelPreview file={uploadedFileList[0]} />
                )}

                {storedScrobbleCount > 0 && (
                  <label className={`mt-3 flex items-center gap-2 cursor-pointer select-none text-sm ${uploadTextLight}`}>
                    <input
                      type="checkbox"
                      checked={includeScrobblerData}
                      onChange={e => setIncludeScrobblerData(e.target.checked)}
                      className="w-4 h-4 accent-violet-600"
                    />
                    Include Rockbox scrobbles ({storedScrobbleCount.toLocaleString()} plays)
                  </label>
                )}

                {storedLastfmCount > 0 && (
                  <label className={`mt-3 flex items-center gap-2 cursor-pointer select-none text-sm ${uploadTextLight}`}>
                    <input
                      type="checkbox"
                      checked={includeLastfmData}
                      onChange={e => setIncludeLastfmData(e.target.checked)}
                      className="w-4 h-4 accent-violet-600"
                    />
                    Include Last.fm scrobbles ({storedLastfmCount.toLocaleString()} plays)
                  </label>
                )}

                <label className={`mt-3 flex items-center gap-2 cursor-pointer select-none text-sm ${uploadTextLight}`}>
                  <input
                    type="checkbox"
                    checked={enableEnrichment}
                    onChange={e => {
                      setEnableEnrichment(e.target.checked);
                      localStorage.setItem('enableAlbumEnrichment', JSON.stringify(e.target.checked));
                    }}
                    className="w-4 h-4 accent-violet-600"
                  />
                  Look up missing album data via MusicBrainz
                </label>

                <button
                  onClick={handleProcessFiles}
                  disabled={isProcessing}
                  className={
                    colorMode === 'colorful'
                      ? 'mt-4 w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors shadow-lg'
                      : `mt-4 w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-lg disabled:cursor-not-allowed ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 disabled:opacity-50' : 'bg-white text-black border border-black hover:bg-gray-100 disabled:opacity-50'}`
                  }
                >
                  {isProcessing ? "Processing..." : "🚀 Calculate Statistics"}
                </button>
              </div>
            )}

            {/* Scrobbler-only calculate — shown when no files uploaded but scrobbles exist */}
            {uploadedFiles.length === 0 && (storedScrobbleCount > 0 || storedLastfmCount > 0) && (
              <div className={`mt-4 p-3 rounded-lg border ${
                colorMode === 'colorful'
                  ? 'bg-violet-50 dark:bg-violet-800 border-violet-300 dark:border-violet-600'
                  : isDarkMode ? 'bg-black border-[#4169E1]' : 'bg-gray-50 border-black'
              }`}>
                {storedScrobbleCount > 0 && (
                  <label className={`flex items-center gap-2 cursor-pointer select-none text-sm mb-3 ${uploadTextLight}`}>
                    <input
                      type="checkbox"
                      checked={includeScrobblerData}
                      onChange={e => setIncludeScrobblerData(e.target.checked)}
                      className="w-4 h-4 accent-violet-600"
                    />
                    Include Rockbox scrobbles ({storedScrobbleCount.toLocaleString()} plays)
                  </label>
                )}
                {storedLastfmCount > 0 && (
                  <label className={`flex items-center gap-2 cursor-pointer select-none text-sm mb-3 ${uploadTextLight}`}>
                    <input
                      type="checkbox"
                      checked={includeLastfmData}
                      onChange={e => setIncludeLastfmData(e.target.checked)}
                      className="w-4 h-4 accent-violet-600"
                    />
                    Include Last.fm scrobbles ({storedLastfmCount.toLocaleString()} plays)
                  </label>
                )}
                {(includeScrobblerData || includeLastfmData) && (
                  <button
                    onClick={handleProcessFiles}
                    disabled={isProcessing}
                    className={
                      colorMode === 'colorful'
                        ? 'w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors shadow-lg'
                        : `w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-lg disabled:cursor-not-allowed ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 disabled:opacity-50' : 'bg-white text-black border border-black hover:bg-gray-100 disabled:opacity-50'}`
                    }
                  >
                    {isProcessing ? "Processing..." : "🚀 Calculate Statistics"}
                  </button>
                )}
              </div>
            )}
                
            {error && (
              <div className={`mt-6 p-4 rounded-lg border ${
                isDarkMode
                  ? 'bg-red-900/20 border-red-600/30 text-red-300'
                  : 'bg-red-100 border-red-300 text-red-700'
              }`}>
                <h4 className="font-semibold mb-2">Error:</h4>
                <p className="text-sm">{error}</p>
              </div>
            )}
            <div className={`mt-6 text-center text-xs ${uploadTextLight}`}>
              <a href="/privacy" className="underline hover:opacity-70">Privacy Policy</a>
              {' · '}
              <a href="/terms" className="underline hover:opacity-70">Terms of Service</a>
            </div>
            </>)}
            </div>
          </div>
        );

}
