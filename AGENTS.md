# AGENTS.md — Giftomat

Single instruction file for coding agents. Read it fully, then work autonomously. The human owner is Paulo (Russian-speaking).

## 1. Product invariants

- Giftomat (Гифтомат) is a privacy-first, 100% client-side browser media studio and offline PWA. No server-side media processing, no telemetry, no network calls with user media. Ever.
- Instruments: GIF (images, video → frames), PDF carousel, HTML → PDF, Crop (blog presets, nudge/zoom), JPG/WebP compress, HEIC/HEIF → JPEG.
- Stack: Next.js 16 (App Router, `output: "export"`), React 19, TypeScript 5 strict, one stylesheet `app/globals.css`, vendored `public/gif.js` / `gif.worker.js` / `html-to-image.js`, service worker `public/sw.js`. There is no Tailwind, PostCSS, ESLint config or backend.

## 2. Source of truth (highest wins)

1. Current code and tests.
2. `design.md` — UI contract.
3. `HANDOFF.md` — state, decisions, open questions.
4. `ROADMAP.md` — work queue.
5. `README.md` — overview. `build_galaxy.md` is the VibeCode platform reference.

Chat history, memory, old snapshots and summaries are hints, never truth. Repo drift is the most common failure: read a file before editing it, and if an anchor or assumption is missing, suspect drift first.

## 3. Dual deployment: survive static export + bare `node:http`

- Staging: GitHub → Vercel. Production: VibeCode, static `out/` served by a hand-written `server.js` (`node:http` only). See `build_galaxy.md`.
- Before every change ask: does this work as static files served by bare `node:http`? Forbidden: API/route handlers, server actions, middleware, SSR-only or dynamic rendering, `headers()` / `redirects()` / `rewrites()`, the `next/image` optimizer, `cookies()` / `headers()`, runtime `process.env` in client code, runtime network dependencies (CDN fonts/scripts).
- `npm start` is broken under static export (`next start` refuses `output: "export"`). Do not use or "fix" it without the human (HANDOFF, open question 1). To preview: `npm run build`, then serve `out/`.

## 4. Autonomy and token economy

Work end to end without check-ins. The human reads the result, not the process.

- Output = the deliverable plus at most 3 lines: the assumption made, what is blocked, how to run it. No preamble, no restating the task, no closing recap, no narrating tool calls, no apologies, no re-explaining known rules.
- Ask at most ONE question, only when readings diverge materially or an item from section 9 applies. Otherwise state the assumption in one line and proceed.
- Reply in Russian. Think, code, comments, identifiers and commit messages in English.
- Read narrowly: `grep` or line ranges before opening a file; never re-read a file you just wrote; never paste whole files or long logs into chat (quote at most 10 lines). Run independent reads and commands in parallel. Do not re-verify what a green `npm run verify` already proved.
- Prefer edits and diffs over rewrites. One coherent change per commit. No scope creep, unrequested refactors, docs, abstractions or defensive code.
- Keep docs short and update the single canonical place; never duplicate a rule.
- Stop when the acceptance criteria are met.

## 5. Delivering changes

- Agent with repo access: edit directly on the working branch, commit locally in small scoped commits, run `npm run verify` before each commit. Push or merge only when asked.
- Out-of-band (chat → Codespaces): one standalone Python patch `giftomat_<scope>_YYYYMMDD_vN.py`. Every patch gets a new versioned name; it is git-ignored and never committed. Flags: `--diagnose`, `--verify`, `--apply`, `--commit`, `--push`. `--apply` runs prerequisites, applies, runs the gate, commits/pushes when asked, then deletes itself after success (`--keep` retains it).
- Patch rules: exact-string anchors, never line numbers. All-or-nothing: check every anchor before writing anything and restore on failure. Idempotent: detect the applied state by the NEW text first, then OLD, and fail fast on drift. Before shipping, apply twice on a fresh extraction and confirm the second run changes nothing. Minimal diff. No historical marker comments in first-party code (smoke-check forbids them); markers live only inside patch scripts.

