# August v3 — Dark Workbench

**Status: production canonical.**

August v3 is the single design system for Giftomat. The final production contract keeps the visual language deliberately small and unambiguous:

**Pale Canvas + Navy Dark Workbench + White Controls + Lime Actions + Purple Interaction + one Tangerine status badge.**

## 1. Core principles

1. **Navy is architecture.** Sidebar and media workbench are the stable dark anchors.
2. **White is interaction space.** Inputs, settings, active navigation and drop zones use White Surface.
3. **Lime is the primary bright action surface.** Execution, generate/prepare and completion/download actions use Lime + Ink.
4. **Purple is interaction detail.** Focus, selection, hover/drag emphasis and precise interactive cues use Purple.
5. **Tangerine is status-only.** `#FF8A2A` is reserved for the static **“Обработка локально”** badge.
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

Tangerine is intentionally scarce. It is used **only** as the background of the `Обработка локально` badge with Ink foreground.

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

Also Lime + Ink. The difference between execution and download is context/content, not a competing accent color.

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

Canonical source artwork: `public/giftomat-v3.png`.

The same bytes are copied to `app/icon.png` so Next.js owns the browser favicon through its file-based metadata convention. The top-left Giftomat brand mark and PWA manifest use `public/giftomat-v3.png`.

Visual language:

- deep Navy base;
- stacked White documents;
- PDF / GIF / JPG / HTML labels;
- Lime + Tangerine details;
- strong silhouette at small sizes.

Do not restore legacy favicon assets or a second metadata icon configuration.

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
- PWA icon: `public/giftomat-v3.png`;
- browser icon: `app/icon.png`;
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
- Lime download/completion + Ink;
- Tangerine local-processing badge + Ink;
- Purple focus/selection/drag feedback;
- White active navigation + Ink + Lime icon;
- restrained hover lift.

### Don’t

- Tangerine CTA buttons;
- Tangerine drop-zone interaction;
- Lime/Tangerine text on White;
- White text on Lime/Tangerine;
- multiple competing primary colors;
- hover static informational cards as if clickable;
- reintroduce migration CSS layers, Tailwind or `!important` without an explicit architectural decision.
