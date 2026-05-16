import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  const platformId = inject(PLATFORM_ID);

  // Si estamos en el servidor, permitir pasar (la validación real ocurrirá en el cliente)
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Si no hay sesión activa, redirigir al login conservando la ruta destino
  if (!authService.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const isPatient = authService.isPatient();
  const user = authService.currentUser();
  const targetUrl = state.url;

  // ─── Onboarding: Si el staff no ha completado el onboarding, forzarlo ─────
  if (!isPatient && user && !user.onboardingCompletado && targetUrl !== '/onboarding') {
    console.warn('Onboarding pendiente. Redirigiendo...');
    router.navigate(['/onboarding']);
    return false;
  }

  // ─── Onboarding: Si ya se completó, no dejar entrar a /onboarding ──────────
  if (user?.onboardingCompletado && targetUrl === '/onboarding') {
    router.navigate(['/dashboard']);
    return false;
  }

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
