import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse } from './api.models';

const API_URL = '/api';
const SESSION_KEY = 'cold-chain-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly sessionState = signal<AuthResponse | null>(this.restoreSession());
  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionState() !== null);
  readonly isAdmin = computed(() => this.sessionState()?.role === 'ADMIN');

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, { email, password }).pipe(
      tap((session) => this.saveSession(session)),
    );
  }

  bootstrap(email: string, displayName: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/bootstrap`, { email, displayName, password }).pipe(
      tap((session) => this.saveSession(session)),
    );
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY);
    this.sessionState.set(null);
  }

  token(): string | null {
    return this.sessionState()?.token ?? null;
  }

  private saveSession(session: AuthResponse): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.sessionState.set(session);
  }

  private restoreSession(): AuthResponse | null {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    try {
      const session = JSON.parse(stored) as AuthResponse;
      if (session.token && session.email && session.role) return session;
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    }
    return null;
  }
}
