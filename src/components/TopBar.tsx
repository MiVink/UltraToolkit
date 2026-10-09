import { useLang } from '../i18n/lang';

interface Props {
  active: 'tools' | 'recent' | 'favorites';
  query: string;
  onQuery: (v: string) => void;
}

const TABS = ['tools', 'recent', 'favorites'] as const;
type Tab = (typeof TABS)[number];

const PATH: Record<Tab, string> = { tools: '/', recent: '/recent', favorites: '/favorites' };

/** Улюблені живуть під ключем nav.favs (історична назва), решта — за id таба. */
const LABEL: Record<Tab, string> = { tools: 'nav.tools', recent: 'nav.recent', favorites: 'nav.favs' };

/**
 * Верхня панель: таби переходів + пошук інструментів.
 * Пошук шукає за назвою, тегом, описом і розширеннями.
 * Гаряча клавіша ⌘K прибрана за запитом — сам інпут лишився.
 */
export default function TopBar({ active, query, onQuery }: Props) {
  const { t } = useLang();

  return (
    <header className="topbar">
      <nav className="tabs" aria-label={t('nav.tools')}>
        {TABS.map((tab) => (
          <a
            key={tab}
            href={`#${PATH[tab]}`}
            className={`tab${active === tab ? ' on' : ''}`}
            aria-current={active === tab ? 'page' : undefined}
          >
            {t(LABEL[tab])}
          </a>
        ))}
      </nav>

      <label className="topsearch">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.9" />
          <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          placeholder={t('search.tools')}
          aria-label={t('search.tools')}
          onChange={(e) => onQuery(e.target.value)}
        />
      </label>
    </header>
  );
}
