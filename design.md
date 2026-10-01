# August v3 — Dark Workbench

**Status: production canonical.**

August v3 is the single design system for Giftomat. The final production contract keeps the visual language deliberately small and unambiguous:

**Pale Canvas + Navy Dark Workbench + White Controls + Lime Actions + Purple Interaction + one Tangerine status badge.**

## 1. Core principles

1. **Navy is architecture.** Sidebar and media workbench are the stable dark anchors.
2. **White is interaction space.** Inputs, settings, active navigation and drop zones use White Surface.
3. **Lime is the primary bright action surface.** Execution, generate/prepare and completion/download actions use Lime + Ink.
4. **Purple is interaction detail.** Focus, selection, hover/drag emphasis and precise interactive cues use Purple.
5. **Tangerine is status/download-only.** `#FF8A2A` is reserved for the static **“Обработка локально”** badge and download/completion actions.
6. **Bright colors are surfaces, not small text.** Lime/Tangerine foreground text on White is forbidden.
7. **Motion confirms interactivity.** Hover movement is restrained and appears only on actionable controls.

## 2. Canonical palette

| Token | Value | Role |
|---|---:|---|
| `--august-ink` | `#151728` | primary text / foreground on bright surfaces |
| `--august-ink-soft` | `#292C3E` | secondary dark foreground |
| `--august-muted` | `#6F7385` | secondary text |
| `--august-canvas` | `#F7F8FC` | application canvas |
| `--august-surface` | `#FFFFFF` | controls, active nav, drop zone |
| `--august-soft` | `#F2F3F7` | quiet nested control surface |
| `--august-navy` | `#151728` | sidebar / deepest workbench |
| `--august-navy-raised` | `#1C1E33` | raised dark surface |
| `--august-navy-soft` | `#24263D` | preview/media surface |
| `--august-lime` | `#DFFF6A` | primary action / brand / progress / completion |
| `--august-lime-hover` | `#D2F650` | Lime hover |
| `--august-lime-active` | `#C3E93E` | Lime pressed |
| `--august-lime-ink` | `#151728` | mandatory foreground on Lime |
| `--august-purple` | `#6E5CF6` | focus / selection / interactive emphasis |
| `--august-purple-dark` | `#5140DC` | stronger interaction detail |
| `--august-purple-soft` | `#EEEAFF` | subtle interactive tint |
| `--august-orange` | `#FF8A2A` | local-processing status badge only |
| `--august-orange-ink` | `#151728` | foreground on Tangerine badge |

## 3. Color-role invariants

### Lime

Use Lime for:

- bottom/footer execution CTA: **Создать GIF, Создать PDF, Подготовить файл, Добавить/подготовить изображение** and equivalent actions;
- download/result actions;
- hero eyebrow chips;
- progress/completion accents;
- active sidebar icon tile;
- compact value surfaces where strong emphasis is useful.

Always use Ink on Lime. Never use White text on Lime.

### Purple

Use Purple for:

- `:focus-visible`;
- selected frame/control state;
- drop-zone hover and drag-active feedback;
- subtle interactive borders/tints;
- secondary interactive emphasis.

Purple is not the default primary CTA.

### Tangerine

Tangerine is intentionally scarce. It is used for the `Обработка локально` badge and explicit download/completion actions, always with Ink foreground.

Do not use Tangerine for:

- primary buttons;
- drop-zone hover/drag;
- add-frame hover;
- warnings/errors;
- links or selection.

This scarcity is what makes the status badge distinctive.

## 4. Surface hierarchy

1. **Canvas** — `#F7F8FC`.
2. **Sidebar** — Navy dark anchor.
3. **Media Workbench** — Navy preview/canvas surface.
4. **Control Panel** — White Surface with Navy hero/header.
5. **Drop Zone** — White Surface inside the Dark Workbench.
6. **Nested controls** — White/Soft with quiet borders.

Avoid glass-on-glass nesting and avoid turning every content block into a card.

## 5. Drop zone

The upload/drop target is always White even inside the Navy workbench.

