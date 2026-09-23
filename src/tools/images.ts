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
  return `${base || 'image'}.${newExt}`;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
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

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
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

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
