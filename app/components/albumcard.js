import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Music } from 'lucide-react';

const AlbumCard = ({ album, index, processedData, formatDuration }) => {
  const [showTracks, setShowTracks] = useState(false);

  // Use album.trackObjects directly if available (from enhanced streaming adapter)
  // Otherwise, fall back to the existing album track matching logic
  const albumTracks = useMemo(() => {
    // Check if enhanced data is available
    if (album.trackObjects && Array.isArray(album.trackObjects) && album.trackObjects.length > 0) {
      // Just return the pre-processed track objects
      return album.trackObjects;
    }
    
    // Fall back to existing logic if trackObjects isn't available
    if (!processedData || !album) return [];
    
    // Normalize album and artist names for consistent matching
    const normalizedAlbumName = album.name.toLowerCase().trim();
    const normalizedArtistName = album.artist.toLowerCase().trim();
    
    // Get all tracks by this artist
    const artistTracks = processedData.filter(track => 
      track.artist && 
      track.artist.toLowerCase().trim() === normalizedArtistName
    );
    
    // Expected track count from album metadata
    const expectedTrackCount = typeof album.trackCount === 'object' && album.trackCount instanceof Set 
      ? album.trackCount.size 
      : (typeof album.trackCount === 'number' ? album.trackCount : 0);
    
    // Direct album name matches
    const directMatches = artistTracks.filter(track => {
      if (!track.albumName) return false;
      
      const trackAlbumLower = track.albumName.toLowerCase().trim();
      
      // Exact match
      if (trackAlbumLower === normalizedAlbumName) return true;
      
      // Clean both names
      const cleanTrackAlbum = trackAlbumLower
        .replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '')
        .trim();
      
      const cleanAlbumName = normalizedAlbumName
        .replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '')
        .trim();
      
      if (cleanTrackAlbum === cleanAlbumName) return true;
      if (cleanTrackAlbum.includes(cleanAlbumName) || cleanAlbumName.includes(cleanTrackAlbum)) {
        return true;
      }
      
      return false;
    });
    
    return directMatches;
  }, [album, processedData]);
  
  // Sort tracks by play time
  const sortedTracks = useMemo(() => {
    // If we have the enhanced trackObjects data, just use it directly
    if (album.trackObjects && Array.isArray(album.trackObjects)) {
      // Ensure it's sorted by totalPlayed
      return [...album.trackObjects].sort((a, b) => b.totalPlayed - a.totalPlayed);
    }
    
    // Otherwise sort the fallback albumTracks
    return [...albumTracks].sort((a, b) => b.totalPlayed - a.totalPlayed);
  }, [albumTracks, album.trackObjects]);
  
  // Get top track and other tracks
  const topTrack = sortedTracks.length > 0 ? sortedTracks[0] : null;
  const otherTracks = sortedTracks.slice(1);
  
  // Normalize trackCount - use enhanced values if available
  const normalizedTrackCount = album.trackCountValue 
    ? album.trackCountValue 
    : (typeof album.trackCount === 'object' && album.trackCount instanceof Set 
      ? album.trackCount.size 
      : (typeof album.trackCount === 'number' ? album.trackCount : 0));

  // If the album has trackNames set, use that for count display
  const displayTrackCount = album.trackNames instanceof Set 
    ? album.trackNames.size 
    : normalizedTrackCount;
  
  // Calculate completeness percentage
  const completenessPercentage = normalizedTrackCount > 0 
    ? Math.min(100, Math.round((sortedTracks.length / normalizedTrackCount) * 100)) 
    : 0;

  return (
    <div className="p-3 bg-white rounded shadow-sm border-2 border-pink-200 hover:border-pink-400 transition-colors relative">
      <div className="font-bold text-pink-600">{album.name}</div>
      
      <div className="text-sm text-pink-400">
        Artist: <span className="font-bold">{album.artist}</span> 
        <br/>
        Total Time: <span className="font-bold">{formatDuration(album.totalPlayed)}</span> 
        <br/>
        Plays: <span className="font-bold">{album.playCount}</span> 
        <br/>
        Tracks: <span className="font-bold">{sortedTracks.length} / {normalizedTrackCount || '?'}</span>
        {completenessPercentage > 0 && (
          <span className="text-xs ml-1">({completenessPercentage}% complete)</span>
        )}
        <br/> 
        First Listen: <span className="font-bold">{new Date(album.firstListen).toLocaleDateString()}</span>
      </div>
      
      {/* Divider */}
      <div className="border-t border-pink-200 my-2"></div>
      
      {/* Top Track Section */}
      <div className="mt-2">
        <div className="font-medium text-pink-600">Top Track:</div>
        {topTrack ? (
          <div className="text-sm text-pink-500 p-1 bg-pink-50 rounded">
            {topTrack.trackName}
            <div className="flex justify-between text-xs text-pink-400">
              <span>{formatDuration(topTrack.totalPlayed)}</span>
              <span>{topTrack.playCount} plays</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-pink-400 italic">No track data available</div>
        )}
      </div>
      
      {/* Track Dropdown Toggle */}
      {otherTracks.length > 0 && (
        <button 
          onClick={() => setShowTracks(!showTracks)}
          className="mt-2 text-xs flex items-center justify-between w-full p-1 text-pink-600 bg-pink-100 hover:bg-pink-200 rounded"
        >
          <span className="flex items-center">
            <Music size={14} className="mr-1" />
            {showTracks ? 'Hide' : 'Show'} {otherTracks.length} more tracks
            {normalizedTrackCount > otherTracks.length + 1 && !showTracks && 
              <span className="ml-1">{` (${normalizedTrackCount - otherTracks.length - 1} unavailable)`}</span>}
          </span>
          {showTracks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
      
      {/* Track Dropdown Content */}
      {showTracks && otherTracks.length > 0 && (
        <div className="mt-1 max-h-64 overflow-y-auto text-xs border border-pink-200 rounded">
          <div className="sticky top-0 bg-pink-100 p-1 text-xs text-center text-pink-600 font-medium">
            {normalizedTrackCount > otherTracks.length + 1 ?
              `Showing ${otherTracks.length} of ${normalizedTrackCount - 1} remaining tracks` :
              `Showing all ${otherTracks.length} remaining tracks`}
          </div>
          {otherTracks.map((track, trackIndex) => (
            <div 
              key={`${track.trackName}-${trackIndex}`}
              className={`p-1 ${trackIndex % 2 === 0 ? 'bg-pink-50' : 'bg-white'}`}
            >
              <div className="text-pink-600">{track.trackName}</div>
              <div className="flex justify-between text-pink-400">
                <span>{formatDuration(track.totalPlayed)}</span>
                <span>{track.playCount} plays</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="absolute bottom-1 right-3 text-pink-600 text-[2rem]">{index + 1}</div>
    </div>
  );
};

export default AlbumCard;