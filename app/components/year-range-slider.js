import React, { useState, useEffect } from 'react';

const YearRangeSlider = ({ years, onYearRangeChange }) => {
  // Debug logs to help troubleshoot
  console.log("YearRangeSlider - received years:", years);
  
  // Ensure years is an array and has values
  const yearsArray = Array.isArray(years) ? years : 
                    (typeof years === 'object' ? Object.keys(years) : []);
  
  console.log("YearRangeSlider - yearsArray:", yearsArray);
  
  // Make sure to parse years as integers for correct sorting
  const sortedYears = yearsArray.length > 0 ? 
    [...yearsArray].sort((a, b) => parseInt(a) - parseInt(b)) : [];
  
  console.log("YearRangeSlider - sortedYears:", sortedYears);
  
  // Initialize state with empty strings if no years available
  const [startYear, setStartYear] = useState('');
  const [endYear, setEndYear] = useState('');
  
  // Initialize values once sortedYears is available
  useEffect(() => {
    if (sortedYears.length > 0 && !startYear && !endYear) {
      console.log("YearRangeSlider - initializing with:", sortedYears[0], sortedYears[sortedYears.length - 1]);
      setStartYear(sortedYears[0]);
      setEndYear(sortedYears[sortedYears.length - 1]);
    }
  }, [sortedYears, startYear, endYear]);
  
  // Handle changes to the start year slider with validation
  const handleStartYearChange = (e) => {
    const newStartYear = e.target.value;
    console.log("YearRangeSlider - new start year:", newStartYear);
    
    // Ensure start year doesn't exceed end year
    if (parseInt(newStartYear) <= parseInt(endYear)) {
      setStartYear(newStartYear);
    }
  };
  
  // Handle changes to the end year slider with validation
  const handleEndYearChange = (e) => {
    const newEndYear = e.target.value;
    console.log("YearRangeSlider - new end year:", newEndYear);
    
    // Ensure end year isn't less than start year
    if (parseInt(newEndYear) >= parseInt(startYear)) {
      setEndYear(newEndYear);
    }
  };
  
  // Notify parent component of range changes
  useEffect(() => {
    if (startYear && endYear) {
      console.log("YearRangeSlider - notifying parent of change:", { startYear, endYear });
      onYearRangeChange({ startYear, endYear });
    }
  }, [startYear, endYear, onYearRangeChange]);
  
  // If no years available, show a message
  if (sortedYears.length === 0) {
    return No year data available (0 years);
  }
  
  // If only one year, show a simplified UI
  if (sortedYears.length === 1) {
    return (
      
        Only one year available: {sortedYears[0]}
        <button
          onClick={() => onYearRangeChange({ startYear: sortedYears[0], endYear: sortedYears[0] })}
          className="px-2 py-1 rounded text-sm bg-teal-600 text-white hover:bg-teal-700"
        >
          Select This Year
        
      
    );
  }
  
  return (
    
      
        Year Range: {startYear} - {endYear}
        <button
          onClick={() => {
            setStartYear(sortedYears[0]);
            setEndYear(sortedYears[sortedYears.length - 1]);
          }}
          className="px-2 py-1 rounded text-sm bg-teal-600 text-white hover:bg-teal-700"
        >
          Reset
        
      
      
      
        {/* Start Year Slider */}
        
          
            Start Year: {startYear}
            End Year: {endYear}
          
          
            
              
              
            
          
        
        
        {/* Year Markers */}
        
          {sortedYears.map((year) => (
            
              {year}
              = parseInt(startYear) && parseInt(year) <= parseInt(endYear)
                    ? 'bg-teal-600' 
                    : 'bg-teal-200'
                }`}
              />
            
          ))}
        
      
    
  );
};

export default YearRangeSlider;