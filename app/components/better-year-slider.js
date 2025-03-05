// In BetterYearSlider.js
import React, { useState, useEffect, useRef } from 'react';

const BetterYearSlider = ({ years, onYearChange, initialYear }) => {
  // Make sure we have an array of years and they're sorted
  const sortedYears = Array.isArray(years) ? 
    [...years].sort((a, b) => parseInt(a) - parseInt(b)) : [];
  
  // If no years, nothing to render
  if (sortedYears.length === 0) {
    return <div className="text-teal-700 italic">No year data available</div>;
  }
  
  const minYear = sortedYears[0];
  const maxYear = sortedYears[sortedYears.length - 1];
  
  // State for the slider position
  const [sliderPosition, setSliderPosition] = useState(50); // Start in the middle
  const [selectedYear, setSelectedYear] = useState(initialYear || minYear);
  // Add state to track if "all" is selected
  const [showingAllYears, setShowingAllYears] = useState(initialYear === 'all');
  const sliderRef = useRef(null);

  // Watch specifically for changes to initialYear, including when it changes to 'all'
  useEffect(() => {
    // Check if initialYear is 'all', which is a special case
    if (initialYear === 'all') {
      setShowingAllYears(true);
      setSelectedYear('all'); // Also update selectedYear to 'all'
      return;
    }
    
    setShowingAllYears(false);
    
    if (initialYear && sortedYears.includes(initialYear.toString())) {
      const yearIndex = sortedYears.indexOf(initialYear.toString());
      const percentage = (yearIndex / (sortedYears.length - 1)) * 100;
      setSliderPosition(percentage);
      setSelectedYear(initialYear);
    } else if (initialYear !== 'all') {
      // Default to the middle year only if initialYear is not 'all'
      const middleIndex = Math.floor(sortedYears.length / 2);
      setSelectedYear(sortedYears[middleIndex]);
      setSliderPosition((middleIndex / (sortedYears.length - 1)) * 100);
    }
  }, [initialYear, sortedYears]);
  
  // Handle mouse drag on the slider
  const handleMouseDown = (e) => {
    // When user interacts with slider, we're no longer showing all years
    setShowingAllYears(false);
    
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
      
      // Calculate which year this corresponds to
      const yearIndex = Math.round((percentage / 100) * (sortedYears.length - 1));
      const newYear = sortedYears[yearIndex];
      setSelectedYear(newYear);
      
      // Notify parent
      if (onYearChange) {
        onYearChange(newYear);
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
  <span className="text-teal-700">{minYear}</span>
  <span className="font-bold text-teal-700 year-display">
    {showingAllYears ? 'All-Time' : `Year: ${selectedYear}`}
  </span>
  <span className="text-teal-700">{maxYear}</span>
</div>
      <div 
        ref={sliderRef}
        className="relative h-8 cursor-pointer" 
        onMouseDown={handleMouseDown}
      >
        {/* Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-black transform -translate-y-1/2 rounded-full"></div>
        
        {/* Handle - only show if not in "all" mode */}
        {!showingAllYears && (
          <div 
            className="absolute top-1/2 h-8 w-8 bg-white border-2 border-black rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md"
            style={{ left: `${sliderPosition}%` }}
          ></div>
        )}
        
        {/* Year markers */}
        {sortedYears.map((year, index) => {
          const position = (index / (sortedYears.length - 1)) * 100;
          return (
            <div 
              key={year}
              className="absolute top-1/2 w-1 h-3 bg-black transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${position}%` }}
            >
              {index % Math.ceil(sortedYears.length / 5) === 0 && (
                <div className="absolute w-8 text-xs text-center -translate-x-1/2 mt-4">
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