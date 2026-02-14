"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './themeprovider';

const AnalysisSettingsDropdown = ({ isOpen, onClose, buttonRef }) => {
  const { theme, minPlayDuration, setMinPlayDuration, skipFilter, setSkipFilter, fullListenOnly, setFullListenOnly } = useTheme();
  const isDarkMode = theme === 'dark';
  const dropdownRef = useRef(null);

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
      const dropdownWidth = 280;

      let left = buttonRect.left + buttonRect.width / 2 - dropdownWidth / 2;
      let top = buttonRect.bottom + 8;

      // Adjust if dropdown would go off screen
      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      // If dropdown would go below viewport, show it above button
      if (top + 260 > window.innerHeight) {
        top = buttonRect.top - 260 - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, buttonRef]);

  if (!isOpen) return null;

  const durationSeconds = Math.round(minPlayDuration / 1000);

  return (
    <div
      ref={dropdownRef}
      className={`fixed z-[300] ${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-300'}
        border rounded-lg shadow-xl p-4`}
      style={{
        top: position.top,
        left: position.left,
        width: '280px'
      }}
    >
      {/* Min Play Duration Slider */}
      <div>
        <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Minimum Play Duration
        </div>
        <input
          type="range"
          min="0"
          max="120"
          value={durationSeconds}
          onChange={(e) => setMinPlayDuration(parseInt(e.target.value, 10) * 1000)}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider
            ${isDarkMode ? 'bg-black' : 'bg-gray-200'}`}
          style={{
            background: isDarkMode
              ? `linear-gradient(to right, #6366f1 0%, #6366f1 ${(durationSeconds / 120) * 100}%, #374151 ${(durationSeconds / 120) * 100}%, #374151 100%)`
              : `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(durationSeconds / 120) * 100}%, #e5e7eb ${(durationSeconds / 120) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className={`text-center text-sm mt-1 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {durationSeconds}s
        </div>
      </div>

      {/* Divider */}
      <div className={`my-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></div>

      {/* Skip Filter Toggle */}
      <label className={`flex items-center justify-between cursor-pointer py-1`}>
        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Exclude skipped tracks
        </span>
        <div className="relative">
          <input
            type="checkbox"
            checked={skipFilter}
            onChange={(e) => setSkipFilter(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${
            skipFilter
              ? 'bg-indigo-500'
              : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              skipFilter ? 'translate-x-5' : ''
            }`}></div>
          </div>
        </div>
      </label>

      {/* Full Listen Only Toggle */}
      <label className={`flex items-center justify-between cursor-pointer py-1 mt-1`}>
        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Only count completed plays
        </span>
        <div className="relative">
          <input
            type="checkbox"
            checked={fullListenOnly}
            onChange={(e) => setFullListenOnly(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${
            fullListenOnly
              ? 'bg-indigo-500'
              : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              fullListenOnly ? 'translate-x-5' : ''
            }`}></div>
          </div>
        </div>
      </label>
    </div>
  );
};

export default AnalysisSettingsDropdown;
