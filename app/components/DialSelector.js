'use client';
import React, { useCallback, useMemo } from 'react';

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
  const CENTER_R = 44;
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

  // Three shell sizes — outer animated div clips to this
  const S_YEAR  = Math.round((YEAR_R  + YEAR_W  / 2 + RIM) * 2);
  const S_MONTH = Math.round((MONTH_R + MONTH_W / 2 + RIM) * 2);
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
export function DialSelector({ sel, pos, onDrag, onClose }) {
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

  // Geometry is stable — only yearCount can change it (not showMonths/showDays)
  const geo = useMemo(() => getGeometry(yearCount), [yearCount]);
  const { CENTER_R, YEAR_R, MONTH_R, DAY_R, YEAR_W, MONTH_W, DAY_W,
          S_YEAR, S_MONTH, S_DAY, S_MAX, CX, CY } = geo;

  // Outer shell size — this is the only thing that changes with ring visibility
  const S = showDays ? S_DAY : showMonths ? S_MONTH : S_YEAR;

  // Inner canvas offset so it stays centered inside the outer shell
  const innerOff = -(S_MAX - S) / 2;

  // Outer shell position — grows from center (pos is top-left of S_YEAR state)
  const shellLeft = pos.x - (S - S_YEAR) / 2;
  const shellTop  = pos.y - (S - S_YEAR) / 2;

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
        background: 'radial-gradient(circle at 38% 28%, #28284a 0%, #111128 55%, #08080f 100%)',
        boxShadow: [
          '0 0 0 3px rgba(255,255,255,0.06)',
          '0 0 0 7px rgba(0,0,0,0.5)',
          '0 16px 60px rgba(0,0,0,0.85)',
          'inset 0 2px 6px rgba(255,255,255,0.07)',
        ].join(', '),
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

          {/* Outer rim (drawn at max size — shell clips it) */}
          <circle cx={CX} cy={CY} r={S_MAX / 2 - 5}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />

          {/* Year ring */}
          <circle cx={CX} cy={CY} r={YEAR_R}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={YEAR_W} />
          <circle cx={CX} cy={CY} r={YEAR_R}
            fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="2 5" />

          {/* Range arc */}
          {mode === 'range' && rStartIdx >= 0 && rEndIdx >= 0 && rStartIdx !== rEndIdx && (() => {
            const aS = (rStartIdx / yearCount) * 360;
            const aE = (rEndIdx   / yearCount) * 360;
            return <path d={arcPath(CX, CY, YEAR_R, aS, aE)} fill="none"
              stroke="rgba(100,180,255,0.3)" strokeWidth={YEAR_W - 6} strokeLinecap="round" />;
          })()}

          {/* Month ring */}
          <circle cx={CX} cy={CY} r={MONTH_R}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={MONTH_W} />
          <circle cx={CX} cy={CY} r={MONTH_R}
            fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="2 5" />

          {/* Day ring */}
          <circle cx={CX} cy={CY} r={DAY_R}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={DAY_W} />
          <circle cx={CX} cy={CY} r={DAY_R}
            fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="2 5" />

          {/* Gloss sheen */}
          <defs>
            <radialGradient id="dial-gloss" cx="35%" cy="28%" r="55%">
              <stop offset="0%"   stopColor="white" stopOpacity="0.10" />
              <stop offset="100%" stopColor="white" stopOpacity="0"    />
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
                color: isSel ? '#fff' : 'rgba(255,255,255,0.55)',
                background: isSel
                  ? isStart ? 'linear-gradient(135deg,#4facfe,#00f2fe)'
                  : isEnd   ? 'linear-gradient(135deg,#f093fb,#f5576c)'
                  :             'linear-gradient(135deg,#7c5cfc,#5c9cec)'
                  : 'rgba(255,255,255,0.07)',
                border: isSel ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.09)',
                boxShadow: isSel
                  ? `0 0 10px ${isStart ? 'rgba(79,172,254,0.8)' : isEnd ? 'rgba(245,87,108,0.8)' : 'rgba(124,92,252,0.8)'}`
                  : 'none',
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
                color: isSel ? '#fff' : 'rgba(255,255,255,0.5)',
                background: isSel ? 'linear-gradient(135deg,#f7971e,#ffd200)' : 'rgba(255,255,255,0.06)',
                border: isSel ? '1px solid rgba(255,220,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isSel ? '0 0 9px rgba(255,210,0,0.7)' : 'none',
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
                color: isSel ? '#fff' : 'rgba(255,255,255,0.45)',
                background: isSel ? 'linear-gradient(135deg,#56ab2f,#a8e063)' : 'rgba(255,255,255,0.05)',
                border: isSel ? '1px solid rgba(168,224,99,0.4)' : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isSel ? '0 0 7px rgba(86,171,47,0.7)' : 'none',
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
            background: 'radial-gradient(circle at 42% 35%, #2e2e58, #14142a)',
            border: '2px solid rgba(255,255,255,0.14)',
            boxShadow: [
              'inset 0 2px 6px rgba(0,0,0,0.8)',
              'inset 0 1px 2px rgba(255,255,255,0.07)',
              '0 0 0 1px rgba(0,0,0,0.5)',
            ].join(', '),
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 3, zIndex: 10,
            pointerEvents: 'auto', cursor: 'default',
          }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
        >
          {/* Single ↔ Range toggle */}
          <button
            onClick={() => setMode(mode === 'single' ? 'range' : 'single')}
            style={modeToggleBtn(mode)}
          >
            {mode === 'single' ? 'Single' : 'Range'}
          </button>

          {/* Selected value */}
          <div style={{ textAlign: 'center', lineHeight: 1.25, marginTop: 1 }}>
            {labelLines.map((line, i) => (
              <div key={i} style={{
                color: i === 0 ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.5)',
                fontSize: i === 0 ? 11 : 9, fontWeight: i === 0 ? 'bold' : 'normal',
                fontFamily: 'monospace', letterSpacing: '0.04em',
              }}>{line}</div>
            ))}
          </div>

          {/* Mo / Dy toggles — single mode: any non-all year; range mode: when both years picked */}
          {((mode === 'single' && selectedYear !== 'all') ||
            (mode === 'range' && yearRange.startYear && yearRange.endYear)) && (
            <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
              <button onClick={mode === 'single' ? toggleMonthSelector : toggleRangeMonthDaySelectors}
                style={toggleBtn(mode === 'single' ? showMonthSelector : showRangeMonthDaySelectors)}>Mo</button>
              {(mode === 'single' ? showMonthSelector : showRangeMonthDaySelectors) && (
                <button onClick={mode === 'single' ? toggleDaySelector : toggleRangeDaySelectors}
                  style={toggleBtn(mode === 'single' ? showDaySelector : showRangeDaySelectors)}>Dy</button>
              )}
            </div>
          )}
        </div>

        {/* ---- Close button ---- */}
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: CX + S_YEAR / 2 - 32,   // near top-right of year-only circle
            top:  CY - S_YEAR / 2 + 10,
            width: 20, height: 20, borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 10, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20, padding: 0,
          }}
          aria-label="Exit dial"
        >✕</button>

      </div>{/* end inner canvas */}
    </div>
  );
}

// ---- Style helpers ----------------------------------------------------------
function modeToggleBtn(mode) {
  const isSingle = mode === 'single';
  return {
    fontSize: 8, fontWeight: 'bold', padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
    background: isSingle
      ? 'linear-gradient(135deg,#667eea,#764ba2)'
      : 'linear-gradient(135deg,#f093fb,#f5576c)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.25)',
    boxShadow: isSingle ? '0 0 7px rgba(102,126,234,0.6)' : '0 0 7px rgba(240,147,251,0.6)',
    transition: 'all 0.2s',
    width: 44,
  };
}

function toggleBtn(active) {
  return {
    fontSize: 7, padding: '1px 4px', borderRadius: 3, cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.12)',
    background: active ? 'rgba(124,92,252,0.45)' : 'rgba(255,255,255,0.06)',
    color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
    boxShadow: active ? '0 0 5px rgba(124,92,252,0.4)' : 'none',
    transition: 'all 0.15s',
  };
}
