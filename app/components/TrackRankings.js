import React, { useState, useEffect, useMemo } from 'react';
import PlaylistExporter from './playlist-exporter.js';
import YearSelector from './year-selector.js';

const TrackRankings = ({ processedData = [], briefObsessions = [], songsByYear = {}, formatDuration, onYearChange }) => {
  const [activeTab, setActiveTab] = useState('top250');
  const [selectedYear, setSelectedYear] = useState('all');
  const [sortBy, setSortBy] = useState('totalPlayed');
  const [showExporter, setShowExporter] = useState(false);
  const [yearRangeMode, setYearRangeMode] = useState(false);
  const [yearRange, setYearRange] = useState({ startYear: '', endYear: '' });
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
  
  // Create an object with years for YearSelector
  const artistsByYear = useMemo(() => {
    const yearsObj = {};
    Object.keys(songsByYear).forEach(year => {
      yearsObj[year] = []; // YearSelector expects an object with years as keys
    });
    return yearsObj;
  }, [songsByYear]);
  
  useEffect(() => {
    if (onYearChange) {
      onYearChange(selectedYear);
    }
  }, [selectedYear, onYearChange]);

  if (!processedData || processedData.length === 0) {
    return <div>No track data available</div>;
  }

  const years = Object.keys(songsByYear).sort((a, b) => b - a);

  // Sort the tracks based on the selected sort method
  const getSortedTracks = (tracks) => {
    return [...tracks].sort((a, b) => b[sortBy] - a[sortBy]);
  };
  
  // Handle year range changes
  const handleYearRangeChange = ({ startYear, endYear }) => {
    setYearRange({ startYear, endYear });
    // For now, we'll just use the start year since the current implementation 
    // doesn't support year ranges for tracks
    setSelectedYear(startYear);
  };
  
  // Toggle between single year and year range modes
  const toggleYearRangeMode = (value) => {
    setYearRangeMode(value);
  };
  
  // Function to get the appropriate label for the tracks tab
  const getTracksTabLabel = () => { 
    if (selectedYear === 'all') { 
      return 'All-time Top 250'; 
    } 
    return `Top 100 ${selectedYear}`; 
  };

  const renderTrackColumns = (track, index) => {
    if (isMobile) {
      // Simplified mobile view
      return (
        <>
          <td className="p-1 text-blue-700">
            <div className="flex flex-col">
              <span className="font-medium">{track.trackName}</span>
              <span className="text-xs text-blue-500">{track.artist}</span>
            </div>
          </td>
          <td className="p-1 text-right text-blue-700">
            <div className="flex flex-col text-xs">
              <span>{formatDuration(track.totalPlayed)}</span>
              <span>{track.playCount} plays</span>
            </div>
          </td>
        </>
      );
    }
    
    // Desktop view with all columns
    return (
      <>
        <td className="p-2 text-blue-700">{index + 1}</td>
        <td className="p-2 text-blue-700">{track.trackName}</td>
        <td className="p-2 text-blue-700">{track.artist}</td>
        <td className="p-2 text-right text-blue-700">{formatDuration(track.totalPlayed)}</td>
        <td className="p-2 text-right text-blue-700">{track.playCount}</td>
      </>
    );
  };

  const TrackTable = ({ tracks }) => (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b">
          {!isMobile && <th className="p-2 text-left text-blue-700">Rank</th>}
          <th className="p-1 sm:p-2 text-left text-blue-700">
            {isMobile ? "Track / Artist" : "Track"}
          </th>
          {!isMobile && <th className="p-2 text-left text-blue-700">Artist</th>}
          {!isMobile ? (
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
            <th 
              className={`p-1 text-right text-blue-700 cursor-pointer ${
                sortBy === 'totalPlayed' ? 'bg-blue-100' : 'hover:bg-blue-100'
              }`}
              onClick={() => setSortBy(sortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
            >
              Stats {sortBy === 'totalPlayed' ? '(Time)' : '(Plays)'}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {getSortedTracks(tracks).map((song, index) => (
          <tr key={song.key || `${song.trackName}-${song.artist}`} className="border-b hover:bg-blue-50">
            {renderTrackColumns(song, index)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderObsessionColumns = (obsession, index) => {
    if (isMobile) {
      // Simplified mobile view for obsessions
      return (
        <>
          <td className="p-1 text-blue-700">
            <div className="flex flex-col">
              <span className="font-medium">{obsession.trackName}</span>
              <span className="text-xs text-blue-500">{obsession.artist}</span>
              <span className="text-xs text-blue-400">{new Date(obsession.intensePeriod.weekStart).toLocaleDateString()}</span>
            </div>
          </td>
          <td className="p-1 text-right text-blue-700">
            <div className="flex flex-col text-xs">
              <span className="font-bold">{obsession.intensePeriod.playsInWeek} week</span>
              <span>{obsession.playCount} total</span>
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
        <td className="p-2 text-right text-blue-700">{new Date(obsession.intensePeriod.weekStart).toLocaleDateString()}</td>
        <td className="p-2 text-right text-blue-700">{obsession.intensePeriod.playsInWeek}</td>
        <td className="p-2 text-right text-blue-700">{obsession.playCount}</td>
      </>
    );
  };

  const ObsessionsTable = () => (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b">
          {!isMobile && <th className="p-2 text-left text-blue-700">Rank</th>}
          <th className="p-1 sm:p-2 text-left text-blue-700">
            {isMobile ? "Track / Artist" : "Track"}
          </th>
          {!isMobile && (
            <>
              <th className="p-2 text-left text-blue-700">Artist</th>
              <th className="p-2 text-right text-blue-700">Peak Week</th>
              <th className="p-2 text-right text-blue-700">Peak</th>
              <th className="p-2 text-right text-blue-700">Total</th>
            </>
          )}
          {isMobile && (
            <th className="p-1 text-right text-blue-700">Stats</th>
          )}
        </tr>
      </thead>
      <tbody>
        {briefObsessions.map((song, index) => (
          <tr key={song.key} className="border-b hover:bg-blue-50">
            {renderObsessionColumns(song, index)}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="w-full">
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('top250')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'top250' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {getTracksTabLabel()}
        </button>
        <button
          onClick={() => setActiveTab('obsessions')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'obsessions' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Top Obsessions
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-blue-700 text-sm sm:text-base">
          {activeTab === 'top250' 
            ? (selectedYear === 'all' ? 'All-time Top 250' : `Top 100 ${selectedYear}`)
            : 'Top 100 Brief Obsessions'}
        </h3>

        <div className="flex items-center gap-2">
          {!isMobile && activeTab === 'top250' && (
            <div className="flex items-center gap-1 mr-2">
              <span className="text-blue-700 text-xs sm:text-sm">Sort:</span>
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
          )}
          
          <button
            onClick={() => setShowExporter(!showExporter)}
            className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showExporter ? 'Hide' : 'Export'}
          </button>
        </div>
      </div>
      
      {/* Add Year Selector when in top250 tab */}
      {activeTab === 'top250' && Object.keys(artistsByYear).length > 0 && (
        <YearSelector 
          artistsByYear={artistsByYear}
          onYearChange={setSelectedYear}
          onYearRangeChange={handleYearRangeChange}
          initialYear={selectedYear !== 'all' ? selectedYear : null}
          initialYearRange={yearRange}
          isRangeMode={yearRangeMode}
          onToggleRangeMode={toggleYearRangeMode}
          colorTheme="blue"
        />
      )}
      
      {showExporter && (
        <PlaylistExporter 
          processedData={processedData}
          songsByYear={songsByYear}
          selectedYear={selectedYear}
          briefObsessions={briefObsessions}
          colorTheme="blue" // Pass the colorTheme prop to match the tab's color
        />
      )}

      <div className="overflow-x-auto -mx-1 sm:-mx-4 px-1 sm:px-4">
        <div className={isMobile ? "min-w-full" : "min-w-[640px]"}>
          {activeTab === 'top250' ? (
            <TrackTable tracks={selectedYear === 'all' ? processedData : (songsByYear[selectedYear] || [])} />
          ) : (
            <ObsessionsTable />
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackRankings;