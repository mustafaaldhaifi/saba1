import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { AdminBranchViewService } from '../../../branches/data/admin-branch-view.service';
import {
  HealthDocumentWorker,
  HealthDocumentsAnswer,
  InventorySurveyAnswer,
  RequiredSurvey,
  Survey,
  SurveyAnswers,
  SurveyQuestion
} from '../../models/survey.models';
import { SurveyService } from '../../services/survey.service';
import { findExpiredSurveyDocuments, isHealthDocumentsQuestion } from '../../services/survey-expiry';

@Component({
  selector: 'app-branch-surveys',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './branch-surveys.component.html',
  styleUrl: './branch-surveys.component.css'
})
export class BranchSurveysComponent implements OnInit, OnDestroy {
  @ViewChild('errorCloseButton') private errorCloseButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('expiryCloseButton') private expiryCloseButton?: ElementRef<HTMLButtonElement>;

  requiredSurveys: RequiredSurvey[] = [];
  active?: Survey;
  activeOccurrenceDate = '';
  copiedFromDate: string | null = null;
  branchId = '';
  isAdminBranchView = false;
  loading = true;
  saving = false;
  error = '';
  restricted = false;
  expiryNotice = '';
  success = '';
  expiredDates: string[] = [];
  missingDocuments: string[] = [];
  invalidDates: string[] = [];
  showLicenseQrNotice = false;
  form!: FormGroup;
  inventoryRows: Array<{ id: string; name: string; expectedQuantity: number }> = [];
  inventoryReferenceDate = '';
  inventoryCountsLocked = false;
  inventoryBaselineChanged = false;
  private previousFocus: HTMLElement | null = null;
  private formChanges?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: SurveyService,
    private readonly auth: AuthService,
    private readonly adminBranchView: AdminBranchViewService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadSurveys();
  }

  ngOnDestroy(): void {
    this.formChanges?.unsubscribe();
  }

  /**
   * Opens the next survey or shows the missed-deadline restriction.
   * 1. Resolve the signed-in branch or the administrator's selected branch and its access state.
   * 2. Show the restriction, open the required survey, or continue to the branch.
   */
  async loadSurveys(): Promise<void> {
    this.loading = true;
    this.error = '';
    this.restricted = false;
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) throw new Error('Unauthenticated user');
      // STEP 1: Use the selected branch only while its administrator view is in branch mode.
      this.isAdminBranchView = this.auth.isAdmin(user);
      if (this.isAdminBranchView) {
        if (!this.adminBranchView.branchId || this.adminBranchView.adminMode) {
          await this.router.navigateByUrl('/branch');
          return;
        }
        this.branchId = this.adminBranchView.branchId;
      } else {
        this.branchId = await this.service.getBranchId((user.email ?? '').split('@')[0]);
      }
      const access = await this.service.getBranchSurveyState(this.branchId);
      // STEP 2: Keep a restricted branch on this page until its missed survey is reopened.
      if (access.blocked) {
        this.active = undefined;
        this.requiredSurveys = [];
        this.restricted = true;
        return;
      }
      this.requiredSurveys = access.required;
      if (!this.requiredSurveys.length) {
        await this.navigateAfterCompletion();
        return;
      }
      await this.open(this.requiredSurveys[0]);
    } catch (error) {
      console.error('Unable to load required surveys:', error);
      this.active = undefined;
      this.showError('تعذر التحقق من الاستبيانات المطلوبة. تحقق من الاتصال ثم حاول مرة أخرى.');
    } finally {
      this.loading = false;
    }
  }

  /** The dialog is dismissible from keyboard as well as its close button. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.error) this.dismissError();
    else if (this.expiryNotice) this.dismissExpiryNotice();
  }

  dismissError(): void {
    this.error = '';
    this.previousFocus?.focus();
    this.previousFocus = null;
  }

  dismissExpiryNotice(): void {
    this.expiryNotice = '';
    this.previousFocus?.focus();
    this.previousFocus = null;
  }

  /** Legacy document questions named health documents use the new worker form. */
  isHealthDocumentsQuestion(question: SurveyQuestion): boolean {
    return isHealthDocumentsQuestion(question);
  }

  getDateLabel(value: string): string {
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return value;
    const date = value.length === 7 ? `${value}-01` : value;
    return new Intl.DateTimeFormat('ar-YE', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(new Date(`${date}T12:00:00Z`));
  }

  workersFor(questionId: string): FormArray<FormGroup> {
    return this.form.get([questionId, 'workers']) as FormArray<FormGroup>;
  }

  addWorker(questionId: string, worker?: Partial<HealthDocumentWorker>): void {
    this.workersFor(questionId).push(this.createWorkerGroup(worker));
  }

  removeWorker(questionId: string, index: number): void {
    this.workersFor(questionId).removeAt(index);
  }

  async open(item?: RequiredSurvey): Promise<void> {
    if (!item) return;
    this.formChanges?.unsubscribe();
    this.expiredDates = [];
    this.missingDocuments = [];
    this.invalidDates = [];
    this.form = this.fb.group({});
    this.active = item.survey;
    this.activeOccurrenceDate = item.occurrenceDate;
    this.copiedFromDate = null;
    this.inventoryRows = [];
    this.inventoryReferenceDate = '';
    this.inventoryCountsLocked = false;
    this.inventoryBaselineChanged = false;
    if (item.survey.kind === 'inventory') {
      await this.openInventory(item);
      return;
    }
    this.showLicenseQrNotice = item.survey.questions.some(question =>
      question.type === 'document' && !this.isHealthDocumentsQuestion(question)
    );

    const controls: Record<string, FormGroup> = {};
    for (const question of item.survey.questions) {
      if (this.isHealthDocumentsQuestion(question)) {
        controls[question.id] = this.fb.group({
          workers: this.fb.array<FormGroup>([], question.required ? Validators.required : [])
        });
      } else if (question.type === 'document') {
        controls[question.id] = this.fb.group({
          status: ['available'],
          documentNumber: [''],
          expiryDateCalendar: ['gregorian'],
          expiryDate: ['']
        }, { validators: this.expiryDateValidator('expiryDate', 'expiryDateCalendar') });
        this.configureDocumentStatus(controls[question.id], question.required);
      } else if (question.type === 'yes_no') {
        controls[question.id] = this.fb.group({
          value: ['', question.required ? Validators.required : []],
          reason: ['']
        });
      } else {
        controls[question.id] = this.fb.group({
          value: ['', question.required ? Validators.required : []]
        });
      }
    }
    this.form = this.fb.group(controls);

    // A draft for this occurrence wins over earlier submitted answers.
    const current = await this.service.getResponse(item.survey.id, this.branchId, item.occurrenceDate);
    if (current?.answers) {
      this.applyAnswers(current.answers);
      this.copiedFromDate = current.prefilledFromDate ?? current.prefilledFromMonth ?? null;
      this.watchExpiredDates();
      return;
    }

    const previous = await this.service.getPreviousSubmittedResponse(
      item.survey.id,
      this.branchId,
      item.occurrenceDate
    );
    if (previous?.answers) {
      this.applyAnswers(previous.answers);
      this.copiedFromDate = previous.occurrenceDate ?? previous.month ?? null;
    }
    this.watchExpiredDates();
  }

  /**
   * Prepares the product survey from the latest daily inventory.
   * 1. Load the shared cached product and report data.
   * 2. Restore locked counts from the current response or build fresh controls.
   * 3. Compare the stored reference and leave locked counts read-only.
   */
  private async openInventory(item: RequiredSurvey): Promise<void> {
    // STEP 1: A locked draft must remain visible even if its daily baseline is unavailable.
    const current = await this.service.getResponse(item.survey.id, this.branchId, item.occurrenceDate);
    this.inventoryCountsLocked = current?.inventoryCountsLocked === true;
    let baseline: { date: string; products: Array<{ id: string; name: string; expectedQuantity: number }> };
    try {
      baseline = await this.service.getInventoryBaseline(this.branchId, item.survey.inventory?.typeId ?? '5');
    } catch (error) {
      if (!this.inventoryCountsLocked) throw error;
      console.error('Unable to compare locked inventory counts:', error);
      baseline = { date: '', products: [] };
    }
    const lockedAnswers = this.inventoryCountsLocked ? current?.inventoryAnswers ?? {} : {};
    this.inventoryRows = this.inventoryCountsLocked
      ? Object.entries(lockedAnswers).map(([id, answer]) => ({ id, name: answer.productName, expectedQuantity: answer.expectedQuantity }))
      : baseline.products;
    this.inventoryReferenceDate = this.inventoryCountsLocked
      ? Object.values(lockedAnswers)[0]?.referenceDate ?? '' : baseline.date;
    if (!this.inventoryReferenceDate || !this.inventoryRows.length) {
      this.showError('لا يوجد جرد يومي حديث يحتوي أصنافًا قابلة للجرد لهذا الفرع.');
    }

    // STEP 2: Restore the fixed snapshot even if the current daily report changed.
    const controls: Record<string, FormGroup> = {};
    for (const product of this.inventoryRows) {
      controls[product.id] = this.fb.group({ actualQuantity: [null, [Validators.required, Validators.min(0)]], reason: [''] });
    }
    this.form = this.fb.group(controls);

    // STEP 3: Unlocked old drafts are restored only against the same reference date.
    for (const product of this.inventoryRows) {
      const answer = current?.inventoryAnswers?.[product.id];
      if (answer && (this.inventoryCountsLocked || answer.referenceDate === baseline.date)) {
        controls[product.id].patchValue({ actualQuantity: answer.actualQuantity, reason: answer.reason });
      }
      if (this.inventoryCountsLocked) controls[product.id].get('actualQuantity')?.disable({ emitEvent: false });
    }
    this.inventoryBaselineChanged = this.inventoryCountsLocked && (
      baseline.date !== this.inventoryReferenceDate || baseline.products.length !== this.inventoryRows.length ||
      this.inventoryRows.some(product => baseline.products.find(item => item.id === product.id)?.expectedQuantity !== product.expectedQuantity)
    );
  }

  inventoryDifference(product: { id: string; expectedQuantity: number }): number | null {
    const value = this.form?.get([product.id, 'actualQuantity'])?.value;
    if (value === null || value === '' || !Number.isFinite(Number(value))) return null;
    return Number(value) - product.expectedQuantity;
  }

  inventoryDifferenceLabel(product: { id: string; expectedQuantity: number }): string {
    const difference = this.inventoryDifference(product);
    if (difference === null) return '—';
    return difference > 0 ? `فائض ${difference}` : difference < 0 ? `عجز ${Math.abs(difference)}` : 'مطابق';
  }

  /**
   * Saves a document survey after local validation and access revalidation.
   * 1. Validate the visible form and conditional answers.
   * 2. Save the named occurrence; refresh the restriction if its deadline passed.
   * 3. Continue to the next survey after a successful submission.
   */
  async save(submitted: boolean): Promise<void> {
    if (!this.active || !this.activeOccurrenceDate || this.saving) return;
    this.error = '';
    this.success = '';
    if (this.active.kind === 'inventory') {
      await this.saveInventory(submitted);
      return;
    }
    // STEP 1: Reject incomplete or malformed answers before the write.
    this.refreshExpiredDates();
    if (this.invalidDates.length) {
      this.showError(`صيغة التاريخ غير صحيحة في: ${this.invalidDates.join('، ')}. استخدم أرقامًا إنجليزية وشرطة بهذا الشكل: YYYY-MM-DD، مثال: 1448-05-10.`);
      return;
    }
    if (submitted) this.applyConditionalReasonValidation();
    if (submitted && this.form.invalid) {
      this.form.markAllAsTouched();
      this.showError(this.getValidationError());
      return;
    }

    this.saving = true;
    try {
      // STEP 2: The service rechecks the named occurrence, including an administrator grant.
      const user = await this.auth.getCurrentUser();
      await this.service.save(
        this.branchId,
        this.active,
        this.activeOccurrenceDate,
        this.form.getRawValue() as SurveyAnswers,
        submitted,
        user?.uid ?? '',
        this.copiedFromDate ?? undefined
      );
      this.success = submitted ? 'تم إرسال الاستبيان بنجاح.' : 'تم حفظ المسودة.';
      if (this.expiredDates.length) this.showExpiryNotice();
      // STEP 3: Leave the page only after the response was saved.
      if (submitted) {
        this.requiredSurveys = this.requiredSurveys.filter(item =>
          item.survey.id !== this.active?.id || item.occurrenceDate !== this.activeOccurrenceDate
        );
        if (!this.requiredSurveys.length) await this.navigateAfterCompletion();
        else await this.open(this.requiredSurveys[0]);
      }
    } catch (error) {
      console.error('Unable to save survey response:', error);
      if (error instanceof Error && error.message.startsWith('تم تقييد حسابك')) await this.loadSurveys();
      else this.showError(error instanceof Error ? error.message : 'تعذر حفظ الاستبيان. حاول مرة أخرى.');
    } finally {
      this.saving = false;
    }
  }

  /**
   * Saves the first-stage counts once before displaying any comparison.
   * 1. Require a valid quantity for every product.
   * 2. Confirm that the branch understands the counts cannot be changed.
   * 3. Persist and lock the counts before enabling the explanations stage.
   */
  async lockInventoryCounts(): Promise<void> {
    // STEP 1: The first stage cannot be saved with a missing or negative count.
    if (!this.active || this.active.kind !== 'inventory' || this.inventoryCountsLocked || this.saving ||
        !this.inventoryReferenceDate || !this.inventoryRows.length) return;
    const inventoryAnswers: Record<string, InventorySurveyAnswer> = {};
    for (const product of this.inventoryRows) {
      const raw = this.form.get([product.id, 'actualQuantity'])?.value;
      const actual = raw === null || raw === '' ? NaN : Number(raw);
      if (!Number.isFinite(actual) || actual < 0) {
        this.showError(`أدخل الكمية الموجودة للصنف «${product.name}».`);
        return;
      }
      inventoryAnswers[product.id] = {
        productName: product.name, expectedQuantity: product.expectedQuantity,
        actualQuantity: actual, difference: actual - product.expectedQuantity,
        reason: '', referenceDate: this.inventoryReferenceDate
      };
    }
    // STEP 2: Make the irreversible transition explicit before writing the draft.
    if (!window.confirm('بعد حفظ الكميات لن تتمكن من تعديلها. هل راجعت جميع الأصناف وتريد المتابعة؟')) return;
    // STEP 3: The service rejects a concurrent save if another tab locked this response.
    this.saving = true;
    this.error = '';
    this.success = '';
    try {
      const user = await this.auth.getCurrentUser();
      await this.service.saveInventoryCounts(this.branchId, this.active, this.activeOccurrenceDate,
        inventoryAnswers, user?.uid ?? '');
      this.inventoryCountsLocked = true;
      for (const product of this.inventoryRows) {
        this.form.get([product.id, 'actualQuantity'])?.disable({ emitEvent: false });
        this.form.get([product.id, 'reason'])?.setValue('', { emitEvent: false });
      }
      this.success = 'حُفظت الكميات وثُبّتت. أكمل أسباب الفروقات لإرسال الاستبيان.';
    } catch (error) {
      console.error('Unable to lock inventory counts:', error);
      this.showError(error instanceof Error ? error.message : 'تعذر حفظ الكميات. حاول مرة أخرى.');
    } finally {
      this.saving = false;
    }
  }

  /**
   * Saves explanations for a fixed product count or submits the survey.
   * 1. Read locked counts and validate conditional reasons for submission.
   * 2. Save reasons as a draft or submit with the existing atomic surplus adjustment.
   * 3. Continue to the next required survey after submission.
   */
  private async saveInventory(submitted: boolean): Promise<void> {
    // STEP 1: Counts must already be locked; changed baselines need administrator review.
    if (!this.active || !this.inventoryCountsLocked || !this.inventoryReferenceDate || !this.inventoryRows.length) return;
    if (submitted && this.inventoryBaselineChanged) {
      this.showError('تغير رصيد الجرد بعد حفظ الكميات. تواصل مع الإدارة لمراجعة الاستبيان.');
      return;
    }
    this.error = '';
    const inventoryAnswers: Record<string, InventorySurveyAnswer> = {};
    for (const product of this.inventoryRows) {
      const value = this.form.get(product.id)?.getRawValue();
      const actual = value?.actualQuantity === null || value?.actualQuantity === '' ? null : Number(value.actualQuantity);
      const difference = actual === null ? null : actual - product.expectedQuantity;
      const reason = difference === 0 ? '' : String(value?.reason ?? '').trim();
      if (submitted && (actual === null || !Number.isFinite(actual) || actual < 0 || (difference !== 0 && !reason))) {
        this.showError(`أكمل العدد الفعلي وسبب الفارق للصنف «${product.name}».`);
        return;
      }
      inventoryAnswers[product.id] = {
        productName: product.name, expectedQuantity: product.expectedQuantity,
        actualQuantity: actual, difference, reason, referenceDate: this.inventoryReferenceDate
      };
    }
    // STEP 2: Keep the same occurrence and response ID as document surveys.
    this.saving = true;
    try {
      // NOTE: The service rechecks the named occurrence, including an administrator grant.
      const user = await this.auth.getCurrentUser();
      if (submitted) {
        await this.service.submitInventoryResponse(this.branchId, this.active, this.activeOccurrenceDate, inventoryAnswers, user?.uid ?? '');
      } else {
        await this.service.saveInventoryReasons(this.branchId, this.active, this.activeOccurrenceDate,
          Object.fromEntries(Object.entries(inventoryAnswers).map(([id, answer]) => [id, answer.reason])));
      }
      this.success = submitted ? 'تم إرسال جرد الأصناف بنجاح.' : 'تم حفظ المسودة.';
      // STEP 3: Advance only after the response was submitted successfully.
      if (submitted) {
        this.requiredSurveys = this.requiredSurveys.filter(item => item.survey.id !== this.active?.id || item.occurrenceDate !== this.activeOccurrenceDate);
        if (this.requiredSurveys.length) await this.open(this.requiredSurveys[0]);
        else await this.navigateAfterCompletion();
      }
    } catch (error) {
      console.error('Unable to save inventory survey:', error);
      if (error instanceof Error && error.message.startsWith('تم تقييد حسابك')) await this.loadSurveys();
      else this.showError(error instanceof Error ? error.message : 'تعذر حفظ جرد الأصناف. تحقق من الاتصال ثم حاول مرة أخرى.');
    } finally {
      this.saving = false;
    }
  }

  /** Points to the first missing question, including a worker row where possible. */
  private getValidationError(): string {
    for (const question of this.active?.questions ?? []) {
      const group = this.form.get(question.id);
      if (!group?.invalid) continue;

      if (this.isHealthDocumentsQuestion(question)) {
        const workers = this.workersFor(question.id);
        if (!workers.length) return `أضف عاملًا واحدًا على الأقل في «${question.label}».`;
        const invalidIndex = workers.controls.findIndex(worker => worker.invalid);
        if (invalidIndex !== -1) {
          if (workers.at(invalidIndex).hasError('invalidExpiryDate')) {
            return `صحح تاريخ انتهاء العامل ${invalidIndex + 1} في «${question.label}» بصيغة سنة-شهر-يوم.`;
          }
          return `أكمل بيانات العامل ${invalidIndex + 1} في «${question.label}» قبل الإرسال.`;
        }
      }
      if (group.hasError('invalidExpiryDate')) {
        return `صحح تاريخ الانتهاء في «${question.label}» بصيغة سنة-شهر-يوم.`;
      }
      return `أكمل السؤال «${question.label}» قبل إرسال الاستبيان.`;
    }
    return 'أكمل جميع الحقول المطلوبة قبل إرسال الاستبيان.';
  }

  private showError(message: string): void {
    this.previousFocus = typeof document === 'undefined'
      ? null
      : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.error = message;
    setTimeout(() => this.errorCloseButton?.nativeElement.focus(), 0);
  }

  private watchExpiredDates(): void {
    this.refreshExpiredDates();
    this.formChanges = this.form.valueChanges.subscribe(() => {
      const hadExpiredDates = this.expiredDates.length > 0;
      this.refreshExpiredDates();
      if (!hadExpiredDates && this.expiredDates.length > 0) this.showExpiryNotice();
    });
    if (this.expiredDates.length) this.showExpiryNotice();
  }

  private refreshExpiredDates(): void {
    if (!this.active || !this.form) {
      this.expiredDates = [];
      return;
    }
    this.expiredDates = findExpiredSurveyDocuments(
      this.active, this.form.getRawValue() as SurveyAnswers
    ).map(document => `${document.label} (${document.expiryDate}${document.calendar === 'hijri' ? ' هجري' : ''})`);

    const answers = this.form.getRawValue() as SurveyAnswers;
    this.missingDocuments = [];
    this.invalidDates = [];
    for (const question of this.active.questions) {
      const answer = answers[question.id] as any;
      if (!answer) continue;
      if (this.isHealthDocumentsQuestion(question) && Array.isArray(answer.workers)) {
        answer.workers.forEach((worker: any, index: number) => {
          const workerName = worker.fullName?.trim() || `العامل ${index + 1}`;
          if (this.workersFor(question.id).at(index)?.hasError('invalidExpiryDate')) {
            this.invalidDates.push(`${workerName} — ${question.label}`);
          }
          if (worker.healthCertificateStatus === 'missing') {
            this.missingDocuments.push(`${workerName} — لا توجد لديه شهادة صحية`);
          }
          if (worker.educationCertificateStatus === 'missing') {
            this.missingDocuments.push(`${workerName} — شهادة التثقيف غير موجودة`);
          }
        });
      } else if (question.type === 'document' && answer.status === 'missing') {
        this.missingDocuments.push(`${question.label} — الوثيقة غير موجودة`);
      } else if (question.type === 'yes_no' && answer.value === 'no') {
        this.missingDocuments.push(`${question.label} — غير متوفر`);
      }
      if (question.type === 'document' && this.form.get(question.id)?.hasError('invalidExpiryDate')) {
        this.invalidDates.push(question.label);
      }
    }
  }

  private showExpiryNotice(): void {
    this.previousFocus = typeof document === 'undefined'
      ? null
      : document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.expiryNotice = 'يمكنك حفظ الاستبيان، لكن يرجى تحديث الوثائق والتواصل مع إدارة التشغيل.';
    setTimeout(() => this.expiryCloseButton?.nativeElement.focus(), 0);
  }

  private createWorkerGroup(worker?: Partial<HealthDocumentWorker>): FormGroup {
    const group = this.fb.group({
      id: [worker?.id || this.createWorkerId()],
      fullName: [worker?.fullName ?? '', Validators.required],
      employeeNumber: [worker?.employeeNumber ?? '', Validators.required],
      hasBranchFingerprint: [worker?.hasBranchFingerprint ?? '', Validators.required],
      identityNumber: [worker?.identityNumber ?? '', Validators.required],
      phoneNumber: [worker?.phoneNumber ?? '', Validators.required],
      healthCertificateStatus: [worker?.healthCertificateStatus ?? 'available'],
      healthCertificateExpiryDateCalendar: [worker?.healthCertificateExpiryDateCalendar ?? 'gregorian'],
      healthCertificateExpiryDate: [worker?.healthCertificateExpiryDate ?? ''],
      educationCertificateStatus: [worker?.educationCertificateStatus ?? 'available'],
      educationExpiryDateCalendar: [worker?.educationExpiryDateCalendar ?? 'gregorian'],
      educationExpiryDate: [worker?.educationExpiryDate ?? '']
    }, { validators: [
      this.expiryDateValidator('healthCertificateExpiryDate', 'healthCertificateExpiryDateCalendar'),
      this.expiryDateValidator('educationExpiryDate', 'educationExpiryDateCalendar')
    ] });
    this.configureWorkerCertificateStatus(group, 'healthCertificateStatus', 'healthCertificateExpiryDate');
    this.configureWorkerCertificateStatus(group, 'educationCertificateStatus', 'educationExpiryDate');
    return group;
  }

  setDocumentStatus(questionId: string, status: 'available' | 'missing'): void {
    const group = this.form.get(questionId) as FormGroup | null;
    if (!group) return;
    group.get('status')?.setValue(status);
    this.configureDocumentStatus(group, !!this.active?.questions.find(question => question.id === questionId)?.required);
    if (status === 'missing') {
      group.patchValue({ documentNumber: '', expiryDate: '' });
    }
    group.updateValueAndValidity();
  }

  setWorkerCertificateStatus(
    worker: FormGroup,
    statusField: 'healthCertificateStatus' | 'educationCertificateStatus',
    dateField: 'healthCertificateExpiryDate' | 'educationExpiryDate',
    status: 'available' | 'missing'
  ): void {
    worker.get(statusField)?.setValue(status);
    const date = worker.get(dateField);
    if (status === 'missing') date?.reset('');
    date?.setValidators(status === 'available' ? Validators.required : []);
    date?.updateValueAndValidity({ emitEvent: false });
    worker.updateValueAndValidity();
    this.refreshExpiredDates();
  }

  private configureDocumentStatus(group: FormGroup, required: boolean): void {
    const missing = group.get('status')?.value === 'missing';
    const validators = required && !missing ? [Validators.required] : [];
    group.get('documentNumber')?.setValidators(validators);
    group.get('expiryDate')?.setValidators(validators);
    group.get('documentNumber')?.updateValueAndValidity({ emitEvent: false });
    group.get('expiryDate')?.updateValueAndValidity({ emitEvent: false });
  }

  private configureWorkerCertificateStatus(
    group: FormGroup,
    statusField: 'healthCertificateStatus' | 'educationCertificateStatus',
    dateField: 'healthCertificateExpiryDate' | 'educationExpiryDate'
  ): void {
    const available = group.get(statusField)?.value !== 'missing';
    group.get(dateField)?.setValidators(available ? Validators.required : []);
    group.get(dateField)?.updateValueAndValidity({ emitEvent: false });
  }

  /** Preserve the chosen calendar; validate the typed date without converting it. */
  private expiryDateValidator(dateField: string, calendarField: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const value = group.get(dateField)?.value;
      if (!value) return null; // Required fields are checked separately.
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return { invalidExpiryDate: true };
      const [year, month, day] = match.slice(1).map(Number);
      if (month < 1 || month > 12 || day < 1) return { invalidExpiryDate: true };
      if (group.get(calendarField)?.value === 'hijri') {
        return day <= 30 ? null : { invalidExpiryDate: true };
      }
      const gregorian = new Date(Date.UTC(year, month - 1, day));
      return gregorian.getUTCFullYear() === year && gregorian.getUTCMonth() + 1 === month &&
        gregorian.getUTCDate() === day ? null : { invalidExpiryDate: true };
    };
  }

  private createWorkerId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `worker_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  /** Copies only answers belonging to questions in the current survey version. */
  private applyAnswers(answers: SurveyAnswers): void {
    for (const question of this.active?.questions ?? []) {
      const answer = answers[question.id];
      if (!answer) continue;

      if (this.isHealthDocumentsQuestion(question)) {
        const workers = (answer as HealthDocumentsAnswer).workers;
        if (!Array.isArray(workers)) continue;
        for (const worker of workers) this.addWorker(question.id, worker);
      } else {
        this.form.get(question.id)?.patchValue(answer);
      }
    }
  }

  private applyConditionalReasonValidation(): void {
    for (const question of this.active?.questions ?? []) {
      if (question.type !== 'yes_no') continue;
      const group = this.form.get(question.id);
      const reason = group?.get('reason');
      const required = group?.get('value')?.value === question.reasonRequiredWhen;
      reason?.setValidators(required ? Validators.required : []);
      reason?.updateValueAndValidity();
    }
  }

  navigateAfterCompletion(): Promise<boolean> {
    return this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/branch');
  }
}
