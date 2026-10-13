import { Survey } from '../models/survey.models';
import { findExpiredSurveyDocuments, isExpiredSurveyDate } from './survey-expiry';

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

  it('identifies expired document and worker dates with their own calendars', () => {
    const survey: Survey = {
      id: 'survey-1', title: 'وثائق الفرع', status: 'active', version: 1,
      targetBranchIds: [], excludedBranchIds: [],
      schedule: { type: 'daily', startDate: '2026-01-01', timezone: 'Asia/Riyadh', missedPolicy: 'latest_only' },
      questions: [
        { id: 'license', type: 'document', label: 'رخصة المحل', required: true },
        { id: 'workers', type: 'health_documents', label: 'وثائق صحية', required: true }
      ]
    };
    const found = findExpiredSurveyDocuments(survey, {
      license: { documentNumber: '123', expiryDate: '2026-10-09' }, // old answer defaults to Gregorian
      workers: { workers: [{ id: 'w1', fullName: 'أحمد', employeeNumber: '1', hasBranchFingerprint: 'yes',
        identityNumber: '1', phoneNumber: '1', healthCertificateExpiryDate: '1448-04-28',
        healthCertificateExpiryDateCalendar: 'hijri', educationExpiryDate: '2026-10-10' }] }
    }, new Date('2026-10-10T12:00:00Z'));
    expect(found.map(item => item.label)).toEqual(['رخصة المحل', 'أحمد — الشهادة الصحية']);
    expect(found[0].calendar).toBe('gregorian');
    expect(found[1].calendar).toBe('hijri');
  });
});
