import React, { useState, useEffect, useRef } from 'react';
// Note: BetterYearSlider and DualHandleYearSlider are imported but not used in THIS component.
// Remove these imports if they are not used elsewhere in your project or passed to this component.
// import BetterYearSlider from './better-year-slider.js';
// import DualHandleYearSlider from './dual-handle-year-slider.js';

// Renamed component from VerticalYearSelector to YearSelector
const YearSelector = ({
  artistsByYear,
  onYearChange,
  onYearRangeChange, // Keep prop even if range mode isn't visually implemented here yet
  initialYear,
  initialYearRange, // Keep prop
  isRangeMode,
  onToggleRangeMode,
  colorTheme = 'teal',
  asSidebar = true, // Assuming it's always used as a sidebar based on structure
  position = 'right', // Now controls left/right positioning
  startMinimized = false
}) => {
  const [mode, setMode] = useState(isRangeMode ? 'range' : 'single');
  const [expanded, setExpanded] = useState(!startMinimized);
  const [isMobile, setIsMobile] = useState(false);
  // const [hoveredYear, setHoveredYear] = useState(null); // Keep if needed for other effects
  const sidebarRef = useRef(null);

  // Extract and sort years from artistsByYear
  const getYearsArray = () => {
    if (!artistsByYear || typeof artistsByYear !== 'object') {
      return [];
    }
    // Ensure keys are parsed as integers for correct numerical sorting
    return Object.keys(artistsByYear).map(year => parseInt(year, 10)).sort((a, b) => a - b);
  };

  const years = getYearsArray();

  // Check for mobile viewport (optional, could be removed if not used for specific logic)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // Example breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update internal mode when isRangeMode prop changes
  useEffect(() => {
    setMode(isRangeMode ? 'range' : 'single');
  }, [isRangeMode]);

  // --- Color Theme Mapping ---
  // Updated with 75% opacity and theme-specific bright text colors
  const colors = (() => {
    const opacity = '/75'; // Use 75% opacity for translucency
    switch (colorTheme) {
      case 'pink':
        return {
          text: 'text-pink-300', // Bright pink for inactive text
          textActive: 'text-white', // Active text remains white
          bgActive: 'bg-pink-600',
          bgHover: 'hover:bg-pink-700', // Used for mode buttons if re-enabled
          sidebarBg: `bg-pink-950${opacity}`,
          sidebarBorder: `border-pink-700${opacity}`,
          buttonBg: 'bg-pink-600',
          buttonHover: 'hover:bg-pink-700',
          scrollbarThumb: 'rgba(219, 39, 119, 0.6)', // Pinkish scrollbar thumb
          scrollbarThumbHover: 'rgba(219, 39, 119, 0.8)'
        };
      case 'purple':
        return {
          text: 'text-purple-300', // Bright purple
          textActive: 'text-white',
          bgActive: 'bg-purple-600',
          bgHover: 'hover:bg-purple-700',
          sidebarBg: `bg-purple-950${opacity}`,
          sidebarBorder: `border-purple-700${opacity}`,
          buttonBg: 'bg-purple-600',
          buttonHover: 'hover:bg-purple-700',
          scrollbarThumb: 'rgba(147, 51, 234, 0.6)', // Purple scrollbar thumb
          scrollbarThumbHover: 'rgba(147, 51, 234, 0.8)'
        };
      case 'indigo':
        return {
          text: 'text-indigo-300', // Bright indigo
          textActive: 'text-white',
          bgActive: 'bg-indigo-600',
          bgHover: 'hover:bg-indigo-700',
          sidebarBg: `bg-indigo-950${opacity}`,
          sidebarBorder: `border-indigo-700${opacity}`,
          buttonBg: 'bg-indigo-600',
          buttonHover: 'hover:bg-indigo-700',
          scrollbarThumb: 'rgba(99, 102, 241, 0.6)', // Indigo scrollbar thumb
          scrollbarThumbHover: 'rgba(99, 102, 241, 0.8)'
        };
      case 'blue':
        return {
          text: 'text-blue-300', // Bright blue
          textActive: 'text-white',
          bgActive: 'bg-blue-600',
          bgHover: 'hover:bg-blue-700',
          sidebarBg: `bg-blue-950${opacity}`,
          sidebarBorder: `border-blue-700${opacity}`,
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700',
          scrollbarThumb: 'rgba(59, 130, 246, 0.6)', // Blue scrollbar thumb
          scrollbarThumbHover: 'rgba(59, 130, 246, 0.8)'
        };
      case 'teal':
      default:
        return {
          text: 'text-teal-300', // Bright teal
          textActive: 'text-white',
          bgActive: 'bg-teal-600',
          bgHover: 'hover:bg-teal-700',
          sidebarBg: `bg-teal-950${opacity}`,
          sidebarBorder: `border-teal-700${opacity}`,
          buttonBg: 'bg-teal-600',
          buttonHover: 'hover:bg-teal-700',
          scrollbarThumb: 'rgba(20, 184, 166, 0.6)', // Teal scrollbar thumb
          scrollbarThumbHover: 'rgba(20, 184, 166, 0.8)'
        };
    }
  })();

  if (years.length === 0) {
    return <div className={`${colors.text} italic p-4`}>No year data available</div>;
  }

  // Toggle sidebar expand/collapse
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  // Handle mode change (single/range) - Keep if range mode might be added later
  const handleModeChange = (newMode) => {
    setMode(newMode);
    if (onToggleRangeMode) {
      onToggleRangeMode(newMode === 'range');
    }
    // Reset logic (optional)
    if (newMode === 'single' && onYearChange) {
       onYearChange('all');
    } else if (newMode === 'range' && onYearRangeChange && years.length > 0) {
       const start = initialYearRange?.startYear ?? years[0];
       const end = initialYearRange?.endYear ?? years[years.length - 1];
       onYearRangeChange({ startYear: start, endYear: end });
    }
  };

  // Handle year click (visually only supports single mode currently)
  const handleYearClick = (year) => {
    // Always operate in single mode based on current UI
    if (mode !== 'single') {
        handleModeChange('single'); // Ensure single mode
    }
    if (onYearChange) {
      onYearChange(year);
    }
  };

  // Get the appropriate label for the collapsed state
  const getYearLabel = () => {
    return initialYear === 'all' ? 'All' : initialYear;
  };

  // --- Dynamic Positioning Styles ---
  const positionStyles = position === 'left' ? 'left-0 border-r' : 'right-0 border-l';
  // Place button *outside* the sidebar edge for easier access
  const toggleButtonPosition = position === 'left'
    ? 'left-full -translate-x-1/2' // Positioned relative to the right edge of the sidebar
    : 'right-full translate-x-1/2'; // Positioned relative to the left edge of the sidebar
  // Rotate chevron based on expanded state and position
  const chevronRotation = expanded
    ? (position === 'left' ? 'rotate-180' : '') // Point away when expanded
    : (position === 'left' ? '' : 'rotate-180'); // Point towards when collapsed

  // --- Render Year Selector Sidebar ---
  return (
    <div
      ref={sidebarRef}
      className={`fixed ${positionStyles} top-16 h-[calc(100vh-8rem)] z-40 transition-transform duration-300 ease-in-out ${ // Use transform for expansion
        expanded ? 'translate-x-0' : (position === 'left' ? '-translate-x-[calc(100%-2rem)]' : 'translate-x-[calc(100%-2rem)]') // Adjust based on collapsed width (w-8 -> 2rem)
      } w-16 sm:w-20 ${colors.sidebarBg} ${colors.sidebarBorder} backdrop-blur-sm rounded-md flex flex-col`}
      style={{ '--scrollbar-thumb-color': colors.scrollbarThumb, '--scrollbar-thumb-hover-color': colors.scrollbarThumbHover } as React.CSSProperties} // Pass scrollbar colors as CSS variables
    >
      {/* Toggle button - positioned relative to the sidebar edge */}
      <button
        onClick={toggleExpanded}
        className={`absolute ${toggleButtonPosition} top-1/2 -translate-y-1/2 p-1.5 rounded-full ${colors.buttonBg} text-white ${colors.buttonHover} z-50 transition-transform duration-200`}
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transform transition-transform ${chevronRotation}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          {/* Chevron pointing right by default */}
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Expanded Content */}
      <div className={`flex flex-col h-full pt-4 pb-2 transition-opacity duration-200 ${expanded ? 'opacity-100 delay-150' : 'opacity-0 pointer-events-none'}`}>
          {/* Optional: Mode Toggle Buttons can be re-added here if needed */}

          {/* Year List - Scrollable */}
          <div className="flex-grow overflow-y-auto overscroll-contain-y touch-pan-y scrollbar-thin scrollbar-thumb-rounded px-2">
            <div className="w-full flex flex-col items-center space-y-1">
              {/* Years listed chronologically descending */}
              {years.slice().reverse().map((year) => (
                <button
                  key={year}
                  // Updated Styling: Theme color text, opacity changes, active bg highlight
                  className={`font-medium text-sm rounded px-2 py-1 w-full text-center transition-all duration-150 ease-in-out ${
                    initialYear === year // Check if it's the currently selected single year
                      ? `${colors.bgActive} ${colors.textActive} opacity-100 scale-105` // Active style: background, white text, slight scale
                      : `${colors.text} opacity-70 hover:opacity-100 hover:scale-105` // Inactive style: THEME text color, dim, brighten/scale on hover
                  }`}
                  onClick={() => handleYearClick(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* All-Time button at bottom */}
          <div className="flex flex-col items-center mt-3 px-2">
            <button
              onClick={() => handleYearClick('all')}
              // Consistent styling with year buttons
              className={`font-medium text-sm rounded px-2 py-1 w-full text-center transition-all duration-150 ease-in-out ${
                initialYear === 'all'
                  ? `${colors.bgActive} ${colors.textActive} opacity-100 scale-105`
                  : `${colors.text} opacity-70 hover:opacity-100 hover:scale-105`
              }`}
            >
              All Time
            </button>
          </div>
      </div>

      {/* Mini version when collapsed - Shown via parent's transform */}
       <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200 ${!expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
           {/* Rotate text for vertical display */}
           <div className={`writing-mode-vertical text-xs font-semibold my-1 transform rotate-180 ${colors.text}`}>
              {getYearLabel()}
           </div>
        </div>


      {/* Include CSS for vertical text and custom scrollbar */}
      {/* Scrollbar thumb color now uses CSS variables set on parent */}
      <style jsx>{`
        .writing-mode-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 5px; /* Slightly wider */
          height: 5px;
        }
        .scrollbar-thumb-rounded::-webkit-scrollbar-thumb {
          border-radius: 3px; /* More rounded */
          background-color: var(--scrollbar-thumb-color, rgba(156, 163, 175, 0.5)); /* Use variable with fallback */
          border: 1px solid transparent; /* Optional: space around thumb */
          background-clip: content-box; /* Clip background to content box */
        }
        .scrollbar-thumb-rounded::-webkit-scrollbar-thumb:hover {
           background-color: var(--scrollbar-thumb-hover-color, rgba(156, 163, 175, 0.7)); /* Use variable */
        }
        /* For Firefox */
        .scrollbar-thin {
          scrollbar-width: thin;
          scrollbar-color: var(--scrollbar-thumb-color, rgba(156, 163, 175, 0.5)) transparent; /* thumb track */
        }
        /* Basic transition for scrollbar color change (might not work in all browsers) */
        .scrollbar-thumb-rounded::-webkit-scrollbar-thumb {
           transition: background-color 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
};

// Update display name for React DevTools
YearSelector.displayName = 'YearSelector';

export default YearSelector; // Export the renamed component