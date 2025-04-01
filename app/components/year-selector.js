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
  startMinimized = false 
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
          textBold: 'text-pink-800'
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
          textBold: 'text-purple-800'
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
          textBold: 'text-indigo-800'
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
          textBold: 'text-blue-800'
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
          textBold: 'text-green-800'
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
          textBold: 'text-yellow-800'
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
          textBold: 'text-red-800'
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
          textBold: 'text-orange-800'
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
          textBold: 'text-teal-800'
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
    // Update internal mode state
    setMode(newMode);
    
    // Notify parent component about mode change
    if (onToggleRangeMode) {
      onToggleRangeMode(newMode === 'range');
    }
    
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
  
  // Handler for year change in single mode
  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    if (onYearChange) {
      onYearChange(year);
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
      return selectedYear === 'all' ? 'All Time' : selectedYear;
    } else {
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
  
  // Full expanded sidebar - different rendering for single vs range mode
  return (
    <div 
      className={`fixed ${positionStyles} top-20 h-[calc(100vh-6rem)] z-50 transition-all duration-300 w-16 sm:w-20 ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden border ${colors.border}`}
    >
      {/* Collapse button */}
      <button 
        onClick={toggleExpanded}
        className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} top-2 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20`}
        aria-label="Collapse sidebar"
      >
        {currentPosition === 'left' ? '←' : '→'}
      </button>
      
      <div className="h-full flex flex-col justify-between pt-16 pb-3">
        {/* Mode toggle buttons at top */}
        <div className="flex flex-col gap-2 items-center mb-2 mt-1">
          <div className={`text-xs mb-1 font-medium ${colors.text}`}>MODE</div>
          <div className="flex gap-1 justify-center">
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
        
        <div className="overflow-y-auto max-h-[calc(100%-110px)] px-1 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-current flex-grow flex flex-col items-center space-y-2">
          {mode === 'single' ? (
            // Single mode - list of years including "All Time"
            <>
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
              
              {years.slice().reverse().map((year) => (
                <button
                  key={year}
                  className={`font-medium text-sm rounded px-2 py-1 w-14 text-center transition-all duration-200 ${
                    year === selectedYear
                      ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                      : `${colors.text} ${colors.hoverBg}`
                  } ${hoveredYear === year ? 'scale-110' : ''}`}
                  onClick={() => handleYearChange(year)}
                  onMouseEnter={() => setHoveredYear(year)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {year}
                </button>
              ))}
            </>
          ) : (
            // Range mode - separate start and end year selectors
            <>
              {/* Start Year Section */}
              <div className={`text-xs mb-1 font-medium ${colors.text}`}>START</div>
              
              {years.slice().reverse().map((year) => (
                <button
                  key={`start-${year}`}
                  className={`font-medium text-sm rounded px-2 py-1 w-14 text-center transition-all duration-200 ${
                    year === yearRange.startYear
                      ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                      : `${colors.text} ${colors.hoverBg}`
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
              
              {/* Divider */}
              <div className={`w-10 h-px ${colors.bgMed} my-2`}></div>
              
              {/* End Year Section */}
              <div className={`text-xs mb-1 font-medium ${colors.text}`}>END</div>
              
              {years.slice().reverse().map((year) => (
                <button
                  key={`end-${year}`}
                  className={`font-medium text-sm rounded px-2 py-1 w-14 text-center transition-all duration-200 ${
                    year === yearRange.endYear
                      ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                      : `${colors.text} ${colors.hoverBg}`
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
            </>
          )}
        </div>
        
        {/* Bottom section with position toggle and current selection */}
        <div className="flex flex-col items-center mt-2 gap-2">
          <div className={`font-bold text-center px-2 py-1 rounded-md ${colors.bgLight} ${colors.textBold} text-sm`}>
            {getYearLabel()}
          </div>
          
          <button 
            onClick={togglePosition}
            className={`p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} shadow-md shadow-black/20 flex items-center justify-center w-8 h-8`}
            aria-label="Toggle sidebar position"
          >
            <span className="text-xs">⇄</span>
          </button>
          
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