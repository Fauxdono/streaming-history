import React, { useState, useEffect, useRef } from 'react';
import BetterYearSlider from './better-year-slider.js';
import DualHandleYearSlider from './dual-handle-year-slider.js';

const VerticalYearSelector = ({ 
  artistsByYear, 
  onYearChange, 
  onYearRangeChange, 
  initialYear, 
  initialYearRange, 
  isRangeMode, 
  onToggleRangeMode,
  colorTheme = 'teal', 
  asSidebar = false, 
  position = 'right', 
  startMinimized = false
}) => {
  const [mode, setMode] = useState(isRangeMode ? 'range' : 'single');
  const [expanded, setExpanded] = useState(!startMinimized);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredYear, setHoveredYear] = useState(null);
  const sidebarRef = useRef(null);
  
  // Extract years from artistsByYear
  const getYearsArray = () => {
    if (!artistsByYear || typeof artistsByYear !== 'object') {
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
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Update when isRangeMode prop changes
  useEffect(() => {
    setMode(isRangeMode ? 'range' : 'single');
  }, [isRangeMode]);
  
  // Map color theme to actual color values
  const colors = (() => {
    switch (colorTheme) {
      case 'pink':
        return {
          text: 'text-pink-700',
          textActive: 'text-white',
          bgActive: 'bg-pink-600',
          bgHover: 'hover:bg-pink-500',
          bgLighter: 'bg-pink-100',
          bgDark: 'bg-pink-800',
          sidebarBg: 'bg-pink-950/80', // Faded background
          sidebarBorder: 'border-pink-700',
          buttonBg: 'bg-pink-600',
          buttonHover: 'hover:bg-pink-700'
        };
      case 'purple':
        return {
          text: 'text-purple-700',
          textActive: 'text-white',
          bgActive: 'bg-purple-600',
          bgHover: 'hover:bg-purple-500',
          bgLighter: 'bg-purple-100',
          bgDark: 'bg-purple-800',
          sidebarBg: 'bg-purple-950/80', // Faded background
          sidebarBorder: 'border-purple-700',
          buttonBg: 'bg-purple-600',
          buttonHover: 'hover:bg-purple-700'
        };
      case 'indigo':
        return {
          text: 'text-indigo-700',
          textActive: 'text-white',
          bgActive: 'bg-indigo-600',
          bgHover: 'hover:bg-indigo-500',
          bgLighter: 'bg-indigo-100',
          bgDark: 'bg-indigo-800',
          sidebarBg: 'bg-indigo-950/80', // Faded background
          sidebarBorder: 'border-indigo-700',
          buttonBg: 'bg-indigo-600',
          buttonHover: 'hover:bg-indigo-700'
        };
      case 'blue':
        return {
          text: 'text-blue-700',
          textActive: 'text-white',
          bgActive: 'bg-blue-600',
          bgHover: 'hover:bg-blue-500',
          bgLighter: 'bg-blue-100',
          bgDark: 'bg-blue-800',
          sidebarBg: 'bg-blue-950/80', // Faded background
          sidebarBorder: 'border-blue-700',
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700'
        };
      case 'teal':
      default:
        return {
          text: 'text-teal-700',
          textActive: 'text-white',
          bgActive: 'bg-teal-600',
          bgHover: 'hover:bg-teal-500',
          bgLighter: 'bg-teal-100',
          bgDark: 'bg-teal-800',
          sidebarBg: 'bg-teal-950/80', // Faded background
          sidebarBorder: 'border-teal-700',
          buttonBg: 'bg-teal-600',
          buttonHover: 'hover:bg-teal-700'
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
  
  // Handle mode change (single/range)
  const handleModeChange = (newMode) => {
    setMode(newMode);
    
    if (onToggleRangeMode) {
      onToggleRangeMode(newMode === 'range');
    }
    
    if (newMode === 'single' && onYearChange) {
      onYearChange('all');
    } else if (newMode === 'range' && onYearRangeChange && years.length >= 2) {
      onYearRangeChange({
        startYear: years[0],
        endYear: years[years.length - 1]
      });
    }
  };
  
  // Handle year click
  const handleYearClick = (year) => {
    if (onYearChange) {
      onYearChange(year);
    }
  };
  
  // Get the appropriate label
  const getYearLabel = () => {
    if (mode === 'range' && initialYearRange) {
      return `${initialYearRange.startYear}-${initialYearRange.endYear}`;
    }
    return initialYear === 'all' ? 'All Time' : initialYear;
  };
  
  // Position styles for the sidebar
  const positionStyles = position === 'left' ? 'left-0' : 'right-0';

  // Render vertical sidebar
  return (
    <div 
      ref={sidebarRef}
      className={`fixed ${positionStyles} top-20 h-[calc(100vh-6rem)] z-50 transition-all duration-300 ${
        expanded ? 'w-16 sm:w-20' : 'w-8'
      } ${colors.sidebarBg} ${colors.sidebarBorder} border-l border-r backdrop-blur-sm rounded-lg overflow-hidden`}
    >
      {/* Toggle button */}
      <button 
        onClick={toggleExpanded}
        className={`absolute ${position === 'left' ? 'right-1' : 'left-1'} top-2 p-1 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-10`}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        {expanded ? (
          position === 'left' ? '←' : '→'
        ) : (
          position === 'left' ? '→' : '←'
        )}
      </button>
      
      {expanded && (
        <div className="h-full flex flex-col justify-between pt-10 pb-3">
          <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-gray-400 flex-grow flex flex-col items-center">
            {/* Mode toggle buttons at top */}
            <div className="flex flex-col gap-2 items-center mb-4">
              <button
                onClick={() => handleModeChange('range')}
                className={`px-2 py-1 rounded text-xs w-14 text-center ${
                  mode === 'range' 
                    ? `${colors.bgActive} text-white` 
                    : `text-white opacity-70 ${colors.bgHover}`
                }`}
              >
                Range
              </button>
              <button
                onClick={() => handleModeChange('single')}
                className={`px-2 py-1 rounded text-xs w-14 text-center ${
                  mode === 'single' 
                    ? `${colors.bgActive} text-white` 
                    : `text-white opacity-70 ${colors.bgHover}`
                }`}
              >
                Single
              </button>
            </div>
            
            {/* Year list - reversed with "All-Time" at the bottom */}
            <div className="w-full flex flex-col items-center mt-2 space-y-1">
              {years.slice().reverse().map((year) => (
                <button
                  key={year}
                  className={`font-medium text-sm rounded px-2 py-1 w-14 text-center transition-colors ${
                    initialYear === year
                      ? `${colors.bgActive} ${colors.textActive}` 
                      : 'text-white opacity-70 hover:opacity-100'
                  } ${hoveredYear === year ? 'opacity-100' : ''}`}
                  onClick={() => handleYearClick(year)}
                  onMouseEnter={() => setHoveredYear(year)}
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          
          {/* All-Time button at bottom */}
          <div className="flex flex-col items-center mt-4">
            <button
              onClick={() => handleYearClick('all')}
              className={`font-medium rounded-md px-2 py-1 w-16 text-center ${
                initialYear === 'all'
                  ? `${colors.bgActive} ${colors.textActive}` 
                  : 'text-white opacity-70 hover:opacity-100'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      )}
      
      {/* Mini version when collapsed */}
      {!expanded && (
        <div className={`h-full pt-10 flex flex-col items-center justify-center text-white`}>
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
          width: 4px;
        }
        .scrollbar-thumb-rounded::-webkit-scrollbar-thumb {
          border-radius: 2px;
        }
        .scrollbar-thumb-gray-400::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
};
export default YearSelector;