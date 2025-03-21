import React, { useState, useEffect, useRef } from 'react';

const RangeSlider = ({ 
  values, 
  onValuesChange, 
  initialStartValue, 
  initialEndValue, 
  displayFormat,
  title,
  colorTheme = 'orange' 
}) => {
  // Make sure we have an array of values and they're sorted
  const sortedValues = Array.isArray(values) ? 
    [...values].sort((a, b) => parseInt(a) - parseInt(b)) : [];
  
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
  
  const sliderRef = useRef(null);
  
  // Map color theme to actual color values
  const getColors = () => {
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
  };

  const colors = getColors();
  
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
  const updateValueFromPosition = (position, isStart) => {
    const valueIndex = Math.round((position / 100) * (sortedValues.length - 1));
    const newValue = sortedValues[Math.min(Math.max(0, valueIndex), sortedValues.length - 1)];
    
    if (isStart) {
      setStartValue(newValue);
    } else {
      setEndValue(newValue);
    }
    
    // Notify parent of value range change
    if (onValuesChange) {
      onValuesChange({
        startValue: isStart ? newValue : startValue,
        endValue: isStart ? endValue : newValue
      });
    }
  };
  
  // Handle mouse events
  const handleMouseDown = (e, isStartHandle) => {
    e.preventDefault();
    setActiveDragHandle(isStartHandle ? 'start' : 'end');
    
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
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Initial position update
    handleMouseMove(e);
  };
  
  // Handle click on the track (moves the nearest handle)
  const handleTrackClick = (e) => {
    if (activeDragHandle !== null) return; // Ignore during active drag
    
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
    
    if (startDistance <= endDistance) {
      setStartPosition(percentage);
      updateValueFromPosition(percentage, true);
    } else {
      setEndPosition(percentage);
      updateValueFromPosition(percentage, false);
    }
  };
  
  // Add a useEffect to call onValuesChange when the component mounts
  // This ensures the parent component gets the initial value range
  useEffect(() => {
    if (onValuesChange && startValue && endValue) {
      onValuesChange({
        startValue,
        endValue
      });
    }
  }, []);
  
  // Format the display value if a formatter is provided
  const formatValue = (value) => {
    if (typeof displayFormat === 'function') {
      return displayFormat(value);
    }
    return value;
  };
  
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
        className="relative h-10 cursor-pointer select-none" 
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
          } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md cursor-move z-20`}
          style={{ left: `${startPosition}%` }}
          onMouseDown={(e) => handleMouseDown(e, true)}
        ></div>
        
        {/* End Handle */}
        <div 
          className={`absolute top-1/2 h-7 w-7 bg-white border-2 ${
            activeDragHandle === 'end' ? colors.borderActive : colors.borderInactive
          } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md cursor-move z-20`}
          style={{ left: `${endPosition}%` }}
          onMouseDown={(e) => handleMouseDown(e, false)}
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
              {/* Only show some value labels to avoid crowding */}
              {index % Math.ceil(sortedValues.length / 7) === 0 && (
                <div className={`absolute w-10 text-xs text-center -translate-x-1/2 mt-4 ${colors.text} font-medium`}>
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
  colorTheme = 'orange'
}) => {
  // Generate years from 2000 to current year
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1999 }, (_, i) => (2000 + i).toString());
  
  // Generate months 1-12
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  
  // Generate days 1-31
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  
  // State for each range
  const [yearRange, setYearRange] = useState({ startValue: currentYear.toString(), endValue: currentYear.toString() });
  const [monthRange, setMonthRange] = useState({ startValue: '1', endValue: '12' });
  const [dayRange, setDayRange] = useState({ startValue: '1', endValue: '31' });
  
  // Format functions
  const formatMonth = (monthNum) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 
      'May', 'June', 'July', 'August', 
      'September', 'October', 'November', 'December'
    ];
    return monthNames[parseInt(monthNum) - 1];
  };
  
  const formatDay = (day) => {
    const num = parseInt(day);
    if (num === 1 || num === 21 || num === 31) return day + 'st';
    if (num === 2 || num === 22) return day + 'nd';
    if (num === 3 || num === 23) return day + 'rd';
    return day + 'th';
  };
  
  // Parse initial dates if provided
  useEffect(() => {
    if (initialStartDate && initialEndDate) {
      const startDate = new Date(initialStartDate);
      const endDate = new Date(initialEndDate);
      
      if (!isNaN(startDate) && !isNaN(endDate)) {
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
  }, [initialStartDate, initialEndDate]);
  
  // Update the parent component when ranges change
  useEffect(() => {
    if (onDateRangeChange) {
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
      
      onDateRangeChange(formatDate(startDate), formatDate(endDate));
    }
  }, [yearRange, monthRange, dayRange, onDateRangeChange]);
  
  // Get the days in the selected month
  const getDaysInMonth = (year, month) => {
    // Month is 1-based in our UI but 0-based in Date
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };
  
  // Adjust days when month/year changes to avoid invalid dates
  useEffect(() => {
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
  }, [yearRange, monthRange]);
  
  // Apply button handler
  const handleApply = () => {
    // Explicitly trigger the date range change
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
  };
  
  // Map color theme to actual color values
  const getColors = () => {
    switch (colorTheme) {
      case 'pink':
        return {
          buttonBg: 'bg-pink-600',
          buttonHover: 'hover:bg-pink-700',
          textTitle: 'text-pink-700'
        };
      case 'teal':
        return {
          buttonBg: 'bg-teal-600',
          buttonHover: 'hover:bg-teal-700',
          textTitle: 'text-teal-700'
        };
      case 'orange':
      default:
        return {
          buttonBg: 'bg-orange-600',
          buttonHover: 'hover:bg-orange-700',
          textTitle: 'text-orange-700'
        };
    }
  };

  const colors = getColors();
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <h3 className={`font-bold ${colors.textTitle} mb-4`}>Date Range Selection</h3>
      
      <RangeSlider 
        values={years} 
        onValuesChange={setYearRange}
        initialStartValue={yearRange.startValue}
        initialEndValue={yearRange.endValue}
        title="Year Range"
        colorTheme={colorTheme}
      />
      
      <RangeSlider 
        values={months} 
        onValuesChange={setMonthRange}
        initialStartValue={monthRange.startValue}
        initialEndValue={monthRange.endValue}
        displayFormat={formatMonth}
        title="Month Range"
        colorTheme={colorTheme}
      />
      
      <RangeSlider 
        values={days} 
        onValuesChange={setDayRange}
        initialStartValue={dayRange.startValue}
        initialEndValue={dayRange.endValue}
        displayFormat={formatDay}
        title="Day Range"
        colorTheme={colorTheme}
      />
      
      <div className="flex justify-center mt-4">
        <button
          onClick={handleApply}
          className={`px-4 py-2 ${colors.buttonBg} text-white rounded ${colors.buttonHover}`}
        >
          Apply Date Range
        </button>
      </div>
      
      <div className="mt-3 text-sm text-gray-600">
        Selected range: {yearRange.startValue}-{monthRange.startValue.padStart(2, '0')}-{dayRange.startValue.padStart(2, '0')} to {yearRange.endValue}-{monthRange.endValue.padStart(2, '0')}-{dayRange.endValue.padStart(2, '0')}
      </div>
    </div>
  );
};

export default TripleRangeSelector;