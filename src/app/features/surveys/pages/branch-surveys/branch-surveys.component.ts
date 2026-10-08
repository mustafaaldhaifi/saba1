import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { Survey, SurveyAnswers } from '../../models/survey.models';
import { SurveyService } from '../../services/survey.service';

@Component({
  selector: 'app-branch-surveys',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './branch-surveys.component.html',
  styleUrl: './branch-surveys.component.css'
})
export class BranchSurveysComponent implements OnInit {
  surveys: Survey[] = [];
  active?: Survey;
  branchId = '';
  loading = true;
  saving = false;
  error = '';
  success = '';
  showLicenseQrNotice = false;
  form!: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: SurveyService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.auth.getCurrentUser();
      if (!user) throw new Error('Unauthenticated user');
      // Defensive fallback if this component was already mounted from a stale URL.
      if (this.auth.isAdmin(user)) {
        await this.router.navigateByUrl('/branch');
        return;
      }
      this.branchId = await this.service.getBranchId((user.email ?? '').split('@')[0]);
      this.surveys = await this.service.getIncompleteRequiredSurveys(this.branchId);
      if (!this.surveys.length) {
        await this.navigateAfterCompletion();
        return;
      }
      await this.open(this.surveys[0]);
    } catch (error) {
      console.error('Unable to load required surveys:', error);
      this.error = 'تعذر التحقق من الاستبيانات المطلوبة، حاول مرة أخرى.';
    } finally {
      this.loading = false;
    }
  }

  async open(survey?: Survey): Promise<void> {
    if (!survey) return;
    this.active = survey;
    this.showLicenseQrNotice = survey.questions.some(question => question.type === 'document');
    const controls: Record<string, FormGroup> = {};
    for (const question of survey.questions) {
      if (question.type === 'document') {
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
    const response = await this.service.getResponse(survey.id, this.branchId);
    if (response?.answers) this.form.patchValue(response.answers);
  }

  async save(submitted: boolean): Promise<void> {
    if (!this.active || this.saving) return;
    this.error = '';
    this.success = '';
    if (submitted) this.applyConditionalReasonValidation();
    if (submitted && this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'أكمل جميع الحقول المطلوبة قبل إرسال الاستبيان.';
      return;
    }
    this.saving = true;
    try {
      const user = await this.auth.getCurrentUser();
      await this.service.save(
        this.branchId,
        this.active,
        this.form.getRawValue() as SurveyAnswers,
        submitted,
        user?.uid ?? ''
      );
      this.success = submitted ? 'تم إرسال الاستبيان بنجاح.' : 'تم حفظ المسودة.';
      if (submitted) {
        this.surveys = this.surveys.filter(item => item.id !== this.active?.id);
        if (!this.surveys.length) await this.navigateAfterCompletion();
        else await this.open(this.surveys[0]);
      }
    } catch (error) {
      console.error('Unable to save survey response:', error);
      this.error = 'تعذر حفظ الاستبيان، تحقق من الاتصال والصلاحيات ثم حاول مرة أخرى.';
    } finally {
      this.saving = false;
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
