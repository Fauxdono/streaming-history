"use client";

import { useTheme } from './themeprovider';

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
  } = useTheme();

  const isDark = theme === 'dark';

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

  const handleSliderChange = (event) => {
    const value = parseInt(event.target.value);
    const option = fontSizeOptions[value];
    if (option) {
      setFontSize(option.value);
    }
  };

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

  return (
    <div className="max-w-2xl mx-auto my-4 p-4">
      {/* Mode Section */}
      <div>
        <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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
                  isActive
                    ? isDark
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-100 text-indigo-700'
                    : isDark
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className={`my-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}></div>

      {/* Font Size Section */}
      <div>
        <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Font Size
        </div>
        <input
          type="range"
          min="0"
          max="3"
          value={currentSliderValue}
          onChange={handleSliderChange}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider
            ${isDark ? 'bg-black' : 'bg-gray-200'}`}
          style={{
            background: isDark
              ? `linear-gradient(to right, #374151 0%, #374151 ${(currentSliderValue / 3) * 100}%, #6366f1 ${(currentSliderValue / 3) * 100}%, #6366f1 100%)`
              : `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${(currentSliderValue / 3) * 100}%, #4f46e5 ${(currentSliderValue / 3) * 100}%, #4f46e5 100%)`
          }}
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
                fontSize === size
                  ? isDark ? 'text-indigo-400' : 'text-indigo-600'
                  : isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
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
      <div className={`my-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}></div>

      {/* Font Family Section */}
      <div>
        <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Font Family
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
          {fontFamilyOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFontFamily(option.value)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                fontFamily === option.value
                  ? isDark
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-100 text-indigo-700'
                  : isDark
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-700'
              }`}
              style={{ fontFamily: option.preview }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className={`my-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}></div>

      {/* Analysis Settings */}
      <div>
        <div className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Minimum Play Duration
        </div>
        <input
          type="range"
          min="0"
          max="120"
          value={Math.round(minPlayDuration / 1000)}
          onChange={(e) => setMinPlayDuration(parseInt(e.target.value, 10) * 1000)}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer slider
            ${isDark ? 'bg-black' : 'bg-gray-200'}`}
          style={{
            background: isDark
              ? `linear-gradient(to right, #6366f1 0%, #6366f1 ${(Math.round(minPlayDuration / 1000) / 120) * 100}%, #374151 ${(Math.round(minPlayDuration / 1000) / 120) * 100}%, #374151 100%)`
              : `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(Math.round(minPlayDuration / 1000) / 120) * 100}%, #e5e7eb ${(Math.round(minPlayDuration / 1000) / 120) * 100}%, #e5e7eb 100%)`
          }}
        />
        <div className={`text-center text-sm mt-1 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          {Math.round(minPlayDuration / 1000)}s
        </div>
      </div>

      {/* Divider */}
      <div className={`my-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}></div>

      {/* Skip Filter Toggle */}
      <label className="flex items-center justify-between cursor-pointer py-1">
        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Exclude skipped tracks
        </span>
        <div className="relative">
          <input
            type="checkbox"
            checked={skipFilter}
            onChange={(e) => setSkipFilter(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${
            skipFilter
              ? 'bg-indigo-500'
              : isDark ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              skipFilter ? 'translate-x-5' : ''
            }`}></div>
          </div>
        </div>
      </label>

      {/* Full Listen Only Toggle */}
      <label className="flex items-center justify-between cursor-pointer py-1 mt-1">
        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Only count completed plays
        </span>
        <div className="relative">
          <input
            type="checkbox"
            checked={fullListenOnly}
            onChange={(e) => setFullListenOnly(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${
            fullListenOnly
              ? 'bg-indigo-500'
              : isDark ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              fullListenOnly ? 'translate-x-5' : ''
            }`}></div>
          </div>
        </div>
      </label>

      {/* Divider */}
      <div className={`my-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-200'}`}></div>

      {/* Dyslexic Spacing Toggle */}
      <label className="flex items-center justify-between cursor-pointer py-1">
        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Dyslexia-friendly spacing
        </span>
        <div className="relative">
          <input
            type="checkbox"
            checked={dyslexicSpacing}
            onChange={(e) => setDyslexicSpacing(e.target.checked)}
            className="sr-only"
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${
            dyslexicSpacing
              ? 'bg-indigo-500'
              : isDark ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              dyslexicSpacing ? 'translate-x-5' : ''
            }`}></div>
          </div>
        </div>
      </label>
    </div>
  );
}
