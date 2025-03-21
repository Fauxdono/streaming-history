import React, { useState, useEffect } from 'react';
import BetterYearSlider from './better-year-slider.js';
import DualHandleYearSlider from './dual-handle-year-slider.js';
import TripleRangeSelector from './triplerangeselector.js';

const DateSelector = ({ 
  availableYears, 
  onDateChange, 
  initialStartDate, 
  initialEndDate, 
  isRangeMode = false, 
  onToggleRangeMode,
  colorTheme = 'orange' 
}) => {
  const [mode, setMode] = useState(isRangeMode ? 'range' : 'single');
  const [selectedYear, setSelectedYear] = useState('all');
  const [yearRange, setYearRange] = useState({ startYear: '', endYear: '' });
  const [useAdvancedSelector, setUseAdvancedSelector] = useState(false);
  
  // Convert available years to strings if they aren't already
  const years = Array.isArray(availableYears) 
    ? availableYears.map(year => year.toString()).sort()
    : [];

  // When isRangeMode prop changes, update our internal mode state
  useEffect(() => {
    setMode(isRangeMode ? 'range' : 'single');
  }, [isRangeMode]);

  // Parse initial dates to extract years if provided
  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      const startYear = new Date(initialStartDate).getFullYear().toString();
      const endYear = new Date(initialEndDate).getFullYear().toString();
      
      if (startYear === endYear) {
        // Single year
        setSelectedYear(startYear);
      } else {
        // Year range
        setYearRange({ startYear, endYear });
        setMode('range');
        if (onToggleRangeMode) {
          onToggleRangeMode(true);
        }
      }
    }
  }, [initialStartDate, initialEndDate, onToggleRangeMode]);
  
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
      
      if (onDateChange) {
        // Send full available range when selecting "all"
        if (years.length >= 2) {
          const minYear = Math.min(...years.map(y => parseInt(y)));
          const maxYear = Math.max(...years.map(y => parseInt(y)));
          onDateChange(`${minYear}-01-01`, `${maxYear}-12-31`);
        }
      }
    } 
    // If switching to range mode, default to full range
    else if (newMode === 'range' && years.length >= 2) {
      const minYear = Math.min(...years.map(y => parseInt(y)));
      const maxYear = Math.max(...years.map(y => parseInt(y)));
      
      setYearRange({
        startYear: minYear.toString(),
        endYear: maxYear.toString()
      });
      
      if (onDateChange) {
        onDateChange(`${minYear}-01-01`, `${maxYear}-12-31`);
      }
    }
  };
  
  // Handle year change in single mode
  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    if (onDateChange) {
      if (year === 'all') {
        // For "all", use the full available range
        if (years.length >= 2) {
          const minYear = Math.min(...years.map(y => parseInt(y)));
          const maxYear = Math.max(...years.map(y => parseInt(y)));
          onDateChange(`${minYear}-01-01`, `${maxYear}-12-31`);
        } else if (years.length === 1) {
          // If we only have one year, use that
          onDateChange(`${years[0]}-01-01`, `${years[0]}-12-31`);
        } else {
          // Fallback to current year
          const currentYear = new Date().getFullYear();
          onDateChange(`${currentYear}-01-01`, `${currentYear}-12-31`);
        }
      } else {
        // For a specific year, set the range to cover the full year
        onDateChange(`${year}-01-01`, `${year}-12-31`);
      }
    }
  };
  
  // Handle year range change in range mode
  const handleYearRangeChange = ({ startYear, endYear }) => {
    setYearRange({ startYear, endYear });
    
    if (onDateChange) {
      onDateChange(`${startYear}-01-01`, `${endYear}-12-31`);
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
      case 'orange':
      default:
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
    }
  };

  const colors = getColors();
  
  return (
    <div className="mt-2 mb-6">
      <div className="flex justify-between items-center mb-4">
        <label className={colors.text + " font-medium"}>
          {useAdvancedSelector 
            ? 'Advanced Date Selection' 
            : mode === 'range' 
              ? 'Date Range Selection' 
              : 'Single Year Selection'}
        </label>
        
        {/* Toggle between modes */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setUseAdvancedSelector(false);
              handleModeChange('single');
            }}
            className={`px-2 py-1 rounded text-sm ${
              !useAdvancedSelector && mode === 'single' 
                ? colors.bg + ' text-white' 
                : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
            }`}
          >
            Single Year
          </button>
          
          <button
            onClick={() => {
              setUseAdvancedSelector(false);
              handleModeChange('range');
            }}
            className={`px-2 py-1 rounded text-sm ${
              !useAdvancedSelector && mode === 'range' 
                ? colors.bg + ' text-white' 
                : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
            }`}
          >
            Year Range
          </button>
          
          <button
            onClick={() => setUseAdvancedSelector(true)}
            className={`px-2 py-1 rounded text-sm ${
              useAdvancedSelector 
                ? colors.bg + ' text-white' 
                : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
            }`}
          >
            Advanced
          </button>
        </div>
      </div>
      
      {/* Render the appropriate selector based on mode */}
      {useAdvancedSelector ? (
        <TripleRangeSelector
          onDateRangeChange={onDateChange}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          colorTheme={colorTheme}
        />
      ) : mode === 'single' ? (
        <div className="px-4">
          <BetterYearSlider 
            years={years} 
            onYearChange={handleYearChange}
            initialYear={selectedYear !== 'all' ? selectedYear : null}
            colorTheme={colorTheme}
          />
          <div className="flex justify-center mt-4">
            <button
              onClick={() => handleYearChange('all')}
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
            onYearRangeChange={handleYearRangeChange}
            initialStartYear={yearRange.startYear || years[0]}
            initialEndYear={yearRange.endYear || years[years.length - 1]}
            colorTheme={colorTheme}
          />
        </div>
      )}
    </div>
  );
};

export default DateSelector;