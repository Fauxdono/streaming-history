"use client";

import React from 'react';
import { useTheme } from './themeprovider.js';

const PageHeader = ({ 
  title,
  subtitle = null,
  children = null,
  colorTheme = 'blue',
  textTheme = null,
  className = '',
  showDivider = true
}) => {
  const { theme, getColorblindAdjustedTheme } = useTheme() || {};
  const isDarkMode = theme === 'dark';
  
  // Apply colorblind adjustments to themes
  const adjustedTextTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(textTheme || colorTheme) : (textTheme || colorTheme);
  
  // Get consistent text styles based on theme
  const getTextStyles = () => {
    const textColors = {
      violet: isDarkMode ? 'text-violet-300' : 'text-violet-700',
      indigo: isDarkMode ? 'text-indigo-300' : 'text-indigo-700',
      blue: isDarkMode ? 'text-blue-300' : 'text-blue-700',
      cyan: isDarkMode ? 'text-cyan-300' : 'text-cyan-700',
      emerald: isDarkMode ? 'text-emerald-300' : 'text-emerald-700',
      green: isDarkMode ? 'text-green-300' : 'text-green-700',
      yellow: isDarkMode ? 'text-yellow-300' : 'text-yellow-700',
      amber: isDarkMode ? 'text-amber-300' : 'text-amber-700',
      orange: isDarkMode ? 'text-orange-300' : 'text-orange-700',
      red: isDarkMode ? 'text-red-400' : 'text-red-800',
      rose: isDarkMode ? 'text-rose-300' : 'text-rose-700',
      fuchsia: isDarkMode ? 'text-fuchsia-300' : 'text-fuchsia-700',
      purple: isDarkMode ? 'text-purple-300' : 'text-purple-700',
      gray: isDarkMode ? 'text-gray-300' : 'text-gray-700',
      slate: isDarkMode ? 'text-slate-300' : 'text-slate-700',
      teal: isDarkMode ? 'text-teal-300' : 'text-teal-700'
    };
    
    return textColors[adjustedTextTheme] || textColors.blue;
  };

  const getDividerStyles = () => {
    const dividerColors = {
      violet: isDarkMode ? 'border-violet-600' : 'border-violet-200',
      indigo: isDarkMode ? 'border-indigo-600' : 'border-indigo-200',
      blue: isDarkMode ? 'border-blue-600' : 'border-blue-200',
      cyan: isDarkMode ? 'border-cyan-600' : 'border-cyan-200',
      emerald: isDarkMode ? 'border-emerald-600' : 'border-emerald-200',
      green: isDarkMode ? 'border-green-600' : 'border-green-200',
      yellow: isDarkMode ? 'border-yellow-600' : 'border-yellow-200',
      amber: isDarkMode ? 'border-amber-600' : 'border-amber-200',
      orange: isDarkMode ? 'border-orange-600' : 'border-orange-200',
      red: isDarkMode ? 'border-red-600' : 'border-red-200',
      rose: isDarkMode ? 'border-rose-600' : 'border-rose-200',
      fuchsia: isDarkMode ? 'border-fuchsia-600' : 'border-fuchsia-200',
      purple: isDarkMode ? 'border-purple-600' : 'border-purple-200',
      gray: isDarkMode ? 'border-gray-600' : 'border-gray-200',
      slate: isDarkMode ? 'border-slate-600' : 'border-slate-200',
      teal: isDarkMode ? 'border-teal-600' : 'border-teal-200'
    };
    
    return dividerColors[adjustedTextTheme] || dividerColors.blue;
  };

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex-1">
          <h3 className={`font-bold text-lg sm:text-xl ${getTextStyles()}`}>
            {title}
          </h3>
          {subtitle && (
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex-shrink-0">
            {children}
          </div>
        )}
      </div>
      {showDivider && (
        <div className={`border-b ${getDividerStyles()}`} />
      )}
    </div>
  );
};

export default PageHeader;