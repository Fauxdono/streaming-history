"use client";

import { useTheme } from '../themeprovider';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Skip defaults if className includes custom bg- or border- classes
  const hasCustomBg = className.includes('bg-');
  const hasCustomBorder = /border-(?!$)/.test(className);
  const defaultBg = hasCustomBg ? '' : (isDark ? 'bg-black' : 'bg-white');
  const defaultBorder = hasCustomBorder ? '' : (isDark ? 'border-[#4169E1]' : 'border-black');

  return (
    <div className={`border p-4 ${defaultBorder} ${defaultBg} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: CardProps) {
  return (
    <h2 className={`text-xl font-normal ${className}`}>
      {children}
    </h2>
  );
}

export function CardContent({ children, className = "" }: CardProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}
