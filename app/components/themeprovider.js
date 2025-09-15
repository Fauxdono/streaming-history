"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => null,
  toggleTheme: () => null,
  colorblindMode: "none", // "none", "protanopia", "deuteranopia", "tritanopia", "monochrome"
  setColorblindMode: () => null,
  cycleColorblindMode: () => null,
});

export const ThemeProvider = ({ children }) => {
  // Initialize theme to 'light' but will be updated based on system preference
  const [theme, setTheme] = useState("light");
  const [colorblindMode, setColorblindMode] = useState("none");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Check for saved theme preference or use system preference
    const getInitialTheme = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedTheme = window.localStorage.getItem('theme');
        if (storedTheme) {
          return storedTheme;
        }
        
        // If no stored preference, check system preference
        try {
          const userMedia = window.matchMedia('(prefers-color-scheme: dark)');
          if (userMedia.matches) {
            return 'dark';
          }
        } catch (e) {
          console.warn("Error checking system theme preference:", e);
        }
      }
      
      // Always default to light mode if nothing else is determined
      return 'light';
    };
    
    // Set theme based on preference
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    
    // Check for saved colorblind mode preference
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedColorblindMode = window.localStorage.getItem('colorblindMode');
      if (storedColorblindMode && ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'monochrome'].includes(storedColorblindMode)) {
        setColorblindMode(storedColorblindMode);
      }
    }
    
    // Set up listener for system preference changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      // Only change theme if user hasn't set a preference
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    
    // Add listener for system preference changes
    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
    } else if (darkModeMediaQuery.addListener) {
      // Fallback for older browsers
      darkModeMediaQuery.addListener(handleSystemThemeChange);
    }
    
    // Cleanup listener
    return () => {
      if (darkModeMediaQuery.removeEventListener) {
        darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else if (darkModeMediaQuery.removeListener) {
        darkModeMediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = window.document.documentElement;
    
    // Remove both classes to ensure clean slate
    root.classList.remove('light', 'dark');
    
    // Add current theme class
    root.classList.add(theme);
    
    // Save preference to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, mounted]);

  // Handle colorblind mode changes
  useEffect(() => {
    if (!mounted) return;
    
    const root = window.document.documentElement;
    
    // Remove all colorblind classes
    root.classList.remove('colorblind-none', 'colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia', 'colorblind-monochrome');
    
    // Add current colorblind mode class
    root.classList.add(`colorblind-${colorblindMode}`);
    
    // Save preference to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('colorblindMode', colorblindMode);
    }
  }, [colorblindMode, mounted]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const cycleColorblindMode = () => {
    setColorblindMode(prev => {
      const modes = ['none', 'protanopia', 'deuteranopia', 'tritanopia', 'monochrome'];
      const currentIndex = modes.indexOf(prev);
      return modes[(currentIndex + 1) % modes.length];
    });
  };

  // Function to transform color themes based on colorblind mode
  const getColorblindAdjustedTheme = (originalTheme) => {
    if (colorblindMode === 'none') return originalTheme;
    
    const colorMappings = {
      protanopia: {
        // Map red-based themes to cyan/teal
        'red': 'cyan',
        'rose': 'cyan',
        'pink': 'teal'
      },
      deuteranopia: {
        // Map green-based themes to violet/purple  
        'green': 'violet',
        'emerald': 'purple',
        'lime': 'indigo'
      },
      tritanopia: {
        // Map blue-based themes to red/orange
        'blue': 'red',
        'cyan': 'orange',
        'sky': 'amber'
      },
      monochrome: {
        // All colors become gray variants
        'red': 'gray', 'green': 'slate', 'blue': 'gray',
        'yellow': 'gray', 'purple': 'slate', 'pink': 'gray',
        'indigo': 'slate', 'cyan': 'gray', 'teal': 'slate',
        'orange': 'gray', 'amber': 'gray', 'lime': 'slate',
        'emerald': 'slate', 'violet': 'gray', 'fuchsia': 'slate',
        'rose': 'gray', 'sky': 'gray'
      }
    };

    return colorMappings[colorblindMode]?.[originalTheme] || originalTheme;
  };

  // Avoid hydration mismatch by not rendering anything until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      toggleTheme, 
      colorblindMode, 
      setColorblindMode, 
      cycleColorblindMode,
      getColorblindAdjustedTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};