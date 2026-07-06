import * as XLSX from 'xlsx';
import { parseTimeString } from '../dates.js';

export async function processCakeExcelFile(file) {
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
