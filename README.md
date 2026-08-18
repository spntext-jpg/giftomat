# Giftomat

Giftomat — локальная браузерная студия для подготовки медиафайлов. Основные операции выполняются на устройстве пользователя: исходные изображения, видео и HTML не отправляются на сервер.

## Возможности

- **GIF** из изображений с индивидуальной длительностью кадров и сохранением ориентации первого кадра.
- **Video → GIF frames**: локальное извлечение кадров из MP4/WebM/MOV до 200 МБ.
- **PDF-карусели** с готовыми social/document пресетами и режимами contain/cover.
- **HTML → PDF** через sandbox-предпросмотр и постраничный рендер.
- **Crop** одного изображения или всей загруженной пачки под готовые и произвольные размеры.
- **Compress** в JPG/WebP; несколько файлов собираются в ZIP.
- **HEIC/HEIF** автоматически конвертируется в JPEG перед дальнейшей обработкой.
- **PWA/offline shell** для основного интерфейса и локальных runtime-библиотек.

## Приватность и архитектура

Giftomat не имеет серверного media-processing pipeline. Canvas, GIF-кодирование, PDF, Crop, ZIP, HTML capture и видео-кадры работают в браузере. Blob URL освобождаются после использования. Service Worker регистрируется только в production.

Ключевые части:

- `app/page.tsx` — основной workspace и маршрутизация между инструментами;
- `app/components/` — Crop, HTML→PDF, Video import и Service Worker registration;
- `app/lib/` — чистые media/binary helpers и encoder orchestration;
- `public/gif.js` + `public/gif.worker.js` — vendored GIF runtime;
- `public/html-to-image.js` — vendored HTML capture runtime;
- `scripts/smoke-check.mjs` — проверки продуктовых контрактов;
- `tests/` — unit/regression tests.

## Дизайн-система

Интерфейс использует **August v3 — Dark Workbench**:

- светлый Canvas `#F7F8FC`;
- Navy `#151728` для sidebar и media workbench;
- Lime `#DFFF6A` как filled primary/brand accent с Ink-текстом;
- Purple `#6E5CF6` для focus и secondary selection;
- White Surface для controls и active navigation;
- тёмный hero/header над белой панелью настроек;
- Inter Variable локально из `app/fonts/`;
- touch targets от 44 px на compact viewport;
- `prefers-reduced-motion` поддерживается;
- стили находятся в одном каноническом `app/globals.css` без `!important` и migration override layers.

Ключевое правило контраста: **Lime не используется как обычный foreground на White/Canvas**. Primary actions используют Lime background + Ink text. Полный контракт находится в [`design.md`](./design.md).

Tailwind намеренно не используется: интерфейс построен на semantic/component classes и CSS custom properties.

## Локальная разработка

```bash
npm install
npm run dev
```

## Проверка перед коммитом

```bash
npm run verify
```

`verify` последовательно запускает:

1. TypeScript typecheck;
2. unit/regression tests;
3. smoke-check продуктовых и security-контрактов;
4. production build Next.js.

Изменение считается готовым только после полного зелёного `npm run verify`.

## Правила сопровождения

- Не добавлять одноразовые migration/patch scripts в репозиторий.
- Не наслаивать новые CSS override-блоки; изменять канонический component rule.
- Не менять vendored GIF runtime и параметры кодирования без отдельного regression pass.
- При изменениях PWA shell обновлять `CACHE_VERSION` в `public/sw.js`.
- Новые media-функции должны оставаться browser-local, если продуктовая задача явно не требует сервера.