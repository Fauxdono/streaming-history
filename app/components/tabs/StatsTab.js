'use client';
import React from 'react';
import { Download } from 'lucide-react';
import ExportButton from '../ExportButton.js';
import Top100Export from '../Top100Export.js';

// Statistics tab content — extracted verbatim from SpotifyAnalyzer's renderTabContent.
export default function StatsTab({
  briefObsessions,
  colorMode,
  isDarkMode,
  displayedAlbums,
  displayedArtists,
  filteredStats,
  filteredStreaks,
  formatDuration,
  processedData,
  rawPlayData,
  selectedStreaksYear,
  streaks,
  songsByYear,
  stats,
  topAlbums,
  topArtists,
}) {
  return stats ? (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-indigo-200 dark:bg-indigo-900 rounded border-2 border-indigo-300 dark:border-indigo-700'
              : `p-2 sm:p-4 border ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            {/* Desktop title */}
            <div className="hidden sm:block mb-4">
              <h3 className={
                colorMode === 'colorful'
                  ? 'text-xl text-indigo-700 dark:text-indigo-300'
                  : 'text-xl'
              }>Statistics <span className="text-xs opacity-75">{selectedStreaksYear === 'all' ? 'all-time' : selectedStreaksYear.startsWith('all-') ? (() => { const p = selectedStreaksYear.split('-'); const monthName = new Date(2024, parseInt(p[1]) - 1).toLocaleDateString('en-US', { month: 'long' }); return p.length === 3 ? `Every ${monthName} ${parseInt(p[2])}` : `Every ${monthName}`; })() : selectedStreaksYear}</span></h3>
              {filteredStats?.earliestDate && filteredStats?.latestDate && (
                <p className={`text-sm mt-1 ${colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-60'}`}>
                  {new Date(filteredStats.earliestDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} — {new Date(filteredStats.latestDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ul className={
                    colorMode === 'colorful'
                      ? 'space-y-1 text-indigo-700 dark:text-indigo-300'
                      : 'space-y-1'
                  }>
                    <li>Files processed: {stats.totalFiles}</li>
                    <li>Total entries: {filteredStats?.totalEntries || 0}</li>
                    <li>Processed songs: {filteredStats?.processedSongs || 0}</li>
                    <li>Unique songs: {filteredStats?.uniqueSongs || 0}</li>
                    <li>Entries with no track name: {filteredStats?.nullTrackNames || 0}</li>
                    <li>Plays under 30s: {filteredStats?.shortPlays || 0}</li>
                  </ul>
                </div>
                <div className={
                  colorMode === 'colorful'
                    ? 'p-4 border space-y-2 bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 rounded text-indigo-700 dark:text-indigo-300'
                    : `p-4 border space-y-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
                }>
                  <div className={
                    colorMode === 'colorful'
                      ? 'mb-1 font-semibold text-indigo-700 dark:text-indigo-300'
                      : 'mb-1'
                  }>Total Listening Time:</div>
                  <div className={
                    colorMode === 'colorful'
                      ? 'text-2xl text-indigo-700 dark:text-indigo-300'
                      : 'text-2xl'
                  }>{formatDuration(filteredStats?.totalListeningTime || 0)}</div>
                  <div className={
                    colorMode === 'colorful'
                      ? 'text-sm text-indigo-600 dark:text-indigo-400'
                      : 'text-sm'
                  }>(only counting plays over 30 seconds)</div>

                  {/* Service breakdown */}
                  {filteredStats?.serviceListeningTime && Object.keys(filteredStats.serviceListeningTime).length > 0 && (
                    <div className={
                      colorMode === 'colorful'
                        ? 'mt-4 pt-3 border-t border-indigo-300 dark:border-indigo-700'
                        : `mt-4 pt-3 border-t ${isDarkMode ? 'border-[#4169E1]' : 'border-black'}`
                    }>
                      <div className={
                        colorMode === 'colorful'
                          ? 'mb-2 font-semibold text-indigo-700 dark:text-indigo-300'
                          : 'mb-2'
                      }>Listening Time by Service:</div>
                      <ul className={
                        colorMode === 'colorful'
                          ? 'space-y-1 text-indigo-700 dark:text-indigo-300'
                          : 'space-y-1'
                      }>
                        {Object.entries(filteredStats.serviceListeningTime).map(([service, time]) => (
                          <li key={service} className="flex justify-between items-center">
                            <span>{service}:</span>
                            <span>{formatDuration(time)}</span>
                          </li>
                        ))}
                        {filteredStats.serviceListeningTime.lastfm && Object.keys(filteredStats.serviceListeningTime).length > 1 && (
                          <li className={`text-xs mt-1 opacity-50 ${
                            colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : ''
                          }`}>
                            last.fm time only counts plays not found in other services (duplicates removed)
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Download Data Section */}
              {stats && processedData.length > 0 && (
                <div className={
                  colorMode === 'colorful'
                    ? 'mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-100 dark:bg-indigo-800'
                    : `mt-4 p-4 border rounded ${isDarkMode ? 'border-[#4169E1] bg-black shadow-[1px_1px_0_0_#4169E1]' : 'border-black bg-white shadow-[1px_1px_0_0_black]'}`
                }>
                  <div className="flex items-center gap-2 mb-3">
                    <Download size={18} className={colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
                    <h4 className={
                      colorMode === 'colorful'
                        ? 'font-medium text-indigo-700 dark:text-indigo-300'
                        : 'font-medium'
                    }>Download Your Data</h4>
                  </div>
                  <p className={
                    colorMode === 'colorful'
                      ? 'text-sm text-indigo-600 dark:text-indigo-400 mb-3'
                      : `text-sm mb-3 ${isDarkMode ? 'text-white' : 'text-black'}`
                  }>
                    Save your streaming analysis to your device as Excel or JSON.
                  </p>
                  <ExportButton
                    stats={stats}
                    topArtists={displayedArtists || []}
                    topAlbums={displayedAlbums || []}
                    processedData={processedData || []}
                    briefObsessions={briefObsessions || []}
                    songsByYear={songsByYear || {}}
                    rawPlayData={rawPlayData || []}
                    formatDuration={formatDuration}
                    colorMode={colorMode}
                  />
                  <div className={`mt-3 pt-3 border-t ${colorMode === 'colorful' ? 'border-indigo-200 dark:border-indigo-600' : isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={
                      colorMode === 'colorful'
                        ? 'text-sm text-indigo-600 dark:text-indigo-400 mb-2'
                        : `text-sm mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`
                    }>
                      Lightweight export of your top 100 rankings — paste into AI chats or save for later.
                    </p>
                    <Top100Export
                      processedData={processedData || []}
                      songsByYear={songsByYear || {}}
                      topArtists={displayedArtists || []}
                      topAlbums={displayedAlbums || []}
                      formatDuration={formatDuration}
                      colorMode={colorMode}
                    />
                  </div>
                </div>
              )}

              {/* Listening Streaks Section */}
              {stats && (streaks || rawPlayData?.length > 0) && (
                <div className={
                  colorMode === 'colorful'
                    ? 'mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-100 dark:bg-indigo-900'
                    : `mt-4 p-4 border rounded ${isDarkMode ? 'border-[#4169E1] bg-black shadow-[1px_1px_0_0_#4169E1]' : 'border-black bg-white shadow-[1px_1px_0_0_black]'}`
                }>
                  <h4 className={
                    colorMode === 'colorful'
                      ? 'text-lg font-semibold mb-4 text-indigo-700 dark:text-indigo-300'
                      : 'text-lg font-semibold mb-4'
                  }>Listening Streaks</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Back-to-Back Plays Column */}
                    <div className={
                      colorMode === 'colorful'
                        ? 'p-3 rounded border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-800'
                        : `p-3 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`
                    }>
                      <h5 className={
                        colorMode === 'colorful'
                          ? 'font-medium mb-3 text-indigo-600 dark:text-indigo-400'
                          : 'font-medium mb-3'
                      }>Back-to-Back Plays</h5>

                      {/* Song on repeat */}
                      {filteredStreaks?.consecutivePlays?.song && (
                        <div className="mb-3">
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Song on repeat:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>"{filteredStreaks.consecutivePlays.song.trackName}"</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>by {filteredStreaks.consecutivePlays.song.artist}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.consecutivePlays.song.count} plays in a row</div>
                        </div>
                      )}

                      {/* Artist marathon */}
                      {filteredStreaks?.consecutivePlays?.artist && (
                        <div className="mb-3">
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Artist marathon:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>{filteredStreaks.consecutivePlays.artist.name}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.consecutivePlays.artist.count} consecutive plays</div>
                        </div>
                      )}

                      {/* Album session */}
                      {filteredStreaks?.consecutivePlays?.album && (
                        <div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Album session:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>{filteredStreaks.consecutivePlays.album.name}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>by {filteredStreaks.consecutivePlays.album.artist}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.consecutivePlays.album.count} tracks in a row</div>
                        </div>
                      )}

                      {!filteredStreaks?.consecutivePlays?.song && !filteredStreaks?.consecutivePlays?.artist && !filteredStreaks?.consecutivePlays?.album && (
                        <div className={
                          colorMode === 'colorful'
                            ? 'text-sm text-indigo-500 dark:text-indigo-400'
                            : 'text-sm text-gray-500'
                        }>No consecutive play streaks found</div>
                      )}
                    </div>

                    {/* Daily Streaks Column */}
                    <div className={
                      colorMode === 'colorful'
                        ? 'p-3 rounded border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-800'
                        : `p-3 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`
                    }>
                      <h5 className={
                        colorMode === 'colorful'
                          ? 'font-medium mb-3 text-indigo-600 dark:text-indigo-400'
                          : 'font-medium mb-3'
                      }>Daily Streaks</h5>

                      {/* Overall listening streak */}
                      {filteredStreaks?.overallDaily && (
                        <div className="mb-3">
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Longest listening streak:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>{filteredStreaks.overallDaily.count} consecutive days</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>{new Date(filteredStreaks.overallDaily.startDate).toLocaleDateString()} - {new Date(filteredStreaks.overallDaily.endDate).toLocaleDateString()}</div>
                        </div>
                      )}

                      {/* Most dedicated song */}
                      {filteredStreaks?.topSongDaily && (
                        <div className="mb-3">
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Most dedicated song:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>"{filteredStreaks.topSongDaily.trackName}"</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>by {filteredStreaks.topSongDaily.artist}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.topSongDaily.count} days in a row</div>
                        </div>
                      )}

                      {/* Most consistent album */}
                      {filteredStreaks?.topAlbumDaily && (
                        <div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Most consistent album:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>{filteredStreaks.topAlbumDaily.name}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>by {filteredStreaks.topAlbumDaily.artist}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.topAlbumDaily.count} consecutive days</div>
                        </div>
                      )}

                      {!filteredStreaks?.overallDaily && !filteredStreaks?.topSongDaily && !filteredStreaks?.topAlbumDaily && (
                        <div className={
                          colorMode === 'colorful'
                            ? 'text-sm text-indigo-500 dark:text-indigo-400'
                            : 'text-sm text-gray-500'
                        }>No daily streaks found</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
  ) : null;
}
