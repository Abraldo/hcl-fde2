export interface AuthResponse {
  token: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'OPERATOR';
}

export interface AppConfig {
  temperatureThresholdC: number;
  minimumDurationMinutes: number;
  maximumGapMinutes: number;
}

export interface Reading {
  truckId: string;
  timestamp: string;
  temperatureC: number;
  humidityPct: number;
}

export interface AlertEpisode {
  truckId: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  peakTemperatureC: number;
  severity: 'WARNING' | 'CRITICAL';
  readingCount: number;
}

export interface DashboardData {
  truckCount: number;
  readingCount: number;
  alertCount: number;
  fleetAverageTemperatureC: number;
  config: AppConfig;
  readings: Reading[];
  alerts: AlertEpisode[];
}

export interface AppUser {
  id: number;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'OPERATOR';
  enabled: boolean;
}
