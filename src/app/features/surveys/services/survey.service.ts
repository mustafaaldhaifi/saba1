import { Injectable } from '@angular/core';
import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';
import { RequiredSurvey, Survey, SurveyAnswers, SurveyResponse } from '../models/survey.models';
import { latestDueDate, resolveSurveySchedule } from './survey-period';
import { ExpiredSurveyDocument, findSurveyWarnings } from './survey-expiry';
import { ProductsReaderService } from '../../inventory/data/products-reader.service';
import { DailyReportsService } from '../../../dailyReports.service';
import { ApiService } from '../../../api.service';
import { InventorySurveyAnswer } from '../models/survey.models';
import { collectionNames } from '../../../Shareds';


@Injectable({ providedIn: 'root' })
export class SurveyService {
  constructor(
    private readonly firebase: FirebaseAppService,
    private readonly productsReader: ProductsReaderService,
    private readonly dailyReports: DailyReportsService,
    private readonly api: ApiService
  ) {}


  /**
   * Loads stocktaking products and their latest daily balances.
   * 1. Reuse the branch city and cached product catalogue.
   * 2. Find the latest daily report date for the branch.
   * 3. Reuse the shared daily report cache and match balances by product ID.
   */
  async getInventoryBaseline(branchId: string, typeId = '5'): Promise<{ date: string; products: Array<{ id: string; name: string; expectedQuantity: number }> }> {
    // STEP 1: Load the same city and product catalogue used by the daily inventory page.
    const branch = await getDoc(doc(this.firebase.db, 'branches', branchId));
    if (!branch.exists()) throw new Error('لم يتم العثور على الفرع.');
    const city = branch.data()['city'];
    const products = (await this.productsReader.loadForCityAndType(city, typeId))
      .filter(product => product.isSales !== true && product.isSales !== 'true');

    // STEP 2: Locate the latest recorded day without treating a missing report as zero stock.
    const dates = await this.dailyReports.getReportDates(branchId, typeId, this.api);
    const latest = dates.map(item => item.date as Timestamp)
      .filter(Boolean).sort((left, right) => right.toMillis() - left.toMillis())[0];
    if (!latest) return { date: '', products: [] };
    const day = latest.toDate();
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);

