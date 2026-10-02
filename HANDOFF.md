# Giftomat — Handoff

**Status:** active · **Synchronized:** 2026-10-02 · **Gate:** `npm run verify`

Agent rules: `AGENTS.md`. Work queue: `ROADMAP.md`. UI contract: `design.md`.

## State (verified on a fresh extraction, 2026-09-30)

- Typecheck, unit tests and the production build pass. The build is a static export (`/`, `/_not-found`, `/icon.png`).
- Before the AI-first overhaul `npm run smoke` was red: it read a non-existent `app/manifest.ts`, forbade `AGENTS.md`, and expected security headers in `next.config.ts`, which a static export cannot carry. Fixed.
- Instruments: GIF (+ video frames), PDF carousel, HTML → PDF, Crop, Compress, HEIC. PWA shell versioned by `CACHE_VERSION` in `public/sw.js`.

## Landed in the AI-first overhaul (2026-09-30)

- `AGENTS.md` rewritten (agent contract, autonomy and token rules, deploy boundary, regression zones); `ROADMAP.md` added; `README.md`, `HANDOFF.md`, `design.md` synchronized; stale `project-summary-and-audit.md` removed.
- Crop: presets `1024 × 512` (blog cover) and `950 × 417` (blog preview); fine positioning (arrows move 1 px, zoom ±5%, hold to repeat, keyboard), drag-and-drop onto the drop zone, native non-passive wheel zoom.
- Cleanup: dead `computeDimensions`, dead `.result-tip` CSS, dead eslint directive; Russian code comments translated; typed GIF runtime declaration; DRY `triggerDownload`.
- CI workflow running `npm run verify`; smoke-check contracts updated.

## Landed in the UX / quality sprint (2026-10-01)

- Downloads now stay in the current app context: `triggerDownload` uses one temporary anchor and never `window.open`.
- Architecture: `useImageLibrary`, `useGifEditor`, `ToolNav` and shared `ResultCard`; Crop render/file naming moved to `app/lib/crop.ts`; HTML capture protocol types are shared and validated.
- UX: 44px icon controls, keyboard-accessible GIF frame move left/right, focus on tool switch, shared live result pattern, video drag/drop, consolidated CSS with a duplicate-selector gate.
- Crop: multi-file + HEIC/HEIF intake, per-image crop positions, thumbnail switching, batch replacement and ZIP export. Social presets expanded for Open Graph, LinkedIn, Threads, Pinterest, Telegram and VK.
- CI adds a non-blocking production dependency audit. PWA shell cache bumped for the UI revision.
- Visual regression still needs a browser pass at the five canonical viewports (ROADMAP R2.2).

## Landed in the cold-start availability fix (2026-10-02)

- Root cause of `refused to connect` on cold start: `package.json` `start` was `npm run build && next start`. Under `output: "export"` `next start` exits, and the heavy build ran before any port was open, so the platform saw a closed port. `start` is now `node server.js` (listens first, serves the committed `out/`).
- `out/` is tracked (removed from `.gitignore`). After any source change run `npm run build` and commit the refreshed `out/`.
- `dependencies` is empty: Next, React, React DOM and heic-to are devDependencies (build-time only; heic-to is bundled into `out/`). `package-lock.json` regenerated. Trade-off: the `server.js` self-heal build needs devDependencies, so it only works if the platform installs them; the shipped `out/` makes it unnecessary.
- Smoke-check now guards the start script, the empty `dependencies` set and `out/` not being ignored; it no longer requires `ROADMAP.md` (deleted on purpose, 2026-10-01).

## Decisions

**Locked** (details in `design.md`): August v3 token roles; action hierarchy (Lime executes, Tangerine is download/status only); GIF interaction model; Crop clear-image action, presets and fine positioning; icon canon.

**Resolved by repo evidence:** styling is `className` + `app/globals.css`. Tailwind is not in the stack (no dependency, smoke forbids it), so the old "inline style vs Tailwind" convention is retired. Inline `style` is only for dynamic values.

**Open — need Paulo:**

1. ~~**VibeCode boundary.**~~ **Resolved (2026-10-02):** `start` is `node server.js`, `out/` ships (not in `.gitignore`; do not add it) and `dependencies` is empty. Details in the section above; `next start` is not used in any deploy path.
2. **Navigation IA.** Floating bottom-nav vs the current drawer. Earlier notes cite "August §17.3" for bottom-nav; that section does not exist in `design.md`, so treat it as an unverified preference.
3. **`dispose: 2`.** Recorded as a required `gif.addFrame()` fix but absent from `encoder.ts`; needs a visual GIF check. → R0.2.
4. **External Fable 5.1 review.** Findings are not in the repository; provide the text to triage. → R4.4.
5. **Analytics.** None exists (consistent with no backend). Confirm none is wanted.
6. **VibeCode server settings** (not verifiable from the repo): `runMode: ALWAYS` and, if `provisionReason: "oom"`, a dedicated server — `build_galaxy.md` §9. Confirm both in the VibeCode console.

## Known gaps (recorded nowhere; ask before inventing)

Customer journey map, personas and funnels, component architecture diagram, wireframes beyond `design.md`.

## Canonical icon

`app/icon.png` is the source. `public/giftomat-icon.png` is byte-identical. Runtime references use `?v=20260828-v8`. Changing shell or icon assets requires a `CACHE_VERSION` bump.
