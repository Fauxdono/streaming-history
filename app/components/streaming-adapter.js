import Papa from 'papaparse';
import _ from 'lodash';
import * as XLSX from 'xlsx';

// Define a common structure for streaming data
export const STREAMING_TYPES = {
  SPOTIFY: 'spotify',
  APPLE_MUSIC: 'apple_music',
  YOUTUBE_MUSIC: 'youtube_music',
  TIDAL: 'tidal',
  DEEZER: 'deezer',
  SOUNDCLOUD: 'soundcloud' 
};

// Service metadata for UI
export const STREAMING_SERVICES = {
  [STREAMING_TYPES.SPOTIFY]: {
    name: 'Spotify',
    downloadUrl: 'https://www.spotify.com/account/privacy/',
    instructions: 'Request your "Extended streaming history" and wait for the email (can take up to 5 days)',
    acceptedFormats: '.json'
  },
  [STREAMING_TYPES.APPLE_MUSIC]: {
    name: 'Apple Music',
    downloadUrl: 'https://privacy.apple.com/',
    instructions: 'Go to URL and request a copy of your data and open Apple_Media_Services/Apple Music Activity/Apple Music - Play History Daily Tracks',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.YOUTUBE_MUSIC]: {
    name: 'YouTube Music',
    downloadUrl: 'https://takeout.google.com/',
    instructions: 'Select YouTube and YouTube Music data in Google Takeout',
    acceptedFormats: '.json,.csv'
  },
  [STREAMING_TYPES.DEEZER]: {
    name: 'Deezer',
    downloadUrl: 'https://www.deezer.com/account',
    instructions: 'Go to Account Settings and in the third tab Private information above your birthdate you see My personal data next to Privacy Settings press then download your listening history',
    acceptedFormats: '.csv,.xlsx'
  },
  [STREAMING_TYPES.SOUNDCLOUD]: {
    name: 'SoundCloud',
    instructions: 'You have to send customer service a mail for your SoundCloud history. Mine only went back to 2024 so it isn\'t that comprehensive for me',
    downloadUrl: 'https://soundcloud.com/settings/account',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.TIDAL]: {
    name: 'Tidal',
    downloadUrl: 'https://listen.tidal.com/account/export',
    instructions: 'Go to your Tidal account settings, select "Download my data", choose "Export data" and download the CSV files.',
    acceptedFormats: '.csv'
  }
};

function normalizeString(str) {
  if (!str) return '';
  
  // Extract feature artist information for reference
  let featureArtists = [];
  let match;
  
  // Look for feat. patterns
  const patterns = [
    // Parentheses/brackets formats
    /\(feat\.\s*(.*?)\)/gi,
    /\[feat\.\s*(.*?)\]/gi,
    /\(ft\.\s*(.*?)\)/gi,
    /\[ft\.\s*(.*?)\]/gi,
    /\(with\s*(.*?)\)/gi,
    /\[with\s*(.*?)\]/gi,
    
    // Without parentheses/brackets
    /\sfeat\.\s+(.*?)(?=\s*[-,]|$)/gi,
    /\sft\.\s+(.*?)(?=\s*[-,]|$)/gi,
    /\sfeaturing\s+(.*?)(?=\s*[-,]|$)/gi,
    /\swith\s+(.*?)(?=\s*[-,]|$)/gi,
    
    // Hyphenated formats
    /\s-\s+feat\.\s+(.*?)(?=\s*[-,]|$)/gi,
    /\s-\s+ft\.\s+(.*?)(?=\s*[-,]|$)/gi
  ];
  
  // Extract artists from all patterns
  for (const pattern of patterns) {
    // Global flag requires iterating through all matches
    while ((match = pattern.exec(str)) !== null) {
      if (match && match[1]) {
        // Clean up the extracted artist name
        let artist = match[1].trim();
        // Remove any trailing punctuation
        artist = artist.replace(/[.,;:!?]+$/, '');
        featureArtists.push(artist);
      }
    }
  }
  
  // Remove things like "(feat. X)" or "[feat. X]"
  let normalized = str.toLowerCase()
    // Remove parentheses/bracket formats
    .replace(/\(feat\..*?\)/gi, '')
    .replace(/\[feat\..*?\]/gi, '')
    .replace(/\(ft\..*?\)/gi, '')
    .replace(/\[ft\..*?\]/gi, '')
    .replace(/\(with.*?\)/gi, '')
    .replace(/\[with.*?\]/gi, '')
    
    // Remove standalone formats
    .replace(/\sfeat\..*?(?=\s*[-,]|$)/gi, '')
    .replace(/\sft\..*?(?=\s*[-,]|$)/gi, '')
    .replace(/\sfeaturing.*?(?=\s*[-,]|$)/gi, '')
    
    // Remove hyphenated formats
    .replace(/\s-\s+feat\..*?(?=\s*[-,]|$)/gi, '')
    .replace(/\s-\s+ft\..*?(?=\s*[-,]|$)/gi, '')
    
    // Remove other common clutter
    .replace(/\(bonus track\)/gi, '')
    .replace(/\[bonus track\]/gi, '')
    .replace(/\(.*?version\)/gi, '')
    .replace(/\[.*?version\]/gi, '')
    .replace(/\(.*?edit\)/gi, '')
    .replace(/\[.*?edit\)/gi, '')
    .replace(/\(.*?remix\)/gi, '')
    .replace(/\[.*?remix\)/gi, '');
  
  // Clean up the normalized name by removing extra whitespace and dashes
  normalized = normalized
    .replace(/\s+/g, ' ')      // Collapse multiple spaces into one
    .replace(/\s-\s/g, ' ')    // Remove " - " separators
    .replace(/^\s*-\s*/, '')   // Remove leading dash
    .replace(/\s*-\s*$/, '')   // Remove trailing dash
    .trim();
  
  // Remove all non-alphanumeric characters except spaces
  normalized = normalized.replace(/[^\w\s]/g, '').trim();
  
  // Store featureArtists in the entry if needed
  return {
    normalized,
    featureArtists: featureArtists.length > 0 ? featureArtists : null
  };
}

function createMatchKey(trackName, artistName) {
  if (!trackName || !artistName) return '';
  
  const { normalized: normTrack } = normalizeString(trackName);
  const { normalized: normArtist } = normalizeString(artistName);
  
  // Remove all non-alphanumeric characters and convert to lowercase
  const cleanTrack = normTrack.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const cleanArtist = normArtist.toLowerCase().replace(/[^\w\s]/g, '').trim();
  
  return `${cleanTrack}-${cleanArtist}`;
}

function parseListeningTime(timeValue) {
  // Default play time (3.5 minutes)
  let ms_played = 210000;
  
  try {
    if (!timeValue) return ms_played;
    
    if (typeof timeValue === 'number') {
      // If it's already a number, assume it's in seconds
      return timeValue * 1000;
    }
    
    if (typeof timeValue === 'string') {
      // Check if format is "MM:SS" or "HH:MM:SS"
      const timeParts = timeValue.split(':').map(Number);
      if (timeParts.length === 2) {
        // MM:SS format
        return (timeParts[0] * 60 + timeParts[1]) * 1000;
      } else if (timeParts.length === 3) {
        // HH:MM:SS format
        return ((timeParts[0] * 60 + timeParts[1]) * 60 + timeParts[2]) * 1000;
      } else {
        // Try to parse as a simple number (minutes or seconds)
        const num = parseFloat(timeValue);
        if (!isNaN(num)) {
          // Assume minutes if small, seconds if larger
          return (num < 30 ? num * 60 : num) * 1000;
        }
      }
    }
  } catch (e) {
    console.warn('Error parsing listening time:', timeValue, e);
  }
  
  return ms_played;
}

