"use client";

import React, { useState, useRef } from 'react';
import FontSizeDropdown from './FontSizeDropdown.js';
import SupportDropdown from './SupportDropdown.js';
import AnalysisSettingsDropdown from './AnalysisSettingsDropdown.js';
import { ArrowLeftRight, Type, LayoutGrid, List, Heart, Settings, Sun, Moon, Palette } from 'lucide-react';
import { useTheme } from './themeprovider.js';

const FixedSettingsBar = ({
  togglePosition,
  toggleCollapsed,
  isMobile,
  isLandscapeMobile = false,
  isCollapsed,
  colorMode = 'minimal',
  setColorMode = () => {},
  activeTab = '',
  viewMode = 'grid',
  setViewMode = () => {}
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const mobileBarHeight = isLandscapeMobile ? 64 : 85;
  // Tabs that support grid/list view (mobile only)
  const tabsWithViewMode = ['artists', 'albums', 'custom', 'podcasts', 'patterns', 'calendar'];
  const showViewToggle = isMobile && tabsWithViewMode.includes(activeTab);

  const getAlternateViewMode = () => {
    if (activeTab === 'artists' || activeTab === 'albums' || activeTab === 'calendar') return 'list';
    return 'compact';
  };

  const toggleViewMode = () => {
    const alternateMode = getAlternateViewMode();
    setViewMode(viewMode === 'grid' ? alternateMode : 'grid');
  };

  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showSupportDropdown, setShowSupportDropdown] = useState(false);
  const [showAnalysisSettings, setShowAnalysisSettings] = useState(false);
  const settingsButtonRef = useRef(null);
  const supportButtonRef = useRef(null);
  const analysisButtonRef = useRef(null);

  return (
    <>
      <div 
        className={`fixed left-0 right-0 w-full z-[100] ${isMobile ? 'border-t' : 'border-b'} border-violet-200 dark:border-gray-600`}
        style={{
          backgroundImage: 'url(/apple-touch-icon.png)',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          backgroundPosition: 'left center',
          transform: 'translateZ(0)',
          willChange: 'auto',
          ...(isMobile ? {
            bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
            height: `calc(${mobileBarHeight}px + env(safe-area-inset-bottom, 0px))`
          } : {
            top: '0',
            minHeight: '40px'
          })
        }}
      >
        <div className={`flex ${isMobile ? 'justify-between items-center px-4' : 'justify-center pt-2'}`} style={{height: isMobile ? `${mobileBarHeight}px` : 'auto'}}>
          {isMobile ? (
            <>
              {/* Left side buttons */}
              <div className={`flex items-center ${isLandscapeMobile ? 'gap-3' : 'gap-4'}`}>
                {/* Dark mode toggle */}
                <button
                  onClick={toggleTheme}
                  className={`p-1.5 rounded-full transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center ${
                    isDarkMode
                      ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                      : 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                  }`}
                  title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>

                {/* Color mode toggle */}
                <button
                  onClick={() => setColorMode(colorMode === 'minimal' ? 'colorful' : 'minimal')}
                  className={`p-1.5 rounded-full transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center ${
                    colorMode === 'colorful'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600'
                      : isDarkMode
                        ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={colorMode === 'minimal' ? 'Switch to colorful mode' : 'Switch to minimal mode'}
                >
                  <Palette size={16} />
                </button>

                {/* Settings (font size/family) */}
                <button
                  ref={settingsButtonRef}
                  onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                  className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center"
                  title="Font & Display Settings"
                >
                  <Type size={16} />
                </button>

                {/* Support/donate */}
                <button
                  ref={supportButtonRef}
                  onClick={() => setShowSupportDropdown(!showSupportDropdown)}
                  className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center"
                  title="Support"
                >
                  <Heart size={16} fill="white" />
                </button>
              </div>

              {/* Right side buttons */}
              <div className={`flex items-center ${isLandscapeMobile ? 'gap-3' : 'gap-4'}`}>
                {showViewToggle && (
                  <button
                    onClick={toggleViewMode}
                    className="p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center"
                    title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
                  >
                    {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
                  </button>
                )}
                <button
                  onClick={togglePosition}
                  className="p-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center"
                  title="Change tab position"
                >
                  <ArrowLeftRight size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 px-2">
              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className={`p-1.5 rounded-full transition-colors shadow-lg w-8 h-8 flex items-center justify-center ${
                  isDarkMode
                    ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                    : 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                }`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
              </button>

              {/* Color mode toggle */}
              <button
                onClick={() => setColorMode(colorMode === 'minimal' ? 'colorful' : 'minimal')}
                className={`p-1.5 rounded-full transition-colors shadow-lg w-8 h-8 flex items-center justify-center ${
                  colorMode === 'colorful'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600'
                    : isDarkMode
                      ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                title={colorMode === 'minimal' ? 'Switch to colorful mode' : 'Switch to minimal mode'}
              >
                <Palette size={14} />
              </button>

              {/* Settings button */}
              <button
                ref={settingsButtonRef}
                onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-lg w-8 h-8 flex items-center justify-center"
                title="Font & Display Settings"
              >
                <Type size={14} />
              </button>

              {/* Support button */}
              <button
                ref={supportButtonRef}
                onClick={() => setShowSupportDropdown(!showSupportDropdown)}
                className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg w-8 h-8 flex items-center justify-center"
                title="Support"
              >
                <Heart size={14} fill="white" />
              </button>

              {/* Analysis Settings button */}
              <button
                ref={analysisButtonRef}
                onClick={() => setShowAnalysisSettings(!showAnalysisSettings)}
                className="p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg w-8 h-8 flex items-center justify-center"
                title="Analysis Settings"
              >
                <Settings size={14} />
              </button>

              {/* Position toggle button */}
              <button
                onClick={togglePosition}
                className="p-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg w-8 h-8 flex items-center justify-center"
                title="Change tab position"
              >
                <ArrowLeftRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Font Size Dropdown */}
      <FontSizeDropdown
        isOpen={showFontSizeDropdown}
        onClose={() => setShowFontSizeDropdown(false)}
        buttonRef={settingsButtonRef}
      />

      {/* Analysis Settings Dropdown */}
      <AnalysisSettingsDropdown
        isOpen={showAnalysisSettings}
        onClose={() => setShowAnalysisSettings(false)}
        buttonRef={analysisButtonRef}
      />

      {/* Support Dropdown */}
      <SupportDropdown
        isOpen={showSupportDropdown}
        onClose={() => setShowSupportDropdown(false)}
        buttonRef={supportButtonRef}
        colorMode={colorMode}
      />
    </>
  );
};

export default FixedSettingsBar;