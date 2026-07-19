"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './themeprovider';

const AnalysisSettingsDropdown = ({ isOpen, onClose, buttonRef, colorMode = 'minimal' }) => {
  const { theme, minPlayDuration, setMinPlayDuration, skipFilter, setSkipFilter, fullListenOnly, setFullListenOnly, skipEndThreshold, setSkipEndThreshold } = useTheme();
  const isDark = theme === 'dark';
  const isColorful = colorMode === 'colorful';
  const dropdownRef = useRef(null);

  // Same color system as SettingsPanel
  const shadowColor = isColorful
    ? (isDark ? '#6b7280' : '#4b5563')
    : (isDark ? '#4169E1' : '#000000');

  const colors = isColorful
    ? {
        label: isDark ? 'text-gray-400' : 'text-gray-500',
        text: isDark ? 'text-gray-300' : 'text-gray-700',
        divider: isDark ? 'border-gray-600' : 'border-gray-300',
        bg: isDark ? 'bg-gray-900 border-gray-600' : 'bg-white border-gray-300',
        barFill: isDark ? 'bg-gray-500' : 'bg-gray-600',
        barTrack: isDark ? 'bg-gray-800' : 'bg-gray-200',
        barText: isDark ? 'text-gray-300' : 'text-gray-700',
        thumbBg: isDark ? 'bg-gray-700' : 'bg-gray-100',
        thumbBorder: isDark ? 'border-gray-500' : 'border-gray-500',
        toggleBg: isDark ? 'bg-gray-700' : 'bg-gray-100',
        toggleBorder: isDark ? 'border-gray-500' : 'border-gray-500',
        toggleInactiveText: isDark ? 'text-gray-400' : 'text-gray-500',
      }
    : {
        label: isDark ? 'text-gray-400' : 'text-gray-500',
        text: isDark ? 'text-gray-300' : 'text-gray-700',
        divider: isDark ? 'border-gray-600' : 'border-gray-200',
        bg: isDark ? 'bg-black border-gray-600' : 'bg-white border-gray-300',
        barFill: isDark ? 'bg-[#4169E1]' : 'bg-black',
        barTrack: isDark ? 'bg-gray-800' : 'bg-gray-200',
        barText: isDark ? 'text-[#4169E1]' : 'text-black',
        thumbBg: isDark ? 'bg-gray-900' : 'bg-white',
        thumbBorder: isDark ? 'border-[#4169E1]' : 'border-black',
        toggleBg: isDark ? 'bg-gray-900' : 'bg-white',
        toggleBorder: isDark ? 'border-[#4169E1]' : 'border-black',
        toggleInactiveText: isDark ? 'text-gray-500' : 'text-gray-500',
      };

  // Retro slider matching SettingsPanel
  const RetroSlider = ({ value, min, max, onChange, displayValue }) => {
    const trackRef = useRef(null);
    const fraction = max === min ? 0 : (value - min) / (max - min);

    const calcValue = (clientX) => {
      const rect = trackRef.current.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(min + f * (max - min));
    };

    const handleClick = (e) => onChange(calcValue(e.clientX));
    const handleDrag = (e) => { if (e.buttons === 1) onChange(calcValue(e.clientX)); };
    const handleTouch = (e) => onChange(calcValue(e.touches[0].clientX));

    return (
      <div className="flex items-center gap-3">
        <div
          ref={trackRef}
          className="relative flex-1 h-3 cursor-pointer"
          onClick={handleClick}
          onMouseMove={handleDrag}
          onTouchMove={handleTouch}
        >
          <div className={`absolute inset-0 ${colors.barTrack} rounded-none`} />
          <div
            className={`absolute top-0 left-0 h-full ${colors.barFill} rounded-none`}
            style={{ width: `${fraction * 100}%` }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full ${colors.thumbBg} border-2 ${colors.thumbBorder}`}
            style={{ left: `calc(${fraction * 100}% - 10px)`, boxShadow: `2px 2px 0 0 ${shadowColor}` }}
          />
        </div>
        <span className={`font-mono text-[12px] min-w-[4rem] text-right ${colors.barText}`}>
          {displayValue}
        </span>
      </div>
    );
  };

  // Retro toggle matching SettingsPanel
  const RetroToggle = ({ checked, onChange, label }) => (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className={`text-sm ${colors.text}`}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`font-mono text-[11px] rounded-none border-2 transition-all duration-200 select-none ${colors.toggleBg} ${colors.toggleBorder} ${
          checked
            ? `${colors.barText} translate-x-[2px] translate-y-[2px]`
            : colors.toggleInactiveText
        }`}
        style={{
          minWidth: '56px',
          boxShadow: checked ? `inset 2px 2px 0 0 ${shadowColor}` : `2px 2px 0 0 ${shadowColor}`,
        }}
      >
        <span className="px-2 py-0.5 font-bold block">
          {checked ? 'ON' : 'OFF'}
        </span>
      </button>
    </label>
  );

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
      const dropdownWidth = 280;

      let left = buttonRect.left + buttonRect.width / 2 - dropdownWidth / 2;
      let top = buttonRect.bottom + 8;

      // Adjust if dropdown would go off screen
      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      // If dropdown would go below viewport, show it above button
      if (top + 300 > window.innerHeight) {
        top = buttonRect.top - 300 - 8;
      }

      setPosition({ top, left });
    }
  }, [isOpen, buttonRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`fixed z-[300] ${colors.bg} border rounded-lg shadow-xl p-4`}
      style={{
        top: position.top,
        left: position.left,
        width: '280px'
      }}
    >
      {/* Minimum Play Duration */}
      <div>
        <div className={`text-xs mb-2 ${colors.label}`}>Minimum Play Duration</div>
        <RetroSlider
          value={Math.round(minPlayDuration / 1000)}
          min={0}
          max={120}
          onChange={(v) => setMinPlayDuration(v * 1000)}
          displayValue={`${Math.round(minPlayDuration / 1000)}s`}
        />
      </div>

      {/* Skip Tolerance */}
      <div className="mt-3">
        <div className={`text-xs mb-2 ${colors.label}`}>Skip Tolerance (near end)</div>
        <RetroSlider
          value={Math.round(skipEndThreshold / 1000)}
          min={0}
          max={60}
          onChange={(v) => setSkipEndThreshold(v * 1000)}
          displayValue={skipEndThreshold === 0 ? 'Off' : `${Math.round(skipEndThreshold / 1000)}s`}
        />
      </div>

      <div className={`my-3 border-t ${colors.divider}`} />

      <RetroToggle checked={skipFilter} onChange={setSkipFilter} label="Exclude skipped tracks" />
      <RetroToggle checked={fullListenOnly} onChange={setFullListenOnly} label="Only count completed plays" />
    </div>
  );
};

export default AnalysisSettingsDropdown;
