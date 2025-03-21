import React, { useState, useEffect, useMemo } from 'react';
import BetterYearSlider from './better-year-slider.js';
import DualHandleYearSlider from './dual-handle-year-slider.js';

const HierarchicalDateSelector = ({ 
  rawPlayData = [], 
  startDate, 
  endDate, 
  onDateChange, 
  colorTheme = 'orange' 
}) => {
  // State for hierarchical selection
  const [selectedYear, setSelectedYear] = useState('all');
  const [yearRangeMode, setYearRangeMode] = useState(false);
  const [yearRange, setYearRange] = useState({ startYear: '', endYear: '' });
  
  // Month selection (1-12 for January-December)
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 means all months
  const [monthRangeMode, setMonthRangeMode] = useState(false);
  const [monthRange, setMonthRange] = useState({ startMonth: 1, endMonth: 12 });
  
  // Day selection (1-31)
  const [selectedDay, setSelectedDay] = useState(0); // 0 means all days
  const [dayRangeMode, setDayRangeMode] = useState(false);
  const [dayRange, setDayRange] = useState({ startDay: 1, endDay: 31 });
  
  // Determine which level of selection is active
  const [activeLevel, setActiveLevel] = useState('year'); // 'year', 'month', 'day'
  
  // Extract available years, months, days from data
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
          const month = date.getMonth() + 1; // 1-12 for January-December
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
    
    // Format months and days for each year
    const formattedMonthsByYear = {};
    Object.entries(monthsByYear).forEach(([year, monthsSet]) => {
      formattedMonthsByYear[year] = Array.from(monthsSet).sort((a, b) => a - b);
    });
    
    const formattedDaysByYearMonth = {};
    Object.entries(daysByYearMonth).forEach(([yearMonth, daysSet]) => {
      formattedDaysByYearMonth[yearMonth] = Array.from(daysSet).sort((a, b) => a - b);
    });
    
    return {
      years: sortedYears,
      monthsByYear: formattedMonthsByYear,
      daysByYearMonth: formattedDaysByYearMonth,
      playsCountByDate,
      timeByDate
    };
  }, [rawPlayData]);
  
  // Initialize dates based on available data
  useEffect(() => {
    if (dateData.years.length > 0) {
      // If no dates are set, initialize with the full range
      if (!startDate && !endDate) {
        const minYear = Math.min(...dateData.years);
        const maxYear = Math.max(...dateData.years);
        
        updateSelectedDates(minYear, 1, 1, maxYear, 12, 31);
      } 
      // If dates are provided, parse them
      else if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        const startYear = startDateObj.getFullYear();
        const startMonth = startDateObj.getMonth() + 1;
        const startDay = startDateObj.getDate();
        
        const endYear = endDateObj.getFullYear();
        const endMonth = endDateObj.getMonth() + 1;
        const endDay = endDateObj.getDate();
        
        // If it's a single year
        if (startYear === endYear) {
          setSelectedYear(startYear.toString());
          setYearRangeMode(false);
          
          // If it's a single month
          if (startMonth === endMonth) {
            setSelectedMonth(startMonth);
            setMonthRangeMode(false);
            
            // If it's a single day
            if (startDay === endDay) {
              setSelectedDay(startDay);
              setDayRangeMode(false);
            } 
            // If it's a range of days
            else {
              setDayRange({ startDay, endDay });
              setDayRangeMode(true);
            }
          } 
          // If it's a range of months
          else {
            setMonthRange({ startMonth, endMonth });
            setMonthRangeMode(true);
          }
        } 
        // If it's a range of years
        else {
          setYearRange({ startYear: startYear.toString(), endYear: endYear.toString() });
          setYearRangeMode(true);
        }
      }
    }
  }, [dateData, startDate, endDate]);
  
  // Update the date strings based on selected values
  const updateSelectedDates = (startYear, startMonth, startDay, endYear, endMonth, endDay) => {
    const newStartDate = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    const newEndDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    
    if (onDateChange) {
      onDateChange(newStartDate, newEndDate);
    }
  };
  
  // Get available months based on selected year
  const availableMonths = useMemo(() => {
    if (yearRangeMode) {
      // If year range, combine all months from all years in the range
      const allMonths = new Set();
      
      if (yearRange.startYear && yearRange.endYear) {
        const startYear = parseInt(yearRange.startYear);
        const endYear = parseInt(yearRange.endYear);
        
        for (let year = startYear; year <= endYear; year++) {
          const months = dateData.monthsByYear[year] || [];
          months.forEach(month => allMonths.add(month));
        }
      }
      
      return Array.from(allMonths).sort((a, b) => a - b);
    } else if (selectedYear !== 'all') {
      // If specific year, use months from that year
      return dateData.monthsByYear[selectedYear] || [];
    } else {
      // If all years, return all possible months (1-12)
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
  }, [dateData, selectedYear, yearRangeMode, yearRange]);
  
  // Get available days based on selected year and month
  const availableDays = useMemo(() => {
    if (monthRangeMode) {
      // If month range, combine all days from all months in the range
      const allDays = new Set();
      
      if (yearRangeMode) {
        // Year range + month range
        if (yearRange.startYear && yearRange.endYear) {
          const startYear = parseInt(yearRange.startYear);
          const endYear = parseInt(yearRange.endYear);
          
          for (let year = startYear; year <= endYear; year++) {
            for (let month = monthRange.startMonth; month <= monthRange.endMonth; month++) {
              const days = dateData.daysByYearMonth[`${year}-${month}`] || [];
              days.forEach(day => allDays.add(day));
            }
          }
        }
      } else if (selectedYear !== 'all') {
        // Single year + month range
        for (let month = monthRange.startMonth; month <= monthRange.endMonth; month++) {
          const days = dateData.daysByYearMonth[`${selectedYear}-${month}`] || [];
          days.forEach(day => allDays.add(day));
        }
      }
      
      return Array.from(allDays).sort((a, b) => a - b);
    } else if (selectedMonth !== 0) {
      // If specific month, use days from that month
      if (yearRangeMode) {
        // Year range + specific month
        const allDays = new Set();
        
        if (yearRange.startYear && yearRange.endYear) {
          const startYear = parseInt(yearRange.startYear);
          const endYear = parseInt(yearRange.endYear);
          
          for (let year = startYear; year <= endYear; year++) {
            const days = dateData.daysByYearMonth[`${year}-${selectedMonth}`] || [];
            days.forEach(day => allDays.add(day));
          }
        }
        
        return Array.from(allDays).sort((a, b) => a - b);
      } else if (selectedYear !== 'all') {
        // Single year + single month
        return dateData.daysByYearMonth[`${selectedYear}-${selectedMonth}`] || [];
      }
    }
    
    // Default: return all possible days (1-31)
    return Array.from({ length: 31 }, (_, i) => i + 1);
  }, [dateData, selectedYear, selectedMonth, yearRangeMode, monthRangeMode, yearRange, monthRange]);
  
  // Handle year change in single mode
  const handleYearChange = (year) => {
    setSelectedYear(year);
    
    if (year === 'all') {
      // All years
      const minYear = Math.min(...dateData.years);
      const maxYear = Math.max(...dateData.years);
      
      // Reset month and day selection
      setSelectedMonth(0);
      setSelectedDay(0);
      setMonthRangeMode(false);
      setDayRangeMode(false);
      
      // Update with full range
      updateSelectedDates(minYear, 1, 1, maxYear, 12, 31);
    } else {
      // Specific year
      const yearInt = parseInt(year);
      
      if (selectedMonth !== 0) {
        // If month is selected
        if (selectedDay !== 0) {
          // If day is selected, set to specific date
          updateSelectedDates(yearInt, selectedMonth, selectedDay, yearInt, selectedMonth, selectedDay);
        } else if (dayRangeMode) {
          // If day range is selected
          updateSelectedDates(yearInt, selectedMonth, dayRange.startDay, yearInt, selectedMonth, dayRange.endDay);
        } else {
          // If no day selection, set to full month
          const lastDay = new Date(yearInt, selectedMonth, 0).getDate();
          updateSelectedDates(yearInt, selectedMonth, 1, yearInt, selectedMonth, lastDay);
        }
      } else if (monthRangeMode) {
        // If month range is selected
        const lastDayStart = new Date(yearInt, monthRange.startMonth, 0).getDate();
        const lastDayEnd = new Date(yearInt, monthRange.endMonth, 0).getDate();
        updateSelectedDates(yearInt, monthRange.startMonth, 1, yearInt, monthRange.endMonth, lastDayEnd);
      } else {
        // If no month selection, set to full year
        updateSelectedDates(yearInt, 1, 1, yearInt, 12, 31);
      }
    }
    
    // Set active level to months
    setActiveLevel('month');
  };
  
  // Handle year range change
  const handleYearRangeChange = ({ startYear, endYear }) => {
    setYearRange({ startYear, endYear });
    
    // Convert to integers
    const startYearInt = parseInt(startYear);
    const endYearInt = parseInt(endYear);
    
    // Reset month and day selection when changing year range
    setSelectedMonth(0);
    setSelectedDay(0);
    
    // Update date range to cover the full years
    updateSelectedDates(startYearInt, 1, 1, endYearInt, 12, 31);
    
    // Set active level to months
    setActiveLevel('month');
  };
  
  // Handle month change in single mode
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    
    if (month === 0) {
      // All months
      if (yearRangeMode) {
        // Year range + all months
        const startYearInt = parseInt(yearRange.startYear);
        const endYearInt = parseInt(yearRange.endYear);
        
        // Update date range to cover all months
        updateSelectedDates(startYearInt, 1, 1, endYearInt, 12, 31);
      } else if (selectedYear !== 'all') {
        // Single year + all months
        const yearInt = parseInt(selectedYear);
        
        // Update date range to cover the full year
        updateSelectedDates(yearInt, 1, 1, yearInt, 12, 31);
      }
    } else {
      // Specific month
      if (yearRangeMode) {
        // Year range + specific month
        const startYearInt = parseInt(yearRange.startYear);
        const endYearInt = parseInt(yearRange.endYear);
        
        // Get last day of month
        const lastDay = new Date(endYearInt, month, 0).getDate();
        
        // Update date range
        updateSelectedDates(startYearInt, month, 1, endYearInt, month, lastDay);
      } else if (selectedYear !== 'all') {
        // Single year + specific month
        const yearInt = parseInt(selectedYear);
        
        // Get last day of month
        const lastDay = new Date(yearInt, month, 0).getDate();
        
        if (selectedDay !== 0) {
          // If day is selected
          updateSelectedDates(yearInt, month, selectedDay, yearInt, month, selectedDay);
        } else if (dayRangeMode) {
          // If day range is selected
          updateSelectedDates(yearInt, month, dayRange.startDay, yearInt, month, dayRange.endDay);
        } else {
          // If no day selection, set to full month
          updateSelectedDates(yearInt, month, 1, yearInt, month, lastDay);
        }
      }
    }
    
    // Set active level to days
    setActiveLevel('day');
  };
  
  // Handle month range change
  const handleMonthRangeChange = ({ startMonth, endMonth }) => {
    setMonthRange({ startMonth, endMonth });
    setMonthRangeMode(true);
    
    // Reset day selection
    setSelectedDay(0);
    setDayRangeMode(false);
    
    if (yearRangeMode) {
      // Year range + month range
      const startYearInt = parseInt(yearRange.startYear);
      const endYearInt = parseInt(yearRange.endYear);
      
      // Get last day of end month
      const lastDay = new Date(endYearInt, endMonth, 0).getDate();
      
      // Update date range
      updateSelectedDates(startYearInt, startMonth, 1, endYearInt, endMonth, lastDay);
    } else if (selectedYear !== 'all') {
      // Single year + month range
      const yearInt = parseInt(selectedYear);
      
      // Get last day of end month
      const lastDay = new Date(yearInt, endMonth, 0).getDate();
      
      // Update date range
      updateSelectedDates(yearInt, startMonth, 1, yearInt, endMonth, lastDay);
    }
    
    // Set active level to days
    setActiveLevel('day');
  };
  
  // Handle day change in single mode
  const handleDayChange = (day) => {
    setSelectedDay(day);
    
    if (day === 0) {
      // All days
      if (monthRangeMode) {
        // Month range + all days
        if (yearRangeMode) {
          // Year range + month range + all days
          const startYearInt = parseInt(yearRange.startYear);
          const endYearInt = parseInt(yearRange.endYear);
          
          // Get last day of end month
          const lastDay = new Date(endYearInt, monthRange.endMonth, 0).getDate();
          
          // Update date range
          updateSelectedDates(startYearInt, monthRange.startMonth, 1, endYearInt, monthRange.endMonth, lastDay);
        } else if (selectedYear !== 'all') {
          // Single year + month range + all days
          const yearInt = parseInt(selectedYear);
          
          // Get last day of end month
          const lastDay = new Date(yearInt, monthRange.endMonth, 0).getDate();
          
          // Update date range
          updateSelectedDates(yearInt, monthRange.startMonth, 1, yearInt, monthRange.endMonth, lastDay);
        }
      } else if (selectedMonth !== 0) {
        // Single month + all days
        if (yearRangeMode) {
          // Year range + single month + all days
          const startYearInt = parseInt(yearRange.startYear);
          const endYearInt = parseInt(yearRange.endYear);
          
          // Get last day of month
          const lastDay = new Date(endYearInt, selectedMonth, 0).getDate();
          
          // Update date range
          updateSelectedDates(startYearInt, selectedMonth, 1, endYearInt, selectedMonth, lastDay);
        } else if (selectedYear !== 'all') {
          // Single year + single month + all days
          const yearInt = parseInt(selectedYear);
          
          // Get last day of month
          const lastDay = new Date(yearInt, selectedMonth, 0).getDate();
          
          // Update date range
          updateSelectedDates(yearInt, selectedMonth, 1, yearInt, selectedMonth, lastDay);
        }
      }
    } else {
      // Specific day
      if (monthRangeMode) {
        // Not valid to select a specific day with a month range
        return;
      } else if (selectedMonth !== 0) {
        // Single month + specific day
        if (yearRangeMode) {
          // Year range + single month + specific day
          const startYearInt = parseInt(yearRange.startYear);
          const endYearInt = parseInt(yearRange.endYear);
          
          // Update date range
          updateSelectedDates(startYearInt, selectedMonth, day, endYearInt, selectedMonth, day);
        } else if (selectedYear !== 'all') {
          // Single year + single month + specific day
          const yearInt = parseInt(selectedYear);
          
          // Update date range
          updateSelectedDates(yearInt, selectedMonth, day, yearInt, selectedMonth, day);
        }
      }
    }
  };
  
  // Handle day range change
  const handleDayRangeChange = ({ startDay, endDay }) => {
    setDayRange({ startDay, endDay });
    setDayRangeMode(true);
    
    if (monthRangeMode) {
      // Not valid to select a day range with a month range
      return;
    } else if (selectedMonth !== 0) {
      // Single month + day range
      if (yearRangeMode) {
        // Year range + single month + day range
        const startYearInt = parseInt(yearRange.startYear);
        const endYearInt = parseInt(yearRange.endYear);
        
        // Update date range
        updateSelectedDates(startYearInt, selectedMonth, startDay, endYearInt, selectedMonth, endDay);
      } else if (selectedYear !== 'all') {
        // Single year + single month + day range
        const yearInt = parseInt(selectedYear);
        
        // Update date range
        updateSelectedDates(yearInt, selectedMonth, startDay, yearInt, selectedMonth, endDay);
      }
    }
  };
  
  // Toggle between range and single mode for years
  const toggleYearRangeMode = (value) => {
    const newMode = typeof value === 'boolean' ? value : !yearRangeMode;
    setYearRangeMode(newMode);
    
    if (newMode) {
      // Switching to range mode
      if (selectedYear === 'all') {
        // If "all" was selected, use full range
        const years = dateData.years;
        if (years.length > 0) {
          const startYear = Math.min(...years);
          const endYear = Math.max(...years);
          
          setYearRange({
            startYear: startYear.toString(),
            endYear: endYear.toString()
          });
          
          // Update date range
          updateSelectedDates(startYear, 1, 1, endYear, 12, 31);
        }
      } else {
        // If a specific year was selected, use that year as both start and end
        const yearInt = parseInt(selectedYear);
        
        setYearRange({
          startYear: selectedYear,
          endYear: selectedYear
        });
        
        // Update date range based on current month/day selections
        if (selectedMonth !== 0) {
          if (selectedDay !== 0) {
            // Specific day
            updateSelectedDates(yearInt, selectedMonth, selectedDay, yearInt, selectedMonth, selectedDay);
          } else if (dayRangeMode) {
            // Day range
            updateSelectedDates(yearInt, selectedMonth, dayRange.startDay, yearInt, selectedMonth, dayRange.endDay);
          } else {
            // Full month
            const lastDay = new Date(yearInt, selectedMonth, 0).getDate();
            updateSelectedDates(yearInt, selectedMonth, 1, yearInt, selectedMonth, lastDay);
          }
        } else if (monthRangeMode) {
          // Month range
          const lastDayEnd = new Date(yearInt, monthRange.endMonth, 0).getDate();
          updateSelectedDates(yearInt, monthRange.startMonth, 1, yearInt, monthRange.endMonth, lastDayEnd);
        } else {
          // Full year
          updateSelectedDates(yearInt, 1, 1, yearInt, 12, 31);
        }
      }
    } else {
      // Switching to single mode
      if (yearRange.startYear === yearRange.endYear) {
        // If range was for a single year, keep that year selected
        handleYearChange(yearRange.startYear);
      } else {
        // If range spanned multiple years, reset to "all"
        handleYearChange('all');
      }
    }
  };
  
  // Toggle between range and single mode for months
  const toggleMonthRangeMode = (value) => {
    const newMode = typeof value === 'boolean' ? value : !monthRangeMode;
    setMonthRangeMode(newMode);
    
    if (newMode) {
      // Switching to range mode
      if (selectedMonth === 0) {
        // If "all" was selected, use full range (1-12)
        setMonthRange({
          startMonth: 1,
          endMonth: 12
        });
        
        // Update date range based on year selection
        if (yearRangeMode) {
          // Year range + all months
          const startYearInt = parseInt(yearRange.startYear);
          const endYearInt = parseInt(yearRange.endYear);
          
          updateSelectedDates(startYearInt, 1, 1, endYearInt, 12, 31);
        } else if (selectedYear !== 'all') {
          // Single year + all months
          const yearInt = parseInt(selectedYear);
          
          updateSelectedDates(yearInt, 1, 1, yearInt, 12, 31);
        }
      } else {
        // If a specific month was selected, use that month as both start and end
        setMonthRange({
          startMonth: selectedMonth,
          endMonth: selectedMonth
        });
        
        // Update date range based on year and day selections
        if (yearRangeMode) {
          // Year range + specific month
          const startYearInt = parseInt(yearRange.startYear);
          const endYearInt = parseInt(yearRange.endYear);
          
          if (selectedDay !== 0) {
            // Specific day
            updateSelectedDates(startYearInt, selectedMonth, selectedDay, endYearInt, selectedMonth, selectedDay);
          } else if (dayRangeMode) {
            // Day range
            updateSelectedDates(startYearInt, selectedMonth, dayRange.startDay, endYearInt, selectedMonth, dayRange.endDay);
          } else {
            // Full month
            const lastDay = new Date(endYearInt, selectedMonth, 0).getDate();
            updateSelectedDates(startYearInt, selectedMonth, 1, endYearInt, selectedMonth, lastDay);
          }
        } else if (selectedYear !== 'all') {
          // Single year + specific month
          const yearInt = parseInt(selectedYear);
          
          if (selectedDay !== 0) {
            // Specific day
            updateSelectedDates(yearInt, selectedMonth, selectedDay, yearInt, selectedMonth, selectedDay);
          } else if (dayRangeMode) {
            // Day range
            updateSelectedDates(yearInt, selectedMonth, dayRange.startDay, yearInt, selectedMonth, dayRange.endDay);
          } else {
            // Full month
            const lastDay = new Date(yearInt, selectedMonth, 0).getDate();
            updateSelectedDates(yearInt, selectedMonth, 1, yearInt, selectedMonth, lastDay);
          }
        }
      }
    } else {
      // Switching to single mode
      if (monthRange.startMonth === monthRange.endMonth) {
        // If range was for a single month, keep that month selected
        handleMonthChange(monthRange.startMonth);
      } else {
        // If range spanned multiple months, reset to "all"
        handleMonthChange(0);
      }
    }
  };
  
  // Toggle between range and single mode for days
  const toggleDayRangeMode = (value) => {
    const newMode = typeof value === 'boolean' ? value : !dayRangeMode;
    setDayRangeMode(newMode);
    
    if (newMode) {
      // Switching to range mode
      if (selectedDay === 0) {
        // If "all" was selected, use full range (1-31 or last day of month)
        let lastDay = 31;
        
        if (selectedMonth !== 0 && selectedYear !== 'all' && !yearRangeMode) {
          // If we have a specific month and year, get actual last day
          const yearInt = parseInt(selectedYear);
          lastDay = new Date(yearInt, selectedMonth, 0).getDate();
        }
        
        setDayRange({
          startDay: 1,
          endDay: lastDay
        });
        
        // Update date range based on year and month selections
        if (yearRangeMode) {
          // Year range
          const startYearInt = parseInt(yearRange.startYear);
          const endYearInt = parseInt(yearRange.endYear);
          
          if (selectedMonth !== 0) {
            // Year range + specific month + day range
            updateSelectedDates(startYearInt, selectedMonth, 1, endYearInt, selectedMonth, lastDay);
          } else if (monthRangeMode) {
            // Year range + month range + day range (not recommended)
            const lastDayEnd = new Date(endYearInt, monthRange.endMonth, 0).getDate();
            updateSelectedDates(startYearInt, monthRange.startMonth, 1, endYearInt, monthRange.endMonth, lastDayEnd);
          } else {
            // Year range + all months + day range (not recommended)
            updateSelectedDates(startYearInt, 1, 1, endYearInt, 12, 31);
          }
        } else if (selectedYear !== 'all') {
          // Single year
          const yearInt = parseInt(selectedYear);
          
          if (selectedMonth !== 0) {
            // Single year + specific month + day range
            updateSelectedDates(yearInt, selectedMonth, 1, yearInt, selectedMonth, lastDay);
          } else if (monthRangeMode) {
            // Single year + month range + day range (not recommended)
            const lastDayEnd = new Date(yearInt, monthRange.endMonth, 0).getDate();
            updateSelectedDates(yearInt, monthRange.startMonth, 1, yearInt, monthRange.endMonth, lastDayEnd);
          } else {
            // Single year + all months + day range (not recommended)
            updateSelectedDates(yearInt, 1, 1, yearInt, 12, 31);
          }
        }
      } else {
        // If a specific day was selected, use that day as both start and end
        setDayRange({
          startDay: selectedDay,
          endDay: selectedDay
        });
        
        // Keep current date selection since it's already a specific day
      }
    } else {
      // Switching to single mode
      if (dayRange.startDay === dayRange.endDay) {
        // If range was for a single day, keep that day selected
        handleDayChange(dayRange.startDay);
      } else {
        // If range spanned multiple days, reset to "all"
        handleDayChange(0);
      }
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
          borderActive: 'border-orange-600',
          borderInactive: 'border-orange-800',
          buttonBg: 'bg-orange-600',
          buttonHover: 'hover:bg-orange-700'
        };
    }
  };
  
  // Create formatted month names for display
  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'All Months';
  };
  
  // Get page title based on selection
  const getPageTitle = () => {
    if (yearRangeMode) {
      return `${yearRange.startYear}-${yearRange.endYear}`;
    } else if (selectedYear !== 'all') {
      if (monthRangeMode) {
        return `${selectedYear}: ${getMonthName(monthRange.startMonth)}-${getMonthName(monthRange.endMonth)}`;
      } else if (selectedMonth !== 0) {
        if (dayRangeMode) {
          return `${selectedYear} ${getMonthName(selectedMonth)}: ${dayRange.startDay}-${dayRange.endDay}`;
        } else if (selectedDay !== 0) {
          return `${selectedYear} ${getMonthName(selectedMonth)} ${selectedDay}`;
        } else {
          return `${selectedYear} ${getMonthName(selectedMonth)}`;
        }
      } else {
        return `${selectedYear}`;
      }
    } else {
      return 'All Time';
    }
  };
  
  const colors = getColors();
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-bold ${colors.text}`}>
          {getPageTitle()}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveLevel('year')}
            className={`px-2 py-1 text-sm rounded ${
              activeLevel === 'year' 
                ? `${colors.bg} text-white` 
                : `${colors.bgLight} ${colors.textLight} ${colors.bgHoverLight}`
            }`}
          >
            Year
          </button>
          <button
            onClick={() => setActiveLevel('month')}
            className={`px-2 py-1 text-sm rounded ${
              activeLevel === 'month' 
                ? `${colors.bg} text-white` 
                : `${colors.bgLight} ${colors.textLight} ${colors.bgHoverLight}`
            }`}
            disabled={selectedYear === 'all' && !yearRangeMode}
          >
            Month
          </button>
          <button
            onClick={() => setActiveLevel('day')}
            className={`px-2 py-1 text-sm rounded ${
              activeLevel === 'day' 
                ? `${colors.bg} text-white` 
                : `${colors.bgLight} ${colors.textLight} ${colors.bgHoverLight}`
            }`}
            disabled={(selectedYear === 'all' && !yearRangeMode) || 
                      (selectedMonth === 0 && !monthRangeMode)}
          >
            Day
          </button>
        </div>
      </div>
      
      {/* Year Selection */}
      {activeLevel === 'year' && (
        <div className="p-4 bg-orange-50 rounded border border-orange-200">
          <div className="flex justify-between items-center mb-4">
            <label className={`${colors.text} font-medium`}>
              {yearRangeMode ? 'Year Range Selection' : 'Single Year Selection'}
            </label>
            
            {/* Toggle between modes */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleYearRangeMode(false)}
                className={`px-2 py-1 rounded text-sm ${
                  !yearRangeMode 
                    ? colors.bg + ' text-white' 
                    : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                }`}
              >
                Single Year
              </button>
              
              <button
                onClick={() => toggleYearRangeMode(true)}
                className={`px-2 py-1 rounded text-sm ${
                  yearRangeMode 
                    ? colors.bg + ' text-white' 
                    : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                }`}
              >
                Year Range
              </button>
            </div>
          </div>
          
          <div className="px-4">
            {!yearRangeMode ? (
              // Single year slider
              <>
                <BetterYearSlider 
                  years={dateData.years.map(year => year.toString())} 
                  onYearChange={handleYearChange}
                  initialYear={selectedYear !== 'all' ? selectedYear : null}
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
                initialStartYear={yearRange.startYear}
                initialEndYear={yearRange.endYear}
                colorTheme={colorTheme}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Month Selection */}
      {activeLevel === 'month' && (
        <div className="p-4 bg-orange-50 rounded border border-orange-200">
          <div className="flex justify-between items-center mb-4">
            <label className={`${colors.text} font-medium`}>
              {monthRangeMode ? 'Month Range Selection' : 'Single Month Selection'}
            </label>
            
            {/* Toggle between modes */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMonthRangeMode(false)}
                className={`px-2 py-1 rounded text-sm ${
                  !monthRangeMode 
                    ? colors.bg + ' text-white' 
                    : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                }`}
              >
                Single Month
              </button>
              
              <button
                onClick={() => toggleMonthRangeMode(true)}
                className={`px-2 py-1 rounded text-sm ${
                  monthRangeMode 
                    ? colors.bg + ' text-white' 
                    : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                }`}
              >
                Month Range
              </button>
            </div>
          </div>
          
          {!monthRangeMode ? (
            // Single month selection
            <div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <button
                  onClick={() => handleMonthChange(0)}
                  className={`p-2 rounded ${
                    selectedMonth === 0 
                      ? colors.bg + ' text-white' 
                      : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                  }`}
                >
                  All Months
                </button>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <button
                    key={month}
                    onClick={() => handleMonthChange(month)}
                    className={`p-2 rounded ${
                      selectedMonth === month 
                        ? colors.bg + ' text-white' 
                        : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                    } ${!availableMonths.includes(month) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!availableMonths.includes(month)}
                  >
                    {getMonthName(month).substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Month range selection
            <div>
              <div className="mb-4">
                <label className={`block ${colors.text} mb-1`}>Start Month:</label>
                <select
                  value={monthRange.startMonth}
                  onChange={(e) => {
                    const newStartMonth = parseInt(e.target.value);
                    // Ensure end month is not before start month
                    const newEndMonth = Math.max(newStartMonth, monthRange.endMonth);
                    handleMonthRangeChange({ 
                      startMonth: newStartMonth, 
                      endMonth: newEndMonth 
                    });
                  }}
                  className="w-full p-2 border rounded"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option 
                      key={month} 
                      value={month}
                      disabled={!availableMonths.includes(month)}
                    >
                      {getMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className={`block ${colors.text} mb-1`}>End Month:</label>
                <select
                  value={monthRange.endMonth}
                  onChange={(e) => {
                    const newEndMonth = parseInt(e.target.value);
                    // Ensure start month is not after end month
                    const newStartMonth = Math.min(monthRange.startMonth, newEndMonth);
                    handleMonthRangeChange({ 
                      startMonth: newStartMonth, 
                      endMonth: newEndMonth 
                    });
                  }}
                  className="w-full p-2 border rounded"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option 
                      key={month} 
                      value={month}
                      disabled={!availableMonths.includes(month) || month < monthRange.startMonth}
                    >
                      {getMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={() => handleMonthRangeChange({ startMonth: 1, endMonth: 12 })}
                  className={`px-3 py-1 ${colors.bg} text-white rounded ${colors.bgHover}`}
                >
                  All Months
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Day Selection */}
      {activeLevel === 'day' && (
        <div className="p-4 bg-orange-50 rounded border border-orange-200">
          <div className="flex justify-between items-center mb-4">
            <label className={`${colors.text} font-medium`}>
              {dayRangeMode ? 'Day Range Selection' : 'Single Day Selection'}
            </label>
            
            {/* Toggle between modes */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleDayRangeMode(false)}
                className={`px-2 py-1 rounded text-sm ${
                  !dayRangeMode 
                    ? colors.bg + ' text-white' 
                    : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                }`}
              >
                Single Day
              </button>
              
              <button
                onClick={() => toggleDayRangeMode(true)}
                className={`px-2 py-1 rounded text-sm ${
                  dayRangeMode 
                    ? colors.bg + ' text-white' 
                    : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                }`}
              >
                Day Range
              </button>
            </div>
          </div>
          
          {!dayRangeMode ? (
            // Single day selection
            <div>
              <div className="mb-4">
                <button
                  onClick={() => handleDayChange(0)}
                  className={`mb-2 p-2 w-full rounded ${
                    selectedDay === 0 
                      ? colors.bg + ' text-white' 
                      : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                  }`}
                >
                  All Days
                </button>
                
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <button
                      key={day}
                      onClick={() => handleDayChange(day)}
                      className={`p-2 text-center rounded ${
                        selectedDay === day 
                          ? colors.bg + ' text-white' 
                          : colors.bgLight + ' ' + colors.textLight + ' ' + colors.bgHoverLight
                      } ${!availableDays.includes(day) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!availableDays.includes(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Day range selection
            <div>
              <div className="mb-4">
                <label className={`block ${colors.text} mb-1`}>Start Day:</label>
                <select
                  value={dayRange.startDay}
                  onChange={(e) => {
                    const newStartDay = parseInt(e.target.value);
                    // Ensure end day is not before start day
                    const newEndDay = Math.max(newStartDay, dayRange.endDay);
                    handleDayRangeChange({ 
                      startDay: newStartDay, 
                      endDay: newEndDay 
                    });
                  }}
                  className="w-full p-2 border rounded"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option 
                      key={day} 
                      value={day}
                      disabled={!availableDays.includes(day)}
                    >
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className={`block ${colors.text} mb-1`}>End Day:</label>
                <select
                  value={dayRange.endDay}
                  onChange={(e) => {
                    const newEndDay = parseInt(e.target.value);
                    // Ensure start day is not after end day
                    const newStartDay = Math.min(dayRange.startDay, newEndDay);
                    handleDayRangeChange({ 
                      startDay: newStartDay, 
                      endDay: newEndDay 
                    });
                  }}
                  className="w-full p-2 border rounded"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option 
                      key={day} 
                      value={day}
                      disabled={!availableDays.includes(day) || day < dayRange.startDay}
                    >
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    // Get maximum day in the current month
                    let lastDay = 31;
                    if (selectedMonth !== 0 && selectedYear !== 'all' && !yearRangeMode) {
                      const yearInt = parseInt(selectedYear);
                      lastDay = new Date(yearInt, selectedMonth, 0).getDate();
                    }
                    
                    handleDayRangeChange({ startDay: 1, endDay: lastDay });
                  }}
                  className={`px-3 py-1 ${colors.bg} text-white rounded ${colors.bgHover}`}
                >
                  All Days
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
export default HierarchicalDateSelector;