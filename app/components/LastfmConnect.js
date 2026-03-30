"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as db from './lastfm-db.js';

const USERNAME_KEY = 'lastfm_username';
const LAST_SYNC_KEY = 'lastfm_last_sync';
const SESSION_KEY = 'lastfm_session_key';
const AUTH_TOKEN_KEY = 'lastfm_auth_token';

function scrobbleKey(entry) {
  return `${entry.date}|${entry.artist}|${entry.name}`;
}

function loadRockboxScrobbles() {
  try {
    const raw = localStorage.getItem('rockbox_scrobbles');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export default function LastfmConnect({ isDarkMode, colorMode, onScrobblesLoaded }) {
  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [scrobblesByYear, setScrobblesByYear] = useState({});
  const [status, setStatus] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [sessionKey, setSessionKey] = useState(null);
  const [scrobbling, setScrobbling] = useState(false);
  const [scrobbleProgress, setScrobbleProgress] = useState(null);
  const [rockboxCount, setRockboxCount] = useState(0);
  const [dbReady, setDbReady] = useState(false);
  const abortRef = useRef(null);
  const scrobbleAbortRef = useRef(false);

  // Load saved state on mount
  useEffect(() => {
    (async () => {
      // Migrate any old localStorage data to IndexedDB
      await db.migrateFromLocalStorage();
      const stored = await db.loadAllScrobbles();
      setScrobblesByYear(stored);
      setDbReady(true);

      const user = localStorage.getItem(USERNAME_KEY);
      if (user) { setSavedUsername(user); setUsername(user); }
      const ts = localStorage.getItem(LAST_SYNC_KEY);
      if (ts) setLastSync(new Date(parseInt(ts)));
      const sk = localStorage.getItem(SESSION_KEY);
      if (sk) setSessionKey(sk);

      const rbMap = loadRockboxScrobbles();
      setRockboxCount(Object.values(rbMap).reduce((s, a) => s + a.length, 0));

      // Check if returning from Last.fm auth
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        completeAuth(token);
      }
    })();
  }, []);

  // Complete auth after user returns from Last.fm
  const completeAuth = async (token) => {
    try {
      const res = await fetch('/api/lastfm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'auth.getsession', token }),
      });
      const data = await res.json();
      if (data.error) { setStatus({ type: 'error', message: 'Auth failed: ' + data.error }); return; }
      const sk = data.session?.key;
      const name = data.session?.name;
      if (sk) {
        localStorage.setItem(SESSION_KEY, sk);
        setSessionKey(sk);
        if (name && !savedUsername) {
          setSavedUsername(name); setUsername(name);
          localStorage.setItem(USERNAME_KEY, name);
        }
        setStatus({ type: 'success', message: `Authenticated as ${name || savedUsername}. You can now scrobble to Last.fm.` });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Auth failed: ' + err.message });
    }
  };

  const allScrobbles = Object.values(scrobblesByYear).flat();
  const totalStored = allScrobbles.length;
  const years = Object.keys(scrobblesByYear).sort((a, b) => b - a);

  // Merge new scrobbles with existing, deduplicating. Saves per-year to IndexedDB.
  const mergeEntries = useCallback(async (entries) => {
    const existing = await db.loadAllScrobbles();
    const existingKeys = new Set(Object.values(existing).flat().map(scrobbleKey));
    let newCount = 0;
    const touchedYears = new Set();

    for (const entry of entries) {
      const key = scrobbleKey(entry);
      if (existingKeys.has(key)) continue;
      const year = new Date(entry.date).getFullYear().toString();
      if (!existing[year]) existing[year] = [];
      existing[year].push(entry);
      existingKeys.add(key);
      touchedYears.add(year);
      newCount++;
    }

    for (const year of touchedYears) {
      await db.saveYear(year, existing[year]);
    }

    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    setScrobblesByYear({ ...existing });
    setLastSync(new Date());
    return { newCount };
  }, []);

  const fetchUserInfo = useCallback(async (user) => {
    try {
      const res = await fetch(`/api/lastfm?method=user.getinfo&user=${encodeURIComponent(user)}`);
      const data = await res.json();
      if (data.error) { setStatus({ type: 'error', message: data.error }); return null; }
      return data.user;
    } catch (err) {
      setStatus({ type: 'error', message: 'Failed to connect to Last.fm API: ' + err.message });
      return null;
    }
  }, []);

  const handleConnect = useCallback(async () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    setStatus(null);
    setFetching(true);
    try {
      const info = await fetchUserInfo(trimmed);
      if (info) {
        setUserInfo(info);
        setSavedUsername(trimmed);
        localStorage.setItem(USERNAME_KEY, trimmed);
        setStatus({ type: 'success', message: `Connected as ${info.name} (${parseInt(info.playcount).toLocaleString()} total scrobbles)` });
      }
    } finally { setFetching(false); }
  }, [username, fetchUserInfo]);

  // Fetch all scrobble history — saves incrementally to IndexedDB
  const fetchAllScrobbles = useCallback(async () => {
    const user = savedUsername;
    if (!user) return;

    setFetching(true);
    setStatus(null);
    setProgress({ fetched: 0, total: null });

    const controller = new AbortController();
    abortRef.current = controller;
    let totalFetched = 0;
    let totalNew = 0;

    try {
      const firstRes = await fetch(
        `/api/lastfm?method=user.getrecenttracks&user=${encodeURIComponent(user)}&limit=200&page=1`,
        { signal: controller.signal }
      );
      const firstData = await firstRes.json();
      if (firstData.error) { setStatus({ type: 'error', message: firstData.error }); return; }

      const recentTracks = firstData.recenttracks;
      const totalPages = parseInt(recentTracks['@attr']?.totalPages || '1');
      const totalTracks = parseInt(recentTracks['@attr']?.total || '0');
      setProgress({ fetched: 0, total: totalTracks });

      let pendingTracks = [];

      const firstPageTracks = parseTracksPage(recentTracks.track);
      pendingTracks.push(...firstPageTracks);
      totalFetched += firstPageTracks.length;
      setProgress({ fetched: totalFetched, total: totalTracks });

      for (let page = 2; page <= totalPages; page++) {
        if (controller.signal.aborted) break;

        let retries = 0;
        let success = false;
        while (!success && retries < 3) {
          try {
            const res = await fetch(
              `/api/lastfm?method=user.getrecenttracks&user=${encodeURIComponent(user)}&limit=200&page=${page}`,
              { signal: controller.signal }
            );
            if (res.status === 429) { retries++; await new Promise(r => setTimeout(r, 2000 * retries)); continue; }
            const data = await res.json();
            if (!data.error) {
              const tracks = parseTracksPage(data.recenttracks?.track || []);
              pendingTracks.push(...tracks);
              totalFetched += tracks.length;
            }
            success = true;
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            retries++;
            await new Promise(r => setTimeout(r, 2000 * retries));
          }
        }

        setProgress({ fetched: totalFetched, total: totalTracks });

        // Save incrementally every ~1000 entries
        if (pendingTracks.length >= 1000 || page === totalPages) {
          const { newCount } = await mergeEntries(pendingTracks);
          totalNew += newCount;
          pendingTracks = [];
        }

        await new Promise(r => setTimeout(r, 350));
      }

      // Save any remaining
      if (pendingTracks.length > 0) {
        const { newCount } = await mergeEntries(pendingTracks);
        totalNew += newCount;
      }

      if (totalNew > 0) {
        setStatus({ type: 'success', message: `Imported ${totalNew.toLocaleString()} new scrobbles (${totalFetched.toLocaleString()} total fetched).` });
        if (onScrobblesLoaded) {
          const all = Object.values(await db.loadAllScrobbles()).flat();
          onScrobblesLoaded(all);
        }
      } else {
        setStatus({ type: 'info', message: `All ${totalFetched.toLocaleString()} scrobbles already imported — nothing new.` });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus({ type: 'info', message: `Fetch cancelled. Saved ${totalNew.toLocaleString()} new scrobbles so far.` });
      } else {
        setStatus({ type: 'error', message: 'Fetch failed: ' + err.message });
      }
    } finally {
      setFetching(false);
      setProgress(null);
      abortRef.current = null;
    }
  }, [savedUsername, mergeEntries, onScrobblesLoaded]);

  const fetchRecent = useCallback(async () => {
    const user = savedUsername;
    if (!user) return;
    setFetching(true);
    setStatus(null);
    try {
      let allTracks = [];
      for (let page = 1; page <= 5; page++) {
        const res = await fetch(
          `/api/lastfm?method=user.getrecenttracks&user=${encodeURIComponent(user)}&limit=200&page=${page}`
        );
        if (res.status === 429) { await new Promise(r => setTimeout(r, 3000)); page--; continue; }
        const data = await res.json();
        if (data.error) break;
        allTracks.push(...parseTracksPage(data.recenttracks?.track || []));
        if (parseInt(data.recenttracks?.['@attr']?.totalPages || '1') <= page) break;
        await new Promise(r => setTimeout(r, 350));
      }
      const { newCount } = await mergeEntries(allTracks);
      if (newCount > 0) {
        setStatus({ type: 'success', message: `Imported ${newCount.toLocaleString()} new scrobbles.` });
        if (onScrobblesLoaded) {
          const all = Object.values(await db.loadAllScrobbles()).flat();
          onScrobblesLoaded(all);
        }
      } else {
        setStatus({ type: 'info', message: 'Already up to date — no new scrobbles.' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Fetch failed: ' + err.message });
    } finally { setFetching(false); }
  }, [savedUsername, mergeEntries, onScrobblesLoaded]);

  const handleAuth = useCallback(async () => {
    setStatus(null);
    try {
      const res = await fetch('/api/lastfm?method=auth.gettoken');
      const data = await res.json();
      if (data.error) { setStatus({ type: 'error', message: data.error }); return; }
      const token = data.token;
      const apiKey = data._apiKey;
      if (!token || !apiKey) { setStatus({ type: 'error', message: 'Failed to get auth token.' }); return; }
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      window.open(`https://www.last.fm/api/auth/?api_key=${apiKey}&token=${token}`, 'lastfm_auth', 'width=800,height=600');
      setStatus({ type: 'info', message: 'Authorize in the Last.fm window, then click "Complete authorization" below.' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Auth failed: ' + err.message });
    }
  }, []);

  const handleCompleteAuth = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) { setStatus({ type: 'error', message: 'No auth token found. Click "Authorize" first.' }); return; }
    await completeAuth(token);
  }, [savedUsername]);

  const handleDeauth = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSessionKey(null);
    setStatus({ type: 'info', message: 'Scrobble authorization removed.' });
  }, []);

  // Scrobble iPod/Rockbox plays to Last.fm
  const handleScrobbleIpod = useCallback(async () => {
    if (!sessionKey) return;
    const rbMap = loadRockboxScrobbles();
    const allEntries = Object.values(rbMap).flat().sort((a, b) => new Date(a.ts) - new Date(b.ts));
    if (allEntries.length === 0) {
      setStatus({ type: 'info', message: 'No Rockbox scrobbles found. Import them on the Scrobbler tab first.' });
      return;
    }
    const valid = allEntries.filter(e =>
      e.master_metadata_track_name && e.master_metadata_album_artist_name &&
      e.master_metadata_album_artist_name !== '<Untagged>' &&
      !/\.\w{2,4}$/.test(e.master_metadata_track_name)
    );
    if (valid.length === 0) {
      setStatus({ type: 'info', message: 'All Rockbox scrobbles have missing metadata (untagged). Fix the ID3 tags first.' });
      return;
    }
    const confirmed = window.confirm(
      `Scrobble ${valid.length.toLocaleString()} iPod plays to your Last.fm account?\n\n` +
      `This will add them to your Last.fm history.` +
      (valid.length !== allEntries.length ? `\n\n(${allEntries.length - valid.length} untagged entries will be skipped)` : '')
    );
    if (!confirmed) return;

    setScrobbling(true);
    setStatus(null);
    scrobbleAbortRef.current = false;
    setScrobbleProgress({ sent: 0, total: valid.length, accepted: 0 });

    const scrobbles = valid.map(e => ({
      artist: e.master_metadata_album_artist_name,
      track: e.master_metadata_track_name,
      album: e.master_metadata_album_album_name || '',
      timestamp: Math.floor(new Date(e.ts).getTime() / 1000),
    }));

    let totalSent = 0;
    let totalAccepted = 0;
    const BATCH = 50;

    try {
      for (let i = 0; i < scrobbles.length; i += BATCH) {
        if (scrobbleAbortRef.current) break;
        const batch = scrobbles.slice(i, i + BATCH);
        let retries = 0;
        let success = false;
        while (!success && retries < 3) {
          try {
            const res = await fetch('/api/lastfm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ method: 'track.scrobble', sk: sessionKey, scrobbles: batch }),
            });
            if (res.status === 429) { retries++; await new Promise(r => setTimeout(r, 3000 * retries)); continue; }
            const data = await res.json();
            if (data.error) {
              if (data.error.includes('session') || data.error.includes('Unauthorized')) {
                setStatus({ type: 'error', message: 'Session expired. Please re-authorize.' });
                localStorage.removeItem(SESSION_KEY);
                setSessionKey(null);
                setScrobbling(false);
                setScrobbleProgress(null);
                return;
              }
              retries++; await new Promise(r => setTimeout(r, 2000 * retries)); continue;
            }
            totalAccepted += data.scrobbles?.['@attr']?.accepted ? parseInt(data.scrobbles['@attr'].accepted) : batch.length;
            success = true;
          } catch { retries++; await new Promise(r => setTimeout(r, 2000 * retries)); }
        }
        totalSent += batch.length;
        setScrobbleProgress({ sent: totalSent, total: valid.length, accepted: totalAccepted });
        if (i + BATCH < scrobbles.length) await new Promise(r => setTimeout(r, 1000));
      }
      if (scrobbleAbortRef.current) {
        setStatus({ type: 'info', message: `Scrobbling cancelled. Sent ${totalSent.toLocaleString()} of ${valid.length.toLocaleString()} (${totalAccepted.toLocaleString()} accepted).` });
      } else {
        setStatus({ type: 'success', message: `Scrobbled ${totalAccepted.toLocaleString()} iPod plays to Last.fm.` });
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Scrobble failed: ' + err.message });
    } finally { setScrobbling(false); setScrobbleProgress(null); }
  }, [sessionKey]);

  const handleCancel = useCallback(() => { if (abortRef.current) abortRef.current.abort(); }, []);
  const handleCancelScrobble = useCallback(() => { scrobbleAbortRef.current = true; }, []);

  const handleDisconnect = useCallback(() => {
    localStorage.removeItem(USERNAME_KEY);
    setSavedUsername(''); setUserInfo(null); setUsername('');
    setStatus({ type: 'info', message: 'Disconnected Last.fm account.' });
  }, []);

  const downloadYear = useCallback((year) => {
    const data = scrobblesByYear[year];
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `lastfm-scrobbles-${year}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [scrobblesByYear]);

  const downloadAll = useCallback(() => {
    const all = Object.values(scrobblesByYear).flat().sort((a, b) => new Date(a.date) - new Date(b.date));
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'lastfm-scrobbles-all.json'; a.click();
    URL.revokeObjectURL(url);
  }, [scrobblesByYear]);

  const handleClearAll = useCallback(async () => {
    if (!window.confirm('Delete all stored Last.fm scrobbles from this browser?')) return;
    await db.clearAll();
    localStorage.removeItem(LAST_SYNC_KEY);
    setScrobblesByYear({});
    setLastSync(null);
    setStatus({ type: 'info', message: 'All stored scrobbles cleared.' });
  }, []);

  // Style helpers
  const isColorful = colorMode === 'colorful';
  const border = isColorful ? 'border-red-300 dark:border-red-700' : isDarkMode ? 'border-[#4169E1]' : 'border-black';
  const cardBg = isColorful ? 'bg-red-100 dark:bg-red-900/40' : isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
  const textMain = isColorful ? 'text-red-700 dark:text-red-300' : '';
  const textLight = isColorful ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';
  const shadow = !isColorful ? (isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]') : '';

  const btnPrimary = isColorful
    ? 'px-4 py-2 rounded-lg font-medium text-sm bg-red-600 text-white hover:bg-red-700 transition-colors shadow-[2px_2px_0_0_#dc2626]'
    : `px-4 py-2 rounded-lg font-medium text-sm border transition-colors ${isDarkMode ? 'bg-black text-white border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]'}`;
  const btnSecondary = isColorful
    ? 'px-3 py-1.5 rounded-lg font-medium text-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors border border-red-300 dark:border-red-700 shadow-[2px_2px_0_0_#dc2626]'
    : `px-3 py-1.5 rounded-lg font-medium text-sm border transition-colors ${isDarkMode ? 'bg-black text-white border-[#4169E1] hover:bg-gray-800' : 'bg-white text-black border-black hover:bg-gray-100'}`;
  const btnDanger = isColorful
    ? 'px-3 py-1.5 rounded-lg font-medium text-sm bg-red-500 text-white hover:bg-red-600 transition-colors shadow-[2px_2px_0_0_#dc2626]'
    : `px-3 py-1.5 rounded-lg font-medium text-sm border transition-colors ${isDarkMode ? 'bg-black text-red-400 border-red-600 hover:bg-gray-800' : 'bg-white text-red-600 border-red-400 hover:bg-red-50'}`;

  if (!dbReady) return null; // Wait for IndexedDB to load

  return (
    <div className="space-y-4">
      {/* Connect section */}
      <div className={`p-4 rounded-lg border ${cardBg} ${border} ${shadow}`}>
        <h4 className={`font-semibold text-sm mb-3 ${textMain}`}>Connect your Last.fm account</h4>

        {!savedUsername ? (
          <div className="space-y-3">
            <p className={`text-sm ${textLight}`}>
              Enter your Last.fm username to import your scrobble history. Your profile must be public.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                placeholder="Last.fm username"
                className={`flex-1 px-3 py-2 rounded-lg text-sm border outline-none transition-colors ${
                  isDarkMode
                    ? 'bg-black text-white border-gray-600 focus:border-white placeholder-gray-500'
                    : 'bg-white text-black border-gray-300 focus:border-black placeholder-gray-400'
                }`}
                disabled={fetching}
              />
              <button onClick={handleConnect} disabled={fetching || !username.trim()} className={btnPrimary}>
                {fetching ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                isColorful ? 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200' : isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black'
              }`}>
                <span className="text-base">🎵</span>
                <span className="font-medium">{savedUsername}</span>
                {userInfo && (
                  <span className={textLight}>· {parseInt(userInfo.playcount).toLocaleString()} scrobbles</span>
                )}
              </div>
              <button onClick={handleDisconnect} className={`text-xs ${textLight} hover:underline`}>Disconnect</button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={fetchAllScrobbles} disabled={fetching} className={btnPrimary}>
                {fetching ? 'Fetching...' : totalStored > 0 ? 'Fetch full history' : 'Import all scrobbles'}
              </button>
              {totalStored > 0 && (
                <button onClick={fetchRecent} disabled={fetching} className={btnSecondary}>Fetch recent</button>
              )}
              {fetching && <button onClick={handleCancel} className={btnDanger}>Cancel</button>}
            </div>

            {progress && (
              <div className="space-y-1">
                <div className={`text-xs ${textLight}`}>
                  {progress.total
                    ? `Fetching: ${progress.fetched.toLocaleString()} / ${progress.total.toLocaleString()} scrobbles`
                    : 'Starting...'}
                </div>
                {progress.total && (
                  <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isColorful ? 'bg-red-500' : 'bg-[#4169E1]'}`}
                      style={{ width: `${Math.min(100, (progress.fetched / progress.total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrobble to Last.fm section */}
      {savedUsername && (
        <div className={`p-4 rounded-lg border ${cardBg} ${border} ${shadow}`}>
          <h4 className={`font-semibold text-sm mb-3 ${textMain}`}>Scrobble to Last.fm</h4>

          {!sessionKey ? (
            <div className="space-y-3">
              <p className={`text-sm ${textLight}`}>
                Authorize Cake to scrobble your iPod/Rockbox plays to your Last.fm account.
              </p>
              <div className="flex gap-2 flex-wrap items-center">
                <button onClick={handleAuth} className={btnPrimary}>Authorize with Last.fm</button>
                <button onClick={handleCompleteAuth} className={btnSecondary}>Complete authorization</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded ${
                  isColorful ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-300' : isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                }`}>Authorized</span>
                <button onClick={handleDeauth} className={`text-xs ${textLight} hover:underline`}>Remove authorization</button>
              </div>

              {rockboxCount > 0 ? (
                <div className="space-y-2">
                  <p className={`text-sm ${textLight}`}>{rockboxCount.toLocaleString()} iPod scrobbles available to upload to Last.fm.</p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={handleScrobbleIpod} disabled={scrobbling} className={btnPrimary}>
                      {scrobbling ? 'Scrobbling...' : `Scrobble ${rockboxCount.toLocaleString()} iPod plays`}
                    </button>
                    {scrobbling && <button onClick={handleCancelScrobble} className={btnDanger}>Cancel</button>}
                  </div>
                </div>
              ) : (
                <p className={`text-sm ${textLight}`}>
                  No iPod scrobbles stored. Import them on the Scrobbler tab first, then come back here to upload them to Last.fm.
                </p>
              )}

              {scrobbleProgress && (
                <div className="space-y-1">
                  <div className={`text-xs ${textLight}`}>
                    Scrobbling: {scrobbleProgress.sent.toLocaleString()} / {scrobbleProgress.total.toLocaleString()} sent ({scrobbleProgress.accepted.toLocaleString()} accepted)
                  </div>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${isColorful ? 'bg-red-500' : 'bg-[#4169E1]'}`}
                      style={{ width: `${Math.min(100, (scrobbleProgress.sent / scrobbleProgress.total) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className={`font-semibold text-sm ${textMain}`}>
              Stored scrobbles
              {lastSync && <span className={`ml-2 font-normal ${textLight}`}>· last sync {lastSync.toLocaleDateString()}</span>}
            </h4>
            <div className="flex gap-2">
              <button onClick={downloadAll} className={btnSecondary}>Download all ({totalStored.toLocaleString()})</button>
              <button onClick={handleClearAll} className={btnDanger}>Clear</button>
            </div>
          </div>

          <div className="space-y-1 mb-4">
            {years.map(year => (
              <div key={year} className="flex items-center justify-between">
                <span className={`text-sm ${textLight}`}>
                  <strong>{year}</strong> — {scrobblesByYear[year].length.toLocaleString()} scrobble{scrobblesByYear[year].length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => downloadYear(year)} className={btnSecondary}>{year}.json</button>
              </div>
            ))}
          </div>

          <h4 className={`font-semibold text-sm mb-2 ${textMain}`}>Recent scrobbles</h4>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {allScrobbles
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 100)
              .map((entry, i) => {
                const d = new Date(entry.date);
                return (
                  <div key={i} className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded text-xs ${
                    isColorful ? 'bg-red-50 dark:bg-red-900/30' : isDarkMode ? 'bg-black' : 'bg-white'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <span className={`font-medium block truncate ${isColorful ? 'text-red-800 dark:text-red-200' : ''}`}>{entry.name}</span>
                      <span className={`block truncate ${textLight}`}>
                        {entry.artist}{entry.album && entry.album !== 'Unknown Album' ? ` · ${entry.album}` : ''}
                      </span>
                    </div>
                    <div className={`text-right shrink-0 ${textLight}`}>
                      <span className="block">{d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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

function parseTracksPage(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks
    .filter(t => t.name && !t['@attr']?.nowplaying)
    .map(t => ({
      name: t.name,
      artist: t.artist?.['#text'] || t.artist?.name || '',
      album: t.album?.['#text'] || '',
      date: t.date?.uts
        ? new Date(parseInt(t.date.uts) * 1000).toISOString()
        : t.date?.['#text']
          ? new Date(t.date['#text'] + ' UTC').toISOString()
          : new Date().toISOString(),
      duration_ms: 210000,
      mbid: t.mbid || '',
      source: 'lastfm',
    }));
}
