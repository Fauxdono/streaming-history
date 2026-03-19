import { useReducer, useEffect, useMemo, useRef, useState } from 'react';

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------------------------------------------------------------------------
// Pure helpers (defined outside — no re-creation on render)
// ---------------------------------------------------------------------------

export function getDaysInMonth(year, month) {
  if (!year || year === 'all') return 31;
  return new Date(parseInt(year), month, 0).getDate();
}

function clampDay(day, year, month) {
  return Math.min(day, getDaysInMonth(year, month));
}

export function findFirstDayWithData(year, rawPlayData) {
  if (!rawPlayData?.length || year === 'all') return { month: 1, day: 1 };
  const yearInt = parseInt(year);
  const sorted = rawPlayData
    .filter(entry => {
      try {
        const d = new Date(entry.ts);
        return !isNaN(d.getTime()) && d.getFullYear() === yearInt;
      } catch { return false; }
    })
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
  if (!sorted.length) return { month: 1, day: 1 };
  const d = new Date(sorted[0].ts);
  return { month: d.getMonth() + 1, day: d.getDate() };
}

// Serialises current selection to the string format the parent expects.
// Single: 'all' | 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD'
// Range:  { startYear: string, endYear: string }  (same formats per field)
function formatSingleValue(year, month, day, showMonth, showDay) {
  if (year === 'all') return 'all';
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  if (showMonth && showDay) return `${year}-${mm}-${dd}`;
  if (showMonth) return `${year}-${mm}`;
  return year;
}

