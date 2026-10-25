import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { ClinicOption } from '../../core/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="register-wrap">
      <section class="card register-card">
        <header>
          <h1>Criar conta</h1>
          <p class="muted">Cadastre-se como paciente ou prestador de serviço.</p>
        </header>

        @if (error) {
          <div class="alert alert-error" role="alert">{{ error }}</div>
        }
        @if (success) {
          <div class="alert alert-success" role="status">
            Cadastro realizado! Redirecionando para o login…
          </div>
        }

        <form (ngSubmit)="submit()" #f="ngForm" novalidate>
          <div class="field">
            <label>Tipo de conta</label>
            <select name="role" [(ngModel)]="role" required>
              <option value="patient">Paciente</option>
              <option value="provider">Prestador de serviço (médico, clínica, hospital)</option>
            </select>
          </div>

          <div class="field">
            <label for="name">Nome completo</label>
            <input id="name" name="name" type="text" [(ngModel)]="name" required />
          </div>

          <div class="field">
            <label for="email">E-mail</label>
            <input id="email" name="email" type="email" [(ngModel)]="email" required />
          </div>

          <div class="field">
            <label for="password">Senha (mín. 6 caracteres)</label>
            <input
              id="password"
              name="password"
              type="password"
              minlength="6"
              [(ngModel)]="password"
              required
            />
          </div>

          <div class="field">
            <label for="city">Cidade</label>
            <input id="city" name="city" type="text" [(ngModel)]="city" />
          </div>

          @if (role === 'provider') {
            <div class="alert alert-info">
              Após o cadastro o administrador precisará validar suas credenciais (RN01) antes
              que você possa publicar serviços. Para cadastro de clínicas e hospitais, contate
              o administrador da plataforma.
            </div>

            <div class="field">
              <label for="specialty">Especialidade</label>
              <input
                id="specialty"
                name="specialty"
                type="text"
                placeholder="Ex.: Cardiologia, Pediatria..."
                [(ngModel)]="specialty"
              />
            </div>
            <div class="field">
              <label for="crm">CRM / Conselho</label>
              <input id="crm" name="crm" type="text" [(ngModel)]="crm" />
            </div>
            <div class="field">
              <label for="clinic">Clínica / Hospital vinculado *</label>
              <select id="clinic" name="clinic" [(ngModel)]="clinicId" required>
                <option [ngValue]="null" disabled>Selecione...</option>
                @for (c of clinics; track c.id) {
                  <option [ngValue]="c.id">
                    {{ c.name }}@if (c.city) {<span> — {{ c.city }}</span>}
                  </option>
                }
              </select>
              @if (clinics.length === 0) {
                <small class="muted">
                  Nenhuma clínica/hospital cadastrada ainda. Solicite ao administrador.
                </small>
              }
            </div>
          }

          <button type="submit" [disabled]="loading || !f.form.valid" style="width:100%">
            {{ loading ? 'Cadastrando...' : 'Cadastrar' }}
          </button>
        </form>

        <p style="text-align:center; margin-top:16px;">
          Já possui conta? <a routerLink="/login">Entrar</a>
        </p>
      </section>
    </main>
  `,
  styles: [
    `
      .register-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: linear-gradient(135deg, #0b6efd 0%, #198754 100%);
      }
      .register-card {
        width: 100%;
        max-width: 520px;
      }
    `,
  ],
})
export class RegisterComponent implements OnInit {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  role: 'patient' | 'provider' = 'patient';
  name = '';
  email = '';
  password = '';
  city = '';
  specialty = '';
  crm = '';
  clinicId: number | null = null;

  clinics: ClinicOption[] = [];

  loading = false;
  error = '';
  success = false;

  ngOnInit(): void {
    this.api.listClinics().subscribe({
      next: (cs) => (this.clinics = cs),
      error: () => (this.clinics = []),
    });
  }

  submit(): void {
    this.error = '';
    this.loading = true;
    const payload = {
      role: this.role,
      name: this.name,
      email: this.email,
      password: this.password,
      city: this.city,
      specialty: this.specialty,
      crm: this.crm,
      clinic_id: this.role === 'provider' ? this.clinicId : null,
    };

    this.auth.register(payload as any).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Falha ao cadastrar.';
      },
    });
  }
}
