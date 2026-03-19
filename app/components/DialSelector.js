'use client';
import React, { useCallback } from 'react';

// ---------------------------------------------------------------------------
// DialSelector — circular concentric-ring year/month/day picker
// 2000s skeuomorphic aesthetic: dark metallic, glowing rings, glossy sheen.
//
// Props:
//   sel     — from useYearSelectorState
//   pos     — { x, y } stored float position (top-left of base size)
//   onDrag  — drag handler from useFloatPanel
//   onClose — exit dial mode
// ---------------------------------------------------------------------------

// ---- Geometry --------------------------------------------------------------
// Sizes are computed to hug the data — no wasted space.
// S_BASE is the diameter with only the year ring visible. When months/days
// are added the diameter grows; we shift pos by half the delta so growth
// is centric (the circle expands outward in all directions equally).

function getGeometry(showMonths, showDays, yearCount) {
  const CENTER_R = 44;               // center circle radius
  const GAP      = 8;                // gap between adjacent ring edges

  const YEAR_W  = 28;
  // Minimum radius from center; also ensure year items don't crowd
  const YEAR_R  = Math.max(
    CENTER_R + GAP + YEAR_W / 2,
    Math.ceil((yearCount * 38) / (2 * Math.PI)), // 38 = item slot width
  );

  const MONTH_W = 24;
  const MONTH_R = YEAR_R + YEAR_W / 2 + GAP + MONTH_W / 2;

  const DAY_W   = 22;
  const DAY_R   = MONTH_R + MONTH_W / 2 + GAP + DAY_W / 2;

  // Outer extent = ring center + half track + rim clearance
  const RIM = 14;
  const outerR = showDays
    ? DAY_R   + DAY_W   / 2 + RIM
    : showMonths
      ? MONTH_R + MONTH_W / 2 + RIM
      : YEAR_R  + YEAR_W  / 2 + RIM;

  const S  = Math.round(outerR * 2);
  const CX = S / 2;
  const CY = S / 2;

  return { S, CX, CY, CENTER_R, YEAR_R, MONTH_R, DAY_R, YEAR_W, MONTH_W, DAY_W };
}

// S when only years are shown — used to keep expansion centered
function getBaseS(yearCount) {
  return getGeometry(false, false, yearCount).S;
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
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2);
  const y2 = cy + r * Math.sin(a2);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

