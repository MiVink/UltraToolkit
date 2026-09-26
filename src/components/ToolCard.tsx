import type { ToolMeta } from '../config/catalog';
import { useLang } from '../i18n/lang';
import { CompressWS, JpgToPngWS, PngToJpgWS, SvgToPngWS, WebpWS } from './workspaces/basic';
import { CropWS, ResizeWS, RotateWS } from './workspaces/geometry';
import { BatchWS, FaviconWS, MetadataWS } from './workspaces/advanced';

/**
 * Реєстр: tool.id → робоча зона. Новий інструмент = новий компонент + один рядок тут.
 * Картка лишається однаковою для всіх: назва, зелений підзаголовок, опис, формати, «Відкрити».
 */
const WORKSPACES: Record<ToolMeta['id'], (props: { tool: ToolMeta }) => JSX.Element> = {
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

export default function ToolCard({ tool, open, onToggle }: { tool: ToolMeta; open: boolean; onToggle: () => void }) {
  const { t } = useLang();
  const WS = WORKSPACES[tool.id];
  return (
    <article className={`tool-card${open ? ' open' : ''}`}>
      <h3>{t(`tool.${tool.id}.title`)}</h3>
      <div className="tool-tagline">{t(`tool.${tool.id}.tag`)}</div>
      <p className="tool-desc">{t(`tool.${tool.id}.desc`)}</p>
      <div className="tool-foot">
        <span className="chip">{tool.extensions}</span>
        <button className="tool-open-btn" onClick={onToggle} aria-expanded={open}>
          {open ? t('card.close') : t('card.open')}
        </button>
      </div>
      {open && WS && (
        <div className="workspace-wrap" key={tool.id}>
          <WS tool={tool} />
        </div>
      )}
    </article>
  );
}
