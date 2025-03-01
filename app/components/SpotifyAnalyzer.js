
"use client";
import React, { useState, useCallback, useMemo } from 'react';
import { streamingProcessor, STREAMING_TYPES, STREAMING_SERVICES } from './streaming-adapter.js';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import ExportButton from './ExportButton.js';
import CustomTrackRankings from './CustomTrackRankings.js';
import TrackRankings from './TrackRankings.js';
import PodcastRankings from './podcast-rankings.js';
import _ from 'lodash';
import ListeningPatterns from './listening-patterns.js';
import ListeningBehavior from './listening-behavior.js';
import DiscoveryAnalysis from './discovery-analysis.js';



const calculateSpotifyScore = (playCount, totalPlayed, lastPlayedTimestamp) => {
  const now = new Date();
  const daysSinceLastPlay = (now - lastPlayedTimestamp) / (1000 * 60 * 60 * 24);
  const recencyWeight = Math.exp(-daysSinceLastPlay / 180);
  const playTimeWeight = Math.min(totalPlayed / (3 * 60 * 1000), 1);
  return playCount * recencyWeight * playTimeWeight;
};

const SpotifyAnalyzer = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [activeTrackTab, setActiveTrackTab] = useState('top250');
  const [songsByMonth, setSongsByMonth] = useState({});
  const [songsByYear, setSongsByYear] = useState({});
  const [processedData, setProcessedData] = useState([]);
  const [selectedService, setSelectedService] = useState('spotify');
  const [topArtists, setTopArtists] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [topArtistsCount, setTopArtistsCount] = useState(10);
  const [topAlbumsCount, setTopAlbumsCount] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [briefObsessions, setBriefObsessions] = useState([]);
  const [songPlayHistory, setSongPlayHistory] = useState({});
  const [rawPlayData, setRawPlayData] = useState([]);
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [artistSearch, setArtistSearch] = useState('');
  const [selectedTrackYear, setSelectedTrackYear] = useState('all');
  const [uploadedFiles, setUploadedFiles] = useState([]);
