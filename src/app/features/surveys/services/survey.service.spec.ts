import { getDueSurveyMonths, getPreviousSurveyMonth } from './survey-period';

describe('monthly survey periods', () => {

  it('opens the current month only on its last day in Yemen', () => {
    expect(getDueSurveyMonths('2026-09', new Date('2026-10-30T20:59:59Z')))
      .toEqual(['2026-09']);
    expect(getDueSurveyMonths('2026-09', new Date('2026-10-30T21:00:00Z')))
      .toEqual(['2026-09', '2026-10']);
  });

  it('keeps an unsubmitted month eligible after the next month begins', () => {
    expect(getDueSurveyMonths('2026-09', new Date('2026-10-01T12:00:00Z')))
      .toEqual(['2026-09']);
  });

  it('handles year boundaries and identifies the immediately previous month', () => {
    expect(getDueSurveyMonths('2026-12', new Date('2027-01-01T12:00:00Z')))
      .toEqual(['2026-12']);
    expect(getPreviousSurveyMonth('2027-01')).toBe('2026-12');
  });
});
