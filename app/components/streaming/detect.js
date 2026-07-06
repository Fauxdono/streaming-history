import * as XLSX from 'xlsx';
import { calculateArtistStreaks } from './streaks.js';

export function detectFileType(filename, content) {
  // For JSON files, check the content structure
  if (filename.endsWith('.json')) {
    try {
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      
      // Spotify format detection
      if (Array.isArray(data) && data.length > 0) {
        const sample = data[0];
        if (sample.ts && sample.master_metadata_track_name && sample.ms_played !== undefined) {
          return 'spotify';
        }
      }
      
      // Cake-dreamin export format
      if (data.streamingHistory && Array.isArray(data.streamingHistory)) {
        return 'cake-export';
      }
      
      // Last.fm format detection (array with artist, name, date fields)
      if (Array.isArray(data) && data.length > 0) {
        const sample = data[0];
        if (sample.name && sample.artist && sample.date && sample.source === 'lastfm') {
          return 'lastfm';
        }
        // lastfm.ghan.nl export: array of API pages [{ "@attr", track: [...] }]
        if (sample['@attr'] && Array.isArray(sample.track)) {
          return 'lastfm';
        }
        // Flat array of raw Last.fm API tracks: artist is a {"#text"} object
        if (sample.name && typeof sample.artist === 'object' && sample.artist?.['#text'] !== undefined) {
          return 'lastfm';
        }
      }

      // Raw Last.fm API response wrapper
      if (data?.recenttracks?.track) {
        return 'lastfm';
      }

      // YouTube Music JSON (has different structure)
      if (Array.isArray(data) && data.length > 0) {
        const sample = data[0];
        if (sample.title && sample.time && (sample.subtitles || sample.products)) {
          return 'youtube_music';
        }
      }
    } catch (e) {
      // Not valid JSON or parsing failed
    }
  }
  
  // For CSV files, check headers
  if (filename.endsWith('.csv')) {
    const firstLine = content.split('\n')[0]?.toLowerCase() || '';

    // Last.fm CSV export (lastfm.ghan.nl): uts,utc_time,artist,...,track,track_mbid
    if (firstLine.includes('uts') && firstLine.includes('utc_time') && firstLine.includes('track_mbid')) {
      return 'lastfm';
    }

    // SoundCloud detection
    if (firstLine.includes('play_time') && firstLine.includes('track_title') && firstLine.includes('track_url')) {
      return 'soundcloud';
    }
    
    // Tidal detection
    if (['artist_name', 'track_title', 'entry_date', 'stream_duration_ms']
        .every(header => firstLine.includes(header))) {
      return 'tidal';
    }
    
    // Apple Music detection (various formats)
    if (firstLine.includes('track description') || 
        firstLine.includes('track name') || 
        (firstLine.includes('date played') && firstLine.includes('track')) ||
        firstLine.includes('apple music') ||
        (firstLine.includes('last played date') && firstLine.includes('is user initiated'))) {
      return 'apple_music';
    }
    
    // Generic CSV fallback - try Apple Music first
    return 'apple_music';
  }
  
  // Rockbox scrobbler log detection
  if (filename.endsWith('.log') || filename === '.scrobbler.log') {
    const firstLine = content.split('\n')[0]?.trim() || '';
    if (firstLine.startsWith('#AUDIOSCROBBLER')) {
      return 'ipod';
    }
    // Also detect by tab-separated content that looks like scrobbler data
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length > 0) {
      const fields = lines[0].split('\t');
      // Rockbox scrobbler log has 8 tab-separated fields
      if (fields.length >= 6 && fields.length <= 8) {
        return 'ipod';
      }
    }
  }

  // For XLSX files, we'll need to check content after opening
  if (filename.endsWith('.xlsx')) {
    return 'excel'; // Will be further detected in processing
  }

  return 'unknown';
}

// File processor functions

export function isTidalCSV(content) {
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
