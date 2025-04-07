import React, { useState, useEffect, useMemo } from 'react';
import WheelSelector from './wheelselector.js';

const YearSelector = ({ 
  artistsByYear, 
  onYearChange, 
  onYearRangeChange, 
  initialYear, 
  initialYearRange, 
  isRangeMode, 
  onToggleRangeMode,
  colorTheme = 'teal', 
  position = 'right', 
  startMinimized = false,
  asSidebar = false 
}) => {
  const [mode, setMode] = useState(isRangeMode ? 'range' : 'single');
  const [expanded, setExpanded] = useState(!startMinimized);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredYear, setHoveredYear] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(position);
  const [selectedYear, setSelectedYear] = useState(initialYear || 'all');
  const [yearRange, setYearRange] = useState({ 
    startYear: initialYearRange?.startYear || '', 
    endYear: initialYearRange?.endYear || '' 
  });
  
  // Month and Day Selection - for single year mode
  const [showMonthSelector, setShowMonthSelector] = useState(false);
const [showDaySelector, setShowDaySelector] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  
  // Month and Day Selection - for range mode
  const [showRangeMonthDaySelectors, setShowRangeMonthDaySelectors] = useState(false);
  const [startMonth, setStartMonth] = useState(1);
  const [startDay, setStartDay] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [endDay, setEndDay] = useState(31);
  
  // For forcing UI updates - increment when we need a UI refresh
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Extract years from artistsByYear and ensure they're in the correct format
  const getYearsArray = () => {
    // Check if artistsByYear is available
    if (!artistsByYear || typeof artistsByYear !== 'object') {
      console.warn('artistsByYear is not available or not an object', artistsByYear);
      return [];
    }
    
    return Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
  };
  
  const years = getYearsArray();
  
  // Generate all months (1-12)
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate days based on selected month and year
  const getDaysInMonth = (year, month) => {
    if (!year || year === 'all') return 31;
    // JavaScript months are 0-based, but our month parameter is 1-based
    return new Date(parseInt(year), month, 0).getDate();
  };
  
  // Create the days arrays as memoized values
  const days = useMemo(() => {
    return Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth, refreshCounter]);
  
  const startDays = useMemo(() => {
    return Array.from({ length: getDaysInMonth(yearRange.startYear, startMonth) }, (_, i) => i + 1);
  }, [yearRange.startYear, startMonth, refreshCounter]);
  
  const endDays = useMemo(() => {
    return Array.from({ length: getDaysInMonth(yearRange.endYear, endMonth) }, (_, i) => i + 1);
  }, [yearRange.endYear, endMonth, refreshCounter]);
  
  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // When isRangeMode prop changes, update our internal mode state
  useEffect(() => {
    setMode(isRangeMode ? 'range' : 'single');
  }, [isRangeMode]);
  
  // Update yearRange when initialYearRange changes
  useEffect(() => {
    if (initialYearRange?.startYear && initialYearRange?.endYear) {
      // Check if initialYearRange has month/day information
      const startParts = initialYearRange.startYear.split('-');
      const endParts = initialYearRange.endYear.split('-');
      
      // Extract and set month/day if provided
      if (startParts.length >= 2 && endParts.length >= 2) {
        // Start date has month
        const startMonthPart = parseInt(startParts[1]);
        if (!isNaN(startMonthPart) && startMonthPart >= 1 && startMonthPart <= 12) {
          setStartMonth(startMonthPart);
          
          // If it also has day
          if (startParts.length >= 3) {
            const startDayPart = parseInt(startParts[2]);
            if (!isNaN(startDayPart) && startDayPart >= 1) {
              setStartDay(startDayPart);
            }
          }
        }
        
        // End date has month
        const endMonthPart = parseInt(endParts[1]);
        if (!isNaN(endMonthPart) && endMonthPart >= 1 && endMonthPart <= 12) {
          setEndMonth(endMonthPart);
          
          // If it also has day
          if (endParts.length >= 3) {
            const endDayPart = parseInt(endParts[2]);
            if (!isNaN(endDayPart) && endDayPart >= 1) {
              setEndDay(endDayPart);
            }
          }
        }
        
        // Show month/day selectors if both dates have month information
        if (startParts.length >= 2 && endParts.length >= 2) {
          setShowRangeMonthDaySelectors(true);
        }
        
        // Set the year part only
        setYearRange({
          startYear: startParts[0],
          endYear: endParts[0]
        });
      } else {
        // Simple year range
        setYearRange({
          startYear: initialYearRange.startYear,
          endYear: initialYearRange.endYear
        });
      }
    }
  }, [initialYearRange]);
  
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
      
      // If switching to "all", hide selectors
      if (initialYear === 'all') {
        setShowMonthSelector(false);
        setShowDaySelector(false);
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
  
  setRefreshCounter(prev => prev + 1);
}, [initialYear, onToggleRangeMode]);
  
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
  }, [selectedYear, selectedMonth]);
  
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
  }, [yearRange.startYear, yearRange.endYear, startMonth, endMonth]);
  
  // Map color theme to actual color values
  const getColors = () => {
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
  };

  const colors = getColors();
  
  if (years.length === 0) {
    return <div className={colors.text + " italic"}>No year data available</div>;
  }
  
  // Toggle sidebar expand/collapse
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Toggle sidebar position
  const togglePosition = () => {
    setCurrentPosition(currentPosition === 'left' ? 'right' : 'left');
  };

