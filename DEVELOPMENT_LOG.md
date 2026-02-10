# Cakeculator - Design Philosophy

## Color Mode System

### Two Modes
- **Minimal Mode**: Pure black/white design
- **Colorful Mode**: Each tab has its own color theme

### Minimal Mode Rules
- All backgrounds: black (dark) / white (light)
- All text: white (dark) / black (light)
- All borders: white (dark) / black (light)
- Buttons blend with background (not inverted)
  - Dark: black bg + white border + white text
  - Light: white bg + black border + black text

### Colorful Mode Rules
- Each tab uses ONE consistent color for both text AND background
- Text and background use the same color family (like Artists = all blue)
- Dark mode uses lighter text shades (e.g., blue-300) and darker backgrounds (e.g., blue-900)
- Light mode uses darker text shades (e.g., blue-700) and lighter backgrounds (e.g., blue-100)

### Design Principles by Mode

**Minimal Mode - Flat Design:**
- All backgrounds match (no container contrast)
- Minimal light: white everywhere
- Minimal dark: black everywhere

**Colorful Mode - Two-Tone Design:**
- Main page uses darker shade, cards use lighter shade for visual depth
- Dark colorful:
  - Page background: `{color}-900`
  - Cards/inputs: `{color}-800`
  - Buttons inactive: `{color}-800`
- Light colorful:
  - Page background: `{color}-200`
  - Cards/inputs: `{color}-100`
  - Buttons inactive: `{color}-100`

### Tab Color Assignments
| Tab | Color |
|-----|-------|
| Statistics | Indigo |
| Upload | Violet |
| Artists | Blue |
| Albums | Cyan |
| Custom | Emerald |
| Tracks | Red |
| Calendar | Green |
| Patterns | Yellow |
| Behavior | Amber |
| Discovery | Orange |
| Podcasts | Red |
| Playlists | Rose |

### Special Buttons (Keep Colors in ALL Modes)
- Demo button: Yellow
- Google button: Blue
- Calculate button: Green

---

## Typography

### Titles
- Use `text-xl font-normal` for consistency
- No bold titles (matches clean aesthetic)

### Component Hierarchy
- Tab container → Child components → Cards/Tables
- All inherit color mode from parent

---

## Dark/Light Mode Support

Every colorful theme must have both dark and light variants:
```
text: isDarkMode ? 'text-{color}-300' : 'text-{color}-700'
bg: isDarkMode ? 'bg-{color}-900' : 'bg-{color}-200'
bgCard: isDarkMode ? 'bg-{color}-800' : 'bg-{color}-100'
border: isDarkMode ? 'border-{color}-600' : 'border-{color}-300'
```

---

## Chart Colors

### Bar Charts
- **Colorful mode**: Use vibrant theme colors
- **Minimal mode**: Use grey shades
  - Primary bar: `#9CA3AF` (dark) / `#6B7280` (light)
  - Secondary bar: `#6B7280` (dark) / `#9CA3AF` (light)
- Pattern: `isColorful ? (isDarkMode ? "#colorDark" : "#colorLight") : (isDarkMode ? "#9CA3AF" : "#6B7280")`

### Line Charts
- **Colorful mode**: Use vibrant theme colors
- **Minimal mode**: Use grey
  - Stroke: `#9CA3AF` (dark) / `#6B7280` (light)
- Pattern: `isColorful ? (isDarkMode ? "#059669" : "#82ca9d") : (isDarkMode ? "#9CA3AF" : "#6B7280")`

### Pie Charts
- **Colorful mode**: Use vibrant theme colors for slices
- **Minimal mode**: Use grey shades for all slices
  - Dark: `#374151`, `#4B5563`, `#6B7280`, `#9CA3AF`, `#D1D5DB`
  - Light: `#D1D5DB`, `#9CA3AF`, `#6B7280`, `#4B5563`, `#374151`
- Stroke color: white (dark minimal) / black (light minimal)
- Text labels: white (dark) / black (light)
- Legend text: white (dark) / black (light)

### Grid Lines
- Visible in all modes with appropriate contrast
- Colorful dark: `{color}-700`
- Colorful light: `{color}-600`
- Minimal dark: `#4B5563` (gray-600)
- Minimal light: `#D1D5DB` (gray-300)

---

## Transitions

- **No transitions on cards** - Color changes should be instant when switching modes
- Avoid `transition-all` on card containers
- Buttons can keep `transition-colors` for hover effects only

