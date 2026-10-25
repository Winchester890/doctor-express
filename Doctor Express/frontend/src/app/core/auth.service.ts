import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { AuthResponse, User, Role } from './models';

const TOKEN_KEY = 'dx_token';
const USER_KEY = 'dx_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = '/api';
  private readonly _user = signal<User | null>(this.loadUser());

  readonly user = computed(() => this._user());
  readonly isLogged = computed(() => !!this._user());
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api}/auth/login`, { email, password })
      .pipe(tap((res) => this.persist(res)));
  }

  register(
    payload: Partial<User> & { password: string; clinic_id?: number | null },
  ): Observable<{ user: User }> {
    return this.http.post<{ user: User }>(`${this.api}/auth/register`, payload);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
  }

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._user.set(res.user);
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
