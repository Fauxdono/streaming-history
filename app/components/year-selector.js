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
      case 'purple':
        return {
          text: 'text-purple-700',
          bg: 'bg-purple-600',
          bgHover: 'hover:bg-purple-700',
          bgLight: 'bg-purple-100',
          textLight: 'text-purple-700',
          bgHoverLight: 'hover:bg-purple-200',
          borderActive: 'border-purple-600',
          borderInactive: 'border-purple-800'
        };
      case 'indigo':
        return {
          text: 'text-indigo-700',
          bg: 'bg-indigo-600',
          bgHover: 'hover:bg-indigo-700',
          bgLight: 'bg-indigo-100',
          textLight: 'text-indigo-700',
          bgHoverLight: 'hover:bg-indigo-200',
          borderActive: 'border-indigo-600',
          borderInactive: 'border-indigo-800'
        };
      case 'blue':
        return {
          text: 'text-blue-700',
          bg: 'bg-blue-600',
          bgHover: 'hover:bg-blue-700',
          bgLight: 'bg-blue-100',
          textLight: 'text-blue-700',
          bgHoverLight: 'hover:bg-blue-200',
          borderActive: 'border-blue-600',
          borderInactive: 'border-blue-800'
        };
      case 'green':
        return {
          text: 'text-green-700',
          bg: 'bg-green-600',
          bgHover: 'hover:bg-green-700',
          bgLight: 'bg-green-100',
          textLight: 'text-green-700',
          bgHoverLight: 'hover:bg-green-200',
          borderActive: 'border-green-600',
          borderInactive: 'border-green-800'
        };
      case 'yellow':
        return {
          text: 'text-yellow-700',
          bg: 'bg-yellow-500',
          bgHover: 'hover:bg-yellow-600',
          bgLight: 'bg-yellow-100',
          textLight: 'text-yellow-700',
          bgHoverLight: 'hover:bg-yellow-200',
          borderActive: 'border-yellow-500',
          borderInactive: 'border-yellow-700'
        };
      case 'red':
        return {
          text: 'text-red-700',
          bg: 'bg-red-600',
          bgHover: 'hover:bg-red-700',
          bgLight: 'bg-red-100',
          textLight: 'text-red-700',
          bgHoverLight: 'hover:bg-red-200',
          borderActive: 'border-red-600',
          borderInactive: 'border-red-800'
        };
 case 'orange':
      return {
        text: 'text-orange-700',
        bg: 'bg-orange-600',
        bgHover: 'hover:bg-orange-700',
        bgLight: 'bg-orange-100',
        textLight: 'text-orange-700',
        bgHoverLight: 'hover:bg-orange-200',
        borderActive: 'border-orange-600',
        borderInactive: 'border-orange-800'
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
        <label className={colors.text + " font-medium text-sm"}>
          {mode === 'range' 
            ? 'Year Range Selection' 
            : initialYear === 'all' ? 'All-Time Selection' : 'Single Year Selection'}
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
              initialYear === 'all' && mode === 'single'
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