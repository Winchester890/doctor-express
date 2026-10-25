import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Service, ServiceRequest } from '../../core/models';
import { AppHeaderComponent } from '../../shared/app-header.component';

@Component({
  selector: 'app-provider-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent],
  template: `
    <app-header />

    <main class="container" aria-label="Painel do prestador">
      <h1>Olá, {{ auth.user()?.name }}</h1>

      @if (!auth.user()?.validated) {
        <div class="alert alert-info">
          Suas credenciais ainda não foram validadas pelo administrador (RN01). Você só poderá publicar
          serviços após a validação.
        </div>
      }

      <nav class="tabs row" role="tablist">
        <button [class.active]="tab() === 'services'" (click)="tab.set('services')">
          Meus serviços
        </button>
        <button [class.active]="tab() === 'requests'" (click)="loadRequests(); tab.set('requests')">
          Solicitações recebidas
        </button>
        <button [class.active]="tab() === 'patient'" (click)="tab.set('patient')">
          Cadastrar paciente
        </button>
      </nav>

      @if (msg()) {
        <div class="alert alert-success" role="status">{{ msg() }}</div>
      }
      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (tab() === 'services') {
        <section class="card">
          <h2>Publicar serviço (RF03)</h2>
          <form (ngSubmit)="createService()" #f="ngForm">
            <div class="row">
              <div class="field" style="flex:2; min-width:240px">
                <label>Título</label>
                <input [(ngModel)]="newSvc.title" name="title" required />
              </div>
              <div class="field" style="flex:1; min-width:160px">
                <label>Categoria</label>
                <input [(ngModel)]="newSvc.category" name="category" placeholder="Consulta, Exame..." required />
              </div>
              <div class="field" style="flex:1; min-width:160px">
                <label>Especialidade</label>
                <input [(ngModel)]="newSvc.specialty" name="specialty" required />
              </div>
              <div class="field" style="flex:1; min-width:160px">
                <label>Cidade</label>
                <input [(ngModel)]="newSvc.city" name="city" required />
              </div>
            </div>
            <div class="field">
              <label>Descrição</label>
              <textarea rows="2" [(ngModel)]="newSvc.description" name="description" required></textarea>
            </div>
            <div class="field">
              <label>Disponibilidade</label>
              <input
                [(ngModel)]="newSvc.availability"
                name="availability"
                placeholder="Ex.: Seg/Qua 09h-12h"
              />
            </div>
            <button type="submit" [disabled]="!f.form.valid || !auth.user()?.validated">
              Publicar
            </button>
          </form>
        </section>

        <h2 style="margin-top:24px">Serviços da equipe</h2>
        <p class="muted" style="margin-top:-4px">
          Lista compartilhada entre a clínica/hospital e todos os prestadores vinculados.
        </p>
        @if (myServices().length === 0) {
          <p class="muted">Nenhum serviço publicado.</p>
        }
        <div class="grid">
          @for (s of myServices(); track s.id) {
            <article class="card">
              <span class="author-tag">
                Publicado por: {{ s.provider_name }}
                @if (s.provider_id === auth.user()?.id) { <em>(você)</em> }
              </span>
              <h3>{{ s.title }}</h3>
              <p class="muted">{{ s.specialty }} • {{ s.city }} • {{ s.category }}</p>
              <p>{{ s.description }}</p>
              <p><strong>Disponibilidade:</strong> {{ s.availability || '—' }}</p>
              <p><strong>Avaliação:</strong> {{ s.average_rating }} ★ ({{ s.rating_count }})</p>
              <div class="row">
                <button class="btn-warning" (click)="toggleActive(s)">
                  {{ s.active ? 'Desativar' : 'Ativar' }}
                </button>
                <button class="btn-danger" (click)="removeService(s)">Excluir</button>
              </div>
            </article>
          }
        </div>
      }

      @if (tab() === 'patient') {
        <section class="card">
          <h2>Cadastrar paciente</h2>
          <p class="muted">
            Cadastre um novo paciente diretamente pela plataforma. O paciente poderá fazer login
            usando as credenciais informadas.
          </p>

          <form (ngSubmit)="createPatient()" #pf="ngForm" novalidate>
            <div class="row">
              <div class="field" style="flex:2; min-width:240px">
                <label>Nome completo</label>
                <input name="pname" type="text" [(ngModel)]="newPatient.name" required />
              </div>
              <div class="field" style="flex:2; min-width:200px">
                <label>E-mail</label>
                <input name="pemail" type="email" [(ngModel)]="newPatient.email" required />
              </div>
            </div>
            <div class="row">
              <div class="field" style="flex:1; min-width:160px">
                <label>Senha (mín. 6 caracteres)</label>
                <input
                  name="ppassword"
                  type="text"
                  minlength="6"
                  [(ngModel)]="newPatient.password"
                  required
                />
              </div>
              <div class="field" style="flex:1; min-width:160px">
                <label>Cidade</label>
                <input name="pcity" type="text" [(ngModel)]="newPatient.city" />
              </div>
            </div>
            <button type="submit" [disabled]="!pf.form.valid || savingPatient()">
              {{ savingPatient() ? 'Cadastrando...' : 'Cadastrar paciente' }}
            </button>
          </form>
        </section>
      }

      @if (tab() === 'requests') {
        <section class="card">
          <h2>Solicitações da equipe</h2>
          <p class="muted">
            Solicitações direcionadas à clínica/hospital ou a qualquer prestador vinculado.
            Qualquer membro da equipe pode aceitar, recusar ou concluir.
          </p>
          @if (requests().length === 0) {
            <p class="muted">Nenhuma solicitação no momento.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Paciente</th>
                  <th>Serviço</th>
                  <th>Direcionado a</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (r of requests(); track r.id) {
                  <tr>
                    <td>{{ r.id }}</td>
                    <td>{{ r.patient_name }}</td>
                    <td>{{ r.service_title }}<br /><small class="muted">{{ r.notes }}</small></td>
                    <td>
                      {{ r.provider_name }}
                      @if (r.provider_id === auth.user()?.id) { <em>(você)</em> }
                    </td>
                    <td><span class="badge badge-{{ r.status }}">{{ statusLabel(r.status) }}</span></td>
                    <td>
                      @if (r.status === 'pending') {
                        <button class="btn-success" (click)="accept(r)">Aceitar</button>
                        <button class="btn-secondary" (click)="refuse(r)">Recusar</button>
                      }
                      @if (r.status === 'accepted') {
                        <button class="btn-success" (click)="complete(r)">Concluir</button>
                      }
                    </td>
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
      .author-tag {
        display: inline-block;
        background: #f3f4f6;
        color: #374151;
        font-size: 12px;
        font-weight: 500;
        padding: 3px 10px;
        border-radius: 6px;
        margin-bottom: 8px;
      }
      .author-tag em {
        color: var(--primary);
        font-style: normal;
        font-weight: 600;
      }
    `,
  ],
})
export class ProviderDashboardComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);

  tab = signal<'services' | 'requests' | 'patient'>('services');
  myServices = signal<Service[]>([]);
  requests = signal<ServiceRequest[]>([]);

  newSvc: Partial<Service> = {
    title: '',
    description: '',
    category: '',
    specialty: '',
    city: '',
    availability: '',
  };

  newPatient = { name: '', email: '', password: '', city: '' };
  savingPatient = signal(false);

  msg = signal('');
  error = signal('');

  constructor() {
    this.loadServices();
  }

  loadServices(): void {
    this.api.myServices().subscribe((s) => this.myServices.set(s));
  }

  loadRequests(): void {
    this.api.myRequests().subscribe((r) => this.requests.set(r));
  }

  createService(): void {
    this.api.createService(this.newSvc).subscribe({
      next: () => {
        this.flash('Serviço publicado!');
        this.newSvc = {
          title: '',
          description: '',
          category: '',
          specialty: '',
          city: '',
          availability: '',
        };
        this.loadServices();
      },
      error: (e) => this.error.set(e?.error?.error || 'Erro ao publicar.'),
    });
  }

  toggleActive(s: Service): void {
    this.api.updateService(s.id, { active: !s.active }).subscribe(() => this.loadServices());
  }

  removeService(s: Service): void {
    if (!confirm('Excluir este serviço?')) return;
    this.api.deleteService(s.id).subscribe(() => {
      this.flash('Serviço excluído.');
      this.loadServices();
    });
  }

  accept(r: ServiceRequest): void {
    this.api.acceptRequest(r.id).subscribe({
      next: () => {
        this.flash('Solicitação aceita!');
        this.loadRequests();
      },
      error: (e) => this.error.set(e?.error?.error || 'Erro ao aceitar (RF07: pode já estar atribuída).'),
    });
  }

  refuse(r: ServiceRequest): void {
    this.api.refuseRequest(r.id).subscribe(() => {
      this.flash('Solicitação recusada.');
      this.loadRequests();
    });
  }

  complete(r: ServiceRequest): void {
    this.api.completeRequest(r.id).subscribe(() => {
      this.flash('Atendimento concluído. Paciente pode avaliar (RN03).');
      this.loadRequests();
    });
  }

  createPatient(): void {
    this.error.set('');
    this.savingPatient.set(true);
    this.api.createUser({ ...this.newPatient, role: 'patient' }).subscribe({
      next: (u) => {
        this.savingPatient.set(false);
        this.flash(`Paciente ${u.name} cadastrado com sucesso.`);
        this.newPatient = { name: '', email: '', password: '', city: '' };
      },
      error: (e) => {
        this.savingPatient.set(false);
        this.error.set(e?.error?.error || 'Erro ao cadastrar paciente.');
      },
    });
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      pending: 'Pendente',
      accepted: 'Aceita',
      refused: 'Recusada',
      completed: 'Concluída',
      cancelled: 'Cancelada',
    };
    return map[s] || s;
  }

  private flash(text: string): void {
    this.error.set('');
    this.msg.set(text);
    setTimeout(() => this.msg.set(''), 3000);
  }
}
