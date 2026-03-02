// Weather utilities for correlating listening data with historical weather
// Uses Open-Meteo free API (no key needed)

// Country capital coordinates for ~50 common countries (ISO 2-letter → {lat, lon, name})
export const COUNTRY_CAPITALS = {
  US: { lat: 38.90, lon: -77.04, name: 'Washington D.C.' },
  GB: { lat: 51.51, lon: -0.13, name: 'London' },
  DE: { lat: 52.52, lon: 13.41, name: 'Berlin' },
  FR: { lat: 48.86, lon: 2.35, name: 'Paris' },
  SE: { lat: 59.33, lon: 18.07, name: 'Stockholm' },
  NO: { lat: 59.91, lon: 10.75, name: 'Oslo' },
  DK: { lat: 55.68, lon: 12.57, name: 'Copenhagen' },
  FI: { lat: 60.17, lon: 24.94, name: 'Helsinki' },
  NL: { lat: 52.37, lon: 4.90, name: 'Amsterdam' },
  BE: { lat: 50.85, lon: 4.35, name: 'Brussels' },
  CH: { lat: 46.95, lon: 7.45, name: 'Bern' },
  AT: { lat: 48.21, lon: 16.37, name: 'Vienna' },
  IT: { lat: 41.90, lon: 12.50, name: 'Rome' },
  ES: { lat: 40.42, lon: -3.70, name: 'Madrid' },
  PT: { lat: 38.72, lon: -9.14, name: 'Lisbon' },
  IE: { lat: 53.35, lon: -6.26, name: 'Dublin' },
  PL: { lat: 52.23, lon: 21.01, name: 'Warsaw' },
  CZ: { lat: 50.08, lon: 14.44, name: 'Prague' },
  HU: { lat: 47.50, lon: 19.04, name: 'Budapest' },
  RO: { lat: 44.43, lon: 26.10, name: 'Bucharest' },
  BG: { lat: 42.70, lon: 23.32, name: 'Sofia' },
  HR: { lat: 45.81, lon: 15.98, name: 'Zagreb' },
  GR: { lat: 37.98, lon: 23.73, name: 'Athens' },
  TR: { lat: 39.93, lon: 32.86, name: 'Ankara' },
  RU: { lat: 55.76, lon: 37.62, name: 'Moscow' },
  UA: { lat: 50.45, lon: 30.52, name: 'Kyiv' },
  CA: { lat: 45.42, lon: -75.70, name: 'Ottawa' },
  MX: { lat: 19.43, lon: -99.13, name: 'Mexico City' },
  BR: { lat: -15.79, lon: -47.88, name: 'Brasília' },
  AR: { lat: -34.60, lon: -58.38, name: 'Buenos Aires' },
  CL: { lat: -33.45, lon: -70.67, name: 'Santiago' },
  CO: { lat: 4.71, lon: -74.07, name: 'Bogotá' },
  PE: { lat: -12.05, lon: -77.04, name: 'Lima' },
  AU: { lat: -35.28, lon: 149.13, name: 'Canberra' },
  NZ: { lat: -41.29, lon: 174.78, name: 'Wellington' },
  JP: { lat: 35.68, lon: 139.69, name: 'Tokyo' },
  KR: { lat: 37.57, lon: 126.98, name: 'Seoul' },
  CN: { lat: 39.90, lon: 116.40, name: 'Beijing' },
  IN: { lat: 28.61, lon: 77.21, name: 'New Delhi' },
  TH: { lat: 13.76, lon: 100.50, name: 'Bangkok' },
  VN: { lat: 21.03, lon: 105.85, name: 'Hanoi' },
  PH: { lat: 14.60, lon: 120.98, name: 'Manila' },
  ID: { lat: -6.21, lon: 106.85, name: 'Jakarta' },
  MY: { lat: 3.14, lon: 101.69, name: 'Kuala Lumpur' },
  SG: { lat: 1.35, lon: 103.82, name: 'Singapore' },
  ZA: { lat: -25.75, lon: 28.19, name: 'Pretoria' },
  EG: { lat: 30.04, lon: 31.24, name: 'Cairo' },
  NG: { lat: 9.06, lon: 7.49, name: 'Abuja' },
  KE: { lat: -1.29, lon: 36.82, name: 'Nairobi' },
  IL: { lat: 31.77, lon: 35.22, name: 'Jerusalem' },
  AE: { lat: 24.45, lon: 54.65, name: 'Abu Dhabi' },
  SA: { lat: 24.71, lon: 46.68, name: 'Riyadh' },
  IS: { lat: 64.15, lon: -21.94, name: 'Reykjavik' },
  LT: { lat: 54.69, lon: 25.28, name: 'Vilnius' },
  LV: { lat: 56.95, lon: 24.11, name: 'Riga' },
  EE: { lat: 59.44, lon: 24.75, name: 'Tallinn' },
  SK: { lat: 48.15, lon: 17.11, name: 'Bratislava' },
  SI: { lat: 46.06, lon: 14.51, name: 'Ljubljana' },
  RS: { lat: 44.79, lon: 20.47, name: 'Belgrade' },
};

