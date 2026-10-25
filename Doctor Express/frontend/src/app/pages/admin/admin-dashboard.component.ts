import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  AddressOption,
  AuditLog,
  ClinicOption,
  Report,
  User,
} from '../../core/models';
import { AppHeaderComponent } from '../../shared/app-header.component';
import {
  MapPin,
  MapPreviewComponent,
} from '../../shared/map-preview.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent, MapPreviewComponent],
  template: `
    <app-header />

    <main class="container" aria-label="Painel administrativo">
      <h1>Painel administrativo</h1>

      <nav class="tabs row" role="tablist">
        <button [class.active]="tab() === 'users'" (click)="loadUsers(); tab.set('users')">
          Usuários
        </button>
        <button [class.active]="tab() === 'create'" (click)="tab.set('create')">
          Cadastrar usuário
        </button>
        <button [class.active]="tab() === 'clinic'" (click)="tab.set('clinic')">
          Cadastrar clínica/hospital
        </button>
        <button [class.active]="tab() === 'reports'" (click)="loadReports(); tab.set('reports')">
          Reportes
        </button>
        <button [class.active]="tab() === 'logs'" (click)="loadLogs(); tab.set('logs')">
          Auditoria
        </button>
      </nav>

      @if (msg()) {
        <div class="alert alert-success" role="status">{{ msg() }}</div>
      }
      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (tab() === 'users') {
        <section class="card">
          <h2>Usuários cadastrados</h2>
          <div class="row" style="margin-bottom:12px">
            <select [(ngModel)]="roleFilter" (ngModelChange)="loadUsers()">
              <option value="">Todos os perfis</option>
              <option value="patient">Pacientes</option>
              <option value="provider">Prestadores</option>
              <option value="admin">Administradores</option>
            </select>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Especialidade</th>
                <th>Endereço / Vínculo</th>
                <th>Validado</th>
                <th>Ativo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td>{{ u.id }}</td>
                  <td>{{ u.name }}</td>
                  <td>{{ u.email }}</td>
                  <td>{{ roleLabel(u) }}</td>
                  <td>{{ u.specialty || '—' }}</td>
                  <td>
                    @if (u.address) { 📍 {{ u.address }} }
                    @else if (u.clinic_name) { {{ u.clinic_name }} }
                    @else { — }
                  </td>
                  <td>{{ u.validated ? 'Sim' : 'Não' }}</td>
                  <td>{{ u.active ? 'Sim' : 'Não' }}</td>
                  <td>
                    @if (u.role === 'provider' && !u.validated) {
                      <button class="btn-success" (click)="validate(u)">Validar (RN01)</button>
                    }
                    @if (u.role !== 'admin') {
                      <button class="btn-warning" (click)="toggleActive(u)">
                        {{ u.active ? 'Desativar' : 'Ativar' }}
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }

      @if (tab() === 'create') {
        <section class="card">
          <h2>Cadastrar novo usuário</h2>
          <p class="muted">
            Usuários criados pelo admin já são gravados como validados e prontos para uso.
          </p>

          <form (ngSubmit)="createUser()" #f="ngForm" novalidate>
            <div class="row">
              <div class="field" style="flex:1; min-width:200px">
                <label>Tipo de conta</label>
                <select name="role" [(ngModel)]="newUser.role" required>
                  <option value="patient">Paciente</option>
                  <option value="provider">Prestador (médico, clínica, hospital)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div class="field" style="flex:2; min-width:240px">
                <label>Nome completo</label>
                <input name="name" type="text" [(ngModel)]="newUser.name" required />
              </div>
            </div>

            <div class="row">
              <div class="field" style="flex:2; min-width:240px">
                <label>E-mail</label>
                <input name="email" type="email" [(ngModel)]="newUser.email" required />
              </div>
              <div class="field" style="flex:1; min-width:160px">
                <label>Senha (mín. 6 caracteres)</label>
                <input
                  name="password"
                  type="text"
                  minlength="6"
                  [(ngModel)]="newUser.password"
                  required
                />
              </div>
              <div class="field" style="flex:1; min-width:160px">
                <label>Cidade</label>
                <input name="city" type="text" [(ngModel)]="newUser.city" />
              </div>
            </div>

            @if (newUser.role === 'provider') {
              <div class="row">
                <div class="field" style="flex:2; min-width:200px">
                  <label>Especialidade</label>
                  <input
                    name="specialty"
                    type="text"
                    placeholder="Ex.: Cardiologia, Pediatria..."
                    [(ngModel)]="newUser.specialty"
                  />
                </div>
                <div class="field" style="flex:1; min-width:160px">
                  <label>CRM / Conselho</label>
                  <input name="crm" type="text" [(ngModel)]="newUser.crm" />
                </div>
              </div>
              <div class="field">
                <label>Clínica / Hospital vinculado *</label>
                <select name="clinic_id" [(ngModel)]="newUser.clinic_id" required>
                  <option [ngValue]="null" disabled>Selecione...</option>
                  @for (c of clinics(); track c.id) {
                    <option [ngValue]="c.id">
                      {{ c.name }}@if (c.city) {<span> — {{ c.city }}</span>}
                    </option>
                  }
                </select>
                @if (clinics().length === 0) {
                  <small class="muted">
                    Nenhuma clínica/hospital cadastrada. Cadastre uma na aba
                    "Cadastrar clínica/hospital" antes de criar prestadores.
                  </small>
                }
              </div>
            }

            <button type="submit" [disabled]="!f.form.valid || saving()">
              {{ saving() ? 'Cadastrando...' : 'Cadastrar usuário' }}
            </button>
          </form>
        </section>
      }

      @if (tab() === 'clinic') {
        <section class="card">
          <h2>Cadastrar clínica / hospital</h2>
          <p class="muted">
            Cadastro de pessoa jurídica. A entidade já será criada validada e poderá publicar
            serviços imediatamente.
          </p>

          <form (ngSubmit)="createClinic()" #cf="ngForm" novalidate>
            <div class="row">
              <div class="field" style="flex:2; min-width:240px">
                <label>Razão social / Nome</label>
                <input name="cname" type="text" [(ngModel)]="newClinic.name" required />
              </div>
              <div class="field" style="flex:1; min-width:200px">
                <label>CNPJ</label>
                <input
                  name="ccnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  [(ngModel)]="newClinic.cnpj"
                  required
                />
              </div>
            </div>

            <div class="row">
              <div class="field" style="flex:2; min-width:200px">
                <label>E-mail</label>
                <input name="cemail" type="email" [(ngModel)]="newClinic.email" required />
              </div>
              <div class="field" style="flex:1; min-width:160px">
                <label>Senha (mín. 6 caracteres)</label>
                <input
                  name="cpassword"
                  type="text"
                  minlength="6"
                  [(ngModel)]="newClinic.password"
                  required
                />
              </div>
            </div>

            <div class="field">
              <label>Endereço (Barueri - SP) *</label>
              <select
                name="caddress"
                [(ngModel)]="newClinic.address_id"
                (ngModelChange)="onClinicAddressChange()"
                required
              >
                <option [ngValue]="null" disabled>Selecione um endereço...</option>
                @for (a of addresses(); track a.id) {
                  <option [ngValue]="a.id">{{ a.label }}</option>
                }
              </select>
              <small class="muted">
                Catálogo de endereços de Barueri (RF10 — simulação da API do Google Maps).
              </small>
            </div>

            <div class="field">
              <label>Especialidade principal (opcional)</label>
              <input
                name="cspecialty"
                type="text"
                placeholder="Ex.: Clínica geral, Hospital materno-infantil..."
                [(ngModel)]="newClinic.specialty"
              />
            </div>

            @if (clinicMapPins().length > 0) {
              <div class="field">
                <label>Prévia da localização</label>
                <app-map-preview [pins]="clinicMapPins()" />
              </div>
            }

            <button type="submit" [disabled]="!cf.form.valid || saving()">
              {{ saving() ? 'Cadastrando...' : 'Cadastrar clínica/hospital' }}
            </button>
          </form>
        </section>
      }

      @if (tab() === 'reports') {
        <section class="card">
          <h2>Reportes (RF12)</h2>
          @if (reports().length === 0) {
            <p class="muted">Nenhum reporte pendente.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Reportador</th>
                  <th>Alvo</th>
                  <th>Motivo</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                @for (r of reports(); track r.id) {
                  <tr>
                    <td>{{ r.id }}</td>
                    <td>{{ r.reporter_name }}</td>
                    <td>{{ r.target_user_name }}</td>
                    <td>{{ r.reason }}</td>
                    <td><span class="badge badge-pending">{{ r.status }}</span></td>
                    <td>
                      @if (r.status !== 'resolved') {
                        <button class="btn-success" (click)="resolve(r)">Resolver</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }

      @if (tab() === 'logs') {
        <section class="card">
          <h2>Logs de auditoria (RNF08)</h2>
          @if (logs().length === 0) {
            <p class="muted">Sem registros.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Quando</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                @for (l of logs(); track l.id) {
                  <tr>
                    <td>{{ l.id }}</td>
                    <td>{{ l.created_at }}</td>
                    <td>{{ l.user_id }}</td>
                    <td>{{ l.action }}</td>
                    <td>{{ l.detail }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }
    </main>
  `,
  styles: [
    `
      .tabs button {
        background: #e5e7eb;
        color: #1f2937;
        margin-right: 8px;
      }
      .tabs button.active {
        background: var(--primary);
        color: #fff;
      }
    `,
  ],
})
export class AdminDashboardComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);

  tab = signal<'users' | 'create' | 'clinic' | 'reports' | 'logs'>('users');
  users = signal<User[]>([]);
  reports = signal<Report[]>([]);
  logs = signal<AuditLog[]>([]);
  clinics = signal<ClinicOption[]>([]);
  addresses = signal<AddressOption[]>([]);

  roleFilter = '';
  saving = signal(false);

  newUser: {
    role: 'patient' | 'provider' | 'admin';
    name: string;
    email: string;
    password: string;
    city: string;
    specialty: string;
    crm: string;
    clinic_id: number | null;
  } = {
    role: 'patient',
    name: '',
    email: '',
    password: '',
    city: '',
    specialty: '',
    crm: '',
    clinic_id: null,
  };

  newClinic: {
    name: string;
    email: string;
    password: string;
    cnpj: string;
    specialty: string;
    address_id: string | null;
  } = {
    name: '',
    email: '',
    password: '',
    cnpj: '',
    specialty: '',
    address_id: null,
  };

  msg = signal('');
  error = signal('');

  /** Pino de pré-visualização para o endereço selecionado da clínica em cadastro. */
  clinicMapPins = computed<MapPin[]>(() => {
    const a = this.addresses().find((x) => x.id === this.newClinic.address_id);
    if (!a) return [];
    return [
      {
        id: a.id,
        lat: a.lat,
        lng: a.lng,
        label: this.newClinic.name || 'Nova clínica/hospital',
        subtitle: a.label,
        type: 'highlight',
      },
    ];
  });

  constructor() {
    this.loadUsers();
    this.loadClinics();
    this.loadAddresses();
  }

  loadUsers(): void {
    this.api.listUsers(this.roleFilter || undefined).subscribe((u) => this.users.set(u));
  }

  loadClinics(): void {
    this.api.listClinics().subscribe({
      next: (c) => this.clinics.set(c),
      error: () => this.clinics.set([]),
    });
  }

  loadAddresses(): void {
    this.api.listAddresses().subscribe({
      next: (a) => this.addresses.set(a),
      error: () => this.addresses.set([]),
    });
  }

  onClinicAddressChange(): void {
    // Trigger só pra forçar atualização da assinatura (computed depende de signal e do model).
    // Como newClinic é objeto comum, atualizamos manualmente o signal de endereços para reavaliar.
    this.addresses.set([...this.addresses()]);
  }
  loadReports(): void {
    this.api.listReports().subscribe((r) => this.reports.set(r));
  }
  loadLogs(): void {
    this.api.listLogs().subscribe((l) => this.logs.set(l));
  }

  validate(u: User): void {
    this.api.validateProvider(u.id).subscribe(() => {
      this.flash(`Prestador ${u.name} validado.`);
      this.loadUsers();
    });
  }

  createUser(): void {
    this.error.set('');
    this.saving.set(true);
    this.api.createUser({ ...this.newUser }).subscribe({
      next: (u) => {
        this.saving.set(false);
        this.flash(`Usuário ${u.name} (${u.role}) cadastrado com sucesso.`);
        this.newUser = {
          role: 'patient',
          name: '',
          email: '',
          password: '',
          city: '',
          specialty: '',
          crm: '',
          clinic_id: null,
        };
        this.loadUsers();
        this.tab.set('users');
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.error?.error || 'Erro ao cadastrar usuário.');
      },
    });
  }

  createClinic(): void {
    this.error.set('');
    if (!this.newClinic.address_id) {
      this.error.set('Selecione um endereço válido de Barueri.');
      return;
    }
    this.saving.set(true);
    this.api
      .createUser({ ...(this.newClinic as any), role: 'provider' })
      .subscribe({
      next: (u) => {
        this.saving.set(false);
        this.flash(`Clínica/Hospital ${u.name} cadastrado com sucesso.`);
        this.newClinic = {
          name: '',
          email: '',
          password: '',
          cnpj: '',
          specialty: '',
          address_id: null,
        };
        this.loadUsers();
        this.loadClinics();
        this.tab.set('users');
      },
      error: (e) => {
        this.saving.set(false);
        this.error.set(e?.error?.error || 'Erro ao cadastrar clínica/hospital.');
      },
    });
  }

  roleLabel(u: User): string {
    if (u.role === 'patient') return 'Paciente';
    if (u.role === 'admin') return 'Administrador';
    return u.cnpj ? 'Clínica / Hospital' : 'Prestador (Individual)';
  }

  toggleActive(u: User): void {
    this.api.toggleUserActive(u.id).subscribe(() => {
      this.flash('Status do usuário alterado.');
      this.loadUsers();
    });
  }

  resolve(r: Report): void {
    this.api.resolveReport(r.id).subscribe(() => {
      this.flash('Reporte resolvido.');
      this.loadReports();
    });
  }

  private flash(text: string): void {
    this.error.set('');
    this.msg.set(text);
    setTimeout(() => this.msg.set(''), 3000);
  }
}
