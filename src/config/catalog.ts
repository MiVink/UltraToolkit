export type MotionIntensity = 'full' | 'soft' | 'off';

export interface ToolMeta {
  id: 'png-to-jpg' | 'jpg-to-png' | 'svg-to-png' | 'compress' | 'resize' | 'rotate';
  /** accept для <input type=file> */
  accept: string;
  /** людиночитабельні розширення */
  extensions: string;
  maxSizeMB?: number;
}

export interface CategoryMeta {
  id: 'image' | 'pdf' | 'text' | 'dev' | 'media';
  icon: 'image' | 'pdf' | 'text' | 'code' | 'media';
  status: 'ready' | 'soon';
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'image', icon: 'image', status: 'ready' },
  { id: 'pdf', icon: 'pdf', status: 'soon' },
  { id: 'text', icon: 'text', status: 'soon' },
  { id: 'dev', icon: 'code', status: 'soon' },
  { id: 'media', icon: 'media', status: 'soon' },
];

const RASTER = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';

/** Усі підписи — у словнику i18n (tool.<id>.*). Жодних «хітів» і хайпу: людьми для людей. */
export const IMAGE_TOOLS: ToolMeta[] = [
  { id: 'png-to-jpg', accept: 'image/png,.png', extensions: '.png', maxSizeMB: 30 },
  { id: 'jpg-to-png', accept: 'image/jpeg,.jpg,.jpeg', extensions: '.jpg, .jpeg', maxSizeMB: 30 },
  { id: 'svg-to-png', accept: 'image/svg+xml,.svg', extensions: '.svg', maxSizeMB: 10 },
  { id: 'compress', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30 },
  { id: 'resize', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30 },
  { id: 'rotate', accept: RASTER, extensions: '.jpg, .png, .webp', maxSizeMB: 30 },
];

/** Тексти — у словнику i18n (road.<id>.title / .text / .eta) */
export const ROADMAP_IDS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const;

export function getTool(id: string): ToolMeta | undefined {
  return IMAGE_TOOLS.find((t) => t.id === id);
}

/** Чи це растрове фото (jpeg/png/webp) — для compress/resize/rotate. */
export function isRasterFile(f: File): boolean {
  const name = f.name.toLowerCase();
  return (
    ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || /\.(jpe?g|png|webp)$/.test(name)
  );
}
