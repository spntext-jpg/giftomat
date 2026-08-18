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

Интерфейс использует **August Design System**:

- светлый Canvas `#F7F8FC` и Surface `#FFFFFF`;
- постоянный Navy sidebar `#15172A` как единственный dark anchor;
- August Purple `#6E5CF6` для action/selection;
- Growth Lime используется только как смысловой акцент, а не как общий selected-state;
- Inter Variable локально из `app/fonts/`;
- touch targets от 44 px на compact viewport;
- `prefers-reduced-motion` поддерживается;
- стили находятся в одном каноническом `app/globals.css` без миграционных override-слоёв и без `!important`.

Tailwind намеренно не используется: текущий интерфейс построен на небольшом наборе стабильных semantic/component classes и CSS custom properties.

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
