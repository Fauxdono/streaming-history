import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AlbumCard = ({ album, index, processedData, formatDuration, rawPlayData = [] }) => {
  const [showTracks, setShowTracks] = useState(false);

  // Use useMemo to prevent expensive track matching on every render
  const { albumTracks, normalizedTrackCount } = useMemo(() => {
    // Get all tracks by this artist - this is fast and simple
    const allArtistTracks = processedData.filter(track => 
      track.artist && album.artist && 
      track.artist.toLowerCase() === album.artist.toLowerCase()
    );
    
    const normalizedAlbumName = album.name.toLowerCase().trim();

    // Expected track count (either from the album object or a fallback)
    let expectedTrackCount = typeof album.trackCount === 'object' && album.trackCount instanceof Set 
      ? album.trackCount.size 
      : (typeof album.trackCount === 'number' ? album.trackCount : 15); // Default expectation
    
    // STAGE 1: Basic album name matching
    let matches = allArtistTracks.filter(track => {
      if (!track.albumName) return false;
      
      const trackAlbumLower = track.albumName.toLowerCase().trim();
      
      // Simple exact match
      if (trackAlbumLower === normalizedAlbumName) return true;
      
      // Contains match
      if (trackAlbumLower.includes(normalizedAlbumName) || normalizedAlbumName.includes(trackAlbumLower)) return true;
      
      // Clean versions match (remove deluxe, remastered, etc.)
      const cleanTrackAlbum = trackAlbumLower.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
      const cleanAlbumName = normalizedAlbumName.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
      
      if (cleanTrackAlbum === cleanAlbumName) return true;
      
      // Not a match by album name
      return false;
    });
    
    // If we found enough tracks with simple matching, we're done
    if (matches.length >= expectedTrackCount * 0.7) {
      return { 
        albumTracks: matches,
        normalizedTrackCount: Math.max(expectedTrackCount, matches.length)
      };
    }
    
    // STAGE 2: Add tracks from the same time period
    // This is a simplified version that only does a date check if we need more tracks
    if (matches.length > 0) {
      // Get 3 month window around first album listen
      const albumDate = new Date(album.firstListen);
      const dateLower = new Date(albumDate);
      dateLower.setMonth(dateLower.getMonth() - 2);
      const dateUpper = new Date(albumDate);
      dateUpper.setMonth(dateUpper.getMonth() + 2);
      
      // Find tracks first heard in this window
      const timeWindowTracks = allArtistTracks.filter(track => {
        // Skip tracks we already matched
        if (matches.includes(track)) return false;
        
        // Very basic time window check - only get tracks that were heard in the same ~4 month window
        // This is much more efficient than the detailed findFirstPlayTimestamp approach
        let firstListenDate = null;
        
        // Try to find a play for this track
        for (let i = 0; i < rawPlayData.length; i++) {
          const entry = rawPlayData[i];
          if (entry.master_metadata_track_name === track.trackName && 
              entry.master_metadata_album_artist_name === track.artist) {
            firstListenDate = new Date(entry.ts);
            break;
          }
        }
        
        if (firstListenDate && firstListenDate >= dateLower && firstListenDate <= dateUpper) {
          return true;
        }
        
        return false;
      });
      
      if (timeWindowTracks.length > 0) {
        matches = [...matches, ...timeWindowTracks];
      }
    }
    
    // Update normalizedTrackCount if we found more tracks than expected
    if (matches.length > expectedTrackCount) {
      expectedTrackCount = matches.length;
    }
    
    return { 
      albumTracks: matches,
      normalizedTrackCount: expectedTrackCount
    };
  }, [album, processedData, rawPlayData]);
  
  // Sort tracks by play time (outside of useMemo, but using the cached albumTracks)
  const sortedTracks = useMemo(() => {
    return [...albumTracks].sort((a, b) => b.totalPlayed - a.totalPlayed);
  }, [albumTracks]);
  
  // Get top track and other tracks
  const topTrack = sortedTracks.length > 0 ? sortedTracks[0] : null;
  const otherTracks = sortedTracks.slice(1);

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