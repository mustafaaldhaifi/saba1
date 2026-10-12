import { isExpiredSurveyDate } from './survey-expiry';

describe('survey expiry dates', () => {
  it('compares Gregorian dates in the survey timezone', () => {
    const now = new Date('2026-10-10T21:00:00Z'); // 11 October in Riyadh
    expect(isExpiredSurveyDate('2026-10-10', 'gregorian', 'Asia/Riyadh', now)).toBeTrue();
    expect(isExpiredSurveyDate('2026-10-11', 'gregorian', 'Asia/Riyadh', now)).toBeFalse();
    expect(isExpiredSurveyDate('2026-10-12', undefined, 'Asia/Riyadh', now)).toBeFalse();
  });

  it('compares Hijri dates as Umm al-Qura without converting the saved string', () => {
    const now = new Date('2026-10-10T12:00:00Z'); // 1448-04-29 in Riyadh
    expect(isExpiredSurveyDate('1448-04-28', 'hijri', 'Asia/Riyadh', now)).toBeTrue();
    expect(isExpiredSurveyDate('1448-04-29', 'hijri', 'Asia/Riyadh', now)).toBeFalse();
    expect(isExpiredSurveyDate('1448-05-01', 'hijri', 'Asia/Riyadh', now)).toBeFalse();
  });

  it('does not treat an incomplete date as expired before form validation', () => {
    expect(isExpiredSurveyDate('', 'hijri', 'Asia/Riyadh')).toBeFalse();
  });
});
