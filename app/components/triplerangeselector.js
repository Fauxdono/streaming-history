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
  singleValueMode = false, // Forces both handles to move together as a unit
  showAllTimeOption = false // New prop to show "All Time" option in single year mode
}) => {
  // Make sure we have an array of values and they're sorted
  const sortedValues = useMemo(() => 
    Array.isArray(values) ? [...values].sort((a, b) => parseInt(a) - parseInt(b)) : []
  , [values]);
  
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

  // Special handling for "all-time" value
  const isAllTimeStart = startValue === "all";
  const isAllTimeEnd = endValue === "all";
  
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

  // Handle the special "all" value case
  useEffect(() => {
    if (showAllTimeOption) {
      if (initialStartValue === "all") {
        setStartValue("all");
        setStartPosition(-10); // Position slightly to the left of the slider
      }
      
      if (initialEndValue === "all") {
        setEndValue("all");
        setEndPosition(-10);
      }
    }
  }, [showAllTimeOption, initialStartValue, initialEndValue]);

  // Normal initialization for regular values
  useEffect(() => {
    if (sortedValues.length === 0) return;
    
    let newStartPos = 0;
    let newEndPos = 100;
    let newStartVal = minValue;
    let newEndVal = maxValue;
    
    // Skip if all-time is selected
    if (initialStartValue === "all" || initialEndValue === "all") return;
    
    // Calculate start position and value
    if (initialStartValue && sortedValues.includes(initialStartValue.toString())) {
      const valueIndex = sortedValues.indexOf(initialStartValue.toString());
      newStartPos = (valueIndex / (sortedValues.length - 1)) * 100;
      newStartVal = initialStartValue;
    }
    
    // Calculate end position and value
    if (initialEndValue && sortedValues.includes(initialEndValue.toString())) {
      const valueIndex = sortedValues.indexOf(initialEndValue.toString());
      newEndPos = (valueIndex / (sortedValues.length - 1)) * 100;
      newEndVal = initialEndValue;
    }
    
    // In single value mode, ensure both handles have the same position and value
    if (singleValueMode) {
      newEndPos = newStartPos;
      newEndVal = newStartVal;
    }
    
    // Batch all state updates
    setStartPosition(newStartPos);
    setEndPosition(newEndPos);
    setStartValue(newStartVal);
    setEndValue(newEndVal);
  }, [sortedValues, initialStartValue, initialEndValue, minValue, maxValue, singleValueMode]);
  
  // Handler for when the position changes, updates the value
  const updateValueFromPosition = useCallback((position, isStart) => {
    // Special case for the "all time" position (slightly left of the slider)
    if (showAllTimeOption && position < -5) {
      if (isStart) {
        setStartValue("all");
      } else {
        setEndValue("all");
      }
      return;
    }
    
    // Normal value selection from slider
    const valueIndex = Math.round((position / 100) * (sortedValues.length - 1));
    const newValue = sortedValues[Math.min(Math.max(0, valueIndex), sortedValues.length - 1)];
    
    if (isStart) {
      setStartValue(newValue);
    } else {
      setEndValue(newValue);
    }
  }, [sortedValues, showAllTimeOption]);
  
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
      
      // Allow mouse to go slightly left of the slider for "all time" option
      const rawX = e.clientX - rect.left;
      const x = showAllTimeOption ? rawX : Math.max(0, Math.min(rect.width, rawX));
      const width = rect.width;
      
      // Calculate position as percentage (0-100)
      let percentage = (x / width) * 100;
      
      // Handle all-time option (left of the slider)
      if (showAllTimeOption && percentage < -10) {
        percentage = -10;
        
        // Set to "all" time
        if (isStartHandle) {
          setStartPosition(percentage);
          setStartValue("all");
          
          // In single value mode, move both handles
          if (singleValueMode) {
            setEndPosition(percentage);
            setEndValue("all");
          }
        } else {
          setEndPosition(percentage);
          setEndValue("all");
        }
        return;
      }
      
      // Clamp to normal slider range for regular values
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
  }, [disabled, endPosition, startPosition, updateValueFromPosition, allowSingleValueSelection, singleValueMode, sortedValues, showAllTimeOption]);
  
  // Handle click on the track (moves the nearest handle)
  const handleTrackClick = useCallback((e) => {
    if (disabled || activeDragHandle !== null) return; // Ignore during active drag
    
    const slider = sliderRef.current;
    if (!slider) return;
    
    const rect = slider.getBoundingClientRect();
    
    // Allow mouse to go slightly left of the slider for "all time" option
    const rawX = e.clientX - rect.left;
    const x = showAllTimeOption ? rawX : Math.max(0, Math.min(rect.width, rawX));
    const width = rect.width;
    
    // Calculate position as percentage (0-100)
    let percentage = (x / width) * 100;
    
    // Handle all-time option (left of the slider)
    if (showAllTimeOption && percentage < -10) {
      percentage = -10;
      
      // Set temporary dragging state to prevent immediate updates
      setIsDragging(true);
      
      // In single value mode, set both handles
      if (singleValueMode) {
        setStartPosition(percentage);
        setEndPosition(percentage);
        setStartValue("all");
        setEndValue("all");
      } else {
        // Determine which handle to move (the closest one)
        const startDistance = Math.abs(percentage - startPosition);
        const endDistance = Math.abs(percentage - endPosition);
        
        if (startDistance <= endDistance) {
          setStartPosition(percentage);
          setStartValue("all");
        } else {
          setEndPosition(percentage);
          setEndValue("all");
        }
      }
      
      // Clear dragging state after brief delay
      setTimeout(() => setIsDragging(false), 50);
      return;
    }
    
    // Clamp to normal slider range for regular values
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
      sortedValues, startValue, endValue, allowSingleValueSelection, singleValueMode, showAllTimeOption]);
  
  // Format the display value if a formatter is provided
  const formatValue = useCallback((value) => {
    if (value === "all") return "All Time";
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
          {isAllTimeStart && isAllTimeEnd ? "All Time" : 
           singleValueMode || startValue === endValue 
            ? formatValue(startValue) 
            : `${formatValue(startValue)} - ${formatValue(endValue)}`}
        </div>
      </div>
      
      <div 
        ref={sliderRef}
        className={`relative h-10 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} select-none`} 
        onClick={handleTrackClick}
      >
        {/* All Time Option */}
        {showAllTimeOption && (
          <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center">
            <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 px-2 py-1 rounded ${colors.bgLight} text-xs ${colors.text} cursor-pointer`}>
              All
            </div>
          </div>
        )}
        
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 transform -translate-y-1/2 rounded-full"></div>
        
        {/* Selected Range */}
        <div 
          className={`absolute top-1/2 h-1 ${colors.bgMed} transform -translate-y-1/2 rounded-full`}
          style={{ 
            left: `${Math.max(0, startPosition)}%`, 
            width: singleValueMode ? '0.5%' : `${Math.max(0.5, Math.max(0, endPosition) - Math.max(0, startPosition))}%`
          }}
        ></div>
        
        {/* Start Handle - Don't show if it's at the "all time" position and not active */}
        {(!isAllTimeStart || activeDragHandle === 'start') && (
          <div 
            className={`absolute top-1/2 h-7 w-7 bg-white border-2 ${
              activeDragHandle === 'start' ? colors.borderActive : colors.borderInactive
            } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md ${disabled ? 'cursor-not-allowed' : 'cursor-move'} z-20`}
            style={{ 
              left: `${Math.max(0, startPosition)}%`,
              opacity: singleValueMode ? (activeDragHandle === 'start' ? 1 : 0.5) : 1
            }}
            onMouseDown={e => handleMouseDown(e, true)}
          ></div>
        )}
        
        {/* End Handle - Don't show if it's at the "all time" position and not active */}
        {(!isAllTimeEnd || activeDragHandle === 'end') && (
          <div 
            className={`absolute top-1/2 h-7 w-7 bg-white border-2 ${
              activeDragHandle === 'end' ? colors.borderActive : colors.borderInactive
            } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md ${disabled ? 'cursor-not-allowed' : 'cursor-move'} z-20`}
            style={{ 
              left: `${Math.max(0, endPosition)}%`,
              opacity: singleValueMode ? (activeDragHandle === 'end' ? 1 : 0.5) : 1
            }}
            onMouseDown={e => handleMouseDown(e, false)}
          ></div>
        )}
        
        {/* Value markers - show all values for months, but fewer for years and days */}
        {sortedValues.map((value, index) => {
          const position = (index / (sortedValues.length - 1)) * 100;
          const isInRange = position >= Math.max(0, startPosition) && position <= Math.max(0, endPosition);
          
          // Emphasize exact match markers
          const isStartMarker = value === startValue;
          const isEndMarker = value === endValue;
          const isExactMarker = isStartMarker || isEndMarker;
          
          return (
            <div 
              key={value}
              className={`absolute top-1/2 ${isExactMarker ? 'w-1.5 h-4' : 'w-1 h-3'} transform -translate-x-1/2 -translate-y-1/2 z-10 ${
                isInRange ? colors.bgMed : 'bg-gray-400'
              }`}
              style={{ left: `${position}%` }}
            >
              <div className={`absolute w-10 text-xs text-center -translate-x-1/2 mt-4 ${isExactMarker ? `${colors.textBold} font-bold` : `${colors.text} font-medium`}`}>
                {formatValue(value)}
              </div>
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
  
  // State variables - start in single year mode by default
  const [singleYearMode, setSingleYearMode] = useState(true);
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
  
  // Track when Apply button is clicked to help with state synchronization
  const [applyClicked, setApplyClicked] = useState(false);
  
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
          // In our new design, "all time" is a special position in single year mode
          setSingleYearMode(true);
          setYearRange({
            startValue: "all",
            endValue: "all"
          });
        } else {
          // Check if this is a single year selection (full year)
          const isSingleFullYear = 
            startDate.getFullYear() === endDate.getFullYear() &&
            startDate.getMonth() === 0 && startDate.getDate() === 1 &&
            endDate.getMonth() === 11 && endDate.getDate() === 31;
          
          if (isSingleFullYear) {
            // Single full year - use single year mode
            setSingleYearMode(true);
            setYearRange({
              startValue: startDate.getFullYear().toString(),
              endValue: startDate.getFullYear().toString()
            });
          } else if (startDate.getFullYear() === endDate.getFullYear()) {
            // Same year but not full year - still use single year mode
            setSingleYearMode(true);
            setYearRange({
              startValue: startDate.getFullYear().toString(),
              endValue: startDate.getFullYear().toString()
            });
            setMonthRange({
              startValue: (startDate.getMonth() + 1).toString(),
              endValue: (endDate.getMonth() + 1).toString()
            });
            setDayRange({
              startValue: startDate.getDate().toString(),
              endValue: endDate.getDate().toString()
            });
          } else {
            // Different years - use custom range mode
            setSingleYearMode(false);
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
  const enableMonthSlider = !singleYearMode; // Hide in single year mode
  
  // Check if day slider should be enabled
  const enableDaySlider = enableMonthSlider; // Show days whenever months are shown
  
  // Filtered months and days based on year selection
  const filteredMonths = useMemo(() => {
    if (isSingleYearSelected) {
      return getAvailableMonths(yearRange.startValue);
    }
    return months;
  }, [isSingleYearSelected, yearRange.startValue, getAvailableMonths, months]);
  
  // Filtered days based on year and month selection
  const filteredDays = useMemo(() => {
    // For single month - exact number of days in that month
    if (isSingleYearSelected && monthRange.startValue === monthRange.endValue) {
      const daysInMonth = getDaysInMonth(yearRange.startValue, monthRange.startValue);
      return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    }
    
    // For different months/years - show 31 days (maximum possible in any month)
    return Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  }, [isSingleYearSelected, yearRange, monthRange]);
  
  // Validate days and months based on selected years (but don't reset them automatically)
  useEffect(() => {
    // Skip validation for all-time mode
    if (yearRange.startValue === "all" || yearRange.endValue === "all") return;
    
    // Skip validation in single year mode 
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
  
  // Effect for single year mode state changes
  useEffect(() => {
    // If we transition to singleYearMode, make sure start and end years are the same
    if (singleYearMode && yearRange.startValue !== yearRange.endValue && 
        yearRange.startValue !== "all" && yearRange.endValue !== "all") {
      setYearRange({
        startValue: yearRange.startValue,
        endValue: yearRange.startValue
      });
      
      // Reset month and day to full range for the selected year
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
    }
  }, [singleYearMode]);
  
  // Effect to update months and days when the year changes in single year mode
  useEffect(() => {
    if (singleYearMode && applyClicked) {
      // When in single year mode and Apply button is clicked,
      // reset months and days to full range for a cleaner UI
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
      
      // Reset the apply click flag
      setApplyClicked(false);
    }
  }, [singleYearMode, applyClicked]);
  
  // Send the date range to the parent component
  const applyDateRange = useCallback(() => {
    // Set the apply clicked flag to synchronize state updates
    setApplyClicked(true);
    
    // Check for "all time" selection in single year mode
    if (yearRange.startValue === "all" || yearRange.endValue === "all") {
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
      let startYear = parseInt(yearRange.startValue);
      let startMonth = parseInt(monthRange.startValue);
      let startDay = parseInt(dayRange.startValue);
      
      let endYear = parseInt(yearRange.endValue);
      let endMonth = parseInt(monthRange.endValue);
      let endDay = parseInt(dayRange.endValue);
      
      // In single year mode, use full year range
      if (singleYearMode) {
        startMonth = 1;
        startDay = 1;
        endMonth = 12;
        endDay = 31;
      }
      
      // Create date objects
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      
      // Format as YYYY-MM-DD for consistency
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      if (onDateRangeChange) {
        onDateRangeChange(formatDate(startDate), formatDate(endDate));
      }
    }
  }, [years, yearRange, monthRange, dayRange, singleYearMode, onDateRangeChange]);
  
  // Toggle single year mode
  const toggleSingleYearMode = useCallback(() => {
    const newMode = !singleYearMode;
    setSingleYearMode(newMode);
    
    if (newMode) {
      // Switching TO single year mode
      // Use current start year for both start and end
      if (yearRange.startValue !== "all" && yearRange.endValue !== "all") {
        const currentYear = yearRange.startValue;
        
        // Set both start and end to the same year
        setYearRange({
          startValue: currentYear,
          endValue: currentYear
        });
      }
      
      // Reset month and day to full range for the selected year
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
    }
  }, [singleYearMode, yearRange]);
  
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
    if (yearRange.startValue === "all" || yearRange.endValue === "all") {
      return `All Time (${years[0]}-01-01 to ${years[years.length - 1]}-12-31)`;
    } else if (singleYearMode) {
      return `Full Year ${yearRange.startValue} (${yearRange.startValue}-01-01 to ${yearRange.startValue}-12-31)`;
    } else {
      return `${yearRange.startValue}-${monthRange.startValue.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')} to ${yearRange.endValue}-${monthRange.endValue.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
    }
  }, [years, yearRange, monthRange, dayRange, singleYearMode]);
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-center">
        <h3 className={`font-bold ${colors.textTitle}`}>Date Range Selection</h3>
        
        <div className="flex flex-wrap gap-2">
          {/* Only show the Custom Range / Single Year toggle */}
          <div className="flex">
            <button
              onClick={() => {
                setSingleYearMode(false);
              }}
              className={`px-3 py-1 rounded-md ${!singleYearMode ? colors.tabActive : colors.tabInactive}`}
            >
              Custom Range
            </button>
            <button
              onClick={() => {
                setSingleYearMode(true);
              }}
              className={`px-3 py-1 ml-2 rounded-md ${singleYearMode ? colors.tabActive : colors.tabInactive}`}
            >
              Single Year
            </button>
          </div>
        </div>
      </div>
      
      {/* Year Range Slider - Modified to handle both single and range modes */}
      <RangeSlider 
        values={years} 
        onValuesChange={(values) => {
          if (singleYearMode) {
            // In single year mode, ensure both start and end are the same value
            const newYear = values.startValue !== yearRange.startValue ? 
                           values.startValue : values.endValue;
            
            // Handle the special case of "all"
            if (newYear === "all") {
              setYearRange({
                startValue: "all",
                endValue: "all"
              });
            } else {
              // Only update if there's an actual change to avoid unnecessary renders
              if (newYear !== yearRange.startValue || yearRange.endValue !== newYear) {
                setYearRange({
                  startValue: newYear,
                  endValue: newYear
                });
              }
            }
          } else {
            // Normal range mode
            setYearRange(values);
          }
        }}
        initialStartValue={yearRange.startValue}
        initialEndValue={yearRange.endValue}
        title="Year Range"
        colorTheme={colorTheme}
        singleValueMode={singleYearMode} // Pass single year mode to slider
        allowSingleValueSelection={true}
        showAllTimeOption={singleYearMode} // Only show all-time option in single year mode
      />
      
      {/* Only show month selector if not in single year mode */}
      {enableMonthSlider && (
        <RangeSlider 
          values={filteredMonths} 
          onValuesChange={setMonthRange}
          initialStartValue={monthRange.startValue}
          initialEndValue={monthRange.endValue}
          displayFormat={formatMonth}
          title="Month Range"
          colorTheme={colorTheme}
          disabled={singleYearMode}
          allowSingleValueSelection={true}
        />
      )}
      
      {/* Only show day selector if not in single year mode */}
      {enableDaySlider && (
        <RangeSlider 
          values={filteredDays} 
          onValuesChange={setDayRange}
          initialStartValue={dayRange.startValue}
          initialEndValue={dayRange.endValue}
          title="Day Range"
          colorTheme={colorTheme}
          disabled={singleYearMode}
          allowSingleValueSelection={true}
        />
      )}
      
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            applyDateRange();
          }}
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