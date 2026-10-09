export interface ToolMeta {
  id:
    | 'png-to-jpg'
    | 'jpg-to-png'
    | 'svg-to-png'
    | 'compress'
    | 'resize'
    | 'rotate'
    | 'metadata'
    | 'crop'
    | 'webp'
    | 'batch'
    | 'favicon';
  /** accept для <input type=file> */
  accept: string;
  /** людиночитабельні розширення */
  extensions: string;
  maxSizeMB?: number;
  /** у якій категорії показувати інструмент — керує чипами й сайдбаром */
  category: CategoryMeta['id'];
}

export interface CategoryMeta {
  id: 'image' | 'pdf' | 'text' | 'dev' | 'media';
  icon: 'image' | 'pdf' | 'text' | 'code' | 'media';
  status: 'ready' | 'soon';
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'image', icon: 'image', status: 'ready' },
  // Нові категорії зʼявляються тут лише з першим робочим інструментом.
  // Зарезервовано: pdf, text, dev, media.
];

/** Категорії, в яких уже є робочі інструменти, — лише вони показуються на головній. */
export function visibleCategories(): CategoryMeta[] {
  return CATEGORIES.filter((c) => c.status === 'ready');
}

const RASTER = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

/** Поки всі інструменти — зображення. Нові категорії додають свій рядок. */
const IMG = { category: 'image' as const };

/** Усі підписи — у словнику i18n (tool.<id>.*). Жодних «хітів» і хайпу: людьми для людей. */
export const IMAGE_TOOLS: ToolMeta[] = [
  { id: 'png-to-jpg', accept: 'image/png,.png', extensions: '.png', maxSizeMB: 30, ...IMG },
  { id: 'jpg-to-png', accept: 'image/jpeg,.jpg,.jpeg', extensions: '.jpg, .jpeg', maxSizeMB: 30, ...IMG },
  { id: 'svg-to-png', accept: 'image/svg+xml,.svg', extensions: '.svg', maxSizeMB: 10, ...IMG },
  { id: 'compress', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30, ...IMG },
  { id: 'resize', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30, ...IMG },
  { id: 'rotate', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30, ...IMG },
  { id: 'metadata', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30, ...IMG },
  { id: 'crop', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30, ...IMG },
  { id: 'webp', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30, ...IMG },
  { id: 'batch', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30, ...IMG },
  { id: 'favicon', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30, ...IMG },
];

/** Чесно наступне (після реалізації поточного набору). Максимум 3 пункти. */
export const NEXT_IDS = ['zip', 'heic', 'pdf'] as const;

export function getTool(id: string): ToolMeta | undefined {
  return IMAGE_TOOLS.find((t) => t.id === id);
}

/**
 * Чи прийме інструмент саме цей файл.
 *
 * `accept` зберігає і MIME, і розширення (див. RASTER вище), бо частина файлів
 * приходить із порожнім file.type — тоді рятує лише розширення.
 * Ця функція — серце «кинув файл → ось що з ним можна зробити».
 */
export function matchesAccept(accept: string, file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type;
  return accept
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .some((p) => {
      if (p.startsWith('.')) return name.endsWith(p);
      if (p.endsWith('/*')) return !!type && type.startsWith(p.slice(0, -1));
      return !!type && type === p;
    });
}

/** Усі інструменти, що вміють працювати з файлом — показуємо їх одразу після скидання. */
export function toolsForFile(file: File): ToolMeta[] {
  return IMAGE_TOOLS.filter((t) => matchesAccept(t.accept, file));
}

/** Чи це растрове фото (jpeg/png/webp) — для convert/resize/rotate/… */
export function isRasterFile(f: File): boolean {
  const name = f.name.toLowerCase();
  return ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || /\.(jpe?g|png|webp)$/.test(name);
}
