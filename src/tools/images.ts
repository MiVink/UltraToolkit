import { recordDownload } from '../state/history';

/* Локальна обробка зображень: Canvas API, жодних мережевих запитів.
   Помилки — кодовані (ERR:<code>), текст підставляє UI через i18n. */

export interface ProcessResult {
  blob: Blob;
  fileName: string;
  width: number;
  height: number;
  sizeBefore: number;
  sizeAfter: number;
  mime: string;
}

function err(code: string): Error {
  return new Error(`ERR:${code}`);
}

/** Витягує код помилки з Error, кинутого обробкою. */
export function errorCode(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message.match(/^ERR:([\w-]+)$/);
    if (m) return m[1];
  }
  return 'unknown';
}

/** Межі полотна: 30 МБ вхідних байтів можуть розпакуватися в гігапікселі
    (decompression bomb) і зʼїсти багато ГБ памʼяті при створенні canvas. */
const MAX_SIDE = 8000;
const MAX_PIXELS = 50_000_000;

/** Викликати ПЕРЕД виділенням полотна під повнорозмірний малюнок. */
export function assertImageSize(w: number, h: number): void {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) throw err('badImage');
  if (w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_PIXELS) throw err('tooLarge');
}

/** Безпечне імʼя для a[download]: без шляхів, керуючих символів і RLO-підміни розширення. */
export function safeFileName(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim();
  return cleaned || 'file';
}

const BYTE_UNITS: Record<string, string[]> = {
  uk: ['Б', 'КБ', 'МБ', 'ГБ'],
  en: ['B', 'KB', 'MB', 'GB'],
};

export function formatBytes(bytes: number, lang: string = 'uk'): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return lang === 'uk' ? '0 Б' : '0 B';
  const units = BYTE_UNITS[lang] ?? BYTE_UNITS.uk;
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / Math.pow(1024, i);
  return `${v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 1 : 2)} ${units[i]}`;
}

export function replaceExt(name: string, newExt: string): string {
  const base = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
  return safeFileName(`${base || 'image'}.${newExt}`);
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(err('read'));
    };
    img.decoding = 'async';
    img.src = url;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(err('encode'));
      },
      mime,
      quality,
    );
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  w: number,
  h: number,
  background?: string,
) {
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.clearRect(0, 0, w, h);
  }
  const iw = (img as HTMLImageElement).naturalWidth || img.width;
  const ih = (img as HTMLImageElement).naturalHeight || img.height;
  ctx.drawImage(img, 0, 0, w || iw, h || ih);
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw err('canvas');
  return ctx;
}

export async function convertPngToJpg(file: File): Promise<ProcessResult> {
  if (file.type && file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
    throw err('badPng');
  }
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw err('badImage');
  assertImageSize(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  // JPG не підтримує прозорість — заливаємо білим
  drawCover(ctx2d(canvas), img, w, h, '#ffffff');
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  return {
    blob,
    fileName: replaceExt(file.name, 'jpg'),
    width: w,
    height: h,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    mime: 'image/jpeg',
  };
}

export async function convertJpgToPng(file: File): Promise<ProcessResult> {
  const ok = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name);
  if (!ok) throw err('badJpg');
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw err('badImage');
  assertImageSize(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(ctx2d(canvas), img, w, h);
  const blob = await canvasToBlob(canvas, 'image/png');
  return {
    blob,
    fileName: replaceExt(file.name, 'png'),
    width: w,
    height: h,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    mime: 'image/png',
  };
}

async function rasterizeSvg(file: File, targetWidth: number): Promise<{ img: HTMLImageElement; w: number; h: number }> {
  const text = await file.text();
  if (!text.includes('<svg')) throw err('svgTag');
  const svgBlob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(err('svgRaster'));
      image.decoding = 'async';
      image.src = url;
    });
    let w = img.naturalWidth || (img as unknown as { width: number }).width;
    let h = img.naturalHeight || (img as unknown as { height: number }).height;
    if (!w || !h) {
      const mW = text.match(/width="(\d+)/);
      const mH = text.match(/height="(\d+)/);
      w = mW ? parseInt(mW[1], 10) : 1024;
      h = mH ? parseInt(mH[1], 10) : Math.round((w * 3) / 4);
    }
    // Дегенеративний SVG (напр. width="500000") не має шансу зʼїсти памʼять
    if (Math.max(w, h) > 16384) throw err('svgBig');
    const scale = targetWidth / w;
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));
    if (outW > 4096 || outH > 4096) throw err('svgBig');
    return { img, w: outW, h: outH };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function convertSvgToPng(file: File, targetWidth = 1024): Promise<ProcessResult> {
  const ok = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  if (!ok) throw err('badSvg');
  const { img, w, h } = await rasterizeSvg(file, targetWidth);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = ctx2d(canvas);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await canvasToBlob(canvas, 'image/png');
  return {
    blob,
    fileName: replaceExt(file.name, 'png'),
    width: w,
    height: h,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    mime: 'image/png',
  };
}

export type CompressFormat = 'image/jpeg' | 'image/webp' | 'image/png';

