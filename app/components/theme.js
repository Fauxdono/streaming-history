// ---------------------------------------------------------------------------
// theme.js — the single source of truth for the app's design language.
//
// The "cakeculator" look: per-tab pastel palettes + skeuomorphic hard-offset
// "press" shadows (2px 2px 0 accent), with a black/white/royal-blue minimal
// mode. Dark mode inverts to deep accent shells with light accents.
//
// Phase 1 of the design-system refactor: the color maps that used to be
// copy-pasted into SpotifyAnalyzer, albumcard, CustomTrackRankings,
// TrackRankings, DialSelector, and useYearSelectorColors now live here,
// moved VERBATIM so visuals stay pixel-identical. Unifying their shapes
// is a later phase. (CalendarView still has its own bare-name map — it
// builds class names by string interpolation and needs its call sites
// rewritten before it can move here.)
//
// IMPORTANT: every Tailwind class in this file must be a LITERAL string.
// Tailwind's JIT scans source text for class names — classes assembled
// with template literals are invisible to it and get purged from the CSS.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Raw hex palettes (Tailwind shades) — for inline styles, SVG strokes,
// gradients. Used by DialSelector.
// ---------------------------------------------------------------------------

export const PALETTES = {
  pink:    { c50:'#fdf2f8', c100:'#fce7f3', c200:'#fbcfe8', c300:'#f9a8d4', c500:'#ec4899', c600:'#db2777', c700:'#be185d', c800:'#9d174d', c900:'#831843' },
  purple:  { c50:'#faf5ff', c100:'#f3e8ff', c200:'#e9d5ff', c300:'#d8b4fe', c500:'#a855f7', c600:'#9333ea', c700:'#7e22ce', c800:'#6b21a8', c900:'#581c87' },
  indigo:  { c50:'#eef2ff', c100:'#e0e7ff', c200:'#c7d2fe', c300:'#a5b4fc', c500:'#6366f1', c600:'#4f46e5', c700:'#4338ca', c800:'#3730a3', c900:'#312e81' },
  blue:    { c50:'#eff6ff', c100:'#dbeafe', c200:'#bfdbfe', c300:'#93c5fd', c500:'#3b82f6', c600:'#2563eb', c700:'#1d4ed8', c800:'#1e40af', c900:'#1e3a8a' },
  green:   { c50:'#f0fdf4', c100:'#dcfce7', c200:'#bbf7d0', c300:'#86efac', c500:'#22c55e', c600:'#16a34a', c700:'#15803d', c800:'#166534', c900:'#14532d' },
  yellow:  { c50:'#fefce8', c100:'#fef9c3', c200:'#fef08a', c300:'#fde047', c500:'#eab308', c600:'#ca8a04', c700:'#a16207', c800:'#854d0e', c900:'#713f12' },
  red:     { c50:'#fef2f2', c100:'#fee2e2', c200:'#fecaca', c300:'#fca5a5', c500:'#ef4444', c600:'#dc2626', c700:'#b91c1c', c800:'#991b1b', c900:'#7f1d1d' },
  orange:  { c50:'#fff7ed', c100:'#ffedd5', c200:'#fed7aa', c300:'#fdba74', c500:'#f97316', c600:'#ea580c', c700:'#c2410c', c800:'#9a3412', c900:'#7c2d12' },
  teal:    { c50:'#f0fdfa', c100:'#ccfbf1', c200:'#99f6e4', c300:'#5eead4', c500:'#14b8a6', c600:'#0d9488', c700:'#0f766e', c800:'#115e59', c900:'#134e4a' },
  cyan:    { c50:'#ecfeff', c100:'#cffafe', c200:'#a5f3fc', c300:'#67e8f9', c500:'#06b6d4', c600:'#0891b2', c700:'#0e7490', c800:'#155e75', c900:'#164e63' },
  emerald: { c50:'#ecfdf5', c100:'#d1fae5', c200:'#a7f3d0', c300:'#6ee7b7', c500:'#10b981', c600:'#059669', c700:'#047857', c800:'#065f46', c900:'#064e3b' },
  amber:   { c50:'#fffbeb', c100:'#fef3c7', c200:'#fde68a', c300:'#fcd34d', c500:'#f59e0b', c600:'#d97706', c700:'#b45309', c800:'#92400e', c900:'#78350f' },
  fuchsia: { c50:'#fdf4ff', c100:'#fae8ff', c200:'#f5d0fe', c300:'#f0abfc', c500:'#d946ef', c600:'#c026d3', c700:'#a21caf', c800:'#86198f', c900:'#701a75' },
  violet:  { c50:'#f5f3ff', c100:'#ede9fe', c200:'#ddd6fe', c300:'#c4b5fd', c500:'#8b5cf6', c600:'#7c3aed', c700:'#6d28d9', c800:'#5b21b6', c900:'#4c1d95' },
  rose:    { c50:'#fff1f2', c100:'#ffe4e6', c200:'#fecdd3', c300:'#fda4af', c500:'#f43f5e', c600:'#e11d48', c700:'#be123c', c800:'#9f1239', c900:'#881337' },
};

// ---------------------------------------------------------------------------
// Year-selector theme maps (moved verbatim from hooks/useYearSelectorColors.js).
// Tailwind class maps with dark: variants baked in; one entry per theme.
// ---------------------------------------------------------------------------

