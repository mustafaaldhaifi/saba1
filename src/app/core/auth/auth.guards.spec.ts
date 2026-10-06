import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { adminGuard, authGuard, guestGuard } from './auth.guards';
import { LEGACY_ADMIN_UID } from './auth-policy';

describe('Authentication guards', () => {
  let auth: { isBrowser: boolean; getCurrentUser: jasmine.Spy; isAdmin: jasmine.Spy; homeRoute: jasmine.Spy };
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/dashboard' } as RouterStateSnapshot;
  beforeEach(() => {
    auth = {
      isBrowser: true, getCurrentUser: jasmine.createSpy().and.resolveTo(null),
      isAdmin: jasmine.createSpy().and.callFake(user => user?.uid === LEGACY_ADMIN_UID),
      homeRoute: jasmine.createSpy().and.returnValue('/branch')
    };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
  });
  it('waits for restoration before allowing a protected route', async () => {
    let resolve!: (user: object) => void;
    auth.getCurrentUser.and.returnValue(new Promise(done => { resolve = done; }));
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    resolve({ uid: 'branch-user' });
    expect(await result).toBeTrue();
  });
  it('redirects anonymous users to login', async () => {
    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/login');
  });
  it('prevents branch users from opening dashboard', async () => {
    auth.getCurrentUser.and.resolveTo({ uid: 'branch-user' });
    const result = await TestBed.runInInjectionContext(() => adminGuard(route, state));
    expect(TestBed.inject(Router).serializeUrl(result as ReturnType<Router['createUrlTree']>)).toBe('/branch');
  });
  it('allows the admin', async () => {
    auth.getCurrentUser.and.resolveTo({ uid: LEGACY_ADMIN_UID });
    expect(await TestBed.runInInjectionContext(() => adminGuard(route, state))).toBeTrue();
  });
  it('keeps the login form accessible when restoring auth fails', async () => {
    auth.getCurrentUser.and.rejectWith(new Error('network'));
    expect(await TestBed.runInInjectionContext(() => guestGuard(route, state))).toBeTrue();
  });
});
