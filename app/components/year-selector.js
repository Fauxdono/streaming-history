import React, { useState, useEffect } from 'react';
import BetterYearSlider from './better-year-slider.js';
import DualHandleYearSlider from './dual-handle-year-slider.js';

const YearSelector = ({ 
  artistsByYear, 
  onYearChange, 
  onYearRangeChange, 
  initialYear, 
  initialYearRange, 
  isRangeMode, 
  onToggleRangeMode,
  colorTheme = 'teal', // Default to teal, but allow customization
  asSidebar = false, // New prop to display as a fixed sidebar
  position = 'right', // 'left' or 'right' when using sidebar mode
  startMinimized = false // Option to start minimized
}) => {
  const [mode, setMode] = useState(isRangeMode ? 'range' : 'single');
  const [expanded, setExpanded] = useState(!startMinimized);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredYear, setHoveredYear] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(position);
  
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
    if (asSidebar) {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 640);
      };
      
      // Initial check
      checkMobile();
      
      // Add resize listener
      window.addEventListener('resize', checkMobile);
      
      // Cleanup
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, [asSidebar]);
  
  // When isRangeMode prop changes, update our internal mode state
  useEffect(() => {
    setMode(isRangeMode ? 'range' : 'single');
  }, [isRangeMode]);
  
  // Map color theme to actual color values with bright and glowing effects
  const colors = (() => {
    switch (colorTheme) {
      case 'teal':
      default:
        return {
          text: 'text-teal-900', // Darker text
          textActive: 'text-white',
          bgActive: 'bg-teal-500',
          bgHover: 'hover:bg-teal-600/50',
          bgLighter: 'bg-teal-400/20',
          bgDark: 'bg-teal-800',
          sidebarBg: 'bg-teal-200', // Light teal background
          glowActive: 'shadow-[0_0_15px_rgba(20,184,166,0.7)]', // Teal glow
          buttonBg: 'bg-teal-500',
          buttonHover: 'hover:bg-teal-400'
        };
    }
  })();
  
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
    if (newMode === 'single' && onYearChange) {
      onYearChange('all');
    } 
    // If switching to range mode, default to full range
    else if (newMode === 'range' && onYearRangeChange && years.length >= 2) {
      onYearRangeChange({
        startYear: years[0],
        endYear: years[years.length - 1]
      });
    }
  };
  
  // Get the appropriate label
  const getYearLabel = () => {
    if (mode === 'range' && initialYearRange) {
      return `${initialYearRange.startYear}-${initialYearRange.endYear}`;
    }
    return initialYear === 'all' ? 'All Time' : initialYear;
  };

  // Sidebar version
  if (asSidebar) {
    // Position styles for the sidebar
    const positionStyles = currentPosition === 'left' ? 'left-0' : 'right-0';

    return (
      <div 
        className={`fixed ${positionStyles} top-20 h-[calc(100vh-6rem)] z-50 transition-all duration-300 ${
          expanded ? 'w-16 sm:w-20' : 'w-8'
        } ${colors.sidebarBg} backdrop-blur-sm rounded-lg shadow-lg overflow-hidden`}
      >
        {/* Expand/Collapse toggle button */}
        <button 
          onClick={toggleExpanded}
          className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} top-2 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20`}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? (
            currentPosition === 'left' ? '←' : '→'
          ) : (
            currentPosition === 'left' ? '→' : '←'
          )}
        </button>
        
        {/* Position toggle button */}
        <button 
          onClick={togglePosition}
          className={`absolute ${currentPosition === 'left' ? 'right-1' : 'left-1'} top-10 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10 shadow-md shadow-black/20`}
          aria-label="Toggle sidebar position"
        >
          {currentPosition === 'left' ? '→' : '←'}
        </button>
        
        {expanded && (
          <div className="h-full flex flex-col justify-between pt-16 pb-3">
            <div className="overflow-y-auto max-h-[calc(100%-100px)] px-1 scrollbar-thin scrollbar-thumb-rounded scrollbar-track-teal-100 scrollbar-thumb-teal-400 flex-grow flex flex-col items-center space-y-2">
              {/* Mode toggle buttons at top */}
              <div className="flex flex-col gap-2 items-center mb-6">
                <div className={`text-xs mb-1 font-medium ${colors.text}`}>MODE</div>
                <button
                  onClick={() => handleModeChange('range')}
                  className={`px-2 py-1 rounded text-xs w-14 text-center transition-all duration-200 ${
                    mode === 'range' 
                      ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                      : `${colors.text} hover:bg-white/20`
                  }`}
                >
                  Range
                </button>
                <button
                  onClick={() => handleModeChange('single')}
                  className={`px-2 py-1 rounded text-xs w-14 text-center transition-all duration-200 ${
                    mode === 'single' 
                      ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                      : `${colors.text} hover:bg-white/20`
                  }`}
                >
                  Single
                </button>
              </div>
              
              {years.slice().reverse().map((year) => (
                <button
                  key={year}
                  className={`font-medium text-sm rounded px-2 py-1 w-14 text-center transition-all duration-200 ${
                    initialYear === year
                      ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                      : `${colors.text} hover:bg-white/10`
                  } ${hoveredYear === year ? 'scale-110' : ''}`}
                  onClick={() => onYearChange(year)}
                  onMouseEnter={() => setHoveredYear(year)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {year}
                </button>
              ))}
            </div>
            
            {/* All-Time button at bottom */}
            <div className="flex flex-col items-center mt-4 mb-1">
              <button
                onClick={() => onYearChange('all')}
                className={`font-bold rounded-md px-2 py-2 w-16 text-center transition-all duration-200 ${
                  initialYear === 'all'
                    ? `${colors.bgActive} ${colors.textActive} ${colors.glowActive}` 
                    : `${colors.text} hover:bg-white/10`
                } hover:scale-105`}
              >
                All Time
              </button>
            </div>
          </div>
        )}
        
        {/* Mini version when collapsed */}
        {!expanded && (
          <div className={`h-full pt-16 flex flex-col items-center justify-center ${colors.text}`}>
            <div className="writing-mode-vertical text-xs font-bold my-2">
              {getYearLabel()}
            </div>
            <div className="writing-mode-vertical text-xs opacity-70">
              Years
            </div>
          </div>
        )}
        
        <style jsx>{`
          .writing-mode-vertical {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            transform: rotate(180deg);
          }
          .scrollbar-thin::-webkit-scrollbar {
            width: 6px;
          }
          .scrollbar-track-teal-100::-webkit-scrollbar-track {
            background-color: rgba(204, 251, 241, 0.5);
          }
          .scrollbar-thumb-teal-400::-webkit-scrollbar-thumb {
            background-color: rgba(45, 212, 191, 0.7);
            border-radius: 4px;
          }
        `}</style>
      </div>
    );
  }
  
  // Standard inline version (original behavior)
  return (
    <div className="mt-2 mb-6">
      <div className="flex justify-between items-center mb-4">
        <label className={colors.text + " font-medium text-sm"}>
          {mode === 'range' 
            ? 'Year Range Selection' 
            : 'Single Year Selection'}
        </label>
        
        {/* Toggle between modes */}
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <button
            onClick={() => {
              setMode('single');
              if (onToggleRangeMode) {
                onToggleRangeMode(false);
              }
              if (onYearChange) {
                onYearChange('all');
              }
            }}
            className={`px-2 py-1 rounded text-xs ${
              mode === 'single' && initialYear === 'all'
                ? colors.bg + ' text-white' 
                : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
            }`}
          >
            All-Time
          </button>
          
          <button
            onClick={() => {
              setMode('single');
              if (onToggleRangeMode) {
                onToggleRangeMode(false);
              }
              // If currently on all-time, switch to most recent year
              if (initialYear === 'all' && years.length > 0 && onYearChange) {
                onYearChange(years[years.length - 1]);
              }
            }}
            className={`px-2 py-1 rounded text-xs ${
              mode === 'single' && initialYear !== 'all'
                ? colors.bg + ' text-white' 
                : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
            }`}
          >
            Single Year
          </button>
          
          <button
            onClick={() => handleModeChange('range')}
            className={`px-2 py-1 rounded text-xs ${
              mode === 'range' 
                ? colors.bg + ' text-white' 
                : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
            }`}
          >
            Year Range
          </button>
        </div>
      </div>
      
      {/* Render the appropriate slider based on mode */}
      {mode === 'single' ? (
        <div className="px-4">
          <BetterYearSlider 
            years={years} 
            onYearChange={onYearChange}
            initialYear={initialYear}
            colorTheme={colorTheme}
          />
          <div className="flex justify-center mt-4">
            <button
              onClick={() => {
                console.log("Show All Years clicked");
                // Set to 'all' first
                if (onYearChange) {
                  onYearChange('all');
                }
                
                // Force any BetterYearSlider to refresh
                setTimeout(() => {
                  const yearDisplays = document.querySelectorAll('.year-display');
                  yearDisplays.forEach(display => {
                    display.textContent = 'All-Time';
                  });
                }, 50);
              }}
              className={`px-3 py-1 ${colors.bg} text-white rounded ${colors.bgHover}`}
            >
              Show All Years
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4">
          <DualHandleYearSlider 
            years={years}
            onYearRangeChange={onYearRangeChange}
            initialStartYear={initialYearRange?.startYear || years[0]}
            initialEndYear={initialYearRange?.endYear || years[years.length - 1]}
            colorTheme={colorTheme}
          />
        </div>
      )}
    </div>
  );
};

export default YearSelector;