"use client";

import React, { useState, useRef } from 'react';
import DarkModeToggle from './darkmode.js';
import FontSizeDropdown from './FontSizeDropdown.js';
import SupportOptions from './support-options.js';
import { ArrowLeftRight, Type, LayoutGrid, List, Heart, X } from 'lucide-react';

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
  const tabsWithViewMode = ['artists', 'albums', 'custom', 'podcasts', 'patterns'];
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
  const [showSupportModal, setShowSupportModal] = useState(false);
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
                <button
                  onClick={() => setShowSupportModal(true)}
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

              {/* Support button */}
              <button
                onClick={() => setShowSupportModal(true)}
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

      {/* Support Modal */}
      {showSupportModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50"
          onClick={() => setShowSupportModal(false)}
        >
          <div
            className="relative max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowSupportModal(false)}
              className="absolute -top-2 -right-2 p-1.5 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors shadow-lg z-10"
            >
              <X size={16} />
            </button>
            <SupportOptions colorMode={colorMode} />
          </div>
        </div>
      )}
    </>
  );
};

export default FixedSettingsBar;