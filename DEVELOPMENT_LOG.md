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
border: isDarkMode ? 'border-{color}-600' : 'border-{color}-300'
```

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
