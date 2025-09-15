import React, { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import PlaylistExporter from './playlist-exporter.js';
import { useTheme } from './themeprovider.js';

const TrackRankings = ({ 
  processedData = [], 
  briefObsessions = [], 
  songsByYear = {}, 
  formatDuration, 
  onYearChange, 
  initialYear,
  // Add new props to handle year ranges 
  yearRange = { startYear: '', endYear: '' },
  yearRangeMode = false,
  onYearRangeChange,
  onToggleYearRangeMode,
  colorTheme = 'blue',
  backgroundTheme = null, // Optional separate background theme
  textTheme = null // Optional separate text theme
}) => {
  const [sortBy, setSortBy] = useState('playsInWeek');
  const [showExporter, setShowExporter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [topN, setTopN] = useState(100);
  const [intensityThreshold, setIntensityThreshold] = useState(5); // Minimum plays per week to qualify
  
  // Get the current theme and colorblind adjustment function
  const { theme, getColorblindAdjustedTheme } = useTheme() || {};
  const isDarkMode = theme === 'dark';
  
  // Helper function to get themed colors (flexible theming system)
  const getThemedColors = () => {
    // Apply colorblind adjustments to themes
    const adjustedTextTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(textTheme || colorTheme) : (textTheme || colorTheme);
    const adjustedBackgroundTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(backgroundTheme || colorTheme) : (backgroundTheme || colorTheme);
    const adjustedColorTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(colorTheme) : colorTheme;
    
    // Debug logging to see what props we're receiving
    console.log('TrackRankings props:', { textTheme, backgroundTheme, colorTheme, adjustedTextTheme, adjustedBackgroundTheme, adjustedColorTheme });
    const textColors = {
      rose: { text: isDarkMode ? 'text-rose-300' : 'text-rose-700', textLight: isDarkMode ? 'text-rose-400' : 'text-rose-600', textDark: isDarkMode ? 'text-rose-200' : 'text-rose-800' },
      blue: { text: isDarkMode ? 'text-blue-300' : 'text-blue-700', textLight: isDarkMode ? 'text-blue-400' : 'text-blue-600', textDark: isDarkMode ? 'text-blue-200' : 'text-blue-800' },
      red: { text: isDarkMode ? 'text-red-300' : 'text-red-700', textLight: isDarkMode ? 'text-red-400' : 'text-red-600', textDark: isDarkMode ? 'text-red-200' : 'text-red-800' },
      amber: { text: isDarkMode ? 'text-amber-300' : 'text-amber-700', textLight: isDarkMode ? 'text-amber-400' : 'text-amber-600', textDark: isDarkMode ? 'text-amber-200' : 'text-amber-800' },
      yellow: { text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700', textLight: isDarkMode ? 'text-yellow-400' : 'text-yellow-600', textDark: isDarkMode ? 'text-yellow-200' : 'text-yellow-800' },
      // Add colorblind-friendly colors
      cyan: { text: isDarkMode ? 'text-cyan-300' : 'text-cyan-700', textLight: isDarkMode ? 'text-cyan-400' : 'text-cyan-600', textDark: isDarkMode ? 'text-cyan-200' : 'text-cyan-800' },
      teal: { text: isDarkMode ? 'text-teal-300' : 'text-teal-700', textLight: isDarkMode ? 'text-teal-400' : 'text-teal-600', textDark: isDarkMode ? 'text-teal-200' : 'text-teal-800' },
      violet: { text: isDarkMode ? 'text-violet-300' : 'text-violet-700', textLight: isDarkMode ? 'text-violet-400' : 'text-violet-600', textDark: isDarkMode ? 'text-violet-200' : 'text-violet-800' },
      purple: { text: isDarkMode ? 'text-purple-300' : 'text-purple-700', textLight: isDarkMode ? 'text-purple-400' : 'text-purple-600', textDark: isDarkMode ? 'text-purple-200' : 'text-purple-800' },
      indigo: { text: isDarkMode ? 'text-indigo-300' : 'text-indigo-700', textLight: isDarkMode ? 'text-indigo-400' : 'text-indigo-600', textDark: isDarkMode ? 'text-indigo-200' : 'text-indigo-800' },
      orange: { text: isDarkMode ? 'text-orange-300' : 'text-orange-700', textLight: isDarkMode ? 'text-orange-400' : 'text-orange-600', textDark: isDarkMode ? 'text-orange-200' : 'text-orange-800' },
      gray: { text: isDarkMode ? 'text-gray-300' : 'text-gray-700', textLight: isDarkMode ? 'text-gray-400' : 'text-gray-600', textDark: isDarkMode ? 'text-gray-200' : 'text-gray-800' },
      slate: { text: isDarkMode ? 'text-slate-300' : 'text-slate-700', textLight: isDarkMode ? 'text-slate-400' : 'text-slate-600', textDark: isDarkMode ? 'text-slate-200' : 'text-slate-800' }
    };

    const backgroundColors = {
      red: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-red-700' : 'border-red-200',
        borderHover: isDarkMode ? 'border-red-500' : 'border-red-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-red-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-red-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-red-200',
        bgSelected: isDarkMode ? 'bg-red-600' : 'bg-red-600', bgSelectedHover: isDarkMode ? 'hover:bg-red-700' : 'hover:bg-red-700',
        focusRing: isDarkMode ? 'focus:ring-red-400' : 'focus:ring-red-400'
      },
      rose: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-rose-700' : 'border-rose-200',
        borderHover: isDarkMode ? 'border-rose-500' : 'border-rose-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-rose-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-rose-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-rose-200',
        bgSelected: isDarkMode ? 'bg-rose-600' : 'bg-rose-600', bgSelectedHover: isDarkMode ? 'hover:bg-rose-700' : 'hover:bg-rose-700',
        focusRing: isDarkMode ? 'focus:ring-rose-400' : 'focus:ring-rose-400'
      },
      blue: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-blue-700' : 'border-blue-200',
        borderHover: isDarkMode ? 'border-blue-500' : 'border-blue-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-blue-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-blue-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-200',
        bgSelected: isDarkMode ? 'bg-blue-600' : 'bg-blue-600', bgSelectedHover: isDarkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-700',
        focusRing: isDarkMode ? 'focus:ring-blue-400' : 'focus:ring-blue-400'
      },
      amber: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-amber-700' : 'border-amber-200',
        borderHover: isDarkMode ? 'border-amber-500' : 'border-amber-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-amber-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-amber-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-amber-200',
        bgSelected: isDarkMode ? 'bg-amber-600' : 'bg-amber-600', bgSelectedHover: isDarkMode ? 'hover:bg-amber-700' : 'hover:bg-amber-700',
        focusRing: isDarkMode ? 'focus:ring-amber-400' : 'focus:ring-amber-400'
      },
      yellow: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-yellow-700' : 'border-yellow-200',
        borderHover: isDarkMode ? 'border-yellow-500' : 'border-yellow-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-yellow-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-yellow-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-yellow-200',
        bgSelected: isDarkMode ? 'bg-yellow-600' : 'bg-yellow-600', bgSelectedHover: isDarkMode ? 'hover:bg-yellow-700' : 'hover:bg-yellow-700',
        focusRing: isDarkMode ? 'focus:ring-yellow-400' : 'focus:ring-yellow-400'
      },
      // Add colorblind-friendly background colors
      cyan: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-cyan-700' : 'border-cyan-200',
        borderHover: isDarkMode ? 'border-cyan-500' : 'border-cyan-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-cyan-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-cyan-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-cyan-200',
        bgSelected: isDarkMode ? 'bg-cyan-600' : 'bg-cyan-600', bgSelectedHover: isDarkMode ? 'hover:bg-cyan-700' : 'hover:bg-cyan-700',
        focusRing: isDarkMode ? 'focus:ring-cyan-400' : 'focus:ring-cyan-400'
      },
      teal: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-teal-700' : 'border-teal-200',
        borderHover: isDarkMode ? 'border-teal-500' : 'border-teal-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-teal-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-teal-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-teal-200',
        bgSelected: isDarkMode ? 'bg-teal-600' : 'bg-teal-600', bgSelectedHover: isDarkMode ? 'hover:bg-teal-700' : 'hover:bg-teal-700',
        focusRing: isDarkMode ? 'focus:ring-teal-400' : 'focus:ring-teal-400'
      },
      violet: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-violet-700' : 'border-violet-200',
        borderHover: isDarkMode ? 'border-violet-500' : 'border-violet-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-violet-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-violet-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-violet-200',
        bgSelected: isDarkMode ? 'bg-violet-600' : 'bg-violet-600', bgSelectedHover: isDarkMode ? 'hover:bg-violet-700' : 'hover:bg-violet-700',
        focusRing: isDarkMode ? 'focus:ring-violet-400' : 'focus:ring-violet-400'
      },
      purple: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-purple-700' : 'border-purple-200',
        borderHover: isDarkMode ? 'border-purple-500' : 'border-purple-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-purple-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-purple-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-purple-200',
        bgSelected: isDarkMode ? 'bg-purple-600' : 'bg-purple-600', bgSelectedHover: isDarkMode ? 'hover:bg-purple-700' : 'hover:bg-purple-700',
        focusRing: isDarkMode ? 'focus:ring-purple-400' : 'focus:ring-purple-400'
      },
      indigo: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-indigo-700' : 'border-indigo-200',
        borderHover: isDarkMode ? 'border-indigo-500' : 'border-indigo-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-indigo-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-indigo-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-indigo-200',
        bgSelected: isDarkMode ? 'bg-indigo-600' : 'bg-indigo-600', bgSelectedHover: isDarkMode ? 'hover:bg-indigo-700' : 'hover:bg-indigo-700',
        focusRing: isDarkMode ? 'focus:ring-indigo-400' : 'focus:ring-indigo-400'
      },
      orange: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-orange-700' : 'border-orange-200',
        borderHover: isDarkMode ? 'border-orange-500' : 'border-orange-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-orange-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-orange-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-orange-200',
        bgSelected: isDarkMode ? 'bg-orange-600' : 'bg-orange-600', bgSelectedHover: isDarkMode ? 'hover:bg-orange-700' : 'hover:bg-orange-700',
        focusRing: isDarkMode ? 'focus:ring-orange-400' : 'focus:ring-orange-400'
      },
      gray: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
        borderHover: isDarkMode ? 'border-gray-500' : 'border-gray-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-gray-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200',
        bgSelected: isDarkMode ? 'bg-gray-600' : 'bg-gray-600', bgSelectedHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-700',
        focusRing: isDarkMode ? 'focus:ring-gray-400' : 'focus:ring-gray-400'
      },
      slate: {
        bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-slate-700' : 'border-slate-200',
        borderHover: isDarkMode ? 'border-slate-500' : 'border-slate-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-slate-50',
        bgButton: isDarkMode ? 'bg-gray-800' : 'bg-slate-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-slate-200',
        bgSelected: isDarkMode ? 'bg-slate-600' : 'bg-slate-600', bgSelectedHover: isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-700',
        focusRing: isDarkMode ? 'focus:ring-slate-400' : 'focus:ring-slate-400'
      }
    };

    const textColorObj = textColors[adjustedTextTheme] || textColors.rose;
    const backgroundColorObj = backgroundColors[adjustedBackgroundTheme] || backgroundColors.red;

    console.log('Selected colors:', { 
      textTheme, 
      backgroundTheme, 
      textColorObj, 
      backgroundColorObj,
      finalColors: { ...textColorObj, ...backgroundColorObj }
    });

    return { ...textColorObj, ...backgroundColorObj };
  };
  
  // Add check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // When initialYear changes, notify parent
  useEffect(() => {
    if (onYearChange && initialYear !== undefined) {
      onYearChange(initialYear);
    }
  }, [initialYear, onYearChange]);

  // IMPORTANT: We don't maintain our own selectedYear state anymore
  // Instead, we use the initialYear prop directly from parent

  if (!briefObsessions || briefObsessions.length === 0) {
    return <div>No brief obsessions data available</div>;
  }


