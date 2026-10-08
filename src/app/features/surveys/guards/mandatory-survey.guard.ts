import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SurveyService } from '../services/survey.service';

/**
 * Requires branch accounts to complete the current mandatory surveys.
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
    const requiredSurveys = await surveys.getIncompleteRequiredSurveys(branchId);

    return requiredSurveys.length
      ? router.createUrlTree(['/branch/surveys'], { queryParams: { returnUrl: state.url } })
      : true;
  } catch {
    return router.createUrlTree(['/branch/surveys'], {
      queryParams: { error: 'verification' }
    });
  }
};

/** Prevents an administrator from opening a stale or bookmarked survey URL. */
export const branchSurveyAccessGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  try {
    const user = await auth.getCurrentUser();
    if (!user) return router.createUrlTree(['/login']);
    return auth.isAdmin(user) ? router.createUrlTree(['/branch']) : true;
  } catch {
    return router.createUrlTree(['/login']);
  }
};
