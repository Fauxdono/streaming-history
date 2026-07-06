import React, { useState, useMemo } from 'react';
import { useTheme } from './themeprovider.js';
import { RankBadge, RankBar } from './RankCardBits.js';
import { getAlbumCardColors } from './theme.js';

const AlbumCard = ({ album, index, processedData, formatDuration, textTheme = 'cyan', backgroundTheme = 'cyan', colorMode = 'minimal', sortBy = 'totalPlayed', maxValue = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTracks, setShowTracks] = useState(false);

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  const colors = getAlbumCardColors({ textTheme, backgroundTheme, isColorful, isDarkMode });

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
        <RankBadge rank={index + 1} isDarkMode={isDarkMode} />
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
            className={`space-y-1 text-xs w-full cursor-pointer hover:opacity-70 ${colors.textLight}`}
          >
            {/* Full-width fact rows: label left, value right */}
            <div className="flex justify-between gap-2">
              <span className="opacity-60 shrink-0">Top Track</span>
              <span className={`font-bold text-right min-w-0 ${isExpanded ? 'break-words' : 'truncate'}`} title={topTrack.trackName}>{topTrack.trackName}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="opacity-60 shrink-0">Plays</span>
              <span className="font-bold flex items-center gap-1">
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
              </span>
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

      {/* Play bar — relative to #1 by the active sort metric */}
      <RankBar
        value={sortBy === 'playCount' ? (album.playCount || 0) : (album.totalPlayed || 0)}
        max={maxValue}
        label={sortBy === 'playCount'
          ? `${(album.playCount || 0).toLocaleString()} plays`
          : formatDuration(album.totalPlayed)}
        className={colors.text || (isDarkMode ? 'text-[#4169E1]' : 'text-black')}
      />
    </div>
  );
};

export default AlbumCard;