// Process SoundCloud CSV data
async function processSoundcloudCSV(content) {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (results) => {
        console.log('Soundcloud CSV headers:', results.meta.fields);
        
        const transformedData = results.data
          .filter(row => row['play_time'] && row['track_title'])
          .map(row => {
            // Parse the play time
            const playTime = new Date(row.play_time);
            
            // Extract artist and track name from track_title
            let artist = "Unknown Artist";
            let trackName = row.track_title;
            
            // Handle different track title formats
            if (row.track_title.includes(" - ")) {
              // Standard "Artist - Track" format
              const parts = row.track_title.split(" - ");
              artist = parts[0].trim();
              trackName = parts.slice(1).join(" - ").trim();
            } else if (row.track_title.match(/^.*?\s+feat\.|ft\.|\(feat\.|\(ft\./i)) {
              // Handle "Artist feat. Someone" format
              const match = row.track_title.match(/^(.*?)\s+(feat\.|ft\.|\(feat\.|\(ft\.)/i);
              if (match) {
                artist = match[1].trim();
                trackName = row.track_title.substring(match[0].length).trim();
              }
            }
            
            // Extract username from URL
            const urlParts = row.track_url ? row.track_url.split('/') : [];
            const uploader = urlParts[3] || "unknown";
            
            // Since SoundCloud doesn't provide play duration, we'll estimate it based on track type
            let estimatedDuration = 210000; // Default: 3.5 minutes in milliseconds
            
            // Adjust duration based on keywords in the title
            if (trackName.toLowerCase().includes("podcast") || 
                trackName.toLowerCase().includes("episode") || 
                trackName.toLowerCase().includes("mix") || 
                trackName.toLowerCase().includes("set")) {
              estimatedDuration = 1800000; // 30 minutes for podcasts/mixes
            } else if (trackName.toLowerCase().includes("intro") || 
                      trackName.toLowerCase().includes("skit")) {
              estimatedDuration = 90000; // 1.5 minutes for intros/skits
            }
            
            return {
              ts: playTime,
              ms_played: estimatedDuration,
              master_metadata_track_name: trackName,
              master_metadata_album_artist_name: artist,
              master_metadata_album_album_name: uploader, // Use uploader as album name
              reason_start: "trackdone",
              reason_end: "trackdone",
              shuffle: false,
              skipped: false,
              platform: "SOUNDCLOUD",
              source: "soundcloud",
              username: uploader,
              url: row.track_url
            };
          });
        
        console.log(`Transformed ${transformedData.length} Soundcloud entries`);
        resolve(transformedData);
      },
      error: (error) => {
        console.error('Error parsing Soundcloud CSV:', error);
        resolve([]);
      }
    });
  });
}

