"use client";

import { useTheme } from './themeprovider';

/**
 * Minimal Tabs Component
 * Simple horizontal tabs with underline for active state
 */
export default function MinimalTabs({ activeTab, setActiveTab, tabs }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`border-b ${isDark ? 'border-white' : 'border-black'} overflow-x-auto`}>
      <div className="flex gap-4 min-w-max px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-2 transition-all ${
              activeTab === tab.id
                ? 'border-b-2 border-[var(--accent-color)] text-[var(--accent-color)]'
                : isDark
                ? 'text-white hover:text-[var(--accent-color)]'
                : 'text-black hover:text-[var(--accent-color)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
