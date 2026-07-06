// ---------------------------------------------------------------------------
// Data-artifact repair.
//
// Some exports contain corrupted play durations. The known case is Spotify
// offline-sync bursts: a device reconnects and reports dozens of plays within
// seconds of each other, each claiming hours of ms_played (observed: 20 songs
// "played" 2.7–5.4h each inside a 29-second window). These inflate totals,
// day records, and rankings.
//
// Detection is based on physical impossibility, not statistics: three or more
// long plays (≥30 min each) can't all complete within a 60-second window on
// one source. Clustered long plays get clamped to a normal song length; a
// lone long play (a podcast, a DJ mix) is never touched.
// ---------------------------------------------------------------------------

const LONG_PLAY_MS = 30 * 60 * 1000;  // "long play" threshold
const WINDOW_MS = 60 * 1000;          // clustering window
const MIN_CLUSTER = 3;                // impossible-together count
const CLAMP_TO_MS = 210000;           // 3.5 min — the app's default song length

export function clampSyncBursts(entries) {
  // Collect long plays per source with parsed timestamps
  const bySource = new Map();
  entries.forEach((e, i) => {
    if (!e.ms_played || e.ms_played < LONG_PLAY_MS) return;
    const t = new Date(e.ts).getTime();
    if (isNaN(t)) return;
    if (!bySource.has(e.source)) bySource.set(e.source, []);
    bySource.get(e.source).push({ i, t });
  });

  let clamped = 0;
  let reclaimedMs = 0;

  for (const longPlays of bySource.values()) {
    longPlays.sort((a, b) => a.t - b.t);
    const flagged = new Array(longPlays.length).fill(false);
    let lo = 0;
    for (let k = 0; k < longPlays.length; k++) {
      while (longPlays[k].t - longPlays[lo].t > WINDOW_MS) lo++;
      if (k - lo + 1 >= MIN_CLUSTER) {
        for (let m = lo; m <= k; m++) flagged[m] = true;
      }
    }
    longPlays.forEach(({ i }, idx) => {
      if (!flagged[idx]) return;
      const e = entries[i];
      reclaimedMs += e.ms_played - CLAMP_TO_MS;
      e.ms_played = CLAMP_TO_MS;
      e.sync_burst_clamped = true;
      clamped++;
    });
  }

  return { clamped, reclaimedMs };
}
