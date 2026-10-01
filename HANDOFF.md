# Giftomat — Handoff

**Status:** active · **Synchronized:** 2026-10-01 · **Gate:** `npm run verify`

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

## Decisions

**Locked** (details in `design.md`): August v3 token roles; action hierarchy (Lime executes, Tangerine is download/status only); GIF interaction model; Crop clear-image action, presets and fine positioning; icon canon.

**Resolved by repo evidence:** styling is `className` + `app/globals.css`. Tailwind is not in the stack (no dependency, smoke forbids it), so the old "inline style vs Tailwind" convention is retired. Inline `style` is only for dynamic values.

**Open — need Paulo:**

1. **VibeCode boundary.** `server.js` is not in this repository, and `npm start` (`npm run build && next start`) fails under static export. Provide the real `server.js` and the VibeCode `package.json` scripts, and decide whether `out/` is committed (`build_galaxy.md` §4) or the self-healing build is relied on. → ROADMAP R0.1.
2. **Navigation IA.** Floating bottom-nav vs the current drawer. Earlier notes cite "August §17.3" for bottom-nav; that section does not exist in `design.md`, so treat it as an unverified preference.
3. **`dispose: 2`.** Recorded as a required `gif.addFrame()` fix but absent from `encoder.ts`; needs a visual GIF check. → R0.2.
4. **External Fable 5.1 review.** Findings are not in the repository; provide the text to triage. → R4.4.
5. **Analytics.** None exists (consistent with no backend). Confirm none is wanted.

## Known gaps (recorded nowhere; ask before inventing)

Customer journey map, personas and funnels, component architecture diagram, wireframes beyond `design.md`.

## Canonical icon

`app/icon.png` is the source. `public/giftomat-icon.png` is byte-identical. Runtime references use `?v=20260828-v8`. Changing shell or icon assets requires a `CACHE_VERSION` bump.
