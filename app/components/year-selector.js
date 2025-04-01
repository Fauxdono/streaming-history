import React, { useState, useEffect } from 'react';

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
  
  // Month and Day Selection for single mode
  const [showMonthSelection, setShowMonthSelection] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(1); // January = 1
  const [selectedDay, setSelectedDay] = useState(1);
  const [showDaySelection, setShowDaySelection] = useState(false);
  
  // Month and Day Selection for range mode
  const [showRangeMonthSelection, setShowRangeMonthSelection] = useState(false);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [showRangeDaySelection, setShowRangeDaySelection] = useState(false);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(31);
  const [rangeMonthSelectionType, setRangeMonthSelectionType] = useState('start'); // 'start' or 'end'
  const [rangeDaySelectionType, setRangeDaySelectionType] = useState('start'); // 'start' or 'end'
  
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
    // Handle "all" case gracefully
    if (year === 'all') return 31;
    
    // JavaScript months are 0-based, but our selectedMonth is 1-based
    return new Date(parseInt(year), month, 0).getDate();
  };
  
  // Get days array for single mode
  const getDaysArray = () => {
    if (selectedYear === 'all') return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };
  
  // Get days arrays for range mode
  const getStartDaysArray = () => {
    if (yearRange.startYear === '') return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = getDaysInMonth(yearRange.startYear, startMonth);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };
  
  const getEndDaysArray = () => {
    if (yearRange.endYear === '') return Array.from({ length: 31 }, (_, i) => i + 1);
    const daysInMonth = getDaysInMonth(yearRange.endYear, endMonth);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };
  
  const days = getDaysArray();
  const startDays = getStartDaysArray();
  const endDays = getEndDaysArray();
  
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
      setYearRange({
        startYear: initialYearRange.startYear,
        endYear: initialYearRange.endYear
      });
    }
  }, [initialYearRange]);
  
  // Update selectedYear when initialYear changes
  useEffect(() => {
    if (initialYear) {
      setSelectedYear(initialYear);
    }
  }, [initialYear]);
  
  // Reset month and day selection when year changes
  useEffect(() => {
    if (selectedYear !== 'all') {
      // Reset to defaults when changing years
      setSelectedMonth(1);
      setSelectedDay(1);
      setShowMonthSelection(false);
      setShowDaySelection(false);
    }
  }, [selectedYear]);
  
  // Reset range month and day selection when year range changes
  useEffect(() => {
    if (yearRange.startYear && yearRange.endYear) {
      // Reset to defaults when changing years
      setStartMonth(1);
      setEndMonth(12);
      setStartDay(1);
      setEndDay(getDaysInMonth(yearRange.endYear, 12));
      setShowRangeMonthSelection(false);
      setShowRangeDaySelection(false);
    }
  }, [yearRange.startYear, yearRange.endYear]);
  
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
  
  // Format month name for display
  const getMonthName = (month) => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return monthNames[month - 1];
  };
  
  // Toggle sidebar expand/collapse
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Toggle sidebar position
  const togglePosition = () => {
    setCurrentPosition(currentPosition === 'left' ? 'right' : 'left');
  };
  
  const handleModeChange = (newMode) => {
    // Update internal mode state
    setMode(newMode);
    
    // Notify parent component about mode change
    if (onToggleRangeMode) {
      onToggleRangeMode(newMode === 'range');
    }
    
    // Reset all selection states
    setShowMonthSelection(false);
    setShowDaySelection(false);
    setShowRangeMonthSelection(false);
    setShowRangeDaySelection(false);
    
    // If switching to single mode, default to 'all'
    if (newMode === 'single') {
      setSelectedYear('all');
      
      if (onYearChange) {
        onYearChange('all');
      }
    } 
    // If switching to range mode, default to full range
    else if (newMode === 'range' && years.length >= 2) {
      const newYearRange = {
        startYear: years[0],
        endYear: years[years.length - 1]
      };
      
      setYearRange(newYearRange);
      
      if (onYearRangeChange) {
        onYearRangeChange(newYearRange);
      }
    }
  };
  
  // Handle year change in single mode
  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    // Reset month and day selection
    setShowMonthSelection(false);
    setShowDaySelection(false);
    setSelectedMonth(1);
    setSelectedDay(1);
    
    if (onYearChange) {
      onYearChange(year);
    }
  };
  
  // Handle month change in single mode
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    
    // Reset day selection
    setShowDaySelection(false);
    setSelectedDay(1);
    
    // If a year and month are selected, update the date
    if (selectedYear !== 'all' && onYearChange) {
      const dateStr = `${selectedYear}-${month.toString().padStart(2, '0')}`;
      // Here, we're passing the year-month as the selected "year"
      onYearChange(dateStr);
    }
  };
  
  // Handle day change in single mode
  const handleDayChange = (day) => {
    setSelectedDay(day);
    
    // If a year and month are selected, update the date
    if (selectedYear !== 'all' && onYearChange) {
      const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      // Here, we're passing the year-month-day as the selected "year"
      onYearChange(dateStr);
    }
  };
  
  // Handle start month change in range mode
  const handleStartMonthChange = (month) => {
    setStartMonth(month);
    
    // Update the range with the new start month
    if (yearRange.startYear && onYearRangeChange) {
      const startDateStr = `${yearRange.startYear}-${month.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
      const endDateStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
      
      // Pass the full date range
      onYearRangeChange({
        startYear: yearRange.startYear,
        endYear: yearRange.endYear,
        startDate: startDateStr,
        endDate: endDateStr
      });
    }
  };
  
  // Handle end month change in range mode
  const handleEndMonthChange = (month) => {
    setEndMonth(month);
    
    // Update the range with the new end month
    if (yearRange.endYear && onYearRangeChange) {
      const startDateStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
      const endDateStr = `${yearRange.endYear}-${month.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
      
      // Pass the full date range
      onYearRangeChange({
        startYear: yearRange.startYear,
        endYear: yearRange.endYear,
        startDate: startDateStr,
        endDate: endDateStr
      });
    }
  };
  
  // Handle start day change in range mode
  const handleStartDayChange = (day) => {
    setStartDay(day);
    
    // Update the range with the new start day
    if (yearRange.startYear && onYearRangeChange) {
      const startDateStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const endDateStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
      
      // Pass the full date range
      onYearRangeChange({
        startYear: yearRange.startYear,
        endYear: yearRange.endYear,
        startDate: startDateStr,
        endDate: endDateStr
      });
    }
  };
  
  // Handle end day change in range mode
  const handleEndDayChange = (day) => {
    setEndDay(day);
    
    // Update the range with the new end day
    if (yearRange.endYear && onYearRangeChange) {
      const startDateStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
      const endDateStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      
      // Pass the full date range
      onYearRangeChange({
        startYear: yearRange.startYear,
        endYear: yearRange.endYear,
        startDate: startDateStr,
        endDate: endDateStr
      });
    }
  };
  
  // Handler for year range change in range mode
  const handleYearRangeChange = ({ startYear, endYear }) => {
    const newYearRange = { startYear, endYear };
    setYearRange(newYearRange);
    
    if (onYearRangeChange) {
      onYearRangeChange(newYearRange);
    }
  };
  
  // Get the appropriate label
  const getYearLabel = () => {
    if (mode === 'single') {
      if (selectedYear === 'all') return 'All Time';
      
      if (showDaySelection && selectedDay) {
        return `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
      }
      
      if (showMonthSelection && selectedMonth) {
        return `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
      }
      
      return selectedYear;
    } else {
      if (showRangeDaySelection && startDay && endDay) {
        return `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')} to ${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
      }
      
      if (showRangeMonthSelection && startMonth && endMonth) {
        return `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')} to ${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}`;
      }
      
      return `${yearRange.startYear}-${yearRange.endYear}`;
    }
  };

  // Position styles for the sidebar
  const positionStyles = currentPosition === 'left' ? 'left-0' : 'right-0';

  // If not expanded, show a mini sidebar
  if (!expanded) {
    return (
      <div 
        className={`fixed ${positionStyles} top-20 h-[calc(100vh-6rem)] z-50 transition-all duration-300 w-8 ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`}
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
  
  // Full expanded sidebar - now with wider width for better usability
  return (
    <div 
      className={`fixed ${positionStyles} top-20 h-[calc(100vh-6rem)] z-50 transition-all duration-300 w-20 sm:w-24 ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`}
    >
      {/* Collapse button */}
      <button 
        onClick={toggleExpanded}
        className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} top-2 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20`}
        aria-label="Collapse sidebar"
      >
        {currentPosition === 'left' ? '←' : '→'}
      </button>
      
      <div className="h-full flex flex-col justify-between pt-10 pb-3">
        {/* Mode toggle buttons at top */}
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
        
        {/* Scrollable content for selection */}
        <div className="overflow-y-auto max-h-[calc(100%-180px)] px-1 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-current flex-grow flex flex-col items-center space-y-2">
          {mode === 'single' ? (
            // Single mode
            <>
              {/* Main Heading */}
              <div className={`text-xs mb-1 font-medium ${colors.text}`}>YEAR</div>
              
              {/* Year Selection */}
              {years.slice().reverse().map((year) => (
                <button
                  key={year}
                  className={`font-medium text-sm rounded px-2 py-1 w-14 text-center transition-all duration-200 ${
                    year === selectedYear
                      ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                      : `${colors.text} ${colors.bgHover}`
                  } ${hoveredYear === year ? 'scale-110' : ''}`}
                  onClick={() => {
                    handleYearChange(year);
                  }}
                  onMouseEnter={() => setHoveredYear(year)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {year}
                </button>
              ))}
              
              {/* Month Selection Section */}
              {selectedYear !== 'all' && (
                <>
                  <div className={`w-10 h-px ${colors.bgMed} my-2`}></div>
                  <div className={`text-xs mb-1 font-medium ${colors.text}`}>MONTH</div>
                  
                  {months.map((month) => (
                    <button
                      key={`month-${month}`}
                      className={`font-medium text-sm rounded px-2 py-1 w-14 text-center transition-all duration-200 ${
                        month === selectedMonth
                          ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                          : `${colors.text} ${colors.bgHover}`
                      }`}
                      onClick={() => handleMonthChange(month)}
                    >
                      {getMonthName(month)}
                    </button>
                  ))}
                  
                  {/* Day Selection Section */}
                  <div className={`w-10 h-px ${colors.bgMed} my-2`}></div>
                  <div className={`text-xs mb-1 font-medium ${colors.text}`}>DAY</div>
                  
                  <div className="grid grid-cols-4 gap-1 w-full px-1">
                    {days.map((day) => (
                      <button
                        key={`day-${day}`}
                        className={`font-medium text-xs rounded p-1 w-4 h-4 flex items-center justify-center transition-all duration-200 ${
                          day === selectedDay
                            ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                            : `${colors.text} ${colors.bgHover}`
                        }`}
                        onClick={() => handleDayChange(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            // Range mode
            <>
              {/* Start Year Section */}
              <div className={`text-xs mb-1 font-medium ${colors.text}`}>START YEAR</div>
              
              {years.slice().reverse().map((year) => (
                <button
                  key={`start-${year}`}
                  className={`font-medium text-sm rounded px-2 py-1 w-14 text-center transition-all duration-200 ${
                    year === yearRange.startYear
                      ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                      : `${colors.text} ${colors.bgHover}`
                  } ${hoveredYear === `start-${year}` ? 'scale-110' : ''}`}
                  onClick={() => {
                    // Don't allow start year to be after end year
                    if (!yearRange.endYear || parseInt(year) <= parseInt(yearRange.endYear)) {
                      handleYearRangeChange({ 
                        startYear: year, 
                        endYear: yearRange.endYear || years[years.length - 1] 
                      });
                    }
                  }}
                  onMouseEnter={() => setHoveredYear(`start-${year}`)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {year}
                </button>
              ))}
              
              {/* Start Month Selection */}
              {yearRange.startYear && (
                <>
                  <div className={`w-10 h-px ${colors.bgMed} my-2`}></div>
                  <div className={`text-xs mb-1 font-medium ${colors.text}`}>START MONTH</div>
                  
                  {months.map((month) => (
                    <button
                      key={`start-month-${month}`}
                      className={`font-medium text-sm rounded px-2 py-1 w-16 text-center transition-all duration-200 ${
                        month === startMonth
                          ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                          : `${colors.text} ${colors.bgHover}`
                      }`}
                      onClick={() => handleStartMonthChange(month)}
                    >
                      {getMonthName(month)}
                    </button>
                  ))}
                  
                  {/* Start Day Selection */}
                  <div className={`w-10 h-px ${colors.bgMed} my-2`}></div>
                  <div className={`text-xs mb-1 font-medium ${colors.text}`}>START DAY</div>
                  
                  <div className="grid grid-cols-4 gap-1 w-full px-1">
                    {startDays.map((day) => (
                      <button
                        key={`start-day-${day}`}
                        className={`font-medium text-xs rounded p-1 w-4 h-4 flex items-center justify-center transition-all duration-200 ${
                          day === startDay
                            ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                            : `${colors.text} ${colors.bgHover}`
                        }`}
                        onClick={() => handleStartDayChange(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </>
              )}
              
              {/* Divider */}
              <div className={`w-16 h-1 ${colors.bgMed} my-4 rounded-full`}></div>
              
              {/* End Year Section */}
              <div className={`text-xs mb-1 font-medium ${colors.text}`}>END YEAR</div>
              
              {years.slice().reverse().map((year) => (
                <button
                  key={`end-${year}`}
                  className={`font-medium text-sm rounded px-2 py-1 w-14 text-center transition-all duration-200 ${
                    year === yearRange.endYear
                      ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                      : `${colors.text} ${colors.bgHover}`
                  } ${hoveredYear === `end-${year}` ? 'scale-110' : ''}`}
                  onClick={() => {
                    // Don't allow end year to be before start year
                    if (!yearRange.startYear || parseInt(year) >= parseInt(yearRange.startYear)) {
                      handleYearRangeChange({ 
                        startYear: yearRange.startYear || years[0], 
                        endYear: year 
                      });
                    }
                  }}
                  onMouseEnter={() => setHoveredYear(`end-${year}`)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {year}
                </button>
              ))}
              
              {/* End Month Selection */}
              {yearRange.endYear && (
                <>
                  <div className={`w-10 h-px ${colors.bgMed} my-2`}></div>
                  <div className={`text-xs mb-1 font-medium ${colors.text}`}>END MONTH</div>
                  
                  {months.map((month) => (
                    <button
                      key={`end-month-${month}`}
                      className={`font-medium text-sm rounded px-2 py-1 w-16 text-center transition-all duration-200 ${
                        month === endMonth
                          ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                          : `${colors.text} ${colors.bgHover}`
                      }`}
                      onClick={() => handleEndMonthChange(month)}
                    >
                      {getMonthName(month)}
                    </button>
                  ))}
                  
                  {/* End Day Selection */}
                  <div className={`w-10 h-px ${colors.bgMed} my-2`}></div>
                  <div className={`text-xs mb-1 font-medium ${colors.text}`}>END DAY</div>
                  
                  <div className="grid grid-cols-4 gap-1 w-full px-1">
                    {endDays.map((day) => (
                      <button
                        key={`end-day-${day}`}
                        className={`font-medium text-xs rounded p-1 w-4 h-4 flex items-center justify-center transition-all duration-200 ${
                          day === endDay
                            ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                            : `${colors.text} ${colors.bgHover}`
                        }`}
                        onClick={() => handleEndDayChange(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
</div>
        
        {/* Bottom section with "All Time" button, position toggle and current selection */}
        <div className="flex flex-col items-center mt-2 gap-2">
          {/* All Time button now at the bottom */}
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
          
          <div className={`font-bold text-center px-2 py-1 rounded-md ${colors.bgLight} ${colors.textBold} text-xs`}>
            {getYearLabel()}
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={togglePosition}
              className={`p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-7 h-7`}
              aria-label="Toggle sidebar position"
            >
              <span className="text-xs">⇄</span>
            </button>
            
            {/* Apply button for both modes */}
            <button
              onClick={() => {
                if (mode === 'single') {
                  // In single mode, apply the current year, month, day selection
                  if (selectedYear !== 'all' && onYearChange) {
                    const dateStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
                    onYearChange(dateStr);
                  } else if (onYearChange) {
                    onYearChange(selectedYear);
                  }
                } else {
                  // In range mode, apply the current year, month, day range
                  if (yearRange.startYear && yearRange.endYear && onYearRangeChange) {
                    const startDateStr = `${yearRange.startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
                    const endDateStr = `${yearRange.endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
                    
                    onYearRangeChange({
                      startYear: yearRange.startYear,
                      endYear: yearRange.endYear,
                      startDate: startDateStr,
                      endDate: endDateStr
                    });
                  } else if (onYearRangeChange) {
                    onYearRangeChange(yearRange);
                  }
                }
              }}
              className={`px-2 py-1 ${colors.buttonBg} text-white rounded-md ${colors.buttonHover} text-xs font-bold`}
            >
              Apply
            </button>
          </div>
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