// Process Apple Music CSV data
async function processAppleMusicCSV(content) {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (results) => {
        console.log('Apple Music CSV headers:', results.meta.fields);
        let transformedData = [];
        
        // Detect file format
        const isRecentlyPlayedTracks = results.meta.fields.some(f => 
          f === 'Track Description' && results.meta.fields.includes('Total plays'));
        
        const isTrackPlayHistory = results.meta.fields.some(f => 
          f === 'Track Name' && results.meta.fields.includes('Last Played Date'));
        
        const isDailyTracks = results.meta.fields.some(f => 
          f === 'Track Description' && results.meta.fields.includes('Date Played'));

        if (isRecentlyPlayedTracks) {
          // Process the detailed Recently Played Tracks format
          console.log('Processing Apple Music Recently Played Tracks format');
          transformedData = results.data
            .filter(row => row['Track Description'] && row['Total plays'] > 0)
            .map(row => {
              // Parse track information from Track Description
              let trackDescription = row['Track Description'] || '';
              let trackName = trackDescription;
              let artistName = 'Unknown Artist';
              
              // Format is typically "Artist - Track Name"
              const dashIndex = trackDescription.indexOf(' - ');
              if (dashIndex > 0) {
                artistName = trackDescription.substring(0, dashIndex).trim();
                trackName = trackDescription.substring(dashIndex + 3).trim();
              }
              
              // For the more accurate file, we'll create multiple play entries
              // based on the number of plays, distributed over time
              const plays = [];
              const totalPlays = parseInt(row['Total plays']) || 1;
              const totalDuration = parseInt(row['Total play duration in millis']) || 0;
              const trackDuration = parseInt(row['Media duration in millis']) || 0;
              
              // Get the timestamps
              let firstPlayed, lastPlayed;
              try {
                firstPlayed = row['First Event Timestamp'] ? 
                              new Date(row['First Event Timestamp']) : 
                              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // fallback to 30 days ago
                
                lastPlayed = row['Last Event End Timestamp'] ? 
                            new Date(row['Last Event End Timestamp']) : 
                            new Date();
              } catch (e) {
                console.warn('Error parsing timestamps in Recently Played Tracks:', e);
                firstPlayed = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                lastPlayed = new Date();
              }
              
              // Calculate average play duration
              const avgPlayDuration = totalPlays > 0 ? 
                                    Math.floor(totalDuration / totalPlays) : 
                                    trackDuration;
              
              // Determine if this is a podcast based on media type and duration
              const isPodcast = (row['Media type'] === 'PODCAST' || 
                               (trackDescription.toLowerCase().includes('podcast')) ||
                               (trackDuration > 1800000)); // Over 30 minutes
              
              // Create album information if available
              let albumName = 'Unknown Album';
              if (row['Container Description'] && 
                  row['Container Type'] && 
                  row['Container Type'].includes('ALBUM')) {
                albumName = row['Container Description'];
              }
              
              // For accurate statistics, we'll create one entry per play
              // We'll distribute these plays between first and last played timestamps
              if (totalPlays === 1) {
                // Just one play - use the last timestamp
                plays.push({
                  master_metadata_track_name: trackName,
                  ts: lastPlayed, // Store Date object instead of ISO string
                  ms_played: avgPlayDuration,
                  master_metadata_album_artist_name: artistName,
                  master_metadata_album_album_name: albumName,
                  duration_ms: trackDuration,
                  platform: 'APPLE',
                  source: 'apple_music'
                });
              } else {
                // Multiple plays - distribute them between first and last
                const timeRange = lastPlayed.getTime() - firstPlayed.getTime();
                const timeStep = timeRange / (totalPlays - 1);
                
                for (let i = 0; i < totalPlays; i++) {
                  const playTime = new Date(firstPlayed.getTime() + (timeStep * i));
                  plays.push({
                    master_metadata_track_name: trackName,
                    ts: playTime, // Store Date object instead of ISO string
                    ms_played: avgPlayDuration,
                    master_metadata_album_artist_name: artistName,
                    master_metadata_album_album_name: albumName,
                    duration_ms: trackDuration,
                    platform: 'APPLE',
                    source: 'apple_music'
                  });
                }
              }
              
              // Add podcast information if relevant
              if (isPodcast) {
                plays.forEach(play => {
                  play.episode_name = trackName;
                  play.episode_show_name = artistName;
                });
              }
              
              return plays;
            });
          
          // Flatten the array of arrays
          transformedData = transformedData.flat();
          
        } else if (isTrackPlayHistory) {
          // Process the simpler Track Play History format
          transformedData = results.data
            .filter(row => row['Track Name'] && row['Last Played Date'])
            .map(row => {
              // Handle special case for Kenny Rogers
              if (row['Track Name'] && 
                  row['Track Name'].toLowerCase().includes("just dropped in") && 
                  row['Track Name'].toLowerCase().includes("kenny rogers")) {
                return {
                  master_metadata_track_name: 'Just Dropped In (To See What Condition My Condition Is In)',
                  ts: new Date(parseInt(row['Last Played Date'])), // Store Date object
                  ms_played: row['Is User Initiated'] ? 240000 : 30000,
                  master_metadata_album_artist_name: 'Kenny Rogers & The First Edition',
                  master_metadata_album_album_name: 'Unknown Album',
                  source: 'apple_music'
                };
              }
          
              // Parse track name from Apple Music format
              let trackName = row['Track Name'] || '';
              let artistName = 'Unknown Artist';
              
              // Apple format is often "Artist - Track" or "Artist, Artist - Track"
              const dashIndex = trackName.indexOf(' - ');
              if (dashIndex > 0) {
                artistName = trackName.substring(0, dashIndex).trim();
                trackName = trackName.substring(dashIndex + 3).trim();
              }
              
              // Convert timestamp from milliseconds to Date object
              let timestamp;
              try {
                timestamp = new Date(parseInt(row['Last Played Date'])); // Store Date object
              } catch (e) {
                // Fallback if timestamp parsing fails
                timestamp = new Date();
              }
              
              // Estimate play time (Apple doesn't provide this)
              // User-initiated plays likely involve full tracks
              const estimatedPlayTime = row['Is User Initiated'] ? 240000 : 30000;
              
              return {
                master_metadata_track_name: trackName,
                ts: timestamp, // Store Date object instead of ISO string
                ms_played: estimatedPlayTime,
                master_metadata_album_artist_name: artistName,
                master_metadata_album_album_name: 'Unknown Album',
                source: 'apple_music'
              };
            });
        } else if (isDailyTracks) {
          // Process the more detailed Daily Tracks format
          transformedData = results.data
            .filter(row => row['Track Description'] && row['Date Played'])
            .map(row => {
              // Parse track information from Track Description
              let trackDescription = row['Track Description'] || '';
              let trackName = trackDescription;
              let artistName = 'Unknown Artist';
              
              // Format is typically "Artist - Track Name"
              const dashIndex = trackDescription.indexOf(' - ');
              if (dashIndex > 0) {
                artistName = trackDescription.substring(0, dashIndex).trim();
                trackName = trackDescription.substring(dashIndex + 3).trim();
              }
              
              // Parse date (format is typically YYYYMMDD)
              let timestamp;
              try {
                const datePlayed = row['Date Played'].toString();
                // Format YYYYMMDD to YYYY-MM-DD
                if (datePlayed.length === 8) {
                  const year = parseInt(datePlayed.substring(0, 4));
                  const month = parseInt(datePlayed.substring(4, 6)) - 1; // Months are 0-indexed in JS
                  const day = parseInt(datePlayed.substring(6, 8));
                  
                  // If hours field exists, use it for more precise timestamp
                  let hours = 12; // Default to noon if no hour specified
                  if (row['Hours']) {
                    // Hours field might be like "19, 20" (meaning spanning multiple hours)
                    // Just take the first number
                    const hoursStr = row['Hours'].toString().split(',')[0].trim();
                    hours = parseInt(hoursStr) || 12;
                  }
                  
                  // Create date using proper component values
                  timestamp = new Date(year, month, day, hours, 0, 0);
                  
                  // Validate the date - if it's invalid or in the future, log and use fallback
                  if (isNaN(timestamp.getTime()) || timestamp > new Date()) {
                    console.warn('Invalid or future date detected:', datePlayed, 'Using fallback date');
                    timestamp = new Date(2022, 0, 1); // Fallback to January 1, 2022
                  }
                } else {
                  // Fallback to parsing as integer timestamp
                  const parsed = new Date(parseInt(datePlayed));
                  
                  // Validate the parsed date
                  if (!isNaN(parsed.getTime()) && parsed <= new Date()) {
                    timestamp = parsed;
                  } else {
                    console.warn('Invalid timestamp detected:', datePlayed, 'Using fallback date');
                    timestamp = new Date(2022, 0, 1); // Fallback to January 1, 2022
                  }
                }
              } catch (e) {
                console.warn('Error parsing Daily Tracks date:', row['Date Played'], e);
                timestamp = new Date(2022, 0, 1); // Fallback to January 1, 2022
              }
              
              // Get play duration in milliseconds
              const playDuration = row['Play Duration Milliseconds'] || 210000; // Default to 3.5 min
              
              // Handle podcast vs music distinction if possible
              const isPodcast = trackDescription.toLowerCase().includes('podcast') || 
                             (row['Media type'] === 'VIDEO' && playDuration > 1200000);
              
              const result = {
                master_metadata_track_name: trackName,
                ts: timestamp, // Store Date object directly
                ms_played: playDuration,
                master_metadata_album_artist_name: artistName,
                master_metadata_album_album_name: 'Unknown Album',
                platform: row['Source Type'] || 'APPLE',
                source: 'apple_music'
              };
              
              // Add podcast fields if it appears to be a podcast
              if (isPodcast) {
                result.episode_name = trackName;
                result.episode_show_name = artistName;
              }
              
              return result;
            });
          
          console.log(`Transformed ${transformedData.length} Apple Music Data entries`);
        } else {
          // Unknown Apple Music format, try a generic approach
          console.log('Unknown Apple Music CSV format, attempting generic parsing');
          
          // Look for possible track name and date fields
          const nameFields = results.meta.fields.filter(f => 
            f.toLowerCase().includes('track') || 
            f.toLowerCase().includes('song') || 
            f.toLowerCase().includes('name') || 
            f.toLowerCase().includes('title') || 
            f.toLowerCase().includes('description')
          );
          
          const dateFields = results.meta.fields.filter(f => 
            f.toLowerCase().includes('date') || 
            f.toLowerCase().includes('played') || 
            f.toLowerCase().includes('time')
          );
          
          if (nameFields.length > 0 && dateFields.length > 0) {
            const nameField = nameFields[0];
            const dateField = dateFields[0];
            
            transformedData = results.data
              .filter(row => row[nameField])
              .map(row => {
                let trackDescription = row[nameField] || '';
                let trackName = trackDescription;
                let artistName = 'Unknown Artist';
                
                const dashIndex = trackDescription.indexOf(' - ');
                if (dashIndex > 0) {
                  artistName = trackDescription.substring(0, dashIndex).trim();
                  trackName = trackDescription.substring(dashIndex + 3).trim();
                }
                
                let timestamp;
                try {
                  if (typeof row[dateField] === 'number') {
                    timestamp = new Date(row[dateField]); // Store Date object
                  } else if (typeof row[dateField] === 'string') {
                    timestamp = new Date(row[dateField]); // Store Date object
                  } else {
                    timestamp = new Date(); // Store Date object
                  }
                } catch (e) {
                  timestamp = new Date(); // Store Date object
                }
                
                return {
                  master_metadata_track_name: trackName,
                  ts: timestamp, // Store Date object instead of ISO string
                  ms_played: 180000, // Default 3 minutes
                  master_metadata_album_artist_name: artistName,
                  master_metadata_album_album_name: 'Unknown Album',
                  source: 'apple_music'
                };
              });
          }
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
}

// Process Deezer XLSX file
async function processDeezerXLSX(file) {
  try {
    // For XLSX files, we need to get the content as ArrayBuffer
    const buffer = await file.arrayBuffer();
    
    // Parse the XLSX file
    const workbook = XLSX.read(new Uint8Array(buffer), { 
      type: 'array',
      cellDates: true,
      cellNF: true
    });
    
    // Find the listening history sheet
    const historySheetName = "10_listeningHistory";
    if (!workbook.SheetNames.includes(historySheetName)) {
      console.error('Listening history sheet not found in Deezer file');
      return [];
    }
    
    const historySheet = workbook.Sheets[historySheetName];
    const data = XLSX.utils.sheet_to_json(historySheet);
    
    console.log(`Processing ${data.length} Deezer history entries`);
    
    // Transform Deezer data to common format
    const transformedData = data.map(row => {
      // Extract required fields, handling potential missing fields
      const trackName = row['Song Title'] || '';
      const artistName = row['Artist'] || 'Unknown Artist';
      const albumName = row['Album Title'] || 'Unknown Album';
      const isrc = row['ISRC'] || null;
      
      // Parse listening time (in seconds) 
      let playDuration = 0;
      if (row['Listening Time'] && !isNaN(row['Listening Time'])) {
        // Convert seconds to milliseconds
        playDuration = parseInt(row['Listening Time']) * 1000;
      } else {
        // Default to 3.5 minutes if no valid duration
        playDuration = 210000;
      }
      
      // Parse date
      let timestamp;
      try {
        // If it's already a Date object, use it
        if (row['Date'] instanceof Date) {
          timestamp = row['Date'];
        } else if (typeof row['Date'] === 'string') {
          // Parse the date string
          timestamp = new Date(row['Date']);
        } else {
          // Fallback to current time
          timestamp = new Date();
        }
      } catch (e) {
        console.warn('Error parsing Deezer timestamp:', e);
        timestamp = new Date();
      }
      
      // Get platform info
      const platform = row['Platform Name'] || 'deezer';
      const platformModel = row['Platform Model'] || '';
      
      // Create the standardized entry
      return {
        master_metadata_track_name: trackName,
        ts: timestamp,
        ms_played: playDuration,
        master_metadata_album_artist_name: artistName,
        master_metadata_album_album_name: albumName,
        isrc: isrc, // Store ISRC for better track matching
        platform: `DEEZER-${platform.toUpperCase()}${platformModel ? '-' + platformModel.toUpperCase() : ''}`,
        source: 'deezer'
      };
    });
    
    console.log(`Transformed ${transformedData.length} Deezer entries`);
    return transformedData;
  } catch (error) {
    console.error('Error processing Deezer XLSX file:', error);
    return [];
  }



  
  // Process favorites if available
  if (favoritesContent) {
    await new Promise((resolve) => {
      Papa.parse(favoritesContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        delimitersToGuess: [',', '\t', '|', ';'],
        complete: (results) => {
          console.log('Tidal favorites CSV headers:', results.meta.fields);
          
          if (results.data && results.data.length > 0) {
            // Transform each favorite track to our common format
            results.data.forEach(entry => {
              if (entry.artist_name && entry.track_title) {
                const playTime = new Date(entry.date_added || Date.now());
                const durationMs = entry.duration ? entry.duration * 1000 : 180000; // Convert to ms
                
                favoritesData.push({
                  ts: playTime,
                  ms_played: durationMs,
                  master_metadata_track_name: entry.track_title,
                  master_metadata_album_artist_name: entry.artist_name,
                  master_metadata_album_album_name: entry.album_title || 'Unknown Album',
                  reason_start: "trackdone",
                  reason_end: "trackdone",
                  shuffle: false,
                  skipped: false,
                  platform: "TIDAL-FAVORITE",
                  source: "tidal",
                  favorite: true
                });
              }
            });
          }
          
          resolve();
        },
        error: (error) => {
          console.error('Error parsing Tidal favorites CSV:', error);
          resolve();
        }
      });
    });
  }

/// Process Tidal CSV data
async function processTidalCSV(content) {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      complete: (results) => {
        console.log('Tidal CSV headers:', results.meta.fields);
        
        const transformedData = results.data
          .filter(row => row.track_title && row.artist_name)
          .map(row => {
            // Parse the timestamp
            let timestamp;
            try {
              timestamp = new Date(row.entry_date);
              // If timestamp parsing fails, use current date as fallback
              if (isNaN(timestamp.getTime())) {
                console.warn('Invalid timestamp in Tidal data:', row.entry_date);
                timestamp = new Date();
              }
            } catch (e) {
              console.warn('Error parsing Tidal timestamp:', e);
              timestamp = new Date(); // Fallback to current date
            }
            
            // Make sure stream_duration_ms is a number
            const duration = typeof row.stream_duration_ms === 'number' ? 
              row.stream_duration_ms : 
              parseFloat(row.stream_duration_ms) || 210000; // Default to 3.5 minutes if parsing fails
            
            // Create standardized entry
            return {
              ts: timestamp,
              ms_played: duration,
              master_metadata_track_name: row.track_title,
              master_metadata_album_artist_name: row.artist_name,
              master_metadata_album_album_name: "Unknown Album", // Tidal CSV doesn't include album name
              reason_start: "trackdone",
              reason_end: "trackdone",
              shuffle: false,
              skipped: false,
              platform: "TIDAL",
              source: "tidal",
              product_type: row.product_type,
              client_name: row.client_name_from_session,
              country: row.country_name,
              region: row.region_name,
              city: row.city_name
            };
          });
        
        console.log(`Transformed ${transformedData.length} Tidal entries`);
        resolve(transformedData);
      },
      error: (error) => {
        console.error('Error parsing Tidal CSV:', error);
        resolve([]);
      }
    });
  });
}
  
  // Combine both streaming and favorites data
  return [...streamingData, ...favoritesData];
}


