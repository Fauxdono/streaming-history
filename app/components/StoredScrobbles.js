"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as lastfmDb from './lastfm-db.js';
import { isDriveConnected, saveScrobblesToDrive, loadScrobblesFromDrive } from './drive-scrobbles.js';

const ROCKBOX_KEY = 'rockbox_scrobbles';
// iPod/Rockbox scrobbles live only in this browser's localStorage, so they're
// the ones worth backing up to Drive. One file, read/merge/write, deduped by key.
const ROCKBOX_DRIVE_FILE = 'rockbox-scrobbles.json';

function readRockbox() {
  try {
    const raw = localStorage.getItem(ROCKBOX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// Same dedupe identity RockboxScrobbler uses when importing from a device.
function rockboxKey(e) {
  return `${e.ts}|${e.master_metadata_album_artist_name}|${e.master_metadata_track_name}`;
}

// Merge scrobbles pulled from Drive into the local store, skipping duplicates.
// Accepts either a { year: [...] } map or a flat array. Returns the count added
// and the updated by-year map (also persisted to localStorage).
function mergeRockbox(incoming) {
  const arr = Array.isArray(incoming) ? incoming : Object.values(incoming || {}).flat();
  const existing = readRockbox();
  const keys = new Set(Object.values(existing).flat().map(rockboxKey));
  let added = 0;
  for (const e of arr) {
    if (!e || !e.ts || !e.master_metadata_track_name) continue;
    const key = rockboxKey(e);
    if (keys.has(key)) continue;
    const year = new Date(e.ts).getFullYear().toString();
    if (!existing[year]) existing[year] = [];
    existing[year].push(e);
    keys.add(key);
    added++;
  }
  if (added > 0) localStorage.setItem(ROCKBOX_KEY, JSON.stringify(existing));
  return { added, map: existing };
}

// Both sources store different entry shapes; normalize for display.
function normalize(entry, source) {
  if (source === 'lastfm') {
    return {
      track: entry.name || '',
      artist: entry.artist || '',
      album: entry.album && entry.album !== 'Unknown Album' ? entry.album : '',
      ts: entry.date,
      skipped: false,
      untagged: false,
    };
  }
  const track = entry.master_metadata_track_name || '';
  const untagged = entry.master_metadata_album_artist_name === '<Untagged>' || /\.\w{2,4}$/.test(track);
  return {
    track,
    artist: entry.master_metadata_album_artist_name || '',
    album: entry.master_metadata_album_album_name && entry.master_metadata_album_album_name !== 'Unknown Album'
      ? entry.master_metadata_album_album_name : '',
    ts: entry.ts,
    skipped: !!entry.skipped,
    untagged,
  };
}

// One "Stored scrobbles" card that switches between the Last.fm and iPod
// views with a button. Each view shows that source's own stored scrobbles
// (read straight from its store), so it works regardless of which inner tab
// is active. Bump `refreshKey` after an import/clear to re-read.
export default function StoredScrobbles({ colorMode = 'minimal', isDarkMode = false, refreshKey = 0, onGoToUpload = null }) {
  const isColorful = colorMode === 'colorful';
  const [source, setSource] = useState('lastfm');
  const [lastfmByYear, setLastfmByYear] = useState({});
  const [rockboxByYear, setRockboxByYear] = useState({});
  const userPicked = useRef(false);
  // Google Drive backup state (iPod source only).
  const [driveBusy, setDriveBusy] = useState(null); // 'save' | 'load' | null
  const [driveMsg, setDriveMsg] = useState(null);    // { type, text }

  const notConnectedMsg = () =>
    setDriveMsg({ type: 'error', text: 'Connect Google Drive first — use the Google Drive box on the Upload tab, then come back.' });

  const saveToGoogle = async () => {
    if (!isDriveConnected()) return notConnectedMsg();
    setDriveBusy('save');
    setDriveMsg(null);
    try {
      const map = readRockbox();
      const count = Object.values(map).flat().length;
      if (count === 0) {
        setDriveMsg({ type: 'info', text: 'No iPod scrobbles in this browser to save yet.' });
        return;
      }
      await saveScrobblesToDrive(ROCKBOX_DRIVE_FILE, map);
      setDriveMsg({ type: 'success', text: `Saved ${count.toLocaleString()} iPod scrobble${count !== 1 ? 's' : ''} to Google Drive.` });
    } catch (err) {
      setDriveMsg({ type: 'error', text: err.message });
    } finally {
      setDriveBusy(null);
    }
  };

  const loadFromGoogle = async () => {
    if (!isDriveConnected()) return notConnectedMsg();
    setDriveBusy('load');
    setDriveMsg(null);
    try {
      const data = await loadScrobblesFromDrive(ROCKBOX_DRIVE_FILE);
      if (!data) {
        setDriveMsg({ type: 'info', text: 'No saved iPod scrobbles found on Google Drive yet.' });
        return;
      }
      const { added, map } = mergeRockbox(data);
      setRockboxByYear({ ...map });
      setDriveMsg(added > 0
        ? { type: 'success', text: `Loaded ${added.toLocaleString()} new scrobble${added !== 1 ? 's' : ''} from Google Drive.` }
        : { type: 'info', text: 'Already up to date — nothing new on Google Drive.' });
    } catch (err) {
      setDriveMsg({ type: 'error', text: err.message });
    } finally {
      setDriveBusy(null);
    }
  };

  useEffect(() => {
    setRockboxByYear(readRockbox());
    let cancelled = false;
    (async () => {
      try {
        // loadAllScrobbles() already returns a { year: [entries] } map.
        const byYear = await lastfmDb.loadAllScrobbles();
        if (!cancelled) setLastfmByYear(byYear && typeof byYear === 'object' ? byYear : {});
      } catch { if (!cancelled) setLastfmByYear({}); }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Default to whichever source has data (prefer Last.fm), until the user picks
  // a view manually. Last.fm loads async, so this re-runs when it arrives.
  useEffect(() => {
    if (userPicked.current) return;
    const lfm = Object.values(lastfmByYear).flat().length;
    const rb = Object.values(rockboxByYear).flat().length;
    if (lfm > 0) setSource('lastfm');
    else if (rb > 0) setSource('rockbox');
  }, [lastfmByYear, rockboxByYear]);

  const byYear = source === 'lastfm' ? lastfmByYear : rockboxByYear;
  const years = Object.keys(byYear).sort((a, b) => b - a);
  const all = Object.values(byYear).flat();
  const total = all.length;

  const border = isColorful ? 'border-violet-300 dark:border-violet-700' : isDarkMode ? 'border-[#4169E1]' : 'border-black';
  const cardBg = isColorful ? 'bg-violet-100 dark:bg-violet-800' : isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textMain = isColorful ? 'text-violet-700 dark:text-violet-300' : '';
  const textLight = isColorful ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400';
  const shadow = isColorful ? (isDarkMode ? 'shadow-[1px_1px_0_0_#7c3aed]' : 'shadow-[1px_1px_0_0_#6d28d9]') : (isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]');
  // Action buttons indent on press (active:), matching the tab buttons' feel.
  const btnSecondary = isColorful
    ? 'px-3 py-1.5 rounded-lg font-medium text-sm bg-violet-100 text-violet-700 dark:bg-violet-800 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-700 transition-all border border-violet-300 dark:border-violet-700 shadow-[2px_2px_0_0_#7c3aed] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_2px_2px_0_0_#7c3aed]'
    : isDarkMode
      ? 'px-3 py-1.5 rounded-lg font-medium text-sm border transition-all bg-black text-white border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_2px_2px_0_0_#4169E1]'
      : 'px-3 py-1.5 rounded-lg font-medium text-sm border transition-all bg-white text-black border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_2px_2px_0_0_black]';
  const btnDanger = isColorful
    ? 'px-3 py-1.5 rounded-lg font-medium text-sm bg-red-500 text-white hover:bg-red-600 transition-all shadow-[2px_2px_0_0_#7c3aed] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_2px_2px_0_0_#7c3aed]'
    : isDarkMode
      ? 'px-3 py-1.5 rounded-lg font-medium text-sm border transition-all bg-black text-red-400 border-red-600 hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_2px_2px_0_0_#4169E1]'
      : 'px-3 py-1.5 rounded-lg font-medium text-sm border transition-all bg-white text-red-600 border-red-400 hover:bg-red-50 shadow-[2px_2px_0_0_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_2px_2px_0_0_black]';
  // Toggle matches the tab buttons: active is pressed-in, inactive is raised.
  const segActive = isColorful
    ? 'bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#7c3aed]'
    : isDarkMode
      ? 'bg-black text-white border border-[#4169E1] translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#4169E1]'
      : 'bg-white text-black border border-black translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_black]';
  const segInactive = isColorful
    ? 'bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700 hover:opacity-80 shadow-[2px_2px_0_0_#7c3aed]'
    : isDarkMode
      ? 'bg-black text-white border border-[#4169E1] hover:opacity-80 shadow-[2px_2px_0_0_#4169E1]'
      : 'bg-white text-black border border-black hover:opacity-80 shadow-[2px_2px_0_0_black]';
  const rowBg = isColorful ? 'bg-violet-50 dark:bg-violet-900/30' : isDarkMode ? 'bg-black' : 'bg-white';

  const triggerDownload = (data, name) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };
  const prefix = source === 'lastfm' ? 'lastfm' : 'rockbox';
  const downloadAll = () => triggerDownload(all, `${prefix}-scrobbles-all.json`);
  const downloadYear = (year) => triggerDownload(byYear[year], `${prefix}-scrobbles-${year}.json`);
  const clearAll = async () => {
    if (source === 'lastfm') {
      await lastfmDb.clearAll();
      setLastfmByYear({});
    } else {
      localStorage.removeItem(ROCKBOX_KEY);
      localStorage.removeItem('rockbox_last_sync');
      setRockboxByYear({});
    }
  };

  const untaggedCount = source === 'rockbox'
    ? all.filter(e => e.master_metadata_album_artist_name === '<Untagged>' || /\.\w{2,4}$/.test(e.master_metadata_track_name || '')).length
    : 0;
  const recent = all.map(e => normalize(e, source)).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 100);

  return (
    <div className={`p-4 rounded-lg border ${cardBg} ${border} ${shadow}`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h4 className={`font-semibold text-sm ${textMain}`}>Stored scrobbles</h4>
        <div className="flex gap-1">
          <button onClick={() => { userPicked.current = true; setSource('lastfm'); }} className={`px-3 py-1 text-xs rounded font-medium ${source === 'lastfm' ? segActive : segInactive}`}>Last.fm</button>
          <button onClick={() => { userPicked.current = true; setSource('rockbox'); }} className={`px-3 py-1 text-xs rounded font-medium ${source === 'rockbox' ? segActive : segInactive}`}>iPod</button>
        </div>
      </div>

      {/* Google Drive backup — iPod scrobbles only, and shown even with no local
          data so a fresh device can pull them down. */}
      {source === 'rockbox' && (
        <div className="mb-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={saveToGoogle} disabled={!!driveBusy} className={`${btnSecondary} disabled:opacity-50`}>
              {driveBusy === 'save' ? 'Saving…' : '☁️ Save to Google'}
            </button>
            <button onClick={loadFromGoogle} disabled={!!driveBusy} className={`${btnSecondary} disabled:opacity-50`}>
              {driveBusy === 'load' ? 'Loading…' : '☁️ Load from Google'}
            </button>
          </div>
          {driveMsg && (
            <div className={`mt-2 px-3 py-2 rounded text-xs flex items-start justify-between gap-2 ${
              driveMsg.type === 'success' ? (isDarkMode ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-green-50 text-green-800 border border-green-200') :
              driveMsg.type === 'error'   ? (isDarkMode ? 'bg-red-900/30 text-red-300 border border-red-800'     : 'bg-red-50 text-red-800 border border-red-200')     :
                                            (isDarkMode ? 'bg-blue-900/30 text-blue-300 border border-blue-800'  : 'bg-blue-50 text-blue-800 border border-blue-200')
            }`}>
              <span>{driveMsg.text}</span>
              <button onClick={() => setDriveMsg(null)} className="opacity-50 hover:opacity-100 shrink-0">✕</button>
            </div>
          )}
        </div>
      )}

      {total === 0 ? (
        <p className={`text-sm ${textLight}`}>
          No {source === 'lastfm' ? 'Last.fm' : 'iPod'} scrobbles stored yet.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className={`text-sm ${textLight}`}>{total.toLocaleString()} scrobble{total !== 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <button onClick={downloadAll} className={btnSecondary}>Download all ({total.toLocaleString()})</button>
              <button onClick={clearAll} className={btnDanger}>Clear</button>
            </div>
          </div>

          {untaggedCount > 0 && (
            <div className={`mb-3 px-3 py-2 rounded text-xs flex items-start gap-2 ${isDarkMode ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
              <span className="shrink-0">⚠️</span>
              <span>
                <strong>{untaggedCount}</strong> scrobble{untaggedCount !== 1 ? 's' : ''} with missing metadata (filenames instead of track names).
                Fix the ID3 tags with Mp3tag or MusicBrainz Picard, or include them on the{' '}
                {onGoToUpload
                  ? <button type="button" onClick={onGoToUpload} className="font-semibold hover:opacity-80" style={{ textDecoration: 'underline' }}>Upload page</button>
                  : 'Upload page'} and adjust them from Your Data.
              </span>
            </div>
          )}

          <div className="space-y-1 mb-4">
            {years.map(year => (
              <div key={year} className="flex items-center justify-between">
                <span className={`text-sm ${textLight}`}>
                  <strong>{year}</strong> — {byYear[year].length.toLocaleString()} scrobble{byYear[year].length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => downloadYear(year)} className={btnSecondary}>{year}.json</button>
              </div>
            ))}
          </div>

          <h4 className={`font-semibold text-sm mb-2 ${textMain}`}>Recent scrobbles</h4>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {recent.map((e, i) => {
              const d = new Date(e.ts);
              return (
                <div key={i} className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded text-xs ${rowBg} ${e.skipped ? 'opacity-40' : ''} ${e.untagged ? 'opacity-50' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <span className={`font-medium block truncate ${isColorful ? 'text-violet-800 dark:text-violet-200' : ''}`}>
                      {e.track}
                      {e.untagged && <span className={`ml-1.5 text-[10px] font-normal px-1 py-0.5 rounded ${isDarkMode ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>untagged</span>}
                    </span>
                    <span className={`block truncate ${textLight}`}>{e.artist}{e.album ? ` · ${e.album}` : ''}</span>
                  </div>
                  <div className={`text-right shrink-0 ${textLight}`}>
                    <span className="block">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span className="block">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
