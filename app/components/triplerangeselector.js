import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Helper function to get days in a month
function getDaysInMonth(year, month) {
  // JavaScript months are 0-based, but our input is 1-based
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}

const RangeSlider = ({ 
  values, 
  onValuesChange, 
  initialStartValue, 
  initialEndValue, 
  displayFormat,
  title,
  colorTheme = 'orange',
  disabled = false,
  allowSingleValueSelection = true, // Allows selection of a single value
  singleValueMode = false // Forces both handles to move together as a unit
}) => {
  // Make sure we have an array of values and they're sorted
  // Add 'all' as the first position if not already included
  const sortedValues = useMemo(() => {
    if (!Array.isArray(values)) return [];
    
    // Create a copy of the array and sort it numerically
    const sorted = [...values].sort((a, b) => parseInt(a) - parseInt(b));
    
    // Check if we want to add "all" at the beginning
    if (!values.includes('all') && allowSingleValueSelection) {
      return ['all', ...sorted];
    }
    
    return sorted;
  }, [values, allowSingleValueSelection]);
  
  // If no values, nothing to render
  if (sortedValues.length === 0) {
    return <div className={`text-${colorTheme}-700 italic`}>No data available</div>;
  }
  
  const minValue = sortedValues[0];
  const maxValue = sortedValues[sortedValues.length - 1];
  
  // State for the slider positions
  const [startPosition, setStartPosition] = useState(0);
  const [endPosition, setEndPosition] = useState(100);
  const [startValue, setStartValue] = useState(initialStartValue || minValue);
  const [endValue, setEndValue] = useState(initialEndValue || maxValue);
  const [activeDragHandle, setActiveDragHandle] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const sliderRef = useRef(null);
  
  // Map color theme to actual color values
  const colors = useMemo(() => {
    switch (colorTheme) {
      case 'pink':
        return {
          text: 'text-pink-700',
          textBold: 'text-pink-800',
          bgMed: 'bg-pink-600',
          bgLight: 'bg-pink-100',
          textLight: 'text-pink-600',
          borderActive: 'border-pink-600',
          borderInactive: 'border-pink-800',
          buttonBg: 'bg-pink-600',
          buttonHover: 'hover:bg-pink-700'
        };
      case 'teal':
        return {
          text: 'text-teal-700',
          textBold: 'text-teal-800',
          bgMed: 'bg-teal-600',
          bgLight: 'bg-teal-100',
          textLight: 'text-teal-600',
          borderActive: 'border-teal-600',
          borderInactive: 'border-teal-800',
          buttonBg: 'bg-teal-600',
          buttonHover: 'hover:bg-teal-700'
        };
      case 'blue':
        return {
          text: 'text-blue-700',
          textBold: 'text-blue-800',
          bgMed: 'bg-blue-600',
          bgLight: 'bg-blue-100',
          textLight: 'text-blue-600',
          borderActive: 'border-blue-600',
          borderInactive: 'border-blue-800',
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700'
        };
      case 'orange':
      default:
        return {
          text: 'text-orange-700',
          textBold: 'text-orange-800',
          bgMed: 'bg-orange-600',
          bgLight: 'bg-orange-100',
          textLight: 'text-orange-600',
          borderActive: 'border-orange-600',
          borderInactive: 'border-orange-800',
          buttonBg: 'bg-orange-600',
          buttonHover: 'hover:bg-orange-700'
        };
    }
  }, [colorTheme]);

  // Function to convert a value to its corresponding position percentage
  const valueToPosition = useCallback((value) => {
    if (!sortedValues.includes(value.toString())) {
      // Find the closest value if the exact one doesn't exist
      const numericValue = parseInt(value);
      const closestValue = sortedValues.reduce((prev, curr) => {
        return Math.abs(parseInt(curr) - numericValue) < Math.abs(parseInt(prev) - numericValue) ? curr : prev;
      });
      const index = sortedValues.indexOf(closestValue);
      return (index / (sortedValues.length - 1)) * 100;
    }
    
    const index = sortedValues.indexOf(value.toString());
    return (index / (sortedValues.length - 1)) * 100;
  }, [sortedValues]);

  // Update positions whenever the mode or initialValues change
  useEffect(() => {
    if (sortedValues.length === 0) return;
    
    let startVal = initialStartValue || minValue;
    let endVal = initialEndValue || maxValue;
    
    // Make sure values exist in our sorted list
    if (!sortedValues.includes(startVal.toString())) {
      startVal = minValue;
    }
    
    if (!sortedValues.includes(endVal.toString())) {
      endVal = maxValue;
    }
    
    // In single value mode, set both to the start value
    if (singleValueMode) {
      endVal = startVal;
    }
    
    // Convert values to positions
    const startPos = valueToPosition(startVal);
    const endPos = singleValueMode ? startPos : valueToPosition(endVal);
    
    // Apply all state updates together
    setStartValue(startVal);
    setEndValue(endVal);
    setStartPosition(startPos);
    setEndPosition(endPos);
  }, [initialStartValue, initialEndValue, minValue, maxValue, singleValueMode, sortedValues, valueToPosition]);
  
  // Handler for when the position changes, updates the value
  const updateValueFromPosition = useCallback((position, isStart) => {
    const valueIndex = Math.round((position / 100) * (sortedValues.length - 1));
    const newValue = sortedValues[Math.min(Math.max(0, valueIndex), sortedValues.length - 1)];
    
    if (isStart) {
      setStartValue(newValue);
    } else {
      setEndValue(newValue);
    }
  }, [sortedValues]);
  
  // Debounced notification to parent - only when drag ends
  useEffect(() => {
    if (!isDragging && onValuesChange && startValue && endValue) {
      onValuesChange({
        startValue,
        endValue
      });
    }
  }, [isDragging, onValuesChange, startValue, endValue]);
  
  // Handle mouse events
  const handleMouseDown = useCallback((e, isStartHandle) => {
    if (disabled) return;
    
    e.preventDefault();
    setActiveDragHandle(isStartHandle ? 'start' : 'end');
    setIsDragging(true);
    
    const handleMouseMove = (e) => {
      const slider = sliderRef.current;
      if (!slider) return;
      
      const rect = slider.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const width = rect.width;
      
      // Calculate position as percentage (0-100)
      let percentage = (x / width) * 100;
      percentage = Math.max(0, Math.min(100, percentage));
      
      if (singleValueMode) {
        // In single value mode, both handles move together
        setStartPosition(percentage);
        setEndPosition(percentage);
        
        // Update both values to the same value
        const valueIndex = Math.round((percentage / 100) * (sortedValues.length - 1));
        const newValue = sortedValues[Math.min(Math.max(0, valueIndex), sortedValues.length - 1)];
        setStartValue(newValue);
        setEndValue(newValue);
      } else if (isStartHandle) {
        // Don't let start handle pass end handle
        // Allow equal positions if single value selection is enabled
        const minSeparation = allowSingleValueSelection ? 0 : 5;
        percentage = Math.min(percentage, endPosition - minSeparation);
        setStartPosition(percentage);
        updateValueFromPosition(percentage, true);
      } else {
        // Don't let end handle pass start handle
        // Allow equal positions if single value selection is enabled
        const minSeparation = allowSingleValueSelection ? 0 : 5;
        percentage = Math.max(percentage, startPosition + minSeparation);
        setEndPosition(percentage);
        updateValueFromPosition(percentage, false);
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setActiveDragHandle(null);
      setIsDragging(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Initial position update
    handleMouseMove(e);
  }, [disabled, endPosition, startPosition, updateValueFromPosition, allowSingleValueSelection, singleValueMode, sortedValues]);
  
  // Handle click on the track (moves the nearest handle)
  const handleTrackClick = useCallback((e) => {
    if (disabled || activeDragHandle !== null) return; // Ignore during active drag
    
    const slider = sliderRef.current;
    if (!slider) return;
    
    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const width = rect.width;
    
    // Calculate position as percentage (0-100)
    let percentage = (x / width) * 100;
    percentage = Math.max(0, Math.min(100, percentage));
    
    // Calculate the exact value at this position
    const valueIndex = Math.round((percentage / 100) * (sortedValues.length - 1));
    const exactValue = sortedValues[valueIndex];
    
    // Check if this click is directly on a marker
    const isExactMarker = Math.abs(percentage - ((valueIndex / (sortedValues.length - 1)) * 100)) < 2;
    
    // Set temporary dragging state to prevent immediate updates
    setIsDragging(true);
    
    if (singleValueMode) {
      // In single value mode, set both handles to the clicked position
      setStartPosition(percentage);
      setEndPosition(percentage);
      
      setStartValue(exactValue);
      setEndValue(exactValue);
    } else {
      // Determine which handle to move (the closest one)
      const startDistance = Math.abs(percentage - startPosition);
      const endDistance = Math.abs(percentage - endPosition);
      
      // If clicking directly on a marker, we want to either:
      // 1. If it's already the start or end value, make it a single-day selection
      // 2. Otherwise, move the closest handle to this marker
      if (isExactMarker) {
        if (exactValue === startValue) {
          // Already the start value, move end handle here for single value selection
          if (allowSingleValueSelection) {
            setEndPosition(percentage);
            setEndValue(exactValue);
          }
        } else if (exactValue === endValue) {
          // Already the end value, move start handle here for single value selection
          if (allowSingleValueSelection) {
            setStartPosition(percentage);
            setStartValue(exactValue);
          }
        } else {
          // Not already selected, move closest handle
          if (startDistance <= endDistance) {
            setStartPosition(percentage);
            setStartValue(exactValue);
          } else {
            setEndPosition(percentage);
            setEndValue(exactValue);
          }
        }
      } else {
        // Normal click, not directly on a marker
        if (startDistance <= endDistance) {
          setStartPosition(percentage);
          updateValueFromPosition(percentage, true);
        } else {
          setEndPosition(percentage);
          updateValueFromPosition(percentage, false);
        }
      }
    }
    
    // Clear dragging state after brief delay
    setTimeout(() => setIsDragging(false), 50);
  }, [activeDragHandle, disabled, endPosition, startPosition, updateValueFromPosition, 
      sortedValues, startValue, endValue, allowSingleValueSelection, singleValueMode]);
  
  // Format the display value if a formatter is provided
  const formatValue = useCallback((value) => {
    if (value === 'all') {
      return 'All-Time';
    }
    if (typeof displayFormat === 'function') {
      return displayFormat(value);
    }
    return value;
  }, [displayFormat]);
  
  return (
    <div className="my-3">
      <div className="flex justify-between mb-1 items-center">
        <span className={`${colors.text} text-sm`}>{title}</span>
        <div className={`font-medium ${colors.textBold} ${colors.bgLight} px-3 py-1 rounded`}>
          {singleValueMode || startValue === endValue 
            ? formatValue(startValue) 
            : `${formatValue(startValue)} - ${formatValue(endValue)}`}
        </div>
      </div>
      
      <div 
        ref={sliderRef}
        className={`relative h-10 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} select-none`} 
        onClick={handleTrackClick}
      >
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 transform -translate-y-1/2 rounded-full"></div>
        
        {/* Selected Range */}
        <div 
          className={`absolute top-1/2 h-1 ${colors.bgMed} transform -translate-y-1/2 rounded-full`}
          style={{ 
            left: `${startPosition}%`, 
            width: singleValueMode ? '0.5%' : `${Math.max(0.5, endPosition - startPosition)}%`
          }}
        ></div>
        
        {/* In single value mode, we still render both handles, but they overlap */}
        
        {/* Start Handle */}
        <div 
          className={`absolute top-1/2 h-7 w-7 bg-white border-2 ${
            activeDragHandle === 'start' ? colors.borderActive : colors.borderInactive
          } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md ${disabled ? 'cursor-not-allowed' : 'cursor-move'} z-20`}
          style={{ 
            left: `${startPosition}%`,
            opacity: singleValueMode ? (activeDragHandle === 'start' ? 1 : 0.5) : 1
          }}
          onMouseDown={e => handleMouseDown(e, true)}
        ></div>
        
        {/* End Handle */}
        <div 
          className={`absolute top-1/2 h-7 w-7 bg-white border-2 ${
            activeDragHandle === 'end' ? colors.borderActive : colors.borderInactive
          } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md ${disabled ? 'cursor-not-allowed' : 'cursor-move'} z-20`}
          style={{ 
            left: `${endPosition}%`,
            opacity: singleValueMode ? (activeDragHandle === 'end' ? 1 : 0.5) : 1
          }}
          onMouseDown={e => handleMouseDown(e, false)}
        ></div>
        
        {/* Value markers - show all values for months, but fewer for years and days */}
        {sortedValues.map((value, index) => {
          const position = (index / (sortedValues.length - 1)) * 100;
          const isInRange = position >= startPosition && position <= endPosition;
          
          // Emphasize exact match markers
          const isStartMarker = value === startValue;
          const isEndMarker = value === endValue;
          const isExactMarker = isStartMarker || isEndMarker;
          const isAllTimeMarker = value === 'all';
          
          // Skip showing every marker for years to avoid crowding (but always show 'all')
          const shouldShowLabel = isAllTimeMarker || 
                               isExactMarker || 
                               index % Math.max(1, Math.floor(sortedValues.length / 10)) === 0;
          
          return (
            <div 
              key={value}
              className={`absolute top-1/2 ${isExactMarker || isAllTimeMarker ? 'w-1.5 h-4' : 'w-1 h-3'} transform -translate-x-1/2 -translate-y-1/2 z-10 ${
                isAllTimeMarker ? `${colors.bgMed}` : 
                isInRange ? colors.bgMed : 'bg-gray-400'
              }`}
              style={{ left: `${position}%` }}
            >
              {shouldShowLabel && (
                <div className={`absolute w-16 text-xs text-center -translate-x-1/2 mt-4 ${
                  isAllTimeMarker ? `${colors.textBold} font-bold` :
                  isExactMarker ? `${colors.textBold} font-bold` : 
                  `${colors.text} font-medium`
                }`}>
                  {formatValue(value)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TripleRangeSelector = ({ 
  onDateRangeChange, 
  initialStartDate,
  initialEndDate,
  colorTheme = 'orange',
  availableYears = [],
  availableData = null // Prop to receive data about available months and days
}) => {
  // First, determine the range of years to use
  const currentYear = new Date().getFullYear();
  
  // Use availableYears if provided, otherwise use a default range
  const years = useMemo(() => {
    if (availableYears && availableYears.length > 0) {
      return [...new Set(availableYears)].sort((a, b) => parseInt(a) - parseInt(b));
    }
    return Array.from({ length: currentYear - 1999 }, (_, i) => (2000 + i).toString());
  }, [availableYears, currentYear]);
  
  // Generate months 1-12
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => (i + 1).toString()), []);
  
  // State variables
  const [useAllTime, setUseAllTime] = useState(false);
  const [singleYearMode, setSingleYearMode] = useState(false);
  const [yearRange, setYearRange] = useState({ 
    startValue: initialStartDate ? new Date(initialStartDate).getFullYear().toString() : years[0], 
    endValue: initialEndDate ? new Date(initialEndDate).getFullYear().toString() : years[years.length - 1] 
  });
  const [monthRange, setMonthRange] = useState({ 
    startValue: initialStartDate ? (new Date(initialStartDate).getMonth() + 1).toString() : '1', 
    endValue: initialEndDate ? (new Date(initialEndDate).getMonth() + 1).toString() : '12' 
  });
  const [dayRange, setDayRange] = useState({ 
    startValue: initialStartDate ? new Date(initialStartDate).getDate().toString() : '1', 
    endValue: initialEndDate ? new Date(initialEndDate).getDate().toString() : '31' 
  });
  
  // Key to force re-render of sliders when mode changes
  const [sliderKey, setSliderKey] = useState(0);
  
  // Check if we have a single year selected
  const isSingleYearSelected = yearRange.startValue === yearRange.endValue;
  
  // Format functions for display
  const formatMonth = useCallback((monthNum) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(monthNum) - 1];
  }, []);
  
  // Parse initial dates if provided
  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      const startDate = new Date(initialStartDate);
      const endDate = new Date(initialEndDate);
      
      if (!isNaN(startDate) && !isNaN(endDate)) {
        // Check if the range is "all time"
        const isAllTime = 
          startDate.getFullYear() === parseInt(years[0]) && 
          startDate.getMonth() === 0 && 
          startDate.getDate() === 1 &&
          endDate.getFullYear() === parseInt(years[years.length - 1]) &&
          endDate.getMonth() === 11 &&
          endDate.getDate() === 31;
        
        if (isAllTime) {
          setUseAllTime(true);
        } else {
          setYearRange({
            startValue: startDate.getFullYear().toString(),
            endValue: endDate.getFullYear().toString()
          });
          
          setMonthRange({
            startValue: (startDate.getMonth() + 1).toString(),
            endValue: (endDate.getMonth() + 1).toString()
          });
          
          setDayRange({
            startValue: startDate.getDate().toString(),
            endValue: endDate.getDate().toString()
          });
        }
      }
    }
  }, [initialStartDate, initialEndDate, years]);
  
  // Use available months and days if provided
  const getAvailableMonths = useCallback((year) => {
    if (availableData && availableData[year] && availableData[year].availableMonths) {
      return availableData[year].availableMonths.map(m => m.toString());
    }
    // Default to all months
    return months;
  }, [availableData, months]);
  
  const getAvailableDays = useCallback((year, month) => {
    if (availableData && availableData[year] && 
        availableData[year].monthDays && availableData[year].monthDays[month]) {
      return availableData[year].monthDays[month].map(d => d.toString());
    }
    
    // Default to all days in the month
    const daysInMonth = getDaysInMonth(year, month);
    return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
  }, [availableData]);
  
  // Check if month slider should be enabled
  const enableMonthSlider = !useAllTime && !singleYearMode; // Hide in single year mode
  
  // Check if day slider should be enabled
  const enableDaySlider = enableMonthSlider; // Show days whenever months are shown
  
  // Filtered months and days based on year selection
  const filteredMonths = useMemo(() => {
    if (isSingleYearSelected || singleYearMode) {
      return getAvailableMonths(yearRange.startValue);
    }
    return months;
  }, [isSingleYearSelected, singleYearMode, yearRange.startValue, getAvailableMonths, months]);
  
  // Filtered days based on year and month selection
  const filteredDays = useMemo(() => {
    // For single month - exact number of days in that month
    if (isSingleYearSelected && monthRange.startValue === monthRange.endValue) {
      const daysInMonth = getDaysInMonth(yearRange.startValue, monthRange.startValue);
      return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    }
    
    // For different months/years - always show 31 days (maximum possible in any month)
    // We'll adjust the valid range during validation
    return Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  }, [isSingleYearSelected, yearRange, monthRange]);
  
  // Modified useEffect to validate month/day ranges but not reset them when year changes
  useEffect(() => {
    // Skip validation in single year mode (handled by another effect)
    if (singleYearMode) return;
    
    // For single or multi-year, just make sure days are valid for selected months
    let newMonthRange = { ...monthRange };
    let newDayRange = { ...dayRange };
    let updated = false;
    
    // Make sure selected months are in valid range (1-12)
    if (parseInt(newMonthRange.startValue) < 1 || parseInt(newMonthRange.startValue) > 12) {
      newMonthRange.startValue = '1';
      updated = true;
    }
    
    if (parseInt(newMonthRange.endValue) < 1 || parseInt(newMonthRange.endValue) > 12) {
      newMonthRange.endValue = '12';
      updated = true;
    }
    
    // Adjust days to be valid for the selected months
    const maxStartDay = getDaysInMonth(yearRange.startValue, newMonthRange.startValue);
    const maxEndDay = getDaysInMonth(yearRange.endValue, newMonthRange.endValue);
    
    if (parseInt(newDayRange.startValue) > maxStartDay) {
      newDayRange.startValue = maxStartDay.toString();
      updated = true;
    }
    
    if (parseInt(newDayRange.endValue) > maxEndDay) {
      newDayRange.endValue = maxEndDay.toString();
      updated = true;
    }
    
    if (updated) {
      setMonthRange(newMonthRange);
      setDayRange(newDayRange);
    }
  }, [yearRange, monthRange, dayRange, singleYearMode]);
  
  // Toggle single year mode function - key point for fixing the lag issue
  const toggleSingleYearMode = () => {
    // Toggle the state
    const newSingleYearMode = !singleYearMode;
    setSingleYearMode(newSingleYearMode);
    
    // Increment the slider key to force re-render
    setSliderKey(prevKey => prevKey + 1);
    
    if (newSingleYearMode) {
      // Switching TO single year mode
      // Use current start year for both start and end
      const currentYear = yearRange.startValue;
      
      // Important: Update both state variables in one batch
      setYearRange({
        startValue: currentYear,
        endValue: currentYear
      });
      
      // Reset month and day to full ranges
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
    } else {
      // Switching FROM single year mode back to range mode
      // Keep current single year as start, but extend to the next available year if possible
      const currentYearIndex = years.indexOf(yearRange.startValue);
      let endYearIndex = currentYearIndex;
      
      // Try to set end year to next year if available
      if (currentYearIndex < years.length - 1) {
        endYearIndex = currentYearIndex + 1;
      }
      
      setYearRange({
        startValue: yearRange.startValue,
        endValue: years[endYearIndex]
      });
    }
  };
  
  // Toggle "All Time" mode
  const toggleAllTime = useCallback(() => {
    const newAllTimeState = !useAllTime;
    setUseAllTime(newAllTimeState);
    
    // Force re-render of sliders
    setSliderKey(prevKey => prevKey + 1);
    
    if (newAllTimeState) {
      // When enabling "All Time", use the full range
      applyDateRange();
    }
  }, [useAllTime]);
  
  // Send the date range to the parent component
  const applyDateRange = useCallback(() => {
    if (useAllTime) {
      // Use the full available range of years
      const minYear = years[0];
      const maxYear = years[years.length - 1];
      
      // Format as YYYY-MM-DD for consistency
      const startDate = `${minYear}-01-01`;
      const endDate = `${maxYear}-12-31`;
      
      if (onDateRangeChange) {
        onDateRangeChange(startDate, endDate);
      }
    } else {
      // Use the selected range
      const startDate = new Date(
        parseInt(yearRange.startValue),
        parseInt(monthRange.startValue) - 1,
        parseInt(dayRange.startValue)
      );
      
      const endDate = new Date(
        parseInt(yearRange.endValue),
        parseInt(monthRange.endValue) - 1,
        parseInt(dayRange.endValue)
      );
      
      // Format as YYYY-MM-DD for consistency
      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };
      
      if (onDateRangeChange) {
        onDateRangeChange(formatDate(startDate), formatDate(endDate));
      }
    }
  }, [years, yearRange, monthRange, dayRange, useAllTime, onDateRangeChange]);
  
  // Map color theme to actual color values
  const colors = useMemo(() => {
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
      case 'blue':
        return {
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700',
          textTitle: 'text-blue-700',
          tabActive: 'bg-blue-600 text-white',
          tabInactive: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
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
  
  // Formatted date range display (for user reference)
  const formattedDateRange = useMemo(() => {
    if (useAllTime) {
      return `All Time (${years[0]}-01-01 to ${years[years.length - 1]}-12-31)`;
    } else {
      return `${yearRange.startValue}-${monthRange.startValue.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')} to ${yearRange.endValue}-${monthRange.endValue.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
    }
  }, [years, yearRange, monthRange, dayRange, useAllTime]);
  
  // The "All Time" option only appears if we have any years data
  const showAllTimeOption = years.length > 0;
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-center">
        <h3 className={`font-bold ${colors.textTitle}`}>Date Range Selection</h3>
        
        <div className="flex flex-wrap gap-2">
          {/* Mode Switcher */}
          {showAllTimeOption && (
            <div className="flex">
              <button
                onClick={toggleAllTime}
                className={`px-3 py-1 rounded-md ${useAllTime ? colors.tabActive : colors.tabInactive}`}
              >
                All Time
              </button>
              <button
                onClick={() => {
                  if (useAllTime) {
                    setUseAllTime(false);
                    setSliderKey(prevKey => prevKey + 1); // Force re-render
                  }
                }}
                className={`px-3 py-1 ml-2 rounded-md ${!useAllTime ? colors.tabActive : colors.tabInactive}`}
              >
                Custom Range
              </button>
            </div>
          )}
          
          {/* Single Year Toggle Button */}
          {!useAllTime && (
            <button
              onClick={toggleSingleYearMode}
              className={`px-3 py-1 rounded-md ${singleYearMode ? colors.tabActive : colors.tabInactive}`}
            >
              Single Year
            </button>
          )}
        </div>
      </div>
      
      {/* Year Range Slider - Modified to handle both single and range modes */}
      <RangeSlider 
        key={`year-slider-${sliderKey}`} // Key changes force complete re-render
        values={years} 
        onValuesChange={(values) => {
          // Ensure we don't create loops
          // Special handling for 'all' value
          if (values.startValue === 'all' || values.endValue === 'all') {
            // Set to full range when 'all' is selected
            setYearRange({
              startValue: years[0],
              endValue: years[years.length - 1]
            });
            
            // Reset month and day to full range
            setMonthRange({ startValue: '1', endValue: '12' });
            setDayRange({ startValue: '1', endValue: '31' });
            
            // Notify parent of all-time selection
            if (onDateRangeChange) {
              onDateRangeChange(`${years[0]}-01-01`, `${years[years.length - 1]}-12-31`);
            }
            return;
          }
          
          if (singleYearMode) {
            // In single year mode, enforce both start and end to be the same
            const changedValue = values.startValue !== yearRange.startValue ? 
                              values.startValue : values.endValue;
            
            // For stability, only update if actually changed
            if (changedValue !== yearRange.startValue) {
              setYearRange({
                startValue: changedValue,
                endValue: changedValue
              });
              
              // Reset month and day ranges for the selected year
              setMonthRange({ startValue: '1', endValue: '12' });
              setDayRange({ startValue: '1', endValue: '31' });
            }
          } else {
            // Normal range mode - allow different start and end values
            // Only update if there's a real change
            if (values.startValue !== yearRange.startValue || 
                values.endValue !== yearRange.endValue) {
              setYearRange(values);
            }
          }
        }}
        initialStartValue={yearRange.startValue}
        initialEndValue={yearRange.endValue}
        title="Year Range"
        colorTheme={colorTheme}
        disabled={useAllTime}
        singleValueMode={singleYearMode} // Pass single year mode to the slider
        allowSingleValueSelection={true}
      />
      
      {/* Only show month selector if not in all-time mode */}
      {enableMonthSlider && (
        <RangeSlider 
          key={`month-slider-${sliderKey}`} // Key changes force complete re-render
          values={filteredMonths} 
          onValuesChange={setMonthRange}
          initialStartValue={monthRange.startValue}
          initialEndValue={monthRange.endValue}
          displayFormat={formatMonth}
          title="Month Range"
          colorTheme={colorTheme}
          disabled={useAllTime}
          allowSingleValueSelection={true}
        />
      )}
      
      {/* Only show day selector if not in all-time mode */}
      {enableDaySlider && (
        <RangeSlider 
          key={`day-slider-${sliderKey}`} // Key changes force complete re-render
          values={filteredDays} 
          onValuesChange={setDayRange}
          initialStartValue={dayRange.startValue}
          initialEndValue={dayRange.endValue}
          title="Day Range"
          colorTheme={colorTheme}
          disabled={useAllTime}
          allowSingleValueSelection={true}
        />
      )}
      
      <div className="flex justify-center mt-4">
        <button
          onClick={applyDateRange}
          className={`px-4 py-2 ${colors.buttonBg} text-white rounded ${colors.buttonHover}`}
        >
          Apply Date Range
        </button>
      </div>
      
      <div className="mt-3 text-sm text-gray-600">
        Selected range: {formattedDateRange}
      </div>
    </div>
  );
};

export default TripleRangeSelector;
        