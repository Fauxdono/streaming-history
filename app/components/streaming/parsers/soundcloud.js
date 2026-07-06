import Papa from 'papaparse';
import { parseDateSafely } from '../dates.js';

export async function processSoundcloudCSV(content) {
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

