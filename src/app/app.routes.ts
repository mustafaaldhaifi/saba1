import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoginComponent } from './login/login.component';
import { AppComponent } from './app.component';

export const routes: Routes = [
    { path: '', component: AppComponent },

    { path: 'dashboard', component: DashboardComponent },
    { path: 'login', component: LoginComponent },
];
