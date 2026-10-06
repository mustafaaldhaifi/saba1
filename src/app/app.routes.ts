import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { BranchComponent } from './branch/branch.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { adminGuard, authGuard, documentationGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] },
  { path: 'branch', component: BranchComponent, canActivate: [authGuard] },
  {
    path: 'documentation', canActivate: [documentationGuard],
    loadComponent: () => import('./documentation/documentation.component')
      .then(module => module.DocumentationComponent)
  },
  { path: '**', redirectTo: 'login' }
];
