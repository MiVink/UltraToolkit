import { ROADMAP_IDS } from '../config/catalog';
import { useLang } from '../i18n/lang';

export function About() {
  const { t } = useLang();
  return (
    <section id="about" className="about about-slim">
      <h2>{t('about.title')}</h2>
      <p>{t('about.text')}</p>
    </section>
  );
}

export function Roadmap() {
  const { t } = useLang();
  return (
    <section id="roadmap" className="roadmap">
      <div className="section-head">
        <span className="idx">03</span>
        <h2>{t('road.title')}</h2>
      </div>
      <div className="road-grid">
        {ROADMAP_IDS.map((id) => (
          <div key={id} className="road-card">
            <h3>{t(`road.${id}.title`)}</h3>
            <p>{t(`road.${id}.text`)}</p>
            <span className="eta">◌ {t(`road.${id}.eta`)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useLang();
  return (
    <footer>
      <div className="wrap foot-inner">
        <span className="lock">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2" />
          </svg>
          {t('foot.lock')}
        </span>
        <span style={{ marginLeft: 'auto' }}>{t('foot.right', { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}
