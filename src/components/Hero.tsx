import { useLang } from '../i18n/lang';

export default function Hero() {
  const { t } = useLang();
  return (
    <section className="hero">
      <span className="hero-eyebrow">
        <span className="pulse" aria-hidden="true" />
        {t('hero.eyebrow')}
      </span>
      <h1>
        {t('hero.titleA')} <br />
        <span className="neon">{t('hero.titleB')}</span>
      </h1>
      <p>{t('hero.sub')}</p>
      <div className="hero-actions">
        <a className="btn btn-primary" href="#tools">
          {t('hero.cta')}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 4v16m0 0 6-6m-6 6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </a>
      </div>
    </section>
  );
}
