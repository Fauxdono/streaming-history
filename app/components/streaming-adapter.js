// Optimized streaming-adapter.js with improved performance
import Papa from 'papaparse';
import _ from 'lodash';
import * as XLSX from 'xlsx';

// Essential service constants
export const STREAMING_TYPES = {
  SPOTIFY: 'spotify',
  APPLE_MUSIC: 'apple_music',
  YOUTUBE_MUSIC: 'youtube_music',
  TIDAL: 'tidal',
  DEEZER: 'deezer',
  SOUNDCLOUD: 'soundcloud',
  CAKE: 'cake'
};

export const STREAMING_SERVICES = {
  [STREAMING_TYPES.SPOTIFY]: {
    name: 'Spotify',
    downloadUrl: 'https://www.spotify.com/account/privacy/',
    instructions: 'Request your "Extended streaming history" and wait for the email (can take up to 5 days). filenames:Streaming_History_Audio_2023-2024_14',
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
    instructions: 'You have to send customer service a mail for your SoundCloud history',
    downloadUrl: 'https://soundcloud.com/settings/account',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.TIDAL]: {
    name: 'Tidal',
    downloadUrl: 'support@tidal.com',
    instructions: 'Send an email to Tidal to request data and wait for 2-4 weeks for it to come',
    acceptedFormats: '.csv'
  },
  [STREAMING_TYPES.CAKE]: {
    name: 'Cake',
    downloadUrl: '#',
    instructions: 'In the statitics page you can download an excel.',
    acceptedFormats: '.xlsx'
  }
};

// Cache for normalized strings to avoid redundant processing
const normalizationCache = new Map();

function normalizeString(str) {
  if (!str) return { normalized: '', featureArtists: [] };
  
  // Check cache first
  const cacheKey = str.toLowerCase();
  if (normalizationCache.has(cacheKey)) {
    return normalizationCache.get(cacheKey);
  }
  
  // Extract feature artists and clean up the string
  let featureArtists = [];
  let normalized = str.toLowerCase();
  
  // Common feature artist patterns
  const patterns = [
    /\(feat\.\s*(.*?)\)/i, /\[feat\.\s*(.*?)\]/i, /\(ft\.\s*(.*?)\)/i, /\[ft\.\s*(.*?)\]/i,
    /\(with\s*(.*?)\)/i, /\[with\s*(.*?)\)/i, /\sfeat\.\s+(.*?)(?=\s*[-,]|$)/i, 
    /\sft\.\s+(.*?)(?=\s*[-,]|$)/i, /\sfeaturing\s+(.*?)(?=\s*[-,]|$)/i
  ];
  
  // Extract all feature artists
  for (const pattern of patterns) {
    const matches = normalized.match(pattern);
    if (matches && matches[1]) {
      featureArtists.push(matches[1].trim());
      normalized = normalized.replace(matches[0], ' ');
    }
  }
  
  // Add specific handling for remix formats with hyphens (e.g., "- PNAU Remix")
  const hyphenRemixPattern = /\s-\s.*?remix/i;
  if (normalized.match(hyphenRemixPattern)) {
    normalized = normalized.replace(hyphenRemixPattern, '');
  }
  
  // Clean up normalized string
  normalized = normalized
    .replace(/\(.*?version\)/g, '').replace(/\[.*?version\]/g, '')
    .replace(/\(.*?edit\)/g, '').replace(/\[.*?edit\]/g, '')
    .replace(/\(.*?remix\)/g, '').replace(/\[.*?remix\]/g, '')
    .replace(/\s+/g, ' ').replace(/\s-\s/g, ' ')
    .replace(/^\s*-\s*/, '').replace(/\s*-\s*$/, '')
    .replace(/[^\w\s]/g, '')
    .trim();
  
  const result = {
    normalized,
    featureArtists: featureArtists.length > 0 ? featureArtists : null
  };
  
  // Save result to cache
  normalizationCache.set(cacheKey, result);
  
  return result;
}

// Cache for match keys
const matchKeyCache = new Map();

function createMatchKey(trackName, artistName) {
  if (!trackName || !artistName) return '';
  
  // Check cache first
  const cacheKey = `${trackName}:::${artistName}`;
  if (matchKeyCache.has(cacheKey)) {
    return matchKeyCache.get(cacheKey);
  }
  
  const trackResult = normalizeString(trackName);
  const cleanTrack = trackResult.normalized;
  
  // Extract primary artist (before &, feat., etc.)
  let primaryArtist = artistName;
  const ampIndex = artistName.indexOf('&');
  const commaIndex = artistName.indexOf(',');
  const featIndex = artistName.toLowerCase().indexOf(' feat');
  const ftIndex = artistName.toLowerCase().indexOf(' ft');
  
  if (ampIndex > 0) {
    primaryArtist = artistName.substring(0, ampIndex).trim();
  } else if (commaIndex > 0) {
    primaryArtist = artistName.substring(0, commaIndex).trim();
  } else if (featIndex > 0) {
    primaryArtist = artistName.substring(0, featIndex).trim();
  } else if (ftIndex > 0) {
    primaryArtist = artistName.substring(0, ftIndex).trim();
  }
  
  const artistResult = normalizeString(primaryArtist);
  const cleanArtist = artistResult.normalized;
  
  const result = `${cleanTrack}-${cleanArtist}`;
  
  // Cache the result
  matchKeyCache.set(cacheKey, result);
  
  return result;
}

