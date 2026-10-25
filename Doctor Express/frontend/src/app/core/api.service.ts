import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Service,
  ServiceRequest,
  Rating,
  User,
  Report,
  AuditLog,
  ClinicOption,
  AddressOption,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = '/api';

  constructor(private http: HttpClient) {}

  // Clínicas (público — usado em dropdowns de cadastro)
  listClinics(): Observable<ClinicOption[]> {
    return this.http.get<ClinicOption[]>(`${this.base}/auth/clinics`);
  }

  // Endereços (RF10 — catálogo simulado de Barueri, substitui Google Maps Geocoding)
  listAddresses(): Observable<AddressOption[]> {
    return this.http.get<AddressOption[]>(`${this.base}/auth/addresses`);
  }

  // Serviços
  listServices(filters: {
    category?: string;
    specialty?: string;
    city?: string;
    min_rating?: number;
  } = {}): Observable<Service[]> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params = params.set(k, String(v));
      }
    });
    return this.http.get<Service[]>(`${this.base}/services`, { params });
  }

  myServices(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.base}/services/mine`);
  }

  createService(payload: Partial<Service>): Observable<Service> {
    return this.http.post<Service>(`${this.base}/services`, payload);
  }

  updateService(id: number, payload: Partial<Service>): Observable<Service> {
    return this.http.put<Service>(`${this.base}/services/${id}`, payload);
  }

  deleteService(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/services/${id}`);
  }

  // Solicitações
  match(payload: { category?: string; specialty?: string; city?: string }) {
    return this.http.post<{ service: Service; provider: User; score: number }[]>(
      `${this.base}/requests/match`,
      payload,
    );
  }

  createRequest(payload: { service_id: number; notes?: string }): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${this.base}/requests`, payload);
  }

  myRequests(): Observable<ServiceRequest[]> {
    return this.http.get<ServiceRequest[]>(`${this.base}/requests/mine`);
  }

  acceptRequest(id: number): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${this.base}/requests/${id}/accept`, {});
  }
  refuseRequest(id: number): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${this.base}/requests/${id}/refuse`, {});
  }
  completeRequest(id: number): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${this.base}/requests/${id}/complete`, {});
  }
  cancelRequest(id: number, reason?: string): Observable<ServiceRequest> {
    return this.http.post<ServiceRequest>(`${this.base}/requests/${id}/cancel`, { reason });
  }

  // Avaliações
  rate(payload: { request_id: number; score: number; comment?: string }): Observable<Rating> {
    return this.http.post<Rating>(`${this.base}/ratings`, payload);
  }

  ratingsByProvider(providerId: number) {
    return this.http.get<{ average: number; count: number; items: Rating[] }>(
      `${this.base}/ratings/provider/${providerId}`,
    );
  }

  // Reportes (RF12)
  report(payload: { target_user_id: number; reason: string }): Observable<Report> {
    return this.http.post<Report>(`${this.base}/admin/reports`, payload);
  }

  // Admin
  listUsers(role?: string): Observable<User[]> {
    let params = new HttpParams();
    if (role) params = params.set('role', role);
    return this.http.get<User[]>(`${this.base}/admin/users`, { params });
  }
  createUser(
    payload: Partial<User> & { password: string; address_id?: string | null },
  ): Observable<User> {
    return this.http.post<User>(`${this.base}/admin/users`, payload);
  }
  validateProvider(userId: number): Observable<User> {
    return this.http.post<User>(`${this.base}/admin/users/${userId}/validate`, {});
  }
  toggleUserActive(userId: number): Observable<User> {
    return this.http.post<User>(`${this.base}/admin/users/${userId}/toggle-active`, {});
  }
  listReports(): Observable<Report[]> {
    return this.http.get<Report[]>(`${this.base}/admin/reports`);
  }
  resolveReport(id: number): Observable<Report> {
    return this.http.post<Report>(`${this.base}/admin/reports/${id}/resolve`, {});
  }
  listLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.base}/admin/logs`);
  }
}