---

## Implementation Checklist for New Tabs

- [ ] Container has colorful/minimal conditional styling
- [ ] All text uses color variables (not hardcoded)
- [ ] Buttons use proper minimal mode styling
- [ ] Borders have color in colorful mode
- [ ] Dark mode variants exist for all colors
- [ ] Child components receive `colorMode` prop
- [ ] No transition classes on cards (instant mode switching)
- [ ] Pie charts use grey shades in minimal mode (check `isColorful`)
- [ ] Bar charts use grey fills in minimal mode (check `isColorful`)
- [ ] Line charts use grey strokes in minimal mode (check `isColorful`)
- [ ] Chart strokes/legends use white/black in minimal mode

---

## Completed Work

All tabs now support colorful/minimal mode:
- Statistics (Indigo)
- Upload (Violet)
- Artists (Blue)
- Albums (Cyan)
- Custom (Emerald)
- Tracks (Red)
- Calendar (Green)
- Patterns (Yellow)
- Behavior (Amber)
- Discovery (Orange)
- Podcasts (Red)
- Playlists (Rose)

---

## Recent Fixes

### Grey Charts in Minimal Mode (Feb 2026)
All charts now use grey colors in minimal (b/w) mode instead of vibrant colors:

**Updated components:**
- **Behavior tab**: Pie charts (shuffle, skip, sessions) + 3 horizontal bar charts
- **Discovery tab**: Pie chart (loyalty) + bar chart (depth) + 2 line charts
- **Patterns tab**: Pie charts (time of day, seasons) + bar charts + all chartColors
- **StreamingByYear**: Service pie charts use grey shades

**Pattern used:**
```javascript
fill={isColorful ? (isDarkMode ? "#colorDark" : "#colorLight") : (isDarkMode ? "#9CA3AF" : "#6B7280")}
```

### Discovery Tab Color Fix (Feb 2026)
The Discovery tab had hardcoded green color classes throughout the component instead of using the `modeColors` object. This caused:
- Dark mode: black backgrounds with green text
- Light mode: green backgrounds instead of orange

**Fix:** Replaced all hardcoded color classes (`bg-green-50`, `text-green-400`, etc.) with `modeColors` references (`modeColors.bgCard`, `modeColors.text`, etc.).

**Lesson:** When adding color mode support to a component, ensure ALL color classes use the modeColors object - don't leave any hardcoded colors in the JSX.

### Podcasts Tab Color Fix (Feb 2026)
The Podcasts tab (podcast-rankings.js) had `modeColors` correctly defined with red theme at the top, but the entire JSX used hardcoded indigo colors:
- Text: `text-indigo-300`, `text-indigo-700` instead of `modeColors.text`
- Buttons: `bg-black` instead of `modeColors.buttonInactive`
- Show chips: `bg-indigo-700 text-indigo-200` instead of `modeColors.buttonActive`
- Inputs: hardcoded colors instead of `modeColors.bgCard`, `modeColors.border`

**Fix:** Replaced all hardcoded indigo colors throughout the component:
- Table rows (mobile, compact, desktop views)
- Table headers (all three view modes)
- Selected show chips and search dropdown
- Duplicate detection settings and stats panel
- "Show Stats" button
- Empty state message

**Lesson:** After defining a modeColors object, search the entire file for hardcoded color classes (e.g., `text-indigo`, `bg-indigo`) to ensure nothing was missed.

### Custom Playlists Tab Color Fix (Feb 2026)
The Custom Playlists tab (customplaylist.js) had `modeColors` correctly defined with rose theme, but the entire JSX used hardcoded red colors:
- Labels: `text-red-700` instead of `modeColors.text`
- Inputs: hardcoded `bg-white`, `text-red-600` instead of `modeColors.bgCard`, `modeColors.text`
- Dropdowns: `bg-white` instead of `modeColors.bgCard`
- Buttons: `bg-red-600 text-white` instead of `modeColors.buttonActive`
- Creation mode tabs: hardcoded `bg-red-50`, `bg-red-100` instead of `modeColors.buttonActive/buttonInactive`
- Track list rows: `bg-red-50`, `bg-white` alternating instead of `modeColors.bgCard`

**Fix:** Replaced all hardcoded red colors throughout the component:
- Playlist name input and label
- Creation mode tabs (Manual Selection / Smart Playlist)
- Track search input and dropdown
- Manual track add form
- Smart playlist rules section (selects, inputs, buttons)
- Selected tracks list
- Save/Export buttons
- Saved playlists tab
- Export settings tab

