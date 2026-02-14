"use client";

import React, { useState, useRef } from 'react';
import DarkModeToggle from './darkmode.js';
import FontSizeDropdown from './FontSizeDropdown.js';
import SupportDropdown from './SupportDropdown.js';
import AnalysisSettingsDropdown from './AnalysisSettingsDropdown.js';
import { ArrowLeftRight, Type, LayoutGrid, List, Heart, Settings } from 'lucide-react';

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
                <DarkModeToggle className="!p-1.5 !rounded-full !w-[33px] !h-[33px]" />
                <button
                  onClick={() => setColorMode(colorMode === 'minimal' ? 'colorful' : 'minimal')}
                  className="p-1.5 rounded-full bg-pink-600 text-white hover:bg-pink-700 transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center"
                  title={colorMode === 'minimal' ? 'Switch to Colorful Mode' : 'Switch to Minimal Mode'}
                >
                  {colorMode === 'minimal' ? '🎨' : '⬛'}
                </button>
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
                  ref={settingsButtonRef}
                  onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                  className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center"
                  title="Font Size Settings"
                >
                  <Type size={16} />
                </button>
                <button
                  ref={analysisButtonRef}
                  onClick={() => setShowAnalysisSettings(!showAnalysisSettings)}
                  className="p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center"
                  title="Analysis Settings"
                >
                  <Settings size={16} />
                </button>
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
              <div className="flex items-center gap-4">
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
              <DarkModeToggle className="!p-1.5 !rounded-full !w-8 !h-8" />

              {/* Color mode toggle */}
              <button
                onClick={() => setColorMode(colorMode === 'minimal' ? 'colorful' : 'minimal')}
                className="p-1.5 rounded-full bg-pink-600 text-white hover:bg-pink-700 transition-colors shadow-lg w-8 h-8 flex items-center justify-center"
                title={colorMode === 'minimal' ? 'Switch to Colorful Mode' : 'Switch to Minimal Mode'}
              >
                <span className="text-xs">{colorMode === 'minimal' ? '🎨' : '⬛'}</span>
              </button>

              {/* Position toggle button */}
              <button
                onClick={togglePosition}
                className="p-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg w-8 h-8 flex items-center justify-center"
                title="Change tab position"
              >
                <ArrowLeftRight size={14} />
              </button>

              {/* Settings button */}
              <button
                ref={settingsButtonRef}
                onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-lg w-8 h-8 flex items-center justify-center"
                title="Font Size Settings"
              >
                <Type size={14} />
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

              {/* Support button */}
              <button
                ref={supportButtonRef}
                onClick={() => setShowSupportDropdown(!showSupportDropdown)}
                className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg w-8 h-8 flex items-center justify-center"
                title="Support"
              >
                <Heart size={14} fill="white" />
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