import React, { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import PlaylistExporter from './playlist-exporter.js';

const TrackRankings = ({ 
  processedData = [], 
  briefObsessions = [], 
  songsByYear = {}, 
  formatDuration, 
  onYearChange, 
  initialYear 
}) => {
  const [sortBy, setSortBy] = useState('playsInWeek');
  const [showExporter, setShowExporter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
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

  // Filter obsessions based on selected year
  const filteredObsessions = useMemo(() => {
    const selectedYear = initialYear;
    
    if (selectedYear === 'all') {
      // All-time view
      return briefObsessions.sort((a, b) => {
        if (sortBy === 'playsInWeek') {
          return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
        } else if (sortBy === 'playCount') {
          return b.playCount - a.playCount;
        } else if (sortBy === 'weekStart') {
          return new Date(b.intensePeriod.weekStart) - new Date(a.intensePeriod.weekStart);
        }
        return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
      });
    }
    
    // If date includes day or month (YYYY-MM-DD or YYYY-MM format)
    if (selectedYear.includes('-')) {
      const parts = selectedYear.split('-');
      
      if (parts.length === 3) {
        // Single day selection (YYYY-MM-DD)
        const selectedDate = new Date(selectedYear);
        
        // Find obsessions that include this specific day
        return briefObsessions
          .filter(obs => {
            if (!obs.intensePeriod?.weekStart) return false;
            
            // Check if selected date falls within the week of this obsession
            const weekStart = new Date(obs.intensePeriod.weekStart);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            
            return selectedDate >= weekStart && selectedDate <= weekEnd;
          })
          .sort((a, b) => {
            if (sortBy === 'playsInWeek') {
              return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
            } else if (sortBy === 'playCount') {
              return b.playCount - a.playCount;
            } else if (sortBy === 'weekStart') {
              return new Date(b.intensePeriod.weekStart) - new Date(a.intensePeriod.weekStart);
            }
            return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
          });
      } else if (parts.length === 2) {
        // Month selection (YYYY-MM)
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
        
        // Find obsessions within this month
        return briefObsessions
          .filter(obs => {
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
          })
          .sort((a, b) => {
            if (sortBy === 'playsInWeek') {
              return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
            } else if (sortBy === 'playCount') {
              return b.playCount - a.playCount;
            } else if (sortBy === 'weekStart') {
              return new Date(b.intensePeriod.weekStart) - new Date(a.intensePeriod.weekStart);
            }
            return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
          });
      }
    }
    
    // Regular year filter (YYYY format)
    return briefObsessions
      .filter(obs => {
        if (!obs.intensePeriod?.weekStart) return false;
        
        const weekStart = new Date(obs.intensePeriod.weekStart);
        return weekStart.getFullYear().toString() === selectedYear;
      })
      .sort((a, b) => {
        if (sortBy === 'playsInWeek') {
          return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
        } else if (sortBy === 'playCount') {
          return b.playCount - a.playCount;
        } else if (sortBy === 'weekStart') {
          return new Date(b.intensePeriod.weekStart) - new Date(a.intensePeriod.weekStart);
        }
        return b.intensePeriod.playsInWeek - a.intensePeriod.playsInWeek;
      });
  }, [briefObsessions, initialYear, sortBy]);
  
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
    if (initialYear === 'all') { 
      return 'Top 100 Brief Obsessions (All Time)'; 
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
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-blue-700 text-sm sm:text-base">
          {getTitle()}
        </h3>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <span className="text-blue-700 text-xs sm:text-sm">Sort by:</span>
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
          
          <button
            onClick={() => setShowExporter(!showExporter)}
            className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showExporter ? 'Hide Playlist Exporter' : 'Export M3U Playlist'}
          </button>
        </div>
      </div>
      
      {showExporter && (
        <PlaylistExporter 
          processedData={filteredObsessions}
          songsByYear={songsByYear}
          selectedYear={initialYear}
          briefObsessions={briefObsessions}
          colorTheme="blue" // Pass the colorTheme prop to match the tab's color
        />
      )}

      <div className="overflow-x-auto -mx-4 px-4">
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
              {filteredObsessions.map((obsession, index) => (
                <tr key={obsession.key || `${obsession.trackName}-${obsession.artist}`} className="border-b hover:bg-blue-50">
                  {renderObsessionColumns(obsession, index)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrackRankings;