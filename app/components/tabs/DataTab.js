'use client';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Download, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Pencil, Trash2, Check, X, RotateCcw, Disc3 } from 'lucide-react';
import ExportButton from '../ExportButton.js';
import Top100Export from '../Top100Export.js';
import ServiceIcon from '../ServiceIcons.js';
import { createMatchKey } from '../streaming/normalize.js';
import { loadOverrides, saveOverrides, clearOverrides, countOverrides, playOverrideKey } from '../streaming/overrides.js';
import { isrcMergeGroups } from '../streaming/isrc.js';

// Display names for the per-play `source` field set by each parser.
export const SERVICE_LABELS = {
  spotify: 'Spotify',
  apple_music: 'Apple Music',
  deezer: 'Deezer',
  lastfm: 'Last.fm',
  tidal: 'TIDAL',
  soundcloud: 'SoundCloud',
  ipod: 'iPod / Rockbox',
  cake: 'Cake import',
  'cake-export': 'Cake import',
};

export function serviceLabel(source) {
  return SERVICE_LABELS[source] || (source ? source.charAt(0).toUpperCase() + source.slice(1) : 'Unknown');
}

// Editing is only offered for sparse sources the user maintains themselves
// (cake exports and scrobbles); official service exports stay read-only.
const EDITABLE_SOURCES = new Set(['cake', 'cake-export', 'lastfm', 'ipod']);

const EMPTY_OVERRIDES = { version: 1, tracks: {}, plays: {} };

// "3:45" / "1:02:03" / "225" (seconds) -> ms, or null if unparseable
function parseDurationInput(str) {
  const parts = String(str).trim().split(':');
  if (parts.length === 0 || parts.length > 3) return null;
  if (parts.some(p => p.trim() === '' || isNaN(Number(p)))) return null;
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + Number(p);
  if (seconds < 0) return null;
  return Math.round(seconds * 1000);
}