// This patch should be applied to the calculatePlayStats function in streaming-adapter.js

function calculatePlayStats(entries) {
  const allSongs = [];
  const artistStats = {};
  const albumStats = {};
  const songPlayHistory = {};
  const serviceListeningTime = {};
  let totalListeningTime = 0;
  let processedSongs = 0;
  let shortPlays = 0;

  // Simple track map for combining same tracks
  const trackMap = {};
  
  // Track album information by track/artist combination - ENHANCED
  const albumLookup = {};
  
  // Track feature artists by track/artist combination
  const featureArtistLookup = {};
  
  // Add ISRC tracking
  const isrcMap = {};
  
  // Create a track-to-album mapping from Spotify entries first
  const trackToAlbumMap = new Map();
  
  // NEW: Create an album-to-track mapping to improve album track association
  const albumToTracksMap = new Map();

  // First pass - collect all Spotify album information with IMPROVED normalization
  entries.forEach(entry => {
    if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
      // Extract album name if available
      const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
      
      // Store track-to-album mapping regardless of source (not just Spotify)
      if (albumName !== 'Unknown Album') {
        const trackName = entry.master_metadata_track_name.toLowerCase().trim();
        const artistName = entry.master_metadata_album_artist_name.toLowerCase().trim();
        
        // Create a key that identifies this track regardless of source
        const trackKey = `${trackName}|||${artistName}`;
        
        // Store the album information for this track
        trackToAlbumMap.set(trackKey, {
          albumName: albumName,
          normalizedAlbumName: normalizeAlbumName(albumName),
          source: entry.source || 'unknown'
        });
        
        // NEW: Also track which tracks belong to each album
        const albumKey = `${normalizeAlbumName(albumName)}|||${artistName}`;
        if (!albumToTracksMap.has(albumKey)) {
          albumToTracksMap.set(albumKey, new Set());
        }
        albumToTracksMap.get(albumKey).add(trackName);
      }
    }
  });

  // Helper function for consistent album name normalization
  function normalizeAlbumName(albumName) {
    if (!albumName) return '';
    return albumName.toLowerCase()
      // Remove deluxe/special edition markers
      .replace(/(\(|\[)?\s*(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\s*edition)?\s*(\)|\])?/gi, '')
      // Remove years in parentheses like (2019) or [2019]
      .replace(/(\(|\[)\s*\d{4}\s*(\)|\])/g, '')
      // Remove feat. artist parts
      .replace(/(\(|\[)?\s*feat\..*(\)|\])?/gi, '')
      // Clean up remaining parentheses and brackets
      .replace(/(\(|\[)\s*(\)|\])/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

function normalizeTrackName(trackName) {
  if (!trackName) return '';
  return trackName.toLowerCase()
    // Standardize interludes, skits, outros, intros
    .replace(/\s*-\s*(interlude|skit|outro|intro)\s*$/i, ' ($1)')
    .replace(/\s*\(\s*(interlude|skit|outro|intro)\s*\)\s*$/i, ' ($1)')
    // Remove feat./ft. parts
    .replace(/\s*(\(|\[)?\s*feat\..*(\)|\])?\s*$/i, '')
    .replace(/\s*(\(|\[)?\s*ft\..*(\)|\])?\s*$/i, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

  console.log(`Created track-to-album mapping with ${trackToAlbumMap.size} entries`);
  console.log(`Created album-to-tracks mapping with ${albumToTracksMap.size} albums`);
  

  // First pass to collect album info and ISRCs
  entries.forEach(entry => {
    if (entry.master_metadata_track_name) {
      // Normalize the track name and artist for consistent lookups
      const trackInfo = normalizeString(entry.master_metadata_track_name);
      const artistInfo = normalizeString(entry.master_metadata_album_artist_name || 'Unknown Artist');
      
      const lookupKey = `${trackInfo.normalized}|||${artistInfo.normalized}`;
      
      // Store feature artists in the lookup
      if (trackInfo.featureArtists && trackInfo.featureArtists.length > 0) {
        featureArtistLookup[lookupKey] = trackInfo.featureArtists;
      }
      
      // Track ISRC codes when available
      if (entry.master_metadata_external_ids && entry.master_metadata_external_ids.isrc) {
        const isrc = entry.master_metadata_external_ids.isrc;
        isrcMap[isrc] = lookupKey;
      }
      
      // Also check for standalone ISRC field (from Deezer)
      if (entry.isrc) {
        isrcMap[entry.isrc] = lookupKey;
      }
      
      // Prioritize Spotify album info over other sources
      if (entry.source === 'spotify' && entry.master_metadata_album_album_name) {
        albumLookup[lookupKey] = entry.master_metadata_album_album_name;
      } 
      // If no album info for this track yet, use whatever we have
      else if (!albumLookup[lookupKey] && entry.master_metadata_album_album_name) {
        albumLookup[lookupKey] = entry.master_metadata_album_album_name;
      }
    }
  });
  
  // Second pass to process entries with consolidated information
  entries.forEach(entry => {
    const playTime = entry.ms_played;
    
    // Skip invalid entries
    if (!entry.master_metadata_track_name || playTime < 30000) {
      if (playTime < 30000) shortPlays++;
      return;
    }

    processedSongs++;
    totalListeningTime += playTime;

    const service = entry.source || 'unknown';
    if (!serviceListeningTime[service]) {
      serviceListeningTime[service] = 0;
    }
    serviceListeningTime[service] += playTime;

    const trackName = entry.master_metadata_track_name;
    const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
    
    // Get normalized versions for lookups
    const { normalized: normTrack } = normalizeString(trackName);
    const { normalized: normArtist } = normalizeString(artistName);
    
    // Determine the lookup key
    let lookupKey = `${normTrack}|||${normArtist}`;
    
    // Check if we have an ISRC for this entry, and use that for matching if available
    let matchKeyFromIsrc = null;
    if (entry.master_metadata_external_ids && entry.master_metadata_external_ids.isrc) {
      const isrc = entry.master_metadata_external_ids.isrc;
      if (isrcMap[isrc]) {
        matchKeyFromIsrc = isrcMap[isrc];
      }
    } else if (entry.isrc && isrcMap[entry.isrc]) {
      // Also try standalone ISRC field
      matchKeyFromIsrc = isrcMap[entry.isrc];
    }
    
    // Use ISRC-derived key if available, otherwise use our standard key
    const finalLookupKey = matchKeyFromIsrc || lookupKey;
    
    // ALBUM NAME DETERMINATION - ENHANCED VERSION
    // Determine the album name using several sources in order of priority
    let albumName = 'Unknown Album';
    
    // 1. First try to use album name from this entry if it's a Spotify entry
    if (entry.source === 'spotify' && entry.master_metadata_album_album_name) {
      albumName = entry.master_metadata_album_album_name;
    }
    // 2. If not from Spotify or missing album, check our track-to-album mapping
    else {
      const trackKey = `${normTrack}|||${normArtist}`;
      
      if (trackToAlbumMap.has(trackKey)) {
        albumName = trackToAlbumMap.get(trackKey).albumName;
      }
      // 3. Fall back to our album lookup if the mapping doesn't have it
      else if (albumLookup[finalLookupKey]) {
        albumName = albumLookup[finalLookupKey];
      }
    }
    
    // Get feature artists for this track
    const featureArtists = featureArtistLookup[finalLookupKey] || null;
    
    // Create keys for lookups
    const standardKey = `${trackName}-${artistName}`;
    const matchKey = createMatchKey(trackName, artistName);
    
    // Parse timestamp safely
    let timestamp;
    if (entry.ts instanceof Date) {
      timestamp = entry.ts;
    } else if (typeof entry.ts === 'string') {
      timestamp = new Date(entry.ts);
    } else {
      timestamp = new Date();
    }

    // Track play history
    if (!songPlayHistory[standardKey]) {
      songPlayHistory[standardKey] = [];
    }
    
    // Handle different timestamp formats safely
    if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
      songPlayHistory[standardKey].push(timestamp.getTime());
    } else if (typeof timestamp === 'number') {
      songPlayHistory[standardKey].push(timestamp);
    } else {
      console.warn('Unexpected timestamp format or invalid date:', timestamp);
      songPlayHistory[standardKey].push(new Date().getTime());
    }

    // Artist stats
    if (!artistStats[artistName]) {
      artistStats[artistName] = {
        name: artistName,
        totalPlayed: 0,
        playCount: 0,
        firstListen: timestamp.getTime(),
        firstSong: trackName,
        firstSongPlayCount: 1
      };
    } else {
      // Update running totals
      artistStats[artistName].totalPlayed += playTime;
      artistStats[artistName].playCount++;
      
      // If this timestamp is earlier than the current firstListen, update the first song
      if (timestamp.getTime() < artistStats[artistName].firstListen) {
        artistStats[artistName].firstListen = timestamp.getTime();
        artistStats[artistName].firstSong = trackName;
        artistStats[artistName].firstSongPlayCount = 1;
      } 
      // If this is the same song as the first song, increment its counter
      else if (trackName === artistStats[artistName].firstSong) {
        artistStats[artistName].firstSongPlayCount = (artistStats[artistName].firstSongPlayCount || 0) + 1;
      }
    }

    // ENHANCED Album stats with improved track association
    if (albumName && artistName) {
      // Use consistent normalization for the album key
      const normalizedAlbumName = normalizeAlbumName(albumName);
      const normalizedArtistName = artistName.toLowerCase().trim();
      const albumKey = `${normalizedAlbumName}-${normalizedArtistName}`;
      
      // Get the expected track count from the album-to-tracks mapping
      const fullAlbumKey = `${normalizedAlbumName}|||${normalizedArtistName}`;
      const expectedTrackCount = albumToTracksMap.has(fullAlbumKey) ? 
                               albumToTracksMap.get(fullAlbumKey).size : 0;
      
  if (!albumStats[albumKey]) {
  albumStats[albumKey] = {
    name: albumName,
    artist: artistName,
    totalPlayed: 0,
    playCount: 0,
    trackCount: new Set(),
    trackNames: new Set(), // Store actual track names
    trackObjects: [], // NEW: Store track objects for sorting
    expectedTrackCount: expectedTrackCount,
    firstListen: timestamp.getTime(),
    isComplete: false, // Track if we have all expected tracks
    years: new Set() // NEW: Track which years this album was played in
  };
}

// Get the year from the timestamp and add it to the years set
if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
  const year = timestamp.getFullYear();
  albumStats[albumKey].years.add(year);
}
      
      albumStats[albumKey].totalPlayed += playTime;
      albumStats[albumKey].playCount++;
      albumStats[albumKey].trackCount.add(normTrack);
      albumStats[albumKey].trackNames.add(trackName);
      
      // Add this track to the trackObjects array if not already present
      const existingTrackIndex = albumStats[albumKey].trackObjects.findIndex(
        t => t.trackName === trackName
      );
      
      if (existingTrackIndex === -1) {
        // Track not in array yet, add it
        albumStats[albumKey].trackObjects.push({
          trackName,
          artist: artistName,
          totalPlayed: playTime,
          playCount: 1,
          albumName
        });
      } else {
        // Update existing track stats
        albumStats[albumKey].trackObjects[existingTrackIndex].totalPlayed += playTime;
        albumStats[albumKey].trackObjects[existingTrackIndex].playCount++;
      }
      
      // Update expected track count if we have more tracks than expected
      if (albumStats[albumKey].trackCount.size > albumStats[albumKey].expectedTrackCount) {
        albumStats[albumKey].expectedTrackCount = albumStats[albumKey].trackCount.size;
      }
      
      // Mark as complete if we've found all expected tracks
      if (expectedTrackCount > 0 && albumStats[albumKey].trackCount.size >= expectedTrackCount) {
        albumStats[albumKey].isComplete = true;
      }
      
      albumStats[albumKey].firstListen = Math.min(
        albumStats[albumKey].firstListen, 
        timestamp.getTime()
      );
    }


    if (trackMap[matchKey]) {
      // Update existing track
      trackMap[matchKey].totalPlayed += playTime;
      trackMap[matchKey].playCount++;
      
      // Always take the known album name if we've found a better one
      if (albumName !== 'Unknown Album' && trackMap[matchKey].albumName === 'Unknown Album') {
        trackMap[matchKey].albumName = albumName;
      }
      
      // Add to variations if this is a different name
      if (!trackMap[matchKey].variations.includes(trackName)) {
        trackMap[matchKey].variations.push(trackName);
      }
      
      // Store feature artists if we found them
      if (featureArtists && !trackMap[matchKey].featureArtists) {
        trackMap[matchKey].featureArtists = featureArtists;
      }


      
      // Store ISRC if available and not already stored
      if ((entry.master_metadata_external_ids?.isrc || entry.isrc) && !trackMap[matchKey].isrc) {
        trackMap[matchKey].isrc = entry.master_metadata_external_ids?.isrc || entry.isrc;
      }
    } else {
      // Add new track
      trackMap[matchKey] = {
        key: standardKey,
        trackName,
        artist: artistName,
        albumName,
        totalPlayed: playTime,
        playCount: 1,
        variations: [trackName],
        featureArtists,
        isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
      };
    }
  });

// NEW: Final processing to ensure albumStats has sorted track lists
Object.values(albumStats).forEach(album => {
  // Sort tracks by total played time
  album.trackObjects.sort((a, b) => b.totalPlayed - a.totalPlayed);
  
  // Ensure trackCount is converted to a number for easier use
  if (album.trackCount instanceof Set) {
    album.trackCountValue = album.trackCount.size;
  } else {
    album.trackCountValue = typeof album.trackCount === 'number' ? 
                          album.trackCount : album.trackCount.size;
  }
  
  // Convert years Set to Array for the final output - this needs to be INSIDE the forEach
  if (album.years instanceof Set) {
    album.yearsArray = Array.from(album.years).sort();
  } else {
    album.yearsArray = [];
  }
});

  // Convert track map to array
  for (const key in trackMap) {
    allSongs.push(trackMap[key]);
  }

  return {
    songs: allSongs,
    artists: artistStats,
    albums: albumStats,
    playHistory: songPlayHistory,
    totalListeningTime,
    serviceListeningTime,
    processedSongs,
    shortPlays
  };
}

function calculateArtistStreaks(timestamps) {
  // Sort timestamps and convert to unique days (YYYY-MM-DD format)
  const days = [...new Set(
    timestamps.map(ts => new Date(ts).toISOString().split('T')[0])
  )].sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let streakStart = null;
  let streakEnd = null;

  for (let i = 0; i < days.length; i++) {
    const currentDate = new Date(days[i]);
    const previousDate = i > 0 ? new Date(days[i - 1]) : null;
    
    if (!previousDate || 
        (currentDate - previousDate) / (1000 * 60 * 60 * 24) === 1) {
      // Continuing streak
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        streakEnd = currentDate;
        streakStart = new Date(days[i - currentStreak + 1]);
      }
    } else {
      // Break in streak
      currentStreak = 1;
    }
  }

  // Check if current streak is still active
  const lastPlay = new Date(days[days.length - 1]);
  const now = new Date();
  const daysSinceLastPlay = Math.floor((now - lastPlay) / (1000 * 60 * 60 * 24));
  const activeStreak = daysSinceLastPlay <= 1 ? currentStreak : 0;

  return {
    longestStreak,
    currentStreak: activeStreak,
    streakStart,
    streakEnd
  };
}

