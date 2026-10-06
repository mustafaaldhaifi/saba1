import { inject, isDevMode } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isBrowser) return true;
  try {
    return await auth.getCurrentUser() ? true : router.createUrlTree(['/login']);
  } catch { return router.createUrlTree(['/login']); }
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isBrowser) return true;
  try {
    const user = await auth.getCurrentUser();
    if (!user) return router.createUrlTree(['/login']);
    return auth.isAdmin(user) ? true : router.createUrlTree(['/branch']);
  } catch { return router.createUrlTree(['/login']); }
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isBrowser) return true;
  try {
    const user = await auth.getCurrentUser();
    return user ? router.createUrlTree([auth.homeRoute(user)]) : true;
  } catch { return true; }
};

/** Documentation is open locally and admin-only in production. */
export const documentationGuard: CanActivateFn = (route, state) =>
  isDevMode() ? true : adminGuard(route, state);
