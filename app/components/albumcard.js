import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AlbumCard = ({ album, index, processedData, formatDuration }) => {
  const [showTracks, setShowTracks] = useState(false);

  // Find all tracks for this album
  const albumTracks = processedData.filter(track => {
    // Skip tracks with no album name
    if (!track.albumName) return false;
    
    // Match by artist
    const artistMatch = track.artist === album.artist;
    
    // Normalize album names for comparison
    const trackAlbumName = (track.albumName || '').toLowerCase().trim();
    const thisAlbumName = (album.name || '').toLowerCase().trim();
    
    // Multiple matching strategies
    return artistMatch && (
      trackAlbumName === thisAlbumName ||
      trackAlbumName.includes(thisAlbumName) || 
      thisAlbumName.includes(trackAlbumName) ||
      trackAlbumName.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version)(\)|\])?/gi, '').trim() === 
      thisAlbumName.replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version)(\)|\])?/gi, '').trim()
    );
  });
  
  // Sort tracks by play time
  const sortedTracks = [...albumTracks].sort((a, b) => b.totalPlayed - a.totalPlayed);
  
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
        <div className="mt-1 max-h-32 overflow-y-auto text-xs border border-pink-200 rounded">
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