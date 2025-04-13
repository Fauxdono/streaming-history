"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => null,
  toggleTheme: () => null,
});

export const ThemeProvider = ({ children }) => {
  // Initialize theme to 'light' but will be updated based on system preference
  const [theme, setTheme] = useState("light");
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
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Avoid hydration mismatch by not rendering anything until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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