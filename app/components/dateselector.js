import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const HierarchicalDateSelector = ({ 
  startDate, 
  endDate, 
  setStartDate, 
  setEndDate, 
  rawPlayData = [],
  formatDuration = (ms) => `${Math.floor(ms / 60000)}m`
}) => {
  // States for each level
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Data analysis for date availability
  const dateData = useMemo(() => {
    const years = new Set();
    const monthsByYear = {};
    const daysByYearMonth = {};
    const playsCountByDate = {};
    const timeByDate = {};
    
    // Process raw data
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        try {
          const date = new Date(entry.ts);
          if (isNaN(date.getTime())) return; // Skip invalid dates
          
          const year = date.getFullYear();
          const month = date.getMonth(); // 0-11
          const day = date.getDate(); // 1-31
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Track years
          years.add(year);
          
          // Track months by year
          if (!monthsByYear[year]) {
            monthsByYear[year] = new Set();
          }
          monthsByYear[year].add(month);
          
          // Track days by year-month
          const yearMonthKey = `${year}-${month}`;
          if (!daysByYearMonth[yearMonthKey]) {
            daysByYearMonth[yearMonthKey] = new Set();
          }
          daysByYearMonth[yearMonthKey].add(day);
          
          // Track play counts by date
          if (!playsCountByDate[dateStr]) {
            playsCountByDate[dateStr] = 0;
            timeByDate[dateStr] = 0;
          }
          playsCountByDate[dateStr]++;
          timeByDate[dateStr] += entry.ms_played;
        } catch (err) {
          console.warn("Error processing date:", err);
        }
      }
    });
    
    // Convert to sorted arrays
    const sortedYears = Array.from(years).sort((a, b) => a - b);
    
    // Process months
    const monthsArray = {};
    Object.entries(monthsByYear).forEach(([year, months]) => {
      monthsArray[year] = Array.from(months).sort((a, b) => a - b);
    });
    
    // Process days
    const daysArray = {};
    Object.entries(daysByYearMonth).forEach(([yearMonth, days]) => {
      daysArray[yearMonth] = Array.from(days).sort((a, b) => a - b);
    });
    
    // Find min and max dates
    let minDate = null;
    let maxDate = null;
    
    if (sortedYears.length > 0) {
      const minYear = sortedYears[0];
      const maxYear = sortedYears[sortedYears.length - 1];
      
      if (monthsArray[minYear]?.length > 0) {
        const minMonth = monthsArray[minYear][0];
        const maxMonth = monthsArray[maxYear][monthsArray[maxYear].length - 1];
        
        const minYearMonthKey = `${minYear}-${minMonth}`;
        const maxYearMonthKey = `${maxYear}-${maxMonth}`;
        
        if (daysArray[minYearMonthKey]?.length > 0 && daysArray[maxYearMonthKey]?.length > 0) {
          const minDay = daysArray[minYearMonthKey][0];
          const maxDay = daysArray[maxYearMonthKey][daysArray[maxYearMonthKey].length - 1];
          
          minDate = new Date(minYear, minMonth, minDay);
          maxDate = new Date(maxYear, maxMonth, maxDay);
        }
      }
    }
    
    return {
      years: sortedYears,
      monthsByYear: monthsArray,
      daysByYearMonth: daysArray,
      playsCountByDate,
      timeByDate,
      minDate: minDate ? minDate.toISOString().split('T')[0] : null,
      maxDate: maxDate ? maxDate.toISOString().split('T')[0] : null
    };
  }, [rawPlayData]);
  
  // Initialize dates and selections based on available data
  useEffect(() => {
    if (dateData.minDate && dateData.maxDate) {
      if (!startDate && !endDate) {
        // Initialize with the full date range
        setStartDate(dateData.minDate);
        setEndDate(dateData.maxDate);
      } else if (startDate && !selectedYear) {
        // Extract selected year from startDate
        const startDateObj = new Date(startDate);
        const year = startDateObj.getFullYear();
        
        if (dateData.years.includes(year)) {
          setSelectedYear(year);
          
          // Check if we should also set a month
          const month = startDateObj.getMonth();
          if (dateData.monthsByYear[year]?.includes(month)) {
            setSelectedMonth(month);
            
            // Check if we should also set a day
            const day = startDateObj.getDate();
            const yearMonthKey = `${year}-${month}`;
            if (dateData.daysByYearMonth[yearMonthKey]?.includes(day)) {
              setSelectedDay(day);
            }
          }
        }
      }
    }
  }, [dateData, startDate, endDate, setStartDate, setEndDate, selectedYear]);
  
  // Get month name
  const getMonthName = (monthNum) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum];
  };
  
  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = getMonthName(date.getMonth());
    const day = date.getDate();
    
    return `${month} ${day}, ${year}`;
  };
  
  // Handle year selection
  const handleYearSelect = (year) => {
    setSelectedYear(year);
    
    // Reset month and day selections
    setSelectedMonth(null);
    setSelectedDay(null);
    
    // Set date range to the entire year
    setStartDate(`${year}-01-01`);
    
    // Set end date to the last day of the year
    const lastDay = new Date(year, 11, 31);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };
  
  // Handle month selection
  const handleMonthSelect = (month) => {
    if (!selectedYear) return;
    
    setSelectedMonth(month);
    
    // Reset day selection
    setSelectedDay(null);
    
    // Set date range to the entire month
    setStartDate(`${selectedYear}-${String(month + 1).padStart(2, '0')}-01`);
    
    // Set end date to the last day of the month
    const lastDay = new Date(selectedYear, month + 1, 0);
    setEndDate(`${selectedYear}-${String(month + 1).padStart(2, '0')}-${lastDay.getDate()}`);
  };
  
  // Handle day selection
  const handleDaySelect = (day) => {
    if (!selectedYear || selectedMonth === null) return;
    
    setSelectedDay(day);
    
    // Set both start and end dates to the selected day
    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setStartDate(dateStr);
    setEndDate(dateStr);
  };
  
  // Calculate month slider position and percentage
  const getMonthPercentage = (month) => {
    if (selectedYear === null || !dateData.monthsByYear[selectedYear]) return '0%';
    
    const availableMonths = dateData.monthsByYear[selectedYear];
    
    if (availableMonths.length === 0) return '0%';
    
    // Default to the first month if no month selected
    const activeMonth = selectedMonth !== null ? selectedMonth : availableMonths[0];
    const minMonth = availableMonths[0];
    const maxMonth = availableMonths[availableMonths.length - 1];
    
    const percentage = ((activeMonth - minMonth) / Math.max(1, maxMonth - minMonth)) * 100;
    return `${percentage}%`;
  };
  
  // Calculate day slider position and percentage
  const getDayPercentage = () => {
    if (selectedYear === null || selectedMonth === null) return '0%';
    
    const yearMonthKey = `${selectedYear}-${selectedMonth}`;
    const availableDays = dateData.daysByYearMonth[yearMonthKey];
    
    if (!availableDays || availableDays.length === 0) return '0%';
    
    // Default to the first day if no day selected
    const activeDay = selectedDay !== null ? selectedDay : availableDays[0];
    const minDay = availableDays[0];
    const maxDay = availableDays[availableDays.length - 1];
    
    const percentage = ((activeDay - minDay) / Math.max(1, maxDay - minDay)) * 100;
    return `${percentage}%`;
  };
  
  // Reset to all time
  const handleResetToAllTime = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    setStartDate(dateData.minDate);
    setEndDate(dateData.maxDate);
  };
  
  // Generate details about the selected date range
  const getDateRangeDetails = () => {
    if (!startDate || !endDate) return '';
    
    // Check if it's all time
    if (startDate === dateData.minDate && endDate === dateData.maxDate) {
      return 'All Time';
    }
    
    // Check if it's a single day
    if (startDate === endDate) {
      return `Single Day: ${formatDate(startDate)}`;
    }
    
    // Check if it's a full month
    if (selectedYear !== null && selectedMonth !== null && selectedDay === null) {
      return `${getMonthName(selectedMonth)} ${selectedYear}`;
    }
    
    // Check if it's a full year
    if (selectedYear !== null && selectedMonth === null) {
      return `Full Year: ${selectedYear}`;
    }
    
    // Default: show date range
    return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  };
  
  // Calculate statistics for the selected range
  const getRangeStatistics = () => {
    if (!startDate || !endDate) return { totalPlays: 0, totalTime: 0 };
    
    let totalPlays = 0;
    let totalTime = 0;
    
    // Loop through dates in the selected range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (const dateStr in dateData.playsCountByDate) {
      const date = new Date(dateStr);
      if (date >= start && date <= end) {
        totalPlays += dateData.playsCountByDate[dateStr];
        totalTime += dateData.timeByDate[dateStr];
      }
    }
    
    return { totalPlays, totalTime };
  };
  
  const stats = getRangeStatistics();
  
  return (
    <div className="space-y-6 bg-orange-50 p-4 rounded-lg border border-orange-200">
      {/* Current Selection */}
      <div>
        <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {getDateRangeDetails()}
        </h3>
        <div className="text-sm text-orange-600 mt-1">
          {stats.totalPlays} plays • {formatDuration(stats.totalTime)} listening time
        </div>
      </div>
      
      {/* Year Slider */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <h4 className="font-medium text-orange-700">Year Selection</h4>
          {selectedYear && (
            <button 
              onClick={handleResetToAllTime}
              className="text-sm text-orange-600 hover:text-orange-800"
            >
              Reset to All Time
            </button>
          )}
        </div>
        
        <div className="relative h-10 bg-orange-100 rounded-full p-2">
          {dateData.years.length > 0 ? (
            <>
              {/* Year ticks and labels */}
              <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex justify-between px-2">
                {dateData.years.map((year, index) => (
                  <div 
                    key={year} 
                    className={`h-6 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${
                      selectedYear === year ? 'text-orange-800 font-bold' : 'text-orange-600'
                    }`}
                    style={{ 
                      position: 'absolute', 
                      left: `${(index / (dateData.years.length - 1)) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                    onClick={() => handleYearSelect(year)}
                  >
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        selectedYear === year ? 'bg-orange-500' : 'bg-orange-300 hover:bg-orange-400'
                      }`}
                    />
                    <span className="text-xs mt-1 whitespace-nowrap">{year}</span>
                  </div>
                ))}
              </div>
              
              {/* Active year indicator */}
              {selectedYear !== null && (
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-orange-500 rounded-full border-2 border-white shadow-md z-10"
                  style={{ 
                    left: `${(dateData.years.indexOf(selectedYear) / (dateData.years.length - 1)) * 100}%` 
                  }}
                />
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-orange-500 text-sm font-medium">
              No date data available
            </div>
          )}
        </div>
      </div>
      
      {/* Month Slider - Only show if a year is selected */}
      {selectedYear !== null && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <h4 className="font-medium text-orange-700">Month Selection</h4>
            {selectedMonth !== null && (
              <button 
                onClick={() => {
                  setSelectedMonth(null);
                  setSelectedDay(null);
                  handleYearSelect(selectedYear);
                }}
                className="text-sm text-orange-600 hover:text-orange-800"
              >
                Reset to Full Year
              </button>
            )}
          </div>
          
          <div className="relative h-10 bg-orange-100 rounded-full p-2">
            {dateData.monthsByYear[selectedYear]?.length > 0 ? (
              <>
                {/* Month ticks and labels */}
                <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex justify-between px-2">
                  {dateData.monthsByYear[selectedYear].map((month, index, arr) => (
                    <div 
                      key={month} 
                      className={`h-6 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${
                        selectedMonth === month ? 'text-orange-800 font-bold' : 'text-orange-600'
                      }`}
                      style={{ 
                        position: 'absolute', 
                        left: `${(index / (arr.length - 1)) * 100}%`,
                        transform: 'translateX(-50%)'
                      }}
                      onClick={() => handleMonthSelect(month)}
                    >
                      <div 
                        className={`w-3 h-3 rounded-full ${
                          selectedMonth === month ? 'bg-orange-500' : 'bg-orange-300 hover:bg-orange-400'
                        }`}
                      />
                      <span className="text-xs mt-1 whitespace-nowrap">{getMonthName(month).substring(0, 3)}</span>
                    </div>
                  ))}
                </div>
                
                {/* Active month indicator */}
                {selectedMonth !== null && (
                  <div 
                    className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-orange-500 rounded-full border-2 border-white shadow-md z-10"
                    style={{ 
                      left: getMonthPercentage() 
                    }}
                  />
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-orange-500 text-sm font-medium">
                No month data available for {selectedYear}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Day Slider - Only show if a month is selected */}
      {selectedYear !== null && selectedMonth !== null && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <h4 className="font-medium text-orange-700">Day Selection</h4>
            {selectedDay !== null && (
              <button 
                onClick={() => {
                  setSelectedDay(null);
                  handleMonthSelect(selectedMonth);
                }}
                className="text-sm text-orange-600 hover:text-orange-800"
              >
                Reset to Full Month
              </button>
            )}
          </div>
          
          <div className="relative h-10 bg-orange-100 rounded-full p-2">
            {(() => {
              const yearMonthKey = `${selectedYear}-${selectedMonth}`;
              const availableDays = dateData.daysByYearMonth[yearMonthKey];
              
              if (availableDays && availableDays.length > 0) {
                return (
                  <>
                    {/* Day ticks and labels */}
                    <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex justify-between px-2">
                      {availableDays.map((day, index, arr) => (
                        <div 
                          key={day} 
                          className={`h-6 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${
                            selectedDay === day ? 'text-orange-800 font-bold' : 'text-orange-600'
                          }`}
                          style={{ 
                            position: 'absolute', 
                            left: `${(index / (arr.length - 1)) * 100}%`,
                            transform: 'translateX(-50%)'
                          }}
                          onClick={() => handleDaySelect(day)}
                        >
                          <div 
                            className={`w-2 h-2 rounded-full ${
                              selectedDay === day ? 'bg-orange-500' : 'bg-orange-300 hover:bg-orange-400'
                            }`}
                          />
                          <span className="text-xs mt-1">{day}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Active day indicator */}
                    {selectedDay !== null && (
                      <div 
                        className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-md z-10"
                        style={{ 
                          left: getDayPercentage() 
                        }}
                      />
                    )}
                  </>
                );
              } else {
                return (
                  <div className="flex items-center justify-center h-full text-orange-500 text-sm font-medium">
                    No day data available for {getMonthName(selectedMonth)} {selectedYear}
                  </div>
                );
              }
            })()}
          </div>
        </div>
      )}
      
      {/* Quick Selection Buttons */}
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={handleResetToAllTime}
          className="px-3 py-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
        >
          All Time
        </button>
        
        {/* Only show year buttons if we have at least 2 years */}
        {dateData.years.length >= 2 && (
          <>
            {/* Last year button */}
            <button 
              onClick={() => handleYearSelect(dateData.years[dateData.years.length - 1])}
              className="px-3 py-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
            >
              {dateData.years[dateData.years.length - 1]}
            </button>
            
            {/* Previous year button if available */}
            {dateData.years.length >= 2 && (
              <button 
                onClick={() => handleYearSelect(dateData.years[dateData.years.length - 2])}
                className="px-3 py-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
              >
                {dateData.years[dateData.years.length - 2]}
              </button>
            )}
          </>
        )}
        
        {/* Show current month button if a year is selected */}
        {selectedYear !== null && dateData.monthsByYear[selectedYear]?.length > 0 && (
          <button
            onClick={() => handleMonthSelect(dateData.monthsByYear[selectedYear][dateData.monthsByYear[selectedYear].length - 1])}
            className="px-3 py-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
          >
            Latest Month
          </button>
        )}
      </div>
    </div>
  );
};

export default HierarchicalDateSelector;