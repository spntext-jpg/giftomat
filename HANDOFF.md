# Giftomat — Handoff

**Status:** active cross-sprint handoff  
**Last synchronized:** August 28, 2026  
**Primary truth:** current repository code + `design.md` + this handoff.  
**Quality gate:** `npm run verify`

## 1. Product

Giftomat is a local browser media studio built with Next.js 16 / React 19 / TypeScript 5. Core media processing remains client-side.

Current tools:

- GIF from images;
- video → GIF frames;
- PDF carousel;
- HTML → PDF;
- Crop;
- JPG/WebP compression;
- HEIC/HEIF conversion;
- PWA/offline shell.

Do not replace working local-processing flows with a server pipeline unless explicitly requested.

## 2. Landed August 28, 2026 changes

### GIF

- Added output presets:
  - source ratio;
  - X · 16:9;
  - square · 1:1;
  - portrait · 4:5;
  - vertical · 9:16.
- Removed the old warning that a portrait GIF is inherently “too vertical for X”.
- Fixed presets use cover rendering and allow per-frame positioning inside the frame.
- Frame thumbnails support drag-and-drop reordering.
- Frame order, frame duration and per-frame positioning must stay attached to the correct frame.

### Right control panel / actions

- Create/prepare/generate actions were moved up into the settings flow.
- The execution button sits directly after the last relevant setting.
- Once a result exists, the result/download area appears below that create action.
- Execution actions: Lime + Ink.
- Download/completion actions: Tangerine `#FF8A2A` + Ink.
- Do not restore the old layout where Download appears above Create.

### Crop

- Added a visible clear/remove-current-image action in the loaded Crop state.
- The action removes only the active source image, preserving unrelated workspace frames.
- Added editorial/media presets:
  - `1320 × 768 px` — wide media/editorial;
  - `1080 × 1350 px` — portrait 4:5.

## 4. Canonical design constraints

Base system: **August v3 — Dark Workbench**.

Core tokens:

- Ink `#151728`;
- Canvas `#F7F8FC`;
- White Surface `#FFFFFF`;
- Navy `#151728`;
- Lime `#DFFF6A`;
- Purple `#6E5CF6`;
- Tangerine `#FF8A2A`.

Current color roles:

- Navy = architecture/workbench;
- White = interaction surfaces;
- Lime = execution/create/progress;
- Purple = focus/selection/drag interaction;
- Tangerine = local-processing status and explicit download/completion actions;
- Ink = text on Lime/Tangerine.

Keep `app/globals.css` as the single styling source of truth. No Tailwind, no `!important`, no migration override layers.

## 5. Engineering rules

- Think and write code/comments/identifiers/commit messages in English.
- Make surgical changes; do not refactor unrelated working code.
- Preserve current GIF generation and existing browser-local processing.
- Reuse helpers from `app/lib/`.
- Keep React functional state updaters pure.
- Do not touch vendored `public/gif.js`, `public/gif.worker.js` or `public/html-to-image.js` during unrelated work.
- Preserve HTML sandbox/source validation and security headers.
- For Next.js 16 convention/API changes, verify against installed Next.js docs or current official docs.
- Deployment remains automatic through Vercel after push.

## 6. Patch-script workflow

For every new sprint/fix:

- produce one Python patch script whenever practical;
- every new patch gets a **new versioned filename**;
- never reuse or overwrite the previous script name;
- preferred naming: `giftomat_<scope>_YYYYMMDD_vN.py`;
- make scripts safe against the current working-tree state where practical;
- run `git diff --check`;
- run `npm run verify`;
- patch scripts themselves stay untracked/ignored.

This rule exists because reusing an old filename caused Codespaces to execute a stale patch during the August 28 GIF sprint.

## 7. Documentation hierarchy

Use these files in this order:

1. current code and tests — implementation truth;
2. `design.md` — visual/design contract;
3. `HANDOFF.md` — cross-sprint decisions and pending work;
4. `README.md` — product/architecture/engineering overview.

Do not restore `AGENTS.md` or `CLAUDE.md`; their useful rules were intentionally consolidated into canonical repository documentation.

## 8. Before the next sprint

Start by reading:

- `HANDOFF.md`;
- `design.md`;
- `README.md`;
- relevant implementation files/tests.

If a new Repomix snapshot is supplied, treat that snapshot as the implementation source of truth and reconcile this handoff against it before coding.

Do not assume a previously proposed change landed merely because it appears in chat or documentation. Code/tests determine landed state.

<!-- GIFTOMAT_ICON_V8_START -->
## Canonical icon — landed August 28, 2026

The new Giftomat icon migration is complete.

- canonical binary source: `app/icon.png`;
- browser favicon: Next.js file-based `app/icon.png`;
- runtime/PWA copy: `public/giftomat-icon.png`, byte-identical to `app/icon.png`;
- top-left product mark: `/giftomat-icon.png?v=20260828-v8`;
- PWA manifest: `/giftomat-icon.png?v=20260828-v8`;
- service-worker shell: `/giftomat-icon.png?v=20260828-v8`;
- legacy `public/giftomat-v3.png`: removed;
- changing shell/icon assets requires a `CACHE_VERSION` bump;
- smoke-check verifies the canonical/public bytes and rejects legacy v3 references.

Visual direction:

- 1:1 square;
- Lime background;
- one centered file/document;
- dark Ink/Navy details;
- `gif`, `pdf`, `jpg` labels;
- modern minimal app-icon treatment;
- no unnecessary floating decoration.

Future icon updates must begin by replacing `app/icon.png`; the public runtime copy and references are then synchronized by a new versioned patch.
<!-- GIFTOMAT_ICON_V8_END -->
