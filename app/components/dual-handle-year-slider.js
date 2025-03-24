import React, { useState, useEffect, useRef } from 'react';

const DualHandleYearSlider = ({ years, onYearRangeChange, initialStartYear, initialEndYear, colorTheme = 'teal' }) => {
  // Make sure we have an array of years and they're sorted
  const sortedYears = Array.isArray(years) ? 
    [...years].sort((a, b) => parseInt(a) - parseInt(b)) : [];
  
  // If no years, nothing to render
  if (sortedYears.length === 0) {
    return <div className={`text-${colorTheme}-700 italic`}>No year data available</div>;
  }
  
  const minYear = sortedYears[0];
  const maxYear = sortedYears[sortedYears.length - 1];
  
  // State for the slider positions
  const [startPosition, setStartPosition] = useState(0);
  const [endPosition, setEndPosition] = useState(100);
  const [startYear, setStartYear] = useState(initialStartYear || minYear);
  const [endYear, setEndYear] = useState(initialEndYear || maxYear);
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
      case 'purple':
        return {
          text: 'text-purple-700',
          textBold: 'text-purple-800',
          bgMed: 'bg-purple-600',
          bgLight: 'bg-purple-100',
          textLight: 'text-purple-600',
          borderActive: 'border-purple-600',
          borderInactive: 'border-purple-800',
          buttonBg: 'bg-purple-600',
          buttonHover: 'hover:bg-purple-700'
        };
      case 'indigo':
        return {
          text: 'text-indigo-700',
          textBold: 'text-indigo-800',
          bgMed: 'bg-indigo-600',
          bgLight: 'bg-indigo-100',
          textLight: 'text-indigo-600',
          borderActive: 'border-indigo-600',
          borderInactive: 'border-indigo-800',
          buttonBg: 'bg-indigo-600',
          buttonHover: 'hover:bg-indigo-700'
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
      case 'green':
        return {
          text: 'text-green-700',
          textBold: 'text-green-800',
          bgMed: 'bg-green-600',
          bgLight: 'bg-green-100',
          textLight: 'text-green-600',
          borderActive: 'border-green-600',
          borderInactive: 'border-green-800',
          buttonBg: 'bg-green-600',
          buttonHover: 'hover:bg-green-700'
        };
      case 'yellow':
        return {
          text: 'text-yellow-700',
          textBold: 'text-yellow-800',
          bgMed: 'bg-yellow-500',
          bgLight: 'bg-yellow-100',
          textLight: 'text-yellow-600',
          borderActive: 'border-yellow-500',
          borderInactive: 'border-yellow-700',
          buttonBg: 'bg-yellow-500',
          buttonHover: 'hover:bg-yellow-600'
        };
      case 'red':
        return {
          text: 'text-red-700',
          textBold: 'text-red-800',
          bgMed: 'bg-red-600',
          bgLight: 'bg-red-100',
          textLight: 'text-red-600',
          borderActive: 'border-red-600',
          borderInactive: 'border-red-800',
          buttonBg: 'bg-red-600',
          buttonHover: 'hover:bg-red-700'
        };
   case 'orange':
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
      case 'teal':
      default:
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
    }
  };

  const colors = getColors();
  
  // Initialize the slider positions based on the initial years
  useEffect(() => {
    if (sortedYears.length > 0) {
      // Set start position
      if (initialStartYear && sortedYears.includes(initialStartYear.toString())) {
        const yearIndex = sortedYears.indexOf(initialStartYear.toString());
        const percentage = (yearIndex / (sortedYears.length - 1)) * 100;
        setStartPosition(percentage);
        setStartYear(initialStartYear);
      } else {
        setStartYear(minYear);
        setStartPosition(0);
      }
      
      // Set end position
      if (initialEndYear && sortedYears.includes(initialEndYear.toString())) {
        const yearIndex = sortedYears.indexOf(initialEndYear.toString());
        const percentage = (yearIndex / (sortedYears.length - 1)) * 100;
        setEndPosition(percentage);
        setEndYear(initialEndYear);
      } else {
        setEndYear(maxYear);
        setEndPosition(100);
      }
    }
  }, [sortedYears, initialStartYear, initialEndYear, minYear, maxYear]);
  
  // Handler for when the position changes, updates the year
  const updateYearFromPosition = (position, isStart) => {
    const yearIndex = Math.round((position / 100) * (sortedYears.length - 1));
    const newYear = sortedYears[Math.min(Math.max(0, yearIndex), sortedYears.length - 1)];
    
    if (isStart) {
      setStartYear(newYear);
    } else {
      setEndYear(newYear);
    }
    
    // Notify parent of year range change
    if (onYearRangeChange) {
      onYearRangeChange({
        startYear: isStart ? newYear : startYear,
        endYear: isStart ? endYear : newYear
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
        updateYearFromPosition(percentage, true);
      } else {
        // Don't let end handle pass start handle
        percentage = Math.max(percentage, startPosition + 5);
        setEndPosition(percentage);
        updateYearFromPosition(percentage, false);
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
      updateYearFromPosition(percentage, true);
    } else {
      setEndPosition(percentage);
      updateYearFromPosition(percentage, false);
    }
  };
  
  // Add a useEffect to call onYearRangeChange when the component mounts
  // This ensures the parent component gets the initial year range
  useEffect(() => {
    if (onYearRangeChange && startYear && endYear) {
      onYearRangeChange({
        startYear,
        endYear
      });
    }
  }, []); // Run only once when the component mounts
  
  return (
    <div className="my-4">
      <div className="flex justify-between mb-1 items-center">
        <span className={colors.text}>{minYear}</span>
        <div className={`font-medium ${colors.textBold} ${colors.bgLight} px-3 py-1 rounded`}>
          {startYear} - {endYear}
        </div>
        <span className={colors.text}>{maxYear}</span>
      </div>
      
      <div 
        ref={sliderRef}
        className="relative h-12 cursor-pointer select-none" 
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
          className={`absolute top-1/2 h-8 w-8 bg-white border-2 ${
            activeDragHandle === 'start' ? colors.borderActive : colors.borderInactive
          } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md cursor-move z-20`}
          style={{ left: `${startPosition}%` }}
          onMouseDown={(e) => handleMouseDown(e, true)}
        ></div>
        
        {/* End Handle */}
        <div 
          className={`absolute top-1/2 h-8 w-8 bg-white border-2 ${
            activeDragHandle === 'end' ? colors.borderActive : colors.borderInactive
          } rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md cursor-move z-20`}
          style={{ left: `${endPosition}%` }}
          onMouseDown={(e) => handleMouseDown(e, false)}
        ></div>
        
        {/* Year markers */}
        {sortedYears.map((year, index) => {
          const position = (index / (sortedYears.length - 1)) * 100;
          const isInRange = position >= startPosition && position <= endPosition;
          
          return (
            <div 
              key={year}
              className={`absolute top-1/2 w-1 h-3 transform -translate-x-1/2 -translate-y-1/2 z-10 ${
                isInRange ? colors.bgMed : 'bg-gray-400'
              }`}
              style={{ left: `${position}%` }}
            >
              {/* Only show some year labels to avoid crowding */}
              {index % Math.ceil(sortedYears.length / 7) === 0 && (
                <div className={`absolute w-10 text-xs text-center -translate-x-1/2 mt-4 ${colors.text} font-medium`}>
                  {year}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Add a direct call button to ensure the range is applied */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            if (onYearRangeChange) {
              onYearRangeChange({
                startYear: startYear,
                endYear: endYear
              });
            }
          }}
          className={`px-3 py-1 ${colors.buttonBg} text-white rounded ${colors.buttonHover}`}
        >
          Apply Range
        </button>
      </div>
    </div>
  );
};

export default DualHandleYearSlider;