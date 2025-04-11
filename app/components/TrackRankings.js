import React, { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import PlaylistExporter from './playlist-exporter.js';

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
  onToggleYearRangeMode
}) => {
  const [sortBy, setSortBy] = useState('playsInWeek');
  const [showExporter, setShowExporter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [topN, setTopN] = useState(100);
  const [intensityThreshold, setIntensityThreshold] = useState(5); // Minimum plays per week to qualify
  
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
          <td className="p-2 text-blue-700">
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-bold text-xs mr-2 text-blue-800">{index + 1}.</span>
                <div className="font-medium">{obsession.trackName}</div>
              </div>
              <div className="text-xs text-blue-600">{obsession.artist}</div>
              <div className="text-xs text-blue-500">
                Week of {formatDate(obsession.intensePeriod.weekStart)}
              </div>
            </div>
          </td>
          <td className="p-2 align-top text-right text-blue-700">
            <div className="flex flex-col">
              <span className="font-medium">{obsession.intensePeriod.playsInWeek} in week</span>
              <span className="text-xs">{obsession.playCount} total plays</span>
              {obsession.albumName && (
                <span className="text-xs italic truncate max-w-[120px]">{obsession.albumName}</span>
              )}
            </div>
          </td>
        </>
      );
    }
    
    // Desktop view with all columns
    return (
      <>
        <td className="p-2 text-blue-700">{index + 1}</td>
        <td className="p-2 text-blue-700">{obsession.trackName}</td>
        <td className="p-2 text-blue-700">{obsession.artist}</td>
        <td className="p-2 text-right text-blue-700">
          {formatDate(obsession.intensePeriod.weekStart)}
        </td>
        <td className="p-2 text-right text-blue-700">{obsession.intensePeriod.playsInWeek}</td>
        <td className="p-2 text-right text-blue-700">{obsession.playCount}</td>
      </>
    );
  };
  
  return (
    {/* Controls Section */}
<div className="border rounded-lg p-3 sm:p-4 bg-blue-50 mb-4">
  {/* First line: Title + export button + controls */}
  <div className="flex justify-between items-center mb-4">
    <h3 className="font-bold text-blue-700">{getTitle()}</h3>
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowExporter(!showExporter)}
        className="flex items-center gap-1 px-2 py-1 sm:px-4 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-sm"
      >
        <Download size={14} className="hidden sm:inline" />
        {showExporter ? "Hide" : "Export"}
      </button>
    </div>
  </div>

  {/* Second line: Controls in a clean row */}
  <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
    <div className="flex items-center gap-1 sm:gap-2 text-blue-700">
      <label className="text-sm">Show top</label>
      <input
        type="number"
        min="1"
        max="250"
        value={topN}
        onChange={(e) => setTopN(Math.min(250, Math.max(1, parseInt(e.target.value) || 1)))}
        className="border rounded w-14 sm:w-16 px-1 sm:px-2 py-1 text-blue-700 focus:border-blue-400 focus:ring-blue-400"
      />
      <label className="text-sm">tracks</label>
    </div>
    
    <div className="flex items-center gap-1 sm:gap-2 text-blue-700">
      <label className="text-sm">Min plays/week</label>
      <input
        type="number"
        min="1"
        max="20"
        value={intensityThreshold}
        onChange={(e) => setIntensityThreshold(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
        className="border rounded w-14 px-1 sm:px-2 py-1 text-blue-700 focus:border-blue-400 focus:ring-blue-400"
      />
    </div>
    
    <div className="flex items-center gap-1 sm:gap-2">
      <span className="text-blue-700 text-sm">Sort:</span>
      <button
        onClick={() => setSortBy('playsInWeek')}
        className={`px-2 py-1 rounded text-xs ${
          sortBy === 'playsInWeek'
            ? 'bg-blue-600 text-white'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
      >
        Weekly Plays
      </button>
      <button
        onClick={() => setSortBy('playCount')}
        className={`px-2 py-1 rounded text-xs ${
          sortBy === 'playCount'
            ? 'bg-blue-600 text-white'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
        }`}
      >
        Total Plays
      </button>
      <button
        onClick={() => setSortBy('weekStart')}
        className={`px-2 py-1 rounded text-xs ${
          sortBy === 'weekStart'
            ? 'bg-blue-600 text-white'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
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
          colorTheme="blue" // Pass the colorTheme prop to match the tab's color
        />
      )}

      {/* Results Table */}
      <div className="border rounded-lg p-3 sm:p-4 bg-blue-50">
        <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
          <div className="text-blue-700 font-medium text-sm">
            {yearRangeMode && yearRange.startYear && yearRange.endYear
              ? `Brief obsessions for ${yearRange.startYear}-${yearRange.endYear}`
              : initialYear === 'all' 
                ? 'All-time brief obsessions' 
                : `Brief obsessions for ${initialYear}`}
          </div>
          <div className="text-blue-700 text-sm">
            Found <span className="font-bold">{filteredObsessions.length}</span> obsessions
          </div>
        </div>

        <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
          <div className={isMobile ? "min-w-full" : "min-w-[640px]"}>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {!isMobile && <th className="p-2 text-left text-blue-700">Rank</th>}
                  <th className="p-2 text-left text-blue-700">
                    {isMobile ? "Track Info" : "Track"}
                  </th>
                  {!isMobile && <th className="p-2 text-left text-blue-700">Artist</th>}
                  {!isMobile ? (
                    <>
                      <th className="p-2 text-right text-blue-700">Peak Week</th>
                      <th 
                        className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100 ${
                          sortBy === 'playsInWeek' ? 'font-bold' : ''
                        }`}
                        onClick={() => setSortBy('playsInWeek')}
                      >
                        Plays in Week {sortBy === 'playsInWeek' && '▼'}
                      </th>
                      <th 
                        className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100 ${
                          sortBy === 'playCount' ? 'font-bold' : ''
                        }`}
                        onClick={() => setSortBy('playCount')}
                      >
                        Total Plays {sortBy === 'playCount' && '▼'}
                      </th>
                    </>
                  ) : (
                    <th className="p-2 text-right text-blue-700">Stats</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredObsessions.length > 0 ? (
                  filteredObsessions.map((obsession, index) => (
                    <tr key={obsession.key || `${obsession.trackName}-${obsession.artist}`} className="border-b hover:bg-blue-50">
                      {renderObsessionColumns(obsession, index)}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isMobile ? 2 : 6} className="p-4 text-center text-blue-500">
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