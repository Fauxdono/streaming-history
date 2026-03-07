import React, { useState, useMemo } from 'react';
import { useTheme } from './themeprovider.js';

const AlbumCard = ({ album, index, processedData, formatDuration, textTheme = 'cyan', backgroundTheme = 'cyan', colorMode = 'minimal' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTracks, setShowTracks] = useState(false);

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  const getThemedColors = () => {
    if (!isColorful) {
      return {
        text: '',
        textLight: isDarkMode ? 'text-white' : 'text-black',
        bg: isDarkMode ? 'bg-black' : 'bg-white',
        border: isDarkMode ? 'border-[#4169E1]' : 'border-black',
        bgLight: isDarkMode ? 'bg-black' : 'bg-white',
        bgButton: isDarkMode ? 'bg-black border border-[#4169E1]' : 'bg-white border border-black',
        bgStripe: isDarkMode ? 'bg-black' : 'bg-white',
        bgHeader: isDarkMode ? 'bg-black' : 'bg-white'
      };
    }

    const textColors = {
      cyan:    { text: isDarkMode ? 'text-cyan-300'    : 'text-cyan-700',    textLight: isDarkMode ? 'text-cyan-400'    : 'text-cyan-600' },
      blue:    { text: isDarkMode ? 'text-blue-300'    : 'text-blue-700',    textLight: isDarkMode ? 'text-blue-400'    : 'text-blue-600' },
      green:   { text: isDarkMode ? 'text-green-300'   : 'text-green-700',   textLight: isDarkMode ? 'text-green-400'   : 'text-green-600' },
      amber:   { text: isDarkMode ? 'text-amber-300'   : 'text-amber-700',   textLight: isDarkMode ? 'text-amber-400'   : 'text-amber-600' },
      orange:  { text: isDarkMode ? 'text-orange-300'  : 'text-orange-700',  textLight: isDarkMode ? 'text-orange-400'  : 'text-orange-600' },
      red:     { text: isDarkMode ? 'text-red-300'     : 'text-red-700',     textLight: isDarkMode ? 'text-red-400'     : 'text-red-600' },
      indigo:  { text: isDarkMode ? 'text-indigo-300'  : 'text-indigo-700',  textLight: isDarkMode ? 'text-indigo-400'  : 'text-indigo-600' },
      emerald: { text: isDarkMode ? 'text-emerald-300' : 'text-emerald-700', textLight: isDarkMode ? 'text-emerald-400' : 'text-emerald-600' }
    };

    const backgroundColors = {
      cyan:    { bg: isDarkMode ? 'bg-cyan-800'    : 'bg-cyan-100',    border: isDarkMode ? 'border-cyan-600'    : 'border-cyan-300',    bgLight: isDarkMode ? 'bg-cyan-900'    : 'bg-cyan-200',    bgButton: isDarkMode ? 'bg-cyan-700'    : 'bg-cyan-200',    bgStripe: isDarkMode ? 'bg-cyan-900'    : 'bg-cyan-200',    bgHeader: isDarkMode ? 'bg-cyan-700'    : 'bg-cyan-300' },
      blue:    { bg: isDarkMode ? 'bg-blue-800'    : 'bg-blue-100',    border: isDarkMode ? 'border-blue-600'    : 'border-blue-300',    bgLight: isDarkMode ? 'bg-blue-900'    : 'bg-blue-200',    bgButton: isDarkMode ? 'bg-blue-700'    : 'bg-blue-200',    bgStripe: isDarkMode ? 'bg-blue-900'    : 'bg-blue-200',    bgHeader: isDarkMode ? 'bg-blue-700'    : 'bg-blue-300' },
      green:   { bg: isDarkMode ? 'bg-green-800'   : 'bg-green-50',    border: isDarkMode ? 'border-green-600'   : 'border-green-300',   bgLight: isDarkMode ? 'bg-green-900'   : 'bg-green-100',   bgButton: isDarkMode ? 'bg-green-700'   : 'bg-green-100',   bgStripe: isDarkMode ? 'bg-green-900'   : 'bg-green-100',   bgHeader: isDarkMode ? 'bg-green-700'   : 'bg-green-200' },
      amber:   { bg: isDarkMode ? 'bg-amber-800'   : 'bg-amber-50',    border: isDarkMode ? 'border-amber-600'   : 'border-amber-300',   bgLight: isDarkMode ? 'bg-amber-900'   : 'bg-amber-100',   bgButton: isDarkMode ? 'bg-amber-700'   : 'bg-amber-100',   bgStripe: isDarkMode ? 'bg-amber-900'   : 'bg-amber-100',   bgHeader: isDarkMode ? 'bg-amber-700'   : 'bg-amber-200' },
      orange:  { bg: isDarkMode ? 'bg-orange-800'  : 'bg-orange-50',   border: isDarkMode ? 'border-orange-600'  : 'border-orange-300',  bgLight: isDarkMode ? 'bg-orange-900'  : 'bg-orange-100',  bgButton: isDarkMode ? 'bg-orange-700'  : 'bg-orange-100',  bgStripe: isDarkMode ? 'bg-orange-900'  : 'bg-orange-100',  bgHeader: isDarkMode ? 'bg-orange-700'  : 'bg-orange-200' },
      red:     { bg: isDarkMode ? 'bg-red-800'     : 'bg-red-50',      border: isDarkMode ? 'border-red-600'     : 'border-red-300',     bgLight: isDarkMode ? 'bg-red-900'     : 'bg-red-100',     bgButton: isDarkMode ? 'bg-red-700'     : 'bg-red-100',     bgStripe: isDarkMode ? 'bg-red-900'     : 'bg-red-100',     bgHeader: isDarkMode ? 'bg-red-700'     : 'bg-red-200' },
      indigo:  { bg: isDarkMode ? 'bg-indigo-800'  : 'bg-indigo-50',   border: isDarkMode ? 'border-indigo-600'  : 'border-indigo-300',  bgLight: isDarkMode ? 'bg-indigo-900'  : 'bg-indigo-100',  bgButton: isDarkMode ? 'bg-indigo-700'  : 'bg-indigo-100',  bgStripe: isDarkMode ? 'bg-indigo-900'  : 'bg-indigo-100',  bgHeader: isDarkMode ? 'bg-indigo-700'  : 'bg-indigo-200' },
      emerald: { bg: isDarkMode ? 'bg-emerald-800' : 'bg-emerald-50',  border: isDarkMode ? 'border-emerald-600' : 'border-emerald-300', bgLight: isDarkMode ? 'bg-emerald-900' : 'bg-emerald-100', bgButton: isDarkMode ? 'bg-emerald-700' : 'bg-emerald-100', bgStripe: isDarkMode ? 'bg-emerald-900' : 'bg-emerald-100', bgHeader: isDarkMode ? 'bg-emerald-700' : 'bg-emerald-200' }
    };

    return { ...(textColors[textTheme] || textColors.cyan), ...(backgroundColors[backgroundTheme] || backgroundColors.cyan) };
  };

  const colors = getThemedColors();

  const albumTracks = useMemo(() => {
    if (album?.trackObjects && Array.isArray(album.trackObjects) && album.trackObjects.length > 0) {
      return album.trackObjects;
    }
    return [];
  }, [album]);

  const topTrack = albumTracks.length > 0 ? albumTracks[0] : null;
  const otherTracks = albumTracks.slice(1);
  const actualTrackCount = useMemo(() => album.trackCountValue || albumTracks.length || 0, [album, albumTracks]);
  const remainingTracks = actualTrackCount - (topTrack ? 1 : 0);

  return (
    <div className={`p-3 ${colors.bg} rounded border ${colors.border} text-center ${!isColorful ? (isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]') : 'shadow-sm'}`}>

      {/* Row 1: rank + album name + artist + toggle */}
      <div className={`flex items-start justify-between font-bold text-base leading-tight mb-2 ${colors.text}`}>
        <span className="opacity-50 text-sm w-5 text-left shrink-0">#{index + 1}</span>
        <div className="flex-1 text-center px-1">
          <div>{album.name}</div>
          <div className={`text-xs font-normal opacity-70 ${colors.textLight}`}>{album.artist}</div>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(e => !e)}
          className="w-5 text-sm opacity-60 hover:opacity-100 leading-none cursor-pointer shrink-0"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Row 2: collapsible stats */}
      {isExpanded && (
        <div className={`grid grid-cols-3 gap-1 mb-2 text-xs ${colors.textLight}`}>
          <div>
            <div className="opacity-60">Time</div>
            <div className="font-bold">{formatDuration(album.totalPlayed)}</div>
          </div>
          <div>
            <div className="opacity-60">Plays</div>
            <div className="font-bold">{album.playCount || 0}</div>
          </div>
          <div>
            <div className="opacity-60">Since</div>
            <div className="font-bold">
              {album.firstListen ? (() => {
                const d = new Date(album.firstListen);
                const full = d.toLocaleDateString();
                const parts = full.split('/');
                const short = parts.length === 3
                  ? `${parts[0]}/${parts[1]}/'${parts[2].slice(-2)}`
                  : full;
                return (
                  <>
                    <span className="md:hidden">{full}</span>
                    <span className="hidden md:inline">{short}</span>
                  </>
                );
              })() : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Row 3: top track — click to open floating track list */}
      {topTrack && (
        <div className="relative mt-1">
          <button
            type="button"
            onClick={() => setShowTracks(s => !s)}
            className={`flex flex-wrap gap-y-1 text-xs text-center w-full cursor-pointer hover:opacity-70 ${colors.textLight}`}
          >
            <div className="flex-1 min-w-0 px-1">
              <div className="opacity-60">Top Track</div>
              <div className={`font-bold ${isExpanded ? 'break-words' : 'truncate'}`}>{topTrack.trackName}</div>
            </div>
            <div className="flex-1 min-w-0 px-1">
              <div className="opacity-60">Plays</div>
              <div className="font-bold flex items-center justify-center gap-1">
                {topTrack.playCount}
                {albumTracks.length > 1 && (
                  <span className={`inline-flex items-center justify-center w-4 h-4 text-xs rounded border leading-none
                    ${isColorful
                      ? (isDarkMode ? `${colors.bg} ${colors.text} border-current shadow-[1px_1px_0_0_currentColor]` : `${colors.bg} ${colors.text} border-current shadow-[1px_1px_0_0_currentColor]`)
                      : (isDarkMode ? 'bg-black text-white border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'bg-white text-black border-black shadow-[1px_1px_0_0_black]')
                    }`}
                  >
                    {showTracks ? '−' : '+'}
                  </span>
                )}
              </div>
            </div>
          </button>

          {showTracks && (
            <div className={`absolute left-0 top-full z-50 w-full border rounded shadow-lg overflow-hidden ${colors.bg} ${colors.border}`}>
              <div className={`sticky top-0 p-1 text-xs text-center font-medium ${colors.bgHeader} ${colors.text}`}>
                {albumTracks.length} track{albumTracks.length !== 1 ? 's' : ''}
              </div>
              <div className="max-h-48 overflow-y-auto">
                {albumTracks.map((track, trackIndex) => (
                  <div
                    key={`${track.trackName || 'unknown'}-${trackIndex}`}
                    className={`p-1 ${trackIndex % 2 === 0 ? colors.bgStripe : colors.bg}`}
                  >
                    <div className={`flex justify-between items-center ${colors.text}`}>
                      <span>
                        {track.trackName || 'Unknown Track'}
                        {track.variations && track.variations.length > 1 && (
                          <span className={`text-xs ${colors.textLight} ml-1`}>({track.variations.length} versions)</span>
                        )}
                      </span>
                      <span className={`text-xs ${colors.textLight}`}>{formatDuration(track.totalPlayed || 0)}</span>
                    </div>
                    <div className={`text-right text-xs ${colors.textLight}`}>{track.playCount || 0} plays</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlbumCard;
