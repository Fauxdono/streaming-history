// Optimized YearSelector.js with performance improvements
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import WheelSelector from './wheelselector.js';

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
  position = 'right', 
  startMinimized = false,
  asSidebar = false,
  activeTab = null, // Add activeTab to determine behavior
  topTabsPosition = 'top', // Add topTabsPosition to avoid collision
  topTabsHeight = 72, // Add topTabsHeight for proper spacing
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
  
  // Dynamic dimension presets based on actual screen size
  const getDimensionPresets = () => {
    const { width, height, category } = screenInfo;
    
    // Base dimensions that scale with screen size
    const scaleFactor = category === 'mobile' ? 0.8 : category === 'tablet' ? 0.9 : 1.0;
    
    return {
      collapsed: {
        width: 32,
        height: Math.max(40, Math.min(48, height * 0.05)) // 5% of screen height, min 40px, max 48px
      },
      expanded: {
        single: {
          width: Math.max(100, Math.min(140, width * 0.12)) * scaleFactor, // 12% of screen width
          height: Math.max(160, Math.min(200, height * 0.25)) * scaleFactor // 25% of screen height
        },
        range: {
          width: Math.max(180, Math.min(280, width * 0.18)) * scaleFactor, // 18% of screen width  
          height: Math.max(200, Math.min(280, height * 0.35)) * scaleFactor // 35% of screen height
        }
      }
    };
  };
  
  // Get current dimensions based on state
  const getCurrentDimensions = () => {
    const presets = getDimensionPresets();
    
    if (!expanded) {
      return presets.collapsed;
    }
    
    return mode === 'range' ? presets.expanded.range : presets.expanded.single;
  };
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
  const [startMonth, setStartMonth] = useState(1);
  const [startDay, setStartDay] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [endDay, setEndDay] = useState(31);
  
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
      
      if (width < 640) {
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

  // Force re-render when positioning needs to update
  const [positionKey, setPositionKey] = useState(0);
  
  // Trigger positioning recalculation when expanded state changes
  useEffect(() => {
    setPositionKey(prev => prev + 1);
  }, [expanded, currentPosition, topTabsPosition, topTabsHeight, asSidebar]);

  // Communicate all state changes to parent using preset dimensions
  useEffect(() => {
    if (asSidebar) {
      const dimensions = getCurrentDimensions();
      
      // Report all states atomically
      if (onExpandChange) onExpandChange(expanded);
      if (onPositionChange) onPositionChange(currentPosition);
      
      // Report dimensions based on current position
      if (currentPosition === 'left' || currentPosition === 'right') {
        if (onWidthChange) onWidthChange(dimensions.width);
        if (onHeightChange) onHeightChange(0);
      } else if (currentPosition === 'top' || currentPosition === 'bottom') {
        if (onHeightChange) onHeightChange(dimensions.height);
        if (onWidthChange) onWidthChange(0);
      }
    }
  }, [expanded, currentPosition, mode, screenInfo, asSidebar]);

  
  // When isRangeMode prop changes, update our internal mode state
  useEffect(() => {
    setMode(isRangeMode ? 'range' : 'single');
  }, [isRangeMode]);
  
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
  useEffect(() => {
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
      
      // Ensure the mode is consistent
      if (initialYear !== 'all' && initialYear.includes('-')) {
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
  
  // Memoized color theme to prevent recalculation
  const colors = useMemo(() => {
    switch (colorTheme) {
      case 'pink':
        return {
          text: 'text-pink-700',
          textActive: 'text-white',
          bgActive: 'bg-pink-500',
          bgHover: 'hover:bg-pink-600/50',
          bgLighter: 'bg-pink-100',
          bgDark: 'bg-pink-800',
          sidebarBg: 'bg-pink-100',
          glowActive: 'shadow-[0_0_15px_rgba(236,72,153,0.7)]',
          buttonBg: 'bg-pink-600',
          buttonHover: 'hover:bg-pink-700',
          border: 'border-pink-300',
          textBold: 'text-pink-800',
          bgLight: 'bg-pink-50',
          bgMed: 'bg-pink-200'
        };
      case 'purple':
        return {
          text: 'text-purple-700',
          textActive: 'text-white',
          bgActive: 'bg-purple-500',
          bgHover: 'hover:bg-purple-600/50',
          bgLighter: 'bg-purple-100',
          bgDark: 'bg-purple-800',
          sidebarBg: 'bg-purple-100',
          glowActive: 'shadow-[0_0_15px_rgba(168,85,247,0.7)]',
          buttonBg: 'bg-purple-600',
          buttonHover: 'hover:bg-purple-700',
          border: 'border-purple-300',
          textBold: 'text-purple-800',
          bgLight: 'bg-purple-50',
          bgMed: 'bg-purple-200'
        };
      case 'indigo':
        return {
          text: 'text-indigo-700',
          textActive: 'text-white',
          bgActive: 'bg-indigo-500',
          bgHover: 'hover:bg-indigo-600/50',
          bgLighter: 'bg-indigo-100',
          bgDark: 'bg-indigo-800',
          sidebarBg: 'bg-indigo-100',
          glowActive: 'shadow-[0_0_15px_rgba(99,102,241,0.7)]',
          buttonBg: 'bg-indigo-600',
          buttonHover: 'hover:bg-indigo-700',
          border: 'border-indigo-300',
          textBold: 'text-indigo-800',
          bgLight: 'bg-indigo-50',
          bgMed: 'bg-indigo-200'
        };
      case 'blue':
        return {
          text: 'text-blue-700',
          textActive: 'text-white',
          bgActive: 'bg-blue-500',
          bgHover: 'hover:bg-blue-600/50',
          bgLighter: 'bg-blue-100',
          bgDark: 'bg-blue-800',
          sidebarBg: 'bg-blue-100',
          glowActive: 'shadow-[0_0_15px_rgba(59,130,246,0.7)]',
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700',
          border: 'border-blue-300',
          textBold: 'text-blue-800',
          bgLight: 'bg-blue-50',
          bgMed: 'bg-blue-200'
        };
      case 'green':
        return {
          text: 'text-green-700',
          textActive: 'text-white',
          bgActive: 'bg-green-500',
          bgHover: 'hover:bg-green-600/50',
          bgLighter: 'bg-green-100',
          bgDark: 'bg-green-800',
          sidebarBg: 'bg-green-100',
          glowActive: 'shadow-[0_0_15px_rgba(34,197,94,0.7)]',
          buttonBg: 'bg-green-600',
          buttonHover: 'hover:bg-green-700',
          border: 'border-green-300',
          textBold: 'text-green-800',
          bgLight: 'bg-green-50',
          bgMed: 'bg-green-200'
        };
      case 'yellow':
        return {
          text: 'text-yellow-700',
          textActive: 'text-white',
          bgActive: 'bg-yellow-500',
          bgHover: 'hover:bg-yellow-600/50',
          bgLighter: 'bg-yellow-100',
          bgDark: 'bg-yellow-700',
          sidebarBg: 'bg-yellow-100',
          glowActive: 'shadow-[0_0_15px_rgba(234,179,8,0.7)]',
          buttonBg: 'bg-yellow-500',
          buttonHover: 'hover:bg-yellow-400',
          border: 'border-yellow-300',
          textBold: 'text-yellow-800',
          bgLight: 'bg-yellow-50',
          bgMed: 'bg-yellow-200'
        };
      case 'red':
        return {
          text: 'text-red-700',
          textActive: 'text-white',
          bgActive: 'bg-red-500',
          bgHover: 'hover:bg-red-600/50',
          bgLighter: 'bg-red-100',
          bgDark: 'bg-red-800',
          sidebarBg: 'bg-red-100',
          glowActive: 'shadow-[0_0_15px_rgba(239,68,68,0.7)]',
          buttonBg: 'bg-red-600',
          buttonHover: 'hover:bg-red-700',
          border: 'border-red-300',
          textBold: 'text-red-800',
          bgLight: 'bg-red-50',
          bgMed: 'bg-red-200'
        };
      case 'orange':
        return {
          text: 'text-orange-700',
          textActive: 'text-white',
          bgActive: 'bg-orange-500',
          bgHover: 'hover:bg-orange-600/50',
          bgLighter: 'bg-orange-100',
          bgDark: 'bg-orange-800',
          sidebarBg: 'bg-orange-100',
          glowActive: 'shadow-[0_0_15px_rgba(249,115,22,0.7)]',
          buttonBg: 'bg-orange-600',
          buttonHover: 'hover:bg-orange-700',
          border: 'border-orange-300',
          textBold: 'text-orange-800',
          bgLight: 'bg-orange-50',
          bgMed: 'bg-orange-200'
        };
      case 'teal':
      default:
        return {
          text: 'text-teal-700',
          textActive: 'text-white',
          bgActive: 'bg-teal-500',
          bgHover: 'hover:bg-teal-600/50',
          bgLighter: 'bg-teal-100',
          bgDark: 'bg-teal-800',
          sidebarBg: 'bg-teal-100',
          glowActive: 'shadow-[0_0_15px_rgba(20,184,166,0.7)]',
          buttonBg: 'bg-teal-600',
          buttonHover: 'hover:bg-teal-700',
          border: 'border-teal-300',
          textBold: 'text-teal-800',
          bgLight: 'bg-teal-50',
          bgMed: 'bg-teal-200'
        };
    }
  }, [colorTheme]);

  if (years.length === 0) {
    return <div className={colors.text + " italic"}>No year data available</div>;
  }
  
  // Toggle sidebar expand/collapse
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);
  
  // Toggle sidebar position - cycles through right, bottom, left, top with memory
  const togglePosition = useCallback(() => {
    setIsPositionTransitioning(true);
    if (onTransitionChange) {
      onTransitionChange(true);
    }
    
    const newPosition = currentPosition === 'right' ? 'bottom' : 
                       currentPosition === 'bottom' ? 'left' : 
                       currentPosition === 'left' ? 'top' : 'right';
    
    // Update position memory
    setPositionMemory(prev => ({
      last: newPosition,
      history: [...prev.history.slice(-3), newPosition] // Keep last 4 positions
    }));
    
    // Update position immediately for instant main page response
    setCurrentPosition(newPosition);
    
    // Clear transitioning state after animations settle
    setTimeout(() => {
      setIsPositionTransitioning(false);
      if (onTransitionChange) {
        onTransitionChange(false);
      }
    }, 300); // Reduced from 500ms for faster feel
  }, [currentPosition, onTransitionChange]);

  // Handle mode changes efficiently
  const handleModeChange = useCallback((newMode) => {
    // If the current mode is already the requested mode, do nothing
    if (mode === newMode) return;
    
    // Update internal mode state
    setMode(newMode);
    
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
        const formattedDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
        
        setYearRange({
          startYear: selectedYear,
          endYear: selectedYear
        });
        setStartMonth(selectedMonth);
        setEndMonth(selectedMonth);
        setStartDay(selectedDay);
        setEndDay(selectedDay);
        setShowRangeMonthDaySelectors(true);
        
        // For identical date ranges, actually use the single date callback
        if (onYearChange) {
          onYearChange(formattedDate);
        }
      } 
      // If we have a year-only selection in single mode
      else if (mode === 'single' && !showMonthSelector && selectedYear !== 'all') {
        // Convert single year to same start/end range
        setYearRange({
          startYear: selectedYear,
          endYear: selectedYear
        });
        setShowRangeMonthDaySelectors(false);
        
        // For identical year ranges, use the single year callback
        if (onYearChange) {
          onYearChange(selectedYear);
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
  }, [mode, showRangeMonthDaySelectors, yearRange, startMonth, endMonth, startDay, endDay, 
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
  }, [yearRange, startDay, endMonth, endDay, getDaysInMonth]);
  
  // Handle start day change in range mode
  const handleStartDayChange = useCallback((day) => {
    setStartDay(day);
    
    // Update parent with the new range
    updateParentWithDateRange(yearRange.startYear, startMonth, day, yearRange.endYear, endMonth, endDay);
  }, [yearRange, startMonth, endMonth, endDay]);
  
  // Handle end month change in range mode
  const handleEndMonthChange = useCallback((month) => {
    setEndMonth(month);
    
    // Make sure day is valid for this month
    if (yearRange.endYear) {
      const daysInMonth = getDaysInMonth(yearRange.endYear, month);
      const validDay = Math.min(endDay, daysInMonth);
      if (validDay !== endDay) {
        setEndDay(validDay);
      }
      
      // Update parent with the new range
      updateParentWithDateRange(yearRange.startYear, startMonth, startDay, yearRange.endYear, month, validDay);
      
      // Force UI refresh
      setRefreshCounter(prev => prev + 1);
    }
  }, [yearRange, startMonth, startDay, endDay, getDaysInMonth]);
  
  // Handle end day change in range mode
  const handleEndDayChange = useCallback((day) => {
    setEndDay(day);
    
    // Update parent with the new range
    updateParentWithDateRange(yearRange.startYear, startMonth, startDay, yearRange.endYear, endMonth, day);
  }, [yearRange, startMonth, startDay, endMonth]);
  
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

  // Unified function to update parent with date range
  const updateParentWithDateRange = (startYear, startM, startD, endYear, endM, endD) => {
    // Only proceed if we have the callback function
    if (!onYearRangeChange) return;
    
    // Use provided values or fall back to state
    const sYear = startYear || yearRange.startYear;
    const sMonth = startM || startMonth;
    const sDay = startD || startDay;
    const eYear = endYear || yearRange.endYear;
    const eMonth = endM || endMonth;
    const eDay = endD || endDay;
    
    if (!sYear || !eYear) return;
    
    // Format dates based on whether month/day selectors are shown
    let startValue, endValue;
    
    if (showRangeMonthDaySelectors) {
      // Format with month and day
      startValue = `${sYear}-${sMonth.toString().padStart(2, '0')}-${sDay.toString().padStart(2, '0')}`;
      endValue = `${eYear}-${eMonth.toString().padStart(2, '0')}-${eDay.toString().padStart(2, '0')}`;
    } else {
      // Year-only format
      startValue = sYear;
      endValue = eYear;
    }
    
    // IMPORTANT: Always call onYearRangeChange when in range mode
    // Let the parent component decide what to do with the values
    onYearRangeChange({
      startYear: startValue,
      endYear: endValue
    });
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
  }, [startMonth, startDay, endMonth, endDay, getDaysInMonth]);
  
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
        if (showRangeMonthDaySelectors) {
          if (startMonth === endMonth && startDay === endDay) {
            return `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
          }
          
          const startStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
          const endStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
          return `${startStr} to ${endStr}`;
        } else {
          return yearRange.startYear;
        }
      }
      
      if (showRangeMonthDaySelectors) {
        const startStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
        const endStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
        return `${startStr} to ${endStr}`;
      }
      
      return `${yearRange.startYear}-${yearRange.endYear}`;
    }
  };

  // Fixed settings bar height - this matches the FixedSettingsBar height
  const settingsBarHeight = isMobile ? 85 : 56;

  // Dynamic position styles that account for TopTabs
  const getPositionStyles = () => {
    const settingsBarHeight = isMobile ? 85 : 56;
    
    if (topTabsPosition === currentPosition) {
      // Same side - position after TopTabs
      switch (currentPosition) {
        case 'top':
          return {
            className: 'fixed left-0 right-0 z-[89]',
            style: { top: `${settingsBarHeight + topTabsHeight}px` }
          };
        case 'bottom':
          return {
            className: 'fixed left-0 right-0 z-[89]',
            style: { bottom: `${topTabsHeight}px` }
          };
        case 'left':
          return {
            className: 'fixed bottom-0 z-[89]',
            style: { 
              left: `${topTabsWidth}px`,
              top: `${settingsBarHeight}px`
            }
          };
        case 'right':
          return {
            className: 'fixed bottom-0 z-[89]',
            style: { 
              right: `${topTabsWidth}px`,
              top: `${settingsBarHeight}px`
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
              top: `${settingsBarHeight}px`,
              left: topTabsPosition === 'left' ? `${topTabsWidth}px` : '0px',
              right: topTabsPosition === 'right' ? `${topTabsWidth}px` : '0px'
            }
          };
        case 'bottom':
          return {
            className: 'fixed z-[90]',
            style: { 
              bottom: '0px',
              left: topTabsPosition === 'left' ? `${topTabsWidth}px` : '0px',
              right: topTabsPosition === 'right' ? `${topTabsWidth}px` : '0px'
            }
          };
        case 'left':
          return {
            className: 'fixed z-[90]',
            style: { 
              left: '0px',
              top: topTabsPosition === 'top' ? `${settingsBarHeight + topTabsHeight}px` : `${settingsBarHeight}px`,
              bottom: topTabsPosition === 'bottom' ? `${topTabsHeight}px` : '0px'
            }
          };
        case 'right':
          return {
            className: 'fixed z-[90]',
            style: { 
              right: '0px',
              top: topTabsPosition === 'top' ? `${settingsBarHeight + topTabsHeight}px` : `${settingsBarHeight}px`,
              bottom: topTabsPosition === 'bottom' ? `${topTabsHeight}px` : '0px'
            }
          };
      }
    }
    
    // Fallback
    return {
      className: 'fixed right-0 top-20 bottom-0 z-[90]',
      style: {}
    };
  };

  // If not expanded, show a mini sidebar
  if (!expanded && asSidebar) {
    const isBottom = currentPosition === 'bottom';
    const isTop = currentPosition === 'top';
    
    const positionConfig = getPositionStyles();
    const collapsedDimensions = getCurrentDimensions(); // This should be collapsed dimensions
    
    return (
      <div 
        className={`${positionConfig.className} max-h-screen ${
          isBottom || isTop 
            ? 'flex items-center justify-center py-2' 
            : ''
        } ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`}
        style={{
          ...positionConfig.style,
          width: isBottom || isTop ? '100%' : `${collapsedDimensions.width}px`,
          height: isBottom || isTop ? `${collapsedDimensions.height}px` : 'auto'
        }}
      >
        {/* Horizontal layout container for bottom and top positions */}
        {isBottom || isTop ? (
          <div className="flex flex-row items-center justify-center">
            {/* Expand button */}
            <button 
              onClick={toggleExpanded}
              className={`p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20 mr-8 w-8 h-8 flex items-center justify-center`}
              aria-label="Expand sidebar"
            >
              {isTop ? '↓' : '↑'}
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
              className={`p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20 ml-8 w-8 h-8 flex items-center justify-center`}
              aria-label="Toggle sidebar position"
            >
              <span className="text-xs">⇄</span>
            </button>
          </div>
        ) : (
          <>
            {/* Vertical layout - keep original structure */}
            <button 
              onClick={toggleExpanded}
              className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} bottom-20 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20 w-6 h-6 flex items-center justify-center`}
              aria-label="Expand sidebar"
            >
              {currentPosition === 'left' ? '→' : '←'}
            </button>
            
            <div className={`h-full ${isMobile ? 'pt-4' : 'pt-16'} pb-16 flex flex-col items-center justify-center ${colors.text}`}>
              <div className="writing-mode-vertical text-xs opacity-70">
                {mode === 'single' ? 'Year' : 'Year Range'}
              </div>
              <div className="writing-mode-vertical text-xs font-bold my-2">
                {getYearLabel()}
              </div>
            </div>
            
            <button 
              onClick={togglePosition}
              className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} bottom-10 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20 w-6 h-6 flex items-center justify-center`}
              aria-label="Toggle sidebar position"
            >
              <span className="text-xs">⇄</span>
            </button>
          </>
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
  const positionConfig = asSidebar ? getPositionStyles() : null;
  const dimensions = getCurrentDimensions();
  
  const containerClass = asSidebar 
    ? `${positionConfig.className} max-h-screen ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`
    : `mb-4 border rounded ${colors.border} overflow-hidden p-4 ${colors.bgLight}`;
  
  // Use fixed dimensions instead of responsive classes
  const containerStyle = asSidebar ? {
    ...positionConfig.style,
    width: currentPosition === 'bottom' || currentPosition === 'top' ? '100%' : `${dimensions.width}px`,
    height: currentPosition === 'bottom' || currentPosition === 'top' ? `${dimensions.height}px` : 'auto',
    maxHeight: currentPosition === 'bottom' || currentPosition === 'top' ? '50vh' : 'none'
  } : {};

  return (
    <div 
      className={`year-selector-sidebar ${containerClass}`}
      style={containerStyle}
    >
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
          } p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20`}
          aria-label="Collapse sidebar"
        >
          {currentPosition === 'bottom' ? '↓' : currentPosition === 'top' ? '↑' : currentPosition === 'left' ? '←' : '→'}
        </button>
      )}
      
      <div className={`${
        currentPosition === 'bottom' || currentPosition === 'top'
          ? `flex flex-row items-center ${topTabsPosition === 'top' && currentPosition === 'top' ? 'px-4 pb-4 pt-2' : 'p-4'}` 
          : 'h-full flex flex-col justify-between pt-4 pb-8'
      }`}>
        
        {/* Mode toggle buttons */}
        <div className={`${
          currentPosition === 'bottom' || currentPosition === 'top'
            ? 'flex flex-col gap-1 items-center'
            : 'flex flex-col gap-1 items-center mb-2'
        }`}>
          
          <div className={`text-xs mb-1 font-medium ${colors.text}`}>MODE</div>
          <button
            onClick={() => handleModeChange('single')}
            className={`px-2 py-1 rounded text-xs text-center w-14 transition-all duration-200 ${
              mode === 'single' 
                ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                : `${colors.text} ${colors.bgLighter}`
            }`}
          >
            Single
          </button>
          <button
            onClick={() => handleModeChange('range')}
            className={`px-2 py-1 rounded text-xs text-center w-14 transition-all duration-200 ${
              mode === 'range' 
                ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                : `${colors.text} ${colors.bgLighter}`
            }`}
          >
            Range
          </button>
          
          {/* All Time button - positioned after Range button in bottom and top layouts */}
          {(currentPosition === 'bottom' || currentPosition === 'top') && (
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
              className={`px-2 py-1 text-xs rounded-md transition-colors w-14 ${
                selectedYear === 'all' 
                  ? `${colors.bgActive} ${colors.textActive} font-bold` 
                  : `${colors.bgLighter} hover:${colors.bgHover} ${colors.text}`
              }`}
              title="Show all-time data"
            >
              All Time
            </button>
          )}
        </div>
        
        {/* Content area - horizontal layout for bottom and top positions */}
        <div className={`${
          currentPosition === 'bottom' || currentPosition === 'top'
            ? 'flex flex-row items-center space-x-4 overflow-x-auto max-w-full px-4 flex-grow justify-center'
            : `overflow-y-auto ${isLandscape ? 'max-h-[calc(100%-120px)]' : 'max-h-[calc(100%-180px)]'} ${
                mode === 'range' ? 'px-2' : 'px-1'
              } scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-current flex-grow flex flex-col items-center space-y-2`
        }`}>

          {mode === 'single' ? (
            // Single mode - year picker and optional month/day
            <>
              {/* Year selection */}
              <div className={`flex ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'flex-col' : 'flex-col'} items-center ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-y-1' : ''}`}>
                <div className={`text-xs ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'mb-1' : 'mb-1'} font-medium ${colors.text}`}>YEAR</div>

                <div className={`flex ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'flex-row space-x-2' : 'flex-col'} items-center`}>
                  {/* Add a quick "All Time" button with direct callback - only for vertical layouts */}
                  {currentPosition !== 'bottom' && currentPosition !== 'top' && (
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
                      className={`px-2 py-1 mb-2 text-xs rounded-md transition-colors ${
                        selectedYear === 'all' 
                          ? `${colors.bgActive} ${colors.textActive} font-bold` 
                          : `${colors.bgLighter} hover:${colors.bgHover} ${colors.text}`
                      }`}
                      title="Show all-time data"
                    >
                      All Time
                    </button>
                  )}
                  
                  <WheelSelector
                    items={['all', ...years]}
                    value={selectedYear}
                    onChange={handleYearChange}
                    colorTheme={colorTheme}
                    displayFormat={val => val === 'all' ? 'All Time' : val}
                  />
                </div>
              </div>

              {selectedYear !== 'all' && (
                <>
                  {/* Month Selector */}
                  {showMonthSelector && (
                    <div className={`flex ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'flex-col' : 'flex-col'} items-center ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-y-1' : 'w-full'}`}>
                      {/* Month toggle positioned above wheel */}
                      <div className={`flex items-center ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-x-2 mb-1' : 'justify-between w-full'}`}>
                        <div className={`text-xs font-medium ${colors.text}`}>MONTH</div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={showMonthSelector} 
                            onChange={() => {
                              const newMonthValue = !showMonthSelector;
                              setShowMonthSelector(newMonthValue);
                              
                              // Track that user has manually interacted with selectors
                              const isHistoryTab = activeTab === 'history'; // Only 'history' tab, not 'behavior'
                              if (!isHistoryTab) {
                                setUserEnabledSelectors(newMonthValue);
                              }
                              
                              // If turning off month, also turn off day
                              if (!newMonthValue) {
                                setShowDaySelector(false);
                                
                                // When turning off month selector, update parent with just the year
                                if (onYearChange && selectedYear !== 'all') {
                                  onYearChange(selectedYear);
                                }
                              } else {
                                // When turning on month selector, update parent with year-month format
                                if (onYearChange && selectedYear !== 'all') {
                                  const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
                                  onYearChange(dateStr);
                                }
                              }
                              
                              // Refresh UI
                              setRefreshCounter(prev => prev + 1);
                            }}
                            className="sr-only"
                          />
                          <div className={`w-9 h-5 rounded-full ${showMonthSelector ? colors.bgActive : 'bg-gray-300'}`}></div>
                          <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${showMonthSelector ? 'transform translate-x-4' : ''}`}></div>
                        </label>
                      </div>
                      
                      <WheelSelector
                        key={`month-selector-${selectedYear}-${refreshCounter}`}
                        items={months}
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        colorTheme={colorTheme}
                        displayFormat={getMonthName}
                      />
                    </div>
                  )}
                  
                  {/* Day Toggle and Selector */}
                  {showMonthSelector && (
                    <div className={`flex ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'flex-col' : 'flex-col'} items-center ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-y-1' : 'w-full'}`}>
                      {/* Day toggle positioned above wheel */}
                      <div className={`flex items-center ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-x-2 mb-1' : 'justify-between w-full'}`}>
                        <div className={`text-xs font-medium ${colors.text}`}>DAY</div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={showDaySelector} 
                            onChange={() => {
                              const newDayValue = !showDaySelector;
                              setShowDaySelector(newDayValue);
                              
                              // Track that user has manually interacted with selectors
                              const isHistoryTab = activeTab === 'history'; // Only 'history' tab, not 'behavior'
                              if (!isHistoryTab && newDayValue) {
                                setUserEnabledSelectors(true);
                              }
                              
                              // Update parent with appropriate date format based on the new state
                              if (newDayValue) {
                                // If turning ON day selector, use full YYYY-MM-DD format
                                const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
                                if (onYearChange) onYearChange(dateStr);
                              } else {
                                // If turning OFF day selector, use YYYY-MM format
                                const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
                                if (onYearChange) onYearChange(dateStr);
                              }
                              
                              // Refresh UI
                              setRefreshCounter(prev => prev + 1);
                            }}
                            className="sr-only"
                          />
                          <div className={`w-9 h-5 rounded-full ${showDaySelector ? colors.bgActive : 'bg-gray-300'}`}></div>
                          <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${showDaySelector ? 'transform translate-x-4' : ''}`}></div>
                        </label>
                      </div>
                      
                      {/* Day wheel selector - only shown when day toggle is on */}
                      {showDaySelector && (
                        <WheelSelector
                          key={`day-selector-${selectedYear}-${selectedMonth}-${refreshCounter}`}
                          items={days}
                          value={selectedDay}
                          onChange={handleDayChange}
                          colorTheme={colorTheme}
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Show month toggle separately if month selector is off */}
                  {!showMonthSelector && (
                    <div className={`flex ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'flex-col space-y-2' : 'flex-col space-y-2'} ${(currentPosition === 'bottom' || currentPosition === 'top') ? '' : 'w-full mb-4'}`}>
                      {/* Month toggle */}
                      <div className={`flex items-center ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-x-2' : 'justify-between w-full'}`}>
                        <div className={`text-xs font-medium ${colors.text}`}>MONTH</div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={showMonthSelector} 
                            onChange={() => {
                              const newMonthValue = !showMonthSelector;
                              setShowMonthSelector(newMonthValue);
                              
                              // Track that user has manually interacted with selectors
                              const isHistoryTab = activeTab === 'history'; // Only 'history' tab, not 'behavior'
                              if (!isHistoryTab) {
                                setUserEnabledSelectors(newMonthValue);
                              }
                              
                              // If turning off month, also turn off day
                              if (!newMonthValue) {
                                setShowDaySelector(false);
                                
                                // When turning off month selector, update parent with just the year
                                if (onYearChange && selectedYear !== 'all') {
                                  onYearChange(selectedYear);
                                }
                              } else {
                                // When turning on month selector, update parent with year-month format
                                if (onYearChange && selectedYear !== 'all') {
                                  const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
                                  onYearChange(dateStr);
                                }
                              }
                              
                              // Refresh UI
                              setRefreshCounter(prev => prev + 1);
                            }}
                            className="sr-only"
                          />
                          <div className={`w-9 h-5 rounded-full ${showMonthSelector ? colors.bgActive : 'bg-gray-300'}`}></div>
                          <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${showMonthSelector ? 'transform translate-x-4' : ''}`}></div>
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            // Range mode - with year/month/day selectors for both start and end side by side
            <>
              {/* Start/End Year Section - horizontally aligned */}
              <div className={`flex flex-row ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-x-4' : 'justify-between gap-2 w-full'}`}>
                <div className="flex flex-col items-center">
                  <div className={`text-xs mb-1 font-medium ${colors.text}`}>START</div>
                  <WheelSelector
                    items={years}
                    value={yearRange.startYear}
                    onChange={(year) => {
                      // Don't allow start year to be after end year
                      if (!yearRange.endYear || parseInt(year) <= parseInt(yearRange.endYear)) {
                        handleYearRangeChange({ 
                          startYear: year, 
                          endYear: yearRange.endYear || years[years.length - 1] 
                        });
                      }
                    }}
                    colorTheme={colorTheme}
                  />
                </div>
                
                <div className="flex flex-col items-center">
                  <div className={`text-xs mb-1 font-medium ${colors.text}`}>END</div>
                  <WheelSelector
                    items={years}
                    value={yearRange.endYear}
                    onChange={(year) => {
                      // Don't allow end year to be before start year
                      if (!yearRange.startYear || parseInt(year) >= parseInt(yearRange.startYear)) {
                        handleYearRangeChange({ 
                          startYear: yearRange.startYear || years[0], 
                          endYear: year 
                        });
                      }
                    }}
                    colorTheme={colorTheme}
                  />
                </div>
              </div>
              
              {/* Range mode toggles and selectors */}
              {yearRange.startYear && yearRange.endYear && (
                <>
                  {/* Month/Day toggle at top */}
                  <div className={`flex ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'flex-col space-y-2' : 'flex-col space-y-2'} ${(currentPosition === 'bottom' || currentPosition === 'top') ? '' : 'w-full mb-4'}`}>
                    <div className={`flex items-center ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-x-2' : 'justify-between w-full'}`}>
                      <div className={`text-xs font-medium ${colors.text}`}>MONTH/DAY</div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={showRangeMonthDaySelectors} 
                          onChange={() => {
                            // Toggle the state
                            const newValue = !showRangeMonthDaySelectors;
                            setShowRangeMonthDaySelectors(newValue);
                            
                            // Update parent with the appropriate date format based on the new state
                            if (newValue) {
                              // If turning ON month/day selectors, include month and day in range
                              const startStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
                              const endStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
                              
                              if (onYearRangeChange) {
                                onYearRangeChange({
                                  startYear: startStr,
                                  endYear: endStr
                                });
                              }
                            } else {
                              // If turning OFF month/day selectors, use year-only format
                              if (onYearRangeChange) {
                                onYearRangeChange({
                                  startYear: yearRange.startYear,
                                  endYear: yearRange.endYear
                                });
                              }
                            }
                            
                            // Force UI refresh
                            setRefreshCounter(prev => prev + 1);
                          }}
                          className="sr-only"
                        />
                        <div className={`w-9 h-5 rounded-full ${showRangeMonthDaySelectors ? colors.bgActive : 'bg-gray-300'}`}></div>
                        <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${showRangeMonthDaySelectors ? 'transform translate-x-4' : ''}`}></div>
                      </label>
                    </div>
                  </div>
                  
                  {/* Month/Day selectors - only shown when toggle is on */}
                  {showRangeMonthDaySelectors && (
                    <div className={`flex ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'flex-row space-x-4' : 'flex-col space-y-2'} w-full`}>
                      {/* Month selectors */}
                      <div className={`flex flex-row ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-x-4' : 'justify-between gap-2 w-full'}`}>
                        <div className="flex flex-col items-center">
                          <div className={`text-xs mb-1 font-medium ${colors.text}`}>START M</div>
                          <WheelSelector
                            key={`start-month-${refreshCounter}`}
                            items={months}
                            value={startMonth}
                            onChange={handleStartMonthChange}
                            colorTheme={colorTheme}
                            displayFormat={getMonthName}
                          />
                        </div>
                        
                        <div className="flex flex-col items-center">
                          <div className={`text-xs mb-1 font-medium ${colors.text}`}>END M</div>
                          <WheelSelector
                            key={`end-month-${refreshCounter}`}
                            items={months}
                            value={endMonth}
                            onChange={handleEndMonthChange}
                            colorTheme={colorTheme}
                            displayFormat={getMonthName}
                          />
                        </div>
                      </div>
                      
                      {/* Day selectors */}
                      <div className={`flex flex-row ${(currentPosition === 'bottom' || currentPosition === 'top') ? 'space-x-4' : 'justify-between gap-2 w-full'}`}>
                        <div className="flex flex-col items-center">
                          <div className={`text-xs mb-1 font-medium ${colors.text}`}>START D</div>
                          <WheelSelector
                            key={`start-day-${refreshCounter}`}
                            items={startDays}
                            value={startDay}
                            onChange={handleStartDayChange}
                            colorTheme={colorTheme}
                          />
                        </div>
                        
                        <div className="flex flex-col items-center">
                          <div className={`text-xs mb-1 font-medium ${colors.text}`}>END D</div>
                          <WheelSelector
                            key={`end-day-${refreshCounter}`}
                            items={endDays}
                            value={endDay}
                            onChange={handleEndDayChange}
                            colorTheme={colorTheme}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          </div>
        
        {/* Position toggle button - different layout for bottom and top positions */}
        {(currentPosition === 'bottom' || currentPosition === 'top') ? (
          asSidebar && (
            <button 
              onClick={togglePosition}
              className={`absolute right-2 ${currentPosition === 'top' ? 'bottom-1/2 -translate-y-6' : 'top-1/2 translate-y-6'} p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
              aria-label="Toggle sidebar position"
            >
              <span className="text-sm">⇄</span>
            </button>
          )
        ) : (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center">
            {asSidebar && (
              <button 
                onClick={togglePosition}
                className={`p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8 z-10`}
                aria-label="Toggle sidebar position"
              >
                <span className="text-sm">⇄</span>
              </button>
            )}
          </div>
        )}
      </div>
      
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