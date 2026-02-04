"use client";

import React, { useState } from 'react';
import SpotifyAnalyzer from './components/SpotifyAnalyzer';
import TopTabs from './components/TopTabs';

export default function Home() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <SpotifyAnalyzer
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        TopTabsComponent={TopTabs}
      />
    </main>
  );
}