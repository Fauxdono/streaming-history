"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './themeprovider';

const FontSizeDropdown = ({ isOpen, onClose, buttonRef, colorMode = 'minimal' }) => {
  const { theme, fontSize, setFontSize, fontFamily, setFontFamily, minPlayDuration, setMinPlayDuration, skipFilter, setSkipFilter, fullListenOnly, setFullListenOnly, dyslexicSpacing, setDyslexicSpacing, skipEndThreshold, setSkipEndThreshold } = useTheme();
  const isDark = theme === 'dark';
  const isColorful = colorMode === 'colorful';
  const dropdownRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Same color system as SettingsPanel
  const shadowColor = isColorful
    ? (isDark ? '#6b7280' : '#4b5563')
    : (isDark ? '#4169E1' : '#000000');

  const colors = isColorful
    ? {
        activeFont: isDark ? 'bg-gray-600 text-white' : 'bg-gray-600 text-white',
        inactiveFont: isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700',
        activeFontSize: isDark ? 'text-gray-300' : 'text-gray-700',
        inactiveFontSize: isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600',
        label: isDark ? 'text-gray-400' : 'text-gray-500',
        text: isDark ? 'text-gray-300' : 'text-gray-700',
        divider: isDark ? 'border-gray-600' : 'border-gray-300',
        bg: isDark ? 'bg-gray-900 border-gray-600' : 'bg-white border-gray-300',
        barFill: isDark ? 'bg-gray-500' : 'bg-gray-600',
        barTrack: isDark ? 'bg-gray-800' : 'bg-gray-200',
        barBorder: isDark ? 'border-gray-600' : 'border-gray-400',
        barBg: isDark ? 'bg-gray-900' : 'bg-gray-50',
        barText: isDark ? 'text-gray-300' : 'text-gray-700',
        thumbBg: isDark ? 'bg-gray-700' : 'bg-gray-100',
        thumbBorder: isDark ? 'border-gray-500' : 'border-gray-500',
        toggleBg: isDark ? 'bg-gray-700' : 'bg-gray-100',
        toggleBorder: isDark ? 'border-gray-500' : 'border-gray-500',
        toggleActiveBg: isDark ? 'bg-gray-600' : 'bg-gray-600',
        toggleActiveText: 'text-white',
        toggleInactiveText: isDark ? 'text-gray-400' : 'text-gray-500',
      }
    : {
        activeFont: isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700',
        inactiveFont: isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700',
        activeFontSize: isDark ? 'text-indigo-400' : 'text-indigo-600',
        inactiveFontSize: isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700',
        label: isDark ? 'text-gray-400' : 'text-gray-500',
        text: isDark ? 'text-gray-300' : 'text-gray-700',
        divider: isDark ? 'border-gray-600' : 'border-gray-200',
        bg: isDark ? 'bg-black border-gray-600' : 'bg-white border-gray-300',
        barFill: isDark ? 'bg-[#4169E1]' : 'bg-black',
        barTrack: isDark ? 'bg-gray-800' : 'bg-gray-200',
        barBorder: isDark ? 'border-[#4169E1]' : 'border-black',
        barBg: isDark ? 'bg-black' : 'bg-white',
        barText: isDark ? 'text-[#4169E1]' : 'text-black',
        thumbBg: isDark ? 'bg-gray-900' : 'bg-white',
        thumbBorder: isDark ? 'border-[#4169E1]' : 'border-black',
        toggleBg: isDark ? 'bg-gray-900' : 'bg-white',
        toggleBorder: isDark ? 'border-[#4169E1]' : 'border-black',
        toggleActiveBg: isDark ? 'bg-[#4169E1]' : 'bg-black',
        toggleActiveText: 'text-white',
        toggleInactiveText: isDark ? 'text-gray-500' : 'text-gray-500',
      };

  const fontFamilyOptions = [
    { value: 'sans', label: 'Sans-serif', preview: '-apple-system, BlinkMacSystemFont, sans-serif' },
    { value: 'serif', label: 'Serif', preview: 'Georgia, Times New Roman, serif' },
    { value: 'mono', label: 'Monospace', preview: 'Monaco, Courier New, monospace' },
    { value: 'comic', label: 'Comic Sans', preview: 'Comic Sans MS, cursive' },
    { value: 'inter', label: 'Inter', preview: 'var(--font-inter), Inter, sans-serif' },
    { value: 'jetbrains-mono', label: 'JetBrains Mono', preview: 'var(--font-jetbrains-mono), JetBrains Mono, monospace' },
    { value: 'playfair', label: 'Playfair Display', preview: 'var(--font-playfair), Playfair Display, serif' },
    { value: 'space-grotesk', label: 'Space Grotesk', preview: 'var(--font-space-grotesk), Space Grotesk, sans-serif' },
    { value: 'outfit', label: 'Outfit', preview: 'var(--font-outfit), Outfit, sans-serif' },
    { value: 'dm-sans', label: 'DM Sans', preview: 'var(--font-dm-sans), DM Sans, sans-serif' },
    { value: 'sora', label: 'Sora', preview: 'var(--font-sora), Sora, sans-serif' },
    { value: 'lexend', label: 'Lexend', preview: 'var(--font-lexend), Lexend, sans-serif' },
    { value: 'cursive', label: 'Cursive', preview: 'Brush Script MT, Segoe Script, cursive' },
    { value: 'system-ui', label: 'System UI', preview: 'system-ui, -apple-system, sans-serif' },
    { value: 'fantasy', label: 'Fantasy', preview: 'Papyrus, fantasy' },
    { value: 'opendyslexic', label: 'OpenDyslexic', preview: 'var(--font-opendyslexic), OpenDyslexic, sans-serif' }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small', sliderValue: 0 },
    { value: 'medium', label: 'Medium', sliderValue: 1 },
    { value: 'large', label: 'Large', sliderValue: 2 },
    { value: 'xlarge', label: 'Extra Large', sliderValue: 3 }
  ];

  const currentSliderValue = fontSizeOptions.find(opt => opt.value === fontSize)?.sliderValue ?? 1;

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
      <div className={`${colors.barBg} border ${colors.barBorder} p-3 rounded-none`}>
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
      </div>
    );
  };

  // Retro toggle matching SettingsPanel
  const RetroToggle = ({ checked, onChange, label }) => (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <span className={`text-sm ${colors.text}`}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`font-mono text-[11px] rounded-none border-2 transition-all duration-200 select-none ${
          checked
            ? `${colors.toggleActiveBg} ${colors.toggleActiveText} ${colors.toggleBorder} translate-x-[2px] translate-y-[2px]`
            : `${colors.toggleBg} ${colors.toggleInactiveText} ${colors.toggleBorder}`
        }`}
        style={{
          minWidth: '56px',
          boxShadow: checked ? `inset 2px 2px 0 0 ${shadowColor}` : `2px 2px 0 0 ${shadowColor}`,
        }}
      >
        <span className="px-2 py-0.5 font-bold block">
          {checked ? '\u25A0 ON' : 'OFF \u25A0'}
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
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, buttonRef]);

  // Position dropdown
  const [position, setPosition] = useState({ top: null, bottom: null, left: 0, maxHeight: 'none', width: 280 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const isLandscape = window.innerWidth > window.innerHeight;
      const dropdownWidth = isMobile
        ? (isLandscape ? Math.min(window.innerWidth - 16, 560) : 280)
        : 560;

      let left = buttonRect.left + buttonRect.width / 2 - dropdownWidth / 2;
      if (left < 8) left = 8;
      if (left + dropdownWidth > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8;

      if (isMobile) {
        // Open upward from the button, capped to available space above
        const bottom = window.innerHeight - buttonRect.top + 8;
        const maxHeight = Math.max(buttonRect.top - 16, 120);
        setPosition({ top: null, bottom, left, maxHeight, width: dropdownWidth });
      } else {
        const top = buttonRect.bottom + 8;
        const spaceBelow = window.innerHeight - top - 8;
        if (spaceBelow < 400) {
          const spaceAbove = buttonRect.top - 8;
          setPosition({ top: Math.max(8, buttonRect.top - Math.min(600, spaceAbove) - 8), bottom: null, left, maxHeight: Math.min(600, spaceAbove), width: dropdownWidth });
        } else {
          setPosition({ top, bottom: null, left, maxHeight: Math.min(600, spaceBelow), width: dropdownWidth });
        }
      }
    }
  }, [isOpen, buttonRef, isMobile]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className={`fixed z-[300] ${colors.bg} border rounded-lg shadow-xl p-4 overflow-y-auto`}
      style={{
        ...(position.bottom !== null ? { bottom: position.bottom } : { top: position.top }),
        left: position.left,
        width: `${position.width}px`,
        maxHeight: position.maxHeight,
      }}
    >
      {/* Font Size Slider */}
      <div>
        <div className={`text-xs mb-2 ${colors.label}`}>Font Size</div>
        <RetroSlider
          value={currentSliderValue}
          min={0}
          max={3}
          onChange={(v) => {
            const option = fontSizeOptions[v];
            if (option) setFontSize(option.value);
          }}
          displayValue={fontSizeOptions[currentSliderValue]?.label || ''}
        />
        <div className="flex justify-between mt-3 px-1">
          {[
            { size: 'small', px: '12px' },
            { size: 'medium', px: '16px' },
            { size: 'large', px: '20px' },
            { size: 'xlarge', px: '24px' },
          ].map(({ size, px }) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={`transition-colors ${fontSize === size ? colors.activeFontSize : colors.inactiveFontSize}`}
              style={{ fontWeight: fontSize === size ? 'bold' : 'normal', fontSize: px }}
            >
              A
            </button>
          ))}
        </div>
      </div>

      <div className={`my-3 border-t ${colors.divider}`} />

      {/* Font Family */}
      <div>
        <div className={`text-xs mb-2 ${colors.label}`}>Font Family</div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
          {fontFamilyOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFontFamily(option.value)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                fontFamily === option.value ? colors.activeFont : colors.inactiveFont
              }`}
              style={{ fontFamily: option.preview }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`my-3 border-t ${colors.divider}`} />

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

      <div className={`my-3 border-t ${colors.divider}`} />

      <RetroToggle checked={dyslexicSpacing} onChange={setDyslexicSpacing} label="Dyslexia-friendly spacing" />
    </div>
  );
};

export default FontSizeDropdown;
