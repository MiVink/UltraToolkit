import { useMemo, useRef } from 'react';
import { IMAGE_TOOLS, matchesAccept, visibleCategories, type ToolMeta } from '../config/catalog';
import { pluralTools } from '../i18n/dict';
import { useLang } from '../i18n/lang';
import type { Route } from '../state/store';
import { usePending } from '../state/pending';
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

/** Скорочений формат для бейджа біля файлу: розширення, або частину MIME. */
function fmtOf(f: File): string {
  const dot = f.name.lastIndexOf('.');
  if (dot > 0 && dot < f.name.length - 1) return f.name.slice(dot + 1).toLowerCase();
  const semi = f.type.indexOf('/');
  return semi > 0 ? f.type.slice(semi + 1) : '—';
}

/**
 * Головна сторінка: hero + дропзона + степер + пошук + чипи + інструменти.
 *
 * Логіка відповідно до Convertio: закинув файл(и) → ми показуємо саме ті
 * інструменти, які вміють з ними працювати → клік → файл уже лежить у робочій
 * зоні (черга передається через PendingCtx, див. state/pending.tsx).
 */
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
  const pending = usePending();
  const inputRef = useRef<HTMLInputElement>(null);

  const staged = pending?.files ?? [];
  const chips = visibleCategories();

  /** Інструменти, що хоча б для одного закинутого файлу вміють щось зробити. */
  const matched = useMemo(() => {
    if (staged.length === 0) return null;
    return IMAGE_TOOLS.filter((tool) => staged.some((f) => matchesAccept(tool.accept, f)));
  }, [staged]);

  const grid = useMemo(() => {
    const source = matched ?? IMAGE_TOOLS;
    const q = query.trim().toLowerCase();
    return source.filter((tool) => {
      if (category !== 'all' && tool.category !== category) return false;
      if (q) {
        const hay = `${t(`tool.${tool.id}.title`)} ${t(`tool.${tool.id}.tag`)} ${t(
          `tool.${tool.id}.desc`,
        )} ${tool.extensions}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [matched, query, category, t]);

  /** Заголовок: якщо кинули файли — підказуємо, що з ними зробити. */
  const heading =
    staged.length > 0 ? t('home.forFiles') : category !== 'all' ? t('sec.tools') : t('home.tools');

  const emptyMsg = matched && matched.length === 0 ? t('home.noTool') : t('empty.search');

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    pending?.set(Array.from(files).slice(0, 20));
  };

  /** Передаємо в інструмент лише ті файли, які він справді вміє прийняти. */
  const openTool = (tool: ToolMeta) => {
    pending?.set(staged.filter((f) => matchesAccept(tool.accept, f)));
    onOpenTool(tool);
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
          className={`dz-big${staged.length > 0 ? ' has' : ''}`}
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
              <path
                d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <b>{t('dz.big.title')}</b>
          <span className="dz-big-sub">{t('dz.big.sub')}</span>
          <span className="btn btn-primary dz-big-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
            {t('dz.big.cta')}
          </span>
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
            <span className="staged-count">{t('home.staged', { n: staged.length })}</span>
            <ul>
              {staged.map((f) => (
                <li key={f.name + f.size}>
                  <span className="staged-fmt">{fmtOf(f)}</span>
                  <span className="staged-name">{f.name}</span>
                  <span className="staged-size">{formatBytes(f.size, lang)}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="linklike" onClick={() => pending?.set([])}>
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

      {/* --- інструменти: всі, що належать типу; після скидання — ті, що вміють працювати з файлом --- */}
      <section className="block">
        <div className="block-head">
          <h2>{heading}</h2>
        </div>

        {grid.length === 0 ? (
          <div className="empty">{emptyMsg}</div>
        ) : (
          <div className="tools-grid">
            {grid.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onOpen={() => openTool(tool)}
                fav={hasFav(tool.id)}
                onFav={() => onFav(tool.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
