"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './themeprovider';

const FontSizeDropdown = ({ isOpen, onClose, buttonRef }) => {
  const { theme, fontSize, setFontSize, fontFamily, setFontFamily, minPlayDuration, setMinPlayDuration, skipFilter, setSkipFilter, fullListenOnly, setFullListenOnly } = useTheme();
  const isDarkMode = theme === 'dark';
  const dropdownRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleFontSizeChange = (newSize) => {
    setFontSize(newSize);
  };

  const handleFontFamilyChange = (newFamily) => {
    setFontFamily(newFamily);
  };

  const fontFamilyOptions = [
    { value: 'sans', label: 'Sans-serif', preview: '-apple-system, BlinkMacSystemFont, sans-serif' },
    { value: 'serif', label: 'Serif', preview: 'Georgia, Times New Roman, serif' },
    { value: 'mono', label: 'Monospace', preview: 'Monaco, Courier New, monospace' },
    { value: 'comic', label: 'Comic Sans', preview: 'Comic Sans MS, cursive' },
    { value: 'inter', label: 'Inter', preview: 'var(--font-inter), Inter, sans-serif' },
    { value: 'jetbrains-mono', label: 'JetBrains Mono', preview: 'var(--font-jetbrains-mono), JetBrains Mono, monospace' },
    { value: 'playfair', label: 'Playfair Display', preview: 'var(--font-playfair), Playfair Display, serif' },
    { value: 'space-grotesk', label: 'Space Grotesk', preview: 'var(--font-space-grotesk), Space Grotesk, sans-serif' },
    { value: 'outfit', label: 'Outfit', preview: 'var(--font-outfit), Outfit, sans-serif' },
    { value: 'dm-sans', label: 'DM Sans', preview: 'var(--font-dm-sans), DM Sans, sans-serif' },
    { value: 'sora', label: 'Sora', preview: 'var(--font-sora), Sora, sans-serif' },
    { value: 'lexend', label: 'Lexend', preview: 'var(--font-lexend), Lexend, sans-serif' },
    { value: 'cursive', label: 'Cursive', preview: 'Brush Script MT, Segoe Script, cursive' },
    { value: 'system-ui', label: 'System UI', preview: 'system-ui, -apple-system, sans-serif' },
    { value: 'fantasy', label: 'Fantasy', preview: 'Papyrus, fantasy' }
  ];

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
      const dropdownWidth = window.innerWidth >= 768 ? 560 : 280;
      
      let left = buttonRect.left + buttonRect.width / 2 - dropdownWidth / 2;
      let top = buttonRect.bottom + 8;
      
      // Adjust if dropdown would go off screen
      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }
      
      // If dropdown would go below viewport, show it above button
      if (top + 520 > window.innerHeight) {
        top = buttonRect.top - 520 - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, buttonRef]);

  const fontSizeOptions = [
    { value: 'small', label: 'Small', sliderValue: 0 },
    { value: 'medium', label: 'Medium', sliderValue: 1 },
    { value: 'large', label: 'Large', sliderValue: 2 },
    { value: 'xlarge', label: 'Extra Large', sliderValue: 3 }
  ];

  const currentSliderValue = fontSizeOptions.find(opt => opt.value === fontSize)?.sliderValue ?? 1;

  const handleSliderChange = (event) => {
    const value = parseInt(event.target.value);
    const option = fontSizeOptions[value];
    if (option) {
      handleFontSizeChange(option.value);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className={`fixed z-[300] ${isDarkMode ? 'bg-black border-gray-600' : 'bg-white border-gray-300'} 
        border rounded-lg shadow-xl p-4`}
      style={{
        top: position.top,
        left: position.left,
        minWidth: isMobile ? '240px' : '540px'
      }}
    >
      {/* Font Size Slider */}
      <div>
        <input
          type="range"
          min="0"
          max="3"
          value={currentSliderValue}
          onChange={handleSliderChange}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider
            ${isDarkMode ? 'bg-black' : 'bg-gray-200'}`}
          style={{
            background: isDarkMode 
              ? `linear-gradient(to right, #374151 0%, #374151 ${(currentSliderValue / 3) * 100}%, #6366f1 ${(currentSliderValue / 3) * 100}%, #6366f1 100%)`
              : `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${(currentSliderValue / 3) * 100}%, #4f46e5 ${(currentSliderValue / 3) * 100}%, #4f46e5 100%)`
          }}
        />
        
        {/* Letter size indicators under each notch */}
        <div className="flex justify-between mt-3 px-1">
          <button
            onClick={() => handleFontSizeChange('small')}
            className={`transition-colors font-size-indicator-small ${
              fontSize === 'small'
                ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              fontWeight: fontSize === 'small' ? 'bold' : 'normal'
            }}
          >
            A
          </button>
          <button
            onClick={() => handleFontSizeChange('medium')}
            className={`transition-colors font-size-indicator-medium ${
              fontSize === 'medium'
                ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              fontWeight: fontSize === 'medium' ? 'bold' : 'normal'
            }}
          >
            A
          </button>
          <button
            onClick={() => handleFontSizeChange('large')}
            className={`transition-colors font-size-indicator-large ${
              fontSize === 'large'
                ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              fontWeight: fontSize === 'large' ? 'bold' : 'normal'
            }}
          >
            A
          </button>
          <button
            onClick={() => handleFontSizeChange('xlarge')}
            className={`transition-colors font-size-indicator-xlarge ${
              fontSize === 'xlarge'
                ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              fontWeight: fontSize === 'xlarge' ? 'bold' : 'normal'
            }}
          >
            A
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className={`my-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></div>

      {/* Font Family Section */}
      <div>
        <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Font Family
        </div>
        <div className={isMobile ? "max-h-48 overflow-y-auto space-y-1" : "grid grid-cols-4 gap-1"}>
          {fontFamilyOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleFontFamilyChange(option.value)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                fontFamily === option.value
                  ? isDarkMode
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-100 text-indigo-700'
                  : isDarkMode
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
              }`}
              style={{ fontFamily: option.preview }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={`my-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></div>

      {/* Analysis Settings */}
      <div>
        <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Minimum Play Duration
        </div>
        <input
          type="range"
          min="0"
          max="120"
          value={Math.round(minPlayDuration / 1000)}
          onChange={(e) => setMinPlayDuration(parseInt(e.target.value, 10) * 1000)}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider
            ${isDarkMode ? 'bg-black' : 'bg-gray-200'}`}
          style={{
            background: isDarkMode
              ? `linear-gradient(to right, #6366f1 0%, #6366f1 ${(Math.round(minPlayDuration / 1000) / 120) * 100}%, #374151 ${(Math.round(minPlayDuration / 1000) / 120) * 100}%, #374151 100%)`
              : `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(Math.round(minPlayDuration / 1000) / 120) * 100}%, #e5e7eb ${(Math.round(minPlayDuration / 1000) / 120) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className={`text-center text-sm mt-1 font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          {Math.round(minPlayDuration / 1000)}s
        </div>
      </div>

      {/* Divider */}
      <div className={`my-3 border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}></div>

      {/* Skip Filter Toggle */}
      <label className="flex items-center justify-between cursor-pointer py-1">
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
      <label className="flex items-center justify-between cursor-pointer py-1 mt-1">
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

export default FontSizeDropdown;