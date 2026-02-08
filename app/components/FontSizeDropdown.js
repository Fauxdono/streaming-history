"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './themeprovider';

const FontSizeDropdown = ({ isOpen, onClose, buttonRef }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [fontSize, setFontSize] = useState('medium');
  const [fontFamily, setFontFamily] = useState('arial');
  const dropdownRef = useRef(null);

  // Load saved font size and family on component mount
  useEffect(() => {
    const savedFontSize = localStorage.getItem('app-font-size') || 'medium';
    const savedFontFamily = localStorage.getItem('app-font-family') || 'arial';
    setFontSize(savedFontSize);
    setFontFamily(savedFontFamily);

    // Apply saved settings on load
    applyFontFamily(savedFontFamily);
  }, []);

  const applyFontSize = (size) => {
    const root = document.documentElement;
    
    // Remove existing font size classes
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-xlarge');
    
    // Add new font size class
    root.classList.add(`font-${size}`);
    
    // Save to localStorage
    localStorage.setItem('app-font-size', size);
  };

  const handleFontSizeChange = (newSize) => {
    setFontSize(newSize);
    applyFontSize(newSize);
  };

  const applyFontFamily = (family) => {
    const root = document.documentElement;

    // Remove existing font family classes
    root.classList.remove('font-system', 'font-arial', 'font-georgia', 'font-monaco',
      'font-verdana', 'font-trebuchet', 'font-palatino', 'font-comic');

    // Add new font family class
    root.classList.add(`font-${family}`);

    // Save to localStorage
    localStorage.setItem('app-font-family', family);
  };

  const handleFontFamilyChange = (newFamily) => {
    setFontFamily(newFamily);
    applyFontFamily(newFamily);
  };

  const fontFamilyOptions = [
    { value: 'system', label: 'System Default', preview: '-apple-system, BlinkMacSystemFont, sans-serif' },
    { value: 'arial', label: 'Arial', preview: 'Arial, Helvetica, sans-serif' },
    { value: 'verdana', label: 'Verdana', preview: 'Verdana, Geneva, sans-serif' },
    { value: 'trebuchet', label: 'Trebuchet', preview: 'Trebuchet MS, Helvetica, sans-serif' },
    { value: 'georgia', label: 'Georgia', preview: 'Georgia, Times New Roman, serif' },
    { value: 'palatino', label: 'Palatino', preview: 'Palatino Linotype, Book Antiqua, serif' },
    { value: 'monaco', label: 'Monaco', preview: 'Monaco, Courier New, monospace' },
    { value: 'comic', label: 'Comic Sans', preview: 'Comic Sans MS, cursive' }
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
      const dropdownWidth = 280;
      
      let left = buttonRect.left + buttonRect.width / 2 - dropdownWidth / 2;
      let top = buttonRect.bottom + 8;
      
      // Adjust if dropdown would go off screen
      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }
      
      // If dropdown would go below viewport, show it above button
      if (top + 320 > window.innerHeight) {
        top = buttonRect.top - 320 - 8;
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
        minWidth: '200px'
      }}
    >
      {/* Slider */}
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
        <div className="max-h-32 overflow-y-auto space-y-1">
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
    </div>
  );
};

export default FontSizeDropdown;