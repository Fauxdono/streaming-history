"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './themeprovider';
import { Coffee } from 'lucide-react';

const SupportDropdown = ({ isOpen, onClose, buttonRef, colorMode = 'minimal' }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const dropdownRef = useRef(null);
  const [activePlatform, setActivePlatform] = useState('ko-fi');
  const isColorful = colorMode === 'colorful';

  const accounts = {
    'ko-fi': 'fauxdono',
    'buymeacoffee': 'fauxdono'
  };

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  // Position dropdown relative to button
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 200;

      let left = buttonRect.left + buttonRect.width / 2 - dropdownWidth / 2;
      let top = buttonRect.bottom + 8;

      // Adjust if dropdown would go off screen
      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      // If dropdown would go below viewport, show it above button
      if (top + 180 > window.innerHeight) {
        top = buttonRect.top - 180 - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, buttonRef]);

  const renderPlatformContent = () => {
    switch (activePlatform) {
      case 'ko-fi':
        return (
          <div className="text-center space-y-3">
            <a
              href={`https://ko-fi.com/${accounts['ko-fi']}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Coffee className="inline mr-2" size={16} />
              Buy me a coffee
            </a>
          </div>
        );
      case 'buymeacoffee':
        return (
          <div className="text-center space-y-3">
            <a
              href={`https://www.buymeacoffee.com/${accounts['buymeacoffee']}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Coffee className="inline mr-2" size={16} />
              Buy me a coffee
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  const pillActive = isColorful
    ? 'bg-indigo-500 text-white'
    : 'bg-black dark:bg-white text-white dark:text-black';
  const pillInactive = isColorful
    ? 'bg-indigo-200 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-300 dark:hover:bg-indigo-600'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700';

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`fixed z-[300] ${isDarkMode ? 'bg-gray-900 border-gray-600' : 'bg-white border-gray-300'}
        border rounded-lg shadow-xl p-4`}
      style={{
        top: position.top,
        left: position.left,
        minWidth: '200px'
      }}
    >
      <div className={`text-center text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        no ads, just vibes
      </div>

      <div className="flex gap-2 justify-center mb-4">
        {['ko-fi', 'buymeacoffee'].map(platform => (
          <button
            key={platform}
            onClick={() => setActivePlatform(platform)}
            className={`px-3 py-1 rounded-full text-sm ${
              activePlatform === platform ? pillActive : pillInactive
            }`}
          >
            {platform === 'ko-fi' ? 'Ko-fi' : 'BMC'}
          </button>
        ))}
      </div>

      <div className={`p-3 border rounded-lg ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        {renderPlatformContent()}
      </div>

      <div className={`mt-3 text-xs text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        Love Yourz
      </div>
    </div>
  );
};

export default SupportDropdown;
