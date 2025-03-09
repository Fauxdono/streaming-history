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
  colorTheme = 'teal' // Default to teal, but allow customization
}) => {
  const [mode, setMode] = useState(isRangeMode ? 'range' : 'single');
  
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
  
  // When isRangeMode prop changes, update our internal mode state
  useEffect(() => {
    setMode(isRangeMode ? 'range' : 'single');
  }, [isRangeMode]);
  
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
  
  // Map color theme to actual color values
  const getColors = () => {
    switch (colorTheme) {
      case 'pink':
        return {
          text: 'text-pink-700',
          bg: 'bg-pink-600',
          bgHover: 'hover:bg-pink-700',
          bgLight: 'bg-pink-100',
          textLight: 'text-pink-700',
          bgHoverLight: 'hover:bg-pink-200',
          borderActive: 'border-pink-600',
          borderInactive: 'border-pink-800'
        };
      case 'teal':
      default:
        return {
          text: 'text-teal-700',
          bg: 'bg-teal-600',
          bgHover: 'hover:bg-teal-700',
          bgLight: 'bg-teal-100',
          textLight: 'text-teal-700',
          bgHoverLight: 'hover:bg-teal-200',
          borderActive: 'border-teal-600',
          borderInactive: 'border-teal-800'
        };
    }
  };

  const colors = getColors();
  
  if (years.length === 0) {
    return <div className={colors.text + " italic"}>No year data available</div>;
  }
  
  return (
    <div className="mt-2 mb-6">
      <div className="flex justify-between items-center mb-4">
        <label className={colors.text + " font-medium"}>
          {mode === 'range' 
            ? 'Year Range Selection' 
            : 'Single Year Selection'}
        </label>
        
        {/* Toggle between modes */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleModeChange('single')}
            className={`px-2 py-1 rounded text-sm ${
              mode === 'single' 
                ? colors.bg + ' text-white' 
                : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
            }`}
          >
            Single Year
          </button>
          
          <button
            onClick={() => handleModeChange('range')}
            className={`px-2 py-1 rounded text-sm ${
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