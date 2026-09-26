# Ultra-Toolkit

Статичний local-first інструментарій для обробки файлів прямо у браузері.
Усе працює **лише локально** (Canvas API, Blob URL) — жоден байт не відправляється на сервер. Тільки файли з пристрою користувача: жодних завантажувачів з YouTube/TikTok за URL.

- Стек: **React + TypeScript + Vite**, без важких UI-бібліотек, без бекенда.
- Мови інтерфейсу: **українська (за замовчуванням) + англійська**, перемикач у шапці.
- Категорія «Зображення», 11 робочих інструментів: **PNG → JPG**, **JPG → PNG**, **SVG → PNG**,
  **Стиснення зображення**, **Зміна розміру**, **Поворот і віддзеркалення**,
  **Чистка метаданих** (EXIF/GPS/XMP), **Обрізка** (1:1, 16:9, 9:16),
  **Конвертер WebP**, **Пакетна обробка**, **Генератор favicon** (ICO + PNG).

## Швидкий старт

```bash
npm install
npm run dev      # локальний запуск: http://localhost:5173
npm run build    # перевірка типів + продакшн-збірка в dist/
npm run preview  # перегляд продакшн-збірки
```

Вимоги: Node.js 18+.

## Деплой на GitHub Pages (автоматичний)

1. Залити проєкт у репозиторій GitHub (гілка `main`).
2. У `vite.config.ts` вже стоїть `base: './'`.
3. Workflow `.github/workflows/deploy.yml` сам збирає (`npm run build`) і публікує `dist/` при кожному пуші в `main`.
4. У налаштуваннях репозиторію: **Settings → Pages → Source: GitHub Actions**.

## Структура

```
src/
  config/catalog.ts        # інструменти (без текстів) + видимі категорії + «Наступне»
  i18n/dict.ts             # усі рядки UK/EN
  i18n/lang.tsx            # LangProvider, useLang()
  tools/
    images.ts              # конвертація, стиснення, ресайз, поворот, обрізка
    metadata.ts            # пошук EXIF/GPS/XMP/ICC + чистка перекодуванням
    favicon.ts             # збірка .ico (16/32/48) + PNG-сет
  components/
    ToolCard.tsx           # картка + РЕЄСТР воркспейсів (id → компонент)
    Dropzone.tsx           # drag-and-drop (single + multiple)
    workspaces/
      shell.tsx            # useJob() + FileRow/ResultView/RunBar/Seg
      basic.tsx            # прості конвертери
      geometry.tsx         # ресайз, поворот, обрізка (+Cropper)
      advanced.tsx         # метадані, пакетна, favicon
```

## Як додати новий інструмент

**1. Конфіг** — `src/config/catalog.ts`:

```ts
{ id: 'my-tool', accept: 'image/png,.png', extensions: '.png', maxSizeMB: 30 }
```

**2. Словник** — `src/i18n/dict.ts` (обидві мови): `tool.<id>.title/.tag/.desc` + `ws.hint.<id>`.

**3. Обробка** — новий файл у `src/tools/` (помилки кидати як `throw err('код')`, текст підтягнеться з `err.<код>`).

**4. Воркспейс** — компонент на `useJob()` + віджетах із `shell.tsx`, один рядок у реєстрі `WORKSPACES` в `ToolCard.tsx`.

Нова категорія зʼявляється на головній лише з першим робочим інструментом (`status: 'ready'` + `visibleCategories()`).

## Приватність

Немає `fetch`/`XMLHttpRequest` під час обробки. Перевірка: DevTools → Network під час конвертації — запитів немає.

## Ліцензія

MIT.