export const THEMES = {
  pink: {
    text:           'text-pink-700 dark:text-pink-300',
    textBold:       'text-pink-800 dark:text-pink-200',
    textActive:     'text-white',
    bgActive:       'bg-pink-500 dark:bg-pink-600',
    bgHover:        'hover:bg-pink-600/50 dark:hover:bg-pink-700/50',
    bgLight:        'bg-pink-50 dark:bg-pink-900',
    bgLighter:      'bg-pink-100 dark:bg-pink-900',
    bgMed:          'bg-pink-200 dark:bg-pink-800',
    bgDark:         'bg-pink-800 dark:bg-pink-900',
    sidebarBg:      'bg-pink-100 dark:bg-pink-900',
    border:         'border-pink-300 dark:border-pink-700',
    buttonBg:       'bg-pink-600 dark:bg-pink-700',
    buttonHover:    'hover:bg-pink-700 dark:hover:bg-pink-800',
    glowActive:     'shadow-[0_0_15px_rgba(236,72,153,0.7)]',
    toggleColorVar: '[--toggle-shadow:#be185d] dark:[--toggle-shadow:#f9a8d4]',
  },
  purple: {
    text:           'text-purple-700 dark:text-purple-300',
    textBold:       'text-purple-800 dark:text-purple-200',
    textActive:     'text-white',
    bgActive:       'bg-purple-500 dark:bg-purple-600',
    bgHover:        'hover:bg-purple-600/50 dark:hover:bg-purple-700/50',
    bgLight:        'bg-purple-50 dark:bg-purple-900',
    bgLighter:      'bg-purple-100 dark:bg-purple-900',
    bgMed:          'bg-purple-200 dark:bg-purple-800',
    bgDark:         'bg-purple-800 dark:bg-purple-900',
    sidebarBg:      'bg-purple-100 dark:bg-purple-900',
    border:         'border-purple-300 dark:border-purple-700',
    buttonBg:       'bg-purple-600 dark:bg-purple-700',
    buttonHover:    'hover:bg-purple-700 dark:hover:bg-purple-800',
    glowActive:     'shadow-[0_0_15px_rgba(168,85,247,0.7)]',
    toggleColorVar: '[--toggle-shadow:#7e22ce] dark:[--toggle-shadow:#d8b4fe]',
  },
  indigo: {
    text:           'text-indigo-700 dark:text-indigo-300',
    textBold:       'text-indigo-800 dark:text-indigo-200',
    textActive:     'text-white',
    bgActive:       'bg-indigo-500 dark:bg-indigo-600',
    bgHover:        'hover:bg-indigo-600/50 dark:hover:bg-indigo-700/50',
    bgLight:        'bg-indigo-50 dark:bg-indigo-900',
    bgLighter:      'bg-indigo-100 dark:bg-indigo-900',
    bgMed:          'bg-indigo-200 dark:bg-indigo-800',
    bgDark:         'bg-indigo-800 dark:bg-indigo-900',
    sidebarBg:      'bg-indigo-100 dark:bg-indigo-900',
    border:         'border-indigo-300 dark:border-indigo-700',
    buttonBg:       'bg-indigo-600 dark:bg-indigo-700',
    buttonHover:    'hover:bg-indigo-700 dark:hover:bg-indigo-800',
    glowActive:     'shadow-[0_0_15px_rgba(99,102,241,0.7)]',
    toggleColorVar: '[--toggle-shadow:#4338ca] dark:[--toggle-shadow:#a5b4fc]',
  },
  blue: {
    text:           'text-blue-700 dark:text-blue-300',
    textBold:       'text-blue-800 dark:text-blue-200',
    textActive:     'text-white',
    bgActive:       'bg-blue-500 dark:bg-blue-600',
    bgHover:        'hover:bg-blue-600/50 dark:hover:bg-blue-700/50',
    bgLight:        'bg-blue-50 dark:bg-blue-900',
    bgLighter:      'bg-blue-100 dark:bg-blue-900',
    bgMed:          'bg-blue-200 dark:bg-blue-800',
    bgDark:         'bg-blue-800 dark:bg-blue-900',
    sidebarBg:      'bg-blue-100 dark:bg-blue-900',
    border:         'border-blue-300 dark:border-blue-700',
    buttonBg:       'bg-blue-600 dark:bg-blue-700',
    buttonHover:    'hover:bg-blue-700 dark:hover:bg-blue-800',
    glowActive:     'shadow-[0_0_15px_rgba(59,130,246,0.7)]',
    toggleColorVar: '[--toggle-shadow:#1d4ed8] dark:[--toggle-shadow:#93c5fd]',
  },
  green: {
    text:           'text-green-700 dark:text-green-300',
    textBold:       'text-green-800 dark:text-green-200',
    textActive:     'text-white',
    bgActive:       'bg-green-500 dark:bg-green-600',
    bgHover:        'hover:bg-green-600/50 dark:hover:bg-green-700/50',
    bgLight:        'bg-green-50 dark:bg-green-900',
    bgLighter:      'bg-green-100 dark:bg-green-900',
    bgMed:          'bg-green-200 dark:bg-green-800',
    bgDark:         'bg-green-800 dark:bg-green-900',
    sidebarBg:      'bg-green-100 dark:bg-green-900',
    border:         'border-green-300 dark:border-green-700',
    buttonBg:       'bg-green-600 dark:bg-green-700',
    buttonHover:    'hover:bg-green-700 dark:hover:bg-green-800',
    glowActive:     'shadow-[0_0_15px_rgba(34,197,94,0.7)]',
    toggleColorVar: '[--toggle-shadow:#15803d] dark:[--toggle-shadow:#86efac]',
  },
  yellow: {
    text:           'text-yellow-700 dark:text-yellow-300',
    textBold:       'text-yellow-800 dark:text-yellow-200',
    textActive:     'text-white',
    bgActive:       'bg-yellow-500 dark:bg-yellow-600',
    bgHover:        'hover:bg-yellow-600/50 dark:hover:bg-yellow-700/50',
    bgLight:        'bg-yellow-50 dark:bg-yellow-900',
    bgLighter:      'bg-yellow-100 dark:bg-yellow-900',
    bgMed:          'bg-yellow-200 dark:bg-yellow-800',
    bgDark:         'bg-yellow-700 dark:bg-yellow-900',
    sidebarBg:      'bg-yellow-100 dark:bg-yellow-900',
    border:         'border-yellow-300 dark:border-yellow-700',
    buttonBg:       'bg-yellow-500 dark:bg-yellow-700',
    buttonHover:    'hover:bg-yellow-400 dark:hover:bg-yellow-800',
    glowActive:     'shadow-[0_0_15px_rgba(234,179,8,0.7)]',
    toggleColorVar: '[--toggle-shadow:#a16207] dark:[--toggle-shadow:#fde047]',
  },
  red: {
    text:           'text-red-700 dark:text-red-300',
    textBold:       'text-red-800 dark:text-red-200',
    textActive:     'text-white',
    bgActive:       'bg-red-500 dark:bg-red-600',
    bgHover:        'hover:bg-red-600/50 dark:hover:bg-red-700/50',
    bgLight:        'bg-red-50 dark:bg-red-900',
    bgLighter:      'bg-red-100 dark:bg-red-900',
    bgMed:          'bg-red-200 dark:bg-red-800',
    bgDark:         'bg-red-800 dark:bg-red-900',
    sidebarBg:      'bg-red-100 dark:bg-red-900',
    border:         'border-red-300 dark:border-red-700',
    buttonBg:       'bg-red-600 dark:bg-red-700',
    buttonHover:    'hover:bg-red-700 dark:hover:bg-red-800',
    glowActive:     'shadow-[0_0_15px_rgba(239,68,68,0.7)]',
    toggleColorVar: '[--toggle-shadow:#b91c1c] dark:[--toggle-shadow:#fca5a5]',
  },
  orange: {
    text:           'text-orange-700 dark:text-orange-300',
    textBold:       'text-orange-800 dark:text-orange-200',
    textActive:     'text-white',
    bgActive:       'bg-orange-500 dark:bg-orange-600',
    bgHover:        'hover:bg-orange-600/50 dark:hover:bg-orange-700/50',
    bgLight:        'bg-orange-50 dark:bg-orange-900',
    bgLighter:      'bg-orange-100 dark:bg-orange-900',
    bgMed:          'bg-orange-200 dark:bg-orange-800',
    bgDark:         'bg-orange-800 dark:bg-orange-900',
    sidebarBg:      'bg-orange-100 dark:bg-orange-900',
    border:         'border-orange-300 dark:border-orange-700',
    buttonBg:       'bg-orange-600 dark:bg-orange-700',
    buttonHover:    'hover:bg-orange-700 dark:hover:bg-orange-800',
    glowActive:     'shadow-[0_0_15px_rgba(249,115,22,0.7)]',
    toggleColorVar: '[--toggle-shadow:#c2410c] dark:[--toggle-shadow:#fdba74]',
  },
  teal: {
    text:           'text-teal-700 dark:text-teal-300',
    textBold:       'text-teal-800 dark:text-teal-200',
    textActive:     'text-white',
    bgActive:       'bg-teal-500 dark:bg-teal-600',
    bgHover:        'hover:bg-teal-600/50 dark:hover:bg-teal-700/50',
    bgLight:        'bg-teal-50 dark:bg-teal-900',
    bgLighter:      'bg-teal-100 dark:bg-teal-900',
    bgMed:          'bg-teal-200 dark:bg-teal-800',
    bgDark:         'bg-teal-800 dark:bg-teal-900',
    sidebarBg:      'bg-teal-100 dark:bg-teal-900',
    border:         'border-teal-300 dark:border-teal-700',
    buttonBg:       'bg-teal-600 dark:bg-teal-700',
    buttonHover:    'hover:bg-teal-700 dark:hover:bg-teal-800',
    glowActive:     'shadow-[0_0_15px_rgba(20,184,166,0.7)]',
    toggleColorVar: '[--toggle-shadow:#0f766e] dark:[--toggle-shadow:#5eead4]',
  },
  cyan: {
    text:           'text-cyan-700 dark:text-cyan-300',
    textBold:       'text-cyan-800 dark:text-cyan-200',
    textActive:     'text-white',
    bgActive:       'bg-cyan-500 dark:bg-cyan-600',
    bgHover:        'hover:bg-cyan-600/50 dark:hover:bg-cyan-700/50',
    bgLight:        'bg-cyan-50 dark:bg-cyan-900',
    bgLighter:      'bg-cyan-100 dark:bg-cyan-900',
    bgMed:          'bg-cyan-200 dark:bg-cyan-800',
    bgDark:         'bg-cyan-800 dark:bg-cyan-900',
    sidebarBg:      'bg-cyan-100 dark:bg-cyan-900',
    border:         'border-cyan-300 dark:border-cyan-700',
    buttonBg:       'bg-cyan-600 dark:bg-cyan-700',
    buttonHover:    'hover:bg-cyan-700 dark:hover:bg-cyan-800',
    glowActive:     'shadow-[0_0_15px_rgba(6,182,212,0.7)]',
    toggleColorVar: '[--toggle-shadow:#0e7490] dark:[--toggle-shadow:#67e8f9]',
  },
  emerald: {
    text:           'text-emerald-700 dark:text-emerald-300',
    textBold:       'text-emerald-800 dark:text-emerald-200',
    textActive:     'text-white',
    bgActive:       'bg-emerald-500 dark:bg-emerald-600',
    bgHover:        'hover:bg-emerald-600/50 dark:hover:bg-emerald-700/50',
    bgLight:        'bg-emerald-50 dark:bg-emerald-900',
    bgLighter:      'bg-emerald-100 dark:bg-emerald-900',
    bgMed:          'bg-emerald-200 dark:bg-emerald-800',
    bgDark:         'bg-emerald-800 dark:bg-emerald-900',
    sidebarBg:      'bg-emerald-100 dark:bg-emerald-900',
    border:         'border-emerald-300 dark:border-emerald-700',
    buttonBg:       'bg-emerald-600 dark:bg-emerald-700',
    buttonHover:    'hover:bg-emerald-700 dark:hover:bg-emerald-800',
    glowActive:     'shadow-[0_0_15px_rgba(16,185,129,0.7)]',
    toggleColorVar: '[--toggle-shadow:#047857] dark:[--toggle-shadow:#6ee7b7]',
  },
  amber: {
    text:           'text-amber-700 dark:text-amber-300',
    textBold:       'text-amber-800 dark:text-amber-200',
    textActive:     'text-white',
    bgActive:       'bg-amber-500 dark:bg-amber-600',
    bgHover:        'hover:bg-amber-600/50 dark:hover:bg-amber-700/50',
    bgLight:        'bg-amber-50 dark:bg-amber-900',
    bgLighter:      'bg-amber-100 dark:bg-amber-900',
    bgMed:          'bg-amber-200 dark:bg-amber-800',
    bgDark:         'bg-amber-800 dark:bg-amber-900',
    sidebarBg:      'bg-amber-100 dark:bg-amber-900',
    border:         'border-amber-300 dark:border-amber-700',
    buttonBg:       'bg-amber-600 dark:bg-amber-700',
    buttonHover:    'hover:bg-amber-700 dark:hover:bg-amber-800',
    glowActive:     'shadow-[0_0_15px_rgba(245,158,11,0.7)]',
    toggleColorVar: '[--toggle-shadow:#b45309] dark:[--toggle-shadow:#fcd34d]',
  },
  fuchsia: {
    text:           'text-fuchsia-700 dark:text-fuchsia-300',
    textBold:       'text-fuchsia-800 dark:text-fuchsia-200',
    textActive:     'text-white',
    bgActive:       'bg-fuchsia-500 dark:bg-fuchsia-600',
    bgHover:        'hover:bg-fuchsia-600/50 dark:hover:bg-fuchsia-700/50',
    bgLight:        'bg-fuchsia-50 dark:bg-fuchsia-900',
    bgLighter:      'bg-fuchsia-100 dark:bg-fuchsia-900',
    bgMed:          'bg-fuchsia-200 dark:bg-fuchsia-800',
    bgDark:         'bg-fuchsia-800 dark:bg-fuchsia-900',
    sidebarBg:      'bg-fuchsia-100 dark:bg-fuchsia-900',
    border:         'border-fuchsia-300 dark:border-fuchsia-700',
    buttonBg:       'bg-fuchsia-600 dark:bg-fuchsia-700',
    buttonHover:    'hover:bg-fuchsia-700 dark:hover:bg-fuchsia-800',
    glowActive:     'shadow-[0_0_15px_rgba(217,70,239,0.7)]',
    toggleColorVar: '[--toggle-shadow:#a21caf] dark:[--toggle-shadow:#f0abfc]',
  },
  violet: {
    text:           'text-violet-700 dark:text-violet-300',
    textBold:       'text-violet-800 dark:text-violet-200',
    textActive:     'text-white',
    bgActive:       'bg-violet-500 dark:bg-violet-600',
    bgHover:        'hover:bg-violet-600/50 dark:hover:bg-violet-700/50',
    bgLight:        'bg-violet-50 dark:bg-violet-900',
    bgLighter:      'bg-violet-100 dark:bg-violet-900',
    bgMed:          'bg-violet-200 dark:bg-violet-800',
    bgDark:         'bg-violet-800 dark:bg-violet-900',
    sidebarBg:      'bg-violet-100 dark:bg-violet-900',
    border:         'border-violet-300 dark:border-violet-700',
    buttonBg:       'bg-violet-600 dark:bg-violet-700',
    buttonHover:    'hover:bg-violet-700 dark:hover:bg-violet-800',
    glowActive:     'shadow-[0_0_15px_rgba(139,92,246,0.7)]',
    toggleColorVar: '[--toggle-shadow:#6d28d9] dark:[--toggle-shadow:#c4b5fd]',
  },
  rose: {
    text:           'text-rose-700 dark:text-rose-300',
    textBold:       'text-rose-800 dark:text-rose-200',
    textActive:     'text-white',
    bgActive:       'bg-rose-500 dark:bg-rose-600',
    bgHover:        'hover:bg-rose-600/50 dark:hover:bg-rose-700/50',
    bgLight:        'bg-rose-50 dark:bg-rose-900',
    bgLighter:      'bg-rose-100 dark:bg-rose-900',
    bgMed:          'bg-rose-200 dark:bg-rose-800',
    bgDark:         'bg-rose-800 dark:bg-rose-900',
    sidebarBg:      'bg-rose-100 dark:bg-rose-900',
    border:         'border-rose-300 dark:border-rose-700',
    buttonBg:       'bg-rose-600 dark:bg-rose-700',
    buttonHover:    'hover:bg-rose-700 dark:hover:bg-rose-800',
    glowActive:     'shadow-[0_0_15px_rgba(244,63,94,0.7)]',
    toggleColorVar: '[--toggle-shadow:#be123c] dark:[--toggle-shadow:#fda4af]',
  },
};

