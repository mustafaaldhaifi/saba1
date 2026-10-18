import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  HealthDocumentWorker,
  HealthDocumentsAnswer,
  RequiredSurvey,
  Survey,
  SurveyAnswers,
  SurveyQuestion
} from '../../models/survey.models';
import { SurveyService } from '../../services/survey.service';
import { latestDueDate, resolveSurveySchedule } from '../../services/survey-period';
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
  loading = true;
  saving = false;
  error = '';
  expiryNotice = '';
  success = '';
  expiredDates: string[] = [];
  missingDocuments: string[] = [];
  showLicenseQrNotice = false;
  form!: FormGroup;
  private previousFocus: HTMLElement | null = null;
  private formChanges?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: SurveyService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadSurveys();
  }

  ngOnDestroy(): void {
    this.formChanges?.unsubscribe();
  }

  /** Reloads the pending survey list after a temporary read failure. */
  async loadSurveys(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) throw new Error('Unauthenticated user');
      if (this.auth.isAdmin(user)) {
        await this.router.navigateByUrl('/branch');
        return;
      }

      this.branchId = await this.service.getBranchId((user.email ?? '').split('@')[0]);
      this.requiredSurveys = await this.service.getIncompleteRequiredSurveys(this.branchId);
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
    this.active = item.survey;
    this.activeOccurrenceDate = item.occurrenceDate;
    this.copiedFromDate = null;
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

  async save(submitted: boolean): Promise<void> {
    if (!this.active || !this.activeOccurrenceDate || this.saving) return;
    this.error = '';
    this.success = '';
    this.refreshExpiredDates();
    if (submitted) this.applyConditionalReasonValidation();
    if (submitted && this.form.invalid) {
      this.form.markAllAsTouched();
      this.showError(this.getValidationError());
      return;
    }

    this.saving = true;
    try {
      // Do not submit a stale form after the next scheduled occurrence begins.
      if (latestDueDate(resolveSurveySchedule(this.active)) !== this.activeOccurrenceDate) {
        await this.loadSurveys();
        return;
      }
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
      if (submitted) {
        this.requiredSurveys = this.requiredSurveys.filter(item =>
          item.survey.id !== this.active?.id || item.occurrenceDate !== this.activeOccurrenceDate
        );
        if (!this.requiredSurveys.length) await this.navigateAfterCompletion();
        else await this.open(this.requiredSurveys[0]);
      }
    } catch (error) {
      console.error('Unable to save survey response:', error);
      this.showError('تعذر حفظ الاستبيان. تحقق من الاتصال والصلاحيات ثم حاول مرة أخرى.');
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
    for (const question of this.active.questions) {
      const answer = answers[question.id] as any;
      if (!answer) continue;
      if (this.isHealthDocumentsQuestion(question) && Array.isArray(answer.workers)) {
        answer.workers.forEach((worker: any, index: number) => {
          const workerName = worker.fullName?.trim() || `العامل ${index + 1}`;
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

  private navigateAfterCompletion(): Promise<boolean> {
    return this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') || '/branch');
  }
}
