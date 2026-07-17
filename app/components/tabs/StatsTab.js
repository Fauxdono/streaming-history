'use client';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { filterDataByDate } from '../streaming-adapter.js';
import { useTheme } from '../themeprovider.js';

const localDayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Statistics tab content.
export default function StatsTab({
  colorMode,
  setColorMode,
  isDarkMode,
  filteredStats,
  filteredStreaks,
  formatDuration,
  rawPlayData,
  selectedStreaksYear,
  stats,
}) {
  // Listening hours per calendar year (all-time context strip)
  const yearlyTotals = useMemo(() => {
    const per = {};
    for (const e of rawPlayData || []) {
      if (!e.ms_played || e.ms_played < 30000) continue;
      const y = new Date(e.ts).getFullYear();
      if (!isNaN(y)) per[y] = (per[y] || 0) + e.ms_played;
    }
    const years = Object.keys(per).map(Number).sort((a, b) => a - b);
    if (!years.length) return [];
    const out = [];
    for (let y = years[0]; y <= years[years.length - 1]; y++) {
      out.push({ year: y, ms: per[y] || 0 });
    }
    return out;
  }, [rawPlayData]);
  const peakYear = useMemo(
    () => yearlyTotals.reduce((max, y) => (y.ms > (max?.ms || 0) ? y : max), null),
    [yearlyTotals]
  );

  // Records & firsts, respecting the page's year filter
  const records = useMemo(() => {
    const data = filterDataByDate(rawPlayData || [], selectedStreaksYear);

    // One chronological list of counted plays (>30s, valid date)
    const plays = [];
    for (const e of data) {
      if (!e.ms_played || e.ms_played < 30000) continue;
      const d = new Date(e.ts);
      if (isNaN(d.getTime())) continue;
      plays.push({
        t: d.getTime(),
        ms: e.ms_played,
        track: e.master_metadata_track_name,
        artist: e.master_metadata_album_artist_name,
      });
    }
    if (!plays.length) return null;
    plays.sort((a, b) => a.t - b.t);

    const first = plays.find(p => p.track) || plays[0];

    // Per-day totals, counts, and first play of each day
    const dayMs = {};
    const dayCount = {};
    const dayFirstTrack = {};
    for (const p of plays) {
      const key = localDayKey(new Date(p.t));
      dayMs[key] = (dayMs[key] || 0) + p.ms;
      dayCount[key] = (dayCount[key] || 0) + 1;
      if (!dayFirstTrack[key] && p.track) dayFirstTrack[key] = { track: p.track, artist: p.artist };
    }
    const days = Object.keys(dayMs).sort();

    // Top 3 biggest days (by time) — ignore days whose total exceeds 24h:
    // those are data artifacts, not real listening days.
    const plausible = days.filter(k => dayMs[k] <= 86400000);
    const candidates = plausible.length ? plausible : days;
    const topDays = candidates
      .map(k => ({ date: k, ms: dayMs[k] }))
      .sort((a, b) => b.ms - a.ms)
      .slice(0, 3);
    // Dominant artist on each of those days (one narrow pass)
    const topKeys = new Set(topDays.map(d => d.date));
    const dayArtistMs = {};
    for (const p of plays) {
      const k = localDayKey(new Date(p.t));
      if (!topKeys.has(k) || !p.artist) continue;
      (dayArtistMs[k] = dayArtistMs[k] || {})[p.artist] = (dayArtistMs[k][p.artist] || 0) + p.ms;
    }
    topDays.forEach(d => {
      d.artist = Object.entries(dayArtistMs[d.date] || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
    });

    // Top 3 busiest days (by play count)
    const topBusiest = days
      .map(k => ({ date: k, count: dayCount[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Milestone play — the largest round play number reached
    const MILESTONES = [1000000, 500000, 250000, 200000, 100000, 50000, 25000, 10000, 5000, 1000];
    let milestone = null;
    const n = MILESTONES.find(m => plays.length >= m);
    if (n) {
      const p = plays[n - 1];
      milestone = { n, track: p.track, artist: p.artist, date: new Date(p.t) };
    }

    // Top 3 sessions — chains of plays with < 15 min between them
    const allSessions = [];
    let sStart = 0, sMs = plays[0].ms;
    for (let i = 1; i <= plays.length; i++) {
      const chained = i < plays.length && plays[i].t - plays[i - 1].t <= 15 * 60 * 1000;
      if (chained) { sMs += plays[i].ms; continue; }
      if (sMs <= 86400000) allSessions.push({ ms: sMs, count: i - sStart, date: new Date(plays[sStart].t) });
      if (i < plays.length) { sStart = i; sMs = plays[i].ms; }
    }
    const sessions = allSessions.sort((a, b) => b.ms - a.ms).slice(0, 3);

    // Top 3 relationships — songs with the widest first→latest span (10+ plays)
    const songSpan = new Map();
    for (const p of plays) {
      if (!p.track) continue;
      const key = `${p.track}|||${p.artist || ''}`;
      const s = songSpan.get(key);
      if (s) { s.last = p.t; s.count++; }
      else songSpan.set(key, { first: p.t, last: p.t, count: 1, track: p.track, artist: p.artist });
    }
    const relationships = [...songSpan.values()]
      .filter(s => s.count >= 10)
      .sort((a, b) => (b.last - b.first) - (a.last - a.first))
      .slice(0, 3);

    // Top 3 silences between listening days — with the song that broke each
    const allGaps = [];
    for (let i = 1; i < days.length; i++) {
      const diff = Math.round((new Date(days[i]) - new Date(days[i - 1])) / 86400000) - 1;
      if (diff > 0) allGaps.push({ days: diff, from: days[i - 1], to: days[i], brokenBy: dayFirstTrack[days[i]] });
    }
    const gaps = allGaps.sort((a, b) => b.days - a.days).slice(0, 3).filter(g => g.days > 1);

    const spanDays = Math.round((new Date(days[days.length - 1]) - new Date(days[0])) / 86400000) + 1;
    return {
      first: first ? { date: new Date(first.t), track: first.track, artist: first.artist } : null,
      topDays,
      topBusiest,
      milestone,
      sessions,
      relationships,
      gaps,
      daysWithMusic: days.length,
      spanDays,
    };
  }, [rawPlayData, selectedStreaksYear]);

  // Human-readable period label for the export header
  const periodLabel = selectedStreaksYear === 'all'
    ? 'all-time'
    : selectedStreaksYear.startsWith('all-')
      ? (() => { const p = selectedStreaksYear.split('-'); const monthName = new Date(2024, parseInt(p[1]) - 1).toLocaleDateString('en-US', { month: 'long' }); return p.length === 3 ? `Every ${monthName} ${parseInt(p[2])}` : `Every ${monthName}`; })()
      : selectedStreaksYear;

  // Shareable-image export. Renders a two-column poster (Overview + Records,
  // excludes Download Your Data) in a chosen theme variant with an optional
  // cake-sprinkle border, previewed live before download.
  const overviewRef = useRef(null);
  const recordsRef = useRef(null);
  const { setTheme } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [useBorder, setUseBorder] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  // Shared wrapper style for both exportable panels (also gives the live page
  // a subtle framed look). The branded ExportHeader inside is hidden on the
  // live page and only revealed in the captured clone.
  const shareWrapCls = colorMode === 'colorful'
    ? 'space-y-4 px-2 pb-2 pt-2 sm:p-4 rounded-lg bg-indigo-200 dark:bg-indigo-900'
    : `space-y-4 px-2 pb-2 pt-2 sm:p-4 rounded-lg ${isDarkMode ? 'bg-black' : 'bg-white'}`;

  // Render the poster to a canvas in the current page theme. The 4 mode
  // buttons switch the actual app theme, so this just clones the live
  // (already-correctly-themed) sections — no swapping needed.
  const renderPosterCanvas = async ({ border, scale }) => {
    if (!overviewRef.current || !recordsRef.current) return null;
    const { default: html2canvas } = await import('html2canvas');
    const bg = isDarkMode ? '#000000' : (colorMode === 'colorful' ? '#c7d2fe' : '#ffffff');
    const headColor = colorMode === 'colorful' ? (isDarkMode ? '#c7d2fe' : '#3730a3') : (isDarkMode ? '#ffffff' : '#000000');
    const B = 56; // sprinkle-border thickness
    let poster;
    try {
      // Outer frame; when bordered, the padding holds the sprinkle strips
      poster = document.createElement('div');
      poster.style.cssText = `position:fixed;left:-99999px;top:0;width:1160px;box-sizing:border-box;position:relative;`
        + (border ? `padding:${B}px;background:transparent;` : `padding:0;background:${bg};`);
      const content = document.createElement('div');
      content.style.cssText = `padding:20px;box-sizing:border-box;background:${bg};position:relative;z-index:1;${border ? 'border-radius:8px;' : ''}`;
      poster.appendChild(content);

      const header = document.createElement('div');
      header.style.cssText = `display:flex;align-items:baseline;justify-content:space-between;margin-bottom:16px;color:${headColor};`;
      header.innerHTML = `<div style="font-weight:700;font-size:20px;">Statistics <span style="font-size:12px;font-weight:400;opacity:.75;">${periodLabel}</span></div><div style="font-size:12px;font-weight:500;opacity:.5;">🎂 cakeculator</div>`;
      content.appendChild(header);

      const cols = document.createElement('div');
      cols.style.cssText = 'display:flex;gap:16px;align-items:flex-start;';
      const mkCol = () => { const d = document.createElement('div'); d.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:16px;'; return d; };
      const left = mkCol(), right = mkCol();
      cols.appendChild(left); cols.appendChild(right);
      content.appendChild(cols);

      const ov = overviewRef.current.cloneNode(true);
      ov.querySelectorAll('[data-export-only], [data-export-ignore]').forEach(e => e.remove());
      ov.className = 'space-y-4';
      left.appendChild(ov);

      const grid = recordsRef.current.querySelector('[data-rec-grid]');
      const cards = Array.from(grid.children).map(c => c.cloneNode(true));
      let split = cards.findIndex(c => (c.textContent || '').includes('Longest sessions'));
      if (split < 0) split = Math.ceil(cards.length / 2);
      const stack = (arr) => { const d = document.createElement('div'); d.setAttribute('data-rec-grid', ''); d.style.cssText = 'display:flex;flex-direction:column;gap:12px;'; arr.forEach(c => { c.classList.remove('col-span-2'); d.appendChild(c); }); return d; };
      left.appendChild(stack(cards.slice(0, split)));
      right.appendChild(stack(cards.slice(split)));

      // Cake-sprinkle border: four strips, each oriented so the sprinkles
      // face OUTWARD and the cake faces inward. The vertical edges are the
      // horizontal strip rotated ±90°; the bottom edge is flipped.
      if (border) {
        const url = 'url(/apple-touch-icon.png)';
        const strip = (css) => { const d = document.createElement('div'); d.style.cssText = css; return d; };
        const bgH = `background:${url} repeat-x;background-size:auto ${B}px;`;
        // Miter clips: each strip is a trapezoid so corners meet at 45°.
        // Horizontal strips are wide at their (local) top edge; the bottom
        // strip is scaleY-flipped, which flips this to wide-at-bottom.
        const miterH = `clip-path:polygon(0 0, 100% 0, calc(100% - ${B}px) 100%, ${B}px 100%);`;
        const miterL = `clip-path:polygon(0 0, 100% ${B}px, 100% calc(100% - ${B}px), 0 100%);`;
        const miterR = `clip-path:polygon(0 ${B}px, 100% 0, 100% 100%, 0 calc(100% - ${B}px));`;
        // top — image as-is (sprinkles up)
        poster.appendChild(strip(`position:absolute;top:0;left:0;right:0;height:${B}px;${bgH}${miterH}z-index:2;`));
        // bottom — flipped (sprinkles down)
        poster.appendChild(strip(`position:absolute;bottom:0;left:0;right:0;height:${B}px;${bgH}transform:scaleY(-1);${miterH}z-index:2;`));
        // left — rotated so sprinkles point left
        const lc = strip(`position:absolute;top:0;bottom:0;left:0;width:${B}px;overflow:hidden;${miterL}z-index:2;`);
        lc.appendChild(strip(`position:absolute;top:0;left:0;height:${B}px;width:6000px;${bgH}transform-origin:0 0;transform:translateY(6000px) rotate(-90deg);`));
        poster.appendChild(lc);
        // right — rotated so sprinkles point right
        const rc = strip(`position:absolute;top:0;bottom:0;right:0;width:${B}px;overflow:hidden;${miterR}z-index:2;`);
        rc.appendChild(strip(`position:absolute;top:0;left:0;height:${B}px;width:6000px;${bgH}transform-origin:0 0;transform:translateX(${B}px) rotate(90deg);`));
        poster.appendChild(rc);
      }

      document.body.appendChild(poster);
      const canvas = await html2canvas(poster, {
        backgroundColor: border ? null : bg,
        scale,
        useCORS: true,
        logging: false,
        ignoreElements: (el) => el.hasAttribute && el.hasAttribute('data-export-ignore'),
        onclone: (doc) => {
          doc.querySelectorAll('[data-rec-grid] div, [data-rec-grid] span, [data-hero] div').forEach(el => { el.style.lineHeight = '1.7'; });
          doc.querySelectorAll('[data-vlabel]').forEach(el => { el.style.writingMode = 'horizontal-tb'; el.style.transform = 'none'; });
        },
      });
      return canvas;
    } finally {
      if (poster && poster.parentNode) poster.parentNode.removeChild(poster);
    }
  };

  // Regenerate the preview when the theme / border changes.
  useEffect(() => {
    if (!stats) return;
    let cancelled = false;
    const id = setTimeout(async () => {
      setPreviewing(true);
      try {
        const canvas = await renderPosterCanvas({ border: useBorder, scale: 0.55 });
        if (canvas && !cancelled) setPreviewUrl(canvas.toDataURL('image/png'));
      } catch (err) { console.error('Preview failed:', err); }
      finally { if (!cancelled) setPreviewing(false); }
    }, 200);
    return () => { cancelled = true; clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorMode, isDarkMode, useBorder, stats, periodLabel]);

  const handleExportImage = async () => {
    setExporting(true);
    try {
      const canvas = await renderPosterCanvas({ border: useBorder, scale: 2 });
      if (!canvas) return;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cakeculator-stats-${periodLabel.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setExported(true);
      setTimeout(() => setExported(false), 4000);
    } catch (err) {
      console.error('Image export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // "% of waking hours" equivalence for the hero (16 waking hours/day)
  const wakingPct = useMemo(() => {
    if (!records || records.spanDays < 60 || !filteredStats?.totalListeningTime) return null;
    const pct = (filteredStats.totalListeningTime / (records.spanDays * 16 * 3600000)) * 100;
    return pct >= 0.1 ? pct : null;
  }, [records, filteredStats]);

  return stats ? (
          <div className={
            colorMode === 'colorful'
              ? 'px-0 pt-0 pb-2 sm:py-4 bg-indigo-200 dark:bg-indigo-900 rounded border-2 border-indigo-300 dark:border-indigo-700'
              : `px-0 pt-0 pb-2 sm:py-4 border ${isDarkMode ? 'border-[#4169E1]' : 'border-black'}`
          }>
            {/* Desktop title */}
            <div className="hidden sm:block mb-4 px-4">
              <h3 className={
                colorMode === 'colorful'
                  ? 'text-xl text-indigo-700 dark:text-indigo-300'
                  : 'text-xl'
              }>Statistics <span className="text-xs opacity-75">{selectedStreaksYear === 'all' ? 'all-time' : selectedStreaksYear.startsWith('all-') ? (() => { const p = selectedStreaksYear.split('-'); const monthName = new Date(2024, parseInt(p[1]) - 1).toLocaleDateString('en-US', { month: 'long' }); return p.length === 3 ? `Every ${monthName} ${parseInt(p[2])}` : `Every ${monthName}`; })() : selectedStreaksYear}</span></h3>
              {filteredStats?.earliestDate && filteredStats?.latestDate && (
                <p className={`text-sm mt-1 ${colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-60'}`}>
                  {new Date(filteredStats.earliestDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} — {new Date(filteredStats.latestDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
            <div ref={overviewRef} className={shareWrapCls}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:mt-4">
                {/* Hero: the number that matters */}
                <div data-hero className="flex flex-col justify-center py-0 sm:py-2">
                  <div className={
                    colorMode === 'colorful'
                      ? 'text-sm font-medium text-indigo-600 dark:text-indigo-400'
                      : 'text-sm font-medium opacity-70'
                  }>You&apos;ve listened to</div>
                  <div className={
                    colorMode === 'colorful'
                      ? 'text-4xl sm:text-5xl font-bold leading-tight text-indigo-700 dark:text-indigo-300'
                      : 'text-4xl sm:text-5xl font-bold leading-tight'
                  }>{formatDuration(filteredStats?.totalListeningTime || 0)}</div>
                  <div className={
                    colorMode === 'colorful'
                      ? 'text-sm font-medium text-indigo-600 dark:text-indigo-400'
                      : 'text-sm font-medium opacity-70'
                  }>of music{filteredStats?.earliestDate && filteredStats?.latestDate && (
                    <> · {new Date(filteredStats.earliestDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} — {new Date(filteredStats.latestDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</>
                  )}</div>
                  {wakingPct && (
                    <div className={
                      colorMode === 'colorful'
                        ? 'text-sm mt-2 text-indigo-600 dark:text-indigo-400'
                        : 'text-sm mt-2 opacity-70'
                    }>
                      ≈ {wakingPct < 10 ? wakingPct.toFixed(1) : Math.round(wakingPct)}% of your waking hours had music on 🎂
                    </div>
                  )}
                  <div className={
                    colorMode === 'colorful'
                      ? 'text-xs mt-1 text-indigo-500 dark:text-indigo-500'
                      : 'text-xs mt-1 opacity-50'
                  }>only counting plays over 30 seconds</div>

                  {/* Share as image — collapsible poster-export controls */}
                  {(() => {
                    const modes = [
                      { cm: 'colorful', dk: false, label: 'Colorful light' },
                      { cm: 'colorful', dk: true, label: 'Colorful dark' },
                      { cm: 'minimal', dk: false, label: 'Minimal light' },
                      { cm: 'minimal', dk: true, label: 'Minimal dark' },
                    ];
                    const isActive = (m) => m.cm === colorMode && m.dk === isDarkMode;
                    const modeBtn = (m) => (
                      <button
                        key={m.label}
                        onClick={() => { setColorMode(m.cm); setTheme(m.dk ? 'dark' : 'light'); }}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors ${
                          isActive(m)
                            ? (colorMode === 'colorful' ? 'bg-indigo-600 text-white border-indigo-600' : (isDarkMode ? 'bg-white text-black border-white' : 'bg-black text-white border-black'))
                            : (colorMode === 'colorful' ? 'border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-700' : `${isDarkMode ? 'border-[#4169E1] text-white hover:bg-gray-900' : 'border-black text-black hover:bg-gray-100'}`)
                        }`}
                      >{m.label}</button>
                    );
                    return (
                      <details data-export-ignore className="mt-3 group">
                        <summary className={`inline-flex items-center gap-2 w-fit cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden px-3 py-1.5 rounded-lg font-medium text-sm border transition-all group-open:translate-x-[2px] group-open:translate-y-[2px] ${
                          colorMode === 'colorful'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 hover:bg-indigo-200 dark:hover:bg-indigo-700 shadow-[2px_2px_0_0_#4338ca] dark:shadow-[2px_2px_0_0_#4f46e5] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_2px_2px_0_0_#4338ca] dark:active:shadow-[inset_2px_2px_0_0_#4f46e5] group-open:shadow-[inset_2px_2px_0_0_#4338ca] dark:group-open:shadow-[inset_2px_2px_0_0_#4f46e5]'
                            : (isDarkMode
                                ? 'bg-black text-white border-[#4169E1] hover:bg-gray-800 shadow-[2px_2px_0_0_#4169E1] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_2px_2px_0_0_#4169E1] group-open:shadow-[inset_2px_2px_0_0_#4169E1]'
                                : 'bg-white text-black border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[inset_2px_2px_0_0_black] group-open:shadow-[inset_2px_2px_0_0_black]')
                        }`}>
                          <ImageIcon size={16} />
                          Share as image
                        </summary>
                        <div className="mt-3 space-y-3">
                          {/* Preview */}
                          <div className={`relative w-full max-w-xs rounded border overflow-hidden ${colorMode === 'colorful' ? 'border-indigo-300 dark:border-indigo-600' : (isDarkMode ? 'border-gray-700' : 'border-gray-300')}`}>
                            {previewUrl
                              ? <img src={previewUrl} alt="Export preview" className="w-full block" />
                              : <div className="aspect-[1160/900] w-full" />}
                            {previewing && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-xs font-medium text-white">Rendering…</div>
                            )}
                          </div>
                          {/* Theme */}
                          <div>
                            <div className={`text-xs mb-1.5 ${colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-60'}`}>Theme (switches the whole app)</div>
                            <div className="grid grid-cols-2 gap-1.5 max-w-xs">{modes.map(modeBtn)}</div>
                          </div>
                          <label className={`flex items-center gap-2 text-sm cursor-pointer ${colorMode === 'colorful' ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                            <input type="checkbox" checked={useBorder} onChange={(e) => setUseBorder(e.target.checked)} />
                            🎂 Sprinkle border
                          </label>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleExportImage}
                              disabled={exporting || previewing}
                              className={
                                colorMode === 'colorful'
                                  ? 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60'
                                  : `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-60 ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`
                              }
                            >
                              <ImageIcon size={16} />
                              {exporting ? 'Rendering…' : 'Share as Image'}
                            </button>
                            {exported && (
                              <span className={`text-sm font-medium ${colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-70'}`}>✓ Saved to your downloads</span>
                            )}
                          </div>
                        </div>
                      </details>
                    );
                  })()}

                  {/* Data quality footnote */}
                  <details data-export-ignore className={`mt-3 text-sm ${
                    colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : 'opacity-70'
                  }`}>
                    <summary className="cursor-pointer select-none hover:opacity-80">Data details</summary>
                    <ul className="mt-2 space-y-1 pl-1">
                      <li>Files processed: {stats.totalFiles}</li>
                      <li>Total entries: {filteredStats?.totalEntries || 0}</li>
                      <li>Processed songs: {filteredStats?.processedSongs || 0}</li>
                      <li>Unique songs: {filteredStats?.uniqueSongs || 0}</li>
                      <li>Entries with no track name: {filteredStats?.nullTrackNames || 0}</li>
                      <li>Plays under 30s: {filteredStats?.shortPlays || 0}</li>
                    </ul>
                  </details>
                </div>
                <div className={
                  colorMode === 'colorful'
                    ? 'p-4 border space-y-2 bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 rounded text-indigo-700 dark:text-indigo-300 shadow-[1px_1px_0_0_#4338ca] dark:shadow-[1px_1px_0_0_#4f46e5]'
                    : `p-4 border space-y-2 ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
                }>
                  {/* Service breakdown */}
                  {filteredStats?.serviceListeningTime && Object.keys(filteredStats.serviceListeningTime).length > 0 && (
                    <div>
                      <div className={
                        colorMode === 'colorful'
                          ? 'mb-2 font-semibold text-indigo-700 dark:text-indigo-300'
                          : 'mb-2'
                      }>Listening Time by Service:</div>
                      <ul className={
                        colorMode === 'colorful'
                          ? 'space-y-1 text-indigo-700 dark:text-indigo-300'
                          : 'space-y-1'
                      }>
                        {Object.entries(filteredStats.serviceListeningTime).map(([service, time]) => (
                          <li key={service} className="flex justify-between items-center">
                            <span>{service}:</span>
                            <span>{formatDuration(time)}</span>
                          </li>
                        ))}
                        {filteredStats.serviceListeningTime.lastfm && Object.keys(filteredStats.serviceListeningTime).length > 1 && (
                          <li className={`text-xs mt-1 opacity-50 ${
                            colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : ''
                          }`}>
                            last.fm time only counts plays not found in other services (duplicates removed)
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Your Years — hours per calendar year */}
              {yearlyTotals.length > 1 && (
                <div className={
                  colorMode === 'colorful'
                    ? 'mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 shadow-[1px_1px_0_0_#4338ca] dark:shadow-[1px_1px_0_0_#4f46e5]'
                    : `mt-4 p-4 border rounded ${isDarkMode ? 'border-[#4169E1] bg-black shadow-[1px_1px_0_0_#4169E1]' : 'border-black bg-white shadow-[1px_1px_0_0_black]'}`
                }>
                  <div className="flex items-baseline justify-between mb-3">
                    <h4 className={
                      colorMode === 'colorful'
                        ? 'text-lg font-semibold text-indigo-700 dark:text-indigo-300'
                        : 'text-lg font-semibold'
                    }>Your Years</h4>
                    {peakYear && (
                      <span className={
                        colorMode === 'colorful'
                          ? 'text-xs text-indigo-600 dark:text-indigo-400'
                          : 'text-xs opacity-70'
                      }>peak: {peakYear.year} · {formatDuration(peakYear.ms)}</span>
                    )}
                  </div>
                  <div className={`flex items-end gap-1 h-28 overflow-x-auto pb-1 ${
                    colorMode === 'colorful'
                      ? 'text-indigo-500 dark:text-indigo-400'
                      : (isDarkMode ? 'text-[#4169E1]' : 'text-black')
                  }`}>
                    {yearlyTotals.map(({ year, ms }) => {
                      const hPct = peakYear?.ms ? Math.max(2, Math.round((ms / peakYear.ms) * 100)) : 0;
                      const isPeak = year === peakYear?.year;
                      const label = formatDuration(ms);
                      // Strip is h-28 (112px); vertical text needs ~6.5px per character
                      const fitsInside = (hPct / 100) * 112 >= label.length * 6.5 + 10;
                      const yearLabelColor = colorMode === 'colorful'
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : (isDarkMode ? 'text-white' : 'text-black');
                      return (
                        <div key={year} className="flex flex-col items-center justify-end flex-1 min-w-[2rem] h-full" title={`${year}: ${formatDuration(ms)}`}>
                          {/* Too short for knockout text — hours float above the bar */}
                          {!fitsInside && (
                            <span
                              data-vlabel
                              className={`text-[10px] leading-none mb-1 ${isPeak ? 'font-bold' : 'font-medium'} ${yearLabelColor}`}
                              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                            >{label}</span>
                          )}
                          <div
                            className={`w-full rounded-t bg-current overflow-hidden flex items-center justify-center ${isPeak ? '' : 'opacity-60'}`}
                            style={{ height: `${hPct}%` }}
                          >
                            {/* Hours knocked out of the middle of the bar, reading bottom-to-top */}
                            {fitsInside && (
                              <span
                                data-vlabel
                                className={`text-[10px] leading-none ${isPeak ? 'font-bold' : 'font-medium'} ${
                                  colorMode === 'colorful'
                                    ? 'text-indigo-100 dark:text-indigo-900'
                                    : (isDarkMode ? 'text-black' : 'text-white')
                                }`}
                                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                              >{label}</span>
                            )}
                          </div>
                          <div className={`text-[10px] leading-tight mt-1 ${isPeak ? 'font-bold' : 'opacity-70'} ${yearLabelColor}`}>{String(year).slice(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            <div ref={recordsRef} className={`${shareWrapCls} mt-4`}>
              {/* Records & Firsts */}
              {records && (() => {
                const cardCls = colorMode === 'colorful'
                  ? 'p-3 rounded border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-800'
                  : `p-3 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`;
                const labelCls = colorMode === 'colorful' ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1' : 'text-xs text-gray-500 dark:text-gray-400 mb-1';
                const mainCls = colorMode === 'colorful' ? 'font-medium text-indigo-700 dark:text-indigo-300' : 'font-medium';
                const subCls = colorMode === 'colorful' ? 'text-sm text-indigo-600 dark:text-indigo-400' : 'text-sm text-gray-600 dark:text-gray-400';
                const strongCls = colorMode === 'colorful' ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300' : 'text-sm font-semibold';
                const Card = ({ label, children }) => (
                  <div className={cardCls}>
                    <div className={labelCls}>{label}</div>
                    {children}
                  </div>
                );
                // Phones: entries stack as compact wrapping rows (three ~70px
                // columns truncate everything); sm+ keeps them side by side.
                const Top3 = ({ label, items, render }) => (
                  items && items.length > 0 ? (
                    <div className={`${cardCls} sm:col-span-2`}>
                      <div className={labelCls}>{label}</div>
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-3">
                        {items.map((item, i) => (
                          <div key={i} className="min-w-0 flex flex-wrap items-baseline gap-x-2 [&>div]:max-w-full sm:block sm:flex-1 text-sm">{render(item, i)}</div>
                        ))}
                      </div>
                    </div>
                  ) : null
                );
                const spanLabel = (s) => {
                  const years = (s.last - s.first) / (365.25 * 86400000);
                  if (years >= 2) return `${Math.floor(years)} years`;
                  if (years >= 1) return 'over a year';
                  return `${Math.max(1, Math.round(years * 12))} months`;
                };
                const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                return (
                  <div className={
                    colorMode === 'colorful'
                      ? 'mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-100 dark:bg-indigo-900 shadow-[1px_1px_0_0_#4338ca] dark:shadow-[1px_1px_0_0_#4f46e5]'
                      : `mt-4 p-4 border rounded ${isDarkMode ? 'border-[#4169E1] bg-black shadow-[1px_1px_0_0_#4169E1]' : 'border-black bg-white shadow-[1px_1px_0_0_black]'}`
                  }>
                    <h4 className={
                      colorMode === 'colorful'
                        ? 'text-lg font-semibold mb-4 text-indigo-700 dark:text-indigo-300'
                        : 'text-lg font-semibold mb-4'
                    }>Records &amp; Firsts</h4>
                    <div data-rec-grid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      {records.first && (
                        <Card label="First play:">
                          <div className={`${mainCls} truncate`} title={records.first.track}>&quot;{records.first.track}&quot;</div>
                          {records.first.artist && <div className={`${subCls} truncate`}>by {records.first.artist}</div>}
                          <div className={strongCls}>{records.first.date.toLocaleDateString()}</div>
                        </Card>
                      )}
                      {records.milestone && (
                        <Card label={`Play #${records.milestone.n.toLocaleString()}:`}>
                          <div className={`${mainCls} truncate`} title={records.milestone.track}>&quot;{records.milestone.track || 'Unknown'}&quot;</div>
                          {records.milestone.artist && <div className={`${subCls} truncate`}>by {records.milestone.artist}</div>}
                          <div className={strongCls}>{records.milestone.date.toLocaleDateString()}</div>
                        </Card>
                      )}
                      <Card label="Days with music:">
                        <div className={mainCls}>{records.daysWithMusic.toLocaleString()} of {records.spanDays.toLocaleString()} days</div>
                        <div className={strongCls}>{Math.round((records.daysWithMusic / records.spanDays) * 100)}%</div>
                      </Card>
                      <Top3 label="Biggest days:" items={records.topDays} render={(d, i) => (
                        <>
                          <div className={i === 0 ? mainCls : subCls}>{fmtDay(d.date)}</div>
                          <div className={i === 0 ? strongCls : subCls}>{formatDuration(d.ms)}</div>
                          {d.artist && <div className={`${subCls} truncate`} title={d.artist}>mostly {d.artist}</div>}
                        </>
                      )} />
                      <Top3 label="Busiest days:" items={records.topBusiest} render={(d, i) => (
                        <>
                          <div className={i === 0 ? mainCls : subCls}>{d.count.toLocaleString()} plays</div>
                          <div className={i === 0 ? strongCls : subCls}>{fmtDay(d.date)}</div>
                        </>
                      )} />
                      <Top3 label="Longest sessions:" items={records.sessions} render={(s, i) => (
                        <>
                          <div className={i === 0 ? mainCls : subCls}>{formatDuration(s.ms)}</div>
                          <div className={`${subCls} truncate`}>{s.count.toLocaleString()} tracks</div>
                          <div className={i === 0 ? strongCls : subCls}>{s.date.toLocaleDateString()}</div>
                        </>
                      )} />
                      <Top3 label="Longest relationships:" items={records.relationships} render={(s, i) => (
                        <>
                          <div className={`${i === 0 ? mainCls : subCls} truncate`} title={s.track}>&quot;{s.track}&quot;</div>
                          {s.artist && <div className={`${subCls} truncate`}>by {s.artist}</div>}
                          <div className={i === 0 ? strongCls : subCls}>{new Date(s.first).getFullYear()} → {new Date(s.last).getFullYear()} · {spanLabel(s)}</div>
                        </>
                      )} />
                      <Top3 label="Songs on repeat:" items={filteredStreaks?.consecutivePlays?.top3?.songs} render={(s, i) => (
                        <>
                          <div className={`${i === 0 ? mainCls : subCls} truncate`} title={s.trackName}>&quot;{s.trackName}&quot;</div>
                          {s.artist && <div className={`${subCls} truncate`}>by {s.artist}</div>}
                          <div className={i === 0 ? strongCls : subCls}>{s.count} in a row</div>
                        </>
                      )} />
                      <Top3 label="Artist marathons:" items={filteredStreaks?.consecutivePlays?.top3?.artists} render={(s, i) => (
                        <>
                          <div className={`${i === 0 ? mainCls : subCls} truncate`} title={s.name}>{s.name}</div>
                          <div className={i === 0 ? strongCls : subCls}>{s.count} plays straight</div>
                        </>
                      )} />
                      <Top3 label="Album sessions:" items={filteredStreaks?.consecutivePlays?.top3?.albums} render={(s, i) => (
                        <>
                          <div className={`${i === 0 ? mainCls : subCls} truncate`} title={s.name}>{s.name}</div>
                          {s.artist && <div className={`${subCls} truncate`}>by {s.artist}</div>}
                          <div className={i === 0 ? strongCls : subCls}>{s.count} tracks in a row</div>
                        </>
                      )} />
                      <Top3 label="Daily streaks:" items={filteredStreaks?.overallDaily?.top3} render={(s, i) => (
                        <>
                          <div className={i === 0 ? mainCls : subCls}>{s.count} days</div>
                          <div className={`${subCls} truncate`}>{new Date(s.startDate).toLocaleDateString()} — {new Date(s.endDate).toLocaleDateString()}</div>
                        </>
                      )} />
                      <Top3 label="Most dedicated songs:" items={filteredStreaks?.topSongDaily?.top3} render={(s, i) => (
                        <>
                          <div className={`${i === 0 ? mainCls : subCls} truncate`} title={s.trackName}>&quot;{s.trackName}&quot;</div>
                          {s.artist && <div className={`${subCls} truncate`}>by {s.artist}</div>}
                          <div className={i === 0 ? strongCls : subCls}>{s.count} days in a row</div>
                        </>
                      )} />
                      <Top3 label="Most consistent albums:" items={filteredStreaks?.topAlbumDaily?.top3} render={(s, i) => (
                        <>
                          <div className={`${i === 0 ? mainCls : subCls} truncate`} title={s.name}>{s.name}</div>
                          {s.artist && <div className={`${subCls} truncate`}>by {s.artist}</div>}
                          <div className={i === 0 ? strongCls : subCls}>{s.count} days straight</div>
                        </>
                      )} />
                      <Top3 label="Longest silences:" items={records.gaps} render={(g, i) => (
                        <>
                          <div className={i === 0 ? mainCls : subCls}>{g.days} days</div>
                          <div className={`${subCls} truncate`}>{new Date(g.from).toLocaleDateString()} — {new Date(g.to).toLocaleDateString()}</div>
                          {g.brokenBy && <div className={`${i === 0 ? strongCls : subCls} truncate`} title={g.brokenBy.track}>broken by &quot;{g.brokenBy.track}&quot;</div>}
                        </>
                      )} />
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
  ) : null;
}