// ---------------------------------------------------------------------------
export function DialSelector({ sel, pos, onDrag, onClose }) {
  const {
    mode, years, selectedYear, selectedMonth, selectedDay, days,
    showMonthSelector, showDaySelector,
    setYear, setMode, setMonth, setDay,
    toggleMonthSelector, toggleDaySelector,
    yearRange, tapYear,
  } = sel;

  const showMonths = showMonthSelector && selectedYear !== 'all' && mode === 'single';
  const showDays   = showDaySelector   && showMonths;

  const yearCount  = years.length + 1; // +1 for "All"
  const allItems   = ['all', ...years];

  const geo   = getGeometry(showMonths, showDays, yearCount);
  const baseS = getBaseS(yearCount);
  const { S, CX, CY, CENTER_R, YEAR_R, MONTH_R, DAY_R, YEAR_W, MONTH_W, DAY_W } = geo;

  // Keep circle centered on the same point as it grows
  const offset = (S - baseS) / 2;
  const left   = pos.x - offset;
  const top    = pos.y - offset;

  // Range arc indices
  const rangeStartIdx = yearRange.startYear ? years.indexOf(yearRange.startYear) + 1 : -1;
  const rangeEndIdx   = yearRange.endYear   ? years.indexOf(yearRange.endYear)   + 1 : -1;

  const handleBgDown = useCallback((e) => { onDrag(e); }, [onDrag]);

  // Center label
  const pad = n => String(n).padStart(2, '0');
  let centerLabel = '';
  if (mode === 'single') {
    if (selectedYear === 'all') centerLabel = 'All Time';
    else if (showMonths && showDays) centerLabel = `${selectedYear}\n${pad(selectedMonth)}-${pad(selectedDay)}`;
    else if (showMonths) centerLabel = `${selectedYear}-${pad(selectedMonth)}`;
    else centerLabel = selectedYear ?? '—';
  } else {
    const { startYear, endYear } = yearRange;
    if (startYear && endYear) centerLabel = `${startYear}\n–${endYear}`;
    else if (startYear)       centerLabel = `${startYear} →`;
    else                      centerLabel = 'Pick\nstart';
  }
  const labelLines = centerLabel.split('\n');

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div
      style={{
        position: 'fixed',
        left,
        top,
        width:  S,
        height: S,
        zIndex: 100,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 28%, #28284a 0%, #111128 55%, #08080f 100%)',
        boxShadow: [
          '0 0 0 3px rgba(255,255,255,0.06)',
          '0 0 0 7px rgba(0,0,0,0.55)',
          '0 16px 60px rgba(0,0,0,0.85)',
          'inset 0 2px 6px rgba(255,255,255,0.07)',
        ].join(', '),
        transition: 'width 0.35s ease, height 0.35s ease, left 0.35s ease, top 0.35s ease',
        userSelect: 'none',
        cursor: 'grab',
      }}
      onMouseDown={handleBgDown}
      onTouchStart={handleBgDown}
    >
      {/* ---- SVG ring tracks & range arc ---- */}
      <svg
        width={S} height={S}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        {/* Outer rim */}
        <circle cx={CX} cy={CY} r={S / 2 - 5}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />

        {/* Year ring track */}
        <circle cx={CX} cy={CY} r={YEAR_R}
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={YEAR_W} />
        <circle cx={CX} cy={CY} r={YEAR_R}
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="2 5" />

        {/* Range arc */}
        {mode === 'range' && rangeStartIdx >= 0 && rangeEndIdx >= 0 && rangeStartIdx !== rangeEndIdx && (() => {
          const aS = (rangeStartIdx / yearCount) * 360;
          const aE = (rangeEndIdx   / yearCount) * 360;
          return <path d={arcPath(CX, CY, YEAR_R, aS, aE)} fill="none"
            stroke="rgba(100,180,255,0.3)" strokeWidth={YEAR_W - 6} strokeLinecap="round" />;
        })()}

        {/* Month ring track */}
        {showMonths && <>
          <circle cx={CX} cy={CY} r={MONTH_R}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={MONTH_W} />
          <circle cx={CX} cy={CY} r={MONTH_R}
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="2 5" />
        </>}

        {/* Day ring track */}
        {showDays && <>
          <circle cx={CX} cy={CY} r={DAY_R}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={DAY_W} />
          <circle cx={CX} cy={CY} r={DAY_R}
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="2 5" />
        </>}

        {/* Gloss sheen — top-left highlight */}
        <defs>
          <radialGradient id="dial-gloss" cx="35%" cy="28%" r="55%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.11" />
            <stop offset="100%" stopColor="white" stopOpacity="0"    />
          </radialGradient>
        </defs>
        <circle cx={CX} cy={CY} r={S / 2 - 5} fill="url(#dial-gloss)" />
      </svg>

      {/* ---- Year items ---- */}
      {allItems.map((year, i) => {
        const angle = (i / yearCount) * 360;
        const { x, y } = polar(angle, YEAR_R, CX, CY);
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
              position: 'absolute', left: x - w/2, top: y - h/2, width: w, height: h,
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
              cursor: 'pointer', zIndex: 5, transition: 'background 0.15s, box-shadow 0.15s',
            }}
          >{year === 'all' ? 'All' : year}</button>
        );
      })}

      {/* ---- Month items ---- */}
      {showMonths && MONTHS_SHORT.map((name, i) => {
        const { x, y } = polar((i / 12) * 360, MONTH_R, CX, CY);
        const m = i + 1;
        const isSel = m === selectedMonth;
        return (
          <button key={m}
            onClick={e => { e.stopPropagation(); setMonth(m); }}
            style={{
              position: 'absolute', left: x - 14, top: y - 9, width: 28, height: 18,
              borderRadius: 9, fontSize: 9, padding: 0,
              fontWeight: isSel ? 'bold' : 400,
              color: isSel ? '#fff' : 'rgba(255,255,255,0.5)',
              background: isSel ? 'linear-gradient(135deg,#f7971e,#ffd200)' : 'rgba(255,255,255,0.06)',
              border: isSel ? '1px solid rgba(255,220,0,0.4)' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: isSel ? '0 0 9px rgba(255,210,0,0.7)' : 'none',
              cursor: 'pointer', zIndex: 6, transition: 'background 0.15s, box-shadow 0.15s',
            }}
          >{name}</button>
        );
      })}

      {/* ---- Day items ---- */}
      {showDays && days.map((day, i) => {
        const { x, y } = polar((i / days.length) * 360, DAY_R, CX, CY);
        const isSel = day === selectedDay;
        return (
          <button key={day}
            onClick={e => { e.stopPropagation(); setDay(day); }}
            style={{
              position: 'absolute', left: x - 10, top: y - 8, width: 20, height: 16,
              borderRadius: 8, fontSize: 8, padding: 0,
              fontWeight: isSel ? 'bold' : 400,
              color: isSel ? '#fff' : 'rgba(255,255,255,0.45)',
              background: isSel ? 'linear-gradient(135deg,#56ab2f,#a8e063)' : 'rgba(255,255,255,0.05)',
              border: isSel ? '1px solid rgba(168,224,99,0.4)' : '1px solid rgba(255,255,255,0.07)',
              boxShadow: isSel ? '0 0 7px rgba(86,171,47,0.7)' : 'none',
              cursor: 'pointer', zIndex: 7, transition: 'background 0.15s, box-shadow 0.15s',
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
        {/* Mode buttons */}
        <div style={{ display: 'flex', gap: 3 }}>
          <button onClick={() => setMode('single')} style={modeBtn(mode === 'single', 'single')}>
            Single
          </button>
          <button onClick={() => setMode('range')} style={modeBtn(mode === 'range', 'range')}>
            Range
          </button>
        </div>

        {/* Selected value */}
        <div style={{ textAlign: 'center', lineHeight: 1.25, marginTop: 1 }}>
          {labelLines.map((line, i) => (
            <div key={i} style={{
              color: i === 0 ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.5)',
              fontSize: i === 0 ? 11 : 9,
              fontWeight: i === 0 ? 'bold' : 'normal',
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
            }}>{line}</div>
          ))}
        </div>

        {/* Month / Day toggles */}
        {mode === 'single' && selectedYear !== 'all' && (
          <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
            <button onClick={toggleMonthSelector} style={toggleBtn(showMonthSelector)}>Mo</button>
            {showMonthSelector && (
              <button onClick={toggleDaySelector} style={toggleBtn(showDaySelector)}>Dy</button>
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
          position: 'absolute', top: 12, right: 20,
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.45)',
          fontSize: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 20, padding: 0, lineHeight: 1,
        }}
        aria-label="Exit dial"
      >✕</button>
    </div>
  );
}

// ---- Style helpers ----------------------------------------------------------
function modeBtn(active, which) {
  const g = which === 'single'
    ? { bg: 'linear-gradient(135deg,#667eea,#764ba2)', glow: 'rgba(102,126,234,0.6)' }
    : { bg: 'linear-gradient(135deg,#f093fb,#f5576c)', glow: 'rgba(240,147,251,0.6)' };
  return {
    fontSize: 7, fontWeight: 'bold', padding: '2px 5px', borderRadius: 3,
    cursor: 'pointer',
    border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
    background: active ? g.bg : 'rgba(255,255,255,0.07)',
    color: '#fff',
    boxShadow: active ? `0 0 6px ${g.glow}` : 'none',
    transition: 'all 0.15s',
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
