import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Helper function to get days in a month
function getDaysInMonth(year, month) {
  // JavaScript months are 0-based, but our input is 1-based
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}


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
  allowSingleValueSelection = true,
  singleValueMode = false,
  showAllTimeOption = false
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

  // Use 0% position for "All Time"
  const ALL_TIME_POSITION = 0;
  
  // Initialize the slider positions based on the initial values
  useEffect(() => {
    if (sortedValues.length === 0) return;
    
    // Handle initialization based on initial values provided
    if (initialStartValue === "all" || initialEndValue === "all") {
      // Initialize All Time values
      if (initialStartValue === "all") {
        setStartValue("all");
        setStartPosition(0); // All Time at position 0
      }
      
      if (initialEndValue === "all") {
        setEndValue("all");
        setEndPosition(0); // All Time at position 0
      }
      
      // For mixed cases (one All Time, one regular year)
      if (initialStartValue !== "all" && initialStartValue) {
        const valueIndex = sortedValues.indexOf(initialStartValue.toString());
        if (valueIndex >= 0) {
          // Adjust for All Time position
          const totalPositions = sortedValues.length + 1; // +1 for All Time
          const position = ((valueIndex + 1) / (totalPositions - 1)) * 100; // +1 to skip position 0
          setStartPosition(position);
          setStartValue(initialStartValue);
        }
      }
      
      if (initialEndValue !== "all" && initialEndValue) {
        const valueIndex = sortedValues.indexOf(initialEndValue.toString());
        if (valueIndex >= 0) {
          // Adjust for All Time position
          const totalPositions = sortedValues.length + 1; // +1 for All Time
          const position = ((valueIndex + 1) / (totalPositions - 1)) * 100; // +1 to skip position 0
          setEndPosition(position);
          setEndValue(initialEndValue);
        }
      }
      
      return; // Exit early
    }
    
    // Regular initialization for year values
    let newStartPos = 0;
    let newEndPos = 100;
    let newStartVal = minValue;
    let newEndVal = maxValue;
    
    if (initialStartValue && sortedValues.includes(initialStartValue.toString())) {
      const valueIndex = sortedValues.indexOf(initialStartValue.toString());
      if (showAllTimeOption) {
        // Adjust for All Time position
        const totalPositions = sortedValues.length + 1; // +1 for All Time
        newStartPos = ((valueIndex + 1) / (totalPositions - 1)) * 100; // +1 to skip position 0
      } else {
        newStartPos = (valueIndex / (sortedValues.length - 1)) * 100;
      }
      newStartVal = initialStartValue;
    }
    
    if (initialEndValue && sortedValues.includes(initialEndValue.toString())) {
      const valueIndex = sortedValues.indexOf(initialEndValue.toString());
      if (showAllTimeOption) {
        // Adjust for All Time position
        const totalPositions = sortedValues.length + 1; // +1 for All Time
        newEndPos = ((valueIndex + 1) / (totalPositions - 1)) * 100; // +1 to skip position 0
      } else {
        newEndPos = (valueIndex / (sortedValues.length - 1)) * 100;
      }
      newEndVal = initialEndValue;
    }
    
    // In single value mode, ensure both handles have the same position and value
    if (singleValueMode) {
      newEndPos = newStartPos;
      newEndVal = newStartVal;
    }
    
    // Update state
    setStartPosition(newStartPos);
    setEndPosition(newEndPos);
    setStartValue(newStartVal);
    setEndValue(newEndVal);
  }, [sortedValues, initialStartValue, initialEndValue, minValue, maxValue, singleValueMode, showAllTimeOption]);
  
  // Handler for when the position changes, updates the value
  const updateValueFromPosition = useCallback((position, isStart) => {
    // If this is very close to 0% position and All Time is enabled, set to "all"
    if (showAllTimeOption && position < 3) {
      if (isStart) {
        setStartValue("all");
      } else {
        setEndValue("all");
      }
      return;
    }
    
    // For normal year selection, adjust the index to account for "All Time" at position 0
    if (position >= 0 && position <= 100) {
      // Calculate what proportion of the slider this position represents
      const sliderProportion = position / 100;
      
      // If we have "All Time" enabled, we need to adjust the calculation:
      // The year values should be distributed from positions 1/(n+1) to 100%
      // where n is the number of years
      let valueIndex;
      
      if (showAllTimeOption) {
        // Adjust for "All Time" at position 0
        // The real years are shifted slightly to the right
        const totalPositions = sortedValues.length + 1; // +1 for "All Time"
        const adjustedIndex = Math.round(sliderProportion * (totalPositions - 1));
        
        // If position 0 is selected, it means "All Time"
        if (adjustedIndex === 0) {
          if (isStart) {
            setStartValue("all");
          } else {
            setEndValue("all");
          }
          return;
        }
        
        // Otherwise, select a regular year (adjusting for "All Time" at index 0)
        valueIndex = adjustedIndex - 1;  // -1 because "All Time" takes index 0
      } else {
        // Regular calculation without "All Time" adjustment
        valueIndex = Math.round(sliderProportion * (sortedValues.length - 1));
      }
      
      // Ensure the index is within bounds
      valueIndex = Math.min(Math.max(0, valueIndex), sortedValues.length - 1);
      const newValue = sortedValues[valueIndex];
      
      if (isStart) {
        setStartValue(newValue);
      } else {
        setEndValue(newValue);
      }
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
      
      // Allow mouse position to extend left of the slider for "all time" option
      const rawX = e.clientX - rect.left;
      
      // Improved handling of mouse position
      let position;
      
      // Check if mouse is in the "All Time" zone (left of the slider)
      if (showAllTimeOption && rawX < 10) { // Reduced detection area
        position = ALL_TIME_POSITION; // Use our fixed position for "All Time"
      } else {
        // Normal slider range (0-100%)
        const sliderX = Math.max(0, Math.min(rect.width, rawX));
        position = (sliderX / rect.width) * 100;
      }
      
      if (singleValueMode) {
        // In single value mode, both handles move together
        if (position === ALL_TIME_POSITION) {
          // Both handles to "All Time"
          setStartPosition(ALL_TIME_POSITION);
          setEndPosition(ALL_TIME_POSITION);
          setStartValue("all");
          setEndValue("all");
        } else if (position >= 0 && position <= 100) {
          // Both handles to the same regular position
          setStartPosition(position);
          setEndPosition(position);
          
          // Update both values to the same value
          const valueIndex = Math.round((position / 100) * (sortedValues.length - 1));
          const newValue = sortedValues[Math.min(Math.max(0, valueIndex), sortedValues.length - 1)];
          setStartValue(newValue);
          setEndValue(newValue);
        }
      } else if (isStartHandle) {
        // Start handle being dragged
        if (position === ALL_TIME_POSITION) {
          // Set to "All Time"
          setStartPosition(ALL_TIME_POSITION);
          setStartValue("all");
        } else if (position >= 0 && position <= 100) {
          // Don't let start handle pass end handle (unless end handle is at "All Time")
          if (endValue === "all" || position <= endPosition) {
            const minSeparation = allowSingleValueSelection ? 0 : 5;
            const constrainedPosition = Math.min(position, endPosition - minSeparation);
            setStartPosition(constrainedPosition);
            updateValueFromPosition(constrainedPosition, true);
          }
        }
      } else {
        // End handle being dragged
        if (position === ALL_TIME_POSITION) {
          // Set to "All Time"
          setEndPosition(ALL_TIME_POSITION);
          setEndValue("all");
        } else if (position >= 0 && position <= 100) {
          // Don't let end handle pass start handle (unless start handle is at "All Time")
          if (startValue === "all" || position >= startPosition) {
            const minSeparation = allowSingleValueSelection ? 0 : 5;
            const constrainedPosition = Math.max(position, startPosition + minSeparation);
            setEndPosition(constrainedPosition);
            updateValueFromPosition(constrainedPosition, false);
          }
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
  }, [disabled, endPosition, startPosition, updateValueFromPosition, allowSingleValueSelection, singleValueMode, sortedValues, showAllTimeOption, startValue, endValue, ALL_TIME_POSITION]);
  
  // Handle touch events for mobile
  const handleTouchStart = useCallback((e, isStartHandle) => {
    if (disabled) return;
    
    // Prevent default to avoid page scrolling while dragging
    e.preventDefault();
    
    setActiveDragHandle(isStartHandle ? 'start' : 'end');
    setIsDragging(true);
    
    const handleTouchMove = (e) => {
      if (!e.touches[0]) return;
      
      const slider = sliderRef.current;
      if (!slider) return;
      
      const rect = slider.getBoundingClientRect();
      const touch = e.touches[0];
      
      // Allow touch to go slightly left of the slider for "all time" option
      const rawX = touch.clientX - rect.left;
      
      // Improved handling of touch position
      let position;
      
      // Check if touch is in the "All Time" zone (left of the slider)
      if (showAllTimeOption && rawX < 10) { // Reduced detection area
        position = ALL_TIME_POSITION; // Use our fixed position for "All Time"
      } else {
        // Normal slider range (0-100%)
        const sliderX = Math.max(0, Math.min(rect.width, rawX));
        position = (sliderX / rect.width) * 100;
      }
      
      if (singleValueMode) {
        // In single value mode, both handles move together
        if (position === ALL_TIME_POSITION) {
          // Both handles to "All Time"
          setStartPosition(ALL_TIME_POSITION);
          setEndPosition(ALL_TIME_POSITION);
          setStartValue("all");
          setEndValue("all");
        } else if (position >= 0 && position <= 100) {
          // Both handles to the same regular position
          setStartPosition(position);
          setEndPosition(position);
          
          // Update both values to the same value
          const valueIndex = Math.round((position / 100) * (sortedValues.length - 1));
          const newValue = sortedValues[Math.min(Math.max(0, valueIndex), sortedValues.length - 1)];
          setStartValue(newValue);
          setEndValue(newValue);
        }
      } else if (isStartHandle) {
        // Start handle being dragged
        if (position === ALL_TIME_POSITION) {
          // Set to "All Time"
          setStartPosition(ALL_TIME_POSITION);
          setStartValue("all");
        } else if (position >= 0 && position <= 100) {
          // Don't let start handle pass end handle (unless end handle is at "All Time")
          if (endValue === "all" || position <= endPosition) {
            const minSeparation = allowSingleValueSelection ? 0 : 5;
            const constrainedPosition = Math.min(position, endPosition - minSeparation);
            setStartPosition(constrainedPosition);
            updateValueFromPosition(constrainedPosition, true);
          }
        }
      } else {
        // End handle being dragged
        if (position === ALL_TIME_POSITION) {
          // Set to "All Time"
          setEndPosition(ALL_TIME_POSITION);
          setEndValue("all");
        } else if (position >= 0 && position <= 100) {
          // Don't let end handle pass start handle (unless start handle is at "All Time")
          if (startValue === "all" || position >= startPosition) {
            const minSeparation = allowSingleValueSelection ? 0 : 5;
            const constrainedPosition = Math.max(position, startPosition + minSeparation);
            setEndPosition(constrainedPosition);
            updateValueFromPosition(constrainedPosition, false);
          }
        }
      }
    };
    
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove, { passive: false });
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      setActiveDragHandle(null);
      setIsDragging(false);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    
    // Initial position update
    if (e.touches[0]) {
      handleTouchMove(e);
    }
  }, [disabled, endPosition, startPosition, updateValueFromPosition, allowSingleValueSelection, singleValueMode, sortedValues, showAllTimeOption, startValue, endValue, ALL_TIME_POSITION]);
  
  // Handle click on the track
  const handleTrackClick = useCallback((e) => {
    if (disabled || activeDragHandle !== null) return; // Ignore during active drag
    
    const slider = sliderRef.current;
    if (!slider) return;
    
    const rect = slider.getBoundingClientRect();
    
    // Allow clicks to the left of the slider for "all time" option
    const rawX = e.clientX - rect.left;
    
    // Improved handling of click position
    let position;
    
    // Check if click is in the "All Time" zone (left of the slider)
    if (showAllTimeOption && rawX < 10) { // Use a small detection area
      position = ALL_TIME_POSITION; // Special position for "All Time"
    } else {
      // Normal slider range (0-100%)
      const sliderX = Math.max(0, Math.min(rect.width, rawX));
      position = (sliderX / rect.width) * 100;
    }
    
    // Set temporary dragging state to prevent immediate updates
    setIsDragging(true);
    
    if (singleValueMode) {
      // In single value mode, set both handles to the clicked position
      if (position === ALL_TIME_POSITION) {
        setStartPosition(ALL_TIME_POSITION);
        setEndPosition(ALL_TIME_POSITION);
        setStartValue("all");
        setEndValue("all");
      } else {
        setStartPosition(position);
        setEndPosition(position);
        
        // Update both values
        if (showAllTimeOption) {
          // Adjust for "All Time" at position 0
          const totalPositions = sortedValues.length + 1;
          const adjustedIndex = Math.round((position / 100) * (totalPositions - 1));
          
          if (adjustedIndex === 0) {
            setStartValue("all");
            setEndValue("all");
          } else {
            const valueIndex = adjustedIndex - 1;
            const boundedIndex = Math.min(Math.max(0, valueIndex), sortedValues.length - 1);
            const newValue = sortedValues[boundedIndex];
            setStartValue(newValue);
            setEndValue(newValue);
          }
        } else {
          // Standard calculation
          const valueIndex = Math.round((position / 100) * (sortedValues.length - 1));
          const boundedIndex = Math.min(Math.max(0, valueIndex), sortedValues.length - 1);
          const newValue = sortedValues[boundedIndex];
          setStartValue(newValue);
          setEndValue(newValue);
        }
      }
    } else {
      // Determine which handle to move (the closest one)
      let startDistance = Math.abs(position - startPosition);
      let endDistance = Math.abs(position - endPosition);
      
      // Special case: All Time position
      if (position === ALL_TIME_POSITION) {
        startDistance = startPosition; // Distance from start handle to left edge
        endDistance = endPosition; // Distance from end handle to left edge
      }
      
      if (startDistance <= endDistance) {
        // Move start handle
        if (position === ALL_TIME_POSITION) {
          setStartPosition(ALL_TIME_POSITION);
          setStartValue("all");
        } else if (endValue === "all" || position <= endPosition) {
          setStartPosition(position);
          updateValueFromPosition(position, true);
        }
      } else {
        // Move end handle
        if (position === ALL_TIME_POSITION) {
          setEndPosition(ALL_TIME_POSITION);
          setEndValue("all");
        } else if (startValue === "all" || position >= startPosition) {
          setEndPosition(position);
          updateValueFromPosition(position, false);
        }
      }
    }
    
    // Clear dragging state after brief delay
    setTimeout(() => setIsDragging(false), 50);
  }, [activeDragHandle, disabled, endPosition, startPosition, updateValueFromPosition, 
      sortedValues, startValue, endValue, singleValueMode, showAllTimeOption, ALL_TIME_POSITION]);
  
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
      {/* Title and value display */}
      <div className="flex justify-between mb-1 items-center">
        <span className={`${colors.text} text-sm`}>{title}</span>
        <div className={`font-medium ${colors.textBold} ${colors.bgLight} px-3 py-1 rounded`}>
          {isAllTimeStart && isAllTimeEnd ? "All Time" : 
           singleValueMode || startValue === endValue 
            ? formatValue(startValue) 
            : `${formatValue(startValue)} - ${formatValue(endValue)}`}
        </div>
      </div>
      
      {/* Slider container */}
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
          onTouchStart={e => handleTouchStart(e, true)}
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
          onTouchStart={e => handleTouchStart(e, false)}
        ></div>
        
        {/* All-Time marker - special marker at position 0 when All-Time is enabled */}
        {showAllTimeOption && (
          <div 
            className={`absolute top-1/2 w-1 h-4 ${colors.bgMed} transform -translate-x-1/2 -translate-y-1/2`}
            style={{ left: '0%' }}
          >
            <div className={`absolute w-16 text-xs text-center -translate-x-1/2 mt-4 ${
              (isAllTimeStart || isAllTimeEnd) ? `${colors.textBold} font-bold` : `${colors.text} font-medium`
            }`}>
              All Time
            </div>
          </div>
        )}
        
        {/* Value markers - adjusted to distribute evenly across the slider, accounting for All Time */}
        {sortedValues.map((value, index) => {
          // If All Time is enabled, adjust the position calculation to distribute years from 1/(n+1) to 100%
          let position;
          if (showAllTimeOption) {
            const totalPositions = sortedValues.length + 1; // +1 for All Time
            position = ((index + 1) / (totalPositions - 1)) * 100; // +1 to skip position 0 for All Time
          } else {
            position = (index / (sortedValues.length - 1)) * 100; // Standard distribution
          }
          
          // Determine if this marker is within the selected range
          let isInRange = false;
          if (startValue === "all" && endValue === "all") {
            isInRange = false; // No regular years in range when All Time is selected
          } else if (startValue === "all") {
            // Start is All Time, check if end is this year or greater
            isInRange = value <= endValue;
          } else if (endValue === "all") {
            // End is All Time, check if start is this year or less
            isInRange = value >= startValue;
          } else {
            // Regular range check
            isInRange = value >= startValue && value <= endValue;
          }
          
          // Emphasize exact match markers
          const isStartMarker = value === startValue && !isAllTimeStart;
          const isEndMarker = value === endValue && !isAllTimeEnd;
          const isExactMarker = isStartMarker || isEndMarker;
          
          return (
            <div 
              key={value}
              className={`absolute top-1/2 ${isExactMarker ? 'w-1.5 h-4' : 'w-1 h-3'} transform -translate-x-1/2 -translate-y-1/2 z-10 ${
                isInRange ? colors.bgMed : 'bg-gray-400'
              }`}
              style={{ left: `${position}%` }}
            >
              {/* Only show every few labels to avoid crowding */}
              {(index % Math.max(1, Math.floor(sortedValues.length / 12)) === 0 || isExactMarker) && (
                <div className={`absolute w-10 text-xs text-center -translate-x-1/2 mt-4 ${isExactMarker ? `${colors.textBold} font-bold` : `${colors.text} font-medium`}`}>
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