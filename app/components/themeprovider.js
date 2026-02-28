"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => null,
  toggleTheme: () => null,
  fontFamily: "sans",
  setFontFamily: () => null,
  fontSize: "medium",
  setFontSize: () => null,
  accentColor: "#3b82f6",
  setAccentColor: () => null,
  minPlayDuration: 30000,
  setMinPlayDuration: () => null,
  skipFilter: false,
  setSkipFilter: () => null,
  fullListenOnly: false,
  setFullListenOnly: () => null,
  dyslexicSpacing: false,
  setDyslexicSpacing: () => null,
  skipEndThreshold: 0,
  setSkipEndThreshold: () => null,
});

export const ThemeProvider = ({ children }) => {
  // Initialize theme to 'light' but will be updated based on system preference
  const [theme, setTheme] = useState("light");
  const [fontFamily, setFontFamily] = useState("sans");
  const [fontSize, setFontSize] = useState("medium");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [minPlayDuration, setMinPlayDuration] = useState(30000);
  const [skipFilter, setSkipFilter] = useState(false);
  const [fullListenOnly, setFullListenOnly] = useState(false);
  const [dyslexicSpacing, setDyslexicSpacing] = useState(false);
  const [skipEndThreshold, setSkipEndThreshold] = useState(0);
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

    // Load preferences from localStorage
    const getInitialFontFamily = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('fontFamily') || 'sans';
      }
      return 'sans';
    };

    const getInitialFontSize = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('fontSize') || 'medium';
      }
      return 'medium';
    };

    const getInitialAccentColor = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('accentColor') || '#3b82f6';
      }
      return '#3b82f6';
    };

    const getInitialMinPlayDuration = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('minPlayDuration');
        return stored ? parseInt(stored, 10) : 30000;
      }
      return 30000;
    };

    const getInitialSkipFilter = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('skipFilter') === 'true';
      }
      return false;
    };

    const getInitialFullListenOnly = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('fullListenOnly') === 'true';
      }
      return false;
    };

    const getInitialDyslexicSpacing = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('dyslexicSpacing') === 'true';
      }
      return false;
    };

    const getInitialSkipEndThreshold = () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('skipEndThreshold');
        return stored ? parseInt(stored, 10) : 0;
      }
      return 0;
    };

    // Set theme based on preference
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    setFontFamily(getInitialFontFamily());
    setFontSize(getInitialFontSize());
    setAccentColor(getInitialAccentColor());
    setMinPlayDuration(getInitialMinPlayDuration());
    setSkipFilter(getInitialSkipFilter());
    setFullListenOnly(getInitialFullListenOnly());
    setDyslexicSpacing(getInitialDyslexicSpacing());
    setSkipEndThreshold(getInitialSkipEndThreshold());

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

  // Apply font family
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;

    // Remove all font family classes
    root.classList.remove(
      'font-sans', 'font-serif', 'font-mono', 'font-comic',
      'font-inter', 'font-jetbrains-mono', 'font-playfair', 'font-space-grotesk',
      'font-outfit', 'font-dm-sans', 'font-sora', 'font-lexend',
      'font-cursive', 'font-system-ui', 'font-fantasy', 'font-opendyslexic'
    );

    // Add current font family class
    root.classList.add(`font-${fontFamily}`);

    // Save to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('fontFamily', fontFamily);
    }
  }, [fontFamily, mounted]);

  // Apply font size
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;

    // Remove all font size classes
    root.classList.remove('text-small', 'text-medium', 'text-large', 'text-xlarge');

    // Add current font size class
    root.classList.add(`text-${fontSize}`);

    // Save to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('fontSize', fontSize);
    }
  }, [fontSize, mounted]);

  // Apply accent color
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;

    // Set CSS variable for accent color
    root.style.setProperty('--accent-color', accentColor);

    // Save to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('accentColor', accentColor);
    }
  }, [accentColor, mounted]);
  
  // Persist analysis settings
  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('minPlayDuration', minPlayDuration.toString());
    }
  }, [minPlayDuration, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('skipFilter', skipFilter.toString());
    }
  }, [skipFilter, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('fullListenOnly', fullListenOnly.toString());
    }
  }, [fullListenOnly, mounted]);

  // Apply dyslexic spacing
  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    if (dyslexicSpacing) {
      root.classList.add('dyslexic-spacing');
    } else {
      root.classList.remove('dyslexic-spacing');
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('dyslexicSpacing', dyslexicSpacing.toString());
    }
  }, [dyslexicSpacing, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('skipEndThreshold', skipEndThreshold.toString());
    }
  }, [skipEndThreshold, mounted]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
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
      fontFamily,
      setFontFamily,
      fontSize,
      setFontSize,
      accentColor,
      setAccentColor,
      minPlayDuration,
      setMinPlayDuration,
      skipFilter,
      setSkipFilter,
      fullListenOnly,
      setFullListenOnly,
      dyslexicSpacing,
      setDyslexicSpacing,
      skipEndThreshold,
      setSkipEndThreshold
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