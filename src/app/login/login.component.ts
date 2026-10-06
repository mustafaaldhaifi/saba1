import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { LoginAccountsService } from '../core/auth/login-accounts.service';
import { authErrorMessage } from '../core/auth/auth-errors';

@Component({
  selector: 'app-login', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html', styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  selectedOption = '';
  options: string[] = [];
  password = '';
  rememberMe = true;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  accountsError = '';

  constructor(
    private readonly auth: AuthService,
    private readonly accounts: LoginAccountsService,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.auth.isBrowser) return;
    this.selectedOption = this.auth.getRememberedAccount();
    await this.loadAccounts();
  }

  async loadAccounts(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;
    this.accountsError = '';
    try {
      this.options = await this.accounts.getAccountNames();
      if (!this.options.includes(this.selectedOption)) this.selectedOption = '';
    } catch {
      this.accountsError = 'تعذر تحميل الحسابات. تحقق من الاتصال ثم أعد المحاولة.';
    } finally { this.isLoading = false; }
  }

  async login(): Promise<void> {
    if (this.isSubmitting || this.isLoading) return;
    this.errorMessage = '';
    if (!this.options.includes(this.selectedOption) || !this.password) {
      this.errorMessage = 'اختر الحساب وأدخل كلمة المرور.';
      return;
    }
    this.isSubmitting = true;
    try {
      const user = await this.auth.login(this.selectedOption, this.password, this.rememberMe);
      await this.router.navigate([this.auth.homeRoute(user)]);
      this.password = '';
    } catch (error) {
      this.errorMessage = authErrorMessage(error);
    } finally { this.isSubmitting = false; }
  }
}
