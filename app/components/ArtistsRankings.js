import React, { useState, useEffect } from 'react';
import { useTheme } from './themeprovider.js';

const ArtistsRankings = ({
  displayedArtists = [],
  filteredDisplayedArtists = [],
  selectedArtists = [],
  topArtistsCount = 100,
  artistsViewMode = 'grid',
  artistsSortBy = 'totalPlayed',
  getArtistsTabLabel,
  selectedArtistYear = 'all',
  // Artist search functionality
  filteredArtists = [],
  artistSearch = '',
  // Callback functions
  setTopArtistsCount,
  setArtistsViewMode,
  setArtistsSortBy,
  setSelectedArtists,
  setArtistSearch,
  setActiveTab,
  setArtistSelectionMode,
  artistSelectionMode = false,
  formatDuration,
  // Theme props
  colorTheme = 'blue',
  backgroundTheme = null,
  textTheme = null
}) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // Get the current theme and colorblind adjustment function
  const { theme, getColorblindAdjustedTheme } = useTheme() || {};
  const isDarkMode = theme === 'dark';
  
  // Helper function to get themed colors (flexible theming system)
  const getThemedColors = () => {
    // Apply colorblind adjustments to themes
    const adjustedTextTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(textTheme || colorTheme) : (textTheme || colorTheme);
    const adjustedBackgroundTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(backgroundTheme || colorTheme) : (backgroundTheme || colorTheme);
    const adjustedColorTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(colorTheme) : colorTheme;
    
    const textColors = {
      blue: { text: isDarkMode ? 'text-blue-300' : 'text-blue-700', textLight: isDarkMode ? 'text-blue-400' : 'text-blue-600', textDark: isDarkMode ? 'text-blue-200' : 'text-blue-800' },
      yellow: { text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700', textLight: isDarkMode ? 'text-yellow-400' : 'text-yellow-600', textDark: isDarkMode ? 'text-yellow-200' : 'text-yellow-800' },
      cyan: { text: isDarkMode ? 'text-cyan-300' : 'text-cyan-700', textLight: isDarkMode ? 'text-cyan-400' : 'text-cyan-600', textDark: isDarkMode ? 'text-cyan-200' : 'text-cyan-800' },
      teal: { text: isDarkMode ? 'text-teal-300' : 'text-teal-700', textLight: isDarkMode ? 'text-teal-400' : 'text-teal-600', textDark: isDarkMode ? 'text-teal-200' : 'text-teal-800' },
      violet: { text: isDarkMode ? 'text-violet-300' : 'text-violet-700', textLight: isDarkMode ? 'text-violet-400' : 'text-violet-600', textDark: isDarkMode ? 'text-violet-200' : 'text-violet-800' },
      purple: { text: isDarkMode ? 'text-purple-300' : 'text-purple-700', textLight: isDarkMode ? 'text-purple-400' : 'text-purple-600', textDark: isDarkMode ? 'text-purple-200' : 'text-purple-800' },
      indigo: { text: isDarkMode ? 'text-indigo-300' : 'text-indigo-700', textLight: isDarkMode ? 'text-indigo-400' : 'text-indigo-600', textDark: isDarkMode ? 'text-indigo-200' : 'text-indigo-800' },
      orange: { text: isDarkMode ? 'text-orange-300' : 'text-orange-700', textLight: isDarkMode ? 'text-orange-400' : 'text-orange-600', textDark: isDarkMode ? 'text-orange-200' : 'text-orange-800' },
      red: { text: isDarkMode ? 'text-red-300' : 'text-red-700', textLight: isDarkMode ? 'text-red-400' : 'text-red-600', textDark: isDarkMode ? 'text-red-200' : 'text-red-800' },
      green: { text: isDarkMode ? 'text-green-300' : 'text-green-700', textLight: isDarkMode ? 'text-green-400' : 'text-green-600', textDark: isDarkMode ? 'text-green-200' : 'text-green-800' },
      gray: { text: isDarkMode ? 'text-gray-300' : 'text-gray-700', textLight: isDarkMode ? 'text-gray-400' : 'text-gray-600', textDark: isDarkMode ? 'text-gray-200' : 'text-gray-800' },
      slate: { text: isDarkMode ? 'text-slate-300' : 'text-slate-700', textLight: isDarkMode ? 'text-slate-400' : 'text-slate-600', textDark: isDarkMode ? 'text-slate-200' : 'text-slate-800' }
    };

    const backgroundColors = {
      blue: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-blue-700' : 'border-blue-200',
        borderHover: isDarkMode ? 'border-blue-500' : 'border-blue-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-blue-50',
        bgButton: isDarkMode ? 'bg-blue-800' : 'bg-blue-600', bgButtonHover: isDarkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-700',
        bgSelected: isDarkMode ? 'bg-blue-600' : 'bg-blue-600', bgSelectedHover: isDarkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-700',
        focusRing: isDarkMode ? 'focus:ring-blue-400' : 'focus:ring-blue-400',
        wrapper: isDarkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-100 border-blue-300'
      },
      yellow: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-yellow-700' : 'border-yellow-200',
        borderHover: isDarkMode ? 'border-yellow-500' : 'border-yellow-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-yellow-50',
        bgButton: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-600', bgButtonHover: isDarkMode ? 'hover:bg-yellow-700' : 'hover:bg-yellow-700',
        bgSelected: isDarkMode ? 'bg-yellow-600' : 'bg-yellow-600', bgSelectedHover: isDarkMode ? 'hover:bg-yellow-700' : 'hover:bg-yellow-700',
        focusRing: isDarkMode ? 'focus:ring-yellow-400' : 'focus:ring-yellow-400',
        wrapper: isDarkMode ? 'bg-yellow-900 border-yellow-800' : 'bg-yellow-100 border-yellow-300'
      },
      cyan: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-cyan-700' : 'border-cyan-200',
        borderHover: isDarkMode ? 'border-cyan-500' : 'border-cyan-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-cyan-50',
        bgButton: isDarkMode ? 'bg-cyan-800' : 'bg-cyan-600', bgButtonHover: isDarkMode ? 'hover:bg-cyan-700' : 'hover:bg-cyan-700',
        bgSelected: isDarkMode ? 'bg-cyan-600' : 'bg-cyan-600', bgSelectedHover: isDarkMode ? 'hover:bg-cyan-700' : 'hover:bg-cyan-700',
        focusRing: isDarkMode ? 'focus:ring-cyan-400' : 'focus:ring-cyan-400',
        wrapper: isDarkMode ? 'bg-cyan-900 border-cyan-800' : 'bg-cyan-100 border-cyan-300'
      },
      teal: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-teal-700' : 'border-teal-200',
        borderHover: isDarkMode ? 'border-teal-500' : 'border-teal-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-teal-50',
        bgButton: isDarkMode ? 'bg-teal-800' : 'bg-teal-600', bgButtonHover: isDarkMode ? 'hover:bg-teal-700' : 'hover:bg-teal-700',
        bgSelected: isDarkMode ? 'bg-teal-600' : 'bg-teal-600', bgSelectedHover: isDarkMode ? 'hover:bg-teal-700' : 'hover:bg-teal-700',
        focusRing: isDarkMode ? 'focus:ring-teal-400' : 'focus:ring-teal-400',
        wrapper: isDarkMode ? 'bg-teal-900 border-teal-800' : 'bg-teal-100 border-teal-300'
      },
      violet: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-violet-700' : 'border-violet-200',
        borderHover: isDarkMode ? 'border-violet-500' : 'border-violet-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-violet-50',
        bgButton: isDarkMode ? 'bg-violet-800' : 'bg-violet-600', bgButtonHover: isDarkMode ? 'hover:bg-violet-700' : 'hover:bg-violet-700',
        bgSelected: isDarkMode ? 'bg-violet-600' : 'bg-violet-600', bgSelectedHover: isDarkMode ? 'hover:bg-violet-700' : 'hover:bg-violet-700',
        focusRing: isDarkMode ? 'focus:ring-violet-400' : 'focus:ring-violet-400',
        wrapper: isDarkMode ? 'bg-violet-900 border-violet-800' : 'bg-violet-100 border-violet-300'
      },
      purple: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-purple-700' : 'border-purple-200',
        borderHover: isDarkMode ? 'border-purple-500' : 'border-purple-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-purple-50',
        bgButton: isDarkMode ? 'bg-purple-800' : 'bg-purple-600', bgButtonHover: isDarkMode ? 'hover:bg-purple-700' : 'hover:bg-purple-700',
        bgSelected: isDarkMode ? 'bg-purple-600' : 'bg-purple-600', bgSelectedHover: isDarkMode ? 'hover:bg-purple-700' : 'hover:bg-purple-700',
        focusRing: isDarkMode ? 'focus:ring-purple-400' : 'focus:ring-purple-400',
        wrapper: isDarkMode ? 'bg-purple-900 border-purple-800' : 'bg-purple-100 border-purple-300'
      },
      gray: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
        borderHover: isDarkMode ? 'border-gray-500' : 'border-gray-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-gray-600', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-700',
        bgSelected: isDarkMode ? 'bg-gray-600' : 'bg-gray-600', bgSelectedHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-700',
        focusRing: isDarkMode ? 'focus:ring-gray-400' : 'focus:ring-gray-400',
        wrapper: isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-300'
      },
      slate: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-slate-700' : 'border-slate-200',
        borderHover: isDarkMode ? 'border-slate-500' : 'border-slate-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-slate-50',
        bgButton: isDarkMode ? 'bg-slate-800' : 'bg-slate-600', bgButtonHover: isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-700',
        bgSelected: isDarkMode ? 'bg-slate-600' : 'bg-slate-600', bgSelectedHover: isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-700',
        focusRing: isDarkMode ? 'focus:ring-slate-400' : 'focus:ring-slate-400',
        wrapper: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'
      }
    };

    const textColorObj = textColors[adjustedTextTheme] || textColors.blue;
    const backgroundColorObj = backgroundColors[adjustedBackgroundTheme] || backgroundColors.blue;

    return { ...textColorObj, ...backgroundColorObj };
  };

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const colors = getThemedColors();

  return (
    <div className={`p-2 sm:p-4 rounded border-2 ${colors.wrapper}`}>
      {/* Title - mobile gets its own row */}
      <div className="block sm:hidden mb-1">
        <h3 className={`font-bold ${colors.text}`}>
          {getArtistsTabLabel()}
        </h3>
      </div>
      
      {/* Desktop layout - title and controls on same row */}
      <div className="hidden sm:flex justify-between items-center mb-2">
        <h3 className={`font-bold ${colors.text}`}>
          {getArtistsTabLabel()}
        </h3>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className={colors.text}>Show Top</label>
            <input
              type="number"
              min="1"
              max="500"
              value={topArtistsCount}
              onChange={(e) => setTopArtistsCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 10)))}
              className={`w-16 border rounded px-2 py-1 ${colors.text} ${colors.border}`}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className={colors.text}>View Mode</label>
            <button
              onClick={() => {
                const modes = ['grid', 'compact', 'mobile'];
                const currentIndex = modes.indexOf(artistsViewMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                setArtistsViewMode(modes[nextIndex]);
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${colors.bgButton} text-white ${colors.bgButtonHover}`}
            >
              {artistsViewMode === 'grid' ? 'Grid' : 
               artistsViewMode === 'compact' ? 'Compact' : 'Mobile'}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <label className={colors.text}>Sort by</label>
            <button
              onClick={() => setArtistsSortBy(artistsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${colors.bgButton} text-white ${colors.bgButtonHover}`}
            >
              {artistsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile controls */}
      <div className="block sm:hidden space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className={colors.text}>Top</label>
            <input
              type="number"
              min="1"
              max="500"
              value={topArtistsCount}
              onChange={(e) => setTopArtistsCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 10)))}
              className={`w-16 border rounded px-2 py-1 ${colors.text} ${colors.border}`}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const modes = ['grid', 'compact', 'mobile'];
                const currentIndex = modes.indexOf(artistsViewMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                setArtistsViewMode(modes[nextIndex]);
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${colors.bgButton} text-white ${colors.bgButtonHover}`}
            >
              {artistsViewMode === 'grid' ? 'Grid' : 
               artistsViewMode === 'compact' ? 'Compact' : 'Mobile'}
            </button>
            
            <button
              onClick={() => setArtistsSortBy(artistsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${colors.bgButton} text-white ${colors.bgButtonHover}`}
            >
              {artistsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Artist Selection */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedArtists.map(artist => (
              <div 
                key={artist} 
                className={`flex items-center ${colors.bgSelected} text-white px-2 py-1 rounded text-sm`}
              >
                {artist}
                <button 
                  onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                  className="ml-2 text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              value={artistSearch}
              onChange={(e) => setArtistSearch(e.target.value)}
              placeholder="Search artists..."
              className={`w-full border rounded px-2 py-1 ${colors.text} ${colors.border} ${colors.borderHover} ${colors.focusRing} focus:outline-none`}
            />
            {artistSearch && (
              <button
                onClick={() => setArtistSearch('')}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${colors.textLight} hover:${colors.text}`}
              >
                ×
              </button>
            )}
            {artistSearch && filteredArtists.length > 0 && (
              <div className={`absolute z-10 w-full ${colors.bg} border rounded shadow-lg mt-1 ${colors.border}`}>
                {filteredArtists.map(artist => (
                  <div
                    key={artist}
                    onClick={() => {
                      setSelectedArtists(prev => [...prev, artist]);
                      setArtistSearch('');
                    }}
                    className={`px-2 py-1 ${colors.bgLight} ${colors.text} cursor-pointer`}
                  >
                    {artist}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* View Artist Playlist Button */}
        <div className="mb-4 flex flex-col items-center gap-2">
          <button
            onClick={() => {
              setArtistSelectionMode(prev => !prev);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              artistSelectionMode
                ? `${colors.bgLight} ${colors.text} border ${colors.border}`
                : `${colors.bgButton} text-white ${colors.bgButtonHover} border ${colors.border}`
            }`}
          >
            🎵 View Artist Playlist
          </button>
          {artistSelectionMode && (
            <p className={`text-sm text-center ${colors.textLight}`}>
              👆 Click on any artist below to view their custom track rankings
            </p>
          )}
        </div>
        
        {/* Artists Display */}
        {displayedArtists && displayedArtists.length > 0 ? (
          <div className={`
            ${artistsViewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 
              artistsViewMode === 'compact' ? 'space-y-2' : 'space-y-1'}
          `}>
            {(filteredDisplayedArtists.length > 0 ? filteredDisplayedArtists : displayedArtists)
              .slice(0, topArtistsCount)
              .map((artist, index) => {
                const handleArtistClick = () => {
                  if (!artistSelectionMode) {
                    return;
                  }
                  setActiveTab('custom');
                };

                return (
                  <div 
                    key={artist.artist || artist} 
                    className={`
                      ${artistsViewMode === 'grid' ? 
                        `${colors.bg} border rounded-lg p-4 ${colors.border} ${colors.borderHover} transition-colors ${artistSelectionMode ? 'cursor-pointer' : ''}` :
                        artistsViewMode === 'compact' ?
                        `flex items-center justify-between p-2 ${colors.bg} border rounded ${colors.border} ${colors.borderHover} transition-colors ${artistSelectionMode ? 'cursor-pointer' : ''}` :
                        `flex items-center justify-between p-1 text-sm ${colors.bg} ${artistSelectionMode ? 'cursor-pointer' : ''}`
                      }
                    `}
                    onClick={handleArtistClick}
                  >
                    <div className={artistsViewMode === 'grid' ? 'text-center' : 'flex items-center flex-1'}>
                      <span className={`${colors.text} font-medium ${artistsViewMode === 'grid' ? 'text-lg' : 'text-sm'}`}>
                        {artistsViewMode !== 'mobile' && `${index + 1}. `}
                        {typeof artist === 'string' ? artist : artist.artist}
                      </span>
                      {artistsViewMode === 'grid' && typeof artist === 'object' && (
                        <div className={`mt-2 space-y-1 ${colors.textLight}`}>
                          <div>Plays: {artist.playCount?.toLocaleString() || 'N/A'}</div>
                          <div>Time: {formatDuration ? formatDuration(artist.totalPlayed) : artist.totalPlayed}</div>
                        </div>
                      )}
                    </div>
                    
                    {artistsViewMode !== 'grid' && typeof artist === 'object' && (
                      <div className={`text-right ${colors.textLight} ${artistsViewMode === 'compact' ? 'text-sm' : 'text-xs'}`}>
                        <div>Plays: {artist.playCount?.toLocaleString() || 'N/A'}</div>
                        <div>Time: {formatDuration ? formatDuration(artist.totalPlayed) : artist.totalPlayed}</div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className={`text-center ${colors.textLight} py-8`}>
            No artists available for the selected period
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistsRankings;