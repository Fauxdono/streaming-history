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
  const [selectedYear, setSelectedYear] = useState('all');
  const [sortBy, setSortBy] = useState('playsInWeek');
  const [showExporter, setShowExporter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [topN, setTopN] = useState(100);
  const [intensityThreshold, setIntensityThreshold] = useState(5); // Minimum plays per week to qualify
  
  // Check for mobile viewport
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
  
  // When selectedYear changes, notify parent
  useEffect(() => {
    if (onYearChange) {
      onYearChange(selectedYear);
    }
  }, [selectedYear, onYearChange]);

  // Listen for external selectedYear changes (from sidebar)
  useEffect(() => {
    // Only update if explicitly passed a value and it's different from current value
    if (initialYear && initialYear !== selectedYear) {
      setSelectedYear(initialYear);
    }
  }, [initialYear]);

  if (!briefObsessions || briefObsessions.length === 0) {
    return <div className="p-4 text-center text-blue-700">No obsession data available</div>;
  }

  // Filter obsessions based on selected date/period and intensity threshold
  const filteredObsessions = useMemo(() => {
    if (selectedYear === 'all') {
      // All-time view - just filter by intensity
      return briefObsessions
        .filter(obs => obs.intensePeriod?.playsInWeek >= intensityThreshold)
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
            
            return selectedDate >= weekStart && selectedDate <= weekEnd && 
                   obs.intensePeriod.playsInWeek >= intensityThreshold;
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
          })
          .slice(0, topN);
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
            return ((weekYear === year && weekMonth === month) || 
                   (endYear === year && endMonth === month)) && 
                   obs.intensePeriod.playsInWeek >= intensityThreshold;
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
          })
          .slice(0, topN);
      }
    }
    
    // Regular year filter (YYYY format)
    return briefObsessions
      .filter(obs => {
        if (!obs.intensePeriod?.weekStart) return false;
        
        const weekStart = new Date(obs.intensePeriod.weekStart);
        return weekStart.getFullYear().toString() === selectedYear && 
               obs.intensePeriod.playsInWeek >= intensityThreshold;
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
      })
      .slice(0, topN);
  }, [briefObsessions, selectedYear, sortBy, topN, intensityThreshold]);
  
  // Function to format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Function to get descriptive title based on current selection
  const getTitle = () => {
    if (selectedYear === 'all') {
      return 'All-time Brief Obsessions';
    } else if (selectedYear.includes('-')) {
      const parts = selectedYear.split('-');
      
      if (parts.length === 3) {
        // Single day
        const date = new Date(selectedYear);
        return `Brief Obsessions for ${date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`;
      } else if (parts.length === 2) {
        // Month
        const year = parts[0];
        const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
        const date = new Date(year, month, 1);
        return `Brief Obsessions for ${date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long'
        })}`;
      }
      return `Brief Obsessions for ${selectedYear}`;
    }
    return `Brief Obsessions for ${selectedYear}`;
  };

  const renderObsessionRow = (obsession, index) => {
    if (isMobile) {
      // Mobile view for obsessions
      return (
        <tr 
          key={obsession.key || `${obsession.trackName}-${obsession.artist}`} 
          className="border-b hover:bg-blue-50"
        >
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
        </tr>
      );
    }
    
    // Desktop view with all columns
    return (
      <tr 
        key={obsession.key || `${obsession.trackName}-${obsession.artist}`} 
        className="border-b hover:bg-blue-50"
      >
        <td className="p-2 text-blue-700">{index + 1}</td>
        <td className="p-2 text-blue-700">{obsession.trackName}</td>
        <td className="p-2 text-blue-700">{obsession.artist}</td>
        {obsession.albumName && <td className="p-2 text-blue-700">{obsession.albumName}</td>}
        <td className="p-2 text-right text-blue-700">
          {formatDate(obsession.intensePeriod.weekStart)}
        </td>
        <td 
          className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100 ${
            sortBy === 'playsInWeek' ? 'font-bold' : ''
          }`}
          onClick={() => setSortBy('playsInWeek')}
        >
          {obsession.intensePeriod.playsInWeek} {sortBy === 'playsInWeek' && '▼'}
        </td>
        <td 
          className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100 ${
            sortBy === 'playCount' ? 'font-bold' : ''
          }`}
          onClick={() => setSortBy('playCount')}
        >
          {obsession.playCount} {sortBy === 'playCount' && '▼'}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls Section */}
      <div className="border rounded-lg p-3 sm:p-4 bg-blue-50">
        <div className="flex justify-between items-center flex-wrap gap-2">
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

        <div className="mt-4 flex flex-wrap gap-2 sm:gap-4 items-center">
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
          selectedYear={selectedYear}
          briefObsessions={briefObsessions}
          colorTheme="blue"
        />
      )}

      {/* Results Section */}
      <div className="border rounded-lg p-3 sm:p-4 bg-blue-50">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="text-blue-700 font-medium text-sm">
            {selectedYear === 'all' 
              ? 'All-time brief obsessions' 
              : `Brief obsessions for ${selectedYear}`}
          </div>
          <div className="text-blue-700 text-sm">
            Found <span className="font-bold">{filteredObsessions.length}</span> obsessions
          </div>
        </div>

        {filteredObsessions.length > 0 ? (
          <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {!isMobile && (
                    <>
                      <th className="p-2 text-left text-blue-700">Rank</th>
                      <th className="p-2 text-left text-blue-700">Track</th>
                      <th className="p-2 text-left text-blue-700">Artist</th>
                      {filteredObsessions.some(obs => obs.albumName) && (
                        <th className="p-2 text-left text-blue-700">Album</th>
                      )}
                      <th 
                        className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100 ${
                          sortBy === 'weekStart' ? 'font-bold' : ''
                        }`}
                        onClick={() => setSortBy('weekStart')}
                      >
                        Week {sortBy === 'weekStart' && '▼'}
                      </th>
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
                  )}
                  {isMobile && (
                    <>
                      <th className="p-2 text-left text-blue-700">Track Info</th>
                      <th className="p-2 text-right text-blue-700">Stats</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredObsessions.map(renderObsessionRow)}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-blue-500">
            {selectedYear !== 'all' 
              ? `No brief obsessions found for ${selectedYear}${intensityThreshold > 1 ? ` with at least ${intensityThreshold} plays per week` : ''}`
              : `No brief obsessions available${intensityThreshold > 1 ? ` with at least ${intensityThreshold} plays per week` : ''}`
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackRankings;