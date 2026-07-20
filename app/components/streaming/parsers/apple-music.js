import Papa from 'papaparse';
import { parseDateSafely } from '../dates.js';

export async function processAppleMusicCSV(content) {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (results) => {
        console.log('Apple Music CSV headers:', results.meta.fields);
        let transformedData = [];
        
        // Detect file format based on headers
        const fields = results.meta.fields || [];
        const isRecentlyPlayedTracks = fields.includes('Track Description') && fields.includes('Total plays');
        const isTrackPlayHistory = fields.includes('Track Name') && fields.includes('Last Played Date');
        const isDailyTracks = fields.includes('Track Description') && fields.includes('Date Played');
        
        // Process the data according to the detected format
        if (isRecentlyPlayedTracks) {
          transformedData = processRecentlyPlayedTracks(results.data);
        } else if (isTrackPlayHistory) {
          transformedData = processTrackPlayHistory(results.data);
        } else if (isDailyTracks) {
          transformedData = processDailyTracks(results.data);
        } else {
          transformedData = processGenericAppleFormat(results.data, fields);
        }
        
        console.log('Transformed Apple Music Data:', transformedData.length);
        resolve(transformedData);
      },
      error: (error) => {
        console.error('Error parsing Apple Music CSV:', error);
        resolve([]);
      }
    });
  });
  
  function processRecentlyPlayedTracks(data) {
    return data
      .filter(row => row['Track Description'] && row['Total plays'] > 0)
      .flatMap(row => {
        // Parse track info
        const trackDescription = row['Track Description'] || '';
        const dashIndex = trackDescription.indexOf(' - ');
        const artistName = dashIndex > 0 ? trackDescription.substring(0, dashIndex).trim() : 'Unknown Artist';
        const trackName = dashIndex > 0 ? trackDescription.substring(dashIndex + 3).trim() : trackDescription;
        
        // Get timestamps and play data
        const totalPlays = parseInt(row['Total plays']) || 1;
        const totalDuration = parseInt(row['Total play duration in millis']) || 0;
        const trackDuration = parseInt(row['Media duration in millis']) || 0;
        const firstPlayed = parseDateSafely(row['First Event Timestamp'] || Date.now() - 30*24*60*60*1000);
        const lastPlayed = parseDateSafely(row['Last Event End Timestamp'] || Date.now());
        const avgPlayDuration = totalPlays > 0 ? Math.floor(totalDuration / totalPlays) : trackDuration;
        
        // Determine if podcast
        const isPodcast = (row['Media type'] === 'PODCAST' || 
                         trackDescription.toLowerCase().includes('podcast') ||
                         trackDuration > 1800000);
        
        // Album information
        const albumName = (row['Container Description'] && 
                        row['Container Type'] && 
                        row['Container Type'].includes('ALBUM')) 
                       ? row['Container Description'] : 'Unknown Album';
        
        // Create plays
        const plays = [];
        if (totalPlays === 1) {
          // Single play
          plays.push(createAppleEntry(trackName, lastPlayed, avgPlayDuration, artistName, albumName, trackDuration, isPodcast));
        } else {
          // Multiple plays - distribute evenly
          const timeRange = lastPlayed.getTime() - firstPlayed.getTime();
          const timeStep = timeRange / (totalPlays - 1);
          
          for (let i = 0; i < totalPlays; i++) {
            const playTime = new Date(firstPlayed.getTime() + (timeStep * i));
            plays.push(createAppleEntry(trackName, playTime, avgPlayDuration, artistName, albumName, trackDuration, isPodcast));
          }
        }
        
        return plays;
      });
  }
  
  function processTrackPlayHistory(data) {
    return data
      .filter(row => row['Track Name'] && row['Last Played Date'])
      .map(row => {
        // Special case for Kenny Rogers
        if (row['Track Name'] && 
            row['Track Name'].toLowerCase().includes("just dropped in") && 
            row['Track Name'].toLowerCase().includes("kenny rogers")) {
          return {
            master_metadata_track_name: 'Just Dropped In (To See What Condition My Condition Is In)',
            ts: parseDateSafely(parseInt(row['Last Played Date'])),
            ms_played: row['Is User Initiated'] ? 240000 : 30000,
            master_metadata_album_artist_name: 'Kenny Rogers & The First Edition',
            master_metadata_album_album_name: 'Unknown Album',
            reason_end: 'trackdone',
            source: 'apple_music'
          };
        }
        
        // Parse track info
        const trackName = row['Track Name'] || '';
        const dashIndex = trackName.indexOf(' - ');
        const artistName = dashIndex > 0 ? trackName.substring(0, dashIndex).trim() : 'Unknown Artist';
        const trackTitle = dashIndex > 0 ? trackName.substring(dashIndex + 3).trim() : trackName;
        
        // Estimated play time
        const estimatedPlayTime = row['Is User Initiated'] ? 240000 : 30000;
        
        return {
          master_metadata_track_name: trackTitle,
          ts: parseDateSafely(parseInt(row['Last Played Date'])),
          ms_played: estimatedPlayTime,
          master_metadata_album_artist_name: artistName,
          master_metadata_album_album_name: 'Unknown Album',
          reason_end: 'trackdone',
          source: 'apple_music'
        };
      });
  }

  function processDailyTracks(data) {
    return data
      .filter(row => row['Track Description'] && row['Date Played'])
      .map(row => {
        // Parse track info
        const trackDescription = row['Track Description'] || '';
        const dashIndex = trackDescription.indexOf(' - ');
        const artistName = dashIndex > 0 ? trackDescription.substring(0, dashIndex).trim() : 'Unknown Artist';
        const trackName = dashIndex > 0 ? trackDescription.substring(dashIndex + 3).trim() : trackDescription;
        
        // Parse date (format is typically YYYYMMDD)
        let timestamp;
        try {
          const datePlayed = row['Date Played'].toString();
          if (datePlayed.length === 8) {
            const year = parseInt(datePlayed.substring(0, 4));
            const month = parseInt(datePlayed.substring(4, 6)) - 1;
            const day = parseInt(datePlayed.substring(6, 8));
            
            // Add hours for more precision
            let hours = 12;
            if (row['Hours']) {
              const hoursStr = row['Hours'].toString().split(',')[0].trim();
              hours = parseInt(hoursStr) || 12;
            }
            
            timestamp = new Date(year, month, day, hours, 0, 0);
            if (isNaN(timestamp.getTime()) || timestamp > new Date()) {
              timestamp = new Date(2022, 0, 1);
            }
          } else {
            timestamp = parseDateSafely(parseInt(datePlayed));
          }
        } catch (e) {
          timestamp = new Date(2022, 0, 1);
        }
        
        // Get play duration
        const playDuration = row['Play Duration Milliseconds'] || 210000;
        
        // Check if podcast
        const isPodcast = trackDescription.toLowerCase().includes('podcast') || 
                      (row['Media type'] === 'VIDEO' && playDuration > 1200000);
        
        const result = {
          master_metadata_track_name: trackName,
          ts: timestamp,
          ms_played: playDuration,
          master_metadata_album_artist_name: artistName,
          master_metadata_album_album_name: 'Unknown Album',
          platform: row['Source Type'] || 'APPLE',
          reason_end: 'trackdone',
          source: 'apple_music'
        };
        
        if (isPodcast) {
          result.episode_name = trackName;
          result.episode_show_name = artistName;
        }
        
        return result;
      });
  }
  
  function processGenericAppleFormat(data, fields) {
    // Try to identify key fields
    const nameFields = fields.filter(f => 
      f.toLowerCase().includes('track') || 
      f.toLowerCase().includes('song') || 
      f.toLowerCase().includes('name') || 
      f.toLowerCase().includes('title') || 
      f.toLowerCase().includes('description')
    );
    
    const dateFields = fields.filter(f => 
      f.toLowerCase().includes('date') || 
      f.toLowerCase().includes('played') || 
      f.toLowerCase().includes('time')
    );
    
    if (nameFields.length === 0 || dateFields.length === 0) {
      console.warn('Could not identify required fields in Apple Music file');
      return [];
    }
    
    const nameField = nameFields[0];
    const dateField = dateFields[0];
    
    return data
      .filter(row => row[nameField])
      .map(row => {
        // Parse track info
        const trackDescription = String(row[nameField] || '');
        const dashIndex = trackDescription.indexOf(' - ');
        const artistName = dashIndex > 0 ? trackDescription.substring(0, dashIndex).trim() : 'Unknown Artist';
        const trackName = dashIndex > 0 ? trackDescription.substring(dashIndex + 3).trim() : trackDescription;
        
        return {
          master_metadata_track_name: trackName,
          ts: parseDateSafely(row[dateField]),
          ms_played: 180000, // Default 3 minutes
          master_metadata_album_artist_name: artistName,
          master_metadata_album_album_name: 'Unknown Album',
          reason_end: 'trackdone',
          source: 'apple_music'
        };
      });
  }

  function createAppleEntry(trackName, timestamp, duration, artist, album, trackDuration, isPodcast) {
    const entry = {
      master_metadata_track_name: trackName,
      ts: timestamp,
      ms_played: duration,
      master_metadata_album_artist_name: artist,
      master_metadata_album_album_name: album,
      duration_ms: trackDuration,
      platform: 'APPLE',
      reason_end: 'trackdone',
      source: 'apple_music'
    };
    
    if (isPodcast) {
      entry.episode_name = trackName;
      entry.episode_show_name = artist;
    }
    
    return entry;
  }
}

