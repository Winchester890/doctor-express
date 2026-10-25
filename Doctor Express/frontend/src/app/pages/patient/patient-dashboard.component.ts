import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import {
  AddressOption,
  ClinicOption,
  Service,
  ServiceRequest,
} from '../../core/models';
import { AppHeaderComponent } from '../../shared/app-header.component';
import {
  MapPin,
  MapPreviewComponent,
  haversineKm,
} from '../../shared/map-preview.component';

@Component({
  selector: 'app-patient-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AppHeaderComponent, MapPreviewComponent],
  template: `
    <app-header />

    <main class="container" aria-label="Painel do paciente">
      <h1>Olá, {{ auth.user()?.name }}</h1>

      <nav class="tabs row" role="tablist">
        <button [class.active]="tab() === 'search'" (click)="tab.set('search')" role="tab">
          Buscar serviços
        </button>
        <button [class.active]="tab() === 'requests'" (click)="loadRequests(); tab.set('requests')" role="tab">
          Minhas solicitações
        </button>
      </nav>

      @if (msg()) {
        <div class="alert alert-success" role="status">{{ msg() }}</div>
      }
      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (tab() === 'search') {
        <section class="card">
          <h2>📍 Localização (RF10)</h2>
          <p class="muted" style="margin-top:-4px">
            Selecione seu endereço de partida para visualizar prestadores próximos no mapa
            e calcular distâncias.
          </p>
          <div class="row">
            <div class="field" style="flex:2; min-width:260px">
              <label>De onde você está partindo?</label>
              <select [(ngModel)]="patientAddressId" (ngModelChange)="onPatientAddressChange()">
                <option [ngValue]="null">— Não informado —</option>
                @for (a of addresses(); track a.id) {
                  <option [ngValue]="a.id">{{ a.label }}</option>
                }
              </select>
            </div>
            <div class="field" style="flex:1; min-width:140px; display:flex; align-items:end">
              <label class="checkbox">
                <input
                  type="checkbox"
                  [(ngModel)]="sortByDistance"
                  [disabled]="!patientAddress()"
                />
                Ordenar por proximidade
              </label>
            </div>
          </div>

          <app-map-preview [pins]="mapPins()" />
        </section>

        <section class="card" style="margin-top:16px">
          <h2>Filtros (RF09)</h2>
          <div class="row">
            <div class="field" style="flex:2; min-width:200px">
              <label>Clínica / Hospital</label>
              <select [(ngModel)]="filterClinicId" (ngModelChange)="search()">
                <option [ngValue]="null">Todas as clínicas/hospitais</option>
                @for (c of clinics(); track c.id) {
                  <option [ngValue]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
            <div class="field" style="flex:1; min-width:160px">
              <label>Categoria</label>
              <input [(ngModel)]="filterCategory" placeholder="Ex.: consulta" />
            </div>
            <div class="field" style="flex:1; min-width:160px">
              <label>Especialidade</label>
              <input [(ngModel)]="filterSpecialty" placeholder="Ex.: Cardiologia" />
            </div>
            <div class="field" style="flex:1; min-width:160px">
              <label>Cidade</label>
              <input [(ngModel)]="filterCity" placeholder="Ex.: Barueri" />
            </div>
            <div class="field" style="width:140px">
              <label>Avaliação mín.</label>
              <input type="number" min="0" max="5" step="0.5" [(ngModel)]="filterMinRating" />
            </div>
            <div class="field" style="display:flex; align-items:end">
              <button (click)="search()">Buscar</button>
            </div>
          </div>
        </section>

        <h2 style="margin-top:24px">Serviços disponíveis</h2>
        @if (filteredServices().length === 0) {
          <p class="muted">Nenhum serviço encontrado com os filtros atuais.</p>
        }
        <div class="grid">
          @for (s of filteredServices(); track s.id) {
            <article class="card">
              @if (s.clinic_name) {
                <span class="clinic-tag">🏥 {{ s.clinic_name }}</span>
              }
              @if (distanceFor(s); as d) {
                <span class="distance-tag">📏 {{ d }} km</span>
              }
              <h3>{{ s.title }}</h3>
              <p class="muted">{{ s.specialty }} • {{ s.city }}</p>
              @if (s.clinic_address) {
                <p class="muted small">📍 {{ s.clinic_address }}</p>
              }
              <p>{{ s.description }}</p>
              <p>
                <strong>Prestador:</strong> {{ s.provider_name }}<br />
                <strong>Disponibilidade:</strong> {{ s.availability || '—' }}<br />
                <strong>Avaliação:</strong>
                {{ s.average_rating }} ★ ({{ s.rating_count }})
              </p>
              <div class="row">
                <button class="btn-success" (click)="openRequest(s)">Solicitar</button>
                <button class="btn-warning" (click)="openReport(s.provider_id, s.provider_name)">
                  Reportar
                </button>
              </div>
            </article>
          }
        </div>
      }

      @if (tab() === 'requests') {
        <section class="card">
          <h2>Minhas solicitações</h2>
          @if (requests().length === 0) {
            <p class="muted">Você ainda não fez solicitações.</p>
          } @else {
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Serviço</th>
                  <th>Prestador</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (r of requests(); track r.id) {
                  <tr>
                    <td>{{ r.id }}</td>
                    <td>{{ r.service_title }}<br /><small class="muted">{{ r.service_specialty }} - {{ r.service_city }}</small></td>
                    <td>{{ r.provider_name }}</td>
                    <td><span class="badge badge-{{ r.status }}">{{ statusLabel(r.status) }}</span></td>
                    <td>
                      @if (r.status === 'pending' || r.status === 'accepted') {
                        <button class="btn-danger" (click)="cancel(r)">Cancelar</button>
                      }
                      @if (r.status === 'completed') {
                        <button class="btn-success" (click)="openRate(r)">Avaliar</button>
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

    <!-- Modal: solicitar -->
    @if (selectedService()) {
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-req">
        <div class="modal-content card">
          <h2 id="modal-req">Solicitar: {{ selectedService()?.title }}</h2>
          <p class="muted">Prestador: {{ selectedService()?.provider_name }}</p>
          <div class="field">
            <label>Observações (opcional)</label>
            <textarea rows="3" [(ngModel)]="requestNotes"></textarea>
          </div>
          <div class="row" style="justify-content:flex-end">
            <button class="btn-secondary" (click)="selectedService.set(null)">Cancelar</button>
            <button class="btn-success" (click)="confirmRequest()">Confirmar solicitação</button>
          </div>
        </div>
      </div>
    }

    <!-- Modal: avaliar -->
    @if (selectedRequest()) {
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-content card">
          <h2>Avaliar atendimento (RF08)</h2>
          <div class="field">
            <label>Nota (1 a 5)</label>
            <input type="number" min="1" max="5" [(ngModel)]="ratingScore" />
          </div>
          <div class="field">
            <label>Comentário (opcional)</label>
            <textarea rows="3" [(ngModel)]="ratingComment"></textarea>
          </div>
          <div class="row" style="justify-content:flex-end">
            <button class="btn-secondary" (click)="selectedRequest.set(null)">Cancelar</button>
            <button class="btn-success" (click)="confirmRate()">Enviar avaliação</button>
          </div>
        </div>
      </div>
    }

    <!-- Modal: reportar -->
    @if (reportTarget()) {
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-content card">
          <h2>Reportar usuário (RF12)</h2>
          <p class="muted">Alvo: {{ reportTarget()?.name }}</p>
          <div class="field">
            <label>Motivo</label>
            <textarea rows="3" [(ngModel)]="reportReason"></textarea>
          </div>
          <div class="row" style="justify-content:flex-end">
            <button class="btn-secondary" (click)="reportTarget.set(null)">Cancelar</button>
            <button class="btn-warning" (click)="confirmReport()">Enviar reporte</button>
          </div>
        </div>
      </div>
    }
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
      .modal {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
      }
      .modal-content {
        max-width: 500px;
        width: 90%;
      }
      .clinic-tag {
        display: inline-block;
        background: #dbeafe;
        color: #1e3a8a;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 6px;
        margin-bottom: 8px;
      }
      .distance-tag {
        display: inline-block;
        background: #fef3c7;
        color: #78350f;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 6px;
        margin-bottom: 8px;
        margin-left: 6px;
      }
      .small {
        font-size: 12px;
      }
      .checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 0;
        font-weight: 500;
      }
      .checkbox input {
        width: auto;
      }
    `,
  ],
})
export class PatientDashboardComponent {
  auth = inject(AuthService);
  private api = inject(ApiService);

