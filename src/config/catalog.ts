export type MotionIntensity = 'full' | 'soft' | 'off';

export interface ToolMeta {
  id: 'png-to-jpg' | 'jpg-to-png' | 'svg-to-png' | 'compress';
  /** Мовно-нейтральний заголовок */
  title: string;
  /** accept для <input type=file> */
  accept: string;
  /** людиночитабельні розширення */
  extensions: string;
  badge?: 'hit' | 'pro' | 'svg';
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

export const IMAGE_TOOLS: ToolMeta[] = [
  {
    id: 'png-to-jpg',
    title: 'PNG → JPG',
    accept: 'image/png,.png',
    extensions: '.png',
    badge: 'hit',
    maxSizeMB: 30,
  },
  {
    id: 'jpg-to-png',
    title: 'JPG → PNG',
    accept: 'image/jpeg,.jpg,.jpeg',
    extensions: '.jpg, .jpeg',
    maxSizeMB: 30,
  },
  {
    id: 'svg-to-png',
    title: 'SVG → PNG',
    accept: 'image/svg+xml,.svg',
    extensions: '.svg',
    badge: 'svg',
    maxSizeMB: 10,
  },
  {
    id: 'compress',
    title: 'Стиснення',
    accept: 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp',
    extensions: '.jpg, .png, .webp',
    badge: 'pro',
    maxSizeMB: 30,
  },
];

/** Тексти — у словнику i18n (road.<id>.title / .text / .eta) */
export const ROADMAP_IDS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'] as const;

export function getTool(id: string): ToolMeta | undefined {
  return IMAGE_TOOLS.find((t) => t.id === id);
}
