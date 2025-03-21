import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const RangeSlider = ({ 
  values, 
  onValuesChange, 
  initialStartValue, 
  initialEndValue, 
  displayFormat,
  title,
  colorTheme = 'orange',
  disabled = false
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
    
    // Determine which handle to move (the closest one)
    const startDistance = Math.abs(percentage - startPosition);
    const endDistance = Math.abs(percentage - endPosition);
    
    // Set temporary dragging state to prevent immediate updates
    setIsDragging(true);
    
    if (startDistance <= endDistance) {
      setStartPosition(percentage);
      updateValueFromPosition(percentage, true);
    } else {
      setEndPosition(percentage);
      updateValueFromPosition(percentage, false);
    }
    
    // Clear dragging state after brief delay
    setTimeout(() => setIsDragging(false), 50);
  }, [activeDragHandle, disabled, endPosition, startPosition, updateValueFromPosition]);
  
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
          {formatValue(startValue)} - {formatValue(endValue)}
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
        
        {/* Value markers - show all values for months, but fewer for years and days */}
        {sortedValues.map((value, index) => {
          // For months, always show all markers (there are only 12)
          // For years and days, show fewer markers based on count
          const isMonthSlider = title === "Month Range";
          
          // Only render every nth marker based on the total count (for years and days)
          if (!isMonthSlider) {
            const markersToShow = Math.max(7, Math.min(20, sortedValues.length / 10));
            const skipFactor = Math.ceil(sortedValues.length / markersToShow);
            
            if (index % skipFactor !== 0 && index !== 0 && index !== sortedValues.length - 1) {
              return null;
            }
          }
          
          const position = (index / (sortedValues.length - 1)) * 100;
          const isInRange = position >= startPosition && position <= endPosition;
          
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

const TripleRangeSelector = ({ 
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
    // Just return the month number instead of abbreviation
    return monthNum;
  }, []);
  
  const formatDay = useCallback((day) => {
    // Just return the day number
    return day;
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
  
  // Get the days in the selected month
  const getDaysInMonth = useCallback((year, month) => {
    // Month is 1-based in our UI but 0-based in Date
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  }, []);
  
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
  }, [yearRange, monthRange, dayRange, getDaysInMonth, useAllTime]);
  
  // When year range changes, reset month and day ranges if needed
  useEffect(() => {
    if (isSingleYearSelected) {
      // Keep current values but ensure they're valid
    } else {
      // For multi-year range, default to full month/day range
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
    }
  }, [isSingleYearSelected, yearRange]);
  
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
      
      <RangeSlider 
        values={years} 
        onValuesChange={setYearRange}
        initialStartValue={yearRange.startValue}
        initialEndValue={yearRange.endValue}
        title="Year Range"
        colorTheme={colorTheme}
        disabled={useAllTime}
      />
      
      {/* Only show month selector if not in all-time mode and a single year is selected */}
      {!useAllTime && isSingleYearSelected && (
        <RangeSlider 
          values={months} 
          onValuesChange={setMonthRange}
          initialStartValue={monthRange.startValue}
          initialEndValue={monthRange.endValue}
          displayFormat={formatMonth}
          title="Month Range"
          colorTheme={colorTheme}
          disabled={useAllTime}
        />
      )}
      
      {/* Only show day selector if not in all-time mode and a single year is selected */}
      {!useAllTime && isSingleYearSelected && (
        <RangeSlider 
          values={days} 
          onValuesChange={setDayRange}
          initialStartValue={dayRange.startValue}
          initialEndValue={dayRange.endValue}
          displayFormat={formatDay}
          title="Day Range"
          colorTheme={colorTheme}
          disabled={useAllTime}
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