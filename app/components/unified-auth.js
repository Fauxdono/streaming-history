"use client";

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Shield, 
  Cloud, 
  CloudCheck,
  Fingerprint,
  Key,
  CheckCircle,
  AlertTriangle,
  Loader
} from 'lucide-react';
import DeviceAuth from './device-auth.js';
import useGoogleDrive from './use-google-drive.js';

const UnifiedAuth = ({ onAuthSuccess, onAuthFailure, onGoogleDriveReady }) => {
  const [deviceAuthComplete, setDeviceAuthComplete] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [googleDriveEnabled, setGoogleDriveEnabled] = useState(false);
  const [showGoogleDriveOption, setShowGoogleDriveOption] = useState(false);

  const {
    isInitialized: googleDriveInitialized,
    isSignedIn: googleDriveSignedIn,
    userInfo: googleUserInfo,
    isLoading: googleDriveLoading,
    error: googleDriveError,
    signIn: googleSignIn,
    signOut: googleSignOut,
    clearError: clearGoogleError
  } = useGoogleDrive();

  // Handle device authentication success
  const handleDeviceAuthSuccess = (newDeviceId) => {
    console.log('🔧 Device authentication successful:', newDeviceId);
    setDeviceId(newDeviceId);
    setDeviceAuthComplete(true);
    
    // Show Google Drive option after device auth
    setShowGoogleDriveOption(true);
    
    // Call the parent success handler
    onAuthSuccess(newDeviceId);
  };

  // Handle device authentication failure
  const handleDeviceAuthFailure = (error) => {
    console.error('❌ Device authentication failed:', error);
    onAuthFailure(error);
  };

  // Handle Google Drive sign-in
  const handleGoogleDriveSignIn = async () => {
    try {
      clearGoogleError();
      const userInfo = await googleSignIn();
      setGoogleDriveEnabled(true);
      
      console.log('🔧 Google Drive connected for device:', deviceId);
      
      // Notify parent component that Google Drive is ready
      if (onGoogleDriveReady) {
        onGoogleDriveReady(userInfo);
      }
      
    } catch (error) {
      console.error('❌ Google Drive connection failed:', error);
    }
  };

  // Handle Google Drive sign-out
  const handleGoogleDriveSignOut = async () => {
    try {
      await googleSignOut();
      setGoogleDriveEnabled(false);
    } catch (error) {
      console.error('❌ Google Drive disconnect failed:', error);
    }
  };

  // Skip Google Drive setup
  const handleSkipGoogleDrive = () => {
    console.log('🔧 User skipped Google Drive setup');
    setShowGoogleDriveOption(false);
  };

  return (
    <div className="space-y-6">
      {/* Device Authentication Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className={`w-6 h-6 ${deviceAuthComplete ? 'text-green-600' : 'text-blue-600'}`} />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Device Authentication
            </h2>
            <p className="text-sm text-gray-600">
              Secure your data with biometric authentication (Face ID, Touch ID)
            </p>
          </div>
          {deviceAuthComplete && <CheckCircle className="w-6 h-6 text-green-600" />}
        </div>

        {!deviceAuthComplete ? (
          <DeviceAuth 
            onAuthSuccess={handleDeviceAuthSuccess}
            onAuthFailure={handleDeviceAuthFailure}
          />
        ) : (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">Device authenticated successfully</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Device ID: {deviceId?.slice(-12)}
            </p>
          </div>
        )}
      </div>

      {/* Google Drive Cloud Storage Section */}
      {showGoogleDriveOption && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Cloud className={`w-6 h-6 ${googleDriveSignedIn ? 'text-green-600' : 'text-blue-600'}`} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Cloud Storage (Optional)
              </h2>
              <p className="text-sm text-gray-600">
                Connect Google Drive to save your large datasets (70MB+) in the cloud
              </p>
            </div>
            {googleDriveSignedIn && <CloudCheck className="w-6 h-6 text-green-600" />}
          </div>

          {!googleDriveInitialized ? (
            <div className="flex items-center space-x-2 text-gray-600">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Initializing Google Drive...</span>
            </div>
          ) : googleDriveError ? (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 font-medium">Google Drive Setup Required</span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                {googleDriveError}
              </p>
              <div className="mt-3 flex space-x-3">
                <button
                  onClick={handleSkipGoogleDrive}
                  className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : !googleDriveSignedIn ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">Why connect Google Drive?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Save datasets over 70MB that exceed browser storage</li>
                  <li>• Access your analysis from any device</li>
                  <li>• Automatic cloud backup of your streaming history</li>
                  <li>• Your data stays private in YOUR Google Drive</li>
                </ul>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleGoogleDriveSignIn}
                  disabled={googleDriveLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
                >
                  {googleDriveLoading ? (
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Cloud className="w-5 h-5 mr-2" />
                  )}
                  {googleDriveLoading ? 'Connecting...' : 'Connect Google Drive'}
                </button>
                
                <button
                  onClick={handleSkipGoogleDrive}
                  className="px-4 py-3 text-gray-600 hover:text-gray-800 underline"
                >
                  Skip for now
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-medium">
                    {googleUserInfo?.name?.charAt(0) || 'G'}
                  </div>
                  <div>
                    <p className="font-medium text-green-900">
                      Google Drive Connected
                    </p>
                    <p className="text-sm text-green-700">
                      Ready for large dataset storage
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleGoogleDriveSignOut}
                  className="text-sm text-green-700 hover:text-green-900 underline"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Summary */}
      {deviceAuthComplete && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-2">Authentication Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Device security: Enabled</span>
            </div>
            <div className="flex items-center space-x-2">
              {googleDriveSignedIn ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-gray-700">Cloud storage: Connected</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                  <span className="text-gray-500">Cloud storage: Not connected</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedAuth;