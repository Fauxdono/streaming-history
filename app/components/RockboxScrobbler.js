"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { processRockboxScrobblerLog } from './streaming-adapter.js';

const STORAGE_KEY = 'rockbox_scrobbles';

function loadScrobbles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveScrobbles(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function scrobbleKey(entry) {
  return `${entry.ts}|${entry.master_metadata_album_artist_name}|${entry.master_metadata_track_name}`;
}

export default function RockboxScrobbler({ isDarkMode, colorMode, onScrobblesLoaded }) {
  const [status, setStatus] = useState(null);
  const [scrobblesByYear, setScrobblesByYear] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [directoryPickerSupported, setDirectoryPickerSupported] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    setDirectoryPickerSupported(typeof window !== 'undefined' && !!window.showDirectoryPicker);
    setIsMac(typeof navigator !== 'undefined' && /mac/i.test(navigator.platform));
    const stored = loadScrobbles();
    setScrobblesByYear(stored);
    const ts = localStorage.getItem('rockbox_last_sync');
    if (ts) setLastSync(new Date(parseInt(ts)));
  }, []);

  const allScrobbles = Object.values(scrobblesByYear).flat();
  const totalStored = allScrobbles.length;
  const untaggedCount = allScrobbles.filter(e =>
    e.master_metadata_album_artist_name === '<Untagged>' ||
    /\.\w{2,4}$/.test(e.master_metadata_track_name || '')
  ).length;
  const years = Object.keys(scrobblesByYear).sort((a, b) => b - a);

  const mergeEntries = useCallback((entries) => {
    const existing = loadScrobbles();
    const existingKeys = new Set(Object.values(existing).flat().map(scrobbleKey));
    let newCount = 0;
    for (const entry of entries) {
      const key = scrobbleKey(entry);
      if (existingKeys.has(key)) continue;
      const year = new Date(entry.ts).getFullYear().toString();
      if (!existing[year]) existing[year] = [];
      existing[year].push(entry);
      existingKeys.add(key);
      newCount++;
    }
    saveScrobbles(existing);
    localStorage.setItem('rockbox_last_sync', Date.now().toString());
    setScrobblesByYear({ ...existing });
    setLastSync(new Date());
    if (onScrobblesLoaded && newCount > 0) {
      onScrobblesLoaded(Object.values(existing).flat());
    }
    return { newCount, existing };
  }, [onScrobblesLoaded]);

  const processContent = useCallback(async (content, canClear = null) => {
    if (!content.trim()) {
      setStatus({ type: 'info', message: '.scrobbler.log is empty — nothing to import.' });
      return;
    }
    const entries = processRockboxScrobblerLog(content);
    if (!entries || entries.length === 0) {
      setStatus({ type: 'info', message: 'No valid scrobbles found in the file.' });
      return;
    }
    const { newCount } = mergeEntries(entries);
    if (newCount > 0) {
      if (canClear) {
        const shouldClear = window.confirm(
          `Imported ${newCount} new scrobble${newCount !== 1 ? 's' : ''}.\n\nClear .scrobbler.log on the device?`
        );
        if (shouldClear) {
          try {
            const writable = await canClear.createWritable();
            await writable.write('#AUDIOSCROBBLER/1.1\n#TZ/UNKNOWN\n#CLIENT/Rockbox\n');
            await writable.close();
            setStatus({ type: 'success', message: `Imported ${newCount} new scrobble${newCount !== 1 ? 's' : ''} and cleared device log.` });
          } catch {
            setStatus({ type: 'success', message: `Imported ${newCount} new scrobble${newCount !== 1 ? 's' : ''}. Clear the log from the device manually to reset it.` });
          }
        } else {
          setStatus({ type: 'success', message: `Imported ${newCount} new scrobble${newCount !== 1 ? 's' : ''}.` });
        }
      } else {
        setStatus({ type: 'success', message: `Imported ${newCount} new scrobble${newCount !== 1 ? 's' : ''}. Clear the log from the device manually to reset it.` });
      }
    } else {
      setStatus({ type: 'info', message: 'All scrobbles already imported — nothing new.' });
    }
  }, [mergeEntries]);

  // Chrome/Edge: directory picker
  const handleConnect = useCallback(async () => {
    setSyncing(true);
    setStatus(null);
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      let fileHandle = null;
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'file' && name.toLowerCase() === '.scrobbler.log') {
          fileHandle = handle;
          break;
        }
      }
      if (!fileHandle) {
        setStatus({ type: 'error', message: 'No .scrobbler.log found. Select the root folder of the Rockbox device.' });
        return;
      }
      const file = await fileHandle.getFile();
      const content = await file.text();
      await processContent(content, fileHandle);
    } catch (err) {
      if (err.name !== 'AbortError') setStatus({ type: 'error', message: err.message });
    } finally {
      setSyncing(false);
    }
  }, [processContent]);

  // Handle file (from input or drop)
  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setSyncing(true);
    setStatus(null);
    try {
      const content = await file.text();
      await processContent(content, null);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [processContent]);

  // Drag and drop handlers
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget)) setDragging(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const downloadYear = useCallback((year) => {
    const data = scrobblesByYear[year];
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rockbox-scrobbles-${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scrobblesByYear]);

  const downloadAll = useCallback(() => {
    const all = Object.values(scrobblesByYear).flat().sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rockbox-scrobbles-all.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [scrobblesByYear]);

  const clearAll = useCallback(() => {
    if (!window.confirm('Delete all stored Rockbox scrobbles from this browser?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('rockbox_last_sync');
    setScrobblesByYear({});
    setLastSync(null);
    setStatus({ type: 'info', message: 'All stored scrobbles cleared.' });
  }, []);

  // Style helpers — colorful mode uses violet to match the upload page
  const isColorful = colorMode === 'colorful';
  const border = isColorful ? 'border-violet-300 dark:border-violet-700' : isDarkMode ? 'border-[#4169E1]' : 'border-black';
  const cardBg = isColorful ? 'bg-violet-100 dark:bg-violet-800' : isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textMain = isColorful ? 'text-violet-700 dark:text-violet-300' : '';
  const textLight = isColorful ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400';
  const shadow = !isColorful ? (isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]') : '';

  const btnPrimary = isColorful
    ? 'px-4 py-2 rounded-lg font-medium text-sm bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-[2px_2px_0_0_#7c3aed]'
    : `px-4 py-2 rounded-lg font-medium text-sm border transition-colors ${isDarkMode ? 'bg-black text-white border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'}`;

  const btnSecondary = isColorful
    ? 'px-3 py-1.5 rounded-lg font-medium text-sm bg-violet-100 text-violet-700 dark:bg-violet-800 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-700 transition-colors border border-violet-300 dark:border-violet-700 shadow-[2px_2px_0_0_#7c3aed]'
    : `px-3 py-1.5 rounded-lg font-medium text-sm border transition-colors ${isDarkMode ? 'bg-black text-white border-[#4169E1] hover:bg-gray-800' : 'bg-white text-black border-black hover:bg-gray-100'}`;

  const btnDanger = isColorful
    ? 'px-3 py-1.5 rounded-lg font-medium text-sm bg-red-500 text-white hover:bg-red-600 transition-colors shadow-[2px_2px_0_0_#7c3aed]'
    : `px-3 py-1.5 rounded-lg font-medium text-sm border transition-colors ${isDarkMode ? 'bg-black text-red-400 border-red-600 hover:bg-gray-800' : 'bg-white text-red-600 border-red-400 hover:bg-red-50'}`;

  return (
    <div className="space-y-4">

      {/* How to sync section */}
      <div className={`p-4 rounded-lg border ${cardBg} ${border} ${shadow}`}>
        <h4 className={`font-semibold text-sm mb-3 ${textMain}`}>How to sync your Rockbox device</h4>

        {directoryPickerSupported ? (
          // Chrome/Edge: auto-connect path
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isColorful ? 'bg-violet-600 text-white' : isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>1</span>
              <p className={`text-sm ${textLight}`}>Plug your Rockbox device in via USB</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isColorful ? 'bg-violet-600 text-white' : isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>2</span>
              <p className={`text-sm ${textLight}`}>Click <strong>Connect device</strong> and select the root folder of the device (not a subfolder)</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isColorful ? 'bg-violet-600 text-white' : isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>3</span>
              <p className={`text-sm ${textLight}`}>Done — scrobbles are saved by year below</p>
            </div>
            <button onClick={handleConnect} disabled={syncing} className={`mt-1 ${btnPrimary}`}>
              {syncing ? 'Reading…' : '📻 Connect device'}
            </button>
          </div>
        ) : (
          // Safari/Firefox: drag-and-drop path
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isColorful ? 'bg-violet-600 text-white' : isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>1</span>
              <p className={`text-sm ${textLight}`}>Plug your Rockbox device in via USB</p>
            </div>
            <div className="flex gap-3 items-start">
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isColorful ? 'bg-violet-600 text-white' : isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>2</span>
              <div>
                <p className={`text-sm ${textLight}`}>Open the device in Finder/Explorer</p>
                {isMac && (
                  <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                    On macOS: press <kbd className="font-mono px-1 py-0.5 rounded text-xs border">{`⌘ Shift .`}</kbd> to show hidden files
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isColorful ? 'bg-violet-600 text-white' : isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>3</span>
              <p className={`text-sm ${textLight}`}>Drag <code className="font-mono">.scrobbler.log</code> from the device root into the box below, or click to browse</p>
            </div>

            {/* Drop zone */}
            <div
              ref={dropZoneRef}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-2 flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors select-none ${
                dragging
                  ? isColorful ? 'border-violet-500 bg-violet-100 dark:bg-violet-800' : isDarkMode ? 'border-white bg-gray-800' : 'border-black bg-gray-100'
                  : isColorful ? 'border-violet-300 dark:border-violet-600 hover:bg-violet-100 dark:hover:bg-violet-800/50' : isDarkMode ? 'border-gray-600 hover:border-gray-400 hover:bg-gray-800' : 'border-gray-300 hover:border-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-3xl">{dragging ? '📂' : '📁'}</span>
              <p className={`text-sm font-medium ${dragging ? (isColorful ? 'text-violet-700' : '') : textLight}`}>
                {syncing ? 'Reading file…' : dragging ? 'Drop it!' : 'Drop .scrobbler.log here or click to browse'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
                disabled={syncing}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status message */}
      {status && (
        <div className={`px-3 py-2 rounded text-sm flex items-start justify-between gap-2 ${
          status.type === 'success' ? (isDarkMode ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-green-50 text-green-800 border border-green-200') :
          status.type === 'error'   ? (isDarkMode ? 'bg-red-900/30 text-red-300 border border-red-800'     : 'bg-red-50 text-red-800 border border-red-200')     :
                                      (isDarkMode ? 'bg-blue-900/30 text-blue-300 border border-blue-800'  : 'bg-blue-50 text-blue-800 border border-blue-200')
        }`}>
          <span>{status.message}</span>
          <button onClick={() => setStatus(null)} className="opacity-50 hover:opacity-100 shrink-0">✕</button>
        </div>
      )}

      {/* Stored scrobbles */}
      {years.length > 0 && (
        <div className={`p-4 rounded-lg border ${cardBg} ${border} ${shadow}`}>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`font-semibold text-sm ${textMain}`}>
              Stored scrobbles
              {lastSync && <span className={`ml-2 font-normal ${textLight}`}>· last sync {lastSync.toLocaleDateString()}</span>}
            </h4>
            <div className="flex gap-2">
              <button onClick={downloadAll} className={btnSecondary}>Download all ({totalStored})</button>
              <button onClick={clearAll} className={btnDanger}>Clear</button>
            </div>
          </div>

          {/* Untagged warning */}
          {untaggedCount > 0 && (
            <div className={`mb-3 px-3 py-2 rounded text-xs flex items-start gap-2 ${
              isDarkMode ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
            }`}>
              <span className="shrink-0">⚠️</span>
              <span>
                <strong>{untaggedCount}</strong> scrobble{untaggedCount !== 1 ? 's' : ''} with missing metadata (filenames like KRPL.m4a instead of track names).
                These files need ID3 tags on the iPod — use Mp3tag or MusicBrainz Picard to fix them.
              </span>
            </div>
          )}

          {/* Year rows */}
          <div className="space-y-1 mb-4">
            {years.map(year => (
              <div key={year} className="flex items-center justify-between">
                <span className={`text-sm ${textLight}`}>
                  <strong>{year}</strong> — {scrobblesByYear[year].length.toLocaleString()} scrobble{scrobblesByYear[year].length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => downloadYear(year)} className={btnSecondary}>
                  {year}.json
                </button>
              </div>
            ))}
          </div>

          {/* Recent scrobbles list */}
          <h4 className={`font-semibold text-sm mb-2 ${textMain}`}>Recent scrobbles</h4>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {Object.values(scrobblesByYear)
              .flat()
              .sort((a, b) => new Date(b.ts) - new Date(a.ts))
              .slice(0, 100)
              .map((entry, i) => {
                const d = new Date(entry.ts);
                const isUntagged = entry.master_metadata_album_artist_name === '<Untagged>' || /\.\w{2,4}$/.test(entry.master_metadata_track_name || '');
                return (
                  <div key={i} className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded text-xs ${
                    isColorful ? 'bg-violet-50 dark:bg-violet-900/30' : isDarkMode ? 'bg-black' : 'bg-white'
                  } ${entry.skipped ? 'opacity-40' : ''} ${isUntagged ? 'opacity-50' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium block truncate">
                        {entry.master_metadata_track_name}
                        {isUntagged && <span className={`ml-1.5 text-[10px] font-normal px-1 py-0.5 rounded ${isDarkMode ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>untagged</span>}
                      </span>
                      <span className={`block truncate ${textLight}`}>
                        {entry.master_metadata_album_artist_name}
                        {entry.master_metadata_album_album_name && entry.master_metadata_album_album_name !== 'Unknown Album'
                          ? ` · ${entry.master_metadata_album_album_name}` : ''}
                      </span>
                    </div>
                    <div className={`text-right shrink-0 ${textLight}`}>
                      <span className="block">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span className="block">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