function formatDurationInput(ms) {
  const s = Math.round((ms || 0) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
}

// Your Data tab: library summary, editable track table with per-service
// badges, and the Download Your Data section (moved here from the
// Statistics tab). Colorful mode deliberately breaks from the pastel
// scheme: black terminal shell with green accents.
export default function DataTab({
  stats,
  processedData,
  rawPlayData,
  onDataEdited,
  onRunEnrichment,
  onStopEnrichment,
  enrichRunning,
  enrichProgress,
  enrichResult,
  enableEnrichment,
  setEnableEnrichment,
  topArtists,
  topAlbums,
  briefObsessions,
  songsByYear,
  formatDuration,
  colorMode,
  isDarkMode,
  importedPlaylists = [],
  importedFavorites = [],
}) {
  const isColorful = colorMode === 'colorful';

  const [overrides, setOverrides] = useState(EMPTY_OVERRIDES);
  useEffect(() => { setOverrides(loadOverrides()); }, []);
  const [applying, setApplying] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [expandedKey, setExpandedKey] = useState(null);
  const [editingKey, setEditingKey] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: '', artist: '', album: '', year: '', length: '' });

  const persist = useCallback(async (next) => {
    setOverrides(next);
    saveOverrides(next);
    if (!onDataEdited) return;
    setApplying(true);
    try {
      await onDataEdited();
    } finally {
      setApplying(false);
    }
  }, [onDataEdited]);

  // Whole-library track aggregation from raw plays (processedData is capped
  // at the top 250 songs, so it can't back this table). Rows group by the
  // DISPLAYED identity, so tracks merged via rename collapse into one row;
  // each row remembers the original keys (okeys) of every variant it
  // contains, and edits/reverts fan out over all of them.
  const allTracks = useMemo(() => {
    const map = new Map();
    for (const play of rawPlayData || []) {
      const name = play.master_metadata_track_name;
      if (!name) continue;
      const artist = play.master_metadata_album_artist_name || 'Unknown Artist';
      const key = createMatchKey(name, artist) || `${name}:::${artist}`;
      const okey = play.__origKey || key;
      let t = map.get(key);
      if (!t) {
        t = { key, name, artist, albums: new Map(), maxMs: 0, doneMs: [], correctedLengthMs: null, releaseYear: null, sources: new Set(), plays: [], okeys: new Set(), variants: new Map() };
        map.set(key, t);
      }
      t.okeys.add(okey);
      if (play.track_length_ms) t.correctedLengthMs = play.track_length_ms;
      const ms = play.ms_played || 0;
      if (ms > t.maxMs) t.maxMs = ms;
      // Completed plays carry the real song length; single entries can still
      // be corrupted (loop sessions logged as one play), so we take the
      // median of them later rather than the max.
      if (play.reason_end === 'trackdone' && ms > 0) t.doneMs.push(ms);
      if (play.release_year) t.releaseYear = play.release_year;
      const album = play.master_metadata_album_album_name;
      if (album && album !== 'Unknown Album') {
        t.albums.set(album, (t.albums.get(album) || 0) + 1);
      }
      if (play.source) t.sources.add(play.source);
      t.plays.push({ ts: play.ts, ms: play.ms_played || 0, source: play.source, okey });
      // Provenance: which original title/album/service each play came from
      // (__origName/__origAlbum survive renames and merges)
      const origName = play.__origName || name;
      const origAlbum = play.__origAlbum || play.master_metadata_album_album_name || '';
      const vkey = `${origName}|||${origAlbum}|||${play.source || ''}`;
      const variant = t.variants.get(vkey);
      if (variant) variant.count += 1;
      else t.variants.set(vkey, { origName, origAlbum, source: play.source, count: 1 });
    }
    const arr = [];
    for (const t of map.values()) {
      let album = '';
      let best = 0;
      for (const [a, c] of t.albums) {
        if (c > best) { best = c; album = a; }
      }
      const sources = [...t.sources].sort();
      // Song length: user correction > median completed play > longest
      // partial listen (shown as a lower bound — the song was never finished)
      let lengthMs;
      let lengthIsPartial = false;
      if (t.correctedLengthMs) {
        lengthMs = t.correctedLengthMs;
      } else if (t.doneMs.length > 0) {
        const sortedDone = t.doneMs.sort((a, b) => a - b);
        lengthMs = sortedDone[Math.floor(sortedDone.length / 2)];
      } else {
        lengthMs = t.maxMs;
        lengthIsPartial = true;
      }
      arr.push({
        key: t.key,
        name: t.name,
        artist: t.artist,
        album,
        lengthMs,
        lengthIsPartial,
        releaseYear: t.releaseYear || 0,
        sources,
        plays: t.plays,
        okeys: [...t.okeys],
        variants: [...t.variants.values()].sort((a, b) => b.count - a.count),
      });
    }
    return arr;
  }, [rawPlayData]);

  // Track keys that have per-play edits saved
  const playEditedKeys = useMemo(() => {
    const set = new Set();
    for (const k of Object.keys(overrides.plays)) {
      const idx = k.lastIndexOf('|');
      if (idx > 0) set.add(k.slice(0, idx));
    }
    return set;
  }, [overrides]);

  const [trackSearch, setTrackSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState(null); // service label or null
  const [sortBy, setSortBy] = useState('artist');
  const [sortDesc, setSortDesc] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const visibleTracks = useMemo(() => {
    let list = allTracks;
    if (serviceFilter) {
      list = list.filter(t => t.sources.some(s => serviceLabel(s) === serviceFilter));
    }
    const q = trackSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
      );
    }
    const dir = sortDesc ? -1 : 1;
    list = [...list].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (typeof av === 'string') return dir * av.localeCompare(bv);
      return dir * (av - bv);
    });
    return list;
  }, [allTracks, trackSearch, serviceFilter, sortBy, sortDesc]);

  // Scope for a targeted MusicBrainz run: tracks matching the current
  // search/service filter that still miss an album or release year
  const scopeActive = !!(trackSearch.trim() || serviceFilter);
  const scopedLookup = useMemo(() => {
    if (!scopeActive) return { count: 0, okeys: [] };
    const needing = visibleTracks.filter(t => !t.album || !t.releaseYear);
    return { count: needing.length, okeys: needing.flatMap(t => t.okeys) };
  }, [scopeActive, visibleTracks]);

  // Keep the page in range when the filter shrinks the list
  const pageCount = Math.max(1, Math.ceil(visibleTracks.length / PAGE_SIZE));
  useEffect(() => {
    if (page >= pageCount) setPage(0);
  }, [pageCount, page]);
  const pageTracks = visibleTracks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortDesc(d => !d);
    } else {
      setSortBy(column);
      setSortDesc(column === 'lengthMs' || column === 'releaseYear');
    }
    setPage(0);
  };

  const startEdit = (t) => {
    setEditingKey(t.key);
    setEditDraft({
      name: t.name,
      artist: t.artist,
      album: t.album,
      year: t.releaseYear ? String(t.releaseYear) : '',
      length: formatDurationInput(t.lengthMs),
    });
  };

  const saveEdit = (t) => {
    const name = editDraft.name.trim();
    const artist = editDraft.artist.trim();
    const album = editDraft.album.trim();
    const lengthMs = parseDurationInput(editDraft.length);
    const year = parseInt(editDraft.year, 10);
    const releaseYear = year >= 1000 && year <= 9999 ? year : null;
    setEditingKey(null);
    if (!name || !artist) return;
    const lengthChanged = lengthMs != null && lengthMs > 0 && lengthMs !== t.lengthMs;
    const yearChanged = releaseYear != null && releaseYear !== t.releaseYear;
    if (name === t.name && artist === t.artist && album === t.album && !lengthChanged && !yearChanged) return;
    // Fan the edit out over every original variant this row contains
    const tracks = { ...overrides.tracks };
    for (const okey of t.okeys) {
      const edit = { name, artist, album };
      if (lengthChanged) edit.lengthMs = lengthMs;
      else if (tracks[okey]?.lengthMs != null) edit.lengthMs = tracks[okey].lengthMs;
      if (releaseYear != null) edit.releaseYear = releaseYear;
      else if (tracks[okey]?.releaseYear != null) edit.releaseYear = tracks[okey].releaseYear;
      tracks[okey] = edit;
    }
    persist({ ...overrides, tracks });
  };

  // Undo every edit saved for this track: renames/merges and all play edits
  const revertTrack = (t) => {
    const tracks = { ...overrides.tracks };
    const prefixes = [];
    for (const okey of t.okeys) {
      delete tracks[okey];
      prefixes.push(`${okey}|`);
    }
    const plays = {};
    for (const [k, v] of Object.entries(overrides.plays)) {
      if (!prefixes.some(p => k.startsWith(p))) plays[k] = v;
    }
    persist({ ...overrides, tracks, plays });
  };

  const commitPlayTime = (t, play, value) => {
    const ms = parseDurationInput(value);
    if (ms == null || ms === play.ms) return;
    persist({
      ...overrides,
      plays: { ...overrides.plays, [playOverrideKey(play.okey, play.ts)]: { ms_played: ms } },
    });
  };

  const deletePlay = (t, play) => {
    persist({
      ...overrides,
      plays: { ...overrides.plays, [playOverrideKey(play.okey, play.ts)]: { removed: true } },
    });
  };

  // ---- Merge: combine several versions of a song into one --------------
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [mergeCanonicalKey, setMergeCanonicalKey] = useState(null);

  const toggleSelected = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedTracks = useMemo(
    () => allTracks.filter(t => selectedKeys.has(t.key)),
    [allTracks, selectedKeys]
  );
  // Default canonical version: the most-played selection
  const canonicalKey = mergeCanonicalKey && selectedKeys.has(mergeCanonicalKey)
    ? mergeCanonicalKey
    : selectedTracks.reduce((max, t) => (!max || t.plays.length > max.plays.length ? t : max), null)?.key;

  const mergeTracks = (tracksToMerge, canon) => {
    const tracks = { ...overrides.tracks };
    for (const t of tracksToMerge) {
      if (t.key === canon.key) continue;
      for (const okey of t.okeys) {
        const edit = { name: canon.name, artist: canon.artist, album: canon.album };
        // A variant's own length correction stays with its plays
        if (tracks[okey]?.lengthMs != null) edit.lengthMs = tracks[okey].lengthMs;
        if (canon.releaseYear) edit.releaseYear = canon.releaseYear;
        tracks[okey] = edit;
      }
    }
    persist({ ...overrides, tracks });
  };

  const mergeSelected = () => {
    const canon = selectedTracks.find(t => t.key === canonicalKey);
    if (!canon || selectedTracks.length < 2) return;
    setSelectedKeys(new Set());
    setMergeCanonicalKey(null);
    mergeTracks(selectedTracks, canon);
  };

  // ---- ISRC merge suggestions -------------------------------------------
  // Library rows that resolve to the same recording via ISRCs from Deezer
  // plays and imported playlist/favorites catalogs (see streaming/isrc.js).
  const [dismissedIsrcs, setDismissedIsrcs] = useState(() => new Set());

  const trackByKey = useMemo(() => new Map(allTracks.map(t => [t.key, t])), [allTracks]);

  const mergeSuggestions = useMemo(() => {
    if (allTracks.length === 0) return [];
    const groups = isrcMergeGroups({
      plays: rawPlayData || [],
      importedPlaylists,
      importedFavorites,
      knownKeys: new Set(trackByKey.keys()),
    });
    return groups
      .map(group => ({
        isrc: group.isrc,
        // Most-played variant first — it becomes the merge target
        tracks: group.keys
          .map(key => trackByKey.get(key))
          .filter(Boolean)
          .sort((a, b) => b.plays.length - a.plays.length),
      }))
      .filter(group => group.tracks.length >= 2)
      .sort((a, b) => b.tracks[0].plays.length - a.tracks[0].plays.length);
  }, [allTracks.length, rawPlayData, importedPlaylists, importedFavorites, trackByKey]);

  const visibleSuggestions = mergeSuggestions.filter(g => !dismissedIsrcs.has(g.isrc));
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const dismissSuggestion = (isrc) => {
    setDismissedIsrcs(prev => new Set(prev).add(isrc));
  };

  const resetAll = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    setResetArmed(false);
    clearOverrides();
    persist({ version: 1, tracks: {}, plays: {} });
  };

  const editCount = countOverrides(overrides);

  // Per-service play counts from the raw data's source tags (cake and
  // cake-export share a label, so group by label but keep a source for
  // the icon)
  const serviceCounts = useMemo(() => {
    const byLabel = new Map();
    for (const play of rawPlayData || []) {
      const label = serviceLabel(play.source);
      const cur = byLabel.get(label);
      if (cur) cur.count += 1;
      else byLabel.set(label, { source: play.source, count: 1 });
    }
    return [...byLabel.entries()].sort((a, b) => b[1].count - a[1].count);
  }, [rawPlayData]);

  // MusicBrainz run state lives in SpotifyAnalyzer (enrichRunning /
  // enrichProgress / enrichResult props) so the lookup keeps running — and
  // keeps its progress + Stop UI — while other tabs are open.

  // Colorful mode: green page with black accents in light, black terminal
  // with green accents in dark (dark: variants carry the inversion).
  const headingClass = isColorful ? 'text-black dark:text-green-400' : '';
  const bodyClass = isColorful ? 'text-black dark:text-green-500' : isDarkMode ? 'text-white' : 'text-black';
  const cardClass = isColorful
    ? 'p-4 border border-black rounded bg-green-200 shadow-[2px_2px_0_0_black] dark:border-green-500 dark:bg-black dark:shadow-[2px_2px_0_0_#22c55e]'
    : `p-4 border rounded ${isDarkMode ? 'border-[#4169E1] bg-black shadow-[1px_1px_0_0_#4169E1]' : 'border-black bg-white shadow-[1px_1px_0_0_black]'}`;
  const thClass = isColorful
    ? 'px-2 py-2 text-left text-xs font-bold uppercase tracking-wider text-black cursor-pointer select-none hover:opacity-70 dark:text-green-400 dark:hover:text-green-300 dark:hover:opacity-100'
    : `px-2 py-2 text-left text-xs font-bold uppercase tracking-wider cursor-pointer select-none ${isDarkMode ? 'text-white' : 'text-black'}`;
  const tdClass = isColorful
    ? 'px-2 py-1.5 text-sm text-black dark:text-green-500'
    : `px-2 py-1.5 text-sm ${isDarkMode ? 'text-white' : 'text-black'}`;
  const inputClass = isColorful
    ? 'px-1.5 py-1 w-full text-sm rounded bg-green-100 border border-black text-black focus:outline-none focus:border-green-700 dark:bg-black dark:border-green-600 dark:text-green-300 dark:focus:border-green-400'
    : `px-1.5 py-1 w-full text-sm rounded focus:outline-none ${isDarkMode ? 'bg-black text-white border border-[#4169E1]' : 'bg-white text-black border border-black'}`;
  const iconBtnClass = isColorful
    ? 'p-1 rounded text-black hover:bg-green-300 dark:text-green-500 dark:hover:text-green-300 dark:hover:bg-green-950'
    : `p-1 rounded ${isDarkMode ? 'text-white hover:bg-gray-900' : 'text-black hover:bg-gray-100'}`;
  const badgeClass = isColorful
    ? 'px-1.5 py-0.5 text-[10px] rounded border border-black bg-green-300 text-black whitespace-nowrap dark:border-green-700 dark:bg-green-950 dark:text-green-400'
    : `px-1.5 py-0.5 text-[10px] rounded border whitespace-nowrap ${isDarkMode ? 'border-[#4169E1] text-white' : 'border-black text-black'}`;
  const pageBtnClass = isColorful
    ? 'flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-black text-black hover:bg-green-300 disabled:opacity-30 disabled:cursor-not-allowed dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950'
    : `flex items-center gap-1 px-3 py-1.5 text-sm rounded border disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-[#4169E1] text-white hover:bg-gray-900' : 'border-black text-black hover:bg-gray-100'}`;

  const SortHeader = ({ column, label, className = '' }) => (
    <th className={`${thClass} ${className}`} onClick={() => toggleSort(column)}>
      {label}{sortBy === column ? (sortDesc ? ' ▼' : ' ▲') : ''}
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Desktop title */}
      <div className="hidden sm:block">
        <h3 className={`text-xl ${headingClass}`}>Your Data</h3>
      </div>

      {/* Download Data Section */}
      {stats && processedData.length > 0 && (
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-3">
            <Download size={18} className={isColorful ? 'text-black dark:text-green-400' : ''} />
            <h4 className={`font-medium ${headingClass}`}>Download Your Data</h4>
          </div>
          <p className={`text-sm mb-3 ${bodyClass}`}>
            Save your streaming analysis to your device as Excel or JSON — your whole library,
            every service and all your edits, combined into one file. Keep <span className="font-bold">Complete History</span> selected
            and next time you can upload that single file instead of the separate service exports.
          </p>
          <ExportButton
            stats={stats}
            topArtists={topArtists || []}
            topAlbums={topAlbums || []}
            processedData={processedData || []}
            briefObsessions={briefObsessions || []}
            songsByYear={songsByYear || {}}
            rawPlayData={rawPlayData || []}
            formatDuration={formatDuration}
            colorMode={colorMode}
          />
          <div className={`mt-3 pt-3 border-t ${isColorful ? 'border-green-600 dark:border-green-800' : isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <p className={`text-sm mb-2 ${bodyClass}`}>
              Lightweight export of your top 100 rankings — paste into AI chats or save for later.
            </p>
            <Top100Export
              processedData={processedData || []}
              songsByYear={songsByYear || {}}
              topArtists={topArtists || []}
              topAlbums={topAlbums || []}
              formatDuration={formatDuration}
              colorMode={colorMode}
            />
          </div>
        </div>
      )}

      {/* Library summary + MusicBrainz, side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Library summary */}
      <div className={cardClass}>
        <p className={`text-sm ${bodyClass}`}>
          <span className="font-bold">{(rawPlayData || []).length.toLocaleString()}</span> plays
          {' · '}
          <span className="font-bold">{allTracks.length.toLocaleString()}</span> tracks
          {editCount > 0 && (
            <span className={isColorful ? 'opacity-60 dark:opacity-100 dark:text-green-600' : 'opacity-60'}> · {editCount.toLocaleString()} {editCount === 1 ? 'edit' : 'edits'}</span>
          )}
          {applying && (
            <span className={isColorful ? 'text-green-800 animate-pulse dark:text-green-300' : 'opacity-60 animate-pulse'}> · updating stats…</span>
          )}
        </p>
        {serviceCounts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {serviceCounts.map(([label, { source, count }]) => (
              <span key={label} className={`${badgeClass.replace('text-[10px]', 'text-xs')} inline-flex items-center gap-1.5`}>
                <ServiceIcon source={source} size={12} />
                {label} · {count.toLocaleString()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* MusicBrainz lookup */}
      {rawPlayData.length > 0 && (
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-2">
            <Disc3 size={18} className={isColorful ? 'text-black dark:text-green-400' : ''} />
            <h4 className={`font-medium ${headingClass}`}>MusicBrainz Lookup</h4>
          </div>
          <p className={`text-sm mb-2 ${bodyClass}`}>
            Fills in missing albums and release years from the open MusicBrainz database
            (about one lookup per second — you can browse other tabs while it runs, or stop anytime).
          </p>
          {(() => {
            const missingAlbums = allTracks.filter(t => !t.album).length;
            const missingYears = allTracks.filter(t => !t.releaseYear).length;
            const lookupCount = allTracks.filter(t => !t.album || !t.releaseYear).length;
            const estMinutes = Math.ceil(lookupCount / 60);
            return (
              <>
                <p className={`text-xs mb-3 ${isColorful ? 'text-black opacity-60 dark:text-green-700 dark:opacity-100' : 'opacity-60'}`}>
                  {lookupCount > 0
                    ? `${missingAlbums.toLocaleString()} tracks missing album info · ${missingYears.toLocaleString()} missing a release year — roughly ${lookupCount.toLocaleString()} lookups (~${estMinutes} min, previously seen tracks are instant).`
                    : 'Every track already has an album and a release year.'}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {enrichRunning ? (
                    <button
                      onClick={onStopEnrichment}
                      className={
                        isColorful
                          ? 'px-4 py-2 text-sm rounded border border-red-600 text-red-700 hover:bg-red-200 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950'
                          : `px-4 py-2 text-sm rounded border ${isDarkMode ? 'border-red-500 text-red-400 hover:bg-red-950' : 'border-red-600 text-red-700 hover:bg-red-100'}`
                      }
                    >
                      {enrichProgress
                        ? `Stop — ${enrichProgress.done.toLocaleString()} / ${enrichProgress.total.toLocaleString()} done`
                        : 'Stop'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onRunEnrichment?.()}
                        disabled={lookupCount === 0}
                        className={
                          isColorful
                            ? 'px-4 py-2 text-sm rounded border border-black text-black hover:bg-green-300 disabled:opacity-30 disabled:cursor-not-allowed dark:border-green-600 dark:text-green-400 dark:hover:bg-green-950'
                            : `px-4 py-2 text-sm rounded border disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'border-[#4169E1] text-white hover:bg-gray-900' : 'border-black text-black hover:bg-gray-100'}`
                        }
                      >
                        Run lookup now
                      </button>
                      {scopeActive && scopedLookup.count > 0 && (
                        <button
                          onClick={() => onRunEnrichment?.(scopedLookup.okeys)}
                          className={
                            isColorful
                              ? 'px-4 py-2 text-sm rounded bg-black text-green-400 hover:bg-gray-900 dark:bg-green-600 dark:text-black dark:hover:bg-green-500'
                              : `px-4 py-2 text-sm rounded border font-medium ${isDarkMode ? 'border-[#4169E1] text-white hover:bg-gray-900' : 'border-black text-black hover:bg-gray-100'}`
                          }
                          title="Only the tracks matching the search/service filter in the table below"
                        >
                          Look up current {trackSearch.trim() ? 'search' : 'filter'} only ({scopedLookup.count.toLocaleString()})
                        </button>
                      )}
                    </>
                  )}
                  {enrichResult && !enrichRunning && (
                    <span className={`text-sm ${bodyClass}`}>
                      {enrichResult.stopped ? '⏹ Stopped early — updated' : '✓ Updated'} {enrichResult.enriched.toLocaleString()} plays
                      {enrichResult.cached > 0 ? ` (${enrichResult.cached.toLocaleString()} from cache)` : ''}
                    </span>
                  )}
                  <label className={`flex items-center gap-2 cursor-pointer select-none text-sm ${bodyClass}`}>
                    <input
                      type="checkbox"
                      checked={!!enableEnrichment}
                      onChange={(e) => {
                        setEnableEnrichment?.(e.target.checked);
                        try { localStorage.setItem('enableAlbumEnrichment', JSON.stringify(e.target.checked)); } catch {}
                      }}
                      className={isColorful ? 'cake-check' : 'cake-check-mono'}
                    />
                    Also run automatically when processing uploads
                  </label>
                </div>
              </>
            );
          })()}
        </div>
      )}
      </div>

      {/* All tracks table */}
      {allTracks.length > 0 && (
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h4 className={`font-medium ${headingClass}`}>
              All Tracks
              <span className={`ml-2 text-xs font-normal ${bodyClass}`}>
                {visibleTracks.length.toLocaleString()} of {allTracks.length.toLocaleString()}
              </span>
            </h4>
            <div className="flex items-center gap-2">
              {editCount > 0 && (
                <button
                  onClick={resetAll}
                  onBlur={() => setResetArmed(false)}
                  className={
                    resetArmed
                      ? 'flex items-center gap-1 px-2 py-1.5 text-xs rounded border border-red-600 text-red-700 bg-red-200 dark:border-red-500 dark:text-red-400 dark:bg-red-950'
                      : isColorful
                        ? 'flex items-center gap-1 px-2 py-1.5 text-xs rounded border border-black text-black hover:bg-green-300 dark:border-green-700 dark:text-green-500 dark:hover:bg-green-950'
                        : `flex items-center gap-1 px-2 py-1.5 text-xs rounded border ${isDarkMode ? 'border-[#4169E1] text-white hover:bg-gray-900' : 'border-black text-black hover:bg-gray-100'}`
                  }
                >
                  <RotateCcw size={12} />
                  {resetArmed ? `Really reset ${editCount} edits?` : 'Reset all edits'}
                </button>
              )}
              <div className="relative">
                <Search size={14} className={`absolute left-2 top-1/2 -translate-y-1/2 ${isColorful ? 'text-black opacity-50 dark:text-green-600 dark:opacity-100' : 'opacity-50'}`} />
                <input
                  type="text"
                  value={trackSearch}
                  onChange={(e) => { setTrackSearch(e.target.value); setPage(0); }}
                  placeholder="Search track, artist, album…"
                  className={
                    isColorful
                      ? 'pl-7 pr-2 py-1.5 w-64 max-w-full text-sm rounded bg-green-100 border border-black text-black placeholder-green-700 focus:outline-none focus:border-green-700 dark:bg-black dark:border-green-600 dark:text-green-400 dark:placeholder-green-800 dark:focus:border-green-400'
                      : `pl-7 pr-2 py-1.5 w-64 max-w-full text-sm rounded focus:outline-none ${isDarkMode ? 'bg-black text-white border border-[#4169E1] focus:border-blue-400' : 'bg-white text-black border border-black focus:border-gray-500'}`
                  }
                />
              </div>
            </div>
          </div>
          {serviceCounts.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className={`text-xs ${isColorful ? 'text-black opacity-60 dark:text-green-700 dark:opacity-100' : 'opacity-60'}`}>Service:</span>
              {[null, ...serviceCounts.map(([label]) => label)].map((label) => {
                const active = serviceFilter === label;
                const source = label ? serviceCounts.find(([l]) => l === label)[1].source : null;
                return (
                  <button
                    key={label ?? 'all'}
                    onClick={() => { setServiceFilter(active ? null : label); setPage(0); }}
                    className={
                      isColorful
                        ? `inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${active
                            ? 'bg-black text-green-400 border-black dark:bg-green-600 dark:text-black dark:border-green-600'
                            : 'border-black text-black hover:bg-green-300 dark:border-green-700 dark:text-green-500 dark:hover:bg-green-950'}`
                        : `inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${active
                            ? (isDarkMode ? 'bg-[#4169E1] text-white border-[#4169E1]' : 'bg-black text-white border-black')
                            : (isDarkMode ? 'border-[#4169E1] text-white hover:bg-gray-900' : 'border-black text-black hover:bg-gray-100')}`
                    }
                  >
                    {source && <ServiceIcon source={source} size={11} />}
                    {label ?? 'All'}
                  </button>
                );
              })}
            </div>
          )}

          <p className={`text-xs mb-3 ${isColorful ? 'text-black opacity-60 dark:text-green-700 dark:opacity-100' : 'opacity-60'}`}>
            Edit song details (name, artist, album, release year, length) for any track, or tick two or more versions of the same song — &quot;Remastered&quot;, &quot;Mono&quot;, different albums — and merge them into one. Length edits only change listening-time stats for scrobbles (Last.fm, iPod), where the log stores the song length; streamed play times are never rewritten. Expand a row to adjust or remove individual scrobble plays.
          </p>

          {visibleSuggestions.length > 0 && (
            <div className={
              isColorful
                ? 'mb-3 p-3 rounded border border-black bg-green-200 dark:border-green-500 dark:bg-green-950'
                : `mb-3 p-3 rounded border ${isDarkMode ? 'border-[#4169E1] bg-gray-900' : 'border-black bg-gray-50'}`
            }>
              <p className={`text-sm font-medium mb-1 ${headingClass}`}>
                Merge suggestions ({visibleSuggestions.length})
              </p>
              <p className={`text-xs mb-2 ${isColorful ? 'text-black opacity-60 dark:text-green-700 dark:opacity-100' : 'opacity-60'}`}>
                These versions share an ISRC (the industry recording ID, found in your service exports), so they are the same recording under different spellings. Merging folds their plays into the most-played version.
              </p>
              <div className="space-y-2">
                {(showAllSuggestions ? visibleSuggestions : visibleSuggestions.slice(0, 8)).map(group => (
                  <div key={group.isrc} className={`flex flex-wrap items-center justify-between gap-2 text-sm ${bodyClass}`}>
                    <span className="min-w-0">
                      {group.tracks.map((t, i) => (
                        <span key={t.key}>
                          {i > 0 && <span className="opacity-60"> + </span>}
                          <span className={i === 0 ? 'font-bold' : ''}>{t.name}</span>
                          <span className="opacity-60"> — {t.artist} · {t.plays.length} plays</span>
                        </span>
                      ))}
                    </span>
                    <span className="flex gap-2 shrink-0">
                      <button
                        onClick={() => mergeTracks(group.tracks, group.tracks[0])}
                        className={
                          isColorful
                            ? 'px-2 py-1 text-xs rounded bg-black text-green-400 hover:bg-gray-900 dark:bg-green-600 dark:text-black dark:hover:bg-green-500'
                            : `px-2 py-1 text-xs rounded border ${isDarkMode ? 'border-[#4169E1] text-white hover:bg-gray-800' : 'border-black text-black hover:bg-gray-100'}`
                        }
                      >
                        Merge
                      </button>
                      <button
                        onClick={() => dismissSuggestion(group.isrc)}
                        className={
                          isColorful
                            ? 'px-2 py-1 text-xs rounded border border-black text-black hover:bg-green-300 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900'
                            : `px-2 py-1 text-xs rounded border ${isDarkMode ? 'border-gray-600 text-white hover:bg-gray-900' : 'border-gray-400 text-black hover:bg-gray-100'}`
                        }
                      >
                        Dismiss
                      </button>
                    </span>
                  </div>
                ))}
              </div>
              {visibleSuggestions.length > 8 && (
                <button
                  onClick={() => setShowAllSuggestions(s => !s)}
                  className={`mt-2 text-xs underline ${bodyClass} opacity-70 hover:opacity-100`}
                >
                  {showAllSuggestions ? 'Show fewer' : `Show all ${visibleSuggestions.length} suggestions`}
                </button>
              )}
            </div>
          )}

          {selectedTracks.length >= 2 && (
            <div className={
              isColorful
                ? 'mb-3 p-3 rounded border border-black bg-green-200 dark:border-green-500 dark:bg-green-950'
                : `mb-3 p-3 rounded border ${isDarkMode ? 'border-[#4169E1] bg-gray-900' : 'border-black bg-gray-50'}`
            }>
              <p className={`text-sm font-medium mb-2 ${headingClass}`}>
                Merge {selectedTracks.length} versions — keep which one?
              </p>
              <div className="space-y-1 mb-3">
                {selectedTracks.map(t => (
                  <label key={t.key} className={`flex items-center gap-2 text-sm cursor-pointer ${bodyClass}`}>
                    <input
                      type="radio"
                      name="merge-canonical"
                      checked={canonicalKey === t.key}
                      onChange={() => setMergeCanonicalKey(t.key)}
                      className={isColorful ? 'cake-check' : 'cake-check-mono'}
                    />
                    <span className="truncate">
                      <span className="font-bold">{t.name}</span>
                      {t.album ? ` · ${t.album}` : ''}
                      <span className={isColorful ? 'opacity-60' : 'opacity-60'}> · {t.plays.length} plays</span>
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={mergeSelected}
                  className={
                    isColorful
                      ? 'px-3 py-1.5 text-sm rounded bg-black text-green-400 hover:bg-gray-900 dark:bg-green-600 dark:text-black dark:hover:bg-green-500'
                      : `px-3 py-1.5 text-sm rounded border ${isDarkMode ? 'border-[#4169E1] text-white hover:bg-gray-800' : 'border-black text-black hover:bg-gray-100'}`
                  }
                >
                  Merge into one song
                </button>
                <button
                  onClick={() => { setSelectedKeys(new Set()); setMergeCanonicalKey(null); }}
                  className={
                    isColorful
                      ? 'px-3 py-1.5 text-sm rounded border border-black text-black hover:bg-green-300 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900'
                      : `px-3 py-1.5 text-sm rounded border ${isDarkMode ? 'border-gray-600 text-white hover:bg-gray-900' : 'border-gray-400 text-black hover:bg-gray-100'}`
                  }
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className={isColorful ? 'border-b border-black dark:border-green-700' : `border-b ${isDarkMode ? 'border-[#4169E1]' : 'border-black'}`}>
                  <th className={`${thClass} cursor-default w-6`} title="Select versions to merge"></th>
                  <th className={`${thClass} cursor-default w-6`}></th>
                  <SortHeader column="name" label="Track" />
                  <SortHeader column="artist" label="Artist" />
                  <SortHeader column="album" label="Album" />
                  <SortHeader column="releaseYear" label="Year" className="text-right" />
                  <SortHeader column="lengthMs" label="Length" className="text-right" />
                  <th className={`${thClass} cursor-default`}>Service</th>
                  <th className={`${thClass} cursor-default w-20`}></th>
                </tr>
              </thead>
              <tbody>
                {pageTracks.map((t) => {
                  const isEdited = t.okeys.some(k => overrides.tracks[k] || playEditedKeys.has(k));
                  const isEditing = editingKey === t.key;
                  const isExpanded = expandedKey === t.key;
                  const rowClass = isColorful
                    ? 'border-b border-green-400 hover:bg-green-300 dark:border-green-900 dark:hover:bg-green-950'
                    : `border-b ${isDarkMode ? 'border-gray-800 hover:bg-gray-900' : 'border-gray-200 hover:bg-gray-50'}`;
                  return (
                    <React.Fragment key={t.key}>
                      <tr className={rowClass}>
                        <td className={`${tdClass} w-6`}>
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(t.key)}
                            onChange={() => toggleSelected(t.key)}
                            title="Select to merge with another version"
                            className={isColorful ? 'cake-check' : 'cake-check-mono'}
                          />
                        </td>
                        <td className={`${tdClass} w-6`}>
                          <button
                            onClick={() => { setExpandedKey(isExpanded ? null : t.key); setEditingKey(null); }}
                            className={iconBtnClass}
                            title={isExpanded ? 'Hide plays' : 'Show plays'}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                        {isEditing ? (
                          <>
                            <td className={tdClass}>
                              <input className={inputClass} value={editDraft.name} onChange={(e) => setEditDraft(d => ({ ...d, name: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') setEditingKey(null); }} autoFocus />
                            </td>
                            <td className={tdClass}>
                              <input className={inputClass} value={editDraft.artist} onChange={(e) => setEditDraft(d => ({ ...d, artist: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') setEditingKey(null); }} />
                            </td>
                            <td className={tdClass}>
                              <input className={inputClass} value={editDraft.album} onChange={(e) => setEditDraft(d => ({ ...d, album: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') setEditingKey(null); }} />
                            </td>
                            <td className={`${tdClass} text-right`}>
                              <input className={`${inputClass} w-16 text-right tabular-nums`} value={editDraft.year} onChange={(e) => setEditDraft(d => ({ ...d, year: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') setEditingKey(null); }} placeholder="Year" title="Release year" />
                            </td>
                            <td className={`${tdClass} text-right`}>
                              <input className={`${inputClass} w-20 text-right tabular-nums`} value={editDraft.length} onChange={(e) => setEditDraft(d => ({ ...d, length: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(t); if (e.key === 'Escape') setEditingKey(null); }} title="Song length (m:ss)" />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={`${tdClass} max-w-[220px] truncate`} title={t.name}>
                              {t.name}
                              {isEdited && (
                                <span className={`ml-1.5 ${badgeClass}`}>edited</span>
                              )}
                            </td>
                            <td className={`${tdClass} max-w-[160px] truncate`} title={t.artist}>{t.artist}</td>
                            <td className={`${tdClass} max-w-[180px] truncate opacity-80`} title={t.album}>{t.album}</td>
                            <td className={`${tdClass} text-right tabular-nums`}>{t.releaseYear || '—'}</td>
                            <td
                              className={`${tdClass} text-right tabular-nums whitespace-nowrap ${t.lengthIsPartial ? 'opacity-60' : ''}`}
                              title={t.lengthIsPartial ? 'Never played to the end — longest partial listen; edit to set the real length' : undefined}
                            >
                              {t.lengthIsPartial
                                ? (t.lengthMs >= 1000 ? `≥ ${formatDurationInput(t.lengthMs)}` : '—')
                                : formatDurationInput(t.lengthMs)}
                            </td>
                          </>
                        )}
                        <td className={tdClass}>
                          <div className="flex flex-wrap gap-1">
                            {t.sources.map((s) => (
                              <span
                                key={s}
                                className={`${badgeClass} inline-flex items-center`}
                                title={serviceLabel(s)}
                                aria-label={serviceLabel(s)}
                              >
                                <ServiceIcon source={s} size={12} />
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className={`${tdClass} w-20`}>
                          <div className="flex items-center gap-0.5 justify-end">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEdit(t)} className={iconBtnClass} title="Save"><Check size={14} /></button>
                                <button onClick={() => setEditingKey(null)} className={iconBtnClass} title="Cancel"><X size={14} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(t)} className={iconBtnClass} title="Edit song details"><Pencil size={14} /></button>
                                {isEdited && (
                                  <button onClick={() => revertTrack(t)} className={iconBtnClass} title="Undo all edits to this track"><RotateCcw size={14} /></button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className={rowClass}>
                          <td colSpan={9} className="px-2 pb-2">
                            {/* Provenance: original title/album per source */}
                            <div className="mt-1 mb-1.5">
                              <div className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${isColorful ? 'text-black opacity-60 dark:text-green-700 dark:opacity-100' : 'opacity-60'}`}>
                                Where this song comes from
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {t.variants.map((v, i) => (
                                  <span key={i} className={`${badgeClass} inline-flex items-center gap-1.5 !text-xs py-1`}>
                                    <ServiceIcon source={v.source} size={11} />
                                    <span>
                                      {v.origName !== t.name && <span className="font-bold">{v.origName} · </span>}
                                      {v.origAlbum || 'Unknown Album'}
                                      <span className="opacity-60"> · {v.count} {v.count === 1 ? 'play' : 'plays'}</span>
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className={`max-h-64 overflow-y-auto rounded border ${isColorful ? 'border-green-500 dark:border-green-900' : isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                              <table className="w-full">
                                <tbody>
                                  {[...t.plays].sort((a, b) => new Date(b.ts) - new Date(a.ts)).map((play) => {
                                    const canEditPlay = EDITABLE_SOURCES.has(play.source);
                                    const pk = playOverrideKey(t.key, play.ts);
                                    return (
                                      <tr key={`${play.ts}-${play.source}`} className={isColorful ? 'border-b border-green-300 dark:border-green-950' : `border-b ${isDarkMode ? 'border-gray-900' : 'border-gray-100'}`}>
                                        <td className={`${tdClass} whitespace-nowrap`}>{new Date(play.ts).toLocaleString()}</td>
                                        <td className={`${tdClass} w-28`}>
                                          {canEditPlay ? (
                                            <input
                                              className={`${inputClass} w-24 text-right tabular-nums`}
                                              defaultValue={formatDurationInput(play.ms)}
                                              onBlur={(e) => commitPlayTime(t, play, e.target.value)}
                                              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                              title="Play duration (m:ss) — edit and press Enter"
                                            />
                                          ) : (
                                            <span className="tabular-nums">{formatDurationInput(play.ms)}</span>
                                          )}
                                        </td>
                                        <td className={tdClass}>
                                          <span className={`${badgeClass} inline-flex items-center`} title={serviceLabel(play.source)} aria-label={serviceLabel(play.source)}>
                                            <ServiceIcon source={play.source} size={12} />
                                          </span>
                                        </td>
                                        <td className={`${tdClass} w-8 text-right`}>
                                          {canEditPlay && (
                                            <button
                                              onClick={() => deletePlay(t, play)}
                                              className={isColorful ? 'p-1 rounded text-black hover:text-red-600 hover:bg-red-200 dark:text-green-700 dark:hover:text-red-400 dark:hover:bg-red-950' : `p-1 rounded ${isDarkMode ? 'text-white hover:text-red-400' : 'text-black hover:text-red-600'}`}
                                              title="Remove this play"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          )}
                                          {overrides.plays[pk] && !overrides.plays[pk].removed && (
                                            <span className={`ml-1 ${badgeClass}`}>edited</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between mt-3">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className={pageBtnClass}>
                <ChevronLeft size={14} /> Prev
              </button>
              <span className={`text-sm ${bodyClass}`}>
                Page {page + 1} of {pageCount.toLocaleString()}
              </span>
              <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className={pageBtnClass}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
