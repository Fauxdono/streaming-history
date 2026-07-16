import React, { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import PlaylistExporter from './playlist-exporter.js';
import { useTheme } from './themeprovider.js';
import { getObsessionColors } from './theme.js';
import { RankBadge, RankBar } from './RankCardBits.js';
import TopNStepper from './TopNStepper.js';

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
  textTheme = null, // Optional separate text theme
  colorMode = 'minimal',
  viewMode = 'grid', // 'grid' or 'list'
  gridToggle = null,
  externalControls = null
}) => {
  const isColorful = colorMode === 'colorful';
  const [_sortBy, _setSortBy] = useState('playsInWeek');
  const [sortPress, setSortPress] = useState(0);
  const [_showExporter, _setShowExporter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [_topN, _setTopN] = useState(100);
  const [_intensityThreshold, _setIntensityThreshold] = useState(5);

  // Use external controls if provided (desktop controls in parent header), otherwise internal state
  const topN = externalControls?.topN ?? _topN;
  const setTopN = externalControls?.setTopN ?? _setTopN;
  const intensityThreshold = externalControls?.intensityThreshold ?? _intensityThreshold;
  const setIntensityThreshold = externalControls?.setIntensityThreshold ?? _setIntensityThreshold;
  const sortBy = externalControls?.sortBy ?? _sortBy;
  const setSortBy = externalControls?.setSortBy ?? _setSortBy;
  const showExporter = externalControls?.showExporter ?? _showExporter;
  const setShowExporter = externalControls?.setShowExporter ?? _setShowExporter;
  
  // Get the current theme
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Themed colors from the shared design system (see theme.js)
  const getThemedColors = () => getObsessionColors({ textTheme, backgroundTheme, isColorful, isDarkMode });
  
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

const filteredObsessions = useMemo(() => {
  // Use yearRangeMode and yearRange when in range mode, otherwise use initialYear
  if (!briefObsessions || briefObsessions.length === 0) return [];

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
  } else if (initialYear.startsWith('all-')) {
    // All-time with month or month+day filter (all-MM or all-MM-DD)
    const allParts = initialYear.split('-');
    if (allParts.length === 3) {
      const month = parseInt(allParts[1]) - 1; // JS months are 0-indexed
      const day = parseInt(allParts[2]);
      yearFiltered = briefObsessions.filter(obs => {
        if (!obs.intensePeriod?.weekStart) return false;
        const weekStart = new Date(obs.intensePeriod.weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        // Check if the selected month+day (any year) falls within this week
        // Try each year that the obsession's week could span
        const wsYear = weekStart.getFullYear();
        const target = new Date(wsYear, month, day);
        return target >= weekStart && target <= weekEnd;
      });
    } else {
      const month = parseInt(allParts[1]) - 1; // JS months are 0-indexed
      yearFiltered = briefObsessions.filter(obs => {
        if (!obs.intensePeriod?.weekStart) return false;
        const weekStart = new Date(obs.intensePeriod.weekStart);
        const weekMonth = weekStart.getMonth();
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const endMonth = weekEnd.getMonth();
        return weekMonth === month || endMonth === month;
      });
    }
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

  // Empty-data return lives BELOW every hook: an early return above them made
  // the hook count change between renders and crashed once data arrived
  if (!briefObsessions || briefObsessions.length === 0) {
    return <div>No brief obsessions data available</div>;
  }

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

    {/* No mobile title — like the Artists/Albums pages, phones go straight to
        the controls row (the desktop title lives in the parent header) */}

    {/* Controls - hidden on desktop when externally controlled, shown on mobile */}
    <div className={`flex flex-wrap gap-2 items-center mb-2${externalControls ? ' sm:hidden' : ''}`}>
      <div className={`flex items-center gap-1 ${getThemedColors().text}`}>
        <label className={`text-xs sm:text-sm ${getThemedColors().text}`}>Top</label>
        <TopNStepper
          value={topN}
          setValue={setTopN}
          max={250}
          inputClass={`${getThemedColors().text} ${getThemedColors().focus} ${getThemedColors().buttonShadow}`}
          buttonClass={getThemedColors().text}
        />
      </div>
      <div className={`flex items-center gap-1 ${getThemedColors().text}`}>
        <label className={`text-xs sm:text-sm ${getThemedColors().text}`}>Min/wk</label>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max="20"
          value={intensityThreshold}
          onChange={(e) => setIntensityThreshold(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
          className={`stepper-input-sm border rounded w-9 px-1 py-1 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getThemedColors().text} ${getThemedColors().focus} ${getThemedColors().buttonShadow}`}
        />
      </div>
      <button
        onClick={() => setShowExporter(!showExporter)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${getThemedColors().bgButton} ${getThemedColors().bgButtonHover} ${getThemedColors().buttonShadow}`}
      >
        <Download size={12} />
        m3u
      </button>
      <button
        key={`obsessions-sort-${sortPress}`}
        onClick={() => { setSortBy(sortBy === 'playsInWeek' ? 'playCount' : sortBy === 'playCount' ? 'weekStart' : 'playsInWeek'); if (!isColorful) setSortPress(p => p + 1); }}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${getThemedColors().bgButton} ${getThemedColors().bgButtonHover} ${getThemedColors().buttonShadow} ${sortPress > 0 ? (isDarkMode ? 'btn-press-dark' : 'btn-press-light') : ''}`}
      >
        {{ playsInWeek: 'Weekly Plays', playCount: 'Total Plays', weekStart: 'Recent First' }[sortBy]}
      </button>
      {gridToggle}
    </div>
    
    {/* Playlist Exporter */}
    {showExporter && (
      <PlaylistExporter 
        processedData={filteredObsessions}
        songsByYear={songsByYear}
        selectedYear={yearRangeMode ? `${yearRange.startYear}-${yearRange.endYear}` : initialYear}
        briefObsessions={briefObsessions}
        colorTheme={colorTheme}
        colorMode={colorMode}
        playlistType="obsessions"
      />
    )}

    {/* Results - Grid or List View (no wrapper card: its border+padding pushed
        the song cards away from the screen edges on mobile) */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 gap-4 mt-2 items-start">
          {filteredObsessions.length > 0 ? (
            filteredObsessions.map((obsession, index) => {
              const key = obsession.key || `${obsession.trackName}-${obsession.artist}`;
              const isExpanded = !!expandedCards[key];
              const c = getThemedColors();
              return (
                <div
                  key={key}
                  className={`p-3 ${c.bgLight} rounded border ${c.border} text-center ${c.shadow}`}
                >
                  {/* Row 1: rank + name + artist subline + toggle */}
                  <div className={`flex items-start justify-between font-bold text-base leading-tight mb-2 ${!isExpanded ? 'overflow-hidden' : ''} ${c.text}`}>
                    <RankBadge rank={index + 1} isDarkMode={isDarkMode} />
                    <div className="flex-1 min-w-0 text-center px-1">
                      <div className={isExpanded ? 'break-words' : 'truncate'} title={obsession.trackName}>{obsession.trackName}</div>
                      <div className={`text-xs font-normal opacity-70 ${isExpanded ? 'break-words' : 'truncate'} ${c.textLight}`}>{obsession.artist}</div>
                    </div>
                    <button type="button" onClick={() => setExpandedCards(p => ({ ...p, [key]: !p[key] }))} className="w-5 text-sm opacity-60 hover:opacity-100 cursor-pointer shrink-0">
                      {isExpanded ? '−' : '+'}
                    </button>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className={`grid grid-cols-2 gap-1 mb-2 text-xs ${c.textLight}`}>
                      <div><div className="opacity-60">Peak Week</div><div className="font-bold">{obsession.intensePeriod.playsInWeek}</div></div>
                      <div><div className="opacity-60">Total Plays</div><div className="font-bold">{obsession.playCount}</div></div>
                    </div>
                  )}

                  {/* Full-width fact rows: label left, value right */}
                  <div className={`space-y-1 text-xs ${c.textLight}`}>
                    {obsession.albumName && (
                      <div className="flex justify-between gap-2">
                        <span className="opacity-60 shrink-0">Album</span>
                        <span className={`font-bold text-right min-w-0 ${isExpanded ? 'break-words' : 'truncate'}`} title={obsession.albumName}>{obsession.albumName}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="opacity-60 shrink-0">Week of</span>
                      <span className="font-bold text-right min-w-0 truncate">{formatDate(obsession.intensePeriod.weekStart)}</span>
                    </div>
                  </div>

                  {/* Play bar — peak-week intensity relative to #1 */}
                  <RankBar
                    value={obsession.intensePeriod?.playsInWeek || 0}
                    max={filteredObsessions[0]?.intensePeriod?.playsInWeek || 0}
                    label={`${obsession.intensePeriod?.playsInWeek || 0} in a week`}
                    className={c.text || (isDarkMode ? 'text-[#4169E1]' : 'text-black')}
                  />
                </div>
              );
            })
          ) : (
            <div className={`col-span-full p-4 text-center ${getThemedColors().textLighter}`}>
              {yearRangeMode && yearRange.startYear && yearRange.endYear
                ? `No brief obsessions found for ${yearRange.startYear}-${yearRange.endYear}${intensityThreshold > 1 ? ` with at least ${intensityThreshold} plays per week` : ''}`
                : initialYear !== 'all'
                  ? `No brief obsessions found for ${initialYear}${intensityThreshold > 1 ? ` with at least ${intensityThreshold} plays per week` : ''}`
                  : `No brief obsessions available${intensityThreshold > 1 ? ` with at least ${intensityThreshold} plays per week` : ''}`
              }
            </div>
          )}
        </div>
      ) : (
        /* List/Table View */
        <div className="overflow-x-auto mt-2">
          <div className={isMobile ? "min-w-full" : "min-w-[640px]"}>
            <table className={`w-full border-collapse ${getThemedColors().bg}`}>
              <thead>
                <tr className={`border-b ${getThemedColors().border} ${getThemedColors().bg}`}>
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
                    <tr key={obsession.key || `${obsession.trackName}-${obsession.artist}`} className={`border-b ${getThemedColors().border} ${getThemedColors().bg} ${getThemedColors().bgHover}`}>
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
      )}
  </div>
);
};

export default TrackRankings;