- background: White Surface;
- title: Ink;
- supporting text: Muted;
- border: quiet dashed Ink border;
- hover: 2px lift + Purple border + subtle Purple tint + neutral shadow;
- drag-active: Purple ring/border;
- disabled: no hover movement.

The drop zone never uses Lime or Tangerine as small foreground text.

## 6. Sidebar

Sidebar is the permanent Navy dark anchor.

### Inactive item

- transparent/Navy surface;
- White title;
- muted light note/icon;
- hover may lift by 2px and brighten the surface;
- pressed state must keep text readable.

### Active item

- White Surface card;
- Ink title;
- Muted note;
- Lime icon tile with Ink icon;
- pressed state explicitly preserves Ink, including `-webkit-text-fill-color`.

## 7. Dark Workbench

The media/canvas side is a large Navy work surface rather than another White SaaS card.

- media preview sits on Navy/Navy Soft;
- controls over arbitrary media use high-contrast dark glass only when required;
- the White drop zone is a deliberate interaction island inside the workbench;
- static decoration stays restrained.

## 8. Control panel and hero

The settings panel is White. Its heading is a Navy hero surface.

- title: White;
- supporting copy: dark-secondary;
- eyebrow chip: Lime + Ink;
- controls below: White/Soft;
- footer execution CTA: Lime + Ink.

## 9. Buttons

### Primary / execution — `.primary-button`

- Lime background;
- Ink text;
- 48px+ height;
- hover: Lime Hover + `translateY(-2px)` + restrained Lime shadow;
- active: Lime Active + `scale(.98)`;
- focus-visible: Purple ring.

Disabled CTA keeps the same semantic color but reduced opacity and no interaction shadow.

### Download / completion — `.download-button`

Tangerine + Ink. Download/completion is visually distinct from Lime execution while staying inside the same high-contrast system.

### Secondary / icon

- White/Soft on light panels;
- translucent White on Navy;
- hover: 1–2px lift, slightly stronger border/shadow;
- focus: Purple.

## 10. Local-processing badge

`Обработка локально` is the one Tangerine surface in the product chrome.

- background: `#FF8A2A`;
- foreground/icon: Ink;
- pill geometry;
- warm subtle shadow;
- it is a status statement, not a CTA.

## 11. Hover and motion

Hover feedback belongs only to interactive elements:

- nav destinations;
- buttons;
- drop zone;
- frame/add-frame controls;
- segmented controls;
- crop ratio controls;
- PDF/select container.

Default motion: `translateY(-1px)` or `translateY(-2px)` plus a restrained shadow. Avoid scale-up hover. Pressed state may use `scale(.98)`.

`prefers-reduced-motion: reduce` must suppress nonessential animation/transitions.

## 12. Forms and selection

- input surfaces: White/Soft;
- field text: Ink;
- helper text: Muted;
- focus: Purple;
- frame selection: Purple border/ring;
- range track: Navy → Purple;
- range thumb: Lime + Navy border;
- compact highlighted value: Lime + Ink.

## 13. Typography

Self-hosted Inter Variable is canonical.

- display/hero: strong weight and tight tracking;
- control title: compact and explicit;
- eyebrow: uppercase/high tracking;
- body/help: restrained and readable;
- no decorative font changes inside media tools.

## 14. Radius and shadows

### Radius

- small controls: 10–14px;
- cards/fields: 14–18px;
- major surfaces: 20–24px;
- hero/workbench: 20–28px;
- chips/status: pill only where semantically appropriate.

### Shadows

- White controls: soft neutral shadow;
- Dark Workbench: deeper Navy shadow;
- Lime CTA: restrained olive/lime shadow;
- Purple glow: focus/selection only;
- Tangerine warm shadow: local-processing badge only.

## 15. Favicon and product mark

Canonical binary source: `app/icon.png`.

`app/icon.png` is the Next.js file-based browser favicon. A byte-identical copy is stored at `public/giftomat-icon.png` for runtime surfaces that require a public URL. The top-left Giftomat brand mark, PWA manifest and service-worker shell use `/giftomat-icon.png?v=20260828-v8`.

