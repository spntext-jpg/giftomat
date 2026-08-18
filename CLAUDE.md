# Giftomat — Engineering Guidelines

## Product contract

Giftomat is a browser-local media studio. Preserve user privacy and keep image, video, HTML, GIF, PDF, Crop and ZIP processing client-side unless a task explicitly changes the architecture.

## Change discipline

1. Make surgical changes. Do not refactor unrelated code.
2. Protect the working GIF pipeline. Do not modify `public/gif.js`, `public/gif.worker.js`, or encoder behavior as part of unrelated work.
3. Prefer one canonical implementation over compatibility layers, duplicate helpers, or migration shims.
4. Do not commit one-off patch/migration scripts.
5. Every behavior change needs a verifiable outcome and should extend tests when practical.

## August v3 — Dark Workbench

August v3 is the only UI design system for this repository. The complete contract lives in `design.md`.

Core roles:

- Canvas: `#F7F8FC`
- Surface: `#FFFFFF`
- Ink/Navy: `#151728`
- Lime Primary: `#DFFF6A` with Ink text
- Purple Interaction: `#6E5CF6` for focus and secondary selection
- Dark Workbench: Navy media/canvas surfaces
- Active navigation: White Surface + Ink text + Lime icon tile
- Typography: self-hosted Inter Variable

Lime is a filled action/brand surface, not low-contrast foreground text on White/Canvas. Never use White text on Lime. Purple must not compete with Lime as the default primary CTA.

### CSS rules

- `app/globals.css` is canonical. Edit existing component rules instead of appending versioned override blocks.
- Use the semantic roles defined in `design.md`; do not reintroduce ambiguous generic accent tokens.
- Avoid `!important`; fix specificity or rule order instead.
- Keep the sidebar and media workbench Navy; controls stay White.
- Sidebar `:active` states must explicitly preserve readable title/note colors, including `-webkit-text-fill-color`.
- Keep responsive behavior explicit at the existing compact/mobile breakpoints.
- Mobile/touch actions must remain at least 44×44 px where practical.
- Preserve visible Purple `:focus-visible` states and `prefers-reduced-motion`.
- Do not reintroduce Tailwind unless the product deliberately adopts it again.

## React and TypeScript

- Keep React state updaters pure. Create/revoke Blob URLs outside functional state updater callbacks.
- Reuse helpers from `app/lib/` instead of duplicating DOM/binary utilities in components.
- Revoke object URLs when results or source files are replaced/unmounted.
- Keep components focused; avoid state or effects that do not represent real UI/runtime state.

## Security and PWA

- Keep HTML capture sandboxed and accept capture messages only from the preview iframe.
- Keep framing protection and production security headers in `next.config.ts`.
- Service Worker registration is production-only.
- Bump `CACHE_VERSION` when the application shell or vendored runtime contract changes materially.

## Verification

Before committing, run `npm run verify`. It must pass typecheck, tests, smoke checks and the production build. UI changes should also be checked at 360×800, 780×900, 1100×900 and 1440×1000.
