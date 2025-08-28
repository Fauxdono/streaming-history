"use client";

import React, { useState, useEffect, useContext } from 'react';
import { ThemeContext } from './themeprovider';

const Settings = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const { isDarkMode } = useContext(ThemeContext);
  const [fontSize, setFontSize] = useState('medium');

  // Load saved font size on component mount
  useEffect(() => {
    const savedFontSize = localStorage.getItem('app-font-size') || 'medium';
    setFontSize(savedFontSize);
    applyFontSize(savedFontSize);
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

  const fontSizeOptions = [
    { value: 'small', label: 'Small', description: 'Like the upload page' },
    { value: 'medium', label: 'Medium', description: 'Standard size' },
    { value: 'large', label: 'Large', description: 'Bigger and easier to read' },
    { value: 'xlarge', label: 'Extra Large', description: 'Maximum readability' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]" onClick={onClose}>
      <div 
        className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              ⚙️ Settings
            </h1>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Customize your app experience
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-opacity-20 transition-colors ${
              isDarkMode ? 'hover:bg-white text-gray-400' : 'hover:bg-black text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-8">
          {/* Font Size Section */}
          <div>
            <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              📝 Font Size
            </h2>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Choose your preferred text size for better readability.
            </p>
            
            <div className="grid gap-3">
              {fontSizeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleFontSizeChange(option.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                    fontSize === option.value
                      ? isDarkMode 
                        ? 'border-blue-400 bg-blue-900/20 text-blue-300' 
                        : 'border-blue-500 bg-blue-50 text-blue-700'
                      : isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium mb-1 ${
                        option.value === 'small' ? 'text-sm' :
                        option.value === 'medium' ? 'text-base' :
                        option.value === 'large' ? 'text-lg' :
                        'text-xl'
                      }`}>
                        {option.label}
                      </div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {option.description}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      fontSize === option.value
                        ? isDarkMode
                          ? 'border-blue-400 bg-blue-400'
                          : 'border-blue-500 bg-blue-500'
                        : isDarkMode
                          ? 'border-gray-500'
                          : 'border-gray-300'
                    }`}>
                      {fontSize === option.value && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <div>
            <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
              👁️ Preview
            </h2>
            <div className={`p-6 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}>
              <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                Sample Text
              </h3>
              <p className={`mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                This is how your text will look with the selected font size. You can see statistics, artist names, song titles, and other content in this size.
              </p>
              <div className={`flex gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">
                  Statistics
                </span>
                <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                  Artists
                </span>
                <span className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs">
                  Albums
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;