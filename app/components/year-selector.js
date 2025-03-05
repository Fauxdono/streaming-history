import React, { useState, useEffect } from 'react';
import BetterYearSlider from './better-year-slider.js';
import DualHandleYearSlider from './dual-handle-year-slider.js';

const YearSelector = ({ artistsByYear, onYearChange, onYearRangeChange, initialYear, initialYearRange, isRangeMode, onToggleRangeMode }) => {
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
  
  if (years.length === 0) {
    return <div className="text-teal-700 italic">No year data available</div>;
  }
  
  return (
    <div className="mt-2 mb-6">
      <div className="flex justify-between items-center mb-4">
        <label className="text-teal-700 font-medium">
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
                ? 'bg-teal-600 text-white' 
                : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
            }`}
          >
            Single Year
          </button>
          
          <button
            onClick={() => handleModeChange('range')}
            className={`px-2 py-1 rounded text-sm ${
              mode === 'range' 
                ? 'bg-teal-600 text-white' 
                : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
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
              className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700"
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
          />
        </div>
      )}
    </div>
  );
};

export default YearSelector;