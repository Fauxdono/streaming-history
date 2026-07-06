'use client';
import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import ExportButton from '../ExportButton.js';
import Top100Export from '../Top100Export.js';
import { filterDataByDate } from '../streaming-adapter.js';

const localDayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Statistics tab content.
export default function StatsTab({
  briefObsessions,
  colorMode,
  isDarkMode,
  displayedAlbums,
  displayedArtists,
  filteredStats,
  filteredStreaks,
  formatDuration,
  processedData,
  rawPlayData,
  selectedStreaksYear,
  streaks,
  songsByYear,
  stats,
  topAlbums,
  topArtists,
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
    let first = null;
    const dayMs = {};
    for (const e of data) {
      if (!e.ms_played || e.ms_played < 30000) continue;
      const d = new Date(e.ts);
      if (isNaN(d.getTime())) continue;
      if (e.master_metadata_track_name && (!first || d < first.date)) {
        first = { date: d, track: e.master_metadata_track_name, artist: e.master_metadata_album_artist_name };
      }
      const key = localDayKey(d);
      dayMs[key] = (dayMs[key] || 0) + e.ms_played;
    }
    const days = Object.keys(dayMs).sort();
    if (!days.length) return null;

    // Biggest day — ignore days whose total exceeds 24h: those are data
    // artifacts (e.g. Spotify offline-sync batches reporting multi-hour
    // ms_played per song), not real listening days.
    const plausible = days.filter(k => dayMs[k] <= 86400000);
    const candidates = plausible.length ? plausible : days;
    let bestDay = candidates[0];
    for (const k of candidates) if (dayMs[k] > dayMs[bestDay]) bestDay = k;
    // Top artist on the biggest day (second, narrow pass)
    const artistMs = {};
    for (const e of data) {
      if (!e.ms_played || e.ms_played < 30000) continue;
      const d = new Date(e.ts);
      if (isNaN(d.getTime()) || localDayKey(d) !== bestDay) continue;
      const a = e.master_metadata_album_artist_name;
      if (a) artistMs[a] = (artistMs[a] || 0) + e.ms_played;
    }
    const bestDayArtist = Object.entries(artistMs).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Longest silence between listening days
    let gap = null;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]), cur = new Date(days[i]);
      const diff = Math.round((cur - prev) / 86400000) - 1;
      if (diff > 0 && (!gap || diff > gap.days)) gap = { days: diff, from: days[i - 1], to: days[i] };
    }

    const spanDays = Math.round((new Date(days[days.length - 1]) - new Date(days[0])) / 86400000) + 1;
    return {
      first,
      biggestDay: { date: bestDay, ms: dayMs[bestDay], artist: bestDayArtist },
      gap,
      daysWithMusic: days.length,
      spanDays,
    };
  }, [rawPlayData, selectedStreaksYear]);

  // "% of waking hours" equivalence for the hero (16 waking hours/day)
  const wakingPct = useMemo(() => {
    if (!records || records.spanDays < 60 || !filteredStats?.totalListeningTime) return null;
    const pct = (filteredStats.totalListeningTime / (records.spanDays * 16 * 3600000)) * 100;
    return pct >= 0.1 ? pct : null;
  }, [records, filteredStats]);

  return stats ? (
          <div className={
            colorMode === 'colorful'
              ? 'p-2 sm:p-4 bg-indigo-200 dark:bg-indigo-900 rounded border-2 border-indigo-300 dark:border-indigo-700'
              : `p-2 sm:p-4 border ${isDarkMode ? 'border-[#4169E1] shadow-[1px_1px_0_0_#4169E1]' : 'border-black shadow-[1px_1px_0_0_black]'}`
          }>
            {/* Desktop title */}
            <div className="hidden sm:block mb-4">
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hero: the number that matters */}
                <div className="flex flex-col justify-center py-2">
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

                  {/* Data quality footnote */}
                  <details className={`mt-3 text-sm ${
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
                    ? 'p-4 border space-y-2 bg-indigo-100 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700 rounded text-indigo-700 dark:text-indigo-300'
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
                    ? 'mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
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

              {/* Records & Firsts */}
              {records && (
                <div className={
                  colorMode === 'colorful'
                    ? 'mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-100 dark:bg-indigo-900'
                    : `mt-4 p-4 border rounded ${isDarkMode ? 'border-[#4169E1] bg-black shadow-[1px_1px_0_0_#4169E1]' : 'border-black bg-white shadow-[1px_1px_0_0_black]'}`
                }>
                  <h4 className={
                    colorMode === 'colorful'
                      ? 'text-lg font-semibold mb-4 text-indigo-700 dark:text-indigo-300'
                      : 'text-lg font-semibold mb-4'
                  }>Records &amp; Firsts</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {records.first && (
                      <div className={
                        colorMode === 'colorful'
                          ? 'p-3 rounded border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-800'
                          : `p-3 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`
                      }>
                        <div className={colorMode === 'colorful' ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1' : 'text-xs text-gray-500 dark:text-gray-400 mb-1'}>First play:</div>
                        <div className={colorMode === 'colorful' ? 'font-medium text-indigo-700 dark:text-indigo-300' : 'font-medium'}>&quot;{records.first.track}&quot;</div>
                        {records.first.artist && <div className={colorMode === 'colorful' ? 'text-sm text-indigo-600 dark:text-indigo-400' : 'text-sm text-gray-600 dark:text-gray-400'}>by {records.first.artist}</div>}
                        <div className={colorMode === 'colorful' ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300' : 'text-sm font-semibold'}>{records.first.date.toLocaleDateString()}</div>
                      </div>
                    )}
                    <div className={
                      colorMode === 'colorful'
                        ? 'p-3 rounded border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-800'
                        : `p-3 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`
                    }>
                      <div className={colorMode === 'colorful' ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1' : 'text-xs text-gray-500 dark:text-gray-400 mb-1'}>Biggest day:</div>
                      <div className={colorMode === 'colorful' ? 'font-medium text-indigo-700 dark:text-indigo-300' : 'font-medium'}>{new Date(records.biggestDay.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                      <div className={colorMode === 'colorful' ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300' : 'text-sm font-semibold'}>{formatDuration(records.biggestDay.ms)} of music</div>
                      {records.biggestDay.artist && <div className={colorMode === 'colorful' ? 'text-sm text-indigo-600 dark:text-indigo-400' : 'text-sm text-gray-600 dark:text-gray-400'}>mostly {records.biggestDay.artist}</div>}
                    </div>
                    {records.gap && records.gap.days > 1 && (
                      <div className={
                        colorMode === 'colorful'
                          ? 'p-3 rounded border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-800'
                          : `p-3 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`
                      }>
                        <div className={colorMode === 'colorful' ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1' : 'text-xs text-gray-500 dark:text-gray-400 mb-1'}>Longest silence:</div>
                        <div className={colorMode === 'colorful' ? 'font-medium text-indigo-700 dark:text-indigo-300' : 'font-medium'}>{records.gap.days} days</div>
                        <div className={colorMode === 'colorful' ? 'text-sm text-indigo-600 dark:text-indigo-400' : 'text-sm text-gray-600 dark:text-gray-400'}>{new Date(records.gap.from).toLocaleDateString()} — {new Date(records.gap.to).toLocaleDateString()}</div>
                      </div>
                    )}
                    <div className={
                      colorMode === 'colorful'
                        ? 'p-3 rounded border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-800'
                        : `p-3 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`
                    }>
                      <div className={colorMode === 'colorful' ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1' : 'text-xs text-gray-500 dark:text-gray-400 mb-1'}>Days with music:</div>
                      <div className={colorMode === 'colorful' ? 'font-medium text-indigo-700 dark:text-indigo-300' : 'font-medium'}>{records.daysWithMusic.toLocaleString()} of {records.spanDays.toLocaleString()} days</div>
                      <div className={colorMode === 'colorful' ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300' : 'text-sm font-semibold'}>{Math.round((records.daysWithMusic / records.spanDays) * 100)}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Data Section */}
              {stats && processedData.length > 0 && (
                <div className={
                  colorMode === 'colorful'
                    ? 'mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-100 dark:bg-indigo-800'
                    : `mt-4 p-4 border rounded ${isDarkMode ? 'border-[#4169E1] bg-black shadow-[1px_1px_0_0_#4169E1]' : 'border-black bg-white shadow-[1px_1px_0_0_black]'}`
                }>
                  <div className="flex items-center gap-2 mb-3">
                    <Download size={18} className={colorMode === 'colorful' ? 'text-indigo-600 dark:text-indigo-400' : ''} />
                    <h4 className={
                      colorMode === 'colorful'
                        ? 'font-medium text-indigo-700 dark:text-indigo-300'
                        : 'font-medium'
                    }>Download Your Data</h4>
                  </div>
                  <p className={
                    colorMode === 'colorful'
                      ? 'text-sm text-indigo-600 dark:text-indigo-400 mb-3'
                      : `text-sm mb-3 ${isDarkMode ? 'text-white' : 'text-black'}`
                  }>
                    Save your streaming analysis to your device as Excel or JSON.
                  </p>
                  <ExportButton
                    stats={stats}
                    topArtists={displayedArtists || []}
                    topAlbums={displayedAlbums || []}
                    processedData={processedData || []}
                    briefObsessions={briefObsessions || []}
                    songsByYear={songsByYear || {}}
                    rawPlayData={rawPlayData || []}
                    formatDuration={formatDuration}
                    colorMode={colorMode}
                  />
                  <div className={`mt-3 pt-3 border-t ${colorMode === 'colorful' ? 'border-indigo-200 dark:border-indigo-600' : isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <p className={
                      colorMode === 'colorful'
                        ? 'text-sm text-indigo-600 dark:text-indigo-400 mb-2'
                        : `text-sm mb-2 ${isDarkMode ? 'text-white' : 'text-black'}`
                    }>
                      Lightweight export of your top 100 rankings — paste into AI chats or save for later.
                    </p>
                    <Top100Export
                      processedData={processedData || []}
                      songsByYear={songsByYear || {}}
                      topArtists={displayedArtists || []}
                      topAlbums={displayedAlbums || []}
                      formatDuration={formatDuration}
                      colorMode={colorMode}
                    />
                  </div>
                </div>
              )}

              {/* Listening Streaks Section */}
              {stats && (streaks || rawPlayData?.length > 0) && (
                <div className={
                  colorMode === 'colorful'
                    ? 'mt-4 p-4 border border-indigo-300 dark:border-indigo-700 rounded bg-indigo-100 dark:bg-indigo-900'
                    : `mt-4 p-4 border rounded ${isDarkMode ? 'border-[#4169E1] bg-black shadow-[1px_1px_0_0_#4169E1]' : 'border-black bg-white shadow-[1px_1px_0_0_black]'}`
                }>
                  <h4 className={
                    colorMode === 'colorful'
                      ? 'text-lg font-semibold mb-4 text-indigo-700 dark:text-indigo-300'
                      : 'text-lg font-semibold mb-4'
                  }>Listening Streaks</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Back-to-Back Plays Column */}
                    <div className={
                      colorMode === 'colorful'
                        ? 'p-3 rounded border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-800'
                        : `p-3 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`
                    }>
                      <h5 className={
                        colorMode === 'colorful'
                          ? 'font-medium mb-3 text-indigo-600 dark:text-indigo-400'
                          : 'font-medium mb-3'
                      }>Back-to-Back Plays</h5>

                      {/* Song on repeat */}
                      {filteredStreaks?.consecutivePlays?.song && (
                        <div className="mb-3">
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Song on repeat:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>"{filteredStreaks.consecutivePlays.song.trackName}"</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>by {filteredStreaks.consecutivePlays.song.artist}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.consecutivePlays.song.count} plays in a row</div>
                        </div>
                      )}

                      {/* Artist marathon */}
                      {filteredStreaks?.consecutivePlays?.artist && (
                        <div className="mb-3">
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Artist marathon:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>{filteredStreaks.consecutivePlays.artist.name}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.consecutivePlays.artist.count} consecutive plays</div>
                        </div>
                      )}

                      {/* Album session */}
                      {filteredStreaks?.consecutivePlays?.album && (
                        <div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Album session:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>{filteredStreaks.consecutivePlays.album.name}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>by {filteredStreaks.consecutivePlays.album.artist}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.consecutivePlays.album.count} tracks in a row</div>
                        </div>
                      )}

                      {!filteredStreaks?.consecutivePlays?.song && !filteredStreaks?.consecutivePlays?.artist && !filteredStreaks?.consecutivePlays?.album && (
                        <div className={
                          colorMode === 'colorful'
                            ? 'text-sm text-indigo-500 dark:text-indigo-400'
                            : 'text-sm text-gray-500'
                        }>No consecutive play streaks found</div>
                      )}
                    </div>

                    {/* Daily Streaks Column */}
                    <div className={
                      colorMode === 'colorful'
                        ? 'p-3 rounded border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-800'
                        : `p-3 rounded border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`
                    }>
                      <h5 className={
                        colorMode === 'colorful'
                          ? 'font-medium mb-3 text-indigo-600 dark:text-indigo-400'
                          : 'font-medium mb-3'
                      }>Daily Streaks</h5>

                      {/* Overall listening streak */}
                      {filteredStreaks?.overallDaily && (
                        <div className="mb-3">
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Longest listening streak:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>{filteredStreaks.overallDaily.count} consecutive days</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>{new Date(filteredStreaks.overallDaily.startDate).toLocaleDateString()} - {new Date(filteredStreaks.overallDaily.endDate).toLocaleDateString()}</div>
                        </div>
                      )}

                      {/* Most dedicated song */}
                      {filteredStreaks?.topSongDaily && (
                        <div className="mb-3">
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Most dedicated song:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>"{filteredStreaks.topSongDaily.trackName}"</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>by {filteredStreaks.topSongDaily.artist}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.topSongDaily.count} days in a row</div>
                        </div>
                      )}

                      {/* Most consistent album */}
                      {filteredStreaks?.topAlbumDaily && (
                        <div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-xs text-indigo-500 dark:text-indigo-400 mb-1'
                              : 'text-xs text-gray-500 dark:text-gray-400 mb-1'
                          }>Most consistent album:</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'font-medium text-indigo-700 dark:text-indigo-300'
                              : 'font-medium'
                          }>{filteredStreaks.topAlbumDaily.name}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm text-indigo-600 dark:text-indigo-400'
                              : 'text-sm text-gray-600 dark:text-gray-400'
                          }>by {filteredStreaks.topAlbumDaily.artist}</div>
                          <div className={
                            colorMode === 'colorful'
                              ? 'text-sm font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-sm font-semibold'
                          }>{filteredStreaks.topAlbumDaily.count} consecutive days</div>
                        </div>
                      )}

                      {!filteredStreaks?.overallDaily && !filteredStreaks?.topSongDaily && !filteredStreaks?.topAlbumDaily && (
                        <div className={
                          colorMode === 'colorful'
                            ? 'text-sm text-indigo-500 dark:text-indigo-400'
                            : 'text-sm text-gray-500'
                        }>No daily streaks found</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
  ) : null;
}
