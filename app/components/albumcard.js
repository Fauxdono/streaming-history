import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AlbumCard = ({ album, index, processedData, formatDuration, rawPlayData = [] }) => {
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
  
  // We'll use a comprehensive approach to find all tracks for an album
  let albumTracks = [];
  
  // Get all tracks by this artist
  const allArtistTracks = processedData.filter(track => 
    track.artist && album.artist && 
    track.artist.toLowerCase() === album.artist.toLowerCase()
  );
  
  const normalizedAlbumName = album.name.toLowerCase().trim();

  // Expected track count (either from the album object or a fallback)
  const expectedTrackCount = typeof album.trackCount === 'object' && album.trackCount instanceof Set 
    ? album.trackCount.size 
    : (typeof album.trackCount === 'number' ? album.trackCount : 15); // Default expectation
  
  // STAGE 1: First try exact and fuzzy album name matching
  let exactMatches = allArtistTracks.filter(track => {
    if (!track.albumName) return false;
    
    const trackAlbumLower = track.albumName.toLowerCase().trim();
    const exactMatch = trackAlbumLower === normalizedAlbumName;
    const containsMatch = trackAlbumLower.includes(normalizedAlbumName) || normalizedAlbumName.includes(trackAlbumLower);
    
    // Clean versions (removing deluxe, remastered, etc.)
    const cleanTrackAlbum = trackAlbumLower.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
    const cleanAlbumName = normalizedAlbumName.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
    const cleanMatch = cleanTrackAlbum === cleanAlbumName;
    
    return exactMatch || containsMatch || cleanMatch;
  });
  
  // STAGE 2: If we didn't find enough tracks, try using temporal proximity
  if (exactMatches.length < expectedTrackCount * 0.7) {
    // Get the album's first listen date to find tracks heard around the same time
    const albumFirstListen = new Date(album.firstListen);
    const threeMonthsInMs = 3 * 30 * 24 * 60 * 60 * 1000; // 3 months window
    
    // Find tracks that were first heard around the same time
    const timeBasedMatches = allArtistTracks.filter(track => {
      // Skip tracks we already matched
      if (exactMatches.includes(track)) return false;
      
      // Skip tracks with album names that clearly don't match
      if (track.albumName && !isAlbumNameCompatible(track.albumName, album.name)) return false;
      
      // Check song play history if available
      const firstListenTimestamp = findFirstPlayTimestamp(track, rawPlayData);
      if (firstListenTimestamp) {
        const trackFirstListen = new Date(firstListenTimestamp);
        const timeDifference = Math.abs(trackFirstListen - albumFirstListen);
        return timeDifference < threeMonthsInMs;
      }
      
      return false;
    });
    
    // Add these matches if they seem reasonable
    if (timeBasedMatches.length > 0 && 
        exactMatches.length + timeBasedMatches.length <= expectedTrackCount * 1.5) {
      console.log(`${album.name}: Adding ${timeBasedMatches.length} tracks based on temporal proximity`);
      exactMatches = [...exactMatches, ...timeBasedMatches];
    }
  }
  
  // STAGE 3: Cluster analysis - find tracks that are similar to already matched tracks
  if (exactMatches.length > 0 && exactMatches.length < expectedTrackCount) {
    // Extract patterns from already matched tracks
    const matchedPatterns = exactMatches.map(t => {
      const name = t.trackName.toLowerCase()
        .replace(/\(feat\..*\)/gi, '')
        .replace(/\[feat\..*\]/gi, '')
        .replace(/\(with.*\)/gi, '')
        .replace(/\[with.*\]/gi, '')
        .trim();
      return name;
    });
    
    // Get the words that appear frequently in matched tracks
    const wordFrequency = {};
    matchedPatterns.forEach(pattern => {
      const words = pattern.split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Only count significant words
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
    });
    
    // Find tracks with similar word patterns
    const patternMatches = allArtistTracks.filter(track => {
      // Skip tracks we already matched
      if (exactMatches.includes(track)) return false;
      
      // Clean the track name for matching
      const cleanTrackName = track.trackName.toLowerCase()
        .replace(/\(feat\..*\)/gi, '')
        .replace(/\[feat\..*\]/gi, '')
        .replace(/\(with.*\)/gi, '')
        .replace(/\[with.*\]/gi, '')
        .trim();
      
      // Count words in this track name that match our frequency list
      const words = cleanTrackName.split(/\s+/);
      const matchingWordCount = words.filter(word => wordFrequency[word] > 0).length;
      
      // If enough matching words, likely from same album
      return matchingWordCount > 0;
    });
    
    // Only add if we're not adding too many tracks
    if (patternMatches.length > 0 && 
        exactMatches.length + patternMatches.length <= expectedTrackCount * 1.5) {
      console.log(`${album.name}: Adding ${patternMatches.length} tracks based on pattern matching`);
      exactMatches = [...exactMatches, ...patternMatches];
    }
  }

  // STAGE 4: If we still don't have enough tracks, try tracks with no album name or partial matches
  if (exactMatches.length < expectedTrackCount) {
    // Look for tracks with no album name but otherwise likely to belong
    const albumlessMatches = allArtistTracks.filter(track => {
      // Skip tracks we already matched
      if (exactMatches.includes(track)) return false;
      
      // This stage targets tracks with no album name or very dissimilar album names
      if (track.albumName && isAlbumNameCompatible(track.albumName, album.name)) return false;
      
      // Check if this track was played around the same time as the matched tracks
      // Get the average first play time of already matched tracks
      if (exactMatches.length > 0 && rawPlayData && rawPlayData.length > 0) {
        const matchedFirstPlays = exactMatches
          .map(t => findFirstPlayTimestamp(t, rawPlayData))
          .filter(ts => ts !== null);
          
        if (matchedFirstPlays.length > 0) {
          const avgMatchedTime = matchedFirstPlays.reduce((sum, ts) => sum + ts, 0) / matchedFirstPlays.length;
          const trackFirstPlay = findFirstPlayTimestamp(track, rawPlayData);
          
          if (trackFirstPlay) {
            // If this track was first played within 1 month of the average time for matched tracks
            const timeDiff = Math.abs(trackFirstPlay - avgMatchedTime);
            const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
            return timeDiff < oneMonthMs;
          }
        }
      }
      
      return false;
    });
    
    // Only add if we're still well under the expected count
    if (albumlessMatches.length > 0 && 
        exactMatches.length + albumlessMatches.length <= expectedTrackCount * 1.2) {
      console.log(`${album.name}: Adding ${albumlessMatches.length} tracks with no/different album name`);
      exactMatches = [...exactMatches, ...albumlessMatches];
    }
  }
  
  // Set the final albumTracks list
  albumTracks = exactMatches;
  
  // Helper function to find the first time a track was played
  function findFirstPlayTimestamp(track, rawData) {
    if (!rawData || rawData.length === 0) return null;
    
    const plays = rawData.filter(entry => 
      entry.master_metadata_track_name && 
      entry.master_metadata_album_artist_name &&
      entry.master_metadata_track_name.toLowerCase() === track.trackName.toLowerCase() &&
      entry.master_metadata_album_artist_name.toLowerCase() === track.artist.toLowerCase()
    );
    
    if (plays.length > 0) {
      const timestamps = plays.map(play => new Date(play.ts));
      return Math.min(...timestamps.map(date => date.getTime()));
    }
    
    return null;
  }
  
  // Helper function to check if album names could be compatible
  function isAlbumNameCompatible(name1, name2) {
    if (!name1 || !name2) return false;
    
    // Clean both names
    const clean1 = name1.toLowerCase().trim()
      .replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
    const clean2 = name2.toLowerCase().trim()
      .replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '').trim();
    
    // Check for compatibility: either contains the other, or share significant words
    if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
    
    // Compare significant words (longer than 3 letters)
    const words1 = clean1.split(/\s+/).filter(word => word.length > 3);
    const words2 = clean2.split(/\s+/).filter(word => word.length > 3);
    
    if (words1.length === 0 || words2.length === 0) return false;
    
    const sharedWords = words1.filter(word => words2.includes(word));
    return sharedWords.length >= Math.min(1, Math.min(words1.length, words2.length) * 0.5);
  }
  
  // For debugging purposes
  if (isMrMoraleAlbum) {
    console.log("Final matched tracks count:", albumTracks.length);
    console.log("Matched tracks:", albumTracks.map(t => t.trackName).sort());
  }
  
  // Sort tracks by play time
  const sortedTracks = [...albumTracks].sort((a, b) => b.totalPlayed - a.totalPlayed);
  
  // Get top track
  const topTrack = sortedTracks.length > 0 ? sortedTracks[0] : null;
  
  // Get remaining tracks (excluding top track)
  const otherTracks = sortedTracks.slice(1);
  
  // Normalize trackCount and update to match actual track count if needed
  let normalizedTrackCount = typeof album.trackCount === 'object' && album.trackCount instanceof Set 
    ? album.trackCount.size 
    : (typeof album.trackCount === 'number' ? album.trackCount : 0);
    
  // If we found more tracks than the reported trackCount, update our display count
  // This is especially important for albums with track count inconsistencies
  if (sortedTracks.length > normalizedTrackCount && normalizedTrackCount > 0) {
    console.log(`${album.name}: Adjusting track count from ${normalizedTrackCount} to ${sortedTracks.length}`);
    normalizedTrackCount = sortedTracks.length;
  }

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