export const MINIMAL = {
  text:           'text-black dark:text-white',
  textBold:       'text-black dark:text-white',
  textActive:     'text-white dark:text-black',
  bgActive:       'bg-black dark:bg-white',
  bgHover:        'hover:bg-gray-200 dark:hover:bg-gray-800',
  bgLight:        'bg-white dark:bg-black',
  bgLighter:      'bg-white dark:bg-black',
  bgMed:          'bg-gray-200 dark:bg-gray-800',
  bgDark:         'bg-black dark:bg-black',
  sidebarBg:      'bg-white dark:bg-black',
  border:         'border-black dark:border-[#4169E1]',
  buttonBg:       'bg-black dark:bg-white',
  buttonHover:    'hover:bg-gray-800 dark:hover:bg-gray-200',
  glowActive:     'shadow-[0_0_15px_rgba(0,0,0,0.3)] dark:shadow-[0_0_15px_rgba(65,105,225,0.4)]',
  toggleColorVar: '[--toggle-shadow:black] dark:[--toggle-shadow:#4169E1]',
};

// ---------------------------------------------------------------------------
// Tab colors (moved verbatim from SpotifyAnalyzer.getTabColors).
// Shape: { text, textLight, textDark, bg, bgCard, border, borderHover, wrapper }
// ---------------------------------------------------------------------------

const TAB_TEXT = (isDarkMode) => ({
  blue:    { text: isDarkMode ? 'text-blue-300' : 'text-blue-700',       textLight: isDarkMode ? 'text-blue-400' : 'text-blue-600',       textDark: isDarkMode ? 'text-blue-200' : 'text-blue-800' },
  cyan:    { text: isDarkMode ? 'text-cyan-300' : 'text-cyan-700',       textLight: isDarkMode ? 'text-cyan-400' : 'text-cyan-600',       textDark: isDarkMode ? 'text-cyan-200' : 'text-cyan-800' },
  green:   { text: isDarkMode ? 'text-green-300' : 'text-green-700',     textLight: isDarkMode ? 'text-green-400' : 'text-green-600',     textDark: isDarkMode ? 'text-green-200' : 'text-green-800' },
  amber:   { text: isDarkMode ? 'text-amber-300' : 'text-amber-700',     textLight: isDarkMode ? 'text-amber-400' : 'text-amber-600',     textDark: isDarkMode ? 'text-amber-200' : 'text-amber-800' },
  yellow:  { text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700',   textLight: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',   textDark: isDarkMode ? 'text-yellow-200' : 'text-yellow-800' },
  orange:  { text: isDarkMode ? 'text-orange-300' : 'text-orange-700',   textLight: isDarkMode ? 'text-orange-400' : 'text-orange-600',   textDark: isDarkMode ? 'text-orange-200' : 'text-orange-800' },
  red:     { text: isDarkMode ? 'text-red-400' : 'text-red-800',         textLight: isDarkMode ? 'text-red-500' : 'text-red-700',         textDark: isDarkMode ? 'text-red-300' : 'text-red-900' },
  indigo:  { text: isDarkMode ? 'text-indigo-300' : 'text-indigo-700',   textLight: isDarkMode ? 'text-indigo-400' : 'text-indigo-600',   textDark: isDarkMode ? 'text-indigo-200' : 'text-indigo-800' },
  emerald: { text: isDarkMode ? 'text-emerald-300' : 'text-emerald-700', textLight: isDarkMode ? 'text-emerald-400' : 'text-emerald-600', textDark: isDarkMode ? 'text-emerald-200' : 'text-emerald-800' },
  violet:  { text: isDarkMode ? 'text-violet-300' : 'text-violet-700',   textLight: isDarkMode ? 'text-violet-400' : 'text-violet-600',   textDark: isDarkMode ? 'text-violet-200' : 'text-violet-800' },
  rose:    { text: isDarkMode ? 'text-rose-300' : 'text-rose-700',       textLight: isDarkMode ? 'text-rose-400' : 'text-rose-600',       textDark: isDarkMode ? 'text-rose-200' : 'text-rose-800' },
});

