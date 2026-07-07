'use client';
import React from 'react';

// ---------------------------------------------------------------------------
// Shared bits for ranking grid cards (Artists / Albums / Songs).
//
// Both components color themselves with `bg-current`, so they inherit the
// card's accent text color — one implementation works for every tab theme,
// dark mode, and minimal mode.
// ---------------------------------------------------------------------------

// Filled rank pill for the top 3, muted "#N" for everyone else.
export function RankBadge({ rank, isDarkMode, className = '' }) {
  if (rank <= 3) {
    return (
      <span className={`shrink-0 min-w-[1.25rem] h-5 px-1 inline-flex items-center justify-center rounded-full bg-current ${className}`}>
        <span className={`text-xs font-extrabold leading-none ${isDarkMode ? 'text-gray-900' : 'text-white'}`}>
          {rank}
        </span>
      </span>
    );
  }
  return <span className={`shrink-0 min-w-[1.25rem] pr-1 text-left text-sm opacity-50 ${className}`}>#{rank}</span>;
}

// Rank-movement chip vs the previous period: green climb, red drop,
// italic "new" for unranked (suppressable via showNew when the previous
// list is capped and absence isn't conclusive). Renders nothing on a hold.
export function RankChip({ rank, prevRank, prevLabel, showNew = true }) {
  if (prevRank == null) {
    if (!showNew) return null;
    return (
      <span className="shrink-0 text-[10px] font-bold leading-none italic opacity-60" title={`not ranked in ${prevLabel}`}>
        new
      </span>
    );
  }
  const delta = prevRank - rank;
  if (delta === 0) return null;
  return (
    <span
      className={`shrink-0 text-[10px] font-bold leading-none ${
        delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
      }`}
      title={`#${prevRank} in ${prevLabel}`}
    >
      {delta > 0 ? `▲${delta}` : `▼${-delta}`}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Previous-period ranking helpers for the chips.
// ---------------------------------------------------------------------------

// Rank every entity for one calendar month straight from the raw play data.
// keyOf maps an entry to the same key the displayed list uses.
export function monthRanksFromRaw(rawPlayData, ym, keyOf, metric = 'totalPlayed') {
  const totals = new Map();
  for (const e of rawPlayData || []) {
    if (!e.ms_played || e.ms_played < 30000) continue;
    const d = new Date(e.ts);
    if (isNaN(d.getTime())) continue;
    const entryYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (entryYm !== ym) continue;
    const key = keyOf(e);
    if (!key) continue;
    const t = totals.get(key) || { ms: 0, count: 0 };
    t.ms += e.ms_played;
    t.count++;
    totals.set(key, t);
  }
  const ranked = [...totals.entries()].sort((a, b) =>
    metric === 'playCount' ? b[1].count - a[1].count : b[1].ms - a[1].ms
  );
  const map = new Map();
  ranked.forEach(([key], i) => map.set(key, i + 1));
  return map;
}

export function prevMonthOf(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Rank every entity for one calendar day straight from the raw play data.
export function dayRanksFromRaw(rawPlayData, ymd, keyOf, metric = 'totalPlayed') {
  const totals = new Map();
  for (const e of rawPlayData || []) {
    if (!e.ms_played || e.ms_played < 30000) continue;
    const d = new Date(e.ts);
    if (isNaN(d.getTime())) continue;
    const entryYmd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (entryYmd !== ymd) continue;
    const key = keyOf(e);
    if (!key) continue;
    const t = totals.get(key) || { ms: 0, count: 0 };
    t.ms += e.ms_played;
    t.count++;
    totals.set(key, t);
  }
  const ranked = [...totals.entries()].sort((a, b) =>
    metric === 'playCount' ? b[1].count - a[1].count : b[1].ms - a[1].ms
  );
  const map = new Map();
  ranked.forEach(([key], i) => map.set(key, i + 1));
  return map;
}

export function prevDayOf(ymd) {
  const [y, m, day] = ymd.split('-').map(Number);
  const d = new Date(y, m - 1, day - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayLabel(ymd) {
  const [y, m, day] = ymd.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Slim bar showing this item's metric relative to rank #1 (max), with a label.
export function RankBar({ value = 0, max = 0, label, className = '' }) {
  const pct = max > 0 ? Math.max(3, Math.round((Math.min(value, max) / max) * 100)) : 0;
  return (
    <div className={`mt-2 flex items-center gap-1.5 ${className}`}>
      <div className="relative flex-1 h-1.5 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-current opacity-20" />
        <div className="absolute inset-y-0 left-0 bg-current rounded-full" style={{ width: `${pct}%` }} />
      </div>
      {label && (
        <span className="text-[10px] leading-none whitespace-nowrap opacity-80 shrink-0">{label}</span>
      )}
    </div>
  );
}
