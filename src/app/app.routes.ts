import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home';
import { AdminLayoutComponent } from './core/layouts/admin-layout/admin-layout';
import { AppointmentsComponent } from './features/appointments/appointments';
import { PatientsComponent } from './features/patients/patients';
import { LoginComponent } from './features/auth/login/login';
import { BookingComponent } from './features/booking/booking';
import { LandingComponent } from './features/landing/landing';
import { ServicesComponent } from './features/services/services';
import { authGuard } from './core/guards/auth.guard';
import { publicGuard } from './core/guards/public.guard';
import { UsuariosComponent } from './features/usuarios/usuarios';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    title: 'Dental Sonrisana | Dra. Sarai Rios'
  },
  {
    path: 'booking',
    component: BookingComponent,
    title: 'Agendar Cita | Dental Sonrisana'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Login - MEYISOFT POS',
    canActivate: [publicGuard]
  },
  {
    path: 'dashboard',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: HomeComponent,
        title: 'Dashboard | Dra. Sarai Rios'
      },
      {
        path: 'patients',
        component: PatientsComponent,
        title: 'Clientes | Dra. Sarai Rios'
      },
      {
        path: 'appointments',
        component: AppointmentsComponent,
        title: 'Calendario | Dra. Sarai Rios'
      },
      {
        path: 'services',
        component: ServicesComponent,
        title: 'Servicios | Dra. Sarai Rios'
      },
      {
        path: 'users',
        component: UsuariosComponent,
        title: 'Gestión de Usuarios | MEYISOFT POS'
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