Current visual language:

- square 1:1 icon;
- Lime background;
- one centered file/document symbol;
- dark Ink/Navy details;
- visible GIF / PDF / JPG labels;
- simple geometric silhouette that remains recognizable at favicon size;
- no extra floating decoration.

Do not restore `public/giftomat-v3.png`, legacy favicon assets, or a second metadata icon configuration.

## 16. Accessibility and responsive rules

- Ink on Lime/Tangerine;
- no Lime/Tangerine body text on White/Canvas;
- visible Purple focus ring on White and Navy;
- active sidebar text must remain readable in Safari;
- touch targets ≥44×44px where practical;
- hover is never the only action signal;
- check 360×800, 780×900, 1100×900 and 1440×1000.

## 17. PWA/browser chrome

- theme color: Navy `#151728`;
- background: Canvas `#F7F8FC`;
- PWA/runtime icon: `public/giftomat-icon.png` (byte-identical to `app/icon.png`);
- browser favicon source: `app/icon.png`;
- bump `CACHE_VERSION` when shell/icon assets change.

## 18. Engineering rules

1. `app/globals.css` is the single styling source of truth.
2. Edit canonical rules; never append versioned override layers.
3. No `!important`.
4. No ambiguous generic accent/action aliases.
5. Keep React functional state updaters pure.
6. Reuse `app/lib/` helpers instead of duplicating download/binary logic.
7. Do not modify `public/gif.js`, `public/gif.worker.js` or `public/html-to-image.js` during unrelated work.
8. Keep HTML capture sandbox/source validation and production security headers.
9. Run `npm run verify` before every production commit.

## 19. Do / Don’t

### Do

- White drop zone on Navy;
- Lime primary/footer CTA + Ink;
- Tangerine download/completion + Ink;
- Tangerine local-processing badge + Ink;
- Purple focus/selection/drag feedback;
- White active navigation + Ink + Lime icon;
- restrained hover lift.

### Don’t

- Tangerine primary/execution CTA buttons;
- Tangerine drop-zone interaction;
- Lime/Tangerine text on White;
- White text on Lime/Tangerine;
- multiple competing primary colors;
- hover static informational cards as if clickable;
- reintroduce migration CSS layers, Tailwind or `!important` without an explicit architectural decision.

## 20. Layout and responsive contract

1. **Symmetry.** Compose every screen from centered groups with equal gaps (8 / 10 / 12 / 14 / 20 px) and mirrored paddings. Groups wrap as whole units; never leave a single orphaned control on a row.
2. **No overlap.** Nothing may cover interactive content. Permitted overlays: the non-interactive frame-size chip on the Crop stage, delete badges on frame cards, the processing overlay, and the mobile drawer with its backdrop.
3. **Fluid containers.** Children of grid/flex rows that hold text or controls set `min-width: 0`; long text uses `overflow-wrap: anywhere`; fixed widths are reserved for icon buttons and aspect-ratio frames.
4. **No page-level horizontal scroll** at any width ≥ 320px. Wide content scrolls inside its own container.
5. **Breakpoints:** ≤ 620px phone, ≤ 980px stacked (canvas above controls, drawer navigation), ≥ 981px two-pane workbench, ≥ 1500px wide. Adding a breakpoint requires a `design.md` change.
6. **Touch targets** are at least 44 × 44px; icon buttons are 44px.
7. **Hover** styles in new rules live inside `@media (hover: hover)`; hover is never the only signal.
8. **Inline `style`** is for dynamic values only (aspect-ratio, object-position, CSS custom properties). Static styling belongs in `app/globals.css`.
9. **Verify** at 320×640, 360×800, 780×900, 1100×900 and 1440×1000 (extends section 16). Without a browser, report "not visually verified".

## 21. Crop fine positioning

