import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Validators, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DbService } from '../../app/services/db.service'; // ✅ CORRECT PATH

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule]
})
export class LoginComponent {

  private db = inject(DbService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  loginForm = new FormGroup({
    loginId: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    rememberMe: new FormControl(false)
  });

  async handleLogin() {
    if (this.loginForm.invalid || this.isLoading()) return;

    this.errorMessage.set(null);
    this.isLoading.set(true);

    const loginId = this.loginForm.controls.loginId.value.trim();
    const password = this.loginForm.controls.password.value;

    try {
      const result = await this.db.login(loginId, password);

      if (!result.success || !result.user) {
        this.errorMessage.set(result.message || 'Invalid login credentials');
        return;
      }

      const user = result.user;

      /* =========================
         ROLE → ROUTE (MATCHES app.routes.ts)
         ========================= */
      let route = '/employee';

      if (user.role === 'admin') {
        route = '/admin';
      } else if (user.role === 'canteen manager') {
        route = '/canteen-manager';
      } else if (user.role === 'contractor') {
        route = '/contractor';
      }

      await this.router.navigateByUrl(route);

    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage.set('Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
