type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Відносний час для журналу: «Щойно» / «Сьогодні, 14:03» / «3 жовтня, 14:03».
 * Без бібліотек дат — економимо ~70 КБ, а формат все одно український.
 * Окремий модуль, бо користуються і `#/recent`, і `#/favorites`.
 */
export function relTime(ts: number, t: Translate): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return t('hist.today', { time });
  const day = `${d.getDate()} ${t(`month.${d.getMonth() + 1}`)}`;
  return t('hist.onDate', { day, time });
}
