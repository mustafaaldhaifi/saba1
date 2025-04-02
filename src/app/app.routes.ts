import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { AppComponent } from './app.component';
import { BranchComponent } from './branch/branch.component';

export const routes: Routes = [
    { path: '', component: AppComponent },

    { path: 'dashboard', component: DashboardComponent },
    { path: 'branch', component: BranchComponent },

    { path: 'login', component: LoginComponent },
];
