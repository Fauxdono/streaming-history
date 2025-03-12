import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AlbumCard = ({ album, index, processedData, formatDuration }) => {
  const [showTracks, setShowTracks] = useState(false);

  // Debug specific albums
  const isMGKAlbum = album.artist.toLowerCase().includes('mgk') || 
                     album.name.toLowerCase().includes('mainstream sellout');
                     
  useEffect(() => {
    if (isMGKAlbum) {
      console.log("==== MGK Album Debug ====");
      console.log("Album details:", {
        name: album.name,
        normalizedName: album.name.toLowerCase().trim(),
        artist: album.artist,
        normalizedArtist: album.artist.toLowerCase().trim(),
        trackCount: typeof album.trackCount === 'object' && album.trackCount instanceof Set 
          ? album.trackCount.size 
          : (typeof album.trackCount === 'number' ? album.trackCount : 0),
        firstListen: new Date(album.firstListen).toISOString()
      });
      
      // Check for MGK tracks in processedData
      const mgkTracks = processedData.filter(track => 
        track.artist && track.artist.toLowerCase().includes('mgk')
      );
      
      console.log(`Found ${mgkTracks.length} MGK tracks in processed data`);
      
      // Find tracks with 'mainstream sellout' in the album name
      const msAlbumTracks = processedData.filter(track => 
        track.albumName && track.albumName.toLowerCase().includes('mainstream sellout')
      );
      
      console.log(`Found ${msAlbumTracks.length} tracks with 'mainstream sellout' in album name`);
      console.log("Tracks:", msAlbumTracks.map(t => ({
        trackName: t.trackName,
        artist: t.artist, 
        albumName: t.albumName
      })));
    }
  }, [album, processedData, isMGKAlbum]);

  // Get tracks for this album
  const albumTracks = useMemo(() => {
    // Get all tracks by this artist (case insensitive)
    const normalizedArtist = album.artist.toLowerCase().trim();
    const artistTracks = processedData.filter(track => 
      track.artist && track.artist.toLowerCase().trim() === normalizedArtist
    );
    
    // If this is the MGK album we're debugging, log the artist tracks
    if (isMGKAlbum) {
      console.log(`Found ${artistTracks.length} tracks by artist: ${album.artist}`);
      console.log("Artist tracks:", artistTracks.map(t => ({
        trackName: t.trackName,
        albumName: t.albumName || 'No Album'
      })));
    }
    
    // Match by album name - try multiple approaches
    const normalizedAlbumName = album.name.toLowerCase().trim();
    
    // Try several matching strategies
    const exactMatches = artistTracks.filter(track => 
      track.albumName && track.albumName.toLowerCase().trim() === normalizedAlbumName
    );
    
    const containsMatches = artistTracks.filter(track => 
      track.albumName && 
      !exactMatches.includes(track) &&
      (track.albumName.toLowerCase().includes(normalizedAlbumName) || 
       normalizedAlbumName.includes(track.albumName.toLowerCase()))
    );
    
    const cleanMatches = artistTracks.filter(track => {
      if (!track.albumName || exactMatches.includes(track) || containsMatches.includes(track)) {
        return false;
      }
      
      // Clean album names
      const cleanTrackAlbum = track.albumName.toLowerCase()
        .replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '')
        .trim();
      const cleanAlbumName = normalizedAlbumName
        .replace(/(\(|\[)?(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\)|\])?/gi, '')
        .trim();
      
      return cleanTrackAlbum === cleanAlbumName;
    });
    
    // Combine matches from all strategies
    const allMatches = [...exactMatches, ...containsMatches, ...cleanMatches];
    
    // Debug output for MGK album
    if (isMGKAlbum) {
      console.log("Album matching results for", album.name);
      console.log(`Exact matches: ${exactMatches.length}`);
      console.log(`Contains matches: ${containsMatches.length}`);
      console.log(`Clean matches: ${cleanMatches.length}`);
      console.log(`Total matches: ${allMatches.length}`);
      
      // Last-ditch effort: check for any tracks that might be from this album
      if (allMatches.length === 0) {
        console.log("No matches found with standard methods. Checking raw tracks...");
        const possibleTracks = [];
        
        // Get all known tracks from this album (from your example)
        const knownAlbumTracks = ["emo girl", "mainstream sellout", "make up sex", "born with horns"];
        
        for (const track of artistTracks) {
          const normalizedTrackName = track.trackName.toLowerCase();
          if (knownAlbumTracks.some(knownTrack => normalizedTrackName.includes(knownTrack))) {
            possibleTracks.push(track);
            console.log(`Potential match: "${track.trackName}" might be from "${album.name}"`);
          }
        }
        
        console.log(`Found ${possibleTracks.length} potential tracks by name matching`);
      }
    }
    
    return allMatches;
  }, [album, processedData, isMGKAlbum]);
  
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