const filteredObsessions = useMemo(() => {
  // Use yearRangeMode and yearRange when in range mode, otherwise use initialYear
  
  // First filter by year
  let yearFiltered = [];
  
  if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
    // Range mode
    
    // Handle ranges with month/day specificity
    const startHasMonthDay = yearRange.startYear.includes('-');
    const endHasMonthDay = yearRange.endYear.includes('-');
    
    if (startHasMonthDay || endHasMonthDay) {
      // Parse dates into Date objects for comparison
      let startDate, endDate;
      
      try {
        // Process start date
        if (startHasMonthDay) {
          if (yearRange.startYear.split('-').length === 3) {
            // YYYY-MM-DD format
            startDate = new Date(yearRange.startYear);
            startDate.setHours(0, 0, 0, 0); // Start of day
          } else if (yearRange.startYear.split('-').length === 2) {
            // YYYY-MM format
            const [year, month] = yearRange.startYear.split('-').map(Number);
            startDate = new Date(year, month - 1, 1); // First day of month
          }
        } else {
          // Just year
          startDate = new Date(parseInt(yearRange.startYear), 0, 1); // January 1st
        }
        
        // Process end date
        if (endHasMonthDay) {
          if (yearRange.endYear.split('-').length === 3) {
            // YYYY-MM-DD format
            endDate = new Date(yearRange.endYear);
            endDate.setHours(23, 59, 59, 999); // End of day
          } else if (yearRange.endYear.split('-').length === 2) {
            // YYYY-MM format
            const [year, month] = yearRange.endYear.split('-').map(Number);
            // Get last day of month
            const lastDay = new Date(year, month, 0).getDate();
            endDate = new Date(year, month - 1, lastDay, 23, 59, 59, 999);
          }
        } else {
          // Just year
          endDate = new Date(parseInt(yearRange.endYear), 11, 31, 23, 59, 59, 999); // December 31st
        }
        
        // Find obsessions within this date range
        yearFiltered = briefObsessions.filter(obs => {
          if (!obs.intensePeriod?.weekStart) return false;
          
          const weekStart = new Date(obs.intensePeriod.weekStart);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6); // Full week
          
          // Include if intense period overlaps with the selected date range
          return (weekStart <= endDate && weekEnd >= startDate);
        });
        
      } catch (err) {
        console.error("Error processing date range", err);
        yearFiltered = [];
      }
    } else {
      // Simple year range
      const startYear = parseInt(yearRange.startYear);
      const endYear = parseInt(yearRange.endYear);
      
      yearFiltered = briefObsessions.filter(obs => {
        if (!obs.intensePeriod?.weekStart) return false;
        
        const weekStart = new Date(obs.intensePeriod.weekStart);
        const year = weekStart.getFullYear();
        
        return year >= startYear && year <= endYear;
      });
    }
  } else if (initialYear === 'all') {
    // All-time view
    yearFiltered = briefObsessions;
  } else if (initialYear.includes('-')) {
    // If date includes day or month (YYYY-MM-DD or YYYY-MM format)
    const parts = initialYear.split('-');
    
    if (parts.length === 3) {
      // Single day selection (YYYY-MM-DD)
      const selectedDate = new Date(initialYear);
      
      // Find obsessions that include this specific day
      yearFiltered = briefObsessions.filter(obs => {
        if (!obs.intensePeriod?.weekStart) return false;
        
        // Check if selected date falls within the week of this obsession
        const weekStart = new Date(obs.intensePeriod.weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        return selectedDate >= weekStart && selectedDate <= weekEnd;
      });
    } else if (parts.length === 2) {
      // Month selection (YYYY-MM)
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
      
      // Find obsessions within this month
      yearFiltered = briefObsessions.filter(obs => {
        if (!obs.intensePeriod?.weekStart) return false;
        
        const weekStart = new Date(obs.intensePeriod.weekStart);
        const weekYear = weekStart.getFullYear();
        const weekMonth = weekStart.getMonth();
        
        // Week might span multiple months, so check both week start and end
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const endMonth = weekEnd.getMonth();
        const endYear = weekEnd.getFullYear();
        
        // Match if week overlaps with selected month
        return (weekYear === year && weekMonth === month) || 
               (endYear === year && endMonth === month);
      });
    } else {
      yearFiltered = [];
    }
  } else {
    // Regular single year filter
    yearFiltered = briefObsessions.filter(obs => {
      if (!obs.intensePeriod?.weekStart) return false;
      
      // Check for both the year directly, and if it might be part of a year range
      // where start and end are the same
      const weekStart = new Date(obs.intensePeriod.weekStart);
      const yearStr = weekStart.getFullYear().toString();
      
      // Direct match for the selected year
      if (yearStr === initialYear) {
        return true;
      }
      
      // If we have songsByYear with a range key that represents a single year
      // (e.g., "2022-2022"), also include those
      if (typeof songsByYear === 'object') {
        const rangeKey = `${initialYear}-${initialYear}`;
        if (rangeKey in songsByYear) {
          return yearStr === initialYear;
        }
      }
      
      return false;
    });
  }
  
  // Then apply intensity threshold and sort
  return yearFiltered
    .filter(obs => obs.intensePeriod.playsInWeek >= intensityThreshold)
    .sort((a, b) => {
      if (sortBy === 'playsInWeek') {
        return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
      } else if (sortBy === 'playCount') {
        return b.playCount - a.playCount;
      } else if (sortBy === 'weekStart') {
        return new Date(b.intensePeriod.weekStart) - new Date(a.intensePeriod.weekStart);
      }
      return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
    })
    .slice(0, topN);
}, [briefObsessions, initialYear, yearRangeMode, yearRange, sortBy, intensityThreshold, topN, songsByYear]);

