import { homeRouteFor, isAdminUser, LEGACY_ADMIN_UID } from './auth-policy';
import { authErrorMessage } from './auth-errors';

describe('Authentication policy', () => {
  it('routes legacy admin to dashboard and branch accounts to branch', () => {
    expect(homeRouteFor({ uid: LEGACY_ADMIN_UID })).toBe('/dashboard');
    expect(homeRouteFor({ uid: 'branch-user' })).toBe('/branch');
    expect(isAdminUser(null)).toBeFalse();
  });
  it('does not disclose account existence through login errors', () => {
    expect(authErrorMessage({ code: 'auth/user-not-found' }))
      .toBe(authErrorMessage({ code: 'auth/wrong-password' }));
    expect(authErrorMessage(null)).toContain('تعذر');
  });
});
