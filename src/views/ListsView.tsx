import { IMAGE_TOOLS, type ToolMeta } from '../config/catalog';
import { useLang } from '../i18n/lang';
import ToolCard from '../components/ToolCard';
import { clearHistory } from '../state/history';
import { useHistory } from '../state/store';
import { formatBytes } from '../tools/images';
import { relTime } from './HomeView';

/** Сторінка «Нещодавнє»: повна історія завантажень. */
export function RecentView() {
  const { lang, t } = useLang();
  const items = useHistory();

  return (
    <div className="view-list">
      <header className="list-head">
        <h1>{t('nav.recent')}</h1>
        <p>{t('recent.sub')}</p>
        {items.length > 0 && (
          <button type="button" className="linklike" onClick={() => clearHistory()}>
            {t('hist.clear')}
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="empty">{t('hist.empty')}</div>
      ) : (
        <div className="hist">
          <div className="hist-row hist-head">
            <span className="hist-ico" aria-hidden="true" />
            <span className="hist-name">{t('hist.col.file')}</span>
            <span className="hist-op">{t('hist.col.op')}</span>
            <span className="hist-size">{t('hist.col.size')}</span>
            <span className="hist-when">{t('hist.col.when')}</span>
            <span className="hist-state">{t('hist.col.state')}</span>
          </div>
          {items.map((h) => (
            <div className="hist-row" key={h.key}>
              <span className="hist-ico" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="hist-name">{h.name}</span>
              <span className="hist-op">{h.tool ? t(`tool.${h.tool}.title`) : t('hist.unknown')}</span>
              <span className="hist-size">{formatBytes(h.size, lang)}</span>
              <span className="hist-when">{relTime(h.ts, t)}</span>
              <span className="hist-state">{t('hist.done')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FavProps {
  favs: string[];
  hasFav: (id: string) => boolean;
  onFav: (id: string) => void;
  onOpenTool: (tool: ToolMeta) => void;
}

/** Сторінка «Обране». */
export function FavoritesView({ favs, hasFav, onFav, onOpenTool }: FavProps) {
  const { t } = useLang();
  const tools = IMAGE_TOOLS.filter((tool) => favs.includes(tool.id));

  return (
    <div className="view-list">
      <header className="list-head">
        <h1>{t('nav.favs')}</h1>
        <p>{t('favs.sub')}</p>
      </header>

      {tools.length === 0 ? (
        <div className="empty">{t('favs.empty')}</div>
      ) : (
        <div className="tools-grid">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onOpen={() => onOpenTool(tool)}
              fav={hasFav(tool.id)}
              onFav={() => onFav(tool.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
