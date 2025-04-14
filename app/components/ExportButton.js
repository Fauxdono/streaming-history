import React, { useState, useEffect, useRef } from 'react';
import { Download, AlertTriangle, Settings, Cpu } from 'lucide-react';

const ExportButton = ({ 
  stats, 
  topArtists, 
  topAlbums, 
  processedData, 
  briefObsessions,
  songsByYear,
  formatDuration,
  rawPlayData 
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');
  const [currentSheetName, setCurrentSheetName] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [exportMethod, setExportMethod] = useState('worker');
  const [workerSupported, setWorkerSupported] = useState(true);
  const [lowMemoryMode, setLowMemoryMode] = useState(false);
  
  // Reference to the service worker
  const workerRef = useRef(null);
  
  // Export sheet selection
  const [selectedSheets, setSelectedSheets] = useState({
    summary: true,
    artists: true,
    albums: true,
    tracks: true,
    yearly: true,
    obsessions: true,
    history: true
  });
  
  // Check if we're on a mobile device and if service workers are supported
  useEffect(() => {
    const checkEnvironment = () => {
      // Check if mobile based on screen size and user agent
      const isMobileDevice = 
        window.innerWidth < 768 || 
        window.innerHeight < 768 || // Consider orientation
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      setIsMobile(isMobileDevice);
      
      // Check if service workers are supported
      const isServiceWorkerSupported = 'serviceWorker' in navigator && 
                                      'Worker' in window;
      setWorkerSupported(isServiceWorkerSupported);
      
      // Detect if we're on a low-end device or very large dataset
      const isLowMemoryDevice = 
        isMobileDevice && 
        (rawPlayData?.length > 20000 || 
         navigator.deviceMemory < 4); // deviceMemory API isn't available on all browsers
      
      setLowMemoryMode(isLowMemoryDevice);
      
      // For mobile with large datasets, default to disabling history
      if (isMobileDevice && rawPlayData && rawPlayData.length > 30000) {
        setSelectedSheets(prev => ({...prev, history: false}));
      }
    };
    
    checkEnvironment();
    window.addEventListener('resize', checkEnvironment);
    
    return () => {
      window.removeEventListener('resize', checkEnvironment);
      // Clean up worker if it exists
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [rawPlayData]);

  // Initialize service worker when needed
  useEffect(() => {
    if (exportMethod === 'worker' && workerSupported && !workerRef.current && isExporting) {
      try {
        // Create service worker
        const worker = new Worker('/exportworker.js');
        
        // Set up message handler
        worker.onmessage = (event) => {
          const { type, progress, operation, sheetName, buffer, error } = event.data;
          
          if (type === 'progress') {
            setExportProgress(progress);
            if (operation) setCurrentOperation(operation);
            if (sheetName) setCurrentSheetName(sheetName);
            
            // If the worker is done and has sent the buffer, create download
            if (progress === 100 && buffer) {
              createDownloadFromBuffer(buffer);
            }
          } else if (type === 'error') {
            setError(error || 'Unknown error during export');
            setIsExporting(false);
            
            // Terminate the worker on error
            if (workerRef.current) {
              workerRef.current.terminate();
              workerRef.current = null;
            }
          }
        };
        
        // Store worker reference
        workerRef.current = worker;
        
        // Start the export process
        worker.postMessage({
          type: 'start-export',
          data: {
            stats,
            topArtists,
            topAlbums,
            processedData,
            briefObsessions,
            songsByYear,
            rawPlayData,
            selectedSheets,
            isMobile, // Pass the mobile flag to the worker
            lowMemoryMode // Pass low memory mode flag
          },
          options: {}
        });
      } catch (err) {
        console.error('Failed to initialize service worker:', err);
        setError('Failed to initialize background export: ' + err.message);
        setIsExporting(false);
      }
    }
  }, [
    exportMethod, workerSupported, isExporting, stats, topArtists, topAlbums, 
    processedData, briefObsessions, songsByYear, rawPlayData, selectedSheets,
    isMobile, lowMemoryMode
  ]);
  
  // Helper function to create download from array buffer
  const createDownloadFromBuffer = (buffer) => {
    try {
      // Generate filename based on selected sheets
      const timestamp = new Date().toISOString().split('T')[0];
      const historyLabel = selectedSheets.history ? 'with-history' : 'no-history';
      const deviceLabel = isMobile ? 'mobile' : 'desktop';
      const filename = `cake-dreamin-${timestamp}-${historyLabel}-${deviceLabel}.xlsx`;
      
      // Create blob and download URL
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      
      // Trigger download in new animation frame
      requestAnimationFrame(() => {
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          setCurrentOperation("Download complete!");
          setExportProgress(0);
          setIsExporting(false);
          
          // Terminate worker
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        }, 1000);
      });
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download file: ' + err.message);
      setIsExporting(false);
      
      // Terminate worker on error
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    }
  };

  // Start the export process
  const exportToExcel = async () => {
    // Validate that at least one sheet is selected
    if (!Object.values(selectedSheets).some(value => value)) {
      setError("Please select at least one sheet to export");
      return;
    }
    
    setIsExporting(true);
    setError(null);
    setExportProgress(0);
    setCurrentOperation("Starting export...");
    
    // For worker-based export, the initialization is handled in useEffect
    if (exportMethod !== 'worker') {
      setError("Regular export method is not implemented in this version. Please use the worker export method.");
      setIsExporting(false);
    }
  };
  
  // Toggle all sheets on/off
  const toggleAllSheets = (value) => {
    setSelectedSheets({
      summary: value,
      artists: value,
      albums: value,
      tracks: value,
      yearly: value,
      obsessions: value,
      history: value && (!isMobile || rawPlayData.length <= 10000)
    });
  };
  
  // Get preset name based on selected sheets
  const getPresetName = () => {
    const allSelected = Object.values(selectedSheets).every(v => v === true);
    const noneSelected = !Object.values(selectedSheets).some(v => v === true);
    
    if (allSelected) {
      return "Complete (with history)";
    } else if (noneSelected) {
      return "None selected";
    } else if (Object.values(selectedSheets).every((v, i) => 
      v === true || (Object.keys(selectedSheets)[i] === 'history' && v === false)
    )) {
      return "Standard (no history)";
    } else {
      return "Custom selection";
    }
  };
  
  const getEstimatedSize = () => {
    let estimatedSize = 0;
    
    // Base size
    if (selectedSheets.summary) estimatedSize += 10;
    if (selectedSheets.artists) estimatedSize += topArtists?.length * 0.1 || 0;
    if (selectedSheets.albums) estimatedSize += topAlbums?.length * 0.15 || 0;
    if (selectedSheets.tracks) estimatedSize += Math.min(processedData?.length || 0, 2000) * 0.1;
    if (selectedSheets.yearly) estimatedSize += 20;
    if (selectedSheets.obsessions) estimatedSize += briefObsessions?.length * 0.1 || 0;
    
    // History is the heaviest part
    if (selectedSheets.history) {
      // Size increases with number of raw play data entries
      estimatedSize += Math.min(rawPlayData?.length * 0.2 || 0, 5000);
    }
    
    // Convert to MB and round to one decimal place
    return Math.round(estimatedSize / 100) / 10;
  };

  return (
    <div className="space-y-2">
      {/* Export options toggle */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="text-sm text-purple-600 hover:text-purple-800 underline flex items-center gap-1"
        >
          <Settings size={14} />
          {showOptions ? 'Hide export options' : 'Export options'}
        </button>
        
        {/* Info badge for large datasets */}
        {rawPlayData && rawPlayData.length > 50000 && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle size={14} />
            <span>Large dataset ({rawPlayData.length.toLocaleString()} entries)</span>
          </div>
        )}
      </div>
      
      {/* Export options panel */}
      {showOptions && (
        <div className="p-3 bg-purple-50 rounded border border-purple-200 mb-2">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-purple-700">Select sheets to include:</h4>
            <div className="flex gap-2">
              <button 
                onClick={() => toggleAllSheets(true)}
                className="text-xs px-2 py-1 bg-purple-200 text-purple-700 rounded hover:bg-purple-300"
              >
                Select All
              </button>
              <button 
                onClick={() => toggleAllSheets(false)}
                className="text-xs px-2 py-1 bg-purple-200 text-purple-700 rounded hover:bg-purple-300"
              >
                Deselect All
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="summary-sheet"
                checked={selectedSheets.summary}
                onChange={(e) => setSelectedSheets({...selectedSheets, summary: e.target.checked})}
                className="text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="summary-sheet" className="text-sm text-purple-700">
                Summary ({stats?.totalEntries?.toLocaleString() || 0} entries)
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="artists-sheet"
                checked={selectedSheets.artists}
                onChange={(e) => setSelectedSheets({...selectedSheets, artists: e.target.checked})}
                className="text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="artists-sheet" className="text-sm text-purple-700">
                Artists ({topArtists?.length?.toLocaleString() || 0})
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="albums-sheet"
                checked={selectedSheets.albums}
                onChange={(e) => setSelectedSheets({...selectedSheets, albums: e.target.checked})}
                className="text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="albums-sheet" className="text-sm text-purple-700">
                Albums ({topAlbums?.length?.toLocaleString() || 0})
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tracks-sheet"
                checked={selectedSheets.tracks}
                onChange={(e) => setSelectedSheets({...selectedSheets, tracks: e.target.checked})}
                className="text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="tracks-sheet" className="text-sm text-purple-700">
                Top Tracks ({processedData?.length?.toLocaleString() || 0})
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="yearly-sheet"
                checked={selectedSheets.yearly}
                onChange={(e) => setSelectedSheets({...selectedSheets, yearly: e.target.checked})}
                className="text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="yearly-sheet" className="text-sm text-purple-700">
                Yearly Top Tracks ({Object.keys(songsByYear || {}).length || 0} years)
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="obsessions-sheet"
                checked={selectedSheets.obsessions}
                onChange={(e) => setSelectedSheets({...selectedSheets, obsessions: e.target.checked})}
                className="text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="obsessions-sheet" className="text-sm text-purple-700">
                Brief Obsessions ({briefObsessions?.length?.toLocaleString() || 0})
              </label>
            </div>
            
            <div 
              className={`col-span-2 flex items-center gap-2 ${
                isMobile && rawPlayData?.length > 10000 ? 'bg-amber-100 p-1 rounded' : ''
              }`}
            >
              <input
                type="checkbox"
                id="history-sheet"
                checked={selectedSheets.history}
                onChange={(e) => setSelectedSheets({...selectedSheets, history: e.target.checked})}
                className="text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="history-sheet" className="text-sm text-purple-700 flex items-center gap-1">
                Complete History ({rawPlayData?.length?.toLocaleString() || 0} entries)
                {isMobile && rawPlayData?.length > 10000 && (
                  <span className="text-xs text-amber-700 italic">
                    {lowMemoryMode ? "(not recommended on your device)" : "(may be slow on mobile)"}
                  </span>
                )}
              </label>
            </div>
          </div>
          
          {/* Low Memory Mode toggle */}
          <div className="mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lowMemoryMode}
                onChange={(e) => setLowMemoryMode(e.target.checked)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-purple-700">Enable Low Memory Mode</span>
              <span className="text-xs text-purple-500">(Reduces data in export for better performance)</span>
            </label>
          </div>
          
          <div className="text-xs text-purple-600 bg-purple-100 p-2 rounded">
            <div className="font-medium mb-1">Export Details:</div>
            <div>Current preset: <span className="font-medium">{getPresetName()}</span></div>
            <div>Estimated file size: <span className="font-medium">{getEstimatedSize()} MB</span></div>
            {selectedSheets.history && rawPlayData?.length > 15000 && (
              <div className="text-amber-600 mt-1">
                ⚠️ Exporting complete history with {rawPlayData.length.toLocaleString()} entries may take some time.
                {lowMemoryMode ? " Using Low Memory Mode will export a sample of entries." : ""}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Main export button */}
      <button
        onClick={exportToExcel}
        disabled={isExporting}
        className="flex items-center justify-center w-full sm:w-auto gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors"
      >
        <Download size={16} />
        {isExporting ? 'Exporting...' : 'Export to Excel'}
      </button>
      
      {/* Progress indicator */}
      {isExporting && (
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block text-purple-600">
                Progress: {exportProgress}%
              </span>
            </div>
            {currentSheetName && (
              <div className="text-xs text-purple-500">
                Sheet: {currentSheetName}
              </div>
            )}
          </div>
          <div className="overflow-hidden h-2 mb-1 text-xs flex rounded bg-purple-200">
            <div 
              style={{ width: `${exportProgress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-purple-500 transition-all duration-300"
            ></div>
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {currentOperation || (exportProgress < 100 
              ? 'Processing data...' 
              : 'Finalizing export...')}
          </div>
        </div>
      )}
      
      {/* Warning for mobile devices */}
      {isMobile && !isExporting && (
        <p className="text-xs text-purple-600">
          On mobile, export will contain reduced data to ensure smooth processing.
          {selectedSheets.history && rawPlayData?.length > 10000 && (
            <span className="text-amber-600 block mt-1">
              Note: Exporting with full history ({rawPlayData.length.toLocaleString()} entries) may be slow.
              {lowMemoryMode ? " Using Low Memory Mode to improve performance." : " Consider enabling Low Memory Mode."}
            </span>
          )}
        </p>
      )}
      
      {/* Error display */}
      {error && (
        <div className="p-4 text-red-500 border border-red-200 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ExportButton;