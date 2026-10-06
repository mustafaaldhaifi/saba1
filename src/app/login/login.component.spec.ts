import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { LoginAccountsService } from '../core/auth/login-accounts.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let auth: { isBrowser: boolean; getRememberedAccount: jasmine.Spy; login: jasmine.Spy; homeRoute: jasmine.Spy };
  let accounts: { getAccountNames: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  beforeEach(() => {
    auth = { isBrowser: true, getRememberedAccount: jasmine.createSpy().and.returnValue('Admin'),
      login: jasmine.createSpy(), homeRoute: jasmine.createSpy().and.returnValue('/dashboard') };
    accounts = { getAccountNames: jasmine.createSpy().and.resolveTo(['Admin', 'Branch']) };
    router = { navigate: jasmine.createSpy().and.resolveTo(true) };
    TestBed.configureTestingModule({ providers: [LoginComponent,
      { provide: AuthService, useValue: auth }, { provide: LoginAccountsService, useValue: accounts },
      { provide: Router, useValue: router }] });
    component = TestBed.inject(LoginComponent);
  });
  it('loads accounts once and never restores a password', async () => {
    await component.ngOnInit();
    expect(accounts.getAccountNames).toHaveBeenCalledTimes(1);
    expect(component.password).toBe('');
    expect(component.selectedOption).toBe('Admin');
  });
  it('prevents duplicate submissions and clears password after success', async () => {
    await component.ngOnInit();
    component.password = 'test-password';
    let resolve!: (user: object) => void;
    auth.login.and.returnValue(new Promise(done => { resolve = done; }));
    const first = component.login();
    await component.login();
    expect(auth.login).toHaveBeenCalledTimes(1);
    resolve({ uid: 'admin' });
    await first;
    expect(component.password).toBe('');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
  it('allows retry after a failed accounts request', async () => {
    accounts.getAccountNames.and.rejectWith(new Error('offline'));
    await component.ngOnInit();
    expect(component.accountsError).toBeTruthy();
    expect(component.isLoading).toBeFalse();
    accounts.getAccountNames.and.resolveTo(['Admin']);
    await component.loadAccounts();
    expect(component.accountsError).toBe('');
  });
});
