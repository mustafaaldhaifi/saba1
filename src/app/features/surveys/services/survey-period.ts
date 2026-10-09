/** Monthly surveys follow the calendar in Yemen, independent of the device timezone. */
const SURVEY_TIME_ZONE = 'Asia/Aden';

function calendarDate(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SURVEY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const part = (name: string) => Number(parts.find(item => item.type === name)?.value);
  return { year: part('year'), month: part('month'), day: part('day') };
}

export function getCurrentSurveyMonth(date = new Date()): string {
  const { year, month } = calendarDate(date);
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Opens the current month on its last day, retaining all earlier due months. */
export function getDueSurveyMonths(startsFrom: string, date = new Date()): string[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(startsFrom)) return [];

  const { year, month, day } = calendarDate(date);
  const currentMonthIsDue = day === new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDueMonthIndex = year * 12 + month - 1 - (currentMonthIsDue ? 0 : 1);
  const [startYear, startMonth] = startsFrom.split('-').map(Number);
  const startMonthIndex = startYear * 12 + startMonth - 1;
  const months: string[] = [];

  for (let index = startMonthIndex; index <= lastDueMonthIndex; index++) {
    const dueYear = Math.floor(index / 12);
    const dueMonth = index % 12 + 1;
    months.push(`${dueYear}-${String(dueMonth).padStart(2, '0')}`);
  }
  return months;
}

export function getPreviousSurveyMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`;
}
