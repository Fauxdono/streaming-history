'use client';
import React, { useMemo, useRef, useState } from 'react';
import { useTheme } from './themeprovider';
import { useYearSelectorState }  from './hooks/useYearSelectorState';
import { useFloatPanel }         from './hooks/useFloatPanel';
import { useYearSelectorColors } from './hooks/useYearSelectorColors';
import { DialSelector }          from './DialSelector';

// ---------------------------------------------------------------------------
// Public API
//
// Replaces year-selector.js. Props are intentionally simpler:
//   - onChange({ mode, value })  replaces onYearChange + onYearRangeChange
//   - onLayoutChange({ expanded, position, width, height }) replaces 4 callbacks
//
// Backward-compat shim at the bottom bridges the old prop names so
// SpotifyAnalyzer doesn't need to change yet.
// ---------------------------------------------------------------------------

export default function YearSelector({
  artistsByYear,
  rawPlayData       = [],
  initialYear,
  initialYearRange,
  isRangeMode,
  activeTab,
  colorTheme        = 'teal',
  colorMode         = 'colorful',
  asSidebar         = false,
  startMinimized    = false,
  position          = 'right',
  topTabsPosition   = 'top',
  topTabsHeight     = 56,
  topTabsWidth      = 192,
  onChange,
  onLayoutChange,
}) {
  const { fontSize, theme } = useTheme();
  const isDark = theme === 'dark';
  const fontScale = { small: 0.875, medium: 1, large: 1.125, xlarge: 1.25 }[fontSize] ?? 1;

  const sel   = useYearSelectorState({ artistsByYear, rawPlayData, initialYear, initialYearRange, isRangeMode, activeTab, onChange });
  const panel = useFloatPanel({ initialPosition: position, startMinimized });
  const c     = useYearSelectorColors({ colorTheme, colorMode });

  const panelRef = useRef(null);

  // Measure the actual settings-bar height (it grows with the font-size
  // setting). TopTabs positions itself off the measured value — the docked
  // panel must use the same number or it slides underneath the tabs.
  const [settingsBarHeight, setSettingsBarHeight] = useState(40);
  React.useEffect(() => {
    if (panel.isMobile) return;
    const measure = () => {
      const el = document.querySelector('.fixed.left-0.right-0.w-full.z-\\[100\\]');
      if (el) setSettingsBarHeight(el.offsetHeight);
    };
    measure();
    const timer = setTimeout(measure, 100); // re-measure after fonts/layout settle
    window.addEventListener('resize', measure);
    return () => { clearTimeout(timer); window.removeEventListener('resize', measure); };
  }, [panel.isMobile, fontSize]);

  // Notify parent of layout changes via ResizeObserver
  React.useEffect(() => {
    if (!onLayoutChange) return;
    // Floating (dial) renders no docked panel — zero out reserved space right away
    if (panel.desktopFloating || !panelRef.current) {
      onLayoutChange({ expanded: panel.expanded, position: panel.currentPosition, width: 0, height: 0, isFloating: panel.desktopFloating });
      return;
    }
    const ro = new ResizeObserver(() => {
      // Report the RENDERED size (getBoundingClientRect includes the border
      // and the zoom:fontScale scaling — contentRect includes neither), so
      // the main content area is padded by exactly what the panel occupies.
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      onLayoutChange({ expanded: panel.expanded, position: panel.currentPosition, width: rect.width, height: rect.height, isFloating: panel.desktopFloating });
    });
    ro.observe(panelRef.current);
    return () => ro.disconnect();
    // fontScale changes the rendered size without a ResizeObserver event — re-measure
  }, [panel.expanded, panel.currentPosition, panel.desktopFloating, onLayoutChange, fontScale]);

  if (!sel.years.length) {
    return <div className={`${c.text} italic`}>No year data available</div>;
  }

  // Floating on desktop = the dial. The panel-style floating variant is gone;
  // undocking the sidebar always gives the circular dial selector.
  if (asSidebar && panel.desktopFloating) {
    return (
      <DialSelector
        sel={sel}
        pos={panel.floatPos}
        onDrag={panel.handleDragStart}
        onClose={panel.toggleFloating}
        colorMode={colorMode}
        colorTheme={colorTheme}
        isDark={isDark}
      />
    );
  }

  // Position styles for the fixed container
  const posStyle = asSidebar ? getPositionStyle({
    isFloating:      panel.desktopFloating,
    floatPos:        panel.floatPos,
    currentPosition: panel.currentPosition,
    topTabsPosition,
    topTabsHeight,
    topTabsWidth,
    isMobile:        panel.isMobile,
    isLandscape:     panel.isLandscape,
    fontScale,
    settingsBarHeight,
  }) : null;

  // Pinned desktop scales via zoom (floating renders the dial, handled above)
  const scaleStyle = (!panel.isMobile && fontScale !== 1) ? { zoom: fontScale } : {};

  const containerBase = asSidebar
    ? `${c.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${c.border}`
    : `mb-4 border rounded ${c.border} overflow-hidden p-4 ${c.bgLight}`;

  // Collapsed mini-panel (any docked side)
  if (!panel.expanded && asSidebar && !panel.isFloating) {
    return (
      <CollapsedPanel
        panel={panel} c={c}
        mode={sel.mode}
        label={getLabel(sel)}
        posStyle={posStyle}
        scaleStyle={scaleStyle}
        containerBase={containerBase}
        panelRef={panelRef}
      />
    );
  }

  return (
    <div
      ref={panelRef}
      className={`year-selector-container ${asSidebar ? posStyle.className : ''} ${containerBase}`}
      style={{ ...posStyle?.style, fontSize: panel.isMobile ? `${12 * fontScale}px` : '12px', ...scaleStyle }}
    >
      {/* Collapse button (sidebar, not floating, not desktop-horizontal) */}
      {asSidebar && !panel.isFloating && !panel.isHorizontal && (
        <CollapseButton panel={panel} c={c} />
      )}

      {/* Main layout */}
      <div className={panel.isHorizontal
        ? 'flex flex-row items-center px-3 py-2 gap-3'
        : 'h-full flex flex-col pt-4 pb-8'
      }>
        {/* Mode buttons */}
        <ModeControls sel={sel} panel={panel} c={c} asSidebar={asSidebar} />

        {/* Selection content */}
        <SelectionContent sel={sel} panel={panel} c={c} />

        {/* Collapse — far end of horizontal bar */}
        {asSidebar && panel.isHorizontal && (
          <div className="flex flex-row gap-1 items-center shrink-0 ml-auto pl-2">
            <button onClick={panel.toggleExpanded} className={iconBtn(c)} aria-label="Collapse">
              {panel.currentPosition === 'top' ? '↑' : '↓'}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsed (minimized) panel
// ---------------------------------------------------------------------------

function CollapsedPanel({ panel, c, mode, label, posStyle, scaleStyle, containerBase, panelRef }) {
  const { isHorizontal, currentPosition, isMobile } = panel;
  return (
    <div
      ref={panelRef}
      className={`year-selector-container ${posStyle.className} ${containerBase}`}
      style={{ ...posStyle.style, ...scaleStyle }}
    >
      {isHorizontal ? (
        /* Collapsed bar — click anywhere to expand; controls in one row */
        <div
          className="flex flex-row items-center gap-2 px-3 py-2 cursor-pointer"
          onClick={panel.toggleExpanded}
          title="Expand"
        >
          <button onClick={(e) => { e.stopPropagation(); panel.toggleExpanded(); }} className={iconBtn(c)} aria-label="Expand">
            <span>{currentPosition === 'top' ? '↓' : '↑'}</span>
          </button>
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className={`${c.text} text-[1em] opacity-70`}>{mode === 'single' ? 'Year' : 'Year Range'}</span>
            <span className={`${c.text} text-[1em] font-bold`}>{label}</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); panel.togglePosition(); }} className={iconBtn(c)} aria-label="Move panel">⇄</button>
          {!isMobile && (
            <button onClick={(e) => { e.stopPropagation(); panel.toggleFloating(); }} className={iconBtn(c)} title="Float as dial">◎</button>
          )}
        </div>
      ) : (
        /* Collapsed strip — click anywhere to expand; all buttons in one
           centered line with even spacing */
        <div
          className="h-full flex flex-col items-center px-1.5 py-2 gap-1.5 cursor-pointer"
          onClick={panel.toggleExpanded}
          title="Expand"
        >
          <button
            onClick={(e) => { e.stopPropagation(); panel.toggleExpanded(); }}
            className={iconBtn(c)}
            aria-label="Expand"
          >
            {currentPosition === 'left' ? '→' : '←'}
          </button>

          <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0">
            <div className={`${c.text} text-[1em] opacity-70`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              {mode === 'single' ? 'Year' : 'Year Range'}
            </div>
            <div className={`${c.text} text-[1em] font-bold`} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              {label}
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); panel.togglePosition(); }}
            className={iconBtn(c)}
            aria-label="Move panel"
          >⇄</button>
          {!isMobile && (
            <button
              onClick={(e) => { e.stopPropagation(); panel.toggleFloating(); }}
              className={iconBtn(c)}
              title="Float as dial"
            >◎</button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode toggle + panel control buttons
// ---------------------------------------------------------------------------

function ModeControls({ sel, panel, c, asSidebar }) {
  const { isHorizontal, isMobile } = panel;

  // Month / Day toggles (shown when applicable in either orientation)
  const monthDayToggles = (
    <>
      {sel.mode === 'single' && sel.selectedYear !== 'all' && (
        <>
          <PressButton active={sel.showMonthSelector} c={c} onClick={sel.toggleMonthSelector}>Month</PressButton>
          {sel.showMonthSelector && (
            <PressButton active={sel.showDaySelector} c={c} onClick={sel.toggleDaySelector}>Day</PressButton>
          )}
        </>
      )}
      {sel.mode === 'range' && sel.yearRange.startYear && sel.yearRange.endYear && (
        <>
          <PressButton active={sel.showRangeMonthDaySelectors} c={c} onClick={sel.toggleRangeMonthDaySelectors}>Month</PressButton>
          {sel.showRangeMonthDaySelectors && (
            <PressButton active={sel.showRangeDaySelectors} c={c} onClick={sel.toggleRangeDaySelectors}>Day</PressButton>
          )}
        </>
      )}
    </>
  );

  if (isHorizontal) {
    // Mobile landscape: vertical space is scarce — lay every control out in
    // one row so the docked bar stays a single line tall.
    const flat = isMobile && panel.isLandscape;
    const group = flat ? 'flex flex-row gap-1 items-center' : 'flex flex-col gap-1 items-center';
    // Compact columns mirroring the vertical order:
    // Single/Range · move/float · Month/Day
    return (
      <div className="flex flex-row gap-1 items-center shrink-0">
        <div className={group}>
          <PressButton active={sel.mode === 'single'} c={c} onClick={() => sel.setMode('single')}>Single</PressButton>
          <PressButton active={sel.mode === 'range'}  c={c} onClick={() => sel.setMode('range')}>Range</PressButton>
        </div>
        {asSidebar && (
          <div className={group}>
            <button onClick={panel.togglePosition} className={iconBtn(c)} aria-label="Move panel">⇄</button>
            {!isMobile && (
              <button onClick={panel.toggleFloating} className={iconBtn(c)} title="Float as dial">◎</button>
            )}
          </div>
        )}
        <div className={`${group} empty:hidden`}>
          {monthDayToggles}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 items-center mb-2">
      <PressButton active={sel.mode === 'single'} c={c} onClick={() => sel.setMode('single')}>Single</PressButton>
      <PressButton active={sel.mode === 'range'}  c={c} onClick={() => sel.setMode('range')}>Range</PressButton>

      {/* Pinned sidebar controls — vertical */}
      {asSidebar && (
        <div className="flex flex-row gap-1 mt-1">
          <button onClick={panel.togglePosition} className={iconBtn(c)} aria-label="Move panel">⇄</button>
          {!isMobile && (
            <button onClick={panel.toggleFloating} className={iconBtn(c)} title="Float as dial">◎</button>
          )}
        </div>
      )}

      {monthDayToggles}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The actual selection content (year / month / day grids)
// ---------------------------------------------------------------------------

function SelectionContent({ sel, panel, c }) {
  const { isHorizontal, isMobile, isLandscape } = panel;
  // "Stacked" = horizontal orientation but rows stacked (floating or mobile portrait)
  const stacked = isHorizontal && isMobile && !isLandscape;

  const wrapClass = isHorizontal
    ? stacked
      ? 'flex flex-col items-stretch gap-2 overflow-y-auto flex-1 min-w-0'
      : 'flex flex-row items-center gap-3 overflow-x-auto flex-1'
    : 'overflow-y-auto flex-1 min-h-0 px-1 flex flex-col items-center gap-2';

  return (
    <div className={wrapClass}>
      {sel.mode === 'single' ? (
        <SingleContent sel={sel} panel={panel} c={c} stacked={stacked} />
      ) : (
        <RangeContent sel={sel} panel={panel} c={c} stacked={stacked} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single mode content
// ---------------------------------------------------------------------------

function SingleContent({ sel, panel, c, stacked }) {
  const { isHorizontal, isMobile } = panel;
  const pinnedHz = isHorizontal && !stacked && !isMobile;
  // Mobile docked bars (portrait stacked or landscape single-line) size by
  // min item width so the grid fills the full bar width.
  const mobileHz  = isHorizontal && isMobile;
  const yearCols  = pinnedHz ? Math.ceil(sel.years.length / 2)  : 2;
  const monthCols = pinnedHz ? 6                                : 2;
  const dayCols   = pinnedHz ? Math.ceil(sel.days.length / 2)  : 3;

  return (
    <>
      {/* Year grid */}
      <YearGrid years={sel.years} selected={sel.selectedYear} onSelect={sel.setYear} cols={yearCols} minItemWidth={mobileHz ? 36 : undefined} c={c} showAll />

      {/* Month grid */}
      {sel.showMonthSelector && sel.selectedYear !== 'all' && (
        <MonthGrid selected={sel.selectedMonth} onSelect={sel.setMonth} cols={monthCols} minItemWidth={mobileHz ? 30 : undefined} c={c} />
      )}

      {/* Day grid */}
      {sel.showDaySelector && sel.showMonthSelector && sel.selectedYear !== 'all' && (
        <DayGrid days={sel.days} selected={sel.selectedDay} onSelect={sel.setDay} cols={dayCols} minItemWidth={mobileHz ? 24 : undefined} c={c} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Range mode content
// ---------------------------------------------------------------------------

function RangeContent({ sel, panel, c, stacked }) {
  const { isHorizontal, isMobile } = panel;
  const pinnedHz  = isHorizontal && !stacked && !isMobile;
  const mobileHz  = isHorizontal && isMobile;
  const yearCols  = pinnedHz ? Math.ceil(sel.years.length / 2) : 2;
  const monthCols = pinnedHz ? 6                               : 2;
  const maxDay    = Math.max(
    getDaysInMonthLocal(sel.yearRange.startYear, sel.startMonth),
    getDaysInMonthLocal(sel.yearRange.endYear,   sel.endMonth),
  );
  const dayCols   = pinnedHz ? Math.ceil(maxDay / 2)           : 3;

  return (
    <>
      {/* Range year grid */}
      <RangeYearGrid sel={sel} c={c} cols={yearCols} minItemWidth={mobileHz ? 36 : undefined} />

      {sel.showRangeMonthDaySelectors && (
        <RangeMonthGrid sel={sel} c={c} cols={monthCols} minItemWidth={mobileHz ? 30 : undefined} />
      )}

      {sel.showRangeDaySelectors && sel.showRangeMonthDaySelectors && (
        <RangeDayGrid sel={sel} c={c} cols={dayCols} minItemWidth={mobileHz ? 24 : undefined} />
      )}

      {/* Trailing hint — follows the last visible grid */}
      <RangeHint sel={sel} c={c} />
    </>
  );
}

function RangeHint({ sel, c }) {
  const { rangeYearTapPhase, rangeMonthTapPhase, rangeDayTapPhase,
          showRangeMonthDaySelectors, showRangeDaySelectors, yearRange } = sel;

  let text;
  if (showRangeDaySelectors) {
    text = rangeDayTapPhase === 'idle' ? 'Tap to reselect' : 'Tap end day';
  } else if (showRangeMonthDaySelectors) {
    text = rangeMonthTapPhase === 'idle' ? 'Tap to reselect' : 'Tap end month';
  } else {
    if (!yearRange.startYear && !yearRange.endYear) return null;
    text = rangeYearTapPhase === 'idle' && yearRange.startYear && yearRange.endYear
      ? 'Tap to reselect'
      : rangeYearTapPhase === 'idle' ? 'Tap start year' : 'Tap end year';
  }

  return <span className={`text-[0.833em] ${c.text} opacity-70 shrink-0`}>{text}</span>;
}

// ---------------------------------------------------------------------------
// Grid sub-components
// ---------------------------------------------------------------------------

function YearGrid({ years, selected, onSelect, cols, minItemWidth, c, showAll }) {
  return (
    <Grid cols={cols} minItemWidth={minItemWidth}>
      {showAll && (
        <GridBtn key="all" active={selected === 'all'} c={c} onClick={() => onSelect('all')}>
          All
        </GridBtn>
      )}
      {years.map(year => (
        <GridBtn
          key={year}
          active={year === selected}
          c={c}
          onClick={() => onSelect(year)}
        >
          {year}
        </GridBtn>
      ))}
    </Grid>
  );
}

function MonthGrid({ selected, onSelect, cols, minItemWidth, c }) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (
    <Grid cols={cols} minItemWidth={minItemWidth}>
      {MONTHS.map((name, i) => {
        const m = i + 1;
        return (
          <GridBtn key={m} active={m === selected} c={c} onClick={() => onSelect(m)}>
            {name}
          </GridBtn>
        );
      })}
    </Grid>
  );
}

function DayGrid({ days, selected, onSelect, cols, minItemWidth, c }) {
  return (
    <Grid cols={cols} minItemWidth={minItemWidth}>
      {days.map(day => (
        <GridBtn key={day} active={day === selected} c={c} onClick={() => onSelect(day)}>
          {day}
        </GridBtn>
      ))}
    </Grid>
  );
}

function RangeYearGrid({ sel, c, cols, minItemWidth }) {
  const { yearRange, rangeYearTapPhase, tapYear } = sel;
  return (
    <div>
      <Grid cols={cols} minItemWidth={minItemWidth}>
        {sel.years.map(year => {
          const isStart   = year === yearRange.startYear;
          const isEnd     = year === yearRange.endYear;
          const isBetween = yearRange.startYear && yearRange.endYear
            && parseInt(year) > parseInt(yearRange.startYear)
            && parseInt(year) < parseInt(yearRange.endYear);
          return (
            <GridBtn
              key={year}
              active={isStart || isEnd}
              between={isBetween}
              c={c}
              onClick={() => tapYear(year)}
            >
              {year}
            </GridBtn>
          );
        })}
      </Grid>
    </div>
  );
}

function RangeMonthGrid({ sel, c, cols, minItemWidth }) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const { startMonth, endMonth, yearRange, rangeMonthTapPhase, tapMonth } = sel;
  const sameYear = yearRange.startYear === yearRange.endYear;
  return (
    <div>
      <Grid cols={cols} minItemWidth={minItemWidth}>
        {MONTHS.map((name, i) => {
          const m         = i + 1;
          const isStart   = m === startMonth;
          const isEnd     = m === endMonth;
          const isBetween = sameYear && startMonth < endMonth && m > startMonth && m < endMonth;
          return (
            <GridBtn key={m} active={isStart || isEnd} between={isBetween} c={c} onClick={() => tapMonth(m)}>
              {name}
            </GridBtn>
          );
        })}
      </Grid>
    </div>
  );
}

function RangeDayGrid({ sel, c, cols, minItemWidth }) {
  const { startDay, endDay, startMonth, endMonth, yearRange, rangeDayTapPhase, tapDay } = sel;
  const maxDay = Math.max(
    getDaysInMonthLocal(yearRange.startYear, startMonth),
    getDaysInMonthLocal(yearRange.endYear,   endMonth),
  );
  const days          = Array.from({ length: maxDay }, (_, i) => i + 1);
  const sameYearMonth = yearRange.startYear === yearRange.endYear && startMonth === endMonth;
  return (
    <div>
      <Grid cols={cols} minItemWidth={minItemWidth}>
        {days.map(day => {
          const isStart   = day === startDay;
          const isEnd     = day === endDay;
          const isBetween = sameYearMonth && startDay < endDay && day > startDay && day < endDay;
          return (
            <GridBtn key={day} active={isStart || isEnd} between={isBetween} c={c} onClick={() => tapDay(day)}>
              {day}
            </GridBtn>
          );
        })}
      </Grid>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primitive UI pieces
// ---------------------------------------------------------------------------

const GRID_COLS = { 2:'grid-cols-2',3:'grid-cols-3',4:'grid-cols-4',5:'grid-cols-5',6:'grid-cols-6',7:'grid-cols-7' };

function Grid({ cols, minItemWidth, children }) {
  if (minItemWidth) {
    return (
      <div className="grid gap-1 w-full" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}px, 1fr))` }}>
        {children}
      </div>
    );
  }
  const cls = GRID_COLS[cols];
  return cls
    ? <div className={`grid ${cls} gap-1`}>{children}</div>
    : <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>{children}</div>;
}

function GridBtn({ active, between, c, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-1 py-0.5 text-[1em] rounded transition-colors whitespace-nowrap text-center ${
        active   ? `${c.bgActive} ${c.textActive} font-bold` :
        between  ? `${c.bgMed} ${c.text}` :
                   `${c.bgLighter} ${c.bgHover} ${c.text}`
      }`}
    >
      {children}
    </button>
  );
}

// Skeuomorphic "press" button (Single / Range)
function PressButton({ active, c, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`${c.toggleColorVar} px-2 py-1 rounded-sm text-[0.833em] font-bold w-14 transition-all skew-x-[-12deg] ${c.bgLighter} ${c.text} border border-[var(--toggle-shadow)] ${
        active
          ? 'translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_var(--toggle-shadow)]'
          : 'shadow-[2px_2px_0_0_var(--toggle-shadow)]'
      }`}
    >
      <span className="skew-x-[12deg] inline-block">{children}</span>
    </button>
  );
}

function CollapseButton({ panel, c }) {
  const { isHorizontal, currentPosition, isMobile } = panel;
  const arrow = isHorizontal
    ? (currentPosition === 'top' ? '↑' : '↓')
    : (currentPosition === 'left' ? '←' : '→');
  const pos = isHorizontal
    ? 'right-2 top-1'
    : `${currentPosition === 'left' ? 'right-1' : 'left-1'} ${isMobile ? 'bottom-2' : 'bottom-20'}`;
  return (
    <button
      onClick={panel.toggleExpanded}
      className={`absolute ${pos} ${iconBtn(c)}`}
      aria-label="Collapse"
    >
      {arrow}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iconBtn(c) {
  return `${c.toggleColorVar} p-1 rounded-full ${c.bgLighter} ${c.text} border border-[var(--toggle-shadow)] shadow-[2px_2px_0_0_var(--toggle-shadow)] flex items-center justify-center w-6 h-6 text-[1em]`;
}

function getDaysInMonthLocal(year, month) {
  if (!year || year === 'all') return 31;
  return new Date(parseInt(year), month, 0).getDate();
}

function getLabel(sel) {
  const { mode, selectedYear, selectedMonth, selectedDay, showMonthSelector, showDaySelector,
          yearRange, startMonth, startDay, endMonth, endDay, showRangeMonthDaySelectors, showRangeDaySelectors } = sel;
  const pad = n => String(n).padStart(2, '0');

  if (mode === 'single') {
    if (selectedYear === 'all') return 'All Time';
    if (showMonthSelector && showDaySelector) return `${selectedYear}-${pad(selectedMonth)}-${pad(selectedDay)}`;
    if (showMonthSelector) return `${selectedYear}-${pad(selectedMonth)}`;
    return selectedYear;
  }

  const { startYear, endYear } = yearRange;
  if (!startYear || !endYear) return '—';

  if (showRangeMonthDaySelectors && showRangeDaySelectors) {
    const s = `${startYear}-${pad(startMonth)}-${pad(startDay)}`;
    const e = `${endYear}-${pad(endMonth)}-${pad(endDay)}`;
    return s === e ? s : `${s} to ${e}`;
  }
  if (showRangeMonthDaySelectors) {
    const s = `${startYear}-${pad(startMonth)}`;
    const e = `${endYear}-${pad(endMonth)}`;
    return s === e ? s : `${s} to ${e}`;
  }
  return startYear === endYear ? startYear : `${startYear}–${endYear}`;
}

function getPositionStyle({ isFloating, floatPos, currentPosition, topTabsPosition, topTabsHeight, topTabsWidth, isMobile, isLandscape, fontScale, settingsBarHeight = 40 }) {
  if (isFloating) {
    return { className: 'fixed z-[100]', style: { left: `${floatPos.x}px`, top: `${floatPos.y}px` } };
  }

  // Desktop: use the measured settings-bar height (scales with font size)
  const settingsBar = isMobile ? (isLandscape ? 48 : 85) : settingsBarHeight;
  const tabsH = topTabsHeight ?? (isMobile ? 48 : 56);
  const tabsW = topTabsWidth ?? (isMobile ? 160 : 192);
  const sameSide = topTabsPosition === currentPosition;

  // The desktop panel renders inside `zoom: fontScale`, which multiplies
  // fixed-position offsets. Divide real-pixel offsets by the zoom so the
  // panel lands exactly where intended (e.g. flush under TopTabs).
  const z = isMobile ? 1 : (fontScale || 1);
  const px = (n) => `${Math.round(n / z)}px`;

  switch (currentPosition) {
    case 'top': return {
      className: 'fixed z-[89]',
      style: {
        top:   sameSide
          ? (isMobile ? `calc(env(safe-area-inset-top) + ${tabsH}px)` : px(settingsBar + tabsH))
          : (isMobile ? '0px' : px(settingsBar)),
        left:  topTabsPosition === 'left'  ? px(tabsW) : '0px',
        right: topTabsPosition === 'right' ? px(tabsW) : '0px',
      }
    };
    case 'bottom': return {
      className: 'fixed z-[89]',
      style: {
        bottom: sameSide
          ? (isMobile ? `${settingsBar + tabsH}px` : px(tabsH))
          : (isMobile ? `${settingsBar}px` : '0px'),
        left:   topTabsPosition === 'left'  ? px(tabsW) : '0px',
        right:  topTabsPosition === 'right' ? px(tabsW) : '0px',
      }
    };
    case 'left': return {
      className: 'fixed z-[90]',
      style: {
        left:   sameSide ? px(tabsW) : '0px',
        top:    topTabsPosition === 'top'
          ? (isMobile ? `calc(env(safe-area-inset-top) + ${tabsH - 1}px)` : px(settingsBar + tabsH - 1))
          : (isMobile ? '0px' : px(settingsBar)),
        bottom: topTabsPosition === 'bottom'
          ? (isMobile ? `${settingsBar + tabsH}px` : px(tabsH))
          : (isMobile ? `${settingsBar}px` : '0px'),
      }
    };
    case 'right': return {
      className: 'fixed z-[90]',
      style: {
        right:  sameSide ? px(tabsW) : '0px',
        top:    topTabsPosition === 'top'
          ? (isMobile ? `calc(env(safe-area-inset-top) + ${tabsH - 1}px)` : px(settingsBar + tabsH - 1))
          : (isMobile ? '0px' : px(settingsBar)),
        bottom: topTabsPosition === 'bottom'
          ? (isMobile ? `${settingsBar + tabsH}px` : px(tabsH))
          : (isMobile ? `${settingsBar}px` : '0px'),
      }
    };
    default: return { className: 'fixed right-0 top-20 bottom-0 z-[90]', style: {} };
  }
}

// ---------------------------------------------------------------------------
// Backward-compat shim
//
// SpotifyAnalyzer still passes the old prop names. This shim adapts them
// so the new component can be dropped in without touching the parent yet.
// ---------------------------------------------------------------------------

export function YearSelectorCompat(props) {
  const {
    onYearChange,
    onYearRangeChange,
    onToggleRangeMode,
    onExpandChange,
    onPositionChange,
    onWidthChange,
    onHeightChange,
    onTransitionChange, // not used in new component — parent uses ResizeObserver
    textTheme,          // not used in new component — colorTheme handles everything
    isRangeMode,
    initialYear,
    initialYearRange,
    ...rest
  } = props;

  const prevModeRef = React.useRef(null);

  const handleChange = React.useCallback(({ mode, value }) => {
    if (mode === 'single') {
      onYearChange?.(value);
    } else {
      onYearRangeChange?.(value);
    }
    // Fire onToggleRangeMode only when mode actually changes
    if (mode !== prevModeRef.current) {
      onToggleRangeMode?.(mode === 'range');
      prevModeRef.current = mode;
    }
  }, [onYearChange, onYearRangeChange, onToggleRangeMode]);

  const handleLayoutChange = React.useCallback(({ expanded, position, width, height, isFloating }) => {
    onExpandChange?.(expanded);
    onPositionChange?.(position);
    if (isFloating) {
      onWidthChange?.(0);
      onHeightChange?.(0);
    } else {
      const isVertical = position === 'left' || position === 'right';
      onWidthChange?.(isVertical ? width : 0);
      onHeightChange?.(isVertical ? 0 : height);
    }
  }, [onExpandChange, onPositionChange, onWidthChange, onHeightChange]);

  return (
    <YearSelector
      {...rest}
      isRangeMode={isRangeMode}
      initialYear={initialYear}
      initialYearRange={initialYearRange}
      onChange={handleChange}
      onLayoutChange={handleLayoutChange}
    />
  );
}
