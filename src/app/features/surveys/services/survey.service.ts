import { Injectable } from '@angular/core';
import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore';
import { FirebaseAppService } from '../../../core/firebase/firebase-app.service';
import { RequiredSurvey, Survey, SurveyAnswers, SurveyResponse } from '../models/survey.models';
import { expiredDueDates, latestDueDate, resolveSurveySchedule } from './survey-period';
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
   * Saves a complete product count once for this branch and occurrence.
   * 1. Validate the fixed counts and current occurrence access.
   * 2. Lock counts in the existing response document within a transaction.
   */
  async saveInventoryCounts(branchId: string, survey: Survey, occurrenceDate: string,
    inventoryAnswers: Record<string, InventorySurveyAnswer>, userId: string): Promise<void> {
    // STEP 1: Only complete, nonnegative counts may become immutable.
    const entries = Object.values(inventoryAnswers);
    const referenceDate = entries[0]?.referenceDate;
    if (!entries.length || entries.some(answer => answer.actualQuantity === null ||
      !Number.isFinite(answer.actualQuantity) || answer.actualQuantity < 0 ||
      !Number.isFinite(answer.expectedQuantity) ||
      answer.difference !== answer.actualQuantity - answer.expectedQuantity ||
      !/^\d{4}-\d{2}-\d{2}$/.test(answer.referenceDate) || answer.referenceDate !== referenceDate)) {
      throw new Error('أكمل الكمية الموجودة لكل صنف قبل الحفظ.');
    }
    await this.ensureOccurrenceAccess(branchId, survey.id, occurrenceDate);
    // STEP 2: A second tab or retry cannot replace already locked quantities.
    const reference = doc(this.firebase.db, 'surveyResponses', this.buildResponseId(survey.id, branchId, occurrenceDate));
    await runTransaction(this.firebase.db, async transaction => {
      const existing = await transaction.get(reference);
      if (existing.data()?.['status'] === 'submitted' || existing.data()?.['inventoryCountsLocked']) {
        throw new Error('الكميات محفوظة ومقفلة بالفعل. حدّث الصفحة للانتقال إلى مرحلة الأسباب.');
      }
      transaction.set(reference, {
        surveyId: survey.id, branchId, occurrenceDate, status: 'draft', answers: {},
        inventoryAnswers, inventoryCountsLocked: true, countsLockedAt: serverTimestamp(), countsLockedBy: userId,
        surveySnapshot: { title: survey.title, version: survey.version, kind: 'inventory', questions: [],
          ...(survey.schedule ? { schedule: survey.schedule } : {}) },
        updatedAt: serverTimestamp(), ...(!existing.exists() ? { createdAt: serverTimestamp() } : {})
      }, { merge: true });
    });
  }

  /**
   * Saves only explanations for a previously locked product count.
   * 1. Recheck occurrence access and read its response in a transaction.
   * 2. Preserve every count while updating the editable explanations.
   */
  async saveInventoryReasons(branchId: string, survey: Survey, occurrenceDate: string,
    reasons: Record<string, string>): Promise<void> {
    // STEP 1: Reasons belong to an existing locked draft for this occurrence.
    await this.ensureOccurrenceAccess(branchId, survey.id, occurrenceDate);
    const reference = doc(this.firebase.db, 'surveyResponses', this.buildResponseId(survey.id, branchId, occurrenceDate));
    await runTransaction(this.firebase.db, async transaction => {
      const existing = await transaction.get(reference);
      if (!existing.exists() || !existing.data()['inventoryCountsLocked'] || existing.data()['status'] === 'submitted') {
        throw new Error('الكميات غير محفوظة أو تم إرسال الاستبيان. حدّث الصفحة.');
      }
      // STEP 2: Build the next draft from stored quantities, never from editable form values.
      const saved = existing.data()['inventoryAnswers'] as Record<string, InventorySurveyAnswer> | undefined;
      if (!saved || !Object.keys(saved).length) throw new Error('بيانات الكميات المحفوظة غير مكتملة. تواصل مع الإدارة.');
      const next = Object.fromEntries(Object.entries(saved).map(([id, answer]) => [id, {
        ...answer, reason: answer.difference === 0 ? '' : String(reasons[id] ?? '').trim()
      }]));
      transaction.update(reference, { inventoryAnswers: next, updatedAt: serverTimestamp() });
    });
  }

  /**
   * Submits a product survey and applies positive differences to the latest daily inventory.
   * 1. Check the branch's current or reopened occurrence access.
   * 2. Read the latest report and related stock documents from the server.
   * 3. Recheck the reference, response status, and closing balances in a transaction.
   * 4. Apply surplus and submit the response atomically.
   */
  async submitInventoryResponse(
    branchId: string, survey: Survey, occurrenceDate: string,
    inventoryAnswers: Record<string, InventorySurveyAnswer>, userId: string
  ): Promise<void> {
    // STEP 1: Refuse an expired occurrence without an active administrative grant.
    await this.ensureOccurrenceAccess(branchId, survey.id, occurrenceDate);
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

    // STEP 2: Read server-side document identities; cached baselines are not enough for a write.
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

    // STEP 3: Transaction reads protect locked quantities and the saved reference.
    const responseRef = doc(this.firebase.db, 'surveyResponses', this.buildResponseId(survey.id, branchId, occurrenceDate));
    const latestRef = doc(this.firebase.db, collectionNames.latestReportUpdate, `${branchId}_${typeId}`);
    try {
      await runTransaction(this.firebase.db, async transaction => {
      const responseDoc = await transaction.get(responseRef);
      // NOTE: The submitted count must exactly match the locked first-stage snapshot.
      const locked = responseDoc.data()?.['inventoryAnswers'] as Record<string, InventorySurveyAnswer> | undefined;
      if (!responseDoc.data()?.['inventoryCountsLocked'] || !locked ||
          Object.keys(locked).length !== entries.length || entries.some(([id, answer]) =>
            !locked[id] || locked[id].actualQuantity !== answer.actualQuantity ||
            locked[id].expectedQuantity !== answer.expectedQuantity ||
            locked[id].referenceDate !== answer.referenceDate || locked[id].difference !== answer.difference)) {
        throw new Error('الكميات المحفوظة لا تطابق الاستبيان. حدّث الصفحة؛ لا يمكن تعديلها بعد الحفظ.');
      }
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

      // STEP 4: Adjust the existing count once and keep all dependent values consistent.
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

  /**
   * Resolves the signed-in branch without changing its Firestore identity.
   * 1. Read by immutable login key, then fall back to legacy branch name.
   * 2. Reject a missing or archived branch before survey access.
   */
  async getBranchId(accountName: string): Promise<string> {
    // STEP 1: Display names may change while the email prefix stays fixed.
    const name = accountName.charAt(0).toUpperCase() + accountName.slice(1).toLowerCase();
    const byLogin = await getDocs(query(
      collection(this.firebase.db, 'branches'),
      where('loginName', '==', name)
    ));
    const result = byLogin.empty ? await getDocs(query(
      collection(this.firebase.db, 'branches'), where('name', '==', name)
    )) : byLogin;
    // STEP 2: Do not grant survey access to archived branches.
    if (result.empty || result.docs[0].data()['status'] === 'archived') {
      throw new Error('الفرع غير متاح أو تم تعطيل حسابه.');
    }
    return result.docs[0].id;
  }

  /**
   * Resolves the oldest missed deadline before considering the current occurrence.
   * 1. Read active surveys, branch answers, and administrator grants.
   * 2. Find expired unanswered dates from schedules with end-of-day closure.
   * 3. Return the blocked date, reopened date, or current required surveys.
   */
  async getBranchSurveyState(branchId: string): Promise<{ blocked: RequiredSurvey | null; required: RequiredSurvey[] }> {
    // STEP 1: Read the persisted response and grant state for this branch.
    const [snapshot, responses, overrides] = await Promise.all([getDocs(query(
      collection(this.firebase.db, 'surveys'),
      where('status', '==', 'active')
    )), getDocs(query(collection(this.firebase.db, 'surveyResponses'), where('branchId', '==', branchId))),
    getDocs(query(collection(this.firebase.db, 'surveyAccessOverrides'), where('branchId', '==', branchId)))]);
    const surveys = snapshot.docs
      .map(document => ({ ...document.data(), id: document.id } as Survey))
      .filter(survey =>
        survey.targetBranchIds?.includes(branchId) &&
        !survey.excludedBranchIds?.includes(branchId)
      );

    const surveyById = new Map(surveys.map(survey => [survey.id, survey]));
    const submitted = new Set(responses.docs.filter(item => item.data()['status'] === 'submitted')
      .map(item => {
        const data = item.data();
        const survey = surveyById.get(data['surveyId']);
        const month = data['month'] as string | undefined;
        const legacyDate = month && survey && resolveSurveySchedule(survey).type === 'month_end'
          ? new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10)
          : `${month}-01`;
        return `${data['surveyId']}__${data['occurrenceDate'] ?? legacyDate}`;
      }));
    const grants = new Map(overrides.docs.map(item => [item.id, item.data()['expiresAt'] as Timestamp | undefined]));
    // STEP 2: Earlier unanswered deadlines remain binding after a new day begins.
    const missed = surveys.flatMap(survey => expiredDueDates(survey)
      .filter(date => !submitted.has(`${survey.id}__${date}`))
      .map(occurrenceDate => ({ survey, occurrenceDate })))
      .sort((left, right) => left.occurrenceDate.localeCompare(right.occurrenceDate));
    if (missed.length) {
      const first = missed[0];
      const grant = grants.get(this.buildResponseId(first.survey.id, branchId, first.occurrenceDate));
      return grant?.toDate && grant.toDate() > new Date()
        ? { blocked: null, required: [first] } : { blocked: first, required: [] };
    }
    // STEP 3: Preserve the existing mandatory current-occurrence behavior.
    const candidates = surveys.flatMap(survey => {
      const occurrenceDate = latestDueDate(resolveSurveySchedule(survey));
      return occurrenceDate && !submitted.has(`${survey.id}__${occurrenceDate}`) ? [{ survey, occurrenceDate }] : [];
    });
    return { blocked: null, required: candidates.sort((left, right) => left.occurrenceDate.localeCompare(right.occurrenceDate)) };
  }

  async getIncompleteRequiredSurveys(branchId: string): Promise<RequiredSurvey[]> {
    return (await this.getBranchSurveyState(branchId)).required;
  }

  /** Rechecks branch access immediately before any response write. */
  private async ensureOccurrenceAccess(branchId: string, surveyId: string, occurrenceDate: string): Promise<void> {
    const state = await this.getBranchSurveyState(branchId);
    if (state.blocked) throw new Error('تم تقييد حسابك لعدم الالتزام بمواعيد الإدخال. تواصل مع الإدارة لفتح التقييد.');
    if (!state.required.some(item => item.survey.id === surveyId && item.occurrenceDate === occurrenceDate)) {
      throw new Error('لم يعد موعد هذا الاستبيان متاحًا. حدّث الصفحة.');
    }
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

  /**
   * Saves a document survey for its current occurrence.
   * 1. Recheck access and reject inventory responses from this path.
   * 2. Write the draft or submitted answer under its stable response ID.
   */
  async save(
    branchId: string,
    survey: Survey,
    occurrenceDate: string,
    answers: SurveyAnswers,
    submitted: boolean,
    userId: string,
    prefilledFromDate?: string
  ): Promise<void> {
    // STEP 1: Inventory counts use the separate one-time lock flow.
    if (survey.kind === 'inventory') throw new Error('استخدم حفظ الكميات أو الأسباب لاستبيان الأصناف.');
    await this.ensureOccurrenceAccess(branchId, survey.id, occurrenceDate);
    // STEP 2: Preserve the existing document-survey response shape.
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