const [uploadedFileList, setUploadedFileList] = useState(null);
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours}h`;
    }
    
    const remainingMinutes = minutes % 60;
    return hours > 0 ? 
      `${hours}h ${remainingMinutes}m` : 
      `${remainingMinutes}m`;
  };
const filteredArtists = useMemo(() => {
  const allArtists = Array.from(new Set(topAlbums.map(album => album.artist))).sort();
  return allArtists
    .filter(artist => 
      artist.toLowerCase().includes(artistSearch.toLowerCase()) &&
      !selectedArtists.includes(artist)
    )
    .slice(0, 10);
}, [topAlbums, artistSearch, selectedArtists]);
const processFiles = useCallback(async (fileList) => {
  // Set loading state and wait for next render cycle
  setIsProcessing(true);
  console.log("Starting to process files:", fileList);
  await new Promise(resolve => setTimeout(resolve, 0));
  
  try {
    const results = await streamingProcessor.processFiles(fileList);
    console.log("Got results:", results);
    console.log('Total Artists:', results.topArtists.length);
    setStats(results.stats);
    setTopArtists(results.topArtists);
    setTopAlbums(results.topAlbums);
    
    // Make sure we're using the totalPlayed value for sorting in the main list too
    const sortedTracks = _.orderBy(results.processedTracks, ['totalPlayed'], ['desc']);
    setProcessedData(sortedTracks);
    
    setSongsByYear(results.songsByYear);
    setBriefObsessions(results.briefObsessions);
    setRawPlayData(results.rawPlayData);

    const fileNames = Array.from(fileList).map(file => file.name);
    setUploadedFiles(fileNames);

    setActiveTab('stats');
  } catch (err) {
    console.error("Error processing files:", err);
    setError(err.message);
  } finally {
    setIsProcessing(false);
  }
}, []);
const handleFileUpload = (e) => {
  const newFiles = e.target.files;
  const newFileNames = Array.from(newFiles).map(file => file.name);
  
  // Combine existing files with new files
  const combinedFileList = uploadedFileList 
    ? [...Array.from(uploadedFileList), ...Array.from(newFiles)]
    : newFiles;
  
  // Combine existing file names with new file names
  const combinedFileNames = uploadedFiles 
    ? [...uploadedFiles, ...newFileNames]
    : newFileNames;
  
  // Update state with combined files and file names
  setUploadedFileList(combinedFileList);
  setUploadedFiles(combinedFileNames);
};

const handleProcessFiles = () => {
  if (!uploadedFileList || uploadedFileList.length === 0) {
    setError("Please upload files first");
    return;
  }
  
  setIsProcessing(true);
  
  setTimeout(() => {
    processFiles(uploadedFileList)
      .then(() => {
        setActiveTab('stats');
      })
      .catch(err => {
        console.error("Error processing files:", err);
        setError(err.message);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  }, 100);
};
const getTracksTabLabel = () => { 
  if (selectedTrackYear === 'all') { 
    return 'All-time Top 250'; 
  } 
  return `Top 100 ${selectedTrackYear}`; 
};
const TabButton = ({ id, label }) => {
  const getTabColor = (tabId) => {
    switch (tabId) {
      case 'upload':
        return activeTab === tabId 
          ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' 
          : 'bg-orange-200 text-orange-600 hover:bg-orange-300';
      case 'stats':
        return activeTab === tabId 
          ? 'bg-purple-100 text-purple-600 border-b-2 border-purple-600' 
          : 'bg-purple-200 text-purple-600 hover:bg-purple-300';
      case 'artists':
        return activeTab === tabId 
          ? 'bg-emerald-50 text-teal-600 border-b-2 border-teal-600' 
          : 'bg-emerald-100 text-teal-600 hover:bg-teal-200';
      case 'albums':
        return activeTab === tabId 
          ? 'bg-rose-50 text-pink-600 border-b-2 border-pink-600' 
          : 'bg-rose-200 text-pink-600 hover:bg-pink-300';
      case 'tracks':
        return activeTab === tabId 
          ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
          : 'bg-blue-200 text-blue-600 hover:bg-blue-300';
      case 'custom':
        return activeTab === tabId 
          ? 'bg-yellow-100 text-yellow-600 border-b-2 border-yellow-600' 
          : 'bg-yellow-200 text-yellow-600 hover:bg-yellow-300';
case 'podcasts':
  return activeTab === tabId 
    ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' 
    : 'bg-indigo-200 text-indigo-600 hover:bg-indigo-300';
    case 'patterns':
      return activeTab === tabId 
        ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' 
        : 'bg-purple-200 text-purple-600 hover:bg-purple-300';
    case 'behavior':
      return activeTab === tabId 
        ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' 
        : 'bg-indigo-200 text-indigo-600 hover:bg-indigo-300';
    case 'discovery':
      return activeTab === tabId 
        ? 'bg-green-50 text-green-600 border-b-2 border-green-600' 
        : 'bg-green-200 text-green-600 hover:bg-green-300';
    // ... default case
  }
};

  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 font-medium ${getTabColor(id)}`}
    >
      {label}
    </button>
  );
};


  return (

<Card className="w-full max-w-4xl">
  <CardHeader>
    <CardTitle className="text-yellow-400">Streaming History Analyzer</CardTitle>
  </CardHeader>
  <CardContent>
   <div className="space-y-4">
     <div className="overflow-x-auto -mx-4 px-4"> {/* Add horizontal scroll container */}
  <div className="flex gap-2 border-b border-violet-200 min-w-max"> 
  <TabButton id="upload" label="Upload" />
  {stats && <TabButton id="stats" label="Statistics" />}
  {topArtists.length > 0 && <TabButton id="artists" label="Artists" />}
  {topAlbums.length > 0 && <TabButton id="albums" label="Albums" />}
{processedData.length > 0 && <TabButton id="tracks" label={getTracksTabLabel()} />}
  {processedData.length > 0 && <TabButton id="custom" label="Custom Date Range" />}
{rawPlayData.length > 0 && <TabButton id="podcasts" label="Podcasts" />}
{processedData.length > 0 && <TabButton id="patterns" label="Listening Patterns" />}
{processedData.length > 0 && <TabButton id="behavior" label="Listening Behavior" />}
{processedData.length > 0 && <TabButton id="discovery" label="Music Discovery" />}
</div>
</div>
{activeTab === 'upload' && (
  <>
    <div className="p-4 border rounded bg-blue-50">
      <h3 className="font-semibold mb-2 text-blue-900">How to use:</h3>
      <ol className="list-decimal list-inside space-y-1 text-blue-700">
        <li>Select your streaming service below</li>
        <li>Download your streaming history</li>
        <li>Upload your file(s)</li>
        <li>Click "Calculate Statistics"</li>
      </ol>
    </div>
    
    <div className="p-4 rounded bg-orange-100 border-2 border-orange-300">
      <div className="flex gap-4 mb-4">
        {Object.entries(STREAMING_SERVICES).map(([type, service]) => (
          <button
            key={type}
            onClick={() => setSelectedService(type)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedService === type
                ? 'bg-orange-500 text-white'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}
          >
            {service.name}
          </button>
        ))}
      </div>
      
{selectedService && (
  <div>
    <div className="mb-4">
      <h4 className="font-bold text-orange-700 mb-2">
        {STREAMING_SERVICES[selectedService].name} Instructions:
      </h4>
      <p className="text-orange-700 mb-2">
        {STREAMING_SERVICES[selectedService].instructions}
      </p>
      <a  // Add the missing <a> tag opening
        href={STREAMING_SERVICES[selectedService].downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-orange-600 hover:text-orange-800 underline"
      >
        Download your data here
      </a>
    </div>
    
    <div>
      <p className="mb-2 text-orange-700 font-bold">
        Upload your {STREAMING_SERVICES[selectedService].name} files:
      </p>
      <input
        type="file"
        multiple
        accept={STREAMING_SERVICES[selectedService].acceptedFormats}
        onChange={handleFileUpload}
        className="block w-full text-sm text-slate-600 
          file:mr-4 file:py-2 file:px-4 file:rounded-full 
          file:border-2 file:border-yellow-400 file:text-sm 
          file:font-semibold file:bg-yellow-300 
          file:text-yellow-800 hover:file:bg-yellow-400"
      />
    </div>
  </div>
)}
      
      {isProcessing && (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="flex flex-col items-center">
            <img 
              src="/loading.png" 
              alt="Cake is cakeculating..." 
              className="w-48 h-48 object-contain animate-rock bg-transparent"
              style={{ 
                backgroundColor: 'transparent',
                mixBlendMode: 'multiply'
              }}
            />
            <p 
              className="text-xl text-blue-600 mt-2 animate-rainbow" 
              style={{ 
                fontFamily: 'var(--font-comic-neue)',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)'
              }}
            >
              Cakeculating...
            </p>
          </div>
        </div>
      )}
      
      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-orange-700 font-semibold mb-2">Uploaded Files:</h4>
          <ul className="list-disc list-inside text-orange-600">
            {uploadedFiles.map((fileName, index) => (
              <li key={index}>{fileName}</li>
            ))}
          </ul>
          
          <button
            onClick={handleProcessFiles}
            disabled={isProcessing}
            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg 
              hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing..." : "Calculate Statistics"}
          </button>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          {error}
        </div>
      )}
    </div>
  </>
)}
{activeTab === 'stats' && stats && (
  <div className="p-4 bg-purple-100 rounded border-2 border-purple-300">
    <h3 className="font-bold mb-2 text-purple-700">Processing Statistics:</h3>
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <ul className="space-y-1 text-purple-700">
            <li>Files processed: {stats.totalFiles}</li>
            <li>Total entries: {stats.totalEntries}</li>
            <li>Processed songs: {stats.processedSongs}</li>
            <li>Entries with no track name: {stats.nullTrackNames}</li>
            <li>Skipped tracks: {stats.skippedEntries}</li>
            <li>Plays under 30s: {stats.shortPlays}</li>
          </ul>
        </div>
        <div className="bg-purple-50 p-3 rounded space-y-2">
          <div className="font-semibold mb-1 text-purple-700">Total Listening Time:</div>
          <div className="text-2xl text-purple-700">{formatDuration(stats.totalListeningTime)}</div>
          <div className="text-sm text-purple-600">(only counting plays over 30 seconds)</div>
          
          {/* Service breakdown */}
          {stats.serviceListeningTime && Object.keys(stats.serviceListeningTime).length > 0 && (
            <div className="mt-4 pt-3 border-t border-purple-200">
              <div className="font-semibold text-purple-700 mb-2">Listening Time by Service:</div>
              <ul className="space-y-1">
                {Object.entries(stats.serviceListeningTime).map(([service, time]) => (
                  <li key={service} className="flex justify-between items-center">
                    <span className="text-purple-600">{service}:</span>
                    <span className="font-medium text-purple-700">{formatDuration(time)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {stats && processedData.length > 0 && (
        <div className="mt-4 flex justify-end">
          <ExportButton
            stats={stats}
            topArtists={topArtists}
            topAlbums={topAlbums}
            processedData={processedData}
            briefObsessions={briefObsessions}
            formatDuration={formatDuration}
            songsByYear={songsByYear}
          />
        </div>
      )}
    </div>
  </div>
)}
        
{activeTab === 'artists' && (
  <div className="p-4 bg-teal-100 rounded border-2 border-teal-300">
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-bold text-teal-700">Most Played Artists</h3>
      <div className="flex items-center gap-2">
        <label className="text-teal-700">Show Top</label>
        <input 
          type="number" 
          min="1" 
          max="999" 
          value={topArtistsCount} 
  onChange={(e) => setTopArtistsCount(parseInt(e.target.value))}
          className="w-16 border rounded px-2 py-1 text-teal-700"
        />
      </div>
    </div>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
{console.log('Top Artists Count:', topArtistsCount, 'Artists:', topArtists.length)}
      {topArtists.slice(0,topArtistsCount).map((artist, index) => (
        <div key={artist.name} 
          className="p-3 bg-white rounded shadow-sm border-2 border-teal-200 hover:border-teal-400 transition-colors cursor pointer relative"
          onClick={() => {
            setSelectedArtists([artist.name]);
           
            setActiveTab('custom');
          }}
        >
          <div className="font-bold text-teal-600">{artist.name}</div>
         <div className="text-sm text-teal-400">
            Total Time: <span className="font-bold">{formatDuration(artist.totalPlayed)}</span>
            <br/>
            Plays: <span className="font-bold"> {artist.playCount}</span>
            <br/>
            Most Played Song: <span className="font-bold">{artist.mostPlayedSong.trackName}</span> 
            <br/>
            Plays: <span className="font-bold">{artist.mostPlayedSong.playCount}</span>
            <br/>
            First Listen: <span className="font-bold">{new Date(artist.firstListen).toLocaleDateString()}</span>
            {artist.longestStreak > 1 && (
              <>
                <br/>
First Song: <span className="font-bold">{artist.firstSong || "Unknown"}</span>
<br/>
                Longest Streak: <span className="font-bold">{artist.longestStreak} days</span>
                <br/>
                <span className="text-xs">
                  ({new Date(artist.streakStart).toLocaleDateString()} - {new Date(artist.streakEnd).toLocaleDateString()})
                </span>
              </>
            )}
            {artist.currentStreak > 1 && (
              <>
                <br/>
                Current Streak: <span className="font-bold text-teal-800">{artist.currentStreak} days</span>
              </>
            )}
          </div>
         <div className="absolute bottom-1 right-3 text-teal-600 text-[2rem]">{index + 1}
</div>
        </div>
      ))}
    </div>
  </div>
)}
{activeTab === 'albums' && (
  <div className="p-4 bg-pink-100 rounded border-2 border-pink-300">
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-bold text-pink-700">Most Played Albums</h3>
      <div className="flex items-center gap-2">
        <label className="text-pink-700">Show Top</label>
        <input 
          type="number" 
          min="1" 
          max="999" 
          value={topAlbumsCount} 
          onChange={(e) => setTopAlbumsCount(parseInt(e.target.value))}
          className="w-16 border rounded px-2 py-1 text-pink-700"
        />
      </div>
    </div>    {/* Artist Selection */}
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedArtists.map(artist => (
          <div 
            key={artist} 
            className="flex items-center bg-pink-600 text-white px-2 py-1 rounded text-sm"
          >
            {artist}
            <button 
              onClick={() => setSelectedArtists(prev => prev.filter(a => a !== artist))}
              className="ml-2 text-white hover:text-pink-200"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="relative">
        <input
          type="text"
          value={artistSearch}
          onChange={(e) => setArtistSearch(e.target.value)}
          placeholder="Search artists..."
          className="w-full border rounded px-2 py-1 text-pink-700 focus:border-pink-400 focus:ring-pink-400"
        />
        {artistSearch && filteredArtists.length > 0 && (
          <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1">
            {filteredArtists.map(artist => (
              <div
                key={artist}
                onClick={() => {
                  setSelectedArtists(prev => [...prev, artist]);
                  setArtistSearch('');
                }}
                className="px-2 py-1 hover:bg-pink-100 cursor-pointer"
              >
                {artist}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {topAlbums
        .filter(album => selectedArtists.length === 0 || selectedArtists.includes(album.artist))
        .slice(0, topAlbumsCount)
        .map((album, index) => {
          const artist = topArtists.find(a => a.name === album.artist) || {};
          
          // Find the most played track in this album from processed data
          const albumTracks = processedData.filter(track => 
            track.albumName === album.name && track.artist === album.artist
          );
          const topTrack = albumTracks.length > 0 
            ? albumTracks.reduce((max, track) => 
                track.totalPlayed > max.totalPlayed ? track : max
              )
            : null;
          
          return (
            <div 
    key={`${album.name}-${album.artist}`} 
  className="p-3 bg-white rounded shadow-sm border-2 border-pink-200 hover:border-pink-400 transition-colors relative"
>
  <div className="font-bold text-pink-600">{album.name}</div>
  <div className="text-sm text-pink-400">
    Artist: <span className="font-bold">{album.artist}</span> 
    <br/>
    Top Track: <span className="font-bold">
      {topTrack 
        ? `${topTrack.trackName} (${formatDuration(topTrack.totalPlayed)})` 
        : "No track data"
      }
    </span>
    <br/>
    Total Time: <span className="font-bold">{formatDuration(album.totalPlayed)}</span> 
    <br/>
    Plays: <span className="font-bold">{album.playCount}</span> 
    <br/>
    Tracks: <span className="font-bold">{album.trackCount}</span>
    <br/> 
    First Listen: <span className="font-bold">{new Date(album.firstListen).toLocaleDateString()}</span> 
    <br/>
  </div>
  <div className="absolute bottom-1 right-3 text-pink-600 text-[2rem]">{index + 1}</div>
            </div>
          );
        })}
    </div>
  </div>
)}
{activeTab === 'tracks' && (
  <div className="p-4 bg-blue-100 rounded border-2 border-blue-300">
    <h3 className="font-bold mb-2 text-blue-700">Track Rankings</h3>
    <TrackRankings 
      processedData={processedData} 
      briefObsessions={briefObsessions} 
      formatDuration={formatDuration} 
      songsByYear={songsByYear}
      songsByMonth={songsByMonth}
      onYearChange={setSelectedTrackYear}
    />
  </div>
)}

{activeTab === 'custom' && (
  <div 
    id="custom-track-rankings"
    className="p-4 bg-orange-100 rounded border-2 border-orange-300"
  >
    <h3 className="font-bold mb-2 text-orange-700">Custom Date Range Analysis</h3>
    <CustomTrackRankings 
      rawPlayData={rawPlayData}
      formatDuration={formatDuration}
      initialArtists={selectedArtists}
    />
  </div>
)}  {activeTab === 'podcasts' && (
  <div 
    id="podcast-rankings"
    className="p-4 bg-indigo-100 rounded border-2 border-indigo-300"
  >
    <h3 className="font-bold mb-2 text-indigo-700">Podcast Analysis</h3>
    <PodcastRankings 
      rawPlayData={rawPlayData}
      formatDuration={formatDuration}
    />
  </div>
)}
{activeTab === 'patterns' && (
  <div className="p-4 bg-purple-100 rounded border-2 border-purple-300">
    <h3 className="font-bold mb-2 text-purple-700">Listening Patterns</h3>
    <ListeningPatterns 
      rawPlayData={rawPlayData} 
      formatDuration={formatDuration} 
    />
  </div>
)}

{activeTab === 'behavior' && (
  <div className="p-4 bg-indigo-100 rounded border-2 border-indigo-300">
    <h3 className="font-bold mb-2 text-indigo-700">Listening Behavior</h3>
    <ListeningBehavior 
      rawPlayData={rawPlayData} 
      formatDuration={formatDuration} 
    />
  </div>
)}

{activeTab === 'discovery' && (
  <div className="p-4 bg-green-100 rounded border-2 border-green-300">
    <h3 className="font-bold mb-2 text-green-700">Music Discovery</h3>
    <DiscoveryAnalysis 
      rawPlayData={rawPlayData} 
      formatDuration={formatDuration} 
    />
  </div>
)}
</div>
      </CardContent>
    </Card>
  );
};

export default SpotifyAnalyzer;