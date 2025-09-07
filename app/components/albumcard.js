import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Music } from 'lucide-react';

const AlbumCard = ({ album, index, processedData, formatDuration }) => {
  const [showTracks, setShowTracks] = useState(false);

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
    <div className="p-3 bg-white dark:bg-gray-800 rounded shadow-sm border border-cyan-200 dark:border-cyan-700 hover:border-cyan-400 dark:hover:border-cyan-500 transition-all duration-300 relative">
      <div className="font-bold text-cyan-600">{album.name}</div>
      
      <div className="text-sm text-cyan-400">
        Artist: <span className="font-bold">{album.artist}</span> 
        <br/>
        Total Time: <span className="font-bold">{formatDuration(album.totalPlayed)}</span> 
        <br/>
        Plays: <span className="font-bold">{album.playCount || 0}</span> 
        <br/> 
        First Listen: <span className="font-bold">{new Date(album.firstListen).toLocaleDateString()}</span>
      </div>
      
      {/* Divider */}
      <div className="border-t border-cyan-200 my-2"></div>
      
      {/* Top Track Section */}
      <div className="mt-2">
        <div className="font-medium text-cyan-600">Top Track:</div>
        {topTrack ? (
          <div className="text-sm text-cyan-500 p-1 bg-cyan-50 rounded">
            {topTrack.trackName}
            <div className="flex justify-between text-xs text-cyan-400">
              <span>{formatDuration(topTrack.totalPlayed)}</span>
              <span>{topTrack.playCount} plays</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-cyan-400 italic">No track data available</div>
        )}
      </div>
      
      {/* Track Dropdown Toggle */}
      {otherTracks.length > 0 && (
        <button 
          onClick={() => setShowTracks(!showTracks)}
          className="mt-2 text-xs flex items-center justify-between w-full p-1 text-cyan-600 bg-cyan-100 hover:bg-cyan-200 rounded"
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
        <div className="mt-1 max-h-64 overflow-y-auto text-xs border border-cyan-200 rounded">
          <div className="sticky top-0 bg-cyan-100 p-1 text-xs text-center text-cyan-600 font-medium">
            {/* Use the correct available tracks count */}
            {remainingTracks !== otherTracks.length ?
              `Showing ${otherTracks.length} of ${remainingTracks} remaining tracks` :
              `Showing all ${otherTracks.length} remaining tracks`}
          </div>
          {otherTracks.map((track, trackIndex) => (
            <div 
              key={`${track.trackName || 'unknown'}-${trackIndex}`}
              className={`p-1 ${trackIndex % 2 === 0 ? 'bg-cyan-50' : 'bg-white'}`}
            >
              <div className="text-cyan-600">
                {track.trackName || 'Unknown Track'}
                {track.variations && track.variations.length > 1 && (
                  <span className="text-xs text-cyan-400 ml-1">
                    ({track.variations.length} versions)
                  </span>
                )}
              </div>
              <div className="flex justify-between text-cyan-400">
                <span>{formatDuration(track.totalPlayed || 0)}</span>
                <span>{track.playCount || 0} plays</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="absolute top-1 right-3 text-cyan-600 text-[2rem]">{index + 1}</div>
    </div>
  );
};

export default AlbumCard;