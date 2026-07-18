"use client";

import React, { useState } from 'react';
import SpotifyAnalyzer from './components/SpotifyAnalyzer';
import TopTabs from './components/TopTabs';

export default function Home() {
  const [activeTab, setActiveTab] = useState('upload');

  // h-full, not min-h-screen: the app-shell height chain (html.app-shell
  // → body → main → analyzer root → content scroller) must be unbroken
  // percentages, or the content div gets no height and can't scroll
  return (
    <main className="h-full">
      <SpotifyAnalyzer
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        TopTabsComponent={TopTabs}
      />
    </main>
  );
}