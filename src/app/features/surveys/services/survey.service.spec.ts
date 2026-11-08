import { SurveySchedule } from '../models/survey.models';
import { expiredDueDates, latestDueDate, previousDueDate, resolveSurveySchedule } from './survey-period';

const schedule = (type: SurveySchedule['type'], startDate = '2026-10-09'): SurveySchedule => ({
  type, startDate, timezone: 'Asia/Riyadh', missedPolicy: 'latest_only'
});

describe('survey scheduling', () => {
  it('opens a daily occurrence at midnight in the configured timezone', () => {
    const daily = schedule('daily');
    expect(latestDueDate(daily, new Date('2026-10-08T20:59:59Z'))).toBeNull();
    expect(latestDueDate(daily, new Date('2026-10-08T21:00:00Z'))).toBe('2026-10-09');
    expect(latestDueDate(daily, new Date('2026-10-10T12:00:00Z'))).toBe('2026-10-10');
  });

  it('waits until the configured local time before opening a new occurrence', () => {
    const daily = { ...schedule('daily'), startTime: '09:30' };
    expect(latestDueDate(daily, new Date('2026-10-09T06:29:00Z'))).toBeNull();
    expect(latestDueDate(daily, new Date('2026-10-09T06:30:00Z'))).toBe('2026-10-09');
    expect(latestDueDate(daily, new Date('2026-10-10T06:29:00Z'))).toBe('2026-10-09');
  });

  it('keeps expired dates only when end-of-day closure was enabled', () => {
    const survey = { id: 'a', title: 'a', status: 'active' as const, targetBranchIds: [], excludedBranchIds: [],
      version: 1, questions: [], schedule: { ...schedule('daily'), endOfDay: true } };
    expect(expiredDueDates(survey, new Date('2026-10-11T20:59:00Z'))).toEqual(['2026-10-09', '2026-10-10']);
    expect(expiredDueDates({ ...survey, schedule: { ...schedule('daily'), endOfDay: false } },
      new Date('2026-10-11T21:00:00Z'))).toEqual([]);
  });

  it('starts weekly scheduling on the first matching weekday after startDate', () => {
    const weekly = { ...schedule('weekly'), weekDay: 1 };
    expect(latestDueDate(weekly, new Date('2026-10-11T12:00:00Z'))).toBeNull();
    expect(latestDueDate(weekly, new Date('2026-10-11T21:00:00Z'))).toBe('2026-10-12');
    expect(latestDueDate(weekly, new Date('2026-10-18T12:00:00Z'))).toBe('2026-10-12');
    expect(latestDueDate(weekly, new Date('2026-10-18T21:00:00Z'))).toBe('2026-10-19');
    expect(previousDueDate(weekly, '2026-10-19')).toBe('2026-10-12');
  });

  it('handles month boundaries and leap year', () => {
    expect(latestDueDate(schedule('month_start'), new Date('2026-11-01T12:00:00Z'))).toBe('2026-11-01');
    expect(latestDueDate(schedule('month_end'), new Date('2026-10-30T12:00:00Z'))).toBeNull();
    expect(latestDueDate(schedule('month_end'), new Date('2026-10-31T12:00:00Z'))).toBe('2026-10-31');
    expect(previousDueDate(schedule('month_end'), '2028-03-31')).toBe('2028-02-29');
  });

  it('supports old monthly surveys and rejects invalid schedules', () => {
    const legacy = resolveSurveySchedule({ id: 'a', title: 'a', status: 'active', startsFrom: '2026-09',
      targetBranchIds: [], excludedBranchIds: [], version: 1, questions: [] });
    expect(latestDueDate(legacy, new Date('2026-10-01T12:00:00Z'))).toBe('2026-09-30');
    expect(() => resolveSurveySchedule({ id: 'a', title: 'a', status: 'active',
      schedule: { ...schedule('weekly'), weekDay: 8 }, targetBranchIds: [],
      excludedBranchIds: [], version: 1, questions: [] })).toThrow();
  });
});
