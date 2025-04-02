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
  const [activeTab, setActiveTab] = useState('top250');
  const [selectedYear, setSelectedYear] = useState('all');
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [showExporter, setShowExporter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [topN, setTopN] = useState(50); // Add topN state
  
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

  if (!processedData || processedData.length === 0) {
    return <div className="p-4 text-center text-blue-700">No track data available</div>;
  }

  // Filter and sort tracks based on the selected year and sort method
  const filteredTracks = useMemo(() => {
    const tracks = selectedYear === 'all' ? 
      processedData : 
      (songsByYear[selectedYear] || []);
    
    return [...tracks]
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, activeTab === 'top250' ? 250 : topN);
  }, [processedData, songsByYear, selectedYear, sortBy, topN, activeTab]);
  
  // Get obsession tracks - filtered by year if needed
  const filteredObsessions = useMemo(() => {
    if (selectedYear === 'all') {
      return briefObsessions.slice(0, topN);
    }
    
    // For year-specific obsessions, filter based on the week start date
    return briefObsessions
      .filter(obsession => {
        if (!obsession.intensePeriod?.weekStart) return false;
        const weekStartDate = new Date(obsession.intensePeriod.weekStart);
        return weekStartDate.getFullYear().toString() === selectedYear;
      })
      .slice(0, topN);
  }, [briefObsessions, selectedYear, topN]);
  
  // Function to get the appropriate label for the tracks tab
  const getTracksTabLabel = () => { 
    if (selectedYear === 'all') { 
      return 'All-time Top Tracks'; 
    } 
    return `Top Tracks ${selectedYear}`; 
  };

  // Function to get the appropriate label for obsessions tab
  const getObsessionsTabLabel = () => {
    if (selectedYear === 'all') {
      return 'Brief Obsessions';
    }
    return `Brief Obsessions ${selectedYear}`;
  };

  const renderTrackRow = (song, index) => {
    if (isMobile) {
      // Mobile view - compact layout
      return (
        <tr 
          key={song.key || `${song.trackName}-${song.artist}`} 
          className="border-b hover:bg-blue-50"
        >
          <td className="p-2 text-blue-700">
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-bold text-xs mr-2 text-blue-800">{index + 1}.</span>
                <div className="font-medium">{song.trackName}</div>
              </div>
              <div className="text-xs text-blue-600">{song.artist}</div>
              {song.albumName && (
                <div className="text-xs text-blue-500 truncate max-w-[200px]">
                  {song.albumName}
                </div>
              )}
            </div>
          </td>
          <td className="p-2 align-top text-right text-blue-700">
            <div className="flex flex-col">
              <span className="font-medium">{formatDuration(song.totalPlayed)}</span>
              <span className="text-xs">{song.playCount} plays</span>
            </div>
          </td>
        </tr>
      );
    }
    
    // Desktop view with all columns
    return (
      <tr 
        key={song.key || `${song.trackName}-${song.artist}`} 
        className="border-b hover:bg-blue-50"
      >
        <td className="p-2 text-blue-700">{index + 1}</td>
        <td className="p-2 text-blue-700">{song.trackName}</td>
        <td className="p-2 text-blue-700">{song.artist}</td>
        {song.albumName && <td className="p-2 text-blue-700">{song.albumName}</td>}
        <td className="p-2 text-right text-blue-700">{formatDuration(song.totalPlayed)}</td>
        <td className="p-2 text-right text-blue-700">{song.playCount}</td>
      </tr>
    );
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
                Week of {new Date(obsession.intensePeriod.weekStart).toLocaleDateString()}
              </div>
            </div>
          </td>
          <td className="p-2 align-top text-right text-blue-700">
            <div className="flex flex-col">
              <span className="font-medium">{obsession.intensePeriod.playsInWeek} in week</span>
              <span className="text-xs">{obsession.playCount} total plays</span>
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
        <td className="p-2 text-right text-blue-700">
          {new Date(obsession.intensePeriod.weekStart).toLocaleDateString()}
        </td>
        <td className="p-2 text-right text-blue-700">{obsession.intensePeriod.playsInWeek}</td>
        <td className="p-2 text-right text-blue-700">{obsession.playCount}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tab Selection */}
      <div className="border rounded-lg p-3 sm:p-4 bg-blue-50">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-bold text-blue-700">Track Rankings</h3>
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

        <div className="flex border-b mt-4">
          <button
            onClick={() => setActiveTab('top250')}
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === 'top250' 
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-px' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {getTracksTabLabel()}
          </button>
          <button
            onClick={() => setActiveTab('obsessions')}
            className={`px-3 py-2 text-sm font-medium ${
              activeTab === 'obsessions' 
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-px' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {getObsessionsTabLabel()}
          </button>
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
          
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-blue-700 text-sm">Sort:</span>
            <button
              onClick={() => setSortBy('totalPlayed')}
              className={`px-2 py-1 rounded text-xs ${
                sortBy === 'totalPlayed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Time
            </button>
            <button
              onClick={() => setSortBy('playCount')}
              className={`px-2 py-1 rounded text-xs ${
                sortBy === 'playCount'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              Plays
            </button>
          </div>
        </div>
      </div>

      {/* Playlist Exporter */}
      {showExporter && (
        <PlaylistExporter
          processedData={activeTab === 'top250' ? filteredTracks : filteredObsessions}
          songsByYear={songsByYear}
          selectedYear={selectedYear}
          briefObsessions={briefObsessions}
          colorTheme="blue"
        />
      )}

      {/* Track Results */}
      <div className="border rounded-lg p-3 sm:p-4 bg-blue-50">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="text-blue-700 font-medium text-sm">
            {activeTab === 'top250' ? 
              (selectedYear === 'all' ? 'All-time Top Tracks' : `Top Tracks for ${selectedYear}`) :
              (selectedYear === 'all' ? 'All-time Brief Obsessions' : `Brief Obsessions for ${selectedYear}`)
            }
          </div>
          <div className="text-blue-700 text-sm">
            Found <span className="font-bold">
              {activeTab === 'top250' ? filteredTracks.length : filteredObsessions.length}
            </span> tracks
          </div>
        </div>

        {(activeTab === 'top250' && filteredTracks.length > 0) || 
         (activeTab === 'obsessions' && filteredObsessions.length > 0) ? (
          <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4 mt-2">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  {!isMobile && (
                    <>
                      <th className="p-2 text-left text-blue-700">Rank</th>
                      <th className="p-2 text-left text-blue-700">Track</th>
                      <th className="p-2 text-left text-blue-700">Artist</th>
                      {activeTab === 'top250' && <th className="p-2 text-left text-blue-700">Album</th>}
                      {activeTab === 'obsessions' && <th className="p-2 text-right text-blue-700">Peak Week</th>}
                      {activeTab === 'top250' ? (
                        <>
                          <th 
                            className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100 ${
                              sortBy === 'totalPlayed' ? 'font-bold' : ''
                            }`}
                            onClick={() => setSortBy('totalPlayed')}
                          >
                            Time {sortBy === 'totalPlayed' && '▼'}
                          </th>
                          <th 
                            className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100 ${
                              sortBy === 'playCount' ? 'font-bold' : ''
                            }`}
                            onClick={() => setSortBy('playCount')}
                          >
                            Plays {sortBy === 'playCount' && '▼'}
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 text-right text-blue-700">Plays in Week</th>
                          <th className="p-2 text-right text-blue-700">Total Plays</th>
                        </>
                      )}
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
                {activeTab === 'top250' ? 
                  filteredTracks.map(renderTrackRow) : 
                  filteredObsessions.map(renderObsessionRow)
                }
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-blue-500">
            {activeTab === 'top250' ? 
              (selectedYear !== 'all' ? 'No tracks found for this year' : 'No tracks available') :
              (selectedYear !== 'all' ? 'No brief obsessions found for this year' : 'No brief obsessions available')
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackRankings;