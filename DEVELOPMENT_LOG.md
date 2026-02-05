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
- Main page uses base color, cards use lighter shade for visual depth
- Dark colorful:
  - Page background: `{color}-900`
  - Cards/inputs: `{color}-800`
  - Buttons inactive: `{color}-800`
- Light colorful:
  - Page background: `{color}-100`
  - Cards/inputs: `{color}-50`
  - Buttons inactive: `{color}-50`

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
bg: isDarkMode ? 'bg-{color}-900' : 'bg-{color}-100'
bgCard: isDarkMode ? 'bg-{color}-800' : 'bg-{color}-50'
border: isDarkMode ? 'border-{color}-600' : 'border-{color}-300'
```

---

## Chart Colors

### Bar Charts
- Bars use the **same color as darkest text** in each mode
- Colorful: `{color}-300` (dark) / `{color}-700` (light)
- Minimal: white (dark) / black (light)

### Grid Lines
- Visible in all modes with appropriate contrast
- Colorful dark: `{color}-700`
- Colorful light: `{color}-600`
- Minimal dark: gray-500
- Minimal light: gray-700

---

## Implementation Checklist for New Tabs

- [ ] Container has colorful/minimal conditional styling
- [ ] All text uses color variables (not hardcoded)
- [ ] Buttons use proper minimal mode styling
- [ ] Borders have color in colorful mode
- [ ] Dark mode variants exist for all colors
- [ ] Child components receive `colorMode` prop

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
