/* Генератор favicon: ICO (16/32/48) + PNG (180/192/512) з одного фото.
   ICO збирається вручну (ICONDIR + BMP 32bpp), усе локально. */

import { loadImageFromFile } from './images';

function err(code: string): Error {
  return new Error(`ERR:${code}`);
}

export interface FavPng {
  size: number;
  fileName: string;
  blob: Blob;
}

export interface FavSet {
  base: string;
  ico: Blob;
  pngs: FavPng[];
}

/** Вписати картинку в квадрат size×size через центральний кроп. */
function drawSquare(img: HTMLImageElement, size: number): ImageData {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const s = Math.min(w, h);
  const sx = Math.round((w - s) / 2);
  const sy = Math.round((h - s) / 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw err('canvas');
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

function pngFromSquare(img: HTMLImageElement, size: number): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw err('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const s = Math.min(w, h);
  ctx.drawImage(img, Math.round((w - s) / 2), Math.round((h - s) / 2), s, s, 0, 0, size, size);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(err('encode'))), 'image/png');
  });
}

/** Зібрати .ico з 32-бітних кадрів (XOR BGRA + нульова AND-маска). */
function buildIco(frames: { size: number; data: ImageData }[]): Blob {
  const n = frames.length;
  const dirSize = 6 + 16 * n;
  const dir = new DataView(new ArrayBuffer(dirSize));
  dir.setUint16(0, 0, true);
  dir.setUint16(2, 1, true);
  dir.setUint16(4, n, true);

  const parts: BlobPart[] = [dir.buffer as ArrayBuffer];
  let offset = dirSize;

  frames.forEach((f, i) => {
    const { size, data } = f;
    const pxBytes = size * size * 4;
    const maskRow = Math.ceil(size / 32) * 4;
    const maskBytes = maskRow * size;
    const bytesInRes = 40 + pxBytes + maskBytes;

    dir.setUint8(6 + i * 16, size >= 256 ? 0 : size);
    dir.setUint8(7 + i * 16, size >= 256 ? 0 : size);
    dir.setUint8(8 + i * 16, 0);
    dir.setUint8(9 + i * 16, 0);
    dir.setUint16(10 + i * 16, 1, true);
    dir.setUint16(12 + i * 16, 32, true);
    dir.setUint32(14 + i * 16, bytesInRes, true);
    dir.setUint32(18 + i * 16, offset, true);
    offset += bytesInRes;

    const bih = new DataView(new ArrayBuffer(40));
    bih.setUint32(0, 40, true);
    bih.setInt32(4, size, true);
    bih.setInt32(8, size * 2, true);
    bih.setUint16(12, 1, true);
    bih.setUint16(14, 32, true);
    bih.setUint32(16, 0, true);
    bih.setUint32(20, pxBytes, true);
    bih.setUint32(24, 0, true);
    bih.setUint32(28, 0, true);
    bih.setUint32(32, 0, true);
    bih.setUint32(36, 0, true);

    // BMP зберігає рядки знизу вгору, пікселі — BGRA
    const px = new Uint8Array(pxBytes);
    for (let y = 0; y < size; y++) {
      const srcY = size - 1 - y;
      for (let x = 0; x < size; x++) {
        const si = (srcY * size + x) * 4;
        const di = (y * size + x) * 4;
        px[di] = data.data[si + 2];
        px[di + 1] = data.data[si + 1];
        px[di + 2] = data.data[si];
        px[di + 3] = data.data[si + 3];
      }
    }
    const mask = new Uint8Array(maskBytes); // прозорість уже в альфі
    parts.push(bih.buffer as ArrayBuffer, px.buffer as ArrayBuffer, mask.buffer as ArrayBuffer);
  });

  return new Blob(parts, { type: 'image/x-icon' });
}

export async function generateFavicon(file: File): Promise<FavSet> {
  const okType =
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) throw err('badImg');
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw err('badImage');

  const dot = file.name.lastIndexOf('.');
  const base = (dot > 0 ? file.name.slice(0, dot) : file.name || 'site').toLowerCase().replace(/[^a-z0-9-_]+/gi, '-');

  const ico = buildIco([16, 32, 48].map((size) => ({ size, data: drawSquare(img, size) })));
  const pngs: FavPng[] = [];
  for (const size of [180, 192, 512]) {
    pngs.push({ size, fileName: `${base}-${size}.png`, blob: await pngFromSquare(img, size) });
  }
  return { base, ico, pngs };
}