export async function compressImage(file: File, quality: number, format: CompressFormat): Promise<ProcessResult> {
  const okType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) throw err('badImg');
  const q = Math.min(1, Math.max(0.05, quality));
  const img = await loadImageFromFile(file);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) throw err('badImage');
  const MAX = 3000;
  const longest = Math.max(w, h);
  if (longest > MAX) {
    const k = MAX / longest;
    w = Math.round(w * k);
    h = Math.round(h * k);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = ctx2d(canvas);
  if (format === 'image/jpeg') {
    drawCover(ctx, img, w, h, '#ffffff');
  } else {
    drawCover(ctx, img, w, h);
  }
  const effectiveQuality = format === 'image/png' ? undefined : q;
  const blob = await canvasToBlob(canvas, format, effectiveQuality);
  const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
  return {
    blob,
    fileName: replaceExt(file.name, ext),
    width: w,
    height: h,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    mime: format,
  };
}

/** Швидко дізнатися розміри растра без повної обробки. */
export async function probeImage(file: File): Promise<{ w: number; h: number }> {
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw err('badImage');
  return { w, h };
}

export interface ResizeOpts {
  width: number;
  height: number;
  format: CompressFormat;
  quality?: number;
}

export async function resizeImage(file: File, opts: ResizeOpts): Promise<ProcessResult> {
  const okType =
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) throw err('badImg');
  const w = Math.round(opts.width);
  const h = Math.round(opts.height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1 || w > 8000 || h > 8000) {
    throw err('badImage');
  }
  assertImageSize(w, h);
  const img = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = ctx2d(canvas);
  if (opts.format === 'image/jpeg') drawCover(ctx, img, w, h, '#ffffff');
  else drawCover(ctx, img, w, h);
  const blob = await canvasToBlob(canvas, opts.format, opts.format === 'image/png' ? undefined : (opts.quality ?? 0.9));
  const ext = opts.format === 'image/jpeg' ? 'jpg' : opts.format === 'image/webp' ? 'webp' : 'png';
  return {
    blob,
    fileName: replaceExt(file.name, ext),
    width: w,
    height: h,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    mime: opts.format,
  };
}

export interface TransformOpts {
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export async function transformImage(file: File, o: TransformOpts): Promise<ProcessResult> {
  const okType =
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) throw err('badImg');
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw err('badImage');
  assertImageSize(w, h);
  const format = keepFormat(file);
  const swap = o.rotate === 90 || o.rotate === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = ctx2d(canvas);
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(((o.rotate % 360) * Math.PI) / 180);
  ctx.scale(o.flipH ? -1 : 1, o.flipV ? -1 : 1);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  const blob = await canvasToBlob(canvas, format, format === 'image/png' ? undefined : 0.92);
  const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
  return {
    blob,
    fileName: replaceExt(file.name, ext),
    width: canvas.width,
    height: canvas.height,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    mime: format,
  };
}

/** Формат виходу = формат входу (растр), інакше JPEG. */
export function keepFormat(file: File): CompressFormat {
  if (file.type === 'image/png' || /\.png$/i.test(file.name)) return 'image/png';
  if (file.type === 'image/webp' || /\.webp$/i.test(file.name)) return 'image/webp';
  return 'image/jpeg';
}

/** Намалювати картинку на полотно 1:1 і закодувати. JPEG заливається білим. */
export async function renderToBlob(
  img: HTMLImageElement,
  w: number,
  h: number,
  format: CompressFormat,
  quality = 0.92,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = ctx2d(canvas);
  if (format === 'image/jpeg') drawCover(ctx, img, w, h, '#ffffff');
  else drawCover(ctx, img, w, h);
  return canvasToBlob(canvas, format, format === 'image/png' ? undefined : quality);
}

/** Універсальна конвертація растра в заданий формат без зміни розмірів. */
export async function convertGeneric(file: File, format: CompressFormat, quality = 0.9): Promise<ProcessResult> {
  const okType =
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) throw err('badImg');
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw err('badImage');
  assertImageSize(w, h);
  const blob = await renderToBlob(img, w, h, format, quality);
  const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
  return {
    blob,
    fileName: replaceExt(file.name, ext),
    width: w,
    height: h,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    mime: format,
  };
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Вирізати прямокутник (у пікселях оригіналу) і закодувати у форматі входу. */
export async function cropImage(file: File, r: CropRect): Promise<ProcessResult> {
  const okType =
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) throw err('badImg');
  const img = await loadImageFromFile(file);
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const x = Math.max(0, Math.round(r.x));
  const y = Math.max(0, Math.round(r.y));
  const w = Math.min(iw - x, Math.round(r.w));
  const h = Math.min(ih - y, Math.round(r.h));
  if (!iw || !ih || w < 1 || h < 1) throw err('badImage');
  assertImageSize(iw, ih);
  const format = keepFormat(file);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = ctx2d(canvas);
  if (format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
  const blob = await canvasToBlob(canvas, format, format === 'image/png' ? undefined : 0.92);
  const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
  const dot = file.name.lastIndexOf('.');
  const base = (dot > 0 ? file.name.slice(0, dot) : file.name || 'image') + '-crop';
  return {
    blob,
    fileName: `${base}.${ext}`,
    width: w,
    height: h,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    mime: format,
  };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const safe = safeFileName(fileName);
  // Єдина точка, куди сходяться всі конверсії — сюди й пишемо історію.
  recordDownload(safe, blob.size);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safe;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