const handleModeChange = (newMode) => {
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
      setShowMonthDaySelectors(true);
      
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
      setShowMonthDaySelectors(false);
      
      if (onYearChange) {
        onYearChange(yearRange.startYear);
      }
    }
    else {
      // Default to all-time view
      setSelectedYear('all');
      setShowMonthDaySelectors(false);
      
      if (onYearChange) {
        onYearChange('all');
      }
    }
  } 
  // If switching to range mode
  else if (newMode === 'range' && years.length >= 2) {
    // If we have a specific date in single mode, preserve it in range mode
    if (mode === 'single' && showMonthDaySelectors && selectedYear !== 'all') {
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
    else if (mode === 'single' && !showMonthDaySelectors && selectedYear !== 'all') {
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
};
  
  // Format month name for display
  const getMonthName = (month) => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return monthNames[month - 1];
  };
  
  // Handle year change in single mode
  const handleYearChange = (year) => {
    // Save the previous year
    const prevYear = selectedYear;
    
    // Update selected year state
    setSelectedYear(year);
    
    // If changing to "all", hide month/day selectors
    if (year === 'all') {
      setShowMonthDaySelectors(false);
    }
    
    // If not "all", make sure the month/day are valid for this year
    if (year !== 'all') {
      // Validate month and day for the selected year
      const validDay = Math.min(selectedDay, getDaysInMonth(year, selectedMonth));
      if (validDay !== selectedDay) {
        setSelectedDay(validDay);
      }
    }
    
    // Update parent with the full date or just the year
    updateParentWithDate(year, selectedMonth, selectedDay);
    
    // Force UI refresh
    setRefreshCounter(prev => prev + 1);
  };
  
  // Handle month change in single mode
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    
    // Make sure day is valid for this month
    if (selectedYear !== 'all') {
      const daysInMonth = getDaysInMonth(selectedYear, month);
      const validDay = Math.min(selectedDay, daysInMonth);
      if (validDay !== selectedDay) {
        setSelectedDay(validDay);
      }
      
      // Update parent with the new date
      updateParentWithDate(selectedYear, month, validDay);
      
      // Force UI refresh
      setRefreshCounter(prev => prev + 1);
    }
  };
  
  // Handle day change in single mode
  const handleDayChange = (day) => {
    setSelectedDay(day);
    
    // Update parent with the new date
    if (selectedYear !== 'all') {
      updateParentWithDate(selectedYear, selectedMonth, day);
    }
  };
  
  // Handle start month change in range mode
  const handleStartMonthChange = (month) => {
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
  };
  
  // Handle start day change in range mode
  const handleStartDayChange = (day) => {
    setStartDay(day);
    
    // Update parent with the new range
    updateParentWithDateRange(yearRange.startYear, startMonth, day, yearRange.endYear, endMonth, endDay);
  };
  
  // Handle end month change in range mode
  const handleEndMonthChange = (month) => {
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
  };
  
  // Handle end day change in range mode
  const handleEndDayChange = (day) => {
    setEndDay(day);
    
    // Update parent with the new range
    updateParentWithDateRange(yearRange.startYear, startMonth, startDay, yearRange.endYear, endMonth, day);
  };
  
