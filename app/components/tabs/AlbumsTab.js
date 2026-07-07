'use client';
import React, { useMemo } from 'react';
import AlbumCard from '../albumcard.js';
import { RankChip, monthRanksFromRaw, prevMonthOf, monthLabel, dayRanksFromRaw, prevDayOf, dayLabel } from '../RankCardBits.js';

// Albums tab content — extracted verbatim from SpotifyAnalyzer's renderTabContent.
// All state still lives in the parent; this is a pure presentation move.
export default function AlbumsTab({
  albumsSortBy,
  setAlbumsSortBy,
  albumsSortPress,
  setAlbumsSortPress,
  albumsViewMode,
  setAlbumsViewMode,
  albumsViewPress,
  setAlbumsViewPress,
  artistSearch,
  setArtistSearch,
  colorMode,
  isDarkMode,
  displayedAlbums,
  filteredArtists,
  formatDuration,
  getAlbumsTabLabel,
  processedData,
  selectedAlbumYear,
  albumsByYear,
  albumYearRangeMode,
  rawPlayData,
  selectedArtists,
  setSelectedArtists,
  expandedAlbumListRows,
  setExpandedAlbumListRows,
  topAlbumsCount,
  setTopAlbumsCount,
  albumTextTheme,
  albumBackgroundTheme,
}) {
  // Previous-period album ranks (same sort metric) for rank-movement chips
  const albumKeyOf = (e) => {
    const name = e.master_metadata_album_album_name;
    if (!name) return null;
    return `${name.toLowerCase()}|||${(e.master_metadata_album_artist_name || '').toLowerCase()}`;
  };
  const prevAlbumRanks = useMemo(() => {
    if (albumYearRangeMode || !selectedAlbumYear) return null;
    const sel = String(selectedAlbumYear);
    if (/^\d{4}$/.test(sel)) {
      const prev = albumsByYear?.[String(parseInt(sel, 10) - 1)];
      if (!prev || prev.length === 0) return null;
      const sorted = [...prev].sort((a, b) => (b[albumsSortBy] || 0) - (a[albumsSortBy] || 0));
      const map = new Map();
      sorted.forEach((a, i) => map.set(`${(a.name || '').toLowerCase()}|||${(a.artist || '').toLowerCase()}`, i + 1));
      return { map, label: String(parseInt(sel, 10) - 1) };
    }
    if (/^\d{4}-\d{2}$/.test(sel)) {
      const prevYm = prevMonthOf(sel);
      const map = monthRanksFromRaw(rawPlayData, prevYm, albumKeyOf, albumsSortBy);
      if (map.size === 0) return null;
      return { map, label: monthLabel(prevYm) };
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(sel)) {
      const prevYmd = prevDayOf(sel);
      const map = dayRanksFromRaw(rawPlayData, prevYmd, albumKeyOf, albumsSortBy);
      if (map.size === 0) return null;
      return { map, label: dayLabel(prevYmd) };
    }
    return null;
  }, [albumsByYear, rawPlayData, selectedAlbumYear, albumYearRangeMode, albumsSortBy]);

  return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-cyan-200 dark:bg-cyan-900 rounded border-2 border-cyan-300 dark:border-cyan-700'
              : `p-2 sm:p-4 rounded border-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            {/* Desktop layout - title, controls, and search on same row */}
            <div className={`hidden sm:flex justify-between items-center gap-2 mb-2 ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-300' : ''}`}>
                <h3 className={
                  colorMode === 'colorful'
                    ? 'text-xl text-cyan-700 dark:text-cyan-300 whitespace-nowrap'
                    : 'text-xl whitespace-nowrap'
                }>
                  {getAlbumsTabLabel()}
                </h3>

                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={artistSearch}
                      onChange={(e) => setArtistSearch(e.target.value)}
                      placeholder="Search artists..."
                      className={
                        colorMode === 'colorful'
                          ? 'w-full border border-cyan-300 dark:border-cyan-600 rounded px-2 py-1 text-sm bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none placeholder-cyan-600 dark:placeholder-cyan-500'
                          : `w-full border rounded px-2 py-1 text-sm focus:outline-none ${isDarkMode ? 'border-[#4169E1] bg-black text-white' : 'border-black bg-white text-black'}`
                      }
                    />
                    {artistSearch && (
                      <button
                        onClick={() => setArtistSearch('')}
                        className={
                          colorMode === 'colorful'
                            ? 'absolute right-2 top-1/2 transform -translate-y-1/2 text-cyan-500 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-200'
                            : `absolute right-2 top-1/2 transform -translate-y-1/2 hover:opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`
                        }
                      >
                        ×
                      </button>
                    )}
                    {artistSearch && filteredArtists.length > 0 && (
                      <div className={
                        colorMode === 'colorful'
                          ? 'absolute z-10 w-full bg-cyan-100 dark:bg-cyan-900 border border-cyan-300 dark:border-cyan-600 rounded shadow-lg mt-1'
                          : `absolute z-10 w-full border rounded shadow-lg mt-1 ${isDarkMode ? 'bg-black border-[#4169E1]' : 'bg-white border-black'}`
                      }>
                        {filteredArtists.map(artist => (
                          <div
                            key={artist}
                            onClick={() => {
                              setSelectedArtists(prev => [...prev, artist]);
                              setArtistSearch('');
                            }}
                            className={
                              colorMode === 'colorful'
                                ? 'px-2 py-1 hover:bg-cyan-200 dark:hover:bg-cyan-800 text-cyan-700 dark:text-cyan-300 cursor-pointer'
                                : `px-2 py-1 cursor-pointer ${isDarkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-black'}`
                            }
                          >
                            {artist}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="text-xs">Show Top</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    defaultValue={topAlbumsCount}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                    onBlur={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= 500) setTopAlbumsCount(v); else e.target.value = topAlbumsCount; }}
                    className={
                      colorMode === 'colorful'
                        ? 'w-14 border border-cyan-300 dark:border-cyan-600 rounded px-1.5 py-1 text-xs bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300'
                        : `w-14 border rounded px-1.5 py-1 text-xs ${isDarkMode ? 'border-[#4169E1] bg-black text-white' : 'border-black bg-white text-black'}`
                    }
                  />

                  <label className="text-xs">Sort by</label>
                  <button
                    key={`albums-sort-d-${albumsSortPress}`}
                    onClick={() => { setAlbumsSortBy(albumsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed'); setAlbumsSortPress(p => p + 1); }}
                    className={
                      colorMode === 'colorful'
                        ? `px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${isDarkMode ? 'bg-cyan-800 text-cyan-300 border border-cyan-600 shadow-[2px_2px_0_0_#0891b2]' : 'bg-cyan-100 text-cyan-700 border border-cyan-700 shadow-[2px_2px_0_0_#0e7490]'} ${albumsSortPress > 0 ? (isDarkMode ? 'btn-press-cyan-dark' : 'btn-press-cyan-light') : ''}`
                        : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'} ${albumsSortPress > 0 ? (isDarkMode ? 'btn-press-dark' : 'btn-press-light') : ''}`
                    }
                  >
                    {albumsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
                  </button>
                  <button
                    key={`albums-view-d-${albumsViewPress}`}
                    onClick={() => { setAlbumsViewMode(albumsViewMode === 'grid' ? 'list' : 'grid'); setAlbumsViewPress(p => p + 1); }}
                    className={
                      colorMode === 'colorful'
                        ? `px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${isDarkMode ? 'bg-cyan-800 text-cyan-300 border border-cyan-600 shadow-[2px_2px_0_0_#0891b2]' : 'bg-cyan-100 text-cyan-700 border border-cyan-700 shadow-[2px_2px_0_0_#0e7490]'} ${albumsViewPress > 0 ? (isDarkMode ? 'btn-press-cyan-dark' : 'btn-press-cyan-light') : ''}`
                        : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'} ${albumsViewPress > 0 ? (isDarkMode ? 'btn-press-dark' : 'btn-press-light') : ''}`
                    }
                  >
                    {albumsViewMode === 'grid' ? '☰' : '⊞'}
                  </button>
                </div>
              </div>

              {/* Mobile controls - single row with search */}
              <div className={`block sm:hidden mb-2 ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-300' : ''}`}>
                <div className="flex items-center gap-1">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={artistSearch}
                      onChange={(e) => setArtistSearch(e.target.value)}
                      placeholder="Search..."
                      className={
                        colorMode === 'colorful'
                          ? 'w-full border border-cyan-300 dark:border-cyan-600 rounded px-2 py-1 text-xs bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300 focus:border-cyan-500 focus:ring-cyan-500 focus:outline-none placeholder-cyan-600 dark:placeholder-cyan-500'
                          : `w-full border rounded px-2 py-1 text-xs focus:outline-none ${isDarkMode ? 'border-[#4169E1] bg-black text-white' : 'border-black bg-white text-black'}`
                      }
                    />
                    {artistSearch && (
                      <button
                        onClick={() => setArtistSearch('')}
                        className={
                          colorMode === 'colorful'
                            ? 'absolute right-2 top-1/2 transform -translate-y-1/2 text-cyan-500 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-200'
                            : `absolute right-2 top-1/2 transform -translate-y-1/2 hover:opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`
                        }
                      >
                        ×
                      </button>
                    )}
                    {artistSearch && filteredArtists.length > 0 && (
                      <div className={
                        colorMode === 'colorful'
                          ? 'absolute z-10 w-full bg-cyan-100 dark:bg-cyan-900 border border-cyan-300 dark:border-cyan-600 rounded shadow-lg mt-1'
                          : `absolute z-10 w-full border rounded shadow-lg mt-1 ${isDarkMode ? 'bg-black border-[#4169E1]' : 'bg-white border-black'}`
                      }>
                        {filteredArtists.map(artist => (
                          <div
                            key={artist}
                            onClick={() => {
                              setSelectedArtists(prev => [...prev, artist]);
                              setArtistSearch('');
                            }}
                            className={
                              colorMode === 'colorful'
                                ? 'px-2 py-1 hover:bg-cyan-200 dark:hover:bg-cyan-800 text-cyan-700 dark:text-cyan-300 cursor-pointer'
                                : `px-2 py-1 cursor-pointer ${isDarkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-black'}`
                            }
                          >
                            {artist}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    defaultValue={topAlbumsCount}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                    onBlur={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= 500) setTopAlbumsCount(v); else e.target.value = topAlbumsCount; }}
                    className={
                      colorMode === 'colorful'
                        ? 'w-10 border border-cyan-300 dark:border-cyan-600 rounded px-1 py-1 text-xs bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300'
                        : `w-10 border rounded px-1 py-1 text-xs ${isDarkMode ? 'border-[#4169E1] bg-black text-white' : 'border-black bg-white text-black'}`
                    }
                  />
                  <button
                    key={`albums-sort-m-${albumsSortPress}`}
                    onClick={() => { setAlbumsSortBy(albumsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed'); setAlbumsSortPress(p => p + 1); }}
                    className={
                      colorMode === 'colorful'
                        ? `px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${isDarkMode ? 'bg-cyan-800 text-cyan-300 border border-cyan-600 shadow-[2px_2px_0_0_#0891b2]' : 'bg-cyan-100 text-cyan-700 border border-cyan-700 shadow-[2px_2px_0_0_#0e7490]'} ${albumsSortPress > 0 ? (isDarkMode ? 'btn-press-cyan-dark' : 'btn-press-cyan-light') : ''}`
                        : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'} ${albumsSortPress > 0 ? (isDarkMode ? 'btn-press-dark' : 'btn-press-light') : ''}`
                    }
                  >
                    {albumsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
                  </button>
                </div>
              </div>

              {/* Selected artist filter chips */}
              {selectedArtists.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mb-2">
                  <span className={
                    colorMode === 'colorful'
                      ? 'text-cyan-700 dark:text-cyan-200 text-xs font-medium'
                      : 'text-xs font-medium'
                  }>Filtered:</span>
                  {selectedArtists.map(artist => (
                    <span
                      key={artist}
                      className={
                        colorMode === 'colorful'
                          ? 'inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-100 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-200 rounded-full text-xs'
                          : `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${isDarkMode ? 'border-[#4169E1] text-white' : 'border-black text-black'}`
                      }
                    >
                      {artist}
                      <button
                        onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                        className={
                          colorMode === 'colorful'
                            ? 'text-cyan-500 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-200'
                            : `hover:opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`
                        }
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setSelectedArtists([])}
                    className={
                      colorMode === 'colorful'
                        ? 'text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200 text-xs ml-1'
                        : `text-xs ml-1 hover:opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`
                    }
                  >
                    Clear
                  </button>
                </div>
              )}
              
              {/* Albums Display */}
              {displayedAlbums && displayedAlbums.length > 0 ? (
                albumsViewMode === 'list' ? (
                  // Table-based list view
                  <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
                    <div className="min-w-full">
                      <table className="w-full border-collapse text-sm sm:text-base">
                        <thead>
                          <tr className={`border-b ${colorMode === 'colorful' ? 'border-cyan-300 dark:border-cyan-600' : (isDarkMode ? 'border-[#4169E1]' : 'border-black')}`}>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>Rank</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm whitespace-nowrap`}>Album</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell`}>Artist</th>
                            <th className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm whitespace-nowrap`}>Time</th>
                            <th className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm`}>Plays</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : ''} text-xs sm:text-sm hidden ml:table-cell whitespace-nowrap`}>Top Track</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedAlbums.slice(0, topAlbumsCount).map((album, index) => {
                            const rowKey = `${album.artist}-${album.name}`;
                            const isRowExpanded = !!expandedAlbumListRows[rowKey];
                            const tracks = album.trackObjects || [];
                            const colorClass = colorMode === 'colorful' ? 'text-cyan-700 dark:text-cyan-200' : '';
                            const borderClass = colorMode === 'colorful' ? 'border-cyan-300 dark:border-cyan-600' : (isDarkMode ? 'border-[#4169E1]' : 'border-black');
                            return (
                                <tr
                                  key={rowKey}
                                  className={`border-b ${colorMode === 'colorful' ? 'border-cyan-300 dark:border-cyan-600 hover:bg-cyan-100 dark:hover:bg-cyan-700' : (isDarkMode ? 'border-[#4169E1] hover:bg-gray-800' : 'border-black hover:bg-gray-100')}`}
                                >
                                  <td className={`p-1 sm:p-2 ${colorClass} font-medium text-xs sm:text-sm`}><span className="inline-flex items-center gap-1">{index + 1}{prevAlbumRanks && <RankChip rank={index + 1} prevRank={prevAlbumRanks.map.get(`${(album.name || '').toLowerCase()}|||${(album.artist || '').toLowerCase()}`)} prevLabel={prevAlbumRanks.label} />}</span></td>
                                  <td className={`p-1 sm:p-2 ${colorClass} text-xs sm:text-sm whitespace-nowrap`}>
                                    {album.name.length >= 30 ? album.name.slice(0, 27) + '…' : album.name}
                                    <span className={`sm:hidden italic opacity-60 text-xs ml-1`}>{album.artist}</span>
                                  </td>
                                  <td className={`p-1 sm:p-2 ${colorClass} text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell`}>{album.artist}</td>
                                  <td className={`p-1 sm:p-2 text-right ${colorClass} text-xs sm:text-sm whitespace-nowrap`}>{formatDuration(album.totalPlayed)}</td>
                                  <td className={`p-1 sm:p-2 text-right ${colorClass} text-xs sm:text-sm`}>{(album.playCount || 0).toLocaleString()}</td>
                                  <td className={`p-1 sm:p-2 ${colorClass} text-xs sm:text-sm hidden ml:table-cell relative`}>
                                    {tracks.length > 0 ? (
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => setExpandedAlbumListRows(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))}
                                          className={`flex items-center gap-1 w-full text-left cursor-pointer hover:opacity-70`}
                                        >
                                          <span className="truncate">{tracks[0].trackName}</span>
                                          <span className={`inline-flex items-center justify-center w-4 h-4 text-xs rounded border leading-none shrink-0 ml-1
                                            ${colorMode === 'colorful'
                                              ? (isDarkMode ? 'bg-cyan-800 text-cyan-200 border-cyan-500 shadow-[1px_1px_0_0_#06b6d4]' : 'bg-cyan-100 text-cyan-700 border-cyan-600 shadow-[1px_1px_0_0_#0e7490]')
                                              : (isDarkMode ? 'bg-black text-white border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'bg-white text-black border-black shadow-[1px_1px_0_0_black]')
                                            }`}
                                          >{isRowExpanded ? '−' : '+'}</span>
                                        </button>
                                        {isRowExpanded && (
                                          <div className={`absolute left-0 top-full z-50 w-64 border rounded shadow-lg overflow-hidden ${colorMode === 'colorful' ? 'bg-cyan-50 dark:bg-cyan-900 border-cyan-300 dark:border-cyan-600' : (isDarkMode ? 'bg-black border-[#4169E1]' : 'bg-white border-black')}`}>
                                            <div className={`sticky top-0 p-1 text-xs text-center font-medium ${colorMode === 'colorful' ? 'bg-cyan-200 dark:bg-cyan-700 text-cyan-700 dark:text-cyan-200' : (isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black')}`}>
                                              {tracks.length} track{tracks.length !== 1 ? 's' : ''}
                                            </div>
                                            <div className="max-h-48 overflow-y-auto">
                                              {tracks.map((track, i) => (
                                                <div key={i} className={`p-1 text-xs ${i % 2 === 0 ? (colorMode === 'colorful' ? 'bg-cyan-50 dark:bg-cyan-900' : (isDarkMode ? 'bg-black' : 'bg-white')) : (colorMode === 'colorful' ? 'bg-cyan-100 dark:bg-cyan-800' : (isDarkMode ? 'bg-gray-900' : 'bg-gray-50'))}`}>
                                                  <div className={`flex justify-between items-center ${colorClass}`}>
                                                    <span className="truncate">{track.trackName || 'Unknown'}</span>
                                                    <span className="opacity-60 ml-2 shrink-0">{formatDuration(track.totalPlayed || 0)}</span>
                                                  </div>
                                                  <div className={`text-right opacity-60 ${colorClass}`}>{track.playCount || 0} plays</div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : '-'}
                                  </td>
                                </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // Grid or Mobile view
                  <div className={`
                    ${albumsViewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 items-start' : 'space-y-1'}
                  `}>
                    {displayedAlbums.slice(0, topAlbumsCount).map((album, index) => {
                      const albumCardBg = colorMode === 'colorful'
                        ? 'bg-cyan-50 dark:bg-cyan-800'
                        : (isDarkMode ? 'bg-black' : 'bg-white');
                      const albumCardBorder = colorMode === 'colorful'
                        ? 'border-cyan-300 dark:border-cyan-600'
                        : (isDarkMode ? 'border-[#4169E1]' : 'border-black');
                      const albumCardText = colorMode === 'colorful'
                        ? 'text-cyan-700 dark:text-cyan-200'
                        : '';
                      const albumCardTextLight = colorMode === 'colorful'
                        ? 'text-cyan-600 dark:text-cyan-300'
                        : (isDarkMode ? 'text-white' : 'text-black');

                      return albumsViewMode === 'grid' ? (
                        <AlbumCard
                          key={`${album.artist}-${album.name}`}
                          album={{...album, rank: index + 1}}
                          index={index}
                          processedData={processedData}
                          formatDuration={formatDuration}
                          textTheme={albumTextTheme}
                          backgroundTheme={albumBackgroundTheme}
                          colorMode={colorMode}
                          sortBy={albumsSortBy}
                          maxValue={albumsSortBy === 'playCount' ? (displayedAlbums[0]?.playCount || 0) : (displayedAlbums[0]?.totalPlayed || 0)}
                          rankChip={prevAlbumRanks && (
                            <RankChip
                              rank={index + 1}
                              prevRank={prevAlbumRanks.map.get(`${(album.name || '').toLowerCase()}|||${(album.artist || '').toLowerCase()}`)}
                              prevLabel={prevAlbumRanks.label}
                            />
                          )}
                        />
                      ) : (
                        <div
                          key={`${album.artist}-${album.name}`}
                          className={`p-2 ${albumCardBg} rounded border ${albumCardBorder}`}
                        >
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex-1">
                              <div className={`font-bold ${albumCardText} text-sm`}>
                                #{index + 1}{' '}{prevAlbumRanks && <RankChip rank={index + 1} prevRank={prevAlbumRanks.map.get(`${(album.name || '').toLowerCase()}|||${(album.artist || '').toLowerCase()}`)} prevLabel={prevAlbumRanks.label} />}{' '}{album.name}
                              </div>
                              <div className={`${albumCardTextLight} text-xs`}>
                                {album.artist}
                              </div>
                            </div>
                            <div className={`text-right text-xs ${albumCardTextLight}`}>
                              {albumsSortBy === 'playCount' ? (
                                <>
                                  <div className="font-medium">{(album.playCount || 0).toLocaleString()} plays</div>
                                  <div>{formatDuration(album.totalPlayed)}</div>
                                </>
                              ) : (
                                <>
                                  <div className="font-medium">{formatDuration(album.totalPlayed)}</div>
                                  <div>{(album.playCount || 0).toLocaleString()} plays</div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className={
                  colorMode === 'colorful'
                    ? 'text-center py-8 text-cyan-600 dark:text-cyan-400'
                    : `text-center py-8 ${isDarkMode ? 'text-white' : 'text-black'}`
                }>
                  {selectedAlbumYear === 'all' ?
                    'No album data available' :
                    `No album data for ${selectedAlbumYear}`
                  }
                </div>
              )}
          </div>
  );
}