function normalizeAlbumName(albumName) {
  if (!albumName) return '';
  return albumName.toLowerCase()
    .replace(/(\(|\[)?\s*(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\s*edition)?\s*(\)|\])?/gi, '')
    .replace(/(\(|\[)\s*\d{4}\s*(\)|\])/g, '')
    .replace(/(\(|\[)?\s*feat\..*(\)|\])?/gi, '')
    .replace(/(\(|\[)\s*(\)|\])/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function filterDataByDate(data, dateFilter) {
  if (!dateFilter || dateFilter === 'all') return data;
  
  // Parse dates once to avoid repeated parsing in filter loop
  let startDate, endDate;

  // Parse year-month-day format (YYYY-MM-DD)
  if (dateFilter.includes('-') && dateFilter.split('-').length === 3) {
    const [year, month, day] = dateFilter.split('-').map(Number);
    startDate = new Date(year, month - 1, day);
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(year, month - 1, day);
    endDate.setHours(23, 59, 59, 999);
    
    return data.filter(entry => {
      try {
        // Cache date object on entry to avoid repeated parsing
        if (!entry._dateObj) entry._dateObj = new Date(entry.ts);
        return entry._dateObj >= startDate && entry._dateObj <= endDate;
      } catch (err) { return false; }
    });
  }
  
  // Parse year-month format (YYYY-MM)
  if (dateFilter.includes('-') && dateFilter.split('-').length === 2) {
    const [year, month] = dateFilter.split('-').map(Number);
    startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    
    // Last day of month
    endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return data.filter(entry => {
      try {
        if (!entry._dateObj) entry._dateObj = new Date(entry.ts);
        return entry._dateObj >= startDate && entry._dateObj <= endDate;
      } catch (err) { return false; }
    });
  }
  
  // Just a year
  const year = parseInt(dateFilter);
  if (!isNaN(year)) {
    startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    
    endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);
    
    return data.filter(entry => {
      try {
        if (!entry._dateObj) entry._dateObj = new Date(entry.ts);
        return entry._dateObj >= startDate && entry._dateObj <= endDate;
      } catch (err) { return false; }
    });
  }
  
  console.warn("Invalid date filter format:", dateFilter);
  return data;
}

// Safe date parsing with fallback
function parseDateSafely(input) {
  try {
    const date = new Date(input);
    return isNaN(date.getTime()) ? new Date() : date;
  } catch (e) {
    return new Date();
  }
}

// File processor functions
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
        const trackDescription = row[nameField] || '';
        const dashIndex = trackDescription.indexOf(' - ');
        const artistName = dashIndex > 0 ? trackDescription.substring(0, dashIndex).trim() : 'Unknown Artist';
        const trackName = dashIndex > 0 ? trackDescription.substring(dashIndex + 3).trim() : trackDescription;
        
        return {
          master_metadata_track_name: trackName,
          ts: parseDateSafely(row[dateField]),
          ms_played: 180000, // Default 3 minutes
          master_metadata_album_artist_name: artistName,
          master_metadata_album_album_name: 'Unknown Album',
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
      source: 'apple_music'
    };
    
    if (isPodcast) {
      entry.episode_name = trackName;
      entry.episode_show_name = artist;
    }
    
    return entry;
  }
}

