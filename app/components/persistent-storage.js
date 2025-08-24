"use client";

// Persistent Storage Manager for Device-Based Accounts
// Stores all user data locally with optional encryption

class PersistentStorage {
  constructor(deviceId) {
    this.deviceId = deviceId;
    this.prefix = `streaming_data_${deviceId}`;
  }

  // Core storage methods
  setItem(key, data) {
    try {
      const fullKey = `${this.prefix}_${key}`;
      const serialized = JSON.stringify({
        data,
        timestamp: Date.now(),
        version: '1.0'
      });
      
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  }

  getItem(key) {
    try {
      const fullKey = `${this.prefix}_${key}`;
      const serialized = localStorage.getItem(fullKey);
      
      if (!serialized) return null;
      
      const parsed = JSON.parse(serialized);
      return parsed.data;
    } catch (error) {
      console.error('Failed to retrieve data:', error);
      return null;
    }
  }

  removeItem(key) {
    try {
      const fullKey = `${this.prefix}_${key}`;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Failed to remove data:', error);
      return false;
    }
  }

  // Get all keys for this device
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.replace(`${this.prefix}_`, ''));
      }
    }
    return keys;
  }

  // Streaming data specific methods
  saveProcessedData(data) {
    return this.setItem('processed_data', {
      stats: data.stats,
      topArtists: data.topArtists,
      topAlbums: data.topAlbums,
      processedTracks: data.processedTracks,
      songsByYear: data.songsByYear,
      briefObsessions: data.briefObsessions,
      artistsByYear: data.artistsByYear,
      albumsByYear: data.albumsByYear,
      lastUpdated: Date.now()
    });
  }

  getProcessedData() {
    return this.getItem('processed_data');
  }

  saveUploadedFiles(files) {
    // Store file metadata (not actual file content for privacy)
    const fileMetadata = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      uploadedAt: Date.now()
    }));
    
    return this.setItem('uploaded_files', fileMetadata);
  }

  getUploadedFiles() {
    return this.getItem('uploaded_files') || [];
  }

  saveRawPlayData(rawData) {
    // Compress raw data if it's large
    const compressed = this.compressData(rawData);
    return this.setItem('raw_play_data', compressed);
  }

  getRawPlayData() {
    const compressed = this.getItem('raw_play_data');
    return compressed ? this.decompressData(compressed) : null;
  }

  // Settings and preferences
  saveSettings(settings) {
    return this.setItem('settings', settings);
  }

  getSettings() {
    return this.getItem('settings') || {
      theme: 'light',
      defaultView: 'stats',
      showCakeService: false,
      dataRetentionDays: 365
    };
  }

  // Data compression helpers for large datasets
  compressData(data) {
    try {
      // Simple compression by removing redundant data
      if (Array.isArray(data)) {
        return {
          compressed: true,
          length: data.length,
          sample: data.slice(0, 10), // Keep sample for verification
          data: data // In a real implementation, you'd use actual compression
        };
      }
      return data;
    } catch (error) {
      console.error('Compression failed:', error);
      return data;
    }
  }

  decompressData(compressed) {
    try {
      if (compressed?.compressed) {
        return compressed.data;
      }
      return compressed;
    } catch (error) {
      console.error('Decompression failed:', error);
      return compressed;
    }
  }

  // Data export for device migration
  exportAllData() {
    const keys = this.getAllKeys();
    const exportData = {
      deviceId: this.deviceId,
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {}
    };

    keys.forEach(key => {
      const data = this.getItem(key);
      if (data) {
        exportData.data[key] = data;
      }
    });

    return exportData;
  }

  // Data import from another device
  importAllData(exportData) {
    try {
      if (!exportData?.data) {
        throw new Error('Invalid export data format');
      }

      Object.entries(exportData.data).forEach(([key, data]) => {
        this.setItem(key, data);
      });

      return {
        success: true,
        importedKeys: Object.keys(exportData.data)
      };
    } catch (error) {
      console.error('Import failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Storage cleanup
  clearAllData() {
    const keys = this.getAllKeys();
    keys.forEach(key => {
      this.removeItem(key);
    });
    return true;
  }

  // Storage statistics
  getStorageStats() {
    const keys = this.getAllKeys();
    let totalSize = 0;
    const breakdown = {};

    keys.forEach(key => {
      const data = this.getItem(key);
      const size = new Blob([JSON.stringify(data)]).size;
      totalSize += size;
      breakdown[key] = size;
    });

    return {
      totalKeys: keys.length,
      totalSize: totalSize,
      breakdown: breakdown,
      availableSpace: this.getAvailableStorage()
    };
  }

  getAvailableStorage() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        return navigator.storage.estimate();
      }
      return Promise.resolve({ quota: 0, usage: 0 });
    } catch (error) {
      return Promise.resolve({ quota: 0, usage: 0 });
    }
  }

  // Data validation and integrity
  validateData(key) {
    try {
      const fullKey = `${this.prefix}_${key}`;
      const serialized = localStorage.getItem(fullKey);
      
      if (!serialized) return { valid: false, reason: 'Not found' };
      
      const parsed = JSON.parse(serialized);
      
      if (!parsed.data || !parsed.timestamp) {
        return { valid: false, reason: 'Invalid format' };
      }
      
      // Check if data is too old (optional cleanup)
      const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
      if (Date.now() - parsed.timestamp > maxAge) {
        return { valid: false, reason: 'Data too old' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }
}

// Factory function to create storage instance
export const createPersistentStorage = (deviceId) => {
  return new PersistentStorage(deviceId);
};

// React hook for using persistent storage
import { useState, useEffect, useRef } from 'react';

export const usePersistentStorage = (deviceId) => {
  const [storage, setStorage] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const storageRef = useRef(null);

  useEffect(() => {
    if (deviceId && !storageRef.current) {
      storageRef.current = new PersistentStorage(deviceId);
      setStorage(storageRef.current);
      setIsReady(true);
    }
  }, [deviceId]);

  const saveProcessedData = (data) => {
    return storage?.saveProcessedData(data);
  };

  const getProcessedData = () => {
    return storage?.getProcessedData();
  };

  const saveSettings = (settings) => {
    return storage?.saveSettings(settings);
  };

  const getSettings = () => {
    return storage?.getSettings();
  };

  const exportData = () => {
    return storage?.exportAllData();
  };

  const importData = (data) => {
    return storage?.importAllData(data);
  };

  const clearData = () => {
    return storage?.clearAllData();
  };

  const getStats = async () => {
    if (!storage) return null;
    return storage.getStorageStats();
  };

  return {
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
  };
};

export default PersistentStorage;