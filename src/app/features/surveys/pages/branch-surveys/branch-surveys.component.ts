import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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

@Component({
  selector: 'app-branch-surveys',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './branch-surveys.component.html',
  styleUrl: './branch-surveys.component.css'
})
export class BranchSurveysComponent implements OnInit {
  @ViewChild('errorCloseButton') private errorCloseButton?: ElementRef<HTMLButtonElement>;

  requiredSurveys: RequiredSurvey[] = [];
  active?: Survey;
  activeOccurrenceDate = '';
  copiedFromDate: string | null = null;
  branchId = '';
  loading = true;
  saving = false;
  error = '';
  success = '';
  showLicenseQrNotice = false;
  form!: FormGroup;
  private previousFocus: HTMLElement | null = null;

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
  }

  dismissError(): void {
    this.error = '';
    this.previousFocus?.focus();
    this.previousFocus = null;
  }

  /** Legacy document questions named health documents use the new worker form. */
  isHealthDocumentsQuestion(question: SurveyQuestion): boolean {
    return question.type === 'health_documents' ||
      (question.type === 'document' && (
        /وثائق?.*صح|صح.*وثائق?/u.test(question.label) ||
        /health[_-]?documents?/i.test(question.id)
      ));
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
          documentNumber: ['', question.required ? Validators.required : []],
          expiryDate: ['', question.required ? Validators.required : []]
        });
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
  }

  async save(submitted: boolean): Promise<void> {
    if (!this.active || !this.activeOccurrenceDate || this.saving) return;
    this.error = '';
    this.success = '';
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
          return `أكمل بيانات العامل ${invalidIndex + 1} في «${question.label}» قبل الإرسال.`;
        }
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

  private createWorkerGroup(worker?: Partial<HealthDocumentWorker>): FormGroup {
    return this.fb.group({
      id: [worker?.id || this.createWorkerId()],
      fullName: [worker?.fullName ?? '', Validators.required],
      identityNumber: [worker?.identityNumber ?? '', Validators.required],
      phoneNumber: [worker?.phoneNumber ?? '', Validators.required],
      healthCertificateExpiryDate: [worker?.healthCertificateExpiryDate ?? '', Validators.required],
      educationExpiryDate: [worker?.educationExpiryDate ?? '', Validators.required]
    });
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
