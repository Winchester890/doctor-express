import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar" role="banner">
      <div class="brand">
        <span class="logo" aria-hidden="true">+</span>
        <strong>Doctor Express</strong>
      </div>
      <div class="row" style="gap:12px">
        @if (auth.user(); as u) {
          <span class="muted">{{ u.name }} ({{ roleLabel(u.role) }})</span>
          <button class="btn-secondary" (click)="logout()">Sair</button>
        }
      </div>
    </header>
  `,
  styles: [
    `
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 24px;
        background: #fff;
        border-bottom: 1px solid var(--border);
        box-shadow: var(--shadow);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
      }
      .logo {
        background: var(--primary);
        color: #fff;
        width: 32px;
        height: 32px;
        line-height: 32px;
        text-align: center;
        border-radius: 50%;
        font-weight: bold;
      }
    `,
  ],
})
export class AppHeaderComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  roleLabel(role: string): string {
    return role === 'patient'
      ? 'Paciente'
      : role === 'provider'
        ? 'Prestador'
        : 'Administrador';
  }
}
