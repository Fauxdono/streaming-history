import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Music } from 'lucide-react';

// Function to normalize track names for comparison
const normalizeTrackName = (trackName) => {
  if (!trackName) return '';
  
  // Convert to lowercase
  let normalized = trackName.toLowerCase()
    // Handle Kendrick's "untitled unmastered" album specially
    .replace(/untitled\s+(\d+)\s*[\|\.l]*\s*(\d+.*?)$/i, 'untitled $1 $2')
    
    // Remove featuring artist info
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\(ft\..*?\)/gi, '')
    .replace(/\(featuring.*?\)/gi, '')
    .replace(/feat\..*?$/gi, '')
    .replace(/ft\..*?$/gi, '')
    
    // Remove remix, version, etc.
    .replace(/\(.*?version\)/gi, '')
    .replace(/\(.*?remix\)/gi, '')
    .replace(/\(.*?edit\)/gi, '')
    
    // Remove parenthetical info
    .replace(/\(.*?\)/gi, '')
    .replace(/\[.*?\]/gi, '')
    
    // Replace vertical bars, periods, and other separators with spaces
    .replace(/[|\-\.l]/g, ' ')
    
    // Remove punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\_`~()]/g, '')
    
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  // Special case for interludes, skits, etc.
  normalized = normalized
    .replace(/(\w+)\s+interlude$/, '$1 interlude')  // Standardize interlude naming
    .replace(/(\w+)\s+skit$/, '$1 skit')           // Standardize skit naming
    .replace(/(\w+)\s+intro$/, '$1 intro')         // Standardize intro naming
    .replace(/(\w+)\s+outro$/, '$1 outro');        // Standardize outro naming
  
  return normalized;
};

// Function to combine duplicate tracks with stricter album matching
const combineTrackData = (tracks, albumName = '') => {
  if (!tracks || !Array.isArray(tracks) || tracks.length === 0) return [];
  
  const trackMap = new Map();
  
  // First pass: group tracks by normalized name with stricter album matching
  tracks.forEach(track => {
    if (!track.trackName && !track.name) return;
    
    const trackName = track.trackName || track.name;
    const normalizedName = normalizeTrackName(trackName);
    if (!normalizedName) return;
    
    // Check if track's album matches this album
    // Skip tracks that explicitly belong to a different album
    if (albumName && track.albumName && 
        !albumNameMatch(track.albumName, albumName) && 
        track.albumName !== 'Unknown Album') {
      return;  // Skip this track as it belongs to a different album
    }
    
    if (!trackMap.has(normalizedName)) {
      trackMap.set(normalizedName, {
        normalizedName,
        variations: [trackName],
        totalPlayed: track.totalPlayed || 0,
        playCount: track.playCount || 0,
        // Use the original track name with the most plays as the display name
        displayName: trackName
      });
    } else {
      const existing = trackMap.get(normalizedName);
      
      // Add this variation if it's not already included
      if (!existing.variations.includes(trackName)) {
        existing.variations.push(trackName);
      }
      
      // Add play counts
      existing.totalPlayed += (track.totalPlayed || 0);
      existing.playCount += (track.playCount || 0);
      
      // Update display name if this track has more plays
      if ((track.totalPlayed || 0) > (existing.totalPlayed / existing.variations.length)) {
        existing.displayName = trackName;
      }
    }
  });
  
  // Convert map back to array and sort by play time
  return Array.from(trackMap.values())
    .sort((a, b) => b.totalPlayed - a.totalPlayed);
};

// Helper function to check if two album names match, with fuzzy matching
const albumNameMatch = (albumName1, albumName2) => {
  if (!albumName1 || !albumName2) return false;
  
  // Normalize both album names
  const norm1 = albumName1.toLowerCase().trim();
  const norm2 = albumName2.toLowerCase().trim();
  
  // Check for exact match
  if (norm1 === norm2) return true;
  
  // Check if one contains the other (for partial matches)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // Make sure it's a substantial match (at least 60% of the shorter name)
    const minLength = Math.min(norm1.length, norm2.length);
    const maxLength = Math.max(norm1.length, norm2.length);
    
    // Only consider it a match if the longer name isn't more than 
    // twice the length of the shorter name
    return maxLength <= minLength * 2;
  }
  
  return false;
};

