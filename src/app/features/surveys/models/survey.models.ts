export type SurveyQuestionType = 'document' | 'health_documents' | 'yes_no' | 'notes';
export type SurveyStatus = 'active' | 'paused' | 'archived';
export type SurveyResponseStatus = 'draft' | 'submitted';

export type SurveySchedule = {
  type: 'daily' | 'weekly' | 'month_start' | 'month_end';
  startDate: string;
  weekDay?: number;
  timezone: string;
  missedPolicy: 'latest_only';
};

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  label: string;
  required: boolean;
  reasonRequiredWhen?: 'no';
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status: SurveyStatus;
  /** Legacy monthly start. New surveys should define schedule instead. */
  startsFrom?: string;
  schedule?: SurveySchedule;
  targetBranchIds: string[];
  excludedBranchIds: string[];
  version: number;
  questions: SurveyQuestion[];
}

export interface DocumentAnswer {
  documentNumber: string;
  expiryDate: string;
}

export interface HealthDocumentWorker {
  id: string;
  fullName: string;
  identityNumber: string;
  phoneNumber: string;
  healthCertificateExpiryDate: string;
  educationExpiryDate: string;
}

export interface HealthDocumentsAnswer {
  workers: HealthDocumentWorker[];
}

export interface YesNoAnswer {
  value: 'yes' | 'no' | '';
  reason?: string;
}

export interface NotesAnswer {
  value: string;
}

export type SurveyAnswer = DocumentAnswer | HealthDocumentsAnswer | YesNoAnswer | NotesAnswer;
export type SurveyAnswers = Record<string, SurveyAnswer>;

export interface SurveyResponse {
  surveyId: string;
  branchId: string;
  occurrenceDate?: string;
  /** Legacy response period. */
  month?: string;
  status: SurveyResponseStatus;
  answers: SurveyAnswers;
  prefilledFromDate?: string;
  prefilledFromMonth?: string;
}

/** Only the latest scheduled occurrence is required. */
export interface RequiredSurvey {
  survey: Survey;
  occurrenceDate: string;
}
