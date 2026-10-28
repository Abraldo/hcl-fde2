import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" routerLink="/dashboard"><span class="brand-mark">f</span><span>frostline<small>OPERATIONS</small></span></a>
        <div class="nav-label">WORKSPACE</div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active"><span class="nav-icon">◫</span> Overview</a>
          <a *ngIf="auth.isAdmin()" routerLink="/configuration" routerLinkActive="active"><span class="nav-icon">⚙</span> Configuration</a>
          <a *ngIf="auth.isAdmin()" routerLink="/admin" routerLinkActive="active"><span class="nav-icon">♙</span> Administration</a>
        </nav>
        <div class="sidebar-bottom">
          <div class="secure-note"><span class="secure-dot"></span><span>All systems operational<small>Sensor network connected</small></span></div>
          <div class="profile">
            <div class="avatar">{{ auth.session()?.displayName?.slice(0, 1) }}</div>
            <div class="profile-name">{{ auth.session()?.displayName }}<small>{{ auth.session()?.role }}</small></div>
            <button class="icon-button" aria-label="Sign out" title="Sign out" (click)="logout()">↪</button>
          </div>
        </div>
      </aside>
      <main class="main-area">
        <header class="topbar"><div class="breadcrumb">Cold-chain operations <span>/</span> <b>{{ pageTitle }}</b></div><div class="top-date">LIVE MONITORING <i></i></div></header>
        <div class="page-content"><router-outlet /></div>
      </main>
    </div>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get pageTitle(): string {
    const path = this.router.url.split('?')[0];
    if (path.includes('configuration')) return 'Configuration';
    if (path.includes('admin')) return 'Administration';
    return 'Overview';
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
