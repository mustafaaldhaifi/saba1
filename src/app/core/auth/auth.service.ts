import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth, browserLocalPersistence, browserSessionPersistence, getAuth,
  onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut, User
} from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { FirebaseAppService } from '../firebase/firebase-app.service';
import { ACCOUNT_EMAIL_DOMAIN, homeRouteFor, isAdminUser } from './auth-policy';

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private readonly state = new BehaviorSubject<User | null | undefined>(undefined);
  readonly user$ = this.state.asObservable();
  readonly isBrowser: boolean;
  private readonly auth: Auth | null;
  private readonly ready: Promise<void>;
  private signingOut = false;
  private unsubscribe: (() => void) | undefined;

  constructor(
    firebase: FirebaseAppService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.auth = this.isBrowser ? getAuth(firebase.app) : null;
    this.removeLegacyPassword();
    if (!this.auth) {
      this.state.next(null);
      this.ready = Promise.resolve();
      return;
    }
    this.ready = new Promise<void>((resolve, reject) => {
      this.unsubscribe = onAuthStateChanged(this.auth!, user => {
        const previousUser = this.state.value;
        this.state.next(user);
        resolve();
        if (previousUser && user && previousUser.uid !== user.uid) {
          this.clearSessionCache();
          void this.router.navigate([this.homeRoute(user)]).then(() => window.location.reload());
        }
        // Includes logout in another tab; initial restoration must not redirect.
        if (previousUser && !user && !this.signingOut) {
          this.clearSessionCache();
          void this.router.navigate(['/login']).then(() => window.location.reload());
        }
      }, error => {
        this.state.next(null);
        reject(error);
      });
    });
    // Avoid an unhandled rejection if no consumer has requested the session yet.
    void this.ready.catch(() => undefined);
  }

  async getCurrentUser(): Promise<User | null> {
    await this.ready;
    return this.auth?.currentUser ?? null;
  }

  isAdmin(user: User | null): boolean { return isAdminUser(user); }
  homeRoute(user: User): '/dashboard' | '/branch' { return homeRouteFor(user); }

  async login(accountName: string, password: string, rememberMe = true): Promise<User> {
    if (!this.auth) throw new Error('Authentication requires a browser.');
    await this.ready;
    const name = accountName.trim();
    if (!name || !password) throw new Error('Account and password are required.');
    await setPersistence(this.auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(
      this.auth, `${name}@${ACCOUNT_EMAIL_DOMAIN}`, password
    );
    this.state.next(credential.user);
    this.writeRememberedAccount(name);
    return credential.user;
  }

  async logout(): Promise<void> {
    if (!this.auth) return;
    await this.ready;
    this.signingOut = true;
    try {
      await signOut(this.auth);
      this.state.next(null);
      this.clearSessionCache();
      await this.router.navigate(['/login']);
      // Legacy data services retain caches in memory until a full reload.
      window.location.reload();
    } finally { this.signingOut = false; }
  }

  getRememberedAccount(): string {
    if (!this.isBrowser) return '';
    try { return localStorage.getItem('usr') ?? ''; } catch { return ''; }
  }

  private writeRememberedAccount(name: string): void {
    try { localStorage.setItem('usr', name); } catch { /* Login can work without account storage. */ }
  }

  private removeLegacyPassword(): void {
    if (!this.isBrowser) return;
    try { localStorage.removeItem('pass'); } catch { /* Storage may be blocked. */ }
  }

  private clearSessionCache(): void {
    if (!this.isBrowser) return;
    // Preserve the account name only; cached business data must not cross accounts.
    for (const key of [
      'pass', 'selectedBranch', 'products', 'branches', 'orders', 'dailyCache',
      'dailyReport', 'dailyReportDashboard', 'exported', 'exportedDailyDates', 'exportedDailyDatesNotes'
    ]) {
      try { localStorage.removeItem(key); } catch { /* Continue clearing remaining keys. */ }
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
    this.state.complete();
  }
}
