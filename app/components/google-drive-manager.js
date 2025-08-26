"use client";

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudOff,
  Download, 
  Upload, 
  User,
  HardDrive,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader
} from 'lucide-react';
// import useGoogleDrive from './use-google-drive'; // Bypassing hook to fix React error

const GoogleDriveManager = ({ 
  stats, 
  topArtists, 
  topAlbums, 
  processedData, 
  briefObsessions, 
  songsByYear, 
  rawPlayData,
  onDataLoaded 
}) => {
  // Direct state management instead of hook
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);

  // Simple functions instead of hook
  const clearError = () => setError(null);
  const signIn = async () => {
    setError('Authentication temporarily disabled for debugging');
  };
  const signOut = async () => {
    setIsSignedIn(false);
    setUserInfo(null);
  };
  const saveData = async () => {
    setError('Save temporarily disabled for debugging');
  };
  const loadData = async () => {
    setError('Load temporarily disabled for debugging');
  };
  const updateStorageInfo = async () => {
    // No-op for debugging
  };

  const [notification, setNotification] = useState(null);

  // Simple initialization
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Test function to trigger state change that was causing React error
  const testSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsSignedIn(true);
      setUserInfo({ name: 'Test User', email: 'test@example.com' });
      setIsLoading(false);
    }, 1000);
  };

  // Handle sign in
  const handleSignIn = async () => {
    try {
      clearError();
      const userInfo = await signIn();
      setNotification({
        type: 'success',
        title: 'Connected to Google Drive',
        message: `Signed in as ${userInfo.email}. Your data can now be saved to Google Drive.`
      });
    } catch (err) {
      setNotification({
        type: 'error',
        title: 'Connection Failed',
        message: err.message
      });
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      setNotification({
        type: 'info',
        title: 'Disconnected',
        message: 'You have been signed out of Google Drive.'
      });
    } catch (err) {
      setNotification({
        type: 'error',
        title: 'Sign Out Failed',
        message: err.message
      });
    }
  };

  // Handle save data
  const handleSaveData = async () => {
    if (!stats || !processedData || processedData.length === 0) {
      setNotification({
        type: 'error',
        title: 'No Data to Save',
        message: 'Please process your streaming files first.'
      });
      return;
    }

    try {
      clearError();
      const result = await saveData({
        stats,
        topArtists: topArtists || [],
        topAlbums: topAlbums || [],
        processedTracks: processedData || [],
        briefObsessions: briefObsessions || [],
        songsByYear: songsByYear || {},
        rawPlayData: rawPlayData || []
      });

      setNotification({
        type: 'success',
        title: 'Data Saved Successfully!',
        message: `Your analysis (${processedData.length.toLocaleString()} tracks, ${result.size}) has been saved to Google Drive.`
      });
    } catch (err) {
      setNotification({
        type: 'error',
        title: 'Save Failed',
        message: `Failed to save data: ${err.message}`
      });
    }
  };

  // Handle load data
  const handleLoadData = async () => {
    try {
      clearError();
      const data = await loadData();
      
      if (!data) {
        setNotification({
          type: 'info',
          title: 'No Saved Data',
          message: 'No saved analysis found on Google Drive.'
        });
        return;
      }

      // Call the callback to load data into the app
      if (onDataLoaded) {
        onDataLoaded(data);
      }

      setNotification({
        type: 'success',
        title: 'Data Loaded Successfully!',
        message: `Analysis restored from Google Drive (${data.processedTracks?.length?.toLocaleString() || 0} tracks).`
      });
    } catch (err) {
      setNotification({
        type: 'error',
        title: 'Load Failed',
        message: `Failed to load data: ${err.message}`
      });
    }
  };

  // Dismiss notification
  const dismissNotification = () => setNotification(null);

  if (!isInitialized) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Initializing Google Drive...</span>
        </div>
      </div>
    );
  }

  // Show setup instructions if Google Drive credentials are missing
  if (error && error.includes('not configured')) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
          <div>
            <h2 className="text-xl font-semibold text-yellow-900">Google Drive Setup Required</h2>
            <p className="text-sm text-yellow-700">
              Configure Google Drive API credentials to enable cloud storage
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded border border-yellow-300 mb-4">
          <h3 className="font-medium text-gray-900 mb-3">Quick Setup Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Google Cloud Console</a></li>
            <li>Create a new project or select existing one</li>
            <li>Enable "Google Drive API" in APIs & Services → Library</li>
            <li>Create credentials:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li>API Key for NEXT_PUBLIC_GOOGLE_API_KEY</li>
                <li>OAuth 2.0 Client ID for NEXT_PUBLIC_GOOGLE_CLIENT_ID</li>
              </ul>
            </li>
            <li>Update <code className="bg-gray-100 px-1 rounded">.env.local</code> with your credentials</li>
            <li>Restart the development server</li>
          </ol>
        </div>

        <div className="text-sm text-yellow-700">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Cloud className={`w-6 h-6 ${isSignedIn ? 'text-blue-600' : 'text-gray-400'}`} />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Google Drive Storage</h2>
            <p className="text-sm text-gray-600">
              Save your 70MB analysis to Google Drive for persistence
            </p>
          </div>
        </div>
        {isSignedIn ? (
          <CloudCheck className="w-8 h-8 text-green-600" />
        ) : (
          <CloudOff className="w-8 h-8 text-gray-400" />
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-lg border ${
          notification.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium mb-1 flex items-center">
                {notification.type === 'success' && <CheckCircle className="w-4 h-4 mr-1" />}
                {notification.type === 'error' && <XCircle className="w-4 h-4 mr-1" />}
                {notification.type === 'info' && <AlertTriangle className="w-4 h-4 mr-1" />}
                {notification.title}
              </h4>
              <p className="text-sm">{notification.message}</p>
            </div>
            <button
              onClick={dismissNotification}
              className="ml-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Error: </span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {!isSignedIn || isSignedIn === undefined ? (
        /* Sign In Section */
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="text-center">
            <Cloud className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Connect Google Drive
            </h3>
            <p className="text-blue-700 mb-6">
              Connect your Google Drive to save your large streaming analysis (70MB+) 
              and access it from any device.
            </p>
            <button
              onClick={testSignIn}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center mx-auto"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Cloud className="w-5 h-5 mr-2" />
              )}
              {isLoading ? 'Testing...' : 'Test State Change (Debug)'}
            </button>
            <p className="text-xs text-blue-600 mt-4">
              Your data stays private - saved to YOUR Google Drive, not our servers
            </p>
          </div>
        </div>
      ) : (
        /* Connected Section */
        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-medium">
                  {userInfo?.name?.charAt(0) || 'G'}
                </div>
                <div>
                  <p className="font-medium text-green-900">
                    Connected to Google Drive
                  </p>
                  <p className="text-sm text-green-700">
                    {userInfo?.email || 'Signed in'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-green-700 hover:text-green-900 underline"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Storage Info - Temporarily disabled for debugging */}
          {/*
          {storageInfo && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <HardDrive className="w-4 h-4 mr-2" />
                  Google Drive Storage
                </h4>
                <button
                  onClick={updateStorageInfo}
                  className="text-xs text-gray-600 hover:text-gray-800 underline"
                >
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Files:</span>
                  <span className="font-medium ml-2">{storageInfo.fileCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Size:</span>
                  <span className="font-medium ml-2">{storageInfo.totalSizeFormatted}</span>
                </div>
              </div>
            </div>
          )}
          */}

          {/* Action Buttons - Temporarily disabled for debugging */}
          <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <p>🎉 Google Drive Connected Successfully!</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              Save/Load functionality temporarily disabled for debugging
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveManager;