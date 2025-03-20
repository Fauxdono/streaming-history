import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const ImprovedDateSelector = ({ 
  startDate, 
  endDate, 
  setStartDate, 
  setEndDate, 
  setQuickRange,
  rawPlayData = []
}) => {
  // State for managing different selection modes
  const [selectionMode, setSelectionMode] = useState('all'); // 'all', 'year', 'month', 'day', 'range'
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [yearRange, setYearRange] = useState({ startYear: '', endYear: '' });
  const [monthRange, setMonthRange] = useState({ startMonth: '', endMonth: '' });
  const [showDetailedDateFields, setShowDetailedDateFields] = useState(true);
  const [calendarView, setCalendarView] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  
  // Extract all available years, months, and days from data
  const timeRanges = useMemo(() => {
    const years = new Set();
    const monthsByYear = {};
    const daysByYearMonth = {};
    
    // Process all data to extract time information
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        const date = new Date(entry.ts);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        const day = date.getDate(); // 1-31
        
        years.add(year);
        
        if (!monthsByYear[year]) {
          monthsByYear[year] = new Set();
        }
        monthsByYear[year].add(month);
        
        const yearMonthKey = `${year}-${month}`;
        if (!daysByYearMonth[yearMonthKey]) {
          daysByYearMonth[yearMonthKey] = new Set();
        }
        daysByYearMonth[yearMonthKey].add(day);
      }
    });
    
    // Convert to sorted arrays
    const sortedYears = Array.from(years).sort((a, b) => a - b);
    
    // Convert month sets to sorted arrays
    const sortedMonthsByYear = {};
    Object.entries(monthsByYear).forEach(([year, monthsSet]) => {
      sortedMonthsByYear[year] = Array.from(monthsSet).sort((a, b) => a - b);
    });
    
    // Convert day sets to sorted arrays
    const sortedDaysByYearMonth = {};
    Object.entries(daysByYearMonth).forEach(([yearMonth, daysSet]) => {
      sortedDaysByYearMonth[yearMonth] = Array.from(daysSet).sort((a, b) => a - b);
    });
    
    // Get min and max dates
    let minDate = null;
    let maxDate = null;
    
    if (sortedYears.length > 0) {
      const minYear = sortedYears[0];
      const maxYear = sortedYears[sortedYears.length - 1];
      
      const minMonth = sortedMonthsByYear[minYear][0];
      const maxMonth = sortedMonthsByYear[maxYear][sortedMonthsByYear[maxYear].length - 1];
      
      const minYearMonthKey = `${minYear}-${minMonth}`;
      const maxYearMonthKey = `${maxYear}-${maxMonth}`;
      
      const minDay = sortedDaysByYearMonth[minYearMonthKey][0];
      const maxDay = sortedDaysByYearMonth[maxYearMonthKey][sortedDaysByYearMonth[maxYearMonthKey].length - 1];
      
      minDate = new Date(minYear, minMonth, minDay);
      maxDate = new Date(maxYear, maxMonth, maxDay);
    }
    
    return {
      years: sortedYears,
      monthsByYear: sortedMonthsByYear,
      daysByYearMonth: sortedDaysByYearMonth,
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
    
    // Set view date to current or latest date
    if (timeRanges.maxDate) {
      setViewDate(new Date(timeRanges.maxDate));
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
  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setSelectionMode('year');
    
    if (year === 'all') {
      setStartDate(timeRanges.minDate);
      setEndDate(timeRanges.maxDate);
      setSelectedMonth(null);
      setSelectedDay(null);
    } else {
      // Set date range to the entire year
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
      setSelectedMonth(null); // Reset month and day selection
      setSelectedDay(null);
    }
  };
  
  // Handle month selection
  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setSelectionMode('month');
    
    if (!selectedYear) {
      // If no year selected, do nothing
      return;
    }
    
    if (month === 'all') {
      // Set to entire selected year
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
      setSelectedDay(null);
    } else {
      // Get days in month
      const monthNum = parseInt(month);
      const year = parseInt(selectedYear);
      const lastDay = new Date(year, monthNum + 1, 0).getDate();
      
      setStartDate(`${selectedYear}-${String(monthNum + 1).padStart(2, '0')}-01`);
      setEndDate(`${selectedYear}-${String(monthNum + 1).padStart(2, '0')}-${lastDay}`);
      setSelectedDay(null);
    }
  };
  
  // Handle day selection
  const handleDaySelect = (day) => {
    setSelectedDay(day);
    setSelectionMode('day');
    
    if (!selectedYear || selectedMonth === null) {
      // If no year or month selected, do nothing
      return;
    }
    
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setStartDate(dateStr);
    setEndDate(dateStr);
  };
  
  // Handle year range selection
  const handleYearRangeSelect = (startYear, endYear) => {
    setYearRange({ startYear, endYear });
    setSelectionMode('range');
    
    // Update the date fields
    setStartDate(`${startYear}-01-01`);
    setEndDate(`${endYear}-12-31`);
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
  };
  
  // Handle month range selection
  const handleMonthRangeSelect = (startMonth, endMonth) => {
    if (!selectedYear) return;
    
    setMonthRange({ startMonth, endMonth });
    setSelectionMode('monthRange');
    
    const startMonthNum = parseInt(startMonth);
    const endMonthNum = parseInt(endMonth);
    
    // Set date range from start of first month to end of last month
    setStartDate(`${selectedYear}-${String(startMonthNum + 1).padStart(2, '0')}-01`);
    
    // Calculate last day of end month
    const lastDay = new Date(parseInt(selectedYear), endMonthNum + 1, 0).getDate();
    setEndDate(`${selectedYear}-${String(endMonthNum + 1).padStart(2, '0')}-${lastDay}`);
    
    setSelectedMonth(null);
    setSelectedDay(null);
  };
  
  // Navigate calendar
  const navigateMonth = (direction) => {
    const newDate = new Date(viewDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setViewDate(newDate);
  };
  
  // Check if a specific day has data
  const hasDayData = (year, month, day) => {
    const yearMonthKey = `${year}-${month}`;
    return timeRanges.daysByYearMonth[yearMonthKey]?.includes(day) || false;
  };
  
  // Get all days in the current view month
  const getDaysInMonth = (year, month) => {
    // Get the number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Get the day of the week for the first day of the month
    const firstDay = new Date(year, month, 1).getDay();
    
    // Create an array with the days of the month
    const days = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };
  
  // Get month name
  const getMonthName = (monthNum) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum];
  };
  
  // Check if a date is in the selected range
  const isInRange = (year, month, day) => {
    if (!startDate || !endDate) return false;
    
    const date = new Date(year, month, day);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return date >= start && date <= end;
  };
  
  // Render calendar
  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = getDaysInMonth(year, month);
    
    return (
      <div className="calendar mt-2">
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={() => navigateMonth('prev')}
            className="p-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="font-bold text-orange-700">
            {getMonthName(month)} {year}
          </div>
          
          <button 
            onClick={() => navigateMonth('next')}
            className="p-1 bg-orange-200 text-orange-700 rounded hover:bg-orange-300"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-xs text-orange-700 font-bold">{day}</div>
          ))}
          
          {days.map((day, index) => (
            <div 
              key={index}
              className={`
                p-1 text-center text-sm rounded 
                ${day === null ? 'invisible' : 'cursor-pointer'} 
                ${day !== null && hasDayData(year, month, day) ? 'font-medium' : 'opacity-50'}
                ${day !== null && hasDayData(year, month, day) && isInRange(year, month, day) ? 'bg-orange-500 text-white' : ''}
                ${day !== null && hasDayData(year, month, day) && !isInRange(year, month, day) ? 'hover:bg-orange-100' : ''}
              `}
              onClick={() => {
                if (day !== null && hasDayData(year, month, day)) {
                  handleDaySelect(day);
                  setViewDate(new Date(year, month, day));
                }
              }}
            >
              {day}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Selection Mode Tabs */}
      <div className="flex border-b mb-2">
        <button
          onClick={() => {
            setSelectionMode('all');
            setStartDate(timeRanges.minDate);
            setEndDate(timeRanges.maxDate);
            setSelectedYear(null);
            setSelectedMonth(null);
            setSelectedDay(null);
          }}
          className={`px-3 py-1 font-medium ${
            selectionMode === 'all' 
              ? 'text-orange-600 border-b-2 border-orange-600' 
              : 'text-orange-500 hover:text-orange-700'
          }`}
        >
          All Time
        </button>
        
        <button
          onClick={() => setSelectionMode('year')}
          className={`px-3 py-1 font-medium ${
            selectionMode === 'year' 
              ? 'text-orange-600 border-b-2 border-orange-600' 
              : 'text-orange-500 hover:text-orange-700'
          }`}
        >
          Year
        </button>
        
        <button
          onClick={() => setSelectionMode('month')}
          className={`px-3 py-1 font-medium ${
            selectionMode === 'month' 
              ? 'text-orange-600 border-b-2 border-orange-600' 
              : 'text-orange-500 hover:text-orange-700'
          }`}
        >
          Month
        </button>
        
        <button
          onClick={() => setCalendarView(!calendarView)}
          className={`px-3 py-1 font-medium ${
            calendarView 
              ? 'text-orange-600 border-b-2 border-orange-600' 
              : 'text-orange-500 hover:text-orange-700'
          }`}
        >
          Calendar
        </button>
        
        <button
          onClick={() => setSelectionMode('range')}
          className={`px-3 py-1 font-medium ${
            selectionMode === 'range' 
              ? 'text-orange-600 border-b-2 border-orange-600' 
              : 'text-orange-500 hover:text-orange-700'
          }`}
        >
          Range
        </button>
        
        <button
          onClick={() => setShowDetailedDateFields(!showDetailedDateFields)}
          className="ml-auto flex items-center gap-1 text-orange-600 hover:text-orange-800"
        >
          <Calendar size={16} />
          {showDetailedDateFields ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      {/* Year Selection */}
      {(selectionMode === 'year' || selectionMode === 'month') && (
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => handleYearSelect('all')}
            className={`px-2 py-1 rounded ${
              selectedYear === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            All Years
          </button>
          
          {timeRanges.years.map(year => (
            <button
              key={year}
              onClick={() => handleYearSelect(year)}
              className={`px-2 py-1 rounded ${
                selectedYear === year.toString()
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}
      
      {/* Month Selection (only show if a year is selected) */}
      {selectionMode === 'month' && selectedYear && selectedYear !== 'all' && (
        <div className="mt-2">
          <div className="text-orange-700 font-medium mb-1">Select Month for {selectedYear}:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleMonthSelect('all')}
              className={`px-2 py-1 rounded ${
                selectedMonth === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              All Months
            </button>
            
            {timeRanges.monthsByYear[selectedYear]?.map(month => (
              <button
                key={month}
                onClick={() => handleMonthSelect(month)}
                className={`px-2 py-1 rounded ${
                  selectedMonth === month.toString()
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                {getMonthName(month)}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Calendar View */}
      {calendarView && (
        renderCalendar()
      )}
      
      {/* Year Range Selection */}
      {selectionMode === 'range' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-orange-700 font-medium">From Year:</label>
            <select
              value={yearRange.startYear}
              onChange={(e) => handleYearRangeSelect(e.target.value, yearRange.endYear)}
              className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
            >
              {timeRanges.years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <label className="text-orange-700 font-medium">To Year:</label>
            <select
              value={yearRange.endYear}
              onChange={(e) => handleYearRangeSelect(yearRange.startYear, e.target.value)}
              className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
            >
              {timeRanges.years
                .filter(year => year >= yearRange.startYear)
                .map(year => (
                  <option key={year} value={year}>{year}</option>
                ))
              }
            </select>
          </div>
          
          {/* Visual year range slider */}
          <div className="mt-1 h-8 bg-orange-100 rounded-full px-2 py-1 relative">
            <div className="absolute inset-0 flex items-center">
              {timeRanges.years.map((year, index) => {
                const isInRange = year >= yearRange.startYear && year <= yearRange.endYear;
                return (
                  <div 
                    key={year} 
                    className="flex flex-col items-center"
                    style={{ 
                      width: `${100 / timeRanges.years.length}%`,
                      opacity: isInRange ? 1 : 0.5
                    }}
                  >
                    <div 
                      className={`h-4 w-4 rounded-full cursor-pointer ${
                        isInRange ? 'bg-orange-500' : 'bg-orange-300 hover:bg-orange-400'
                      }`}
                      onClick={() => {
                        if (isInRange) {
                          handleYearRangeSelect(year.toString(), year.toString());
                        } else if (year < yearRange.startYear) {
                          handleYearRangeSelect(year.toString(), yearRange.endYear);
                        } else {
                          handleYearRangeSelect(yearRange.startYear, year.toString());
                        }
                      }}
                    />
                    <span className="text-xs text-orange-700 mt-1">{year}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Detailed date selectors (day precision) */}
      {showDetailedDateFields && (
        <div className="space-y-3 mt-3 border-t border-orange-200 pt-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center">
              <input
                type="date"
                value={startDate || ''}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
                min={timeRanges.minDate}
                max={endDate}
              />
              
              <span className="mx-2 text-orange-700">to</span>
              
              <input
                type="date"
                value={endDate || ''}
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
            <button 
              onClick={() => {
                setStartDate(timeRanges.minDate);
                setEndDate(timeRanges.maxDate);
              }}
              className="px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              title="All time"
            >
              All Time
            </button>
          </div>
        </div>
      )}
      
      {/* Current Selection Display */}
      <div className="bg-orange-50 p-2 rounded mt-2 text-orange-700 text-sm">
        <strong>Current Selection:</strong> {startDate} to {endDate}
        {selectedYear && selectionMode === 'year' && selectedYear !== 'all' && (
          <span> (Full year {selectedYear})</span>
        )}
        {selectedMonth !== null && selectionMode === 'month' && (
          <span> (Full month {getMonthName(parseInt(selectedMonth))} {selectedYear})</span>
        )}
        {selectedDay && selectionMode === 'day' && (
          <span> (Single day {selectedDay} {getMonthName(parseInt(selectedMonth))} {selectedYear})</span>
        )}
      </div>
    </div>
  );
};

export default ImprovedDateSelector;