// WMO weather code → human-readable category
// https://open-meteo.com/en/docs — WMO Weather interpretation codes
export function categorizeWeatherCode(code) {
  if (code <= 1) return 'Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

// Broader grouping for pie chart (fewer slices)
export function broadWeatherCategory(code) {
  if (code <= 1) return 'Clear';
  if (code >= 2 && code <= 3) return 'Cloudy';
  if (code >= 45 && code <= 48) return 'Fog';
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'Snow';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

// Temperature bucket classification
export function tempBucket(tempMax) {
  if (tempMax < 0) return 'Freezing (<0°C)';
  if (tempMax < 10) return 'Cold (0-10°C)';
  if (tempMax < 20) return 'Mild (10-20°C)';
  if (tempMax < 30) return 'Warm (20-30°C)';
  return 'Hot (30°C+)';
}

// All temp buckets in order
export const TEMP_BUCKETS = [
  'Freezing (<0°C)',
  'Cold (0-10°C)',
  'Mild (10-20°C)',
  'Warm (20-30°C)',
  'Hot (30°C+)',
];

// Weather category colors for charts
export const WEATHER_COLORS = {
  'Clear': '#FFB300',
  'Cloudy': '#90A4AE',
  'Fog': '#78909C',
  'Rain': '#42A5F5',
  'Snow': '#E0E0E0',
  'Thunderstorm': '#7E57C2',
  'Unknown': '#BDBDBD',
};

// Temperature bucket colors
export const TEMP_COLORS = {
  'Freezing (<0°C)': '#90CAF9',
  'Cold (0-10°C)': '#42A5F5',
  'Mild (10-20°C)': '#66BB6A',
  'Warm (20-30°C)': '#FFA726',
  'Hot (30°C+)': '#EF5350',
};

// --- localStorage cache helpers ---
const CACHE_KEY = 'weatherCache';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full — silently fail
  }
}

// Get cached weather for a location key "lat,lon"
export function getCachedWeather(lat, lon) {
  const cache = readCache();
  const key = `${lat},${lon}`;
  return cache[key] || null;
}

// Merge new weather data into cache for a location
export function setCachedWeather(lat, lon, dateMap) {
  const cache = readCache();
  const key = `${lat},${lon}`;
  cache[key] = { ...(cache[key] || {}), ...dateMap };
  writeCache(cache);
}

// --- API calls ---

