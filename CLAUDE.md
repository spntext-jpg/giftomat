# Giftomat — Engineering Guidelines

## Product contract

Giftomat is a browser-local media studio. Preserve user privacy and keep image, video, HTML, GIF, PDF, Crop and ZIP processing client-side unless a task explicitly changes the architecture.

## Change discipline

1. Make surgical changes. Do not refactor unrelated code.
2. Protect the working GIF pipeline. Do not modify `public/gif.js`, `public/gif.worker.js`, or encoder behavior as part of unrelated work.
3. Prefer one canonical implementation over compatibility layers, duplicate helpers, or migration shims.
4. Do not commit one-off patch/migration scripts.
5. Every behavior change needs a verifiable outcome and should extend tests when practical.

## August Design System

August is the only UI design system for this repository.

- Canvas: `#F7F8FC`
- Surface: `#FFFFFF`
- Ink: `#171927`
- Muted: `#697084`
- Action/selection: August Purple `#6E5CF6`
- Dark anchor: Navy `#15172A`
- Growth Lime `#D7FF61` is reserved for semantic growth/progress accents, not generic selection.
- Typography: self-hosted Inter Variable.

The workspace stays light. The Navy sidebar is the stable dark anchor; do not reintroduce a fake OS-driven dark theme without a complete token contract.

### CSS rules

- `app/globals.css` is canonical. Edit existing component rules instead of appending versioned override blocks.
- Use semantic CSS custom properties for shared colors and surfaces.
- Avoid `!important`; fix specificity or rule order instead.
- Keep responsive behavior explicit at the existing compact/mobile breakpoints.
- Mobile/touch actions must remain at least 44×44 px where practical.
- Preserve visible `:focus-visible` states and `prefers-reduced-motion`.
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
