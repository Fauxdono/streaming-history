"use client";

import { useTheme } from './themeprovider';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Label } from './ui/Typography';

/**
 * Settings Panel - Customize appearance
 * Font, size, colors, theme
 */
export default function SettingsPanel() {
  const {
    theme,
    toggleTheme,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    accentColor,
    setAccentColor,
  } = useTheme();

  const isDark = theme === 'dark';

  const fontOptions = [
    { value: 'sans', label: 'Sans-serif' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Monospace' },
    { value: 'comic', label: 'Comic' },
  ];

  const sizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'xlarge', label: 'X-Large' },
  ];

  const presetColors = [
    { value: '#3b82f6', label: 'Blue' },
    { value: '#ef4444', label: 'Red' },
    { value: '#10b981', label: 'Green' },
    { value: '#f59e0b', label: 'Orange' },
    { value: '#8b5cf6', label: 'Purple' },
    { value: '#ec4899', label: 'Pink' },
  ];

  return (
    <Card className="max-w-2xl mx-auto my-4">
      <CardHeader>
        <CardTitle>Appearance Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Theme Toggle */}
          <div>
            <Label className="block mb-2">Theme</Label>
            <Button onClick={toggleTheme} variant="default">
              {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </Button>
          </div>

          {/* Font Family */}
          <div>
            <Label htmlFor="font-family" className="block mb-2">
              Font Family
            </Label>
            <select
              id="font-family"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className={`border p-2 w-full ${
                isDark
                  ? 'bg-black border-[#4169E1] text-white'
                  : 'bg-white border-black text-black'
              }`}
            >
              {fontOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <Label htmlFor="font-size" className="block mb-2">
              Font Size
            </Label>
            <select
              id="font-size"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className={`border p-2 w-full ${
                isDark
                  ? 'bg-black border-[#4169E1] text-white'
                  : 'bg-white border-black text-black'
              }`}
            >
              {sizeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Accent Color */}
          <div>
            <Label className="block mb-2">Accent Color</Label>
            <div className="flex gap-2 flex-wrap mb-2">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setAccentColor(color.value)}
                  className={`w-12 h-12 border-2 ${
                    accentColor === color.value
                      ? 'border-[var(--accent-color)] scale-110'
                      : isDark
                      ? 'border-[#4169E1]'
                      : 'border-black'
                  } transition-transform`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="custom-color">Custom:</Label>
              <input
                id="custom-color"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-12 border cursor-pointer"
              />
              <span className="text-sm">{accentColor}</span>
            </div>
          </div>

          {/* Preview */}
          <div className={`border p-4 mt-4 ${isDark ? 'border-[#4169E1]' : 'border-black'}`}>
            <Label className="block mb-2">Preview</Label>
            <p className="mb-2">This is how your text will look.</p>
            <Button variant="accent" className="mb-2">
              Button with accent color
            </Button>
            <p className="text-sm">
              Font: {fontOptions.find((f) => f.value === fontFamily)?.label} |
              Size: {sizeOptions.find((s) => s.value === fontSize)?.label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
