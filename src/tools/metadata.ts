/* Пошук службових даних (EXIF, GPS, XMP, ICC…) у JPEG/PNG/WebP
   та їх видалення перекодуванням через Canvas. Усе локально. */

import { assertImageSize, keepFormat, loadImageFromFile, renderToBlob, type ProcessResult } from './images';

function err(code: string): Error {
  return new Error(`ERR:${code}`);
}

const td = new TextDecoder('ascii');

function ascii(view: DataView, pos: number, len: number): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + pos, len);
  return td.decode(bytes);
}

function parseTiffForGps(view: DataView, tiff: number, end: number): boolean {
  const order = ascii(view, tiff, 2);
  const le = order === 'II';
  if (order !== 'II' && order !== 'MM') return false;
  const get16 = (p: number) => view.getUint16(p, le);
  const get32 = (p: number) => view.getUint32(p, le);
  if (get16(tiff + 2) !== 42) return false;
  const ifd0 = tiff + get32(tiff + 4);
  if (ifd0 + 2 > end) return false;
  const count = get16(ifd0);
  for (let i = 0; i < count; i++) {
    const e = ifd0 + 2 + i * 12;
    if (e + 12 > end) break;
    const tag = get16(e);
    const cnt = get32(e + 4);
    if (tag === 0x8825 && cnt > 0) return true; // GPS IFD
  }
  return false;
}

function inspectJpeg(view: DataView, len: number): string[] {
  const found = new Set<string>();
  if (len < 4 || view.getUint16(0) !== 0xffd8) return [];
  let pos = 2;
  while (pos + 4 <= len) {
    if (view.getUint8(pos) !== 0xff) break;
    let marker = view.getUint8(pos + 1);
    // набивка FF
    while (marker === 0xff && pos + 4 <= len) {
      pos++;
      marker = view.getUint8(pos + 1);
    }
    // маркери без довжини
    if (marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      pos += 2;
      continue;
    }
    if (marker === 0xda) break; // SOS — далі скан, метаданих немає
    const segLen = view.getUint16(pos + 2);
    if (segLen < 2 || pos + 2 + segLen > len) break;
    const data = pos + 4;
    const size = segLen - 2;
    if (marker === 0xe1 && size > 6) {
      const head = ascii(view, data, Math.min(size, 29));
      if (head.startsWith('Exif\x00\x00')) {
        found.add('meta.exif');
        try {
          if (parseTiffForGps(view, data + 6, data + size)) found.add('meta.gps');
        } catch {
          /* битий TIFF — сам факт EXIF уже зафіксовано */
        }
      } else if (head.startsWith('http://ns.adobe.com/xap/1.0/')) {
        found.add('meta.xmp');
      }
    } else if (marker === 0xed && size > 14) {
      if (ascii(view, data, 14).startsWith('Photoshop 3.0')) found.add('meta.ps');
    } else if (marker === 0xe2 && size > 12) {
      if (ascii(view, data, 11).startsWith('ICC_PROFILE')) found.add('meta.icc');
    } else if (marker === 0xfe && size > 0) {
      found.add('meta.comment');
    }
    pos += 2 + segLen;
  }
  return [...found];
}

function inspectPng(view: DataView, len: number): string[] {
  const found = new Set<string>();
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) if (len <= i || view.getUint8(i) !== sig[i]) return [];
  let pos = 8;
  while (pos + 12 <= len) {
    const size = view.getUint32(pos);
    const type = ascii(view, pos + 4, 4);
    if (type === 'IDAT') break; // далі лише пікселі
    if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') found.add('meta.text');
    else if (type === 'eXIf') found.add('meta.exif');
    else if (type === 'iCCP') found.add('meta.icc');
    else if (type === 'hIST' || type === 'sPLT' || type === 'tIME') found.add('meta.other');
    if (size > 64 * 1024 * 1024) break;
    pos += 12 + size;
  }
  return [...found];
}

function inspectWebp(view: DataView, len: number): string[] {
  const found = new Set<string>();
  if (len < 12 || ascii(view, 0, 4) !== 'RIFF' || ascii(view, 8, 4) !== 'WEBP') return [];
  let pos = 12;
  while (pos + 8 <= len) {
    const fourcc = ascii(view, pos, 4);
    const size = view.getUint32(pos + 4, true);
    if (fourcc === 'EXIF') found.add('meta.exif');
    else if (fourcc === 'XMP ') found.add('meta.xmp');
    else if (fourcc === 'ICCP') found.add('meta.icc');
    else if (fourcc !== 'VP8 ' && fourcc !== 'VP8L' && fourcc !== 'VP8X' && fourcc !== 'ANIM' && fourcc !== 'ANMF') {
      found.add('meta.other');
    }
    if (size > 256 * 1024 * 1024) break;
    pos += 8 + size + (size % 2);
  }
  return [...found];
}

/** Повертає ключі словника знайдених службових даних (порожньо = файл чистий). */
export async function inspectImage(file: File): Promise<string[]> {
  // Читаємо весь файл (до 30 МБ за лімітом UI): перші 1 МБ — це хибно-чисті
  // вердикти для PNG/WebP з чанками після мегабайта.
  const head = await file.arrayBuffer();
  const view = new DataView(head);
  const len = head.byteLength;
  if (len >= 2 && view.getUint16(0) === 0xffd8) return inspectJpeg(view, len);
  if (len >= 8) {
    const png = inspectPng(view, len);
    if (png.length > 0 || (len >= 8 && view.getUint32(0) === 0x89504e47)) return png;
  }
  const webp = inspectWebp(view, len);
  return webp;
}

/** Перекодувати попіксельно: усі службові дані зникають разом із контейнерами. */
export async function stripMetadata(file: File, findings: string[]): Promise<ProcessResult & { removed: number }> {
  const okType =
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!okType) throw err('badImg');
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw err('badImage');
  assertImageSize(w, h);
  const format = keepFormat(file);
  const blob = await renderToBlob(img, w, h, format, 0.92);
  const dot = file.name.lastIndexOf('.');
  const base = (dot > 0 ? file.name.slice(0, dot) : file.name || 'image') + '-clean';
  const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
  return {
    blob,
    fileName: `${base}.${ext}`,
    width: w,
    height: h,
    sizeBefore: file.size,
    sizeAfter: blob.size,
    mime: format,
    removed: findings.length,
  };
}
