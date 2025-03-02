import React, { useState, useEffect } from 'react';
import BetterYearSlider from './better-year-slider.js';
import DualHandleYearSlider from './dual-handle-year-slider.js';

const YearSelector = ({ artistsByYear, onYearChange, onYearRangeChange, initialYear, initialYearRange, isRangeMode }) => {
  const [mode, setMode] = useState(isRangeMode ? 'range' : 'single');
  
  // Extract years from artistsByYear and ensure they're in the correct format
  const getYearsArray = () => {
    // Check if artistsByYear is available
    if (!artistsByYear || typeof artistsByYear !== 'object') {
      console.warn('artistsByYear is not available or not an object', artistsByYear);
      return [];
    }
    
    // Debug
    console.log('YearSelector - artistsByYear keys:', Object.keys(artistsByYear));
    
    return Object.keys(artistsByYear).sort((a, b) => parseInt(a) - parseInt(b));
  };
  
  const years = getYearsArray();
  
  useEffect(() => {
    // Update mode if changed externally
    setMode(isRangeMode ? 'range' : 'single');
  }, [isRangeMode]);
  
  const handleModeChange = (newMode) => {
    setMode(newMode);
    
    // Notify parent about mode change
    if (newMode === 'single' && onYearChange) {
      // Default to 'all' when switching to single mode
      onYearChange('all');
    } else if (newMode === 'range' && onYearRangeChange && years.length >= 2) {
      // Default to full range when switching to range mode
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
              onClick={() => onYearChange('all')}
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