import React, { useState, useEffect, useMemo } from 'react';
import YearSelector from './year-selector.js';

// Helper function to get days in a month
function getDaysInMonth(year, month) {
  // JavaScript months are 0-based, but our input is 1-based
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}

const TripleRangeSelector = ({ 
  onDateRangeChange, 
  initialStartDate, 
  initialEndDate,
  colorTheme = 'orange',
  availableYears = []
}) => {
  // Date state
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  
  // State for month and day selection
  const [monthRange, setMonthRange] = useState({ 
    startValue: initialStartDate ? (new Date(initialStartDate).getMonth() + 1).toString() : '1', 
    endValue: initialEndDate ? (new Date(initialEndDate).getMonth() + 1).toString() : '12' 
  });
  const [dayRange, setDayRange] = useState({ 
    startValue: initialStartDate ? new Date(initialStartDate).getDate().toString() : '1', 
    endValue: initialEndDate ? new Date(initialEndDate).getDate().toString() : '31' 
  });
  
  // Year selection handling
  const [yearRangeMode, setYearRangeMode] = useState(false);
  const [selectedYear, setSelectedYear] = useState('all');
  const [yearRange, setYearRange] = useState({ 
    startYear: initialStartDate ? new Date(initialStartDate).getFullYear().toString() : '', 
    endYear: initialEndDate ? new Date(initialEndDate).getFullYear().toString() : '' 
  });
  
  // Process available years
  const years = useMemo(() => {
    if (availableYears && availableYears.length > 0) {
      return [...new Set(availableYears)].sort((a, b) => parseInt(a) - parseInt(b));
    }
    
    // Default to current year and previous 5 years if no years provided
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => (currentYear - 5 + i).toString());
  }, [availableYears]);
  
  // Create an object with years for YearSelector
  const yearsForYearSelector = useMemo(() => {
    const yearsObj = {};
    years.forEach(year => {
      yearsObj[year] = []; // YearSelector expects an object with years as keys
    });
    return yearsObj;
  }, [years]);
  
  // Generate months 1-12
  const months = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => (i + 1).toString()), 
  []);
  
  // Initialize component from provided dates
  useEffect(() => {
    // Default to "All Time" when no dates are provided
    if (!initialStartDate || !initialEndDate || initialStartDate === "" || initialEndDate === "") {
      console.log("Triple Range Selector - Setting default 'All Time'");
      setSelectedYear('all');
      setYearRangeMode(false);
      // Make sure month and day ranges are also set to default values
      setMonthRange({ startValue: '1', endValue: '12' });
      setDayRange({ startValue: '1', endValue: '31' });
      return;
    }
    
    try {
      const startDate = new Date(initialStartDate);
      const endDate = new Date(initialEndDate);
      
      if (!isNaN(startDate) && !isNaN(endDate)) {
        const startYear = startDate.getFullYear().toString();
        const endYear = endDate.getFullYear().toString();
        
        // Check if this is a full year selection
        const isFullYearRange = 
          startDate.getMonth() === 0 && startDate.getDate() === 1 &&
          endDate.getMonth() === 11 && endDate.getDate() === 31;
          
        if (startYear === endYear && isFullYearRange) {
          // Single full year selection
          setSelectedYear(startYear);
          setYearRangeMode(false);
        } else if (startYear === endYear) {
          // Same year but not full year
          setSelectedYear(startYear);
          setYearRangeMode(false);
          setMonthRange({
            startValue: (startDate.getMonth() + 1).toString(),
            endValue: (endDate.getMonth() + 1).toString()
          });
          setDayRange({
            startValue: startDate.getDate().toString(),
            endValue: endDate.getDate().toString()
          });
        } else {
          // Multiple years
          setYearRangeMode(true);
          setYearRange({
            startYear: startYear,
            endYear: endYear
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
    } catch (err) {
      console.error("Error parsing initial dates:", err);
    }
  }, [initialStartDate, initialEndDate]);
  
  // Handle year changes from YearSelector
  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    // Handle "all" selection (all time)
    if (year === 'all') {
      // For "all", pass empty strings to indicate all time
      if (onDateRangeChange) {
        onDateRangeChange("", "");
      }
    } else {
      // For regular year, use full year range
      if (onDateRangeChange) {
        onDateRangeChange(`${year}-01-01`, `${year}-12-31`);
      }
    }
  };
  
  // Handle year range changes from YearSelector
  const handleYearRangeChange = ({ startYear, endYear }) => {
    setYearRange({ startYear, endYear });
    
    // Send the full date range (start of first year to end of last year)
    if (onDateRangeChange) {
      onDateRangeChange(`${startYear}-01-01`, `${endYear}-12-31`);
    }
  };
  
  // Toggle between single year and year range modes
  const handleToggleRangeMode = (isRange) => {
    setYearRangeMode(isRange);
  };
  
  // Apply custom date range with months and days
  const applyCustomDateRange = () => {
    let startDateStr, endDateStr;
    
    // For "all" time selection
    if (selectedYear === 'all' && !yearRangeMode) {
      if (onDateRangeChange) {
        onDateRangeChange("", "");
      }
      return;
    }
    
    // For single year or year range
    if (yearRangeMode) {
      // Year range - use start and end years
      startDateStr = `${yearRange.startYear}-${monthRange.startValue.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')}`;
      endDateStr = `${yearRange.endYear}-${monthRange.endValue.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
    } else {
      // Single year - use same year for both
      startDateStr = `${selectedYear}-${monthRange.startValue.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')}`;
      endDateStr = `${selectedYear}-${monthRange.endValue.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
    }
    
    // Validate dates
    try {
      // Make sure days are valid for the given months
      const maxStartDay = getDaysInMonth(
        yearRangeMode ? yearRange.startYear : selectedYear, 
        monthRange.startValue
      );
      const maxEndDay = getDaysInMonth(
        yearRangeMode ? yearRange.endYear : selectedYear, 
        monthRange.endValue
      );
      
      const startDay = Math.min(parseInt(dayRange.startValue), maxStartDay);
      const endDay = Math.min(parseInt(dayRange.endValue), maxEndDay);
      
      // Recreate dates with validated days
      startDateStr = `${yearRangeMode ? yearRange.startYear : selectedYear}-${monthRange.startValue.padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;
      endDateStr = `${yearRangeMode ? yearRange.endYear : selectedYear}-${monthRange.endValue.padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`;
      
      if (onDateRangeChange) {
        onDateRangeChange(startDateStr, endDateStr);
      }
    } catch (err) {
      console.error("Error creating date range:", err);
    }
  };
  
  // Format month names for display
  const formatMonth = (monthNum) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(monthNum) - 1];
  };
  
  // Get current date range as formatted string
  const getFormattedDateRange = () => {
    if (selectedYear === 'all' && !yearRangeMode) {
      return `All Time (${years[0]}-01-01 to ${years[years.length - 1]}-12-31)`;
    } else if (!yearRangeMode) {
      return `${selectedYear}-${monthRange.startValue.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')} to ${selectedYear}-${monthRange.endValue.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
    } else {
      return `${yearRange.startYear}-${monthRange.startValue.padStart(2, '0')}-${dayRange.startValue.padStart(2, '0')} to ${yearRange.endYear}-${monthRange.endValue.padStart(2, '0')}-${dayRange.endValue.padStart(2, '0')}`;
    }
  };
  
  // Map color theme to actual color values
  const colors = useMemo(() => {
    switch (colorTheme) {
      case 'pink':
        return {
          buttonBg: 'bg-pink-600',
          buttonHover: 'hover:bg-pink-700',
          textTitle: 'text-pink-700',
          tabActive: 'bg-pink-600 text-white',
          tabInactive: 'bg-pink-100 text-pink-700 hover:bg-pink-200'
        };
      case 'teal':
        return {
          buttonBg: 'bg-teal-600',
          buttonHover: 'hover:bg-teal-700',
          textTitle: 'text-teal-700',
          tabActive: 'bg-teal-600 text-white',
          tabInactive: 'bg-teal-100 text-teal-700 hover:bg-teal-200'
        };
      case 'blue':
        return {
          buttonBg: 'bg-blue-600',
          buttonHover: 'hover:bg-blue-700',
          textTitle: 'text-blue-700',
          tabActive: 'bg-blue-600 text-white',
          tabInactive: 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        };
      case 'orange':
      default:
        return {
          buttonBg: 'bg-orange-600',
          buttonHover: 'hover:bg-orange-700',
          textTitle: 'text-orange-700',
          tabActive: 'bg-orange-600 text-white',
          tabInactive: 'bg-orange-100 text-orange-700 hover:bg-orange-200'
        };
    }
  }, [colorTheme]);
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-center">
        <h3 className={`font-bold ${colors.textTitle}`}>Date Range Selection</h3>
      </div>
      
      {/* Use YearSelector component for year selection */}
      <YearSelector 
        artistsByYear={yearsForYearSelector}
        onYearChange={handleYearChange}
        onYearRangeChange={handleYearRangeChange}
        initialYear={selectedYear !== 'all' ? selectedYear : null}
        initialYearRange={yearRange}
        isRangeMode={yearRangeMode}
        onToggleRangeMode={handleToggleRangeMode}
        colorTheme={colorTheme}
      />
      
      {/* Month and Day selection - only show when not in "all" mode */}
      {selectedYear !== 'all' && (
        <div className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className={`font-medium ${colors.textTitle}`}>Refine Date Range</h4>
          </div>
          
          {/* Month Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1 ${colors.textTitle}`}>Start Month</label>
              <select 
                value={monthRange.startValue}
                onChange={(e) => setMonthRange(prev => ({ ...prev, startValue: e.target.value }))}
                className="w-full p-2 border rounded"
              >
                {months.map(month => (
                  <option key={`start-${month}`} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block mb-1 ${colors.textTitle}`}>End Month</label>
              <select 
                value={monthRange.endValue}
                onChange={(e) => setMonthRange(prev => ({ ...prev, endValue: e.target.value }))}
                className="w-full p-2 border rounded"
              >
                {months.map(month => (
                  <option key={`end-${month}`} value={month}>
                    {formatMonth(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Day Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1 ${colors.textTitle}`}>Start Day</label>
              <select 
                value={dayRange.startValue}
                onChange={(e) => setDayRange(prev => ({ ...prev, startValue: e.target.value }))}
                className="w-full p-2 border rounded"
              >
                {Array.from({ length: getDaysInMonth(
                  yearRangeMode ? yearRange.startYear : selectedYear, 
                  monthRange.startValue
                ) }, (_, i) => (i + 1).toString()).map(day => (
                  <option key={`start-${day}`} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block mb-1 ${colors.textTitle}`}>End Day</label>
              <select 
                value={dayRange.endValue}
                onChange={(e) => setDayRange(prev => ({ ...prev, endValue: e.target.value }))}
                className="w-full p-2 border rounded"
              >
                {Array.from({ length: getDaysInMonth(
                  yearRangeMode ? yearRange.endYear : selectedYear, 
                  monthRange.endValue
                ) }, (_, i) => (i + 1).toString()).map(day => (
                  <option key={`end-${day}`} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex justify-center mt-4">
            <button
              onClick={applyCustomDateRange}
              className={`px-4 py-2 ${colors.buttonBg} text-white rounded ${colors.buttonHover}`}
            >
              Apply Custom Date Range
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-3 text-sm text-gray-600">
        Selected range: {getFormattedDateRange()}
      </div>
    </div>
  );
};

export default TripleRangeSelector;