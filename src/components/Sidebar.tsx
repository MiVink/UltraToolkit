import type { ReactNode } from 'react';
import { useLang } from '../i18n/lang';
import { IMAGE_TOOLS, visibleCategories, type CategoryMeta } from '../config/catalog';
import { useFavorites } from '../state/store';
import { CategoryIcon } from './CategoryGrid';

interface Props {
  active: 'all' | 'recent' | 'favorites';
  category: string;
  onCategory: (id: string) => void;
  onNavigate: (path: string) => void;
}

/**
 * Ліва панель: навігація верхнього рівня + категорії з реальними лічильниками.
 *
 * Категорії показуються лише ті, де вже є інструменти (visibleCategories) —
 * рахунок має бути правдою, а не заглушкою. Нові категорії з'являються самі,
 * щойно в них з'явиться перший інструмент.
 */
export default function Sidebar({ active, category, onCategory, onNavigate }: Props) {
  const { t } = useLang();
  const { favs } = useFavorites();
  const cats = visibleCategories();

  const item = (kind: 'all' | 'recent' | 'favorites', label: string, count?: number, icon: ReactNode = null) => (
    <button
      type="button"
      className={`side-item${active === kind ? ' on' : ''}`}
      onClick={() => onNavigate(kind === 'all' ? '/' : `/${kind}`)}
      aria-current={active === kind ? 'page' : undefined}
    >
      <span className="side-ico" aria-hidden="true">
        {icon}
      </span>
      <span className="side-label">{label}</span>
      {count !== undefined && <span className="side-count">{count}</span>}
    </button>
  );

  return (
    <aside className="sidebar">
      <a className="side-logo" href="#/" onClick={() => onNavigate('/')}>
        <span className="side-logo-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3 3 8l9 5 9-5-9-5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path d="m3 13 9 5 9-5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="m3 17.5 9 5 9-5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="side-logo-text">UltraToolkit</span>
      </a>

      <nav className="side-nav" aria-label={t('nav.tools')}>
        {item('all', t('nav.all'), IMAGE_TOOLS.length, <IcoGrid />)}
        {item('recent', t('nav.recent'), undefined, <IcoClock />)}
        {item('favorites', t('nav.favs'), favs.length, <IcoStar />)}
      </nav>

      {cats.length > 0 && (
        <div className="side-group">
          <div className="side-cap">{t('side.cats')}</div>
          <nav aria-label={t('side.cats')}>
            {cats.map((c: CategoryMeta) => (
              <button
                key={c.id}
                type="button"
                className={`side-item${active === 'all' && category === c.id ? ' on' : ''}`}
                onClick={() => {
                  onCategory(c.id);
                  onNavigate('/');
                }}
              >
                <span className="side-ico" aria-hidden="true">
                  <CategoryIcon kind={c.icon} />
                </span>
                <span className="side-label">{t(`cat.${c.id}.name`)}</span>
                <span className="side-count">{countIn(c.id)}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="side-foot">
        <div className="side-tip">
          <span className="side-tip-ico" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5.9 1.2.9 1.9v.3h5.4v-.3c0-.7.3-1.4.9-1.9A6 6 0 0 0 12 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <b>{t('side.tip.title')}</b>
          <span>{t('side.tip.text')}</span>
        </div>

        <a className="side-help" href="#about" onClick={() => onNavigate('/')}>
          <IcoHelp />
          {t('side.help')}
        </a>

        <div className="side-meta">
          <span>UltraToolkit v2.0</span>
          <div className="lang-switch" role="group" aria-label="Мова / Language">
            <LangBtn code="uk" />
            <LangBtn code="en" />
          </div>
        </div>
      </div>
    </aside>
  );
}

function LangBtn({ code }: { code: 'uk' | 'en' }) {
  const { lang, setLang } = useLang();
  return (
    <button type="button" className={lang === code ? 'on' : ''} onClick={() => setLang(code)}>
      {code.toUpperCase()}
    </button>
  );
}

/** Кількість інструментів у категорії. У сайдбарі — лише число, без склоніння. */
function countIn(id: CategoryMeta['id']): number {
  return IMAGE_TOOLS.filter((tool) => tool.category === id).length;
}

function IcoGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IcoClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IcoStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IcoHelp() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9.6 9.2a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.6" r="1" fill="currentColor" />
    </svg>
  );
}
