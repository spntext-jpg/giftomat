# August v3 — Dark Workbench

August v3 is the canonical design system for Giftomat. Revision **v3.1 — Tangerine Action** adds a warm execution accent and makes upload surfaces explicitly White while preserving the original Dark Workbench architecture.

## 1. Visual model

**Pale Canvas + Navy Dark Workbench + White Controls + Tangerine execution actions + Lime brand/completion accents + Purple interaction details.**

The interface should feel like a modern media workstation rather than a generic SaaS dashboard: large deliberate surfaces, restrained borders, strong hierarchy, bold contrast and a small number of clear color roles.

### Core principles

1. **Navy is architecture.** Sidebar and media workbench are deep Navy anchors.
2. **White is interaction space.** Inputs, control panels, active navigation and upload/drop zones use White Surface.
3. **Tangerine means “do it now”.** Execution CTAs that start processing/exporting use warm Tangerine with Ink text.
4. **Lime means brand/progress/completion.** Lime is used for brand moments, hero chips, progress, active icon tiles and completion/download actions. It is not ordinary text on White.
5. **Purple means interaction detail.** Focus rings, secondary selection and precise interactive cues use Purple.
6. **Bright accents are surfaces, not body text.** Lime or Orange as small text on White is forbidden.
7. **Motion confirms interactivity.** Hover lift/shadow is applied only to controls that are actually actionable.

## 2. Color tokens

### 2.1 Foundation

| Token | Value | Role |
|---|---:|---|
| `--august-ink` | `#151728` | primary text and foreground on bright surfaces |
| `--august-ink-soft` | `#292C3E` | secondary dark foreground |
| `--august-muted` | `#6F7385` | secondary text |
| `--august-canvas` | `#F7F8FC` | app canvas |
| `--august-surface` | `#FFFFFF` | controls, cards, active nav, drop zone |
| `--august-soft` | `#F2F3F7` | subtle control background |

### 2.2 Navy Dark Workbench

| Token | Value | Role |
|---|---:|---|
| `--august-navy` | `#151728` | sidebar / deepest workbench |
| `--august-navy-raised` | `#1C1E33` | raised dark surface |
| `--august-navy-soft` | `#24263D` | preview / media surface |
| `--august-dark-secondary` | `#B8BDCE` | secondary text on Navy |

### 2.3 Action Tangerine

| Token | Value | Role |
|---|---:|---|
| `--august-orange` | `#FF8A2A` | execution CTA, “Обработка локально” badge |
| `--august-orange-hover` | `#F97818` | hover execution CTA |
| `--august-orange-active` | `#E9680C` | pressed execution CTA |
| `--august-orange-soft` | `#FFF0E2` | optional subtle orange tint |
| `--august-orange-ink` | `#151728` | mandatory foreground on Orange |

**Orange contract:**

- `.primary-button` in the bottom control footer = Orange + Ink;
- “Обработка локально” = Orange + Ink;
- Orange may mark add/upload hover states;
- never use White text on Orange;
- Orange is not a warning/error color in Giftomat.

### 2.4 Brand Lime

| Token | Value | Role |
|---|---:|---|
| `--august-lime` | `#DFFF6A` | brand, hero chip, progress, active nav icon, completion/download |
| `--august-lime-hover` | `#D2F650` | hover completion action |
| `--august-lime-active` | `#C3E93E` | pressed completion action |
| `--august-lime-ink` | `#151728` | mandatory foreground on Lime |

**Lime contract:** Lime is a filled highlight/completion surface, not low-contrast foreground text on White/Canvas.

### 2.5 Purple Interaction

| Token | Value | Role |
|---|---:|---|
| `--august-purple` | `#6E5CF6` | focus, secondary selection |
| `--august-purple-dark` | `#5140DC` | stronger interaction detail |
| `--august-purple-soft` | `#EEEAFF` | subtle interactive tint |

Purple does not compete with Tangerine as the execution CTA and does not replace Lime brand/progress semantics.

## 3. Surface hierarchy

1. **Canvas** — `#F7F8FC`.
2. **Sidebar** — Navy dark anchor.
3. **Media Workbench** — Navy preview/canvas surface.
4. **Control Panel** — White Surface with a Navy hero/header.
5. **Drop Zone** — White Surface inside the Dark Workbench.
6. **Nested controls** — White/Soft with quiet borders.

Avoid glass-on-glass nesting and avoid turning every block into a card.

## 4. Upload / drop zone

The upload target is intentionally White even though it lives inside the Navy media workbench.

- background: White Surface;
- title: Ink;
- supporting text: Muted;
- border: quiet dashed Ink border;
- hover: 2px lift + Tangerine border + modest shadow;
- drag-active: Tangerine ring/border;
- disabled: no hover movement.

This creates a clear “place content here” affordance without using low-contrast Lime text on White.

## 5. Sidebar

Sidebar is the stable Navy dark anchor.

### Inactive item

- Navy/transparent surface;
- White title;
- muted light note/icon;
- hover may lift by 2px and brighten the surface;
- text color must never disappear on hover/press.

### Active item

