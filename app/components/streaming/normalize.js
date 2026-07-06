const normalizationCache = new Map();

export function normalizeString(str) {
  if (!str) return { normalized: '', featureArtists: [] };
  
  // Check cache first
  const cacheKey = str.toLowerCase();
  if (normalizationCache.has(cacheKey)) {
    return normalizationCache.get(cacheKey);
  }
  
  // Extract feature artists and clean up the string
  let featureArtists = [];
  let normalized = str.toLowerCase()
    // Clean up extra characters first
    .replace(/\)\)+/g, ')') // Fix double parentheses like "))"
    .replace(/\(\(+/g, '(')  // Fix double opening parentheses
    .trim();
  
  // Common feature artist patterns - expanded to include "with"
  const patterns = [
    /\(feat\.?\s*(.*?)\)/i, /\[feat\.?\s*(.*?)\]/i, 
    /\(ft\.?\s*(.*?)\)/i, /\[ft\.?\s*(.*?)\]/i,
    /\(with\s+(.*?)\)/i, /\[with\s+(.*?)\]/i,
    /\(featuring\s+(.*?)\)/i, /\[featuring\s+(.*?)\]/i,
    /\sfeat\.?\s+(.*?)(?=\s*[-,]|$)/i, 
    /\sft\.?\s+(.*?)(?=\s*[-,]|$)/i, 
    /\swith\s+(.*?)(?=\s*[-,]|$)/i,
    /\sfeaturing\s+(.*?)(?=\s*[-,]|$)/i
  ];
  
  // Extract all feature artists
  for (const pattern of patterns) {
    const matches = normalized.match(pattern);
    if (matches && matches[1]) {
      // Split feature artists by common separators and normalize "of [group]" suffixes
      const featuresString = matches[1].trim();
      const featParts = featuresString.split(/\s*[,&]\s*/);
      featParts.forEach(part => {
        let trimmed = part.trim();
        // Normalize "Artist of Group" to just "Artist" for consistency
        trimmed = trimmed.replace(/\s+of\s+[^,&]+$/i, '');
        if (trimmed) {
          featureArtists.push(trimmed);
        }
      });
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

// Cache for normalized artist names to improve performance
const artistNormalizationCache = new Map();

export function normalizeArtistName(str) {
  if (!str) return '';
  
  // Check cache first
  if (artistNormalizationCache.has(str)) {
    return artistNormalizationCache.get(str);
  }
  
  let normalized = str.toLowerCase()
    // Handle common punctuation variations
    .replace(/,\s*the\s+/g, ' the ') // "Artist, The" -> "artist the"
    .replace(/\s*&\s*/g, ' and ')    // "&" -> " and "
    .replace(/\s*\+\s*/g, ' and ')   // "+" -> " and "
    .replace(/\s*\/\s*/g, ' and ')   // "/" -> " and "
    // Remove special characters but keep spaces
    .replace(/[^\w\s]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  // Cache the result
  artistNormalizationCache.set(str, normalized);
  
  return normalized;
}

// Cache for match keys
const matchKeyCache = new Map();

export function createMatchKey(trackName, artistName) {
  if (!trackName || !artistName) return '';
  
  // Check cache first
  const cacheKey = `${trackName}:::${artistName}`;
  if (matchKeyCache.has(cacheKey)) {
    return matchKeyCache.get(cacheKey);
  }
  
  const trackResult = normalizeString(trackName);
  const cleanTrack = trackResult.normalized;
  
  // Extract primary artist and feature artists
  let primaryArtist = artistName;
  let featureArtists = [];
  
  // Extract feature artists from track name first
  if (trackResult.featureArtists) {
    featureArtists.push(...trackResult.featureArtists);
  }
  
  // Clean up extra characters and normalize the artist name before processing
  const cleanedArtistName = artistName
    .replace(/\)\)+/g, ')') // Fix double parentheses like "))"
    .replace(/\(\(+/g, '(')  // Fix double opening parentheses
    .trim();
  
  // Extract artists from the artist name - handle all feature patterns
  const featurePatterns = [
    /^(.*?)\s+(feat\.?|featuring|ft\.?|with)\s+(.+)$/i,  // "Artist feat/ft/featuring/with Others"
    /^(.*?)\s*\(\s*(feat\.?|featuring|ft\.?|with)\s*(.+?)\s*\)(.*)$/i,  // "Artist (feat Others)"
    /^(.*?)\s*\[\s*(feat\.?|featuring|ft\.?|with)\s*(.+?)\s*\](.*)$/i   // "Artist [feat Others]"
  ];
  
  let foundPattern = false;
  for (const pattern of featurePatterns) {
    const match = cleanedArtistName.match(pattern);
    if (match) {
      primaryArtist = match[1].trim();
      const featuresString = match[3].trim();
      
      // Split feature artists by common separators
      const featParts = featuresString.split(/\s*[,&]\s*/);
      featParts.forEach(part => {
        let trimmed = part.trim();
        // Normalize "Artist of Group" to just "Artist" for consistency
        trimmed = trimmed.replace(/\s+of\s+[^,&]+$/i, '');
        if (trimmed && !featureArtists.includes(trimmed)) {
          featureArtists.push(trimmed);
        }
      });
      foundPattern = true;
      break;
    }
  }
  
  // If no feature pattern found, check for & or , separators (collaborations)
  if (!foundPattern) {
    if (cleanedArtistName.includes('&')) {
      const artistParts = cleanedArtistName.split(/\s*&\s*/);
      primaryArtist = artistParts[0].trim();
      artistParts.slice(1).forEach(part => {
        let trimmed = part.trim();
        // Normalize "Artist of Group" to just "Artist" for consistency
        trimmed = trimmed.replace(/\s+of\s+[^,&]+$/i, '');
        if (trimmed && !featureArtists.includes(trimmed)) {
          featureArtists.push(trimmed);
        }
      });
    } else if (cleanedArtistName.includes(',')) {
      const artistParts = cleanedArtistName.split(/\s*,\s*/);
      primaryArtist = artistParts[0].trim();
      artistParts.slice(1).forEach(part => {
        let trimmed = part.trim();
        // Normalize "Artist of Group" to just "Artist" for consistency
        trimmed = trimmed.replace(/\s+of\s+[^,&]+$/i, '');
        if (trimmed && !featureArtists.includes(trimmed)) {
          featureArtists.push(trimmed);
        }
      });
    } else {
      primaryArtist = cleanedArtistName;
    }
  }
  
  const artistResult = normalizeString(primaryArtist);
  const cleanArtist = artistResult.normalized;
  
  // Normalize and sort feature artists to ensure consistent ordering
  const normalizedFeatures = featureArtists
    .map(artist => normalizeString(artist).normalized)
    .filter(artist => artist && artist !== cleanArtist) // Remove duplicates and primary artist
    .sort(); // Alphabetical sort for consistent ordering
  
  // Create match key with primary artist and sorted feature artists
  let result = `${cleanTrack}-${cleanArtist}`;
  if (normalizedFeatures.length > 0) {
    result += `-feat-${normalizedFeatures.join('-')}`;
  }
  
  // Cache the result
  matchKeyCache.set(cacheKey, result);
  
  return result;
}

export function normalizeAlbumName(albumName) {
  if (!albumName) return '';
  return albumName.toLowerCase()
    .replace(/(\(|\[)?\s*(deluxe|special|expanded|remastered|anniversary|edition|version|complete|bonus|tracks)(\s*edition)?\s*(\)|\])?/gi, '')
    .replace(/(\(|\[)\s*\d{4}\s*(\)|\])/g, '')
    .replace(/(\(|\[)?\s*feat\..*(\)|\])?/gi, '')
    .replace(/(\(|\[)\s*(\)|\])/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