// Fetch historical daily weather for a lat/lon and date range
// Returns { "YYYY-MM-DD": { code, tempMax, tempMin, precip } }
export async function fetchWeatherBatch(lat, lon, startDate, endDate) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;

  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Weather API error ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();

  if (!data.daily || !data.daily.time) return {};

  const result = {};
  const { time, weather_code, temperature_2m_max, temperature_2m_min, precipitation_sum } = data.daily;
  for (let i = 0; i < time.length; i++) {
    result[time[i]] = {
      code: weather_code[i],
      tempMax: temperature_2m_max[i],
      tempMin: temperature_2m_min[i],
      precip: precipitation_sum[i],
    };
  }
  return result;
}

// Geocode a city name using Open-Meteo geocoding API
// Returns [{name, lat, lon, country, admin1}]
export async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Geocoding API error: ${resp.status}`);
  const data = await resp.json();
  if (!data.results) return [];
  return data.results.map(r => ({
    name: r.name,
    lat: Math.round(r.latitude * 100) / 100,
    lon: Math.round(r.longitude * 100) / 100,
    country: r.country_code,
    admin1: r.admin1 || '',
  }));
}

// Fetch all weather data for a set of plays, using cache and batching by year
// plays: array of { date: "YYYY-MM-DD", country: "XX" }
// homeCity: { lat, lon, country } or null
// onProgress: (loaded, total) => void
// Returns { "YYYY-MM-DD": { code, tempMax, tempMin, precip } } merged for all locations
export async function fetchAllWeather(plays, homeCity, onProgress) {
  // Group plays by location (lat,lon)
  const locationDates = {}; // "lat,lon" → Set of dates

  for (const { date, country } of plays) {
    let coords = null;
    if (homeCity && homeCity.country === country) {
      coords = { lat: homeCity.lat, lon: homeCity.lon };
    } else if (COUNTRY_CAPITALS[country]) {
      coords = COUNTRY_CAPITALS[country];
    }
    if (!coords) continue;

    const key = `${coords.lat},${coords.lon}`;
    if (!locationDates[key]) locationDates[key] = new Set();
    locationDates[key].add(date);
  }

  // For each location, determine which years we need to fetch (skip cached)
  const fetchTasks = []; // [{lat, lon, startDate, endDate}]

  for (const [key, dates] of Object.entries(locationDates)) {
    const [lat, lon] = key.split(',').map(Number);
    const cached = getCachedWeather(lat, lon) || {};

    // Find dates not in cache
    const uncached = [...dates].filter(d => !cached[d]);
    if (uncached.length === 0) continue;

    // Group uncached dates by year and fetch year-long batches
    // Cap end date to yesterday (archive API doesn't have future/today data)
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const maxDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const years = new Set(uncached.map(d => d.substring(0, 4)));
    for (const year of years) {
      const endDate = `${year}-12-31` > maxDate ? maxDate : `${year}-12-31`;
      const startDate = `${year}-01-01`;
      // Skip if start date is after the max available date
      if (startDate > maxDate) continue;
      fetchTasks.push({ lat, lon, startDate, endDate });
    }
  }

  let loaded = 0;
  const total = fetchTasks.length;
  if (onProgress) onProgress(0, total);

  // Fetch sequentially to be nice to the free API
  for (const task of fetchTasks) {
    const data = await fetchWeatherBatch(task.lat, task.lon, task.startDate, task.endDate);
    setCachedWeather(task.lat, task.lon, data);
    loaded++;
    if (onProgress) onProgress(loaded, total);
  }

  // Build merged result: for each play's date, look up the right location's cache
  const result = {};
  for (const { date, country } of plays) {
    if (result[date + '|' + country]) continue; // already processed this combo

    let coords = null;
    if (homeCity && homeCity.country === country) {
      coords = { lat: homeCity.lat, lon: homeCity.lon };
    } else if (COUNTRY_CAPITALS[country]) {
      coords = COUNTRY_CAPITALS[country];
    }
    if (!coords) continue;

    const cached = getCachedWeather(coords.lat, coords.lon);
    if (cached && cached[date]) {
      // Key by date+country so different countries on same date get different weather
      result[date + '|' + country] = cached[date];
    }
  }

  return result;
}
