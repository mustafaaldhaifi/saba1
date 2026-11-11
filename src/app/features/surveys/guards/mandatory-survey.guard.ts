import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AdminBranchViewService } from '../../branches/data/admin-branch-view.service';
import { SurveyService } from '../services/survey.service';

/**
 * Requires branch accounts to complete due surveys and honors missed-day restrictions.
 * Administrators opening a selected branch from the dashboard bypass surveys.
 */
export const mandatorySurveyGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const surveys = inject(SurveyService);

  try {
    const user = await auth.getCurrentUser();
    if (!user) return router.createUrlTree(['/login']);

    // The admin is inspecting a branch, not signing in as that branch account.
    if (auth.isAdmin(user)) return true;

    const account = (user.email ?? '').split('@')[0];
    const branchId = await surveys.getBranchId(account);
    const access = await surveys.getBranchSurveyState(branchId);

    return access.blocked || access.required.length
      ? router.createUrlTree(['/branch/surveys'], { queryParams: { returnUrl: state.url } })
      : true;
  } catch {
    return router.createUrlTree(['/branch/surveys'], {
      queryParams: { error: 'verification' }
    });
  }
};

/**
 * Allows survey access for a branch account or an administrator viewing a selected branch.
 * 1. Require a signed-in account.
 * 2. Let administrators through only while the selected branch is in branch mode.
 */
export const branchSurveyAccessGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const adminBranchView = inject(AdminBranchViewService);

  try {
    // STEP 1: Keep the existing authenticated route boundary.
    const user = await auth.getCurrentUser();
    if (!user) return router.createUrlTree(['/login']);
    // STEP 2: A selected branch can be inspected without changing account identity.
    return auth.isAdmin(user) && (!adminBranchView.branchId || adminBranchView.adminMode)
      ? router.createUrlTree(['/branch']) : true;
  } catch {
    return router.createUrlTree(['/login']);
  }
};
