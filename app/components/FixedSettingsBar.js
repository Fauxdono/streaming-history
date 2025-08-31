"use client";

import React, { useState, useRef } from 'react';
import DarkModeToggle from './darkmode.js';
import FontSizeDropdown from './FontSizeDropdown.js';

const FixedSettingsBar = ({ 
  togglePosition, 
  toggleCollapsed, 
  isMobile, 
  isCollapsed 
}) => {
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const settingsButtonRef = useRef(null);

  return (
    <>
      <div 
        className="fixed top-0 left-0 right-0 w-full z-[100] border-b border-violet-200 dark:border-gray-600"
        style={{
          backgroundImage: 'url(/apple-touch-icon.png)',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 100%',
          backgroundPosition: 'left center',
          transform: 'translateZ(0)',
          willChange: 'auto',
          paddingTop: isMobile ? 'env(safe-area-inset-top)' : undefined
        }}
      >
        <div className={`flex ${isMobile ? 'justify-between items-end px-4' : 'justify-center py-2'}`} style={{height: isMobile ? '85px' : 'auto', paddingBottom: isMobile ? '9px' : undefined}}>
          {isMobile ? (
            <>
              {/* Left side buttons - brightness and text size */}
              <div className="flex items-center gap-4">
                <DarkModeToggle className="!p-1.5 !rounded-full !w-8 !h-8" />
                <button 
                  ref={settingsButtonRef}
                  onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                  className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-lg w-8 h-8"
                  title="Font Size Settings"
                >
                  <span className="text-xs">aA</span>
                </button>
              </div>

              {/* Right side buttons */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={togglePosition}
                  className="p-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg w-8 h-8"
                  title="Change tab position"
                >
                  <span className="text-xs">⇄</span>
                </button>
                <button 
                  onClick={toggleCollapsed}
                  className="p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg w-8 h-8"
                  title={isCollapsed ? "Expand tabs" : "Collapse tabs"}
                >
                  <span className="text-xs">{isCollapsed ? '📄' : '📋'}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 px-2">
              {/* Dark mode toggle */}
              <DarkModeToggle className="!p-1.5 !rounded-full !w-8 !h-8" />

              {/* Position toggle button */}
              <button 
                onClick={togglePosition}
                className="p-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg w-8 h-8"
                title="Change tab position"
              >
                <span className="text-xs">⇄</span>
              </button>

              {/* Settings button */}
              <button 
                ref={settingsButtonRef}
                onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-lg w-8 h-8"
                title="Font Size Settings"
              >
                <span className="text-xs">aA</span>
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