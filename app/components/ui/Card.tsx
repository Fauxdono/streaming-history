"use client";

import { useTheme } from '../themeprovider';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`border p-4 ${isDark ? 'border-white bg-black' : 'border-black bg-white'} ${className}`}>
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
