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
import { roleGuard } from './core/guards/role.guard';
import { UserRole } from './core/models/user-role.enum';
import { UsuariosComponent } from './features/usuarios/usuarios';
import { MyAppointmentsComponent } from './features/patient/my-appointments/my-appointments';
import { MedicalHistoryComponent } from './features/patient/medical-history/medical-history';
import { ContactComponent } from './features/contact/contact';
import { PrivacyComponent } from './features/privacy/privacy';
import { TermsComponent } from './features/terms/terms';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    title: 'Dental Sonrisana'
  },
  {
    path: 'contacto',
    component: ContactComponent,
    title: 'Contacto | Novatia'
  },
  {
    path: 'privacidad',
    component: PrivacyComponent,
    title: 'Aviso de Privacidad | Novatia'
  },
  {
    path: 'terminos',
    component: TermsComponent,
    title: 'Términos y Condiciones | Novatia'
  },
  {
    path: 'booking',
    component: BookingComponent,
    title: 'Agendar Cita | Novatia'
  },
  {
    path: 'agendar/:tenantId',
    loadComponent: () => import('./features/booking/quick-booking/quick-booking').then(m => m.QuickBookingComponent),
    title: 'Agendar Cita Rápida'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Iniciar sesión | Novatia',
    canActivate: [publicGuard]
  },
  {
    path: 'signup',
    loadComponent: () => import('./features/auth/signup/signup').then(m => m.SignupComponent),
    title: 'Crear cuenta | Novatia',
    canActivate: [publicGuard]
  },
  {
    path: 'mis-citas',
    component: MyAppointmentsComponent,
    canActivate: [authGuard],
    title: 'Mis Citas | Portal del Paciente'
  },
  {
    path: 'mi-expediente',
    component: MedicalHistoryComponent,
    canActivate: [authGuard],
    title: 'Mi Expediente | Portal del Paciente'
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
        title: 'Gestión de Usuarios | Dental Sonrisana',
        canActivate: [roleGuard],
        data: { roles: [UserRole.OWNER, UserRole.SUPER_ADMIN] }
      }
    ]
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./features/onboarding/onboarding').then(m => m.OnboardingComponent),
    title: 'Configura tu Consultorio | Novatia',
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' }
];
