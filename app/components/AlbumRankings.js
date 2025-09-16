import React, { useState, useEffect } from 'react';
import { useTheme } from './themeprovider.js';
import AlbumCard from './albumcard.js';

const AlbumRankings = ({
  displayedAlbums = [],
  selectedArtists = [],
  topAlbumsCount = 20,
  albumsViewMode = 'grid',
  albumsSortBy = 'totalPlayed',
  getAlbumsTabLabel,
  // Callback functions
  setTopAlbumsCount,
  setAlbumsViewMode,
  setAlbumsSortBy,
  setSelectedArtists,
  formatDuration,
  processedData = [],
  // Theme props
  colorTheme = 'cyan',
  backgroundTheme = null,
  textTheme = null
}) => {
  const [isMobile, setIsMobile] = useState(false);
  
  // Get the current theme
  const { theme } = useTheme() || {};
  const isDarkMode = theme === 'dark';
  
  // Helper function to get themed colors with colorblind override
  const getThemedColors = () => {
    const { colorblindMode } = useTheme() || {};
    
    // Simple colorblind formula: override colors when colorblind mode is active
    let finalTextTheme = textTheme || colorTheme;
    let finalBackgroundTheme = backgroundTheme || colorTheme;
    
    if (colorblindMode && colorblindMode !== 'none') {
      // Apply the same colorblind mappings as TopTabs for albums (cyan base)
      // Use different background colors for better visual distinction
      switch (colorblindMode) {
        case 'protanopia':
          // cyan has no mapping, stays cyan
          finalTextTheme = 'cyan';
          finalBackgroundTheme = 'teal';  // Different background for variety
          break;
        case 'deuteranopia':
          // cyan has no mapping, stays cyan
          finalTextTheme = 'cyan';
          finalBackgroundTheme = 'blue';  // Different background for variety
          break;
        case 'tritanopia':
          // cyan → orange
          finalTextTheme = 'orange';
          finalBackgroundTheme = 'red';  // Complementary background
          break;
        case 'monochrome':
          // cyan → gray
          finalTextTheme = 'gray';
          finalBackgroundTheme = 'slate';  // Different gray variant
          break;
      }
    }
    
    const textColors = {
      cyan: { text: isDarkMode ? 'text-cyan-300' : 'text-cyan-700', textLight: isDarkMode ? 'text-cyan-400' : 'text-cyan-600', textDark: isDarkMode ? 'text-cyan-200' : 'text-cyan-800' },
      blue: { text: isDarkMode ? 'text-blue-300' : 'text-blue-700', textLight: isDarkMode ? 'text-blue-400' : 'text-blue-600', textDark: isDarkMode ? 'text-blue-200' : 'text-blue-800' },
      yellow: { text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700', textLight: isDarkMode ? 'text-yellow-400' : 'text-yellow-600', textDark: isDarkMode ? 'text-yellow-200' : 'text-yellow-800' },
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
      cyan: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-cyan-700' : 'border-cyan-200',
        borderHover: isDarkMode ? 'border-cyan-500' : 'border-cyan-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-cyan-50',
        bgButton: isDarkMode ? 'bg-cyan-800' : 'bg-cyan-600', bgButtonHover: isDarkMode ? 'hover:bg-cyan-700' : 'hover:bg-cyan-700',
        bgSelected: isDarkMode ? 'bg-cyan-600' : 'bg-cyan-600', bgSelectedHover: isDarkMode ? 'hover:bg-cyan-700' : 'hover:bg-cyan-700',
        focusRing: isDarkMode ? 'focus:ring-cyan-400' : 'focus:ring-cyan-400',
        wrapper: isDarkMode ? 'bg-cyan-900 border-cyan-800' : 'bg-cyan-100 border-cyan-300'
      },
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
      },
      orange: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-orange-700' : 'border-orange-200',
        borderHover: isDarkMode ? 'border-orange-500' : 'border-orange-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-orange-50',
        bgButton: isDarkMode ? 'bg-orange-800' : 'bg-orange-600', bgButtonHover: isDarkMode ? 'hover:bg-orange-700' : 'hover:bg-orange-700',
        bgSelected: isDarkMode ? 'bg-orange-600' : 'bg-orange-600', bgSelectedHover: isDarkMode ? 'hover:bg-orange-700' : 'hover:bg-orange-700',
        focusRing: isDarkMode ? 'focus:ring-orange-400' : 'focus:ring-orange-400',
        wrapper: isDarkMode ? 'bg-orange-900 border-orange-800' : 'bg-orange-100 border-orange-300'
      },
      red: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-red-700' : 'border-red-200',
        borderHover: isDarkMode ? 'border-red-500' : 'border-red-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-red-50',
        bgButton: isDarkMode ? 'bg-red-800' : 'bg-red-600', bgButtonHover: isDarkMode ? 'hover:bg-red-700' : 'hover:bg-red-700',
        bgSelected: isDarkMode ? 'bg-red-600' : 'bg-red-600', bgSelectedHover: isDarkMode ? 'hover:bg-red-700' : 'hover:bg-red-700',
        focusRing: isDarkMode ? 'focus:ring-red-400' : 'focus:ring-red-400',
        wrapper: isDarkMode ? 'bg-red-900 border-red-800' : 'bg-red-100 border-red-300'
      },
      indigo: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-indigo-700' : 'border-indigo-200',
        borderHover: isDarkMode ? 'border-indigo-500' : 'border-indigo-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-indigo-50',
        bgButton: isDarkMode ? 'bg-indigo-800' : 'bg-indigo-600', bgButtonHover: isDarkMode ? 'hover:bg-indigo-700' : 'hover:bg-indigo-700',
        bgSelected: isDarkMode ? 'bg-indigo-600' : 'bg-indigo-600', bgSelectedHover: isDarkMode ? 'hover:bg-indigo-700' : 'hover:bg-indigo-700',
        focusRing: isDarkMode ? 'focus:ring-indigo-400' : 'focus:ring-indigo-400',
        wrapper: isDarkMode ? 'bg-indigo-900 border-indigo-800' : 'bg-indigo-100 border-indigo-300'
      },
      green: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-green-700' : 'border-green-200',
        borderHover: isDarkMode ? 'border-green-500' : 'border-green-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-green-50',
        bgButton: isDarkMode ? 'bg-green-800' : 'bg-green-600', bgButtonHover: isDarkMode ? 'hover:bg-green-700' : 'hover:bg-green-700',
        bgSelected: isDarkMode ? 'bg-green-600' : 'bg-green-600', bgSelectedHover: isDarkMode ? 'hover:bg-green-700' : 'hover:bg-green-700',
        focusRing: isDarkMode ? 'focus:ring-green-400' : 'focus:ring-green-400',
        wrapper: isDarkMode ? 'bg-green-900 border-green-800' : 'bg-green-100 border-green-300'
      }
    };

    const textColorObj = textColors[finalTextTheme] || textColors.cyan;
    const backgroundColorObj = backgroundColors[finalBackgroundTheme] || backgroundColors.cyan;

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
          {getAlbumsTabLabel()}
        </h3>
      </div>
      
      {/* Desktop layout - title and controls on same row */}
      <div className="hidden sm:flex justify-between items-center mb-2">
        <h3 className={`font-bold ${colors.text}`}>
          {getAlbumsTabLabel()}
        </h3>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className={colors.text}>Show Top</label>
            <input
              type="number"
              min="1"
              max="500"
              value={topAlbumsCount}
              onChange={(e) => setTopAlbumsCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 20)))}
              className={`w-16 border rounded px-2 py-1 ${colors.text} ${colors.border}`}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <label className={colors.text}>View Mode</label>
            <button
              onClick={() => {
                const modes = ['grid', 'compact', 'mobile'];
                const currentIndex = modes.indexOf(albumsViewMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                setAlbumsViewMode(modes[nextIndex]);
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${colors.bgButton} text-white ${colors.bgButtonHover}`}
            >
              {albumsViewMode === 'grid' ? 'Grid' : 
               albumsViewMode === 'compact' ? 'Compact' : 'Mobile'}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <label className={colors.text}>Sort by</label>
            <button
              onClick={() => setAlbumsSortBy(albumsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${colors.bgButton} text-white ${colors.bgButtonHover}`}
            >
              {albumsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
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
              value={topAlbumsCount}
              onChange={(e) => setTopAlbumsCount(Math.min(500, Math.max(1, parseInt(e.target.value) || 20)))}
              className={`w-16 border rounded px-2 py-1 ${colors.text} ${colors.border}`}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const modes = ['grid', 'compact', 'mobile'];
                const currentIndex = modes.indexOf(albumsViewMode);
                const nextIndex = (currentIndex + 1) % modes.length;
                setAlbumsViewMode(modes[nextIndex]);
              }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${colors.bgButton} text-white ${colors.bgButtonHover}`}
            >
              {albumsViewMode === 'grid' ? 'Grid' : 
               albumsViewMode === 'compact' ? 'Compact' : 'Mobile'}
            </button>
            
            <button
              onClick={() => setAlbumsSortBy(albumsSortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${colors.bgButton} text-white ${colors.bgButtonHover}`}
            >
              {albumsSortBy === 'totalPlayed' ? 'Time' : 'Plays'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Artist Filter */}
        {selectedArtists.length > 0 && (
          <div className={`${colors.bg} p-3 rounded-lg border ${colors.border}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`${colors.text} font-medium`}>Filtered Artists ({selectedArtists.length}):</span>
              <button
                onClick={() => setSelectedArtists([])}
                className={`${colors.textLight} hover:${colors.text} text-sm`}
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedArtists.map(artist => (
                <span
                  key={artist}
                  className={`inline-flex items-center gap-1 px-2 py-1 ${colors.bgLight} ${colors.text} rounded-full text-xs`}
                >
                  {artist}
                  <button
                    onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
                    className={`ml-1 ${colors.textLight} hover:${colors.text}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Albums Display */}
        {displayedAlbums && displayedAlbums.length > 0 ? (
          <div className={`
            ${albumsViewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 
              albumsViewMode === 'compact' ? 'space-y-2' : 'space-y-1'}
          `}>
            {displayedAlbums.slice(0, topAlbumsCount).map((album, index) => 
              albumsViewMode === 'grid' ? (
                <AlbumCard 
                  key={`${album.artist}-${album.name}`}
                  album={{...album, rank: index + 1}} 
                  index={index} 
                  processedData={processedData} 
                  formatDuration={formatDuration}
                  textTheme={finalTextTheme}
                  backgroundTheme={finalBackgroundTheme}
                />
              ) : (
                <div 
                  key={`${album.artist}-${album.name}`}
                  className={`
                    ${albumsViewMode === 'compact' ?
                      `p-3 ${colors.bg} rounded-lg border ${colors.border} transition-all duration-200` :
                      `p-2 ${colors.bg} rounded border ${colors.border} transition-all duration-150`
                    }
                  `}
                >
                  <div className={`
                    ${albumsViewMode === 'compact' ? 'flex justify-between items-center' :
                      'flex justify-between items-center text-sm'}
                  `}>
                    <div className="flex-1">
                      <div className={`font-bold ${colors.text} ${
                        albumsViewMode === 'compact' ? 'text-base' : 'text-sm'
                      }`}>
                        {album.name}
                      </div>
                      <div className={`${colors.textLight} ${
                        albumsViewMode === 'compact' ? 'text-sm' : 'text-xs'
                      }`}>
                        by {album.artist}
                      </div>
                    </div>
                    
                    <span className={`${colors.textLight} font-medium mr-4`}>#{index + 1}</span>
                    
                    <div className={`text-right ${albumsViewMode === 'compact' ? 'text-sm' : 'text-xs'} ${colors.textLight}`}>
                      <div className="font-medium">{formatDuration(album.totalPlayed)}</div>
                      <div>{album.playCount?.toLocaleString() || 0} plays</div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className={`text-center ${colors.textLight} py-8`}>
            No albums available for the selected period
          </div>
        )}
      </div>
    </div>
  );
};

export default AlbumRankings;