// DO NOT add another songsByYear declaration
  
  // Function to format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Function to get the appropriate title based on year
  const getTitle = () => { 
    if (yearRangeMode && yearRange.startYear && yearRange.endYear) {
      return `Brief Obsessions (${yearRange.startYear}-${yearRange.endYear})`;
    } else if (initialYear === 'all') { 
      return 'All-time Brief Obsessions (All Time)'; 
    } 
    return `Top Brief Obsessions for ${initialYear}`; 
  };

  const renderObsessionColumns = (obsession, index) => {
    if (isMobile) {
      // Mobile view for obsessions
      return (
        <>
          <td className={`p-2 ${getThemedColors().text}`}>
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className={`font-bold text-xs mr-2 ${getThemedColors().textDark}`}>{index + 1}.</span>
                <div className="font-medium">{obsession.trackName}</div>
              </div>
              <div className={`text-xs ${getThemedColors().textLight}`}>{obsession.artist}</div>
              <div className={`text-xs ${getThemedColors().textLighter}`}>
                Week of {formatDate(obsession.intensePeriod.weekStart)}
              </div>
            </div>
          </td>
          <td className={`p-2 align-top text-right ${getThemedColors().text}`}>
            <div className="flex flex-col">
              <span className="font-medium">{obsession.intensePeriod.playsInWeek} in week</span>
              <span className={`text-xs ${getThemedColors().text}`}>{obsession.playCount} total plays</span>
              {obsession.albumName && (
                <span className={`text-xs italic truncate max-w-[120px] ${getThemedColors().textLight}`}>{obsession.albumName}</span>
              )}
            </div>
          </td>
        </>
      );
    }
    
    // Desktop view with all columns
    return (
      <>
        <td className={`p-2 ${getThemedColors().text}`}>{index + 1}</td>
        <td className={`p-2 ${getThemedColors().text}`}>{obsession.trackName}</td>
        <td className={`p-2 ${getThemedColors().text}`}>{obsession.artist}</td>
        <td className={`p-2 text-right ${getThemedColors().text}`}>
          {formatDate(obsession.intensePeriod.weekStart)}
        </td>
        <td className={`p-2 text-right ${getThemedColors().text}`}>{obsession.intensePeriod.playsInWeek}</td>
        <td className={`p-2 text-right ${getThemedColors().text}`}>{obsession.playCount}</td>
      </>
    );
  };
  
