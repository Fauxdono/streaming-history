"use client";

import React, { useState, useEffect } from 'react';
import { Smartphone, Shield, Database, Download, Upload } from 'lucide-react';

// Device fingerprinting without storing personal data
function generateDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Device fingerprint', 2, 2);
  
  const fingerprint = {
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    canvas: canvas.toDataURL(),
    timestamp: Date.now()
  };
  
  // Create hash from fingerprint components
  const fingerprintString = JSON.stringify(fingerprint);
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `device_${Math.abs(hash)}_${Date.now()}`;
}

// WebAuthn helper functions
async function isWebAuthnSupported() {
  return !!(navigator.credentials && navigator.credentials.create);
}

async function isBiometricAvailable() {
  if (!await isWebAuthnSupported()) return false;
  
  try {
    // Check if biometric authentication is available
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch (error) {
    console.log('Biometric check failed:', error);
    return false;
  }
}

async function registerBiometric(deviceId) {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: {
          name: "Streaming History Analyzer",
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(deviceId),
          name: `Device ${deviceId.slice(-8)}`,
          displayName: `Device ${deviceId.slice(-8)}`
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    // Store credential info locally (not the actual credential)
    const credentialInfo = {
      id: credential.id,
      registered: Date.now(),
      deviceId: deviceId
    };
    
    localStorage.setItem(`biometric_${deviceId}`, JSON.stringify(credentialInfo));
    return credential;
  } catch (error) {
    console.error('Biometric registration failed:', error);
    throw error;
  }
}

async function authenticateBiometric(deviceId) {
  try {
    const storedInfo = localStorage.getItem(`biometric_${deviceId}`);
    if (!storedInfo) {
      throw new Error('No biometric registration found for this device');
    }
    
    const credentialInfo = JSON.parse(storedInfo);
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        allowCredentials: [{
          id: base64ToArrayBuffer(credentialInfo.id),
          type: "public-key"
        }],
        userVerification: "required",
        timeout: 60000
      }
    });

    return assertion;
  } catch (error) {
    console.error('Biometric authentication failed:', error);
    throw error;
  }
}

// Utility functions
function base64ToArrayBuffer(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

const DeviceAuth = ({ onAuthSuccess, onAuthFailure }) => {
  const [deviceId, setDeviceId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initializeDevice();
  }, []);

  const initializeDevice = async () => {
    try {
      // Check for existing device
      let existingDeviceId = localStorage.getItem('device_id');
      
      if (!existingDeviceId) {
        // Generate new device ID
        existingDeviceId = generateDeviceFingerprint();
        localStorage.setItem('device_id', existingDeviceId);
      }
      
      setDeviceId(existingDeviceId);
      
      // Check biometric availability
      const biometricSupported = await isBiometricAvailable();
      setBiometricAvailable(biometricSupported);
      
      // Check if biometric is already registered
      const biometricInfo = localStorage.getItem(`biometric_${existingDeviceId}`);
      setBiometricRegistered(!!biometricInfo);
      
      // Check if device is already authenticated
      const lastAuth = localStorage.getItem(`auth_${existingDeviceId}`);
      if (lastAuth) {
        const authData = JSON.parse(lastAuth);
        // Consider authenticated if within last 24 hours
        if (Date.now() - authData.timestamp < 24 * 60 * 60 * 1000) {
          setIsAuthenticated(true);
          onAuthSuccess?.(existingDeviceId);
        }
      }
      
    } catch (error) {
      console.error('Device initialization failed:', error);
      setError('Failed to initialize device authentication');
    }
  };

  const handleRegisterBiometric = async () => {
    if (!deviceId || !biometricAvailable) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await registerBiometric(deviceId);
      setBiometricRegistered(true);
      
      // Automatically authenticate after registration
      await handleBiometricAuth();
      
    } catch (error) {
      setError(`Registration failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    if (!deviceId || !biometricRegistered) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      await authenticateBiometric(deviceId);
      
      // Store successful authentication
      const authData = {
        timestamp: Date.now(),
        deviceId: deviceId
      };
      localStorage.setItem(`auth_${deviceId}`, JSON.stringify(authData));
      
      setIsAuthenticated(true);
      onAuthSuccess?.(deviceId);
      
    } catch (error) {
      setError(`Authentication failed: ${error.message}`);
      onAuthFailure?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    if (!deviceId) return;
    
    localStorage.removeItem(`auth_${deviceId}`);
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">
              Device Authenticated
            </p>
            <p className="text-xs text-green-600">
              Device ID: {deviceId?.slice(-12)}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="px-3 py-1 text-xs text-green-700 hover:text-green-900 underline"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center space-x-3 mb-4">
        <Smartphone className="w-6 h-6 text-blue-600" />
        <div>
          <h3 className="font-semibold text-blue-900">Device Authentication</h3>
          <p className="text-sm text-blue-700">
            Secure your data with biometric authentication
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>Device ID:</span>
          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
            {deviceId?.slice(-12) || 'Generating...'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>Biometric Support:</span>
          <span className={biometricAvailable ? 'text-green-600' : 'text-red-600'}>
            {biometricAvailable ? '✓ Available' : '✗ Not Available'}
          </span>
        </div>

        {biometricAvailable && (
          <div className="flex items-center justify-between text-sm">
            <span>Biometric Registration:</span>
            <span className={biometricRegistered ? 'text-green-600' : 'text-orange-600'}>
              {biometricRegistered ? '✓ Registered' : '✗ Not Registered'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {biometricAvailable && !biometricRegistered && (
          <button
            onClick={handleRegisterBiometric}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Registering...' : 'Register Face ID / Touch ID'}
          </button>
        )}

        {biometricRegistered && (
          <button
            onClick={handleBiometricAuth}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Authenticating...' : 'Authenticate with Face ID / Touch ID'}
          </button>
        )}

        {!biometricAvailable && (
          <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
            Biometric authentication is not available on this device. Your data will be stored locally without additional security.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-blue-200">
        <p className="text-xs text-blue-600">
          <Database className="w-4 h-4 inline mr-1" />
          All data stays on your device. No personal information is sent to servers.
        </p>
      </div>
    </div>
  );
};

export default DeviceAuth;