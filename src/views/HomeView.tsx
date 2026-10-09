import { useMemo, useRef, useState } from 'react';
import { IMAGE_TOOLS, visibleCategories, type ToolMeta } from '../config/catalog';
import { pluralTools } from '../i18n/dict';
import { useLang } from '../i18n/lang';
import { go, useHistory, type Route } from '../state/store';
import Stepper from '../components/Stepper';
import ToolCard from '../components/ToolCard';
import { formatBytes } from '../tools/images';

interface Props {
  route: Route;
  query: string;
  onQuery: (v: string) => void;
  category: string;
  onCategory: (id: string) => void;
  onOpenTool: (tool: ToolMeta) => void;
  hasFav: (id: string) => boolean;
  onFav: (id: string) => void;
}

const POPULAR = 6;

/** Головна: hero + дропзона + степер + пошук + чипи + популярні + історія. */
export default function HomeView({
  query,
  onQuery,
  category,
  onCategory,
  onOpenTool,
  hasFav,
  onFav,
}: Props) {
  const { lang, t } = useLang();
  const history = useHistory();
  const [staged, setStaged] = useState<File[]>([]);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const chips = visibleCategories();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return IMAGE_TOOLS.filter((tool) => {
      if (category !== 'all' && tool.category !== category) return false;
      if (q) {
        const hay = `${t(`tool.${tool.id}.title`)} ${t(`tool.${tool.id}.tag`)} ${t(
          `tool.${tool.id}.desc`,
        )} ${tool.extensions}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, category, t]);

  const grid = showAll || query.trim() ? filtered : filtered.slice(0, POPULAR);
  const active = query.trim().length > 0 || showAll;

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setStaged(Array.from(files).slice(0, 20));
  };

  return (
    <div className="view-home">
      {/* --- hero --- */}
      <section className="hero">
        <div className="hero-text">
          <h1>{t('home.title')}</h1>
          <p>{t('home.sub')}</p>
        </div>
        <span className="hero-badge">{pluralTools(IMAGE_TOOLS.length, lang)}</span>
      </section>

      {/* --- дропзона --- */}
      <section className="dz-big-wrap">
        <div
          className="dz-big"
          role="button"
          tabIndex={0}
          aria-label={t('dz.big.title')}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files);
          }}
        >
          <span className="dz-big-ico" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <b>{t('dz.big.title')}</b>
          <span className="dz-big-sub">{t('dz.big.sub')}</span>
          <span className="btn btn-primary dz-big-btn">{t('dz.big.cta')}</span>
          <span className="dz-big-note">{t('dz.big.note')}</span>

          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {staged.length > 0 && (
          <div className="staged">
            <span className="staged-count">
              {t('home.staged', { n: staged.length })}
            </span>
            <ul>
              {staged.map((f) => (
                <li key={f.name + f.size}>
                  <span className="staged-name">{f.name}</span>
                  <span className="staged-size">{formatBytes(f.size, lang)}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="linklike" onClick={() => setStaged([])}>
              {t('tool.clearList')}
            </button>
          </div>
        )}

        <Stepper
          current={staged.length > 0 ? 2 : 1}
          done={staged.length > 0 ? 1 : 0}
          hint={t('step.hint')}
        />
      </section>

      {/* --- пошук --- */}
      <label className="bigsearch">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.9" />
          <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          placeholder={t('home.searchPh')}
          aria-label={t('home.searchPh')}
          onChange={(e) => onQuery(e.target.value)}
        />
        <kbd aria-hidden="true">⌘K</kbd>
      </label>

      {/* --- чипи категорій --- */}
      {chips.length > 0 && (
        <div className="chips" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={category === 'all'}
            className={`chip-btn${category === 'all' ? ' on' : ''}`}
            onClick={() => onCategory('all')}
          >
            {t('chip.all')}
          </button>
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              className={`chip-btn${category === c.id ? ' on' : ''}`}
              onClick={() => onCategory(c.id)}
            >
              {t(`cat.${c.id}.name`)}
            </button>
          ))}
        </div>
      )}

      {/* --- інструменти --- */}
      <section className="block">
        <div className="block-head">
          <h2>{active ? t('sec.tools') : t('home.popular')}</h2>
          {!active && (
            <button type="button" className="linkarrow" onClick={() => setShowAll(true)}>
              {t('home.viewAll')}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {grid.length === 0 ? (
          <div className="empty">{t('empty.search')}</div>
        ) : (
          <div className="tools-grid">
            {grid.map((tool) => (
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
      </section>

      {/* --- історія --- */}
      <section className="block">
        <div className="block-head">
          <h2>{t('home.recent')}</h2>
          <button type="button" className="linkarrow" onClick={() => go('/recent')}>
            {t('home.viewHistory')}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {history.length === 0 ? (
          <div className="empty">{t('hist.empty')}</div>
        ) : (
          <div className="hist">
            {history.slice(0, 5).map((h) => (
              <div className="hist-row" key={h.key}>
                <span className="hist-ico" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M14 3v4h4" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="hist-name">{h.name}</span>
                <span className="hist-op">
                  {h.tool ? t(`tool.${h.tool}.title`) : t('hist.unknown')}
                </span>
                <span className="hist-size">{formatBytes(h.size, lang)}</span>
                <span className="hist-when">{relTime(h.ts, t)}</span>
                <span className="hist-state">{t('hist.done')}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** «Щойно» / «Сьогодні, 14:03» / «3 жовтня, 14:03» — без бібліотек дат. */
export function relTime(
  ts: number,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return t('hist.today', { time });
  const day = `${d.getDate()} ${t(`month.${d.getMonth() + 1}`)}`;
  return t('hist.onDate', { day, time });
}
