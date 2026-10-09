import { Injectable } from '@angular/core';
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';
import { RequiredSurvey, Survey, SurveyAnswers, SurveyResponse } from '../models/survey.models';
import { getCurrentSurveyMonth, getDueSurveyMonths, getPreviousSurveyMonth } from './survey-period';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  constructor(private readonly firebase: FirebaseAppService) {}

  getCurrentMonth(date = new Date()): string {
    return getCurrentSurveyMonth(date);
  }

  /** Includes the current month only on its last calendar day. */
  getDueMonths(startsFrom: string, date = new Date()): string[] {
    return getDueSurveyMonths(startsFrom, date);
  }

  previousMonth(month: string): string {
    return getPreviousSurveyMonth(month);
  }

  buildResponseId(surveyId: string, branchId: string, month: string): string {
    return `${surveyId}__${branchId}__${month}`;
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

  /** Returns every due month still awaiting submission, oldest first. */
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

    const candidates = surveys.flatMap(survey =>
      this.getDueMonths(survey.startsFrom).map(month => ({ survey, month }))
    );
    const responses = await Promise.all(candidates.map(item =>
      this.getResponse(item.survey.id, branchId, item.month)
    ));

    return candidates
      .filter((_item, index) => responses[index]?.status !== 'submitted')
      .sort((left, right) => left.month.localeCompare(right.month));
  }

  async getResponse(surveyId: string, branchId: string, month: string): Promise<SurveyResponse | null> {
    const response = await getDoc(doc(
      this.firebase.db,
      'surveyResponses',
      this.buildResponseId(surveyId, branchId, month)
    ));
    return response.exists() ? response.data() as SurveyResponse : null;
  }

  /** A previous month is a template only after that month was submitted. */
  async getPreviousSubmittedResponse(
    surveyId: string,
    branchId: string,
    month: string
  ): Promise<SurveyResponse | null> {
    const previous = await this.getResponse(surveyId, branchId, this.previousMonth(month));
    return previous?.status === 'submitted' ? previous : null;
  }

  async save(
    branchId: string,
    survey: Survey,
    month: string,
    answers: SurveyAnswers,
    submitted: boolean,
    userId: string,
    prefilledFromMonth?: string
  ): Promise<void> {
    const now = Timestamp.now();
    await setDoc(doc(
      this.firebase.db,
      'surveyResponses',
      this.buildResponseId(survey.id, branchId, month)
    ), {
      surveyId: survey.id,
      branchId,
      month,
      status: submitted ? 'submitted' : 'draft',
      answers,
      ...(prefilledFromMonth ? { prefilledFromMonth } : {}),
      surveySnapshot: { title: survey.title, version: survey.version, questions: survey.questions },
      updatedAt: now,
      ...(submitted ? { submittedAt: now, submittedBy: userId } : {})
    }, { merge: true });
  }

}
