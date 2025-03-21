import React, { useState, useMemo, useEffect } from 'react';
import BetterYearSlider from './better-year-slider.js';
import DualHandleYearSlider from './dual-handle-year-slider.js';

const ImprovedDateSelector = ({ 
  startDate, 
  endDate, 
  setStartDate, 
  setEndDate, 
  rawPlayData = [],
  formatDuration = (ms) => `${Math.floor(ms / 60000)}m`,
  colorTheme = 'orange'
}) => {
  const [isRangeMode, setIsRangeMode] = useState(startDate !== endDate);
  const [selectedDate, setSelectedDate] = useState('all');
  const [dateRange, setDateRange] = useState({ startYear: '', endYear: '' });
  
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
    
    // Find min and max dates
    let minDate = null;
    let maxDate = null;
    
    if (sortedYears.length > 0) {
      const minYear = sortedYears[0];
      const maxYear = sortedYears[sortedYears.length - 1];
      
      // Set the min date to the beginning of the first year
      minDate = `${minYear}-01-01`;
      
      // Set the max date to the end of the last year
      maxDate = `${maxYear}-12-31`;
    }
    
    return {
      years: sortedYears,
      playsCountByDate,
      timeByDate,
      minDate,
      maxDate
    };
  }, [rawPlayData]);
  
  // Initialize dates based on available data
  useEffect(() => {
    if (dateData.minDate && dateData.maxDate) {
      if (!startDate && !endDate) {
        // Initialize with the full date range
        setStartDate(dateData.minDate);
        setEndDate(dateData.maxDate);
        setSelectedDate('all');
      } else if (startDate === endDate) {
        // Single date mode
        const date = new Date(startDate);
        const year = date.getFullYear();
        setSelectedDate(year.toString());
        setIsRangeMode(false);
      } else {
        // Range mode
        const startYear = new Date(startDate).getFullYear();
        const endYear = new Date(endDate).getFullYear();
        setDateRange({ startYear: startYear.toString(), endYear: endYear.toString() });
        setIsRangeMode(true);
      }
    }
  }, [dateData, startDate, endDate, setStartDate, setEndDate]);
  
  // Handle year change in single mode
  const handleYearChange = (year) => {
    setSelectedDate(year);
    
    if (year === 'all') {
      // All-time selection
      setStartDate(dateData.minDate);
      setEndDate(dateData.maxDate);
    } else {
      // Specific year selection
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    }
  };
  
  // Handle year range change in range mode
  const handleYearRangeChange = ({ startYear, endYear }) => {
    setDateRange({ startYear, endYear });
    
    // Set date range based on selected years
    setStartDate(`${startYear}-01-01`);
    setEndDate(`${endYear}-12-31`);
  };
  
  // Toggle between range and single mode
  const toggleRangeMode = (value) => {
    const newMode = typeof value === 'boolean' ? value : !isRangeMode;
    setIsRangeMode(newMode);
    
    if (newMode) {
      // Switching to range mode
      if (selectedDate === 'all') {
        // If "all" was selected, use full range
        const years = dateData.years;
        if (years.length > 0) {
          handleYearRangeChange({
            startYear: years[0].toString(),
            endYear: years[years.length - 1].toString()
          });
        }
      } else {
        // If a specific year was selected, use that year as both start and end
        handleYearRangeChange({
          startYear: selectedDate,
          endYear: selectedDate
        });
      }
    } else {
      // Switching to single mode
      if (dateRange.startYear === dateRange.endYear) {
        // If range was for a single year, keep that year selected
        handleYearChange(dateRange.startYear);
      } else {
        // If range spanned multiple years, reset to "all"
        handleYearChange('all');
      }
    }
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
  
  // Get page title based on selection mode
  const getPageTitle = () => {
    if (isRangeMode && dateRange.startYear && dateRange.endYear) {
      if (dateRange.startYear === dateRange.endYear) {
        return `Date Selection (${dateRange.startYear})`;
      }
      return `Date Selection (${dateRange.startYear}-${dateRange.endYear})`;
    } else if (selectedDate === 'all') {
      return 'All-time Date Selection';
    } else {
      return `Date Selection for ${selectedDate}`;
    }
  };

  // Map color theme to actual color values
  const getColors = () => {
    switch (colorTheme) {
      case 'orange':
      default:
        return {
          text: 'text-orange-700',
          bg: 'bg-orange-600',
          bgHover: 'hover:bg-orange-700',
          bgLight: 'bg-orange-100',
          textLight: 'text-orange-700',
          bgHoverLight: 'hover:bg-orange-200'
        };
    }
  };

  const colors = getColors();
  
  return (
    <div className="space-y-4">
      {/* Header with statistics */}
      <div>
        <h3 className="font-bold text-orange-700">
          {getPageTitle()}
        </h3>
        <div className="text-sm text-orange-600 mt-1">
          {stats.totalPlays} plays • {formatDuration(stats.totalTime)} listening time
        </div>
      </div>
      
      {/* Mode toggle buttons */}
      <div className="flex justify-between items-center mb-4">
        <label className={colors.text + " font-medium"}>
          {isRangeMode ? 'Date Range Selection' : 'Single Year Selection'}
        </label>
        
        {/* Toggle between modes */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleRangeMode(false)}
            className={`px-2 py-1 rounded text-sm ${
              !isRangeMode 
                ? colors.bg + ' text-white' 
                : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
            }`}
          >
            Single Year
          </button>
          
          <button
            onClick={() => toggleRangeMode(true)}
            className={`px-2 py-1 rounded text-sm ${
              isRangeMode 
                ? colors.bg + ' text-white' 
                : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
            }`}
          >
            Date Range
          </button>
        </div>
      </div>
      
      {/* Year selector */}
      <div className="px-4">
        {!isRangeMode ? (
          // Single year slider
          <>
            <BetterYearSlider 
              years={dateData.years.map(year => year.toString())} 
              onYearChange={handleYearChange}
              initialYear={selectedDate !== 'all' ? selectedDate : null}
              colorTheme={colorTheme}
            />
            <div className="flex justify-center mt-4">
              <button
                onClick={() => handleYearChange('all')}
                className={`px-3 py-1 ${colors.bg} text-white rounded ${colors.bgHover}`}
              >
                Show All Time
              </button>
            </div>
          </>
        ) : (
          // Year range slider
          <DualHandleYearSlider 
            years={dateData.years.map(year => year.toString())}
            onYearRangeChange={handleYearRangeChange}
            initialStartYear={dateRange.startYear}
            initialEndYear={dateRange.endYear}
            colorTheme={colorTheme}
          />
        )}
      </div>
    </div>
  );
};

export default ImprovedDateSelector;