- White Surface card;
- Ink title;
- Muted note;
- Lime icon tile + Ink icon;
- pressed state must explicitly preserve Ink including `-webkit-text-fill-color`.

## 6. Control panel and hero

The settings panel is White. Its heading is a Navy hero surface.

- hero title: White;
- supporting copy: `--august-dark-secondary`;
- eyebrow chip: Lime + Ink;
- controls below: White/Soft;
- execution CTA in footer: Tangerine + Ink.

## 7. Buttons

### Execution CTA — `.primary-button`

Used for actions such as Create PDF, Add image, Prepare file, Generate/export and other bottom-footer actions.

- Orange background;
- Ink text;
- 48px+ touch height;
- hover: Orange Hover + `translateY(-2px)` + warm shadow;
- active: Orange Active + `scale(.98)`;
- focus-visible: Purple two-stage ring.

### Completion / download — `.download-button`

- Lime background;
- Ink text;
- hover: Lime Hover + lift;
- active: Lime Active;
- this color difference deliberately separates “run processing” from “result is ready / download”.

### Secondary / icon buttons

- White/Soft surfaces on light panels;
- translucent White on the Navy workbench;
- hover: 1–2px lift, slightly stronger border and shadow;
- Purple remains the focus color.

## 8. Hover and motion

Hover feedback is reserved for interactive elements:

- buttons;
- navigation destinations;
- upload/drop zones;
- frame selectors/add-frame;
- crop ratio control;
- PDF/select container.

Default hover motion: `translateY(-1px)` or `translateY(-2px)` plus a short shadow. Avoid scale-up hover because it causes layout instability. Pressed state may use `scale(.98)`.

Under `prefers-reduced-motion: reduce`, transitions/animations must remain suppressed.

## 9. Forms and selection

- input/control surfaces: White/Soft;
- field text: Ink;
- helper text: Muted;
- focus: Purple ring;
- frame selection: Purple border/ring;
- range track: Navy → Purple;
- range thumb: Lime with Navy border;
- numeric output/value pill: Lime + Ink where it represents a compact value, never Lime text on White.

## 10. Typography

Self-hosted Inter Variable is canonical.

- display/hero: strong weight, tight tracking;
- control titles: compact and explicit;
- eyebrow labels: uppercase, high tracking;
- body/help: restrained, readable;
- avoid decorative font changes inside media utilities.

## 11. Radius system

- small controls: 10–14px;
- cards/fields: 14–18px;
- major surfaces: 20–24px;
- hero/workbench: 20–28px;
- chips/status pills: pill only when semantically appropriate.

Do not apply a single radius to every object.

## 12. Shadows

Shadows communicate hierarchy, not decoration.

- White controls: soft neutral shadow;
- Dark Workbench: deeper Navy shadow;
- Tangerine CTA: restrained warm shadow;
- Lime completion action: restrained olive/lime shadow;
- Purple glow is reserved for focus/selection.

## 13. Favicon / app icon

Canonical asset: `public/giftomat-v3.png`.

Visual language:

- deep Navy base;
- stacked White documents;
- labels PDF / GIF / JPG / HTML;
- Lime and Tangerine details;
- strong silhouette and generous padding for small icon sizes.

Do not keep competing legacy favicon assets in `app/favicon.ico`, `public/favicon.ico` or the old `giftomat-favicon-stack-v4.png`.

## 14. Accessibility

- Ink on Orange must remain high contrast;
- Ink on Lime must remain high contrast;
- White/Canvas never uses Lime or Orange as small body text;
- visible Purple focus ring on both White and Navy;
- touch targets are at least 44×44px where practical;
- hover must never be the only signal for an action;
- active sidebar text remains readable in Safari via explicit text fill color.

## 15. Responsive behavior

Canonical review viewports:

- 360×800;
- 780×900;
- 1100×900;
- 1440×1000.

Mobile drawer remains Navy. White drop zones and Tangerine footer CTA retain the same semantic roles on compact layouts.

## 16. PWA and browser chrome

- theme color: Navy `#151728`;
- background color: Canvas `#F7F8FC`;
- PWA icon: `public/giftomat-v3.png`;
- bump the service-worker cache namespace when shell/icon assets change.

## 17. Implementation rules

1. `app/globals.css` is the single styling source of truth.
2. Edit canonical rules; do not append versioned override layers.
3. No `!important`.
4. Do not introduce ambiguous generic `accent` tokens.
5. Prefer semantic roles: Action Tangerine / Brand Lime / Purple Interaction / Navy Workbench / White Surface.
6. Vendored `gif.js`, worker and `html-to-image.js` are outside design refactors.
7. Run `npm run verify` before commit.

## 18. Do / Don’t

### Do

- White drop zone on Navy workbench;
- Tangerine execution CTA + Ink;
- Tangerine local-processing badge + Ink;
- Lime completion/download + Ink;
- Lime chip on Navy hero;
- White active navigation + Ink + Lime icon;
- Purple focus rings;
- restrained hover lift on actionable elements.

### Don’t

- Lime text on White/Canvas;
- Orange text on White/Canvas;
- White text on Lime/Orange;
- make every button the same accent color;
- hover static informational cards as if they were clickable;
- reintroduce migration CSS layers or `!important`.
