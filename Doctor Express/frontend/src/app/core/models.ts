export type Role = 'patient' | 'provider' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  specialty?: string;
  cnpj?: string;
  crm?: string;
  city?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  clinic_id?: number | null;
  clinic_name?: string | null;
  validated: boolean;
  active: boolean;
  created_at?: string;
}

export interface ClinicOption {
  id: number;
  name: string;
  cnpj: string;
  city: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AddressOption {
  id: string;
  label: string;
  neighborhood: string;
  lat: number;
  lng: number;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface Service {
  id: number;
  provider_id: number;
  provider_name: string;
  provider_validated: boolean;
  clinic_id?: number | null;
  clinic_name?: string | null;
  clinic_address?: string | null;
  clinic_latitude?: number | null;
  clinic_longitude?: number | null;
  title: string;
  description: string;
  category: string;
  specialty: string;
  city: string;
  availability?: string;
  active: boolean;
  average_rating: number;
  rating_count: number;
  created_at?: string;
}

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'refused'
  | 'completed'
  | 'cancelled';

export interface ServiceRequest {
  id: number;
  patient_id: number;
  patient_name: string;
  service_id: number;
  service_title: string;
  service_specialty: string;
  service_city: string;
  provider_id: number;
  provider_name: string;
  status: RequestStatus;
  notes?: string;
  cancel_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Rating {
  id: number;
  request_id: number;
  patient_id: number;
  provider_id: number;
  score: number;
  comment?: string;
  created_at?: string;
}

export interface Report {
  id: number;
  reporter_id: number;
  reporter_name: string;
  target_user_id: number;
  target_user_name: string;
  reason: string;
  status: string;
  created_at?: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  detail?: string;
  created_at?: string;
}
