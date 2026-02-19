"use client";

import { useTheme } from '../themeprovider';

/**
 * Minimal Table Component
 * Simple, clean table with consistent styling
 */
export const Table = ({ children, className = '' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <table className={`w-full border-collapse ${isDark ? 'border-[#4169E1]' : 'border-black'} ${className}`}>
      {children}
    </table>
  );
};

export const TableHeader = ({ children }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <thead className={`border-b-2 ${isDark ? 'border-[#4169E1]' : 'border-black'}`}>
      {children}
    </thead>
  );
};

export const TableRow = ({ children, className = '' }) => {
  return (
    <tr className={`hover:bg-[var(--bg-subtle)] transition-colors ${className}`}>
      {children}
    </tr>
  );
};

export const TableHead = ({ children, className = '', align = 'left' }) => {
  return (
    <th className={`p-2 text-${align} font-normal ${className}`}>
      {children}
    </th>
  );
};

export const TableCell = ({ children, className = '', align = 'left' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <td className={`p-2 border-b text-${align} ${isDark ? 'border-white/20' : 'border-black/20'} ${className}`}>
      {children}
    </td>
  );
};

export const TableBody = ({ children }) => {
  return <tbody>{children}</tbody>;
};
