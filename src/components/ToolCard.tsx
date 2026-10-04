import type { ToolMeta } from '../config/catalog';
import { useLang } from '../i18n/lang';
import { CompressWS, JpgToPngWS, PngToJpgWS, SvgToPngWS, WebpWS } from './workspaces/basic';
import { CropWS, ResizeWS, RotateWS } from './workspaces/geometry';
import { BatchWS, FaviconWS, MetadataWS } from './workspaces/advanced';

/**
 * Реєстр: tool.id → робоча зона. Новий інструмент = новий компонент + один рядок тут.
 * Робоча зона відкривається в модалці (ToolModal), тож картка лишається
 * компактною вітриною і не впливає на макет сітки.
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

/**
 * Картка-вітрина. Патерн «stretched button»: одна кнопка в DOM (один фокус-стоп,
 * зрозуміле ім'я для скрінрідера), але ::after розтягує її на всю картку —
 * клікнути можна будь-куди. Стрілка-індикатор замість окремої кнопки «Відкрити».
 */
export default function ToolCard({ tool, onOpen }: { tool: ToolMeta; onOpen: () => void }) {
  const { t } = useLang();
  const title = t(`tool.${tool.id}.title`);
  return (
    <article className="tool-card">
      <h3>{title}</h3>
      <div className="tool-tagline">{t(`tool.${tool.id}.tag`)}</div>
      <p className="tool-desc">{t(`tool.${tool.id}.desc`)}</p>
      <div className="tool-foot">
        <span className="chip">{tool.extensions}</span>
        <span className="tool-open" aria-hidden="true">
          {t('card.open')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14m0 0-5-5m5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <button
          type="button"
          className="tool-open-btn"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-label={`${t('card.open')}: ${title}`}
        />
      </div>
    </article>
  );
}
