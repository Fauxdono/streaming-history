"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './themeprovider';
import { Coffee } from 'lucide-react';

const SupportDropdown = ({ isOpen, onClose, buttonRef, colorMode = 'minimal' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const dropdownRef = useRef(null);
  const [activePlatform, setActivePlatform] = useState('ko-fi');
  const isColorful = colorMode === 'colorful';

  const accounts = {
    'ko-fi': 'fauxdono',
    'buymeacoffee': 'fauxdono'
  };

  // Same color system as the settings dropdowns
  const shadowColor = isColorful
    ? (isDark ? '#6b7280' : '#4b5563')
    : (isDark ? '#4169E1' : '#000000');

  const colors = isColorful
    ? {
        label: isDark ? 'text-gray-400' : 'text-gray-500',
        muted: isDark ? 'text-gray-500' : 'text-gray-400',
        bg: isDark ? 'bg-gray-900 border-gray-600' : 'bg-white border-gray-300',
        barText: isDark ? 'text-gray-300' : 'text-gray-700',
        toggleBg: isDark ? 'bg-gray-700' : 'bg-gray-100',
        toggleBorder: isDark ? 'border-gray-500' : 'border-gray-500',
        toggleInactiveText: isDark ? 'text-gray-400' : 'text-gray-500',
      }
    : {
        label: isDark ? 'text-gray-400' : 'text-gray-500',
        muted: isDark ? 'text-gray-500' : 'text-gray-400',
        bg: isDark ? 'bg-black border-gray-600' : 'bg-white border-gray-300',
        barText: isDark ? 'text-[#4169E1]' : 'text-black',
        toggleBg: isDark ? 'bg-gray-900' : 'bg-white',
        toggleBorder: isDark ? 'border-[#4169E1]' : 'border-black',
        toggleInactiveText: isDark ? 'text-gray-500' : 'text-gray-500',
      };

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          buttonRef.current &&
          !buttonRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, buttonRef]);

  // Position dropdown relative to button
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 200;

      let left = buttonRect.left + buttonRect.width / 2 - dropdownWidth / 2;
      let top = buttonRect.bottom + 8;

      // Adjust if dropdown would go off screen
      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      // If dropdown would go below viewport, show it above button
      if (top + 180 > window.innerHeight) {
        top = buttonRect.top - 180 - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, buttonRef]);

  // Raised shadow that flips to inset while pressed (site-wide button language)
  const linkFx = isColorful
    ? (isDark
        ? 'shadow-[2px_2px_0_0_#6b7280] active:shadow-[inset_2px_2px_0_0_#6b7280]'
        : 'shadow-[2px_2px_0_0_#4b5563] active:shadow-[inset_2px_2px_0_0_#4b5563]')
    : (isDark
        ? 'shadow-[2px_2px_0_0_#4169E1] active:shadow-[inset_2px_2px_0_0_#4169E1]'
        : 'shadow-[2px_2px_0_0_black] active:shadow-[inset_2px_2px_0_0_black]');

  const platformLinks = {
    'ko-fi': `https://ko-fi.com/${accounts['ko-fi']}`,
    'buymeacoffee': `https://www.buymeacoffee.com/${accounts['buymeacoffee']}`
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`fixed z-[300] ${colors.bg} border rounded-lg shadow-xl p-4`}
      style={{
        top: position.top,
        left: position.left,
        minWidth: '200px'
      }}
    >
      <div className={`text-center text-sm mb-3 ${colors.label}`}>
        no ads, just vibes
      </div>

      <div className="flex gap-3 justify-center mb-4">
        {['ko-fi', 'buymeacoffee'].map(platform => {
          const isActive = activePlatform === platform;
          return (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform)}
              className={`font-mono text-[11px] font-bold px-3 py-1 rounded-none border-2 transition-all duration-200 select-none ${colors.toggleBg} ${colors.toggleBorder} ${
                isActive
                  ? `${colors.barText} translate-x-[2px] translate-y-[2px]`
                  : colors.toggleInactiveText
              }`}
              style={{
                boxShadow: isActive
                  ? `inset 2px 2px 0 0 ${shadowColor}`
                  : `2px 2px 0 0 ${shadowColor}`,
              }}
            >
              {platform === 'ko-fi' ? 'Ko-fi' : 'BMC'}
            </button>
          );
        })}
      </div>

      <div className="text-center">
        <a
          href={platformLinks[activePlatform]}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-block px-4 py-2 rounded-none border-2 text-sm transition-all duration-200 select-none ${colors.toggleBg} ${colors.toggleBorder} ${colors.barText} ${linkFx} active:translate-x-[2px] active:translate-y-[2px]`}
        >
          <Coffee className="inline mr-2" size={16} />
          Buy me a coffee
        </a>
      </div>

      <div className={`mt-3 text-xs text-center ${colors.muted}`}>
        Love Yourz
      </div>
    </div>
  );
};

export default SupportDropdown;
