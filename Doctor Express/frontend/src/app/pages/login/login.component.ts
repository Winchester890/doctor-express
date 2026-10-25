import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="login-wrap" aria-label="Página de login Doctor Express">
      <section class="card login-card">
        <header class="brand">
          <div class="logo" aria-hidden="true">+</div>
          <h1>Doctor Express</h1>
          <p class="muted">Fila Saúde — agendamento e encaixe em unidades de saúde</p>
        </header>

        @if (error) {
          <div class="alert alert-error" role="alert">{{ error }}</div>
        }

        <form (ngSubmit)="submit()" #f="ngForm" novalidate>
          <div class="field">
            <label for="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              [(ngModel)]="email"
              required
              autocomplete="email"
            />
          </div>
          <div class="field">
            <label for="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              [(ngModel)]="password"
              required
              autocomplete="current-password"
            />
          </div>
          <button type="submit" [disabled]="loading || !f.form.valid" style="width:100%">
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        <p class="row" style="justify-content: space-between; margin-top:16px;">
          <a routerLink="/register">Criar conta</a>
          <span class="muted">admin: admin&#64;doctorexpress.com / admin123</span>
        </p>
      </section>
    </main>
  `,
  styles: [
    `
      .login-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: linear-gradient(135deg, #0b6efd 0%, #198754 100%);
      }
      .login-card {
        width: 100%;
        max-width: 420px;
      }
      .brand {
        text-align: center;
        margin-bottom: 18px;
      }
      .brand h1 {
        margin: 8px 0 4px;
        font-size: 24px;
      }
      .logo {
        width: 56px;
        height: 56px;
        line-height: 56px;
        margin: 0 auto;
        background: #0b6efd;
        color: #fff;
        font-size: 36px;
        border-radius: 50%;
        font-weight: bold;
      }
    `,
  ],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = false;
  error = '';

  submit(): void {
    this.error = '';
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        const role = res.user.role;
        this.router.navigate([`/${role}`]);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Falha ao autenticar.';
      },
    });
  }
}
