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

  const tabAccentColors = {
    upload:    isDarkMode ? '#4c1d95' : '#ddd6fe',
    stats:     isDarkMode ? '#312e81' : '#c7d2fe',
    artists:   isDarkMode ? '#1e3a8a' : '#bfdbfe',
    albums:    isDarkMode ? '#164e63' : '#a5f3fc',
    custom:    isDarkMode ? '#064e3b' : '#a7f3d0',
    tracks:    isDarkMode ? '#7f1d1d' : '#fecaca',
    calendar:  isDarkMode ? '#14532d' : '#bbf7d0',
    patterns:  isDarkMode ? '#713f12' : '#fef08a',
    behavior:  isDarkMode ? '#78350f' : '#fde68a',
    discovery: isDarkMode ? '#7c2d12' : '#fed7aa',
    podcasts:  isDarkMode ? '#7f1d1d' : '#fecaca',
    playlists: isDarkMode ? '#881337' : '#fecdd3',
    updates:   isDarkMode ? '#701a75' : '#f5d0fe',
  };
  const colorfulBg = colorMode === 'colorful' ? (tabAccentColors[activeTab] || null) : null;
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
          ...(colorfulBg ? { backgroundColor: colorfulBg } : {}),
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
        <div className={`flex ${isMobile ? 'justify-between items-center px-4' : 'justify-center'}`} style={{height: isMobile ? `${mobileBarHeight}px` : 'auto', ...((!isMobile) && { paddingTop: '8px' })}}>
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
            <div className="flex items-center" style={{gap: '4px', padding: '0 8px'}}>
              {/* Dark mode toggle */}
              <button
                onClick={toggleTheme}
                className={`rounded-full transition-colors shadow-lg flex items-center justify-center flex-shrink-0 ${
                  isDarkMode
                    ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                    : 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                }`}
                style={{width: '32px', height: '32px', padding: '6px'}}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
              </button>

              {/* Color mode toggle */}
              <button
                onClick={() => setColorMode(colorMode === 'minimal' ? 'colorful' : 'minimal')}
                className={`rounded-full transition-colors shadow-lg flex items-center justify-center flex-shrink-0 ${
                  colorMode === 'colorful'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600'
                    : isDarkMode
                      ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
                style={{width: '32px', height: '32px', padding: '6px'}}
                title={colorMode === 'minimal' ? 'Switch to colorful mode' : 'Switch to minimal mode'}
              >
                <Palette size={14} />
              </button>

              {/* Settings button */}
              <button
                ref={settingsButtonRef}
                onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                className="rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-lg flex items-center justify-center flex-shrink-0"
                style={{width: '32px', height: '32px', padding: '6px'}}
                title="Font & Display Settings"
              >
                <Type size={14} />
              </button>

              {/* Support button */}
              <button
                ref={supportButtonRef}
                onClick={() => setShowSupportDropdown(!showSupportDropdown)}
                className="rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg flex items-center justify-center flex-shrink-0"
                style={{width: '32px', height: '32px', padding: '6px'}}
                title="Support"
              >
                <Heart size={14} fill="white" />
              </button>

              {/* Analysis Settings button */}
              <button
                ref={analysisButtonRef}
                onClick={() => setShowAnalysisSettings(!showAnalysisSettings)}
                className="rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg flex items-center justify-center flex-shrink-0"
                style={{width: '32px', height: '32px', padding: '6px'}}
                title="Analysis Settings"
              >
                <Settings size={14} />
              </button>

              {/* Position toggle button */}
              <button
                onClick={togglePosition}
                className="rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg flex items-center justify-center flex-shrink-0"
                style={{width: '32px', height: '32px', padding: '6px'}}
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
        colorMode={colorMode}
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