# UI Consistency Plan (handoff for Opus)

Five tasks, in priority order (Tasks 1–4 are UI polish; Task 5 is a reported layout
bug). All are UI-only; no data-model changes.
Design-language ground rules (from prior sessions):

- `app/components/theme.js` is canonical. Prefer extending its color maps over inline ternaries.
- Never interpolate Tailwind class fragments — always full literal class strings (JIT safety).
- Verify with the screenshot workflow: run dev server, screenshot each affected tab in
  colorful + minimal × light + dark before/after.

---

## Task 1 — Bring the press-shadow language to colorful mode on ALL pages

**Current state:** Patterns, Behavior, and Music Discovery were redesigned and use
`getAnalysisPageColors()` (theme.js ~line 826), which applies hard-offset shadows in
**both** minimal and colorful modes:

- Cards/containers: `shadow-[1px_1px_0_0_<accentHex>]`
- Buttons idle: `shadow-[2px_2px_0_0_<accentHex>]`
- Buttons active/pressed: `translate-x-[2px] translate-y-[2px] shadow-[inset_2px_2px_0_0_<accentHex>]`
- Accent hex = the Tailwind `{color}-600` value in dark mode, `{color}-700` in light mode.
  See `ANALYSIS_COLORFUL` (theme.js ~line 732) for exact per-color hexes to copy.

**The bug/inconsistency:** every other page only applies these shadows in minimal mode.
The anti-pattern to hunt for is:

```js
${!isColorful ? 'shadow-[...]' : ''}
${colorMode === 'minimal' ? (isDarkMode ? 'shadow-[1px_1px_0_0_#4169E1]' : 'shadow-[1px_1px_0_0_black]') : ''}
// or a colorful branch that simply has no shadow / uses shadow-sm
```

Examples: `TrackRankings.js:394,402,447`, `tabs/StatsTab.js:331,401,440,549`.

**Fix:** in the colorful branch, add the same-geometry shadow using the page's accent
color (600 hex dark / 700 hex light). Containers 1px, buttons/toggles/inputs 2px + inset
when active. Where a page pulls classes from a theme.js map (`getTabColors`,
`getRankingColors`, `getAlbumCardColors`, `RANKING_COLORFUL`, etc.), add/extend `shadow`,
`buttonActive`, `buttonInactive` keys there instead of patching call sites.

**Per-tab accents** (matches `TAB_ACCENT_HEX`, theme.js ~line 897) and files to audit:

| Tab | Accent | Files |
|---|---|---|
| Upload | violet | `tabs/UploadTab.js` (buttons already done, lines 65/70 — finish containers/toggles), `RockboxScrobbler.js` (line 242: shadow is minimal-only), `LastfmConnect.js` (see Task 2) |
| Stats | indigo | `tabs/StatsTab.js` |
| Artists | blue | `tabs/ArtistsTab.js` |
| Albums | cyan | `tabs/AlbumsTab.js`, `albumcard.js` |
| Custom | emerald | `CustomTrackRankings.js` |
| Tracks | red | `TrackRankings.js` via `getObsessionColors` — see Obsessions note below the table |
| Patterns → Obsessions | yellow | same `TrackRankings.js`/`getObsessionColors` fix — see note below the table |
| Calendar | green | already converted — `CalendarView.js:186` uses `getAnalysisPageColors('green')`; verify only |
| Podcasts | red | `podcast-rankings.js` |
| Playlists | rose | `customplaylist.js` |
| Updates | fuchsia | `updatessection.js` |
| Your Data | — | `tabs/DataTab.js` is the black/green exception and already has shadows in both modes (line 440) — verify only, don't restyle |

Shared chrome (`TopTabs.js`, `SettingsPanel.js`, `FixedSettingsBar.js`, `YearSelector.js`,
dropdown components) should be audited last with the same rule, but only where an element
visibly has a minimal-mode shadow today and its colorful twin lacks one. The main
Patterns/Behavior/Discovery surfaces need no changes — they are the reference — but two
Patterns **sub-tabs** are exceptions: Obsessions (below) and Streaming Services
(`streaming-by-year.js`, see scan findings).

**Obsessions sub-tab (Patterns) + Tracks tab share one fix.** Patterns → Obsessions
renders `TrackRankings` with `textTheme/backgroundTheme/colorTheme="yellow"`
(`listening-patterns.js:1199`), and the Tracks tab renders the same component in red.
`TrackRankings` gets its colors from `getObsessionColors()` (theme.js:714):

- The colorful maps (`OBSESSION_BG`, theme.js ~645) have **no shadow keys at all** —
  cards/buttons render shadowless in colorful mode.
- `OBSESSION_MINIMAL` has no shadow keys either; minimal-mode shadows are inline
  minimal-only ternaries in `TrackRankings.js:394,402,447`.

Fix at the map level: add `shadow` (1px), `buttonActive`/`buttonInactive` (2px + inset)
keys to `OBSESSION_MINIMAL` and to each `OBSESSION_BG` entry (at minimum `yellow` and
`red`, the two in use; accent hex = 600 dark / 700 light as everywhere else), then make
`TrackRankings.js` consume those keys instead of its inline ternaries. One change covers
both the Obsessions sub-tab and the Tracks tab.

Suggested workflow: `grep -n "shadow-\[" <file>` per file, fix each conditional so both
branches carry a shadow, then screenshot-compare.

**Additional findings from the project scan (2026-07-12):**

- `streaming-by-year.js` (Streaming Services sub-tab **inside Patterns**, mounted at
  `listening-patterns.js:1238`) predates the redesign: it hand-rolls its own yellow map
  (lines 12–27) and its cards (lines ~211, ~264, ~297) have **no shadows in either
  mode**. Convert it to `getAnalysisPageColors('yellow', …)` — same accent as the rest
  of Patterns.
- `excelpreview.js` (xlsx preview on the Upload tab) is hardcoded orange
  (`text-orange-700`, `bg-orange-100`, …) with **no dark-mode classes and no
  minimal-mode branch at all**. Restyle to follow the Upload tab's violet/minimal
  system like the rest of the tab.
- `GoogleDriveSync.js` (Upload tab): the blue/green/red colorful buttons are
  **intentional and stay** (user confirmed 2026-07-12). No color changes there.
- `SpotifyAnalyzer.js` (app shell) and `YearSelector.js` carry minimal-only shadow
  literals — include them in the shared-chrome audit pass.
- `FontSizeDropdown.js` and `SettingsPanel.js` already compute colorful shadow colors
  (`shadowColor = isColorful ? …`) — reference implementations for chrome, no changes.
- `updatessection.js` (fuchsia) has red badges/downvotes/bug-tags — those are
  **semantic**, keep them red; only the minimal-only shadows need the Task 1 fix.
- Quick-hit list of the exact `!isColorful ? shadow : ''` sites found:
  `LastfmConnect.js:443`, `RockboxScrobbler.js:242`, `customplaylist.js:1792,1841,1889`,
  `CustomTrackRankings.js:1572`, `podcast-rankings.js:995`, `albumcard.js:29`,
  `TrackRankings.js:394,402,447`, plus `colorMode === 'minimal'` variants in
  `tabs/ArtistsTab.js` and the `tabs/*.js` colorful-branch-without-shadow ternaries
  (e.g. `tabs/StatsTab.js:331,401,440,549`).

---

## Task 2 — Last.fm section on Upload: red → violet (match the Upload page)

`LastfmConnect.js` styles its colorful mode red. The Upload tab is violet;
`RockboxScrobbler.js` (same inner-tab family) is already violet — use it as the template
(its lines 238–242).

Change in `LastfmConnect.js` (colorful branches only; minimal stays as-is):

- Lines ~439–453: `border`, `cardBg`, `textMain`, `textLight`, and the three button
  class strings — swap all `red-*` classes to `violet-*`, and shadow hexes
  `#dc2626` → `#7c3aed` (violet-600).
- Line ~491 (badge), ~522 and ~580 (progress bars `bg-red-500` → `bg-violet-500`
  in colorful), ~637/640 (list rows).
- **Keep red where it is semantic:** the error status banner (~line 595) and any
  destructive/delete buttons stay red.
- While there, apply Task 1: give the colorful violet branches the press shadows
  (RockboxScrobbler line 242 currently zeroes the shadow in colorful — fix both files).

---

## Task 3 — Calendar → Daily History cards: show "Played at" instead of "Status"

`CalendarView.js`, grid-view track cards (~lines 1330–1367):

- Row 3 (line ~1351, comment "album + status") currently shows **Album + Status
  (Completed/Skipped)**. Change it to **Album + Played at** (`track.formattedTime`,
  already computed at line ~444 — a time string).
- Move Status into the expandable Row 2 (line ~1345) in place of "Played at", so the
  detail grid becomes **Status + Duration** and no info is lost. Keep the green/orange
  Completed/Skipped coloring.
- Leave the desktop table and mobile list view alone — they already show Time.

---

## Task 4 — Merge the Last.fm and Scrobbler inner tabs into one section

`tabs/UploadTab.js` (~lines 74–140) has three inner tabs: **Upload | Scrobbler |
Last.fm**, switched via `uploadInnerTab` state, rendering `RockboxScrobbler` and
`LastfmConnect` respectively.

Merge the last two into a single inner tab:

- Inner-tab row becomes **Upload | Scrobbles** (two buttons). `uploadInnerTab`
  values shrink to `'upload' | 'scrobbles'`; update the `<h3>` title ternary
  (line ~79) accordingly.
- The `'scrobbles'` panel stacks both components in one view: `LastfmConnect` first,
  then `RockboxScrobbler`, each wrapped as a sub-section with a small violet
  sub-heading ("Last.fm" / "Rockbox / iPod") so the two flows stay distinguishable.
  Keep both `onScrobblesLoaded` handlers exactly as they are (lines ~97–137) —
  they produce different file formats and both must keep working.
- Don't merge the components' internals; this is layout-only. Do Task 2
  (red → violet) before or together with this so the merged section doesn't mix
  red and violet.
- Check both components' top-level markup for headers/cards that look redundant
  once stacked (e.g. duplicated "how it works" framing) and demote them to
  sub-section level rather than deleting content.

---

## Task 5 — Statistics page: data not all on the same line

User reported (2026-07-12) that on the **Statistics** page "the data isn't all on the
same line." Not yet confirmed with a screenshot — the Chrome extension was disconnected
when this was written, so **pin down the exact element with a browser screenshot first**
before changing layout (this is a live alignment bug, easy to make worse blind).

Code-level hypotheses to check, in `tabs/StatsTab.js`:

- **Records & Firsts grid** (line ~556, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`):
  cards hold different line counts (some track+artist+date = 3 lines, some 2), so the
  bottom "strong" value line sits at a different height per card and the values don't
  line up across a row. Fix candidates: make each `Card`/`Top3` a flex column with the
  value pinned to the bottom, or give the value row a consistent top margin.
- **`Top3` rows** (lines ~526–537): on `sm:flex-row` the three entries become
  `sm:flex-1` columns whose differing line counts push their baselines out of
  alignment.
- **Service breakdown list** (line ~417, `flex justify-between`): if a service name
  wraps, its time value drops to a second line.

Match whichever the screenshot shows. Layout-only; keep the colorful/minimal class
structure intact.

---

## Verification checklist

**Browser:** verification is done through Chrome browsing (the `mcp__claude-in-chrome__*`
tools). The extension must be connected first — if `tabs_context_mcp` returns
"extension is not connected," reconnect it (see https://claude.ai/chrome; a Chrome
restart may be needed) before relying on any screenshot step below. Until it's
connected, treat every visual item here as unverified.


1. `npm run dev`, load a real library (see real-library-testing memory for the
   Music History folder recipe).
2. For each tab: colorful light, colorful dark, minimal light, minimal dark.
   Minimal must be pixel-identical to before (only colorful branches change).
3. Buttons: idle shows 2px offset shadow; pressed/active shows the 2px translate +
   inset shadow, in colorful too.
4. Upload → merged Scrobbles inner tab: both the Last.fm and Rockbox flows work
   end-to-end (connect + import), no red left except error states, shadows present,
   Google Drive buttons untouched (blue/green/red stays).
5. Calendar → pick a date with plays → grid cards show Album + Played at; expanding
   a card shows Status + Duration.
