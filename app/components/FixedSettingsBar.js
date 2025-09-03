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
        <div className={`flex ${isMobile ? 'justify-center items-end px-4' : 'justify-center py-2'}`} style={{height: isMobile ? '85px' : 'auto', paddingBottom: isMobile ? '9px' : undefined}}>
          {isMobile ? (
            <>
                <DarkModeToggle className="!p-1.5 !rounded-full !w-[33px] !h-[33px]" />
                <button 
                  ref={settingsButtonRef}
                  onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                  className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-lg w-[33px] h-[33px]"
                  title="Font Size Settings"
                >
                  <span className="text-xs">aA</span>
                </button>

              {/* Centered buttons */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={toggleCollapsed}
                  className="p-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg w-[33px] h-[33px]"
                  title={isCollapsed ? "Expand tabs" : "Collapse tabs"}
                >
                  <span className="text-xs">{isCollapsed ? '📄' : '📋'}</span>
                </button>
                <button 
                  onClick={togglePosition}
                  className="p-1.5 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg w-[33px] h-[33px]"
                  title="Change tab position"
                >
                  <span className="text-xs">⇄</span>
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