import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { AdminBranchViewService } from '../../../branches/data/admin-branch-view.service';
import { RequiredSurvey, Survey, SurveyAnswers } from '../../models/survey.models';
import { SurveyService } from '../../services/survey.service';
import { BranchSurveysComponent } from './branch-surveys.component';

describe('branch document survey restoration', () => {
  it('submits copied missing documents without changing their status', async () => {
    const survey: Survey = {
      id: 'documents', title: 'الوثائق', status: 'active', kind: 'documents', version: 1,
      targetBranchIds: ['branch'], excludedBranchIds: [],
      schedule: { type: 'daily', startDate: '2026-11-01', timezone: 'Asia/Riyadh', missedPolicy: 'latest_only' },
      questions: [
        { id: 'license', label: 'رخصة الفرع', type: 'document', required: true },
        { id: 'workers', label: 'وثائق العاملين', type: 'health_documents', required: true },
      ],
    };
    const answers: SurveyAnswers = {
      license: { status: 'missing', documentNumber: 'old number', expiryDate: 'invalid old date' },
      workers: { workers: [{
        id: 'worker-1', fullName: 'اسم العامل', employeeNumber: '123', hasBranchFingerprint: 'yes',
        identityNumber: '456', phoneNumber: '789', healthCertificateStatus: 'missing',
        healthCertificateExpiryDate: 'invalid old date', educationCertificateStatus: 'missing',
        educationExpiryDate: 'invalid old date',
      }] },
    };
    const save = jasmine.createSpy('save').and.resolveTo();
    const service = {
      getResponse: async () => null,
      getPreviousSubmittedResponse: async () => ({ answers, occurrenceDate: '2026-11-23' }),
      save,
    } as unknown as SurveyService;
    const auth = { getCurrentUser: async () => ({ uid: 'user-1' }) } as unknown as AuthService;
    const router = { navigateByUrl: async () => true } as unknown as Router;
    const route = { snapshot: { queryParamMap: { get: () => null } } } as unknown as ActivatedRoute;
    const component = new BranchSurveysComponent(new FormBuilder(), service, auth,
      {} as AdminBranchViewService, router, route);
    component.branchId = 'branch';
    component.requiredSurveys = [{ survey, occurrenceDate: '2026-11-24' } as RequiredSurvey];

    await component.open(component.requiredSurveys[0]);
    expect(component.form.valid).toBeTrue();
    expect(component.form.get('license.status')?.value).toBe('missing');
    expect(component.form.get('license.expiryDate')?.value).toBe('');
    expect(component.workersFor('workers').at(0).get('healthCertificateExpiryDate')?.value).toBe('');

    await component.save(true);
    expect(save).toHaveBeenCalled();
    expect(component.error).toBe('');
    component.ngOnDestroy();
  });
});
