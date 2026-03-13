"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from './themeprovider';

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
  yearSelectorPosition = null, // YearSelector position to adjust borders when stacked
  colorMode = 'minimal', // Color mode: 'minimal' or 'colorful'
  setColorMode = () => {} // Function to toggle color mode
}) => {
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

  // Get font size for re-measuring when it changes
  const { fontSize } = useTheme();

  // Check for mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isNarrow = window.innerWidth < 640;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const landscapeMobile = isTouch && window.innerHeight < 500;
      setIsMobile(isNarrow || landscapeMobile);
      setIsLandscapeMobile(landscapeMobile && !isNarrow);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Re-measure dimensions on window resize, but block during transitions
  useEffect(() => {
    const measure = () => {
      const topTabsElement = document.querySelector('.toptabs-container');
      if (!topTabsElement) return;
      if (onWidthChange && (currentPosition === 'left' || currentPosition === 'right')) {
        onWidthChange(topTabsElement.offsetWidth);
      }
      if (onHeightChange && (currentPosition === 'top' || currentPosition === 'bottom')) {
        // Measure inner scroll container to exclude safe-area paddingTop on outer element
        const inner = topTabsElement.querySelector(':scope > div');
        const target = inner || topTabsElement;
        onHeightChange(Math.ceil(target.getBoundingClientRect().height));
      }
    };

    const handleResize = () => {
      if (isTransitioning) return;
      measure();
    };

    // On orientation change, env(safe-area-inset-top) updates *after* the resize
    // event fires, so we re-measure after a short delay to get the settled value.
    const handleOrientationChange = () => {
      setTimeout(measure, 250);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
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

  // Communicate height changes to parent using ResizeObserver for accurate, real-time measurement
  useEffect(() => {
    if (!onHeightChange || isTransitioning) return;

    if (currentPosition === 'top' || currentPosition === 'bottom') {
      const topTabsElement = document.querySelector('.toptabs-container');
      if (!topTabsElement) {
        onHeightChange(isMobile ? 44 : 56);
        return;
      }

      // Measure inner scroll container to exclude safe-area paddingTop on outer element
      const innerElement = topTabsElement.querySelector(':scope > div');
      const measureTarget = innerElement || topTabsElement;

      // Measure immediately
      onHeightChange(Math.ceil(measureTarget.getBoundingClientRect().height));

      // Watch for size changes (font load, content change, etc.)
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          onHeightChange(Math.ceil(entry.target.getBoundingClientRect().height));
        }
      });
      observer.observe(measureTarget);

      return () => observer.disconnect();
    } else {
      onHeightChange(0);
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
      case 'settings':
        return '⚙️';
      default:
        return '📄';
    }
  }, []);
  // Memoized TabButton component to prevent recreation
  const TabButton = useCallback(({ id, label }) => {
    // Helper function to get the color based on tab ID
    const getTabColor = (tabId) => {
      // Minimal mode: black/white only
      if (colorMode === 'minimal') {
        return activeTab === tabId
          ? 'bg-black text-white border-b-2 border-black dark:bg-white dark:text-black dark:border-[#4169E1]'
          : 'bg-white text-black hover:bg-gray-100 dark:bg-black dark:text-white dark:hover:bg-gray-900';
      }

      // Colorful mode
      switch (tabId) {
        case 'updates':
          return activeTab === tabId
            ? 'bg-fuchsia-50 text-fuchsia-600 border-b-2 border-fuchsia-600 dark:bg-fuchsia-900 dark:text-fuchsia-300 dark:border-fuchsia-400'
            : 'bg-fuchsia-200 text-fuchsia-600 hover:bg-fuchsia-300 dark:bg-fuchsia-800 dark:text-fuchsia-300 dark:hover:bg-fuchsia-700';
        case 'upload':
          return activeTab === tabId
            ? 'bg-violet-50 text-violet-600 border-b-2 border-violet-600 dark:bg-violet-900 dark:text-violet-300 dark:border-violet-400'
            : 'bg-violet-200 text-violet-600 hover:bg-violet-300 dark:bg-violet-800 dark:text-violet-300 dark:hover:bg-violet-700';
        case 'stats':
          return activeTab === tabId
            ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-400'
            : 'bg-indigo-200 text-indigo-600 hover:bg-indigo-300 dark:bg-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-700';
        case 'artists':
          return activeTab === tabId
            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-400'
            : 'bg-blue-200 text-blue-600 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:hover:bg-blue-700';
        case 'albums':
          return activeTab === tabId
            ? 'bg-cyan-50 text-cyan-600 border-b-2 border-cyan-600 dark:bg-cyan-900 dark:text-cyan-300 dark:border-cyan-400'
            : 'bg-cyan-200 text-cyan-600 hover:bg-cyan-300 dark:bg-cyan-800 dark:text-cyan-300 dark:hover:bg-cyan-700';
        case 'custom':
          return activeTab === tabId
            ? 'bg-emerald-50 text-emerald-600 border-b-2 border-emerald-600 dark:bg-emerald-900 dark:text-emerald-300 dark:border-emerald-400'
            : 'bg-emerald-200 text-emerald-600 hover:bg-emerald-300 dark:bg-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-700';
        case 'tracks':
          return activeTab === tabId
            ? 'bg-red-50 text-red-600 border-b-2 border-red-600 dark:bg-red-900 dark:text-red-300 dark:border-red-400'
            : 'bg-red-200 text-red-600 hover:bg-red-300 dark:bg-red-800 dark:text-red-300 dark:hover:bg-red-700';
        case 'calendar':
          return activeTab === tabId
            ? 'bg-green-50 text-green-600 border-b-2 border-green-600 dark:bg-green-900 dark:text-green-300 dark:border-green-400'
            : 'bg-green-200 text-green-600 hover:bg-green-300 dark:bg-green-800 dark:text-green-300 dark:hover:bg-green-700';
        case 'patterns':
          return activeTab === tabId
            ? 'bg-yellow-50 text-yellow-600 border-b-2 border-yellow-600 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-400'
            : 'bg-yellow-200 text-yellow-600 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-700';
        case 'behavior':
          return activeTab === tabId
            ? 'bg-amber-50 text-amber-600 border-b-2 border-amber-600 dark:bg-amber-900 dark:text-amber-300 dark:border-amber-400'
            : 'bg-amber-200 text-amber-600 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-300 dark:hover:bg-amber-700';
        case 'discovery':
          return activeTab === tabId
            ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-400'
            : 'bg-orange-200 text-orange-600 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-300 dark:hover:bg-orange-700';
        case 'podcasts':
          return activeTab === tabId
            ? 'bg-red-50 text-red-600 border-b-2 border-red-600 dark:bg-red-900 dark:text-red-300 dark:border-red-400'
            : 'bg-red-200 text-red-600 hover:bg-red-300 dark:bg-red-800 dark:text-red-300 dark:hover:bg-red-700';
        case 'playlists':
          return activeTab === tabId
            ? 'bg-rose-50 text-rose-600 border-b-2 border-rose-600 dark:bg-rose-900 dark:text-rose-300 dark:border-rose-400'
            : 'bg-rose-200 text-rose-600 hover:bg-rose-300 dark:bg-rose-800 dark:text-rose-300 dark:hover:bg-rose-700';
        case 'settings':
          return activeTab === tabId
            ? 'bg-gray-50 text-gray-600 border-b-2 border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-400'
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700';
        default:
          return '';
      }
    };

    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`${
          isCollapsed && isMobile
            ? 'p-2 text-base'
            : 'px-2 sm:px-4 py-2 text-sm sm:text-base'
        } font-medium ${getTabColor(id)} ${isMobile && !isCollapsed ? '[&>span]:flex [&>span]:flex-col [&>span]:items-center [&>span]:leading-tight [&>span>span]:text-[10px]' : ''}`}
        title={isCollapsed && isMobile ? label : undefined}
      >
        {isCollapsed && isMobile ? getTabIcon(id) : label}
      </button>
    );
  }, [activeTab, setActiveTab, isCollapsed, isMobile, getTabIcon, colorMode]);

  // Settings bar height calculation - measure actual height on desktop
  const mobileBarHeight = isLandscapeMobile ? 64 : 85;
  const [settingsBarHeight, setSettingsBarHeight] = useState(isMobile ? `${mobileBarHeight}px` : '40px');
  
  // Measure actual SettingsBar height on desktop, use fixed value on mobile
  useEffect(() => {
    if (isMobile) {
      setSettingsBarHeight(`${mobileBarHeight}px`);
    } else {
      const measureSettingsBarHeight = () => {
        const settingsBarElement = document.querySelector('.fixed.left-0.right-0.w-full.z-\\[100\\]');
        if (settingsBarElement) {
          const actualHeight = settingsBarElement.offsetHeight;
          setSettingsBarHeight(`${actualHeight}px`);
        }
      };

      measureSettingsBarHeight();
      const timer = setTimeout(measureSettingsBarHeight, 100);

      return () => clearTimeout(timer);
    }
  }, [isMobile, isLandscapeMobile, mobileBarHeight, fontSize]);

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
    const colorfulTabBg = {
      upload: 'bg-violet-200 dark:bg-violet-900',
      stats: 'bg-indigo-200 dark:bg-indigo-900',
      artists: 'bg-blue-200 dark:bg-blue-900',
      albums: 'bg-cyan-200 dark:bg-cyan-900',
      custom: 'bg-emerald-200 dark:bg-emerald-900',
      tracks: 'bg-red-200 dark:bg-red-900',
      calendar: 'bg-green-200 dark:bg-green-900',
      patterns: 'bg-yellow-200 dark:bg-yellow-900',
      behavior: 'bg-amber-200 dark:bg-amber-900',
      discovery: 'bg-orange-200 dark:bg-orange-900',
      podcasts: 'bg-red-200 dark:bg-red-900',
      playlists: 'bg-rose-200 dark:bg-rose-900',
      updates: 'bg-fuchsia-200 dark:bg-fuchsia-900',
    };
    const bgStyles = colorMode === 'minimal'
      ? 'bg-white dark:bg-black'
      : (colorfulTabBg[activeTab] || 'bg-white dark:bg-black');
    const borderColor = colorMode === 'minimal'
      ? 'border-black dark:border-[#4169E1]'
      : 'border-violet-200 dark:border-gray-600';
    const baseStyles = `${bgStyles} ${borderColor} ${transitionClass}`;

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
        return 'flex gap-0 min-w-max text-sm sm:text-base';
      case 'left':
      case 'right':
        return 'flex flex-col gap-0 min-h-max text-sm sm:text-base';
      default:
        return 'flex gap-0 min-w-max text-sm sm:text-base';
    }
  };


  // Tabs component for reuse
  const TabsContainer = () => (
    <div className="flex gap-0 min-w-max text-sm sm:text-base">
      <TabButton id="updates" label="Updates" />
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
      <TabButton id="settings" label="Settings" />
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
            paddingTop: isMobile ? 'env(safe-area-inset-top)' : undefined,
            transform: isMobile ? 'translateZ(0)' : undefined // Hardware acceleration on mobile
          }),
          ...(currentPosition === 'bottom' && isMobile && {
            bottom: `${mobileBarHeight}px`,
            transform: 'translateZ(0)' // Hardware acceleration
          }),
          ...(currentPosition === 'bottom' && !isMobile && {
            bottom: '0'
          }),
          ...(currentPosition === 'left' && {
            top: isMobile ? '0px' : settingsBarHeight,
            paddingTop: isMobile ? 'env(safe-area-inset-top)' : undefined,
            transform: isMobile ? 'translateZ(0)' : undefined
          }),
          ...(currentPosition === 'right' && {
            top: isMobile ? '0px' : settingsBarHeight,
            paddingTop: isMobile ? 'env(safe-area-inset-top)' : undefined,
            transform: isMobile ? 'translateZ(0)' : undefined
          })
        }}
      >
        {currentPosition === 'top' || currentPosition === 'bottom' ? (
          // Horizontal layout for top and bottom positions
          <div className="overflow-x-auto main-tabs-scrollbar">
            <TabsContainer />
          </div>
        ) : (
          // Vertical layout for left and right positions
          <div className="overflow-y-auto main-tabs-scrollbar max-h-full py-4">
            <div className="flex flex-col gap-0 min-h-max text-sm sm:text-base">
              <TabButton id="updates" label="Updates" />
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
              <TabButton id="settings" label="Settings" />
            </div>
          </div>
        )}
      </div>
      
    </>
  );
};

export default TopTabs;