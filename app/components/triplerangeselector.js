import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const RangeSlider = ({ 
  values, 
  onValuesChange, 
  initialStartValue, 
  initialEndValue, 
  displayFormat,
  title,
  colorTheme = 'orange',
  disabled = false,
  singleValue = null,
  onSingleValueChange = null,
  isSingleMode = false
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
  
  // State for single value slider position
  const [singlePosition, setSinglePosition] = useState(50);
  const [currentSingleValue, setCurrentSingleValue] = useState(singleValue || 
    (initialStartValue && initialEndValue ? initialStartValue : sortedValues[Math.floor(sortedValues.length / 2)]));
  
  // State for the range slider positions
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
  
  // Initialize the slider positions based on the initial values
  useEffect(() => {
    if (sortedValues.length > 0) {
      // For single mode
      if (isSingleMode && singleValue !== null) {
        const valueStr = singleValue.toString();
        if (sortedValues.includes(valueStr)) {
          const valueIndex = sortedValues.indexOf(valueStr);
          const percentage = (valueIndex / (sortedValues.length - 1)) * 100;
          setSinglePosition(percentage);
          setCurrentSingleValue(singleValue);
        } else {
          // Default to middle value if not found
          const midIndex = Math.floor(sortedValues.length / 2);
          setSinglePosition((midIndex / (sortedValues.length - 1)) * 100);
          setCurrentSingleValue(sortedValues[midIndex]);
        }
      } 
      // For range mode
      else {
        // Set start position
        if (initialStartValue && sortedValues.includes(initialStartValue.toString())) {
          const valueIndex = sortedValues.indexOf(initialStartValue.toString());
          const percentage = (valueIndex / (sortedValues.length - 1)) * 100;
          setStartPosition(percentage);
          setStartValue(initialStartValue);
        } else {
          setStartValue(minValue);
          setStartPosition(0);
        }
        
        // Set end position
        if (initialEndValue && sortedValues.includes(initialEndValue.toString())) {
          const valueIndex = sortedValues.indexOf(initialEndValue.toString());
          const percentage = (valueIndex / (sortedValues.length - 1)) * 100;
          setEndPosition(percentage);
          setEndValue(initialEndValue);
        } else {
          setEndValue(maxValue);
          setEndPosition(100);
        }
      }
    }
  }, [sortedValues, initialStartValue, initialEndValue, minValue, maxValue, isSingleMode, singleValue]);
  
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
  
  // Handler for updating single value slider
  const updateSingleValueFromPosition = useCallback((position) => {
    const valueIndex = Math.round((position / 100) * (sortedValues.length - 1));
    const newValue = sortedValues[Math.min(Math.max(0, valueIndex), sortedValues.length - 1)];
    setCurrentSingleValue(newValue);
    return newValue;
  }, [sortedValues]);
  
  // Debounced notification to parent - only when drag ends
  useEffect(() => {
    if (!isDragging) {
      if (isSingleMode && onSingleValueChange) {
        onSingleValueChange(currentSingleValue);
      } else if (!isSingleMode && onValuesChange && startValue && endValue) {
        onValuesChange({
          startValue,
          endValue
        });
      }
    }
  }, [isDragging, onValuesChange, startValue, endValue, isSingleMode, onSingleValueChange, currentSingleValue]);
  
  // Handle mouse events for single value slider
  const handleSingleMouseDown = useCallback((e) => {
    if (disabled) return;
    
    e.preventDefault();
    setActiveDragHandle('single');
    setIsDragging(true);
    
    const handleMouseMove = (e) => {
      const slider = sliderRef.current;
      if (!slider) return;
      
      const rect = slider.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      
      // Calculate position as percentage (0-100)
      let percentage = (x / width) * 100;
      percentage = Math.max(0, Math.min(100, percentage));
      setSinglePosition(percentage);
      updateSingleValueFromPosition(percentage);
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
  }, [disabled, updateSingleValueFromPosition]);
  
  // Handle mouse events for range slider
  const handleMouseDown = useCallback((e, isStartHandle) => {
    if (disabled) return;
    
    e.preventDefault();
    setActiveDragHandle(isStartHandle ? 'start' : 'end');
    setIsDragging(true);
    
    const handleMouseMove = (e) => {
      const slider = sliderRef.current;
      if (!slider) return;
      
      const rect = slider.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      
      // Calculate position as percentage (0-100)
      let percentage = (x / width) * 100;
      percentage = Math.max(0, Math.min(100, percentage));
      
      if (isStartHandle) {
        // Don't let start handle pass end handle
        percentage = Math.min(percentage, endPosition - 5);
        setStartPosition(percentage);
        updateValueFromPosition(percentage, true);
      } else {
        // Don't let end handle pass start handle
        percentage = Math.max(percentage, startPosition + 5);
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
  }, [disabled, endPosition, startPosition, updateValueFromPosition]);
  
  // Handle click on the track (moves the nearest handle)
  const handleTrackClick = useCallback((e) => {
    if (disabled || activeDragHandle !== null) return; // Ignore during active drag
    
    const slider = sliderRef.current;
    if (!slider) return;
    
    const rect = slider.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Calculate position as percentage (0-100)
    let percentage = (x / width) * 100;
    percentage = Math.max(0, Math.min(100, percentage));
    
    // Set temporary dragging state to prevent immediate updates
    setIsDragging(true);
    
    if (isSingleMode) {
      // Single mode - set position directly
      setSinglePosition(percentage);
      updateSingleValueFromPosition(percentage);
    } else {
      // Range mode - determine which handle to move (the closest one)
      const startDistance = Math.abs(percentage - startPosition);
      const endDistance = Math.abs(percentage - endPosition);
      
      if (startDistance <= endDistance) {
        setStartPosition(percentage);
        updateValueFromPosition(percentage, true);
      } else {
        setEndPosition(percentage);
        updateValueFromPosition(percentage, false);
      }
    }
    
    // Clear dragging state after brief delay
    setTimeout(() => setIsDragging(false), 50);
  }, [activeDragHandle, disabled, endPosition, startPosition, updateValueFromPosition, isSingleMode, updateSingleValueFromPosition]);
  
  // Format the display value if a formatter is provided
  const formatValue = useCallback((value) => {
    if (typeof displayFormat === 'function') {
      return displayFormat(value);
    }
    return value;
  }, [displayFormat]);
  
  return (
    <div className="my-3">
      <div className="flex justify-between mb-1 items-center">
        <span className={`${colors.text} text-sm`}>{title}</span>
        {isSingleMode ? (
          <div className={`font-medium ${colors.textBold} ${colors.bgLight} px-3 py-1 rounded`}>
            {formatValue(currentSingleValue)}
          </div>
        ) : (
          <div className={`font-medium ${colors.textBold} ${colors.bgLight} px-3 py-1 rounded`}>
            {formatValue(startValue)} - {formatValue(endValue)}
          </div>
        )}
      </div>
      
      <div 
        ref={sliderRef}
        className={`relative h-10 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} select-none`} 
        onClick={handleTrackClick}
      >
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-300 transform -translate-y-1/2 rounded-full"></div>
        
        {isSingleMode ? (
          /* Single value slider UI */
          <>
            <div 
              className={`absolute top-1/2 h-7 w-7 bg-white border-2 ${
                activeDragHandle === 'single' ? colors.borderActive : colors.borderInactive
              } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md ${disabled ? 'cursor-not-allowed' : 'cursor-move'} z-20`}
              style={{ left: `${singlePosition}%` }}
              onMouseDown={handleSingleMouseDown}
            ></div>
          </>
        ) : (
          /* Range slider UI */
          <>
            {/* Selected Range */}
            <div 
              className={`absolute top-1/2 h-1 ${colors.bgMed} transform -translate-y-1/2 rounded-full`}
              style={{ 
                left: `${startPosition}%`, 
                width: `${endPosition - startPosition}%` 
              }}
            ></div>
            
            {/* Start Handle */}
            <div 
              className={`absolute top-1/2 h-7 w-7 bg-white border-2 ${
                activeDragHandle === 'start' ? colors.borderActive : colors.borderInactive
              } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md ${disabled ? 'cursor-not-allowed' : 'cursor-move'} z-20`}
              style={{ left: `${startPosition}%` }}
              onMouseDown={e => handleMouseDown(e, true)}
            ></div>
            
            {/* End Handle */}
            <div 
              className={`absolute top-1/2 h-7 w-7 bg-white border-2 ${
                activeDragHandle === 'end' ? colors.borderActive : colors.borderInactive
              } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md ${disabled ? 'cursor-not-allowed' : 'cursor-move'} z-20`}
              style={{ left: `${endPosition}%` }}
              onMouseDown={e => handleMouseDown(e, false)}
            ></div>
          </>
        )}
        
        {/* Value markers - render fewer to improve performance */}
        {sortedValues.map((value, index) => {
          // Only render every nth marker based on the total count
          const markersToShow = Math.max(7, Math.min(20, sortedValues.length / 10));
          const skipFactor = Math.ceil(sortedValues.length / markersToShow);
          
          if (index % skipFactor !== 0 && index !== 0 && index !== sortedValues.length - 1) {
            return null;
          }
          
          const position = (index / (sortedValues.length - 1)) * 100;
          const isInRange = isSingleMode 
            ? position === singlePosition 
            : position >= startPosition && position <= endPosition;
          
          return (
            <div 
              key={value}
              className={`absolute top-1/2 w-1 h-3 transform -translate-x-1/2 -translate-y-1/2 z-10 ${
                isInRange ? colors.bgMed : 'bg-gray-400'
              }`}
              style={{ left: `${position}%` }}
            >
              <div className={`absolute w-10 text-xs text-center -translate-x-1/2 mt-4 ${colors.text} font-medium`}>
                {formatValue(value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EnhancedTripleRangeSelector = ({ 
  onDateRangeChange, 
  initialStartDate,
  initialEndDate,
  colorTheme = 'orange',
  availableYears = []
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
  
  // Generate days 1-31
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => (i + 1).toString()), []);
  
  // State for selection modes and visibility
  const [useAllTime, setUseAllTime] = useState(false);
  const [isSingleMode, setIsSingleMode] = useState(true); // Default to single mode
  const [showMonths, setShowMonths] = useState(false);
  const [showDays, setShowDays] = useState(false);
  
  // State for each range/value level
  const [yearValue, setYearValue] = useState('');
  const [yearRange, setYearRange] = useState({ 
    startValue: '', 
    endValue: '' 
  });
  
  const [monthValue, setMonthValue] = useState('');
  const [monthRange, setMonthRange] = useState({ 
    startValue: '', 
    endValue: '' 
  });
  
  const [dayValue, setDayValue] = useState('');
  const [dayRange, setDayRange] = useState({ 
    startValue: '', 
    endValue: '' 
  });
  
  // Format functions for display
  const formatMonth = useCallback((monthNum) => {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return monthNames[parseInt(monthNum) - 1];
  }, []);
  
  const formatDay = useCallback((day) => {
    const num = parseInt(day);
    if (num === 1 || num === 21 || num === 31) return day + 'st';
    if (num === 2 || num === 22) return day + 'nd';
    if (num === 3 || num === 23) return day + 'rd';
    return day + 'th';
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
          return;
        }
        
        // For initial range, check if it's a single year
        if (startDate.getFullYear() === endDate.getFullYear()) {
          setIsSingleMode(true);
          setYearValue(startDate.getFullYear().toString());
          setShowMonths(true);
          
          // Check if it's a single month
          if (startDate.getMonth() === endDate.getMonth()) {
            setMonthValue((startDate.getMonth() + 1).toString());
            setShowDays(true);
            
            // Check if it's a single day
            if (startDate.getDate() === endDate.getDate()) {
              setDayValue(startDate.getDate().toString());
            } else {
              // Day range
              setIsSingleMode(false);
              setDayRange({
                startValue: startDate.getDate().toString(),
                endValue: endDate.getDate().toString()
              });
            }
          } else {
            // Month range
            setIsSingleMode(false);
            setMonthRange({
              startValue: (startDate.getMonth() + 1).toString(),
              endValue: (endDate.getMonth() + 1).toString()
            });
          }
        } else {
          // Year range
          setIsSingleMode(false);
          setYearRange({
            startValue: startDate.getFullYear().toString(),
            endValue: endDate.getFullYear().toString()
          });
        }
      }
    } else {
      // No initial dates, set defaults
      if (years.length > 0) {
        setYearValue(years[years.length - 1]); // Default to latest year
      }
      setMonthValue('1'); // Default to January
      setDayValue('1');   // Default to 1st
    }
  }, [initialStartDate, initialEndDate, years]);
  
  // Get the days in the selected month
  const getDaysInMonth = useCallback((year, month) => {
    // Month is 1-based in our UI but 0-based in Date
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  }, []);
  
  // Adjust days when month/year changes to avoid invalid dates
  useEffect(() => {
    if (useAllTime) return;
    
    if (isSingleMode) {
      // Single mode - just check if day is valid
      if (showMonths && showDays) {
        const maxDay = getDaysInMonth(yearValue, monthValue);
        if (parseInt(dayValue) > maxDay) {
          setDayValue(maxDay.toString());
        }
      }
    } else {
      // Range mode - check both start and end days
      if (showMonths && showDays) {
        const startMaxDay = getDaysInMonth(
          yearRange.startValue || yearValue, 
          monthRange.startValue || monthValue
        );
        
        const endMaxDay = getDaysInMonth(
          yearRange.endValue || yearValue, 
          monthRange.endValue || monthValue
        );
        
        let updated = false;
        let newDayRange = { ...dayRange };
        
        if (parseInt(dayRange.startValue) > startMaxDay) {
          newDayRange.startValue = startMaxDay.toString();
          updated = true;
        }
        
        if (parseInt(dayRange.endValue) > endMaxDay) {
          newDayRange.endValue = endMaxDay.toString();
          updated = true;
        }
        
        if (updated) {
          setDayRange(newDayRange);
        }
      }
    }
  }, [yearValue, monthValue, dayValue, yearRange, monthRange, dayRange, showMonths, showDays, getDaysInMonth, useAllTime, isSingleMode]);
  
  // Update date range based on current selections
  const updateDateRange = useCallback(() => {
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
    } else if (isSingleMode) {
      // Single mode selection
      let start, end;
      
      if (!showMonths) {
        // Year only
        start = `${yearValue}-01-01`;
        end = `${yearValue}-12-31`;
      } else if (!showDays) {
        // Year + Month
        const lastDay = getDaysInMonth(yearValue, monthValue);
        start = `${yearValue}-${monthValue.padStart(2, '0')}-01`;
        end = `${yearValue}-${monthValue.padStart(2, '0')}-${lastDay}`;
      } else {
        // Year + Month + Day (single date)
        start = `${yearValue}-${monthValue.padStart(2, '0')}-${dayValue.padStart(2, '0')}`;
        end = start; // Same date for start and end
      }
      
      if (onDateRangeChange) {
        onDateRangeChange(start, end);
      }
    } else {
      // Range mode selection
      let start, end;
      
      if (!showMonths) {
        // Year range only
        start = `${yearRange.startValue}-01-01`;
        end = `${yearRange.endValue}-12-31`;
      } else if (!showDays) {
        // Year + Month range
        const useYearRange = yearRange.startValue !== yearRange.endValue;
        const startYear = useYearRange ? yearRange.startValue : yearValue;
        const endYear = useYearRange ? yearRange.endValue : yearValue;
        
        const lastDay = getDaysInMonth(endYear, monthRange.endValue);
        start = `${startYear}-${monthRange.startValue.padStart(2, '0')}-01`;
        end = `${endYear}-${monthRange.endValue.padStart(2, '0')}-${lastDay}`;
      } else {
        // Full date range
        const useYearRange = yearRange.startValue !== yearRange.endValue;
        const useMonthRange = monthRange.startValue !== monthRange.endValue;
        
        const startYear = useYearRange ? yearRange.startValue : yearValue;
        const endYear = useYearRange ? yearRange.endValue : yearValue;
        
        const startMonth = useMonthRange ? monthRange.startValue : monthValue;
        const endMonth = useMonthRange ? monthRange.endValue : monthValue;
        
        start = `${startYear}-${startMonth.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')}`;
        end = `${endYear}-${endMonth.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
      }
      
      if (onDateRangeChange) {
        onDateRangeChange(start, end);
      }
    }
  }, [
    years, yearValue, monthValue, dayValue, yearRange, monthRange, dayRange, 
    showMonths, showDays, useAllTime, isSingleMode, onDateRangeChange, getDaysInMonth
  ]);
  
  // Auto-update when selection changes
  useEffect(() => {
    updateDateRange();
  }, [
    yearValue, monthValue, dayValue, yearRange, monthRange, dayRange,
    showMonths, showDays, useAllTime, isSingleMode, updateDateRange
  ]);
  
  // Toggle "All Time" mode
  const toggleAllTime = useCallback(() => {
    const newAllTimeState = !useAllTime;
    setUseAllTime(newAllTimeState);
    
    if (newAllTimeState) {
      // When enabling "All Time", use the full range
      updateDateRange();
    }
  }, [useAllTime, updateDateRange]);
  
  // Handle year selection changes
  const handleYearChange = (newYear) => {
    setYearValue(newYear);
    setShowMonths(true);
  };
  
  const handleYearRangeChange = (range) => {
    setYearRange(range);
    setShowMonths(true);
  };
  
  // Handle month selection changes
  const handleMonthChange = (newMonth) => {
    setMonthValue(newMonth);
    setShowDays(true);
  };
  
  const handleMonthRangeChange = (range) => {
    setMonthRange(range);
    setShowDays(true);
  };
  
  // Handle day selection changes
  const handleDayChange = (newDay) => {
    setDayValue(newDay);
  };
  
  const handleDayRangeChange = (range) => {
    setDayRange(range);
  };
  
  // Toggle between single and range mode
  const toggleMode = (newMode) => {
    if (newMode === isSingleMode) return;
    
    setIsSingleMode(newMode);
    
    // Initialize range values from single values when switching to range mode
    if (!newMode) {
      setYearRange({
        startValue: yearValue,
        endValue: yearValue
      });
      
      setMonthRange({
        startValue: monthValue,
        endValue: monthValue
      });
      
      setDayRange({
        startValue: dayValue,
        endValue: dayValue
      });
    }
  };
  
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
    } else if (isSingleMode) {
      if (!showMonths) {
        return `Full year ${yearValue}`;
      } else if (!showDays) {
        return `${formatMonth(monthValue)} ${yearValue}`;
      } else {
        return `${formatMonth(monthValue)} ${dayValue}, ${yearValue}`;
      }
    } else {
      if (!showMonths) {
        return `${yearRange.startValue} to ${yearRange.endValue}`;
      } else if (!showDays) {
        return `${formatMonth(monthRange.startValue)} ${yearRange.startValue || yearValue} to ${formatMonth(monthRange.endValue)} ${yearRange.endValue || yearValue}`;
      } else {
        return `${formatMonth(monthRange.startValue || monthValue)} ${dayRange.startValue}, ${yearRange.startValue || yearValue} to ${formatMonth(monthRange.endValue || monthValue)} ${dayRange.endValue}, ${yearRange.endValue || yearValue}`;
      }
    }
  }, [
    years, yearValue, monthValue, dayValue, yearRange, monthRange, dayRange,
    showMonths, showDays, useAllTime, isSingleMode, formatMonth
  ]);
  
  // The "All Time" option only appears if we have any years data
  const showAllTimeOption = years.length > 0;
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-center">
        <h3 className={`font-bold ${colors.textTitle}`}>Date Range Selection</h3>
        
        {/* Mode Switcher - All Time vs Custom */}
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
                }
              }}
              className={`px-3 py-1 ml-2 rounded-md ${!useAllTime ? colors.tabActive : colors.tabInactive}`}
            >
              Custom Range
            </button>
          </div>
        )}
      </div>
      
      {!useAllTime && (
        <div className="space-y-4">
          {/* Year Selector Section */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className={`font-medium ${colors.textTitle}`}>Year Selection</h4>
              
              {/* Single/Range Mode Toggle */}
              <div className="flex">
                <button
                  onClick={() => toggleMode(true)}
                  className={`px-2 py-1 text-sm rounded-md ${isSingleMode ? colors.tabActive : colors.tabInactive}`}
                >
                  Single Year
                </button>
                <button
                  onClick={() => toggleMode(false)}
                  className={`px-2 py-1 ml-2 text-sm rounded-md ${!isSingleMode ? colors.tabActive : colors.tabInactive}`}
                >
                  Year Range
                </button>
              </div>
            </div>
            
            {isSingleMode ? (
              <RangeSlider 
                values={years} 
                onSingleValueChange={handleYearChange}
                singleValue={yearValue}
                title=""
                colorTheme={colorTheme}
                disabled={useAllTime}
                isSingleMode={true}
              />
            ) : (
              <RangeSlider 
                values={years}
                onValuesChange={handleYearRangeChange}
                initialStartValue={yearRange.startValue || years[0]}
                initialEndValue={yearRange.endValue || years[years.length - 1]}
                title=""
                colorTheme={colorTheme}
                disabled={useAllTime}
                isSingleMode={false}
              />
            )}
          </div>
          
          {/* Month Selector Section - Only show if year is selected */}
          {showMonths && (
            <div className="border-b pb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className={`font-medium ${colors.textTitle}`}>Month Selection</h4>
                
                {/* Single/Range Mode Toggle */}
                <div className="flex">
                  <button
                    onClick={() => toggleMode(true)}
                    className={`px-2 py-1 text-sm rounded-md ${isSingleMode ? colors.tabActive : colors.tabInactive}`}
                  >
                    Single Month
                  </button>
                  <button
                    onClick={() => toggleMode(false)}
                    className={`px-2 py-1 ml-2 text-sm rounded-md ${!isSingleMode ? colors.tabActive : colors.tabInactive}`}
                  >
                    Month Range
                  </button>
                </div>
              </div>
              
              {isSingleMode ? (
                <RangeSlider 
                  values={months} 
                  onSingleValueChange={handleMonthChange}
                  singleValue={monthValue}
                  displayFormat={formatMonth}
                  title=""
                  colorTheme={colorTheme}
                  disabled={useAllTime}
                  isSingleMode={true}
                />
              ) : (
                <RangeSlider 
                  values={months}
                  onValuesChange={handleMonthRangeChange}
                  initialStartValue={monthRange.startValue || '1'}
                  initialEndValue={monthRange.endValue || '12'}
                  displayFormat={formatMonth}
                  title=""
                  colorTheme={colorTheme}
                  disabled={useAllTime}
                  isSingleMode={false}
                />
              )}
            </div>
          )}
          
          {/* Day Selector Section - Only show if month is selected */}
          {showMonths && showDays && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className={`font-medium ${colors.textTitle}`}>Day Selection</h4>
                
                {/* Single/Range Mode Toggle */}
                <div className="flex">
                  <button
                    onClick={() => toggleMode(true)}
                    className={`px-2 py-1 text-sm rounded-md ${isSingleMode ? colors.tabActive : colors.tabInactive}`}
                  >
                    Single Day
                  </button>
                  <button
                    onClick={() => toggleMode(false)}
                    className={`px-2 py-1 ml-2 text-sm rounded-md ${!isSingleMode ? colors.tabActive : colors.tabInactive}`}
                  >
                    Day Range
                  </button>
                </div>
              </div>
              
              {isSingleMode ? (
                <RangeSlider 
                  values={days} 
                  onSingleValueChange={handleDayChange}
                  singleValue={dayValue}
                  displayFormat={formatDay}
                  title=""
                  colorTheme={colorTheme}
                  disabled={useAllTime}
                  isSingleMode={true}
                />
              ) : (
                <RangeSlider 
                  values={days}
                  onValuesChange={handleDayRangeChange}
                  initialStartValue={dayRange.startValue || '1'}
                  initialEndValue={dayRange.endValue || '31'}
                  displayFormat={formatDay}
                  title=""
                  colorTheme={colorTheme}
                  disabled={useAllTime}
                  isSingleMode={false}
                />
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-3 text-sm text-gray-600">
        Selected range: {formattedDateRange}
      </div>
      
      {/* Apply button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={updateDateRange}
          className={`px-4 py-2 ${colors.buttonBg} text-white rounded ${colors.buttonHover}`}
        >
          Apply Date Range
        </button>
      </div>
    </div>
  );
};

export default TripleRangeSelector;