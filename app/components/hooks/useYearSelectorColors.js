// ---------------------------------------------------------------------------
// useYearSelectorColors
//
// Thin hook over the shared theme module (see ../theme.js) — the THEMES and
// MINIMAL maps used to live here and were moved there in the design-system
// consolidation.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { THEMES, MINIMAL } from '../theme.js';

export function useYearSelectorColors({ colorTheme = 'teal', colorMode = 'colorful' }) {
  return useMemo(() => {
    if (colorMode === 'minimal') return MINIMAL;
    return THEMES[colorTheme] ?? THEMES.teal;
  }, [colorTheme, colorMode]);
}

// Re-export so existing importers keep working
export { THEMES, MINIMAL };
