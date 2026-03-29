// IndexedDB storage for Last.fm scrobbles.
// Stores scrobbles by year in compact [date, artist, name, album] format.
// Handles 100k+ scrobbles without hitting localStorage limits.

const DB_NAME = 'lastfm_scrobbles';
const DB_VERSION = 1;
const STORE_NAME = 'scrobbles_by_year';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Load one year's scrobbles. Returns array of { date, artist, name, album }.
export async function loadYear(year) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(year));
      req.onsuccess = () => {
        const arr = req.result;
        if (!arr || !Array.isArray(arr)) { resolve([]); return; }
        // Compact format: [date, artist, name, album]
        if (arr.length > 0 && Array.isArray(arr[0])) {
          resolve(arr.map(([date, artist, name, album]) => ({ date, artist, name, album: album || '' })));
        } else {
          resolve(arr); // legacy object format
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

// Load all years. Returns { "2024": [...], "2023": [...] }.
export async function loadAllScrobbles() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = async () => {
        const keys = req.result;
        const map = {};
        // Read each year in parallel
        const reads = keys.map(key =>
          new Promise((res) => {
            const tx2 = db.transaction(STORE_NAME, 'readonly');
            const req2 = tx2.objectStore(STORE_NAME).get(key);
            req2.onsuccess = () => {
              const arr = req2.result;
              if (arr && Array.isArray(arr) && arr.length > 0) {
                if (Array.isArray(arr[0])) {
                  map[key] = arr.map(([date, artist, name, album]) => ({ date, artist, name, album: album || '' }));
                } else {
                  map[key] = arr;
                }
              }
              res();
            };
            req2.onerror = () => res();
          })
        );
        await Promise.all(reads);
        resolve(map);
      };
      req.onerror = () => resolve({});
    });
  } catch { return {}; }
}

// Save one year's scrobbles in compact format.
export async function saveYear(year, entries) {
  const compact = entries.map(e => [e.date, e.artist, e.name, e.album || '']);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(compact, String(year));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get total count across all years (without loading full data into memory).
export async function getTotalCount() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = async () => {
        let total = 0;
        const counts = req.result.map(key =>
          new Promise((res) => {
            const tx2 = db.transaction(STORE_NAME, 'readonly');
            const req2 = tx2.objectStore(STORE_NAME).get(key);
            req2.onsuccess = () => {
              if (Array.isArray(req2.result)) total += req2.result.length;
              res();
            };
            req2.onerror = () => res();
          })
        );
        await Promise.all(counts);
        resolve(total);
      };
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}

// Get count per year. Returns { "2024": 5000, "2023": 4000, ... }.
export async function getCountsByYear() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = async () => {
        const counts = {};
        const reads = req.result.map(key =>
          new Promise((res) => {
            const tx2 = db.transaction(STORE_NAME, 'readonly');
            const req2 = tx2.objectStore(STORE_NAME).get(key);
            req2.onsuccess = () => {
              if (Array.isArray(req2.result)) counts[key] = req2.result.length;
              res();
            };
            req2.onerror = () => res();
          })
        );
        await Promise.all(reads);
        resolve(counts);
      };
      req.onerror = () => resolve({});
    });
  } catch { return {}; }
}

// Clear all scrobble data.
export async function clearAll() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

// Migrate from localStorage (old per-year keys or single-key format) to IndexedDB.
export async function migrateFromLocalStorage() {
  try {
    // Check for old single-key format first
    const oldSingle = localStorage.getItem('lastfm_scrobbles');
    if (oldSingle) {
      const map = JSON.parse(oldSingle);
      for (const [year, entries] of Object.entries(map)) {
        const existing = await loadYear(year);
        if (existing.length === 0) {
          const normalized = entries.map(e => ({
            date: e.date, artist: e.artist, name: e.name, album: e.album || ''
          }));
          await saveYear(year, normalized);
        }
      }
      localStorage.removeItem('lastfm_scrobbles');
    }

    // Check for per-year localStorage keys
    const yearsRaw = localStorage.getItem('lastfm_years');
    if (yearsRaw) {
      const years = JSON.parse(yearsRaw);
      for (const y of years) {
        const raw = localStorage.getItem('lastfm_y_' + y);
        if (!raw) continue;
        const existing = await loadYear(y);
        if (existing.length > 0) {
          localStorage.removeItem('lastfm_y_' + y);
          continue; // Already in IndexedDB
        }
        const arr = JSON.parse(raw);
        let entries;
        if (arr.length > 0 && Array.isArray(arr[0])) {
          entries = arr.map(([date, artist, name, album]) => ({ date, artist, name, album: album || '' }));
        } else {
          entries = arr;
        }
        await saveYear(y, entries);
        localStorage.removeItem('lastfm_y_' + y);
      }
      localStorage.removeItem('lastfm_years');
    }
  } catch (err) {
    console.warn('Last.fm localStorage migration error:', err);
  }
}
