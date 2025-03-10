import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AlbumCard = ({ album, index, processedData, formatDuration }) => {
  const [showTracks, setShowTracks] = useState(false);

  // Debugging for Mr. Morale album
  const isMrMoraleAlbum = album.name.includes("Mr. Morale");
  
  if (isMrMoraleAlbum) {
    console.log("Album name:", album.name);
    console.log("Album artist:", album.artist);
    console.log("Track count from album data:", typeof album.trackCount === 'object' && album.trackCount instanceof Set 
      ? album.trackCount.size 
      : (typeof album.trackCount === 'number' ? album.trackCount : 0));
    
    // Log all tracks by this artist
    const artistTracks = processedData.filter(track => 
      track.artist.toLowerCase() === album.artist.toLowerCase()
    );
    console.log("Total tracks by this artist:", artistTracks.length);
    console.log("Artist tracks:", artistTracks.map(t => ({
      trackName: t.trackName,
      albumName: t.albumName,
      plays: t.playCount
    })));
  }
  
  // We'll try two approaches to find album tracks
  let albumTracks = [];
  const allArtistTracks = processedData.filter(track => 
    track.artist && album.artist && 
    track.artist.toLowerCase() === album.artist.toLowerCase()
  );
  
  // APPROACH 1: For certain known albums, just grab all tracks by the artist
  // This is a fallback for cases where the normal matching fails
  const knownProblematicAlbums = [
    "mr. morale & the big steppers",
    "damn.",
    "to pimp a butterfly",
    "good kid, m.a.a.d city",
    "section.80"
  ];
  
  const normalizedAlbumName = album.name.toLowerCase().trim();
  const isKnownAlbum = knownProblematicAlbums.some(knownAlbum => 
    normalizedAlbumName.includes(knownAlbum) || 
    knownAlbum.includes(normalizedAlbumName)
  );
  
  if (isKnownAlbum) {
    // For known albums, find tracks with an exact album name match
    // or tracks where album name contains the album name we're looking for
    albumTracks = allArtistTracks.filter(track => {
      if (!track.albumName) return false;
      const trackAlbumLower = track.albumName.toLowerCase().trim();
      return trackAlbumLower === normalizedAlbumName || 
             trackAlbumLower.includes(normalizedAlbumName) ||
             normalizedAlbumName.includes(trackAlbumLower);
    });
    
    // If we still don't have enough tracks and this looks like the main album,
    // include tracks even if their album fields don't quite match
    if (albumTracks.length < 10 && isMainAlbum(album, allArtistTracks)) {
      const additionalTracks = allArtistTracks.filter(track => 
        !albumTracks.includes(track) && 
        (!track.albumName || isLikelyFromSameAlbum(track.trackName, albumTracks.map(t => t.trackName)))
      );
      albumTracks = [...albumTracks, ...additionalTracks];
    }
  } else {
    // APPROACH 2: Standard matching for most albums
    albumTracks = processedData.filter(track => {
      // Skip tracks with no album name
      if (!track.albumName) return false;
      
      // Match by artist (case insensitive)
      const artistMatch = track.artist.toLowerCase() === album.artist.toLowerCase();
      if (!artistMatch) return false;
      
      // Normalize album names for comparison
      const trackAlbumName = (track.albumName || '').toLowerCase().trim();
      const thisAlbumName = (album.name || '').toLowerCase().trim();
      
      // If track count is available, we should be more aggressive with matching
      // since we know exactly how many tracks to expect
      const hasTrackCount = typeof album.trackCount === 'number' || 
                            (album.trackCount instanceof Set && album.trackCount.size > 0);
      
      // Multiple matching strategies in order of strictness
      return (
        // 1. Exact match
        trackAlbumName === thisAlbumName ||
        
        // 2. One contains the other completely
        trackAlbumName.includes(thisAlbumName) || 
        thisAlbumName.includes(trackAlbumName) ||
        
        // 3. Clean version (remove deluxe, remastered, etc.)
        trackAlbumName.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim() === 
        thisAlbumName.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim() ||
        
        // 4. Word-by-word matching (for albums with rearranged words)
        (hasTrackCount && compareAlbumNamesByWords(trackAlbumName, thisAlbumName))
      );
    });
  }
  
  // Helper function to check if this is the main album for an artist
  function isMainAlbum(album, artistTracks) {
    // If it has the most tracks associated with it
    const trackCounts = {};
    artistTracks.forEach(track => {
      if (track.albumName) {
        trackCounts[track.albumName] = (trackCounts[track.albumName] || 0) + 1;
      }
    });
    
    // Get album with most tracks
    let maxTracks = 0;
    let mainAlbumName = '';
    
    Object.entries(trackCounts).forEach(([albumName, count]) => {
      if (count > maxTracks) {
        maxTracks = count;
        mainAlbumName = albumName;
      }
    });
    
    return album.name === mainAlbumName || mainAlbumName.includes(album.name) || album.name.includes(mainAlbumName);
  }
  
  // Helper function to check if a track is likely from the same album
  // based on similarity to other track names
  function isLikelyFromSameAlbum(trackName, otherTrackNames) {
    // Specific logic for known album patterns
    if (normalizedAlbumName.includes("mr. morale")) {
      return true; // Include all tracks for this album
    }
    
    // Generic similarity check for most cases
    const trackWords = trackName.toLowerCase().split(/\s+/);
    const commonWords = otherTrackNames.some(otherTrack => {
      const otherWords = otherTrack.toLowerCase().split(/\s+/);
      const sharedWords = trackWords.filter(word => otherWords.includes(word) && word.length > 3);
      return sharedWords.length >= 1;
    });
    
    return commonWords;
  }
  
  // Helper function to compare album names word by word
  function compareAlbumNamesByWords(name1, name2) {
    const words1 = name1.split(/\s+/).filter(word => word.length > 1);
    const words2 = name2.split(/\s+/).filter(word => word.length > 1);
    
    // If either name has no substantial words, don't match
    if (words1.length === 0 || words2.length === 0) return false;
    
    // Count matching words
    const matchingWords = words1.filter(word => words2.includes(word));
    
    // Consider it a match if at least 60% of words from the shorter name match
    const minWordCount = Math.min(words1.length, words2.length);
    return matchingWords.length >= Math.max(2, minWordCount * 0.6);
  }
  
  // Sort tracks by play time
  const sortedTracks = [...albumTracks].sort((a, b) => b.totalPlayed - a.totalPlayed);
  
  // More debugging for Mr. Morale album
  if (isMrMoraleAlbum) {
    console.log("Matched tracks for this album:", albumTracks.length);
    console.log("Album tracks found:", albumTracks.map(t => ({
      trackName: t.trackName,
      albumName: t.albumName,
      plays: t.playCount
    })));
  }
  
  // Get top track
  const topTrack = sortedTracks.length > 0 ? sortedTracks[0] : null;
  
  // Get remaining tracks (excluding top track)
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
          <span>{showTracks ? 'Hide' : 'Show'} {otherTracks.length} more tracks</span>
          {showTracks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}
      
      {/* Track Dropdown Content */}
      {showTracks && otherTracks.length > 0 && (
        <div className="mt-1 max-h-64 overflow-y-auto text-xs border border-pink-200 rounded">
          <div className="sticky top-0 bg-pink-100 p-1 text-xs text-center text-pink-600 font-medium">
            Showing all {otherTracks.length} remaining tracks
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