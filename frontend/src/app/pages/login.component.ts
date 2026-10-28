import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="login-page">
      <section class="login-art">
        <a class="brand brand-light"><span class="brand-mark">f</span><span>frostline<small>OPERATIONS</small></span></a>
        <div class="art-copy"><div class="eyebrow">COLD-CHAIN INTELLIGENCE</div><h1>Protect every<br>degree of the journey.</h1><p>Real-time visibility for the moments that matter. Keep every shipment within its safe zone.</p></div>
        <div class="art-stat"><span class="stat-line"></span><span>Trusted monitoring across your fleet</span><b>24 / 7</b></div>
        <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-glow"></div>
      </section>
      <section class="login-panel">
        <div class="login-form-wrap">
          <div class="form-kicker">{{ creatingAdmin ? 'GET STARTED' : 'WELCOME BACK' }}</div>
          <h2>{{ creatingAdmin ? 'Set up your workspace' : 'Sign in to Frostline' }}</h2>
          <p class="form-subtitle">{{ creatingAdmin ? 'Create the first administrator account to secure your fleet.' : 'Enter your credentials to access your operations.' }}</p>
          <form (ngSubmit)="submit()" #loginForm="ngForm">
            <label *ngIf="creatingAdmin">Full name<input name="displayName" [(ngModel)]="displayName" required maxlength="120" autocomplete="name" placeholder="Your name"></label>
            <label>Email address<input name="email" [(ngModel)]="email" required type="email" maxlength="320" autocomplete="username" placeholder="you@company.com"></label>
            <label>Password<input name="password" [(ngModel)]="password" required [minlength]="creatingAdmin ? 12 : 1" maxlength="72" type="password" [autocomplete]="creatingAdmin ? 'new-password' : 'current-password'" placeholder="Enter your password"></label>
            <p *ngIf="creatingAdmin" class="field-hint">Use at least 12 characters.</p>
            <div *ngIf="error" class="notice error-notice" role="alert">{{ error }}</div>
            <button class="button button-primary full-button" type="submit" [disabled]="loginForm.invalid || busy">{{ busy ? 'Please wait…' : creatingAdmin ? 'Create administrator' : 'Sign in' }} <span>→</span></button>
          </form>
          <button type="button" class="text-button setup-toggle" (click)="toggleMode()">{{ creatingAdmin ? 'Back to sign in' : 'First time here? Create first admin' }}</button>
          <div class="login-foot"><span class="lock-icon">⌑</span> Secure, encrypted access to your fleet</div>
        </div>
      </section>
    </main>
  `,
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  email = '';
  password = '';
  displayName = '';
  creatingAdmin = false;
  busy = false;
  error = '';

  toggleMode(): void {
    this.creatingAdmin = !this.creatingAdmin;
    this.error = '';
    this.password = '';
  }

  submit(): void {
    this.busy = true;
    this.error = '';
    const request = this.creatingAdmin
      ? this.auth.bootstrap(this.email, this.displayName, this.password)
      : this.auth.login(this.email, this.password);
    request.subscribe({
      next: () => {
        this.busy = false;
        void this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.busy = false;
        this.error = error.status === 409
          ? 'An administrator already exists. Please sign in instead.'
          : error.status === 401
            ? 'The email or password is incorrect.'
            : error.error?.detail ?? error.error?.message ?? 'Unable to reach the service. Check the API connection and try again.';
      },
    });
  }
}
