# Giftomat — AI-first roadmap

Work queue for autonomous agents. Rules: `AGENTS.md`. UI contract: `design.md`. State and open decisions: `HANDOFF.md`.

How to work this file:

1. Take the first open item in the highest tier whose `needs` is `none` (or whose need is already satisfied).
2. Implement it end to end, meeting every acceptance line. `npm run verify` must be green.
3. Delete the finished item. If it changed a contract or made a decision, add one line to `HANDOFF.md` (and `design.md` for UI).
4. Items marked `needs: human` or `needs: approval` are blocked: report them in one line, do not guess.

## P0 — Production contract

**R0.1 · needs: human · Single source of truth for the VibeCode boundary.** `server.js` is not in this repository and `npm start` fails under static export.
- Obtain the real `server.js` and the VibeCode `package.json` scripts; commit `server.js`, set `"start": "node server.js"`.
- Decide `out/` tracking: `build_galaxy.md` §4 wants `out/` committed; the alternative is relying on the self-healing build at start.
- Move the security-header assertions in `scripts/smoke-check.mjs` from a warning to a hard check against `server.js`.
- Accept: a fresh clone runs `npm ci && npm run build && PORT=3100 node server.js` and serves `/`, `/sw.js`, `/manifest.webmanifest`, `/gif.worker.js`, `/html-to-image.js` with correct MIME types and a 404 for unknown paths; embedding in the Bitrix24 preview still works (confirm `frame-ancestors` with Paulo).

**R0.2 · needs: browser · GIF encoder regression check.** Generate a GIF from three frames including a transparent PNG; decide whether `dispose: 2` is needed.
- Accept: before/after frames compared; if added, `AGENTS.md` section 8 is updated; `encoder.ts` typed options extended.

## P1 — Architecture (SOLID / DRY / SoC)

**R1.1 · needs: none · Finish decomposing `app/page.tsx`** (target under 400 lines). `useImageLibrary`, `useGifEditor`, `ToolNav` and shared `ResultCard` are already extracted. Remaining:
- `GifWorkspace`, `PdfWorkspace`, `CompressWorkspace` with the same props contract as `CropWorkspace`;
- `app/lib/export/*` for generate/compress orchestration (pure, unit-tested).
- Accept: smoke markers follow moved code; behavior remains unchanged.

**R1.2 · needs: none · One intake component.** `DropZone` + `useFileIntake` (drag state, drop, paste, picker, limits, HEIC resolution) used by every tool including Crop. Removes the remaining duplicated drag/picker handlers.

**R1.5 · needs: browser · Move heavy canvas work off the main thread.** Frame rasterization in `imagesToImageData` and video frame extraction: `OffscreenCanvas` worker or cooperative yielding, feature-detected with fallback.
- Accept: no long task above 100 ms while building a 60-frame 1080×1350 GIF.

## P2 — GUI / UX (contract: `design.md`)

**R2.1 · needs: approval (devDependency) · Layout regression harness.** Playwright + Chromium at 320×640, 360×800, 780×900, 1100×900, 1440×1000 for every tool. Assert: no horizontal scroll, no overlapping interactive boxes, touch targets ≥ 44px, every tool reachable. Start as a non-blocking CI job.

**R2.2 · needs: browser · Visual regression after CSS consolidation.** Duplicate selectors are consolidated, generic controls renamed, and the smoke gate enforces uniqueness.
- Verify 320×640, 360×800, 780×900, 1100×900 and 1440×1000 for every tool: no horizontal scroll/overlap and intended August v3 hierarchy.

**R2.3 · needs: human · Navigation IA.** Floating bottom-nav vs the current drawer. Implement per `design.md` after the decision.

## P3 — Product features (highest user value first)

- **R3.1 Compress target-size mode** ("≤ 200 KB") via quality search plus max-width resize; show the saving.
- **R3.2 Remember last settings** per tool (preset, format, quality) in `localStorage`, local only.
- **R3.3 GIF:** frame duplicate/trim, global speed, size estimate before encoding.
- **R3.5 PDF carousel:** shared reorder component with GIF, optional page numbers.
- **R3.6 PWA:** "update available" prompt when a new service worker is waiting; offline smoke test.
- **R3.7 · needs: human · Localization scaffold** (ru default, pt-BR optional, no English corporate jargon in pt-BR copy).

## P4 — Tooling

- **R4.2 · needs: approval · ESLint** (Next + react-hooks) and a `lint` step inside `verify`.
- **R4.3 Smoke-check slimming:** replace regex-on-CSS design contracts in `scripts/smoke-check.mjs` with a small token/selector linter plus unit tests; keep the script under 200 lines.
- **R4.4 · needs: human · Triage the external Fable 5.1 review.** Its text is not in the repository: turn findings into roadmap items or drop them.

## Definition of done

`npm run verify` green · acceptance lines met · docs touched only where a contract changed · no new dependency without approval · final report is at most 3 lines.
