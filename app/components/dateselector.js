import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';

const EnhancedDateSelector = ({ 
  startDate, 
  endDate, 
  setStartDate, 
  setEndDate, 
  setQuickRange,
  rawPlayData = []
}) => {
  // State for managing the year-month slider
  const [yearRangeMode, setYearRangeMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [yearRange, setYearRange] = useState({ startYear: '', endYear: '' });
  const [showDetailedDateFields, setShowDetailedDateFields] = useState(true);
  const sliderRef = useRef(null);
  const monthSliderRef = useRef(null);
  const [yearSliderPosition, setYearSliderPosition] = useState(0);
  const [monthSliderPosition, setMonthSliderPosition] = useState(0);
  
  // Extract all available years and months from data
  const timeRanges = useMemo(() => {
    const years = new Set();
    const monthsByYear = {};
    
    // Process all data to extract years and months
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        
        years.add(year);
        
        if (!monthsByYear[year]) {
          monthsByYear[year] = new Set();
        }
        monthsByYear[year].add(month);
      }
    });
    
    // Convert to sorted arrays
    const sortedYears = Array.from(years).sort((a, b) => a - b);
    
    // Convert month sets to sorted arrays
    const sortedMonthsByYear = {};
    Object.entries(monthsByYear).forEach(([year, monthsSet]) => {
      sortedMonthsByYear[year] = Array.from(monthsSet).sort((a, b) => a - b);
    });
    
    // Get min and max dates
    let minDate = null;
    let maxDate = null;
    
    if (sortedYears.length > 0) {
      const minYear = sortedYears[0];
      const maxYear = sortedYears[sortedYears.length - 1];
      
      const minMonth = sortedMonthsByYear[minYear][0];
      const maxMonth = sortedMonthsByYear[maxYear][sortedMonthsByYear[maxYear].length - 1];
      
      minDate = new Date(minYear, minMonth, 1);
      maxDate = new Date(maxYear, maxMonth + 1, 0); // Last day of max month
    }
    
    return {
      years: sortedYears,
      monthsByYear: sortedMonthsByYear,
      minDate: minDate ? minDate.toISOString().split('T')[0] : null,
      maxDate: maxDate ? maxDate.toISOString().split('T')[0] : null
    };
  }, [rawPlayData]);
  
  // Initialize years and date ranges when data is loaded
  useEffect(() => {
    if (timeRanges.minDate && timeRanges.maxDate && !startDate && !endDate) {
      setStartDate(timeRanges.minDate);
      setEndDate(timeRanges.maxDate);
    }
    
    if (timeRanges.years.length > 0 && yearRange.startYear === '' && yearRange.endYear === '') {
      setYearRange({
        startYear: timeRanges.years[0],
        endYear: timeRanges.years[timeRanges.years.length - 1]
      });
    }
  }, [timeRanges, startDate, endDate, yearRange, setStartDate, setEndDate]);
  
  // Function to adjust a date by a given number of days
  const adjustDate = (date, days) => {
    if (!date) return null;
    
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };
  
  // Handle year selection
  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    if (year === 'all') {
      setStartDate(timeRanges.minDate);
      setEndDate(timeRanges.maxDate);
      setSelectedMonth('all');
    } else {
      // Set date range to the entire year
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
      setSelectedMonth('all'); // Reset month selection
    }
  };
  
  // Handle month selection
  const handleMonthChange = (monthStr) => {
    const month = monthStr === 'all' ? 'all' : parseInt(monthStr);
    setSelectedMonth(month);
    
    if (month === 'all') {
      // Set to entire selected year
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
    } else {
      // Get days in month
      const monthNum = parseInt(month);
      const year = parseInt(selectedYear);
      const lastDay = new Date(year, monthNum + 1, 0).getDate();
      
      setStartDate(`${selectedYear}-${String(monthNum + 1).padStart(2, '0')}-01`);
      setEndDate(`${selectedYear}-${String(monthNum + 1).padStart(2, '0')}-${lastDay}`);
    }
  };
  
  // Get month name
  const getMonthName = (monthNum) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum];
  };
  
  // Handle mouse drag on the year slider
  const handleYearMouseDown = (e) => {
    const slider = sliderRef.current;
    if (!slider) return;
    
    const updateSlider = (e) => {
      const rect = slider.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      
      // Calculate position as percentage (0-100)
      let percentage = (x / width) * 100;
      percentage = Math.max(0, Math.min(100, percentage));
      setYearSliderPosition(percentage);
      
      // Total positions includes years + "All"
      const totalPositions = timeRanges.years.length + 1;
      const positionIndex = Math.round((percentage / 100) * (totalPositions - 1));
      
      // If position is 0 (leftmost), it's "All", otherwise it's a year
      if (positionIndex === 0) {
        setSelectedYear('all');
        handleYearChange('all');
      } else {
        // Adjust index to account for "All" at position 0
        const yearIndex = positionIndex - 1;
        const newYear = timeRanges.years[yearIndex];
        setSelectedYear(newYear);
        handleYearChange(newYear);
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
  
  // Handle mouse drag on the month slider
  const handleMonthMouseDown = (e) => {
    if (selectedYear === 'all') return; // Only active when a year is selected
    
    const slider = monthSliderRef.current;
    if (!slider) return;
    
    const updateSlider = (e) => {
      const rect = slider.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      
      // Calculate position as percentage (0-100)
      let percentage = (x / width) * 100;
      percentage = Math.max(0, Math.min(100, percentage));
      setMonthSliderPosition(percentage);
      
      // Get available months for selected year
      const availableMonths = timeRanges.monthsByYear[selectedYear] || [];
      
      // Total positions includes months + "All"
      const totalPositions = availableMonths.length + 1;
      const positionIndex = Math.round((percentage / 100) * (totalPositions - 1));
      
      // If position is 0 (leftmost), it's "All", otherwise it's a month
      if (positionIndex === 0) {
        setSelectedMonth('all');
        handleMonthChange('all');
      } else {
        // Adjust index to account for "All" at position 0
        const monthIndex = positionIndex - 1;
        const newMonth = availableMonths[monthIndex];
        setSelectedMonth(newMonth);
        handleMonthChange(newMonth.toString());
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
  
  // Update slider position when selectedYear changes
  useEffect(() => {
    if (selectedYear === 'all') {
      setYearSliderPosition(0);
    } else {
      const yearIndex = timeRanges.years.indexOf(parseInt(selectedYear));
      if (yearIndex !== -1) {
        const totalPositions = timeRanges.years.length + 1; // +1 for "All"
        const percentage = ((yearIndex + 1) / (totalPositions - 1)) * 100;
        setYearSliderPosition(percentage);
        
        // Reset month slider
        setMonthSliderPosition(0);
        setSelectedMonth('all');
      }
    }
  }, [selectedYear, timeRanges.years]);
  
  // Update month slider position when selectedMonth changes
  useEffect(() => {
    if (selectedMonth === 'all') {
      setMonthSliderPosition(0);
    } else if (selectedYear !== 'all') {
      const availableMonths = timeRanges.monthsByYear[selectedYear] || [];
      const monthIndex = availableMonths.indexOf(parseInt(selectedMonth));
      if (monthIndex !== -1) {
        const totalPositions = availableMonths.length + 1; // +1 for "All"
        const percentage = ((monthIndex + 1) / (totalPositions - 1)) * 100;
        setMonthSliderPosition(percentage);
      }
    }
  }, [selectedMonth, selectedYear, timeRanges.monthsByYear]);
  
  return (
    <div className="space-y-4">
      <div className="my-4">
        <div className="flex justify-between mb-2">
          <span className="text-orange-700 font-bold">All Years</span>
          <span className="font-bold text-orange-700 year-display">
            {selectedYear === 'all' ? 'All Years' : selectedMonth === 'all' ? `Year: ${selectedYear}` : `${getMonthName(parseInt(selectedMonth))} ${selectedYear}`}
          </span>
          <span className="text-orange-700">
            {timeRanges.years.length > 0 ? timeRanges.years[timeRanges.years.length - 1] : ''}
          </span>
        </div>
        <div 
          ref={sliderRef}
          className="relative h-8 cursor-pointer" 
          onMouseDown={handleYearMouseDown}
        >
          {/* Year slider line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-black transform -translate-y-1/2 rounded-full"></div>
          
          {/* Year slider handle */}
          <div 
            className="absolute top-1/2 h-8 w-8 bg-white border-2 border-black rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md"
            style={{ left: `${yearSliderPosition}%` }}
          ></div>
          
          {/* All-Time marker */}
          <div 
            className="absolute top-1/2 w-1 h-4 bg-orange-600 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: '0%' }}
          />
          
          {/* Year markers */}
          {timeRanges.years.map((year, index) => {
            // Calculate position accounting for "All" at position 0
            const totalPositions = timeRanges.years.length + 1;
            const position = ((index + 1) / (totalPositions - 1)) * 100;
            
            return (
              <div 
                key={year}
                className="absolute top-1/2 w-1 h-3 bg-black transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${position}%` }}
              >
                {/* Only show some year labels to avoid crowding */}
                {index % Math.ceil(timeRanges.years.length / 7) === 0 && (
                  <div className="absolute w-8 text-xs text-center -translate-x-1/2 mt-4 text-orange-700 font-medium">
                    {year}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Month slider - only visible when a year is selected */}
      {selectedYear !== 'all' && (
        <div className="my-4">
          <div className="flex justify-between mb-2">
            <span className="text-orange-700 font-bold">All Months</span>
            <span className="font-bold text-orange-700">
              {selectedMonth === 'all' ? 'All Months' : getMonthName(parseInt(selectedMonth))}
            </span>
            <span className="text-orange-700">
              {timeRanges.monthsByYear[selectedYear]?.length > 0 
                ? getMonthName(timeRanges.monthsByYear[selectedYear][timeRanges.monthsByYear[selectedYear].length - 1]) 
                : 'Dec'}
            </span>
          </div>
          <div 
            ref={monthSliderRef}
            className="relative h-6 cursor-pointer" 
            onMouseDown={handleMonthMouseDown}
          >
            {/* Month slider line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-orange-300 transform -translate-y-1/2 rounded-full"></div>
            
            {/* Month slider handle */}
            <div 
              className="absolute top-1/2 h-6 w-6 bg-white border-2 border-orange-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md"
              style={{ left: `${monthSliderPosition}%` }}
            ></div>
            
            {/* All-Months marker */}
            <div 
              className="absolute top-1/2 w-1 h-3 bg-orange-400 transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: '0%' }}
            />
            
            {/* Month markers */}
            {(timeRanges.monthsByYear[selectedYear] || []).map((month, index) => {
              // Calculate position accounting for "All" at position 0
              const totalPositions = (timeRanges.monthsByYear[selectedYear] || []).length + 1;
              const position = ((index + 1) / (totalPositions - 1)) * 100;
              
              return (
                <div 
                  key={month}
                  className="absolute top-1/2 w-1 h-2 bg-orange-400 transform -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${position}%` }}
                >
                  {/* Only show some month labels to avoid crowding */}
                  {index % Math.ceil((timeRanges.monthsByYear[selectedYear] || []).length / 4) === 0 && (
                    <div className="absolute w-8 text-xs text-center -translate-x-1/2 mt-3 text-orange-600 font-medium">
                      {getMonthName(month).substring(0, 3)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Quick date range buttons */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            setSelectedYear('all');
            setSelectedMonth('all');
            setStartDate(timeRanges.minDate);
            setEndDate(timeRanges.maxDate);
          }}
          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Show All Time
        </button>
      </div>
      
      {/* Detailed date selectors (day precision) */}
      {showDetailedDateFields && (
        <div className="space-y-3 mt-3 border-t border-orange-200 pt-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-orange-700">Precise Date Selection</h3>
            <button
              onClick={() => setShowDetailedDateFields(!showDetailedDateFields)}
              className="text-orange-600 hover:text-orange-800 flex items-center gap-1"
            >
              <Calendar size={16} />
              {showDetailedDateFields ? 'Hide' : 'Show'} Detailed Dates
            </button>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
                min={timeRanges.minDate}
                max={endDate}
              />
              
              <span className="mx-2 text-orange-700">to</span>
              
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
                min={startDate}
                max={timeRanges.maxDate}
              />
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  setStartDate(adjustDate(startDate, -1));
                  setEndDate(adjustDate(endDate, -1));
                }}
                className="p-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
                title="Previous day"
              >
                <ChevronDown size={18} />
              </button>
              <button 
                onClick={() => {
                  setStartDate(adjustDate(startDate, 1));
                  setEndDate(adjustDate(endDate, 1));
                }}
                className="p-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
                title="Next day"
              >
                <ChevronUp size={18} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setQuickRange(1)}
              className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              title="Today"
            >
              Day
            </button>
            <button 
              onClick={() => setQuickRange(7)}
              className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              title="Last 7 days"
            >
              Week
            </button>
            <button 
              onClick={() => setQuickRange(30)}
              className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              title="Last 30 days"
            >
              Month
            </button>
            <button 
              onClick={() => setQuickRange(90)}
              className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              title="Last 90 days"
            >
              Quarter
            </button>
            <button 
              onClick={() => setQuickRange(365)}
              className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              title="Last 365 days"
            >
              Year
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDateSelector;