import { useCallback, useEffect, useRef } from 'react';
import type { ToolMeta } from '../config/catalog';
import { useLang } from '../i18n/lang';
import { WORKSPACES } from './ToolCard';

/**
 * Робоча зона як модалка поверх сторінки.
 * Картки лишаються сіткою — жодних стрибків макету.
 *
 * Доступність: role=dialog + aria-modal, Esc закриває, фокус підходить
 * на кнопку закриття і замкнений усередині (Tab-loop), після закриття
 * повертається на картку. Скрол сторінки блокується на час відкриття.
 */
export default function ToolModal({ tool, onClose }: { tool: ToolMeta; onClose: () => void }) {
  const { t } = useLang();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const title = t(`tool.${tool.id}.title`);

  const stableClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stableClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // фокус повертається на картку, з якої відкрили
      if (opener?.isConnected) opener.focus();
    };
  }, [stableClose]);

  const WS = WORKSPACES[tool.id];

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && stableClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={panelRef}
      >
        <header className="modal-head">
          <div className="modal-titles">
            <div className="tool-tagline">{t(`tool.${tool.id}.tag`)}</div>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button
            className="modal-close"
            ref={closeRef}
            onClick={stableClose}
            aria-label={t('modal.close')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="modal-body">
          <p className="tool-desc">{t(`tool.${tool.id}.desc`)}</p>
          <span className="chip">{tool.extensions}</span>
          <div className="modal-workspace">{WS && <WS tool={tool} />}</div>
        </div>
      </div>
    </div>
  );
}
