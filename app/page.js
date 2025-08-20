"use client";

import React, { useState } from 'react';
import SpotifyAnalyzer from './components/SpotifyAnalyzer';
import TopTabs from './components/TopTabs';

export default function Home() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <main className="h-screen bg-gradient-to-b from-blue-400 via-yellow-300 to-orange-300">
      <SpotifyAnalyzer 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        TopTabsComponent={TopTabs}
      />
    </main>
  );
}