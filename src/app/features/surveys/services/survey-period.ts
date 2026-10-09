import type { Survey, SurveySchedule } from '../models/survey.models';

const DAY_MS = 86_400_000;

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid survey date: ${value}`);
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid survey date: ${value}`);
  }
  return date;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthEnd(year: number, monthIndex: number): Date {
  return new Date(Date.UTC(year, monthIndex + 1, 0));
}

/** Old monthly definitions remain valid without rewriting Firestore documents. */
export function resolveSurveySchedule(survey: Survey): SurveySchedule {
  const schedule = survey.schedule ?? {
    type: 'month_end' as const,
    startDate: `${survey.startsFrom}-01`,
    timezone: 'Asia/Aden',
    missedPolicy: 'latest_only' as const
  };
  parseDate(schedule.startDate);
  if (!['daily', 'weekly', 'month_start', 'month_end'].includes(schedule.type) ||
      schedule.missedPolicy !== 'latest_only' || !schedule.timezone) {
    throw new Error(`Invalid schedule for survey ${survey.id}`);
  }
  if (schedule.type === 'weekly' && (!Number.isInteger(schedule.weekDay) ||
      schedule.weekDay! < 1 || schedule.weekDay! > 7)) {
    throw new Error(`Invalid weekDay for survey ${survey.id}`);
  }
  new Intl.DateTimeFormat('en-US', { timeZone: schedule.timezone });
  return schedule;
}

export function dateInTimeZone(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(instant);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The latest due occurrence, or null before the first scheduled day. */
export function latestDueDate(schedule: SurveySchedule, instant = new Date()): string | null {
  const today = parseDate(dateInTimeZone(instant, schedule.timezone));
  const start = parseDate(schedule.startDate);
  if (today < start) return null;
  let due: Date;
  switch (schedule.type) {
    case 'daily':
      due = today;
      break;
    case 'weekly': {
      const isoDay = today.getUTCDay() || 7;
      due = new Date(today.getTime() - ((isoDay - schedule.weekDay! + 7) % 7) * DAY_MS);
      break;
    }
    case 'month_start':
      due = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      break;
    case 'month_end': {
      const currentEnd = monthEnd(today.getUTCFullYear(), today.getUTCMonth());
      due = today >= currentEnd ? currentEnd :
        monthEnd(today.getUTCFullYear(), today.getUTCMonth() - 1);
      break;
    }
  }
  return due >= start ? dateKey(due) : null;
}

/** The preceding occurrence for a scheduled date. */
export function previousDueDate(schedule: SurveySchedule, occurrenceDate: string): string {
  const date = parseDate(occurrenceDate);
  switch (schedule.type) {
    case 'daily': return dateKey(new Date(date.getTime() - DAY_MS));
    case 'weekly': return dateKey(new Date(date.getTime() - 7 * DAY_MS));
    case 'month_start': return dateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)));
    case 'month_end': return dateKey(monthEnd(date.getUTCFullYear(), date.getUTCMonth() - 1));
  }
}
