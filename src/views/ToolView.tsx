import { useEffect } from 'react';
import type { ToolMeta } from '../config/catalog';
import { useLang } from '../i18n/lang';
import { WORKSPACES } from '../components/ToolCard';
import Stepper from '../components/Stepper';
import { go } from '../state/store';

interface Props {
  tool: ToolMeta;
  fav: boolean;
  onFav: () => void;
  /** швидкий режим — та сама робоча зона, але в модалці поверх сторінки */
  onQuick: () => void;
}

/**
 * Сторінка інструмента: хлібні крихти, заголовок, степер, робоча зона
 * і права панель з діями. Робоча зона та сама, що й у модалці, —
 * тільки оточення інше.
 */
export default function ToolView({ tool, fav, onFav, onQuick }: Props) {
  const { t } = useLang();
  const title = t(`tool.${tool.id}.title`);
  const WS = WORKSPACES[tool.id];

  // контекст для історії: завантаження з цієї сторінки підпишеться цим інструментом
  useEffect(() => {
    document.title = `${title} — UltraToolkit`;
    return () => {
      document.title = 'Ultra-Toolkit — файлові інструменти без зайвого шуму';
    };
  }, [title]);

  return (
    <div className="view-tool">
      <nav className="crumbs" aria-label={t('crumb.nav')}>
        <button type="button" className="crumb-back" onClick={() => go('/')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('nav.all')}
        </button>
        <span className="crumb-sep" aria-hidden="true">
          ›
        </span>
        <span className="crumb-cur">{title}</span>
      </nav>

      <header className="tool-head">
        <div>
          <h1>{title}</h1>
          <p>{t(`tool.${tool.id}.tag`)}</p>
        </div>
        <div className="tool-head-acts">
          <button type="button" className="btn btn-ghost" onClick={onQuick}>
            {t('tool.quick')}
          </button>
          <button
            type="button"
            className={`tool-fav big${fav ? ' on' : ''}`}
            onClick={onFav}
            aria-pressed={fav}
            aria-label={fav ? t('tool.favRemove') : t('tool.favAdd')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill={fav ? 'currentColor' : 'none'} aria-hidden="true">
              <path
                d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <Stepper current={1} done={0} counter={t('tool.stepOf', { n: 1 })} />

      <div className="tool-layout">
        <div className="tool-main">{WS && <WS tool={tool} />}</div>

        <aside className="tool-side">
          <div className="side-panel">
            <div className="side-panel-cap">{t('tool.about')}</div>
            <p>{t(`tool.${tool.id}.desc`)}</p>
            <div className="side-panel-ext">
              <span>{t('tool.formats')}</span>
              <b>{tool.extensions}</b>
            </div>
            {tool.maxSizeMB && (
              <div className="side-panel-ext">
                <span>{t('tool.limit')}</span>
                <b>{t('tool.limitMb', { n: tool.maxSizeMB })}</b>
              </div>
            )}
          </div>

          <div className="side-panel">
            <div className="side-panel-cap">{t('tool.privacy')}</div>
            <p>{t('tool.privacyText')}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
