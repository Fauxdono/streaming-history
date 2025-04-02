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
  const [sortBy, setSortBy] = useState('totalPlayed');
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
  
  // When selectedYear changes, notify parent
  useEffect(() => {
    if (onYearChange && initialYear !== undefined) {
      onYearChange(initialYear);
    }
  }, [initialYear, onYearChange]);

  // IMPORTANT: We don't maintain our own selectedYear state anymore
  // Instead, we use the initialYear prop directly from parent

  if (!processedData || processedData.length === 0) {
    return <div>No track data available</div>;
  }

  // Sort the tracks based on the selected sort method
  const getSortedTracks = (tracks) => {
    return [...tracks].sort((a, b) => b[sortBy] - a[sortBy]);
  };
  
  // Function to get the appropriate label for the tracks tab
  const getTracksTabLabel = () => { 
    if (initialYear === 'all') { 
      return 'All-time Top 250'; 
    } 
    return `Top 100 ${initialYear}`; 
  };

  const renderTrackColumns = (track, index) => {
    if (isMobile) {
      // Improved mobile view matching CustomTrackRankings style
      return (
        <>
          <td className="p-2 text-blue-700">
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-bold text-xs mr-2 text-blue-800">{index + 1}.</span>
                <div className="font-medium">{track.trackName}</div>
              </div>
              <div className="text-xs text-blue-600">{track.artist}</div>
            </div>
          </td>
          <td className="p-2 align-top text-right text-blue-700">
            <div className="flex flex-col">
              <span className="font-medium">{formatDuration(track.totalPlayed)}</span>
              <span className="text-xs">{track.playCount} plays</span>
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

  // Use initialYear directly for track filtering
  const selectedYear = initialYear;
  
  const TrackTable = ({ tracks }) => (
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
            </>
          ) : (
            <th 
              className={`p-2 text-right text-blue-700 cursor-pointer hover:bg-blue-100`}
              onClick={() => setSortBy(sortBy === 'totalPlayed' ? 'playCount' : 'totalPlayed')}
            >
              Stats
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
      // Improved mobile view for obsessions
      return (
        <>
          <td className="p-2 text-blue-700">
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="font-bold text-xs mr-2 text-blue-800">{index + 1}.</span>
                <div className="font-medium">{obsession.trackName}</div>
              </div>
              <div className="text-xs text-blue-600">{obsession.artist}</div>
              <div className="text-xs text-blue-500">{new Date(obsession.intensePeriod.weekStart).toLocaleDateString()}</div>
            </div>
          </td>
          <td className="p-2 align-top text-right text-blue-700">
            <div className="flex flex-col">
              <span className="font-medium">{obsession.intensePeriod.playsInWeek} in week</span>
              <span className="text-xs">{obsession.playCount} total</span>
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
          <th className="p-2 text-left text-blue-700">
            {isMobile ? "Track Info" : "Track"}
          </th>
          {!isMobile && (
            <>
              <th className="p-2 text-left text-blue-700">Artist</th>
              <th className="p-2 text-right text-blue-700">Peak Week</th>
              <th className="p-2 text-right text-blue-700">Plays in Peak Week</th>
              <th className="p-2 text-right text-blue-700">Total Plays</th>
            </>
          )}
          {isMobile && (
            <th className="p-2 text-right text-blue-700">Stats</th>
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
          Top 100 Brief Obsessions
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-blue-700 text-sm sm:text-base">
          {activeTab === 'top250' 
            ? (selectedYear === 'all' ? 'All-time Top 250' : `Top 100 ${selectedYear}`)
            : 'Top 100 Brief Obsessions'}
        </h3>

        <div className="flex items-center gap-2">
          {activeTab === 'top250' && (
            <div className="flex items-center gap-1 mr-2">
              <span className="text-blue-700 text-xs sm:text-sm">Sort by:</span>
              <button
                onClick={() => setSortBy('totalPlayed')}
                className={`px-2 py-1 rounded text-xs ${
                  sortBy === 'totalPlayed'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                Total Time
              </button>
              <button
                onClick={() => setSortBy('playCount')}
                className={`px-2 py-1 rounded text-xs ${
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
            className="px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showExporter ? 'Hide Playlist Exporter' : 'Export M3U Playlist'}
          </button>
        </div>
      </div>
      
      {showExporter && (
        <PlaylistExporter 
          processedData={processedData}
          songsByYear={songsByYear}
          selectedYear={selectedYear}
          briefObsessions={briefObsessions}
          colorTheme="blue" // Pass the colorTheme prop to match the tab's color
        />
      )}

      <div className="overflow-x-auto -mx-4 px-4">
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