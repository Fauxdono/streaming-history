// Simplified approach for the TripleRangeSelector component

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Helper function to get days in a month
function getDaysInMonth(year, month) {
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}

// Main component
const TripleRangeSelector = ({ 
  onDateRangeChange, 
  initialStartDate,
  initialEndDate,
  colorTheme = 'orange',
  availableYears = [],
  availableData = null 
}) => {
  // Constants for mode and special values
  const MODE_SINGLE = 'single';
  const MODE_RANGE = 'range';
  const ALL_TIME = 'all';
  
  // First, determine the range of years to use
  const currentYear = new Date().getFullYear();
  
  // Use availableYears if provided, otherwise use a default range
  const years = useMemo(() => {
    if (availableYears && availableYears.length > 0) {
      return [...new Set(availableYears)].sort((a, b) => parseInt(a) - parseInt(b));
    }
    return Array.from({ length: currentYear - 1999 }, (_, i) => (2000 + i).toString());
  }, [availableYears, currentYear]);
  
  // Months are fixed (1-12)
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1).toString()), []);
  
  // State variables with better defaults
  const [mode, setMode] = useState(MODE_SINGLE);
  const [yearRange, setYearRange] = useState({ 
    startValue: '', 
    endValue: '' 
  });
  const [monthRange, setMonthRange] = useState({ 
    startValue: '1', 
    endValue: '12' 
  });
  const [dayRange, setDayRange] = useState({ 
    startValue: '1', 
    endValue: '31' 
  });
  
  // Track when final values are set to help with synchronization
  const [valuesFinalized, setValuesFinalized] = useState(false);
  
  // Flag to indicate initial setup is complete
  const setupComplete = useRef(false);
  
  // Format functions
  const formatMonth = useCallback((monthNum) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(monthNum) - 1];
  }, []);
  
  // Get formatted value for display
  const formatValue = useCallback((value) => {
    if (value === ALL_TIME) return "All Time";
    return value;
  }, []);
  
  // Reset to match mode
  const resetToMode = useCallback((newMode) => {
    if (newMode === MODE_SINGLE) {
      // Get a default year (current or middle of range)
      const defaultYear = years[Math.floor(years.length / 2)] || years[0] || currentYear.toString();
      
      // In single mode, use same start/end year
      setYearRange({
        startValue: defaultYear,
        endValue: defaultYear
      });
      
      // Full year range
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
    } else {
      // For range mode, default to full range
      if (years.length >= 2) {
        setYearRange({
          startValue: years[0],
          endValue: years[years.length - 1]
        });
      } else if (years.length === 1) {
        // Only one year available
        setYearRange({
          startValue: years[0],
          endValue: years[0]
        });
      }
      
      // Default to full month/day ranges
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
    }
  }, [years, currentYear]);
  
  // Improved initialization from props
  useEffect(() => {
    if (setupComplete.current) return;
    
    if (initialStartDate && initialEndDate) {
      try {
        const startDate = new Date(initialStartDate);
        const endDate = new Date(initialEndDate);
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          // Extract components
          const startYear = startDate.getFullYear().toString();
          const startMonth = (startDate.getMonth() + 1).toString();
          const startDay = startDate.getDate().toString();
          
          const endYear = endDate.getFullYear().toString();
          const endMonth = (endDate.getMonth() + 1).toString();
          const endDay = endDate.getDate().toString();
          
          // Determine appropriate mode
          if (startYear === endYear) {
            // Check if full year
            const isFullYear = startMonth === '1' && startDay === '1' && 
                              endMonth === '12' && endDay === '31';
            
            if (isFullYear) {
              // Full year - single mode is appropriate
              setMode(MODE_SINGLE);
              setYearRange({
                startValue: startYear,
                endValue: startYear
              });
            } else {
              // Same year but not full year - use range mode
              setMode(MODE_RANGE);
              setYearRange({
                startValue: startYear,
                endValue: endYear 
              });
              setMonthRange({
                startValue: startMonth,
                endValue: endMonth
              });
              setDayRange({
                startValue: startDay,
                endValue: endDay
              });
            }
          } else {
            // Different years - use range mode
            setMode(MODE_RANGE);
            setYearRange({
              startValue: startYear,
              endValue: endYear
            });
            setMonthRange({
              startValue: startMonth,
              endValue: endMonth
            });
            setDayRange({
              startValue: startDay,
              endValue: endDay
            });
          }
          
          // Handle all time case
          if (isAllTimeRange(startDate, endDate)) {
            setMode(MODE_SINGLE);
            setYearRange({
              startValue: ALL_TIME,
              endValue: ALL_TIME
            });
          }
        } else {
          // Invalid dates, use defaults
          resetToMode(MODE_SINGLE);
        }
      } catch (error) {
        console.error("Error parsing initial dates:", error);
        resetToMode(MODE_SINGLE);
      }
    } else {
      // No initial dates, use defaults
      resetToMode(MODE_SINGLE);
    }
    
    setupComplete.current = true;
    setValuesFinalized(true);
  }, [initialStartDate, initialEndDate, resetToMode, years]);
  
  // Helper for detecting if a date range is "all time"
  const isAllTimeRange = useCallback((startDate, endDate) => {
    if (!years.length) return false;
    
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    
    return startDate.getFullYear().toString() === minYear && 
           startDate.getMonth() === 0 && 
           startDate.getDate() === 1 &&
           endDate.getFullYear().toString() === maxYear && 
           endDate.getMonth() === 11 && 
           endDate.getDate() === 31;
  }, [years]);
  
  // Update mode handler - simplified
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    
    // Reset values for the new mode
    if (newMode === MODE_SINGLE) {
      // If already have a selected year, keep it
      if (yearRange.startValue && yearRange.startValue !== ALL_TIME) {
        setYearRange({
          startValue: yearRange.startValue,
          endValue: yearRange.startValue  // Ensure both are the same
        });
      } else {
        // Otherwise pick a default
        const defaultYear = years[Math.floor(years.length / 2)] || years[0] || currentYear.toString();
        setYearRange({
          startValue: defaultYear,
          endValue: defaultYear
        });
      }
      
      // Always reset to full month/day ranges in single mode
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
    } else {
      // For range mode, maintain current selection if possible
      if (!yearRange.startValue || yearRange.startValue === ALL_TIME) {
        if (years.length >= 2) {
          setYearRange({
            startValue: years[0],
            endValue: years[years.length - 1] 
          });
        }
      }
    }
  }, [MODE_SINGLE, yearRange, years, currentYear, ALL_TIME]);
  
  // Apply date range to parent
  const applyDateRange = useCallback(() => {
    // Check for "all time" selection
    if (yearRange.startValue === ALL_TIME || yearRange.endValue === ALL_TIME) {
      // Use the full available range
      const minYear = years[0];
      const maxYear = years[years.length - 1];
      
      const startDate = `${minYear}-01-01`;
      const endDate = `${maxYear}-12-31`;
      
      if (onDateRangeChange) {
        onDateRangeChange(startDate, endDate);
      }
      return;
    }
    
    // Use the selected range
    let startYear = yearRange.startValue || years[0];
    let endYear = yearRange.endValue || years[years.length - 1];
    
    let startMonth = monthRange.startValue || '1';
    let endMonth = monthRange.endValue || '12';
    
    let startDay = dayRange.startValue || '1';
    let endDay = dayRange.endValue || '31';
    
    // In single mode, use full year
    if (mode === MODE_SINGLE) {
      startMonth = '1';
      startDay = '1';
      endMonth = '12';
      endDay = '31';
    }
    
    // Format as YYYY-MM-DD
    const formatDateString = (year, month, day) => {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    };
    
    const startDateStr = formatDateString(startYear, startMonth, startDay);
    const endDateStr = formatDateString(endYear, endMonth, endDay);
    
    if (onDateRangeChange) {
      onDateRangeChange(startDateStr, endDateStr);
    }
  }, [yearRange, monthRange, dayRange, mode, years, onDateRangeChange, ALL_TIME]);
  
  // Apply date range when values are finalized
  useEffect(() => {
    if (valuesFinalized) {
      applyDateRange();
      setValuesFinalized(false);
    }
  }, [valuesFinalized, applyDateRange]);
  
  // Map color theme to colors
  const colors = useMemo(() => {
    // Your existing color mapping logic
    switch (colorTheme) {
      case 'pink': 
        return {
          buttonBg: 'bg-pink-600',
          buttonHover: 'hover:bg-pink-700',
          textTitle: 'text-pink-700',
          tabActive: 'bg-pink-600 text-white',
          tabInactive: 'bg-pink-100 text-pink-700 hover:bg-pink-200'
        };
      case 'teal':
        return {
          buttonBg: 'bg-teal-600',
          buttonHover: 'hover:bg-teal-700',
          textTitle: 'text-teal-700',
          tabActive: 'bg-teal-600 text-white',
          tabInactive: 'bg-teal-100 text-teal-700 hover:bg-teal-200'
        };
      case 'orange':
      default:
        return {
          buttonBg: 'bg-orange-600',
          buttonHover: 'hover:bg-orange-700',
          textTitle: 'text-orange-700',
          tabActive: 'bg-orange-600 text-white',
          tabInactive: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
        };
    }
  }, [colorTheme]);
  
  // Format displayed date range
  const formattedDateRange = useMemo(() => {
    if (yearRange.startValue === ALL_TIME || yearRange.endValue === ALL_TIME) {
      if (years.length >= 2) {
        return `All Time (${years[0]}-01-01 to ${years[years.length - 1]}-12-31)`;
      } else if (years.length === 1) {
        return `Full Year ${years[0]}`;
      }
      return "All Time";
    } else if (mode === MODE_SINGLE) {
      return `Full Year ${yearRange.startValue} (${yearRange.startValue}-01-01 to ${yearRange.startValue}-12-31)`;
    } else {
      return `${yearRange.startValue}-${monthRange.startValue.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')} to ${yearRange.endValue}-${monthRange.endValue.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
    }
  }, [years, yearRange, monthRange, dayRange, mode, ALL_TIME, MODE_SINGLE]);
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-center">
        <h3 className={`font-bold ${colors.textTitle}`}>Date Range Selection</h3>
        
        {/* Mode toggle */}
        <div className="flex flex-wrap gap-2">
          <div className="flex">
            <button
              onClick={() => handleModeChange(MODE_RANGE)}
              className={`px-3 py-1 rounded-md ${mode === MODE_RANGE ? colors.tabActive : colors.tabInactive}`}
            >
              Custom Range
            </button>
            <button
              onClick={() => handleModeChange(MODE_SINGLE)}
              className={`px-3 py-1 ml-2 rounded-md ${mode === MODE_SINGLE ? colors.tabActive : colors.tabInactive}`}
            >
              Single Year
            </button>
          </div>
        </div>
      </div>
      
      {/* Year selector */}
      {/* Replace with your simplified RangeSlider */}
      <div className="border p-2 rounded bg-gray-50">
        <div className="font-medium text-gray-700 mb-2">Year Selection</div>
        {/* Placeholder for your RangeSlider */}
        <div className="h-10 bg-gray-100 rounded relative">
          {/* In real implementation, use your fixed RangeSlider here */}
        </div>
      </div>
      
      {/* Month and day selectors only in range mode */}
      {mode === MODE_RANGE && (
        <>
          <div className="border p-2 rounded bg-gray-50">
            <div className="font-medium text-gray-700 mb-2">Month Selection</div>
            {/* Placeholder for month RangeSlider */}
          </div>
          
          <div className="border p-2 rounded bg-gray-50">
            <div className="font-medium text-gray-700 mb-2">Day Selection</div>
            {/* Placeholder for day RangeSlider */}
          </div>
        </>
      )}
      
      {/* Apply button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={applyDateRange}
          className={`px-4 py-2 ${colors.buttonBg} text-white rounded ${colors.buttonHover}`}
        >
          Apply Date Range
        </button>
      </div>
      
      {/* Display current selection */}
      <div className="mt-3 text-sm text-gray-600">
        Selected range: {formattedDateRange}
      </div>
    </div>
  );
};

export default TripleRangeSelector;