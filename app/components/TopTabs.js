"use client";

import React, { useCallback } from 'react';

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
  getBehaviorTabLabel
}) => {
  // Memoized TabButton component to prevent recreation
  const TabButton = useCallback(({ id, label }) => {
    // Helper function to get the color based on tab ID
    const getTabColor = (tabId) => {
      switch (tabId) {
        case 'updates':
          return activeTab === tabId 
            ? 'bg-cyan-50 text-cyan-600 border-b-2 border-cyan-600' 
            : 'bg-cyan-200 text-cyan-600 hover:bg-cyan-300';
        case 'upload':
          return activeTab === tabId 
            ? 'bg-orange-50 text-orange-600 border-b-2 border-orange-600' 
            : 'bg-orange-200 text-orange-600 hover:bg-orange-300';
        case 'stats':
          return activeTab === tabId 
            ? 'bg-purple-100 text-purple-600 border-b-2 border-purple-600' 
            : 'bg-purple-200 text-purple-600 hover:bg-purple-300';
        case 'artists':
          return activeTab === tabId 
            ? 'bg-emerald-50 text-teal-600 border-b-2 border-teal-600' 
            : 'bg-emerald-200 text-teal-600 hover:bg-emerald-300';
        case 'albums':
          return activeTab === tabId 
            ? 'bg-pink-50 text-pink-600 border-b-2 border-pink-600' 
            : 'bg-pink-200 text-pink-600 hover:bg-pink-300';
        case 'custom':
          return activeTab === tabId 
            ? 'bg-yellow-50 text-yellow-600 border-b-2 border-yellow-600' 
            : 'bg-yellow-200 text-yellow-600 hover:bg-yellow-300';
        case 'tracks':
          return activeTab === tabId 
            ? 'bg-red-50 text-red-600 border-b-2 border-red-600' 
            : 'bg-red-200 text-red-600 hover:bg-red-300';
        case 'patterns':
          return activeTab === tabId 
            ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
            : 'bg-blue-200 text-blue-600 hover:bg-blue-300';
        case 'behavior':
          return activeTab === tabId 
            ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' 
            : 'bg-indigo-200 text-indigo-600 hover:bg-indigo-300';
        case 'discovery':
          return activeTab === tabId 
            ? 'bg-violet-50 text-violet-600 border-b-2 border-violet-600' 
            : 'bg-violet-200 text-violet-600 hover:bg-violet-300';
        case 'podcasts':
          return activeTab === tabId 
            ? 'bg-slate-50 text-slate-600 border-b-2 border-slate-600' 
            : 'bg-slate-200 text-slate-600 hover:bg-slate-300';
        case 'playlists':
          return activeTab === tabId 
            ? 'bg-green-50 text-green-600 border-b-2 border-green-600' 
            : 'bg-green-200 text-green-600 hover:bg-green-300';
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

  return (
    <div className="w-full bg-white dark:bg-gray-800 border-b border-violet-200 dark:border-gray-600 sticky top-0 z-20">
      <div className="overflow-x-auto px-4 main-tabs-scrollbar">
        <div className="flex gap-1 sm:gap-2 min-w-max text-sm sm:text-base">
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