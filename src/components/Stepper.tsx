import { useLang } from '../i18n/lang';

export type Step = 1 | 2 | 3;

const LABELS = ['step.add', 'step.format', 'step.convert'] as const;

interface Props {
  /** крок, на якому користувач зараз */
  current: Step;
  /** кількість завершених кроків — вони отримують галочку */
  done?: number;
  /** підказка праворуч */
  hint?: string;
  /** лічильник праворуч, напр. «Крок 2 із 3» */
  counter?: string;
}

/**
 * Трикроковий флоу з макета: Додати файли → Обрати формат → Конвертувати.
 * Пройдені кроки показують галочку, майбутні — приглушені.
 */
export default function Stepper({ current, done = 0, hint, counter }: Props) {
  const { t } = useLang();

  return (
    <div className="stepper" role="list">
      {LABELS.map((key, i) => {
        const n = (i + 1) as Step;
        const isDone = i < done;
        const isNow = n === current;
        return (
          <div
            key={key}
            role="listitem"
            className={`step${isNow ? ' now' : ''}${isDone ? ' done' : ''}`}
            aria-current={isNow ? 'step' : undefined}
          >
            <span className="step-num" aria-hidden="true">
              {isDone ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path
                    d="m5 12.5 4.5 4.5L19 7.5"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                n
              )}
            </span>
            <span className="step-label">{t(key)}</span>
            {i < LABELS.length - 1 && (
              <svg className="step-sep" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        );
      })}

      <span className="stepper-tail">{counter ?? hint}</span>
    </div>
  );
}