function calculateBriefObsessions(songs, songPlayHistory) {
  const briefObsessionsArray = [];
 
  songs.forEach(song => {
    if (song.playCount <= 50) {
      const timestamps = songPlayHistory[song.key] || [];
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a - b);
        
        let maxPlaysInWeek = 0;
        let bestWeekStart = null;
        
        for (let i = 0; i < timestamps.length; i++) {
          const weekEnd = new Date(timestamps[i]);
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekStart.getDate() - 7);
          
          const playsInWeek = timestamps.filter(t => t >= weekStart && t <= weekEnd).length;
          
          if (playsInWeek > maxPlaysInWeek) {
            maxPlaysInWeek = playsInWeek;
            bestWeekStart = weekStart;
          }
        }
        
        if (maxPlaysInWeek >= 5) {
          briefObsessionsArray.push({
            ...song,
            intensePeriod: {
              weekStart: bestWeekStart,
              playsInWeek: maxPlaysInWeek
            }
          });
        }
      }
    }
  });

  return _.orderBy(
    briefObsessionsArray,
    ['intensePeriod.playsInWeek', 'intensePeriod.weekStart'],
    ['desc', 'asc']
  ).slice(0, 100);
}

function calculateSongsByYear(songs, songPlayHistory) {
  const songsByYear = {};
  let dateErrors = 0;
  
  songs.forEach(song => {
    const timestamps = songPlayHistory[song.key] || [];
    if (timestamps.length > 0) {
      // Group by year with extra validation
      const playsByYear = _.groupBy(timestamps, ts => {
        try {
          const date = new Date(ts);
          
          // Check if date is valid
          if (isNaN(date.getTime())) {
            dateErrors++;
            return 2022; // Default to 2022 for invalid dates
          }
          
          // Check if date is from the future
          const currentYear = new Date().getFullYear();
          const year = date.getFullYear();
          
          if (year > currentYear) {
            console.warn(`Future year detected: ${year} for song ${song.trackName}. Defaulting to ${currentYear}.`);
            dateErrors++;
            return 2022; // Default to 2022 for future dates
          }
          
          return year;
        } catch (e) {
          console.error('Error processing timestamp:', ts, e);
          dateErrors++;
          return 2022; // Default to 2022 for errors
        }
      });
      
      Object.entries(playsByYear).forEach(([year, yearTimestamps]) => {
        if (!songsByYear[year]) {
          songsByYear[year] = [];
        }
        
        songsByYear[year].push({
          ...song,
          totalPlayed: song.totalPlayed * (yearTimestamps.length / timestamps.length),
          playCount: yearTimestamps.length,
          spotifyScore: Math.pow(yearTimestamps.length, 1.5)
        });
      });
    }
  });

  if (dateErrors > 0) {
    console.warn(`Detected ${dateErrors} date parsing issues while grouping songs by year`);
  }

  Object.keys(songsByYear).forEach(year => {
    songsByYear[year] = _.orderBy(songsByYear[year], ['spotifyScore'], ['desc'])
      .slice(0, 100);
  });

  return songsByYear;
}
// In streaming-adapter.js: Update the calculateAlbumsByYear function

