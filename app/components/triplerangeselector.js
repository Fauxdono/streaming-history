import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import YearSelector from './year-selector.js';

// Helper function to get days in a month
function getDaysInMonth(year, month) {
  // JavaScript months are 0-based, but our input is 1-based
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}

// Inner component for range sliders (for month and day)
const RangeSlider = ({ 
  values, 
  onValuesChange, 
  initialStartValue, 
  initialEndValue, 
  displayFormat,
  title,
  colorTheme = 'orange',
  disabled = false,
  allowSingleValueSelection = true,
  singleValueMode = false
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
  }, [initialStartValue, initialEndValue, minValue, maxValue, sortedValues]);
  
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
  
  // Notify parent of value range change
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
      
      if (singleValueMode) {
        // In single value mode, both handles move together
        setStartPosition(percentage);
        setEndPosition(percentage);
        updateValueFromPosition(percentage, true);
        updateValueFromPosition(percentage, false);
      } else if (isStartHandle) {
        // Don't let start handle pass end handle
        percentage = Math.min(percentage, endPosition - (allowSingleValueSelection ? 0 : 5));
        setStartPosition(percentage);
        updateValueFromPosition(percentage, true);
      } else {
        // Don't let end handle pass start handle
        percentage = Math.max(percentage, startPosition + (allowSingleValueSelection ? 0 : 5));
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
  }, [disabled, endPosition, startPosition, updateValueFromPosition, allowSingleValueSelection, singleValueMode]);
  
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
    
    if (singleValueMode) {
      // In single value mode, set both handles to the clicked position
      setStartPosition(percentage);
      setEndPosition(percentage);
      updateValueFromPosition(percentage, true);
      updateValueFromPosition(percentage, false);
    } else {
      // Determine which handle to move (the closest one)
      const startDistance = Math.abs(percentage - startPosition);
      const endDistance = Math.abs(percentage - endPosition);
      
      if (startDistance <= endDistance) {
        // Move start handle
        percentage = Math.min(percentage, endPosition - (allowSingleValueSelection ? 0 : 5));
        setStartPosition(percentage);
        updateValueFromPosition(percentage, true);
      } else {
        // Move end handle
        percentage = Math.max(percentage, startPosition + (allowSingleValueSelection ? 0 : 5));
        setEndPosition(percentage);
        updateValueFromPosition(percentage, false);
      }
    }
    
    // Clear dragging state after brief delay
    setTimeout(() => setIsDragging(false), 100);
  }, [activeDragHandle, disabled, endPosition, startPosition, updateValueFromPosition, allowSingleValueSelection, singleValueMode]);
  
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
        
        {/* Start Handle */}
        <div 
          className={`absolute top-1/2 h-7 w-7 bg-white border-2 ${
            activeDragHandle === 'start' ? colors.borderActive : colors.borderInactive
          } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md ${disabled ? 'cursor-not-allowed' : 'cursor-move'} z-20`}
          style={{ 
            left: `${startPosition}%`,
            opacity: singleValueMode ? (activeDragHandle === 'start' ? 1 : 0.5) : 1,
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
            opacity: singleValueMode ? (activeDragHandle === 'end' ? 1 : 0.5) : 1,
          }}
          onMouseDown={e => handleMouseDown(e, false)}
        ></div>
        
        {/* Value markers */}
        {sortedValues.map((value, index) => {
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
              {/* Only show some labels to avoid crowding */}
              {(index % Math.ceil(sortedValues.length / 12) === 0 || 
                value === startValue || 
                value === endValue) && (
                <div className={`absolute w-10 text-xs text-center -translate-x-1/2 mt-4 ${
                  (value === startValue || value === endValue) ? `${colors.textBold} font-bold` : `${colors.text} font-medium`
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
  availableYears = []
}) => {
  // Process available years
  const years = useMemo(() => {
    if (availableYears && availableYears.length > 0) {
      return [...new Set(availableYears)].sort((a, b) => parseInt(a) - parseInt(b));
    }
    
    // Default to current year and previous 5 years if no years provided
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => (currentYear - 5 + i).toString());
  }, [availableYears]);
  
  // Create an object with years for YearSelector
  const yearsForYearSelector = useMemo(() => {
    const yearsObj = {};
    years.forEach(year => {
      yearsObj[year] = []; // YearSelector expects an object with years as keys
    });
    return yearsObj;
  }, [years]);
  
  // State for year selection
  const [yearRangeMode, setYearRangeMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');
  const [yearRange, setYearRange] = useState({ 
    startYear: initialStartDate ? new Date(initialStartDate).getFullYear().toString() : years[0], 
    endYear: initialEndDate ? new Date(initialEndDate).getFullYear().toString() : years[years.length - 1] 
  });
  
  // Generate months 1-12
  const months = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => (i + 1).toString()), 
  []);
  
  // State for month selection
  const [monthRange, setMonthRange] = useState({ 
    startValue: initialStartDate ? (new Date(initialStartDate).getMonth() + 1).toString() : '1', 
    endValue: initialEndDate ? (new Date(initialEndDate).getMonth() + 1).toString() : '12' 
  });
  
  // State for day selection
  const [dayRange, setDayRange] = useState({ 
    startValue: initialStartDate ? new Date(initialStartDate).getDate().toString() : '1', 
    endValue: initialEndDate ? new Date(initialEndDate).getDate().toString() : '31' 
  });
  
  // Initialize component from provided dates
  useEffect(() => {
    // Default to "All Time" when no dates are provided
    if (!initialStartDate || !initialEndDate || initialStartDate === "" || initialEndDate === "") {
      setSelectedYear('all');
      setYearRangeMode(false);
      // Make sure month and day ranges are also set to default values
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
      return;
    }
    
    try {
      const startDate = new Date(initialStartDate);
      const endDate = new Date(initialEndDate);
      
      if (!isNaN(startDate) && !isNaN(endDate)) {
        const startYear = startDate.getFullYear().toString();
        const endYear = endDate.getFullYear().toString();
        
        // Check if years are different (year range)
        if (startYear !== endYear) {
          // Multiple years - enable year range mode
          setYearRangeMode(true);
          setYearRange({
            startYear: startYear,
            endYear: endYear
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
          // Same year - single year mode
          setSelectedYear(startYear);
          setYearRangeMode(false);
          
          // Check if this is a full year selection
          const isFullYearRange = 
            startDate.getMonth() === 0 && startDate.getDate() === 1 &&
            endDate.getMonth() === 11 && endDate.getDate() === 31;
            
          // For partial year, still set month and day ranges
          if (!isFullYearRange) {
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
    } catch (err) {
      console.error("Error parsing initial dates:", err);
    }
  }, [initialStartDate, initialEndDate, years]);
  
  // Handle year changes from YearSelector
  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    // Handle "all" selection (all time)
    if (year === 'all') {
      // For "all", pass empty strings to indicate all time
      if (onDateRangeChange) {
        onDateRangeChange("", "");
      }
    } else {
      // If month and day range are not set (full year), update with partial year based on existing month/day selection
      if (monthRange.startValue !== '1' || monthRange.endValue !== '12' ||
          dayRange.startValue !== '1' || dayRange.endValue !== '31') {
        // Apply the date range with current month/day selections for the new year
        applyDateRange(year, year, monthRange.startValue, monthRange.endValue, dayRange.startValue, dayRange.endValue);
      } else {
        // For full year, use year-01-01 to year-12-31
        if (onDateRangeChange) {
          onDateRangeChange(`${year}-01-01`, `${year}-12-31`);
        }
      }
    }
  };
  
  // Handle year range changes from YearSelector
  const handleYearRangeChange = ({ startYear, endYear }) => {
    setYearRange({ startYear, endYear });
    
    // Apply the date range with current month/day selections
    applyDateRange(startYear, endYear, monthRange.startValue, monthRange.endValue, dayRange.startValue, dayRange.endValue);
  };
  
  // Handle month range changes
  const handleMonthRangeChange = ({ startValue, endValue }) => {
    setMonthRange({ startValue, endValue });
    
    // Apply in both year range and single year mode (except "all")
    if (yearRangeMode) {
      applyDateRange(yearRange.startYear, yearRange.endYear, startValue, endValue, dayRange.startValue, dayRange.endValue);
    } else if (selectedYear !== 'all') {
      applyDateRange(selectedYear, selectedYear, startValue, endValue, dayRange.startValue, dayRange.endValue);
    }
  };
  
  // Handle day range changes
  const handleDayRangeChange = ({ startValue, endValue }) => {
    setDayRange({ startValue, endValue });
    
    // Apply in both year range and single year mode (except "all")
    if (yearRangeMode) {
      applyDateRange(yearRange.startYear, yearRange.endYear, monthRange.startValue, monthRange.endValue, startValue, endValue);
    } else if (selectedYear !== 'all') {
      applyDateRange(selectedYear, selectedYear, monthRange.startValue, monthRange.endValue, startValue, endValue);
    }
  };
  
  // Toggle between single year and year range modes
  const handleToggleRangeMode = (isRange) => {
    setYearRangeMode(isRange);
    
    // If switching from range to single, set default date range for the selected year
    if (!isRange && selectedYear !== 'all') {
      // Preserve month and day selections when switching modes
      if (onDateRangeChange) {
        applyDateRange(selectedYear, selectedYear, monthRange.startValue, monthRange.endValue, dayRange.startValue, dayRange.endValue);
      }
    } else if (isRange) {
      // If switching to range mode, set a default range with the current year
      // and preserve month/day selections
      if (selectedYear !== 'all') {
        const startYear = selectedYear;
        const endYear = (parseInt(selectedYear) + 1).toString(); // Default to next year
        setYearRange({ startYear, endYear });
        
        if (onDateRangeChange) {
          applyDateRange(startYear, endYear, monthRange.startValue, monthRange.endValue, dayRange.startValue, dayRange.endValue);
        }
      } else {
        // Coming from "all" mode, use first and last years from the available years
        const startYear = years[0];
        const endYear = years[years.length - 1];
        setYearRange({ startYear, endYear });
        
        if (onDateRangeChange) {
          applyDateRange(startYear, endYear, monthRange.startValue, monthRange.endValue, dayRange.startValue, dayRange.endValue);
        }
      }
    }
  };
  
  // Apply date range with specific values
  const applyDateRange = (startYear, endYear, startMonth, endMonth, startDay, endDay) => {
    try {
      // Validate days against month maximums
      const maxStartDay = getDaysInMonth(startYear, startMonth);
      const maxEndDay = getDaysInMonth(endYear, endMonth);
      
      const validStartDay = Math.min(parseInt(startDay), maxStartDay);
      const validEndDay = Math.min(parseInt(endDay), maxEndDay);
      
      // Format dates as YYYY-MM-DD
      const startDateStr = `${startYear}-${startMonth.padStart(2, '0')}-${validStartDay.toString().padStart(2, '0')}`;
      const endDateStr = `${endYear}-${endMonth.padStart(2, '0')}-${validEndDay.toString().padStart(2, '0')}`;
      
      if (onDateRangeChange) {
        onDateRangeChange(startDateStr, endDateStr);
      }
    } catch (err) {
      console.error("Error applying date range:", err);
    }
  };
  
  // Apply custom date range when clicked
  const applyCustomDateRange = () => {
    if (yearRangeMode) {
      applyDateRange(
        yearRange.startYear, 
        yearRange.endYear, 
        monthRange.startValue, 
        monthRange.endValue, 
        dayRange.startValue, 
        dayRange.endValue
      );
    } else if (selectedYear !== 'all') {
      applyDateRange(
        selectedYear, 
        selectedYear, 
        monthRange.startValue, 
        monthRange.endValue, 
        dayRange.startValue, 
        dayRange.endValue
      );
    } else {
      // All time
      if (onDateRangeChange) {
        onDateRangeChange("", "");
      }
    }
  };
  
  // Format month names for display
  const formatMonth = (monthNum) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(monthNum) - 1];
  };
  
  // Get current date range as formatted string
  const getFormattedDateRange = () => {
    if (selectedYear === 'all' && !yearRangeMode) {
      return `All Time (${years[0]}-01-01 to ${years[years.length - 1]}-12-31)`;
    } else if (!yearRangeMode) {
      return `${selectedYear}-${monthRange.startValue.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')} to ${selectedYear}-${monthRange.endValue.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
    } else {
      return `${yearRange.startYear}-${monthRange.startValue.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')} to ${yearRange.endYear}-${monthRange.endValue.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
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
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-center">
        <h3 className={`font-bold ${colors.textTitle}`}>Date Range Selection</h3>
      </div>
      
      {/* Use YearSelector component for year selection */}
      <YearSelector 
        artistsByYear={yearsForYearSelector}
        onYearChange={handleYearChange}
        onYearRangeChange={handleYearRangeChange}
        initialYear={selectedYear !== 'all' ? selectedYear : null}
        initialYearRange={yearRange}
        isRangeMode={yearRangeMode}
        onToggleRangeMode={handleToggleRangeMode}
        colorTheme={colorTheme}
      />
      
      {/* Month and Day selection are always usable except in "all" mode */}
      <div className={`mt-4 space-y-4 ${selectedYear === 'all' ? 'opacity-70 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center">
          <h4 className={`font-medium ${colors.textTitle}`}>Refine Date Range</h4>
          {selectedYear === 'all' && (
            <div className="text-sm text-gray-500">
              (Select a year or year range to use)
            </div>
          )}
        </div>
        
        {/* Month Range Slider */}
        <RangeSlider
          values={months}
          onValuesChange={handleMonthRangeChange}
          initialStartValue={monthRange.startValue}
          initialEndValue={monthRange.endValue}
          displayFormat={formatMonth}
          title="Month Range"
          colorTheme={colorTheme}
          allowSingleValueSelection={true}
          disabled={selectedYear === 'all'}
        />
        
        {/* Day Range Slider */}
        <RangeSlider
          values={Array.from({ length: 31 }, (_, i) => (i + 1).toString())}
          onValuesChange={handleDayRangeChange}
          initialStartValue={dayRange.startValue}
          initialEndValue={dayRange.endValue}
          title="Day Range"
          colorTheme={colorTheme}
          allowSingleValueSelection={true}
          disabled={selectedYear === 'all'}
        />
        
        <div className="flex justify-center mt-4">
          <button
            onClick={applyCustomDateRange}
            disabled={selectedYear === 'all'}
            className={`px-4 py-2 ${colors.buttonBg} text-white rounded ${colors.buttonHover} ${selectedYear === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Apply Date Range
          </button>
        </div>
      </div>
      
      <div className="mt-3 text-sm text-gray-600">
        Selected range: {getFormattedDateRange()}
      </div>
    </div>
  );
};

export default TripleRangeSelector;