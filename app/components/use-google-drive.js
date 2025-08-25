"use client";

import { useState, useEffect, useCallback } from 'react';
import googleDriveStorage from './google-drive-storage';

export const useGoogleDrive = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);

  // Initialize Google Drive on mount
  useEffect(() => {
    const initializeDrive = async () => {
      try {
        setIsLoading(true);
        await googleDriveStorage.initialize();
        setIsInitialized(true);
        setIsSignedIn(googleDriveStorage.isAuthenticated());
        
        if (googleDriveStorage.isAuthenticated()) {
          await updateStorageInfo();
        }
      } catch (err) {
        console.error('Failed to initialize Google Drive:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDrive();
  }, []);

  // Sign in to Google Drive
  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userInfo = await googleDriveStorage.signIn();
      setIsSignedIn(true);
      setUserInfo(userInfo);
      
      await updateStorageInfo();
      return userInfo;
    } catch (err) {
      console.error('Google Drive sign-in failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await googleDriveStorage.signOut();
      setIsSignedIn(false);
      setUserInfo(null);
      setStorageInfo(null);
    } catch (err) {
      console.error('Sign-out failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save processed data
  const saveData = useCallback(async (data) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await googleDriveStorage.saveProcessedData(data);
      await updateStorageInfo(); // Refresh storage info
      return result;
    } catch (err) {
      console.error('Failed to save data:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load processed data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await googleDriveStorage.loadProcessedData();
      return data;
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update storage info
  const updateStorageInfo = useCallback(async () => {
    if (!isSignedIn) return;
    
    try {
      const info = await googleDriveStorage.getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      console.error('Failed to get storage info:', err);
    }
  }, [isSignedIn]);

  return {
    // State
    isInitialized,
    isSignedIn,
    userInfo,
    isLoading,
    error,
    storageInfo,
    
    // Actions
    signIn,
    signOut,
    saveData,
    loadData,
    updateStorageInfo,
    
    // Utilities
    clearError: () => setError(null)
  };
};

export default useGoogleDrive;