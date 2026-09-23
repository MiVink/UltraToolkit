import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import CategoryGrid from './components/CategoryGrid';
import ToolCard from './components/ToolCard';
// EASTER-EGG: ефект частинок за курсором — поки вимкнено, увімкнути пізніше як пасхалку.
// import CursorParticles from './components/CursorParticles';
import { About, Footer, Roadmap } from './components/Sections';
import { CATEGORIES, IMAGE_TOOLS, type MotionIntensity } from './config/catalog';
import { useLang } from './i18n/lang';

function initialMotion(): MotionIntensity {
  try {
    const saved = localStorage.getItem('ut-motion') as MotionIntensity | null;
    if (saved === 'full' || saved === 'soft' || saved === 'off') return saved;
  } catch {
    /* ignore */
  }
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'soft';
  return 'full';
}

export default function App() {
  const { t } = useLang();
  const [motion, setMotion] = useState<MotionIntensity>(initialMotion);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('image');
  const [openId, setOpenId] = useState<string | null>('compress');

  useEffect(() => {
    document.documentElement.dataset.motion = motion;
    try {
      localStorage.setItem('ut-motion', motion);
    } catch {
      /* ignore */
    }
  }, [motion]);

  useEffect(() => {
    if (motion === 'off') return;
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
  }, [motion, category, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return IMAGE_TOOLS;
    return IMAGE_TOOLS.filter((tool) =>
      `${tool.title} ${t(`tool.${tool.id}.tag`)} ${t(`tool.${tool.id}.desc`)} ${tool.extensions}`
        .toLowerCase()
        .includes(q),
    );
  }, [query, t]);

  const toggleMotion = () => setMotion((m) => (m === 'full' ? 'soft' : m === 'soft' ? 'off' : 'full'));

  return (
    <>
      <div className="bg-stage" aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <div className="aurora a" aria-hidden="true" />
      <div className="aurora b" aria-hidden="true" />
      <div className="aurora c" aria-hidden="true" />
      {/* EASTER-EGG: <CursorParticles motion={motion} /> */}
      <div className="bg-grain" aria-hidden="true" />

      <div id="top">
        <Header motion={motion} onToggleMotion={toggleMotion} />
      </div>

      <main className="wrap">
        <Hero />

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

        <section id="tools">
          <div className="section-head">
            <span className="idx">01</span>
            <h2>{t('sec.categories')}</h2>
          </div>
          <CategoryGrid categories={CATEGORIES} active={category} onSelect={setCategory} />
        </section>

        <section style={{ marginTop: 26 }}>
          <div className="section-head">
            <span className="idx">02</span>
            <h2>{t('sec.tools')}</h2>
            <p>{t('sec.toolsLive')}</p>
          </div>
          {category !== 'image' ? (
            <div className="empty">{t('empty.other', { name: t(`cat.${category}.name`), soon: t('soon') })}</div>
          ) : filtered.length === 0 ? (
            <div className="empty">{t('empty.search')}</div>
          ) : (
            <div className="tools-grid">
              {filtered.map((tool) => (
                <div key={tool.id} className="reveal in">
                  <ToolCard tool={tool} open={openId === tool.id} onToggle={() => setOpenId((v) => (v === tool.id ? null : tool.id))} />
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="reveal">
          <About />
        </div>
        <div className="reveal">
          <Roadmap />
        </div>
      </main>

      <Footer />
    </>
  );
}
