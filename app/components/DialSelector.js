'use client';
import React, { useCallback, useMemo } from 'react';
import { PALETTES } from './theme.js';

// ---- Theme-aware color resolution ------------------------------------------

function getDialColors(colorMode, colorTheme, isDark) {
  if (colorMode === 'minimal') {
    if (isDark) return {
      shellBg:      'radial-gradient(circle at 38% 28%, #1a1a1a 0%, #080808 70%)',
      shellShadow:  '0 0 0 2px #4169E1, 5px 5px 0 0 rgba(65,105,225,0.7), inset 0 2px 4px rgba(255,255,255,0.05)',
      rimStroke:    'rgba(65,105,225,0.25)',
      trackFill:    'rgba(255,255,255,0.04)',
      trackDash:    'rgba(65,105,225,0.2)',
      centerBg:     'radial-gradient(circle at 42% 35%, #1c1c1c, #080808)',
      centerBorder: 'rgba(65,105,225,0.35)',
      centerShadow: 'inset 2px 2px 0 0 rgba(0,0,0,0.6)',
      itemDefault:  'rgba(255,255,255,0.07)',
      itemBorder:   'rgba(65,105,225,0.4)',
      itemColor:    'rgba(255,255,255,0.6)',
      itemActive:   '#ffffff',
      itemActiveBg: '#4169E1',
      itemActiveBorder: 'rgba(255,255,255,0.4)',
      itemShadow:   '#4169E1',
      labelColor:   'rgba(255,255,255,0.92)',
      labelSub:     'rgba(255,255,255,0.5)',
      glossGrad:    ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)'],
      rangeArc:     'rgba(65,105,225,0.35)',
      modeBg:       '#4169E1',
      modeShadow:   'rgba(65,105,225,0.7)',
      toggleActive: 'rgba(65,105,225,0.5)',
    };
    // minimal light
    return {
      shellBg:      'radial-gradient(circle at 38% 28%, #ffffff 0%, #f0f0f0 60%, #e2e2e2 100%)',
      shellShadow:  '0 0 0 2px #000000, 5px 5px 0 0 rgba(0,0,0,0.85), inset 0 2px 4px rgba(255,255,255,0.8)',
      rimStroke:    'rgba(0,0,0,0.2)',
      trackFill:    'rgba(0,0,0,0.06)',
      trackDash:    'rgba(0,0,0,0.12)',
      centerBg:     'radial-gradient(circle at 42% 35%, #ffffff, #e8e8e8)',
      centerBorder: 'rgba(0,0,0,0.3)',
      centerShadow: 'inset 2px 2px 0 0 rgba(0,0,0,0.12)',
      itemDefault:  '#ffffff',
      itemBorder:   'rgba(0,0,0,0.35)',
      itemColor:    'rgba(0,0,0,0.7)',
      itemActive:   '#ffffff',
      itemActiveBg: '#000000',
      itemActiveBorder: 'rgba(0,0,0,0.6)',
      itemShadow:   '#000000',
      labelColor:   'rgba(0,0,0,0.9)',
      labelSub:     'rgba(0,0,0,0.5)',
      glossGrad:    ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)'],
      rangeArc:     'rgba(0,0,0,0.15)',
      modeBg:       '#000000',
      modeShadow:   'rgba(0,0,0,0.5)',
      toggleActive: 'rgba(0,0,0,0.2)',
    };
  }

  // Colorful — pastel "frosting" shell with the app's skeuomorphic hard-offset
  // shadows, tinted by the active tab's palette.
  const p = PALETTES[colorTheme] ?? PALETTES.teal;

  if (isDark) return {
    shellBg:      `radial-gradient(circle at 38% 28%, ${p.c800} 0%, ${p.c900} 60%, #10101a 100%)`,
    shellShadow:  `0 0 0 2px ${p.c700}, 5px 5px 0 0 ${p.c300}, inset 0 2px 6px rgba(255,255,255,0.07)`,
    rimStroke:    p.c700,
    trackFill:    'rgba(255,255,255,0.06)',
    trackDash:    p.c700,
    centerBg:     `radial-gradient(circle at 42% 35%, ${p.c800}, ${p.c900})`,
    centerBorder: p.c700,
    centerShadow: 'inset 2px 2px 0 0 rgba(0,0,0,0.5)',
    itemDefault:  p.c800,
    itemBorder:   p.c700,
    itemColor:    p.c200,
    itemActive:   '#ffffff',
    itemActiveBg: p.c600,
    itemActiveBorder: p.c300,
    itemShadow:   p.c300,
    labelColor:   p.c100,
    labelSub:     p.c300,
    glossGrad:    ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)'],
    rangeArc:     p.c700,
    modeBg:       p.c600,
    modeShadow:   p.c300,
    toggleActive: p.c700,
  };

  return {
    shellBg:      `radial-gradient(circle at 38% 28%, #ffffff 0%, ${p.c50} 45%, ${p.c100} 100%)`,
    shellShadow:  `0 0 0 2px ${p.c300}, 5px 5px 0 0 ${p.c700}, inset 0 2px 4px rgba(255,255,255,0.8)`,
    rimStroke:    p.c300,
    trackFill:    p.c200,
    trackDash:    p.c300,
    centerBg:     `radial-gradient(circle at 42% 35%, #ffffff, ${p.c100})`,
    centerBorder: p.c300,
    centerShadow: `inset 2px 2px 0 0 ${p.c200}`,
    itemDefault:  '#ffffff',
    itemBorder:   p.c300,
    itemColor:    p.c700,
    itemActive:   '#ffffff',
    itemActiveBg: p.c500,
    itemActiveBorder: p.c700,
    itemShadow:   p.c700,
    labelColor:   p.c800,
    labelSub:     p.c500,
    glossGrad:    ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)'],
    rangeArc:     p.c300,
    modeBg:       p.c500,
    modeShadow:   p.c700,
    toggleActive: p.c200,
  };
}

