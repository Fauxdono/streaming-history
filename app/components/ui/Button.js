"use client";

import { useTheme } from '../themeprovider';

/**
 * Minimal Button Component
 * Variants: default, accent, ghost
 */
export const Button = ({
  children,
  variant = 'default',
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getVariantClasses = () => {
    const base = 'px-4 py-2 border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      default: isDark
        ? 'border-white text-white hover:bg-white hover:text-black'
        : 'border-black text-black hover:bg-black hover:text-white',

      accent: 'border-[var(--accent-color)] text-[var(--accent-color)] hover:bg-[var(--accent-color)] hover:text-white',

      ghost: isDark
        ? 'border-transparent text-white hover:border-white'
        : 'border-transparent text-black hover:border-black',
    };

    return `${base} ${variants[variant] || variants.default}`;
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${getVariantClasses()} ${className}`}
    >
      {children}
    </button>
  );
};
