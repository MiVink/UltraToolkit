# Ultra-Toolkit

A static, local-first file toolkit that runs entirely in your browser.

Everything is processed **locally** (Canvas API, Blob URLs) — not a single byte
is sent to a server. Files come from the user's device only: there are no
URL-based downloaders (no YouTube/TikTok grabbers).

- **Stack:** React + TypeScript + Vite. No heavy UI libraries, no backend.
- **Languages:** Ukrainian (default) + English, switcher in the header.
- **Category "Images"** — 11 working tools: **PNG → JPG**, **JPG → PNG**,
  **SVG → PNG**, **Image compression**, **Resize**, **Rotate & flip**,
  **Metadata cleaner** (EXIF/GPS/XMP), **Crop** (1:1, 16:9, 9:16),
  **WebP converter**, **Batch processing**, **Favicon generator** (ICO + PNG).

## Quick start

```bash
npm install
npm run dev      # local dev server: http://localhost:5173
npm run build    # type check + production build into dist/
npm run preview  # serve the production build
```

Requirements: Node.js 20.19+ (or 22+).

## Deploy to GitHub Pages (automatic)

1. Push this project to a GitHub repository on the `main` branch.
2. `vite.config.ts` already sets `base: './'`, so it works both on
   `<user>.github.io/<repo>/` and on a custom domain.
3. The workflow `.github/workflows/deploy.yml` builds (`npm run build`) and
   publishes `dist/` on every push to `main`.
4. In the repository settings: **Settings → Pages → Source: GitHub Actions**.

Actions are pinned to commit SHAs (tags on GitHub are mutable), and the build
step runs `npm audit --audit-level=high`, so a deploy is blocked if a
dependency picks up a high-severity vulnerability.

## Privacy

There is no `fetch`/`XMLHttpRequest` during processing — and this is enforced
by CSP (`connect-src 'none'` in the production build): the browser itself
refuses to let the page make any network request. Fonts are self-hosted via
Fontsource, so there are no external CDNs either.

To verify: open DevTools → Network while converting a file — there are no
requests.

## Project structure

```
src/
  config/catalog.ts        # tools (no text) + visible categories + "Next" list
  i18n/dict.ts             # all UI strings, UK/EN
  i18n/lang.tsx            # LangProvider, useLang()
  tools/
    images.ts              # convert, compress, resize, rotate, crop
    metadata.ts            # EXIF/GPS/XMP/ICC scan + strip via re-encode
    favicon.ts             # .ico assembly (16/32/48) + PNG set
  components/
    ToolCard.tsx           # card + WORKSPACES registry (id → component)
    Dropzone.tsx           # drag-and-drop (single + multiple)
    workspaces/
      shell.tsx            # useJob() + FileRow/ResultView/RunBar/Seg
      basic.tsx            # simple converters
      geometry.tsx         # resize, rotate, crop (+Cropper)
      advanced.tsx         # metadata, batch, favicon
  styles/global.css        # design tokens, background layers, all styles
```

## Adding a new tool

**1. Config** — `src/config/catalog.ts`:

```ts
{ id: 'my-tool', accept: 'image/png,.png', extensions: '.png', maxSizeMB: 30 }
```

**2. Dictionary** — `src/i18n/dict.ts` (both languages): `tool.<id>.title/.tag/.desc`
plus `ws.hint.<id>`.

**3. Processing** — a new file in `src/tools/`. Throw errors as
`throw err('code')` and the message is pulled from `err.<code>`.

**4. Workspace** — a component built on `useJob()` and the widgets from
`shell.tsx`, plus one line in the `WORKSPACES` registry in `ToolCard.tsx`.

A new category shows up on the home page once it has the first working tool
(`status: 'ready'` + `visibleCategories()`).

## Security notes

- Canvas output is size-capped (`assertImageSize`: 8000 px per side,
  50 MP total) to block decompression bombs from 30 MB inputs.
- Download filenames are sanitized (no control characters, no `RLO`
  extension spoofing, no path separators).
- Metadata scanning reads the whole file, not just the first megabyte.
- Production builds ship a CSP meta tag; the dev server is exempt so React
  Refresh still works.

## License

MIT.
