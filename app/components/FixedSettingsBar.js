"use client";

import React, { useState, useRef } from 'react';
import DarkModeToggle from './darkmode.js';
import FontSizeDropdown from './FontSizeDropdown.js';
import { ArrowLeftRight, FileText, Files, Type, LayoutGrid, List } from 'lucide-react';

const FixedSettingsBar = ({
  togglePosition,
  toggleCollapsed,
  isMobile,
  isCollapsed,
  colorMode = 'minimal',
  setColorMode = () => {},
  activeTab = '',
  viewMode = 'grid',
  setViewMode = () => {}
}) => {
  // Tabs that support grid/list view
  const tabsWithViewMode = ['artists', 'albums', 'custom', 'podcasts'];
  const showViewToggle = tabsWithViewMode.includes(activeTab);

  // Artists/albums use 'list', custom/podcasts use 'compact'
  const getAlternateViewMode = () => {
    if (activeTab === 'artists' || activeTab === 'albums') return 'list';
    return 'compact';
  };

  const toggleViewMode = () => {
    const alternateMode = getAlternateViewMode();
    setViewMode(viewMode === 'grid' ? alternateMode : 'grid');
  };
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const settingsButtonRef = useRef(null);

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
            height: 'calc(85px + env(safe-area-inset-bottom, 0px))'
          } : {
            top: '0',
            height: 'auto'
          })
        }}
      >
        <div className={`flex ${isMobile ? 'justify-between items-center px-4' : 'justify-center pt-2'}`} style={{height: isMobile ? '85px' : 'auto'}}>
          {isMobile ? (
            <>
              {/* Left side buttons */}
              <div className="flex items-center gap-4">
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
              </div>

              {/* Right side buttons */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleCollapsed}
                  className="p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center"
                  title={isCollapsed ? "Expand tabs" : "Collapse tabs"}
                >
                  {isCollapsed ? <FileText size={16} /> : <Files size={16} />}
                </button>
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

              {/* View mode toggle - only show for tabs with grid/list */}
              {showViewToggle && (
                <button
                  onClick={toggleViewMode}
                  className="p-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg w-8 h-8 flex items-center justify-center"
                  title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
                >
                  {viewMode === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
                </button>
              )}

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

              {/* Collapse toggle button - only show on mobile */}
              {isMobile && (
                <button 
                  onClick={toggleCollapsed}
                  className="p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg w-8 h-8"
                  title={isCollapsed ? "Expand tabs" : "Collapse tabs"}
                >
                  <span className="text-xs">{isCollapsed ? '📄' : '📋'}</span>
                </button>
              )}
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
    </>
  );
};

export default FixedSettingsBar;