function formatRangeValue(state) {
  const { yearRange, startMonth, startDay, endMonth, endDay, showRangeMonthDaySelectors, showRangeDaySelectors } = state;
  if (!yearRange.startYear || !yearRange.endYear) return null;
  if (showRangeMonthDaySelectors && showRangeDaySelectors) {
    return {
      startYear: `${yearRange.startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
      endYear:   `${yearRange.endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
    };
  }
  if (showRangeMonthDaySelectors) {
    return {
      startYear: `${yearRange.startYear}-${String(startMonth).padStart(2, '0')}`,
      endYear:   `${yearRange.endYear}-${String(endMonth).padStart(2, '0')}`,
    };
  }
  return { startYear: yearRange.startYear, endYear: yearRange.endYear };
}

// Parse a 'YYYY', 'YYYY-MM', or 'YYYY-MM-DD' string into parts.
function parseDate(str) {
  if (!str?.includes('-')) return { year: str ?? '', month: 1, day: 1, hasMonth: false, hasDay: false };
  const parts = str.split('-');
  return {
    year:     parts[0],
    month:    parts[1] ? parseInt(parts[1]) : 1,
    day:      parts[2] ? parseInt(parts[2]) : 1,
    hasMonth: parts.length >= 2,
    hasDay:   parts.length >= 3,
  };
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const INITIAL_STATE = {
  mode: 'single',
  // single
  selectedYear:         'all',
  selectedMonth:        1,
  selectedDay:          1,
  showMonthSelector:    false,
  showDaySelector:      false,
  userEnabledSelectors: false,
  // range
  yearRange:                    { startYear: '', endYear: '' },
  startMonth:                   1,
  startDay:                     1,
  endMonth:                     12,
  endDay:                       31,
  showRangeMonthDaySelectors:   false,
  showRangeDaySelectors:        false,
  // range tap phases
  rangeYearTapPhase:  'idle',
  rangeMonthTapPhase: 'idle',
  rangeDayTapPhase:   'idle',
};

function reducer(state, action) {
  switch (action.type) {

    // ---- Mode switch -------------------------------------------------------
    case 'SET_MODE': {
      const { mode, years } = action;
      if (state.mode === mode) return state;

      if (mode === 'single') {
        const { yearRange: yr, startMonth: sm, startDay: sd, endMonth: em, endDay: ed, showRangeMonthDaySelectors: showM } = state;
        // Exact match: single date → preserve
        if (showM && yr.startYear === yr.endYear && sm === em && sd === ed) {
          return { ...state, mode, selectedYear: yr.startYear, selectedMonth: sm, selectedDay: sd,
            showMonthSelector: true, showDaySelector: true, rangeYearTapPhase: 'idle' };
        }
        // Same year, no month/day → year only
        if (!showM && yr.startYear === yr.endYear) {
          return { ...state, mode, selectedYear: yr.startYear,
            showMonthSelector: false, showDaySelector: false, rangeYearTapPhase: 'idle' };
        }
        // Month-level match
        if (showM && yr.startYear === yr.endYear && sm === em) {
          return { ...state, mode, selectedYear: yr.startYear, selectedMonth: sm,
            showMonthSelector: true, showDaySelector: false, rangeYearTapPhase: 'idle' };
        }
        return { ...state, mode, selectedYear: 'all', showMonthSelector: false, showDaySelector: false, rangeYearTapPhase: 'idle' };
      }

      if (mode === 'range') {
        if (!years?.length) return state;
        const { selectedYear: sy, selectedMonth: smo, selectedDay: sda, showMonthSelector: showM, showDaySelector: showD } = state;
        if (showM && showD && sy !== 'all') {
          return { ...state, mode,
            yearRange: { startYear: sy, endYear: sy },
            startMonth: smo, endMonth: smo, startDay: sda, endDay: sda,
            showRangeMonthDaySelectors: true, showRangeDaySelectors: true };
        }
        if (showM && !showD && sy !== 'all') {
          return { ...state, mode,
            yearRange: { startYear: sy, endYear: sy },
            startMonth: smo, endMonth: smo,
            showRangeMonthDaySelectors: true, showRangeDaySelectors: false };
        }
        if (!showM && sy !== 'all') {
          return { ...state, mode, yearRange: { startYear: sy, endYear: sy }, showRangeMonthDaySelectors: false };
        }
        return { ...state, mode, yearRange: { startYear: years[0], endYear: years[years.length - 1] }, showRangeMonthDaySelectors: false };
      }

      return state;
    }

    // ---- Single: year ------------------------------------------------------
    case 'SET_YEAR': {
      const { year, isHistoryTab, rawPlayData } = action;
      if (year === 'all') {
        return { ...state, selectedYear: 'all', showMonthSelector: false, showDaySelector: false, userEnabledSelectors: false };
      }
      if (isHistoryTab) {
        const first = findFirstDayWithData(year, rawPlayData);
        const validDay = clampDay(first.day, year, first.month);
        return { ...state, selectedYear: year, selectedMonth: first.month, selectedDay: validDay,
          showMonthSelector: true, showDaySelector: true };
      }
      // Coming from 'all' → reset selectors; otherwise keep them as-is
      if (state.selectedYear === 'all' || state.selectedYear == null) {
        return { ...state, selectedYear: year, showMonthSelector: false, showDaySelector: false };
      }
      return { ...state, selectedYear: year };
    }

    // ---- Single: month -----------------------------------------------------
    case 'SET_MONTH': {
      const { month, isHistoryTab } = action;
      const yearForDays = state.selectedYear === 'all' ? 2024 : state.selectedYear;
      const validDay = clampDay(state.selectedDay, yearForDays, month);
      const userEnabled = (!isHistoryTab && state.showMonthSelector) ? true : state.userEnabledSelectors;
      return { ...state, selectedMonth: month, selectedDay: validDay, userEnabledSelectors: userEnabled };
    }

    // ---- Single: day -------------------------------------------------------
    case 'SET_DAY': {
      const { day, isHistoryTab } = action;
      const userEnabled = !isHistoryTab ? true : state.userEnabledSelectors;
      return { ...state, selectedDay: day, userEnabledSelectors: userEnabled };
    }

    // ---- Single: toggle selectors ------------------------------------------
    case 'TOGGLE_MONTH_SELECTOR': {
      const next = !state.showMonthSelector;
      return { ...state, showMonthSelector: next,
        showDaySelector: next ? state.showDaySelector : false,
        userEnabledSelectors: true };
    }

    case 'TOGGLE_DAY_SELECTOR': {
      const next = !state.showDaySelector;
      return { ...state, showDaySelector: next,
        showMonthSelector: next ? true : state.showMonthSelector,
        userEnabledSelectors: true };
    }

    // ---- Range: year -------------------------------------------------------
    case 'SET_YEAR_RANGE': {
      const { startYear, endYear } = action;
      const validStartDay = clampDay(state.startDay, startYear, state.startMonth);
      const validEndDay   = clampDay(state.endDay, endYear, state.endMonth);
      return { ...state, yearRange: { startYear, endYear }, startDay: validStartDay, endDay: validEndDay, rangeYearTapPhase: 'idle' };
    }

    case 'TAP_YEAR': {
      const { year } = action;
      if (state.rangeYearTapPhase === 'idle') {
        return { ...state, rangeYearTapPhase: 'start-set', yearRange: { startYear: year, endYear: '' } };
      }
      const start = state.yearRange.startYear;
      const [s, e] = parseInt(year) < parseInt(start) ? [year, start] : [start, year];
      return { ...state, rangeYearTapPhase: 'idle', yearRange: { startYear: s, endYear: e } };
    }

    // ---- Range: months / days ----------------------------------------------
    case 'SET_START_MONTH': {
      const validDay = clampDay(state.startDay, state.yearRange.startYear, action.month);
      return { ...state, startMonth: action.month, startDay: validDay };
    }

    case 'SET_START_DAY':
      return { ...state, startDay: action.day };

    case 'SET_END_MONTH': {
      const validDay = clampDay(state.endDay, state.yearRange.endYear, action.month);
      return { ...state, endMonth: action.month, endDay: validDay };
    }

    case 'SET_END_DAY':
      return { ...state, endDay: action.day };

    case 'TAP_MONTH': {
      const { month } = action;
      if (state.rangeMonthTapPhase === 'idle') {
        const validDay = clampDay(state.startDay, state.yearRange.startYear, month);
        return { ...state, rangeMonthTapPhase: 'start-set', startMonth: month, startDay: validDay };
      }
      // Same year: swap if needed so start <= end
      if (state.yearRange.startYear === state.yearRange.endYear && month < state.startMonth) {
        return { ...state, rangeMonthTapPhase: 'idle',
          startMonth: month, startDay: clampDay(state.startDay, state.yearRange.startYear, month),
          endMonth: state.startMonth, endDay: clampDay(state.endDay, state.yearRange.endYear, state.startMonth) };
      }
      return { ...state, rangeMonthTapPhase: 'idle',
        endMonth: month, endDay: clampDay(state.endDay, state.yearRange.endYear, month) };
    }

    case 'TAP_DAY': {
      const { day } = action;
      if (state.rangeDayTapPhase === 'idle') {
        return { ...state, rangeDayTapPhase: 'start-set', startDay: day };
      }
      const sameContext = state.yearRange.startYear === state.yearRange.endYear && state.startMonth === state.endMonth;
      if (sameContext && day < state.startDay) {
        return { ...state, rangeDayTapPhase: 'idle', startDay: day, endDay: state.startDay };
      }
      return { ...state, rangeDayTapPhase: 'idle', endDay: day };
    }

    case 'TOGGLE_RANGE_MONTH_DAY_SELECTORS': {
      const next = !state.showRangeMonthDaySelectors;
      return { ...state, showRangeMonthDaySelectors: next,
        showRangeDaySelectors: next ? state.showRangeDaySelectors : false };
    }

    case 'TOGGLE_RANGE_DAY_SELECTORS': {
      const next = !state.showRangeDaySelectors;
      return { ...state, showRangeDaySelectors: next,
        showRangeMonthDaySelectors: next ? true : state.showRangeMonthDaySelectors };
    }

    // ---- Prop sync ---------------------------------------------------------
    case 'SYNC_INITIAL_YEAR': {
      const { year } = action;
      if (!year) return state;
      if (year === 'all') {
        return { ...state, selectedYear: 'all', showMonthSelector: false, showDaySelector: false, userEnabledSelectors: false };
      }
      if (year.includes('-')) {
        const parts = year.split('-');
        const month = parts[1] ? parseInt(parts[1]) : 1;
        const day   = parts[2] ? parseInt(parts[2]) : 1;
        return { ...state, selectedYear: parts[0], selectedMonth: month, selectedDay: day,
          showMonthSelector: parts.length >= 2, showDaySelector: parts.length >= 3, mode: 'single' };
      }
      return { ...state, selectedYear: year };
    }

    case 'SYNC_INITIAL_YEAR_RANGE': {
      const { startYear, endYear } = action;
      if (!startYear || !endYear) return state;
      const start = parseDate(startYear);
      const end   = parseDate(endYear);
      return { ...state,
        yearRange: { startYear: start.year, endYear: end.year },
        startMonth: start.month, startDay: start.day,
        endMonth:   end.month,   endDay:   end.day,
        showRangeMonthDaySelectors: start.hasMonth || end.hasMonth,
        showRangeDaySelectors:      start.hasDay   || end.hasDay,
      };
    }

    case 'SYNC_ACTIVE_TAB': {
      const { activeTab } = action;
      // Never override a user's manual choice
      if (state.selectedYear === 'all' || state.userEnabledSelectors) return state;
      const isHistory = activeTab === 'history';
      if (isHistory) return { ...state, showMonthSelector: true,  showDaySelector: true  };
      return           { ...state, showMonthSelector: false, showDaySelector: false };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useYearSelectorState({
  artistsByYear,
  rawPlayData = [],
  initialYear,
  initialYearRange,
  isRangeMode,
  activeTab,
  onChange,
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, (init) => ({
    ...init,
    mode:         isRangeMode ? 'range' : 'single',
    selectedYear: initialYear || 'all',
  }));

  // Persisted preference: tap-to-select range behaviour
  const [rangeTapMode, setRangeTapMode] = useLocalStorage('yearSelectorRangeTapMode', true);

  // Derived: available years
  const years = useMemo(() => {
    if (!artistsByYear || typeof artistsByYear !== 'object') return [];
    return Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
  }, [artistsByYear]);

  // Derived: day arrays
  const days      = useMemo(() => range(getDaysInMonth(state.selectedYear, state.selectedMonth)), [state.selectedYear, state.selectedMonth]);
  const startDays = useMemo(() => range(getDaysInMonth(state.yearRange.startYear, state.startMonth)), [state.yearRange.startYear, state.startMonth]);
  const endDays   = useMemo(() => range(getDaysInMonth(state.yearRange.endYear,   state.endMonth)),   [state.yearRange.endYear,   state.endMonth]);

  // ---------------------------------------------------------------------------
  // Sync incoming props → state
  // ---------------------------------------------------------------------------
  const prevInitialYear = useRef(initialYear);
  useEffect(() => {
    if (initialYear === prevInitialYear.current) return;
    prevInitialYear.current = initialYear;
    dispatch({ type: 'SYNC_INITIAL_YEAR', year: initialYear });
  }, [initialYear]);

  useEffect(() => {
    if (!initialYearRange?.startYear || !initialYearRange?.endYear) return;
    dispatch({ type: 'SYNC_INITIAL_YEAR_RANGE', ...initialYearRange });
  }, [initialYearRange]);

  useEffect(() => {
    dispatch({ type: 'SET_MODE', mode: isRangeMode ? 'range' : 'single', years });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRangeMode]);

  useEffect(() => {
    dispatch({ type: 'SYNC_ACTIVE_TAB', activeTab });
  }, [activeTab, state.selectedYear, state.userEnabledSelectors]);

  // ---------------------------------------------------------------------------
  // Fire onChange when selection changes
  // ---------------------------------------------------------------------------
  const prevChangeRef = useRef(null);
  useEffect(() => {
    if (!onChange) return;
    let value;
    if (state.mode === 'single') {
      value = formatSingleValue(state.selectedYear, state.selectedMonth, state.selectedDay, state.showMonthSelector, state.showDaySelector);
    } else {
      value = formatRangeValue(state);
      if (!value) return; // incomplete range — don't fire yet
    }
    const serialized = JSON.stringify(value);
    if (serialized === prevChangeRef.current) return;
    prevChangeRef.current = serialized;
    onChange({ mode: state.mode, value });
  }, [
    state.mode,
    state.selectedYear, state.selectedMonth, state.selectedDay,
    state.showMonthSelector, state.showDaySelector,
    state.yearRange, state.startMonth, state.startDay, state.endMonth, state.endDay,
    state.showRangeMonthDaySelectors, state.showRangeDaySelectors,
    onChange,
  ]);

  // ---------------------------------------------------------------------------
  // Convenience: capture isHistoryTab once per render so actions don't close over stale values
  // ---------------------------------------------------------------------------
  const isHistoryTab = activeTab === 'history';

  return {
    // ---- read ----
    mode:   state.mode,
    years,

    // single
    selectedYear:         state.selectedYear,
    selectedMonth:        state.selectedMonth,
    selectedDay:          state.selectedDay,
    showMonthSelector:    state.showMonthSelector,
    showDaySelector:      state.showDaySelector,

    // range
    yearRange:                  state.yearRange,
    startMonth:                 state.startMonth,
    startDay:                   state.startDay,
    endMonth:                   state.endMonth,
    endDay:                     state.endDay,
    showRangeMonthDaySelectors: state.showRangeMonthDaySelectors,
    showRangeDaySelectors:      state.showRangeDaySelectors,

    // tap phases
    rangeYearTapPhase:  state.rangeYearTapPhase,
    rangeMonthTapPhase: state.rangeMonthTapPhase,
    rangeDayTapPhase:   state.rangeDayTapPhase,
    rangeTapMode,

    // derived
    days, startDays, endDays,
    monthNames:    MONTH_NAMES,
    getDaysInMonth,

    // ---- write — single ----
    setMode:               (mode) => dispatch({ type: 'SET_MODE', mode, years }),
    setYear:               (year) => dispatch({ type: 'SET_YEAR', year, isHistoryTab, rawPlayData }),
    setMonth:              (month) => dispatch({ type: 'SET_MONTH', month, isHistoryTab }),
    setDay:                (day)   => dispatch({ type: 'SET_DAY', day, isHistoryTab }),
    toggleMonthSelector:   ()      => dispatch({ type: 'TOGGLE_MONTH_SELECTOR' }),
    toggleDaySelector:     ()      => dispatch({ type: 'TOGGLE_DAY_SELECTOR' }),

    // ---- write — range ----
    setYearRange:                  ({ startYear, endYear }) => dispatch({ type: 'SET_YEAR_RANGE', startYear, endYear }),
    setStartMonth:                 (month) => dispatch({ type: 'SET_START_MONTH', month }),
    setStartDay:                   (day)   => dispatch({ type: 'SET_START_DAY', day }),
    setEndMonth:                   (month) => dispatch({ type: 'SET_END_MONTH', month }),
    setEndDay:                     (day)   => dispatch({ type: 'SET_END_DAY', day }),
    toggleRangeMonthDaySelectors:  ()      => dispatch({ type: 'TOGGLE_RANGE_MONTH_DAY_SELECTORS' }),
    toggleRangeDaySelectors:       ()      => dispatch({ type: 'TOGGLE_RANGE_DAY_SELECTORS' }),

    // ---- write — tap ----
    tapYear:  (year)  => dispatch({ type: 'TAP_YEAR',  year }),
    tapMonth: (month) => dispatch({ type: 'TAP_MONTH', month }),
    tapDay:   (day)   => dispatch({ type: 'TAP_DAY',   day }),
    setRangeTapMode,
  };
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function range(n) {
  return Array.from({ length: n }, (_, i) => i + 1);
}

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      return JSON.parse(stored);
    } catch { return defaultValue; }
  });

  const set = (next) => {
    setValue(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(next));
    }
  };

  return [value, set];
}