## 6. Quality gate

`npm run verify` = typecheck → unit tests → smoke-check → production build (must emit `out/index.html`). Node ≥ 22.6 is required because tests run with `--experimental-strip-types`. Everything must be green; "typecheck passes" is not done. Do not hardcode test counts.

New behavior needs a unit test in `tests/` (pure logic lives in `app/lib/`). New design or contract rules need an assertion in `scripts/smoke-check.mjs`. CI (`.github/workflows/verify.yml`) runs the same gate.

## 7. Engineering principles (as applied here)

- KISS / YAGNI: the smallest change that meets the acceptance criteria. Delete dead code; never comment it out. No speculative options.
- SRP / SoC: math and blob/file logic live in `app/lib/*` (pure, tested); components render and wire. `app/page.tsx` is an orchestrator under decomposition (ROADMAP R1.1): extract hooks/components when touching it, never grow it.
- DRY: one download path (`triggerDownload`), one binary helper set (`app/lib/binary.ts`), one intake/drop-zone pattern. Reuse `app/lib/` helpers.
- Open/closed through data: presets are data in `app/lib/presets.ts`; add entries, not branches.
- Fail fast: validate at boundaries (file type/size, dimension bounds), throw clear errors in `lib`, show a Russian message in the UI. No swallowed errors except documented optional features (service worker registration).
- React 19: state updaters stay pure; side effects (Blob URL revoke, timers, listeners) live in effects with cleanup; no `any`; attach native non-passive listeners when `preventDefault()` is needed (React `onWheel` is passive).
- Language: UI copy is Russian. If pt-BR copy is ever added it must avoid English corporate jargon; flag it then. Everything else is English.
- Dependencies: none added without approval (section 9).

## 8. Regression-sensitive zones (change only with a dedicated check)

- GIF encoder `app/lib/encoder.ts` and vendored `public/gif.js`, `public/gif.worker.js`, `public/html-to-image.js`. Never edit vendored files. Repeating the first frame is a proven white-frame fix. `dispose: 2` was recorded as required but is absent from the code: unverified; add it only with a visual GIF check (ROADMAP R0.2).
- Crop rendering uses cover math (`drawCrop`): no letterbox bars, zoom never below 100%.
- Downloads go through `triggerDownload` only (temporary-anchor click, iframe-aware for the Bitrix24 preview). Never `<a download target="_blank">` on blob URLs; never a new `document.createElement("a")` outside `app/lib/download.ts`.
- `replaceImages` / `removeImage`: pure updaters, Blob URLs revoked outside them.
- HTML → PDF capture: `sandbox="allow-scripts"`, `referrerPolicy="no-referrer"`, accept `postMessage` only from the preview iframe.
- PWA: any shell or icon asset change bumps `CACHE_VERSION` in `public/sw.js`. `app/icon.png` and `public/giftomat-icon.png` stay byte-identical.

## 9. Ask the human first

- VibeCode boundary: `server.js`, `out/` tracking, start script, response headers, `next.config.ts`.
- Navigation IA (floating bottom-nav vs drawer): a product decision.
- New dependencies or devDependencies.
- Removing or renaming a user-facing feature.
- Changing design tokens or color roles.
- Triaging external review findings that are not in ROADMAP.
- Analytics or telemetry of any kind.

## 10. UI rules

`design.md` is the contract: tokens only (no hardcoded colors that exist as tokens), classes in `app/globals.css`, inline `style` only for dynamic values, no `!important`, no override layers (edit the canonical rule), responsive and symmetric layouts, no overlapping elements, touch targets ≥ 44px. Check layouts at 320×640, 360×800, 780×900, 1100×900 and 1440×1000 when a browser is available; otherwise report "not visually verified".

## 11. Commits

English, imperative, scoped: `feat(crop): …`, `fix(download): …`, `chore(docs): …`. One logical change each. Never commit patch scripts, snapshots, `.env*` or `out/` (unless the VibeCode decision in HANDOFF says otherwise).
