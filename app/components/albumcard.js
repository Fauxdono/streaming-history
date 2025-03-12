import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Music, Info } from 'lucide-react';

const AlbumCard = ({ album, index, processedData, formatDuration }) => {
  const [showTracks, setShowTracks] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Improved comprehensive track matching with a more robust approach
  const albumTracks = useMemo(() => {
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
    
    // MATCHING STRATEGY
    // 1. Direct album name matches
    const directMatches = artistTracks.filter(track => {
      if (!track.albumName) return false;
      
      const trackAlbumLower = track.albumName.toLowerCase().trim();
      
      // Exact match
      if (trackAlbumLower === normalizedAlbumName) return true;
      
      // Remove common qualifiers for better matching
      const cleanTrackAlbum = trackAlbumLower
        .replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '')
        .trim();
      
      const cleanAlbumName = normalizedAlbumName
        .replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '')
        .trim();
      
      // Clean match
      if (cleanTrackAlbum === cleanAlbumName) return true;
      
      // Substantial inclusion match (minimum 5 characters to avoid false positives)
      if (cleanAlbumName.length >= 5 && cleanTrackAlbum.includes(cleanAlbumName)) return true;
      if (cleanTrackAlbum.length >= 5 && cleanAlbumName.includes(cleanTrackAlbum)) return true;
      
      return false;
    });
    
    // If we have enough direct matches, we can rely on them
    const sufficientDirectMatches = directMatches.length >= Math.max(3, Math.floor(expectedTrackCount * 0.5));
    
    if (sufficientDirectMatches) {
      return directMatches;
    }
    
    // 2. Try time-based matching for albums with few direct matches
    // Get the release timeframe of the album (when most tracks were first played)
    let albumFirstListen = album.firstListen; // From album metadata
    
    // If we have at least one direct match, use their timestamps to find more tracks
    let timeBasedMatches = [];
    if (directMatches.length > 0) {
      // Get first listened timestamps
      const timestamps = directMatches.map(track => {
        const key = `${track.trackName}-${track.artist}`;
        return album.firstListen; // Fallback to album firstListen time
      });
      
      // Find min and max timestamps (with a 30 day window)
      const minTimestamp = Math.min(...timestamps) - (30 * 24 * 60 * 60 * 1000);
      const maxTimestamp = Math.max(...timestamps) + (30 * 24 * 60 * 60 * 1000);
      
      // Find tracks that might be from this album based on when they were first played
      timeBasedMatches = artistTracks.filter(track => {
        // Skip already matched tracks
        if (directMatches.includes(track)) return false;
        
        // Skip tracks with album names that are clearly from a different album
        if (track.albumName && isDefinitelyDifferentAlbum(track.albumName, album.name)) {
          return false;
        }
        
        // Check if within the album's timeframe (use firstListen as approximate release date)
        if (track.ts) {
          const trackTimestamp = new Date(track.ts).getTime();
          return trackTimestamp >= minTimestamp && trackTimestamp <= maxTimestamp;
        }
        
        return false;
      });
    }
    
    // 3. If we still have too few tracks, add tracks with no album info
    const combinedMatches = [...directMatches, ...timeBasedMatches];
    let noAlbumMatches = [];
    
    if (expectedTrackCount > 0 && combinedMatches.length < Math.floor(expectedTrackCount * 0.6)) {
      // Get tracks with no album information or with "Unknown Album"
      const albumlessTracks = artistTracks.filter(track => 
        (!track.albumName || track.albumName === 'Unknown Album') && 
        !combinedMatches.includes(track)
      );
      
      // Sort by play count to get most likely album tracks
      noAlbumMatches = albumlessTracks
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, Math.min(expectedTrackCount - combinedMatches.length, albumlessTracks.length));
    }
    
    // Remove duplicates and combine all matches
    const allMatches = [...directMatches, ...timeBasedMatches, ...noAlbumMatches];
    
    // Create a map to deduplicate tracks by name (in case we have different versions)
    const uniqueTracks = new Map();
    allMatches.forEach(track => {
      const trackName = track.trackName.toLowerCase().trim();
      if (!uniqueTracks.has(trackName) || track.totalPlayed > uniqueTracks.get(trackName).totalPlayed) {
        uniqueTracks.set(trackName, track);
      }
    });
    
    return Array.from(uniqueTracks.values());
    
    // Helper function to determine if two album names are definitely different
    function isDefinitelyDifferentAlbum(albumName1, albumName2) {
      const name1 = albumName1.toLowerCase().trim();
      const name2 = albumName2.toLowerCase().trim();
      
      // If one contains the other, they might be the same
      if (name1.includes(name2) || name2.includes(name1)) {
        return false;
      }
      
      // Clean both names of common qualifiers
      const clean1 = name1.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
      const clean2 = name2.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
      
      // If clean versions have overlap, they might be the same
      if (clean1.includes(clean2) || clean2.includes(clean1)) {
        return false;
      }
      
      // Compare significant words between the two names
      const words1 = clean1.split(/\s+/).filter(word => word.length > 3);
      const words2 = clean2.split(/\s+/).filter(word => word.length > 3);
      
      // If they share any significant words, they might be related
      const sharedWords = words1.filter(word => words2.includes(word));
      if (sharedWords.length > 0) {
        return false;
      }
      
      // If no similarities found, they're probably different albums
      return true;
    }
  }, [album, processedData]);
  
  // Sort tracks by play time (most played first)
  const sortedTracks = useMemo(() => {
    return [...albumTracks].sort((a, b) => b.totalPlayed - a.totalPlayed);
  }, [albumTracks]);
  
  // Get top track and other tracks
  const topTrack = sortedTracks.length > 0 ? sortedTracks[0] : null;
  const otherTracks = sortedTracks.slice(1);
  
  // Normalize trackCount
  const normalizedTrackCount = typeof album.trackCount === 'object' && album.trackCount instanceof Set 
    ? album.trackCount.size 
    : (typeof album.trackCount === 'number' ? album.trackCount : 0);
  
  // Calculate average play time per track
  const avgPlayTime = album.totalPlayed / Math.max(1, album.playCount);
  
  // Calculate completeness percentage based on how many tracks we've found vs expected
  const completenessPercentage = normalizedTrackCount > 0 
    ? Math.min(100, Math.round((sortedTracks.length / normalizedTrackCount) * 100)) 
    : 0;

  return (
    <div className="p-3 bg-white rounded shadow-sm border-2 border-pink-200 hover:border-pink-400 transition-colors relative">
      <div className="flex justify-between items-start">
        <div className="font-bold text-pink-600 pr-6">{album.name}</div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 text-pink-400 hover:text-pink-600 transition-colors"
          title={showDetails ? "Hide details" : "Show details"}
        >
          <Info size={16} />
        </button>
      </div>
      
      {/* Album details */}
      <div className={`text-sm text-pink-400 ${showDetails ? 'block' : 'block'}`}>
        Artist: <span className="font-bold">{album.artist}</span> 
        <br/>
        Total Time: <span className="font-bold">{formatDuration(album.totalPlayed)}</span> 
        <br/>
        {showDetails && (
          <>
            Plays: <span className="font-bold">{album.playCount}</span> 
            <br/>
            Tracks Found: <span className="font-bold">{sortedTracks.length} / {normalizedTrackCount || '?'}</span>
            <br/> 
            First Listen: <span className="font-bold">{new Date(album.firstListen).toLocaleDateString()}</span>
            <br/>
            Avg Play Time: <span className="font-bold">{formatDuration(avgPlayTime)}</span>
          </>
        )}
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
            {normalizedTrackCount > 0 && (
              <span className="ml-1 text-pink-500">
                ({completenessPercentage}% complete)
              </span>
            )}
          </span>
          {showTracks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
      
      {/* Track Dropdown Content */}
      {showTracks && otherTracks.length > 0 && (
        <div className="mt-1 max-h-64 overflow-y-auto text-xs border border-pink-200 rounded">
          <div className="sticky top-0 bg-pink-100 p-1 text-xs text-center text-pink-600 font-medium">
            {normalizedTrackCount > 0 && (
              <span>
                Showing {otherTracks.length} of {normalizedTrackCount - 1} remaining tracks
                {normalizedTrackCount > sortedTracks.length && (
                  <span className="text-pink-500"> ({sortedTracks.length - 1}/{normalizedTrackCount - 1} found)</span>
                )}
              </span>
            )}
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