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

  const TrackTable = ({ tracks }) => (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="p-2 text-left text-blue-700">Rank</th>
          <th className="p-2 text-left text-blue-700">Track</th>
          <th className="p-2 text-left text-blue-700">Artist</th>
          <th 
            className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100 ${
              sortBy === 'totalPlayed' ? 'font-bold' : ''
            }`}
            onClick={() => setSortBy('totalPlayed')}
          >
            Total Time {sortBy === 'totalPlayed' && '▼'}
          </th>
          <th 
            className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100 ${
              sortBy === 'playCount' ? 'font-bold' : ''
            }`}
            onClick={() => setSortBy('playCount')}
          >
            Play Count {sortBy === 'playCount' && '▼'}
          </th>
        </tr>
      </thead>
      <tbody>
        {getSortedTracks(tracks).map((song, index) => (
          <tr key={song.key || `${song.trackName}-${song.artist}`} className="border-b hover:bg-blue-50">
            <td className="p-2 text-blue-700">{index + 1}</td>
            <td className="p-2 text-blue-700">{song.trackName}</td>
            <td className="p-2 text-blue-700">{song.artist}</td>
            <td className="p-2 text-right text-blue-700">{formatDuration(song.totalPlayed)}</td>
            <td className="p-2 text-right text-blue-700">{song.playCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const ObsessionsTable = () => (
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="p-2 text-left text-blue-700">Rank</th>
          <th className="p-2 text-left text-blue-700">Track</th>
          <th className="p-2 text-left text-blue-700">Artist</th>
          <th className="p-2 text-right text-blue-700">Peak Week</th>
          <th className="p-2 text-right text-blue-700">Plays in Peak Week</th>
          <th className="p-2 text-right text-blue-700">Total Plays</th>
        </tr>
      </thead>
      <tbody>
        {briefObsessions.map((song, index) => (
          <tr key={song.key} className="border-b hover:bg-blue-50">
            <td className="p-2 text-blue-700">{index + 1}</td>
            <td className="p-2 text-blue-700">{song.trackName}</td>
            <td className="p-2 text-blue-700">{song.artist}</td>
            <td className="p-2 text-right text-blue-700">{song.intensePeriod.weekStart.toLocaleDateString()}</td>
            <td className="p-2 text-right text-blue-700">{song.intensePeriod.playsInWeek}</td>
            <td className="p-2 text-right text-blue-700">{song.playCount}</td>
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
          className={`px-4 py-2 font-medium ${
            activeTab === 'top250' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {getTracksTabLabel()}
        </button>
        <button
          onClick={() => setActiveTab('obsessions')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'obsessions' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Top 100 Brief Obsessions
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-blue-700">
          {activeTab === 'top250' 
            ? (selectedYear === 'all' ? 'All-time Top 250' : `Top 100 ${selectedYear}`)
            : 'Top 100 Brief Obsessions'}
        </h3>

        <div className="flex items-center gap-2">
          {activeTab === 'top250' && (
            <div className="flex items-center gap-2 mr-3">
              <span className="text-blue-700">Sort by:</span>
              <button
                onClick={() => setSortBy('totalPlayed')}
                className={`px-3 py-1 rounded ${
                  sortBy === 'totalPlayed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Total Time
              </button>
              <button
                onClick={() => setSortBy('playCount')}
                className={`px-3 py-1 rounded ${
                  sortBy === 'playCount'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Play Count
              </button>
            </div>
          )}
          
          <button
            onClick={() => setShowExporter(!showExporter)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showExporter ? 'Hide Playlist Exporter' : 'Export M3U Playlist'}
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
        />
      )}

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[640px]">
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