import Papa from 'papaparse';
import { parseDateSafely } from '../dates.js';

export async function processTidalCSV(content) {
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

