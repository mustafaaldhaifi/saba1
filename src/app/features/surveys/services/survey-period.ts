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
  if (schedule.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.startTime)) {
    throw new Error(`Invalid startTime for survey ${survey.id}`);
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

/**
 * Returns the latest occurrence after its configured local start time.
 * 1. Read the current date and time in the survey timezone.
 * 2. Use the previous day until today's start time arrives.
 * 3. Resolve the latest date for the schedule and check its start boundary.
 */
export function latestDueDate(schedule: SurveySchedule, instant = new Date()): string | null {
  // STEP 1: Compare time in the same timezone as the schedule.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: schedule.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(instant);
  const localTime = `${parts.find(part => part.type === 'hour')?.value}:${parts.find(part => part.type === 'minute')?.value}`;
  // STEP 2: Today is not due before the configured start time.
  const currentDay = parseDate(dateInTimeZone(instant, schedule.timezone));
  const today = localTime < (schedule.startTime || '00:00') ? new Date(currentDay.getTime() - DAY_MS) : currentDay;
  const start = parseDate(schedule.startDate);
  if (today < start) return null;
  // STEP 3: Apply the frequency to the latest eligible local day.
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

/** Returns the schedule version that governed a particular occurrence. */
export function scheduleForOccurrence(survey: Survey, occurrenceDate: string): SurveySchedule {
  const current = resolveSurveySchedule(survey);
  if (occurrenceDate >= current.startDate) return current;
  return survey.scheduleHistory?.find(item => occurrenceDate >= item.startDate &&
    (!item.endDate || occurrenceDate < item.endDate)) ?? current;
}

/**
 * Lists the survey dates whose end-of-day deadline passed.
 * 1. Walk dates in each schedule version until its end or today.
 * 2. Keep only days matching the configured frequency.
 */
export function expiredDueDates(survey: Survey, instant = new Date()): string[] {
  // STEP 1: Evaluate only schedule versions that enabled the deadline.
  const schedules = [...(survey.scheduleHistory ?? []), resolveSurveySchedule(survey)];
  const dates: string[] = [];
  for (const schedule of schedules) {
    if (!schedule.endOfDay) continue;
    const today = parseDate(dateInTimeZone(instant, schedule.timezone));
    const end = schedule.endDate ? parseDate(schedule.endDate) : today;
    for (let day = parseDate(schedule.startDate); day < today && day < end; day = new Date(day.getTime() + DAY_MS)) {
      // STEP 2: Match each eligible day to its recurrence rule.
      const isoDay = day.getUTCDay() || 7;
      const due = schedule.type === 'daily' ||
        (schedule.type === 'weekly' && isoDay === schedule.weekDay) ||
        (schedule.type === 'month_start' && day.getUTCDate() === 1) ||
        (schedule.type === 'month_end' && day.getUTCDate() === monthEnd(day.getUTCFullYear(), day.getUTCMonth()).getUTCDate());
      if (due) dates.push(dateKey(day));
    }
  }
  return [...new Set(dates)].sort();
}
