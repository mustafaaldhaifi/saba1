export type SurveyQuestionType = 'document' | 'yes_no' | 'notes';
export type SurveyStatus = 'active' | 'paused' | 'archived';
export type SurveyResponseStatus = 'draft' | 'submitted';
export interface SurveyQuestion { id: string; type: SurveyQuestionType; label: string; required: boolean; reasonRequiredWhen?: 'no'; }
export interface Survey { id: string; title: string; description?: string; status: SurveyStatus; startsFrom: string; targetBranchIds: string[]; excludedBranchIds: string[]; version: number; questions: SurveyQuestion[]; }
export interface DocumentAnswer { documentNumber: string; expiryDate: string; }
export interface YesNoAnswer { value: 'yes' | 'no' | ''; reason?: string; }
export interface NotesAnswer { value: string; }
export type SurveyAnswers = Record<string, DocumentAnswer | YesNoAnswer | NotesAnswer>;
export interface SurveyResponse { surveyId: string; branchId: string; month: string; status: SurveyResponseStatus; answers: SurveyAnswers; }
