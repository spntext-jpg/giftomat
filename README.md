# Giftomat (Гифтомат)

Локальная браузерная медиастудия: GIF, PDF, Crop, сжатие изображений, HTML → PDF и HEIC → JPEG. Вся обработка выполняется на устройстве пользователя: файлы, видео и HTML не отправляются ни на какой сервер. Приложение работает как PWA (offline shell).

## Инструменты

- **GIF** из изображений: длительность каждого кадра, порядок drag-and-drop, пресеты (исходное, X 16:9, 1:1, 4:5, 9:16), ручное позиционирование кадра.
- **Video → GIF**: извлечение кадров из MP4/WebM/MOV до 200 МБ.
- **PDF-карусель**: social/document-пресеты, режимы contain/cover.
- **HTML → PDF**: sandbox-превью и постраничный рендер.
- **Crop**: готовые и произвольные размеры (СМИ 1320 × 768 и 1080 × 1350, блог 1024 × 512 и 950 × 417, соцсети), точная подстройка кадра (стрелки по 1 px, масштаб, колесо мыши, клавиатура), применение рамки ко всей пачке.
- **Compress**: JPG/WebP, ZIP для пакетной выгрузки.
- **HEIC/HEIF** → JPEG перед дальнейшей обработкой.

## Стек

Next.js 16 (App Router, `output: "export"`), React 19, TypeScript 5 (strict), единый стилевой файл `app/globals.css` (August v3 — Dark Workbench), self-hosted Inter, Canvas / Blob / Web Worker API. Без Tailwind и без backend.

## Запуск

```bash
npm ci
npm run dev       # локальная разработка
npm run verify    # typecheck → tests → smoke-check → production build (out/)
```

Нужен Node ≥ 22.6. Команда `npm start` в текущем виде не работает со статическим экспортом (см. `HANDOFF.md`, вопрос 1): для просмотра сборки используйте содержимое `out/`.

## Развёртывание

- **Staging:** GitHub → Vercel.
- **Production:** VibeCode — статический экспорт `out/` и собственный `server.js` на `node:http` (описание платформы — `build_galaxy.md`). Всё, что требует Next.js server runtime, в production не заработает.

## Структура

- `app/page.tsx` — основной workspace и переключение инструментов;
- `app/components/` — Crop, HTML → PDF, импорт видео, регистрация Service Worker;
- `app/lib/` — чистая логика: пресеты, crop-математика, изображения, PDF, ZIP, HEIC, скачивание;
- `public/gif.js`, `public/gif.worker.js`, `public/html-to-image.js` — vendored runtime (не редактировать);
- `public/sw.js` — service worker, версия кэша в `CACHE_VERSION`;
- `scripts/smoke-check.mjs` — контракты продукта, дизайна, PWA и гигиены репозитория;
- `tests/` — unit-тесты.

## Документация

| Файл | Назначение |
|---|---|
| `AGENTS.md` | правила для ИИ-агентов: автономность, деплой, регрессионные зоны |
| `design.md` | дизайн-система August v3 и UI-контракт (единственный источник) |
| `HANDOFF.md` | текущее состояние, решения, открытые вопросы |
| `ROADMAP.md` | очередь работ для агентов |
| `build_galaxy.md` | справочник платформы VibeCode |

## Качество

Перед каждым коммитом — `npm run verify`: typecheck, unit-тесты, smoke-check и production `next build`. Тот же набор запускает CI (`.github/workflows/verify.yml`). Изменение готово только при полностью зелёном результате.

## Гигиена репозитория

В Git не попадают: `.next/`, `out/`, `node_modules/`, `*.tsbuildinfo`, снапшоты Repomix, patch/diff-файлы, одноразовые скрипты `giftomat_*.py` / `apply_*.py` / `fix_*.py`, Python-кэши, `.env*`.
