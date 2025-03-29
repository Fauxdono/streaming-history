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
  const [hoveredNotch, setHoveredNotch] = useState(null);
  
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

  // Update slider when values array changes (like when month changes and day count changes)
  useEffect(() => {
    // When the available values change (e.g., days in month changes), we need to 
    // update the handle positions to match the values
    
    // First, ensure the start and end values are valid in the new array
    let newStartValue = startValue;
    let newEndValue = endValue;
    
    // If start value doesn't exist in new array, find closest valid value
    if (!sortedValues.includes(startValue)) {
      const startNum = parseInt(startValue);
      // Find the closest valid value that doesn't exceed the original
      const validValues = sortedValues.map(v => parseInt(v));
      // Find the closest value without going over
      const closestValid = validValues.filter(v => v <= startNum).sort((a, b) => b - a)[0] || validValues[0];
      newStartValue = closestValid.toString();
    }
    
    // If end value doesn't exist in new array, find closest valid value
    if (!sortedValues.includes(endValue)) {
      const endNum = parseInt(endValue);
      // Find the closest valid value that doesn't exceed the original
      const validValues = sortedValues.map(v => parseInt(v));
      // Find the closest value without going over
      const closestValid = validValues.filter(v => v <= endNum).sort((a, b) => b - a)[0] || validValues[0];
      newEndValue = closestValid.toString();
    }
    
    // Calculate new positions based on the index in the new array
    const startIndex = Math.max(0, sortedValues.indexOf(newStartValue));
    const endIndex = Math.max(0, sortedValues.indexOf(newEndValue));
    
    // Calculate as percentage of the array length
    const newStartPosition = sortedValues.length > 1 ? 
      (startIndex / (sortedValues.length - 1)) * 100 : 0;
    const newEndPosition = sortedValues.length > 1 ? 
      (endIndex / (sortedValues.length - 1)) * 100 : 100;
    
    // Update state with new values and positions
    setStartValue(newStartValue);
    setEndValue(newEndValue);
    setStartPosition(newStartPosition);
    setEndPosition(newEndPosition);
    
    // Also notify parent of changes if values changed - but don't trigger date updates
    // We'll let the Apply button handle that
  }, [sortedValues]);

  // Initialize the slider positions based on the initial values
  useEffect(() => {
    if (!initialStartValue || !initialEndValue || sortedValues.length === 0) return;
    
    // Try to use the provided values if they exist in our array
    let newStartValue = sortedValues.includes(initialStartValue) ? 
      initialStartValue : minValue;
    
    let newEndValue = sortedValues.includes(initialEndValue) ? 
      initialEndValue : maxValue;
    
    // Calculate positions
    const startIndex = sortedValues.indexOf(newStartValue);
    const endIndex = sortedValues.indexOf(newEndValue);
    
    const newStartPosition = (startIndex / (sortedValues.length - 1)) * 100;
    const newEndPosition = (endIndex / (sortedValues.length - 1)) * 100;
    
    // Set state
    setStartValue(newStartValue);
    setEndValue(newEndValue);
    setStartPosition(newStartPosition);
    setEndPosition(newEndPosition);
  }, [initialStartValue, initialEndValue, sortedValues, minValue, maxValue]);
  
  // Handler for when the position changes, updates the value
  const updateValueFromPosition = useCallback((position, isStart) => {
    if (sortedValues.length === 0) return;
    
    const valueIndex = Math.round((position / 100) * (sortedValues.length - 1));
    const newValue = sortedValues[Math.min(Math.max(0, valueIndex), sortedValues.length - 1)];
    
    if (isStart) {
      setStartValue(newValue);
    } else {
      setEndValue(newValue);
    }
  }, [sortedValues]);
  
  // Notify parent of value range change - but only when dragging stops
  useEffect(() => {
    if (!isDragging && onValuesChange && startValue && endValue) {
      onValuesChange({
        startValue,
        endValue
      });
    }
  }, [isDragging]);
  
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
      
      // Find the closest notch
      const exactIndex = (percentage / 100) * (sortedValues.length - 1);
      const closestIndex = Math.round(exactIndex);
      const closestPosition = (closestIndex / (sortedValues.length - 1)) * 100;
      
      if (singleValueMode) {
        // In single value mode, both handles move together
        setStartPosition(closestPosition);
        setEndPosition(closestPosition);
        setStartValue(sortedValues[closestIndex]);
        setEndValue(sortedValues[closestIndex]);
      } else if (isStartHandle) {
        // Don't let start handle pass end handle
        const endValueIndex = sortedValues.indexOf(endValue);
        if (closestIndex <= endValueIndex || allowSingleValueSelection) {
          setStartPosition(closestPosition);
          setStartValue(sortedValues[closestIndex]);
        }
      } else {
        // Don't let end handle pass start handle
        const startValueIndex = sortedValues.indexOf(startValue);
        if (closestIndex >= startValueIndex || allowSingleValueSelection) {
          setEndPosition(closestPosition);
          setEndValue(sortedValues[closestIndex]);
        }
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
  }, [
    disabled, 
    sortedValues, 
    endValue, 
    startValue, 
    singleValueMode, 
    allowSingleValueSelection
  ]);
  
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
    
    // Find the closest notch position
    const exactIndex = (percentage / 100) * (sortedValues.length - 1);
    const closestIndex = Math.round(exactIndex);
    const closestPosition = (closestIndex / (sortedValues.length - 1)) * 100;
    
    if (singleValueMode) {
      // In single value mode, set both handles to the clicked position
      setStartPosition(closestPosition);
      setEndPosition(closestPosition);
      setStartValue(sortedValues[closestIndex]);
      setEndValue(sortedValues[closestIndex]);
    } else {
      // Determine which handle to move (the closest one)
      const startDistance = Math.abs(percentage - startPosition);
      const endDistance = Math.abs(percentage - endPosition);
      
      if (startDistance <= endDistance) {
        // Move start handle
        const newPosition = closestPosition;
        setStartPosition(newPosition);
        setStartValue(sortedValues[closestIndex]);
      } else {
        // Move end handle
        const newPosition = closestPosition;
        setEndPosition(newPosition);
        setEndValue(sortedValues[closestIndex]);
      }
    }
    
    // Clear dragging state after brief delay
    setTimeout(() => setIsDragging(false), 100);
  }, [
    activeDragHandle, 
    disabled, 
    endPosition, 
    startPosition, 
    singleValueMode,
    sortedValues
  ]);
  
  // Format the display value if a formatter is provided
  const formatValue = useCallback((value) => {
    if (typeof displayFormat === 'function') {
      return displayFormat(value);
    }
    return value;
  }, [displayFormat]);
  
  // Calculate which notches to show labels for
  const getNotchVisibility = useCallback((index, value) => {
    // Always show first, last, selected values and hovered value
    if (index === 0 || 
        index === sortedValues.length - 1 || 
        value === startValue || 
        value === endValue ||
        value === hoveredNotch) {
      return true;
    }
    
    // For longer arrays, show fewer labels
    const interval = sortedValues.length <= 12 ? 1 : 
                    sortedValues.length <= 24 ? 2 :
                    sortedValues.length <= 60 ? 5 : 10;
    
    return index % interval === 0;
  }, [sortedValues, startValue, endValue, hoveredNotch]);
  
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
        className={`relative h-12 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} select-none`}
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
        
        {/* Value markers/notches */}
        {sortedValues.map((value, index) => {
          const position = (index / (sortedValues.length - 1)) * 100;
          const isInRange = position >= startPosition && position <= endPosition;
          const isSelected = value === startValue || value === endValue;
          const showLabel = getNotchVisibility(index, value);
          
          return (
            <div 
              key={value}
              className={`absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer transition-all`}
              style={{ left: `${position}%` }}
              onMouseEnter={() => setHoveredNotch(value)}
              onMouseLeave={() => setHoveredNotch(null)}
              onClick={(e) => {
                e.stopPropagation(); // Prevent the track click handler from also firing
                
                // Determine which handle to move (the closest one)
                const startDistance = Math.abs(position - startPosition);
                const endDistance = Math.abs(position - endPosition);
                
                if (startDistance <= endDistance) {
                  // Move start handle to this notch
                  setStartPosition(position);
                  setStartValue(value);
                } else {
                  // Move end handle to this notch
                  setEndPosition(position);
                  setEndValue(value);
                }
                
                // Notify parent component of the change after a delay
                setIsDragging(true);
                setTimeout(() => setIsDragging(false), 100);
              }}
            >
              {/* The notch/marker */}
              <div className={`w-1 ${
                isSelected ? `h-5 ${colors.bgMed} rounded-sm` : 
                value === hoveredNotch ? `h-4 ${colors.bgMed} rounded-sm` :
                isInRange ? `h-3 ${colors.bgMed} rounded-sm` : 
                `h-3 bg-gray-400 rounded-sm`
              }`}>
              </div>
              
              {/* Label */}
              {showLabel && (
                <div className={`absolute w-8 text-xs text-center -translate-x-1/2 mt-5 ${
                  isSelected ? `${colors.textBold} font-bold` : 
                  value === hoveredNotch ? `${colors.textBold}` :
                  `${colors.text} font-medium`
                }`}>
                  {formatValue(value)}
                </div>
              )}
            </div>
          );
        })}
        
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
  // Determine if we're dealing with "All Time" selection
  const isAllTime = !initialStartDate && !initialEndDate;
  
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

  // Calculate days in the selected month - update when year/month changes
  const daysInSelectedMonths = useMemo(() => {
    // For "all" selection or invalid inputs, use a default of 31 days
    if (selectedYear === 'all' || !monthRange.startValue || !monthRange.endValue) {
      return {
        start: Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
        end: Array.from({ length: 31 }, (_, i) => (i + 1).toString())
      };
    }
    
    try {
      // Calculate days in the start month
      const startYear = yearRangeMode ? yearRange.startYear : selectedYear;
      const startMonth = monthRange.startValue;
      const daysInStartMonth = getDaysInMonth(startYear, startMonth);
      
      // Calculate days in the end month
      const endYear = yearRangeMode ? yearRange.endYear : selectedYear;
      const endMonth = monthRange.endValue;
      const daysInEndMonth = getDaysInMonth(endYear, endMonth);
      
      return {
        start: Array.from({ length: daysInStartMonth }, (_, i) => (i + 1).toString()),
        end: Array.from({ length: daysInEndMonth }, (_, i) => (i + 1).toString())
      };
    } catch (err) {
      console.warn("Error calculating days in month:", err);
      // Default to 31 days if calculation fails
      return {
        start: Array.from({ length: 31 }, (_, i) => (i + 1).toString()),
        end: Array.from({ length: 31 }, (_, i) => (i + 1).toString())
      };
    }
  }, [selectedYear, yearRangeMode, yearRange, monthRange]);
  
  // Validate day values when months change, but don't trigger date updates
  useEffect(() => {
    // Skip for "all time" selection
    if (selectedYear === 'all') return;
    
    // Validate start day value
    const maxStartDay = daysInSelectedMonths.start.length;
    const currentStartDay = parseInt(dayRange.startValue);
    const validStartDay = Math.min(currentStartDay, maxStartDay).toString();
    
    // Validate end day value
    const maxEndDay = daysInSelectedMonths.end.length;
    const currentEndDay = parseInt(dayRange.endValue);
    const validEndDay = Math.min(currentEndDay, maxEndDay).toString();
    
    // Update if either value needs adjusting
    if (validStartDay !== dayRange.startValue || validEndDay !== dayRange.endValue) {
      setDayRange({
        startValue: validStartDay,
        endValue: validEndDay
      });
      
      // NOTE: We don't call applyDateRange here - only when button is clicked
    }
  }, [daysInSelectedMonths]);
  
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
        
        // Check if this is a full year selection
        const isFullYearRange = 
          startDate.getMonth() === 0 && startDate.getDate() === 1 &&
          endDate.getMonth() === 11 && endDate.getDate() === 31;
          
        if (startYear === endYear && isFullYearRange) {
          // Single full year selection
          setSelectedYear(startYear);
          setYearRangeMode(false);
        } else if (startYear === endYear) {
          // Same year but not full year
          setSelectedYear(startYear);
          setYearRangeMode(false);
          setMonthRange({
            startValue: (startDate.getMonth() + 1).toString(),
            endValue: (endDate.getMonth() + 1).toString()
          });
          setDayRange({
            startValue: startDate.getDate().toString(),
            endValue: endDate.getDate().toString()
          });
        } else {
          // Multiple years
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
        }
      }
    } catch (err) {
      console.error("Error parsing initial dates:", err);
    }
  }, [initialStartDate, initialEndDate, years]);
  
  // Handle year range changes from YearSelector
  const handleYearRangeChange = ({ startYear, endYear }) => {
    setYearRange({ startYear, endYear });
    
    // Apply full year range automatically when user selects a year range
    onDateRangeChange(`${startYear}-01-01`, `${endYear}-12-31`);
  };

  // Handle month range changes - don't apply immediately, just store in state
  const handleMonthRangeChange = ({ startValue, endValue }) => {
    setMonthRange({ startValue, endValue });
  };

  // Handle day range changes - don't apply immediately, just store in state
  const handleDayRangeChange = ({ startValue, endValue }) => {
    setDayRange({ startValue, endValue });
  };

  // Toggle between single year and year range modes
  const handleToggleRangeMode = (isRange) => {
    setYearRangeMode(isRange);
  };

  // Apply date range with specific values
  const applyDateRange = () => {
    try {
      // Check if we're in "all time" mode
      if (selectedYear === 'all') {
        if (onDateRangeChange) {
          onDateRangeChange("", "");
        }
        return;
      }
      
      // Get years based on mode
      const startYear = yearRangeMode ? yearRange.startYear : selectedYear;
      const endYear = yearRangeMode ? yearRange.endYear : selectedYear;
      
      // Validate days against month maximums
      const maxStartDay = getDaysInMonth(startYear, monthRange.startValue);
      const maxEndDay = getDaysInMonth(endYear, monthRange.endValue);
      
      const validStartDay = Math.min(parseInt(dayRange.startValue), maxStartDay);
      const validEndDay = Math.min(parseInt(dayRange.endValue), maxEndDay);
      
      // Format dates as YYYY-MM-DD
      const startDateStr = `${startYear}-${monthRange.startValue.padStart(2, '0')}-${validStartDay.toString().padStart(2, '0')}`;
      const endDateStr = `${endYear}-${monthRange.endValue.padStart(2, '0')}-${validEndDay.toString().padStart(2, '0')}`;
      
      if (onDateRangeChange) {
        onDateRangeChange(startDateStr, endDateStr);
      }
    } catch (err) {
      console.error("Error applying date range:", err);
    }
  };

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
      // For regular year, use full year range
      if (onDateRangeChange) {
        onDateRangeChange(`${year}-01-01`, `${year}-12-31`);
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
      
      {/* Month and Day selection - only show when not in "all" mode */}
      {selectedYear !== 'all' && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className={`font-medium ${colors.textTitle}`}>Refine Date Range</h4>
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
          />
          
          {/* Day Range Slider - now uses the correct days for each month */}
          <RangeSlider
            values={daysInSelectedMonths.start}
            onValuesChange={handleDayRangeChange}
            initialStartValue={dayRange.startValue}
            initialEndValue={dayRange.endValue}
            title="Day Range"
            colorTheme={colorTheme}
            allowSingleValueSelection={true}
          />
          
          <div className="flex justify-center mt-4">
            <button
              onClick={applyDateRange}
              className={`px-4 py-2 ${colors.buttonBg} text-white rounded ${colors.buttonHover}`}
            >
              Apply Date Range
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-3 text-sm text-gray-600">
        Selected range: {getFormattedDateRange()}
      </div>
    </div>
  );
};
export default TripleRangeSelector