**Lesson:** Components that use colorMode should never have hardcoded Tailwind color classes in the JSX - search for `text-{color}`, `bg-{color}`, `border-{color}` patterns to find missed conversions.

---

## Common Pitfalls

1. **Hardcoded colors in JSX** - Always use the color object (modeColors, themedColors, etc.), never hardcode Tailwind color classes in the template
2. **Using bgLight for page background** - Page should use `bg`, cards should use `bgCard` or `bgLight`
3. **Mismatched text themes** - Ensure textTheme matches the tab's color (e.g., Albums uses cyan, not amber)
4. **Transition classes on cards** - Remove `transition-all` to prevent visible color animations on mode switch

---

## Session: February 2026

### Brief Obsessions Grid/List View
Added grid/list view toggle to Brief Obsessions section in Patterns tab:
- Added `patternsViewMode` state to SpotifyAnalyzer
- Added 'patterns' to `tabsWithViewMode` in FixedSettingsBar
- TrackRankings now accepts `viewMode` prop and renders responsive grid cards
- Grid uses `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

### Responsive Pie Charts in Behavior Tab
Fixed pie charts not scaling on mobile:
- Changed `outerRadius={80}` (fixed pixels) to `outerRadius="70%"` (percentage-based)
- Applied to ShuffleChart, CompletionChart, and Session Duration Distribution
- Now matches Patterns tab pie chart behavior

### Year Selector & Wheel Selector Minimal Mode
Added black/white styling for minimal mode:
- Added `colorMode` prop to YearSelector and WheelSelector
- In minimal mode: black text/borders on white (light), white on black (dark)
- Fixed textTheme override in WheelSelector to skip in minimal mode

### Wheel Selector Dark Mode Fixes
Many color themes were missing dark mode variants, causing bright highlights in dark mode:
- Added `dark:bg-*-900` to highlight for all themes
- Added `dark:border-*-700`, `dark:text-*-300`, `dark:shadow-*-900`
- Fixed themes: pink, purple, teal, orange, indigo, red, yellow, cyan, emerald, fuchsia, violet, rose

### TopTabs Position Adjustment for All Tabs
Fixed tabs without year sidebar not adjusting for TopTabs:
- Separated TopTabs adjustment from YearSelector visibility check
- TopTabs width/margin adjustments now apply to ALL tabs
- Fixes: Updates, Upload, Statistics, Custom, Playlist

### GPU-Accelerated Layout Transitions
Made sidebar position changes feel instant:
- Replaced `marginLeft` with `transform: translateX()` (GPU-accelerated)
- Added `willChange: 'transform'` for browser optimization hints
- Changed transition from `all 0.3s` to `transform 0.15s ease-out`
- Width changes happen instantly, only transform animates

### Font Settings Integration
Fixed conflict between FontSizeDropdown and SettingsPanel:
- FontSizeDropdown now uses `useTheme()` context instead of direct localStorage
- Updated CSS class names to match ThemeProvider:
  - Size: `text-small`, `text-medium`, `text-large`, `text-xlarge`
  - Family: `font-sans`, `font-serif`, `font-mono`, `font-comic`
- Both FixedSettingsBar button and SettingsPanel now sync properly

### Minimal Mode Grey Text Readability (Feb 2026)
Fixed grey text being hard to read on pure black/white backgrounds in minimal mode:

**Problem:** In minimal mode, text using `text-gray-600 dark:text-gray-400` was hard to read against pure black/white backgrounds.

**Files fixed:**
- **SpotifyAnalyzer.js (Artists tab)**:
  - Clear button in artist search
  - Instruction text below "View Artist Playlist"
  - Grid card `cardTextLight` variable
  - "No artists found" message
- **SpotifyAnalyzer.js (Albums tab)**:
  - "Clear All" button for filtered artists
  - Artist filter chips (changed grey bg to border)
  - Close button on filter chips
  - `albumCardTextLight` variable
  - "No album data" message
- **CustomTrackRankings.js**:
  - Changed `textLight` and `textLighter` from grey to white/black
- **albumcard.js**:
  - Changed `textLight`, `borderHover`, `bgLight`, etc. to pure black/white

**Pattern:**
```javascript
// Before (hard to read)
textLight: isDarkMode ? 'text-gray-400' : 'text-gray-600'