  tab = signal<'search' | 'requests'>('search');

  services = signal<Service[]>([]);
  requests = signal<ServiceRequest[]>([]);
  clinics = signal<ClinicOption[]>([]);
  addresses = signal<AddressOption[]>([]);

  filterCategory = '';
  filterSpecialty = '';
  filterCity = '';
  filterMinRating: number | null = null;
  filterClinicId: number | null = null;
  patientAddressId: string | null = null;
  patientAddressIdSig = signal<string | null>(null);
  sortByDistance = false;

  patientAddress = computed<AddressOption | null>(() => {
    const id = this.patientAddressIdSig();
    return this.addresses().find((a) => a.id === id) ?? null;
  });

  filteredServices = computed(() => {
    const cid = this.filterClinicId;
    let list = this.services();
    if (cid) list = list.filter((s) => s.clinic_id === cid);

    const me = this.patientAddress();
    if (me && this.sortByDistance) {
      list = [...list].sort((a, b) => {
        const da = this.distanceKm(a) ?? Infinity;
        const db = this.distanceKm(b) ?? Infinity;
        return da - db;
      });
    }
    return list;
  });

  /** Pinos do mapa: paciente (azul) + todas as clínicas cadastradas. */
  mapPins = computed<MapPin[]>(() => {
    const pins: MapPin[] = [];
    const me = this.patientAddress();
    if (me) {
      pins.push({
        id: 'me',
        lat: me.lat,
        lng: me.lng,
        label: 'Você está aqui',
        subtitle: me.label,
        type: 'patient',
      });
    }

    const selectedId = this.filterClinicId;
    for (const c of this.clinics()) {
      if (c.latitude == null || c.longitude == null) continue;
      pins.push({
        id: c.id,
        lat: c.latitude,
        lng: c.longitude,
        label: c.name,
        subtitle: c.address || undefined,
        type: c.id === selectedId ? 'highlight' : 'clinic',
      });
    }
    return pins;
  });

