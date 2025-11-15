// Centralized theme utility functions for consistent color application across all components

export const getThemedColors = (colorTheme, isDarkMode, getColorblindAdjustedTheme = null) => {
  // Apply colorblind adjustments if available
  const adjustedTheme = getColorblindAdjustedTheme ? getColorblindAdjustedTheme(colorTheme) : colorTheme;
  
  const colorMap = {
    violet: {
      // Text colors
      text: isDarkMode ? 'text-violet-300' : 'text-violet-700',
      textLight: isDarkMode ? 'text-violet-400' : 'text-violet-600',
      textDark: isDarkMode ? 'text-violet-200' : 'text-violet-800',
      textVeryLight: isDarkMode ? 'text-violet-500' : 'text-violet-500',
      
      // Background colors
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-violet-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-violet-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-violet-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-violet-100',
      
      // Border colors
      border: isDarkMode ? 'border-violet-500' : 'border-violet-200',
      borderLight: isDarkMode ? 'border-violet-600' : 'border-violet-300',
      borderHover: isDarkMode ? 'border-violet-400' : 'border-violet-400',
      
      // Button colors
      bgButton: isDarkMode ? 'bg-violet-800' : 'bg-violet-600',
      bgButtonHover: isDarkMode ? 'hover:bg-violet-700' : 'hover:bg-violet-700',
      
      // Wrapper styles
      wrapper: isDarkMode ? 'bg-violet-900 border-violet-800' : 'bg-violet-100 border-violet-300'
    },
    
    indigo: {
      text: isDarkMode ? 'text-indigo-300' : 'text-indigo-700',
      textLight: isDarkMode ? 'text-indigo-400' : 'text-indigo-600',
      textDark: isDarkMode ? 'text-indigo-200' : 'text-indigo-800',
      textVeryLight: isDarkMode ? 'text-indigo-500' : 'text-indigo-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-indigo-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-indigo-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-indigo-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-indigo-100',
      border: isDarkMode ? 'border-indigo-500' : 'border-indigo-200',
      borderLight: isDarkMode ? 'border-indigo-600' : 'border-indigo-300',
      borderHover: isDarkMode ? 'border-indigo-400' : 'border-indigo-400',
      bgButton: isDarkMode ? 'bg-indigo-800' : 'bg-indigo-600',
      bgButtonHover: isDarkMode ? 'hover:bg-indigo-700' : 'hover:bg-indigo-700',
      wrapper: isDarkMode ? 'bg-indigo-900 border-indigo-800' : 'bg-indigo-100 border-indigo-300'
    },
    
    blue: {
      text: isDarkMode ? 'text-blue-300' : 'text-blue-700',
      textLight: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      textDark: isDarkMode ? 'text-blue-200' : 'text-blue-800',
      textVeryLight: isDarkMode ? 'text-blue-500' : 'text-blue-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-blue-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-blue-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-blue-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-blue-100',
      border: isDarkMode ? 'border-blue-500' : 'border-blue-200',
      borderLight: isDarkMode ? 'border-blue-600' : 'border-blue-300',
      borderHover: isDarkMode ? 'border-blue-400' : 'border-blue-400',
      bgButton: isDarkMode ? 'bg-blue-800' : 'bg-blue-600',
      bgButtonHover: isDarkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-700',
      wrapper: isDarkMode ? 'bg-blue-900 border-blue-800' : 'bg-blue-100 border-blue-300'
    },
    
    cyan: {
      text: isDarkMode ? 'text-cyan-300' : 'text-cyan-700',
      textLight: isDarkMode ? 'text-cyan-400' : 'text-cyan-600',
      textDark: isDarkMode ? 'text-cyan-200' : 'text-cyan-800',
      textVeryLight: isDarkMode ? 'text-cyan-500' : 'text-cyan-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-cyan-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-cyan-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-cyan-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-cyan-100',
      border: isDarkMode ? 'border-cyan-500' : 'border-cyan-200',
      borderLight: isDarkMode ? 'border-cyan-600' : 'border-cyan-300',
      borderHover: isDarkMode ? 'border-cyan-400' : 'border-cyan-400',
      bgButton: isDarkMode ? 'bg-cyan-800' : 'bg-cyan-600',
      bgButtonHover: isDarkMode ? 'hover:bg-cyan-700' : 'hover:bg-cyan-700',
      wrapper: isDarkMode ? 'bg-cyan-900 border-cyan-800' : 'bg-cyan-100 border-cyan-300'
    },
    
    emerald: {
      text: isDarkMode ? 'text-emerald-300' : 'text-emerald-700',
      textLight: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
      textDark: isDarkMode ? 'text-emerald-200' : 'text-emerald-800',
      textVeryLight: isDarkMode ? 'text-emerald-500' : 'text-emerald-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-emerald-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-emerald-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-emerald-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-emerald-100',
      border: isDarkMode ? 'border-emerald-500' : 'border-emerald-200',
      borderLight: isDarkMode ? 'border-emerald-600' : 'border-emerald-300',
      borderHover: isDarkMode ? 'border-emerald-400' : 'border-emerald-400',
      bgButton: isDarkMode ? 'bg-emerald-800' : 'bg-emerald-600',
      bgButtonHover: isDarkMode ? 'hover:bg-emerald-700' : 'hover:bg-emerald-700',
      wrapper: isDarkMode ? 'bg-emerald-900 border-emerald-800' : 'bg-emerald-100 border-emerald-300'
    },
    
    green: {
      text: isDarkMode ? 'text-green-300' : 'text-green-700',
      textLight: isDarkMode ? 'text-green-400' : 'text-green-600',
      textDark: isDarkMode ? 'text-green-200' : 'text-green-800',
      textVeryLight: isDarkMode ? 'text-green-500' : 'text-green-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-green-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-green-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-green-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-green-100',
      border: isDarkMode ? 'border-green-500' : 'border-green-200',
      borderLight: isDarkMode ? 'border-green-600' : 'border-green-300',
      borderHover: isDarkMode ? 'border-green-400' : 'border-green-400',
      bgButton: isDarkMode ? 'bg-green-800' : 'bg-green-600',
      bgButtonHover: isDarkMode ? 'hover:bg-green-700' : 'hover:bg-green-700',
      wrapper: isDarkMode ? 'bg-green-900 border-green-800' : 'bg-green-100 border-green-300'
    },
    
    yellow: {
      text: isDarkMode ? 'text-yellow-300' : 'text-yellow-700',
      textLight: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
      textDark: isDarkMode ? 'text-yellow-200' : 'text-yellow-800',
      textVeryLight: isDarkMode ? 'text-yellow-500' : 'text-yellow-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-yellow-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-yellow-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-yellow-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-yellow-100',
      border: isDarkMode ? 'border-yellow-500' : 'border-yellow-200',
      borderLight: isDarkMode ? 'border-yellow-600' : 'border-yellow-300',
      borderHover: isDarkMode ? 'border-yellow-400' : 'border-yellow-400',
      bgButton: isDarkMode ? 'bg-yellow-800' : 'bg-yellow-600',
      bgButtonHover: isDarkMode ? 'hover:bg-yellow-700' : 'hover:bg-yellow-700',
      wrapper: isDarkMode ? 'bg-yellow-900 border-yellow-800' : 'bg-yellow-100 border-yellow-300'
    },
    
    amber: {
      text: isDarkMode ? 'text-amber-300' : 'text-amber-700',
      textLight: isDarkMode ? 'text-amber-400' : 'text-amber-600',
      textDark: isDarkMode ? 'text-amber-200' : 'text-amber-800',
      textVeryLight: isDarkMode ? 'text-amber-500' : 'text-amber-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-amber-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-amber-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-amber-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-amber-100',
      border: isDarkMode ? 'border-amber-500' : 'border-amber-200',
      borderLight: isDarkMode ? 'border-amber-600' : 'border-amber-300',
      borderHover: isDarkMode ? 'border-amber-400' : 'border-amber-400',
      bgButton: isDarkMode ? 'bg-amber-800' : 'bg-amber-600',
      bgButtonHover: isDarkMode ? 'hover:bg-amber-700' : 'hover:bg-amber-700',
      wrapper: isDarkMode ? 'bg-amber-900 border-amber-800' : 'bg-amber-100 border-amber-300'
    },
    
    orange: {
      text: isDarkMode ? 'text-orange-300' : 'text-orange-700',
      textLight: isDarkMode ? 'text-orange-400' : 'text-orange-600',
      textDark: isDarkMode ? 'text-orange-200' : 'text-orange-800',
      textVeryLight: isDarkMode ? 'text-orange-500' : 'text-orange-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-orange-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-orange-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-orange-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-orange-100',
      border: isDarkMode ? 'border-orange-500' : 'border-orange-200',
      borderLight: isDarkMode ? 'border-orange-600' : 'border-orange-300',
      borderHover: isDarkMode ? 'border-orange-400' : 'border-orange-400',
      bgButton: isDarkMode ? 'bg-orange-800' : 'bg-orange-600',
      bgButtonHover: isDarkMode ? 'hover:bg-orange-700' : 'hover:bg-orange-700',
      wrapper: isDarkMode ? 'bg-orange-900 border-orange-800' : 'bg-orange-100 border-orange-300'
    },
    
    red: {
      text: isDarkMode ? 'text-red-400' : 'text-red-800',
      textLight: isDarkMode ? 'text-red-500' : 'text-red-700',
      textDark: isDarkMode ? 'text-red-300' : 'text-red-900',
      textVeryLight: isDarkMode ? 'text-red-600' : 'text-red-600',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-red-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-red-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-red-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-red-100',
      border: isDarkMode ? 'border-red-500' : 'border-red-200',
      borderLight: isDarkMode ? 'border-red-600' : 'border-red-300',
      borderHover: isDarkMode ? 'border-red-400' : 'border-red-400',
      bgButton: isDarkMode ? 'bg-red-800' : 'bg-red-600',
      bgButtonHover: isDarkMode ? 'hover:bg-red-700' : 'hover:bg-red-700',
      wrapper: isDarkMode ? 'bg-red-900 border-red-800' : 'bg-red-100 border-red-300'
    },
    
    rose: {
      text: isDarkMode ? 'text-rose-300' : 'text-rose-700',
      textLight: isDarkMode ? 'text-rose-400' : 'text-rose-600',
      textDark: isDarkMode ? 'text-rose-200' : 'text-rose-800',
      textVeryLight: isDarkMode ? 'text-rose-500' : 'text-rose-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-rose-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-rose-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-rose-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-rose-100',
      border: isDarkMode ? 'border-rose-500' : 'border-rose-200',
      borderLight: isDarkMode ? 'border-rose-600' : 'border-rose-300',
      borderHover: isDarkMode ? 'border-rose-400' : 'border-rose-400',
      bgButton: isDarkMode ? 'bg-rose-800' : 'bg-rose-600',
      bgButtonHover: isDarkMode ? 'hover:bg-rose-700' : 'hover:bg-rose-700',
      wrapper: isDarkMode ? 'bg-rose-900 border-rose-800' : 'bg-rose-100 border-rose-300'
    },
    
    fuchsia: {
      text: isDarkMode ? 'text-fuchsia-300' : 'text-fuchsia-700',
      textLight: isDarkMode ? 'text-fuchsia-400' : 'text-fuchsia-600',
      textDark: isDarkMode ? 'text-fuchsia-200' : 'text-fuchsia-800',
      textVeryLight: isDarkMode ? 'text-fuchsia-500' : 'text-fuchsia-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-fuchsia-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-fuchsia-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-fuchsia-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-fuchsia-100',
      border: isDarkMode ? 'border-fuchsia-500' : 'border-fuchsia-200',
      borderLight: isDarkMode ? 'border-fuchsia-600' : 'border-fuchsia-300',
      borderHover: isDarkMode ? 'border-fuchsia-400' : 'border-fuchsia-400',
      bgButton: isDarkMode ? 'bg-fuchsia-800' : 'bg-fuchsia-600',
      bgButtonHover: isDarkMode ? 'hover:bg-fuchsia-700' : 'hover:bg-fuchsia-700',
      wrapper: isDarkMode ? 'bg-fuchsia-900 border-fuchsia-800' : 'bg-fuchsia-100 border-fuchsia-300'
    },
    
    purple: {
      text: isDarkMode ? 'text-purple-300' : 'text-purple-700',
      textLight: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      textDark: isDarkMode ? 'text-purple-200' : 'text-purple-800',
      textVeryLight: isDarkMode ? 'text-purple-500' : 'text-purple-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-purple-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-purple-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-purple-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-purple-100',
      border: isDarkMode ? 'border-purple-500' : 'border-purple-200',
      borderLight: isDarkMode ? 'border-purple-600' : 'border-purple-300',
      borderHover: isDarkMode ? 'border-purple-400' : 'border-purple-400',
      bgButton: isDarkMode ? 'bg-purple-800' : 'bg-purple-600',
      bgButtonHover: isDarkMode ? 'hover:bg-purple-700' : 'hover:bg-purple-700',
      wrapper: isDarkMode ? 'bg-purple-900 border-purple-800' : 'bg-purple-100 border-purple-300'
    },
    
    gray: {
      text: isDarkMode ? 'text-gray-300' : 'text-gray-700',
      textLight: isDarkMode ? 'text-gray-400' : 'text-gray-600',
      textDark: isDarkMode ? 'text-gray-200' : 'text-gray-800',
      textVeryLight: isDarkMode ? 'text-gray-500' : 'text-gray-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-gray-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-gray-100',
      border: isDarkMode ? 'border-gray-500' : 'border-gray-200',
      borderLight: isDarkMode ? 'border-gray-600' : 'border-gray-300',
      borderHover: isDarkMode ? 'border-gray-400' : 'border-gray-400',
      bgButton: isDarkMode ? 'bg-gray-800' : 'bg-gray-600',
      bgButtonHover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-700',
      wrapper: isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-300'
    },
    
    slate: {
      text: isDarkMode ? 'text-slate-300' : 'text-slate-700',
      textLight: isDarkMode ? 'text-slate-400' : 'text-slate-600',
      textDark: isDarkMode ? 'text-slate-200' : 'text-slate-800',
      textVeryLight: isDarkMode ? 'text-slate-500' : 'text-slate-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-slate-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-slate-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-slate-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-slate-100',
      border: isDarkMode ? 'border-slate-500' : 'border-slate-200',
      borderLight: isDarkMode ? 'border-slate-600' : 'border-slate-300',
      borderHover: isDarkMode ? 'border-slate-400' : 'border-slate-400',
      bgButton: isDarkMode ? 'bg-slate-800' : 'bg-slate-600',
      bgButtonHover: isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-700',
      wrapper: isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-300'
    },
    
    teal: {
      text: isDarkMode ? 'text-teal-300' : 'text-teal-700',
      textLight: isDarkMode ? 'text-teal-400' : 'text-teal-600',
      textDark: isDarkMode ? 'text-teal-200' : 'text-teal-800',
      textVeryLight: isDarkMode ? 'text-teal-500' : 'text-teal-500',
      bg: isDarkMode ? 'bg-black' : 'bg-white',
      bgLight: isDarkMode ? 'bg-gray-900' : 'bg-teal-50',
      bgMed: isDarkMode ? 'bg-gray-800' : 'bg-teal-100',
      bgStripe: isDarkMode ? 'bg-gray-900' : 'bg-teal-50',
      bgHeader: isDarkMode ? 'bg-gray-800' : 'bg-teal-100',
      border: isDarkMode ? 'border-teal-500' : 'border-teal-200',
      borderLight: isDarkMode ? 'border-teal-600' : 'border-teal-300',
      borderHover: isDarkMode ? 'border-teal-400' : 'border-teal-400',
      bgButton: isDarkMode ? 'bg-teal-800' : 'bg-teal-600',
      bgButtonHover: isDarkMode ? 'hover:bg-teal-700' : 'hover:bg-teal-700',
      wrapper: isDarkMode ? 'bg-teal-900 border-teal-800' : 'bg-teal-100 border-teal-300'
    }
  };
  
  return colorMap[adjustedTheme] || colorMap.blue;
};

// Helper function to get responsive padding classes
export const getResponsivePadding = (size = 'normal') => {
  switch (size) {
    case 'small':
      return 'p-2 sm:p-3';
    case 'large':
      return 'p-4 sm:p-6';
    case 'none':
      return '';
    default:
      return 'p-3 sm:p-4';
  }
};

// Helper function to get responsive text classes
export const getResponsiveText = (size = 'normal') => {
  switch (size) {
    case 'small':
      return 'text-sm';
    case 'large':
      return 'text-base sm:text-lg';
    case 'xlarge':
      return 'text-lg sm:text-xl';
    default:
      return 'text-sm sm:text-base';
  }
};