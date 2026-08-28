# Giftomat

Giftomat — локальная браузерная медиастудия для подготовки GIF, PDF, изображений и HTML-документов. Основная обработка выполняется на устройстве пользователя: исходные изображения, видео и HTML не отправляются в отдельный media-processing backend.

## Возможности

- **GIF** из изображений с индивидуальной длительностью кадров, изменяемым порядком, social-пресетами и ручным позиционированием внутри фиксированного формата.
- **Video → GIF frames**: локальное извлечение кадров из MP4/WebM/MOV до 200 МБ.
- **PDF-карусели** с social/document preset'ами и режимами contain/cover.
- **HTML → PDF** через sandbox preview и постраничный рендер.
- **Crop** одного изображения или всей загруженной пачки под готовые и произвольные размеры, включая пресеты для СМИ 1320 × 768 и 1080 × 1350 px.
- **Compress** в JPG/WebP с ZIP для пакетной выгрузки.
- **HEIC/HEIF** → JPEG перед дальнейшей браузерной обработкой.
- **PWA/offline shell** для интерфейса и локальных vendored runtime-библиотек.

## Архитектура и приватность

Giftomat не имеет серверного media-processing pipeline. Canvas, GIF-кодирование, PDF, Crop, ZIP, HTML capture и видео-кадры обрабатываются в браузере. Blob URL освобождаются после использования. Service Worker регистрируется только в production.

Ключевые части:

- `app/page.tsx` — основной workspace и переключение инструментов;
- `app/components/` — Crop, HTML→PDF, Video import и Service Worker registration;
- `app/lib/` — media, binary, download и encoder helpers;
- `public/gif.js` + `public/gif.worker.js` — vendored GIF runtime;
- `public/html-to-image.js` — vendored HTML capture runtime;
- `scripts/smoke-check.mjs` — продуктовые, design, PWA, security и repository-hygiene contracts;
- `tests/` — unit/regression tests.

## August v3 — Dark Workbench

`design.md` — единственный канонический документ дизайн-системы.

Финальная цветовая модель:

- Canvas `#F7F8FC`;
- Navy `#151728` — sidebar и media workbench;
- White `#FFFFFF` — controls, active navigation и drop-zone;
- Lime `#DFFF6A` + Ink — primary/execution, hero chips и progress;
- Purple `#6E5CF6` — focus, selection и hover/drag interaction details;
- Tangerine `#FF8A2A` + Ink — badge `Обработка локально` и download/completion actions.

Ключевое правило контраста: яркие Lime/Tangerine используются как поверхности с Ink-текстом, а не как мелкий foreground на White/Canvas.

Стили находятся в одном `app/globals.css`: без Tailwind, `!important` и migration override layers.

## Favicon / app icon

- `app/icon.png` — canonical binary source and Next.js file-based browser favicon.
- `public/giftomat-icon.png` — byte-identical runtime/PWA/brand copy generated from `app/icon.png`.
- top-left Giftomat product mark uses `/giftomat-icon.png?v=20260828-v8`;
- PWA manifest and service-worker shell use `/giftomat-icon.png?v=20260828-v8`;
- legacy `public/giftomat-v3.png` is removed.

When changing the icon, replace `app/icon.png` first, synchronize the public copy/runtime references, bump `CACHE_VERSION`, and run `npm run verify`.

## Технологии

- Next.js 16;
- React 19;
- TypeScript 5;
- self-hosted Inter Variable;
- browser Canvas / Blob / Web Worker APIs.

## Quality gate

Перед production commit обязательно:

```bash
npm run verify
```

`verify` последовательно выполняет:

1. TypeScript typecheck;
2. unit/regression tests;
3. smoke-check продуктовых, design, security и repository contracts;
4. production `next build`.

Изменение считается готовым только после полного зелёного gate.

## Engineering contract

- Делать хирургические изменения и не рефакторить несвязанный работающий код.
- Не менять vendored GIF runtime и encoder contract без отдельного regression pass.
- Не добавлять одноразовые migration/patch scripts в Git.
- Не наслаивать CSS override-блоки; изменять каноническое component rule.
- React functional state updaters должны оставаться чистыми; Blob URL side effects выполняются вне updater.
- Общие download/binary/media операции переиспользуют `app/lib/` helpers.
- HTML capture остаётся sandboxed и принимает сообщения только от своего preview iframe.
- Production security headers в `next.config.ts` не ослабляются без отдельного security review.
- Next.js 16 version-sensitive API/convention changes проверяются по установленной документации `node_modules/next/dist/docs/` или актуальной официальной документации перед изменением framework-level кода.
- При изменении PWA shell обновляется `CACHE_VERSION` в `public/sw.js`.
- UI-контракт и цветовые роли описываются только в `design.md`, без отдельных AI-specific instruction files.

## Repository hygiene

В Git не должны попадать:

- `.next/`, `node_modules/`, `*.tsbuildinfo`;
- Repomix snapshots;
- patch/diff-файлы;
- `giftomat_*.py`, `apply_*.py`, `fix_*.py`;
- Python caches.

`AGENTS.md` и `CLAUDE.md` намеренно удалены: их полезные правила консолидированы здесь и в `design.md`, чтобы не поддерживать несколько расходящихся источников истины.

## Production

Основная release-проверка — `npm run verify`. После успешного commit/push ветки `main` production deployment выполняется существующим Vercel workflow проекта.

<!-- GIFTOMAT_CURRENT_STATE_START -->
## Current product state — August 28, 2026

The repository state after the August 28 sprints includes:

- GIF output presets: source ratio, X 16:9, square 1:1, portrait 4:5 and vertical 9:16.
- Fixed GIF presets support per-frame positioning inside the output frame.
- GIF frame thumbnails can be reordered by drag and drop; frame IDs and individual timing remain attached to the frame.
- The old warning that treated a portrait GIF as inherently unsuitable for X is removed. X is one optional output preset, not a global GIF constraint.
- Primary create/prepare actions live directly after the relevant settings in the right control panel; generated result/download controls appear below the create action.
- Download/completion actions use Tangerine (`#FF8A2A`) + Ink, while execution/create actions remain Lime + Ink.
- Crop supports clearing/removing the currently active image so another source can be added without resetting unrelated frames.
- Crop includes editorial/media presets for `1320 × 768 px` and `1080 × 1350 px`.
- `npm run verify` remains the mandatory production quality gate.

### Icon migration status — completed

A new square Giftomat icon has been approved for the next asset update:

- bright Lime background;
- one centered file/document symbol;
- `gif`, `pdf`, `jpg` labels;
- modern minimal app-icon treatment;
- intended canonical filename: `app/icon.png`;
- intended use: browser favicon and application/PWA icon.

The icon migration is complete: `app/icon.png` is the canonical binary source and `public/giftomat-icon.png` is its byte-identical runtime/PWA copy. The PWA manifest, service worker and top-left brand mark use `/giftomat-icon.png?v=20260828-v8`. Legacy `public/giftomat-v3.png` is removed, and the service-worker cache version is bumped with the asset migration.

### Patch workflow

Every new Giftomat patch script must use a new versioned filename. Never overwrite or reuse a previous patch filename.

Preferred form:

`giftomat_<scope>_YYYYMMDD_vN.py`

Patch scripts are local migration artifacts and must not be committed to Git.
<!-- GIFTOMAT_CURRENT_STATE_END -->
