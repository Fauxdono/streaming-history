"use client";

import React, { useState, useCallback, useEffect } from 'react';

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
  onPositionChange, // New callback to communicate position changes to parent
  onHeightChange,   // New callback to communicate height changes to parent
  onWidthChange,    // New callback to communicate width changes to parent
  position = 'top'  // New prop for initial position
}) => {
  // Position state - cycles through top, right, bottom, left
  const [currentPosition, setCurrentPosition] = useState(position);
  
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

  // Re-measure width on window resize
  useEffect(() => {
    if (onWidthChange && (currentPosition === 'left' || currentPosition === 'right')) {
      const handleResize = () => {
        const topTabsElement = document.querySelector('.toptabs-container');
        if (topTabsElement) {
          const actualWidth = topTabsElement.offsetWidth;
          onWidthChange(actualWidth);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [currentPosition, onWidthChange]);

  // Communicate position changes to parent
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange(currentPosition);
    }
  }, [currentPosition, onPositionChange]);

  // Communicate height changes to parent (for top/bottom positions)
  useEffect(() => {
    if (onHeightChange) {
      if (currentPosition === 'top' || currentPosition === 'bottom') {
        // Approximate height based on content
        const tabHeight = isMobile ? 60 : 72; // Based on py-2 and text sizes
        onHeightChange(tabHeight);
      } else {
        // Reset height to 0 when not on top/bottom sides
        onHeightChange(0);
      }
    }
  }, [currentPosition, onHeightChange, isMobile]);

  // Communicate width changes to parent (for left/right positions)
  useEffect(() => {
    if (onWidthChange) {
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
  }, [currentPosition, onWidthChange, isMobile]);

  // Toggle position - cycles through top, right, bottom, left
  const togglePosition = useCallback(() => {
    setCurrentPosition(prev => {
      if (prev === 'top') return 'right';
      if (prev === 'right') return 'bottom';
      if (prev === 'bottom') return 'left';
      return 'top'; // default fallback for 'left' and initial state
    });
  }, []);
  // Memoized TabButton component to prevent recreation
  const TabButton = useCallback(({ id, label }) => {
    // Helper function to get the color based on tab ID
    const getTabColor = (tabId) => {
      switch (tabId) {
        case 'updates':
          return activeTab === tabId 
            ? 'bg-cyan-50 text-cyan-600 border-b-2 border-cyan-600 dark:bg-cyan-900 dark:text-cyan-300 dark:border-cyan-400' 
            : 'bg-cyan-200 text-cyan-600 hover:bg-cyan-300 dark:bg-cyan-800 dark:text-cyan-300 dark:hover:bg-cyan-700';
        case 'upload':
          return activeTab === tabId 
            ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-400' 
            : 'bg-orange-200 text-orange-600 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-300 dark:hover:bg-orange-700';
        case 'stats':
          return activeTab === tabId 
            ? 'bg-purple-100 text-purple-600 border-b-2 border-purple-600 dark:bg-purple-900 dark:text-purple-300 dark:border-purple-400' 
            : 'bg-purple-200 text-purple-600 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-300 dark:hover:bg-purple-700';
        case 'artists':
          return activeTab === tabId 
            ? 'bg-emerald-50 text-teal-600 border-b-2 border-teal-600 dark:bg-emerald-900 dark:text-teal-300 dark:border-teal-400' 
            : 'bg-emerald-200 text-teal-600 hover:bg-emerald-300 dark:bg-emerald-800 dark:text-teal-300 dark:hover:bg-emerald-700';
        case 'albums':
          return activeTab === tabId 
            ? 'bg-pink-50 text-pink-600 border-b-2 border-pink-600 dark:bg-pink-900 dark:text-pink-300 dark:border-pink-400' 
            : 'bg-pink-200 text-pink-600 hover:bg-pink-300 dark:bg-pink-800 dark:text-pink-300 dark:hover:bg-pink-700';
        case 'custom':
          return activeTab === tabId 
            ? 'bg-yellow-50 text-yellow-600 border-b-2 border-yellow-600 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-400' 
            : 'bg-yellow-200 text-yellow-600 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-700';
        case 'tracks':
          return activeTab === tabId 
            ? 'bg-red-50 text-red-600 border-b-2 border-red-600 dark:bg-red-900 dark:text-red-300 dark:border-red-400' 
            : 'bg-red-200 text-red-600 hover:bg-red-300 dark:bg-red-800 dark:text-red-300 dark:hover:bg-red-700';
        case 'patterns':
          return activeTab === tabId 
            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-400' 
            : 'bg-blue-200 text-blue-600 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-300 dark:hover:bg-blue-700';
        case 'behavior':
          return activeTab === tabId 
            ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 dark:border-indigo-400' 
            : 'bg-indigo-200 text-indigo-600 hover:bg-indigo-300 dark:bg-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-700';
        case 'discovery':
          return activeTab === tabId 
            ? 'bg-violet-50 text-violet-600 border-b-2 border-violet-600 dark:bg-violet-900 dark:text-violet-300 dark:border-violet-400' 
            : 'bg-violet-200 text-violet-600 hover:bg-violet-300 dark:bg-violet-800 dark:text-violet-300 dark:hover:bg-violet-700';
        case 'podcasts':
          return activeTab === tabId 
            ? 'bg-slate-50 text-slate-600 border-b-2 border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-400' 
            : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';
        case 'playlists':
          return activeTab === tabId 
            ? 'bg-green-50 text-green-600 border-b-2 border-green-600 dark:bg-green-900 dark:text-green-300 dark:border-green-400' 
            : 'bg-green-200 text-green-600 hover:bg-green-300 dark:bg-green-800 dark:text-green-300 dark:hover:bg-green-700';
        default:
          return '';
      }
    };

    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-2 sm:px-4 py-2 font-medium text-sm sm:text-base ${getTabColor(id)}`}
      >
        {label}
      </button>
    );
  }, [activeTab, setActiveTab]);

  // Position styles for different placements
  const getPositionStyles = () => {
    switch (currentPosition) {
      case 'top':
        return 'fixed top-0 left-0 right-0 w-full z-60';
      case 'bottom':
        return 'fixed bottom-0 left-0 right-0 w-full z-60';
      case 'left':
        return 'fixed left-0 top-0 bottom-0 h-full w-auto z-60';
      case 'right':
        return 'fixed right-0 top-0 bottom-0 h-full w-auto z-60';
      default:
        return 'fixed top-0 left-0 right-0 w-full z-60';
    }
  };

  // Container styles for different orientations
  const getContainerStyles = () => {
    const baseStyles = 'bg-white dark:bg-gray-800 border-violet-200 dark:border-gray-600 transition-all duration-300';
    
    switch (currentPosition) {
      case 'top':
        return `${baseStyles} border-b`;
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

  return (
    <div className={`toptabs-container ${getPositionStyles()} ${getContainerStyles()}`}>
      {/* Position toggle button */}
      <button 
        onClick={togglePosition}
        className={`absolute z-70 p-2 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-lg ${
          currentPosition === 'top' ? 'top-1 right-1' :
          currentPosition === 'bottom' ? 'bottom-1 right-1' :
          currentPosition === 'left' ? 'top-1 right-1' :
          'top-1 left-1'
        }`}
        title="Change tab position"
      >
        <span className="text-xs">⇄</span>
      </button>

      <div className={getScrollContainerStyles()}>
        <div className={getTabsContainerStyles()}>
          {stats && <TabButton id="updates" label="Updates" />} 
          <TabButton id="upload" label="Upload" />
          {stats && <TabButton id="stats" label="Statistics" />}
          {topArtists.length > 0 && <TabButton id="artists" label={getArtistsTabLabel()} />}
          {topAlbums.length > 0 && <TabButton id="albums" label={getAlbumsTabLabel()} />}
          {processedData.length > 0 && <TabButton id="custom" label={getCustomTabLabel()}  />}
          {processedData.length > 0 && <TabButton id="tracks" label={getTracksTabLabel()} />}
          {processedData.length > 0 && <TabButton id="patterns" label={getPatternsTabLabel()} />}
          {processedData.length > 0 && <TabButton id="behavior" label={getBehaviorTabLabel()} />}
          {processedData.length > 0 && <TabButton id="discovery" label="Music Discovery" />}
          {rawPlayData.length > 0 && <TabButton id="podcasts" label="Podcasts" />}
          {processedData.length > 0 && <TabButton id="playlists" label="Custom Playlists" />}
        </div>
      </div>
    </div>
  );
};

export default TopTabs;