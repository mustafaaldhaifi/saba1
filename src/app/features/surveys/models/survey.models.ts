export type SurveyQuestionType = 'document' | 'health_documents' | 'yes_no' | 'notes';
export type SurveyStatus = 'active' | 'paused' | 'archived';
export type SurveyResponseStatus = 'draft' | 'submitted';

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
  startsFrom: string;
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
  month: string;
  status: SurveyResponseStatus;
  answers: SurveyAnswers;
  prefilledFromMonth?: string;
}

/** One survey can have several overdue, independently submitted months. */
export interface RequiredSurvey {
  survey: Survey;
  month: string;
}
