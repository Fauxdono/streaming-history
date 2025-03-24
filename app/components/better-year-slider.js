// In BetterYearSlider.js
import React, { useState, useEffect, useRef } from 'react';

const BetterYearSlider = ({ years, onYearChange, initialYear, colorTheme = 'teal' }) => {
  // Make sure we have an array of years and they're sorted
  const sortedYears = Array.isArray(years) ? 
    [...years].sort((a, b) => parseInt(a) - parseInt(b)) : [];
  
  // If no years, nothing to render
  if (sortedYears.length === 0) {
    return <div className={`text-${colorTheme}-700 italic`}>No year data available</div>;
  }
  
  const minYear = sortedYears[0];
  const maxYear = sortedYears[sortedYears.length - 1];
  
  // State for the slider position
  const [sliderPosition, setSliderPosition] = useState(0); // Start at the "All-Time" position (leftmost)
  const [selectedYear, setSelectedYear] = useState(initialYear || 'all');
  const sliderRef = useRef(null);

  // Map color theme to actual color values
  const getColors = () => {
    switch (colorTheme) {
      case 'pink':
        return {
          text: 'text-pink-700',
          textBold: 'text-pink-700',
          bg: 'bg-pink-600'
        };
      case 'purple':
        return {
          text: 'text-purple-700',
          textBold: 'text-purple-700',
          bg: 'bg-purple-600'
        };
      case 'indigo':
        return {
          text: 'text-indigo-700',
          textBold: 'text-indigo-700',
          bg: 'bg-indigo-600'
        };
      case 'blue':
        return {
          text: 'text-blue-700',
          textBold: 'text-blue-700',
          bg: 'bg-blue-600'
        };
      case 'green':
        return {
          text: 'text-green-700',
          textBold: 'text-green-700',
          bg: 'bg-green-600'
        };
      case 'yellow':
        return {
          text: 'text-yellow-700',
          textBold: 'text-yellow-700',
          bg: 'bg-yellow-500'
        };
      case 'red':
        return {
          text: 'text-red-700',
          textBold: 'text-red-700',
          bg: 'bg-red-600'
        };
    case 'orange':
        return {
          text: 'text-orange-700',
          textBold: 'text-orange-700',
          bg: 'bg-orange-600'
        };
      case 'teal':
      default:
        return {
          text: 'text-teal-700',
          textBold: 'text-teal-700',
          bg: 'bg-teal-600'
        };
    }
  };

  const colors = getColors();

  // Watch specifically for changes to initialYear
  useEffect(() => {
    if (initialYear === 'all') {
      // For "all", set position to leftmost (position 0)
      setSliderPosition(0);
      setSelectedYear('all');
    } else if (initialYear && sortedYears.includes(initialYear.toString())) {
      // Add 1 to account for the "All-Time" position at index 0
      const yearIndex = sortedYears.indexOf(initialYear.toString()) + 1;
      const totalPositions = sortedYears.length + 1; // +1 for "All-Time"
      const percentage = (yearIndex / (totalPositions - 1)) * 100;
      setSliderPosition(percentage);
      setSelectedYear(initialYear);
    } else {
      // Default to "All-Time"
      setSliderPosition(0);
      setSelectedYear('all');
    }
  }, [initialYear, sortedYears]);

  // Handle mouse drag on the slider
  const handleMouseDown = (e) => {
    const slider = sliderRef.current;
    if (!slider) return;
    
    const updateSlider = (e) => {
      const rect = slider.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      
      // Calculate position as percentage (0-100)
      let percentage = (x / width) * 100;
      percentage = Math.max(0, Math.min(100, percentage));
      setSliderPosition(percentage);
      
      // Total positions includes years + "All-Time"
      const totalPositions = sortedYears.length + 1;
      const positionIndex = Math.round((percentage / 100) * (totalPositions - 1));
      
      // If position is 0 (leftmost), it's "All-Time", otherwise it's a year
      if (positionIndex === 0) {
        setSelectedYear('all');
        // Notify parent
        if (onYearChange) {
          onYearChange('all');
        }
      } else {
        // Adjust index to account for "All-Time" at position 0
        const yearIndex = positionIndex - 1;
        const newYear = sortedYears[yearIndex];
        setSelectedYear(newYear);
        
        // Notify parent
        if (onYearChange) {
          onYearChange(newYear);
        }
      }
    };
    
    // Initial position update
    updateSlider(e);
    
    // Setup mousemove and mouseup handlers
    const handleMouseMove = (e) => {
      e.preventDefault(); // Prevent text selection while dragging
      updateSlider(e);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  return (
    <div className="my-4">
      <div className="flex justify-between mb-2">
        <span className={`${colors.text} font-bold`}>All-Time</span>
        <span className={`font-bold ${colors.textBold} year-display`}>
          {selectedYear === 'all' ? 'All-Time' : `Year: ${selectedYear}`}
        </span>
        <span className={colors.text}>{maxYear}</span>
      </div>
      <div 
        ref={sliderRef}
        className="relative h-8 cursor-pointer" 
        onMouseDown={handleMouseDown}
      >
        {/* Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-black transform -translate-y-1/2 rounded-full"></div>
        
        {/* Handle */}
        <div 
          className="absolute top-1/2 h-8 w-8 bg-white border-2 border-black rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md"
          style={{ left: `${sliderPosition}%` }}
        ></div>
        
        {/* All-Time marker */}
        <div 
          className={`absolute top-1/2 w-1 h-4 ${colors.bg} transform -translate-x-1/2 -translate-y-1/2`}
          style={{ left: '0%' }}
        />
        
        {/* Year markers */}
        {sortedYears.map((year, index) => {
          // Calculate position accounting for "All-Time" at position 0
          const totalPositions = sortedYears.length + 1;
          const position = ((index + 1) / (totalPositions - 1)) * 100;
          
          return (
            <div 
              key={year}
              className="absolute top-1/2 w-1 h-3 bg-black transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${position}%` }}
            >
              {/* Only show some year labels to avoid crowding */}
              {index % Math.ceil(sortedYears.length / 7) === 0 && (
                <div className={`absolute w-8 text-xs text-center -translate-x-1/2 mt-4 ${colors.text} font-medium`}>
                  {year}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BetterYearSlider;