return (
  <div className="w-full">

    <div className="flex justify-between items-center mb-2">
      <h3 className={`text-sm sm:text-lg font-bold ${getThemedColors().text}`}>
        {yearRangeMode && yearRange.startYear && yearRange.endYear
          ? `Brief Obsessions (${yearRange.startYear}-${yearRange.endYear})`
          : initialYear === 'all' 
            ? 'Brief Obsessions (All Time)' 
            : `Brief Obsessions (${initialYear})`}
      </h3>
      
    

        <div className={`flex items-center gap-1 sm:gap-2 ${getThemedColors().text} ml-2`}>
      <label className={`${getThemedColors().text} ml-2`}>Show Top</label>
          <input
            type="number"
            min="1"
            max="250"
            value={topN}
            onChange={(e) => setTopN(Math.min(250, Math.max(1, parseInt(e.target.value) || 1)))}
            className={`border rounded w-14 sm:w-16 px-1 sm:px-2 py-1 ${getThemedColors().text} ${getThemedColors().focus}`}
          />
      </div>
    </div>

    {/* Controls Section */}
 
      {/* Second line: Controls in a clean row */}
      <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
        <div className={`flex items-center gap-1 sm:gap-2 ${getThemedColors().text}`}>
          <label className={`text-sm ${getThemedColors().text}`}>Min plays/week</label>
          <input
            type="number"
            min="1"
            max="20"
            value={intensityThreshold}
            onChange={(e) => setIntensityThreshold(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
            className={`border rounded w-14 px-1 sm:px-2 py-1 ${getThemedColors().text} ${getThemedColors().focus}`}
          />
        </div>

  <div className="flex items-center gap-2">
        <button
          onClick={() => setShowExporter(!showExporter)}
          className={`flex items-center gap-1 px-2 py-1 ${getThemedColors().bgButton} text-black rounded ${getThemedColors().bgButtonHover} text-xs`}
        >
          <Download size={14} className="hidden sm:inline" />
          {showExporter ? "Hide" : "Export M3u"}
        </button>
        
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`${getThemedColors().text} text-sm`}>Sort:</span>
          <button
            onClick={() => setSortBy('playsInWeek')}
            className={`px-2 py-1 rounded text-xs ${
              sortBy === 'playsInWeek'
                ? `${getThemedColors().bgButton} text-black`
                : `${getThemedColors().bgButtonLight} ${getThemedColors().text} ${getThemedColors().bgButtonLightHover}`
            }`}
          >
            Weekly Plays
          </button>
          <button
            onClick={() => setSortBy('playCount')}
            className={`px-2 py-1 rounded text-xs ${
              sortBy === 'playCount'
                ? `${getThemedColors().bgButton} text-black`
                : `${getThemedColors().bgButtonLight} ${getThemedColors().text} ${getThemedColors().bgButtonLightHover}`
            }`}
          >
            Total Plays
          </button>
          <button
            onClick={() => setSortBy('weekStart')}
            className={`px-2 py-1 rounded text-xs ${
              sortBy === 'weekStart'
                ? `${getThemedColors().bgButton} text-black`
                : `${getThemedColors().bgButtonLight} ${getThemedColors().text} ${getThemedColors().bgButtonLightHover}`
            }`}
          >
            Recent First
          </button>
        </div>
      </div>
    </div>
    
    {/* Playlist Exporter */}
    {showExporter && (
      <PlaylistExporter 
        processedData={filteredObsessions}
        songsByYear={songsByYear}
        selectedYear={yearRangeMode ? `${yearRange.startYear}-${yearRange.endYear}` : initialYear}
        briefObsessions={briefObsessions}
        colorTheme={colorTheme} // Pass the colorTheme prop to match the tab's color
      />
    )}

    {/* Results Table */}
    <div className={`border rounded-lg p-3 sm:p-4 ${getThemedColors().bg}`}>
      <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
        <div className={`${getThemedColors().text} font-medium text-sm`}>
          {yearRangeMode && yearRange.startYear && yearRange.endYear
            ? `Brief obsessions for ${yearRange.startYear}-${yearRange.endYear}`
            : initialYear === 'all' 
              ? 'All-time brief obsessions' 
              : `Brief obsessions for ${initialYear}`}
        </div>
        <div className={`${getThemedColors().text} text-sm`}>
          Found <span className="font-bold">{filteredObsessions.length}</span> obsessions
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
        <div className={isMobile ? "min-w-full" : "min-w-[640px]"}>
          <table className={`w-full border-collapse ${getThemedColors().bg}`}>
            <thead>
              <tr className={`border-b ${getThemedColors().bg}`}>
                {!isMobile && <th className={`p-2 text-left ${getThemedColors().text}`}>Rank</th>}
                <th className={`p-2 text-left ${getThemedColors().text}`}>
                  {isMobile ? "Track Info" : "Track"}
                </th>
                {!isMobile && <th className={`p-2 text-left ${getThemedColors().text}`}>Artist</th>}
                {!isMobile ? (
                  <>
                    <th className={`p-2 text-right ${getThemedColors().text}`}>Peak Week</th>
                    <th 
                      className={`p-2 text-right ${getThemedColors().text} cursor-pointer ${getThemedColors().bgHover} ${
                        sortBy === 'playsInWeek' ? 'font-bold' : ''
                      }`}
                      onClick={() => setSortBy('playsInWeek')}
                    >
                      Plays in Week {sortBy === 'playsInWeek' && '▼'}
                    </th>
                    <th 
                      className={`p-2 text-right ${getThemedColors().text} cursor-pointer ${getThemedColors().bgHover} ${
                        sortBy === 'playCount' ? 'font-bold' : ''
                      }`}
                      onClick={() => setSortBy('playCount')}
                    >
                      Total Plays {sortBy === 'playCount' && '▼'}
                    </th>
                  </>
                ) : (
                  <th className={`p-2 text-right ${getThemedColors().text}`}>Stats</th>
                )}
              </tr>
            </thead>
            <tbody className={getThemedColors().bg}>
              {filteredObsessions.length > 0 ? (
                filteredObsessions.map((obsession, index) => (
                  <tr key={obsession.key || `${obsession.trackName}-${obsession.artist}`} className={`border-b ${getThemedColors().bg} ${getThemedColors().bgHover}`}>
                    {renderObsessionColumns(obsession, index)}
                  </tr>
                ))
              ) : (
                <tr className={getThemedColors().bg}>
                  <td colSpan={isMobile ? 2 : 6} className={`p-4 text-center ${getThemedColors().textLighter} ${getThemedColors().bg}`}>
                    {yearRangeMode && yearRange.startYear && yearRange.endYear
                      ? `No brief obsessions found for ${yearRange.startYear}-${yearRange.endYear}${intensityThreshold > 1 ? ` with at least ${intensityThreshold} plays per week` : ''}`
                      : initialYear !== 'all' 
                        ? `No brief obsessions found for ${initialYear}${intensityThreshold > 1 ? ` with at least ${intensityThreshold} plays per week` : ''}`
                        : `No brief obsessions available${intensityThreshold > 1 ? ` with at least ${intensityThreshold} plays per week` : ''}`
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
);
};

export default TrackRankings;