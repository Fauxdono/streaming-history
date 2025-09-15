"use client";

import React, { useState, useRef } from 'react';
import DarkModeToggle from './darkmode.js';
import FontSizeDropdown from './FontSizeDropdown.js';
import { ArrowLeftRight, FileText, Files, Type } from 'lucide-react';
import { useTheme } from './themeprovider.js';

const FixedSettingsBar = ({ 
  togglePosition, 
  toggleCollapsed, 
  isMobile, 
  isCollapsed 
}) => {
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const settingsButtonRef = useRef(null);
  const { colorblindMode, cycleColorblindMode } = useTheme();

  // Get colorblind mode display info
  const getColorblindModeInfo = () => {
    switch (colorblindMode) {
      case 'none':
        return { icon: '○', title: 'Normal colors (click to cycle colorblind modes)', active: false };
      case 'protanopia':
        return { icon: 'P', title: 'Protanopia mode (red-blind)', active: true };
      case 'deuteranopia':
        return { icon: 'D', title: 'Deuteranopia mode (green-blind)', active: true };
      case 'tritanopia':
        return { icon: 'T', title: 'Tritanopia mode (blue-blind)', active: true };
      case 'monochrome':
        return { icon: '◐', title: 'Monochrome mode (black & white)', active: true };
      default:
        return { icon: '○', title: 'Normal colors', active: false };
    }
  };

  // Colorblind accessibility button component
  const ColorblindButton = () => {
    const modeInfo = getColorblindModeInfo();
    return (
      <button
        onClick={cycleColorblindMode}
        className={`
          ${isMobile ? 'p-1.5 rounded-full w-[33px] h-[33px]' : 'p-1.5 rounded-full w-8 h-8'} 
          flex items-center justify-center transition-colors shadow-lg
          ${modeInfo.active 
            ? 'bg-orange-600 text-white hover:bg-orange-700' 
            : 'bg-gray-600 text-white hover:bg-gray-700'
          }
        `}
        title={modeInfo.title}
        aria-label={modeInfo.title}
      >
        <span className={isMobile ? 'text-sm font-bold' : 'text-xs font-bold'}>
          {modeInfo.icon}
        </span>
      </button>
    );
  };

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
                  ref={settingsButtonRef}
                  onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                  className="p-1.5 rounded-full bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-lg w-[33px] h-[33px] flex items-center justify-center"
                  title="Font Size Settings"
                >
                  <Type size={16} />
                </button>
                <ColorblindButton />
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

              {/* Colorblind accessibility button */}
              <ColorblindButton />

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