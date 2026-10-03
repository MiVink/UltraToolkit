import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import CategoryGrid from './components/CategoryGrid';
import ToolCard from './components/ToolCard';
import { About, Footer, Next } from './components/Sections';
import { IMAGE_TOOLS, visibleCategories } from './config/catalog';
import { useLang } from './i18n/lang';

export default function App() {
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('image');
  const [openId, setOpenId] = useState<string | null>('compress');

  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [category, query, openId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return IMAGE_TOOLS;
    return IMAGE_TOOLS.filter((tool) =>
      `${t(`tool.${tool.id}.title`)} ${t(`tool.${tool.id}.tag`)} ${t(`tool.${tool.id}.desc`)} ${tool.extensions}`
        .toLowerCase()
        .includes(q),
    );
  }, [query, t]);

  const cats = visibleCategories();
  // З одначною категорією сітка з 5 колонок виглядає як поломка —
  // показуємо її лише коли категорій принаймні дві.
  const showCats = cats.length > 1;

  return (
    <>
      <div className="bg-stage" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-grain" aria-hidden="true" />

      <div id="top">
        <Header />
      </div>

      <main className="wrap">
        <Hero />

        {showCats && (
          <section id="categories">
            <div className="section-head">
              <span className="idx" aria-hidden="true">01</span>
              <h2>{t('sec.categories')}</h2>
            </div>
            <CategoryGrid categories={cats} active={category} onSelect={setCategory} />
          </section>
        )}

        <section id="tools" style={showCats ? { marginTop: 26 } : undefined}>
          <div className="section-head">
            <span className="idx" aria-hidden="true">{showCats ? '02' : '01'}</span>
            <h2>{t('sec.tools')}</h2>
            <p>{t('sec.toolsLive')}</p>
          </div>

          <div className="toolbar">
            <label className="search">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="#4ade80" strokeWidth="2" />
                <path d="m16.5 16.5 4 4" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                placeholder={t('search.ph')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t('search.ph')}
              />
            </label>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">{t('empty.search')}</div>
          ) : (
            <div className="tools-grid">
              {filtered.map((tool) => (
                <div
                  key={tool.id}
                  className={`reveal in${openId === tool.id ? ' expanded' : ''}`}
                >
                  <ToolCard
                    tool={tool}
                    open={openId === tool.id}
                    onToggle={() => setOpenId((v) => (v === tool.id ? null : tool.id))}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="reveal">
          <About />
        </div>
        <div className="reveal">
          <Next idx={showCats ? '03' : '02'} />
        </div>
      </main>

      <Footer />
    </>
  );
}
