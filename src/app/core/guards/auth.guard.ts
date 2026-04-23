import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas que requieren autenticación.
 * Además, valida que un paciente no pueda acceder a rutas del CRM
 * ni que el staff acceda a rutas del portal de pacientes.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si no hay sesión activa, redirigir al login
  if (!authService.isLoggedIn()) {
    console.warn('Acceso denegado. Redirigiendo al login...');
    router.navigate(['/login']);
    return false;
  }

  const isPatient = authService.isPatient();
  const targetUrl = state.url;

  // ─── Seguridad: Un paciente NO puede acceder al dashboard del CRM ─────
  if (isPatient && targetUrl.startsWith('/dashboard')) {
    console.warn('Paciente intentó acceder al CRM. Redirigiendo a /mis-citas...');
    router.navigate(['/mis-citas']);
    return false;
  }

  // ─── Seguridad: El staff NO puede acceder al portal de pacientes ──────
  if (!isPatient && targetUrl.startsWith('/mis-citas')) {
    console.warn('Staff intentó acceder al portal de pacientes. Redirigiendo al dashboard...');
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