    // STEP 3: Share the daily report cache and retain only products with a recorded balance.
    const update = await this.dailyReports.getLastupdate(branchId, Timestamp.fromDate(start), this.api);
    const reports = await this.dailyReports.getData(typeId, branchId, start, end, update, this.api);
    const balances = new Map(reports
      .filter((report: any) => report.closeStock !== null && report.closeStock !== undefined && report.closeStock !== '')
      .map((report: any) => [report.productId, Number(report.closeStock)]));
    return {
      date: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
      products: products.filter(product => Number.isFinite(balances.get(product.id)))
        .map(product => ({ id: product.id, name: product.name, expectedQuantity: balances.get(product.id)! }))
    };
  }

  /**
   * Submits a product survey and applies positive differences to the latest daily inventory.
   * 1. Read the latest report and its related stock documents from the server.
   * 2. Recheck the reference, response status, and closing balances in a transaction.
   * 3. Increase the count column and dependent balances, then submit the response atomically.
   */
  async submitInventoryResponse(
    branchId: string, survey: Survey, occurrenceDate: string,
    inventoryAnswers: Record<string, InventorySurveyAnswer>, userId: string
  ): Promise<void> {
    const typeId = survey.inventory?.typeId ?? '5';
    const entries = Object.entries(inventoryAnswers);
    if (!entries.length || entries.some(([, answer]) =>
      answer.actualQuantity === null || !Number.isFinite(answer.actualQuantity) || answer.actualQuantity < 0 ||
      !Number.isFinite(answer.expectedQuantity) || answer.difference !== answer.actualQuantity - answer.expectedQuantity ||
      (answer.difference !== 0 && !answer.reason.trim())
    )) throw new Error('أكمل أعداد الأصناف وأسباب الفروقات قبل الإرسال.');
    const referenceDate = entries[0][1].referenceDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate) || entries.some(([, answer]) => answer.referenceDate !== referenceDate)) {
      throw new Error('تاريخ الجرد المرجعي غير صحيح. حدّث الاستبيان.');
    }

    // STEP 1: Read server-side document identities; cached baselines are not enough for a write.
    const dates = await getDocs(query(
      collection(this.firebase.db, collectionNames.dailyReportsDates),
      where('branchId', '==', branchId), where('typeId', '==', typeId)
    ));
    const latest = dates.docs.sort((left, right) => right.data()['date'].toMillis() - left.data()['date'].toMillis())[0];
    const day = latest?.data()['date']?.toDate();
    if (!day || this.localDateKey(day) !== referenceDate) {
      this.dailyReports.invalidateReportDates(branchId, typeId);
      throw new Error('تغير آخر يوم جرد. حدّث الاستبيان وأعد المقارنة.');
    }
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    const [reports, openingStocks] = await Promise.all([
      getDocs(query(collection(this.firebase.db, collectionNames.dailyReports),
        where('branchId', '==', branchId), where('typeId', '==', typeId),
        where('date', '>=', Timestamp.fromDate(start)), where('date', '<=', Timestamp.fromDate(end)))),
      getDocs(query(collection(this.firebase.db, collectionNames.openingStock),
        where('branchId', '==', branchId), where('typeId', '==', typeId)))
    ]);
    const surplus = entries.filter(([, answer]) => answer.difference! > 0);
    const reportByProduct = new Map<string, typeof reports.docs>();
    for (const report of reports.docs) {
      const productId = report.data()['productId'];
      reportByProduct.set(productId, [...(reportByProduct.get(productId) ?? []), report]);
    }
    const openingByProduct = new Map<string, typeof openingStocks.docs>();
    for (const opening of openingStocks.docs) {
      const productId = opening.data()['productId'];
      openingByProduct.set(productId, [...(openingByProduct.get(productId) ?? []), opening]);
    }
    const invalidReports = entries.filter(([id]) => reportByProduct.get(id)?.length !== 1)
      .map(([id, answer]) => `${answer.productName} (${reportByProduct.get(id)?.length ?? 0} سجل جرد)`);
    const invalidOpeningStocks = surplus.filter(([id]) => openingByProduct.get(id)?.length !== 1)
      .map(([id, answer]) => {
        const duplicates = openingByProduct.get(id) ?? [];
        if (!duplicates.length) return `${answer.productName} [${id}]: لا يوجد رصيد افتتاحي`;
        const details = duplicates.map(opening => {
          const data = opening.data();
          const createdAt = data['createdAt'];
          const date = createdAt instanceof Timestamp ? createdAt.toDate().toLocaleString('ar-YE') : 'غير مسجل';
          return `المعرّف: ${opening.id}، الرصيد: ${data['openingStockQnt'] ?? 'غير مسجل'}، الإنشاء: ${date}`;
        });
        return `${answer.productName} [${id}] (${duplicates.length} أرصدة افتتاحية):\n${details.join('\n')}`;
      });
    if (invalidReports.length || invalidOpeningStocks.length) {
      throw new Error(`بيانات الجرد أو الرصيد الافتتاحي غير مكتملة. الأصناف:\n${[
        ...invalidReports, ...invalidOpeningStocks
      ].join('\n')}. لا يمكن تطبيق الفائض.`);
    }
    const updateMarker = surplus.length
      ? await this.dailyReports.getLastupdate(branchId, Timestamp.fromDate(start), this.api) : null;
    if (surplus.length && !updateMarker) throw new Error('تعذر العثور على علامة تحديث الجرد.');

    // STEP 2: Transaction reads protect the saved reference against concurrent edits or retries.
    const responseRef = doc(this.firebase.db, 'surveyResponses', this.buildResponseId(survey.id, branchId, occurrenceDate));
    const latestRef = doc(this.firebase.db, collectionNames.latestReportUpdate, `${branchId}_${typeId}`);
    try {
      await runTransaction(this.firebase.db, async transaction => {
      const responseDoc = await transaction.get(responseRef);
      const latestDoc = await transaction.get(latestRef);
      const dateDoc = await transaction.get(latest.ref);
      if (responseDoc.data()?.['status'] === 'submitted') throw new Error('تم إرسال الاستبيان مسبقًا؛ لن يُضاف الفائض مرة أخرى.');
      if (!dateDoc.exists() || (latestDoc.exists() && latestDoc.data()['updatedAt'] &&
          this.localDateKey(latestDoc.data()['updatedAt'].toDate()) !== referenceDate)) {
        throw new Error('تغير آخر يوم جرد. حدّث الاستبيان وأعد المقارنة.');
      }
      const reportDocs = await Promise.all(entries.map(([id]) => transaction.get(reportByProduct.get(id)![0].ref)));
      const openingDocs = await Promise.all(surplus.map(([id]) => transaction.get(openingByProduct.get(id)![0].ref)));
      const summaryRefs = surplus.map(([id]) => doc(this.firebase.db, 'product_monthly_summaries', `${branchId}_${referenceDate.slice(0, 7)}_${id}`));
      const summaryDocs = await Promise.all(summaryRefs.map(ref => transaction.get(ref)));
      const markerDoc = updateMarker ? await transaction.get(doc(this.firebase.db, collectionNames.dailyReportsUpdates, updateMarker.id)) : null;
      if (updateMarker && !markerDoc?.exists()) throw new Error('تغيرت بيانات الجرد. حدّث الاستبيان.');
      entries.forEach(([id, answer], index) => {
        const report = reportDocs[index];
        if (!report.exists() || report.data()['branchId'] !== branchId || report.data()['typeId'] !== typeId ||
            !report.data()['date'] || this.localDateKey(report.data()['date'].toDate()) !== referenceDate ||
            Number(report.data()['closeStock']) !== answer.expectedQuantity) {
          throw new Error(`تغير رصيد الصنف «${answer.productName}». حدّث الاستبيان وأعد المقارنة.`);
        }
      });
      surplus.forEach(([id, answer], index) => {
        const opening = openingDocs[index];
        const summary = summaryDocs[index];
        if (!opening.exists() || !summary.exists() ||
            Number(opening.data()['openingStockQnt']) !== answer.expectedQuantity) {
          throw new Error(`تغير الرصيد الافتتاحي للصنف «${answer.productName}». حدّث الاستبيان.`);
        }
        const daySummary = summary.data()[`days.${String(day.getDate()).padStart(2, '0')}`]
          ?? summary.data()['days']?.[String(day.getDate()).padStart(2, '0')];
        if (!daySummary || Number(daySummary.closeStock) !== answer.expectedQuantity ||
            Number(daySummary.add || 0) !== Number(reportDocs[entries.findIndex(([productId]) => productId === id)].data()!['add'] || 0)) {
          throw new Error(`تغير ملخص الصنف «${answer.productName}». حدّث الاستبيان.`);
        }
      });

      // STEP 3: Adjust the existing count once and keep all dependent values consistent.
      const dayKey = referenceDate.slice(-2);
      surplus.forEach(([id, answer], index) => {
        const report = reportDocs[entries.findIndex(([productId]) => productId === id)];
        const newClosing = answer.actualQuantity!;
        transaction.update(report.ref, {
          add: Number(report.data()!['add'] || 0) + answer.difference!,
          closeStock: newClosing, updatedAt: serverTimestamp()
        });
        transaction.update(openingDocs[index].ref, { openingStockQnt: newClosing, updatedAt: serverTimestamp() });
        const summaryData = summaryDocs[index].data()!;
        const oldDay = summaryData[`days.${dayKey}`] ?? summaryData['days']?.[dayKey];
        const updatedDay = { ...oldDay, add: Number(report.data()!['add'] || 0) + answer.difference!, closeStock: newClosing };
        // NOTE: Existing monthly summaries use a literal top-level "days.DD" key.
        transaction.set(summaryRefs[index], summaryData[`days.${dayKey}`]
          ? { [`days.${dayKey}`]: updatedDay, updatedAt: serverTimestamp() }
          : { days: { [dayKey]: updatedDay }, updatedAt: serverTimestamp() }, { merge: true });
      });
      if (updateMarker) transaction.update(doc(this.firebase.db, collectionNames.dailyReportsUpdates, updateMarker.id), { updatedAt: serverTimestamp() });
      const appliedAnswers = Object.fromEntries(entries.map(([id, answer]) => [id, {
        ...answer, appliedSurplus: Math.max(0, answer.difference ?? 0)
      }]));
      transaction.set(responseRef, {
        surveyId: survey.id, branchId, occurrenceDate, status: 'submitted', answers: {}, inventoryAnswers: appliedAnswers,
        surveySnapshot: { title: survey.title, version: survey.version, kind: 'inventory', questions: [], ...(survey.schedule ? { schedule: survey.schedule } : {}) },
        submittedAt: serverTimestamp(), submittedBy: userId, updatedAt: serverTimestamp(),
        ...(!responseDoc.exists() ? { createdAt: serverTimestamp() } : {})
      }, { merge: true });
      });
    } finally {
      // NOTE: A rejected stale comparison must also clear the baseline shown on retry.
      this.dailyReports.invalidateReportCache(branchId, typeId, day);
    }
  }

  private localDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

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

  /** Prefer the latest submitted response; use a draft only before first submission. */
  async getBranchExpiryWarnings(branchId: string): Promise<ExpiredSurveyDocument[]> {
    const snapshot = await getDocs(query(
      collection(this.firebase.db, 'surveyResponses'), where('branchId', '==', branchId)
    ));
    const latest = new Map<string, SurveyResponse>();
    const period = (response: SurveyResponse): string =>
      response.occurrenceDate ?? `${response.month ?? '0000-00'}-31`;
    for (const document of snapshot.docs) {
      const response = document.data() as SurveyResponse;
      if (!response.surveyId || !response.answers) continue;
      const existing = latest.get(response.surveyId);
      if (!existing ||
          (response.status === 'submitted' && existing.status !== 'submitted') ||
          (response.status === existing.status && period(response) > period(existing))) {
        latest.set(response.surveyId, response);
      }
    }

    const warnings = await Promise.all([...latest].map(async ([surveyId, response]) => {
      let survey: Survey | null = null;
      try {
        const surveyDoc = await getDoc(doc(this.firebase.db, 'surveys', surveyId));
        if (surveyDoc.exists()) survey = { ...surveyDoc.data(), id: surveyDoc.id } as Survey;
      } catch (error) {
        // A historical response can still be inspected from its saved snapshot.
        if (!response.surveySnapshot) throw error;
      }
      if (!survey && response.surveySnapshot) {
        survey = {
          id: surveyId,
          title: response.surveySnapshot.title,
          version: response.surveySnapshot.version,
          questions: response.surveySnapshot.questions,
          schedule: response.surveySnapshot.schedule,
          startsFrom: response.surveySnapshot.startsFrom ?? '2000-01',
          status: 'archived', targetBranchIds: [], excludedBranchIds: []
        };
      }
      if (!survey) return [];
      const responseSurvey = {
        ...survey,
        questions: response.surveySnapshot?.questions ?? survey.questions
      };
      return findSurveyWarnings(responseSurvey, response.answers);
    }));
    return warnings.flat();
  }

  async save(
    branchId: string,
    survey: Survey,
    occurrenceDate: string,
    answers: SurveyAnswers,
    submitted: boolean,
    userId: string,
    prefilledFromDate?: string,
    inventoryAnswers?: Record<string, InventorySurveyAnswer>
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
      ...(survey.kind === 'inventory' ? { inventoryAnswers: inventoryAnswers ?? {} } : {}),
      ...(prefilledFromDate ? { prefilledFromDate } : {}),
      surveySnapshot: {
        title: survey.title, version: survey.version, questions: survey.questions,
        kind: survey.kind ?? 'documents',
        ...(survey.schedule ? { schedule: survey.schedule } : {}),
        ...(survey.startsFrom ? { startsFrom: survey.startsFrom } : {})
      },
      updatedAt: now,
      ...(submitted ? { submittedAt: now, submittedBy: userId } : {})
    }, { merge: true });
  }

}