// ---------------------------------------------------------------------------
// DialSelector — circular concentric-ring year/month/day picker
//
// Growth is smooth because:
//   - Geometry (CX, CY, ring radii) is computed ONCE from yearCount only.
//   - All items live in a fixed-size inner div (S_MAX) — they never move.
//   - Only the outer clipping shell changes size (S_YEAR → S_MONTH → S_DAY).
//   - CSS transition on width/height/left/top animates the shell expanding,
//     revealing the next ring from underneath.
// ---------------------------------------------------------------------------

function getGeometry(yearCount) {
  const CENTER_R = 60;
  const YEAR_W   = 28;
  const MONTH_W  = 24;
  const DAY_W    = 22;
  const GAP      = 8;   // gap between adjacent ring edges
  const RIM      = 14;  // clearance from outermost ring edge to circle border

  // Enough radius so year items don't crowd each other
  const YEAR_R = Math.max(
    CENTER_R + GAP + YEAR_W / 2,
    Math.ceil((yearCount * 38) / (2 * Math.PI)),
  );
  const MONTH_R = YEAR_R  + YEAR_W  / 2 + GAP + MONTH_W / 2;
  const DAY_R   = MONTH_R + MONTH_W / 2 + GAP + DAY_W   / 2;

  // Three shell sizes — sized so the next ring is fully hidden when inactive.
  // S_YEAR clips just inside the inner edge of month items at 3/9 o'clock.
  // S_MONTH clips just inside the inner edge of day items at 3/9 o'clock.
  // S_DAY shows full day ring with a small rim.
  const S_YEAR  = Math.round((MONTH_R - MONTH_W / 2 - 4) * 2);
  const S_MONTH = Math.round((DAY_R   - DAY_W   / 2 - 4) * 2);
  const S_DAY   = Math.round((DAY_R   + DAY_W   / 2 + RIM) * 2);

  // Inner canvas is always S_MAX — items positioned relative to its center
  const S_MAX = S_DAY;
  const CX    = S_MAX / 2;
  const CY    = S_MAX / 2;

  return { CENTER_R, YEAR_R, MONTH_R, DAY_R, YEAR_W, MONTH_W, DAY_W,
           S_YEAR, S_MONTH, S_DAY, S_MAX, CX, CY };
}