function calculateAlbumsByYear(albums, rawPlayData) {
  // First, create album ID mapping from all-time data
  const albumMapping = {};
  
  // For each all-time album, create a unique ID and store reference data
  albums.forEach(album => {
    if (!album) return;
    
    // Create a unique ID for this album
    const albumKey = `${album.artist}:::${album.name}`.toLowerCase();
    
    // Get track names from trackNames or trackObjects
    let trackNames = [];
    if (album.trackNames && album.trackNames instanceof Set) {
      trackNames = Array.from(album.trackNames);
    } else if (album.trackObjects && Array.isArray(album.trackObjects)) {
      trackNames = album.trackObjects.map(t => t.trackName || t.displayName).filter(Boolean);
    }
    
    // Store essential data for matching
    albumMapping[albumKey] = {
      name: album.name,
      artist: album.artist,
      allTimeReference: album,
      // Store any album identifiers to help with matching
      trackNames: trackNames,
      trackCount: album.trackCount instanceof Set ? 
                album.trackCount.size : 
                (typeof album.trackCount === 'number' ? album.trackCount : 
                 album.trackCountValue || 0)
    };
    
    // Also create keys for alternate/partial album names
    if (album.name !== 'Unknown Album') {
      // For example, "Mr. Morale & The Big Steppers" might have a variant "Mr. Morale"
      const simplifiedName = album.name.split(/\s+&|\s+and/i)[0].trim();
      if (simplifiedName !== album.name && simplifiedName.length > 5) {
        const altKey = `${album.artist}:::${simplifiedName}`.toLowerCase();
        albumMapping[altKey] = albumMapping[albumKey];
      }
    }
  });
  
  // Function to normalize track names for better matching across services
  function normalizeTrackName(trackName) {
    if (!trackName) return '';
    
    // Convert to lowercase
    let normalized = trackName.toLowerCase()
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
      
    return normalized;
  }
  
  // Group plays by year and album AND track
  const playsByYearAndAlbum = {};
  
  // Track relation between normalized tracks and actual track names
  const normalizedToOriginalTrack = {};
  
  // First pass: build normalized track mappings
  rawPlayData.forEach(entry => {
    if (entry.ms_played < 30000 || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) return;
    
    const trackName = entry.master_metadata_track_name;
    const normalizedTrack = normalizeTrackName(trackName);
    
    if (normalizedTrack) {
      if (!normalizedToOriginalTrack[normalizedTrack]) {
        normalizedToOriginalTrack[normalizedTrack] = [trackName];
      } else if (!normalizedToOriginalTrack[normalizedTrack].includes(trackName)) {
        normalizedToOriginalTrack[normalizedTrack].push(trackName);
      }
    }
  });
  
  // Track relationship between tracks and albums
  const trackToAlbumMap = new Map();
  
  // Second pass: build track-to-album mappings to better understand which tracks belong together
  rawPlayData.forEach(entry => {
    if (entry.ms_played < 30000 || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) return;
    
    const artist = entry.master_metadata_album_artist_name;
    const trackName = entry.master_metadata_track_name;
    const normalizedTrack = normalizeTrackName(trackName);
    const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
    
    // Create a key that identifies this track
    const trackKey = `${artist}:::${normalizedTrack}`.toLowerCase();
    
    // If this track explicitly belongs to an album, record this relationship
    if (albumName && albumName !== 'Unknown Album') {
      if (!trackToAlbumMap.has(trackKey)) {
        trackToAlbumMap.set(trackKey, []);
      }
      
      // Add this album to the list if not already present
      const albumList = trackToAlbumMap.get(trackKey);
      const albumInfo = { 
        name: albumName, 
        count: 1,
        source: entry.source || 'unknown'
      };
      
      // Check if this album is already in the list
      const existingIndex = albumList.findIndex(a => a.name.toLowerCase() === albumName.toLowerCase());
      if (existingIndex >= 0) {
        albumList[existingIndex].count++;
      } else {
        albumList.push(albumInfo);
      }
    }
  });
  
  // Process album membership for tracks with multiple albums
  const trackMainAlbum = new Map();
  
  // For each track, determine its main album
  trackToAlbumMap.forEach((albums, trackKey) => {
    if (albums.length === 0) return;
    
    // If only one album, that's the main album
    if (albums.length === 1) {
      trackMainAlbum.set(trackKey, albums[0].name);
      return;
    }
    
    // Multiple albums - select the most common one
    // Prioritize Spotify source if counts are similar
    albums.sort((a, b) => {
      const countDiff = b.count - a.count;
      if (Math.abs(countDiff) > 5) return countDiff; // Clear winner by count
      
      // Similar counts, prioritize by source
      if (a.source === 'spotify' && b.source !== 'spotify') return -1;
      if (b.source === 'spotify' && a.source !== 'spotify') return 1;
      
      return countDiff; // Default to count difference
    });
    
    trackMainAlbum.set(trackKey, albums[0].name);
  });
  
  // Third pass: build year-specific album data
  rawPlayData.forEach(entry => {
    if (entry.ms_played < 30000 || !entry.master_metadata_album_artist_name) return;
    
    try {
      const timestamp = new Date(entry.ts);
      if (isNaN(timestamp.getTime())) return;
      
      const year = timestamp.getFullYear();
      const artist = entry.master_metadata_album_artist_name;
      const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
      const trackName = entry.master_metadata_track_name;
      
      // Skip tracks with no name
      if (!trackName) return;
      
      // Normalize the track name for cross-service comparison
      const normalizedTrack = normalizeTrackName(trackName);
      
      // Check if this track has a known main album that differs from the current album
      const trackKey = `${artist}:::${normalizedTrack}`.toLowerCase();
      const mainAlbum = trackMainAlbum.get(trackKey);
      
      // If this track belongs to a different album according to our mapping, 
      // and the current album is unknown, use the main album instead
      let effectiveAlbumName = albumName;
      if (mainAlbum && albumName === 'Unknown Album') {
        effectiveAlbumName = mainAlbum;
      }
      
      // Create a key for the album
      const albumKey = `${artist}:::${effectiveAlbumName}`.toLowerCase();
      
      // Try to find matching album in our master mapping
      let resolvedAlbumKey = albumKey;
      let resolvedAlbumData = albumMapping[albumKey];
      
      // If not found, try to identify special cases of tracks
      if ((!resolvedAlbumData || effectiveAlbumName === 'Unknown Album') && trackName) {
        // For Unknown Album cases, see if we have a known main album for this track
        if (effectiveAlbumName === 'Unknown Album' && mainAlbum) {
          const mainAlbumKey = `${artist}:::${mainAlbum}`.toLowerCase();
          if (albumMapping[mainAlbumKey]) {
            resolvedAlbumKey = mainAlbumKey;
            resolvedAlbumData = albumMapping[mainAlbumKey];
          }
        }
        
        // If still not found, try to match by track name
        if (!resolvedAlbumData) {
          // Try to find a matching album by artist and track
          for (const [key, data] of Object.entries(albumMapping)) {
            if (key.startsWith(`${artist.toLowerCase()}:::`) && 
                data.trackNames && data.trackNames.some(t => {
                  if (!t) return false;
                  const normalizedAlbumTrack = normalizeTrackName(t);
                  return normalizedAlbumTrack === normalizedTrack || 
                         normalizedAlbumTrack.includes(normalizedTrack) ||
                         normalizedTrack.includes(normalizedAlbumTrack);
                })) {
              resolvedAlbumKey = key;
              resolvedAlbumData = data;
              break;
            }
          }
        }
      }
      
      // Initialize if needed
      if (!playsByYearAndAlbum[year]) {
        playsByYearAndAlbum[year] = {};
      }
      
      if (!playsByYearAndAlbum[year][resolvedAlbumKey]) {
        // Create a completely new album object for this year
        // Don't use the allTimeReference directly to avoid modifying the original data
        playsByYearAndAlbum[year][resolvedAlbumKey] = {
          name: resolvedAlbumData ? resolvedAlbumData.name : effectiveAlbumName,
          artist: artist,
          totalPlayed: 0,
          playCount: 0,
          normalizedTracks: new Set(), // Track normalized track names to avoid duplicates
          tracks: new Set(),   // Track actual track names
          trackObjects: {},    // Use an object with normTrack as keys
          firstListen: timestamp.getTime(),
          // Store reference to all-time data but don't use its play counts
          allTimeReference: resolvedAlbumData?.allTimeReference || null
        };
      }
      
      // Update stats for this year's album
      playsByYearAndAlbum[year][resolvedAlbumKey].totalPlayed += entry.ms_played;
      playsByYearAndAlbum[year][resolvedAlbumKey].playCount++;
      
      if (trackName) {
        // Add the normalized track to avoid duplicates across services
        playsByYearAndAlbum[year][resolvedAlbumKey].normalizedTracks.add(normalizedTrack);
        
        // Add the actual track name
        playsByYearAndAlbum[year][resolvedAlbumKey].tracks.add(trackName);
        
        // Update or add track to trackObjects using the normalized name as key
        if (!playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack]) {
          // Add new track
          playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack] = {
            trackName: trackName,
            normalizedTrack: normalizedTrack,
            artist: artist,
            totalPlayed: entry.ms_played,
            playCount: 1,
            albumName: effectiveAlbumName,
            variations: normalizedToOriginalTrack[normalizedTrack] || [trackName]
          };
        } else {
          // Update existing track
          playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack].totalPlayed += entry.ms_played;
          playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack].playCount++;
          
          // Ensure this variation is in the list
          if (!playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack].variations.includes(trackName)) {
            playsByYearAndAlbum[year][resolvedAlbumKey].trackObjects[normalizedTrack].variations.push(trackName);
          }
        }
      }
      
      // Update first listen time if earlier
      if (timestamp.getTime() < playsByYearAndAlbum[year][resolvedAlbumKey].firstListen) {
        playsByYearAndAlbum[year][resolvedAlbumKey].firstListen = timestamp.getTime();
      }
    } catch (err) {
      console.warn("Error processing album entry:", err);
    }
  });
  
  // Helper function for album similarity
  function isSimilarAlbum(album1, album2) {
    if (!album1 || !album2) return false;
    
    const norm1 = album1.toLowerCase().trim();
    const norm2 = album2.toLowerCase().trim();
    
    // Direct match
    if (norm1 === norm2) return true;
    
    // Skip if either is unknown
    if (norm1 === 'unknown album' || norm2 === 'unknown album') return false;
    
    // Check for substantial substring match
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
      const minLength = Math.min(norm1.length, norm2.length);
      
      // Ensure it's a substantial match, not just a short word contained within
      if (minLength >= 5 && 
          (norm1.length <= 2 * norm2.length) && 
          (norm2.length <= 2 * norm1.length)) {
        return true;
      }
    }
    
    // Check for similarity in words (at least 50% of words in common)
    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
    
    if (words1.size > 0 && words2.size > 0) {
      let matchCount = 0;
      words1.forEach(word => {
        if (words2.has(word)) matchCount++;
      });
      
      const matchRatio = matchCount / Math.min(words1.size, words2.size);
      if (matchRatio >= 0.5) return true;
    }
    
    return false;
  }
  
  // Convert to final format
  const result = {};
  
  Object.entries(playsByYearAndAlbum).forEach(([year, albums]) => {
    result[year] = Object.values(albums).map(album => {
      // Convert trackObjects from object to array for easier usage
      const trackObjectsArray = Object.values(album.trackObjects || {}).sort((a, b) => b.totalPlayed - a.totalPlayed);
      
      // Start with a fresh album object for this year
      let yearAlbum = {
        name: album.name,
        artist: album.artist,
        totalPlayed: album.totalPlayed,
        playCount: album.playCount,
        firstListen: album.firstListen,
        // Use normalized track count to avoid counting duplicates
        trackCountValue: album.normalizedTracks ? album.normalizedTracks.size : 0,
        // Include array of track objects
        trackObjects: trackObjectsArray
      };
      
      // If we have an all-time reference, use it to fill in additional metadata
      // but NOT the play counts
      if (album.allTimeReference) {
        const allTimeRef = album.allTimeReference;
        
        // Copy metadata from all-time reference
        yearAlbum.trackCount = allTimeRef.trackCount;
        
        // If all-time reference has track metadata but no track count, 
        // use our normalized count as a better estimate
        if (allTimeRef && (!allTimeRef.trackCountValue || allTimeRef.trackCountValue < yearAlbum.trackCountValue)) {
          allTimeRef.trackCountValue = yearAlbum.trackCountValue;
        }
        
        // Use all-time track count if it's higher
        if (allTimeRef && allTimeRef.trackCountValue && allTimeRef.trackCountValue > yearAlbum.trackCountValue) {
          yearAlbum.trackCountValue = allTimeRef.trackCountValue;
        }
        
        yearAlbum.isComplete = allTimeRef.isComplete;
      }
      
      return yearAlbum;
    }).sort((a, b) => b.totalPlayed - a.totalPlayed);
  });
  
  return result;
}