const updateParentWithDate = (year, month, day) => {
  if (!onYearChange) return;
  
  if (year === 'all') {
    onYearChange('all');
    return;
  }
  
  // Format according to what selectors are shown
  if (showMonthSelector && showDaySelector) {
    // Year-Month-Day format
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    onYearChange(dateStr);
  } else if (showMonthSelector) {
    // Year-Month format
    const dateStr = `${year}-${month.toString().padStart(2, '0')}`;
    onYearChange(dateStr);
  } else {
    // Just year
    onYearChange(year);
  }
};
// Replace the existing updateParentWithDateRange function with this version:

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
  const handleYearRangeChange = ({ startYear, endYear }) => {
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
  };
  

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
    // Keep your existing range mode logic here
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

  // Position styles for the sidebar
  const positionStyles = currentPosition === 'left' ? 'left-0' : 'right-0';

  // Check if we're in landscape mode (width > height)
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    // Initial check
    checkOrientation();
    
    // Listen for resize and orientation change events
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // If not expanded, show a mini sidebar
  if (!expanded && asSidebar) {
    return (
      <div 
        className={`fixed ${positionStyles} ${isLandscape ? 'top-2' : 'top-20'} h-[calc(100vh-1rem)] max-h-screen z-50 transition-all duration-300 w-8 ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`}
      >
        {/* Expand button */}
        <button 
          onClick={toggleExpanded}
          className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} top-2 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20`}
          aria-label="Expand sidebar"
        >
          {currentPosition === 'left' ? '→' : '←'}
        </button>
        
        <div className={`h-full pt-16 flex flex-col items-center justify-center ${colors.text}`}>
          <div className="writing-mode-vertical text-xs font-bold my-2">
            {getYearLabel()}
          </div>
          <div className="writing-mode-vertical text-xs opacity-70">
            {mode === 'single' ? 'Year' : 'Year Range'}
          </div>
        </div>
        
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
  
const containerClass = asSidebar 
  ? `fixed ${positionStyles} ${isLandscape ? 'top-2' : 'top-20'} h-[calc(100vh-1rem)] max-h-screen z-50 transition-all duration-300 ${
      mode === 'range' ? 'w-48 sm:w-64' : 'w-16 sm:w-32'
    } ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`
  : `mb-4 border rounded ${colors.border} overflow-hidden p-4 ${colors.bgLight}`;

return (
  <div className={`year-selector-sidebar ${containerClass}`} style={{ transition: 'width 0.3s ease-in-out' }}>
      {/* Collapse button for sidebar */}
      {asSidebar && (
        <button 
          onClick={toggleExpanded}
          className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} top-2 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20`}
          aria-label="Collapse sidebar"
        >
          {currentPosition === 'left' ? '←' : '→'}
        </button>
      )}
      
      <div className={`h-full flex flex-col justify-between ${isLandscape ? 'pt-4 pb-2' : 'pt-10 pb-3'}`}>
        {/* Mode toggle buttons at top - stacked vertically */}
        <div className="flex flex-col gap-1 items-center mb-2">
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
        </div>
        
   <div className={`overflow-y-auto ${isLandscape ? 'max-h-[calc(100%-120px)]' : 'max-h-[calc(100%-180px)]'} ${
  mode === 'range' ? 'px-2' : 'px-1'
} scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-current flex-grow flex flex-col items-center space-y-2`}>
{mode === 'single' ? (
  // Single mode - year picker and optional month/day
  <>
    {/* Year selection */}
    <div className="flex flex-col items-center">
      <div className={`text-xs mb-1 font-medium ${colors.text}`}>YEAR</div>
      <WheelSelector
        items={['all', ...years]}
        value={selectedYear}
        onChange={handleYearChange}
        colorTheme={colorTheme}
        displayFormat={val => val === 'all' ? 'All Time' : val}
      />
    </div>

{selectedYear !== 'all' && (
  <>
    {/* Month Selector Toggle */}
    <div className="flex items-center justify-between w-full mb-2">
      <div className={`text-xs font-medium ${colors.text}`}>Month</div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          checked={showMonthSelector} 
          onChange={() => {
            const newMonthValue = !showMonthSelector;
            setShowMonthSelector(newMonthValue);
            
            // If turning off month, also turn off day
            if (!newMonthValue) {
              setShowDaySelector(false);
            }
            
            // Update parent format based on what's visible
            updateParentWithDate(selectedYear, selectedMonth, selectedDay);
            
            // Refresh UI
            setRefreshCounter(prev => prev + 1);
          }}
          className="sr-only"
        />
        <div className={`w-9 h-5 rounded-full ${showMonthSelector ? colors.bgActive : 'bg-gray-300'}`}></div>
        <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${showMonthSelector ? 'transform translate-x-4' : ''}`}></div>
      </label>
    </div>
    
    {/* Month Selector */}
    {selectedYear !== 'all' && showMonthSelector && (
      <div className="flex flex-col items-center w-full">
        <div className={`text-xs mb-1 font-medium ${colors.text}`}>MONTH</div>
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
    
    {/* Day Selector Toggle - only shown if month is selected */}
    {selectedYear !== 'all' && showMonthSelector && (
      <div className="flex items-center justify-between w-full my-2">
        <div className={`text-xs font-medium ${colors.text}`}>Day</div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            checked={showDaySelector} 
            onChange={() => {
              const newDayValue = !showDaySelector;
              setShowDaySelector(newDayValue);
              
              // Update parent with appropriate date format
              updateParentWithDate(selectedYear, selectedMonth, selectedDay);
              
              // Refresh UI
              setRefreshCounter(prev => prev + 1);
            }}
            className="sr-only"
          />
          <div className={`w-9 h-5 rounded-full ${showDaySelector ? colors.bgActive : 'bg-gray-300'}`}></div>
          <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${showDaySelector ? 'transform translate-x-4' : ''}`}></div>
        </label>
      </div>
    )}
    
    {/* Day Selector */}
    {selectedYear !== 'all' && showMonthSelector && showDaySelector && (
      <div className="flex flex-col items-center w-full">
        <div className={`text-xs mb-1 font-medium ${colors.text}`}>DAY</div>
        <WheelSelector
          key={`day-selector-${selectedYear}-${selectedMonth}-${refreshCounter}`}
          items={days}
          value={selectedDay}
          onChange={handleDayChange}
          colorTheme={colorTheme}
        />
      </div>
    )}
  </>
)}
) : (
  // Range mode - with year/month/day selectors for both start and end side by side
  <>
    {/* Start/End Year Section - horizontally aligned */}
    <div className="flex flex-row justify-between gap-2 w-full">
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
    
    {/* Checkbox to show/hide month & day selectors for range */}
    {yearRange.startYear && yearRange.endYear && (
      <label className="flex flex-col items-center cursor-pointer mt-2 mb-2">
        <div className="relative">
          <input 
            type="checkbox" 
            checked={showRangeMonthDaySelectors} 
            onChange={() => {
              // Toggle the state
              const newValue = !showRangeMonthDaySelectors;
              setShowRangeMonthDaySelectors(newValue);
              
              // Update parent with the appropriate date format
              updateParentWithDateRange();
              
              // Force UI refresh
              setRefreshCounter(prev => prev + 1);
            }}
            className="sr-only"
          />
          <div className={`block w-10 h-6 rounded-full ${showRangeMonthDaySelectors ? colors.bgActive : 'bg-gray-300'}`}></div>
          <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showRangeMonthDaySelectors ? 'transform translate-x-4' : ''}`}></div>
        </div>
        <span className={`mt-1 text-xs ${colors.text}`}>Show M/D</span>
      </label>
    )}
    
    {/* Start/End Month selectors - horizontally aligned */}
    {yearRange.startYear && showRangeMonthDaySelectors && (
      <>
        <div className="flex flex-row justify-between gap-2 w-full mt-2">
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
        
        {/* Start/End Day selectors - horizontally aligned */}
        <div className="flex flex-row justify-between gap-2 w-full mt-2">
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
      </>
    )}
  </>
)}
        </div>
        
        {/* Bottom section with current selection display and position toggle */}
        <div className="flex flex-col items-center mt-2 gap-2">
          {/* Current selection display */}
          <div className={`font-bold text-center px-2 py-1 rounded-md ${colors.bgLight} ${colors.textBold} text-xs year-display truncate max-w-[110px]`}>
            {getYearLabel()}
          </div>
          
          {/* Sidebar position toggle - only for sidebar */}
          {asSidebar && (
            <button 
              onClick={togglePosition}
              className={`p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8`}
              aria-label="Toggle sidebar position"
            >
              <span className="text-xs">⇄</span>
            </button>
          )}
          
          {/* All Time button for single mode */}
          {mode === 'single' && (
            <button
              onClick={() => handleYearChange('all')}
              className={`font-bold rounded-md px-2 py-2 w-16 text-center transition-all duration-200 ${
                selectedYear === 'all'
                  ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                  : `${colors.text} hover:bg-white/10`
              } hover:scale-105 mb-1`}
            >
              All Time
            </button>
          )}
          
          {/* Apply button for range mode */}
          {mode === 'range' && (
            <button
              onClick={() => {
                if (yearRange.startYear && yearRange.endYear) {
                  updateParentWithDateRange();
                }
              }}
              className={`px-3 py-1 ${colors.buttonBg} text-white rounded-md ${colors.buttonHover} text-xs font-bold`}
            >
              Apply
            </button>
          )}
        </div>
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