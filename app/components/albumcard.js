import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Music } from 'lucide-react';
import { useTheme } from './themeprovider.js';

const AlbumCard = ({ album, index, processedData, formatDuration, textTheme = 'cyan', backgroundTheme = 'cyan' }) => {
  const [showTracks, setShowTracks] = useState(false);
  
  // Get theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Helper function to get themed colors
  const getThemedColors = () => {
    const textColors = {
      cyan: { text: isDarkMode ? 'text-cyan-300' : 'text-cyan-700', textLight: isDarkMode ? 'text-cyan-400' : 'text-cyan-600' },
      blue: { text: isDarkMode ? 'text-blue-300' : 'text-blue-700', textLight: isDarkMode ? 'text-blue-400' : 'text-blue-600' },
      green: { text: isDarkMode ? 'text-green-300' : 'text-green-700', textLight: isDarkMode ? 'text-green-400' : 'text-green-600' },
      amber: { text: isDarkMode ? 'text-amber-300' : 'text-amber-700', textLight: isDarkMode ? 'text-amber-400' : 'text-amber-600' },
      orange: { text: isDarkMode ? 'text-orange-300' : 'text-orange-700', textLight: isDarkMode ? 'text-orange-400' : 'text-orange-600' },
      red: { text: isDarkMode ? 'text-red-300' : 'text-red-700', textLight: isDarkMode ? 'text-red-400' : 'text-red-600' },
      indigo: { text: isDarkMode ? 'text-indigo-300' : 'text-indigo-700', textLight: isDarkMode ? 'text-indigo-400' : 'text-indigo-600' },
      emerald: { text: isDarkMode ? 'text-emerald-300' : 'text-emerald-700', textLight: isDarkMode ? 'text-emerald-400' : 'text-emerald-600' },
      gray: { text: isDarkMode ? 'text-gray-300' : 'text-gray-700', textLight: isDarkMode ? 'text-gray-400' : 'text-gray-600' },
      slate: { text: isDarkMode ? 'text-slate-300' : 'text-slate-700', textLight: isDarkMode ? 'text-slate-400' : 'text-slate-600' }
    };

    const backgroundColors = {
      cyan: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-cyan-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-cyan-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-cyan-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-cyan-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-cyan-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-cyan-100'
      },
      blue: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-blue-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-blue-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-blue-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-blue-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-blue-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-blue-100'
      },
      green: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-green-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-green-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-green-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-green-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-green-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-green-100'
      },
      amber: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-amber-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-amber-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-amber-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-amber-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-amber-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-amber-100'
      },
      orange: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-orange-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-orange-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-orange-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-orange-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-orange-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-orange-100'
      },
      red: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-red-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-red-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-red-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-red-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-red-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-red-100'
      },
      indigo: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-indigo-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-indigo-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-indigo-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-indigo-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-indigo-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-indigo-100'
      },
      emerald: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-emerald-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-emerald-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-emerald-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-emerald-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-emerald-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-emerald-100'
      },
      gray: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-gray-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-gray-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-gray-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
      },
      slate: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-800' : 'border-slate-200',
        borderHover: isDarkMode ? 'border-gray-700' : 'border-slate-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-slate-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-slate-100', bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-slate-50',
        bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-slate-100'
      }
    };

    const textColorObj = textColors[textTheme] || textColors.red;
    const backgroundColorObj = backgroundColors[backgroundTheme] || backgroundColors.cyan;

    return { ...textColorObj, ...backgroundColorObj };
  };
  
  const colors = getThemedColors();

  // Get album tracks with improved handling - use the trackObjects that are already provided
  const albumTracks = useMemo(() => {
    // Use pre-existing trackObjects if available
    if (album?.trackObjects && Array.isArray(album.trackObjects) && album.trackObjects.length > 0) {
      return album.trackObjects;
    }
    
    // Fall back to matching tracks from processedData
    return [];
  }, [album]);
  
  // Get top track and other tracks
  const topTrack = albumTracks.length > 0 ? albumTracks[0] : null;
  const otherTracks = albumTracks.slice(1);
  
  // Get the real track count - using the normalized count from album data
  const actualTrackCount = useMemo(() => {
    return album.trackCountValue || albumTracks.length || 0;
  }, [album, albumTracks]);
  
  // Calculate remaining tracks - this should match the number we actually have
  const remainingTracks = actualTrackCount - (topTrack ? 1 : 0);
  
  // Calculate completeness percentage
  const completenessPercentage = actualTrackCount > 0 
    ? Math.min(100, Math.round((albumTracks.length / actualTrackCount) * 100)) 
    : 0;

  // Sum all track plays to verify they match the album total
  const totalTrackPlays = useMemo(() => {
    return albumTracks.reduce((sum, track) => sum + (track.playCount || 0), 0);
  }, [albumTracks]);

  return (
    <div className={`p-3 ${colors.bg} rounded shadow-sm ${isDarkMode ? 'border-[0.5px]' : 'border'} ${colors.border} hover:${colors.borderHover} transition-all duration-300 relative`}>
      <div className={`font-bold ${colors.text}`}>{album.name}</div>
      
      <div className={`text-sm ${colors.textLight}`}>
        Artist: <span className="font-bold">{album.artist}</span> 
        <br/>
        Total Time: <span className="font-bold">{formatDuration(album.totalPlayed)}</span> 
        <br/>
        Plays: <span className="font-bold">{album.playCount || 0}</span> 
        <br/> 
        First Listen: <span className="font-bold">{new Date(album.firstListen).toLocaleDateString()}</span>
      </div>
      
      {/* Divider */}
      <div className={`${isDarkMode ? 'border-t-[0.5px]' : 'border-t'} ${colors.border} my-2`}></div>
      
      {/* Top Track Section */}
      <div className="mt-2">
        <div className={`font-medium ${colors.text}`}>Top Track:</div>
        {topTrack ? (
          <div className={`text-sm ${colors.textLight} p-1 ${colors.bgLight} rounded`}>
            {topTrack.trackName}
            <div className={`flex justify-between text-xs ${colors.textLight}`}>
              <span>{formatDuration(topTrack.totalPlayed)}</span>
              <span>{topTrack.playCount} plays</span>
            </div>
          </div>
        ) : (
          <div className={`text-sm ${colors.textLight} italic`}>No track data available</div>
        )}
      </div>
      
      {/* Track Dropdown Toggle */}
      {otherTracks.length > 0 && (
        <button 
          onClick={() => setShowTracks(!showTracks)}
          className={`mt-2 text-xs flex items-center justify-between w-full p-1 ${colors.text} ${colors.bgButton} hover:${colors.bgButton} rounded`}
        >
          <span className="flex items-center">
            <Music size={14} className="mr-1" />
            {showTracks ? 'Hide' : 'Show'} {otherTracks.length} more tracks
            {/* Only mention unavailable tracks if we know for certain we're missing some */}
            {remainingTracks > otherTracks.length && !showTracks && 
              <span className="ml-1">{` (${remainingTracks - otherTracks.length} unavailable)`}</span>}
          </span>
          {showTracks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
      
      {/* Track Dropdown Content */}
      {showTracks && otherTracks.length > 0 && (
        <div className={`mt-1 max-h-64 overflow-y-auto text-xs ${isDarkMode ? 'border-[0.5px]' : 'border'} ${colors.border} rounded`}>
          <div className={`sticky top-0 ${colors.bgHeader} p-1 text-xs text-center ${colors.text} font-medium`}>
            {/* Use the correct available tracks count */}
            {remainingTracks !== otherTracks.length ?
              `Showing ${otherTracks.length} of ${remainingTracks} remaining tracks` :
              `Showing all ${otherTracks.length} remaining tracks`}
          </div>
          {otherTracks.map((track, trackIndex) => (
            <div 
              key={`${track.trackName || 'unknown'}-${trackIndex}`}
              className={`p-1 ${trackIndex % 2 === 0 ? colors.bgStripe : colors.bg}`}
            >
              <div className={colors.text}>
                {track.trackName || 'Unknown Track'}
                {track.variations && track.variations.length > 1 && (
                  <span className={`text-xs ${colors.textLight} ml-1`}>
                    ({track.variations.length} versions)
                  </span>
                )}
              </div>
              <div className={`flex justify-between ${colors.textLight}`}>
                <span>{formatDuration(track.totalPlayed || 0)}</span>
                <span>{track.playCount || 0} plays</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className={`absolute top-1 right-3 ${colors.text} text-[2rem]`}>{index + 1}</div>
    </div>
  );
};

export default AlbumCard;