function polar(angleDeg, r, CX, CY) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  let a1 = ((startDeg - 90) * Math.PI) / 180;
  let a2 = ((endDeg   - 90) * Math.PI) / 180;
  if (a2 <= a1) a2 += 2 * Math.PI;
  const large = a2 - a1 > Math.PI ? 1 : 0;
  return [
    `M ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`,
    `A ${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a2)} ${cy + r * Math.sin(a2)}`,
  ].join(' ');
}

// ---------------------------------------------------------------------------
export function DialSelector({ sel, pos, onDrag, onClose, colorMode = 'colorful', colorTheme = 'teal', isDark = true }) {
  const {
    mode, years, selectedYear, selectedMonth, selectedDay, days,
    showMonthSelector, showDaySelector,
    showRangeMonthDaySelectors, showRangeDaySelectors,
    setYear, setMode, setMonth, setDay,
    toggleMonthSelector, toggleDaySelector,
    toggleRangeMonthDaySelectors, toggleRangeDaySelectors,
    yearRange, tapYear,
  } = sel;

  const showMonths = mode === 'single'
    ? showMonthSelector && selectedYear !== 'all'
    : showRangeMonthDaySelectors && yearRange.startYear && yearRange.endYear;
  const showDays = mode === 'single'
    ? showDaySelector && showMonths
    : showRangeDaySelectors && showMonths;

  const yearCount = years.length + 1; // +1 for "All"
  const allItems  = ['all', ...years];

  // Theme colors
  const dc = useMemo(() => getDialColors(colorMode, colorTheme, isDark), [colorMode, colorTheme, isDark]);

  // Geometry is stable — only yearCount can change it (not showMonths/showDays)
  const geo = useMemo(() => getGeometry(yearCount), [yearCount]);
  const { CENTER_R, YEAR_R, MONTH_R, DAY_R, YEAR_W, MONTH_W, DAY_W,
          S_YEAR, S_MONTH, S_DAY, S_MAX, CX, CY } = geo;

  // Outer shell size — this is the only thing that changes with ring visibility
  const S = showDays ? S_DAY : showMonths ? S_MONTH : S_YEAR;

  // Inner canvas offset so it stays centered inside the outer shell
  const innerOff = -(S_MAX - S) / 2;

  // Outer shell position — grows from center (pos is top-left of S_YEAR state).
  // Clamped so the dial is always fully on-screen (drag positions persisted for
  // the old floating panel can sit further right than the dial fits).
  const rawLeft = pos.x - (S - S_YEAR) / 2;
  const rawTop  = pos.y - (S - S_YEAR) / 2;
  const shellLeft = typeof window === 'undefined' ? rawLeft
    : Math.max(8, Math.min(rawLeft, window.innerWidth  - S - 8));
  const shellTop = typeof window === 'undefined' ? rawTop
    : Math.max(8, Math.min(rawTop,  window.innerHeight - S - 8));

  // Range arc
  const rStartIdx = yearRange.startYear ? years.indexOf(yearRange.startYear) + 1 : -1;
  const rEndIdx   = yearRange.endYear   ? years.indexOf(yearRange.endYear)   + 1 : -1;

  const handleBgDown = useCallback((e) => { onDrag(e); }, [onDrag]);

  // Center label
  const pad = n => String(n).padStart(2, '0');
  let centerLabel = '';
  if (mode === 'single') {
    if (selectedYear === 'all')            centerLabel = 'All Time';
    else if (showMonths && showDays)       centerLabel = `${selectedYear}\n${pad(selectedMonth)}-${pad(selectedDay)}`;
    else if (showMonths)                   centerLabel = `${selectedYear}-${pad(selectedMonth)}`;
    else                                   centerLabel = selectedYear ?? '—';
  } else {
    const { startYear, endYear } = yearRange;
    if (startYear && endYear)              centerLabel = `${startYear}\n–${endYear}`;
    else if (startYear)                    centerLabel = `${startYear} →`;
    else                                   centerLabel = 'Pick\nstart';
  }
  const labelLines = centerLabel.split('\n');

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    /* ---- Outer shell: animates size, clips via border-radius + overflow:hidden ---- */
    <div
      style={{
        position: 'fixed',
        left:     shellLeft,
        top:      shellTop,
        width:    S,
        height:   S,
        borderRadius: '50%',
        overflow: 'hidden',
        background: dc.shellBg,
        boxShadow: dc.shellShadow,
        transition: 'width 0.4s ease, height 0.4s ease, left 0.4s ease, top 0.4s ease',
        userSelect: 'none',
        cursor: 'grab',
        zIndex: 100,
      }}
      onMouseDown={handleBgDown}
      onTouchStart={handleBgDown}
    >
      {/* ---- Inner canvas: fixed S_MAX, items never move ---- */}
      <div style={{ position: 'absolute', left: innerOff, top: innerOff, width: S_MAX, height: S_MAX,
        transition: 'left 0.4s ease, top 0.4s ease' }}>

        {/* ---- SVG ring tracks ---- */}
        <svg width={S_MAX} height={S_MAX}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>

          {/* Outer rim */}
          <circle cx={CX} cy={CY} r={S_MAX / 2 - 5}
            fill="none" stroke={dc.rimStroke} strokeWidth="2" />

          {/* Year ring */}
          <circle cx={CX} cy={CY} r={YEAR_R}
            fill="none" stroke={dc.trackFill} strokeWidth={YEAR_W} />
          <circle cx={CX} cy={CY} r={YEAR_R}
            fill="none" stroke={dc.trackDash} strokeWidth="1" strokeDasharray="2 5" />

          {/* Range arc */}
          {mode === 'range' && rStartIdx >= 0 && rEndIdx >= 0 && rStartIdx !== rEndIdx && (() => {
            const aS = (rStartIdx / yearCount) * 360;
            const aE = (rEndIdx   / yearCount) * 360;
            return <path d={arcPath(CX, CY, YEAR_R, aS, aE)} fill="none"
              stroke={dc.rangeArc} strokeWidth={YEAR_W - 6} strokeLinecap="round" />;
          })()}

          {/* Month ring */}
          <circle cx={CX} cy={CY} r={MONTH_R}
            fill="none" stroke={dc.trackFill} strokeWidth={MONTH_W} />
          <circle cx={CX} cy={CY} r={MONTH_R}
            fill="none" stroke={dc.trackDash} strokeWidth="1" strokeDasharray="2 5" />

          {/* Day ring */}
          <circle cx={CX} cy={CY} r={DAY_R}
            fill="none" stroke={dc.trackFill} strokeWidth={DAY_W} />
          <circle cx={CX} cy={CY} r={DAY_R}
            fill="none" stroke={dc.trackDash} strokeWidth="1" strokeDasharray="2 5" />

          {/* Gloss sheen */}
          <defs>
            <radialGradient id="dial-gloss" cx="35%" cy="28%" r="55%">
              <stop offset="0%"   stopColor={dc.glossGrad[0]} />
              <stop offset="100%" stopColor={dc.glossGrad[1]} />
            </radialGradient>
          </defs>
          <circle cx={CX} cy={CY} r={S_MAX / 2 - 5} fill="url(#dial-gloss)" />
        </svg>

        {/* ---- Year items ---- */}
        {allItems.map((year, i) => {
          const { x, y } = polar((i / yearCount) * 360, YEAR_R, CX, CY);
          const isSel   = mode === 'single'
            ? year === selectedYear
            : year !== 'all' && (year === yearRange.startYear || year === yearRange.endYear);
          const isStart = year === yearRange.startYear && mode === 'range';
          const isEnd   = year === yearRange.endYear   && mode === 'range';
          const w = year === 'all' ? 28 : 34;
          const h = 18;
          return (
            <button key={year}
              onClick={e => { e.stopPropagation(); mode === 'single' ? setYear(year) : tapYear(year); }}
              style={{
                position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h,
                borderRadius: 9, fontSize: year === 'all' ? 8 : 10, padding: 0,
                fontWeight: isSel ? 'bold' : 400,
                color: isSel ? dc.itemActive : dc.itemColor,
                background: isSel ? dc.itemActiveBg : dc.itemDefault,
                border: isSel ? `1px solid ${dc.itemActiveBorder}` : `1px solid ${dc.itemBorder}`,
                boxShadow: isSel ? 'inset 1px 1px 0 0 rgba(0,0,0,0.28)' : `1.5px 1.5px 0 0 ${dc.itemShadow}`,
                cursor: 'pointer', zIndex: 5,
              }}
            >{year === 'all' ? 'All' : year}</button>
          );
        })}

        {/* ---- Month items (always present, shell clips them until revealed) ---- */}
        {MONTHS.map((name, i) => {
          const { x, y } = polar((i / 12) * 360, MONTH_R, CX, CY);
          const m    = i + 1;
          const isSel = m === selectedMonth && showMonths;
          return (
            <button key={m}
              onClick={e => { e.stopPropagation(); if (showMonths) setMonth(m); }}
              style={{
                position: 'absolute', left: x - 14, top: y - 9, width: 28, height: 18,
                borderRadius: 9, fontSize: 9, padding: 0,
                fontWeight: isSel ? 'bold' : 400,
                color: isSel ? dc.itemActive : dc.itemColor,
                background: isSel ? dc.itemActiveBg : dc.itemDefault,
                border: isSel ? `1px solid ${dc.itemActiveBorder}` : `1px solid ${dc.itemBorder}`,
                boxShadow: isSel ? 'inset 1px 1px 0 0 rgba(0,0,0,0.28)' : `1.5px 1.5px 0 0 ${dc.itemShadow}`,
                cursor: showMonths ? 'pointer' : 'default', zIndex: 6,
              }}
            >{name}</button>
          );
        })}

        {/* ---- Day items (always present, shell clips them until revealed) ---- */}
        {days.map((day, i) => {
          const { x, y } = polar((i / days.length) * 360, DAY_R, CX, CY);
          const isSel = day === selectedDay && showDays;
          return (
            <button key={day}
              onClick={e => { e.stopPropagation(); if (showDays) setDay(day); }}
              style={{
                position: 'absolute', left: x - 10, top: y - 8, width: 20, height: 16,
                borderRadius: 8, fontSize: 8, padding: 0,
                fontWeight: isSel ? 'bold' : 400,
                color: isSel ? dc.itemActive : dc.itemColor,
                background: isSel ? dc.itemActiveBg : dc.itemDefault,
                border: isSel ? `1px solid ${dc.itemActiveBorder}` : `1px solid ${dc.itemBorder}`,
                boxShadow: isSel ? 'inset 1px 1px 0 0 rgba(0,0,0,0.28)' : `1.5px 1.5px 0 0 ${dc.itemShadow}`,
                cursor: showDays ? 'pointer' : 'default', zIndex: 7,
              }}
            >{day}</button>
          );
        })}

        {/* ---- Center circle ---- */}
        <div
          style={{
            position: 'absolute',
            left: CX - CENTER_R, top: CY - CENTER_R,
            width: CENTER_R * 2, height: CENTER_R * 2,
            borderRadius: '50%',
            overflow: 'hidden',
            background: dc.centerBg,
            border: `2px solid ${dc.centerBorder}`,
            boxShadow: dc.centerShadow,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 3, zIndex: 10,
            pointerEvents: 'auto', cursor: 'default',
          }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          {/* Dock dial → back to the pinned sidebar */}
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            style={{
              fontSize: 7, fontWeight: 'bold', padding: '2px 8px', borderRadius: 4,
              cursor: 'pointer',
              background: dc.itemDefault,
              border: `1px solid ${dc.itemBorder}`,
              color: dc.itemColor,
              boxShadow: `1px 1px 0 0 ${dc.itemShadow}`,
            }}
          >&#x1F4CC; Dock</button>

          {/* Selected value */}
          <div style={{ textAlign: 'center', lineHeight: 1.25 }}>
            {labelLines.map((line, i) => (
              <div key={i} style={{
                color: i === 0 ? dc.labelColor : dc.labelSub,
                fontSize: i === 0 ? 11 : 9, fontWeight: i === 0 ? 'bold' : 'normal',
                fontFamily: 'monospace', letterSpacing: '0.04em',
              }}>{line}</div>
            ))}
          </div>

          {/* Single ↔ Range sliding toggle */}
          <div
            onClick={() => setMode(mode === 'single' ? 'range' : 'single')}
            style={{
              position: 'relative', width: 74, height: 22, borderRadius: 11,
              background: 'rgba(0,0,0,0.25)',
              border: `1px solid ${dc.centerBorder}`,
              cursor: 'pointer', flexShrink: 0,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{
              position: 'absolute', top: 2,
              width: 34, height: 18, borderRadius: 9,
              background: dc.modeBg,
              left: mode === 'single' ? 2 : 36,
              transition: 'left 0.2s ease',
              boxShadow: `1px 1px 0 0 ${dc.modeShadow}`,
            }} />
            <span style={{
              position: 'absolute', left: 0, width: 37, textAlign: 'center',
              top: '50%', transform: 'translateY(-50%)',
              fontSize: 7, fontWeight: 'bold',
              color: mode === 'single' ? dc.itemActive : dc.labelSub,
              pointerEvents: 'none', zIndex: 1,
            }}>Single</span>
            <span style={{
              position: 'absolute', right: 0, width: 37, textAlign: 'center',
              top: '50%', transform: 'translateY(-50%)',
              fontSize: 7, fontWeight: 'bold',
              color: mode === 'range' ? dc.itemActive : dc.labelSub,
              pointerEvents: 'none', zIndex: 1,
            }}>Range</span>
          </div>

          {/* Mo / Dy toggles */}
          {((mode === 'single' && selectedYear !== 'all') ||
            (mode === 'range' && yearRange.startYear && yearRange.endYear)) && (
            <div style={{ display: 'flex', gap: 3 }}>
              <button onClick={mode === 'single' ? toggleMonthSelector : toggleRangeMonthDaySelectors}
                style={toggleBtn(mode === 'single' ? showMonthSelector : showRangeMonthDaySelectors, dc)}>Mo</button>
              {(mode === 'single' ? showMonthSelector : showRangeMonthDaySelectors) && (
                <button onClick={mode === 'single' ? toggleDaySelector : toggleRangeDaySelectors}
                  style={toggleBtn(mode === 'single' ? showDaySelector : showRangeDaySelectors, dc)}>Dy</button>
              )}
            </div>
          )}
        </div>

      </div>{/* end inner canvas */}
    </div>
  );
}

// ---- Style helpers ----------------------------------------------------------
function toggleBtn(active, dc) {
  return {
    fontSize: 7, padding: '1px 4px', borderRadius: 3, cursor: 'pointer',
    border: `1px solid ${active ? dc.itemActiveBorder : dc.itemBorder}`,
    background: active ? dc.toggleActive : dc.itemDefault,
    color: active ? dc.labelColor : dc.labelSub,
    boxShadow: active ? 'inset 1px 1px 0 0 rgba(0,0,0,0.25)' : `1px 1px 0 0 ${dc.itemShadow}`,
    transition: 'all 0.15s',
  };
}
