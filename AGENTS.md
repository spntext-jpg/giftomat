# AGENTS.md — Giftomat

Read this before touching any code in this repository. This file governs how automated coding agents (Cursor, Codex CLI, Claude Code, etc.) operate here.

## What this project is
Giftomat — a privacy-first, fully client-side media studio in the browser. **No server-side media processing, ever.** Also ships as a PWA with offline support.

Instruments: GIF builder (incl. video→GIF frame extraction), PDF carousel, HTML→PDF, image crop (blog presets 1024×512 / 950×417, pan/nudge controls), JPG/WebP compression, HEIC/HEIF conversion.

Stack: Next.js (App Router), React, TypeScript, Tailwind CSS, Web Workers (`gif.worker.js`), service worker (`sw.js`).

## The one rule that overrides everything else: dual deployment
This app ships to two different targets from the same codebase:

1. **Staging** — GitHub → Vercel (full Next.js runtime).
2. **Production** — **VibeCode**: a static Next.js export served by a hand-rolled `server.js` on bare `node:http`. (VibeCode's own docs live under filenames containing "galaxy", e.g. `build_galaxy.md` — read those before changing anything export- or server-related.)

**Before writing any code that touches routing, data fetching, API routes, middleware, or server components: confirm it works under `next export` + bare `node:http`.** If a feature needs Next.js server runtime features unavailable in a static export, it will build fine and pass locally, then silently break in production. This is the single highest-risk failure mode in this repo.

## Non-negotiable engineering rules
- KISS, SOLID, DRY, YAGNI, SoC, fail-fast, POLA.
- No speculative abstractions, no defensive code, no refactors beyond the scope of the requested change.
- Surgical diffs only.

## How changes are made here
- Changes are delivered as **standalone, idempotent Python patch scripts**, not direct commits.
- Patch scripts expose: `--verify`, `--apply`, `--commit`, `--push`, `--diagnose`.
- Patch scripts must **no-op cleanly** if already applied (check for the target state, not just "did I run before").
- Use **anchor-based string replacement with exact-string anchors**. Never edit by line number — line numbers drift the moment the file changes.
- Mark every new code block with a versioned comment, e.g. `# GIFTOMAT_SPRINT_X_V1_<feature>`. Recognize legacy marker strings as an already-applied state so re-runs don't duplicate work.
- **Idempotency hazard**: if your anchor's replacement string contains the original anchor string as a substring (or vice versa), a second run of the script will silently mis-fire. Explicitly test both a fresh apply and a second apply-on-top-of-applied before shipping.
- The source of truth for "what's actually in the repo" is a repomix XML snapshot supplied at the start of a work session — **never assume it matches the live repo state**; repo drift is common and has caused real bugs before. If a patch fails to find its anchor, the first hypothesis is drift, not a bug in the patch logic.

## Required checks before any change is considered done
Run against a fresh extraction of the current snapshot/repo:
1. Typecheck
2. Full unit test suite
3. Smoke check
4. Production build (`next build` under the export config actually used for VibeCode)
5. PostCSS/Tailwind compile

All five must pass. Don't ship on "typecheck passes."

## Known resolved issues — do not reintroduce
- `DownloadButton` must remain its own component (was extracted specifically to fix a Turbopack JSX parsing error). Don't inline it back.
- Every `gif.addFrame()` call needs `dispose: 2` — omitting it reintroduces frame artifacts.
- Crop rendering must use `drawCover` logic — anything else reintroduces letterbox bars.
- Downloads must use a programmatic temporary-anchor `click()`, never `<a download target="_blank">` on a blob URL — the latter is unreliable across browsers for this app's blob sizes/types.
- Interactive elements have historically used inline `style={{}}` instead of Tailwind `className`, due to Tailwind v4 Preflight conflicts. **This may be partially superseded by the August Design System v3 token-based theming layer — check current file state before assuming either convention is authoritative, and don't mix both patterns in one component.**

## Design system
"August Design System v3" (Dark Workbench): Navy / Accent-purple / Growth-Lime token layer, Canvas shell, Navy sidebar, themed buttons/fields/panels/cards, mobile drawer with dark-glass treatment, accessibility touch-target sizing. Treat token definitions as the single source for color/spacing — don't hardcode values that already exist as tokens.

Open decision, **not yet greenlit**: navigation IA — floating bottom-nav bar vs. slide-in drawer (design guidance leans bottom-nav for ≤5 destinations, which matches the current 5 instruments). Do not implement either without explicit product sign-off — this is a product decision, not an engineering one.

## Key third-party dependencies
- `heic-to` — HEIC/HEIF conversion
- `html-to-image` — loaded as UMD build from `public/`, not npm-resolved at runtime
- Pygments — PDF syntax highlighting (Python-side tooling, not a JS runtime dep)
- `wkhtmltopdf` — HTML→PDF doc generation
- Python `markdown` — renders `.md` into PDF packages

## Commit / language conventions
- All code, identifiers, comments, and commit messages: **English**, regardless of the language used in product/marketing copy elsewhere in the org.
- Commit messages should be scoped and specific enough to trace back to the marker comment(s) they introduce.

## What agents should ask a human before doing
- Anything touching the VibeCode static-export/server.js boundary in a new way.
- The bottom-nav vs. drawer navigation decision.
- Any change to the inline-style vs. Tailwind-className convention.
- Anything implied by the Fable 5.1 external code review that isn't already an explicit ticket — that review exists as a document, not yet as triaged work items.