- Controls sit directly under the Crop stage in `.crop-nudge-bar`: one group of four arrows (← ↑ ↓ →) and one group with zoom − / value / +. Both groups are centered; buttons are 44 × 44px, translucent white on the Navy workbench, Purple on hover/press/focus, never Lime or Tangerine.
- An arrow moves the image in the arrow direction by 1 exported pixel. Holding repeats after 400 ms at 45 ms intervals. With the canvas focused: arrows move 1px, Shift + arrow 10px, `+` / `-` change zoom.
- Zoom ranges 100–400%: 5% per button step, 8% per wheel step. It never goes below 100% (cover rule: no letterbox bars). Buttons disable at their limits; an axis with no spare room disables its arrows.
- The empty Crop drop zone accepts a dragged file; the drag state uses the Purple ring of `.canvas-panel.dragging`. Dropping a file never navigates the page away.

## 22. Shared workspace components

- `ResultCard` is the single completion/download pattern for GIF/PDF/Compress, Crop and HTML → PDF. Result and progress containers use `aria-live="polite"`.
- Generic form controls use `range-input` and `preset-select-*`; tool-specific legacy class names are forbidden.
- GIF frame reordering must work without drag: the selected frame exposes 44×44 left/right move buttons in the canvas toolbar.
- Crop multi-file work uses a horizontal thumbnail strip. Each source keeps its own zoom and X/Y offsets; selecting another source restores that source's position.
- Crop accepts multiple PNG/JPG/WebP/AVIF/HEIC/HEIF files. Batch export produces one ZIP and replaces the in-memory sources with the rendered crops.
- Upload and download actions stay in the current application context; downloads never open a new browser window.
- `app/globals.css` may define a selector only once per media/support scope. The smoke gate enforces this.

## 23. Open design decisions

- **Navigation IA.** Current mobile navigation is a drawer (toggle + backdrop). The alternative for five destinations is a floating bottom-nav. Needs Paulo's sign-off before any implementation. An earlier note cites "August §17.3" in favor of bottom-nav; this file has no such section (§17 is PWA/browser chrome), so treat it as an unverified preference.

<!-- GIFTOMAT_LATEST_DECISIONS_START -->
## Latest approved product/design decisions — August 28, 2026

These decisions extend the August v3 system and should be treated as current constraints in future sprints.

### Action hierarchy

- Lime remains the execution color for create/prepare/generate actions.
- Tangerine (`#FF8A2A`) is also approved for explicit download/completion actions, in addition to the local-processing status surface.
- In the right settings panel, the primary create action belongs immediately after the final relevant setting.
- A generated result and its download action belong below the create action, never above it.

### GIF interaction

- GIF formats are neutral presets rather than platform warnings.
- Supported product directions include source ratio, X 16:9, 1:1, 4:5 and 9:16.
- When a fixed output ratio is selected, users can reposition each frame inside the output canvas.
- Frame order is user-controlled by drag and drop.
- Reordering and frame positioning are separate interactions and must not overwrite each other's state.

### Crop interaction

- Crop must expose a clear/remove-current-image action when an image is loaded.
- Clearing the Crop source removes only the active image, not the whole workspace.
- Editorial/media crop presets include:
  - `1320 × 768 px` — wide media/editorial image;
  - `1080 × 1350 px` — portrait 4:5 media/social image;
  - `1024 × 512 px` — blog cover (2:1);
  - `950 × 417 px` — blog preview.
- Fine positioning controls and drag-and-drop intake are specified in section 21.

### Product icon direction — landed

Visual direction of the canonical `app/icon.png` (landed):

- square 1:1 asset;
- Lime background;
- one centered file/document mark;
- dark Ink/Navy details;
- visible `gif`, `pdf`, `jpg` labels;
- simple, geometric, premium and legible at small favicon sizes;
- no extra floating objects and no unnecessary text.

`app/icon.png` is the canonical favicon/application binary. `public/giftomat-icon.png` is its byte-identical public runtime copy, and manifest/service-worker/top-left references use `/giftomat-icon.png?v=20260828-v8`.
<!-- GIFTOMAT_LATEST_DECISIONS_END -->
