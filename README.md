# Ultra-Toolkit

Каталог браузерних інструментів для роботи з файлами.
Усе обробляється **лише локально у браузері** (Canvas API, Blob URL) — жоден байт не відправляється на сервер.

- Стек: **React + TypeScript + Vite**, без важких UI-бібліотек, без бекенда.
- Мови інтерфейсу: **українська (за замовчуванням) + англійська**, перемикач у шапці, вибір зберігається.
- Готові інструменти (категорія «Зображення»): **PNG → JPG**, **JPG → PNG**, **SVG → PNG**, **Стиснення** (якість + формат JPEG/WebP/PNG).

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
2. У `vite.config.ts` вже стоїть `base: './'` — сайт працюватиме і на `<user>.github.io/<repo>/`, і на кастомному домені.
3. Workflow `.github/workflows/deploy.yml` сам збирає (`npm run build`) і публікує `dist/` при кожному пуші в `main`.
4. У налаштуваннях репозиторію: **Settings → Pages → Source: GitHub Actions**.

## Структура

```
src/
  config/catalog.ts        # категорії та інструменти БЕЗ текстів (тексти — в i18n)
  i18n/dict.ts             # усі рядки UK/EN
  i18n/lang.tsx            # LangProvider, useLang(), збереження мови
  tools/images.ts          # локальна обробка (помилки — кодами ERR:<code>)
  components/
    Header.tsx             # логотип, навігація, мова, перемикач анімацій
    Hero.tsx               # короткий hero-блок
    CategoryGrid.tsx       # картки категорій
    ToolCard.tsx           # універсальна картка інструмента + робоча зона
    Dropzone.tsx           # універсальна drag-and-drop зона
    CursorParticles.tsx    # ВИМКНЕНО (заготовка під пасхалку, див. App.tsx)
    Sections.tsx           # Про сайт, roadmap, footer
  styles/global.css        # тема, аврора-фон, картки, адаптив
```

## Як додати новий інструмент

**1. Опис у конфігу** — `src/config/catalog.ts` (без текстів, тільки технічні поля):

```ts
{ id: 'webp-to-png', title: 'WebP → PNG', accept: 'image/webp,.webp', extensions: '.webp', maxSizeMB: 30 }
```

**2. Рядки в словник** — `src/i18n/dict.ts` (обидві мови, ключі `tool.<id>.tag` / `tool.<id>.desc`, підказка `ws.hint.<id>`):

```ts
'tool.webp-to-png.tag': '...',
'tool.webp-to-png.desc': '...',
'ws.hint.webp-to-png': '...',
```

**3. Функція обробки** — `src/tools/images.ts` (помилки кидати як `throw err('код')`, текст підтягнеться з `err.<код>`):

```ts
export async function convertWebpToPng(file: File): Promise<ProcessResult> { ... }
```

**4. Гілка в `ToolCard.tsx`**, у функції `run()`:

```tsx
else if (tool.id === 'webp-to-png') out = await convertWebpToPng(file);
```

Dropzone, превʼю, помилки, прогрес і кнопка завантаження — вже універсальні.

## Приватність

Немає `fetch`/`XMLHttpRequest` під час обробки. Перевірка: DevTools → Network під час конвертації — запитів немає.

## Ліцензія

MIT.
