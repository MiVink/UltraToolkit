/**
 * Історія оброблених файлів.
 *
 * Окремий модуль без React: його імпортує downloadBlob() у tools/images.ts,
 * тож react-залежність тут створила б зайвий ланцюг імпортів.
 * Стан — модульний, сховище — localStorage, сповіщення — мінімальний pub/sub.
 */

export interface HistItem {
  /** file name + tool — щоб повторне завантаження того самого файлу оновлювало рядок */
  key: string;
  name: string;
  size: number;
  /** id інструмента, який був відкритий у момент завантаження */
  tool: string;
  ts: number;
}

const STORE_KEY = 'ut-hist';
const MAX = 24;

/** Інструмент, відкритий зараз (сторінка або модалка) — контекст для запису. */
let currentTool = '';

const subs = new Set<() => void>();

function load(): HistItem[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is HistItem =>
        !!x && typeof x === 'object' && typeof (x as HistItem).name === 'string',
    );
  } catch {
    return [];
  }
}

let items: HistItem[] = load();

function persist(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
  } catch {
    /* приватний режим — історія просто не переживе перезавантаження */
  }
  subs.forEach((fn) => fn());
}

/** Викликається App-ом при відкритті інструмента, щоб запис мав контекст. */
export function setContextTool(id: string): void {
  currentTool = id;
}

/** Точка запису: усі завантаження проходять через downloadBlob(). */
export function recordDownload(name: string, size: number): void {
  const key = `${currentTool}::${name}`;
  const entry: HistItem = { key, name, size, tool: currentTool, ts: Date.now() };
  items = [entry, ...items.filter((i) => i.key !== key)].slice(0, MAX);
  persist();
}

export function clearHistory(): void {
  items = [];
  persist();
}

export function subscribe(fn: () => void): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function snapshot(): HistItem[] {
  return items;
}
