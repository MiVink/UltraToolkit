import type { MotionIntensity } from '../config/catalog';
import { useLang } from '../i18n/lang';

const MOTION_KEY: Record<MotionIntensity, string> = {
  full: 'motion.full',
  soft: 'motion.soft',
  off: 'motion.off',
};

export default function Header({
  motion,
  onToggleMotion,
}: {
  motion: MotionIntensity;
  onToggleMotion: () => void;
}) {
  const { lang, setLang, t } = useLang();

  return (
    <header className="header">
      <div className="wrap header-inner">
        <a className="logo" href="#top" aria-label="Ultra-Toolkit — на початок">
          <span className="logo-mark" aria-hidden="true">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path
                d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z"
                stroke="#4ade80"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>
            Ultra-Toolkit
            <small>local-first</small>
          </span>
        </a>
        <nav className="nav" aria-label="Навігація">
          <a href="#tools">{t('nav.tools')}</a>
          <a href="#about">{t('nav.about')}</a>
        </nav>
        <div className="lang-switch" role="group" aria-label="Мова / Language">
          <button className={lang === 'uk' ? 'on' : ''} onClick={() => setLang('uk')}>
            УК
          </button>
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
            EN
          </button>
        </div>
        <button className="motion-btn" onClick={onToggleMotion} title={t(MOTION_KEY[motion])}>
          <span className="motion-dot" aria-hidden="true" />
          {t(MOTION_KEY[motion])}
        </button>
      </div>
    </header>
  );
}
