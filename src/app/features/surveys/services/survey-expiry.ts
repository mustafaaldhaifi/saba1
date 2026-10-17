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
  kind?: 'expired' | 'missing';
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

/** Shared by the survey form and branch-page alerts. */
export function findExpiredSurveyDocuments(
  survey: Survey,
  answers: SurveyAnswers,
  now = new Date()
): ExpiredSurveyDocument[] {
  const timeZone = resolveSurveySchedule(survey).timezone;
  const expired: ExpiredSurveyDocument[] = [];
  const add = (label: string, value: string, calendar?: SurveyDateCalendar): void => {
    if (isExpiredSurveyDate(value, calendar, timeZone, now)) {
      expired.push({
        surveyId: survey.id,
        surveyTitle: survey.title,
        label,
        expiryDate: value,
        calendar: calendar ?? 'gregorian'
      });
    }
  };

  for (const question of survey.questions) {
    const answer = answers[question.id];
    if (!answer) continue;
    if (isHealthDocumentsQuestion(question)) {
      const workers = (answer as HealthDocumentsAnswer).workers;
      if (!Array.isArray(workers)) continue;
      workers.forEach((worker, index) => {
        const name = worker.fullName?.trim() || `العامل ${index + 1}`;
        if (worker.healthCertificateStatus !== 'missing') {
          add(`${name} — الشهادة الصحية`, worker.healthCertificateExpiryDate,
            worker.healthCertificateExpiryDateCalendar);
        }
        if (worker.educationCertificateStatus !== 'missing') {
          add(`${name} — شهادة التثقيف`, worker.educationExpiryDate,
            worker.educationExpiryDateCalendar);
        }
      });
    } else if (question.type === 'document') {
      const document = answer as DocumentAnswer;
      if (document.status !== 'missing') add(question.label, document.expiryDate, document.expiryDateCalendar);
    }
  }
  return expired;
}

/** Finds explicitly missing documents and worker certificates. Legacy answers
 * without a status remain available and therefore do not generate warnings. */
export function findMissingSurveyDocuments(
  survey: Survey,
  answers: SurveyAnswers
): ExpiredSurveyDocument[] {
  const missing: ExpiredSurveyDocument[] = [];
  for (const question of survey.questions) {
    const answer = answers[question.id];
    if (!answer) continue;
    if (isHealthDocumentsQuestion(question)) {
      const workers = (answer as HealthDocumentsAnswer).workers;
      if (!Array.isArray(workers)) continue;
      workers.forEach((worker, index) => {
        const name = worker.fullName?.trim() || `العامل ${index + 1}`;
        if (worker.healthCertificateStatus === 'missing') {
          missing.push({
            surveyId: survey.id, surveyTitle: survey.title,
            label: `${name} — لا توجد لديه شهادة صحية`, kind: 'missing'
          });
        }
        if (worker.educationCertificateStatus === 'missing') {
          missing.push({
            surveyId: survey.id, surveyTitle: survey.title,
            label: `${name} — شهادة التثقيف غير موجودة`, kind: 'missing'
          });
        }
      });
    } else if (question.type === 'document' && (answer as DocumentAnswer).status === 'missing') {
      missing.push({
        surveyId: survey.id, surveyTitle: survey.title,
        label: `${question.label} — الوثيقة غير موجودة`, kind: 'missing'
      });
    }
  }
  return missing;
}
