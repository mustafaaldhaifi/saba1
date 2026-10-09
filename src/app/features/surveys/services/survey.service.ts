import { Injectable } from '@angular/core';
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';
import { RequiredSurvey, Survey, SurveyAnswers, SurveyResponse } from '../models/survey.models';
import { latestDueDate, resolveSurveySchedule } from './survey-period';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  constructor(private readonly firebase: FirebaseAppService) {}

  buildResponseId(surveyId: string, branchId: string, occurrenceDate: string): string {
    return `${surveyId}__${branchId}__${occurrenceDate}`;
  }

  async getBranchId(accountName: string): Promise<string> {
    const name = accountName.charAt(0).toUpperCase() + accountName.slice(1).toLowerCase();
    const result = await getDocs(query(
      collection(this.firebase.db, 'branches'),
      where('name', '==', name)
    ));
    if (result.empty) throw new Error('لم يتم العثور على الفرع المرتبط بالحساب.');
    return result.docs[0].id;
  }

  /** latest_only never carries older missed occurrences into the new period. */
  async getIncompleteRequiredSurveys(branchId: string): Promise<RequiredSurvey[]> {
    const snapshot = await getDocs(query(
      collection(this.firebase.db, 'surveys'),
      where('status', '==', 'active')
    ));
    const surveys = snapshot.docs
      .map(document => ({ ...document.data(), id: document.id } as Survey))
      .filter(survey =>
        survey.targetBranchIds?.includes(branchId) &&
        !survey.excludedBranchIds?.includes(branchId)
      );

    const candidates = surveys.flatMap(survey => {
      const occurrenceDate = latestDueDate(resolveSurveySchedule(survey));
      return occurrenceDate ? [{ survey, occurrenceDate }] : [];
    });
    const responses = await Promise.all(candidates.map(item =>
      this.getResponse(item.survey.id, branchId, item.occurrenceDate)
    ));

    return candidates
      .filter((_item, index) => responses[index]?.status !== 'submitted')
      .sort((left, right) => left.occurrenceDate.localeCompare(right.occurrenceDate));
  }

  async getResponse(surveyId: string, branchId: string, occurrenceDate: string): Promise<SurveyResponse | null> {
    const response = await getDoc(doc(
      this.firebase.db,
      'surveyResponses',
      this.buildResponseId(surveyId, branchId, occurrenceDate)
    ));
    if (response.exists()) return response.data() as SurveyResponse;

    // A monthly response written before scheduling was keyed by YYYY-MM.
    const date = new Date(`${occurrenceDate}T00:00:00Z`);
    const isMonthEnd = !Number.isNaN(date.getTime()) &&
      date.getUTCDate() === new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    if (!isMonthEnd) return null;
    const old = await getDoc(doc(
      this.firebase.db, 'surveyResponses',
      this.buildResponseId(surveyId, branchId, occurrenceDate.slice(0, 7))
    ));
    return old.exists() ? old.data() as SurveyResponse : null;
  }

  /** Finds the latest submitted answer for this branch without a composite index. */
  async getPreviousSubmittedResponse(
    surveyId: string,
    branchId: string,
    occurrenceDate: string
  ): Promise<SurveyResponse | null> {
    const snapshot = await getDocs(query(
      collection(this.firebase.db, 'surveyResponses'), where('branchId', '==', branchId)
    ));
    return snapshot.docs
      .map(document => document.data() as SurveyResponse)
      .filter(response => response.surveyId === surveyId && response.status === 'submitted')
      .filter(response => (response.occurrenceDate ?? `${response.month}-01`) < occurrenceDate)
      .sort((left, right) =>
        (right.occurrenceDate ?? `${right.month}-01`).localeCompare(left.occurrenceDate ?? `${left.month}-01`)
      )[0] ?? null;
  }

  async save(
    branchId: string,
    survey: Survey,
    occurrenceDate: string,
    answers: SurveyAnswers,
    submitted: boolean,
    userId: string,
    prefilledFromDate?: string
  ): Promise<void> {
    const now = Timestamp.now();
    await setDoc(doc(
      this.firebase.db,
      'surveyResponses',
      this.buildResponseId(survey.id, branchId, occurrenceDate)
    ), {
      surveyId: survey.id,
      branchId,
      occurrenceDate,
      status: submitted ? 'submitted' : 'draft',
      answers,
      ...(prefilledFromDate ? { prefilledFromDate } : {}),
      surveySnapshot: { title: survey.title, version: survey.version, questions: survey.questions },
      updatedAt: now,
      ...(submitted ? { submittedAt: now, submittedBy: userId } : {})
    }, { merge: true });
  }

}
