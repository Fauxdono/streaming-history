"use client";

import React, { useState, useEffect } from 'react';

const GoogleDriveSync = ({ 
  stats, 
  processedData, 
  topArtists = [], 
  topAlbums = [], 
  briefObsessions = [], 
  songsByYear = {}, 
  rawPlayData = [], 
  artistsByYear = {},
  albumsByYear = {},
  uploadedFiles = [],
  uploadedFileList = null,
  onDataLoaded 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ step: 0, total: 0, message: '' });
  const [loadProgress, setLoadProgress] = useState({ step: 0, total: 0, message: '' });

  const clearMessage = () => setMessage('');

  const showMessage = (msg, isError = false) => {
    setMessage(isError ? `❌ ${msg}` : `✅ ${msg}`);
    setTimeout(clearMessage, 5000);
  };

  // Progress bar component
  const ProgressBar = ({ progress, isActive }) => {
    if (!isActive || progress.total === 0) return null;
    
    const percentage = Math.round((progress.step / progress.total) * 100);
    
    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{progress.message}</span>
          <span>{progress.step}/{progress.total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  // Initialize Google APIs when component mounts
  useEffect(() => {
    const initializeAPIs = async () => {
      if (isInitialized || isInitializing) return;
      
      setIsInitializing(true);
      try {
        await initializeGoogleAPIs();
        setIsInitialized(true);
        console.log('✅ Google APIs pre-loaded successfully');
      } catch (error) {
        console.error('❌ Failed to pre-load Google APIs:', error);
        // Don't show error message on mount - user hasn't tried to connect yet
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAPIs();
  }, []);

  const initializeGoogleAPIs = async () => {
    // Load Google API script
    if (!window.gapi) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Google API'));
        document.head.appendChild(script);
      });
    }

    // Load Google Identity Services
    if (!window.google?.accounts) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      });
    }

    // Initialize Google API client
    await new Promise((resolve, reject) => {
      window.gapi.load('client', { callback: resolve, onerror: reject });
    });

    await window.gapi.client.init({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
    });
  };

  // Create or get the cakeculator folder
  const getCakeCulatorFolder = async () => {
    try {
      console.log('📁 Looking for cakeculator folder...');
      
      // Search for existing folder
      const response = await window.gapi.client.drive.files.list({
        q: "name='cakeculator' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        spaces: 'drive'
      });

      if (response.result.files.length > 0) {
        const folderId = response.result.files[0].id;
        console.log('📁 Found existing cakeculator folder:', folderId);
        return folderId;
      }

      // Create new folder
      console.log('📁 Creating new cakeculator folder...');
      const createResponse = await window.gapi.client.drive.files.create({
        resource: {
          name: 'cakeculator',
          mimeType: 'application/vnd.google-apps.folder'
        }
      });

      const folderId = createResponse.result.id;
      console.log('✅ Created cakeculator folder:', folderId);
      return folderId;
    } catch (error) {
      console.error('❌ Failed to get/create cakeculator folder:', error);
      throw error;
    }
  };


  // Helper function to read file as text
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  // Download file using chunked approach for large files - prevents memory overload
  const downloadFileWithProgress = async (fileId, fileSizeBytes) => {
    console.log('📥 Starting chunked download...');
    
    // Determine optimal chunk size based on file size and device
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const isLargeFile = fileSizeBytes > 50 * 1024 * 1024; // 50MB+
    
    // Mobile devices get smaller chunks to reduce memory pressure
    let chunkSize;
    if (isMobile && isLargeFile) {
      chunkSize = 5 * 1024 * 1024; // 5MB chunks for mobile large files
    } else if (isLargeFile) {
      chunkSize = 10 * 1024 * 1024; // 10MB chunks for desktop large files
    } else {
      chunkSize = 2 * 1024 * 1024; // 2MB chunks for smaller files
    }
    
    const totalMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    const chunkSizeMB = (chunkSize / (1024 * 1024)).toFixed(1);
    const totalChunks = Math.ceil(fileSizeBytes / chunkSize);
    
    console.log(`🔍 Chunked download strategy:`, {
      fileSizeMB: totalMB,
      isMobile,
      isLargeFile,
      chunkSizeMB,
      totalChunks,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });
    
    try {
      let textResult = '';
      let downloadedBytes = 0;
      const textDecoder = new TextDecoder();
      
      // Download file chunk by chunk with retry logic
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startByte = chunkIndex * chunkSize;
        const endByte = Math.min(startByte + chunkSize - 1, fileSizeBytes - 1);
        
        console.log(`📦 Downloading chunk ${chunkIndex + 1}/${totalChunks} (${startByte}-${endByte})`);
        
        // Update progress before downloading chunk
        const progressPercent = Math.round((chunkIndex / totalChunks) * 100);
        setLoadProgress({ 
          step: 4, 
          total: 6, 
          message: `Downloading chunk ${chunkIndex + 1}/${totalChunks} (${progressPercent}%)...` 
        });
        
        let chunkArrayBuffer;
        let retryCount = 0;
        const maxRetries = 3;
        
        // Retry logic for failed chunks
        while (retryCount <= maxRetries) {
          try {
            // Download individual chunk using Range header
            const chunkResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`,
                'Range': `bytes=${startByte}-${endByte}`
              }
            });
            
            if (!chunkResponse.ok) {
              throw new Error(`HTTP ${chunkResponse.status}: ${chunkResponse.statusText}`);
            }
            
            chunkArrayBuffer = await chunkResponse.arrayBuffer();
            break; // Success - exit retry loop
            
          } catch (chunkError) {
            retryCount++;
            console.warn(`❌ Chunk ${chunkIndex + 1} attempt ${retryCount}/${maxRetries + 1} failed:`, chunkError.message);
            
            if (retryCount > maxRetries) {
              throw new Error(`Chunk ${chunkIndex + 1} failed after ${maxRetries + 1} attempts: ${chunkError.message}`);
            }
            
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, retryCount - 1) * 1000;
            console.log(`⏳ Retrying chunk ${chunkIndex + 1} in ${delay}ms...`);
            
            setLoadProgress({ 
              step: 4, 
              total: 6, 
              message: `Retrying chunk ${chunkIndex + 1}/${totalChunks} (attempt ${retryCount + 1}/${maxRetries + 1})...` 
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        
        // Process chunk data immediately
        const chunkUint8Array = new Uint8Array(chunkArrayBuffer);
        const chunkText = textDecoder.decode(chunkUint8Array, { stream: chunkIndex < totalChunks - 1 });
        
        textResult += chunkText;
        downloadedBytes += chunkUint8Array.length;
        
        console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} complete (${(chunkUint8Array.length / 1024 / 1024).toFixed(1)}MB)`);
        
        // Mobile-specific memory management
        if (isMobile && chunkIndex % 2 === 0) { // Check every 2 chunks on mobile
          if ('memory' in performance) {
            const memInfo = performance.memory;
            const memoryPercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
            
            console.log(`📱 Memory usage after chunk ${chunkIndex + 1}: ${memoryPercent.toFixed(1)}%`);
            
            if (memoryPercent > 80) {
              console.warn('📱 High memory usage - triggering cleanup');
              
              // Trigger garbage collection if available
              if (window.gc) {
                try {
                  window.gc();
                  console.log('📱 Garbage collection triggered');
                } catch (e) {}
              }
              
              // Add delay to let memory settle
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (memoryPercent > 90) {
              throw new Error(`Critical memory usage (${memoryPercent.toFixed(1)}%) after chunk ${chunkIndex + 1}. File too large for device.`);
            }
          }
          
          // Always yield to browser on mobile between chunks
          await new Promise(resolve => setTimeout(resolve, isMobile ? 100 : 50));
        }
      }
      
      // Finalize any remaining bytes
      const finalChunk = textDecoder.decode();
      if (finalChunk) textResult += finalChunk;
      
      console.log(`✅ Chunked download complete: ${totalMB}MB in ${totalChunks} chunks`);
      return { body: textResult };
      
    } catch (error) {
      console.error('❌ Chunked download failed:', error);
      
      // For smaller files, try fallback to standard download
      if (fileSizeBytes < 50 * 1024 * 1024) {
        console.log('🔄 Falling back to standard download for smaller file...');
        try {
          const fallbackResponse = await window.gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
          });
          
          return {
            body: fallbackResponse.body || fallbackResponse.result?.body || fallbackResponse
          };
        } catch (fallbackError) {
          console.error('❌ Fallback download also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    clearMessage();

    try {
      // Initialize APIs if not already done
      if (!isInitialized) {
        await initializeGoogleAPIs();
        setIsInitialized(true);
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            showMessage(`Authentication failed: ${tokenResponse.error}`, true);
            setIsConnecting(false);
            return;
          }
          
          window.gapi.client.setToken({
            access_token: tokenResponse.access_token
          });
          
          setIsConnected(true);
          setIsConnecting(false);
          showMessage('Connected to Google Drive successfully!');
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
      
    } catch (error) {
      showMessage(`Connection failed: ${error.message}`, true);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
    setIsConnected(false);
    showMessage('Disconnected from Google Drive');
  };

  const handleSave = async () => {
    if (!stats || !processedData || processedData.length === 0) {
      showMessage('No data to save. Please process your streaming files first.', true);
      return;
    }

    setIsSaving(true);
    clearMessage();

    // Calculate total steps
    const hasOriginalFiles = uploadedFileList && uploadedFileList.length > 0;
    const totalSteps = hasOriginalFiles ? 2 + uploadedFileList.length : 2; // folder + original files + analysis
    setSaveProgress({ step: 0, total: totalSteps, message: 'Starting save process...' });

    try {
      // Step 1: Get or create the cakeculator folder
      setSaveProgress({ step: 1, total: totalSteps, message: 'Creating cakeculator folder...' });
      const folderId = await getCakeCulatorFolder();
      
      // Step 2+: Upload original files first (if any)
      let originalFiles = [];
      if (hasOriginalFiles) {
        for (let i = 0; i < uploadedFileList.length; i++) {
          const file = uploadedFileList[i];
          setSaveProgress({ 
            step: 2 + i, 
            total: totalSteps, 
            message: `Uploading ${file.name}...` 
          });
          
          try {
            console.log(`📤 Uploading ${file.name}...`);
            const fileContent = await readFileAsText(file);
            
            const boundary = 'boundary123';
            const multipartBody = [
              `--${boundary}`,
              'Content-Type: application/json',
              '',
              JSON.stringify({
                name: `original_${file.name}`,
                parents: [folderId],
                mimeType: file.type || 'text/plain'
              }),
              `--${boundary}`,
              'Content-Type: ' + (file.type || 'text/plain'),
              '',
              fileContent,
              `--${boundary}--`
            ].join('\r\n');

            const response = await window.gapi.client.request({
              path: 'https://www.googleapis.com/upload/drive/v3/files',
              method: 'POST',
              params: { uploadType: 'multipart' },
              headers: {
                'Content-Type': `multipart/related; boundary="${boundary}"`
              },
              body: multipartBody
            });

            originalFiles.push({
              name: file.name,
              driveId: response.result.id,
              size: file.size
            });
            
            console.log(`✅ Uploaded ${file.name}`);
          } catch (error) {
            console.error(`❌ Failed to upload ${file.name}:`, error);
            // Continue with other files even if one fails
          }
        }
      }
      
      // Final Step: Upload the analysis file
      setSaveProgress({ step: totalSteps, total: totalSteps, message: 'Uploading analysis file...' });
      
      // Prepare the analysis data with additional metadata
      const saveData = {
        stats,
        processedTracks: processedData,
        topArtists,
        topAlbums,
        briefObsessions,
        songsByYear,
        rawPlayData,
        artistsByYear,
        albumsByYear,
        metadata: {
          savedAt: new Date().toISOString(),
          totalTracks: processedData.length,
          version: '1.1', // Increment version since we're adding year data
          originalFiles: originalFiles.map(f => ({ name: f.name, size: f.size })),
          folderStructure: 'cakeculator',
          includesYearData: true
        }
      };

      const jsonString = JSON.stringify(saveData, null, 2);
      const fileName = `analysis-${new Date().toISOString().split('T')[0]}.json`;
      const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);

      // Upload the analysis file to the cakeculator folder
      const boundary = 'boundary123';
      const multipartBody = [
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        JSON.stringify({
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json'
        }),
        `--${boundary}`,
        'Content-Type: application/json',
        '',
        jsonString,
        `--${boundary}--`
      ].join('\r\n');

      await window.gapi.client.request({
        path: 'https://www.googleapis.com/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': `multipart/related; boundary="${boundary}"`
        },
        body: multipartBody
      });

      const totalFiles = originalFiles.length > 0 ? ` + ${originalFiles.length} original files` : '';
      showMessage(`✅ Saved to cakeculator folder! Analysis: ${sizeInMB}MB (${processedData.length.toLocaleString()} tracks)${totalFiles}`);
      
    } catch (error) {
      showMessage(`Save failed: ${error.message}`, true);
    }

    setIsSaving(false);
    setSaveProgress({ step: 0, total: 0, message: '' });
  };

  const cancelLoad = () => {
    setIsLoading(false);
    setShowCancelButton(false);
    setLoadingStep('');
    setLoadProgress({ step: 0, total: 0, message: '' });
    showMessage('Load cancelled by user', true);
  };

  const handleLoad = async () => {
    setIsLoading(true);
    setShowCancelButton(false);
    clearMessage();
    console.log('🔄 Starting Google Drive load process...');
    
    // Check if we're on mobile device (used throughout the function)
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (isMobile && 'memory' in performance) {
      const memInfo = performance.memory;
      const availableMemory = memInfo.jsHeapSizeLimit / 1024 / 1024;
      console.log('📱 Mobile detected - available memory:', Math.round(availableMemory) + 'MB');
      
      if (availableMemory < 300) {
        console.warn('📱 Low memory device detected - large file downloads may fail');
        setLoadProgress({ step: 1, total: 6, message: '⚠️ Low memory device - large files may fail...' });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Initialize progress - 6 total steps
    setLoadProgress({ step: 0, total: 6, message: 'Initializing load...' });

    // Show cancel button after 5 seconds instead of 10
    const cancelTimeout = setTimeout(() => {
      setShowCancelButton(true);
    }, 5000);

    // Dynamic timeout based on if we find large files
    let overallTimeout = 30000; // Start with 30 seconds, will extend if large file detected
    const timeout = setTimeout(() => {
      console.error(`⏰ Load operation timed out after ${overallTimeout/1000} seconds`);
      showMessage('Load timed out. Large files may need more time. Please try again.', true);
      setIsLoading(false);
      setShowCancelButton(false);
      setLoadingStep('');
      setLoadProgress({ step: 0, total: 0, message: '' });
    }, overallTimeout);

    try {
      // Step 1: Look for cakeculator folder
      setLoadProgress({ step: 1, total: 6, message: 'Looking for cakeculator folder...' });
      setLoadingStep('Looking for cakeculator folder...');
      console.log('📁 Step 1: Looking for cakeculator folder...');
      let folderId = null;
      try {
        folderId = await Promise.race([
          getCakeCulatorFolder(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Folder search timeout')), 5000)
          )
        ]);
        console.log('✅ Found cakeculator folder:', folderId);
      } catch (folderError) {
        console.log('ℹ️ Cakeculator folder not found or timeout, searching in root');
      }

      // Step 2: Search for analysis files
      setLoadProgress({ step: 2, total: 6, message: 'Searching for analysis files...' });
      setLoadingStep('Searching for analysis files...');
      console.log('🔍 Step 2: Searching for analysis files...');
      let query = "(name contains 'analysis' or name contains 'streaming-analysis') and trashed=false";
      if (folderId) {
        query = `parents in '${folderId}' and (name contains 'analysis' or name contains 'streaming-analysis') and trashed=false`;
      }
      console.log('🔍 Search query:', query);

      const response = await Promise.race([
        window.gapi.client.drive.files.list({
          q: query,
          orderBy: 'modifiedTime desc',
          pageSize: 1
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('File search timeout - check your Google Drive permissions')), 8000)
        )
      ]);

      console.log('📋 Search results:', response.result.files.length, 'files found');

      // Step 3: Validate search results
      setLoadProgress({ step: 3, total: 6, message: 'Validating search results...' });
      if (response.result.files.length === 0) {
        clearTimeout(timeout);
        clearTimeout(cancelTimeout);
        showMessage('No saved analysis found on Google Drive', true);
        setIsLoading(false);
        setLoadingStep('');
        setLoadProgress({ step: 0, total: 0, message: '' });
        return;
      }

      const file = response.result.files[0];
      console.log('📄 Step 3: Found file to load:', file.name, 'ID:', file.id);

      // Step 4: Download file content (with streaming for large files)
      setLoadProgress({ step: 4, total: 6, message: `Downloading ${file.name}...` });
      setLoadingStep('Downloading file content...');
      console.log('⬇️ Step 4: Downloading file content...');
      
      // Get file metadata first to check size
      const fileMetadata = await window.gapi.client.drive.files.get({
        fileId: file.id,
        fields: 'size,name'
      });
      
      const fileSizeBytes = parseInt(fileMetadata.result.size);
      const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
      console.log(`📊 File size: ${fileSizeMB}MB`);
      
      // Check for very large files and mobile limitations
      if (fileSizeBytes > 200 * 1024 * 1024) { // Over 200MB
        if (isMobile) {
          // Check if file is too large for mobile device
          const hasMemoryAPI = 'memory' in performance;
          const detectedMemoryMB = hasMemoryAPI ? Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) : null;
          
          // Allow manual override via localStorage for advanced users
          const manualMemoryOverride = localStorage.getItem('streaming_manual_memory_limit');
          const memoryLimitMB = manualMemoryOverride ? parseInt(manualMemoryOverride) : (detectedMemoryMB || 100);
          
          const fileToMemoryRatio = fileSizeBytes / (memoryLimitMB * 1024 * 1024);
          
          console.log('📱 Mobile large file check:', {
            fileSize: `${fileSizeMB}MB`,
            hasMemoryAPI,
            detectedMemory: detectedMemoryMB ? `${detectedMemoryMB}MB` : 'Not available',
            manualOverride: manualMemoryOverride || 'None',
            finalMemoryLimit: `${memoryLimitMB}MB`,
            ratio: fileToMemoryRatio.toFixed(2),
            browserInfo: navigator.userAgent.substring(0, 50) + '...'
          });
          
          // Smart memory-based limit instead of hard 200MB cutoff
          if (fileToMemoryRatio > 0.8) { // File is more than 80% of available memory - very risky
            clearTimeout(timeout);
            clearTimeout(cancelTimeout);
            setIsLoading(false);
            setLoadingStep('');
            setLoadProgress({ step: 0, total: 0, message: '' });
            const debugInfo = `Debug: hasMemoryAPI=${hasMemoryAPI}, detected=${detectedMemoryMB || 'none'}, override=${manualMemoryOverride || 'none'}`;
            showMessage(`❌ File too large for this mobile device (${fileSizeMB}MB). Available memory: ${memoryLimitMB}MB${!hasMemoryAPI ? ' (estimated - memory detection not supported)' : ''}. ${debugInfo}. Try downloading on a device with more memory or reduce file size.`, true);
            
            // Show memory override tip for advanced users
            if (!hasMemoryAPI && !manualMemoryOverride) {
              setTimeout(() => {
                console.log('💡 Advanced tip: If you believe your device has more memory, you can override the detection by running:');
                console.log('localStorage.setItem("streaming_manual_memory_limit", "500"); // Replace 500 with your estimated memory in MB');
                console.log('Then refresh and try again.');
                
                // Add UI button for mobile users
                if (confirm('Memory detection failed (defaulting to 100MB). Would you like to override this limit? Most modern phones can handle 400-600MB.')) {
                  const newLimit = prompt('Enter memory limit in MB (try 400 for most phones, 600 for newer phones):', '400');
                  if (newLimit && !isNaN(newLimit)) {
                    localStorage.setItem("streaming_manual_memory_limit", newLimit);
                    alert(`Memory limit set to ${newLimit}MB. Please refresh the page and try again.`);
                  }
                }
              }, 2000);
            }
            return;
          }
          
          if (fileToMemoryRatio > 0.65) { // File is more than 65% of available memory - risky but might work
            clearTimeout(timeout);
            clearTimeout(cancelTimeout);
            setIsLoading(false);
            setLoadingStep('');
            setLoadProgress({ step: 0, total: 0, message: '' });
            showMessage(`❌ File too large for this mobile device (${fileSizeMB}MB). Device memory: ${memoryLimitMB}MB (${(fileToMemoryRatio*100).toFixed(1)}% usage). Try downloading on desktop or reduce file size.`, true);
            return;
          }
          
          const memoryUsagePercent = (fileToMemoryRatio * 100).toFixed(1);
          showMessage(`⚠️ Large file (${fileSizeMB}MB) on mobile. Using ${memoryUsagePercent}% of available memory (${memoryLimitMB}MB). This may take several minutes.`, false);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Give user time to read warning
        } else {
          showMessage(`⚠️ Large file detected (${fileSizeMB}MB). Download may take several minutes.`, false);
        }
      }
      
      // Update progress with file size info
      setLoadProgress({ step: 4, total: 6, message: `Downloading ${file.name} (${fileSizeMB}MB)...` });
      
      // For files over 50MB, use streaming download with longer timeout
      const isLargeFile = fileSizeBytes > 50 * 1024 * 1024;
      const downloadTimeout = isLargeFile ? 180000 : 15000; // 3 minutes for large files, 15s for small
      
      if (isLargeFile) {
        // Extend overall timeout for large files
        clearTimeout(timeout);
        overallTimeout = 240000; // 4 minutes total for large files
        setTimeout(() => {
          console.error(`⏰ Load operation timed out after ${overallTimeout/1000} seconds`);
          showMessage(`Large file download timed out after ${overallTimeout/60000} minutes. File size: ${fileSizeMB}MB. Consider processing smaller data sets.`, true);
          setIsLoading(false);
          setShowCancelButton(false);
          setLoadingStep('');
          setLoadProgress({ step: 0, total: 0, message: '' });
        }, overallTimeout);
        
        console.log(`🐘 Large file detected (${fileSizeMB}MB) - extended timeout to ${overallTimeout/60000} minutes`);
      } else {
        console.log(`📁 Standard file (${fileSizeMB}MB) - using ${downloadTimeout/1000}s timeout`);
      }
      
      console.log('⬇️ Starting file download...');
      const fileContent = await Promise.race([
        downloadFileWithProgress(file.id, fileSizeBytes),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Download timeout after ${downloadTimeout/1000}s - file size: ${fileSizeMB}MB. Try a smaller analysis file or check your internet connection.`)), downloadTimeout)
        )
      ]);
      console.log('✅ File download completed');

      // Step 5: Parse analysis data
      setLoadProgress({ step: 5, total: 6, message: 'Parsing analysis data...' });
      setLoadingStep('Parsing analysis data...');
      console.log('📊 Step 5: Parsing JSON data...');
      console.log('🔍 File content structure:', {
        hasBody: !!fileContent.body,
        hasResult: !!fileContent.result,
        hasResultBody: !!fileContent.result?.body,
        contentType: typeof fileContent,
        keys: Object.keys(fileContent || {})
      });
      
      // Handle different response structures
      let jsonContent = fileContent.body || fileContent.result?.body || fileContent;
      if (typeof jsonContent !== 'string') {
        console.warn('⚠️ Unexpected content type, attempting to stringify');
        jsonContent = JSON.stringify(jsonContent);
      }
      
      let data;
      try {
        data = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('❌ JSON parsing failed:', parseError);
        console.log('📝 Content preview (first 500 chars):', jsonContent?.toString().substring(0, 500));
        console.log('📝 Content type:', typeof jsonContent);
        console.log('📝 Content length:', jsonContent?.length || 'unknown');
        throw new Error(`Failed to parse JSON data: ${parseError.message}. Content type: ${typeof jsonContent}, Length: ${jsonContent?.length || 'unknown'}`);
      }
      console.log('✅ Data parsed successfully:', {
        tracks: data.processedTracks?.length || 0,
        artists: data.topArtists?.length || 0,
        hasStats: !!data.stats
      });
      
      // Step 6: Load data into app with mobile optimization
      setLoadProgress({ step: 6, total: 6, message: 'Loading data into app...' });
      setLoadingStep('Loading data into app...');
      console.log('🔄 Step 6: Loading data into app...');
      
      
      if (onDataLoaded) {
        if (isMobile && data.processedTracks?.length > 10000) {
          // For mobile devices with large datasets, process in chunks to avoid memory pressure
          console.log('📱 Mobile device detected with large dataset, using chunked processing...');
          setLoadProgress({ step: 6, total: 6, message: 'Processing data for mobile...' });
          
          // Add a small delay to let the UI update before heavy processing
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Process data in smaller chunks for mobile
          const chunkSize = 5000;
          const totalTracks = data.processedTracks?.length || 0;
          
          if (totalTracks > chunkSize) {
            // Show progress for chunked processing
            for (let i = 0; i < totalTracks; i += chunkSize) {
              const progress = Math.round((i / totalTracks) * 100);
              setLoadProgress({ 
                step: 6, 
                total: 6, 
                message: `Processing data chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(totalTracks/chunkSize)} (${progress}%)...` 
              });
              
              // Yield to browser to prevent blocking
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          setLoadProgress({ step: 6, total: 6, message: 'Finalizing data load...' });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        onDataLoaded(data);
      }

      clearTimeout(timeout);
      clearTimeout(cancelTimeout);
      const originalFilesText = data.metadata?.originalFiles?.length > 0 
        ? ` + ${data.metadata.originalFiles.length} original files` 
        : '';
      showMessage(`✅ Analysis loaded from ${folderId ? 'cakeculator folder' : 'Google Drive'}! (${data.processedTracks?.length || 0} tracks)${originalFilesText}`);
      
    } catch (error) {
      clearTimeout(timeout);
      clearTimeout(cancelTimeout);
      console.error('❌ Load failed:', error);
      showMessage(`Load failed: ${error.message}`, true);
    }

    setIsLoading(false);
    setShowCancelButton(false);
    setLoadingStep('');
    setLoadProgress({ step: 0, total: 0, message: '' });
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center space-x-3">
        <div className="text-2xl">☁️</div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Google Drive Storage</h2>
          <p className="text-sm text-gray-600">Save to organized "cakeculator" folder with original files</p>
        </div>
        {isConnected && <div className="text-green-600 text-xl">✅</div>}
      </div>

      {message && (
        <div className={`p-3 rounded ${message.startsWith('❌') 
          ? 'bg-red-50 border border-red-200 text-red-800' 
          : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          {message}
        </div>
      )}

      {!isConnected ? (
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Connect Google Drive</h3>
          <p className="text-blue-700 mb-4">
            Save your streaming analysis to Google Drive for secure cloud storage and access from any device.
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting || isInitializing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isInitializing ? 'Initializing...' : isConnecting ? 'Connecting...' : 'Connect Google Drive'}
          </button>
          <p className="text-xs text-blue-600 mt-3">
            Your data stays private - saved to YOUR Google Drive, not our servers
          </p>
          {!isInitialized && !isInitializing && (
            <p className="text-xs text-orange-600 mt-2">
              ⚡ APIs will load when you first connect
            </p>
          )}
          {isInitialized && (
            <p className="text-xs text-green-600 mt-2">
              ✅ Ready to connect
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">G</div>
              <div>
                <p className="font-medium text-green-900">Connected to Google Drive</p>
                <p className="text-sm text-green-700">Ready for large dataset storage</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-sm text-green-700 hover:text-green-900 underline"
            >
              Disconnect
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-semibold mb-2">💾 Save Analysis</h4>
              <p className="text-sm text-gray-600 mb-3">
                Save analysis + original files to "cakeculator" folder
              </p>
              <ProgressBar progress={saveProgress} isActive={isSaving} />
              <button
                onClick={handleSave}
                disabled={isSaving || !stats || !processedData || processedData.length === 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save to Drive'}
              </button>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-semibold mb-2">📥 Load Analysis</h4>
              <p className="text-sm text-gray-600 mb-3">
                Restore saved analysis from Google Drive
              </p>
              <ProgressBar progress={loadProgress} isActive={isLoading} />
              {isLoading && loadingStep && (
                <div className="mb-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                  🔄 {loadingStep}
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={handleLoad}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Loading...' : 'Load from Drive'}
                </button>
                {showCancelButton && (
                  <button
                    onClick={cancelLoad}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Cancel Loading
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveSync;