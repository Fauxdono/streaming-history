import React, { useState, useEffect } from 'react';

const YearRangeSlider = ({ years, onYearRangeChange }) => {
  // Add console logs to check what's coming in
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
    return <div className="text-teal-700 italic text-sm">No year data available (0 years)</div>;
  }
  
  // If only one year, show a simplified UI
  if (sortedYears.length === 1) {
    return (
      <div className="text-teal-700">
        <p>Only one year available: {sortedYears[0]}</p>
        <button
          onClick={() => onYearRangeChange({ startYear: sortedYears[0], endYear: sortedYears[0] })}
          className="px-2 py-1 rounded text-sm bg-teal-600 text-white hover:bg-teal-700"
        >
          Select This Year
        </button>
      </div>
    );
  }
  
  return (
    <div className="mt-2 mb-4 w-full">
      <div className="flex justify-between items-center mb-2">
        <label className="text-teal-700 font-medium">Year Range: {startYear} - {endYear}</label>
        <button
          onClick={() => {
            setStartYear(sortedYears[0]);
            setEndYear(sortedYears[sortedYears.length - 1]);
          }}
          className="px-2 py-1 rounded text-sm bg-teal-600 text-white hover:bg-teal-700"
        >
          Reset
        </button>
      </div>
      
      <div className="space-y-3">
        {/* Start Year Slider */}
        <div>
          <div className="flex justify-between items-center text-sm text-teal-700 mb-1">
            <span>Start Year: {startYear}</span>
            <span>End Year: {endYear}</span>
          </div>
          <div className="relative pt-1">
            <div className="flex flex-col">
              <input
                type="range"
                min={sortedYears[0]}
                max={sortedYears[sortedYears.length - 1]}
                value={startYear}
                onChange={handleStartYearChange}
                step="1"
                className="w-full h-2 appearance-none cursor-pointer bg-teal-200 rounded-full outline-none"
              />
              <input
                type="range"
                min={sortedYears[0]}
                max={sortedYears[sortedYears.length - 1]}
                value={endYear}
                onChange={handleEndYearChange}
                step="1"
                className="w-full h-2 appearance-none cursor-pointer bg-teal-200 rounded-full outline-none mt-2"
              />
            </div>
          </div>
        </div>
        
        {/* Year Markers */}
        <div className="relative flex justify-between mt-1">
          {sortedYears.map((year) => (
            <div
              key={year}
              className="flex flex-col items-center"
            >
              <div className="text-xs text-teal-700">{year}</div>
              <div 
                className={`w-1 h-2 ${
                  parseInt(year) >= parseInt(startYear) && parseInt(year) <= parseInt(endYear)
                    ? 'bg-teal-600' 
                    : 'bg-teal-200'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default YearRangeSlider;