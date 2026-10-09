import type { ToolMeta } from '../config/catalog';
import { useLang } from '../i18n/lang';
import { CompressWS, JpgToPngWS, PngToJpgWS, SvgToPngWS, WebpWS } from './workspaces/basic';
import { CropWS, ResizeWS, RotateWS } from './workspaces/geometry';
import { BatchWS, FaviconWS, MetadataWS } from './workspaces/advanced';

/**
 * Реєстр: tool.id → робоча зона. Новий інструмент = новий компонент + один рядок тут.
 * Робоча зона відкривається в модалці (ToolModal) або на сторінці інструмента.
 */
export const WORKSPACES: Record<ToolMeta['id'], (props: { tool: ToolMeta }) => JSX.Element> = {
  'png-to-jpg': PngToJpgWS,
  'jpg-to-png': JpgToPngWS,
  'svg-to-png': SvgToPngWS,
  compress: CompressWS,
  resize: ResizeWS,
  rotate: RotateWS,
  metadata: MetadataWS,
  crop: CropWS,
  webp: WebpWS,
  batch: BatchWS,
  favicon: FaviconWS,
};

/** Іконка інструмента: 6 форм для 11 інструментів, усі — тонкий штрих 1.7. */
function ToolIcon({ id }: { id: ToolMeta['id'] }) {
  const c = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'png-to-jpg':
    case 'jpg-to-png':
    case 'webp':
      return (
        <svg {...c} aria-hidden="true">
          <path d="M4 8h13m0 0-3-3m3 3-3 3" />
          <path d="M20 16H7m0 0 3-3m-3 3 3 3" />
        </svg>
      );
    case 'svg-to-png':
    case 'favicon':
      return (
        <svg {...c} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M9 15V9l3 3 3-3v6" />
        </svg>
      );
    case 'compress':
      return (
        <svg {...c} aria-hidden="true">
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        </svg>
      );
    case 'resize':
      return (
        <svg {...c} aria-hidden="true">
          <path d="M4 10V4h6M20 14v6h-6" />
          <path d="M4 4l7 7M20 20l-7-7" />
        </svg>
      );
    case 'rotate':
      return (
        <svg {...c} aria-hidden="true">
          <path d="M4 12a8 8 0 1 1 2.5 5.8" />
          <path d="M4 7v5h5" />
        </svg>
      );
    case 'metadata':
      return (
        <svg {...c} aria-hidden="true">
          <path d="M6 3h8l4 4v14H6z" />
          <path d="M14 3v4h4M9 12h6M9 16h4" />
        </svg>
      );
    case 'crop':
      return (
        <svg {...c} aria-hidden="true">
          <path d="M7 3v14h14M3 7h14v14" />
        </svg>
      );
    default:
      return (
        <svg {...c} aria-hidden="true">
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M4 9h16M9 5v4" />
        </svg>
      );
  }
}

interface Props {
  tool: ToolMeta;
  onOpen: () => void;
  fav?: boolean;
  onFav?: () => void;
}

/**
 * Картка-вітрина. Патерн «stretched button»: одна кнопка в DOM (один фокус-стоп),
 * але ::after розтягує її на всю картку — клікнути можна будь-куди.
 * Зірка в обране виведена над розтягнутою кнопкою (z-index), тому має власний клік.
 */
export default function ToolCard({ tool, onOpen, fav, onFav }: Props) {
  const { t } = useLang();
  const title = t(`tool.${tool.id}.title`);

  return (
    <article className="tool-card">
      <div className="tool-card-top">
        <span className="tool-ico" aria-hidden="true">
          <ToolIcon id={tool.id} />
        </span>
        <h3>{title}</h3>

        {onFav && (
          <button
            type="button"
            className={`tool-fav${fav ? ' on' : ''}`}
            onClick={onFav}
            aria-pressed={!!fav}
            aria-label={fav ? `${t('tool.favRemove')}: ${title}` : `${t('tool.favAdd')}: ${title}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} aria-hidden="true">
              <path
                d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {!fav && (
          <span className="tool-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 17 17 7m0 0H9m8 0v8"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </div>

      <p className="tool-desc">{t(`tool.${tool.id}.desc`)}</p>
      <div className="tool-ext">{tool.extensions}</div>

      <button
        type="button"
        className="tool-open-btn"
        onClick={onOpen}
        aria-label={`${t('card.open')}: ${title}`}
      />
    </article>
  );
}
