"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from './themeprovider';

const FontSizeDropdown = ({ isOpen, onClose, buttonRef }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [fontSize, setFontSize] = useState('medium');
  const dropdownRef = useRef(null);

  // Load saved font size on component mount
  useEffect(() => {
    const savedFontSize = localStorage.getItem('app-font-size') || 'medium';
    setFontSize(savedFontSize);
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
      if (top + 200 > window.innerHeight) {
        top = buttonRect.top - 200 - 8;
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

  const currentSliderValue = fontSizeOptions.find(opt => opt.value === fontSize)?.sliderValue || 1;

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
      className={`fixed z-[300] w-70 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} 
        border rounded-lg shadow-xl p-4`}
      style={{
        top: position.top,
        left: position.left,
        minWidth: '280px'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔤</span>
          <h3 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Font Size
          </h3>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-full hover:bg-opacity-20 transition-colors ${
            isDarkMode ? 'hover:bg-white text-gray-400' : 'hover:bg-black text-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Current size display */}
      <div className={`text-center mb-4 p-3 rounded-lg ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
      }`}>
        <div className={`text-sm mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Current Size
        </div>
        <div className={`font-semibold ${
          fontSize === 'small' ? 'text-sm' :
          fontSize === 'medium' ? 'text-base' :
          fontSize === 'large' ? 'text-lg' :
          'text-xl'
        } ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          {fontSizeOptions.find(opt => opt.value === fontSize)?.label}
        </div>
      </div>

      {/* Slider */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max="3"
          value={currentSliderValue}
          onChange={handleSliderChange}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider
            ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
          style={{
            background: isDarkMode 
              ? `linear-gradient(to right, #374151 0%, #374151 ${(currentSliderValue / 3) * 100}%, #6366f1 ${(currentSliderValue / 3) * 100}%, #6366f1 100%)`
              : `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${(currentSliderValue / 3) * 100}%, #4f46e5 ${(currentSliderValue / 3) * 100}%, #4f46e5 100%)`
          }}
        />
        
        {/* Slider labels */}
        <div className="flex justify-between mt-2 px-1">
          {fontSizeOptions.map((option, index) => (
            <button
              key={option.value}
              onClick={() => handleFontSizeChange(option.value)}
              className={`text-xs transition-colors px-1 py-0.5 rounded ${
                fontSize === option.value
                  ? isDarkMode 
                    ? 'text-indigo-400 font-medium' 
                    : 'text-indigo-600 font-medium'
                  : isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview text */}
      <div className={`p-3 rounded-lg border ${
        isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
      }`}>
        <div className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Preview:
        </div>
        <div className={`${
          fontSize === 'small' ? 'text-sm' :
          fontSize === 'medium' ? 'text-base' :
          fontSize === 'large' ? 'text-lg' :
          'text-xl'
        } ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          Sample streaming text
        </div>
      </div>
    </div>
  );
};

export default FontSizeDropdown;