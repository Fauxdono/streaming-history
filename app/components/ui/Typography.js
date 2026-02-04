"use client";

/**
 * Minimal Typography Components
 * Simple text hierarchy
 */

export const Heading = ({ children, level = 1, className = '' }) => {
  const sizes = {
    1: 'text-3xl',
    2: 'text-2xl',
    3: 'text-xl',
    4: 'text-lg',
  };

  const Tag = `h${level}`;
  const sizeClass = sizes[level] || sizes[1];

  return (
    <Tag className={`font-normal ${sizeClass} ${className}`}>
      {children}
    </Tag>
  );
};

export const Text = ({ children, className = '', small = false }) => {
  return (
    <p className={`${small ? 'text-sm' : 'text-base'} ${className}`}>
      {children}
    </p>
  );
};

export const Label = ({ children, className = '', htmlFor }) => {
  return (
    <label htmlFor={htmlFor} className={`text-sm ${className}`}>
      {children}
    </label>
  );
};
