"use client";

import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  HardDrive, 
  Clock, 
  FileText,
  Shield,
  Smartphone,
  RotateCcw
} from 'lucide-react';
import { usePersistentStorage } from './persistent-storage';
import ExportButton from './ExportButton';

const DataManager = ({ 
  deviceId, 
  isAuthenticated, 
  stats, 
  topArtists, 
  topAlbums, 
  processedData, 
  briefObsessions, 
  songsByYear, 
  rawPlayData,
  formatDuration 
}) => {
  const {
    storage,
    isReady,
    saveProcessedData,
    getProcessedData,
    saveSettings,
    getSettings,
    exportData,
    importData,
    clearData,
    getStats
  } = usePersistentStorage(deviceId);

  const [storageStats, setStorageStats] = useState(null);
  const [lastDataUpdate, setLastDataUpdate] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      loadStorageInfo();
    }
  }, [isReady, isAuthenticated]);

  const loadStorageInfo = async () => {
    try {
      const stats = await getStats();
      setStorageStats(stats);
      
      const storedSettings = getSettings();
      setSettings(storedSettings);
      
      const processedData = getProcessedData();
      if (processedData?.lastUpdated) {
        setLastDataUpdate(new Date(processedData.lastUpdated));
      }
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };



  const handleClearAllData = () => {
    if (window.confirm('Are you sure you want to clear all stored data? This action cannot be undone.')) {
      try {
        clearData();
        setStorageStats(null);
        setLastDataUpdate(null);
        loadStorageInfo(); // Refresh to show empty state
      } catch (error) {
        console.error('Clear data failed:', error);
      }
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
        <p className="text-gray-600">
          Please authenticate with Face ID or Touch ID to access your data.
        </p>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading storage system...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Data Management</h2>
            <p className="text-sm text-gray-600">
              Device ID: {deviceId?.slice(-12)}
            </p>
          </div>
        </div>
        <button
          onClick={loadStorageInfo}
          className="p-2 text-gray-500 hover:text-gray-700"
          title="Refresh"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Storage Statistics */}
      {storageStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              <h3 className="font-medium text-blue-900">Storage Used</h3>
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-2">
              {formatBytes(storageStats.totalSize)}
            </p>
            <p className="text-sm text-blue-600">
              {storageStats.totalKeys} data entries
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-green-900">Last Update</h3>
            </div>
            <p className="text-sm font-medium text-green-700 mt-2">
              {lastDataUpdate ? lastDataUpdate.toLocaleDateString() : 'No data'}
            </p>
            <p className="text-xs text-green-600">
              {lastDataUpdate ? lastDataUpdate.toLocaleTimeString() : 'Upload files to see data'}
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <h3 className="font-medium text-purple-900">Device Only</h3>
            </div>
            <p className="text-sm text-purple-700 mt-2">
              100% Local Storage
            </p>
            <p className="text-xs text-purple-600">
              No server uploads
            </p>
          </div>
        </div>
      )}

      {/* Data Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Data Actions</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {/* Manual Save Button for Testing */}
          {stats && processedData && processedData.length > 0 && (
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center space-x-2 mb-3">
                <Database className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">Save Current Analysis</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Save your current streaming analysis ({processedData.length.toLocaleString()} tracks) to device storage.
              </p>
              <button
                onClick={() => {
                  // Trigger the same save logic as the automatic prompt
                  console.log('🔧 Manual save triggered');
                  if (window.saveProcessedDataManually) {
                    window.saveProcessedDataManually();
                  } else {
                    alert('Save function not available. Please check console for errors.');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                💾 Save Analysis Data Now
              </button>
            </div>
          )}

          {/* Export Data using existing ExportButton */}
          {stats && processedData && processedData.length > 0 && (
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <Download className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">Export Complete Data</h4>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Download your complete streaming analysis as an Excel file for backup or sharing.
              </p>
              <ExportButton
                stats={stats}
                topArtists={topArtists || []}
                topAlbums={topAlbums || []}
                processedData={processedData || []}
                briefObsessions={briefObsessions || []}
                songsByYear={songsByYear || {}}
                rawPlayData={rawPlayData || []}
                formatDuration={formatDuration}
              />
            </div>
          )}

          {/* Import Data */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Upload className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-gray-900">Device Migration</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              How data persistence works:
            </p>
            <div className="space-y-3 text-sm text-gray-600 mb-4">
              <div className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Analysis Data:</strong> All your statistics, top tracks, artists, and insights are saved automatically</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">ℹ️</span>
                <span><strong>File Storage:</strong> Original files (12MB+ each) are not stored due to browser limitations</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Return Experience:</strong> Your complete analysis is instantly available without reprocessing</span>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded text-sm text-green-700">
              <FileText className="w-4 h-4 inline mr-1" />
              This approach is more efficient than storing large files - your valuable analysis persists while keeping storage minimal.
            </div>
          </div>
        </div>
      </div>

      {/* Storage Breakdown */}
      {storageStats?.breakdown && Object.keys(storageStats.breakdown).length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(storageStats.breakdown).map(([key, size]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">
                  {key.replace('_', ' ')}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatBytes(size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <div className="flex items-center space-x-2 mb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-medium text-red-900">Danger Zone</h3>
        </div>
        <p className="text-sm text-red-700 mb-4">
          Clear all stored data from this device. This action cannot be undone.
        </p>
        <button
          onClick={handleClearAllData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
};

export default DataManager;