// Helper function to determine if two album names are similar enough to be the same album
function isSimilarAlbum(album1, album2) {
  if (!album1 || !album2) return false;
  
  const norm1 = album1.toLowerCase().trim();
  const norm2 = album2.toLowerCase().trim();
  
  // Direct match
  if (norm1 === norm2) return true;
  
  // Skip if either is unknown
  if (norm1 === 'unknown album' || norm2 === 'unknown album') return false;
  
  // Check for substantial substring match
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLength = Math.min(norm1.length, norm2.length);
    
    // Ensure it's a substantial match, not just a short word contained within
    if (minLength >= 5 && 
        (norm1.length <= 2 * norm2.length) && 
        (norm2.length <= 2 * norm1.length)) {
      return true;
    }
  }
  
  // Check for similarity in words (at least 50% of words in common)
  const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size > 0 && words2.size > 0) {
    let matchCount = 0;
    words1.forEach(word => {
      if (words2.has(word)) matchCount++;
    });
    
    const matchRatio = matchCount / Math.min(words1.size, words2.size);
    if (matchRatio >= 0.5) return true;
  }
  
  return false;
}
function calculateArtistsByYear(songs, songPlayHistory, rawPlayData) {
  const artistsByYear = {};
  let dateErrors = 0;
  
  // First, go through raw play data to get all artists by year
  rawPlayData.forEach(entry => {
    if (!entry.master_metadata_album_artist_name || entry.ms_played < 30000) {
      return; // Skip entries with no artist or short plays
    }
    
    const artist = entry.master_metadata_album_artist_name;
    let timestamp;
    try {
      timestamp = entry.ts instanceof Date 
        ? entry.ts 
        : new Date(entry.ts);
      
      // Check if date is valid
      if (isNaN(timestamp.getTime())) {
        dateErrors++;
        return;
      }
      
      // Check if date is from the future
      const currentYear = new Date().getFullYear();
      const year = timestamp.getFullYear();
      
      if (year > currentYear) {
        console.warn(`Future year detected: ${year} for artist ${artist}. Defaulting to current year.`);
        dateErrors++;
        timestamp = new Date(); // Default to current date for future dates
      }
    } catch (e) {
      console.warn("Error parsing timestamp:", entry.ts, e);
      dateErrors++;
      return;
    }
    
    const year = timestamp.getFullYear();
    
    if (!artistsByYear[year]) {
      artistsByYear[year] = {};
    }
    
    if (!artistsByYear[year][artist]) {
      artistsByYear[year][artist] = {
        name: artist,
        totalPlayed: 0,
        playCount: 0,
        tracks: new Set(),
        plays: []
      };
    }
    
    artistsByYear[year][artist].totalPlayed += entry.ms_played;
    artistsByYear[year][artist].playCount++;
    
    if (entry.master_metadata_track_name) {
      artistsByYear[year][artist].tracks.add(entry.master_metadata_track_name);
    }
    
    artistsByYear[year][artist].plays.push({
      timestamp: timestamp.getTime(),
      trackName: entry.master_metadata_track_name
    });
  });
  
  // Convert to array format and add additional stats for each year
  const result = {};
  
  Object.entries(artistsByYear).forEach(([year, artists]) => {
    result[year] = Object.values(artists).map(artist => {
      const sortedPlays = artist.plays.sort((a, b) => a.timestamp - b.timestamp);
      const firstListen = sortedPlays.length > 0 ? sortedPlays[0].timestamp : null;
      const firstSong = sortedPlays.length > 0 ? sortedPlays[0].trackName : null;
      
      // Count plays of first song
      const firstSongPlayCount = sortedPlays.filter(play => play.trackName === firstSong).length;
      
      // Find most played song
      const songCounts = {};
      sortedPlays.forEach(play => {
        if (play.trackName) {
          songCounts[play.trackName] = (songCounts[play.trackName] || 0) + 1;
        }
      });
      
      const mostPlayedSongName = Object.entries(songCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ trackName: name, playCount: count }))[0] || 
        { trackName: 'Unknown', playCount: 0 };
      
      // Calculate streaks
      const playDates = [...new Set(
        sortedPlays.map(play => new Date(play.timestamp).toISOString().split('T')[0])
      )].sort();
      
      let currentStreak = 0;
      let longestStreak = 0;
      let streakStart = null;
      let streakEnd = null;
      
      for (let i = 0; i < playDates.length; i++) {
        const currentDate = new Date(playDates[i]);
        const previousDate = i > 0 ? new Date(playDates[i - 1]) : null;
        
        if (!previousDate || 
            (currentDate - previousDate) / (1000 * 60 * 60 * 24) === 1) {
          // Continuing streak
          currentStreak++;
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
            streakEnd = currentDate;
            streakStart = new Date(playDates[i - currentStreak + 1]);
          }
        } else {
          // Break in streak
          currentStreak = 1;
        }
      }
      
      // Check if current streak is still active
      const lastPlay = playDates.length > 0 ? new Date(playDates[playDates.length - 1]) : null;
      const now = new Date();
      const daysSinceLastPlay = lastPlay ? Math.floor((now - lastPlay) / (1000 * 60 * 60 * 24)) : 999;
      const activeStreak = daysSinceLastPlay <= 1 ? currentStreak : 0;
      
      // Calculate a score similar to spotifyScore for sorting
      const artistScore = Math.pow(artist.playCount, 1.5);
      
      return {
        ...artist,
        tracks: artist.tracks.size,
        firstListen,
        firstSong,
        firstSongPlayCount,
        mostPlayedSong: mostPlayedSongName,
        longestStreak,
        currentStreak: activeStreak,
        streakStart,
        streakEnd,
        artistScore
      };
    }).sort((a, b) => b.artistScore - a.artistScore);
  });
  
  if (dateErrors > 0) {
    console.warn(`Detected ${dateErrors} date parsing issues while grouping artists by year`);
  }
  
  return result;
}

