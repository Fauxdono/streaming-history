import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AlbumCard = ({ album, index, processedData, formatDuration }) => {
  const [showTracks, setShowTracks] = useState(false);

  // Comprehensive track matching with a universal approach
  const albumTracks = useMemo(() => {
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
      : (typeof album.trackCount === 'number' ? album.trackCount : 15); // Default to 15 if unknown
    
    // MATCHING STRATEGY - Use multiple criteria to find album tracks
    
    // 1. Direct album name matches (exact and fuzzy)
    const directMatches = artistTracks.filter(track => {
      // Skip tracks with no album name
      if (!track.albumName) return false;
      
      const trackAlbumLower = track.albumName.toLowerCase().trim();
      
      // Exact match
      if (trackAlbumLower === normalizedAlbumName) return true;
      
      // Significant substring match (to avoid false positives with short names)
      const minMatchLength = 5; // Minimum characters to consider a substring match
      if (normalizedAlbumName.length >= minMatchLength && trackAlbumLower.includes(normalizedAlbumName)) {
        return true;
      }
      if (trackAlbumLower.length >= minMatchLength && normalizedAlbumName.includes(trackAlbumLower)) {
        return true;
      }
      
      // Clean versions (removing deluxe, remastered, etc.)
      const cleanTrackAlbum = trackAlbumLower.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
      const cleanAlbumName = normalizedAlbumName.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
      
      if (cleanTrackAlbum === cleanAlbumName) return true;
      if (cleanTrackAlbum.includes(cleanAlbumName) || cleanAlbumName.includes(cleanTrackAlbum)) {
        return true;
      }
      
      return false;
    });
    
    // If we have enough matches, just return those
    if (directMatches.length >= expectedTrackCount * 0.8) {
      return directMatches;
    }
    
    // 2. Add tracks played in similar timeframes
    
    // Get the first listen timestamps for the already matched tracks
    const matchListenTimes = directMatches
      .map(track => {
        // Extract timestamp data from the first time this track was played
        const timePlayed = getApproximateFirstPlayTime(track, album.artist);
        return timePlayed ? new Date(timePlayed).getTime() : null;
      })
      .filter(time => time !== null);
    
    // If we have enough timestamps, try to find other tracks played around the same time
    let timeBasedMatches = [];
    if (matchListenTimes.length > 0) {
      // Get average and range of timestamps of already matched tracks
      const avgTime = matchListenTimes.reduce((sum, time) => sum + time, 0) / matchListenTimes.length;
      const timeRange = {
        min: Math.min(...matchListenTimes),
        max: Math.max(...matchListenTimes)
      };
      
      // Expand the range to catch more potential tracks
      const rangeExpansion = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
      const expandedRange = {
        min: timeRange.min - rangeExpansion,
        max: timeRange.max + rangeExpansion
      };
      
      // Find tracks played in similar timeframe
      timeBasedMatches = artistTracks.filter(track => {
        // Skip already matched tracks
        if (directMatches.includes(track)) return false;
        
        // Skip tracks with album names that are clearly from a different album
        if (track.albumName && isDefinitelyDifferentAlbum(track.albumName, album.name)) {
          return false;
        }
        
        // Get approximate first play time
        const trackTime = getApproximateFirstPlayTime(track, album.artist);
        if (!trackTime) return false;
        
        // Check if this track was first played in our expanded timeframe
        const trackTimeMs = new Date(trackTime).getTime();
        return trackTimeMs >= expandedRange.min && trackTimeMs <= expandedRange.max;
      });
    }
    
    // 3. If we're still missing too many tracks, add tracks with no album info
    let noAlbumMatches = [];
    if (directMatches.length + timeBasedMatches.length < expectedTrackCount * 0.6) {
      const remainingNeeded = expectedTrackCount - (directMatches.length + timeBasedMatches.length);
      
      // Get tracks with no album information
      const albumlessTracks = artistTracks.filter(track => 
        (!track.albumName || track.albumName === 'Unknown Album') && 
        !directMatches.includes(track) && 
        !timeBasedMatches.includes(track)
      );
      
      // Sort by play count to get the most likely candidates
      const sortedAlbumless = [...albumlessTracks].sort((a, b) => b.playCount - a.playCount);
      
      // Take only as many as we need to reach our expected count
      noAlbumMatches = sortedAlbumless.slice(0, Math.min(remainingNeeded, sortedAlbumless.length));
    }
    
    // Combine all matches
    return [...directMatches, ...timeBasedMatches, ...noAlbumMatches];
    
    // Helper function to estimate when a track was first played
    function getApproximateFirstPlayTime(track, artistName) {
      // This function would ideally use the raw play data
      // For now, we'll approximate using the track's metadata
      
      // If the track has a first listen timestamp already, use that
      if (track.firstListen) return track.firstListen;
      
      // Otherwise, search for the track in processed data and try to find earliest play
      const artistTrackKey = `${track.trackName}-${artistName}`;
      
      // Since we don't have direct access to the play history here, 
      // we'll use the track's metadata as an approximation
      return null; // In practice, this would return a timestamp if available
    }
    
    // Helper to determine if two album names are definitely different
    function isDefinitelyDifferentAlbum(albumName1, albumName2) {
      const name1 = albumName1.toLowerCase().trim();
      const name2 = albumName2.toLowerCase().trim();
      
      // If one contains the other substantially, they might be the same album
      if (name1.includes(name2) || name2.includes(name1)) {
        return false;
      }
      
      // Clean both names of common qualifiers
      const clean1 = name1.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
      const clean2 = name2.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
      
      // If clean versions have significant overlap, they might be the same
      if (clean1.includes(clean2) || clean2.includes(clean1)) {
        return false;
      }
      
      // Compare words between the two names
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
  
  // Sort tracks by play time
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
        Tracks: <span className="font-bold">{normalizedTrackCount}</span>
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
          <span>
            {showTracks ? 'Hide' : 'Show'} {otherTracks.length} more tracks
            {normalizedTrackCount > otherTracks.length + 1 && !showTracks && 
              ` (${normalizedTrackCount - otherTracks.length - 1} unavailable)`}
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
              key={trackIndex}
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