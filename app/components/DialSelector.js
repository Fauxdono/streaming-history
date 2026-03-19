'use client';
import React, { useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// DialSelector — circular concentric-ring year/month/day picker
//
// 2000s/2010s skeuomorphic aesthetic: dark metallic body, glowing rings,
// glossy highlight, hard-light selected states.
//
// Props:
//   sel         — from useYearSelectorState
//   pos         — { x, y } current float position
//   onDrag      — drag-to-move handler (from useFloatPanel.handleDragStart)
//   onClose     — called to exit dial mode
// ---------------------------------------------------------------------------

// ---- Geometry --------------------------------------------------------------
const S   = 360;          // total diameter
const CX  = S / 2;
const CY  = S / 2;

const YEAR_R  = 88;
const MONTH_R = 130;
const DAY_R   = 164;

const YEAR_W  = 32;  // ring track stroke-width
const MONTH_W = 26;
const DAY_W   = 22;

function polar(angleDeg, r) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

// Draw an SVG arc path between two angles on a circle
function arcPath(cx, cy, r, startDeg, endDeg) {
  // Ensure arc goes forward (clockwise)
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
    yearRange, rangeYearTapPhase, tapYear,
  } = sel;

  const showMonths = showMonthSelector && selectedYear !== 'all' && mode === 'single';
  const showDays   = showDaySelector   && showMonths;

  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Year angles
  const yearCount = years.length + 1; // +1 for "All"
  const allItems  = ['all', ...years];

  // Range arc: find start/end indices
  const rangeStartIdx = yearRange.startYear ? years.indexOf(yearRange.startYear) + 1 : -1;
  const rangeEndIdx   = yearRange.endYear   ? years.indexOf(yearRange.endYear)   + 1 : -1;

  // Drag: attach to outer bezel only (buttons stop propagation)
  const handleBgDown = useCallback((e) => {
    onDrag(e);
  }, [onDrag]);

  // Current label for center display
  const pad = n => String(n).padStart(2, '0');
  let centerLabel = '';
  if (mode === 'single') {
    if (selectedYear === 'all') centerLabel = 'All Time';
    else if (showMonths && showDays) centerLabel = `${selectedYear}\n${pad(selectedMonth)}-${pad(selectedDay)}`;
    else if (showMonths) centerLabel = `${selectedYear}-${pad(selectedMonth)}`;
    else centerLabel = selectedYear;
  } else {
    const { startYear, endYear } = yearRange;
    if (startYear && endYear) centerLabel = `${startYear}\n–${endYear}`;
    else if (startYear) centerLabel = `${startYear} →`;
    else centerLabel = 'Pick\nstart';
  }
  const labelLines = centerLabel.split('\n');

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top:  pos.y,
        width:  S,
        height: S,
        zIndex: 100,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 28%, #28284a 0%, #111128 55%, #08080f 100%)',
        boxShadow: [
          '0 0 0 3px rgba(255,255,255,0.06)',
          '0 0 0 6px rgba(0,0,0,0.6)',
          '0 12px 60px rgba(0,0,0,0.9)',
          'inset 0 2px 6px rgba(255,255,255,0.08)',
        ].join(', '),
        userSelect: 'none',
        cursor: 'grab',
      }}
      onMouseDown={handleBgDown}
      onTouchStart={handleBgDown}
    >
      {/* ---- SVG ring tracks & arcs ---- */}
      <svg
        width={S} height={S}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
      >
        {/* Outer rim */}
        <circle cx={CX} cy={CY} r={S / 2 - 4}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" />

        {/* Year ring track */}
        <circle cx={CX} cy={CY} r={YEAR_R}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={YEAR_W} />
        <circle cx={CX} cy={CY} r={YEAR_R}
          fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1"
          strokeDasharray="2 4" />

        {/* Range arc between start and end years */}
        {mode === 'range' && rangeStartIdx >= 0 && rangeEndIdx >= 0 && rangeStartIdx !== rangeEndIdx && (() => {
          const aStart = (rangeStartIdx / yearCount) * 360;
          const aEnd   = (rangeEndIdx   / yearCount) * 360;
          return (
            <path
              d={arcPath(CX, CY, YEAR_R, aStart, aEnd)}
              fill="none"
              stroke="rgba(100,180,255,0.25)"
              strokeWidth={YEAR_W - 4}
              strokeLinecap="round"
            />
          );
        })()}

        {/* Month ring track */}
        {showMonths && (
          <>
            <circle cx={CX} cy={CY} r={MONTH_R}
              fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={MONTH_W} />
            <circle cx={CX} cy={CY} r={MONTH_R}
              fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1"
              strokeDasharray="2 4" />
          </>
        )}

        {/* Day ring track */}
        {showDays && (
          <>
            <circle cx={CX} cy={CY} r={DAY_R}
              fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={DAY_W} />
            <circle cx={CX} cy={CY} r={DAY_R}
              fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="1"
              strokeDasharray="2 4" />
          </>
        )}

        {/* Gloss highlight — top half sheen */}
        <ellipse cx={CX} cy={CY * 0.45} rx={CX * 0.65} ry={CY * 0.35}
          fill="url(#glossGrad)" opacity="0.5" />
        <defs>
          <radialGradient id="glossGrad" cx="50%" cy="30%" r="70%">
            <stop offset="0%"   stopColor="white" stopOpacity="0.10" />
            <stop offset="100%" stopColor="white" stopOpacity="0"    />
          </radialGradient>
        </defs>
      </svg>

      {/* ---- Year items ---- */}
      {allItems.map((year, i) => {
        const angle     = (i / yearCount) * 360;
        const { x, y } = polar(angle, YEAR_R);
        const isSelected = mode === 'single'
          ? year === selectedYear
          : year !== 'all' && (year === yearRange.startYear || year === yearRange.endYear);
        const isStart    = year === yearRange.startYear;
        const isEnd      = year === yearRange.endYear;

        const w = year === 'all' ? 30 : 34;
        const h = 18;

        return (
          <button
            key={year}
            onClick={e => { e.stopPropagation(); mode === 'single' ? setYear(year) : tapYear(year); }}
            style={{
              position: 'absolute',
              left: x - w / 2,
              top:  y - h / 2,
              width:  w,
              height: h,
              borderRadius: 9,
              fontSize: year === 'all' ? 8 : 10,
              fontWeight: isSelected ? 'bold' : 400,
              color: isSelected ? '#fff' : 'rgba(255,255,255,0.55)',
              background: isSelected
                ? isStart && mode === 'range'
                  ? 'linear-gradient(135deg,#4facfe,#00f2fe)'
                  : isEnd && mode === 'range'
                    ? 'linear-gradient(135deg,#f093fb,#f5576c)'
                    : 'linear-gradient(135deg,#7c5cfc,#5c9cec)'
                : 'rgba(255,255,255,0.06)',
              border: isSelected
                ? '1px solid rgba(255,255,255,0.35)'
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow: isSelected ? `0 0 10px ${isStart && mode==='range' ? 'rgba(79,172,254,0.7)' : isEnd && mode==='range' ? 'rgba(245,87,108,0.7)' : 'rgba(124,92,252,0.7)'}` : 'none',
              cursor: 'pointer',
              padding: 0,
              zIndex: 5,
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
          >
            {year === 'all' ? 'All' : year}
          </button>
        );
      })}

      {/* ---- Month items ---- */}
      {showMonths && MONTHS_SHORT.map((name, i) => {
        const angle     = (i / 12) * 360;
        const { x, y } = polar(angle, MONTH_R);
        const m          = i + 1;
        const isSelected = m === selectedMonth;
        return (
          <button
            key={m}
            onClick={e => { e.stopPropagation(); setMonth(m); }}
            style={{
              position: 'absolute',
              left: x - 14,
              top:  y - 9,
              width: 28,
              height: 18,
              borderRadius: 9,
              fontSize: 9,
              fontWeight: isSelected ? 'bold' : 400,
              color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
              background: isSelected
                ? 'linear-gradient(135deg,#f7971e,#ffd200)'
                : 'rgba(255,255,255,0.05)',
              border: isSelected
                ? '1px solid rgba(255,220,0,0.4)'
                : '1px solid rgba(255,255,255,0.07)',
              boxShadow: isSelected ? '0 0 8px rgba(255,210,0,0.6)' : 'none',
              cursor: 'pointer',
              padding: 0,
              zIndex: 6,
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
          >
            {name}
          </button>
        );
      })}

      {/* ---- Day items ---- */}
      {showDays && days.map((day, i) => {
        const angle     = (i / days.length) * 360;
        const { x, y } = polar(angle, DAY_R);
        const isSelected = day === selectedDay;
        return (
          <button
            key={day}
            onClick={e => { e.stopPropagation(); setDay(day); }}
            style={{
              position: 'absolute',
              left: x - 10,
              top:  y - 8,
              width: 20,
              height: 16,
              borderRadius: 8,
              fontSize: 8,
              fontWeight: isSelected ? 'bold' : 400,
              color: isSelected ? '#fff' : 'rgba(255,255,255,0.45)',
              background: isSelected
                ? 'linear-gradient(135deg,#56ab2f,#a8e063)'
                : 'rgba(255,255,255,0.04)',
              border: isSelected
                ? '1px solid rgba(168,224,99,0.4)'
                : '1px solid rgba(255,255,255,0.06)',
              boxShadow: isSelected ? '0 0 7px rgba(86,171,47,0.65)' : 'none',
              cursor: 'pointer',
              padding: 0,
              zIndex: 7,
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
          >
            {day}
          </button>
        );
      })}

      {/* ---- Center circle ---- */}
      <div
        style={{
          position: 'absolute',
          left:   CX - 52,
          top:    CY - 52,
          width:  104,
          height: 104,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 42% 35%, #2e2e58, #14142a)',
          border: '2px solid rgba(255,255,255,0.14)',
          boxShadow: [
            'inset 0 2px 6px rgba(0,0,0,0.8)',
            'inset 0 1px 2px rgba(255,255,255,0.08)',
            '0 0 0 1px rgba(0,0,0,0.4)',
          ].join(', '),
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          zIndex: 10,
          pointerEvents: 'auto',
          cursor: 'default',
        }}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        {/* Mode buttons */}
        <div style={{ display: 'flex', gap: 3 }}>
          <button onClick={() => setMode('single')} style={centerModeBtn(mode === 'single', 'single')}>
            Single
          </button>
          <button onClick={() => setMode('range')} style={centerModeBtn(mode === 'range', 'range')}>
            Range
          </button>
        </div>

        {/* Selected value display */}
        <div style={{
          textAlign: 'center',
          lineHeight: 1.2,
          marginTop: 2,
        }}>
          {labelLines.map((line, i) => (
            <div key={i} style={{
              color: i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)',
              fontSize: i === 0 ? 11 : 9,
              fontWeight: i === 0 ? 'bold' : 'normal',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}>
              {line}
            </div>
          ))}
        </div>

        {/* Month / Day toggles */}
        {mode === 'single' && selectedYear !== 'all' && (
          <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
            <button
              onClick={toggleMonthSelector}
              style={centerToggleBtn(showMonthSelector)}
            >Mo</button>
            {showMonthSelector && (
              <button
                onClick={toggleDaySelector}
                style={centerToggleBtn(showDaySelector)}
              >Dy</button>
            )}
          </div>
        )}
      </div>

      {/* ---- Close / exit dial button ---- */}
      <button
        onClick={e => { e.stopPropagation(); onClose(); }}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          top:  10,
          right: 18,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: 11,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          lineHeight: 1,
          padding: 0,
          transition: 'background 0.15s',
        }}
        aria-label="Exit dial"
      >✕</button>

      {/* ---- Bottom rim gloss (edge highlight) ---- */}
      <div style={{
        position: 'absolute',
        bottom: 6,
        left: '20%',
        width: '60%',
        height: 3,
        borderRadius: 2,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

function centerModeBtn(active, which) {
  const colors = which === 'single'
    ? { bg: 'linear-gradient(135deg,#667eea,#764ba2)', glow: 'rgba(102,126,234,0.6)' }
    : { bg: 'linear-gradient(135deg,#f093fb,#f5576c)', glow: 'rgba(240,147,251,0.6)' };
  return {
    fontSize: 7,
    fontWeight: 'bold',
    padding: '2px 5px',
    borderRadius: 3,
    cursor: 'pointer',
    border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
    background: active ? colors.bg : 'rgba(255,255,255,0.07)',
    color: '#fff',
    boxShadow: active ? `0 0 6px ${colors.glow}` : 'none',
    transition: 'all 0.15s',
  };
}

function centerToggleBtn(active) {
  return {
    fontSize: 7,
    padding: '1px 4px',
    borderRadius: 3,
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.12)',
    background: active ? 'rgba(124,92,252,0.45)' : 'rgba(255,255,255,0.06)',
    color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
    boxShadow: active ? '0 0 5px rgba(124,92,252,0.4)' : 'none',
    transition: 'all 0.15s',
  };
}
