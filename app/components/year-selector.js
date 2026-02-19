// Optimized YearSelector.js with performance improvements
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTheme } from './themeprovider';

// Cache for expensive operations
const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const YearSelector = ({
  artistsByYear,
  rawPlayData = [], // Add rawPlayData to find first day with data
  onYearChange,
  onYearRangeChange,
  onExpandChange, // New callback to communicate expanded state to parent
  onPositionChange, // New callback to communicate position changes to parent
  onWidthChange, // New callback to communicate width changes to parent
  onHeightChange, // New callback to communicate height changes to parent
  onTransitionChange, // New callback to communicate transition state to parent
  initialYear,
  initialYearRange,
  isRangeMode,
  onToggleRangeMode,
  colorTheme = 'teal',
  textTheme = null, // Add separate textTheme prop for text-only color control
  colorMode = 'colorful', // Add colorMode for minimal (b&w) vs colorful styling
  position = 'right',
  startMinimized = false,
  asSidebar = false,
  activeTab = null, // Add activeTab to determine behavior
  topTabsPosition = 'top', // Add topTabsPosition to avoid collision
  topTabsHeight = 56, // Add topTabsHeight for proper spacing
  topTabsWidth = 192 // Add topTabsWidth for proper spacing
}) => {
  // Enhanced screen size detection
  const [screenInfo, setScreenInfo] = useState({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isLandscape: false,
    category: 'desktop'
  });
  
  // Floating mode state (desktop only) with localStorage persistence
  const [isFloating, setIsFloating] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('yearSelectorFloating');
    return stored === null ? true : stored === 'true';
  });
  const [floatPos, setFloatPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 800, y: 100 };
    try {
      const stored = localStorage.getItem('yearSelectorFloatPos');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return { x: Math.max(0, window.innerWidth - 200), y: 100 };
  });
  const [floatOrientation, setFloatOrientation] = useState(() => {
    if (typeof window === 'undefined') return 'vertical';
    return localStorage.getItem('yearSelectorFloatOrientation') || 'vertical';
  });
  const [floatScale, setFloatScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    return parseFloat(localStorage.getItem('yearSelectorFloatScale') || '1');
  });
  const isDraggingFloatRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, scale: 1 });
  const prevInitialYearRef = useRef(initialYear);

  // Position memory - remember last position for each component
  const [positionMemory, setPositionMemory] = useState({
    last: position,
    history: [position]
  });
  
  // Core state
  const [mode, setMode] = useState(isRangeMode ? 'range' : 'single');
  const [expanded, setExpanded] = useState(!startMinimized);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [selectedYear, setSelectedYear] = useState(initialYear || 'all');
  const [yearRange, setYearRange] = useState({ 
    startYear: initialYearRange?.startYear || '', 
    endYear: initialYearRange?.endYear || '' 
  });
  
  // UI state
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const isHorizontal = (!isMobile && isFloating)
    ? floatOrientation === 'horizontal'
    : (currentPosition === 'top' || currentPosition === 'bottom');

  // Get font size for dynamic settings bar height
  const { fontSize } = useTheme();
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isPositionTransitioning, setIsPositionTransitioning] = useState(false);
  
  // Month and Day Selection - for single year mode
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  // Track if user has manually enabled selectors to preserve their choice
  const [userEnabledSelectors, setUserEnabledSelectors] = useState(false);
  
  // Month and Day Selection - for range mode
  const [showRangeMonthDaySelectors, setShowRangeMonthDaySelectors] = useState(false);
  const [showRangeDaySelectors, setShowRangeDaySelectors] = useState(false);
  const [startMonth, setStartMonth] = useState(1);
  const [startDay, setStartDay] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [endDay, setEndDay] = useState(31);
  const [rangeYearTapPhase, setRangeYearTapPhase] = useState('idle');

  // Base dimensions before scaling (must be after all state declarations)
  const getBaseDimensions = () => {
    if (!expanded) {
      return { width: 32, height: 48 };
    }
    const isHorizontal = (!isMobile && isFloating)
      ? floatOrientation === 'horizontal'
      : (currentPosition === 'top' || currentPosition === 'bottom');
    const isMobilePortraitHz = isHorizontal && isMobile && !isLandscape;
    const yearCount = years.length || 6;

    if (mode === 'single') {
      if (isHorizontal && !isMobilePortraitHz) {
        // Desktop horizontal: years in one row, month/day grids are side-by-side (flex-row)
        // Height is max of sections, not sum
        let h = 44; // base: mode buttons row + year row
        if (showMonthSelector) h = Math.max(h, 56); // 12 months in 1 row
        if (showDaySelector) h = Math.max(h, 56); // 31 days in 1 row
        return { width: 200, height: h };
      }
      const cols = isMobilePortraitHz ? 3 : 2;
      const yearRows = Math.ceil(yearCount / cols);
      let h = 30 + (yearRows * 26) + 8;
      if (showMonthSelector) h += 110;
      if (showDaySelector) h += 140;
      const w = isMobilePortraitHz ? 200 : 90;
      return { width: w, height: Math.max(120, h) };
    }

    if (mode === 'range') {
      if (isHorizontal && !isMobilePortraitHz) {
        // Desktop horizontal: year grid in one row, month/day grids side-by-side
        let h = 50; // base: mode buttons + year row + instruction label
        if (showRangeMonthDaySelectors) h = Math.max(h, 80); // month grids 2 rows
        if (showRangeMonthDaySelectors && showRangeDaySelectors) h = Math.max(h, 100); // day grids 3 rows
        return { width: 300, height: h };
      }
      const cols = isMobilePortraitHz ? 3 : 2;
      const yearRows = Math.ceil(yearCount / cols);
      let h = (yearRows * 26) + 30;
      if (showRangeMonthDaySelectors) h += 200;
      if (showRangeMonthDaySelectors && showRangeDaySelectors) h += 200;
      return { width: isMobilePortraitHz ? 180 : 180, height: Math.max(180, h) };
    }
  };

  const getCurrentDimensions = () => {
    return getBaseDimensions();
  };

  // Extract years from artistsByYear and memoize result
  const years = useMemo(() => {
    // Check if artistsByYear is available
    if (!artistsByYear || typeof artistsByYear !== 'object') {
      console.warn('🔍 YearSelector: artistsByYear is not available or not an object', {
        artistsByYear: artistsByYear,
        type: typeof artistsByYear,
        isNull: artistsByYear === null,
        isUndefined: artistsByYear === undefined
      });
      return [];
    }
    
    const availableYears = Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
    console.log('🔍 YearSelector: Available years from artistsByYear:', availableYears);
    console.log('🔍 YearSelector: Sample year data:', availableYears[0] ? Object.keys(artistsByYear[availableYears[0]]).slice(0, 3) : 'no data');
    return availableYears;
  }, [artistsByYear]);
  
  // Generate all months (1-12) - back to simple approach
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Efficient function to get days in month
  const getDaysInMonth = useCallback((year, month) => {
    if (!year || year === 'all') return 31;
    // JavaScript months are 0-based, but our month parameter is 1-based
    return new Date(parseInt(year), month, 0).getDate();
  }, []);
  
  // Create the days arrays as simple arrays - back to basic approach
  const days = Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1);
  const startDays = Array.from({ length: getDaysInMonth(yearRange.startYear, startMonth) }, (_, i) => i + 1);
  const endDays = Array.from({ length: getDaysInMonth(yearRange.endYear, endMonth) }, (_, i) => i + 1);
  
  // Enhanced screen size detection
  useEffect(() => {
    const updateScreenInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;
      
      // Categorize screen size
      let category = 'desktop';
      let isMobile = false;
      let isTablet = false;
      
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isLandscapeMobile = isTouch && height < 500;
      if (width < 640 || isLandscapeMobile) {
        category = 'mobile';
        isMobile = true;
      } else if (width < 1024) {
        category = 'tablet';
        isTablet = true;
      }
      
      setScreenInfo({
        width,
        height,
        isMobile,
        isTablet,
        isLandscape,
        category
      });
      
      // Update legacy state for compatibility
      setIsMobile(isMobile);
      setIsLandscape(isLandscape);
      if (isMobile) setIsFloating(false);
    };
    
    // Initial check
    updateScreenInfo();
    
    // Add listeners
    window.addEventListener('resize', updateScreenInfo);
    window.addEventListener('orientationchange', updateScreenInfo);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateScreenInfo);
      window.removeEventListener('orientationchange', updateScreenInfo);
    };
  }, []);

  // Persist floating state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('yearSelectorFloating', String(isFloating));
    }
  }, [isFloating]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('yearSelectorFloatPos', JSON.stringify(floatPos));
    }
  }, [floatPos]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('yearSelectorFloatOrientation', floatOrientation);
    }
  }, [floatOrientation]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('yearSelectorFloatScale', String(floatScale));
    }
  }, [floatScale]);

  // Clean up old scaling localStorage key
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('yearSelectorScale');
    }
  }, []);

  // Force re-render when positioning needs to update
  const [positionKey, setPositionKey] = useState(0);
  
  // Trigger positioning recalculation when expanded state changes (skip on mobile)
  useEffect(() => {
    if (!isMobile) {
      setPositionKey(prev => prev + 1);
    }
  }, [expanded, currentPosition, topTabsPosition, topTabsHeight, asSidebar, isMobile]);

  // Communicate all state changes to parent using preset dimensions
  useEffect(() => {
    if (asSidebar) {
      // Report all states atomically
      if (onExpandChange) onExpandChange(expanded);
      if (onPositionChange) onPositionChange(currentPosition);

      // Floating desktop mode: report 0 dims so content uses full width
      if (!isMobile && isFloating) {
        if (onWidthChange) onWidthChange(0);
        if (onHeightChange) onHeightChange(0);
        return;
      }

      const dimensions = getCurrentDimensions();
      // Report dimensions based on current position - always check if callbacks exist
      if (currentPosition === 'left' || currentPosition === 'right') {
        if (onWidthChange) onWidthChange(dimensions.width);
        if (onHeightChange) onHeightChange(0);
      } else if (currentPosition === 'top' || currentPosition === 'bottom') {
        if (onHeightChange) onHeightChange(dimensions.height);
        if (onWidthChange) onWidthChange(0);
      }
    }
  }, [expanded, currentPosition, mode, asSidebar, isMobile, isFloating, years.length, showMonthSelector, showDaySelector, showRangeMonthDaySelectors, showRangeDaySelectors]);


  // When isRangeMode prop changes, update our internal mode state
  useEffect(() => {
    setMode(isRangeMode ? 'range' : 'single');
  }, [isRangeMode]);

  // Communicate height changes to parent (for top/bottom positions)
  useEffect(() => {
    if (onHeightChange) {
      // Skip DOM measurement in floating mode — dims already reported as 0
      if (!isMobile && isFloating) return;

      if (currentPosition === 'top' || currentPosition === 'bottom') {
        // Measure actual height dynamically
        const measureHeight = () => {
          const yearSelectorElement = document.querySelector('.year-selector-container');
          if (yearSelectorElement) {
            const actualHeight = yearSelectorElement.offsetHeight;
            onHeightChange(actualHeight);
          }
        };

        // Measure immediately and after a brief delay to ensure rendering is complete
        measureHeight();
        const timer = setTimeout(measureHeight, 100);

        return () => clearTimeout(timer);
      } else {
        // Reset height to 0 when not on top/bottom sides
        onHeightChange(0);
      }
    }
  }, [currentPosition, onHeightChange, expanded, mode, isMobile, isFloating, years.length, showMonthSelector, showDaySelector, showRangeMonthDaySelectors, showRangeDaySelectors]);
  
  // Update yearRange when initialYearRange changes - improved
  useEffect(() => {
    if (initialYearRange?.startYear && initialYearRange?.endYear) {
      // Check if initialYearRange has month/day information
      const startHasMonthDay = initialYearRange.startYear.includes('-');
      const endHasMonthDay = initialYearRange.endYear.includes('-');
      
      // Parse dates and extract month/day if available
      let newStartMonth = startMonth;
      let newStartDay = startDay;
      let newEndMonth = endMonth;
      let newEndDay = endDay;
      let newStartYear = initialYearRange.startYear;
      let newEndYear = initialYearRange.endYear;
      let showMonthDay = false;
      
      if (startHasMonthDay || endHasMonthDay) {
        // Process start date with month/day
        if (startHasMonthDay) {
          const startParts = initialYearRange.startYear.split('-');
          newStartYear = startParts[0]; // Just the year part
          
          if (startParts.length >= 2) {
            // Parse month
            const monthPart = parseInt(startParts[1]);
            if (!isNaN(monthPart) && monthPart >= 1 && monthPart <= 12) {
              newStartMonth = monthPart;
              
              // Parse day if available
              if (startParts.length >= 3) {
                const dayPart = parseInt(startParts[2]);
                if (!isNaN(dayPart) && dayPart >= 1) {
                  newStartDay = dayPart;
                }
              }
              
              showMonthDay = true;
            }
          }
        }
        
        // Process end date with month/day
        if (endHasMonthDay) {
          const endParts = initialYearRange.endYear.split('-');
          newEndYear = endParts[0]; // Just the year part
          
          if (endParts.length >= 2) {
            // Parse month
            const monthPart = parseInt(endParts[1]);
            if (!isNaN(monthPart) && monthPart >= 1 && monthPart <= 12) {
              newEndMonth = monthPart;
              
              // Parse day if available
              if (endParts.length >= 3) {
                const dayPart = parseInt(endParts[2]);
                if (!isNaN(dayPart) && dayPart >= 1) {
                  newEndDay = dayPart;
                }
              }
              
              showMonthDay = true;
            }
          }
        }
        
        // Update state for month/day selectors
        setStartMonth(newStartMonth);
        setStartDay(newStartDay);
        setEndMonth(newEndMonth);
        setEndDay(newEndDay);
        setShowRangeMonthDaySelectors(showMonthDay);
      }
      
      // Always update the year range
      setYearRange({
        startYear: newStartYear,
        endYear: newEndYear
      });
    }
  }, [initialYearRange]);
  
  // Handle initialYear changes - improved parsing
  // Only process when initialYear actually changes (not on onToggleRangeMode identity changes)
  useEffect(() => {
    if (initialYear === prevInitialYearRef.current) return;
    prevInitialYearRef.current = initialYear;

    if (initialYear) {
      // Check if initialYear contains month/day info
      if (initialYear !== 'all' && initialYear.includes('-')) {
        const parts = initialYear.split('-');

        // Set the year part
        setSelectedYear(parts[0]);

        // If we have at least year-month format
        if (parts.length >= 2) {
          const monthPart = parseInt(parts[1]);
          if (!isNaN(monthPart) && monthPart >= 1 && monthPart <= 12) {
            setSelectedMonth(monthPart);
            setShowMonthSelector(true); // Show month selector

            // If we have year-month-day format
            if (parts.length >= 3) {
              const dayPart = parseInt(parts[2]);
              if (!isNaN(dayPart) && dayPart >= 1) {
                setSelectedDay(dayPart);
                setShowDaySelector(true); // Show day selector
              }
            } else {
              setShowDaySelector(false); // Hide day selector for year-month format
            }
          }
        }
      } else {
        // Just a simple year or "all"
        setSelectedYear(initialYear);

        // If switching to "all", hide selectors and reset user preference
        if (initialYear === 'all') {
          setShowMonthSelector(false);
          setShowDaySelector(false);
          setUserEnabledSelectors(false);
        } else {
          // For non-"all" initial years, let the activeTab useEffect handle selector visibility
          // This avoids conflicts between initialYear and activeTab logic
        }
      }

      // Ensure the mode is consistent — only notify parent if actually changing mode
      if (initialYear !== 'all' && initialYear.includes('-') && mode !== 'single') {
        setMode('single');
        if (onToggleRangeMode) {
          onToggleRangeMode(false);
        }
      }
    }

    // Refresh UI to update selectors
    setRefreshCounter(prev => prev + 1);
  }, [initialYear, onToggleRangeMode]);
  
  // Handle activeTab changes separately to avoid interfering with initialYear logic
  useEffect(() => {
    // Only modify selector visibility for initial tab switches, don't override user selections
    if (selectedYear && selectedYear !== 'all') {
      const isHistoryTab = activeTab === 'history'; // Only 'history' tab, not 'behavior'
      if (isHistoryTab) {
        // For history tab, auto-show selectors but don't reset user preference once they've interacted
        if (!userEnabledSelectors) {
          setShowMonthSelector(true);
          setShowDaySelector(true);
        }
      } else if (!userEnabledSelectors) {
        // For other tabs (including behavior), only hide if user hasn't manually enabled
        setShowMonthSelector(false);
        setShowDaySelector(false);
      }
    }
  }, [activeTab, selectedYear, userEnabledSelectors]);
  
  // Reset month and day selection when year changes
  useEffect(() => {
    if (selectedYear !== 'all') {
      // If the days in the current month is less than the selected day, adjust it
      const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
      if (selectedDay > daysInMonth) {
        setSelectedDay(daysInMonth);
      }
    }
    
    // Force a UI refresh to ensure the wheel selectors update
    setRefreshCounter(prev => prev + 1);
  }, [selectedYear, selectedMonth, getDaysInMonth]);
  
  // Adjust range days if month/year changes
  useEffect(() => {
    if (yearRange.startYear) {
      const startDaysInMonth = getDaysInMonth(yearRange.startYear, startMonth);
      if (startDay > startDaysInMonth) {
        setStartDay(startDaysInMonth);
      }
    }
    
    if (yearRange.endYear) {
      const endDaysInMonth = getDaysInMonth(yearRange.endYear, endMonth);
      if (endDay > endDaysInMonth) {
        setEndDay(endDaysInMonth);
      }
    }
    
    // Force a UI refresh to ensure the wheel selectors update
    setRefreshCounter(prev => prev + 1);
  }, [yearRange.startYear, yearRange.endYear, startMonth, endMonth, getDaysInMonth]);
  
  // Helper function to get text colors for a specific theme
  const getTextColorsForTheme = (theme) => {
    switch (theme) {
      case 'pink':
        return {
          text: 'text-pink-700 dark:text-pink-300',
          textBold: 'text-pink-800 dark:text-pink-200',
          textActive: 'text-pink-100 dark:text-pink-100'
        };
      case 'purple':
        return {
          text: 'text-purple-700 dark:text-purple-300',
          textBold: 'text-purple-800 dark:text-purple-200',
          textActive: 'text-purple-100 dark:text-purple-100'
        };
      case 'indigo':
        return {
          text: 'text-indigo-700 dark:text-indigo-300',
          textBold: 'text-indigo-800 dark:text-indigo-200',
          textActive: 'text-indigo-100 dark:text-indigo-100'
        };
      case 'blue':
        return {
          text: 'text-blue-700 dark:text-blue-300',
          textBold: 'text-blue-800 dark:text-blue-200',
          textActive: 'text-blue-100 dark:text-blue-100'
        };
      case 'green':
        return {
          text: 'text-green-700 dark:text-green-300',
          textBold: 'text-green-800 dark:text-green-200',
          textActive: 'text-green-100 dark:text-green-100'
        };
      case 'yellow':
        return {
          text: 'text-yellow-700 dark:text-yellow-300',
          textBold: 'text-yellow-800 dark:text-yellow-200',
          textActive: 'text-yellow-100 dark:text-yellow-100'
        };
      case 'red':
        return {
          text: 'text-red-700 dark:text-red-300',
          textBold: 'text-red-800 dark:text-red-200',
          textActive: 'text-red-100 dark:text-red-100'
        };
      case 'orange':
        return {
          text: 'text-orange-700 dark:text-orange-300',
          textBold: 'text-orange-800 dark:text-orange-200',
          textActive: 'text-orange-100 dark:text-orange-100'
        };
      case 'teal':
        return {
          text: 'text-teal-700 dark:text-teal-300',
          textBold: 'text-teal-800 dark:text-teal-200',
          textActive: 'text-teal-100 dark:text-teal-100'
        };
      case 'cyan':
        return {
          text: 'text-cyan-700 dark:text-cyan-300',
          textBold: 'text-cyan-800 dark:text-cyan-200',
          textActive: 'text-cyan-100 dark:text-cyan-100'
        };
      case 'emerald':
        return {
          text: 'text-emerald-700 dark:text-emerald-300',
          textBold: 'text-emerald-800 dark:text-emerald-200',
          textActive: 'text-emerald-100 dark:text-emerald-100'
        };
      case 'amber':
        return {
          text: 'text-amber-700 dark:text-amber-300',
          textBold: 'text-amber-800 dark:text-amber-200',
          textActive: 'text-amber-100 dark:text-amber-100' // Light amber for button text
        };
      case 'fuchsia':
        return {
          text: 'text-fuchsia-700 dark:text-fuchsia-300',
          textBold: 'text-fuchsia-800 dark:text-fuchsia-200',
          textActive: 'text-fuchsia-100 dark:text-fuchsia-100'
        };
      case 'violet':
        return {
          text: 'text-violet-700 dark:text-violet-300',
          textBold: 'text-violet-800 dark:text-violet-200',
          textActive: 'text-violet-100 dark:text-violet-100'
        };
      case 'rose':
        return {
          text: 'text-rose-700 dark:text-rose-300',
          textBold: 'text-rose-800 dark:text-rose-200',
          textActive: 'text-rose-100 dark:text-rose-100'
        };
      default:
        return {};
    }
  };

  // Memoized color theme to prevent recalculation
  const colors = useMemo(() => {
    // Handle minimal (black & white) mode
    if (colorMode === 'minimal') {
      return {
        text: 'text-black dark:text-white',
        textActive: 'text-white dark:text-black',
        textBold: 'text-black dark:text-white',
        bgActive: 'bg-black dark:bg-white',
        bgHover: 'hover:bg-gray-200 dark:hover:bg-gray-800',
        bgLighter: 'bg-white dark:bg-black',
        bgDark: 'bg-black dark:bg-black',
        sidebarBg: 'bg-white dark:bg-black',
        glowActive: 'shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(65,105,225,0.4)]',
        buttonBg: 'bg-black dark:bg-white',
        buttonHover: 'hover:bg-gray-800 dark:hover:bg-gray-200',
        border: 'border-black dark:border-[#4169E1]',
        bgLight: 'bg-white dark:bg-black',
        bgMed: 'bg-gray-200 dark:bg-gray-800'
      };
    }

    // Get base colors from colorTheme (used for backgrounds/borders)
    let baseColors;
    switch (colorTheme) {
      case 'pink':
        baseColors = {
          text: 'text-pink-700 dark:text-pink-300',
          textActive: 'text-white',
          bgActive: 'bg-pink-500 dark:bg-pink-600',
          bgHover: 'hover:bg-pink-600/50 dark:hover:bg-pink-700/50',
          bgLighter: 'bg-pink-100 dark:bg-pink-900',
          bgDark: 'bg-pink-800 dark:bg-pink-900',
          sidebarBg: 'bg-pink-100 dark:bg-pink-900',
          glowActive: 'shadow-[0_0_15px_rgba(236,72,153,0.7)]',
          buttonBg: 'bg-pink-600 dark:bg-pink-700',
          buttonHover: 'hover:bg-pink-700 dark:hover:bg-pink-800',
          border: 'border-pink-300 dark:border-pink-700',
          textBold: 'text-pink-800 dark:text-pink-200',
          bgLight: 'bg-pink-50 dark:bg-pink-900',
          bgMed: 'bg-pink-200 dark:bg-pink-800'
        };
        break;
      case 'purple':
        baseColors = {
          text: 'text-purple-700 dark:text-purple-300',
          textActive: 'text-white',
          bgActive: 'bg-purple-500 dark:bg-purple-600',
          bgHover: 'hover:bg-purple-600/50 dark:hover:bg-purple-700/50',
          bgLighter: 'bg-purple-100 dark:bg-purple-900',
          bgDark: 'bg-purple-800 dark:bg-purple-900',
          sidebarBg: 'bg-purple-100 dark:bg-purple-900',
          glowActive: 'shadow-[0_0_15px_rgba(168,85,247,0.7)]',
          buttonBg: 'bg-purple-600 dark:bg-purple-700',
          buttonHover: 'hover:bg-purple-700 dark:hover:bg-purple-800',
          border: 'border-purple-300 dark:border-purple-700',
          textBold: 'text-purple-800 dark:text-purple-200',
          bgLight: 'bg-purple-50 dark:bg-purple-900',
          bgMed: 'bg-purple-200 dark:bg-purple-800'
        };
        break;
      case 'indigo':
        baseColors = {
          text: 'text-indigo-700 dark:text-indigo-300',
          textActive: 'text-white',
          bgActive: 'bg-indigo-500 dark:bg-indigo-600',
          bgHover: 'hover:bg-indigo-600/50 dark:hover:bg-indigo-700/50',
          bgLighter: 'bg-indigo-100 dark:bg-indigo-900',
          bgDark: 'bg-indigo-800 dark:bg-indigo-900',
          sidebarBg: 'bg-indigo-100 dark:bg-indigo-900',
          glowActive: 'shadow-[0_0_15px_rgba(99,102,241,0.7)]',
          buttonBg: 'bg-indigo-600 dark:bg-indigo-700',
          buttonHover: 'hover:bg-indigo-700 dark:hover:bg-indigo-800',
          border: 'border-indigo-300 dark:border-indigo-700',
          textBold: 'text-indigo-800 dark:text-indigo-200',
          bgLight: 'bg-indigo-50 dark:bg-indigo-900',
          bgMed: 'bg-indigo-200 dark:bg-indigo-800'
        };
        break;
      case 'blue':
        baseColors = {
          text: 'text-blue-700 dark:text-blue-300',
          textActive: 'text-white',
          bgActive: 'bg-blue-500 dark:bg-blue-600',
          bgHover: 'hover:bg-blue-600/50 dark:hover:bg-blue-700/50',
          bgLighter: 'bg-blue-100 dark:bg-blue-900',
          bgDark: 'bg-blue-800 dark:bg-blue-900',
          sidebarBg: 'bg-blue-100 dark:bg-blue-900',
          glowActive: 'shadow-[0_0_15px_rgba(59,130,246,0.7)]',
          buttonBg: 'bg-blue-600 dark:bg-blue-700',
          buttonHover: 'hover:bg-blue-700 dark:hover:bg-blue-800',
          border: 'border-blue-300 dark:border-blue-700',
          textBold: 'text-blue-800 dark:text-blue-200',
          bgLight: 'bg-blue-50 dark:bg-blue-900',
          bgMed: 'bg-blue-200 dark:bg-blue-800'
        };
        break;
      case 'green':
        baseColors = {
          text: 'text-green-700 dark:text-green-300',
          textActive: 'text-white',
          bgActive: 'bg-green-500 dark:bg-green-600',
          bgHover: 'hover:bg-green-600/50 dark:hover:bg-green-700/50',
          bgLighter: 'bg-green-100 dark:bg-green-900',
          bgDark: 'bg-green-800 dark:bg-green-900',
          sidebarBg: 'bg-green-100 dark:bg-green-900',
          glowActive: 'shadow-[0_0_15px_rgba(34,197,94,0.7)]',
          buttonBg: 'bg-green-600 dark:bg-green-700',
          buttonHover: 'hover:bg-green-700 dark:hover:bg-green-800',
          border: 'border-green-300 dark:border-green-700',
          textBold: 'text-green-800 dark:text-green-200',
          bgLight: 'bg-green-50 dark:bg-green-900',
          bgMed: 'bg-green-200 dark:bg-green-800'
        };
        break;
      case 'yellow':
        baseColors = {
          text: 'text-yellow-700 dark:text-yellow-300',
          textActive: 'text-white',
          bgActive: 'bg-yellow-500 dark:bg-yellow-600',
          bgHover: 'hover:bg-yellow-600/50 dark:hover:bg-yellow-700/50',
          bgLighter: 'bg-yellow-100 dark:bg-yellow-900',
          bgDark: 'bg-yellow-700 dark:bg-yellow-900',
          sidebarBg: 'bg-yellow-100 dark:bg-yellow-900',
          glowActive: 'shadow-[0_0_15px_rgba(234,179,8,0.7)]',
          buttonBg: 'bg-yellow-500 dark:bg-yellow-700',
          buttonHover: 'hover:bg-yellow-400 dark:hover:bg-yellow-800',
          border: 'border-yellow-300 dark:border-yellow-700',
          textBold: 'text-yellow-800 dark:text-yellow-200',
          bgLight: 'bg-yellow-50 dark:bg-yellow-900',
          bgMed: 'bg-yellow-200 dark:bg-yellow-800'
        };
        break;
      case 'red':
        baseColors = {
          text: 'text-red-700 dark:text-red-300',
          textActive: 'text-white',
          bgActive: 'bg-red-500 dark:bg-red-600',
          bgHover: 'hover:bg-red-600/50 dark:hover:bg-red-700/50',
          bgLighter: 'bg-red-100 dark:bg-red-900',
          bgDark: 'bg-red-800 dark:bg-red-900',
          sidebarBg: 'bg-red-100 dark:bg-red-900',
          glowActive: 'shadow-[0_0_15px_rgba(239,68,68,0.7)]',
          buttonBg: 'bg-red-600 dark:bg-red-700',
          buttonHover: 'hover:bg-red-700 dark:hover:bg-red-800',
          border: 'border-red-300 dark:border-red-700',
          textBold: 'text-red-800 dark:text-red-200',
          bgLight: 'bg-red-50 dark:bg-red-900',
          bgMed: 'bg-red-200 dark:bg-red-800'
        };
        break;
      case 'orange':
        baseColors = {
          text: 'text-orange-700 dark:text-orange-300',
          textActive: 'text-white',
          bgActive: 'bg-orange-500 dark:bg-orange-600',
          bgHover: 'hover:bg-orange-600/50 dark:hover:bg-orange-700/50',
          bgLighter: 'bg-orange-100 dark:bg-orange-900',
          bgDark: 'bg-orange-800 dark:bg-orange-900',
          sidebarBg: 'bg-orange-100 dark:bg-orange-900',
          glowActive: 'shadow-[0_0_15px_rgba(249,115,22,0.7)]',
          buttonBg: 'bg-orange-600 dark:bg-orange-700',
          buttonHover: 'hover:bg-orange-700 dark:hover:bg-orange-800',
          border: 'border-orange-300 dark:border-orange-700',
          textBold: 'text-orange-800 dark:text-orange-200',
          bgLight: 'bg-orange-50 dark:bg-orange-900',
          bgMed: 'bg-orange-200 dark:bg-orange-800'
        };
        break;
      case 'teal':
      default:
        baseColors = {
          text: 'text-teal-700 dark:text-teal-300',
          textActive: 'text-white',
          bgActive: 'bg-teal-500 dark:bg-teal-600',
          bgHover: 'hover:bg-teal-600/50 dark:hover:bg-teal-700/50',
          bgLighter: 'bg-teal-100 dark:bg-teal-900',
          bgDark: 'bg-teal-800 dark:bg-teal-900',
          sidebarBg: 'bg-teal-100 dark:bg-teal-900',
          glowActive: 'shadow-[0_0_15px_rgba(20,184,166,0.7)]',
          buttonBg: 'bg-teal-600 dark:bg-teal-700',
          buttonHover: 'hover:bg-teal-700 dark:hover:bg-teal-800',
          border: 'border-teal-300 dark:border-teal-700',
          textBold: 'text-teal-800 dark:text-teal-200',
          bgLight: 'bg-teal-50 dark:bg-teal-900',
          bgMed: 'bg-teal-200 dark:bg-teal-800'
        };
        break;
      case 'cyan':
        baseColors = {
          text: 'text-cyan-700 dark:text-cyan-300',
          textActive: 'text-white',
          bgActive: 'bg-cyan-500 dark:bg-cyan-600',
          bgHover: 'hover:bg-cyan-600/50 dark:hover:bg-cyan-700/50',
          bgLighter: 'bg-cyan-100 dark:bg-cyan-900',
          bgDark: 'bg-cyan-800 dark:bg-cyan-900',
          sidebarBg: 'bg-cyan-100 dark:bg-cyan-900',
          glowActive: 'shadow-[0_0_15px_rgba(6,182,212,0.7)]',
          buttonBg: 'bg-cyan-600 dark:bg-cyan-700',
          buttonHover: 'hover:bg-cyan-700 dark:hover:bg-cyan-800',
          border: 'border-cyan-300 dark:border-cyan-700',
          textBold: 'text-cyan-800 dark:text-cyan-200',
          bgLight: 'bg-cyan-50 dark:bg-cyan-900',
          bgMed: 'bg-cyan-200 dark:bg-cyan-800'
        };
        break;
      case 'emerald':
        baseColors = {
          text: 'text-emerald-700 dark:text-emerald-300',
          textActive: 'text-white',
          bgActive: 'bg-emerald-500 dark:bg-emerald-600',
          bgHover: 'hover:bg-emerald-600/50 dark:hover:bg-emerald-700/50',
          bgLighter: 'bg-emerald-100 dark:bg-emerald-900',
          bgDark: 'bg-emerald-800 dark:bg-emerald-900',
          sidebarBg: 'bg-emerald-100 dark:bg-emerald-900',
          glowActive: 'shadow-[0_0_15px_rgba(16,185,129,0.7)]',
          buttonBg: 'bg-emerald-600 dark:bg-emerald-700',
          buttonHover: 'hover:bg-emerald-700 dark:hover:bg-emerald-800',
          border: 'border-emerald-300 dark:border-emerald-700',
          textBold: 'text-emerald-800 dark:text-emerald-200',
          bgLight: 'bg-emerald-50 dark:bg-emerald-900',
          bgMed: 'bg-emerald-200 dark:bg-emerald-800'
        };
        break;
      case 'amber':
        baseColors = {
          text: 'text-amber-700 dark:text-amber-300',
          textActive: 'text-white',
          bgActive: 'bg-amber-500 dark:bg-amber-600',
          bgHover: 'hover:bg-amber-600/50 dark:hover:bg-amber-700/50',
          bgLighter: 'bg-amber-100 dark:bg-amber-900',
          bgDark: 'bg-amber-800 dark:bg-amber-900',
          sidebarBg: 'bg-amber-100 dark:bg-amber-900',
          glowActive: 'shadow-[0_0_15px_rgba(245,158,11,0.7)]',
          buttonBg: 'bg-amber-600 dark:bg-amber-700',
          buttonHover: 'hover:bg-amber-700 dark:hover:bg-amber-800',
          border: 'border-amber-300 dark:border-amber-700',
          textBold: 'text-amber-800 dark:text-amber-200',
          bgLight: 'bg-amber-50 dark:bg-amber-900',
          bgMed: 'bg-amber-200 dark:bg-amber-800'
        };
        break;
      case 'fuchsia':
        baseColors = {
          text: 'text-fuchsia-700 dark:text-fuchsia-300',
          textActive: 'text-white',
          bgActive: 'bg-fuchsia-500 dark:bg-fuchsia-600',
          bgHover: 'hover:bg-fuchsia-600/50 dark:hover:bg-fuchsia-700/50',
          bgLighter: 'bg-fuchsia-100 dark:bg-fuchsia-900',
          bgDark: 'bg-fuchsia-800 dark:bg-fuchsia-900',
          sidebarBg: 'bg-fuchsia-100 dark:bg-fuchsia-900',
          glowActive: 'shadow-[0_0_15px_rgba(217,70,239,0.7)]',
          buttonBg: 'bg-fuchsia-600 dark:bg-fuchsia-700',
          buttonHover: 'hover:bg-fuchsia-700 dark:hover:bg-fuchsia-800',
          border: 'border-fuchsia-300 dark:border-fuchsia-700',
          textBold: 'text-fuchsia-800 dark:text-fuchsia-200',
          bgLight: 'bg-fuchsia-50 dark:bg-fuchsia-900',
          bgMed: 'bg-fuchsia-200 dark:bg-fuchsia-800'
        };
        break;
      case 'violet':
        baseColors = {
          text: 'text-violet-700 dark:text-violet-300',
          textActive: 'text-white',
          bgActive: 'bg-violet-500 dark:bg-violet-600',
          bgHover: 'hover:bg-violet-600/50 dark:hover:bg-violet-700/50',
          bgLighter: 'bg-violet-100 dark:bg-violet-900',
          bgDark: 'bg-violet-800 dark:bg-violet-900',
          sidebarBg: 'bg-violet-100 dark:bg-violet-900',
          glowActive: 'shadow-[0_0_15px_rgba(139,92,246,0.7)]',
          buttonBg: 'bg-violet-600 dark:bg-violet-700',
          buttonHover: 'hover:bg-violet-700 dark:hover:bg-violet-800',
          border: 'border-violet-300 dark:border-violet-700',
          textBold: 'text-violet-800 dark:text-violet-200',
          bgLight: 'bg-violet-50 dark:bg-violet-900',
          bgMed: 'bg-violet-200 dark:bg-violet-800'
        };
        break;
      case 'rose':
        baseColors = {
          text: 'text-rose-700 dark:text-rose-300',
          textActive: 'text-white',
          bgActive: 'bg-rose-500 dark:bg-rose-600',
          bgHover: 'hover:bg-rose-600/50 dark:hover:bg-rose-700/50',
          bgLighter: 'bg-rose-100 dark:bg-rose-900',
          bgDark: 'bg-rose-800 dark:bg-rose-900',
          sidebarBg: 'bg-rose-100 dark:bg-rose-900',
          glowActive: 'shadow-[0_0_15px_rgba(244,63,94,0.7)]',
          buttonBg: 'bg-rose-600 dark:bg-rose-700',
          buttonHover: 'hover:bg-rose-700 dark:hover:bg-rose-800',
          border: 'border-rose-300 dark:border-rose-700',
          textBold: 'text-rose-800 dark:text-rose-200',
          bgLight: 'bg-rose-50 dark:bg-rose-900',
          bgMed: 'bg-rose-200 dark:bg-rose-800'
        };
        break;
    }

    // In colorful mode, text should match the page color (colorTheme), not a separate textTheme
    // This creates visual harmony between the year selector and the page it's on
    return baseColors;
  }, [colorTheme, textTheme, colorMode]);

  if (years.length === 0) {
    return <div className={colors.text + " italic"}>No year data available</div>;
  }
  
  // Toggle sidebar expand/collapse
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);
  
  // Toggle sidebar position - cycles through right, bottom, left, top with memory
  const togglePosition = useCallback(() => {
    const newPosition = currentPosition === 'right' ? 'bottom' : 
                       currentPosition === 'bottom' ? 'left' : 
                       currentPosition === 'left' ? 'top' : 'right';
    
    // Update position memory for all devices
    setPositionMemory(prev => ({
      last: newPosition,
      history: [...prev.history.slice(-3), newPosition] // Keep last 4 positions
    }));
    
    // Update position immediately for instant main page response
    setCurrentPosition(newPosition);
    
    // Handle transition state - simplified for mobile
    if (isMobile) {
      // Mobile: minimal transition handling to prevent freeze
      setIsPositionTransitioning(false);
      if (onTransitionChange) {
        onTransitionChange(false);
      }
    } else {
      // Desktop: full transition handling
      setIsPositionTransitioning(true);
      if (onTransitionChange) {
        onTransitionChange(true);
      }
      
      setTimeout(() => {
        setIsPositionTransitioning(false);
        if (onTransitionChange) {
          onTransitionChange(false);
        }
      }, 300);
    }
  }, [currentPosition, isMobile, onTransitionChange]);

  // Drag-to-move handler for floating mode
  const handleFloatDragStart = useCallback((e) => {
    if (isMobile || !isFloating) return;
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    isDraggingFloatRef.current = true;
    dragOffsetRef.current = { x: cx - floatPos.x, y: cy - floatPos.y };

    const onMove = (me) => {
      if (!isDraggingFloatRef.current) return;
      const mx = me.touches ? me.touches[0].clientX : me.clientX;
      const my = me.touches ? me.touches[0].clientY : me.clientY;
      setFloatPos({
        x: Math.max(0, Math.min(window.innerWidth - 50, mx - dragOffsetRef.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 50, my - dragOffsetRef.current.y))
      });
    };
    const onEnd = () => {
      isDraggingFloatRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }, [isMobile, isFloating, floatPos]);

  // Drag-to-resize handler for floating mode scale
  const handleFloatResizeStart = useCallback((e) => {
    if (isMobile || !isFloating) return;
    e.preventDefault();
    e.stopPropagation();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    isResizingRef.current = true;
    resizeStartRef.current = { mouseX: cx, mouseY: cy, scale: floatScale };

    const onMove = (me) => {
      if (!isResizingRef.current) return;
      const mx = me.touches ? me.touches[0].clientX : me.clientX;
      const my = me.touches ? me.touches[0].clientY : me.clientY;
      const dx = mx - resizeStartRef.current.mouseX;
      const dy = my - resizeStartRef.current.mouseY;
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      const newScale = Math.min(2.5, Math.max(0.5, resizeStartRef.current.scale + delta / 200));
      setFloatScale(newScale);
    };
    const onEnd = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }, [isMobile, isFloating, floatScale]);

  // Toggle between floating and snapped modes
  const toggleFloating = useCallback(() => {
    setIsFloating(prev => {
      if (prev) {
        // Floating -> Snapped: snap to nearest edge
        const { x, y } = floatPos;
        const dists = { left: x, right: window.innerWidth - x, top: y, bottom: window.innerHeight - y };
        const nearest = Object.entries(dists).reduce((a, b) => b[1] < a[1] ? b : a)[0];
        setCurrentPosition(nearest);
      } else {
        // Snapped -> Floating: report 0 dims
        if (onWidthChange) onWidthChange(0);
        if (onHeightChange) onHeightChange(0);
      }
      return !prev;
    });
  }, [floatPos, onWidthChange, onHeightChange]);

  // Clamp floating position on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!isMobile && isFloating) {
        setFloatPos(prev => ({
          x: Math.min(prev.x, window.innerWidth - 50),
          y: Math.min(prev.y, window.innerHeight - 50)
        }));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, isFloating]);

  // Handle mode changes efficiently
  const handleModeChange = useCallback((newMode) => {
    // If the current mode is already the requested mode, do nothing
    if (mode === newMode) return;
    
    // Update internal mode state
    setMode(newMode);
    setRangeYearTapPhase('idle');

    // Notify parent component about mode change
    if (onToggleRangeMode) {
      onToggleRangeMode(newMode === 'range');
    }
    
    // If switching to single mode
    if (newMode === 'single') {
      // If we have a formatted date in range mode, try to preserve it in single mode
      if (mode === 'range' && 
          showRangeMonthDaySelectors && 
          yearRange.startYear === yearRange.endYear && 
          startMonth === endMonth &&
          startDay === endDay) {
        // We have a specific date selected - preserve it
        const dateStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
        setSelectedYear(yearRange.startYear);
        setSelectedMonth(startMonth);
        setSelectedDay(startDay);
        setShowMonthSelector(true);
        setShowDaySelector(true);
        
        // Ensure the parent knows about this specific date
        if (onYearChange) {
          onYearChange(dateStr);
        }
      } 
      // If we have a year-only range with identical years
      else if (mode === 'range' && 
              !showRangeMonthDaySelectors && 
              yearRange.startYear === yearRange.endYear) {
        // Convert single year from range to single mode
        setSelectedYear(yearRange.startYear);
        setShowMonthSelector(false);
        setShowDaySelector(false);
        
        if (onYearChange) {
          onYearChange(yearRange.startYear);
        }
      }
      else {
        // Default to all-time view
        setSelectedYear('all');
        setShowMonthSelector(false);
        setShowDaySelector(false);
        
        if (onYearChange) {
          onYearChange('all');
        }
      }
    } 
    // If switching to range mode
    else if (newMode === 'range' && years.length >= 2) {
      // If we have a specific date in single mode, preserve it in range mode
      if (mode === 'single' && showMonthSelector && showDaySelector && selectedYear !== 'all') {
        // Convert single date to same start/end range
        const newRange = {
          startYear: selectedYear,
          endYear: selectedYear
        };
        setYearRange(newRange);
        setStartMonth(selectedMonth);
        setEndMonth(selectedMonth);
        setStartDay(selectedDay);
        setEndDay(selectedDay);
        setShowRangeMonthDaySelectors(true);
        setShowRangeDaySelectors(true);

        const startStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
        const endStr = startStr;
        if (onYearRangeChange) {
          onYearRangeChange({ startYear: startStr, endYear: endStr });
        }
      }
      // If we have a year-only selection in single mode
      else if (mode === 'single' && !showMonthSelector && selectedYear !== 'all') {
        // Convert single year to same start/end range
        const newRange = {
          startYear: selectedYear,
          endYear: selectedYear
        };
        setYearRange(newRange);
        setShowRangeMonthDaySelectors(false);

        if (onYearRangeChange) {
          onYearRangeChange(newRange);
        }
      }
      // If we have a year+month selection in single mode
      else if (mode === 'single' && showMonthSelector && !showDaySelector && selectedYear !== 'all') {
        const newRange = {
          startYear: selectedYear,
          endYear: selectedYear
        };
        setYearRange(newRange);
        setStartMonth(selectedMonth);
        setEndMonth(selectedMonth);
        setShowRangeMonthDaySelectors(true);
        setShowRangeDaySelectors(false);

        const monthStr = selectedMonth.toString().padStart(2, '0');
        if (onYearRangeChange) {
          onYearRangeChange({ startYear: `${selectedYear}-${monthStr}`, endYear: `${selectedYear}-${monthStr}` });
        }
      }
      else {
        // Default to full range
        const newYearRange = {
          startYear: years[0],
          endYear: years[years.length - 1]
        };
        
        setYearRange(newYearRange);
        setShowRangeMonthDaySelectors(false);
        
        if (onYearRangeChange) {
          onYearRangeChange(newYearRange);
        }
      }
    }
  }, [mode, showRangeMonthDaySelectors, showRangeDaySelectors, yearRange, startMonth, endMonth, startDay, endDay,
       selectedYear, selectedMonth, selectedDay, showMonthSelector, showDaySelector,
       onYearChange, onYearRangeChange, years]);
  
  // Format month name efficiently
  const getMonthName = useCallback((month) => {
    return monthNamesShort[month - 1];
  }, []);

  // Quick button component for "All Time"
  const QuickAllTimeButton = useCallback(({ selectedYear, onClick }) => {
    return (
      <button
        onClick={onClick}
        className={`px-2 py-1 mb-2 text-xs rounded-md transition-colors ${
          selectedYear === 'all' 
            ? 'bg-current text-white font-bold' 
            : 'bg-current/20 hover:bg-current/30 text-current'
        }`}
        title="Show all-time data"
      >
        All Time
      </button>
    );
  }, []);
  
  // Function to find first day with data in a given year
  const findFirstDayWithData = useCallback((year) => {
    if (!rawPlayData || rawPlayData.length === 0 || year === 'all') {
      return { month: 1, day: 1 }; // Default fallback
    }
    
    // Filter data for the selected year and sort by date
    const yearData = rawPlayData
      .filter(entry => {
        try {
          const date = new Date(entry.ts);
          return !isNaN(date.getTime()) && date.getFullYear() === parseInt(year);
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    
    if (yearData.length === 0) {
      return { month: 1, day: 1 }; // Default if no data found
    }
    
    // Get the first entry's date
    const firstDate = new Date(yearData[0].ts);
    return {
      month: firstDate.getMonth() + 1, // JavaScript months are 0-based
      day: firstDate.getDate()
    };
  }, [rawPlayData]);

  // Handle year change in single mode
  const handleYearChange = useCallback((year) => {
    // Save the previous year
    const prevYear = selectedYear;
    
    // Update selected year state
    setSelectedYear(year);
    
    // If changing to "all", hide month/day selectors
    if (year === 'all') {
      setShowMonthSelector(false);
      setShowDaySelector(false);
    } else {
      // Only auto-show month/day selectors for listening history tab
      const isHistoryTab = activeTab === 'history'; // Only 'history' tab, not 'behavior'
      
      if (isHistoryTab) {
        // For history tab, automatically show month and day selectors
        setShowMonthSelector(true);
        setShowDaySelector(true);
        
        // Find the first day with actual data in this year
        const firstDataDay = findFirstDayWithData(year);
        
        // Set to the first day with data
        setSelectedMonth(firstDataDay.month);
        setSelectedDay(firstDataDay.day);
        
        // Validate the day exists in the month (should be valid since it came from data)
        const validDay = Math.min(firstDataDay.day, getDaysInMonth(year, firstDataDay.month));
        if (validDay !== firstDataDay.day) {
          setSelectedDay(validDay);
        }
      } else {
        // For other tabs, only hide selectors if this is the initial year selection
        // Don't override user manual choices to show month/day selectors
        if (prevYear === 'all' || prevYear === null || prevYear === undefined) {
          setShowMonthSelector(false);
          setShowDaySelector(false);
        }
        // If selectors are already visible, keep them visible
      }
    }
    
    // Update parent with appropriate date format
    if (year === 'all') {
      updateParentWithDate(year, 1, 1); // Use default values for 'all'
    } else {
      const isHistoryTab = activeTab === 'history'; // Only 'history' tab, not 'behavior'
      if (isHistoryTab) {
        // For history tab, use the first data day
        const firstDataDay = findFirstDayWithData(year);
        updateParentWithDate(year, firstDataDay.month, firstDataDay.day);
      } else {
        // For other tabs, use current month/day only if selectors are active, otherwise just year
        if (showDaySelector && showMonthSelector) {
          updateParentWithDate(year, selectedMonth, selectedDay, 'day');
        } else if (showMonthSelector) {
          updateParentWithDate(year, selectedMonth, 1, 'month');
        } else {
          updateParentWithDate(year, 1, 1, null); // Just year
        }
      }
    }
    
    // Force UI refresh
    setRefreshCounter(prev => prev + 1);
  }, [selectedYear, selectedMonth, selectedDay, getDaysInMonth, findFirstDayWithData, activeTab, showDaySelector, showMonthSelector]);
  
  // Handle month change in single mode
  const handleMonthChange = useCallback((month) => {
    setSelectedMonth(month);
    
    // When user manually selects a month, mark that they've enabled selectors
    const isHistoryTab = activeTab === 'history'; // Only 'history' tab, not 'behavior'
    if (!isHistoryTab && showMonthSelector) {
      setUserEnabledSelectors(true);
    }
    
    // Make sure day is valid for this month
    if (selectedYear !== 'all') {
      const daysInMonth = getDaysInMonth(selectedYear, month);
      const validDay = Math.min(selectedDay, daysInMonth);
      if (validDay !== selectedDay) {
        setSelectedDay(validDay);
      }
      
      // Update parent immediately with appropriate format based on current selectors
      if (showDaySelector && onYearChange) {
        const dateStr = `${selectedYear}-${month.toString().padStart(2, '0')}-${validDay.toString().padStart(2, '0')}`;
        console.log("Month selector sending YYYY-MM-DD:", dateStr);
        onYearChange(dateStr);
      } else if (onYearChange) {
        const dateStr = `${selectedYear}-${month.toString().padStart(2, '0')}`;
        console.log("Month selector sending YYYY-MM:", dateStr);
        onYearChange(dateStr);
      }
      
      // Force UI refresh
      setRefreshCounter(prev => prev + 1);
    }
  }, [selectedYear, selectedDay, getDaysInMonth, showDaySelector, activeTab, showMonthSelector, onYearChange]);
  
  // Handle day change in single mode
  const handleDayChange = useCallback((day) => {
    setSelectedDay(day);
    
    // When user manually selects a day, mark that they've enabled selectors
    const isHistoryTab = activeTab === 'history'; // Only 'history' tab, not 'behavior'
    if (!isHistoryTab) {
      setUserEnabledSelectors(true);
    }
    
    // Update parent immediately with the new date - always use day format when day changes
    if (selectedYear && selectedYear !== 'all' && onYearChange) {
      const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      console.log("Day selector sending YYYY-MM-DD:", dateStr);
      onYearChange(dateStr);
    }
  }, [selectedYear, selectedMonth, activeTab, onYearChange]);
  
  // Unified function to update parent with date range
  const updateParentWithDateRange = useCallback((startYear, startM, startD, endYear, endM, endD) => {
    if (!onYearRangeChange) return;

    const sYear = startYear || yearRange.startYear;
    const sMonth = startM || startMonth;
    const sDay = startD || startDay;
    const eYear = endYear || yearRange.endYear;
    const eMonth = endM || endMonth;
    const eDay = endD || endDay;

    if (!sYear || !eYear) return;

    let startValue, endValue;

    if (showRangeMonthDaySelectors && showRangeDaySelectors) {
      startValue = `${sYear}-${sMonth.toString().padStart(2, '0')}-${sDay.toString().padStart(2, '0')}`;
      endValue = `${eYear}-${eMonth.toString().padStart(2, '0')}-${eDay.toString().padStart(2, '0')}`;
    } else if (showRangeMonthDaySelectors) {
      startValue = `${sYear}-${sMonth.toString().padStart(2, '0')}`;
      endValue = `${eYear}-${eMonth.toString().padStart(2, '0')}`;
    } else {
      startValue = sYear;
      endValue = eYear;
    }

    onYearRangeChange({
      startYear: startValue,
      endYear: endValue
    });
  }, [onYearRangeChange, yearRange, startMonth, startDay, endMonth, endDay, showRangeMonthDaySelectors, showRangeDaySelectors]);

  // Handle start month change in range mode
  const handleStartMonthChange = useCallback((month) => {
    setStartMonth(month);
    
    // Make sure day is valid for this month
    if (yearRange.startYear) {
      const daysInMonth = getDaysInMonth(yearRange.startYear, month);
      const validDay = Math.min(startDay, daysInMonth);
      if (validDay !== startDay) {
        setStartDay(validDay);
      }
      
      // Update parent with the new range
      updateParentWithDateRange(yearRange.startYear, month, validDay, yearRange.endYear, endMonth, endDay);
      
      // Force UI refresh
      setRefreshCounter(prev => prev + 1);
    }
  }, [yearRange, startDay, endMonth, endDay, getDaysInMonth, updateParentWithDateRange]);

  // Handle start day change in range mode
  const handleStartDayChange = useCallback((day) => {
    setStartDay(day);
    updateParentWithDateRange(yearRange.startYear, startMonth, day, yearRange.endYear, endMonth, endDay);
  }, [yearRange, startMonth, endMonth, endDay, updateParentWithDateRange]);

  // Handle end month change in range mode
  const handleEndMonthChange = useCallback((month) => {
    setEndMonth(month);
    if (yearRange.endYear) {
      const daysInMonth = getDaysInMonth(yearRange.endYear, month);
      const validDay = Math.min(endDay, daysInMonth);
      if (validDay !== endDay) {
        setEndDay(validDay);
      }
      updateParentWithDateRange(yearRange.startYear, startMonth, startDay, yearRange.endYear, month, validDay);
      setRefreshCounter(prev => prev + 1);
    }
  }, [yearRange, startMonth, startDay, endDay, getDaysInMonth, updateParentWithDateRange]);

  // Handle end day change in range mode
  const handleEndDayChange = useCallback((day) => {
    setEndDay(day);
    updateParentWithDateRange(yearRange.startYear, startMonth, startDay, yearRange.endYear, endMonth, day);
  }, [yearRange, startMonth, startDay, endMonth, updateParentWithDateRange]);
  
  // Unified function to update parent with date - explicit format control
  const updateParentWithDate = (year, month, day, forceFormat = null) => {
    if (!onYearChange) return;
    
    if (year === 'all') {
      console.log("Year selector: Updating parent with ALL TIME selection");
      onYearChange('all');  // This explicitly sends 'all' to parent
      return;
    }
    
    console.log("updateParentWithDate called with:", { year, month, day, showMonthSelector, showDaySelector, forceFormat });
    
    // Use explicit format if provided, otherwise use current toggle states
    const useMonthSelector = forceFormat === 'month' || (forceFormat === null && showMonthSelector);
    const useDaySelector = forceFormat === 'day' || (forceFormat === null && showDaySelector);
    
    // For any other year, format according to what selectors should be shown
    if (useDaySelector && useMonthSelector) {
      // Year-Month-Day format
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      console.log("YearSelector sending YYYY-MM-DD:", dateStr);
      onYearChange(dateStr);
    } else if (useMonthSelector) {
      // Year-Month format
      const dateStr = `${year}-${month.toString().padStart(2, '0')}`;
      console.log("YearSelector sending YYYY-MM:", dateStr);
      onYearChange(dateStr);
    } else {
      // Just year - this path is taken for the first year (not "all")
      console.log("YearSelector sending year only:", year);
      onYearChange(year);
    }
  };

  // Handler for year range change in range mode
  const handleYearRangeChange = useCallback(({ startYear, endYear }) => {
    const newYearRange = { startYear, endYear };
    setYearRange(newYearRange);
    
    // Reset days if they're not valid for the new years
    if (startYear) {
      const startDaysInMonth = getDaysInMonth(startYear, startMonth);
      if (startDay > startDaysInMonth) {
        setStartDay(startDaysInMonth);
      }
    }
    
    if (endYear) {
      const endDaysInMonth = getDaysInMonth(endYear, endMonth);
      if (endDay > endDaysInMonth) {
        setEndDay(endDaysInMonth);
      }
    }
    
    // Update parent with the new range
    updateParentWithDateRange(startYear, startMonth, startDay, endYear, endMonth, endDay);
    
    // Force UI refresh
    setRefreshCounter(prev => prev + 1);
  }, [startMonth, startDay, endMonth, endDay, getDaysInMonth, updateParentWithDateRange]);

  const handleRangeYearGridTap = useCallback((year) => {
    if (rangeYearTapPhase === 'idle') {
      setRangeYearTapPhase('start-set');
      handleYearRangeChange({ startYear: year, endYear: '' });
    } else {
      setRangeYearTapPhase('idle');
      const start = yearRange.startYear;
      if (parseInt(year) < parseInt(start)) {
        handleYearRangeChange({ startYear: year, endYear: start });
      } else {
        handleYearRangeChange({ startYear: start, endYear: year });
      }
    }
  }, [rangeYearTapPhase, yearRange, handleYearRangeChange]);

  // Get the label to display for the current date/range
  const getYearLabel = () => {
    if (mode === 'single') {
      if (selectedYear === 'all') return 'All Time';
      
      // Three possible formats for single mode
      if (showMonthSelector && showDaySelector) {
        // Full date format
        return `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
      } else if (showMonthSelector) {
        // Year-Month format
        return `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
      } else {
        // Year only
        return selectedYear;
      }
    } else {
      // Range mode logic
      if (yearRange.startYear === yearRange.endYear) {
        if (showRangeMonthDaySelectors && showRangeDaySelectors) {
          if (startMonth === endMonth && startDay === endDay) {
            return `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
          }
          const startStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
          const endStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
          return `${startStr} to ${endStr}`;
        } else if (showRangeMonthDaySelectors) {
          if (startMonth === endMonth) {
            return `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}`;
          }
          return `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')} to ${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}`;
        } else {
          return yearRange.startYear;
        }
      }

      if (showRangeMonthDaySelectors && showRangeDaySelectors) {
        const startStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
        const endStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
        return `${startStr} to ${endStr}`;
      }
      if (showRangeMonthDaySelectors) {
        return `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')} to ${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}`;
      }
      
      return `${yearRange.startYear}-${yearRange.endYear}`;
    }
  };

  // Fixed settings bar height - this matches the FixedSettingsBar height, scaled by font size (min 40px)
  const fontScales = { small: 0.875, medium: 1, large: 1.125, xlarge: 1.25 };
  const fontScale = fontScales[fontSize] || 1;
  const isLandscapeMobileBar = isMobile && isLandscape;
  const settingsBarHeight = isMobile ? (isLandscapeMobileBar ? 64 : 85) : Math.max(40, Math.round(40 * fontScale));

  // Dynamic position styles that account for TopTabs (memoized for mobile performance)
  const getPositionStyles = useMemo(() => {
    const settingsBarHeight = isMobile ? (isLandscape ? 64 : 85) : Math.max(40, Math.round(40 * fontScale));
    // Use actual TopTabs dimensions, with fallbacks for mobile
    const safeTopTabsHeight = topTabsHeight != null ? topTabsHeight + (isMobile ? 4 : 0) : (isMobile ? 48 : 56);
    const safeTopTabsWidth = topTabsWidth || (isMobile ? 160 : 192);

    // Floating mode: absolute position from saved coordinates
    if (!isMobile && isFloating) {
      return {
        className: 'fixed z-[100]',
        style: { left: `${floatPos.x}px`, top: `${floatPos.y}px` }
      };
    }

    if (topTabsPosition === currentPosition) {
      // Same side - position after TopTabs
      switch (currentPosition) {
        case 'top':
          return {
            className: 'fixed z-[89]',
            style: { 
              top: `${isMobile ? safeTopTabsHeight : settingsBarHeight + safeTopTabsHeight}px`,
              left: '0px',
              right: '0px'
            }
          };
        case 'bottom':
          return {
            className: 'fixed z-[89]',
            style: { 
              bottom: isMobile ? `${settingsBarHeight + safeTopTabsHeight}px` : `${safeTopTabsHeight}px`,
              left: '0px',
              right: '0px'
            }
          };
        case 'left':
          return {
            className: 'fixed z-[100]',
            style: { 
              left: `${safeTopTabsWidth}px`,
              top: isMobile ? '0px' : `${settingsBarHeight}px`,
              bottom: isMobile ? `${settingsBarHeight}px` : '0px'
            }
          };
        case 'right':
          return {
            className: 'fixed z-[100]',
            style: { 
              right: `${safeTopTabsWidth}px`,
              top: isMobile ? '0px' : `${settingsBarHeight}px`,
              bottom: isMobile ? `${settingsBarHeight}px` : '0px'
            }
          };
      }
    } else {
      // Different sides - use standard positioning
      switch (currentPosition) {
        case 'top':
          return {
            className: 'fixed z-[90]',
            style: { 
              top: isMobile ? '0px' : `${settingsBarHeight}px`,
              left: topTabsPosition === 'left' ? `${safeTopTabsWidth}px` : '0px',
              right: topTabsPosition === 'right' ? `${safeTopTabsWidth}px` : '0px'
            }
          };
        case 'bottom':
          return {
            className: 'fixed z-[90]',
            style: { 
              bottom: isMobile ? `${settingsBarHeight}px` : '0px',
              left: topTabsPosition === 'left' ? `${safeTopTabsWidth}px` : '0px',
              right: topTabsPosition === 'right' ? `${safeTopTabsWidth}px` : '0px'
            }
          };
        case 'left':
          return {
            className: 'fixed z-[90]',
            style: { 
              left: '0px',
              top: topTabsPosition === 'top' ? (isMobile ? `${safeTopTabsHeight - 1}px` : `${settingsBarHeight + safeTopTabsHeight - 1}px`) : (isMobile ? '0px' : `${settingsBarHeight}px`),
              bottom: topTabsPosition === 'bottom' ? (isMobile ? `${settingsBarHeight + safeTopTabsHeight}px` : `${safeTopTabsHeight}px`) : (isMobile ? `${settingsBarHeight}px` : '0px')
            }
          };
        case 'right':
          return {
            className: 'fixed z-[90]',
            style: { 
              right: '0px',
              top: topTabsPosition === 'top' ? (isMobile ? `${safeTopTabsHeight - 1}px` : `${settingsBarHeight + safeTopTabsHeight - 1}px`) : (isMobile ? '0px' : `${settingsBarHeight}px`),
              bottom: topTabsPosition === 'bottom' ? (isMobile ? `${settingsBarHeight + safeTopTabsHeight}px` : `${safeTopTabsHeight}px`) : (isMobile ? `${settingsBarHeight}px` : '0px')
            }
          };
      }
    }
    
    // Fallback
    return {
      className: 'fixed right-0 top-20 bottom-0 z-[90]',
      style: {}
    };
  }, [currentPosition, topTabsPosition, topTabsHeight, topTabsWidth, isMobile, isLandscape, fontScale, isFloating, floatPos]);

  // If not expanded, show a mini sidebar
  if (!expanded && asSidebar) {
    const isBottom = currentPosition === 'bottom';
    const isTop = currentPosition === 'top';
    const desktopFloating = !isMobile && isFloating;

    const positionConfig = getPositionStyles;
    const collapsedDimensions = getCurrentDimensions();

    return (
      <div
        className={`${positionConfig.className} max-h-screen ${
          isHorizontal
            ? 'flex items-center justify-center py-2'
            : ''
        } ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`}
        style={{
          ...positionConfig.style,
          width: isHorizontal ? 'auto' : `${collapsedDimensions.width}px`,
          height: isHorizontal ? `${collapsedDimensions.height}px` : 'auto',
          ...(desktopFloating ? {
            transform: `scale(${floatScale})`,
            transformOrigin: 'top left',
          } : {}),
        }}
      >
        {/* Drag bar for floating mode */}
        {desktopFloating && (
          <div
            className={`flex items-center justify-center py-1 cursor-grab active:cursor-grabbing ${colors.bgMed} rounded-t-lg`}
            onMouseDown={handleFloatDragStart}
            onTouchStart={handleFloatDragStart}
          >
            <div className="w-8 h-1 rounded-full bg-current opacity-30" />
          </div>
        )}
        {/* Horizontal layout container for horizontal orientation */}
        {isHorizontal ? (
          <div className="flex flex-row items-center justify-center">
            {/* Expand button */}
            <button
              onClick={toggleExpanded}
              className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} z-10 shadow-md shadow-black/20 mr-8 w-8 h-8 flex items-center justify-center`}
              aria-label="Expand sidebar"
            >
              <span className={colors.textActive}>{isTop ? '↓' : '↑'}</span>
            </button>

            {/* Text container */}
            <div className={`flex flex-row items-center space-x-2 ${colors.text}`}>
              <div className="text-xs opacity-70">
                {mode === 'single' ? 'Year' : 'Year Range'}
              </div>
              <div className="text-xs font-bold">
                {getYearLabel()}
              </div>
            </div>

            {/* Position toggle button */}
            <button
              onClick={togglePosition}
              className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} z-10 shadow-md shadow-black/20 ml-4 w-8 h-8 flex items-center justify-center`}
              aria-label="Toggle sidebar position"
            >
              <span className={`text-xs ${colors.textActive}`}>⇄</span>
            </button>
            {/* Float button (desktop snapped only) */}
            {!isMobile && (
              <button
                onClick={toggleFloating}
                className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} z-10 shadow-md shadow-black/20 ml-2 w-8 h-8 flex items-center justify-center`}
                aria-label="Float panel"
                title="Detach as floating panel"
              >
                <span className={`text-xs ${colors.textActive}`} style={{fontSize: '14px'}}>&#x29C9;</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Vertical layout */}
            <button
              onClick={toggleExpanded}
              className={`absolute ${desktopFloating ? 'left-1' : (currentPosition === 'left' ? 'right-1' : 'left-1')} bottom-20 p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} z-10 shadow-md shadow-black/20 w-6 h-6 flex items-center justify-center`}
              aria-label="Expand sidebar"
            >
              <span className={colors.textActive}>{desktopFloating ? '↓' : (currentPosition === 'left' ? '→' : '←')}</span>
            </button>

            <div className={`h-full ${isMobile ? 'pt-4' : 'pt-16'} pb-16 flex flex-col items-center justify-center ${colors.text}`}>
              <div className="writing-mode-vertical text-xs opacity-70">
                {mode === 'single' ? 'Year' : 'Year Range'}
              </div>
              <div className="writing-mode-vertical text-xs font-bold my-2">
                {getYearLabel()}
              </div>
            </div>

            {desktopFloating ? (
              /* Floating: dock + orientation buttons */
              <>
                <button
                  onClick={() => setFloatOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
                  className={`absolute left-1 bottom-[4.5rem] p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} z-10 shadow-md shadow-black/20 w-6 h-6 flex items-center justify-center`}
                  aria-label="Toggle orientation"
                  title={floatOrientation === 'vertical' ? 'Switch to horizontal' : 'Switch to vertical'}
                >
                  <span className={`text-xs ${colors.textActive}`}>{floatOrientation === 'vertical' ? '⇔' : '⇕'}</span>
                </button>
                <button
                  onClick={toggleFloating}
                  className={`absolute left-1 bottom-10 p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} z-10 shadow-md shadow-black/20 w-6 h-6 flex items-center justify-center`}
                  aria-label="Dock panel"
                  title="Dock to edge"
                >
                  <span className={`text-xs ${colors.textActive}`} style={{fontSize: '10px'}}>&#x1F4CC;</span>
                </button>
              </>
            ) : (
              <>
                {/* Snapped: position cycle button */}
                <button
                  onClick={togglePosition}
                  className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} bottom-10 p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} z-10 shadow-md shadow-black/20 w-6 h-6 flex items-center justify-center`}
                  aria-label="Toggle sidebar position"
                >
                  <span className={`text-xs ${colors.textActive}`}>⇄</span>
                </button>
                {/* Float button (desktop snapped only) */}
                {!isMobile && (
                  <button
                    onClick={toggleFloating}
                    className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} bottom-2 p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} z-10 shadow-md shadow-black/20 w-6 h-6 flex items-center justify-center`}
                    aria-label="Float panel"
                    title="Detach as floating panel"
                  >
                    <span className={`text-xs ${colors.textActive}`} style={{fontSize: '10px'}}>&#x29C9;</span>
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* Resize grip for floating mode */}
        {desktopFloating && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end pr-0.5 pb-0.5 opacity-40 hover:opacity-70"
            onMouseDown={handleFloatResizeStart}
            onTouchStart={handleFloatResizeStart}
          >
            <svg width="8" height="8" viewBox="0 0 8 8">
              <path d="M8 0L0 8M8 3L3 8M8 6L6 8" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
        )}

        <style jsx>{`
          .writing-mode-vertical {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
          }
        `}</style>
      </div>
    );
  }

  // Container with dynamic positioning and fixed dimensions
  const positionConfig = asSidebar ? getPositionStyles : null;
  const dimensions = getCurrentDimensions();
  const desktopFloating = !isMobile && isFloating;

  const containerClass = asSidebar
    ? `max-h-screen ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden ${topTabsPosition === 'top' && currentPosition === 'top' && !desktopFloating ? '' : 'border'} ${colors.border}`
    : `mb-4 border rounded ${colors.border} overflow-hidden p-4 ${colors.bgLight}`;

  const containerStyle = asSidebar ? {
    ...positionConfig.style,
    width: isHorizontal ? 'auto' : `${dimensions.width}px`,
    height: isHorizontal ? `${dimensions.height}px` : 'auto',
    maxHeight: isHorizontal ? (isMobile ? '200px' : '50vh') : 'none',
    ...(desktopFloating ? {
      transform: `scale(${floatScale})`,
      transformOrigin: 'top left',
    } : {}),
  } : {};

  // Tailwind JIT-safe grid column classes (1-12 are standard Tailwind)
  const gridColsClass = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8', 9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11', 12: 'grid-cols-12' };

  // Grid container props: use Tailwind class when available, inline style for larger counts
  const gridProps = (cols) => gridColsClass[cols]
    ? { className: `grid ${gridColsClass[cols]} gap-1` }
    : { className: 'grid gap-1', style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } };

  const renderYearGrid = (cols) => (
    <div {...gridProps(cols)}>
      {years.map(year => (
        <button
          key={year}
          onClick={() => handleYearChange(year)}
          className={`px-1 py-0.5 text-xs rounded transition-colors whitespace-nowrap ${
            selectedYear === year
              ? `${colors.bgActive} ${colors.textActive} font-bold`
              : `${colors.bgLighter} ${colors.bgHover} ${colors.text}`
          }`}
        >
          {year}
        </button>
      ))}
    </div>
  );

  const renderRangeYearGrid = (cols) => (
    <div>
      <div className={`text-[10px] text-center mb-1 ${colors.text} opacity-70`}>
        {rangeYearTapPhase === 'idle' && yearRange.startYear && yearRange.endYear
          ? 'Tap to reselect'
          : rangeYearTapPhase === 'idle'
            ? 'Tap start year'
            : 'Tap end year'}
      </div>
      <div {...gridProps(cols)}>
        {years.map(year => {
          const isStart = year === yearRange.startYear;
          const isEnd = year === yearRange.endYear;
          const isBetween = yearRange.startYear && yearRange.endYear
            && parseInt(year) > parseInt(yearRange.startYear)
            && parseInt(year) < parseInt(yearRange.endYear);
          return (
            <button
              key={year}
              onClick={() => handleRangeYearGridTap(year)}
              className={`px-1 py-0.5 text-xs rounded transition-colors whitespace-nowrap ${
                isStart || isEnd
                  ? `${colors.bgActive} ${colors.textActive} font-bold`
                  : isBetween
                    ? `${colors.bgMed} ${colors.text}`
                    : `${colors.bgLighter} ${colors.bgHover} ${colors.text}`
              }`}
            >
              {year}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMonthGrid = (selectedValue, onSelect, cols) => (
    <div {...gridProps(cols)}>
      {months.map(month => (
        <button
          key={month}
          onClick={() => onSelect(month)}
          className={`px-1 py-0.5 text-xs rounded transition-colors ${
            selectedValue === month
              ? `${colors.bgActive} ${colors.textActive} font-bold`
              : `${colors.bgLighter} ${colors.bgHover} ${colors.text}`
          }`}
        >
          {monthNamesShort[month - 1]}
        </button>
      ))}
    </div>
  );

  const renderDayGrid = (daysArray, selectedValue, onSelect, cols) => (
    <div {...gridProps(cols)}>
      {daysArray.map(day => (
        <button
          key={day}
          onClick={() => onSelect(day)}
          className={`px-1 py-0.5 text-xs rounded transition-colors ${
            selectedValue === day
              ? `${colors.bgActive} ${colors.textActive} font-bold`
              : `${colors.bgLighter} ${colors.bgHover} ${colors.text}`
          }`}
        >
          {day}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={`year-selector-container ${asSidebar ? positionConfig.className : ''} ${containerClass}`}
      style={containerStyle}
    >
      {/* Drag bar for floating mode */}
      {desktopFloating && asSidebar && (
        <div
          className={`flex items-center justify-center py-1 cursor-grab active:cursor-grabbing ${colors.bgMed} rounded-t-lg`}
          onMouseDown={handleFloatDragStart}
          onTouchStart={handleFloatDragStart}
        >
          <div className="w-8 h-1 rounded-full bg-current opacity-30" />
        </div>
      )}
      {/* Collapse button for sidebar */}
      {asSidebar && (
        <button
          onClick={toggleExpanded}
          className={`${
            currentPosition === 'bottom'
              ? 'absolute right-2 top-1/2 -translate-y-8'
              : currentPosition === 'top'
              ? 'absolute right-2 bottom-1/2 translate-y-8'
              : `absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} bottom-20`
          } p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} z-10 shadow-md shadow-black/20`}
          aria-label="Collapse sidebar"
        >
          <span className={colors.textActive}>{currentPosition === 'bottom' ? '↓' : currentPosition === 'top' ? '↑' : currentPosition === 'left' ? '←' : '→'}</span>
        </button>
      )}
      
      <div className={`${
        isHorizontal
          ? `flex flex-row items-center ${topTabsPosition === 'top' && currentPosition === 'top' ? 'px-3 py-3' : 'p-3'} pr-12`
          : 'h-full flex flex-col pt-4 pb-8'
      }`}>

        {/* Mode toggle buttons */}
        <div className={`${
          isHorizontal
            ? isMobile && !isLandscape
              ? 'flex flex-col gap-1 items-center mr-2'
              : 'flex flex-row gap-1 items-center mr-3'
            : 'flex flex-col gap-1 items-center mb-2'
        }`}>

          {!(isMobile && !isLandscape && isHorizontal) && (
            <div className={`text-xs font-medium ${colors.text} ${
              isHorizontal ? 'mr-1' : 'mb-1'
            }`}>MODE</div>
          )}
          <button
            onClick={() => handleModeChange('single')}
            className={`px-2 py-1 rounded-sm text-[10px] font-bold text-center w-14 transition-all duration-200 skew-x-[-12deg] ${
              mode === 'single'
                ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}`
                : `${colors.text} ${colors.bgLighter}`
            }`}
          >
            <span className="skew-x-[12deg] inline-block">Single</span>
          </button>
          <button
            onClick={() => handleModeChange('range')}
            className={`px-2 py-1 rounded-sm text-[10px] font-bold text-center w-14 transition-all duration-200 skew-x-[-12deg] ${
              mode === 'range'
                ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}`
                : `${colors.text} ${colors.bgLighter}`
            }`}
          >
            <span className="skew-x-[12deg] inline-block">Range</span>
          </button>
        </div>

        {/* Content area - horizontal layout for bottom and top positions */}
        <div className={`${
          isHorizontal
            ? isMobile
              ? 'flex flex-row items-center space-x-2 px-2 flex-grow justify-center'
              : 'flex flex-row items-center space-x-3 overflow-x-auto max-w-full px-3 flex-grow justify-center'
            : `overflow-y-auto ${isLandscape ? 'max-h-[calc(100%-120px)]' : 'max-h-[calc(100%-180px)]'} ${
                mode === 'range' ? 'px-2' : 'px-1'
              } scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-current flex-grow flex flex-col items-center space-y-2`
        }`}>

          {mode === 'single' ? (
            // Single mode - year picker and optional month/day
            <>
              {/* Year selection */}
              <div className={`flex ${isHorizontal ? (isMobile && !isLandscape ? 'flex-col items-center' : 'flex-row items-center') : 'flex-col items-center'}`}>
                {!(isMobile && !isLandscape && isHorizontal) && (
                  <div className={`text-xs font-medium ${colors.text} ${
                    isHorizontal ? 'mr-2' : 'mb-1'
                  }`}>YEAR</div>
                )}

                <div className={`flex ${isHorizontal ? 'flex-row space-x-2' : 'flex-col'} items-center`}>
                  {/* All Time button - shown in all layouts */}
                  <button
                    onClick={(e) => {
                      console.log("All Time button clicked");

                      // First update local state
                      setSelectedYear('all');
                      setShowMonthSelector(false);
                      setShowDaySelector(false);

                      // Then directly call parent callback - this is key!
                      if (onYearChange) {
                        console.log("Directly calling parent onYearChange with 'all'");
                        onYearChange('all');
                      } else {
                        console.error("onYearChange callback not available!");
                      }

                      // Force UI refresh
                      setRefreshCounter(prev => prev + 1);
                    }}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      isHorizontal ? '' : 'mb-2'
                    } ${
                      selectedYear === 'all'
                        ? `${colors.bgActive} ${colors.textActive} font-bold`
                        : `${colors.bgLighter} hover:${colors.bgHover} ${colors.text}`
                    }`}
                    title="Show all-time data"
                  >
                    All Time
                  </button>
                  
                  {/* Year/Month/Day as horizontal columns for mobile portrait horizontal */}
                  {isMobile && !isLandscape && isHorizontal ? (
                    <div className="flex flex-row items-start gap-2">
                      {/* Column 1: Year grid */}
                      <div className="flex flex-col items-center">
                        {renderYearGrid(2)}
                        {selectedYear !== 'all' && (
                          <div className="mt-1">
                            <div
                              onClick={() => {
                                const nv = !showMonthSelector;
                                setShowMonthSelector(nv);
                                const isHistoryTab = activeTab === 'history';
                                if (!isHistoryTab) setUserEnabledSelectors(nv);
                                if (!nv) { setShowDaySelector(false); if (onYearChange && selectedYear !== 'all') onYearChange(selectedYear); }
                                else { if (onYearChange && selectedYear !== 'all') onYearChange(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`); }
                                setRefreshCounter(prev => prev + 1);
                              }}
                              className={`relative w-9 h-5 rounded-sm cursor-pointer transition-all duration-200 skew-x-[-12deg] ${showMonthSelector ? `${colors.bgActive} translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.3)] dark:shadow-[inset_2px_2px_0_0_rgba(65,105,225,0.5)]` : 'bg-gray-300 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0_0_rgba(65,105,225,0.4)]'}`}
                            >
                              <div className={`absolute top-[3px] left-[3px] w-[18px] h-3.5 bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${showMonthSelector ? 'translate-x-[14px]' : ''}`}>
                                <span className="text-[9px] font-bold text-gray-700 skew-x-[12deg]">M</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Column 2: Month grid */}
                      {selectedYear !== 'all' && showMonthSelector && (
                        <div className="flex flex-col items-center">
                          {renderMonthGrid(selectedMonth, handleMonthChange, 3)}
                          <div className="mt-1">
                            <div
                              onClick={() => {
                                const nv = !showDaySelector;
                                setShowDaySelector(nv);
                                const isHistoryTab = activeTab === 'history';
                                if (!isHistoryTab && nv) setUserEnabledSelectors(true);
                                if (nv) { if (onYearChange) onYearChange(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`); }
                                else { if (onYearChange) onYearChange(`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`); }
                                setRefreshCounter(prev => prev + 1);
                              }}
                              className={`relative w-9 h-5 rounded-sm cursor-pointer transition-all duration-200 skew-x-[-12deg] ${showDaySelector ? `${colors.bgActive} translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.3)] dark:shadow-[inset_2px_2px_0_0_rgba(65,105,225,0.5)]` : 'bg-gray-300 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0_0_rgba(65,105,225,0.4)]'}`}
                            >
                              <div className={`absolute top-[3px] left-[3px] w-[18px] h-3.5 bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${showDaySelector ? 'translate-x-[14px]' : ''}`}>
                                <span className="text-[9px] font-bold text-gray-700 skew-x-[12deg]">D</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Column 3: Day grid */}
                      {selectedYear !== 'all' && showMonthSelector && showDaySelector && (
                        renderDayGrid(days, selectedDay, handleDayChange, 5)
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      {renderYearGrid(isHorizontal ? Math.min(years.length, 12) : 2)}
                    </div>
                  )}
                </div>
              </div>

              {selectedYear !== 'all' && (
                <>
                  {/* Month Selector - hidden on mobile portrait horizontal (toggle is under year wheel) */}
                  {showMonthSelector && !(isMobile && !isLandscape && isHorizontal) && (
                    <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center ${isHorizontal ? '' : 'w-full'}`}>
                      {/* Month toggle */}
                      <div className={`flex items-center ${isHorizontal ? 'mr-1' : ''}`}>
                        <div
                          onClick={() => {
                              const newMonthValue = !showMonthSelector;
                              setShowMonthSelector(newMonthValue);

                              const isHistoryTab = activeTab === 'history';
                              if (!isHistoryTab) {
                                setUserEnabledSelectors(newMonthValue);
                              }

                              if (!newMonthValue) {
                                setShowDaySelector(false);
                                if (onYearChange && selectedYear !== 'all') {
                                  onYearChange(selectedYear);
                                }
                              } else {
                                if (onYearChange && selectedYear !== 'all') {
                                  const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
                                  onYearChange(dateStr);
                                }
                              }

                              setRefreshCounter(prev => prev + 1);
                          }}
                          className={`relative w-[76px] h-6 rounded-sm cursor-pointer transition-all duration-200 skew-x-[-12deg] ${showMonthSelector ? `${colors.bgActive} translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.3)] dark:shadow-[inset_2px_2px_0_0_rgba(65,105,225,0.5)]` : 'bg-gray-300 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0_0_rgba(65,105,225,0.4)]'}`}
                        >
                          <div className={`absolute top-[3px] left-[3px] w-[40px] h-[18px] bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${showMonthSelector ? 'translate-x-[30px]' : ''}`}>
                            <span className="text-[10px] font-bold text-gray-700 skew-x-[12deg]">MONTH</span>
                          </div>
                        </div>
                      </div>

                      <div className={isHorizontal ? 'ml-2' : 'mt-2'}>
                        {renderMonthGrid(selectedMonth, handleMonthChange, isHorizontal ? 12 : 3)}
                      </div>
                    </div>
                  )}
                  
                  {/* Day Toggle and Selector - hidden on mobile portrait horizontal */}
                  {showMonthSelector && !(isMobile && !isLandscape && isHorizontal) && (
                    <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center ${isHorizontal ? '' : 'w-full'}`}>
                      {/* Day toggle */}
                      <div className={`flex items-center ${isHorizontal ? 'mr-1' : ''}`}>
                        <div
                          onClick={() => {
                              const newDayValue = !showDaySelector;
                              setShowDaySelector(newDayValue);

                              const isHistoryTab = activeTab === 'history';
                              if (!isHistoryTab && newDayValue) {
                                setUserEnabledSelectors(true);
                              }

                              if (newDayValue) {
                                const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
                                if (onYearChange) onYearChange(dateStr);
                              } else {
                                const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
                                if (onYearChange) onYearChange(dateStr);
                              }

                              setRefreshCounter(prev => prev + 1);
                          }}
                          className={`relative w-[76px] h-6 rounded-sm cursor-pointer transition-all duration-200 skew-x-[-12deg] ${showDaySelector ? `${colors.bgActive} translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.3)] dark:shadow-[inset_2px_2px_0_0_rgba(65,105,225,0.5)]` : 'bg-gray-300 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0_0_rgba(65,105,225,0.4)]'}`}
                        >
                          <div className={`absolute top-[3px] left-[3px] w-[40px] h-[18px] bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${showDaySelector ? 'translate-x-[30px]' : ''}`}>
                            <span className="text-[10px] font-bold text-gray-700 skew-x-[12deg]">DAY</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Day grid selector - only shown when day toggle is on */}
                      {showDaySelector && (
                        <div className={isHorizontal ? 'ml-2' : 'mt-2'}>
                          {renderDayGrid(days, selectedDay, handleDayChange, isHorizontal ? 31 : 4)}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Show month toggle separately if month selector is off - hidden on mobile portrait horizontal */}
                  {!showMonthSelector && !(isMobile && !isLandscape && isHorizontal) && (
                    <div className={`flex ${isHorizontal ? 'flex-row items-center' : 'flex-col space-y-2'} ${isHorizontal ? '' : 'w-full mb-4'}`}>
                      {/* Month toggle */}
                      <div className={`flex items-center ${isHorizontal ? 'mr-1' : ''}`}>
                        <div
                          onClick={() => {
                              const newMonthValue = !showMonthSelector;
                              setShowMonthSelector(newMonthValue);

                              const isHistoryTab = activeTab === 'history';
                              if (!isHistoryTab) {
                                setUserEnabledSelectors(newMonthValue);
                              }

                              if (!newMonthValue) {
                                setShowDaySelector(false);
                                if (onYearChange && selectedYear !== 'all') {
                                  onYearChange(selectedYear);
                                }
                              } else {
                                if (onYearChange && selectedYear !== 'all') {
                                  const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
                                  onYearChange(dateStr);
                                }
                              }

                              setRefreshCounter(prev => prev + 1);
                          }}
                          className={`relative w-[76px] h-6 rounded-sm cursor-pointer transition-all duration-200 skew-x-[-12deg] ${showMonthSelector ? `${colors.bgActive} translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.3)] dark:shadow-[inset_2px_2px_0_0_rgba(65,105,225,0.5)]` : 'bg-gray-300 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0_0_rgba(65,105,225,0.4)]'}`}
                        >
                          <div className={`absolute top-[3px] left-[3px] w-[40px] h-[18px] bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${showMonthSelector ? 'translate-x-[30px]' : ''}`}>
                            <span className="text-[10px] font-bold text-gray-700 skew-x-[12deg]">MONTH</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            // Range mode
            <>
              {isMobile && !isLandscape && isHorizontal ? (
                /* Mobile portrait horizontal: columns — year grid | months | days */
                <div className="flex flex-row items-start gap-2">
                  {/* Column 1: Range year grid + M toggle */}
                  <div className="flex flex-col items-center">
                    {renderRangeYearGrid(2)}
                    {yearRange.startYear && yearRange.endYear && (
                      <div className="mt-1">
                        <div
                          onClick={() => {
                            const nv = !showRangeMonthDaySelectors;
                            setShowRangeMonthDaySelectors(nv);
                            if (!nv) {
                              setShowRangeDaySelectors(false);
                              if (onYearRangeChange) onYearRangeChange({ startYear: yearRange.startYear, endYear: yearRange.endYear });
                            } else {
                              const startStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}`;
                              const endStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}`;
                              if (onYearRangeChange) onYearRangeChange({ startYear: startStr, endYear: endStr });
                            }
                            setRefreshCounter(prev => prev + 1);
                          }}
                          className={`relative w-9 h-5 rounded-sm cursor-pointer transition-all duration-200 skew-x-[-12deg] ${showRangeMonthDaySelectors ? `${colors.bgActive} translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.3)] dark:shadow-[inset_2px_2px_0_0_rgba(65,105,225,0.5)]` : 'bg-gray-300 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0_0_rgba(65,105,225,0.4)]'}`}
                        >
                          <div className={`absolute top-[3px] left-[3px] w-[18px] h-3.5 bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${showRangeMonthDaySelectors ? 'translate-x-[14px]' : ''}`}>
                            <span className="text-[9px] font-bold text-gray-700 skew-x-[12deg]">M</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Column 2: Start/End month grids + D toggle */}
                  {showRangeMonthDaySelectors && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex flex-row gap-1">
                        <div>
                          <div className={`text-[10px] font-medium ${colors.text} text-center mb-0.5`}>SM</div>
                          {renderMonthGrid(startMonth, handleStartMonthChange, 3)}
                        </div>
                        <div>
                          <div className={`text-[10px] font-medium ${colors.text} text-center mb-0.5`}>EM</div>
                          {renderMonthGrid(endMonth, handleEndMonthChange, 3)}
                        </div>
                      </div>
                      <div>
                        <div
                          onClick={() => {
                            const nv = !showRangeDaySelectors;
                            setShowRangeDaySelectors(nv);
                            if (nv) {
                              const startStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
                              const endStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
                              if (onYearRangeChange) onYearRangeChange({ startYear: startStr, endYear: endStr });
                            } else {
                              const startStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}`;
                              const endStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}`;
                              if (onYearRangeChange) onYearRangeChange({ startYear: startStr, endYear: endStr });
                            }
                            setRefreshCounter(prev => prev + 1);
                          }}
                          className={`relative w-9 h-5 rounded-sm cursor-pointer transition-all duration-200 skew-x-[-12deg] ${showRangeDaySelectors ? `${colors.bgActive} translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.3)] dark:shadow-[inset_2px_2px_0_0_rgba(65,105,225,0.5)]` : 'bg-gray-300 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0_0_rgba(65,105,225,0.4)]'}`}
                        >
                          <div className={`absolute top-[3px] left-[3px] w-[18px] h-3.5 bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${showRangeDaySelectors ? 'translate-x-[14px]' : ''}`}>
                            <span className="text-[9px] font-bold text-gray-700 skew-x-[12deg]">D</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Column 3: Start/End day grids */}
                  {showRangeMonthDaySelectors && showRangeDaySelectors && (
                    <div className="flex flex-row gap-1">
                      <div>
                        <div className={`text-[10px] font-medium ${colors.text} text-center mb-0.5`}>SD</div>
                        {renderDayGrid(startDays, startDay, handleStartDayChange, 5)}
                      </div>
                      <div>
                        <div className={`text-[10px] font-medium ${colors.text} text-center mb-0.5`}>ED</div>
                        {renderDayGrid(endDays, endDay, handleEndDayChange, 5)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop / landscape / sidebar: shared range year grid */
                <div className="w-full">
                  {renderRangeYearGrid(isHorizontal ? Math.min(years.length, 12) : 2)}
                </div>
              )}

              {/* Range mode toggles and selectors - hidden on mobile portrait horizontal (handled inline above) */}
              {yearRange.startYear && yearRange.endYear && !(isMobile && !isLandscape && isHorizontal) && (
                <>
                  {/* Month/Day toggle */}
                  <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col space-y-2'} ${isHorizontal ? 'items-center' : 'w-full mb-4'}`}>
                    <div className={`flex items-center ${isHorizontal ? 'mr-1' : ''}`}>
                      <div
                        onClick={() => {
                            const newValue = !showRangeMonthDaySelectors;
                            setShowRangeMonthDaySelectors(newValue);
                            if (!newValue) setShowRangeDaySelectors(false);
                            else setShowRangeDaySelectors(true);

                            if (newValue) {
                              const startStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
                              const endStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
                              if (onYearRangeChange) {
                                onYearRangeChange({ startYear: startStr, endYear: endStr });
                              }
                            } else {
                              if (onYearRangeChange) {
                                onYearRangeChange({ startYear: yearRange.startYear, endYear: yearRange.endYear });
                              }
                            }

                            setRefreshCounter(prev => prev + 1);
                        }}
                        className={`relative w-[76px] h-6 rounded-sm cursor-pointer transition-all duration-200 skew-x-[-12deg] ${showRangeMonthDaySelectors ? `${colors.bgActive} translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_rgba(0,0,0,0.3)] dark:shadow-[inset_2px_2px_0_0_rgba(65,105,225,0.5)]` : 'bg-gray-300 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] dark:shadow-[2px_2px_0_0_rgba(65,105,225,0.4)]'}`}
                      >
                        <div className={`absolute top-[3px] left-[3px] w-[40px] h-[18px] bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${showRangeMonthDaySelectors ? 'translate-x-[30px]' : ''}`}>
                          <span className="text-[10px] font-bold text-gray-700 skew-x-[12deg]">M/D</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Month/Day grids - only shown when toggle is on */}
                  {showRangeMonthDaySelectors && (
                    <div className={`flex ${isHorizontal ? 'flex-row space-x-3' : 'flex-col space-y-2'} w-full`}>
                      {/* Month grids */}
                      <div className={`flex flex-row ${isHorizontal ? 'space-x-2' : 'justify-between gap-2 w-full'}`}>
                        <div className="flex-1">
                          <div className={`text-xs font-medium ${colors.text} text-center mb-1`}>SM</div>
                          {renderMonthGrid(startMonth, handleStartMonthChange, isHorizontal ? 6 : 3)}
                        </div>
                        <div className="flex-1">
                          <div className={`text-xs font-medium ${colors.text} text-center mb-1`}>EM</div>
                          {renderMonthGrid(endMonth, handleEndMonthChange, isHorizontal ? 6 : 3)}
                        </div>
                      </div>

                      {/* Day grids */}
                      <div className={`flex flex-row ${isHorizontal ? 'space-x-2' : 'justify-between gap-2 w-full'}`}>
                        <div className="flex-1">
                          <div className={`text-xs font-medium ${colors.text} text-center mb-1`}>SD</div>
                          {renderDayGrid(startDays, startDay, handleStartDayChange, isHorizontal ? 16 : 4)}
                        </div>
                        <div className="flex-1">
                          <div className={`text-xs font-medium ${colors.text} text-center mb-1`}>ED</div>
                          {renderDayGrid(endDays, endDay, handleEndDayChange, isHorizontal ? 16 : 4)}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          </div>
        
        {/* Position toggle / float-dock buttons */}
        {isHorizontal ? (
          <div className="flex items-center justify-center ml-2 gap-1">
            {asSidebar && desktopFloating ? (
              /* Floating: dock + orientation buttons */
              <>
                <button
                  onClick={() => setFloatOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
                  className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
                  aria-label="Toggle orientation"
                  title={floatOrientation === 'vertical' ? 'Switch to horizontal' : 'Switch to vertical'}
                >
                  <span className={`text-sm ${colors.textActive}`}>{floatOrientation === 'vertical' ? '⇔' : '⇕'}</span>
                </button>
                <button
                  onClick={toggleFloating}
                  className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
                  aria-label="Dock panel"
                  title="Dock to edge"
                >
                  <span className={`text-sm ${colors.textActive}`} style={{fontSize: '14px'}}>&#x1F4CC;</span>
                </button>
              </>
            ) : asSidebar && (
              <>
                <button
                  onClick={togglePosition}
                  className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
                  aria-label="Toggle sidebar position"
                >
                  <span className={`text-sm ${colors.textActive}`}>⇄</span>
                </button>
                {!isMobile && (
                  <button
                    onClick={toggleFloating}
                    className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
                    aria-label="Float panel"
                    title="Detach as floating panel"
                  >
                    <span className={`text-sm ${colors.textActive}`} style={{fontSize: '14px'}}>&#x29C9;</span>
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
            {asSidebar && desktopFloating ? (
              /* Floating: dock + orientation buttons */
              <>
                <button
                  onClick={() => setFloatOrientation(prev => prev === 'vertical' ? 'horizontal' : 'vertical')}
                  className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
                  aria-label="Toggle orientation"
                  title={floatOrientation === 'vertical' ? 'Switch to horizontal' : 'Switch to vertical'}
                >
                  <span className={`text-sm ${colors.textActive}`}>{floatOrientation === 'vertical' ? '⇔' : '⇕'}</span>
                </button>
                <button
                  onClick={toggleFloating}
                  className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
                  aria-label="Dock panel"
                  title="Dock to edge"
                >
                  <span className={`text-sm ${colors.textActive}`} style={{fontSize: '14px'}}>&#x1F4CC;</span>
                </button>
              </>
            ) : asSidebar && (
              <>
                <button
                  onClick={togglePosition}
                  className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
                  aria-label="Toggle sidebar position"
                >
                  <span className={`text-sm ${colors.textActive}`}>⇄</span>
                </button>
                {!isMobile && (
                  <button
                    onClick={toggleFloating}
                    className={`p-1 rounded-full ${colors.buttonBg} ${colors.textActive} ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
                    aria-label="Float panel"
                    title="Detach as floating panel"
                  >
                    <span className={`text-sm ${colors.textActive}`} style={{fontSize: '14px'}}>&#x29C9;</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Resize grip for floating mode */}
      {desktopFloating && asSidebar && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end pr-0.5 pb-0.5 opacity-40 hover:opacity-70"
          onMouseDown={handleFloatResizeStart}
          onTouchStart={handleFloatResizeStart}
        >
          <svg width="8" height="8" viewBox="0 0 8 8">
            <path d="M8 0L0 8M8 3L3 8M8 6L6 8" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
      )}

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thumb-rounded::-webkit-scrollbar-thumb {
          border-radius: 4px;
        }
        .scrollbar-thumb-current::-webkit-scrollbar-thumb {
          background-color: currentColor;
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
};

export default YearSelector;