// Main processor
export const streamingProcessor = {
  async processFiles(files) {
    try {
      let allProcessedData = [];

   // Create maps to hold Tidal-specific files
      const tidalStreaming = files.find(file => file.name.toLowerCase().includes('streaming') && file.name.endsWith('.csv'));
      const tidalFavorites = files.find(file => file.name.toLowerCase().includes('favorite') && file.name.endsWith('.csv'));
      
      // Process Tidal files if found
      if (tidalStreaming || tidalFavorites) {
        let streamingContent = null;
        let favoritesContent = null;
        
        if (tidalStreaming) {
          streamingContent = await tidalStreaming.text();
        }
        
        if (tidalFavorites) {
          favoritesContent = await tidalFavorites.text();
        }
        
        const tidalData = await processTidalCSV(streamingContent, favoritesContent);
        allProcessedData = [...allProcessedData, ...tidalData];
        console.log(`Processed ${tidalData.length} Tidal entries`);
      }
      
      const processedData = await Promise.all(
        Array.from(files).map(async (file) => {
          // Spotify JSON files
          if (file.name.includes('Streaming_History') && file.name.endsWith('.json')) {
            try {
              const content = await file.text();
              const data = JSON.parse(content);
              const dataWithSource = data.map(entry => ({
                ...entry,
                source: 'spotify'
              }));
              allProcessedData = [...allProcessedData, ...dataWithSource];
              return dataWithSource;
            } catch (error) {
              console.error('Error parsing JSON:', error);
              return [];
            }
          }
          
          // Apple Music CSV files
          else if (file.name.toLowerCase().includes('apple') && file.name.endsWith('.csv')) {
            try {
              const content = await file.text();
              const transformedData = await processAppleMusicCSV(content);
              allProcessedData = [...allProcessedData, ...transformedData];
              return transformedData;
            } catch (error) {
              console.error('Error processing Apple Music CSV file:', error);
              return [];
            }
          }

// Tidal CSV files
else if ((file.name.toLowerCase().includes('tidal') || file.name === 'streaming.csv') && file.name.endsWith('.csv')) {
  try {
    const content = await file.text();
    console.log(`Processing ${file.name} as a Tidal CSV file`);
    const tidalData = await processTidalCSV(content);
    allProcessedData = [...allProcessedData, ...tidalData];
    return tidalData;
  } catch (error) {
    console.error('Error processing Tidal CSV file:', error);
    return [];
  }
}
          
          // Soundcloud CSV files
          else if (file.name.endsWith('.csv')) {
            try {
              const content = await file.text();
              // Check if it's a Soundcloud CSV by looking at content
              if (content.includes('play_time') && content.includes('track_title')) {
                console.log(`Processing ${file.name} as a Soundcloud CSV file`);
                const soundcloudData = await processSoundcloudCSV(content);
                allProcessedData = [...allProcessedData, ...soundcloudData];
                return soundcloudData;
              }
              return [];
            } catch (error) {
              console.error('Error processing Soundcloud CSV file:', error);
              return [];
            }
          }
          
          // Deezer XLSX file
          else if (file.name.toLowerCase().includes('deezer') && file.name.endsWith('.xlsx')) {
            try {
              const transformedData = await processDeezerXLSX(file);
              allProcessedData = [...allProcessedData, ...transformedData];
              return transformedData;
            } catch (error) {
              console.error('Error processing Deezer XLSX file:', error);
              return [];
            }
          }
          
          return [];
        })
      );

      // Handle ISRC codes from Deezer data
      allProcessedData.forEach(item => {
        if (item.source === 'deezer' && item.isrc) {
          // Store the ISRC code if available for better track matching
          item.master_metadata_external_ids = {
            isrc: item.isrc
          };
        }
      });

      // Calculate comprehensive stats using allProcessedData
      const stats = calculatePlayStats(allProcessedData);



      const sortedArtists = Object.values(stats.artists)
        .map(artist => {
          const artistSongs = stats.songs.filter(song => song.artist === artist.name);
          const mostPlayed = _.maxBy(artistSongs, 'playCount');
          const artistPlays = [];
          artistSongs.forEach(song => {
            if (stats.playHistory[song.key]) {
              artistPlays.push(...stats.playHistory[song.key]);
            }
          });

          const streaks = calculateArtistStreaks(artistPlays);

          return {
            ...artist,
            mostPlayedSong: mostPlayed || { trackName: 'Unknown', playCount: 0 },
            ...streaks
          };
        })
        .sort((a, b) => b.totalPlayed - a.totalPlayed);

      const sortedAlbums = _.orderBy(
        Object.values(stats.albums).map(album => ({
          ...album,
          trackCount: album.trackCount.size
        })),
        ['totalPlayed'],
        ['desc']
      );

      const sortedSongs = _.orderBy(stats.songs, ['totalPlayed'], ['desc']).slice(0, 250);
 
const verifiedAlbums = sortedAlbums.map(album => {
  if (typeof album.trackCount === 'object' && album.trackCount instanceof Set) {
    return {
      ...album,
      trackCount: album.trackCount.size
    };
  }
  return album;
});

  return {
  stats: {
    totalFiles: files.length,
    totalEntries: allProcessedData.length,
    processedSongs: stats.processedSongs,
    nullTrackNames: allProcessedData.filter(e => !e.master_metadata_track_name).length,
    uniqueSongs: stats.songs.length, // Use the length of the songs array
    shortPlays: stats.shortPlays,
    totalListeningTime: stats.totalListeningTime,
    serviceListeningTime: stats.serviceListeningTime
  },
  topArtists: sortedArtists,
  topAlbums: verifiedAlbums,
  processedTracks: sortedSongs,
  songsByYear: calculateSongsByYear(stats.songs, stats.playHistory),
  briefObsessions: calculateBriefObsessions(stats.songs, stats.playHistory),
  artistsByYear: calculateArtistsByYear(stats.songs, stats.playHistory, allProcessedData),
albumsByYear: calculateAlbumsByYear(verifiedAlbums, allProcessedData),
  rawPlayData: allProcessedData
};
    } catch (error) {
      console.error('Error processing files:', error);
      throw error;
    }
  }
};
export { normalizeString, createMatchKey};