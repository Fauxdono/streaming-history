import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

const MonthDaySelector = ({
  startDate,
  endDate,
  onRangeChange,
  rawPlayData = [],
  formatDuration = (ms) => `${Math.floor(ms / 60000)}m`,
  colorTheme = 'orange'
}) => {
  // Parse start and end dates
  const [currentStartDate, setCurrentStartDate] = useState(startDate || '');
  const [currentEndDate, setCurrentEndDate] = useState(endDate || '');
  const [isRangeMode, setIsRangeMode] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // For quick selection buttons
  const [quickSelectMode, setQuickSelectMode] = useState('month'); // 'month', 'quarter', 'custom'
  
  // Update parent component when our dates change
  useEffect(() => {
    if (onRangeChange && currentStartDate && currentEndDate) {
      onRangeChange(currentStartDate, currentEndDate);
    }
  }, [currentStartDate, currentEndDate, onRangeChange]);
  
  // Initialize from props if they change externally
  useEffect(() => {
    if (startDate && startDate !== currentStartDate) {
      setCurrentStartDate(startDate);
    }
    if (endDate && endDate !== currentEndDate) {
      setCurrentEndDate(endDate);
    }
    // If dates are equal, we're in single date mode
    setIsRangeMode(startDate !== endDate);
  }, [startDate, endDate]);
  
  // Analyze available dates from raw data
  const dateData = useMemo(() => {
    const dateSet = new Set();
    const monthSet = new Set();
    const playsCountByDate = {};
    const timeByDate = {};
    
    // Process raw data
    rawPlayData.forEach(entry => {
      if (entry.ms_played >= 30000) {
        try {
          const date = new Date(entry.ts);
          if (isNaN(date.getTime())) return; // Skip invalid dates
          
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
          const monthStr = dateStr.substring(0, 7); // YYYY-MM
          
          // Track dates and months
          dateSet.add(dateStr);
          monthSet.add(monthStr);
          
          // Track play counts and time by date
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
    const sortedDates = Array.from(dateSet).sort();
    const sortedMonths = Array.from(monthSet).sort();
    
    // Get min and max dates
    const minDate = sortedDates.length > 0 ? sortedDates[0] : null;
    const maxDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
    
    return {
      dates: sortedDates,
      months: sortedMonths,
      playsCountByDate,
      timeByDate,
      minDate,
      maxDate,
      hasData: sortedDates.length > 0
    };
  }, [rawPlayData]);
  
  // Calculate statistics for the selected range
  const rangeStatistics = useMemo(() => {
    if (!currentStartDate || !currentEndDate) return { totalPlays: 0, totalTime: 0, daysWithActivity: 0 };
    
    let totalPlays = 0;
    let totalTime = 0;
    let daysWithActivity = 0;
    
    // Loop through dates in the selected range
    const start = new Date(currentStartDate);
    const end = new Date(currentEndDate);
    
    for (const dateStr in dateData.playsCountByDate) {
      const date = new Date(dateStr);
      if (date >= start && date <= end) {
        totalPlays += dateData.playsCountByDate[dateStr];
        totalTime += dateData.timeByDate[dateStr];
        daysWithActivity++;
      }
    }
    
    return { totalPlays, totalTime, daysWithActivity };
  }, [currentStartDate, currentEndDate, dateData]);
  
  // Handle quick selections
  const setQuickRange = (selection) => {
    if (!dateData.hasData) return;
    
    const today = new Date();
    let newStartDate, newEndDate;
    
    switch (selection) {
      case 'today':
        // Set to today only
        newStartDate = today.toISOString().split('T')[0];
        newEndDate = newStartDate;
        break;
        
      case 'thisMonth':
        // Current month
        newStartDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        newEndDate = today.toISOString().split('T')[0];
        break;
        
      case 'lastMonth': {
        // Previous month
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const year = lastMonth.getFullYear();
        const month = lastMonth.getMonth() + 1;
        newStartDate = `${year}-${String(month).padStart(2, '0')}-01`;
        
        // Get last day of last month
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
        newEndDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
        break;
      }
        
      case 'thisQuarter': {
        // Current quarter
        const currentMonth = today.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        const quarterStart = new Date(today);
        quarterStart.setMonth(quarterStartMonth);
        quarterStart.setDate(1);
        newStartDate = quarterStart.toISOString().split('T')[0];
        newEndDate = today.toISOString().split('T')[0];
        break;
      }
        
      case 'lastQuarter': {
        // Previous quarter
        const currentMonth = today.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        const lastQuarter = currentQuarter > 0 ? currentQuarter - 1 : 3;
        const lastQuarterYear = lastQuarter === 3 ? today.getFullYear() - 1 : today.getFullYear();
        
        const quarterStartMonth = lastQuarter * 3;
        const quarterStart = new Date(lastQuarterYear, quarterStartMonth, 1);
        newStartDate = quarterStart.toISOString().split('T')[0];
        
        const quarterEnd = new Date(lastQuarterYear, quarterStartMonth + 3, 0);
        newEndDate = quarterEnd.toISOString().split('T')[0];
        break;
      }
        
      case 'last30':
        // Last 30 days
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        newStartDate = thirtyDaysAgo.toISOString().split('T')[0];
        newEndDate = today.toISOString().split('T')[0];
        break;
        
      case 'last90':
        // Last 90 days
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(today.getDate() - 90);
        newStartDate = ninetyDaysAgo.toISOString().split('T')[0];
        newEndDate = today.toISOString().split('T')[0];
        break;
        
      case 'all':
      default:
        // All time
        newStartDate = dateData.minDate;
        newEndDate = dateData.maxDate;
        break;
    }
    
    // Ensure we don't exceed the available data range
    if (dateData.minDate && new Date(newStartDate) < new Date(dateData.minDate)) {
      newStartDate = dateData.minDate;
    }
    
    if (dateData.maxDate && new Date(newEndDate) > new Date(dateData.maxDate)) {
      newEndDate = dateData.maxDate;
    }
    
    setCurrentStartDate(newStartDate);
    setCurrentEndDate(newEndDate);
    setIsRangeMode(newStartDate !== newEndDate);
    
    // Notify parent
    if (onRangeChange) {
      onRangeChange(newStartDate, newEndDate);
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
          bgHoverLight: 'hover:bg-orange-200',
          border: 'border-orange-200',
          shadow: 'shadow-orange-100'
        };
    }
  };

  const colors = getColors();
  
  // Format a date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  // Calculate the appropriate header text
  const getHeaderText = () => {
    if (!currentStartDate || !currentEndDate) return 'Select Date Range';
    
    if (currentStartDate === currentEndDate) {
      return `Selected: ${formatDate(currentStartDate)}`;
    }
    
    // Check if this is a full month
    const start = new Date(currentStartDate);
    const end = new Date(currentEndDate);
    
    // If it's the first day of a month to the last day of the same month
    if (start.getDate() === 1) {
      const lastDayOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      if (end.getDate() === lastDayOfMonth && end.getMonth() === start.getMonth() && end.getFullYear() === start.getFullYear()) {
        return `Selected: ${start.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}`;
      }
    }
    
    // If it spans multiple months
    const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
    if (monthDiff > 1) {
      return `Selected: ${formatDate(currentStartDate)} to ${formatDate(currentEndDate)}`;
    }
    
    return `Selected: ${formatDate(currentStartDate)} to ${formatDate(currentEndDate)}`;
  };
  
  if (!dateData.hasData) {
    return (
      <div className={`p-4 rounded border ${colors.border} ${colors.bgLight}`}>
        <p className={colors.text}>No date data available.</p>
      </div>
    );
  }
  
  return (
    <div className={`p-4 rounded border ${colors.border} ${colors.bgLight} ${colors.shadow}`}>
      <div className="flex justify-between items-center">
        <h3 className={`font-bold ${colors.text} flex items-center`}>
          <Calendar size={18} className="mr-2" />
          {getHeaderText()}
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1 rounded-full ${colors.bgLight} ${colors.text}`}
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      
      {/* Statistics row */}
      <div className={`text-sm ${colors.textLight} mt-1 flex flex-wrap gap-4`}>
        <span>
          <strong>{rangeStatistics.totalPlays}</strong> plays
        </span>
        <span>
          <strong>{formatDuration(rangeStatistics.totalTime)}</strong> listening time
        </span>
        <span>
          <strong>{rangeStatistics.daysWithActivity}</strong> days with activity
        </span>
      </div>
      
      {/* Expanded selector */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Date inputs */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <label className={`${colors.text} whitespace-nowrap`}>From:</label>
              <input
                type="date"
                value={currentStartDate}
                onChange={(e) => {
                  setCurrentStartDate(e.target.value);
                  // If end date is before start date, update it
                  if (currentEndDate && new Date(currentEndDate) < new Date(e.target.value)) {
                    setCurrentEndDate(e.target.value);
                  }
                }}
                min={dateData.minDate}
                max={dateData.maxDate}
                className={`border rounded px-2 py-1 ${colors.text}`}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <label className={`${colors.text} whitespace-nowrap`}>To:</label>
              <input
                type="date"
                value={currentEndDate}
                onChange={(e) => {
                  setCurrentEndDate(e.target.value);
                  // If start date is after end date, update it
                  if (currentStartDate && new Date(currentStartDate) > new Date(e.target.value)) {
                    setCurrentStartDate(e.target.value);
                  }
                }}
                min={currentStartDate || dateData.minDate}
                max={dateData.maxDate}
                className={`border rounded px-2 py-1 ${colors.text}`}
              />
            </div>
          </div>
          
          {/* Quick select tabs */}
          <div>
            <div className="flex border-b mb-4">
              <button
                onClick={() => setQuickSelectMode('month')}
                className={`px-4 py-2 font-medium ${
                  quickSelectMode === 'month' 
                    ? `${colors.text} border-b-2 ${colors.border.replace('border', 'border-b')}` 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setQuickSelectMode('quarter')}
                className={`px-4 py-2 font-medium ${
                  quickSelectMode === 'quarter' 
                    ? `${colors.text} border-b-2 ${colors.border.replace('border', 'border-b')}` 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Quarter
              </button>
              <button
                onClick={() => setQuickSelectMode('custom')}
                className={`px-4 py-2 font-medium ${
                  quickSelectMode === 'custom' 
                    ? `${colors.text} border-b-2 ${colors.border.replace('border', 'border-b')}` 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Custom
              </button>
            </div>
            
            {/* Month quick selections */}
            {quickSelectMode === 'month' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <button
                  onClick={() => setQuickRange('today')}
                  className={`px-3 py-1 ${colors.bgLight} ${colors.text} rounded ${colors.bgHoverLight}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setQuickRange('thisMonth')}
                  className={`px-3 py-1 ${colors.bgLight} ${colors.text} rounded ${colors.bgHoverLight}`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setQuickRange('lastMonth')}
                  className={`px-3 py-1 ${colors.bgLight} ${colors.text} rounded ${colors.bgHoverLight}`}
                >
                  Last Month
                </button>
                <button
                  onClick={() => setQuickRange('all')}
                  className={`px-3 py-1 ${colors.bg} text-white rounded ${colors.bgHover}`}
                >
                  All Time
                </button>
              </div>
            )}
            
            {/* Quarter quick selections */}
            {quickSelectMode === 'quarter' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <button
                  onClick={() => setQuickRange('thisQuarter')}
                  className={`px-3 py-1 ${colors.bgLight} ${colors.text} rounded ${colors.bgHoverLight}`}
                >
                  This Quarter
                </button>
                <button
                  onClick={() => setQuickRange('lastQuarter')}
                  className={`px-3 py-1 ${colors.bgLight} ${colors.text} rounded ${colors.bgHoverLight}`}
                >
                  Last Quarter
                </button>
                <button
                  onClick={() => setQuickRange('all')}
                  className={`px-3 py-1 ${colors.bg} text-white rounded ${colors.bgHover}`}
                >
                  All Time
                </button>
              </div>
            )}
            
            {/* Custom quick selections */}
            {quickSelectMode === 'custom' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <button
                  onClick={() => setQuickRange('last30')}
                  className={`px-3 py-1 ${colors.bgLight} ${colors.text} rounded ${colors.bgHoverLight}`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setQuickRange('last90')}
                  className={`px-3 py-1 ${colors.bgLight} ${colors.text} rounded ${colors.bgHoverLight}`}
                >
                  Last 90 Days
                </button>
                <button
                  onClick={() => setQuickRange('all')}
                  className={`px-3 py-1 ${colors.bg} text-white rounded ${colors.bgHover}`}
                >
                  All Time
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthDaySelector;