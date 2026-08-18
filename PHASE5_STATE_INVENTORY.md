# Phase 5 State Inventory — SpotifyAnalyzer.js

Every `useState` in SpotifyAnalyzer (~104 hooks), classified for the phase 5
state push-down. Verdicts:

- **KEEP** — stays in the shell: core data, app chrome, or read by always-mounted
  components (Year sidebar, FixedSettingsBar, TopTabs).
- **KEEP+PERSIST** — stays lifted *and* should start persisting to localStorage,
  which upgrades persistence from "survives tab switches" to "survives app restarts".
- **MOVES WITH MEMO** — feeds a heavy `useMemo` that still lives in the parent;
  state and memo must move into the tab together (wave 2), or not at all.
- **PUSH DOWN** — pure pass-through; the parent never reads it, only forwards it.
  Safe to move into the owning tab. "persist" notes state worth rehydrating from
  localStorage after the move so it still survives unmount.
- **DELETE** — dead state (declaration is the only reference).

## Recommended order

1. **Wave 5a (low risk):** DELETE the dead hooks; PUSH DOWN the pass-through UI
   state tab by tab (Artists, then Albums, then the inner-tab pointers).
   Verbatim moves, pixel-verifiable.
2. **Wave 5b (medium risk):** move the filtered-artists / filtered-albums /
   artist-search memos into their tabs together with the state that feeds them
   (sort modes, search text, date ranges). This is where the real line-count
   shrink happens.
3. **Wave 5c (behavior-improving):** consolidate the 13 per-tab year-filter
   triples into one keyed `yearFilters` object and persist it — one hook instead
   of ~35, and selections survive app restarts. The sidebar dispatch maps
   (`yearSetters`, `rangeSetters`, `rangeModeHandlers`) collapse into single
   lookups on the same object.

Date/year selections are NEVER pushed down — they stay lifted (the shared Year
sidebar reads them) and gain localStorage persistence in 5c. **Persistence of
dates is preserved by design in every wave.**

## Dead state — DELETE (3)

| state | evidence |
|---|---|
| `activeTrackTab` | declaration is the only reference |
| `songsByMonth` | declaration is the only reference |
| `yearSelectorTransitioning` | declaration is the only reference |

## Core library data — KEEP (21)

The merged library and everything derived from it; consumed across all tabs.

`processedData`, `rawPlayData`, `basePlayData`, `stats`, `topArtists`,
`topAlbums`, `songsByYear`, `artistsByYear`, `albumsByYear`, `briefObsessions`,
`songPlayHistory`, `streaks`, `importedPlaylists`, `importedFavorites`,
`trackDurationMap`, `uploadedFiles`, `uploadedFileList`, `storedScrobbleCount`,
`storedLastfmCount`, `includeScrobblerData`, `includeLastfmData`

## Processing pipeline — KEEP (8)

Long-running work that must survive tab switches (user kicks off processing,
then browses). `enableEnrichment` already persists via its initializer.

`isProcessing`, `error`, `enrichmentProgress`, `enableEnrichment`,
`enrichRunning`, `enrichProgress`, `enrichResult`, `storageNotification`

## Recommendations — KEEP (6)

Deliberately lifted (July 2026) so a running build survives leaving the tab.

`recRunning`, `recProgress`, `recResults`, `recError`, `recSeedStateIndex`,
`recCustomSeedLimit`

## App chrome / layout — KEEP (17)

Read by the always-mounted shell (TopTabs, sidebar, status-bar band, hydration).

`colorMode`, `rainbowMode`, `rainbowDiscovered`, `showYearSidebar`,
`yearSelectorExpanded`, `yearSelectorPosition`, `yearSelectorWidth`,
`yearSelectorHeight`, `sidebarColorTheme`, `sidebarTextTheme`,
`topTabsPosition`, `topTabsHeight`, `topTabsWidth`, `topTabsCollapsed`,
`isMobile`, `isLandscapeMobile`, `mounted`

## Per-tab year/date filters — KEEP+PERSIST, consolidate in 5c (~35)

Read by the shared Year sidebar (shell) and by parent memos; must stay lifted.
Consolidate into `yearFilters[tabId] = { year, range, rangeMode }` + persist.

| tab | states |
|---|---|
| stats | `selectedStreaksYear` |
| artists | `selectedArtistYear`, `yearRange`, `yearRangeMode`, `artistStartDate`, `artistEndDate` |
| albums | `selectedAlbumYear`, `albumYearRange`, `albumYearRangeMode`, `albumStartDate`, `albumEndDate` |
| calendar | `selectedCalendarYear`, `calendarYearRange`, `calendarYearRangeMode` |
| custom | `customTrackYear`, `customYearRange`, `customYearRangeMode` |
| patterns | `selectedPatternYear`, `patternYearRange`, `patternYearRangeMode` |
| behavior | `selectedBehaviorYear`, `behaviorYearRange`, `behaviorYearRangeMode` |
| discovery | `selectedDiscoveryYear`, `discoveryYearRange`, `discoveryYearRangeMode` |
| podcasts | `selectedPodcastYear`, `podcastYearRange`, `podcastYearRangeMode` |

## View modes — KEEP+PERSIST, consolidate in 5c (6)

Read by FixedSettingsBar's grid/list toggle (shell), so they can't move down.
Same treatment as year filters: one keyed object, persisted.

`artistsViewMode`, `albumsViewMode`, `customViewMode`, `podcastViewMode`,
`patternsViewMode`, `calendarViewMode`

## Feeds a parent memo — MOVES WITH MEMO in 5b (5)

The parent computes `filteredArtists` / `filteredAlbums` / artist search results;
these inputs move only when those memos move into ArtistsTab/AlbumsTab.

`artistsSortBy`, `albumsSortBy`, `artistSearch`, plus cross-tab:
`selectedArtists`, `artistSelectionMode` (Artists tab selections seed the
Custom/Songs tab — needs a deliberate home, likely stays lifted)

## Pure pass-through — PUSH DOWN in 5a (12)

Parent only forwards these as props; the owning tab should own them.

| state | target | persist after move? |
|---|---|---|
| `topArtistsCount` | ArtistsTab | yes — a preference |
| `expandedArtistCards` | ArtistsTab | no — ephemeral |
| `artistsSortPress`, `artistsViewPress` | ArtistsTab | no — press animation |
| `topAlbumsCount` | AlbumsTab | yes — a preference |
| `expandedAlbumListRows` | AlbumsTab | no — ephemeral |
| `albumsSortPress`, `albumsViewPress` | AlbumsTab | no — press animation |
| `uploadInnerTab` | UploadTab | no — landing subtab is fine |
| `statsInnerTab` | StatsTab | no — landing subtab is fine |
| `yearSelectorExpanded`* | (stays — sidebar is shell) | — |

\* listed for completeness; it's chrome.

## Tally

| verdict | count |
|---|---|
| KEEP (data + pipeline + recs + chrome) | ~52 |
| KEEP+PERSIST via consolidation (year filters + view modes) | ~41 → collapses to 2 hooks |
| MOVES WITH MEMO (5b) | 5 |
| PUSH DOWN (5a) | 12 |
| DELETE | 3 |

Net effect if all three waves land: SpotifyAnalyzer goes from ~104 hooks to
roughly 55–60, the year-filter plumbing collapses into keyed lookups, date and
view-mode selections survive app restarts, and the heavy artist/album filtering
moves next to the UI that renders it.
