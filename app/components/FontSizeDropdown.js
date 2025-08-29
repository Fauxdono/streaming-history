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
      className={`fixed z-[300] ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} 
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
            ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
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
            className={`transition-colors ${
              fontSize === 'small'
                ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              fontSize: '12px',
              fontWeight: fontSize === 'small' ? 'bold' : 'normal'
            }}
          >
            A
          </button>
          <button
            onClick={() => handleFontSizeChange('medium')}
            className={`transition-colors ${
              fontSize === 'medium'
                ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              fontSize: '16px',
              fontWeight: fontSize === 'medium' ? 'bold' : 'normal'
            }}
          >
            A
          </button>
          <button
            onClick={() => handleFontSizeChange('large')}
            className={`transition-colors ${
              fontSize === 'large'
                ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              fontSize: '20px',
              fontWeight: fontSize === 'large' ? 'bold' : 'normal'
            }}
          >
            A
          </button>
          <button
            onClick={() => handleFontSizeChange('xlarge')}
            className={`transition-colors ${
              fontSize === 'xlarge'
                ? isDarkMode ? 'text-indigo-400' : 'text-indigo-600'
                : isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{
              fontSize: '24px',
              fontWeight: fontSize === 'xlarge' ? 'bold' : 'normal'
            }}
          >
            A
          </button>
        </div>
      </div>
    </div>
  );
};

export default FontSizeDropdown;