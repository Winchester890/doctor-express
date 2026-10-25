import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'patient',
    canActivate: [authGuard, roleGuard(['patient'])],
    loadComponent: () =>
      import('./pages/patient/patient-dashboard.component').then((m) => m.PatientDashboardComponent),
  },
  {
    path: 'provider',
    canActivate: [authGuard, roleGuard(['provider'])],
    loadComponent: () =>
      import('./pages/provider/provider-dashboard.component').then(
        (m) => m.ProviderDashboardComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
  },
  { path: '**', redirectTo: 'login' },
];