async function processDeezerXLSX(file) {
  try {
    const buffer = await file.arrayBuffer();
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
      const trackName = row['Song Title'] || '';
      const artistName = row['Artist'] || 'Unknown Artist';
      const albumName = row['Album Title'] || 'Unknown Album';
      const isrc = row['ISRC'] || null;
      
      // Parse listening time (seconds to milliseconds)
      const playDuration = row['Listening Time'] && !isNaN(row['Listening Time']) ? 
                         parseInt(row['Listening Time']) * 1000 : 210000;
      
      // Parse date
      const timestamp = row['Date'] instanceof Date ? row['Date'] : 
                      typeof row['Date'] === 'string' ? parseDateSafely(row['Date']) : new Date();
      
      // Platform info
      const platform = row['Platform Name'] || 'deezer';
      const platformModel = row['Platform Model'] || '';
      
      return {
        master_metadata_track_name: trackName,
        ts: timestamp,
        ms_played: playDuration,
        master_metadata_album_artist_name: artistName,
        master_metadata_album_album_name: albumName,
        isrc: isrc,
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
}

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
            // Improve SoundCloud date parsing
            let playTime;
            try {
              // Handle the explicit SoundCloud date format: "2024-05-02 04:21:11 UTC"
              if (typeof row.play_time === 'string' && row.play_time.includes(' UTC')) {
                // Convert to ISO format by replacing space with T and keeping UTC marker
                const isoDate = row.play_time.replace(' UTC', 'Z').replace(' ', 'T');
                playTime = new Date(isoDate);
                
                // Verify we got a valid date
                if (isNaN(playTime.getTime())) {
                  console.warn(`Failed to parse SoundCloud date: ${row.play_time}`);
                  playTime = new Date(); // Fallback
                }
              } else {
                // Use the general parser as fallback
                playTime = parseDateSafely(row.play_time);
              }
            } catch (err) {
              console.warn(`Error parsing SoundCloud date: ${row.play_time}`, err);
              playTime = new Date(); // Fallback
            }
            
            // Extract artist and track name
            let artist = "Unknown Artist";
            let trackName = row.track_title;
            
            // Handle different title formats
            if (row.track_title.includes(" - ")) {
              const parts = row.track_title.split(" - ");
              artist = parts[0].trim();
              trackName = parts.slice(1).join(" - ").trim();
            } else if (row.track_title.match(/^.*?\s+feat\.|ft\.|\(feat\.|\(ft\./i)) {
              const match = row.track_title.match(/^(.*?)\s+(feat\.|ft\.|\(feat\.|\(ft\.)/i);
              if (match) {
                artist = match[1].trim();
                trackName = row.track_title.substring(match[0].length).trim();
              }
            }
            
            // Extract username from URL
            const urlParts = row.track_url ? row.track_url.split('/') : [];
            const uploader = urlParts[3] || "unknown";
            
            // Determine estimated duration based on track type
            let estimatedDuration = 210000; // Default: 3.5 minutes
            const lcTitle = trackName.toLowerCase();
            
            if (lcTitle.includes("podcast") || lcTitle.includes("episode") || 
                lcTitle.includes("mix") || lcTitle.includes("set")) {
              estimatedDuration = 1800000; // 30 minutes for podcasts/mixes
            } else if (lcTitle.includes("intro") || lcTitle.includes("skit")) {
              estimatedDuration = 90000; // 1.5 minutes for intros/skits
            }
            
            return {
              ts: playTime,
              ms_played: estimatedDuration,
              master_metadata_track_name: trackName,
              master_metadata_album_artist_name: artist,
              master_metadata_album_album_name: uploader,
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
          .filter(row => {
            return row.track_title && 
                   row.artist_name && 
                   typeof row.track_title === 'string' && 
                   typeof row.artist_name === 'string';
          })
          .map(row => {
            // Parse timestamp safely
            const timestamp = parseDateSafely(row.entry_date);
            
            // Make sure duration is a number
            const duration = typeof row.stream_duration_ms === 'number' ? 
              row.stream_duration_ms : 
              parseFloat(row.stream_duration_ms) || 210000;
            
            return {
              ts: timestamp,
              ms_played: duration,
              master_metadata_track_name: String(row.track_title || 'Unknown Track'),
              master_metadata_album_artist_name: String(row.artist_name || 'Unknown Artist'),
              master_metadata_album_album_name: String(row.album_name || "Unknown Album"),
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

async function processCakeExcelFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { 
      type: 'array',
      cellDates: true,
      cellNF: true
    });
    
    let allPlayData = [];
    
    // Look for the "Complete Streaming History" sheet
    if (workbook.SheetNames.includes('Complete Streaming History')) {
      const historySheet = workbook.Sheets['Complete Streaming History'];
      const data = XLSX.utils.sheet_to_json(historySheet, { raw: false });
      
      console.log(`Processing ${data.length} entries from Cake Excel file`);
      
      // Convert data to standard format - more efficiently
      allPlayData = data
        .filter(row => row['Track'] && row['Artist'] && row['Date & Time'])
        .map(row => {
          try {
            // Parse date efficiently - minimize branching
            let timestamp;
            if (row['Date & Time'] instanceof Date) {
              timestamp = row['Date & Time'];
            } else {
              timestamp = new Date(row['Date & Time']);
              if (isNaN(timestamp.getTime())) {
                // Try to parse alternative date formats
                const parts = row['Date & Time'].split(/[/ -:]/);
                if (parts.length >= 3) {
                  timestamp = new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                  timestamp = new Date();
                }
              }
            }
            
            // Parse duration
            let ms_played = 0;
            if (row['Duration (ms)'] && !isNaN(row['Duration (ms)'])) {
              ms_played = parseInt(row['Duration (ms)']);
            }
            
            // Create standard entry
            return {
              master_metadata_track_name: row['Track'] || '',
              master_metadata_album_artist_name: row['Artist'] || '',
              master_metadata_album_album_name: row['Album'] || '',
              ts: timestamp,
              ms_played: ms_played,
              reason_start: row['Reason Start'] || 'trackdone',
              reason_end: row['Reason End'] || 'trackdone',
              shuffle: row['Shuffle'] === 'Yes' || row['Shuffle'] === 'TRUE' || row['Shuffle'] === true,
              platform: row['Platform'] || 'unknown',
              source: row['Service'] || 'cake',
              isrc: row['ISRC'] || '',
              episode_name: row['Episode Name'] || '',
              episode_show_name: row['Episode Show'] || '',
              spotify_track_uri: row['Track ID'] || ''
            };
          } catch (err) {
            console.error('Error processing row:', err);
            return null;
          }
        })
        .filter(entry => entry !== null);
    }
    
    // If no streaming history, check for individual song data
    if (allPlayData.length === 0 && workbook.SheetNames.includes('Top 2000 All-Time')) {
      const topSongsSheet = workbook.Sheets['Top 2000 All-Time'];
      const data = XLSX.utils.sheet_to_json(topSongsSheet, { raw: false });
      
      console.log(`Processing ${data.length} songs from Top 2000 sheet`);
      
      // Convert song data to play entries more efficiently
      const baseDate = new Date();
      baseDate.setFullYear(baseDate.getFullYear() - 1);
      const maxTimeOffset = 365 * 24 * 60 * 60 * 1000;
      
      data.forEach(song => {
        if (!song['Track'] || !song['Artist']) return;
        
        const playCount = song['Play Count'] ? parseInt(song['Play Count']) : 1;
        const totalTime = song['Total Time (ms)'] ? parseInt(song['Total Time (ms)']) : 
                        (song['Total Time'] ? parseTimeString(song['Total Time']) : 210000);
        
        // Average time per play
        const avgTime = Math.round(totalTime / playCount);
        
        // Create one entry per play (limited to reasonable number)
        const maxPlaysToCreate = Math.min(playCount, 100);
        
        for (let i = 0; i < maxPlaysToCreate; i++) {
          // Generate random timestamp within the last year
          const randomOffset = Math.floor(Math.random() * maxTimeOffset);
          const timestamp = new Date(baseDate.getTime() + randomOffset);
          
          allPlayData.push({
            master_metadata_track_name: song['Track'],
            master_metadata_album_artist_name: song['Artist'],
            master_metadata_album_album_name: song['Album'] || 'Unknown Album',
            ts: timestamp,
            ms_played: avgTime,
            reason_start: 'trackdone',
            reason_end: 'trackdone',
            shuffle: Math.random() > 0.5,
            platform: 'unknown',
            source: 'cake'
          });
        }
      });
    }
    
    return allPlayData;
  } catch (error) {
    console.error('Error processing Cake Excel file:', error);
    return [];
  }
}

// Helper function to parse time strings like "2h 30m" to milliseconds
function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 210000;
  
  try {
    let ms = 0;
    
    // Match hours
    const hoursMatch = timeStr.match(/(\d+)h/);
    if (hoursMatch) {
      ms += parseInt(hoursMatch[1]) * 60 * 60 * 1000;
    }
    
    // Match minutes
    const minutesMatch = timeStr.match(/(\d+)m/);
    if (minutesMatch) {
      ms += parseInt(minutesMatch[1]) * 60 * 1000;
    }
    
    // Match seconds
    const secondsMatch = timeStr.match(/(\d+)s/);
    if (secondsMatch) {
      ms += parseInt(secondsMatch[1]) * 1000;
    }
    
    return ms || 210000; // Default to 3.5 minutes if parsing fails
  } catch (e) {
    return 210000;
  }
}

function isTidalCSV(content) {
  try {
    if (!content || typeof content !== 'string') return false;
    
    const firstLine = content.split('\n')[0]?.toLowerCase() || '';
    return ['artist_name', 'track_title', 'entry_date', 'stream_duration_ms']
      .every(header => firstLine.includes(header));
  } catch (error) {
    return false;
  }
}

// Core stats calculation - optimized version
// Cache for calculateArtistStreaks
const streakCache = new Map();

function calculateArtistStreaks(timestamps) {
  // Use cache key based on timestamps
  const cacheKey = timestamps.sort().join(',');
  if (streakCache.has(cacheKey)) {
    return streakCache.get(cacheKey);
  }
  
  // Convert timestamps to unique days
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

  // Check if current streak is active
  const lastPlay = days.length > 0 ? new Date(days[days.length - 1]) : null;
  const now = new Date();
  const daysSinceLastPlay = lastPlay ? Math.floor((now - lastPlay) / (1000 * 60 * 60 * 24)) : 999;
  const activeStreak = daysSinceLastPlay <= 1 ? currentStreak : 0;

  const result = {
    longestStreak,
    currentStreak: activeStreak,
    streakStart,
    streakEnd
  };
  
  // Store in cache
  streakCache.set(cacheKey, result);
  
  return result;
}

function calculateBriefObsessions(songs, songPlayHistory) {
  const briefObsessionsArray = [];
 
  for (const song of songs) {
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
          
          // Count plays in this week
          let playsInWeek = 0;
          for (let j = 0; j < timestamps.length; j++) {
            if (timestamps[j] >= weekStart && timestamps[j] <= weekEnd) {
              playsInWeek++;
            }
          }
          
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
  }

  return _.orderBy(
    briefObsessionsArray,
    ['intensePeriod.playsInWeek', 'intensePeriod.weekStart'],
    ['desc', 'asc']
  ).slice(0, 100);
}

function calculateSongsByYear(songs, songPlayHistory) {
  const songsByYear = {};
  
  for (const song of songs) {
    const timestamps = songPlayHistory[song.key] || [];
    if (timestamps.length > 0) {
      // Group by year more efficiently
      const yearCounts = new Map();
      
      for (const ts of timestamps) {
        try {
          const date = new Date(ts);
          if (isNaN(date.getTime()) || date > new Date()) continue;
          
          const year = date.getFullYear();
          yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
        } catch (e) {
          // Skip invalid dates
        }
      }
      
      // Add songs to each year
      yearCounts.forEach((count, year) => {
        if (!songsByYear[year]) {
          songsByYear[year] = [];
        }
        
        songsByYear[year].push({
          ...song,
          totalPlayed: song.totalPlayed * (count / timestamps.length),
          playCount: count,
          spotifyScore: Math.pow(count, 1.5)
        });
      });
    }
  }

  // Sort and limit each year's entries
  Object.keys(songsByYear).forEach(year => {
    songsByYear[year] = _.orderBy(songsByYear[year], ['spotifyScore'], ['desc'])
      .slice(0, 100);
  });

  return songsByYear;
}

function calculateAlbumsByYear(albums, rawPlayData) {
  // Create album ID mapping from all-time data
  const albumMapping = {};
  
  // Store album reference data
  albums.forEach(album => {
    if (!album) return;
    
    const albumKey = `${album.artist}:::${album.name}`.toLowerCase();
    
    // Get track names
    let trackNames = [];
    if (album.trackNames && album.trackNames instanceof Set) {
      trackNames = Array.from(album.trackNames);
    } else if (album.trackObjects && Array.isArray(album.trackObjects)) {
      trackNames = album.trackObjects.map(t => t.trackName || t.displayName).filter(Boolean);
    }
    
    // Store reference data
    albumMapping[albumKey] = {
      name: album.name,
      artist: album.artist,
      allTimeReference: album,
      trackNames: trackNames,
      trackCount: album.trackCount instanceof Set ? 
                album.trackCount.size : 
                (typeof album.trackCount === 'number' ? album.trackCount : 
                 album.trackCountValue || 0)
    };
    
    // Add alternative keys for similar album names
    if (album.name !== 'Unknown Album') {
      const simplifiedName = album.name.split(/\s+&|\s+and/i)[0].trim();
      if (simplifiedName !== album.name && simplifiedName.length > 5) {
        const altKey = `${album.artist}:::${simplifiedName}`.toLowerCase();
        albumMapping[altKey] = albumMapping[albumKey];
      }
    }
  });
  
  // Create a function for normalizing track names
  const normalizeTrackCache = new Map();
  function normalizeTrackName(trackName) {
    if (!trackName) return '';
    
    // Check cache
    if (normalizeTrackCache.has(trackName)) {
      return normalizeTrackCache.get(trackName);
    }
    
    const normalizedTrack = trackName.toLowerCase()
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\(ft\..*?\)/gi, '')
      .replace(/\(.*?version\)/gi, '')
      .replace(/\(.*?remix\)/gi, '')
      .replace(/\(.*?\)/gi, '')
      .replace(/\[.*?\]/gi, '')
      .replace(/[|\-\.l]/g, ' ')
      .replace(/[.,\/#!$%\^&\*;:{}=\_`~()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Store in cache
    normalizeTrackCache.set(trackName, normalizedTrack);
    
    return normalizedTrack;
  }
  
  // Group plays by year and album more efficiently
  const playsByYearAndAlbum = {};
  const normalizedToOriginalTrack = {};
  const trackToAlbumMap = new Map();
  
  // First pass: build normalized track mappings
  for (const entry of rawPlayData) {
    if (entry.ms_played < 30000 || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) {
      continue;
    }
    
    const trackName = entry.master_metadata_track_name;
    const normalizedTrack = normalizeTrackName(trackName);
    
    if (normalizedTrack) {
      if (!normalizedToOriginalTrack[normalizedTrack]) {
        normalizedToOriginalTrack[normalizedTrack] = [trackName];
      } else if (!normalizedToOriginalTrack[normalizedTrack].includes(trackName)) {
        normalizedToOriginalTrack[normalizedTrack].push(trackName);
      }
    }
  }
  
  // Second pass: build track-to-album mappings
  for (const entry of rawPlayData) {
    if (entry.ms_played < 30000 || !entry.master_metadata_track_name || !entry.master_metadata_album_artist_name) {
      continue;
    }
    
    const artist = entry.master_metadata_album_artist_name;
    const trackName = entry.master_metadata_track_name;
    const normalizedTrack = normalizeTrackName(trackName);
    const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
    
    // Skip unknown albums
    if (albumName === 'Unknown Album') continue;
    
    const trackKey = `${artist}:::${normalizedTrack}`.toLowerCase();
    
    if (!trackToAlbumMap.has(trackKey)) {
      trackToAlbumMap.set(trackKey, []);
    }
    
    // Add album to the list if not already present
    const albumList = trackToAlbumMap.get(trackKey);
    const existingIndex = albumList.findIndex(a => a.name.toLowerCase() === albumName.toLowerCase());
    
    if (existingIndex >= 0) {
      albumList[existingIndex].count++;
    } else {
      albumList.push({ 
        name: albumName, 
        count: 1,
        source: entry.source || 'unknown'
      });
    }
  }
  
  // Determine main album for each track
  const trackMainAlbum = new Map();
  
  trackToAlbumMap.forEach((albums, trackKey) => {
    if (albums.length === 0) return;
    if (albums.length === 1) {
      trackMainAlbum.set(trackKey, albums[0].name);
      return;
    }
    
    // Sort by count and source
    albums.sort((a, b) => {
      const countDiff = b.count - a.count;
      if (Math.abs(countDiff) > 5) return countDiff;
      
      if (a.source === 'spotify' && b.source !== 'spotify') return -1;
      if (b.source === 'spotify' && a.source !== 'spotify') return 1;
      
      return countDiff;
    });
    
    trackMainAlbum.set(trackKey, albums[0].name);
  });
  
  // Third pass: build year-specific album data
  const yearCache = new Map();
  
  for (const entry of rawPlayData) {
    if (entry.ms_played < 30000 || !entry.master_metadata_album_artist_name) continue;
    
    try {
      // Skip invalid dates
      const timestamp = entry._dateObj || new Date(entry.ts);
      if (isNaN(timestamp.getTime())) continue;
      
      const year = timestamp.getFullYear();
      const artist = entry.master_metadata_album_artist_name;
      let albumName = entry.master_metadata_album_album_name || 'Unknown Album';
      const trackName = entry.master_metadata_track_name;
      
      if (!trackName) continue;
      
      // Check for better album match
      const normalizedTrack = normalizeTrackName(trackName);
      const trackKey = `${artist}:::${normalizedTrack}`.toLowerCase();
      const mainAlbum = trackMainAlbum.get(trackKey);
      
      // If unknown album but we have a main album, use it
      if (albumName === 'Unknown Album' && mainAlbum) {
        albumName = mainAlbum;
      }
      
      // Look up album in our mapping
      const albumKey = `${artist}:::${albumName}`.toLowerCase();
      let resolvedAlbumKey = albumKey;
      let resolvedAlbumData = albumMapping[albumKey];
      
      // If not found, try to find matching album
      if (!resolvedAlbumData && trackName) {
        // Try main album
        if (mainAlbum) {
          const mainAlbumKey = `${artist}:::${mainAlbum}`.toLowerCase();
          if (albumMapping[mainAlbumKey]) {
            resolvedAlbumKey = mainAlbumKey;
            resolvedAlbumData = albumMapping[mainAlbumKey];
          }
        }
        
        // If still not found, try to match by track
        if (!resolvedAlbumData) {
          for (const [key, data] of Object.entries(albumMapping)) {
            if (key.startsWith(`${artist.toLowerCase()}:::`) && 
                data.trackNames && data.trackNames.some(t => {
                  if (!t) return false;
                  return normalizeTrackName(t) === normalizedTrack;
                })) {
              resolvedAlbumKey = key;
              resolvedAlbumData = data;
              break;
            }
          }
        }
      }
      
      // Get cached year data
      let yearData = yearCache.get(year);
      if (!yearData) {
        yearData = {};
        yearCache.set(year, yearData);
      }
      
      // Init album if needed
      if (!yearData[resolvedAlbumKey]) {
        yearData[resolvedAlbumKey] = {
          name: resolvedAlbumData ? resolvedAlbumData.name : albumName,
          artist: artist,
          totalPlayed: 0,
          playCount: 0,
          normalizedTracks: new Set(),
          tracks: new Set(),
          trackObjects: {},
          firstListen: timestamp.getTime(),
          allTimeReference: resolvedAlbumData?.allTimeReference || null
        };
      }
      
      // Update stats
      yearData[resolvedAlbumKey].totalPlayed += entry.ms_played;
      yearData[resolvedAlbumKey].playCount++;
      
      if (trackName) {
        yearData[resolvedAlbumKey].normalizedTracks.add(normalizedTrack);
        yearData[resolvedAlbumKey].tracks.add(trackName);
        
        // Update track objects
        if (!yearData[resolvedAlbumKey].trackObjects[normalizedTrack]) {
          yearData[resolvedAlbumKey].trackObjects[normalizedTrack] = {
            trackName: trackName,
            normalizedTrack: normalizedTrack,
            artist: artist,
            totalPlayed: entry.ms_played,
            playCount: 1,
            albumName: albumName,
            variations: normalizedToOriginalTrack[normalizedTrack] || [trackName]
          };
        } else {
          yearData[resolvedAlbumKey].trackObjects[normalizedTrack].totalPlayed += entry.ms_played;
          yearData[resolvedAlbumKey].trackObjects[normalizedTrack].playCount++;
          
          // Add variation if new
          if (!yearData[resolvedAlbumKey].trackObjects[normalizedTrack].variations.includes(trackName)) {
            yearData[resolvedAlbumKey].trackObjects[normalizedTrack].variations.push(trackName);
          }
        }
      }
      
      // Update first listen if earlier
      if (timestamp.getTime() < yearData[resolvedAlbumKey].firstListen) {
        yearData[resolvedAlbumKey].firstListen = timestamp.getTime();
      }
    } catch (err) {
      // Skip errors
    }
  }
  
  // Convert to final format
  const result = {};
  
  yearCache.forEach((albumData, year) => {
    result[year] = Object.values(albumData).map(album => {
      // Convert track objects from object to array
      const trackObjectsArray = Object.values(album.trackObjects || {})
        .sort((a, b) => b.totalPlayed - a.totalPlayed);
      
      // Create year-specific album
      let yearAlbum = {
        name: album.name,
        artist: album.artist,
        totalPlayed: album.totalPlayed,
        playCount: album.playCount,
        firstListen: album.firstListen,
        trackCountValue: album.normalizedTracks ? album.normalizedTracks.size : 0,
        trackObjects: trackObjectsArray
      };
      
      // Add metadata from all-time reference
      if (album.allTimeReference) {
        const allTimeRef = album.allTimeReference;
        
        yearAlbum.trackCount = allTimeRef.trackCount;
        
        // Use highest track count
        if (allTimeRef && allTimeRef.trackCountValue > yearAlbum.trackCountValue) {
          yearAlbum.trackCountValue = allTimeRef.trackCountValue;
        }
        
        yearAlbum.isComplete = allTimeRef.isComplete;
      }
      
      return yearAlbum;
    }).sort((a, b) => b.totalPlayed - a.totalPlayed);
  });
  
  return result;
}

function calculateArtistsByYear(songs, songPlayHistory, rawPlayData) {
  const artistsByYear = {};
  
  // Pre-process and index raw data for more efficient lookups
  const dateIndex = new Map(); // Map artist -> year -> timestamps
  
  for (const entry of rawPlayData) {
    if (!entry.master_metadata_album_artist_name || entry.ms_played < 30000) continue;
    
    const artist = entry.master_metadata_album_artist_name;
    let timestamp;
    try {
      timestamp = entry._dateObj || new Date(entry.ts);
      if (isNaN(timestamp.getTime()) || timestamp > new Date()) continue;
    } catch (e) {
      continue;
    }
    
    const year = timestamp.getFullYear();
    
    // Initialize nested structure if needed
    if (!dateIndex.has(artist)) {
      dateIndex.set(artist, new Map());
    }
    
    if (!dateIndex.get(artist).has(year)) {
      dateIndex.get(artist).set(year, {
        timestamps: [],
        tracks: new Set(),
        totalPlayed: 0,
        playCount: 0
      });
    }
    
    // Add data
    const artistData = dateIndex.get(artist).get(year);
    artistData.timestamps.push(timestamp.getTime());
    
    if (entry.master_metadata_track_name) {
      artistData.tracks.add(entry.master_metadata_track_name);
    }
    
    artistData.totalPlayed += entry.ms_played;
    artistData.playCount++;
  }
  
  // Process data into the final format
  dateIndex.forEach((yearData, artist) => {
    yearData.forEach((data, year) => {
      // Initialize year if needed
      if (!artistsByYear[year]) {
        artistsByYear[year] = [];
      }
      
      // Sort timestamps chronologically
      const sortedTimestamps = data.timestamps.sort((a, b) => a - b);
      const firstListen = sortedTimestamps[0];
      
      // Find most played song
      const trackCounts = new Map();
      
      // Get all songs for this artist and count plays in this specific year
      songs.filter(song => song.artist === artist).forEach(song => {
        // Get play timestamps for this song
        const allTimestamps = songPlayHistory[song.key] || [];
        
        // Count plays in this specific year
        let playsInYear = 0;
        for (const ts of allTimestamps) {
          const tsDate = new Date(ts);
          if (tsDate.getFullYear() === year) {
            playsInYear++;
          }
        }
        
        if (playsInYear > 0) {
          trackCounts.set(song.trackName, playsInYear);
        }
      });
      
      // Sort by play count
      const sortedTracks = Array.from(trackCounts.entries())
        .sort((a, b) => b[1] - a[1]);
      
      const mostPlayedSong = sortedTracks.length > 0 ? 
        { trackName: sortedTracks[0][0], playCount: sortedTracks[0][1] } : 
        { trackName: 'Unknown', playCount: 0 };
      
      // Calculate streaks by using dates from the timestamps
      const playDates = [...new Set(
        sortedTimestamps.map(timestamp => new Date(timestamp).toISOString().split('T')[0])
      )].sort();
      
      // Calculate streaks
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
      
      // Calculate sort score
      const artistScore = Math.pow(data.playCount, 1.5);
      
      // Add to final result
      artistsByYear[year].push({
        name: artist,
        totalPlayed: data.totalPlayed,
        playCount: data.playCount,
        tracks: data.tracks.size,
        firstListen,
        mostPlayedSong,
        longestStreak,
        currentStreak: activeStreak,
        streakStart,
        streakEnd,
        artistScore
      });
    });
  });
  
  // Sort each year's artists by score
  Object.keys(artistsByYear).forEach(year => {
    artistsByYear[year].sort((a, b) => b.artistScore - a.artistScore);
  });
  
  return artistsByYear;
}

function calculatePlayStats(entries) {
  if (!entries || entries.length === 0) {
    return { songs: [], artists: {}, albums: {}, playHistory: {}, totalListeningTime: 0, 
             serviceListeningTime: {}, processedSongs: 0, shortPlays: 0 };
  }
  
  console.time('calculatePlayStats');
  
  // Initialize result objects
  const artists = {};
  const albums = {};
  const playHistory = {};
  const serviceTime = {};
  let totalListeningTime = 0;
  let processedSongs = 0;
  let shortPlays = 0;

  // Use Maps for better performance
  const trackMap = new Map();
  const albumLookup = new Map();
  const featureArtistLookup = new Map();
  const isrcMap = new Map();
  const trackToAlbumMap = new Map();
  const albumToTracksMap = new Map();
  
  // Pre-process all entries once - parse dates, etc.
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry._dateObj && entry.ts) {
      try {
        entry._dateObj = entry.ts instanceof Date ? entry.ts : new Date(entry.ts);
      } catch (e) {
        // Skip invalid dates
      }
    }
  }

  // First pass - collect metadata and reference information
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    if (entry.master_metadata_track_name && entry.master_metadata_album_artist_name) {
      const albumName = entry.master_metadata_album_album_name || 'Unknown Album';
      
      if (albumName !== 'Unknown Album') {
        const trackName = entry.master_metadata_track_name.toLowerCase().trim();
        const artistName = entry.master_metadata_album_artist_name.toLowerCase().trim();
        const trackKey = `${trackName}|||${artistName}`;
        
        // Store album information
        trackToAlbumMap.set(trackKey, {
          albumName: albumName,
          normalizedAlbumName: normalizeAlbumName(albumName),
          source: entry.source || 'unknown'
        });
        
        // Track which tracks belong to each album
        const albumKey = `${normalizeAlbumName(albumName)}|||${artistName}`;
        if (!albumToTracksMap.has(albumKey)) {
          albumToTracksMap.set(albumKey, new Set());
        }
        albumToTracksMap.get(albumKey).add(trackName);
      }
      
      // Process track info once for lookups
      const trackInfo = normalizeString(entry.master_metadata_track_name);
      const artistInfo = normalizeString(entry.master_metadata_album_artist_name || 'Unknown Artist');
      const lookupKey = `${trackInfo.normalized}|||${artistInfo.normalized}`;
      
      // Store feature artists
      if (trackInfo.featureArtists && trackInfo.featureArtists.length > 0) {
        featureArtistLookup.set(lookupKey, trackInfo.featureArtists);
      }
      
      // Store ISRC codes
      if (entry.master_metadata_external_ids?.isrc) {
        isrcMap.set(entry.master_metadata_external_ids.isrc, lookupKey);
      } else if (entry.isrc) {
        isrcMap.set(entry.isrc, lookupKey);
      }
      
      // Store album info, preferring Spotify source
      if (entry.master_metadata_album_album_name) {
        if (entry.source === 'spotify' || !albumLookup.has(lookupKey)) {
          albumLookup.set(lookupKey, entry.master_metadata_album_album_name);
        }
      }
    }
  }

  // Main processing pass - process everything in a single loop
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const playTime = entry.ms_played;
    
    // Skip invalid entries
    if (!entry.master_metadata_track_name || playTime < 30000) {
      if (playTime < 30000) shortPlays++;
      continue;
    }

    processedSongs++;
    totalListeningTime += playTime;

    // Track service listening time
    const service = entry.source || 'unknown';
    serviceTime[service] = (serviceTime[service] || 0) + playTime;

    const trackName = entry.master_metadata_track_name;
    const artistName = entry.master_metadata_album_artist_name || 'Unknown Artist';
    
    // Get normalized versions
    const trackInfo = normalizeString(trackName);
    const artistInfo = normalizeString(artistName);
    const normTrack = trackInfo.normalized;
    const normArtist = artistInfo.normalized;
    
    // Extract feature artists
    let featureArtists = [];
    if (trackInfo.featureArtists) featureArtists = [...featureArtists, ...trackInfo.featureArtists];
    if (artistInfo.featureArtists) featureArtists = [...featureArtists, ...artistInfo.featureArtists];
    
    // Check for & in artist name
    if (artistName.includes('&')) {
      const artistParts = artistName.split(/\s*&\s*/);
      if (artistParts.length > 1) {
        artistParts.slice(1).forEach(part => {
          if (!featureArtists.includes(part.trim())) {
            featureArtists.push(part.trim());
          }
        });
      }
    }
    
    // Get primary artist efficiently
    let primaryArtist = artistName;
    if (artistName.includes('&')) {
      primaryArtist = artistName.split('&')[0].trim();
    } else if (artistName.includes(',')) {
      primaryArtist = artistName.split(',')[0].trim();
    } else if (artistName.toLowerCase().includes(' feat')) {
      primaryArtist = artistName.split(/\s+feat/i)[0].trim();
    } else if (artistName.toLowerCase().includes(' ft')) {
      primaryArtist = artistName.split(/\s+ft/i)[0].trim();
    }
    
    // Match keys for deduplication
    const lookupKey = `${normTrack}|||${normArtist}`;
    let matchKeyFromIsrc = null;
    if (entry.master_metadata_external_ids?.isrc && isrcMap.has(entry.master_metadata_external_ids.isrc)) {
      matchKeyFromIsrc = isrcMap.get(entry.master_metadata_external_ids.isrc);
    } else if (entry.isrc && isrcMap.has(entry.isrc)) {
      matchKeyFromIsrc = isrcMap.get(entry.isrc);
    }
    const finalLookupKey = matchKeyFromIsrc || lookupKey;
    
    // Determine album name
    let albumName = 'Unknown Album';
    if (entry.source === 'spotify' && entry.master_metadata_album_album_name) {
      albumName = entry.master_metadata_album_album_name;
    } else {
      const trackKey = `${normTrack}|||${normArtist}`;
      if (trackToAlbumMap.has(trackKey)) {
        albumName = trackToAlbumMap.get(trackKey).albumName;
      } else if (albumLookup.has(finalLookupKey)) {
        albumName = albumLookup.get(finalLookupKey);
      }
    }
    
    // Check for additional feature artists
    if (featureArtistLookup.has(finalLookupKey)) {
      const lookupFeatures = featureArtistLookup.get(finalLookupKey);
      for (const artist of lookupFeatures) {
        if (!featureArtists.includes(artist)) {
          featureArtists.push(artist);
        }
      }
    }
    
    // Create a match key for deduplication
    const enhancedMatchKey = createMatchKey(trackName, primaryArtist);
    
    // Get timestamp
    const timestamp = entry._dateObj || new Date();

    // Track play history
    const standardKey = `${trackName}-${artistName}`;
    if (!playHistory[standardKey]) {
      playHistory[standardKey] = [];
    }
    playHistory[standardKey].push(timestamp.getTime());

    // Artist stats
    if (!artists[artistName]) {
      artists[artistName] = {
        name: artistName,
        totalPlayed: 0,
        playCount: 0,
        firstListen: timestamp.getTime(),
        firstSong: trackName,
        firstSongPlayCount: 1
      };
    } else {
      artists[artistName].totalPlayed += playTime;
      artists[artistName].playCount++;
      
      if (timestamp.getTime() < artists[artistName].firstListen) {
        artists[artistName].firstListen = timestamp.getTime();
        artists[artistName].firstSong = trackName;
        artists[artistName].firstSongPlayCount = 1;
      } else if (trackName === artists[artistName].firstSong) {
        artists[artistName].firstSongPlayCount = (artists[artistName].firstSongPlayCount || 0) + 1;
      }
    }

    // Album stats
    if (albumName && artistName) {
      const normalizedAlbumName = normalizeAlbumName(albumName);
      const normalizedArtistName = artistName.toLowerCase().trim();
      const albumKey = `${normalizedAlbumName}-${normalizedArtistName}`;
      
      const fullAlbumKey = `${normalizedAlbumName}|||${normalizedArtistName}`;
      const expectedTrackCount = albumToTracksMap.has(fullAlbumKey) ? 
                               albumToTracksMap.get(fullAlbumKey).size : 0;
      
      if (!albums[albumKey]) {
        albums[albumKey] = {
          name: albumName,
          artist: artistName,
          totalPlayed: 0,
          playCount: 0,
          trackCount: new Set(),
          trackNames: new Set(),
          trackObjects: [],
          expectedTrackCount: expectedTrackCount,
          firstListen: timestamp.getTime(),
          isComplete: false,
          years: new Set()
        };
      }

      // Add year to set
      if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
        albums[albumKey].years.add(timestamp.getFullYear());
      }
          
      albums[albumKey].totalPlayed += playTime;
      albums[albumKey].playCount++;
      albums[albumKey].trackCount.add(normTrack);
      albums[albumKey].trackNames.add(trackName);
      
      // Update track objects
      const existingTrackIndex = albums[albumKey].trackObjects.findIndex(
        t => t.trackName === trackName
      );
      
      if (existingTrackIndex === -1) {
        albums[albumKey].trackObjects.push({
          trackName,
          artist: artistName,
          totalPlayed: playTime,
          playCount: 1,
          albumName
        });
      } else {
        albums[albumKey].trackObjects[existingTrackIndex].totalPlayed += playTime;
        albums[albumKey].trackObjects[existingTrackIndex].playCount++;
      }
      
      // Update expected track count if needed
      if (albums[albumKey].trackCount.size > albums[albumKey].expectedTrackCount) {
        albums[albumKey].expectedTrackCount = albums[albumKey].trackCount.size;
      }
      
      // Check if album is complete
      if (expectedTrackCount > 0 && albums[albumKey].trackCount.size >= expectedTrackCount) {
        albums[albumKey].isComplete = true;
      }
      
      // Update first listen time if earlier
      albums[albumKey].firstListen = Math.min(
        albums[albumKey].firstListen, 
        timestamp.getTime()
      );
    }

    // Track handling
    if (trackMap.has(enhancedMatchKey)) {
      // Update existing track
      const track = trackMap.get(enhancedMatchKey);
      track.totalPlayed += playTime;
      track.playCount++;
      
      // Update album if better info available
      if (albumName !== 'Unknown Album' && 
          (track.albumName === 'Unknown Album' || entry.source === 'spotify')) {
        track.albumName = albumName;
      }
      
      // Add variation if new
      if (!track.variations.some(v => 
          v.trackName === trackName && v.artistName === artistName)) {
        track.variations.push({ 
          trackName, 
          artistName, 
          source: entry.source || 'unknown',
          isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
        });
      }
      
      // Update feature artists
      for (const artist of featureArtists) {
        if (!track.featureArtists.some(a => a.toLowerCase() === artist.toLowerCase())) {
          track.featureArtists.push(artist);
        }
      }
      
      // Store ISRC if available
      if ((entry.master_metadata_external_ids?.isrc || entry.isrc) && !track.isrc) {
        track.isrc = entry.master_metadata_external_ids?.isrc || entry.isrc;
      }
    } else {
      // Create new track
      trackMap.set(enhancedMatchKey, {
        key: standardKey,
        trackName,
        artist: primaryArtist,
        fullArtist: artistName,
        albumName,
        totalPlayed: playTime,
        playCount: 1,
        variations: [{ 
          trackName, 
          artistName, 
          source: entry.source || 'unknown',
          isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
        }],
        featureArtists: featureArtists.length > 0 ? featureArtists : [],
        isrc: entry.master_metadata_external_ids?.isrc || entry.isrc
      });
    }
  }
  
  // Process tracks for display - convert map to array
  const songs = [];
  trackMap.forEach((track) => {
    // Choose best version for display
    if (track.variations && track.variations.length > 1) {
      // Sort variations by preference
      const sortedVariations = [...track.variations].sort((a, b) => {
        // Spotify source is preferred
        if (a.source === 'spotify' && b.source !== 'spotify') return -1;
        if (b.source === 'spotify' && a.source !== 'spotify') return 1;
        
        // Prefer entries with feat/ft in track name
        const aHasFeat = /feat\.|ft\.|with/i.test(a.trackName);
        const bHasFeat = /feat\.|ft\.|with/i.test(b.trackName);
        if (aHasFeat && !bHasFeat) return -1;
        if (bHasFeat && !aHasFeat) return 1;
        
        // Prefer entries with & in artist name
        const aHasAmp = a.artistName.includes('&');
        const bHasAmp = b.artistName.includes('&');
        if (aHasAmp && !bHasAmp) return -1;
        if (bHasAmp && !aHasAmp) return 1;
        
        return 0;
      });
      
      // Use best variation
      const bestVariation = sortedVariations[0];
      track.displayName = bestVariation.trackName;
      track.displayArtist = bestVariation.artistName;
    } else {
      track.displayName = track.trackName;
      track.displayArtist = track.fullArtist || track.artist;
    }
    
    songs.push(track);
  });

  // Process album stats
  Object.values(albums).forEach(album => {
    album.trackObjects.sort((a, b) => b.totalPlayed - a.totalPlayed);
    album.trackCountValue = album.trackCount.size;
    album.yearsArray = Array.from(album.years).sort();
  });

  console.timeEnd('calculatePlayStats');
  
  return {
    songs,
    artists,
    albums,
    playHistory,
    totalListeningTime,
    serviceListeningTime: serviceTime,
    processedSongs,
    shortPlays
  };
}
export const streamingProcessor = {
  async processFiles(files) {
    console.time('processFiles');
    try {
      let allProcessedData = [];
      
      // Process files in smaller batches to prevent memory issues
      const batchSize = 5;
      const fileBatches = [];
      
      // Split files into batches
      for (let i = 0; i < files.length; i += batchSize) {
        fileBatches.push(Array.from(files).slice(i, i + batchSize));
      }
      
      // Process each batch
      for (const batch of fileBatches) {
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            try {
              // Spotify JSON files
              if (file.name.includes('Streaming_History') && file.name.endsWith('.json')) {
                const content = await file.text();
                const data = JSON.parse(content);
                return data.map(entry => ({
                  ...entry,
                  source: 'spotify'
                }));
              }
              
              // Apple Music CSV files
              else if (file.name.toLowerCase().includes('apple') && file.name.endsWith('.csv')) {
                const content = await file.text();
                return await processAppleMusicCSV(content);
              }
              else if (file.name.endsWith('.xlsx')) {
                // Try to process as cake file first
                const cakeData = await processCakeExcelFile(file);
                if (cakeData && cakeData.length > 0) {
                  console.log(`Processed ${cakeData.length} entries from Cake Excel file`);
                  return cakeData;
                }
                
                // Fallback to Deezer processing if no cake data found
                return await processDeezerXLSX(file);
              }
              
              // Deezer XLSX files
              else if (file.name.endsWith('.xlsx')) {
                return await processDeezerXLSX(file);
              }
              
              // Tidal CSV files
              else if (file.name.toLowerCase().includes('tidal') && file.name.endsWith('.csv')) {
                const content = await file.text();
                return await processTidalCSV(content);
              }
              
              // Generic CSV files - detect format
              else if (file.name.endsWith('.csv')) {
                const content = await file.text();
                
                // Check for SoundCloud format
                if (content.includes('play_time') && content.includes('track_title')) {
                  console.log(`Processing ${file.name} as a Soundcloud CSV file`);
                  return await processSoundcloudCSV(content);
                }
                
                // Check for Tidal format
                if (isTidalCSV(content)) {
                  console.log(`Processing ${file.name} as a Tidal CSV file`);
                  return await processTidalCSV(content);
                }
                
                console.log(`File ${file.name} doesn't match any known format`);
              }
              
              return [];
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
              return [];
            }
          })
        );
        
        // Combine batch results
        batchResults.forEach(dataArray => {
          if (dataArray && dataArray.length > 0) {
            allProcessedData = [...allProcessedData, ...dataArray];
          }
        });
      }

      // Process ISRC codes from Deezer data
      allProcessedData.forEach(item => {
        if (item.source === 'deezer' && item.isrc) {
          item.master_metadata_external_ids = { isrc: item.isrc };
        }
      });

      console.log(`Calculating stats for ${allProcessedData.length} entries`);
      const stats = calculatePlayStats(allProcessedData);

      // Process artist data
      const sortedArtists = Object.values(stats.artists)
        .map(artist => {
          const artistSongs = stats.songs.filter(song => song.artist === artist.name);
          const mostPlayed = _.maxBy(artistSongs, 'playCount') || { trackName: 'Unknown', playCount: 0 };
          
          // Get all play timestamps for this artist
          const artistPlays = [];
          artistSongs.forEach(song => {
            if (stats.playHistory[song.key]) {
              artistPlays.push(...stats.playHistory[song.key]);
            }
          });

          const streaks = calculateArtistStreaks(artistPlays);

          return {
            ...artist,
            mostPlayedSong: mostPlayed,
            ...streaks
          };
        })
        .sort((a, b) => b.totalPlayed - a.totalPlayed);

      // Process album data
      const sortedAlbums = _.orderBy(
        Object.values(stats.albums).map(album => ({
          ...album,
          trackCount: album.trackCount.size
        })),
        ['totalPlayed'],
        ['desc']
      );

      // Top songs
      const sortedSongs = _.orderBy(stats.songs, ['totalPlayed'], ['desc']).slice(0, 250);

      console.timeEnd('processFiles');
      return {
        stats: {
          totalFiles: files.length,
          totalEntries: allProcessedData.length,
          processedSongs: stats.processedSongs,
          nullTrackNames: allProcessedData.filter(e => !e.master_metadata_track_name).length,
          uniqueSongs: stats.songs.length,
          shortPlays: stats.shortPlays,
          totalListeningTime: stats.totalListeningTime,
          serviceListeningTime: stats.serviceListeningTime
        },
        topArtists: sortedArtists,
        topAlbums: sortedAlbums,
        processedTracks: sortedSongs,
        songsByYear: calculateSongsByYear(stats.songs, stats.playHistory),
        briefObsessions: calculateBriefObsessions(stats.songs, stats.playHistory),
        artistsByYear: calculateArtistsByYear(stats.songs, stats.playHistory, allProcessedData),
        albumsByYear: calculateAlbumsByYear(sortedAlbums, allProcessedData),
        rawPlayData: allProcessedData
      };
    } catch (error) {
      console.error('Error processing files:', error);
      throw error;
    }
  }
};

export { normalizeString, createMatchKey, filterDataByDate };