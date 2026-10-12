import type { SurveyDateCalendar } from '../models/survey.models';

/** Compare a date to today in its own calendar, without changing the stored value. */
export function isExpiredSurveyDate(
  value: string,
  calendar: SurveyDateCalendar | undefined,
  timeZone: string,
  now = new Date()
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const formatter = new Intl.DateTimeFormat(
    calendar === 'hijri' ? 'en-US-u-ca-islamic-umalqura' : 'en-US-u-ca-gregory',
    { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }
  );
  if (calendar === 'hijri' && formatter.resolvedOptions().calendar !== 'islamic-umalqura') {
    throw new Error('Umm al-Qura calendar is unavailable');
  }
  const parts = formatter.formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  const today = `${part('year').padStart(4, '0')}-${part('month').padStart(2, '0')}-${part('day').padStart(2, '0')}`;
  return value < today; // Expiry today remains valid through the end of the day.
}
