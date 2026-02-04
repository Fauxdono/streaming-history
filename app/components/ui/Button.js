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
    const base = 'px-3 py-1 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium';

    const variants = {
      default: 'bg-[var(--accent-color)] text-white hover:opacity-90',

      accent: 'bg-[var(--accent-color)] text-white hover:opacity-90',

      ghost: isDark
        ? 'bg-transparent text-white hover:bg-white/10'
        : 'bg-transparent text-black hover:bg-black/10',
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
