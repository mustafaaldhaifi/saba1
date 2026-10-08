import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { BranchComponent } from './branch/branch.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { adminGuard, authGuard, documentationGuard, guestGuard } from './core/auth/auth.guards';
import { mandatorySurveyGuard } from './features/surveys/guards/mandatory-survey.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [adminGuard] },
  { path: 'branch/surveys', loadComponent: () => import('./features/surveys/pages/branch-surveys/branch-surveys.component').then(m => m.BranchSurveysComponent), canActivate: [authGuard] },
  { path: 'branch', component: BranchComponent, canActivate: [authGuard, mandatorySurveyGuard] },
  {
    path: 'documentation', canActivate: [documentationGuard],
    loadComponent: () => import('./documentation/documentation.component')
      .then(module => module.DocumentationComponent)
  },
  { path: '**', redirectTo: 'login' }
];
