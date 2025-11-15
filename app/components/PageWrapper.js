"use client";

import React from 'react';
import { useTheme } from './themeprovider.js';

const PageWrapper = ({ 
  children,
  colorTheme = 'blue',
  backgroundTheme = null,
  textTheme = null,
  className = '',
  noPadding = false
}) => {
  const { theme, getColorblindAdjustedTheme } = useTheme() || {};
  const isDarkMode = theme === 'dark';
  
  // Apply colorblind adjustments to themes
  const adjustedTextTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(textTheme || colorTheme) : (textTheme || colorTheme);
  const adjustedBackgroundTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(backgroundTheme || colorTheme) : (backgroundTheme || colorTheme);
  
  // Get consistent wrapper styles based on theme
  const getWrapperStyles = () => {
    const baseStyles = noPadding ? 'rounded' : 'p-3 sm:p-4 rounded';
    
    if (isDarkMode) {
      return `${baseStyles} bg-black border border-gray-700`;
    }
    
    // Generate consistent background colors for light mode
    const backgroundColors = {
      violet: 'bg-violet-50 border-violet-200',
      indigo: 'bg-indigo-50 border-indigo-200', 
      blue: 'bg-blue-50 border-blue-200',
      cyan: 'bg-cyan-50 border-cyan-200',
      emerald: 'bg-emerald-50 border-emerald-200',
      green: 'bg-green-50 border-green-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      amber: 'bg-amber-50 border-amber-200',
      orange: 'bg-orange-50 border-orange-200',
      red: 'bg-red-50 border-red-200',
      rose: 'bg-rose-50 border-rose-200',
      fuchsia: 'bg-fuchsia-50 border-fuchsia-200',
      purple: 'bg-purple-50 border-purple-200',
      gray: 'bg-gray-50 border-gray-200',
      slate: 'bg-slate-50 border-slate-200',
      teal: 'bg-teal-50 border-teal-200'
    };
    
    const bgStyle = backgroundColors[adjustedBackgroundTheme] || backgroundColors.blue;
    return `${baseStyles} ${bgStyle} border-2`;
  };

  return (
    <div className={`${getWrapperStyles()} ${className}`}>
      {children}
    </div>
  );
};

export default PageWrapper;