  selectedService = signal<Service | null>(null);
  requestNotes = '';

  selectedRequest = signal<ServiceRequest | null>(null);
  ratingScore = 5;
  ratingComment = '';

  reportTarget = signal<{ id: number; name: string } | null>(null);
  reportReason = '';

  msg = signal('');
  error = signal('');

  constructor() {
    this.search();
    this.api.listClinics().subscribe({
      next: (c) => this.clinics.set(c),
      error: () => this.clinics.set([]),
    });
    this.api.listAddresses().subscribe({
      next: (a) => this.addresses.set(a),
      error: () => this.addresses.set([]),
    });
  }

  onPatientAddressChange(): void {
    this.patientAddressIdSig.set(this.patientAddressId);
  }

  /** Distância em km entre o paciente e a clínica do serviço. */
  distanceKm(s: Service): number | null {
    const me = this.patientAddress();
    if (!me || s.clinic_latitude == null || s.clinic_longitude == null) return null;
    return haversineKm(
      { lat: me.lat, lng: me.lng },
      { lat: s.clinic_latitude, lng: s.clinic_longitude },
    );
  }

  distanceFor(s: Service): string | null {
    const km = this.distanceKm(s);
    return km == null ? null : km.toFixed(1);
  }

  search(): void {
    this.api
      .listServices({
        category: this.filterCategory || undefined,
        specialty: this.filterSpecialty || undefined,
        city: this.filterCity || undefined,
        min_rating: this.filterMinRating ?? undefined,
      })
      .subscribe({
        next: (s) => this.services.set(s),
        error: (e) => this.error.set(e?.error?.error || 'Erro ao buscar serviços.'),
      });
  }

  loadRequests(): void {
    this.api.myRequests().subscribe((r) => this.requests.set(r));
  }

  openRequest(s: Service): void {
    this.requestNotes = '';
    this.selectedService.set(s);
  }

  confirmRequest(): void {
    const s = this.selectedService();
    if (!s) return;
    this.api.createRequest({ service_id: s.id, notes: this.requestNotes }).subscribe({
      next: () => {
        this.selectedService.set(null);
        this.flash('Solicitação enviada com sucesso!');
        this.loadRequests();
      },
      error: (e) => this.error.set(e?.error?.error || 'Erro ao solicitar.'),
    });
  }

  cancel(r: ServiceRequest): void {
    let reason: string | undefined;
    if (r.status === 'accepted') {
      const input = window.prompt(
        'Após aceito, é obrigatório informar a justificativa do cancelamento (RN02):',
      );
      if (!input) return;
      reason = input;
    } else if (!confirm('Cancelar esta solicitação?')) {
      return;
    }
    this.api.cancelRequest(r.id, reason).subscribe({
      next: () => {
        this.flash('Solicitação cancelada.');
        this.loadRequests();
      },
      error: (e) => this.error.set(e?.error?.error || 'Erro ao cancelar.'),
    });
  }

  openRate(r: ServiceRequest): void {
    this.ratingScore = 5;
    this.ratingComment = '';
    this.selectedRequest.set(r);
  }

  confirmRate(): void {
    const r = this.selectedRequest();
    if (!r) return;
    this.api
      .rate({ request_id: r.id, score: this.ratingScore, comment: this.ratingComment })
      .subscribe({
        next: () => {
          this.selectedRequest.set(null);
          this.flash('Avaliação enviada. Obrigado!');
          this.loadRequests();
        },
        error: (e) => this.error.set(e?.error?.error || 'Erro ao avaliar.'),
      });
  }

  openReport(targetId: number, targetName: string): void {
    this.reportReason = '';
    this.reportTarget.set({ id: targetId, name: targetName });
  }

  confirmReport(): void {
    const t = this.reportTarget();
    if (!t || !this.reportReason.trim()) {
      this.error.set('Informe o motivo do reporte.');
      return;
    }
    this.api.report({ target_user_id: t.id, reason: this.reportReason }).subscribe({
      next: () => {
        this.reportTarget.set(null);
        this.flash('Reporte enviado ao administrador.');
      },
      error: (e) => this.error.set(e?.error?.error || 'Erro ao reportar.'),
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
