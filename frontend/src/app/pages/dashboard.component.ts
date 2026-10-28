import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { DashboardData, Reading } from '../api.models';

@Component({
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe],
  template: `
    <div class="page-heading">
      <div><div class="eyebrow">FLEET HEALTH</div><h1>Cold-chain overview</h1><p>Monitor temperature integrity across every active shipment.</p></div>
      <div class="refresh-pill"><span></span> Live fleet data</div>
    </div>
    <div *ngIf="error" class="notice error-notice" role="alert">{{ error }}</div>
    <ng-container *ngIf="data as d">
      <section class="metric-grid">
        <article class="metric-card"><div class="metric-top"><span>MONITORED VEHICLES</span><span class="metric-icon truck-icon">↗</span></div><div class="metric-value">{{ d.truckCount | number:'1.0-0' }}<small> trucks</small></div><div class="metric-foot"><span class="metric-dot green-dot"></span>Reporting in selected period</div></article>
        <article class="metric-card"><div class="metric-top"><span>FLEET AVG. TEMPERATURE</span><span class="metric-icon temp-icon">⌁</span></div><div class="metric-value">{{ d.fleetAverageTemperatureC | number:'1.1-1' }}<small> °C</small></div><div class="metric-foot">Threshold set at {{ d.config.temperatureThresholdC }} °C</div></article>
        <article class="metric-card"><div class="metric-top"><span>SUSTAINED ALERTS</span><span class="metric-icon alert-icon">!</span></div><div class="metric-value">{{ d.alertCount | number:'1.0-0' }}<small> episodes</small></div><div class="metric-foot"><span class="metric-dot" [class.green-dot]="d.alertCount === 0" [class.red-dot]="d.alertCount > 0"></span>{{ d.alertCount === 0 ? 'No qualifying excursions' : 'Requires operational review' }}</div></article>
        <article class="metric-card"><div class="metric-top"><span>SENSOR READINGS</span><span class="metric-icon reading-icon">⌗</span></div><div class="metric-value">{{ d.readingCount | number:'1.0-0' }}<small> points</small></div><div class="metric-foot">Across all monitored vehicles</div></article>
      </section>
      <section class="content-grid">
        <article class="panel chart-panel">
          <div class="panel-heading"><div><h3>Temperature profile</h3><p>All sensor readings over time</p></div><span class="chart-unit">°C</span></div>
          <div class="chart-wrap" *ngIf="d.readings.length; else emptyChart">
            <div class="chart-y-labels"><span>12°</span><span>9°</span><span>6°</span><span>3°</span></div>
            <svg viewBox="0 0 760 220" preserveAspectRatio="none" role="img" aria-label="Sensor temperature trend">
              <line x1="0" y1="30" x2="760" y2="30" class="chart-grid"/><line x1="0" y1="83" x2="760" y2="83" class="chart-grid"/><line x1="0" y1="136" x2="760" y2="136" class="chart-grid"/><line x1="0" y1="189" x2="760" y2="189" class="chart-grid"/>
              <polyline *ngFor="let series of chartSeries" [attr.points]="series.points" fill="none" [attr.stroke]="series.color" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <ng-template #emptyChart><div class="empty-state">No readings yet. An administrator can import sensor data from the Admin page.</div></ng-template>
          <div class="chart-legend"><span *ngFor="let truck of trucks"><i [style.background]="colorFor(truck)"></i>{{ truck }}</span></div>
        </article>
        <article class="panel status-panel">
          <div class="panel-heading"><div><h3>Fleet status</h3><p>Latest reading by vehicle</p></div><span class="soft-badge">{{ trucks.length }} ACTIVE</span></div>
          <div class="vehicle-list">
            <div class="vehicle-row" *ngFor="let truck of trucks">
              <div class="vehicle-avatar">↗</div><div class="vehicle-info"><b>{{ truck }}</b><small>{{ latestReading(truck)?.timestamp | date:'shortTime' }}</small></div>
              <div class="vehicle-temp" [class.over-limit]="(latestReading(truck)?.temperatureC ?? 0) > d.config.temperatureThresholdC">{{ latestReading(truck)?.temperatureC | number:'1.1-1' }}°<small>C</small></div>
              <span class="status-indicator" [class.status-alert]="(latestReading(truck)?.temperatureC ?? 0) > d.config.temperatureThresholdC"></span>
            </div>
            <div *ngIf="!trucks.length" class="empty-state compact">No vehicles to display</div>
          </div>
          <div class="status-foot"><span class="status-indicator"></span> Within configured temperature limit</div>
        </article>
      </section>
      <section class="panel alerts-panel">
        <div class="panel-heading"><div><h3>Temperature excursions</h3><p>Episodes exceeding the configured threshold and duration</p></div><span class="soft-badge" [class.badge-alert]="d.alertCount > 0">{{ d.alertCount }} EPISODES</span></div>
        <div class="table-wrap">
          <table *ngIf="d.alerts.length; else emptyAlerts">
            <thead><tr><th>VEHICLE</th><th>STARTED</th><th>ENDED</th><th>DURATION</th><th>PEAK TEMP.</th><th>SEVERITY</th></tr></thead>
            <tbody><tr *ngFor="let alert of d.alerts"><td><b>{{ alert.truckId }}</b></td><td>{{ alert.startedAt | date:'MMM d, HH:mm' }}</td><td>{{ alert.endedAt | date:'MMM d, HH:mm' }}</td><td>{{ alert.durationMinutes | number:'1.0-0' }} min</td><td class="over-limit">{{ alert.peakTemperatureC | number:'1.1-1' }} °C</td><td><span class="severity" [class.critical]="alert.severity === 'CRITICAL'">{{ alert.severity }}</span></td></tr></tbody>
          </table>
          <ng-template #emptyAlerts><div class="empty-state compact">No sustained temperature excursions meet the current alert rules.</div></ng-template>
        </div>
      </section>
    </ng-container>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly http = inject(HttpClient);
  data: DashboardData | null = null;
  error = '';
  readonly palette = ['#36785d', '#d98b4b', '#6076a7', '#a16b92', '#70a49d'];

  ngOnInit(): void {
    this.http.get<DashboardData>('/api/dashboard').subscribe({
      next: (data) => { this.data = data; },
      error: (error: HttpErrorResponse) => { this.error = error.error?.detail ?? 'Unable to load fleet data. Verify the API and database are available.'; },
    });
  }

  get trucks(): string[] {
    return [...new Set(this.data?.readings.map((reading) => reading.truckId) ?? [])];
  }

  latestReading(truck: string): Reading | undefined {
    return this.data?.readings.filter((reading) => reading.truckId === truck)
      .reduce<Reading | undefined>((latest, reading) =>
        !latest || reading.timestamp > latest.timestamp ? reading : latest, undefined);
  }

  colorFor(truck: string): string {
    return this.palette[this.trucks.indexOf(truck) % this.palette.length];
  }

  get chartSeries(): { points: string; color: string }[] {
    if (!this.data?.readings.length) return [];
    return this.trucks.map((truck) => {
      const readings = this.data!.readings.filter((reading) => reading.truckId === truck)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const points = readings.map((reading, index) => {
        const x = readings.length === 1 ? 380 : (index / (readings.length - 1)) * 760;
        const y = 189 - ((reading.temperatureC - 3) / 9) * 159;
        return `${x.toFixed(1)},${Math.max(20, Math.min(195, y)).toFixed(1)}`;
      }).join(' ');
      return { points, color: this.colorFor(truck) };
    });
  }
}
