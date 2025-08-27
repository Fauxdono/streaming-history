"use client";

import React, { useState } from 'react';

// Simple Google Drive component without complex hooks or state management
const SimpleGoogleDrive = ({ 
  stats, 
  processedData, 
  topArtists = [], 
  topAlbums = [], 
  briefObsessions = [], 
  songsByYear = {}, 
  rawPlayData = [], 
  onDataLoaded 
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Simple Google Drive connection
  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');
    
    try {
      // Check for popup blocker
      const testPopup = window.open('', '_blank', 'width=1,height=1');
      if (!testPopup || testPopup.closed || typeof testPopup.closed === 'undefined') {
        setError('Popup blocked! Please allow popups for this site and try again. Look for a popup blocker icon in your address bar.');
        setIsConnecting(false);
        return;
      }
      testPopup.close();
      // Load Google API script if not already loaded
      if (!window.gapi) {
        await loadGoogleAPI();
      }

      // Load Google Identity Services if not already loaded  
      if (!window.google?.accounts) {
        await loadGoogleIdentityServices();
      }

      // Initialize Google API
      await new Promise((resolve, reject) => {
        window.gapi.load('client', {
          callback: resolve,
          onerror: reject
        });
      });

      // Initialize the client
      await window.gapi.client.init({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
      });

      // Set up OAuth - store tokenClient to call it from user interaction
      window.currentTokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            setError(`Authentication failed: ${tokenResponse.error}`);
            setIsConnecting(false);
            return;
          }
          
          // Set token for API calls
          window.gapi.client.setToken({
            access_token: tokenResponse.access_token
          });
          
          setIsConnected(true);
          setUserEmail('Google User'); // Simplified - no need for real email
          setIsConnecting(false);
        }
      });

      // Small delay to ensure everything is ready, then request token
      setTimeout(() => {
        window.currentTokenClient.requestAccessToken({ prompt: 'consent' });
      }, 100);

    } catch (err) {
      console.error('Google Drive connection failed:', err);
      setError(`Connection failed: ${err.message}`);
      setIsConnecting(false);
    }
  };

  // Simple disconnect
  const handleDisconnect = () => {
    if (window.gapi?.client) {
      window.gapi.client.setToken(null);
    }
    setIsConnected(false);
    setUserEmail('');
  };

  // Simple save to Google Drive
  const handleSave = async () => {
    if (!stats || !processedData || processedData.length === 0) {
      setError('No data to save. Please process your streaming files first.');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
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
          totalTracks: processedData.length
        }
      };

      const jsonString = JSON.stringify(saveData, null, 2);
      const fileName = `streaming-analysis-${new Date().toISOString().split('T')[0]}.json`;
      
      // Create file in Google Drive
      const response = await window.gapi.client.request({
        path: 'https://www.googleapis.com/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        headers: {
          'Content-Type': 'multipart/related; boundary="boundary123"'
        },
        body: [
          '--boundary123',
          'Content-Type: application/json',
          '',
          JSON.stringify({
            name: fileName,
            mimeType: 'application/json'
          }),
          '--boundary123',
          'Content-Type: application/json',
          '',
          jsonString,
          '--boundary123--'
        ].join('\r\n')
      });

      const sizeInMB = (jsonString.length / (1024 * 1024)).toFixed(2);
      alert(`Success! Analysis saved to Google Drive (${sizeInMB}MB)`);
      
    } catch (err) {
      console.error('Save failed:', err);
      setError(`Save failed: ${err.message}`);
    }
    
    setIsSaving(false);
  };

  // Simple load from Google Drive
  const handleLoad = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Find the most recent analysis file
      const response = await window.gapi.client.drive.files.list({
        q: "name contains 'streaming-analysis' and trashed=false",
        orderBy: 'modifiedTime desc',
        pageSize: 1
      });

      if (response.result.files.length === 0) {
        alert('No saved analysis found on Google Drive');
        setIsLoading(false);
        return;
      }

      const file = response.result.files[0];
      
      // Download file content
      const fileContent = await window.gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
      });

      const data = JSON.parse(fileContent.body);
      
      // Call the callback to load data into the app
      if (onDataLoaded) {
        onDataLoaded(data);
      }
      
      alert(`Analysis loaded from Google Drive (${data.processedTracks?.length || 0} tracks)`);
      
    } catch (err) {
      console.error('Load failed:', err);
      setError(`Load failed: ${err.message}`);
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: 'white' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
          Google Drive Storage
        </h2>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Save your large datasets (70MB+) to Google Drive for persistence
        </p>
      </div>

      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fca5a5', 
          borderRadius: '8px', 
          color: '#dc2626',
          marginBottom: '16px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>❌ {error}</div>
          {error.includes('Popup blocked') && (
            <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
              <strong>How to allow popups:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '16px' }}>
                <li><strong>Chrome/Edge:</strong> Click the popup blocker icon 🚫 in the address bar</li>
                <li><strong>Firefox:</strong> Click "Options" → "Allow pop-ups for this site"</li>
                <li><strong>Safari:</strong> Look for popup blocker icon in address bar</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {!isConnected ? (
        <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>☁️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#1e40af' }}>
            Connect Google Drive
          </h3>
          <p style={{ color: '#3730a3', marginBottom: '24px' }}>
            Connect your Google Drive to save your large streaming analysis and access it from any device.
          </p>
          <div>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              style={{
                padding: '12px 24px',
                backgroundColor: isConnecting ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                marginBottom: '12px'
              }}
            >
              {isConnecting ? 'Connecting...' : '🔗 Connect Google Drive'}
            </button>
            {error && error.includes('Popup blocked') && (
              <div style={{ fontSize: '12px', color: '#3730a3' }}>
                💡 Tip: Make sure to allow popups, then try again
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#16a34a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  marginRight: '12px'
                }}>
                  G
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#14532d', margin: '0' }}>
                    Connected to Google Drive
                  </p>
                  <p style={{ fontSize: '14px', color: '#166534', margin: '0' }}>
                    Ready for large dataset storage
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                style={{
                  fontSize: '14px',
                  color: '#166534',
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Disconnect
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>💾 Save to Google Drive</h4>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                Save your current analysis to Google Drive. Perfect for large datasets (70MB+).
              </p>
              <button
                onClick={handleSave}
                disabled={isSaving || !stats || !processedData || processedData.length === 0}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: isSaving || !stats ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: isSaving || !stats ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? '💾 Saving...' : '💾 Save Analysis'}
              </button>
            </div>

            <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>📥 Load from Google Drive</h4>
              <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                Restore your saved analysis from Google Drive instantly.
              </p>
              <button
                onClick={handleLoad}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: isLoading ? '#9ca3af' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? '📥 Loading...' : '📥 Load Analysis'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
const loadGoogleAPI = () => {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const loadGoogleIdentityServices = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export default SimpleGoogleDrive;