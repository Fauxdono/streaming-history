"use client";

import { useTheme } from './themeprovider';
import { useRef } from 'react';

/**
 * Settings Panel - Customize appearance and analysis
 * Mode, font size, font family, analysis settings
 */
export default function SettingsPanel({ colorMode, setColorMode }) {
  const {
    theme,
    setTheme,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    minPlayDuration,
    setMinPlayDuration,
    skipFilter,
    setSkipFilter,
    fullListenOnly,
    setFullListenOnly,
    dyslexicSpacing,
    setDyslexicSpacing,
    skipEndThreshold,
    setSkipEndThreshold,
  } = useTheme();

  const isDark = theme === 'dark';
  const isColorful = colorMode === 'colorful';

  // Theme colors: gray for colorful mode, indigo for minimal
  const colors = isColorful
    ? {
        activeBtn: isDark ? 'bg-gray-600 text-white' : 'bg-gray-600 text-white',
        inactiveBtn: isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        activeFont: isDark ? 'bg-gray-600 text-white' : 'bg-gray-600 text-white',
        inactiveFont: isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700',
        activeFontSize: isDark ? 'text-gray-300' : 'text-gray-700',
        inactiveFontSize: isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600',
        label: isDark ? 'text-gray-400' : 'text-gray-500',
        text: isDark ? 'text-gray-300' : 'text-gray-700',
        divider: isDark ? 'border-gray-600' : 'border-gray-300',
        // Retro terminal colors
        termColor: isDark ? 'text-gray-300' : 'text-gray-700',
        termDim: isDark ? 'text-gray-600' : 'text-gray-300',
        termBg: isDark ? 'bg-gray-900' : 'bg-gray-50',
        termBorder: isDark ? 'border-gray-600' : 'border-gray-400',
        toggleOn: isDark ? 'bg-gray-600 border-gray-500' : 'bg-gray-600 border-gray-500',
        toggleOff: isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-200 border-gray-400',
        toggleText: isDark ? 'text-gray-200' : 'text-white',
        toggleTextOff: isDark ? 'text-gray-500' : 'text-gray-500',
      }
    : {
        activeBtn: isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700',
        inactiveBtn: isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        activeFont: isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700',
        inactiveFont: isDark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700',
        activeFontSize: isDark ? 'text-indigo-400' : 'text-indigo-600',
        inactiveFontSize: isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700',
        label: isDark ? 'text-gray-400' : 'text-gray-500',
        text: isDark ? 'text-gray-300' : 'text-gray-700',
        divider: isDark ? 'border-gray-600' : 'border-gray-200',
        // Retro terminal colors
        termColor: isDark ? 'text-[#4169E1]' : 'text-black',
        termDim: isDark ? 'text-gray-700' : 'text-gray-300',
        termBg: isDark ? 'bg-black' : 'bg-white',
        termBorder: isDark ? 'border-[#4169E1]' : 'border-black',
        toggleOn: isDark ? 'bg-[#4169E1] border-[#5a7ff5]' : 'bg-black border-gray-600',
        toggleOff: isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-200 border-gray-400',
        toggleText: isDark ? 'text-white' : 'text-white',
        toggleTextOff: isDark ? 'text-gray-500' : 'text-gray-500',
      };

  const fontSizeOptions = [
    { value: 'small', label: 'Small', sliderValue: 0 },
    { value: 'medium', label: 'Medium', sliderValue: 1 },
    { value: 'large', label: 'Large', sliderValue: 2 },
    { value: 'xlarge', label: 'Extra Large', sliderValue: 3 },
  ];

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
    { value: 'opendyslexic', label: 'OpenDyslexic', preview: 'var(--font-opendyslexic), OpenDyslexic, sans-serif' },
  ];

  const currentSliderValue = fontSizeOptions.find(opt => opt.value === fontSize)?.sliderValue ?? 1;

  const modeButtons = [
    { label: 'Light Minimal', theme: 'light', colorMode: 'minimal' },
    { label: 'Dark Minimal', theme: 'dark', colorMode: 'minimal' },
    { label: 'Light Colorful', theme: 'light', colorMode: 'colorful' },
    { label: 'Dark Colorful', theme: 'dark', colorMode: 'colorful' },
  ];

  const handleModeChange = (newTheme, newColorMode) => {
    setTheme(newTheme);
    setColorMode(newColorMode);
  };

  // Retro block slider component
  const RetroSlider = ({ value, min, max, onChange, displayValue }) => {
    const barRef = useRef(null);
    const blockCount = 20;
    const fraction = (value - min) / (max - min);
    const filledBlocks = Math.round(fraction * blockCount);
    const filled = '\u2588'.repeat(filledBlocks);
    const empty = '\u2591'.repeat(blockCount - filledBlocks);

    const handleClick = (e) => {
      const rect = barRef.current.getBoundingClientRect();
      const clickFraction = (e.clientX - rect.left) / rect.width;
      const newValue = Math.round(min + clickFraction * (max - min));
      onChange(Math.max(min, Math.min(max, newValue)));
    };

    const handleDrag = (e) => {
      if (e.buttons !== 1) return;
      handleClick(e);
    };

    return (
      <div className={`font-mono ${colors.termBg} border ${colors.termBorder} p-2 rounded-none`}>
        <div
          ref={barRef}
          className="text-[14px] leading-none tracking-tight cursor-pointer select-none"
          onClick={handleClick}
          onMouseMove={handleDrag}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            const rect = barRef.current.getBoundingClientRect();
            const fraction = (touch.clientX - rect.left) / rect.width;
            const newValue = Math.round(min + fraction * (max - min));
            onChange(Math.max(min, Math.min(max, newValue)));
          }}
        >
          <span className={colors.termColor}>{filled}</span>
          <span className={colors.termDim}>{empty}</span>
          <span className={`${colors.termColor} ml-2 text-[11px]`}>{displayValue}</span>
        </div>
      </div>
    );
  };

  // Retro toggle switch component
  const RetroToggle = ({ checked, onChange, label }) => {
    return (
      <label className="flex items-center justify-between cursor-pointer py-1">
        <span className={`text-sm ${colors.text}`}>{label}</span>
        <button
          onClick={() => onChange(!checked)}
          className={`font-mono text-[11px] px-0 py-0 rounded-none border-2 transition-colors select-none ${
            checked ? colors.toggleOn : colors.toggleOff
          }`}
          style={{ minWidth: '52px' }}
        >
          <div className="flex">
            <span className={`px-1.5 py-0.5 font-bold ${
              checked
                ? `${colors.toggleText}`
                : `${colors.toggleTextOff}`
            }`}>
              {checked ? '\u25A0 ON' : 'OFF \u25A0'}
            </span>
          </div>
        </button>
      </label>
    );
  };

  return (
    <div className="max-w-2xl mx-auto my-4 p-4">
      {/* Mode Section */}
      <div>
        <div className={`text-xs mb-2 ${colors.label}`}>
          Mode
        </div>
        <div className="grid grid-cols-2 gap-2">
          {modeButtons.map((btn) => {
            const isActive = theme === btn.theme && colorMode === btn.colorMode;
            return (
              <button
                key={btn.label}
                onClick={() => handleModeChange(btn.theme, btn.colorMode)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive ? colors.activeBtn : colors.inactiveBtn
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className={`my-4 border-t ${colors.divider}`}></div>

      {/* Font Size Section */}
      <div>
        <div className={`text-xs mb-2 ${colors.label}`}>
          Font Size
        </div>
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
              className={`transition-colors ${
                fontSize === size ? colors.activeFontSize : colors.inactiveFontSize
              }`}
              style={{
                fontWeight: fontSize === size ? 'bold' : 'normal',
                fontSize: px,
              }}
            >
              A
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={`my-4 border-t ${colors.divider}`}></div>

      {/* Font Family Section */}
      <div>
        <div className={`text-xs mb-2 ${colors.label}`}>
          Font Family
        </div>
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

      {/* Divider */}
      <div className={`my-4 border-t ${colors.divider}`}></div>

      {/* Analysis Settings */}
      <div>
        <div className={`text-xs mb-2 ${colors.label}`}>
          Minimum Play Duration
        </div>
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
        <div className={`text-xs mb-2 ${colors.label}`}>
          Skip Tolerance (near end)
        </div>
        <RetroSlider
          value={Math.round(skipEndThreshold / 1000)}
          min={0}
          max={60}
          onChange={(v) => setSkipEndThreshold(v * 1000)}
          displayValue={skipEndThreshold === 0 ? 'Off' : `${Math.round(skipEndThreshold / 1000)}s`}
        />
      </div>

      {/* Divider */}
      <div className={`my-4 border-t ${colors.divider}`}></div>

      {/* Toggle Settings */}
      <RetroToggle
        checked={skipFilter}
        onChange={setSkipFilter}
        label="Exclude skipped tracks"
      />

      <div className="mt-1">
        <RetroToggle
          checked={fullListenOnly}
          onChange={setFullListenOnly}
          label="Only count completed plays"
        />
      </div>

      {/* Divider */}
      <div className={`my-4 border-t ${colors.divider}`}></div>

      <RetroToggle
        checked={dyslexicSpacing}
        onChange={setDyslexicSpacing}
        label="Dyslexia-friendly spacing"
      />
    </div>
  );
}
