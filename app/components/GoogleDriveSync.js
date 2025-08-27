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

  const clearMessage = () => setMessage('');

  const showMessage = (msg, isError = false) => {
    setMessage(isError ? `❌ ${msg}` : `✅ ${msg}`);
    setTimeout(clearMessage, 5000);
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

  // Upload original files to Google Drive
  const uploadOriginalFiles = async (folderId) => {
    if (!uploadedFileList || uploadedFileList.length === 0) {
      console.log('ℹ️ No original files to upload');
      return [];
    }

    const uploadResults = [];
    console.log('📤 Uploading original files to Google Drive...');

    for (const file of uploadedFileList) {
      try {
        console.log(`📤 Uploading ${file.name}...`);
        
        // Read file content
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

        uploadResults.push({
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

    return uploadResults;
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

    try {
      // Get or create the cakeculator folder
      const folderId = await getCakeCulatorFolder();
      
      // Upload original files first (if any)
      const originalFiles = await uploadOriginalFiles(folderId);
      
      // Prepare the analysis data with additional metadata
      const saveData = {
        stats,
        processedTracks: processedData,
        topArtists,
        topAlbums,
        briefObsessions,
        songsByYear,
        rawPlayData,
        metadata: {
          savedAt: new Date().toISOString(),
          totalTracks: processedData.length,
          version: '1.0',
          originalFiles: originalFiles.map(f => ({ name: f.name, size: f.size })),
          folderStructure: 'cakeculator'
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
  };

  const handleLoad = async () => {
    setIsLoading(true);
    clearMessage();

    try {
      // Try to find files in cakeculator folder first
      let folderId = null;
      try {
        folderId = await getCakeCulatorFolder();
      } catch (folderError) {
        console.log('ℹ️ Cakeculator folder not found, searching in root');
      }

      // Search for analysis files - prioritize cakeculator folder if it exists
      let query = "(name contains 'analysis' or name contains 'streaming-analysis') and trashed=false";
      if (folderId) {
        query = `parents in '${folderId}' and (name contains 'analysis' or name contains 'streaming-analysis') and trashed=false`;
      }

      const response = await window.gapi.client.drive.files.list({
        q: query,
        orderBy: 'modifiedTime desc',
        pageSize: 1
      });

      if (response.result.files.length === 0) {
        showMessage('No saved analysis found on Google Drive', true);
        setIsLoading(false);
        return;
      }

      const file = response.result.files[0];
      const fileContent = await window.gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
      });

      const data = JSON.parse(fileContent.body);
      
      if (onDataLoaded) {
        onDataLoaded(data);
      }

      const originalFilesText = data.metadata?.originalFiles?.length > 0 
        ? ` + ${data.metadata.originalFiles.length} original files` 
        : '';
      showMessage(`✅ Analysis loaded from ${folderId ? 'cakeculator folder' : 'Google Drive'}! (${data.processedTracks?.length || 0} tracks)${originalFilesText}`);
      
    } catch (error) {
      showMessage(`Load failed: ${error.message}`, true);
    }

    setIsLoading(false);
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
              <button
                onClick={handleLoad}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Loading...' : 'Load from Drive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveSync;