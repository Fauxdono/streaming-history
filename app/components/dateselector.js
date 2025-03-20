import React, { useState, useEffect, useMemo } from 'react';
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
  const handleMonthChange = (e) => {
    const month = e.target.value;
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
  
  // Handle year range change
  const handleYearRangeChange = ({ startYear, endYear }) => {
    setYearRange({ startYear, endYear });
    
    // Update the date fields
    setStartDate(`${startYear}-01-01`);
    setEndDate(`${endYear}-12-31`);
  };
  
  // Get month name
  const getMonthName = (monthNum) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum];
  };
  
  return (
    <div className="space-y-4">
      {/* Year Selector Tabs */}
      <div className="flex border-b mb-2">
        <button
          onClick={() => setYearRangeMode(false)}
          className={`px-3 py-1 font-medium ${
            !yearRangeMode 
              ? 'text-orange-600 border-b-2 border-orange-600' 
              : 'text-orange-500 hover:text-orange-700'
          }`}
        >
          Single Year/Month
        </button>
        <button
          onClick={() => setYearRangeMode(true)}
          className={`px-3 py-1 font-medium ${
            yearRangeMode 
              ? 'text-orange-600 border-b-2 border-orange-600' 
              : 'text-orange-500 hover:text-orange-700'
          }`}
        >
          Year Range
        </button>
        
        <button
          onClick={() => setShowDetailedDateFields(!showDetailedDateFields)}
          className="ml-auto flex items-center gap-1 text-orange-600 hover:text-orange-800"
        >
          <Calendar size={16} />
          {showDetailedDateFields ? 'Hide Detailed Dates' : 'Show Detailed Dates'}
        </button>
      </div>
      
      {!yearRangeMode ? (
        // Single Year/Month Selector
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-orange-700 font-medium">Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
            >
              <option value="all">All Years</option>
              {timeRanges.years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {selectedYear !== 'all' && (
            <div className="flex items-center gap-2">
              <label className="text-orange-700 font-medium">Month:</label>
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
              >
                <option value="all">All Months</option>
                {timeRanges.monthsByYear[selectedYear]?.map(month => (
                  <option key={month} value={month}>
                    {getMonthName(month)}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Visual year slider could be added here */}
          <div className="mt-1 h-8 bg-orange-100 rounded-full px-2 py-1 relative">
            <div className="absolute inset-0 flex items-center">
              {timeRanges.years.map((year, index) => (
                <div 
                  key={year} 
                  className="flex flex-col items-center"
                  style={{ 
                    width: `${100 / timeRanges.years.length}%`,
                    opacity: year === parseInt(selectedYear) ? 1 : 0.5
                  }}
                  onClick={() => handleYearChange(year.toString())}
                >
                  <div 
                    className={`h-4 w-4 rounded-full cursor-pointer ${
                      year === parseInt(selectedYear) ? 'bg-orange-500' : 'bg-orange-300 hover:bg-orange-400'
                    }`}
                  />
                  <span className="text-xs text-orange-700 mt-1">{year}</span>
                </div>
              ))}
            </div>
          </div>
          
          {selectedYear !== 'all' && selectedMonth !== 'all' && (
            <div className="mt-1 h-8 bg-orange-50 rounded-full px-2 py-1 relative">
              <div className="absolute inset-0 flex items-center">
                {Array.from({ length: 12 }, (_, i) => i).map((month) => {
                  const isAvailable = timeRanges.monthsByYear[selectedYear]?.includes(month) || false;
                  return (
                    <div 
                      key={month} 
                      className="flex flex-col items-center"
                      style={{ 
                        width: '8.33%', // 100% / 12 months
                        opacity: month === parseInt(selectedMonth) ? 1 : (isAvailable ? 0.5 : 0.2)
                      }}
                    >
                      {isAvailable && (
                        <div 
                          className={`h-3 w-3 rounded-full cursor-pointer ${
                            month === parseInt(selectedMonth) ? 'bg-orange-500' : 'bg-orange-300 hover:bg-orange-400'
                          }`}
                          onClick={() => {
                            setSelectedMonth(month.toString());
                            handleMonthChange({ target: { value: month.toString() } });
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Year Range Selector
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-orange-700 font-medium">From Year:</label>
            <select
              value={yearRange.startYear}
              onChange={(e) => handleYearRangeChange({
                startYear: e.target.value,
                endYear: yearRange.endYear
              })}
              className="border rounded px-2 py-1 text-orange-700 focus:border-orange-400 focus:ring-orange-400"
            >
              {timeRanges.years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <label className="text-orange-700 font-medium">To Year:</label>
            <select
              value={yearRange.endYear}
              onChange={(e) => handleYearRangeChange({
                startYear: yearRange.startYear,
                endYear: e.target.value
              })}
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
                          handleYearRangeChange({
                            startYear: year.toString(),
                            endYear: year.toString()
                          });
                        } else if (year < yearRange.startYear) {
                          handleYearRangeChange({
                            startYear: year.toString(),
                            endYear: yearRange.endYear
                          });
                        } else {
                          handleYearRangeChange({
                            startYear: yearRange.startYear,
                            endYear: year.toString()
                          });
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
    </div>
  );
};

export default EnhancedDateSelector;