const TAB_BG = (isDarkMode) => ({
  blue:    { bg: isDarkMode ? 'bg-black' : 'bg-blue-50',    bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-blue-700' : 'border-blue-200',       borderHover: isDarkMode ? 'border-blue-500' : 'border-blue-400',       wrapper: isDarkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-100 border-[var(--border)]' },
  cyan:    { bg: isDarkMode ? 'bg-black' : 'bg-cyan-50',    bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-cyan-700' : 'border-cyan-200',       borderHover: isDarkMode ? 'border-cyan-500' : 'border-cyan-400',       wrapper: isDarkMode ? 'bg-cyan-900 border-cyan-800' : 'bg-cyan-100 border-[var(--border)]' },
  green:   { bg: isDarkMode ? 'bg-black' : 'bg-green-50',   bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-green-700' : 'border-green-200',     borderHover: isDarkMode ? 'border-green-500' : 'border-green-400',     wrapper: isDarkMode ? 'bg-green-900 border-green-800' : 'bg-green-100 border-green-300' },
  amber:   { bg: isDarkMode ? 'bg-black' : 'bg-amber-50',   bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-amber-700' : 'border-amber-200',     borderHover: isDarkMode ? 'border-amber-500' : 'border-amber-400',     wrapper: isDarkMode ? 'bg-amber-900 border-amber-800' : 'bg-amber-100 border-amber-300' },
  yellow:  { bg: isDarkMode ? 'bg-black' : 'bg-yellow-50',  bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-yellow-700' : 'border-yellow-200',   borderHover: isDarkMode ? 'border-yellow-500' : 'border-yellow-400',   wrapper: isDarkMode ? 'bg-yellow-900 border-yellow-800' : 'bg-yellow-100 border-[var(--border)]' },
  orange:  { bg: isDarkMode ? 'bg-black' : 'bg-orange-50',  bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-orange-700' : 'border-orange-200',   borderHover: isDarkMode ? 'border-orange-500' : 'border-orange-400',   wrapper: isDarkMode ? 'bg-orange-900 border-orange-800' : 'bg-orange-100 border-orange-300' },
  red:     { bg: isDarkMode ? 'bg-black' : 'bg-red-50',     bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-red-700' : 'border-red-200',         borderHover: isDarkMode ? 'border-red-500' : 'border-red-400',         wrapper: isDarkMode ? 'bg-red-900 border-red-800' : 'bg-red-100 border-[var(--border)]' },
  indigo:  { bg: isDarkMode ? 'bg-black' : 'bg-indigo-50',  bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-indigo-700' : 'border-indigo-200',   borderHover: isDarkMode ? 'border-indigo-500' : 'border-indigo-400',   wrapper: isDarkMode ? 'bg-indigo-900 border-indigo-800' : 'bg-indigo-100 border-indigo-300' },
  emerald: { bg: isDarkMode ? 'bg-black' : 'bg-emerald-50', bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-emerald-700' : 'border-emerald-200', borderHover: isDarkMode ? 'border-emerald-500' : 'border-emerald-400', wrapper: isDarkMode ? 'bg-emerald-900 border-emerald-800' : 'bg-emerald-100 border-[var(--border)]' },
  violet:  { bg: isDarkMode ? 'bg-black' : 'bg-violet-50',  bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-violet-700' : 'border-violet-200',   borderHover: isDarkMode ? 'border-violet-500' : 'border-violet-400',   wrapper: isDarkMode ? 'bg-violet-900 border-violet-800' : 'bg-violet-100 border-violet-300' },
  rose:    { bg: isDarkMode ? 'bg-black' : 'bg-rose-50',    bgCard: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-rose-700' : 'border-rose-200',       borderHover: isDarkMode ? 'border-rose-500' : 'border-rose-400',       wrapper: isDarkMode ? 'bg-rose-900 border-rose-800' : 'bg-rose-100 border-rose-300' },
});

export function getTabColors(textTheme, backgroundTheme, isDarkMode) {
  const textColors = TAB_TEXT(isDarkMode);
  const backgroundColors = TAB_BG(isDarkMode);
  return {
    ...(textColors[textTheme] || textColors.blue),
    ...(backgroundColors[backgroundTheme] || backgroundColors.blue),
  };
}

// ---------------------------------------------------------------------------
// Album card colors (moved verbatim from albumcard.getThemedColors).
// Shape: { text, textLight, bg, border, bgLight, bgButton, bgStripe, bgHeader }
// ---------------------------------------------------------------------------

const ALBUM_TEXT = (isDarkMode) => ({
  cyan:    { text: isDarkMode ? 'text-cyan-300'    : 'text-cyan-700',    textLight: isDarkMode ? 'text-cyan-400'    : 'text-cyan-600' },
  blue:    { text: isDarkMode ? 'text-blue-300'    : 'text-blue-700',    textLight: isDarkMode ? 'text-blue-400'    : 'text-blue-600' },
  green:   { text: isDarkMode ? 'text-green-300'   : 'text-green-700',   textLight: isDarkMode ? 'text-green-400'   : 'text-green-600' },
  amber:   { text: isDarkMode ? 'text-amber-300'   : 'text-amber-700',   textLight: isDarkMode ? 'text-amber-400'   : 'text-amber-600' },
  orange:  { text: isDarkMode ? 'text-orange-300'  : 'text-orange-700',  textLight: isDarkMode ? 'text-orange-400'  : 'text-orange-600' },
  red:     { text: isDarkMode ? 'text-red-300'     : 'text-red-700',     textLight: isDarkMode ? 'text-red-400'     : 'text-red-600' },
  indigo:  { text: isDarkMode ? 'text-indigo-300'  : 'text-indigo-700',  textLight: isDarkMode ? 'text-indigo-400'  : 'text-indigo-600' },
  emerald: { text: isDarkMode ? 'text-emerald-300' : 'text-emerald-700', textLight: isDarkMode ? 'text-emerald-400' : 'text-emerald-600' },
});

const ALBUM_BG = (isDarkMode) => ({
  cyan:    { bg: isDarkMode ? 'bg-cyan-800'    : 'bg-cyan-100',    border: isDarkMode ? 'border-cyan-600'    : 'border-cyan-300',    bgLight: isDarkMode ? 'bg-cyan-900'    : 'bg-cyan-200',    bgButton: isDarkMode ? 'bg-cyan-700'    : 'bg-cyan-200',    bgStripe: isDarkMode ? 'bg-cyan-900'    : 'bg-cyan-200',    bgHeader: isDarkMode ? 'bg-cyan-700'    : 'bg-cyan-300' },
  blue:    { bg: isDarkMode ? 'bg-blue-800'    : 'bg-blue-100',    border: isDarkMode ? 'border-blue-600'    : 'border-blue-300',    bgLight: isDarkMode ? 'bg-blue-900'    : 'bg-blue-200',    bgButton: isDarkMode ? 'bg-blue-700'    : 'bg-blue-200',    bgStripe: isDarkMode ? 'bg-blue-900'    : 'bg-blue-200',    bgHeader: isDarkMode ? 'bg-blue-700'    : 'bg-blue-300' },
  green:   { bg: isDarkMode ? 'bg-green-800'   : 'bg-green-50',    border: isDarkMode ? 'border-green-600'   : 'border-green-300',   bgLight: isDarkMode ? 'bg-green-900'   : 'bg-green-100',   bgButton: isDarkMode ? 'bg-green-700'   : 'bg-green-100',   bgStripe: isDarkMode ? 'bg-green-900'   : 'bg-green-100',   bgHeader: isDarkMode ? 'bg-green-700'   : 'bg-green-200' },
  amber:   { bg: isDarkMode ? 'bg-amber-800'   : 'bg-amber-50',    border: isDarkMode ? 'border-amber-600'   : 'border-amber-300',   bgLight: isDarkMode ? 'bg-amber-900'   : 'bg-amber-100',   bgButton: isDarkMode ? 'bg-amber-700'   : 'bg-amber-100',   bgStripe: isDarkMode ? 'bg-amber-900'   : 'bg-amber-100',   bgHeader: isDarkMode ? 'bg-amber-700'   : 'bg-amber-200' },
  orange:  { bg: isDarkMode ? 'bg-orange-800'  : 'bg-orange-50',   border: isDarkMode ? 'border-orange-600'  : 'border-orange-300',  bgLight: isDarkMode ? 'bg-orange-900'  : 'bg-orange-100',  bgButton: isDarkMode ? 'bg-orange-700'  : 'bg-orange-100',  bgStripe: isDarkMode ? 'bg-orange-900'  : 'bg-orange-100',  bgHeader: isDarkMode ? 'bg-orange-700'  : 'bg-orange-200' },
  red:     { bg: isDarkMode ? 'bg-red-800'     : 'bg-red-50',      border: isDarkMode ? 'border-red-600'     : 'border-red-300',     bgLight: isDarkMode ? 'bg-red-900'     : 'bg-red-100',     bgButton: isDarkMode ? 'bg-red-700'     : 'bg-red-100',     bgStripe: isDarkMode ? 'bg-red-900'     : 'bg-red-100',     bgHeader: isDarkMode ? 'bg-red-700'     : 'bg-red-200' },
  indigo:  { bg: isDarkMode ? 'bg-indigo-800'  : 'bg-indigo-50',   border: isDarkMode ? 'border-indigo-600'  : 'border-indigo-300',  bgLight: isDarkMode ? 'bg-indigo-900'  : 'bg-indigo-100',  bgButton: isDarkMode ? 'bg-indigo-700'  : 'bg-indigo-100',  bgStripe: isDarkMode ? 'bg-indigo-900'  : 'bg-indigo-100',  bgHeader: isDarkMode ? 'bg-indigo-700'  : 'bg-indigo-200' },
  emerald: { bg: isDarkMode ? 'bg-emerald-800' : 'bg-emerald-50',  border: isDarkMode ? 'border-emerald-600' : 'border-emerald-300', bgLight: isDarkMode ? 'bg-emerald-900' : 'bg-emerald-100', bgButton: isDarkMode ? 'bg-emerald-700' : 'bg-emerald-100', bgStripe: isDarkMode ? 'bg-emerald-900' : 'bg-emerald-100', bgHeader: isDarkMode ? 'bg-emerald-700' : 'bg-emerald-200' },
});

export function getAlbumCardColors({ textTheme = 'cyan', backgroundTheme = 'cyan', isColorful, isDarkMode }) {
  if (!isColorful) {
    return {
      text: '',
      textLight: isDarkMode ? 'text-white' : 'text-black',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      border: isDarkMode ? 'border-[#4169E1]' : 'border-black',
      bgLight: isDarkMode ? 'bg-black' : 'bg-white',
      bgButton: isDarkMode ? 'bg-black border border-[#4169E1]' : 'bg-white border border-black',
      bgStripe: isDarkMode ? 'bg-black' : 'bg-white',
      bgHeader: isDarkMode ? 'bg-black' : 'bg-white',
    };
  }
  const texts = ALBUM_TEXT(isDarkMode);
  const bgs = ALBUM_BG(isDarkMode);
  return {
    ...(texts[textTheme] || texts.cyan),
    ...(bgs[backgroundTheme] || bgs.cyan),
  };
}

// ---------------------------------------------------------------------------
// Ranking list colors (moved verbatim from CustomTrackRankings:
// getFlexibleColors, getColors, getMinimalColors). Two-tone press-button
// design; emerald keeps its deeper light shades (200/100/300).
// ---------------------------------------------------------------------------

const RANKING_TEXT = (isDarkMode) => ({
  violet: {
    text: isDarkMode ? 'text-violet-300' : 'text-violet-700',
    textLight: isDarkMode ? 'text-violet-400' : 'text-violet-600',
    textLighter: 'text-violet-500',
    textDark: isDarkMode ? 'text-violet-200' : 'text-violet-800',
    hoverText: isDarkMode ? 'hover:text-violet-100' : 'hover:text-violet-200',
    placeholder: isDarkMode ? 'placeholder-violet-400' : 'placeholder-violet-600',
  },
  red: {
    text: isDarkMode ? 'text-red-300' : 'text-red-700',
    textLight: isDarkMode ? 'text-red-400' : 'text-red-600',
    textLighter: 'text-red-500',
    textDark: isDarkMode ? 'text-red-200' : 'text-red-800',
    hoverText: isDarkMode ? 'hover:text-red-100' : 'hover:text-red-200',
    placeholder: isDarkMode ? 'placeholder-red-400' : 'placeholder-red-600',
  },
  emerald: {
    text: isDarkMode ? 'text-emerald-300' : 'text-emerald-700',
    textLight: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
    textLighter: 'text-emerald-500',
    textDark: isDarkMode ? 'text-emerald-200' : 'text-emerald-800',
    hoverText: isDarkMode ? 'hover:text-emerald-100' : 'hover:text-emerald-200',
    placeholder: isDarkMode ? 'placeholder-emerald-400' : 'placeholder-emerald-600',
  },
  orange: {
    text: isDarkMode ? 'text-orange-300' : 'text-orange-700',
    textLight: isDarkMode ? 'text-orange-400' : 'text-orange-600',
    textLighter: 'text-orange-500',
    textDark: isDarkMode ? 'text-orange-200' : 'text-orange-800',
    hoverText: isDarkMode ? 'hover:text-orange-100' : 'hover:text-orange-200',
    placeholder: isDarkMode ? 'placeholder-orange-400' : 'placeholder-orange-600',
  },
});

// Full colorful blocks (text + backgrounds) per legacy colorTheme.
const RANKING_COLORFUL = (isDarkMode) => ({
  emerald: isDarkMode ? {
    text: 'text-emerald-300', textLight: 'text-emerald-400', textLighter: 'text-emerald-500', textDark: 'text-emerald-200',
    bg: 'bg-emerald-900', bgLight: 'bg-emerald-800', bgMed: 'bg-emerald-700',
    bgDark: 'bg-emerald-800 text-emerald-300 border border-emerald-600 shadow-[2px_2px_0_0_#059669]',
    bgDarkActive: 'bg-emerald-800 text-emerald-300 border border-emerald-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#059669]',
    bgDarkHover: 'hover:bg-emerald-700',
    border: 'border-emerald-600', borderDark: 'border-emerald-500',
    hoverBg: 'hover:bg-emerald-700', hoverBgDark: 'hover:bg-emerald-600',
    focusBorder: 'focus:border-emerald-500', focusRing: 'focus:ring-emerald-500',
    hoverText: 'hover:text-emerald-100',
  } : {
    text: 'text-emerald-700', textLight: 'text-emerald-600', textLighter: 'text-emerald-500', textDark: 'text-emerald-800',
    bg: 'bg-emerald-200', bgLight: 'bg-emerald-100', bgMed: 'bg-emerald-300',
    bgDark: 'bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-[2px_2px_0_0_#047857]',
    bgDarkActive: 'bg-emerald-100 text-emerald-700 border border-emerald-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#047857]',
    bgDarkHover: 'hover:bg-emerald-200',
    border: 'border-emerald-300', borderDark: 'border-emerald-700',
    hoverBg: 'hover:bg-emerald-200', hoverBgDark: 'hover:bg-emerald-900',
    focusBorder: 'focus:border-emerald-400', focusRing: 'focus:ring-emerald-400',
    hoverText: 'hover:text-emerald-200',
  },
  red: isDarkMode ? {
    text: 'text-red-300', textLight: 'text-red-400', textLighter: 'text-red-500', textDark: 'text-red-200',
    bg: 'bg-red-900', bgLight: 'bg-red-800', bgMed: 'bg-red-700',
    bgDark: 'bg-red-800 text-red-300 border border-red-600 shadow-[2px_2px_0_0_#dc2626]',
    bgDarkActive: 'bg-red-800 text-red-300 border border-red-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#dc2626]',
    bgDarkHover: 'hover:bg-red-700',
    border: 'border-red-600', borderDark: 'border-red-500',
    hoverBg: 'hover:bg-red-700', hoverBgDark: 'hover:bg-red-600',
    focusBorder: 'focus:border-red-500', focusRing: 'focus:ring-red-500',
    hoverText: 'hover:text-red-100',
  } : {
    text: 'text-red-700', textLight: 'text-red-600', textLighter: 'text-red-500', textDark: 'text-red-800',
    bg: 'bg-red-100', bgLight: 'bg-red-50', bgMed: 'bg-red-200',
    bgDark: 'bg-red-100 text-red-700 border border-red-300 shadow-[2px_2px_0_0_#b91c1c]',
    bgDarkActive: 'bg-red-100 text-red-700 border border-red-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#b91c1c]',
    bgDarkHover: 'hover:bg-red-200',
    border: 'border-red-300', borderDark: 'border-red-700',
    hoverBg: 'hover:bg-red-100', hoverBgDark: 'hover:bg-red-900',
    focusBorder: 'focus:border-red-400', focusRing: 'focus:ring-red-400',
    hoverText: 'hover:text-red-200',
  },
  violet: isDarkMode ? {
    text: 'text-violet-300', textLight: 'text-violet-400', textLighter: 'text-violet-500', textDark: 'text-violet-200',
    bg: 'bg-violet-900', bgLight: 'bg-violet-800', bgMed: 'bg-violet-700',
    bgDark: 'bg-violet-800 text-violet-300 border border-violet-600 shadow-[2px_2px_0_0_#7c3aed]',
    bgDarkActive: 'bg-violet-800 text-violet-300 border border-violet-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#7c3aed]',
    bgDarkHover: 'hover:bg-violet-700',
    border: 'border-violet-600', borderDark: 'border-violet-500',
    hoverBg: 'hover:bg-violet-700', hoverBgDark: 'hover:bg-violet-600',
    focusBorder: 'focus:border-violet-500', focusRing: 'focus:ring-violet-500',
    hoverText: 'hover:text-violet-100',
  } : {
    text: 'text-violet-700', textLight: 'text-violet-600', textLighter: 'text-violet-500', textDark: 'text-violet-800',
    bg: 'bg-violet-100', bgLight: 'bg-violet-50', bgMed: 'bg-violet-200',
    bgDark: 'bg-violet-100 text-violet-700 border border-violet-300 shadow-[2px_2px_0_0_#6d28d9]',
    bgDarkActive: 'bg-violet-100 text-violet-700 border border-violet-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#6d28d9]',
    bgDarkHover: 'hover:bg-violet-200',
    border: 'border-violet-300', borderDark: 'border-violet-700',
    hoverBg: 'hover:bg-violet-100', hoverBgDark: 'hover:bg-violet-900',
    focusBorder: 'focus:border-violet-400', focusRing: 'focus:ring-violet-400',
    hoverText: 'hover:text-violet-200',
  },
  orange: isDarkMode ? {
    text: 'text-orange-300', textLight: 'text-orange-400', textLighter: 'text-orange-500', textDark: 'text-orange-200',
    bg: 'bg-orange-900', bgLight: 'bg-orange-800', bgMed: 'bg-orange-700',
    bgDark: 'bg-orange-800 text-orange-300 border border-orange-600 shadow-[2px_2px_0_0_#ea580c]',
    bgDarkActive: 'bg-orange-800 text-orange-300 border border-orange-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#ea580c]',
    bgDarkHover: 'hover:bg-orange-700',
    border: 'border-orange-600', borderDark: 'border-orange-500',
    hoverBg: 'hover:bg-orange-700', hoverBgDark: 'hover:bg-orange-600',
    focusBorder: 'focus:border-orange-500', focusRing: 'focus:ring-orange-500',
    hoverText: 'hover:text-orange-100',
  } : {
    text: 'text-orange-700', textLight: 'text-orange-600', textLighter: 'text-orange-500', textDark: 'text-orange-800',
    bg: 'bg-orange-100', bgLight: 'bg-orange-50', bgMed: 'bg-orange-200',
    bgDark: 'bg-orange-100 text-orange-700 border border-orange-300 shadow-[2px_2px_0_0_#c2410c]',
    bgDarkActive: 'bg-orange-100 text-orange-700 border border-orange-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#c2410c]',
    bgDarkHover: 'hover:bg-orange-200',
    border: 'border-orange-300', borderDark: 'border-orange-700',
    hoverBg: 'hover:bg-orange-100', hoverBgDark: 'hover:bg-orange-900',
    focusBorder: 'focus:border-orange-400', focusRing: 'focus:ring-orange-400',
    hoverText: 'hover:text-orange-200',
  },
});

// Flexible-mode background-only blocks (from getFlexibleColors.backgroundColors).
// These differ from the legacy blocks in a few per-theme quirks, so they are
// preserved verbatim rather than derived.
const RANKING_FLEX_BG = (isDarkMode) => ({
  emerald: isDarkMode ? {
    bg: 'bg-emerald-900', bgLight: 'bg-emerald-800', bgMed: 'bg-emerald-700',
    bgDark: 'bg-emerald-800 text-emerald-300 border border-emerald-600 shadow-[2px_2px_0_0_#059669]',
    bgDarkActive: 'bg-emerald-800 text-emerald-300 border border-emerald-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#059669]',
    bgDarkHover: 'hover:bg-emerald-700',
    border: 'border-emerald-600', borderDark: 'border-emerald-500',
    hoverBg: 'hover:bg-emerald-700', hoverBgDark: 'hover:bg-emerald-600',
    focusBorder: 'focus:border-emerald-500', focusRing: 'focus:ring-emerald-500',
  } : {
    bg: 'bg-emerald-200', bgLight: 'bg-emerald-100', bgMed: 'bg-emerald-300',
    bgDark: 'bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-[2px_2px_0_0_#047857]',
    bgDarkActive: 'bg-emerald-100 text-emerald-700 border border-emerald-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#047857]',
    bgDarkHover: 'hover:bg-emerald-200',
    border: 'border-emerald-300', borderDark: 'border-emerald-700',
    hoverBg: 'hover:bg-emerald-200', hoverBgDark: 'hover:bg-emerald-900',
    focusBorder: 'focus:border-emerald-400', focusRing: 'focus:ring-emerald-400',
  },
  violet: {
    bg: isDarkMode ? 'bg-violet-900' : 'bg-violet-100',
    bgLight: isDarkMode ? 'bg-violet-800' : 'bg-violet-50',
    bgMed: isDarkMode ? 'bg-violet-700' : 'bg-violet-200',
    bgDark: isDarkMode ? 'bg-violet-800 text-violet-300 border border-violet-600 shadow-[2px_2px_0_0_#7c3aed]' : 'bg-violet-100 text-violet-700 border border-violet-300 shadow-[2px_2px_0_0_#6d28d9]',
    bgDarkActive: isDarkMode ? 'bg-violet-800 text-violet-300 border border-violet-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#7c3aed]' : 'bg-violet-100 text-violet-700 border border-violet-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#6d28d9]',
    bgDarkHover: isDarkMode ? 'hover:bg-violet-700' : 'hover:bg-violet-200',
    border: isDarkMode ? 'border-violet-600' : 'border-violet-300',
    borderDark: isDarkMode ? 'border-violet-400' : 'border-violet-700',
    hoverBg: isDarkMode ? 'hover:bg-violet-700' : 'hover:bg-violet-100',
    hoverBgDark: isDarkMode ? 'hover:bg-violet-600' : 'hover:bg-violet-900',
    focusBorder: 'focus:border-violet-400',
    focusRing: 'focus:ring-violet-400',
  },
  orange: {
    bg: isDarkMode ? 'bg-orange-900' : 'bg-orange-100',
    bgLight: isDarkMode ? 'bg-orange-800' : 'bg-orange-50',
    bgMed: isDarkMode ? 'bg-orange-700' : 'bg-orange-200',
    bgDark: isDarkMode ? 'bg-orange-800 text-orange-300 border border-orange-600 shadow-[2px_2px_0_0_#ea580c]' : 'bg-orange-100 text-orange-700 border border-orange-300 shadow-[2px_2px_0_0_#c2410c]',
    bgDarkActive: isDarkMode ? 'bg-orange-800 text-orange-300 border border-orange-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#ea580c]' : 'bg-orange-100 text-orange-700 border border-orange-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#c2410c]',
    bgDarkHover: isDarkMode ? 'hover:bg-orange-700' : 'hover:bg-orange-200',
    border: isDarkMode ? 'border-orange-600' : 'border-orange-300',
    borderDark: isDarkMode ? 'border-orange-400' : 'border-orange-700',
    hoverBg: isDarkMode ? 'hover:bg-orange-700' : 'hover:bg-orange-100',
    hoverBgDark: isDarkMode ? 'hover:bg-orange-600' : 'hover:bg-orange-900',
    focusBorder: 'focus:border-orange-400',
    focusRing: 'focus:ring-orange-400',
  },
});

const RANKING_MINIMAL = (isDarkMode) => ({
  text: isDarkMode ? 'text-white' : 'text-black',
  textLight: isDarkMode ? 'text-white' : 'text-black',
  textLighter: isDarkMode ? 'text-white' : 'text-black',
  textDark: isDarkMode ? 'text-white' : 'text-black',
  bg: isDarkMode ? 'bg-black' : 'bg-white',
  bgLight: isDarkMode ? 'bg-black' : 'bg-white',
  bgMed: isDarkMode ? 'bg-black' : 'bg-white',
  bgDark: isDarkMode ? 'bg-black text-white border border-[#4169E1] shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black shadow-[2px_2px_0_0_black]',
  bgDarkActive: isDarkMode ? 'bg-black text-white border border-[#4169E1] translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_black]',
  bgDarkHover: isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100',
  border: isDarkMode ? 'border-[#4169E1]' : 'border-black',
  borderDark: isDarkMode ? 'border-[#4169E1]' : 'border-black',
  hoverBg: isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-50',
  hoverBgDark: isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100',
  focusBorder: isDarkMode ? 'focus:border-[#4169E1]' : 'focus:border-black',
  focusRing: 'focus:ring-gray-400',
  hoverText: isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-700',
  placeholder: isDarkMode ? 'placeholder-gray-500' : 'placeholder-gray-400',
});

export function getRankingColors({ colorTheme = 'orange', textTheme, backgroundTheme, isColorful, isDarkMode }) {
  if (!isColorful) return RANKING_MINIMAL(isDarkMode);

  if (textTheme && backgroundTheme) {
    const texts = RANKING_TEXT(isDarkMode);
    const bgs = RANKING_FLEX_BG(isDarkMode);
    return {
      ...(texts[textTheme] || texts.orange),
      ...(bgs[backgroundTheme] || bgs.orange),
    };
  }

  const full = RANKING_COLORFUL(isDarkMode);
  return full[colorTheme] || full.orange;
}

// ---------------------------------------------------------------------------
// Obsessions / track rankings colors (moved verbatim from
// TrackRankings.getThemedColors).
// ---------------------------------------------------------------------------

const OBSESSION_TEXT = (isDarkMode) => ({
  rose:   { text: isDarkMode ? 'text-rose-300' : 'text-rose-700',     textLight: isDarkMode ? 'text-rose-400' : 'text-rose-600',     textLighter: 'text-rose-500',   textDark: isDarkMode ? 'text-rose-200' : 'text-rose-800' },
  blue:   { text: isDarkMode ? 'text-blue-300' : 'text-blue-700',     textLight: isDarkMode ? 'text-blue-400' : 'text-blue-600',     textLighter: 'text-blue-500',   textDark: isDarkMode ? 'text-blue-200' : 'text-blue-800' },
  red:    { text: isDarkMode ? 'text-red-300' : 'text-red-700',       textLight: isDarkMode ? 'text-red-400' : 'text-red-600',       textLighter: 'text-red-500',    textDark: isDarkMode ? 'text-red-200' : 'text-red-800' },
  amber:  { text: isDarkMode ? 'text-amber-300' : 'text-amber-700',   textLight: isDarkMode ? 'text-amber-400' : 'text-amber-600',   textLighter: 'text-amber-500',  textDark: isDarkMode ? 'text-amber-200' : 'text-amber-800' },
  yellow: { text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700', textLight: isDarkMode ? 'text-yellow-400' : 'text-yellow-600', textLighter: 'text-yellow-500', textDark: isDarkMode ? 'text-yellow-200' : 'text-yellow-800' },
});

const OBSESSION_BG = (isDarkMode) => ({
  red: {
    bg: isDarkMode ? 'bg-red-900' : 'bg-red-200', bgHover: isDarkMode ? 'hover:bg-red-800' : 'hover:bg-red-100',
    border: isDarkMode ? 'border-red-600' : 'border-red-300',
    borderHover: isDarkMode ? 'border-red-500' : 'border-red-400', bgLight: isDarkMode ? 'bg-red-800' : 'bg-red-100',
    bgButton: isDarkMode ? 'bg-red-700 text-red-100' : 'bg-red-200 text-red-800', bgButtonHover: isDarkMode ? 'hover:bg-red-600' : 'hover:bg-red-300',
    bgButtonLight: isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700', bgButtonLightHover: isDarkMode ? 'hover:bg-red-700' : 'hover:bg-red-200',
    bgSelected: isDarkMode ? 'bg-red-500 text-white' : 'bg-red-600 text-white', bgSelectedHover: isDarkMode ? 'hover:bg-red-400' : 'hover:bg-red-700',
    focusRing: 'focus:ring-red-400',
    focus: isDarkMode ? 'border-red-600 bg-red-800 text-red-100' : 'border-red-300 bg-red-100 text-red-800',
  },
  rose: {
    bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-rose-700' : 'border-rose-200',
    borderHover: isDarkMode ? 'border-rose-500' : 'border-rose-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-rose-50',
    bgButton: isDarkMode ? 'bg-gray-800' : 'bg-rose-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-rose-200',
    bgSelected: 'bg-rose-600', bgSelectedHover: 'hover:bg-rose-700',
    focusRing: 'focus:ring-rose-400',
  },
  blue: {
    bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-blue-700' : 'border-blue-200',
    borderHover: isDarkMode ? 'border-blue-500' : 'border-blue-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-blue-50',
    bgButton: isDarkMode ? 'bg-gray-800' : 'bg-blue-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-200',
    bgSelected: 'bg-blue-600', bgSelectedHover: 'hover:bg-blue-700',
    focusRing: 'focus:ring-blue-400',
  },
  amber: {
    bg: isDarkMode ? 'bg-black' : 'bg-white', border: isDarkMode ? 'border-amber-700' : 'border-amber-200',
    borderHover: isDarkMode ? 'border-amber-500' : 'border-amber-400', bgLight: isDarkMode ? 'bg-gray-900' : 'bg-amber-50',
    bgButton: isDarkMode ? 'bg-gray-800' : 'bg-amber-100', bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-amber-200',
    bgSelected: 'bg-amber-600', bgSelectedHover: 'hover:bg-amber-700',
    focusRing: 'focus:ring-amber-400',
  },
  yellow: {
    bg: isDarkMode ? 'bg-yellow-900' : 'bg-yellow-200',
    bgHover: isDarkMode ? 'hover:bg-yellow-700' : 'hover:bg-yellow-100',
    border: isDarkMode ? 'border-yellow-600' : 'border-yellow-300',
    borderHover: isDarkMode ? 'border-yellow-500' : 'border-yellow-400',
    bgLight: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100',
    bgButton: isDarkMode ? 'bg-yellow-800 border border-yellow-600 text-yellow-300' : 'bg-yellow-100 border border-yellow-300 text-yellow-700',
    bgButtonHover: isDarkMode ? 'hover:bg-yellow-700' : 'hover:bg-yellow-200',
    bgButtonLight: isDarkMode ? 'bg-yellow-800 border border-yellow-700 text-yellow-400' : 'bg-yellow-100 border border-yellow-400 text-yellow-600',
    bgButtonLightHover: isDarkMode ? 'hover:bg-yellow-700' : 'hover:bg-yellow-200',
    bgSelected: isDarkMode ? 'bg-yellow-600 text-black' : 'bg-yellow-500 text-black',
    bgSelectedHover: isDarkMode ? 'hover:bg-yellow-500' : 'hover:bg-yellow-600',
    focusRing: 'focus:ring-yellow-400',
    focus: isDarkMode ? 'border-yellow-600 bg-yellow-800 text-yellow-300' : 'border-yellow-300 bg-yellow-100 text-yellow-700',
  },
});

const OBSESSION_MINIMAL = (isDarkMode) => ({
  text: isDarkMode ? 'text-white' : 'text-black',
  textLight: isDarkMode ? 'text-gray-400' : 'text-gray-600',
  textLighter: 'text-gray-500',
  textDark: isDarkMode ? 'text-white' : 'text-black',
  bg: isDarkMode ? 'bg-black' : 'bg-white',
  bgHover: isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-50',
  border: isDarkMode ? 'border-[#4169E1]' : 'border-black',
  borderHover: isDarkMode ? 'border-gray-400' : 'border-gray-600',
  bgLight: isDarkMode ? 'bg-black' : 'bg-white',
  bgButton: isDarkMode ? 'bg-black border border-[#4169E1] text-white' : 'bg-white border border-black text-black',
  bgButtonHover: isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100',
  bgButtonLight: isDarkMode ? 'bg-black border border-gray-600 text-gray-300' : 'bg-white border border-gray-400 text-gray-600',
  bgButtonLightHover: isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100',
  bgSelected: isDarkMode ? 'bg-white text-black border border-[#4169E1]' : 'bg-black text-white border border-black',
  bgSelectedHover: isDarkMode ? 'hover:bg-gray-200' : 'hover:bg-gray-800',
  focusRing: 'focus:ring-gray-400',
  focus: isDarkMode ? 'border-[#4169E1] bg-black text-white' : 'border-black bg-white text-black',
});

export function getObsessionColors({ textTheme = 'rose', backgroundTheme = 'red', isColorful, isDarkMode }) {
  if (!isColorful) return OBSESSION_MINIMAL(isDarkMode);
  const texts = OBSESSION_TEXT(isDarkMode);
  const bgs = OBSESSION_BG(isDarkMode);
  return {
    ...(texts[textTheme] || texts.rose),
    ...(bgs[backgroundTheme] || bgs.red),
  };
}

// ---------------------------------------------------------------------------
// Analysis-page colors (Listening Patterns / Listening Behavior / Music
// Discovery). Phase A of the analysis-page redesign: the three pages used to
// carry near-identical hand-rolled color objects; they now share these maps.
// One accent per page: Patterns=yellow, Behavior=amber, Discovery=orange.
// Cards wear the app-wide 1px hard-offset shadow (buttons keep 2px).
// ---------------------------------------------------------------------------

const ANALYSIS_COLORFUL = (isDarkMode) => ({
  yellow: {
    text:           isDarkMode ? 'text-yellow-300' : 'text-yellow-700',
    textLight:      isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
    textLighter:    'text-yellow-500',
    bg:             isDarkMode ? 'bg-yellow-900' : 'bg-yellow-200',
    bgLight:        isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100',
    bgCard:         isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100',
    bgCardAlt:      isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100',
    border:         isDarkMode ? 'border-yellow-600' : 'border-yellow-300',
    borderLight:    isDarkMode ? 'border-yellow-600' : 'border-yellow-300',
    shadow:         isDarkMode ? 'shadow-[1px_1px_0_0_#ca8a04]' : 'shadow-[1px_1px_0_0_#a16207]',
    buttonActive:   isDarkMode ? 'bg-yellow-800 text-yellow-300 border border-yellow-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#ca8a04]' : 'bg-yellow-100 text-yellow-700 border border-yellow-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#a16207]',
    buttonInactive: isDarkMode ? 'bg-yellow-800 text-yellow-300 border border-yellow-600 hover:bg-yellow-700 shadow-[2px_2px_0_0_#ca8a04]' : 'bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200 shadow-[2px_2px_0_0_#a16207]',
    toggleBg:       isDarkMode ? 'bg-yellow-800' : 'bg-yellow-100',
    toggleActive:   isDarkMode ? 'bg-yellow-500 text-black' : 'bg-yellow-600 text-white',
    toggleInactive: isDarkMode ? 'text-yellow-300 hover:bg-yellow-700' : 'text-yellow-700 hover:bg-yellow-200',
    input:          isDarkMode ? 'border-yellow-600 bg-yellow-800' : 'border-yellow-300 bg-yellow-100',
  },
  amber: {
    text:           isDarkMode ? 'text-amber-300' : 'text-amber-700',
    textLight:      isDarkMode ? 'text-amber-400' : 'text-amber-600',
    textLighter:    'text-amber-500',
    bg:             isDarkMode ? 'bg-amber-900' : 'bg-amber-200',
    bgLight:        isDarkMode ? 'bg-amber-800' : 'bg-amber-100',
    bgCard:         isDarkMode ? 'bg-amber-800' : 'bg-amber-100',
    bgCardAlt:      isDarkMode ? 'bg-amber-800' : 'bg-amber-100',
    border:         isDarkMode ? 'border-amber-600' : 'border-amber-300',
    borderLight:    isDarkMode ? 'border-amber-600' : 'border-amber-300',
    shadow:         isDarkMode ? 'shadow-[1px_1px_0_0_#d97706]' : 'shadow-[1px_1px_0_0_#b45309]',
    buttonActive:   isDarkMode ? 'bg-amber-800 text-amber-300 border border-amber-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#d97706]' : 'bg-amber-100 text-amber-700 border border-amber-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#b45309]',
    buttonInactive: isDarkMode ? 'bg-amber-800 text-amber-300 border border-amber-600 hover:bg-amber-700 shadow-[2px_2px_0_0_#d97706]' : 'bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 shadow-[2px_2px_0_0_#b45309]',
    toggleBg:       isDarkMode ? 'bg-amber-800' : 'bg-amber-100',
    toggleActive:   isDarkMode ? 'bg-amber-500 text-black' : 'bg-amber-600 text-white',
    toggleInactive: isDarkMode ? 'text-amber-300 hover:bg-amber-700' : 'text-amber-700 hover:bg-amber-200',
    input:          isDarkMode ? 'border-amber-600 bg-amber-800' : 'border-amber-300 bg-amber-100',
  },
  orange: {
    text:           isDarkMode ? 'text-orange-300' : 'text-orange-700',
    textLight:      isDarkMode ? 'text-orange-400' : 'text-orange-600',
    textLighter:    'text-orange-500',
    bg:             isDarkMode ? 'bg-orange-900' : 'bg-orange-200',
    bgLight:        isDarkMode ? 'bg-orange-800' : 'bg-orange-100',
    bgCard:         isDarkMode ? 'bg-orange-800' : 'bg-orange-100',
    bgCardAlt:      isDarkMode ? 'bg-orange-800' : 'bg-orange-100',
    border:         isDarkMode ? 'border-orange-600' : 'border-orange-300',
    borderLight:    isDarkMode ? 'border-orange-600' : 'border-orange-300',
    shadow:         isDarkMode ? 'shadow-[1px_1px_0_0_#ea580c]' : 'shadow-[1px_1px_0_0_#c2410c]',
    buttonActive:   isDarkMode ? 'bg-orange-800 text-orange-300 border border-orange-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#ea580c]' : 'bg-orange-100 text-orange-700 border border-orange-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#c2410c]',
    buttonInactive: isDarkMode ? 'bg-orange-800 text-orange-300 border border-orange-600 hover:bg-orange-700 shadow-[2px_2px_0_0_#ea580c]' : 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200 shadow-[2px_2px_0_0_#c2410c]',
    toggleBg:       isDarkMode ? 'bg-orange-800' : 'bg-orange-100',
    toggleActive:   isDarkMode ? 'bg-orange-500 text-black' : 'bg-orange-600 text-white',
    toggleInactive: isDarkMode ? 'text-orange-300 hover:bg-orange-700' : 'text-orange-700 hover:bg-orange-200',
    input:          isDarkMode ? 'border-orange-600 bg-orange-800' : 'border-orange-300 bg-orange-100',
  },
  green: {
    text:           isDarkMode ? 'text-green-300' : 'text-green-700',
    textLight:      isDarkMode ? 'text-green-400' : 'text-green-600',
    textLighter:    'text-green-500',
    bg:             isDarkMode ? 'bg-green-900' : 'bg-green-200',
    bgLight:        isDarkMode ? 'bg-green-800' : 'bg-green-100',
    bgCard:         isDarkMode ? 'bg-green-800' : 'bg-green-100',
    bgCardAlt:      isDarkMode ? 'bg-green-800' : 'bg-green-100',
    border:         isDarkMode ? 'border-green-600' : 'border-green-300',
    borderLight:    isDarkMode ? 'border-green-600' : 'border-green-300',
    shadow:         isDarkMode ? 'shadow-[1px_1px_0_0_#16a34a]' : 'shadow-[1px_1px_0_0_#15803d]',
    buttonActive:   isDarkMode ? 'bg-green-800 text-green-300 border border-green-600 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#16a34a]' : 'bg-green-100 text-green-700 border border-green-300 translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#15803d]',
    buttonInactive: isDarkMode ? 'bg-green-800 text-green-300 border border-green-600 hover:bg-green-700 shadow-[2px_2px_0_0_#16a34a]' : 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 shadow-[2px_2px_0_0_#15803d]',
    toggleBg:       isDarkMode ? 'bg-green-800' : 'bg-green-100',
    toggleActive:   isDarkMode ? 'bg-green-500 text-black' : 'bg-green-600 text-white',
    toggleInactive: isDarkMode ? 'text-green-300 hover:bg-green-700' : 'text-green-700 hover:bg-green-200',
    input:          isDarkMode ? 'border-green-600 bg-green-800' : 'border-green-300 bg-green-100',
  },
});

const ANALYSIS_MINIMAL = (isDarkMode) => ({
  text:           isDarkMode ? 'text-white' : 'text-black',
  textLight:      isDarkMode ? 'text-gray-400' : 'text-gray-600',
  textLighter:    'text-gray-500',
  bg:             isDarkMode ? 'bg-black' : 'bg-white',
  bgLight:        isDarkMode ? 'bg-black' : 'bg-white',
  bgCard:         isDarkMode ? 'bg-black' : 'bg-white',
  bgCardAlt:      isDarkMode ? 'bg-black' : 'bg-white',
  border:         isDarkMode ? 'border-[#4169E1]' : 'border-black',
  borderLight:    isDarkMode ? 'border-[#4169E1]' : 'border-black',
  shadow:         isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]',
  buttonActive:   isDarkMode ? 'bg-black text-white border border-[#4169E1] translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_black]',
  buttonInactive: isDarkMode ? 'bg-black text-white border border-[#4169E1] hover:bg-gray-900 shadow-[2px_2px_0_0_#4169E1]' : 'bg-white text-black border border-black hover:bg-gray-100 shadow-[2px_2px_0_0_black]',
  toggleBg:       isDarkMode ? 'bg-black' : 'bg-white',
  toggleActive:   isDarkMode ? 'bg-white text-black' : 'bg-black text-white',
  toggleInactive: isDarkMode ? 'text-white hover:bg-gray-900' : 'text-black hover:bg-gray-100',
  input:          isDarkMode ? 'border-[#4169E1] bg-black' : 'border-black bg-white',
});

export function getAnalysisPageColors(accent, isColorful, isDarkMode) {
  if (!isColorful) {
    const m = ANALYSIS_MINIMAL(isDarkMode);
    return { ...m, card: `rounded border ${m.bgCard} ${m.border} ${m.shadow}` };
  }
  const maps = ANALYSIS_COLORFUL(isDarkMode);
  const c = maps[accent] || maps.yellow;
  return { ...c, card: `rounded border ${c.bgCard} ${c.border} ${c.shadow}` };
}

// ---------------------------------------------------------------------------
// Analysis chart theme — raw hex values for recharts SVG props.
//
// Ordered categories (time periods, seasons, session-duration buckets) are
// colored with a sequential single-hue ramp (monotonic lightness, so it stays
// CVD-safe); pie slices are separated by a surface-colored stroke and carry
// direct % labels, which is the relief for the low-contrast light steps.
// ---------------------------------------------------------------------------

function analysisRamps(p, isDarkMode) {
  return isDarkMode
    ? { r4: [p.c200, p.c300, p.c500, p.c600], r5: [p.c100, p.c200, p.c300, p.c500, p.c600] }
    : { r4: [p.c800, p.c600, p.c500, p.c300], r5: [p.c900, p.c700, p.c500, p.c300, p.c200] };
}

const MINIMAL_RAMPS = (isDarkMode) => isDarkMode
  ? { r4: ['#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563'], r5: ['#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563'] }
  : { r4: ['#374151', '#4B5563', '#6B7280', '#9CA3AF'], r5: ['#374151', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB'] };

export function getAnalysisChartTheme(accent, isColorful, isDarkMode) {
  if (!isColorful) {
    const { r4, r5 } = MINIMAL_RAMPS(isDarkMode);
    return {
      ramp: (n) => (n >= 5 ? r5 : n === 4 ? r4 : n === 3 ? [r4[0], r4[1], r4[3]] : [r4[0], r4[2]]),
      series1: isDarkMode ? '#9CA3AF' : '#6B7280',
      series2: isDarkMode ? '#6B7280' : '#9CA3AF',
      grid:    isDarkMode ? '#374151' : '#e5e7eb',
      axis:    isDarkMode ? '#9CA3AF' : '#374151',
      legendText: isDarkMode ? '#ffffff' : '#000000',
      pieStroke:  isDarkMode ? '#000000' : '#ffffff',
      tooltip: {
        backgroundColor: isDarkMode ? '#000000' : '#ffffff',
        border: `1px solid ${isDarkMode ? '#4169E1' : '#000000'}`,
        color: isDarkMode ? '#ffffff' : '#000000',
      },
    };
  }
  const p = PALETTES[accent] || PALETTES.yellow;
  const { r4, r5 } = analysisRamps(p, isDarkMode);
  return {
    ramp: (n) => (n >= 5 ? r5 : n === 4 ? r4 : n === 3 ? [r4[0], r4[1], r4[3]] : [r4[0], r4[2]]),
    series1: isDarkMode ? p.c300 : p.c700,
    series2: isDarkMode ? p.c600 : p.c500,
    grid:    isDarkMode ? p.c700 : p.c300,
    axis:    isDarkMode ? p.c200 : p.c800,
    legendText: isDarkMode ? p.c200 : p.c800,
    pieStroke:  isDarkMode ? p.c800 : p.c100,
    tooltip: {
      backgroundColor: isDarkMode ? p.c900 : p.c50,
      border: `1px solid ${isDarkMode ? p.c600 : p.c300}`,
      color: isDarkMode ? p.c100 : p.c900,
    },
  };
}

// ---------------------------------------------------------------------------
// Per-tab accent hexes (200-shade light / 900-shade dark). Single source for
// everything that tints iOS chrome: the theme-color meta, the settings bar's
// colorful background, and the status-bar safe-area strip.
// ---------------------------------------------------------------------------

export const TAB_ACCENT_HEX = {
  light: { upload: '#ddd6fe', stats: '#c7d2fe', artists: '#bfdbfe', albums: '#a5f3fc', custom: '#a7f3d0', tracks: '#fecaca', calendar: '#bbf7d0', patterns: '#fef08a', behavior: '#fde68a', discovery: '#fed7aa', podcasts: '#fecaca', playlists: '#fecdd3', updates: '#f5d0fe', data: '#bbf7d0' },
  dark:  { upload: '#4c1d95', stats: '#312e81', artists: '#1e3a8a', albums: '#164e63', custom: '#064e3b', tracks: '#7f1d1d', calendar: '#14532d', patterns: '#713f12', behavior: '#78350f', discovery: '#7c2d12', podcasts: '#7f1d1d', playlists: '#881337', updates: '#701a75', data: '#000000' },
};

// The color the iOS status-bar strip and Safari chrome should show right now.
export function getChromeTint(activeTab, isColorful, isDarkMode) {
  if (isColorful) {
    const accent = (isDarkMode ? TAB_ACCENT_HEX.dark : TAB_ACCENT_HEX.light)[activeTab];
    if (accent) return accent;
  }
  return isDarkMode ? '#000000' : '#ffffff';
}
