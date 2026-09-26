import type { CategoryMeta } from '../config/catalog';
import { useLang } from '../i18n/lang';
import { IMAGE_TOOLS } from '../config/catalog';

function Icon({ kind }: { kind: CategoryMeta['icon'] }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  if (kind === 'image')
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m5 19 5.5-5.5 3 3L19 11l2 2" />
      </svg>
    );
  if (kind === 'pdf')
    return (
      <svg {...common} aria-hidden="true">
        <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
        <path d="M14 2v4h4M9 13h6M9 17h6" />
      </svg>
    );
  if (kind === 'text')
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    );
  if (kind === 'code')
    return (
      <svg {...common} aria-hidden="true">
        <path d="m8 8-4 4 4 4m8-8 4 4-4 4M14 4l-4 16" />
      </svg>
    );
  return (
    <svg {...common} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10 9 5 3-5 3V9Z" />
    </svg>
  );
}

export default function CategoryGrid({
  categories,
  active,
  onSelect,
}: {
  categories: CategoryMeta[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const { lang, t } = useLang();
  const toolsCount = (n: number): string => {
    if (lang !== 'uk') return t('cat.image.count', { n });
    const m10 = n % 10;
    const m100 = n % 100;
    const w =
      m10 === 1 && m100 !== 11
        ? 'інструмент'
        : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)
          ? 'інструменти'
          : 'інструментів';
    return `${n} ${w}`;
  };
  return (
    <div className="cat-grid" role="list">
      {categories.map((c) => {
        const soon = c.status === 'soon';
        const count = c.id === 'image' ? toolsCount(IMAGE_TOOLS.length) : t('soon');
        return (
          <button
            key={c.id}
            role="listitem"
            className={`cat-card${active === c.id ? ' active' : ''}`}
            disabled={soon}
            onClick={() => !soon && onSelect(c.id)}
            title={soon ? `${t(`cat.${c.id}.name`)} — ${t('soon')}` : t(`cat.${c.id}.name`)}
          >
            {soon && <span className="soon-veil">{t('soon')}</span>}
            <span className="cat-icon" aria-hidden="true">
              <Icon kind={c.icon} />
            </span>
            <h3>{t(`cat.${c.id}.name`)}</h3>
            <p>{t(`cat.${c.id}.desc`)}</p>
            <span className="cat-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
