"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from './themeprovider.js';

const TopTabs = ({ 
  activeTab, 
  setActiveTab, 
  stats, 
  topArtists, 
  topAlbums, 
  processedData, 
  rawPlayData,
  getArtistsTabLabel,
  getAlbumsTabLabel,
  getCustomTabLabel,
  getTracksTabLabel,
  getPatternsTabLabel,
  getBehaviorTabLabel,
  getCalendarTabLabel,
  onPositionChange, // New callback to communicate position changes to parent
  onHeightChange,   // New callback to communicate height changes to parent
  onWidthChange,    // New callback to communicate width changes to parent
  onCollapseChange, // New callback to communicate collapse state changes to parent
  isCollapsed: externalIsCollapsed, // External collapsed state from parent
  position = 'top',  // New prop for initial position
  yearSelectorPosition = null // YearSelector position to adjust borders when stacked
}) => {
  // Get colorblind adjustment function from theme provider with fallback
  const { getColorblindAdjustedTheme } = useTheme() || {};
  
  // Position state - cycles through top, right, bottom, left
  const [currentPosition, setCurrentPosition] = useState(position);

  // Sync internal position state with prop changes
  useEffect(() => {
    if (position !== currentPosition) {
      setCurrentPosition(position);
    }
  }, [position, currentPosition]);
  
  // Collapsed state for mobile - shows icons instead of full text
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync internal collapsed state with external prop
  useEffect(() => {
    if (externalIsCollapsed !== undefined && externalIsCollapsed !== isCollapsed) {
      setIsCollapsed(externalIsCollapsed);
    }
  }, [externalIsCollapsed, isCollapsed]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  
  // Check for mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Re-measure dimensions on window resize, but block during transitions
  useEffect(() => {
    const handleResize = () => {
      if (isTransitioning) return; // Block updates during transitions
      
      const topTabsElement = document.querySelector('.toptabs-container');
      if (topTabsElement) {
        // Re-measure width for left/right positions
        if (onWidthChange && (currentPosition === 'left' || currentPosition === 'right')) {
          const actualWidth = topTabsElement.offsetWidth;
          onWidthChange(actualWidth);
        }
        // Re-measure height for top/bottom positions
        if (onHeightChange && (currentPosition === 'top' || currentPosition === 'bottom')) {
          const actualHeight = topTabsElement.offsetHeight;
          onHeightChange(actualHeight);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentPosition, onWidthChange, onHeightChange, isTransitioning]);

  // Communicate position changes to parent
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange(currentPosition);
    }
  }, [currentPosition, onPositionChange]);

  // Communicate collapse state changes to parent
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed);
    }
  }, [isCollapsed, onCollapseChange]);

  // Communicate height changes to parent (for top/bottom positions), but block during transitions
  useEffect(() => {
    if (onHeightChange && !isTransitioning) {
      if (currentPosition === 'top' || currentPosition === 'bottom') {
        // Measure actual height dynamically - only for the tabs container, not settings bar
        const measureHeight = () => {
          const topTabsElement = document.querySelector('.toptabs-container');
          if (topTabsElement) {
            const actualHeight = topTabsElement.offsetHeight;
            onHeightChange(actualHeight);
          } else {
            // Fallback to responsive approximation - just for tabs
            const tabHeight = isMobile ? 44 : 56; // Reduced since settings are separate
            onHeightChange(tabHeight);
          }
        };
        
        // Measure immediately and after a brief delay to ensure rendering is complete
        measureHeight();
        const timer = setTimeout(measureHeight, 100);
        
        return () => clearTimeout(timer);
      } else {
        // Reset height to 0 when not on top/bottom sides
        onHeightChange(0);
      }
    }
  }, [currentPosition, onHeightChange, isMobile, isCollapsed, isTransitioning]);

  // Communicate width changes to parent (for left/right positions), but block during transitions
  useEffect(() => {
    if (onWidthChange && !isTransitioning) {
      if (currentPosition === 'left' || currentPosition === 'right') {
        // Measure actual width dynamically
        const measureWidth = () => {
          const topTabsElement = document.querySelector('.toptabs-container');
          if (topTabsElement) {
            const actualWidth = topTabsElement.offsetWidth;
            onWidthChange(actualWidth);
          } else {
            // Fallback to responsive approximation
            const tabWidth = isMobile ? 160 : 192;
            onWidthChange(tabWidth);
          }
        };
        
        // Measure immediately and after a brief delay to ensure rendering is complete
        measureWidth();
        const timer = setTimeout(measureWidth, 100);
        
        return () => clearTimeout(timer);
      } else {
        // Reset width to 0 when not on left/right sides
        onWidthChange(0);
      }
    }
  }, [currentPosition, onWidthChange, isMobile, isCollapsed, isTransitioning]);

  // Toggle position is now handled by parent - this component is controlled
  // Set transitioning state when position changes externally
  useEffect(() => {
    setIsTransitioning(true);
    
    // Clear transitioning state after animations settle
    const delay = isMobile ? 150 : 500;
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [currentPosition, isMobile]);

  // Toggle collapsed state - only available on mobile
  const toggleCollapsed = useCallback(() => {
    if (isMobile) {
      setIsCollapsed(prev => !prev);
    }
  }, [isMobile]);

  // Get icon for tab
  const getTabIcon = useCallback((tabId) => {
    switch (tabId) {
      case 'updates':
        return '🔔';
      case 'upload':
        return '📁';
      case 'stats':
        return '📊';
      case 'artists':
        return '🎤';
      case 'albums':
        return '💿';
      case 'custom':
        return '⚙️';
      case 'tracks':
        return '🎵';
      case 'patterns':
        return '📈';
      case 'behavior':
        return '🧠';
      case 'calendar':
        return '📅';
      case 'discovery':
        return '🔍';
      case 'podcasts':
        return '🎧';
      case 'playlists':
        return '📋';
      default:
        return '📄';
    }
  }, []);
  
  // Map tab IDs to their base color themes - move outside component to avoid recreating
  const getTabBaseColor = useCallback((tabId) => {
    const colorMap = {
      'updates': 'fuchsia',
      'upload': 'violet', 
      'stats': 'indigo',
      'artists': 'blue',
      'albums': 'cyan',
      'custom': 'emerald',
      'tracks': 'red',
      'calendar': 'green', 
      'patterns': 'yellow',
      'behavior': 'amber',
      'discovery': 'orange',
      'podcasts': 'red',
      'playlists': 'rose'
    };
    return colorMap[tabId] || 'gray';
  }, []);

  // Generate Tailwind classes for a given color theme
  const getColorClasses = useCallback((colorName, isActive) => {
    if (isActive) {
      return `bg-${colorName}-50 text-${colorName}-600 border-b-2 border-${colorName}-600 dark:bg-${colorName}-900 dark:text-${colorName}-300 dark:border-${colorName}-400`;
    } else {
      return `bg-${colorName}-200 text-${colorName}-600 hover:bg-${colorName}-300 dark:bg-${colorName}-800 dark:text-${colorName}-300 dark:hover:bg-${colorName}-700`;
    }
  }, []);

  // Memoized TabButton component to prevent recreation
  const TabButton = useCallback(({ id, label }) => {
    // Get base color and apply colorblind adjustment with fallback
    const baseColor = getTabBaseColor(id);
    const adjustedColor = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(baseColor) : baseColor;
    const isActive = activeTab === id;
    
    // Use the colorblind-adjusted color classes
    const colorClasses = getColorClasses(adjustedColor, isActive);

    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`${
          isCollapsed && isMobile 
            ? 'p-2 text-base' 
            : 'px-2 sm:px-4 py-2 text-sm sm:text-base'
        } font-medium ${colorClasses}`}
        title={isCollapsed && isMobile ? label : undefined}
      >
        {isCollapsed && isMobile ? getTabIcon(id) : label}
      </button>
    );
  }, [activeTab, setActiveTab, isCollapsed, isMobile, getTabIcon, getColorblindAdjustedTheme, getTabBaseColor, getColorClasses]);

  // Settings bar height calculation - measure actual height on desktop
  const [settingsBarHeight, setSettingsBarHeight] = useState(isMobile ? '85px' : '40px');
  
  // Measure actual SettingsBar height on desktop
  useEffect(() => {
    if (!isMobile) {
      const measureSettingsBarHeight = () => {
        const settingsBarElement = document.querySelector('.fixed.left-0.right-0.w-full.z-\\[100\\]');
        if (settingsBarElement) {
          const actualHeight = settingsBarElement.offsetHeight;
          setSettingsBarHeight(`${actualHeight}px`);
        }
      };
      
      // Measure after component mounts and after a brief delay
      measureSettingsBarHeight();
      const timer = setTimeout(measureSettingsBarHeight, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  // Position styles for different placements - now accounts for fixed settings bar
  const getPositionStyles = () => {
    
    switch (currentPosition) {
      case 'top':
        return `fixed left-0 right-0 w-full z-[99]`;
      case 'bottom':
        return 'fixed left-0 right-0 w-full bottom-0 z-[99]';
      case 'left':
        return `fixed left-0 w-auto z-[99] h-full`;
      case 'right':
        return `fixed right-0 w-auto z-[99] h-full`;
      default:
        return `fixed left-0 right-0 w-full z-[99]`;
    }
  };

  // Container styles for different orientations
  const getContainerStyles = () => {
    // Faster transitions on mobile to reduce lag
    const transitionClass = isMobile ? 'transition-all duration-150' : 'transition-all duration-300';
    const baseStyles = `bg-white dark:bg-black border-violet-200 dark:border-gray-600 ${transitionClass}`;
    
    switch (currentPosition) {
      case 'top':
        // Keep bottom border to separate from content, remove only when YearSelector stacked below
        return `${baseStyles} border-b ${yearSelectorPosition === 'top' ? 'border-b-0' : ''}`;
      case 'bottom':
        return `${baseStyles} border-t`;
      case 'left':
        return `${baseStyles} border-r`;
      case 'right':
        return `${baseStyles} border-l`;
      default:
        return `${baseStyles} border-b`;
    }
  };

  // Scrollbar and flex styles for different orientations
  const getScrollContainerStyles = () => {
    switch (currentPosition) {
      case 'top':
      case 'bottom':
        return 'overflow-x-auto px-4 main-tabs-scrollbar';
      case 'left':
      case 'right':
        return 'overflow-y-auto py-4 main-tabs-scrollbar max-h-full';
      default:
        return 'overflow-x-auto px-4 main-tabs-scrollbar';
    }
  };

  // Flex direction and styles for tab container
  const getTabsContainerStyles = () => {
    switch (currentPosition) {
      case 'top':
      case 'bottom':
        return 'flex gap-1 sm:gap-2 min-w-max text-sm sm:text-base';
      case 'left':
      case 'right':
        return 'flex flex-col gap-1 sm:gap-2 min-h-max text-sm sm:text-base';
      default:
        return 'flex gap-1 sm:gap-2 min-w-max text-sm sm:text-base';
    }
  };



  // Tabs component for reuse
  const TabsContainer = () => (
    <div className="flex gap-1 sm:gap-2 min-w-max text-sm sm:text-base px-2">
      {stats && <TabButton id="updates" label="Updates" />} 
      <TabButton id="upload" label="Upload" />
      {stats && <TabButton id="stats" label="Statistics" />}
      {topArtists.length > 0 && <TabButton id="artists" label={getArtistsTabLabel()} />}
      {topAlbums.length > 0 && <TabButton id="albums" label={getAlbumsTabLabel()} />}
      {processedData.length > 0 && <TabButton id="custom" label={getCustomTabLabel()}  />}
      {rawPlayData.length > 0 && <TabButton id="calendar" label={getCalendarTabLabel()} />}
      {processedData.length > 0 && <TabButton id="patterns" label={getPatternsTabLabel()} />}
      {processedData.length > 0 && <TabButton id="behavior" label={getBehaviorTabLabel()} />}
      {processedData.length > 0 && <TabButton id="discovery" label="Music Discovery" />}
      {rawPlayData.length > 0 && <TabButton id="podcasts" label="Podcasts" />}
      {processedData.length > 0 && <TabButton id="playlists" label="Custom Playlists" />}
    </div>
  );

  return (
    <>
      
      {/* Positioned tabs container */}
      <div 
        className={`toptabs-container ${getPositionStyles()} ${getContainerStyles()}`}
        style={{
          // Pre-calculate positions to avoid layout shifts
          ...(currentPosition === 'top' && { 
            top: isMobile ? '0px' : settingsBarHeight, 
            transform: isMobile ? 'translateZ(0)' : undefined // Hardware acceleration on mobile
          }),
          ...(currentPosition === 'bottom' && isMobile && {
            bottom: '85px',
            transform: 'translateZ(0)' // Hardware acceleration
          }),
          ...(currentPosition === 'bottom' && !isMobile && {
            bottom: '0'
          }),
          ...(currentPosition === 'left' && { 
            top: isMobile ? '0px' : settingsBarHeight,
            transform: isMobile ? 'translateZ(0)' : undefined
          }),
          ...(currentPosition === 'right' && { 
            top: isMobile ? '0px' : settingsBarHeight,
            transform: isMobile ? 'translateZ(0)' : undefined
          })
        }}
      >
        {currentPosition === 'top' || currentPosition === 'bottom' ? (
          // Horizontal layout for top and bottom positions
          <div className={`overflow-x-auto main-tabs-scrollbar ${currentPosition === 'top' ? '' : 'py-2'}`}>
            <TabsContainer />
          </div>
        ) : (
          // Vertical layout for left and right positions
          <div className="overflow-y-auto main-tabs-scrollbar max-h-full py-4">
            <div className="flex flex-col gap-1 sm:gap-2 min-h-max text-sm sm:text-base">
              {stats && <TabButton id="updates" label="Updates" />} 
              <TabButton id="upload" label="Upload" />
              {stats && <TabButton id="stats" label="Statistics" />}
              {topArtists.length > 0 && <TabButton id="artists" label={getArtistsTabLabel()} />}
              {topAlbums.length > 0 && <TabButton id="albums" label={getAlbumsTabLabel()} />}
              {processedData.length > 0 && <TabButton id="custom" label={getCustomTabLabel()}  />}
              {rawPlayData.length > 0 && <TabButton id="calendar" label={getCalendarTabLabel()} />}
              {processedData.length > 0 && <TabButton id="patterns" label={getPatternsTabLabel()} />}
              {processedData.length > 0 && <TabButton id="behavior" label={getBehaviorTabLabel()} />}
              {processedData.length > 0 && <TabButton id="discovery" label="Music Discovery" />}
              {rawPlayData.length > 0 && <TabButton id="podcasts" label="Podcasts" />}
              {processedData.length > 0 && <TabButton id="playlists" label="Custom Playlists" />}
            </div>
          </div>
        )}
      </div>
      
    </>
  );
};

export default TopTabs;