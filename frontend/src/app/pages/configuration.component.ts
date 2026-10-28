import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AppConfig } from '../api.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-heading"><div><div class="eyebrow">ALERT RULES</div><h1>Configuration</h1><p>Set the safe operating range and excursion detection rules.</p></div><span class="soft-badge">ADMIN ONLY</span></div>
    <div *ngIf="error" class="notice error-notice" role="alert">{{ error }}</div>
    <div *ngIf="success" class="notice success-notice" role="status">{{ success }}</div>
    <form *ngIf="config as c" (ngSubmit)="save()" #settingsForm="ngForm">
      <section class="panel settings-panel">
        <div class="section-title"><div class="settings-icon">⌁</div><div><h3>Temperature threshold</h3><p>Readings strictly above this value are considered out of range.</p></div></div>
        <label class="setting-field"><span>Maximum safe temperature</span><div class="input-with-unit"><input name="threshold" type="number" step="0.1" min="-40" max="40" required [(ngModel)]="c.temperatureThresholdC"><span>°C</span></div><small>Allowed range: −40 °C to 40 °C</small></label>
        <div class="range-scale"><span>−40 °C</span><span class="scale-line"><i></i></span><span>40 °C</span></div>
      </section>
      <section class="panel settings-panel">
        <div class="section-title"><div class="settings-icon duration-icon">◷</div><div><h3>Sustained excursion</h3><p>Short spikes do not trigger alerts unless they persist.</p></div></div>
        <label class="setting-field"><span>Minimum alert duration</span><div class="input-with-unit"><input name="duration" type="number" min="0" max="1440" step="1" required [(ngModel)]="c.minimumDurationMinutes"><span>minutes</span></div><small>Allowed range: 0 to 1440 minutes</small></label>
        <label class="setting-field gap-setting"><span>Maximum gap between readings</span><div class="input-with-unit"><input name="gap" type="number" min="1" max="1440" step="1" required [(ngModel)]="c.maximumGapMinutes"><span>minutes</span></div><small>Larger gaps split an excursion into separate episodes.</small></label>
        <div class="info-callout"><span>ⓘ</span><p>Duration is measured from the first to the last actual reading in an episode. Missing samples are never assumed.</p></div>
      </section>
      <div class="form-actions"><span>Changes apply to dashboard calculations immediately.</span><button class="button button-primary" [disabled]="settingsForm.invalid || saving">{{ saving ? 'Saving…' : 'Save configuration' }} <span>→</span></button></div>
    </form>
  `,
})
export class ConfigurationComponent implements OnInit {
  private readonly http = inject(HttpClient);
  config: AppConfig | null = null;
  saving = false;
  error = '';
  success = '';

  ngOnInit(): void {
    this.http.get<AppConfig>('/api/config').subscribe({
      next: (config) => { this.config = config; },
      error: (error: HttpErrorResponse) => { this.error = error.error?.detail ?? 'Unable to load alert configuration.'; },
    });
  }

  save(): void {
    if (!this.config) return;
    this.saving = true;
    this.error = '';
    this.success = '';
    this.http.put<AppConfig>('/api/config', this.config).subscribe({
      next: (config) => {
        this.config = config;
        this.saving = false;
        this.success = 'Alert configuration saved successfully.';
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.error = error.error?.detail ?? error.error?.message ?? 'Unable to save configuration.';
      },
    });
  }
}
