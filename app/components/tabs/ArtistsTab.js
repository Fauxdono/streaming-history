'use client';
import React, { useMemo } from 'react';
import { RankBadge, RankBar } from '../RankCardBits.js';

// Artists tab content — extracted verbatim from SpotifyAnalyzer's renderTabContent.
// All state still lives in the parent; this is a pure presentation move.
export default function ArtistsTab({
  artistSearch,
  setArtistSearch,
  artistSelectionMode,
  setArtistSelectionMode,
  artistsSortBy,
  setArtistsSortBy,
  artistsSortPress,
  setArtistsSortPress,
  artistsViewMode,
  setArtistsViewMode,
  artistsViewPress,
  setArtistsViewPress,
  colorMode,
  isDarkMode,
  displayedArtists,
  filteredArtists,
  filteredDisplayedArtists,
  formatDuration,
  getArtistsTabLabel,
  selectedArtistYear,
  setSelectedArtistYear,
  artistsByYear,
  selectedArtists,
  setSelectedArtists,
  setActiveTab,
  expandedArtistCards,
  setExpandedArtistCards,
  topArtistsCount,
  setTopArtistsCount,
  yearRange,
  yearRangeMode,
  setYearRangeMode,
}) {
  // Previous-year ranks (same sort metric) for rank-movement chips.
  // Only meaningful when a single year is selected.
  const prevRanks = useMemo(() => {
    if (yearRangeMode || !selectedArtistYear || selectedArtistYear === 'all' || !/^\d{4}$/.test(String(selectedArtistYear))) return null;
    const prev = artistsByYear?.[String(parseInt(selectedArtistYear, 10) - 1)];
    if (!prev || prev.length === 0) return null;
    const sorted = [...prev].sort((a, b) => (b[artistsSortBy] || 0) - (a[artistsSortBy] || 0));
    const map = new Map();
    sorted.forEach((a, i) => map.set(a.name, i + 1));
    return map;
  }, [artistsByYear, selectedArtistYear, yearRangeMode, artistsSortBy]);

  const rankChip = (name, rank) => {
    if (!prevRanks) return null;
    const prev = prevRanks.get(name);
    const delta = prev ? prev - rank : null;
    const prevYear = parseInt(selectedArtistYear, 10) - 1;
    return (
      <span
        className={`shrink-0 text-[10px] font-bold leading-none ${
          delta === null ? 'italic opacity-60'
          : delta > 0 ? 'text-green-600 dark:text-green-400'
          : delta < 0 ? 'text-red-500 dark:text-red-400'
          : 'opacity-40'
        }`}
        title={prev ? `#${prev} in ${prevYear}` : `not ranked in ${prevYear}`}
      >
        {delta === null ? 'new' : delta > 0 ? `\u25B2${delta}` : delta < 0 ? `\u25BC${-delta}` : '='}
      </span>
    );
  };

  return (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-blue-200 dark:bg-blue-900 rounded border-2 border-blue-300 dark:border-blue-700'
              : `p-2 sm:p-4 border ${isDarkMode ? 'border-[#4169E1]' : 'border-black'}`
          }>
            {/* Desktop layout - title, controls, and search on same row */}
            <div className={`hidden sm:flex justify-between items-center gap-2 mb-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                <h3 className={
                  colorMode === 'colorful'
                    ? 'text-xl text-blue-700 dark:text-blue-300 whitespace-nowrap'
                    : 'text-xl whitespace-nowrap'
                }>
                  {getArtistsTabLabel()}
                </h3>

                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => setArtistSelectionMode(prev => !prev)}
                    className={
                      colorMode === 'colorful'
                        ? `px-3 py-1 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                            artistSelectionMode
                              ? (isDarkMode ? 'bg-blue-800 text-blue-300 border border-blue-600 shadow-[inset_2px_2px_0_0_#2563eb] translate-x-[1px] translate-y-[1px]' : 'bg-blue-100 text-blue-700 border border-blue-700 shadow-[inset_2px_2px_0_0_#1d4ed8] translate-x-[1px] translate-y-[1px]')
                              : (isDarkMode ? 'bg-blue-800 text-blue-300 border border-blue-600 shadow-[2px_2px_0_0_#2563eb] hover:opacity-80' : 'bg-blue-100 text-blue-700 border border-blue-700 shadow-[2px_2px_0_0_#1d4ed8] hover:opacity-80')
                          }`
                        : `px-3 py-1 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                            artistSelectionMode
                              ? (isDarkMode ? 'bg-black text-white border border-[#4169E1] shadow-[inset_2px_2px_0_0_#4169E1] translate-x-[1px] translate-y-[1px]' : 'bg-white text-black border border-black shadow-[inset_2px_2px_0_0_black] translate-x-[1px] translate-y-[1px]')
                              : (isDarkMode ? 'border border-[#4169E1] bg-black text-white hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'border border-black bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]')
                          }`
                    }
                  >
                    🎵 {artistSelectionMode ? 'Cancel' : 'View Playlist'}
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={artistSearch}
                      onChange={(e) => setArtistSearch(e.target.value)}
                      placeholder="Search artists..."
                      className={
                        colorMode === 'colorful'
                          ? 'w-full border border-blue-300 dark:border-blue-600 rounded px-2 py-1 text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 focus:border-blue-500 focus:ring-blue-500 focus:outline-none placeholder-blue-600 dark:placeholder-blue-500'
                          : `w-full border rounded px-2 py-1 text-sm focus:outline-none ${isDarkMode ? 'border-[#4169E1] bg-black text-white' : 'border-black bg-white text-black'}`
                      }
                    />
                    {artistSearch && (
                      <button
                        onClick={() => setArtistSearch('')}
                        className={
                          colorMode === 'colorful'
                            ? 'absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200'
                            : `absolute right-2 top-1/2 transform -translate-y-1/2 hover:opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`
                        }
                      >
                        ×
                      </button>
                    )}
                    {artistSearch && filteredArtists.length > 0 && (
                      <div className={
                        colorMode === 'colorful'
                          ? 'absolute z-10 w-full bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded shadow-lg mt-1'
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
                                ? 'px-2 py-1 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 cursor-pointer'
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
                    defaultValue={topArtistsCount}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                    onBlur={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= 500) setTopArtistsCount(v); else e.target.value = topArtistsCount; }}
                    className={
                      colorMode === 'colorful'
                        ? 'w-14 border border-blue-300 dark:border-blue-600 rounded px-1.5 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
                        : `w-14 border rounded px-1.5 py-1 text-xs ${isDarkMode ? 'border-[#4169E1] bg-black text-white' : 'border-black bg-white text-black'}`
                    }
                  />

                  <label className="text-xs">Sort by</label>
                  <button
                    key={`artists-sort-d-${artistsSortPress}`}
                    onClick={() => { setArtistsSortBy(artistsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed'); setArtistsSortPress(p => p + 1); }}
                    className={
                      colorMode === 'colorful'
                        ? `px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${isDarkMode ? 'bg-blue-800 text-blue-300 border border-blue-600 shadow-[2px_2px_0_0_#2563eb]' : 'bg-blue-100 text-blue-700 border border-blue-700 shadow-[2px_2px_0_0_#1d4ed8]'} ${artistsSortPress > 0 ? (isDarkMode ? 'btn-press-blue-dark' : 'btn-press-blue-light') : ''}`
                        : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'} ${artistsSortPress > 0 ? (isDarkMode ? 'btn-press-dark' : 'btn-press-light') : ''}`
                    }
                  >
                    {artistsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
                  </button>
                  <button
                    key={`artists-view-d-${artistsViewPress}`}
                    onClick={() => { setArtistsViewMode(artistsViewMode === 'grid' ? 'list' : 'grid'); setArtistsViewPress(p => p + 1); }}
                    className={
                      colorMode === 'colorful'
                        ? `px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${isDarkMode ? 'bg-blue-800 text-blue-300 border border-blue-600 shadow-[2px_2px_0_0_#2563eb]' : 'bg-blue-100 text-blue-700 border border-blue-700 shadow-[2px_2px_0_0_#1d4ed8]'} ${artistsViewPress > 0 ? (isDarkMode ? 'btn-press-blue-dark' : 'btn-press-blue-light') : ''}`
                        : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'} ${artistsViewPress > 0 ? (isDarkMode ? 'btn-press-dark' : 'btn-press-light') : ''}`
                    }
                  >
                    {artistsViewMode === 'grid' ? '☰' : '⊞'}
                  </button>
                </div>
              </div>

              {/* Mobile controls - single row */}
              <div className={`block sm:hidden mb-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-300' : ''}`}>
                <div className="flex items-center gap-1">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={artistSearch}
                      onChange={(e) => setArtistSearch(e.target.value)}
                      placeholder="Search..."
                      className={
                        colorMode === 'colorful'
                          ? 'w-full border border-blue-300 dark:border-blue-600 rounded px-2 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 focus:border-blue-500 focus:ring-blue-500 focus:outline-none placeholder-blue-600 dark:placeholder-blue-500'
                          : `w-full border rounded px-2 py-1 text-xs focus:outline-none ${isDarkMode ? 'border-[#4169E1] bg-black text-white' : 'border-black bg-white text-black'}`
                      }
                    />
                    {artistSearch && (
                      <button
                        onClick={() => setArtistSearch('')}
                        className={
                          colorMode === 'colorful'
                            ? 'absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200'
                            : `absolute right-2 top-1/2 transform -translate-y-1/2 hover:opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`
                        }
                      >
                        ×
                      </button>
                    )}
                    {artistSearch && filteredArtists.length > 0 && (
                      <div className={
                        colorMode === 'colorful'
                          ? 'absolute z-10 w-full bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-600 rounded shadow-lg mt-1'
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
                                ? 'px-2 py-1 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 cursor-pointer'
                                : `px-2 py-1 cursor-pointer ${isDarkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-black'}`
                            }
                          >
                            {artist}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setArtistSelectionMode(prev => !prev)}
                    className={
                      colorMode === 'colorful'
                        ? `px-1.5 py-1 rounded text-xs font-medium transition-all ${
                            artistSelectionMode
                              ? (isDarkMode ? 'bg-blue-800 text-blue-300 border border-blue-600 shadow-[inset_2px_2px_0_0_#2563eb] translate-x-[1px] translate-y-[1px]' : 'bg-blue-100 text-blue-700 border border-blue-700 shadow-[inset_2px_2px_0_0_#1d4ed8] translate-x-[1px] translate-y-[1px]')
                              : (isDarkMode ? 'bg-blue-800 text-blue-300 border border-blue-600 shadow-[2px_2px_0_0_#2563eb] hover:opacity-80' : 'bg-blue-100 text-blue-700 border border-blue-700 shadow-[2px_2px_0_0_#1d4ed8] hover:opacity-80')
                          }`
                        : `px-1.5 py-1 rounded text-xs font-medium transition-colors ${
                            artistSelectionMode
                              ? (isDarkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-gray-300 text-black border border-gray-400')
                              : (isDarkMode ? 'border border-[#4169E1] bg-black text-white hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'border border-black bg-white text-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]')
                          }`
                    }
                  >
                    🎵
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    defaultValue={topArtistsCount}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                    onBlur={(e) => { const v = parseInt(e.target.value); if (v >= 1 && v <= 500) setTopArtistsCount(v); else e.target.value = topArtistsCount; }}
                    className={
                      colorMode === 'colorful'
                        ? 'w-10 border border-blue-300 dark:border-blue-600 rounded px-1 py-1 text-xs bg-blue-50 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                        : `w-10 border rounded px-1 py-1 text-xs ${isDarkMode ? 'border-[#4169E1] bg-black text-white' : 'border-black bg-white text-black'}`
                    }
                  />
                  <button
                    key={`artists-sort-m-${artistsSortPress}`}
                    onClick={() => { setArtistsSortBy(artistsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed'); setArtistsSortPress(p => p + 1); }}
                    className={
                      colorMode === 'colorful'
                        ? `px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 ${isDarkMode ? 'bg-blue-800 text-blue-300 border border-blue-600 shadow-[2px_2px_0_0_#2563eb]' : 'bg-blue-100 text-blue-700 border border-blue-700 shadow-[2px_2px_0_0_#1d4ed8]'} ${artistsSortPress > 0 ? (isDarkMode ? 'btn-press-blue-dark' : 'btn-press-blue-light') : ''}`
                        : `px-2 py-1 rounded text-xs font-medium transition-colors ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'} ${artistsSortPress > 0 ? (isDarkMode ? 'btn-press-dark' : 'btn-press-light') : ''}`
                    }
                  >
                    {artistsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
                  </button>
                </div>
                {artistSelectionMode && (
                  <p className={
                    colorMode === 'colorful'
                      ? 'text-xs text-center text-blue-600 dark:text-blue-400 mt-1'
                      : `text-xs text-center mt-1 ${isDarkMode ? 'text-white' : 'text-black'}`
                  }>
                    👆 Tap any artist below to view their tracks
                  </p>
                )}
              </div>

              {/* Desktop artist selection mode hint */}
              {artistSelectionMode && (
                <div className="hidden sm:block">
                  <p className={
                    colorMode === 'colorful'
                      ? 'text-sm text-center text-blue-600 dark:text-blue-400 mb-2'
                      : `text-sm text-center mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`
                  }>
                    👆 Click on any artist below to view their custom track rankings
                  </p>
                </div>
              )}
              
              {/* Selected artist filter chips */}
              {selectedArtists.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mb-2">
                  <span className={
                    colorMode === 'colorful'
                      ? 'text-blue-700 dark:text-blue-200 text-xs font-medium'
                      : 'text-xs font-medium'
                  }>Filtered:</span>
                  {selectedArtists.map(artist => (
                    <span
                      key={artist}
                      className={
                        colorMode === 'colorful'
                          ? 'inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-700 text-blue-700 dark:text-blue-200 rounded-full text-xs'
                          : `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${isDarkMode ? 'border-[#4169E1] text-white' : 'border-black text-black'}`
                      }
                    >
                      {artist}
                      <button
                        onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                        className={
                          colorMode === 'colorful'
                            ? 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-200'
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
                        ? 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 text-xs ml-1'
                        : `text-xs ml-1 hover:opacity-70 ${isDarkMode ? 'text-white' : 'text-black'}`
                    }
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Artists Display */}
              {displayedArtists && displayedArtists.length > 0 ? (
                artistsViewMode === 'list' ? (
                  // Table-based list view
                  <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
                    <div className="min-w-full">
                      <table className="w-full border-collapse text-sm sm:text-base">
                        <thead>
                          <tr className={`border-b ${colorMode === 'colorful' ? 'border-blue-300 dark:border-blue-600' : (isDarkMode ? 'border-[#4169E1]' : 'border-black')}`}>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>Rank</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm whitespace-nowrap`}>Artist</th>
                            <th className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm whitespace-nowrap`}>Time</th>
                            <th className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>Plays</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden md:table-cell`}>Top Song</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden ml:table-cell`}>Top Album</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden lg:table-cell`}>First Song</th>
                            <th className={`p-1 sm:p-2 text-left ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden lg:table-cell`}>First Listen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(filteredDisplayedArtists.length > 0 ? filteredDisplayedArtists : displayedArtists)
                            .slice(0, topArtistsCount)
                            .map((artist) => {
                              const originalRank = displayedArtists.indexOf(artist) + 1;
                              return (
                              <tr
                                key={artist.name}
                                onClick={() => {
                                  if (artistSelectionMode) {
                                    setActiveTab('custom');
                                    setSelectedArtists([artist.name]);
                                    setArtistSelectionMode(false);
                                  }
                                }}
                                className={`border-b ${colorMode === 'colorful' ? 'border-blue-300 dark:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-700' : (isDarkMode ? 'border-[#4169E1] hover:bg-gray-800' : 'border-black hover:bg-gray-100')} ${artistSelectionMode ? 'cursor-pointer' : ''}`}
                              >
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} font-medium text-xs sm:text-sm`}>{originalRank}</td>
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm whitespace-nowrap`}>{artist.name}</td>
                                <td className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm whitespace-nowrap`}>{formatDuration(artist.totalPlayed)}</td>
                                <td className={`p-1 sm:p-2 text-right ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm`}>{artist.playCount?.toLocaleString() || 0}</td>
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden md:table-cell`}>{artist.mostPlayedSong?.trackName || '-'}</td>
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden ml:table-cell`}>{artist.mostPlayedAlbum?.albumName || '-'}</td>
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden lg:table-cell`}>{artist.firstSong || '-'}</td>
                                <td className={`p-1 sm:p-2 ${colorMode === 'colorful' ? 'text-blue-700 dark:text-blue-200' : ''} text-xs sm:text-sm hidden lg:table-cell`}>{artist.firstListen ? new Date(artist.firstListen).toLocaleDateString() : '-'}</td>
                              </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  // Grid view
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 items-start">
                    {(filteredDisplayedArtists.length > 0 ? filteredDisplayedArtists : displayedArtists)
                      .slice(0, topArtistsCount)
                      .map((artist) => {
                        const originalRank = displayedArtists.indexOf(artist) + 1;
                        const goToArtistSongs = () => {
                          setActiveTab('custom');
                          setSelectedArtists([artist.name]);
                          setArtistSelectionMode(false);
                        };
                        const handleArtistClick = () => {
                          if (!artistSelectionMode) {
                            return;
                          }
                          goToArtistSongs();
                        };

                        const cardBg = colorMode === 'colorful'
                          ? 'bg-blue-100 dark:bg-blue-800'
                          : (isDarkMode ? 'bg-black' : 'bg-white');
                        const cardBorder = colorMode === 'colorful'
                          ? 'border-blue-300 dark:border-blue-600'
                          : (isDarkMode ? 'border-[#4169E1]' : 'border-black');
                        const cardText = colorMode === 'colorful'
                          ? 'text-blue-700 dark:text-blue-200'
                          : '';
                        const cardTextLight = colorMode === 'colorful'
                          ? 'text-blue-600 dark:text-blue-300'
                          : (isDarkMode ? 'text-white' : 'text-black');

                        const isExpanded = !!expandedArtistCards[artist.name];
                        const toggleExpanded = (e) => {
                          e.stopPropagation();
                          setExpandedArtistCards(prev => ({
                            ...prev,
                            [artist.name]: !prev[artist.name],
                          }));
                        };

                        return (
                          <div
                            key={artist.name}
                            onClick={handleArtistClick}
                            className={`
                              ${artistSelectionMode ? 'cursor-pointer' : 'cursor-default'}
                              p-3 ${cardBg} rounded border ${cardBorder} text-center
                              ${colorMode === 'minimal' ? (isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]') : 'shadow-sm'}
                              ${artistSelectionMode
                                ? (colorMode === 'colorful'
                                    ? 'ring-2 ring-blue-300 ring-opacity-50 hover:bg-blue-100 dark:hover:bg-blue-700'
                                    : 'ring-2 ring-gray-400 ring-opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800')
                                : ''
                              }
                            `}
                          >
                            {/* Row 1: position + name + toggle */}
                            <div className={`flex items-center justify-between font-bold text-base leading-tight mb-2 ${cardText}`}>
                              <RankBadge rank={originalRank} isDarkMode={isDarkMode} />
                              {rankChip(artist.name, originalRank)}
                              <span
                                className="flex-1 text-center cursor-pointer hover:underline"
                                title={`See your ${artist.name} songs`}
                                onClick={(e) => { e.stopPropagation(); goToArtistSongs(); }}
                              >{artist.name}</span>
                              <button
                                type="button"
                                onClick={toggleExpanded}
                                className="w-5 text-sm opacity-60 hover:opacity-100 leading-none cursor-pointer"
                              >
                                {isExpanded ? '−' : '+'}
                              </button>
                            </div>

                            {/* Expanded details: time | plays | since + first song */}
                            {isExpanded && (
                              <div className={`mb-2 text-xs ${cardTextLight}`}>
                                <div className="grid grid-cols-3 gap-1">
                                  <div>
                                    <div className="opacity-60">Time</div>
                                    <div className="font-bold">{formatDuration(artist.totalPlayed)}</div>
                                  </div>
                                  <div>
                                    <div className="opacity-60">Plays</div>
                                    <div className="font-bold">{artist.playCount?.toLocaleString() || 0}</div>
                                  </div>
                                  <div>
                                    <div className="opacity-60">Since</div>
                                    <div className="font-bold">{artist.firstListen ? new Date(artist.firstListen).toLocaleDateString() : '—'}</div>
                                  </div>
                                </div>
                                {artist.firstSong && (
                                  <div className="flex justify-between gap-2 mt-2">
                                    <span className="opacity-60 shrink-0">First Song</span>
                                    <span className="font-bold text-right break-words min-w-0">{artist.firstSong}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Full-width fact rows: label left, value right */}
                            <div className={`space-y-1 text-xs ${cardTextLight}`}>
                              {artist.mostPlayedSong && (
                                <div className="flex justify-between gap-2">
                                  <span className="opacity-60 shrink-0">Top Song</span>
                                  <span className={`font-bold text-right min-w-0 ${isExpanded ? 'break-words' : 'truncate'}`} title={artist.mostPlayedSong.trackName}>{artist.mostPlayedSong.trackName}</span>
                                </div>
                              )}
                              {artist.mostPlayedAlbum && (
                                <div className="flex justify-between gap-2">
                                  <span className="opacity-60 shrink-0">Top Album</span>
                                  <span className={`font-bold text-right min-w-0 ${isExpanded ? 'break-words' : 'truncate'}`} title={artist.mostPlayedAlbum.albumName}>{artist.mostPlayedAlbum.albumName}</span>
                                </div>
                              )}
                            </div>

                            {/* Play bar — relative to #1 by the active sort metric */}
                            <RankBar
                              value={artistsSortBy === 'playCount' ? (artist.playCount || 0) : (artist.totalPlayed || 0)}
                              max={artistsSortBy === 'playCount' ? (displayedArtists[0]?.playCount || 0) : (displayedArtists[0]?.totalPlayed || 0)}
                              label={artistsSortBy === 'playCount'
                                ? `${(artist.playCount || 0).toLocaleString()} plays`
                                : formatDuration(artist.totalPlayed)}
                              className={cardText || (isDarkMode ? 'text-[#4169E1]' : 'text-black')}
                            />
                          </div>
                        );
                      })}
                  </div>
                )
              ) : (
                <div className={
                  colorMode === 'colorful'
                    ? 'p-6 text-center bg-blue-100 dark:bg-blue-800 rounded border-2 border-blue-300 dark:border-blue-600'
                    : `p-6 text-center rounded border-2 ${isDarkMode ? 'bg-black border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'bg-white border-black shadow-[1px_1px_0_0_black]'}`
                }>
                  <h4 className={
                    colorMode === 'colorful'
                      ? 'text-lg font-bold text-blue-700 dark:text-blue-200'
                      : 'text-lg font-bold'
                  }>No artists found</h4>
                  <p className={
                    colorMode === 'colorful'
                      ? 'text-blue-600 dark:text-blue-300 mt-2'
                      : `mt-2 ${isDarkMode ? 'text-white' : 'text-black'}`
                  }>
                    {yearRangeMode
                      ? `No artists found for the year range ${yearRange.startYear} - ${yearRange.endYear}.`
                      : selectedArtistYear !== 'all'
                        ? `No artists found for the year ${selectedArtistYear}.`
                        : "No artist data available."}
                  </p>
                  <button
                    onClick={() => {
                      setYearRangeMode(false);
                      setSelectedArtistYear('all');
                      setSelectedArtists([]);
                    }}
                    className={
                      colorMode === 'colorful'
                        ? 'mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                        : `mt-4 px-4 py-2 rounded ${isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'}`
                    }
                  >
                    Show All Artists
                  </button>
                </div>
              )}
          </div>
  );
}
