import { Injectable } from '@angular/core';
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, where } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';
import { Survey, SurveyAnswers, SurveyResponse } from '../models/survey.models';

@Injectable({ providedIn: 'root' })
export class SurveyService {
  constructor(private readonly firebase: FirebaseAppService) {}
  getCurrentMonth(date = new Date()): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
  buildResponseId(surveyId: string, branchId: string, month: string): string { return `${surveyId}__${branchId}__${month}`; }
  async getBranchId(accountName: string): Promise<string> {
    const db = this.firebase.db; const name = accountName.charAt(0).toUpperCase() + accountName.slice(1).toLowerCase();
    const result = await getDocs(query(collection(db, 'branches'), where('name', '==', name)));
    if (result.empty) throw new Error('لم يتم العثور على الفرع المرتبط بالحساب.'); return result.docs[0].id;
  }
  async getIncompleteRequiredSurveys(branchId: string): Promise<Survey[]> {
    const db = this.firebase.db; const month = this.getCurrentMonth();
    const surveys = (await getDocs(query(collection(db, 'surveys'), where('status', '==', 'active')))).docs.map(d => ({ id: d.id, ...d.data() } as Survey))
      .filter(s => s.startsFrom <= month && s.targetBranchIds.includes(branchId) && !s.excludedBranchIds.includes(branchId));
    const incomplete: Survey[] = [];
    for (const survey of surveys) {
      const response = await getDoc(doc(db, 'surveyResponses', this.buildResponseId(survey.id, branchId, month)));
      if (!response.exists() || response.data()['status'] !== 'submitted') incomplete.push(survey);
    }
    return incomplete;
  }
  async getResponse(surveyId: string, branchId: string): Promise<SurveyResponse | null> { const snap=await getDoc(doc(this.firebase.db,'surveyResponses',this.buildResponseId(surveyId,branchId,this.getCurrentMonth()))); return snap.exists() ? snap.data() as SurveyResponse : null; }
  async save(branchId: string, survey: Survey, answers: SurveyAnswers, submitted: boolean, userId: string): Promise<void> { const db=this.firebase.db; const month=this.getCurrentMonth(); const now=Timestamp.now(); await setDoc(doc(db,'surveyResponses',this.buildResponseId(survey.id,branchId,month)), { surveyId:survey.id, branchId, month, status:submitted?'submitted':'draft', answers, surveySnapshot:{title:survey.title,version:survey.version,questions:survey.questions}, updatedAt:now, ...(submitted?{submittedAt:now,submittedBy:userId}:{}) }, {merge:true}); }
}
