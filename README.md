# Cakeculator 🎂

Merge your listening history from every streaming service you've ever used into
one library, and explore it: all-time rankings, yearly breakdowns, streaks, brief
obsessions, listening patterns, a calendar heatmap, podcast stats, and
recommendations.

Named after Cake the cat. The cake layers are your merged streaming services.

## Supported sources

Upload the data export from any of these and Cakeculator parses, normalizes, and
deduplicates them into one play history:

- **Spotify** (extended streaming history)
- **Apple Music** (play activity CSV)
- **Deezer** (listening history XLSX, including playlists and favorites)
- **Last.fm** (scrobbles via JSON/CSV export, or live via API connect)
- **SoundCloud** (play history CSV)
- **Tidal** (streaming history CSV)
- **TuneMyMusic** (transfer CSVs)
- **Rockbox** (`.scrobbler.log` from DAPs, uploadable or scrobbled live)
- **Cakeculator's own Excel export** — re-import a previous session

## How it works

Everything runs in your browser. Uploaded files are parsed client-side; nothing
is sent to a server. Your merged library lives in localStorage/IndexedDB, with
optional backup and cross-device sync through your own Google Drive. Installable
as a PWA (add to home screen on iOS).

## Development

```bash
npm run dev    # dev server at localhost:3000 (service worker disabled in dev)
npm test       # vitest — parsing/stats logic tests
npm run lint   # eslint
npm run build  # production build
```

Built with Next.js + React + Tailwind, deployed on Vercel. The data-processing
core lives in `app/components/streaming/` (one parser per service, plus
normalization, dedup, aggregation, and streak modules) behind the
`streaming-adapter.js` barrel. See `CLAUDE.md` for the full architecture map and
`DEVELOPMENT_LOG.md` for the design philosophy.
