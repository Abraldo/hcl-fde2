import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AppUser } from '../api.models';

interface ImportResult {
  inserted: number;
  duplicates: number;
}

interface ImportReading {
  truck_id: string;
  timestamp: string;
  temperature_c: number;
  humidity_pct: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-heading"><div><div class="eyebrow">WORKSPACE CONTROLS</div><h1>Administration</h1><p>Manage workspace access and sensor data.</p></div><span class="soft-badge">ADMIN ONLY</span></div>
    <div *ngIf="error" class="notice error-notice" role="alert">{{ error }}</div>
    <div *ngIf="success" class="notice success-notice" role="status">{{ success }}</div>
    <section class="panel admin-panel">
      <div class="panel-heading"><div><h3>Import sensor readings</h3><p>Load a JSON export in the supplied cold-chain reading format.</p></div><span class="upload-mark">↥</span></div>
      <div class="import-row"><label class="file-picker"><input type="file" accept=".json,application/json" (change)="selectFile($event)"><span>Choose JSON file</span><small>{{ fileName || 'No file selected' }}</small></label><button class="button button-primary" [disabled]="!selectedFile || importing" (click)="importReadings()">{{ importing ? 'Importing…' : 'Import readings' }} <span>→</span></button></div>
      <div class="import-note"><b>Expected format</b><code>{{ '{ "readings": [{ "truck_id": "T-01", "timestamp": "2026-07-20T08:00:00", "temperature_c": 6.5, "humidity_pct": 55 }] }' }}</code><span>Duplicate truck/time pairs are skipped safely.</span></div>
    </section>
    <section class="panel admin-panel">
      <div class="panel-heading"><div><h3>Workspace users</h3><p>Only administrators can manage account access.</p></div><span class="soft-badge">{{ users.length }} USERS</span></div>
      <form class="create-user-form" (ngSubmit)="createUser()" #userForm="ngForm">
        <label>Full name<input name="displayName" [(ngModel)]="newUser.displayName" required maxlength="120" placeholder="Team member"></label>
        <label>Email address<input name="email" [(ngModel)]="newUser.email" required type="email" maxlength="320" placeholder="name@company.com"></label>
        <label>Temporary password<input name="password" [(ngModel)]="newUser.password" required minlength="12" maxlength="72" type="password" placeholder="12–72 characters"></label>
        <label>Role<select name="role" [(ngModel)]="newUser.role"><option value="OPERATOR">Operator</option><option value="ADMIN">Administrator</option></select></label>
        <button class="button button-primary" [disabled]="userForm.invalid || creatingUser">Add user</button>
      </form>
      <div class="table-wrap">
        <table *ngIf="users.length; else emptyUsers">
          <thead><tr><th>USER</th><th>EMAIL</th><th>ROLE</th><th>ACCESS</th><th></th></tr></thead>
          <tbody><tr *ngFor="let user of users"><td><div class="user-cell"><span class="avatar">{{ user.displayName.slice(0, 1) }}</span><b>{{ user.displayName }}</b></div></td><td>{{ user.email }}</td><td><span class="role-badge">{{ user.role }}</span></td><td><span class="access-state" [class.disabled-state]="!user.enabled"><i></i>{{ user.enabled ? 'Enabled' : 'Disabled' }}</span></td><td><button class="text-button status-action" (click)="toggleUser(user)">{{ user.enabled ? 'Disable' : 'Enable' }}</button></td></tr></tbody>
        </table>
        <ng-template #emptyUsers><div class="empty-state compact">No workspace users found.</div></ng-template>
      </div>
    </section>
  `,
})
export class AdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  users: AppUser[] = [];
  selectedFile: File | null = null;
  fileName = '';
  importing = false;
  creatingUser = false;
  error = '';
  success = '';
  newUser = { displayName: '', email: '', password: '', role: 'OPERATOR' };

  ngOnInit(): void {
    this.loadUsers();
  }

  selectFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.selectedFile = file;
    this.fileName = file?.name ?? '';
    this.error = '';
    this.success = '';
  }

  async importReadings(): Promise<void> {
    if (!this.selectedFile) return;
    this.importing = true;
    this.error = '';
    this.success = '';
    try {
      const parsed: unknown = JSON.parse(await this.selectedFile.text());
      const readings = this.readingList(parsed);
      this.http.post<ImportResult>('/api/admin/readings/import', { readings }).subscribe({
        next: (result) => {
          this.importing = false;
          this.success = `Import complete: ${result.inserted} new readings added; ${result.duplicates} duplicates skipped.`;
        },
        error: (error: HttpErrorResponse) => {
          this.importing = false;
          this.error = error.error?.detail ?? error.error?.message ?? 'The server rejected the reading import.';
        },
      });
    } catch {
      this.importing = false;
      this.error = 'The selected file is not valid JSON with a readings array.';
    }
  }

  createUser(): void {
    this.creatingUser = true;
    this.error = '';
    this.success = '';
    this.http.post<AppUser>('/api/admin/users', this.newUser).subscribe({
      next: () => {
        this.creatingUser = false;
        this.newUser = { displayName: '', email: '', password: '', role: 'OPERATOR' };
        this.success = 'Workspace user created.';
        this.loadUsers();
      },
      error: (error: HttpErrorResponse) => {
        this.creatingUser = false;
        this.error = error.error?.detail ?? error.error?.message ?? 'Unable to create user.';
      },
    });
  }

  toggleUser(user: AppUser): void {
    this.error = '';
    this.success = '';
    this.http.put<AppUser>(`/api/admin/users/${user.id}/status`, { enabled: !user.enabled }).subscribe({
      next: () => {
        this.success = `${user.displayName}'s access has been ${user.enabled ? 'disabled' : 'enabled'}.`;
        this.loadUsers();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.detail ?? error.error?.message ?? 'Unable to update user access.';
      },
    });
  }

  private loadUsers(): void {
    this.http.get<AppUser[]>('/api/admin/users').subscribe({
      next: (users) => { this.users = users; },
      error: (error: HttpErrorResponse) => { this.error = error.error?.detail ?? 'Unable to load workspace users.'; },
    });
  }

  private readingList(value: unknown): ImportReading[] {
    if (typeof value !== 'object' || value === null || !('readings' in value)) {
      throw new Error('Missing readings array');
    }
    const readings = (value as { readings: unknown }).readings;
    if (!Array.isArray(readings) || readings.length === 0 || readings.length > 10000) {
      throw new Error('Invalid readings array');
    }
    return readings as ImportReading[];
  }
}
