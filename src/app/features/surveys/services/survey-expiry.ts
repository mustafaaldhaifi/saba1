import type {
  DocumentAnswer, HealthDocumentsAnswer, Survey, SurveyAnswers,
  SurveyDateCalendar, SurveyQuestion
} from '../models/survey.models';
import { resolveSurveySchedule } from './survey-period';

export interface ExpiredSurveyDocument {
  surveyId: string;
  surveyTitle: string;
  label: string;
  expiryDate?: string;
  calendar?: SurveyDateCalendar;
  kind?: 'expired' | 'expiring_soon' | 'missing' | 'unavailable';
  daysRemaining?: number;
}

export function isHealthDocumentsQuestion(question: SurveyQuestion): boolean {
  return question.type === 'health_documents' ||
    (question.type === 'document' && (
      /وثائق?.*صح|صح.*وثائق?/u.test(question.label) ||
      /health[_-]?documents?/i.test(question.id)
    ));
}

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

/** Returns 0–29 for dates expiring today or within the next 29 days. */
export function upcomingSurveyExpiryDays(
  value: string,
  calendar: SurveyDateCalendar | undefined,
  timeZone: string,
  now = new Date()
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const todayParts = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const part = (type: string) => Number(todayParts.find(item => item.type === type)?.value);
  const start = Date.UTC(part('year'), part('month') - 1, part('day'));
  const formatter = new Intl.DateTimeFormat(
    calendar === 'hijri' ? 'en-US-u-ca-islamic-umalqura' : 'en-US-u-ca-gregory',
    { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }
  );
  if (calendar === 'hijri' && formatter.resolvedOptions().calendar !== 'islamic-umalqura') {
    throw new Error('Umm al-Qura calendar is unavailable');
  }
  for (let days = 0; days < 30; days += 1) {
    const parts = formatter.formatToParts(new Date(start + days * 86_400_000));
    const field = (type: string) => parts.find(item => item.type === type)?.value ?? '';
    const candidate = `${field('year').padStart(4, '0')}-${field('month').padStart(2, '0')}-${field('day').padStart(2, '0')}`;
    if (candidate === value) return days;
  }
  return null;
}

/** Shared by the survey form and branch-page alerts. */
export function findExpiredSurveyDocuments(
  survey: Survey,
  answers: SurveyAnswers,
  now = new Date()
): ExpiredSurveyDocument[] {
  return findSurveyWarnings(survey, answers, now).filter(warning => warning.kind === 'expired');
}

/** Collects all warning types in the same question/worker order as the survey. */
export function findSurveyWarnings(
  survey: Survey,
  answers: SurveyAnswers,
  now = new Date()
): ExpiredSurveyDocument[] {
  const timeZone = resolveSurveySchedule(survey).timezone;
  const warnings: ExpiredSurveyDocument[] = [];
  const add = (label: string, value: string, calendar?: SurveyDateCalendar): void => {
    if (isExpiredSurveyDate(value, calendar, timeZone, now)) {
      warnings.push({
        surveyId: survey.id,
        surveyTitle: survey.title,
        label,
        expiryDate: value,
        calendar: calendar ?? 'gregorian',
        kind: 'expired'
      });
    } else {
      const daysRemaining = upcomingSurveyExpiryDays(value, calendar, timeZone, now);
      if (daysRemaining !== null) warnings.push({
        surveyId: survey.id,
        surveyTitle: survey.title,
        label,
        expiryDate: value,
        calendar: calendar ?? 'gregorian',
        kind: 'expiring_soon',
        daysRemaining
      });
    }
  };
  const addMissing = (label: string): void => {
    warnings.push({ surveyId: survey.id, surveyTitle: survey.title, label, kind: 'missing' });
  };

  for (const question of survey.questions) {
    const answer = answers[question.id];
    if (!answer) continue;
    if (isHealthDocumentsQuestion(question)) {
      const workers = (answer as HealthDocumentsAnswer).workers;
      if (!Array.isArray(workers)) continue;
      workers.forEach((worker, index) => {
        const name = worker.fullName?.trim() || `العامل ${index + 1}`;
        if (worker.healthCertificateStatus === 'missing') {
          addMissing(`${name} — لا توجد لديه شهادة صحية`);
        } else {
          add(`${name} — الشهادة الصحية`, worker.healthCertificateExpiryDate,
            worker.healthCertificateExpiryDateCalendar);
        }
        if (worker.educationCertificateStatus === 'missing') {
          addMissing(`${name} — شهادة التثقيف غير موجودة`);
        } else {
          add(`${name} — شهادة التثقيف`, worker.educationExpiryDate,
            worker.educationExpiryDateCalendar);
        }
      });
    } else if (question.type === 'document') {
      const document = answer as DocumentAnswer;
      if (document.status === 'missing') addMissing(`${question.label} — الوثيقة غير موجودة`);
      else add(question.label, document.expiryDate, document.expiryDateCalendar);
    } else if (question.type === 'yes_no' && (answer as { value?: string }).value === 'no') {
      warnings.push({
        surveyId: survey.id, surveyTitle: survey.title,
        label: `${question.label} — غير متوفر`, kind: 'unavailable'
      });
    }
  }
  return warnings;
}

/** Finds explicitly missing documents and worker certificates. Legacy answers
 * without a status remain available and therefore do not generate warnings. */
export function findMissingSurveyDocuments(
  survey: Survey,
  answers: SurveyAnswers
): ExpiredSurveyDocument[] {
  return findSurveyWarnings(survey, answers).filter(warning => warning.kind === 'missing');
}
