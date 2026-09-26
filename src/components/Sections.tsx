import { NEXT_IDS } from '../config/catalog';
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

export function Next() {
  const { t } = useLang();
  return (
    <section className="next">
      <div className="section-head">
        <span className="idx">03</span>
        <h2>{t('next.title')}</h2>
      </div>
      <ul className="next-list">
        {NEXT_IDS.map((id) => (
          <li key={id}>
            <span className="next-dot" aria-hidden="true" />
            <div>
              <b>{t(`next.${id}.title`)}</b>
              <span>{t(`next.${id}.text`)}</span>
            </div>
          </li>
        ))}
      </ul>
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
