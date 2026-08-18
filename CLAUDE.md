# Cakeculator

A Next.js PWA that merges listening-history exports from multiple streaming services
(Spotify, Apple Music, Deezer, Last.fm, SoundCloud, Tidal, Rockbox, TuneMyMusic, and
its own "cake" Excel format) into one unified library with stats, rankings, streaks,
and recommendations. All processing is client-side; data lives in localStorage /
IndexedDB with optional Google Drive backup. Deployed on Vercel; the owner uses it as
an iOS home-screen PWA on their phone.

## Commands

- `npm run dev` — dev server (PWA/service worker disabled in dev)
- `npm test` — vitest, fast (<1s), all tests live in `app/components/streaming/__tests__/`
- `npm run lint` / `npm run build`

## Workflow

- Work directly on `main` — no feature branches. Pushing deploys to Vercel; the owner
  verifies on their phone. Don't browser-verify every small UI tweak; ask first.
- Run `npm test` before committing anything that touches `app/components/streaming/`.

## Architecture

- `app/page.js` → `SpotifyAnalyzer.js` (~3,100 lines): the orchestrator. Holds nearly
  all app state (~100 useState hooks) and the tab-switch rendering. Tabs are being
  extracted incrementally into `app/components/tabs/` (Upload, Stats, Artists, Albums,
  Data so far); the rest (custom, calendar, patterns, behavior, discovery, podcasts,
  playlists, updates) still render from components imported directly.
- `app/components/streaming/` — pure data logic, split by concern: `parsers/` (one per
  service), `normalize.js` (match keys — `createMatchKey` is track identity everywhere),
  `dedup.js`, `aggregate.js`, `streaks.js`, `overrides.js` (localStorage user edits),
  `duplicates.js` (edition-suffix merge suggestions), `processor.js` (orchestrator:
  `processFiles` parses, `computeStatsFromEntries` recomputes without re-parsing).
- `app/components/streaming-adapter.js` — the public barrel for all of the above.
  UI components import from the adapter, not from `streaming/` internals.
- New pure logic goes in `streaming/` with a test; keep UI components thin over it.

## Theming (see DEVELOPMENT_LOG.md for full philosophy)

- `theme.js` is canonical. Two modes: **minimal** (pure black/white) and **colorful**
  (one pastel color family per tab). Data tab is the exception: black/green terminal look.
- NEVER interpolate Tailwind class names (`bg-${color}-500`) — Tailwind JIT only sees
  full literal strings. Add helpers/maps in `theme.js` instead.
- Press-shadow button style; keep new UI consistent with existing tabs.

## Integrations

- **Last.fm**: proxied through `app/api/lastfm/route.js` (allowlisted methods; needs
  `LASTFM_API_KEY`/`LASTFM_API_SECRET` env vars). Scrobbles cached in IndexedDB
  (`lastfm-db.js`).
- **Google Drive**: backup/sync (`GoogleDriveSync.js`, `google-drive-storage.js`,
  `use-google-drive.js`). On mobile, OAuth popups must be opened inside the tap
  gesture or iOS blocks them.
- **Firebase Firestore** (`app/lib/firebase.js`): device auth / shared state.
- **ListenBrainz** (`recommendations/`): artist/song recommendations.

## Gotchas

- The height chain in `page.js` (`html.app-shell` → body → main → analyzer root →
  scroller) must stay unbroken percentages or scrolling breaks. Never transform `<body>`
  (breaks the iOS standalone PWA chrome).
- iOS standalone PWA: the top 24px content band is sampled for the status-bar color in
  portrait — it's load-bearing.
- `next-pwa` requires webpack; the empty `turbopack: {}` in `next.config.js` is
  deliberate. Google APIs are `NetworkOnly` in the service worker — keep them that way.
- Perf pattern for heavy stats memos: single numeric pass + visited-flag gate (see
  Sessions crash fix); `listening-behavior.js` still has the old anti-pattern.
- Play-filter settings (skip threshold etc.) must be respected by every stats view —
  several past bugs were views ignoring them.

## Docs

- `DEVELOPMENT_LOG.md` — design philosophy (color modes, layout rules)
- `README_AUTH_SYSTEM.md` — device auth notes
- `UI_CONSISTENCY_PLAN.md` — UI consistency checklist
- `example files/` — sample exports from each service for manual testing
