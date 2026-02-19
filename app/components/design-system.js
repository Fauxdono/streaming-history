/**
 * MINIMAL DESIGN SYSTEM
 * Barebones aesthetic - simple, clean, functional
 */

/**
 * Get current theme-aware colors
 * Returns minimal color palette based on dark/light mode
 */
export const useDesignSystem = (isDarkMode) => {
  return {
    // Base colors
    bg: isDarkMode ? 'bg-black' : 'bg-white',
    fg: isDarkMode ? 'text-white' : 'text-black',
    border: isDarkMode ? 'border-[#4169E1]' : 'border-black',

    // Subtle backgrounds (for tables, cards)
    bgSubtle: isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]',

    // Accent color uses CSS variable
    accent: 'text-[var(--accent-color)]',
    accentBg: 'bg-[var(--accent-color)]',
    accentBorder: 'border-[var(--accent-color)]',

    // Border widths
    borderThin: 'border',
    borderThick: 'border-2',

    // Spacing scale (consistent across all components)
    spacing: {
      xs: 'p-1',
      sm: 'p-2',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8',
    },

    // Gap utilities
    gap: {
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
    },
  };
};

/**
 * Typography utilities
 * Simple text size scale
 */
export const typography = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
};

/**
 * Get button classes for minimal design
 */
export const getButtonClasses = (variant = 'default', isDarkMode = false) => {
  const base = 'px-4 py-2 border transition-colors cursor-pointer';

  const variants = {
    default: isDarkMode
      ? 'border-[#4169E1] text-white hover:bg-white hover:text-black'
      : 'border-black text-black hover:bg-black hover:text-white',

    accent: 'border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[var(--accent-color)] hover:text-white',

    ghost: isDarkMode
      ? 'border-transparent text-white hover:border-[#4169E1]'
      : 'border-transparent text-black hover:border-black',
  };

  return `${base} ${variants[variant] || variants.default}`;
};

/**
 * Get table classes for minimal design
 */
export const getTableClasses = (isDarkMode = false) => {
  return {
    table: `w-full border-collapse ${isDarkMode ? 'border-[#4169E1]' : 'border-black'}`,
    header: `border-b-2 text-left p-2 ${isDarkMode ? 'border-[#4169E1]' : 'border-black'}`,
    cell: 'border-b p-2',
    row: 'hover:bg-[var(--bg-subtle)] transition-colors',
  };
};

/**
 * Get card classes for minimal design
 */
export const getCardClasses = (isDarkMode = false) => {
  return `border p-4 ${isDarkMode ? 'border-[#4169E1] bg-black' : 'border-black bg-white'}`;
};