const AlbumCard = ({ album, index, processedData, formatDuration }) => {
  const [showTracks, setShowTracks] = useState(false);

  // Get album tracks with improved handling
  const albumTracks = useMemo(() => {
    // Use pre-existing trackObjects if available
    if (album?.trackObjects && Array.isArray(album.trackObjects) && album.trackObjects.length > 0) {
      return album.trackObjects;
    }
    
    // Fall back to matching tracks from processedData with stricter album matching
    if (!processedData || !album) return [];
    
    // Improved album matching logic
    return processedData.filter(track => 
      track?.artist === album.artist && 
      track?.albumName && (
        // Strict album matching - require substantial match
        albumNameMatch(track.albumName, album.name) ||
        // Special case for Unknown Album only if both are unknown
        (album.name === 'Unknown Album' && track.albumName === 'Unknown Album')
      )
    );
  }, [album, processedData]);
  
  // Deduplicate and combine similar tracks with stricter album validation
  const dedupedTracks = useMemo(() => {
    return combineTrackData(albumTracks || [], album.name);
  }, [albumTracks, album.name]);
  
  // Get top track and other tracks
  const topTrack = dedupedTracks.length > 0 ? dedupedTracks[0] : null;
  const otherTracks = dedupedTracks.slice(1);
  
  // Normalize trackCount with a more accurate count based on dedupedTracks
  const normalizedTrackCount = useMemo(() => {
    // If we have an explicit track count from metadata, use that
    if (album.trackCountValue && typeof album.trackCountValue === 'number') {
      return album.trackCountValue;
    }
    
    // If we have a trackCount that's a Set or number, use that
    if (album.trackCount) {
      if (album.trackCount instanceof Set) {
        return album.trackCount.size;
      }
      if (typeof album.trackCount === 'number') {
        return album.trackCount;
      }
    }
    
    // Default approximate track count for common albums if none is specified
    const defaultCounts = {
      // Add common album track counts here
      '2001': 22, // Dr. Dre's 2001
      'Mr. Morale & The Big Steppers': 18, // Kendrick Lamar
      'To Pimp A Butterfly': 16, // Kendrick Lamar
      'Future Nostalgia': 13, // Dua Lipa
      // Add more as needed
    };
    
    // Check if this is a known album
    for (const [knownAlbum, count] of Object.entries(defaultCounts)) {
      if (albumNameMatch(album.name, knownAlbum)) {
        return count;
      }
    }
    
    // Otherwise use the number of deduped tracks we have or fallback to a default
    return dedupedTracks.length > 0 ? dedupedTracks.length : album.trackObjects?.length || 0;
  }, [album, dedupedTracks]);
  
  // Calculate completeness percentage
  const completenessPercentage = normalizedTrackCount > 0 
    ? Math.min(100, Math.round((dedupedTracks.length / normalizedTrackCount) * 100)) 
    : 0;

  return (
    <div className="p-3 bg-white rounded shadow-sm border-2 border-pink-200 hover:border-pink-400 transition-colors relative">
      <div className="font-bold text-pink-600">{album.name}</div>
      
      <div className="text-sm text-pink-400">
        Artist: <span className="font-bold">{album.artist}</span> 
        <br/>
        Total Time: <span className="font-bold">{formatDuration(album.totalPlayed)}</span> 
        <br/>
        Plays: <span className="font-bold">{album.playCount || 0}</span> 
        <br/>
        Tracks: <span className="font-bold">{dedupedTracks.length} / {normalizedTrackCount || '?'}</span>
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
            {topTrack.displayName}
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
              key={`${track.normalizedName || 'unknown'}-${trackIndex}`}
              className={`p-1 ${trackIndex % 2 === 0 ? 'bg-pink-50' : 'bg-white'}`}
            >
              <div className="text-pink-600">
                {track.displayName || 'Unknown Track'}
                {track.variations && track.variations.length > 1 && (
                  <span className="text-xs text-pink-400 ml-1">
                    ({track.variations.length} versions)
                  </span>
                )}
              </div>
              <div className="flex justify-between text-pink-400">
                <span>{formatDuration(track.totalPlayed || 0)}</span>
                <span>{track.playCount || 0} plays</span>
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