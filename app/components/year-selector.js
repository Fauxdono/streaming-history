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
  const [currentPosition, setCurrentPosition] = useState(position);
  const [selectedYear, setSelectedYear] = useState(initialYear || 'all');
  const [yearRange, setYearRange] = useState({ 
    startYear: initialYearRange?.startYear || '', 
    endYear: initialYearRange?.endYear || '' 
  });
  
  // Month and Day Selection
  const [selectedMonth, setSelectedMonth] = useState(1); // January = 1
  const [selectedDay, setSelectedDay] = useState(1);
  const [showDetailSelection, setShowDetailSelection] = useState(false);
  
  // Extract years from artistsByYear
  const years = useMemo(() => {
    if (!artistsByYear || typeof artistsByYear !== 'object') {
      console.warn('artistsByYear is not available or not an object', artistsByYear);
      return [];
    }
    
    return Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
  }, [artistsByYear]);
  
  // Generate all months (1-12)
  const months = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => i + 1),
  []);
  
  // Generate days based on selected month and year
  const days = useMemo(() => {
    if (selectedYear === 'all') return Array.from({ length: 31 }, (_, i) => i + 1);
    
    try {
      // Get the number of days in the selected month/year
      const daysInMonth = new Date(parseInt(selectedYear), selectedMonth, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    } catch (err) {
      console.warn('Error calculating days in month:', err);
      return Array.from({ length: 31 }, (_, i) => i + 1);
    }
  }, [selectedYear, selectedMonth]);
  
  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
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
  
  // Parse initialYear for date information if available
  useEffect(() => {
    if (initialYear) {
      if (initialYear === 'all') {
        setSelectedYear('all');
        setShowDetailSelection(false);
        return;
      }
      
      // Check for formats like YYYY-MM-DD or YYYY-MM
      const parts = initialYear.split('-');
      
      if (parts.length >= 1) {
        // Set the year
        setSelectedYear(parts[0]);
        
        if (parts.length >= 2) {
          // Has month information
          const monthValue = parseInt(parts[1]);
          if (!isNaN(monthValue) && monthValue >= 1 && monthValue <= 12) {
            setSelectedMonth(monthValue);
            
            if (parts.length >= 3) {
              // Has day information
              const dayValue = parseInt(parts[2]);
              // Validate day value against month
              const maxDays = new Date(parseInt(parts[0]), monthValue, 0).getDate();
              if (!isNaN(dayValue) && dayValue >= 1 && dayValue <= maxDays) {
                setSelectedDay(dayValue);
              }
            }
            
            setShowDetailSelection(true);
          }
        }
      }
    }
  }, [initialYear]);
  
  // Format month name for display
  const getMonthName = (month) => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return monthNames[month - 1];
  };
  
  // Map color theme to actual color values
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
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Toggle sidebar position
  const togglePosition = () => {
    setCurrentPosition(currentPosition === 'left' ? 'right' : 'left');
  };
  
  // Handle mode change between single/range
  const handleModeChange = (newMode) => {
    setMode(newMode);
    
    if (onToggleRangeMode) {
      onToggleRangeMode(newMode === 'range');
    }
    
    // Reset for single mode
    if (newMode === 'single') {
      setSelectedYear('all');
      setShowDetailSelection(false);
      
      if (onYearChange) {
        onYearChange('all');
      }
    } 
    // Set defaults for range mode
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
  
  // Handle year selection
  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    if (year === 'all') {
      // For "all", hide month/day selection
      setShowDetailSelection(false);
      
      if (onYearChange) {
        onYearChange('all');
      }
    } else {
      // For specific year, show detailed selection
      setShowDetailSelection(true);
      
      // Update the month/day if needed
      updateDateAndNotify(year, selectedMonth, selectedDay);
    }
  };
  
  // Handle month selection
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    
    // Adjust day if it's larger than the days in the new month
    const daysInMonth = new Date(parseInt(selectedYear), month, 0).getDate();
    const newDay = Math.min(selectedDay, daysInMonth);
    setSelectedDay(newDay);
    
    // Notify parent
    updateDateAndNotify(selectedYear, month, newDay);
  };
  
  // Handle day selection
  const handleDayChange = (day) => {
    setSelectedDay(day);
    updateDateAndNotify(selectedYear, selectedMonth, day);
  };
  
  // Utility function to update the full date and notify parent
  const updateDateAndNotify = (year, month, day) => {
    if (year === 'all' || !onYearChange) return;
    
    // Format as YYYY-MM-DD
    const formattedMonth = month.toString().padStart(2, '0');
    const formattedDay = day.toString().padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    onYearChange(dateStr);
  };
  
  // Handle year range changes
  const handleYearRangeChange = (startOrEnd, year) => {
    let newYearRange;
    
    if (startOrEnd === 'start') {
      // Don't allow start year to be after end year
      if (yearRange.endYear && parseInt(year) > parseInt(yearRange.endYear)) {
        return;
      }
      
      newYearRange = { 
        startYear: year, 
        endYear: yearRange.endYear || years[years.length - 1] 
      };
    } else {
      // Don't allow end year to be before start year
      if (yearRange.startYear && parseInt(year) < parseInt(yearRange.startYear)) {
        return;
      }
      
      newYearRange = { 
        startYear: yearRange.startYear || years[0], 
        endYear: year 
      };
    }
    
    setYearRange(newYearRange);
    
    if (onYearRangeChange) {
      onYearRangeChange(newYearRange);
    }
  };
  
  // Get the appropriate label for current selection
  const getYearLabel = () => {
    if (mode === 'single') {
      if (selectedYear === 'all') return 'All Time';
      
      if (showDetailSelection) {
        return `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
      }
      
      return selectedYear;
    } else {
      return `${yearRange.startYear}-${yearRange.endYear}`;
    }
  };

  // Position styles for the sidebar
  const positionStyles = currentPosition === 'left' ? 'left-0' : 'right-0';

  // Compressed sidebar view
  if (!expanded && asSidebar) {
    return (
      <div 
        className={`fixed ${positionStyles} top-20 h-[calc(100vh-6rem)] z-50 transition-all duration-300 w-8 ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`}
      >
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
  
  // Determine if this is a sidebar or inline component
  const containerClass = asSidebar 
    ? `fixed ${positionStyles} top-20 h-[calc(100vh-6rem)] z-50 transition-all duration-300 w-auto ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`
    : `mb-4 border rounded ${colors.border} overflow-hidden p-4 ${colors.bgLight}`;
  
  // Get year wheel items (add "all" in single mode)
  const yearWheelItems = mode === 'single' ? ['all', ...years] : years;
  
  // Full expanded view with wheel selectors
  return (
    <div className={containerClass}>
      {/* Collapse button - only for sidebar */}
      {asSidebar && (
        <button 
          onClick={toggleExpanded}
          className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} top-2 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20`}
          aria-label="Collapse sidebar"
        >
          {currentPosition === 'left' ? '←' : '→'}
        </button>
      )}
      
      <div className={asSidebar ? "h-full flex flex-col justify-between pt-10 pb-3 px-2" : "flex flex-col"}>
        {/* Mode toggle buttons */}
        <div className={`flex ${asSidebar ? 'flex-col mb-2' : ''} gap-2 justify-center items-center`}>
          {!asSidebar && (
            <span className={`text-sm font-medium ${colors.text}`}>Mode:</span>
          )}
          
          {asSidebar && (
            <div className={`text-xs mb-1 font-medium ${colors.text}`}>MODE</div>
          )}
          
          <div className="flex gap-1">
            <button
              onClick={() => handleModeChange('single')}
              className={`px-2 py-1 rounded text-xs text-center transition-all duration-200 ${
                mode === 'single' 
                  ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                  : `${colors.text} ${colors.bgLighter}`
              }`}
            >
              Single
            </button>
            <button
              onClick={() => handleModeChange('range')}
              className={`px-2 py-1 rounded text-xs text-center transition-all duration-200 ${
                mode === 'range' 
                  ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                  : `${colors.text} ${colors.bgLighter}`
              }`}
            >
              Range
            </button>
          </div>
        </div>
        
        {/* Selection area with wheel selectors */}
        <div className="flex-grow flex flex-col items-center justify-center p-2">
          {mode === 'single' ? (
            <div className="flex flex-col items-center gap-4">
              {/* Year selector */}
              <div className="flex flex-col items-center">
                <div className={`text-sm font-medium ${colors.text} mb-2`}>Select Year</div>
                <WheelSelector
                  items={yearWheelItems}
                  value={selectedYear}
                  onChange={handleYearChange}
                  colorTheme={colorTheme}
                  displayFormat={(val) => val === 'all' ? 'All Time' : val}
                />
              </div>
              
              {/* Month and day selectors (conditional) */}
              {showDetailSelection && selectedYear !== 'all' && (
                <div className="flex gap-4 items-center">
                  {/* Month selector */}
                  <div className="flex flex-col items-center">
                    <div className={`text-xs mb-1 font-medium ${colors.text}`}>Month</div>
                    <WheelSelector
                      items={months}
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      colorTheme={colorTheme}
                      displayFormat={getMonthName}
                    />
                  </div>
                  
                  {/* Day selector */}
                  <div className="flex flex-col items-center">
                    <div className={`text-xs mb-1 font-medium ${colors.text}`}>Day</div>
                    <WheelSelector
                      items={days}
                      value={selectedDay}
                      onChange={handleDayChange}
                      colorTheme={colorTheme}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Range mode with separate start/end year selectors
            <div className="flex gap-4 items-center">
              {/* Start Year */}
              <div className="flex flex-col items-center">
                <div className={`text-xs mb-1 font-medium ${colors.text}`}>Start</div>
                <WheelSelector
                  items={years}
                  value={yearRange.startYear}
                  onChange={(year) => handleYearRangeChange('start', year)}
                  colorTheme={colorTheme}
                />
              </div>
              
              <div className={`${colors.text} font-bold`}>-</div>
              
              {/* End Year */}
              <div className="flex flex-col items-center">
                <div className={`text-xs mb-1 font-medium ${colors.text}`}>End</div>
                <WheelSelector
                  items={years}
                  value={yearRange.endYear}
                  onChange={(year) => handleYearRangeChange('end', year)}
                  colorTheme={colorTheme}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom controls section */}
        <div className="mt-2 flex flex-col items-center gap-2">
          {/* Current selection display */}
          <div className={`font-bold text-center px-2 py-1 rounded-md ${colors.bgLight} ${colors.textBold} text-sm year-display`}>
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
          
          {/* Apply button for range mode */}
          {mode === 'range' && (
            <button
              onClick={() => {
                if (onYearRangeChange && yearRange.startYear && yearRange.endYear) {
                  onYearRangeChange(yearRange);
                }
              }}
              className={`px-3 py-1 ${colors.buttonBg} text-white rounded-md ${colors.buttonHover} text-xs font-bold`}
            >
              Apply Range
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default YearSelector;