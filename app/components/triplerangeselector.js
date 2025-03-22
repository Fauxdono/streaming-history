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
  allowSingleValueSelection = true // New prop to allow selection of a single value
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
  }, [sortedValues, initialStartValue, initialEndValue, minValue, maxValue]);
  
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
      const x = e.clientX - rect.left;
      const width = rect.width;
      
      // Calculate position as percentage (0-100)
      let percentage = (x / width) * 100;
      percentage = Math.max(0, Math.min(100, percentage));
      
      if (isStartHandle) {
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
  }, [disabled, endPosition, startPosition, updateValueFromPosition, allowSingleValueSelection]);
  
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
    
    // Calculate the exact value at this position
    const valueIndex = Math.round((percentage / 100) * (sortedValues.length - 1));
    const exactValue = sortedValues[valueIndex];
    
    // Check if this click is directly on a marker
    const isExactMarker = Math.abs(percentage - ((valueIndex / (sortedValues.length - 1)) * 100)) < 2;
    
    // Determine which handle to move (the closest one)
    const startDistance = Math.abs(percentage - startPosition);
    const endDistance = Math.abs(percentage - endPosition);
    
    // Set temporary dragging state to prevent immediate updates
    setIsDragging(true);
    
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
    
    // Clear dragging state after brief delay
    setTimeout(() => setIsDragging(false), 50);
  }, [activeDragHandle, disabled, endPosition, startPosition, updateValueFromPosition, 
      sortedValues, startValue, endValue, allowSingleValueSelection]);
  
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
        <div className={`font-medium ${colors.textBold} ${colors.bgLight} px-3 py-1 rounded`}>
          {startValue === endValue 
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
            width: `${Math.max(0.5, endPosition - startPosition)}%` 
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
        
        {/* Value markers - show all values for months, but fewer for years and days */}
        {sortedValues.map((value, index) => {
          const position = (index / (sortedValues.length - 1)) * 100;
          const isInRange = position >= startPosition && position <= endPosition;
          
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
  
  // State for each range
  const [useAllTime, setUseAllTime] = useState(false);
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
  
  // Filtered months and days based on year selection
  const filteredMonths = useMemo(() => {
    if (isSingleYearSelected) {
      return getAvailableMonths(yearRange.startValue);
    }
    return months;
  }, [isSingleYearSelected, yearRange, months, getAvailableMonths]);
  
  // Filtered days based on year and month selection
  const filteredDays = useMemo(() => {
    // Only show days for single months (when start and end month are the same)
    if (isSingleYearSelected && monthRange.startValue === monthRange.endValue) {
      const daysInMonth = getDaysInMonth(yearRange.startValue, monthRange.startValue);
      return Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
    }
    
    // For different months, we show max 31 days but ensure end day is valid for end month
    const maxStartDay = getDaysInMonth(yearRange.startValue, monthRange.startValue);
    const maxEndDay = getDaysInMonth(yearRange.endValue, monthRange.endValue);
    
    return Array.from({ length: Math.max(maxStartDay, maxEndDay) }, (_, i) => (i + 1).toString());
  }, [isSingleYearSelected, yearRange, monthRange]);
  
  // Adjust days when month/year changes to avoid invalid dates
  useEffect(() => {
    if (useAllTime) return;
    
    const maxStartDay = getDaysInMonth(yearRange.startValue, monthRange.startValue);
    const maxEndDay = getDaysInMonth(yearRange.endValue, monthRange.endValue);
    
    let newDayRange = { ...dayRange };
    let updated = false;
    
    if (parseInt(dayRange.startValue) > maxStartDay) {
      newDayRange.startValue = maxStartDay.toString();
      updated = true;
    }
    
    if (parseInt(dayRange.endValue) > maxEndDay) {
      newDayRange.endValue = maxEndDay.toString();
      updated = true;
    }
    
    if (updated) {
      setDayRange(newDayRange);
    }
  }, [yearRange, monthRange, dayRange, useAllTime]);
  
  // Add a useEffect to reset month and day ranges when year changes
  useEffect(() => {
    if (isSingleYearSelected) {
      // When switching to a single year, validate the month range
      const availableMonths = getAvailableMonths(yearRange.startValue);
      
      // Ensure current month range is valid
      if (availableMonths.length > 0) {
        let newMonthRange = { ...monthRange };
        let updated = false;
        
        // If start month isn't in available months, use the first available
        if (!availableMonths.includes(monthRange.startValue)) {
          newMonthRange.startValue = availableMonths[0];
          updated = true;
        }
        
        // If end month isn't in available months, use the last available
        if (!availableMonths.includes(monthRange.endValue)) {
          newMonthRange.endValue = availableMonths[availableMonths.length - 1];
          updated = true;
        }
        
        if (updated) {
          setMonthRange(newMonthRange);
        }
      }
    } else {
      // For multi-year range, default to full month/day range
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
    }
  }, [isSingleYearSelected, yearRange, getAvailableMonths]);
  
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
  
  // Toggle "All Time" mode
  const toggleAllTime = useCallback(() => {
    const newAllTimeState = !useAllTime;
    setUseAllTime(newAllTimeState);
    
    if (newAllTimeState) {
      // When enabling "All Time", use the full range
      applyDateRange();
    }
  }, [useAllTime, applyDateRange]);
  
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
  
  // Add quick selection buttons for common date ranges
  const quickSelect = useCallback((option) => {
    const currentDate = new Date();
    let startDate, endDate;
    
    switch(option) {
      case '1w':
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - 7);
        endDate = currentDate;
        break;
      case '1m':
        startDate = new Date(currentDate);
        startDate.setMonth(currentDate.getMonth() - 1);
        endDate = currentDate;
        break;
      case '3m':
        startDate = new Date(currentDate);
        startDate.setMonth(currentDate.getMonth() - 3);
        endDate = currentDate;
        break;
      case '6m':
        startDate = new Date(currentDate);
        startDate.setMonth(currentDate.getMonth() - 6);
        endDate = currentDate;
        break;
      case '1y':
        startDate = new Date(currentDate);
        startDate.setFullYear(currentDate.getFullYear() - 1);
        endDate = currentDate;
        break;
      case 'ytd':
        startDate = new Date(currentDate.getFullYear(), 0, 1); // January 1st of current year
        endDate = currentDate;
        break;
      case 'prevyear':
        const prevYear = currentDate.getFullYear() - 1;
        startDate = new Date(prevYear, 0, 1); // January 1st of previous year
        endDate = new Date(prevYear, 11, 31); // December 31st of previous year
        break;
      default:
        return;
    }
    
    // Update the state to reflect the new selection
    setUseAllTime(false);
    
    // Set the year range
    setYearRange({
      startValue: startDate.getFullYear().toString(),
      endValue: endDate.getFullYear().toString()
    });
    
    // Set the month range
    setMonthRange({
      startValue: (startDate.getMonth() + 1).toString(),
      endValue: (endDate.getMonth() + 1).toString()
    });
    
    // Set the day range
    setDayRange({
      startValue: startDate.getDate().toString(),
      endValue: endDate.getDate().toString()
    });
    
    // Immediately apply the new date range
    setTimeout(() => {
      if (onDateRangeChange) {
        onDateRangeChange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
      }
    }, 50);
    
  }, [onDateRangeChange]);
  
  // Check if month slider should be enabled
  const enableMonthSlider = !useAllTime && (
    isSingleYearSelected || // Always enable for single year
    yearRange.endValue - yearRange.startValue <= 2 // Or when range is small enough
  );
  
  // Check if day slider should be enabled
  const enableDaySlider = !useAllTime && (
    isSingleYearSelected && monthRange.startValue === monthRange.endValue // Only for single month
  );
  
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
                }
              }}
              className={`px-3 py-1 ml-2 rounded-md ${!useAllTime ? colors.tabActive : colors.tabInactive}`}
            >
              Custom Range
            </button>
          </div>
        )}
      </div>
      
      {/* Quick selection buttons */}
      {!useAllTime && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button 
            onClick={() => quickSelect('1w')}
            className={`px-2 py-1 text-xs rounded ${colors.tabInactive}`}
          >
            Last Week
          </button>
          <button 
            onClick={() => quickSelect('1m')}
            className={`px-2 py-1 text-xs rounded ${colors.tabInactive}`}
          >
            Last Month
          </button>
          <button 
            onClick={() => quickSelect('3m')}
            className={`px-2 py-1 text-xs rounded ${colors.tabInactive}`}
          >
            Last 3 Months
          </button>
          <button 
            onClick={() => quickSelect('6m')}
            className={`px-2 py-1 text-xs rounded ${colors.tabInactive}`}
          >
            Last 6 Months
          </button>
          <button 
            onClick={() => quickSelect('1y')}
            className={`px-2 py-1 text-xs rounded ${colors.tabInactive}`}
          >
            Last Year
          </button>
          <button 
            onClick={() => quickSelect('ytd')}
            className={`px-2 py-1 text-xs rounded ${colors.tabInactive}`}
          >
            Year to Date
          </button>
          <button 
            onClick={() => quickSelect('prevyear')}
            className={`px-2 py-1 text-xs rounded ${colors.tabInactive}`}
          >
            Previous Year
          </button>
        </div>
      )}
      
      <RangeSlider 
        values={years} 
        onValuesChange={setYearRange}
        initialStartValue={yearRange.startValue}
        initialEndValue={yearRange.endValue}
        title="Year Range"
        colorTheme={colorTheme}
        disabled={useAllTime}
      />
      
      {/* Only show month selector if not in all-time mode */}
      {enableMonthSlider && (
        <RangeSlider 
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
      
      {/* Only show day selector if not in all-time mode and a single month is selected */}
      {enableDaySlider && (
        <RangeSlider 
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
}

export default TripleRangeSelector;