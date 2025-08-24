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

const DataManager = ({ deviceId, isAuthenticated }) => {
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
  const [showExportData, setShowExportData] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

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

  const handleExportData = () => {
    try {
      const exportedData = exportData();
      const blob = new Blob([JSON.stringify(exportedData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `streaming-history-backup-${deviceId?.slice(-8)}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result);
        const result = importData(importedData);
        
        if (result.success) {
          setImportSuccess(`Successfully imported ${result.importedKeys.length} data sets`);
          setImportError('');
          loadStorageInfo(); // Refresh stats
          
          // Clear success message after 5 seconds
          setTimeout(() => setImportSuccess(''), 5000);
        } else {
          setImportError(result.error);
          setImportSuccess('');
        }
      } catch (error) {
        setImportError(`Invalid file format: ${error.message}`);
        setImportSuccess('');
      }
    };
    reader.readAsText(file);
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Data */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Download className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Export Data</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Download all your streaming data as a JSON file for backup or device migration.
            </p>
            <button
              onClick={handleExportData}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export All Data
            </button>
          </div>

          {/* Import Data */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Upload className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-gray-900">Import Data</h4>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Restore data from a previous export file.
            </p>
            <label className="w-full block">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
              <div className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer text-center">
                Import Data File
              </div>
            </label>
          </div>
        </div>

        {/* Import Messages */}
        {importSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-700">
            {importSuccess}
          </div>
        )}
        {importError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {importError}
          </div>
        )}
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