// After (readable)
textLight: isDarkMode ? 'text-white' : 'text-black'
```

### Streak Statistics Feature (Feb 2026)
Added comprehensive listening streak statistics to the Statistics tab:

**New Functions in streaming-adapter.js:**
- `calculateConsecutivePlayStreaks(rawPlayData)` - Finds longest back-to-back plays of same song/artist/album
- `calculateOverallDailyStreak(rawPlayData)` - Finds longest consecutive days with any listening
- `calculateTopSongDailyStreak(songs, playHistory)` - Finds song played most consecutive days
- `calculateTopAlbumDailyStreak(albums, rawPlayData)` - Finds album played most consecutive days

**Statistics Tab UI:**
- Two-column layout: "Back-to-Back Plays" and "Daily Streaks"
- Shows song on repeat, artist marathon, album session
- Shows longest listening streak, most dedicated song, most consistent artist
- Integrated with YearSelector for year-based filtering

**Google Drive Sync:**
- Added `streaks` property to saved data structure
- Added recalculation fallback for older saved data without streaks

### YearSelector for Statistics Tab (Feb 2026)
Extended YearSelector to filter all Statistics tab data by year:

- Added `selectedStreaksYear` state to SpotifyAnalyzer
- Added `filteredStats` and `filteredStreaks` useMemo hooks
- Added 'stats' to `shouldShowSidebar` tabs array
- Added 'stats' case in `handleSidebarYearChange`
- Fixed rendering by adding filtered values to renderTabContent dependencies

### Support Button Refactor (Feb 2026)
Moved SupportOptions from Statistics tab to FixedSettingsBar as a dropdown:

**Changes:**
- Created `SupportDropdown.js` - Dropdown component matching FontSizeDropdown style
- Added heart button to FixedSettingsBar (both mobile and desktop)
- Removed collapse menu button from FixedSettingsBar
- Removed PayPal, Venmo, and Crypto payment options (kept Ko-fi and Buy Me A Coffee)
- Deleted `support-options.js`

**Dropdown Features:**
- Positions relative to button ref
- Closes on outside click
- Supports colorful/minimal mode styling

### Google Drive Mobile Timeout Issue (Feb 2026)
**Status:** Unresolved - service worker fix deployed but not yet verified working

**Problem:** On iOS (iPhone 13), Google Drive load/save works the first time but "times out" on every subsequent attempt in the same session.

**Root cause identified:** The PWA service worker (`sw.js`, generated by `next-pwa`) intercepts all cross-origin fetch requests with `networkTimeoutSeconds: 10` and `NetworkFirst` caching. After the first successful API call, subsequent requests to `googleapis.com` hit the 10-second timeout then try to serve stale/corrupt cached responses.

**Fixes attempted:**
1. Removed all artificial timeouts from GoogleDriveSync.js
2. Switched metadata API calls from `gapi.client` to direct `fetch()`
3. Added `cache: 'no-store'` to all fetch calls
4. Passed access token directly instead of reading from `gapi.client.getToken()`
5. Used array-based chunk collection to reduce memory pressure
6. **Added `NetworkOnly` handler for `googleapis.com` in next.config.js runtimeCaching** — this should be the real fix but requires the old service worker to be cleared on the device

**Note:** iOS Safari aggressively caches service workers. Users may need to clear website data or wait for the SW update cycle to pick up the new `sw.js`.

### Font Size Scaling Fixes (Feb 2026)
Fixed components overlapping/separating when font size changes:

**Problem:** FixedSettingsBar, TopTabs, and YearSelector didn't account for font size changes, causing:
- Components overlapping at large font sizes
- Gaps between components at small font sizes

**Solution:** Dynamic `settingsBarHeight` calculation based on font scale:
```javascript
const fontScales = { small: 0.875, medium: 1, large: 1.125, xlarge: 1.25 };
const fontScale = fontScales[fontSize] || 1;
const settingsBarHeight = isMobile ? 85 : Math.max(40, Math.round(40 * fontScale));
```

**Files Updated:**
- `SpotifyAnalyzer.js` - Added dynamic settingsBarHeight in contentAreaStyles
- `TopTabs.js` - Added fontSize to useEffect dependency, dynamic height calculation
- `year-selector.js` - Added fontScale to getPositionStyles
- `FixedSettingsBar.js` - Added `minHeight: 40px` for desktop to prevent gaps
