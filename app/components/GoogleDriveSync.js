"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getAnalysisPageColors } from './theme.js';
import { exportEnrichmentCache, mergeEnrichmentCache } from './albumEnrichment.js';

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
  streaks = null,
  uploadedFiles = [],
  uploadedFileList = null,
  onDataLoaded,
  isDarkMode = false,
  colorMode = 'minimal',
  vertical = false
}) => {
  const isColorful = colorMode === 'colorful';
  // Always start disconnected and let validation determine connection state
  const [isConnected, setIsConnectedState] = useState(false);
  
  // Logging wrapper for setIsConnected to track all disconnections
  const setIsConnected = (newState) => {
    if (newState === false && isConnected === true) {
      console.log('🚨 DISCONNECTION DETECTED:', new Error().stack);
    }
    setIsConnectedState(newState);
  };
  
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
  const [saveCompleted, setSaveCompleted] = useState(false);
  const [loadCompleted, setLoadCompleted] = useState(false);
  // Fresh-connect feedback: flash the card green, then fade toward the dot
  const [connectFlash, setConnectFlash] = useState(false);
  const [dotPop, setDotPop] = useState(false);
  const tokenClientRef = useRef(null);

  const flashConnected = () => {
    setConnectFlash(true);
    setDotPop(true);
    // Overlay fades after 0.5s; the enlarged dot outlives it so the flash
    // visibly hands off to the corner signal before shrinking back.
    setTimeout(() => setConnectFlash(false), 500);
    setTimeout(() => setDotPop(false), 1300);
  };

  const clearMessage = () => setMessage('');

  const showMessage = (msg, isError = false) => {
    setMessage(isError ? `❌ ${msg}` : `✅ ${msg}`);
    setTimeout(clearMessage, 5000);
  };

  // Retro terminal-style progress bar component
  // Compact circular progress: a 48px ring with the percentage knocked out
  // of the middle and the status message beside it.
  const ProgressBar = ({ progress, isActive, isCompleted = false }) => {
    if ((!isActive && !isCompleted) || progress.total === 0) return null;

    const percentage = isCompleted ? 100 : (progress.percent != null ? Math.round(progress.percent) : Math.round((progress.step / progress.total) * 100));
    const r = 20;
    const circ = 2 * Math.PI * r;

    const ringColor = isColorful
      ? isDarkMode ? 'text-violet-400' : 'text-violet-600'
      : isDarkMode ? 'text-[#4169E1]' : 'text-black';

    return (
      <svg width="48" height="48" viewBox="0 0 48 48" className={`shrink-0 ${ringColor}`}>
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4" opacity="0.2" />
        <circle
          cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - percentage / 100)}
          transform="rotate(-90 24 24)" style={{ transition: 'stroke-dashoffset 0.3s' }}
        />
        {isCompleted && (
          <path d="M16 24.5 L21.5 30 L32 19" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    );
  };

  // Initialize Google APIs on component mount
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

  // Check for stored token when APIs are initialized (on app startup)
  useEffect(() => {
    const validateStoredToken = async () => {
      console.log('🔍 Checking for stored Google Drive token on app startup...');
      
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('google_drive_token') : null;
      const storedExpiry = typeof window !== 'undefined' ? localStorage.getItem('google_drive_token_expiry') : null;
      
      // If no stored token, remain disconnected
      if (!storedToken || !storedExpiry) {
        console.log('🔍 No stored token found, staying disconnected');
        return;
      }
      
      // Check expiry time without being too strict
      const now = Date.now();
      const expiry = parseInt(storedExpiry);
      
      if (now >= expiry) {
        console.log('🔍 Token expired, removing stored credentials');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('google_drive_token');
          localStorage.removeItem('google_drive_token_expiry');
        }
        return;
      }
      
      // Valid token found, restore connection
      try {
        if (window.gapi && window.gapi.client) {
          window.gapi.client.setToken({ access_token: storedToken });
          console.log('✅ Valid token found, restoring connection');
          setIsConnected(true);
        } else {
          console.log('🔍 APIs not ready, will restore connection when available');
          setIsConnected(true); // Set connected state, token will be set when APIs load
        }
      } catch (error) {
        console.log('🔍 Token appears invalid, removing stored credentials');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('google_drive_token');
          localStorage.removeItem('google_drive_token_expiry');
        }
        // Stay disconnected (don't call setIsConnected(false) since we start disconnected)
      }
    };

    // Add a longer delay to avoid validating immediately after connection
    // and give time for any fresh connections to complete
    const timeoutId = setTimeout(validateStoredToken, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [isInitialized]);

  // Restore token before operations - no validation call, just set it
  const ensureConnection = () => {
    // If already connected with a live gapi token, just proceed
    if (isConnected && window.gapi?.client?.getToken()?.access_token) {
      return true;
    }

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('google_drive_token') : null;
    const storedExpiry = typeof window !== 'undefined' ? localStorage.getItem('google_drive_token_expiry') : null;

    if (storedToken && storedExpiry) {
      const now = Date.now();
      const expiry = parseInt(storedExpiry);

      if (now < expiry) {
        // Just set the token - actual API calls will fail naturally if it's invalid
        window.gapi.client.setToken({ access_token: storedToken });
        if (!isConnected) setIsConnected(true);
        console.log('✅ Token restored for operation');
        return true;
      } else {
        console.log('🔄 Token expired, clearing');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('google_drive_token');
          localStorage.removeItem('google_drive_token_expiry');
        }
        setIsConnected(false);
      }
    }

    return false;
  };

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


  // Multipart upload: creates a new Drive file, or updates one in place when
  // existingId is given — so repeat saves don't pile up copies in the folder
  const uploadFileToDrive = async ({ name, mimeType, content, folderId, existingId }) => {
    const boundary = 'boundary123';
    // PATCH must not resend parents; the file is already in the folder
    const metadata = existingId ? { name } : { name, parents: [folderId], mimeType };
    const multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      `Content-Type: ${mimeType}`,
      '',
      content,
      `--${boundary}--`
    ].join('\r\n');

    const response = await window.gapi.client.request({
      path: `https://www.googleapis.com/upload/drive/v3/files${existingId ? `/${existingId}` : ''}`,
      method: existingId ? 'PATCH' : 'POST',
      params: { uploadType: 'multipart' },
      headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
      body: multipartBody
    });
    return response.result;
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

  // Download entire file at once for desktop (maximum speed)
  const downloadWholeFile = async (fileId, fileSizeBytes, accessToken, onProgress) => {
    const totalMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    console.log(`💻 Downloading entire ${totalMB}MB file in one request...`);

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Use streaming reader to show progress
      const reader = response.body.getReader();
      let downloadedBytes = 0;
      let textResult = '';
      const textDecoder = new TextDecoder();
      let lastProgressUpdate = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert chunk to text immediately
        const chunkText = textDecoder.decode(value, { stream: true });
        textResult += chunkText;
        downloadedBytes += value.length;

        // Update progress every 10MB for desktop
        if (downloadedBytes - lastProgressUpdate > 10 * 1024 * 1024) {
          const progressPercent = Math.round((downloadedBytes / fileSizeBytes) * 100);
          const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
          
          // Map download progress (0-100%) to overall progress (5-65%)
          const overallPercent = 5 + (progressPercent / 100) * 85;
          onProgress({
            step: 4,
            total: 6,
            percent: overallPercent,
            message: `Downloading... ${downloadedMB}MB / ${totalMB}MB`
          });
          
          lastProgressUpdate = downloadedBytes;
          
          // Small yield for UI updates
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Finalize any remaining bytes
      const finalChunk = textDecoder.decode();
      if (finalChunk) textResult += finalChunk;
      
      console.log(`✅ Desktop whole file download complete: ${totalMB}MB`);
      return { body: textResult };

    } catch (error) {
      console.error('❌ Desktop whole file download failed:', error);
      throw error;
    }
  };

  // Download file - chunked for mobile safety, whole file for desktop speed
  const downloadFileWithProgress = async (fileId, fileSizeBytes, accessToken, onProgress) => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    const isLargeFile = fileSizeBytes > 50 * 1024 * 1024; // 50MB+

    // Desktop: download whole file for maximum speed
    // Mobile: use chunks to prevent crashes
    if (!isMobile) {
      console.log('💻 Desktop detected - downloading entire file at once for maximum speed...');
      return await downloadWholeFile(fileId, fileSizeBytes, accessToken, onProgress);
    }
    
    console.log('📱 Mobile detected - using chunked download for safety...');
    
    // Mobile chunk size optimization
    let chunkSize;
    if (isLargeFile) {
      chunkSize = 25 * 1024 * 1024; // 25MB chunks for mobile large files
    } else {
      chunkSize = 10 * 1024 * 1024; // 10MB chunks for smaller files on mobile
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
      const textChunks = []; // Use array instead of string concat for memory efficiency
      let downloadedBytes = 0;
      const textDecoder = new TextDecoder();

      // Download file chunk by chunk with retry logic
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startByte = chunkIndex * chunkSize;
        const endByte = Math.min(startByte + chunkSize - 1, fileSizeBytes - 1);

        console.log(`📦 Downloading chunk ${chunkIndex + 1}/${totalChunks} (${startByte}-${endByte})`);

        // Map chunk progress (0-100%) to overall progress (5-65%)
        const chunkPercent = (chunkIndex / totalChunks) * 100;
        const overallPercent = 5 + (chunkPercent / 100) * 85;
        onProgress({
          step: 4,
          total: 6,
          percent: overallPercent,
          message: `Downloading chunk ${chunkIndex + 1}/${totalChunks} (${Math.round(chunkPercent)}%)...`
        });

        let chunkArrayBuffer;
        let retryCount = 0;
        const maxRetries = 3;

        // Retry logic for failed chunks
        while (retryCount <= maxRetries) {
          try {
            const chunkResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
              method: 'GET',
              cache: 'no-store',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Range': `bytes=${startByte}-${endByte}`
              }
            });

            if (!chunkResponse.ok) {
              throw new Error(`HTTP ${chunkResponse.status}: ${chunkResponse.statusText}`);
            }

            chunkArrayBuffer = await chunkResponse.arrayBuffer();
            break;

          } catch (chunkError) {
            retryCount++;
            console.warn(`❌ Chunk ${chunkIndex + 1} attempt ${retryCount}/${maxRetries + 1} failed:`, chunkError.message);

            if (retryCount > maxRetries) {
              throw new Error(`Chunk ${chunkIndex + 1} failed after ${maxRetries + 1} attempts: ${chunkError.message}`);
            }

            const delay = Math.pow(2, retryCount - 1) * 1000;
            console.log(`⏳ Retrying chunk ${chunkIndex + 1} in ${delay}ms...`);

            onProgress({
              step: 4,
              total: 6,
              percent: overallPercent,
              message: `Retrying chunk ${chunkIndex + 1}/${totalChunks} (attempt ${retryCount + 1}/${maxRetries + 1})...`
            });

            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        // Decode and store in array (avoids string concat memory doubling)
        const chunkText = textDecoder.decode(new Uint8Array(chunkArrayBuffer), { stream: chunkIndex < totalChunks - 1 });
        textChunks.push(chunkText);
        downloadedBytes += chunkArrayBuffer.byteLength;
        chunkArrayBuffer = null; // Free immediately

        console.log(`✅ Chunk ${chunkIndex + 1}/${totalChunks} complete`);

        // Yield to browser between chunks on mobile
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Finalize decoder
      const finalChunk = textDecoder.decode();
      if (finalChunk) textChunks.push(finalChunk);

      // Join all chunks at once (single allocation)
      const textResult = textChunks.join('');

      console.log(`✅ Chunked download complete: ${totalMB}MB in ${totalChunks} chunks`);
      return { body: textResult };
      
    } catch (error) {
      console.error('❌ Chunked download failed:', error);
      
      // For smaller files, try fallback to single download
      if (fileSizeBytes < 50 * 1024 * 1024) {
        console.log('🔄 Falling back to single download for smaller file...');
        try {
          const fallbackResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            cache: 'no-store',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (fallbackResponse.ok) {
            return { body: await fallbackResponse.text() };
          }
        } catch (fallbackError) {
          console.error('❌ Fallback download also failed:', fallbackError);
        }
      }
      
      throw error;
    }
  };

  // Lazily create the GIS token client once; reused across connect attempts.
  const getTokenClient = () => {
    if (!tokenClientRef.current && window.google?.accounts?.oauth2) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            showMessage(`Authentication failed: ${tokenResponse.error}`, true);
            setIsConnecting(false);
            return;
          }

          window.gapi.client.setToken({ access_token: tokenResponse.access_token });

          const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
          if (typeof window !== 'undefined') {
            localStorage.setItem('google_drive_token', tokenResponse.access_token);
            localStorage.setItem('google_drive_token_expiry', expiryTime.toString());
          }

          setIsConnected(true);
          setIsConnecting(false);
          flashConnected();
        },
        error_callback: (err) => {
          setIsConnecting(false);
          if (err?.type === 'popup_failed_to_open') {
            showMessage('Popup blocked — allow popups for this site, then tap Connect again.', true);
          } else if (err?.type === 'popup_closed') {
            showMessage('Sign-in window was closed before finishing.', true);
          } else {
            showMessage(`Connection failed: ${err?.type || err?.message || 'unknown error'}`, true);
          }
        },
      });
    }
    return tokenClientRef.current;
  };

  const handleConnect = async () => {
    clearMessage();

    // If we have a valid stored token, restore it silently — no popup needed
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('google_drive_token') : null;
    const storedExpiry = typeof window !== 'undefined' ? localStorage.getItem('google_drive_token_expiry') : null;
    if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry) && window.gapi?.client) {
      window.gapi.client.setToken({ access_token: storedToken });
      setIsConnected(true);
      flashConnected();
      return;
    }

    // Mobile browsers only allow the OAuth popup when it opens synchronously
    // inside the tap gesture, so requestAccessToken must run without awaits
    // in between whenever the APIs are already loaded (they pre-load on mount).
    let tokenClient = getTokenClient();
    if (tokenClient) {
      setIsConnecting(true);
      tokenClient.requestAccessToken({ prompt: '' });
      return;
    }

    // APIs not ready yet (slow network / pre-load failed): load them first.
    // The popup may get blocked on this path; the error_callback tells the
    // user to tap again, and the second tap takes the synchronous path above.
    setIsConnecting(true);
    try {
      if (!isInitialized) {
        await initializeGoogleAPIs();
        setIsInitialized(true);
      }
      tokenClient = getTokenClient();
      if (!tokenClient) throw new Error('Google sign-in failed to load');
      tokenClient.requestAccessToken({ prompt: '' });
    } catch (error) {
      showMessage(`Connection failed: ${error.message}`, true);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
    
    // Clear stored tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('google_drive_token');
      localStorage.removeItem('google_drive_token_expiry');
    }
    
    setIsConnected(false);
    console.log('🔍 MANUAL DISCONNECT: User clicked disconnect button');
    showMessage('Disconnected from Google Drive');
  };

  const handleSave = async () => {
    if (!stats || !processedData || processedData.length === 0) {
      showMessage('No data to save. Please process your streaming files first.', true);
      return;
    }

    // Try to restore connection if needed
    const connectionOk = ensureConnection();
    if (!connectionOk && !isConnected) {
      showMessage('Please connect to Google Drive first.', true);
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

      // Inventory the folder so this save updates existing files in place
      // instead of accumulating a new copy per save
      const existingByName = new Map(); // name → { id, size }
      let newestAnalysis = null;
      try {
        const listRes = await window.gapi.client.drive.files.list({
          q: `'${folderId}' in parents and trashed=false`,
          fields: 'files(id, name, size, modifiedTime)',
          pageSize: 1000,
          spaces: 'drive'
        });
        for (const f of listRes.result.files || []) {
          existingByName.set(f.name, { id: f.id, size: f.size });
          if (f.name.includes('analysis') && !f.name.startsWith('original_') &&
              (!newestAnalysis || f.modifiedTime > newestAnalysis.modifiedTime)) {
            newestAnalysis = f;
          }
        }
      } catch (listError) {
        console.warn('⚠️ Could not list cakeculator folder, saving as new files:', listError);
      }

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
            const existing = existingByName.get(`original_${file.name}`);

            // Same name + same size ⇒ already backed up; skip the re-upload
            if (existing && Number(existing.size) === file.size) {
              console.log(`⏭️ ${file.name} already on Drive (same size), skipping`);
              originalFiles.push({ name: file.name, driveId: existing.id, size: file.size });
              continue;
            }

            console.log(`📤 ${existing ? 'Updating' : 'Uploading'} ${file.name}...`);
            const fileContent = await readFileAsText(file);
            const result = await uploadFileToDrive({
              name: `original_${file.name}`,
              mimeType: file.type || 'text/plain',
              content: fileContent,
              folderId,
              existingId: existing?.id
            });

            originalFiles.push({
              name: file.name,
              driveId: result.id,
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
      // Strip rawPlayData to only fields the app actually uses (saves ~60-70% size)
      const strippedRawPlayData = rawPlayData.map(entry => {
        const slim = {
          ts: entry.ts,
          ms_played: entry.ms_played,
          master_metadata_track_name: entry.master_metadata_track_name,
          master_metadata_album_artist_name: entry.master_metadata_album_artist_name,
          master_metadata_album_album_name: entry.master_metadata_album_album_name,
          reason_end: entry.reason_end,
        };
        if (entry.reason_start) slim.reason_start = entry.reason_start;
        if (entry.shuffle) slim.shuffle = entry.shuffle;
        if (entry.platform) slim.platform = entry.platform;
        if (entry.conn_country) slim.conn_country = entry.conn_country;
        if (entry.country) slim.country = entry.country;
        if (entry.episode_name) slim.episode_name = entry.episode_name;
        if (entry.episode_show_name) slim.episode_show_name = entry.episode_show_name;
        if (entry.source) slim.source = entry.source;
        if (entry.release_year) slim.release_year = entry.release_year;
        return slim;
      });

      const saveData = {
        stats,
        processedTracks: processedData,
        topArtists,
        topAlbums,
        briefObsessions,
        songsByYear,
        rawPlayData: strippedRawPlayData,
        artistsByYear,
        albumsByYear,
        streaks,
        // MusicBrainz lookup results (album + release year per track) — restored
        // into localStorage on load so years survive new devices/cleared storage
        enrichmentCache: exportEnrichmentCache(),
        metadata: {
          savedAt: new Date().toISOString(),
          totalTracks: processedData.length,
          version: '1.3',
          originalFiles: originalFiles.map(f => ({ name: f.name, size: f.size })),
          folderStructure: 'cakeculator',
          includesYearData: true
        }
      };

      const jsonString = JSON.stringify(saveData);
      const fileName = `analysis-${new Date().toISOString().split('T')[0]}.json`;
      const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);

      // Update the newest analysis file in place (renamed to today's date);
      // only first-ever saves create a new file
      await uploadFileToDrive({
        name: fileName,
        mimeType: 'application/json',
        content: jsonString,
        folderId,
        existingId: newestAnalysis?.id
      });

      const totalFiles = originalFiles.length > 0 ? ` + ${originalFiles.length} original files` : '';
      
      // Show 100% completion before finishing
      setSaveCompleted(true);
      setTimeout(() => {
        showMessage(`✅ Saved to cakeculator folder! Analysis: ${sizeInMB}MB (${processedData.length.toLocaleString()} tracks)${totalFiles}`);
        setSaveCompleted(false);
        setSaveProgress({ step: 0, total: 0, message: '' });
      }, 1000);
      
    } catch (error) {
      showMessage(`Save failed: ${error.message}`, true);
      setSaveCompleted(false);
      setSaveProgress({ step: 0, total: 0, message: '' });
    }

    setIsSaving(false);
  };

  const cancelLoad = () => {
    setIsLoading(false);
    setShowCancelButton(false);
    setLoadingStep('');
    setLoadProgress({ step: 0, total: 0, message: '' });
    showMessage('Load cancelled by user', true);
  };

  const handleLoad = async () => {
    // Try to restore connection if needed
    const connectionOk = ensureConnection();
    if (!connectionOk && !isConnected) {
      showMessage('Please connect to Google Drive first.', true);
      return;
    }

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

    // No overall timeout - user has cancel button if needed

    // Get access token for direct fetch calls
    const getAccessToken = () => {
      return window.gapi?.client?.getToken()?.access_token || localStorage.getItem('google_drive_token');
    };

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error('No access token available. Please reconnect to Google Drive.');
      }

      // Step 1: Look for cakeculator folder (using direct fetch instead of gapi.client)
      setLoadProgress({ step: 1, total: 6, percent: 2, message: 'Looking for cakeculator folder...' });
      setLoadingStep('Looking for cakeculator folder...');
      console.log('📁 Step 1: Looking for cakeculator folder...');
      let folderId = null;
      try {
        const folderQuery = encodeURIComponent("name='cakeculator' and mimeType='application/vnd.google-apps.folder' and trashed=false");
        const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${folderQuery}&spaces=drive`, {
          cache: 'no-store',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (folderRes.ok) {
          const folderData = await folderRes.json();
          if (folderData.files && folderData.files.length > 0) {
            folderId = folderData.files[0].id;
            console.log('✅ Found cakeculator folder:', folderId);
          }
        }
      } catch (folderError) {
        console.log('ℹ️ Cakeculator folder not found, searching in root');
      }

      // Step 2: Search for analysis files (using direct fetch)
      setLoadProgress({ step: 2, total: 6, percent: 4, message: 'Searching for analysis files...' });
      setLoadingStep('Searching for analysis files...');
      console.log('🔍 Step 2: Searching for analysis files...');
      let query = "(name contains 'analysis' or name contains 'streaming-analysis') and trashed=false";
      if (folderId) {
        query = `'${folderId}' in parents and (name contains 'analysis' or name contains 'streaming-analysis') and trashed=false`;
      }

      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=modifiedTime+desc&pageSize=1`, {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        throw new Error(`File search failed (${searchRes.status}): ${errText}`);
      }

      const searchData = await searchRes.json();
      console.log('📋 Search results:', searchData.files?.length || 0, 'files found');

      // Step 3: Validate search results
      setLoadProgress({ step: 3, total: 6, percent: 5, message: 'Validating search results...' });
      if (!searchData.files || searchData.files.length === 0) {
        clearTimeout(cancelTimeout);
        showMessage('No saved analysis found on Google Drive', true);
        setIsLoading(false);
        setLoadingStep('');
        setLoadProgress({ step: 0, total: 0, message: '' });
        return;
      }

      const file = searchData.files[0];
      console.log('📄 Step 3: Found file to load:', file.name, 'ID:', file.id);

      // Step 4: Download file content (5-65% of total progress)
      setLoadProgress({ step: 4, total: 6, percent: 5, message: `Downloading ${file.name}...` });
      setLoadingStep('Downloading file content...');
      console.log('⬇️ Step 4: Downloading file content...');

      // Get file metadata to check size (using direct fetch)
      const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?fields=size,name`, {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const metaData = await metaRes.json();

      const fileSizeBytes = parseInt(metaData.size);
      const fileSizeMB = (fileSizeBytes / (1024 * 1024)).toFixed(1);
      console.log(`📊 File size: ${fileSizeMB}MB`);
      
      // Show warning for large files
      if (fileSizeBytes > 100 * 1024 * 1024) { // Over 100MB
        const downloadMethod = isMobile ? `${Math.ceil(fileSizeBytes / (25 * 1024 * 1024))} chunks of 25MB each` : 'single download (fastest)';
        showMessage(`⚠️ Large file (${fileSizeMB}MB) will be downloaded using ${downloadMethod}. This may take a few minutes.`, false);
      }
      
      // Update progress with file size info
      setLoadProgress({ step: 4, total: 6, percent: 6, message: `Downloading ${file.name} (${fileSizeMB}MB)...` });
      
      console.log(`📁 File size: ${fileSizeMB}MB, mobile: ${isMobile}`);

      console.log('⬇️ Starting file download...');
      const fileContent = await downloadFileWithProgress(file.id, fileSizeBytes, accessToken, setLoadProgress);
      console.log('✅ File download completed');

      // Step 5: Parse analysis data (65-80%)
      setLoadProgress({ step: 5, total: 6, percent: 91, message: 'Parsing analysis data...' });
      setLoadingStep('Parsing analysis data...');
      console.log('📊 Step 5: Parsing JSON data...');
      console.log('🔍 File content structure:', {
        hasBody: !!fileContent.body,
        hasResult: !!fileContent.result,
        hasResultBody: !!fileContent.result?.body,
        contentType: typeof fileContent,
        keys: Object.keys(fileContent || {})
      });
      
      // Handle different response structures - free fileContent ref after extracting
      let jsonContent = fileContent.body || fileContent.result?.body || fileContent;
      // Free the wrapper object
      if (fileContent.body) fileContent.body = null;

      if (typeof jsonContent !== 'string') {
        console.warn('⚠️ Unexpected content type, attempting to stringify');
        jsonContent = JSON.stringify(jsonContent);
      }

      let data;
      try {
        data = JSON.parse(jsonContent);
        jsonContent = null; // Free the string after parsing
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

      // Restore MusicBrainz lookup results saved with the analysis, so album/
      // year enrichment doesn't need to re-query on a new device
      if (data.enrichmentCache) {
        const restored = mergeEnrichmentCache(data.enrichmentCache);
        if (restored > 0) console.log(`✅ Restored ${restored} MusicBrainz lookups from backup`);
        delete data.enrichmentCache;
      }
      
      // Step 6: Load data into app (80-100%)
      setLoadProgress({ step: 6, total: 6, percent: 94, message: 'Loading data into app...' });
      setLoadingStep('Loading data into app...');
      console.log('🔄 Step 6: Loading data into app...');
      
      
      if (onDataLoaded) {
        if (isMobile && data.processedTracks?.length > 10000) {
          // For mobile devices with large datasets, process in chunks to avoid memory pressure
          console.log('📱 Mobile device detected with large dataset, using chunked processing...');
          setLoadProgress({ step: 6, total: 6, percent: 94, message: 'Processing data for mobile...' });
          
          // Add a small delay to let the UI update before heavy processing
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Process data in smaller chunks for mobile
          const chunkSize = 5000;
          const totalTracks = data.processedTracks?.length || 0;
          
          if (totalTracks > chunkSize) {
            // Show progress for chunked processing
            for (let i = 0; i < totalTracks; i += chunkSize) {
              const progress = Math.round((i / totalTracks) * 100);
              const overallPercent = 94 + (progress / 100) * 4;
              setLoadProgress({
                step: 6,
                total: 6,
                percent: overallPercent,
                message: `Processing data chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(totalTracks/chunkSize)} (${progress}%)...`
              });
              
              // Yield to browser to prevent blocking
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          
          setLoadProgress({ step: 6, total: 6, percent: 98, message: 'Finalizing data load...' });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        onDataLoaded(data);
      }

      clearTimeout(cancelTimeout);
      const originalFilesText = data.metadata?.originalFiles?.length > 0 
        ? ` + ${data.metadata.originalFiles.length} original files` 
        : '';
      
      // Show 100% completion before finishing
      setLoadCompleted(true);
      setTimeout(() => {
        showMessage(`✅ Analysis loaded from ${folderId ? 'cakeculator folder' : 'Google Drive'}! (${data.processedTracks?.length || 0} tracks)${originalFilesText}`);
        setLoadCompleted(false);
        setLoadProgress({ step: 0, total: 0, message: '' });
      }, 1000);
      
    } catch (error) {
      clearTimeout(cancelTimeout);
      console.error('❌ Load failed:', error);
      showMessage(`Load failed: ${error.message}`, true);
      setLoadCompleted(false);
      setLoadProgress({ step: 0, total: 0, message: '' });
    }

    setIsLoading(false);
    setShowCancelButton(false);
    setLoadingStep('');
  };

  // Upload-tab violet in colorful mode, standard black/royal-blue in minimal —
  // same press-shadow language as the rest of the page (theme.js is canonical).
  const colors = getAnalysisPageColors('violet', isColorful, isDarkMode);
  const canSave = stats && processedData && processedData.length > 0;

  // Bare icon Save/Load buttons: the emoji IS the button — no box, just a
  // hard offset drop-shadow on the glyph that collapses when pressed.
  const iconGlyphFx = isColorful
    ? (isDarkMode
        ? '[filter:drop-shadow(3px_3px_0_#7c3aed)] active:[filter:drop-shadow(0_0_0_#7c3aed)]'
        : '[filter:drop-shadow(3px_3px_0_#6d28d9)] active:[filter:drop-shadow(0_0_0_#6d28d9)]')
    : (isDarkMode
        ? '[filter:drop-shadow(3px_3px_0_#4169E1)] active:[filter:drop-shadow(0_0_0_#4169E1)]'
        : '[filter:drop-shadow(3px_3px_0_black)] active:[filter:drop-shadow(0_0_0_black)]');
  const actionBtn = `w-14 h-14 flex items-center justify-center text-5xl leading-none transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed disabled:[filter:none] active:translate-x-[2px] active:translate-y-[2px] ${iconGlyphFx}`;

  const messageBanner = message && (
    <div className={`p-2 rounded border text-xs sm:text-sm ${message.startsWith('❌')
      ? (isDarkMode ? 'bg-red-900/20 border-red-600/30 text-red-300' : 'bg-red-100 border-red-300 text-red-700')
      : (isDarkMode ? 'bg-green-900/20 border-green-600/30 text-green-300' : 'bg-green-100 border-green-300 text-green-700')
    }`}>
      {message}
    </div>
  );

  const connectLabel = isInitializing ? 'initializing…' : isConnecting ? 'connecting…' : (
    <>
      connect{' '}
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#EA4335]">o</span>
      <span className="text-[#FBBC05]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#34A853]">l</span>
      <span className="text-[#EA4335]">e</span>
      {' '}drive
    </>
  );

  // Disconnected: no card — just one connect button that "morphs" into
  // the Save/Load card once connected. The vertical variant renders as a
  // narrow strip (rotated text, letter bottoms facing right) meant to sit
  // beside the How-to-use card inside a relative container; once connected
  // the card overlays that container.
  if (!isConnected) {
    if (vertical) {
      return (
        <>
          <button
            onClick={handleConnect}
            disabled={isConnecting || isInitializing}
            className={`absolute inset-y-0 right-0 w-11 rounded-lg text-lg font-light leading-none border flex items-center justify-center overflow-hidden hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed ${colors.bgCard} ${colors.border} ${colors.textLight} ${colors.shadow}`}
          >
            <span
              className="whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {connectLabel}
            </span>
          </button>
          {messageBanner && (
            <div className="absolute inset-x-0 bottom-0 z-20">{messageBanner}</div>
          )}
        </>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={handleConnect}
          disabled={isConnecting || isInitializing}
          className={`w-full px-4 py-1 rounded-lg text-2xl sm:text-4xl font-light leading-tight text-center border hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed ${colors.bgCard} ${colors.border} ${colors.textLight} ${colors.shadow}`}
        >
          {connectLabel}
        </button>
        {messageBanner}
      </div>
    );
  }

  return (
    <div className={`${vertical ? 'absolute inset-0 z-10 overflow-y-auto' : 'relative'} p-3 border rounded-lg flex flex-col gap-2 ${colors.bgCard} ${colors.border} ${colors.shadow}`}>
      {/* Fresh-connect flash: solid green, then a slow fade toward the dot */}
      <div className={`pointer-events-none absolute inset-0 rounded-lg bg-green-500 transition-opacity ${connectFlash ? 'opacity-40 duration-0' : 'opacity-0 duration-500'}`} />
      {/* Header: title + connection status + disconnect */}
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-sm font-semibold ${colors.text}`}>Google Drive</h2>
        <span className={`flex items-center gap-2 shrink-0 text-xs ${colors.textLight}`}>
          <span className="flex items-center gap-1.5">
            <span className={`relative z-10 w-2 h-2 rounded-full bg-green-500 transition-transform duration-300 ${dotPop ? 'scale-[2.5]' : ''}`} />
            Connected
          </span>
          <button
            onClick={handleDisconnect}
            className={`underline hover:opacity-70 ${colors.textLight}`}
          >
            Disconnect
          </button>
        </span>
      </div>
      <p className={`hidden sm:block text-xs ${colors.textLight}`}>
        Back up your analysis to a &quot;cakeculator&quot; folder in your own Drive
      </p>

      {messageBanner}

      <div className="flex flex-col gap-2 w-full sm:items-center sm:text-center">
          <div className="flex items-center justify-center gap-3">
            <button onClick={handleSave} disabled={isSaving || !canSave} className={actionBtn} title="Save to Drive" aria-label="Save to Drive">
              <span className={isSaving ? 'animate-pulse' : ''}>💾</span>
            </button>
            <button onClick={handleLoad} disabled={isLoading} className={actionBtn} title="Load from Drive" aria-label="Load from Drive">
              <span className={isLoading ? 'animate-pulse' : ''}>📥</span>
            </button>
            <ProgressBar progress={saveProgress} isActive={isSaving} isCompleted={saveCompleted} />
            <ProgressBar progress={loadProgress} isActive={isLoading} isCompleted={loadCompleted} />
            {showCancelButton && (
              <button
                onClick={cancelLoad}
                title="Cancel loading"
                aria-label="Cancel loading"
                className={`w-8 h-8 shrink-0 rounded-full bg-red-600 text-white text-sm font-bold flex items-center justify-center transition-all hover:bg-red-700 ${isDarkMode ? 'shadow-[2px_2px_0_0_#dc2626]' : 'shadow-[2px_2px_0_0_#b91c1c]'} active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`}
              >
                ✕
              </button>
            )}
          </div>

          {!canSave && !isLoading && (
            <p className={`text-[11px] ${colors.textLighter}`}>
              Save is available after you calculate statistics; Load restores a previous backup.
            </p>
          )}
      </div>
    </div>
  );
};

export default GoogleDriveSync;