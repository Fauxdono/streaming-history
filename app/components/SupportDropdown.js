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

  // Colorful mode: love red, on the podcasts/tracks tab palette from theme.js
  // (#fecaca light / #7f1d1d dark). Dark is a red-900 heart with lighter red
  // buttons on top. Minimal mode keeps the standard black / royal-blue look
  // of the other dropdowns.
  const shadowColor = isColorful
    ? (isDark ? '#f87171' : '#7f1d1d')
    : (isDark ? '#4169E1' : '#000000');

  const colors = isColorful
    ? {
        muted: isDark ? 'text-red-300' : 'text-red-400',
        barText: isDark ? 'text-red-100' : 'text-red-700',
        toggleBg: isDark ? 'bg-red-800' : 'bg-red-100',
        toggleBorder: isDark ? 'border-red-400' : 'border-red-700',
        toggleInactiveText: isDark ? 'text-red-300' : 'text-red-400',
      }
    : {
        muted: isDark ? 'text-gray-500' : 'text-gray-400',
        barText: isDark ? 'text-[#4169E1]' : 'text-black',
        toggleBg: isDark ? 'bg-gray-900' : 'bg-white',
        toggleBorder: isDark ? 'border-[#4169E1]' : 'border-black',
        toggleInactiveText: isDark ? 'text-gray-500' : 'text-gray-500',
      };

  // Heart container colors (SVG needs raw values, not classes)
  const heartFill = isColorful
    ? (isDark ? '#7f1d1d' : '#fee2e2')
    : (isDark ? '#000000' : '#ffffff');
  const heartStroke = isColorful
    ? (isDark ? '#f87171' : '#b91c1c')
    : (isDark ? '#4169E1' : '#000000');

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

  const HEART_WIDTH = 280;
  const HEART_HEIGHT = 260;

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();

      let left = buttonRect.left + buttonRect.width / 2 - HEART_WIDTH / 2;
      let top = buttonRect.bottom + 8;

      // Adjust if dropdown would go off screen
      if (left < 8) left = 8;
      if (left + HEART_WIDTH > window.innerWidth - 8) {
        left = window.innerWidth - HEART_WIDTH - 8;
      }

      // If dropdown would go below viewport, show it above button
      if (top + HEART_HEIGHT > window.innerHeight) {
        top = buttonRect.top - HEART_HEIGHT - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, buttonRef]);

  // Raised shadow that flips to inset while pressed (site-wide button language)
  const linkFx = isColorful
    ? (isDark
        ? 'shadow-[2px_2px_0_0_#f87171] active:shadow-[inset_2px_2px_0_0_#f87171]'
        : 'shadow-[2px_2px_0_0_#7f1d1d] active:shadow-[inset_2px_2px_0_0_#7f1d1d]')
    : (isDark
        ? 'shadow-[2px_2px_0_0_#4169E1] active:shadow-[inset_2px_2px_0_0_#4169E1]'
        : 'shadow-[2px_2px_0_0_black] active:shadow-[inset_2px_2px_0_0_black]');

  const platformLinks = {
    'ko-fi': `https://ko-fi.com/${accounts['ko-fi']}`,
    'buymeacoffee': `https://www.buymeacoffee.com/${accounts['buymeacoffee']}`
  };

  if (!isOpen) return null;

  // Lucide/material heart outline, drawn twice: an offset solid heart as the
  // retro press-shadow, then the panel heart on top
  const HEART_PATH = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 12.54L12 21.35z";

  return (
    <div
      ref={dropdownRef}
      className="fixed z-[300]"
      style={{
        top: position.top,
        left: position.left,
        width: `${HEART_WIDTH}px`,
        height: `${HEART_HEIGHT}px`
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 24 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={HEART_PATH} transform="translate(0.3 0.3)" fill={shadowColor} />
        <path d={HEART_PATH} fill={heartFill} stroke={heartStroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* Content mapped to the heart's geometry: one pill per lobe, the
          coffee link at the container's center, Love Yourz running down the
          lower-left diagonal edge. Wrappers carry the centering transform so
          the buttons' own press-indent translates still work. */}
      <div className="absolute inset-0">
        {[
          { platform: 'ko-fi', label: 'Ko-fi', left: '30%' },
          { platform: 'buymeacoffee', label: 'BMC', left: '70%' },
        ].map(({ platform, label, left }) => {
          const isActive = activePlatform === platform;
          return (
            <div
              key={platform}
              className="absolute"
              style={{ left, top: '25%', transform: 'translate(-50%, -50%)' }}
            >
              <button
                onClick={() => setActivePlatform(platform)}
                className={`px-3 py-1.5 text-sm rounded-full font-medium border transition-all duration-200 select-none ${colors.toggleBg} ${colors.toggleBorder} ${
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
                {label}
              </button>
            </div>
          );
        })}

        <div
          className="absolute"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <a
            href={platformLinks[activePlatform]}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-block px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all duration-200 select-none ${colors.toggleBg} ${colors.toggleBorder} ${colors.barText} ${linkFx} active:translate-x-[2px] active:translate-y-[2px]`}
          >
            <Coffee className="inline mr-2" size={16} />
            Buy me a coffee
          </a>
        </div>

        {/* Rotated to follow the heart's lower-left edge toward the tip */}
        <div
          className={`absolute flex items-center gap-1 whitespace-nowrap text-xs font-medium ${colors.muted}`}
          style={{ left: '40%', top: '72%', transform: 'translate(-50%, -50%) rotate(50deg)' }}
        >
          <span>N</span>
          <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: 'rotate(3deg)' }}>
            <path d={HEART_PATH} fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>M</span>
        </div>
      </div>
    </div>
  );
};

export default SupportDropdown;
