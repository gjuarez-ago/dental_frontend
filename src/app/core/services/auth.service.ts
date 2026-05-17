import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface User {
  id: string;
  tenantId?: string;
  sucursalIdPrincipal?: string;
  rol?: string; // Para usuarios CRM
  role?: string; // Para pacientes (según claims del JWT)
  nombreCompleto: string;
  email: string | null;
  telefono: string; // Para pacientes
  telefonoContacto?: string; // Para usuarios CRM
  pinCambiado?: boolean;
  emailVerificado?: boolean;
  onboardingCompletado?: boolean;
  tenantType?: string;
  giro?: string;
  planSuscripcion?: string;
  nombreComercial?: string | null;
  sucursalTelefono?: string | null;
  estadoId?: string;
  municipioId?: string;
  fotografiaUrl?: string | null;
  biografia?: string | null;
  fechaNacimiento?: string;
  genero?: string | null;
  cedulaProfesional?: string | null;
}

export interface AuthResponse {
  token: string;
  type: string;
  user: User;
  giro?: string;
  plan?: string;
}

// Respuesta del endpoint /check
export interface PatientCheckResponse {
  status: 'EXISTS_VERIFIED' | 'EXISTS_UNVERIFIED' | 'NOT_FOUND' | 'STAFF_FOUND';
  message: string;
}

export interface EmailCheckResponse {
  status: 'STAFF_FOUND' | 'PATIENT_FOUND' | 'NOT_FOUND';
  message: string;
}

export type TenantType = 'CONSULTORIO' | 'EMPRESA' | 'DOCTOR_INDEPENDIENTE';

export interface RegisterTenantPayload {
  tenantName: string;
  tenantType: TenantType;
  giro: string;
  ciudad?: string;
  adminEmail: string;
  adminPhone: string;
  adminFullName: string;
  adminNip: string;
  sucursalDireccion: string;
  sucursalTelefono?: string;
  estadoId?: string;
  municipioId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly API_URL = `${environment.apiUrl}/public/auth/crm`;
  private readonly PATIENT_API = `${environment.apiUrl}/public/patient-auth`;

  // Signal para el estado reactivo del usuario
  readonly currentUser = signal<User | null>(null);

  constructor() {
    // Inicializar el estado inmediatamente si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token && this.isTokenExpired(token)) {
        console.warn('Sesión expirada detectada al inicio. Limpiando...');
        this.logout();
      } else {
        const storedUser = this.getStoredUser();
        if (storedUser) {
          this.currentUser.set(storedUser);
        }
      }
    }
  }

  // ─── Login CRM (Personal Clínico) ─────────────────────────────────────────
  // El campo `user` acepta correo o teléfono. Email tiene prioridad.
  login(credentials: { user: string; nip: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
        if (!response.token) throw response;
        this.saveSession(response);
      })
    );
  }

  // ─── Registro público de Tenant (SaaS) ────────────────────────────────────
  checkEmailAvailability(email: string): Observable<EmailCheckResponse> {
    return this.http.post<EmailCheckResponse>(`${this.API_URL}/check-email`, { email });
  }

  registerTenant(payload: RegisterTenantPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, payload).pipe(
      tap(response => {
        if (!response.token) throw response;
        this.saveSession(response);
      })
    );
  }

  // ─── Flujo de Autenticación de Pacientes ──────────────────────────────────
  checkPatientPhone(telefono: string): Observable<PatientCheckResponse> {
    return this.http.post<PatientCheckResponse>(`${this.PATIENT_API}/check`, { telefono });
  }

  patientLogin(user: string, nip: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.PATIENT_API}/login`, { user, nip }).pipe(
      tap(response => {
        if (!response.token) throw response;
        this.saveSession(response);
      })
    );
  }

  completePatientProfile(data: { telefono: string; email: string; nip: string; genero: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.PATIENT_API}/complete-profile`, data).pipe(
      tap(response => {
        if (!response.token) throw response;
        this.saveSession(response);
      })
    );
  }

  registerPatient(data: { nombreCompleto: string; telefono: string; email: string; nip: string; genero: string; fechaNacimiento?: string; estadoId?: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.PATIENT_API}/register`, data).pipe(
      tap(response => {
        if (!response.token) throw response;
        this.saveSession(response);
      })
    );
  }

  setupAccess(data: { telefono: string; email: string }): Observable<AuthResponse & { temporaryPin?: string }> {
    return this.http.post<AuthResponse & { temporaryPin?: string }>(`${this.PATIENT_API}/setup-access`, data).pipe(
      tap(response => {
        if (!response.token) throw response;
        this.saveSession(response);
      })
    );
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/']);
  }

  clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    // Leer currentUser() establece dependencia reactiva: cuando logout()
    // hace currentUser.set(null), los computed() que llaman isLoggedIn()
    // recalculan automáticamente.
    if (!this.currentUser()) return false;
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  isTokenExpired(token: string): boolean {
    if (!token) return true;
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return true;
      
      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      
      if (!payload.exp) return false;
      
      const expirationDate = payload.exp * 1000;
      // Añadir un margen de 10 segundos para evitar problemas de sincronización
      return Date.now() >= (expirationDate - 10000);
    } catch (e) {
      console.error('Error al decodificar token:', e);
      return true;
    }
  }

  /**
   * Obtiene el rol del usuario actual (soporta ambos formatos: CRM y Paciente).
   */
  getUserRole(): string | null {
    const user = this.currentUser();
    if (!user) return null;
    return user.rol || user.role || null;
  }

  /**
   * Determina la ruta de inicio según el rol del usuario autenticado.
   * Pacientes → /mis-citas | Staff → /dashboard
   */
  getHomeRoute(): string {
    const role = this.getUserRole();
    return role === 'PACIENTE' ? '/mis-citas' : '/dashboard';
  }

  /**
   * Verifica si el usuario actual es un paciente.
   */
  isPatient(): boolean {
    return this.getUserRole() === 'PACIENTE';
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

  private saveSession(response: AuthResponse): void {
    // Enriquecer el user con el role del JWT si no viene en el objeto
    const user = { ...response.user };
    
    // Si viene el giro o el plan en la respuesta raíz, los inyectamos al usuario
    if (response.giro) {
      user.giro = response.giro;
    }
    if (response.plan) {
      user.planSuscripcion = response.plan;
    }

    if (!user.rol && !user.role) {
      const roleFromToken = this.extractRoleFromToken(response.token);
      if (roleFromToken) {
        user.role = roleFromToken;
      }
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    this.currentUser.set(user);
  }

  /**
   * Actualiza el estado del usuario actual tanto en el Signal como en localStorage.
   */
  updateUserState(partial: Partial<User>): void {
    const current = this.currentUser();
    if (current) {
      const updated = { ...current, ...partial };
      this.currentUser.set(updated);
      
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('user', JSON.stringify(updated));
      }
    }
  }

  /**
   * Decodifica el payload del JWT (sin verificar firma) para extraer el claim 'role'.
   * Esto es seguro en el frontend porque la verificación de firma se hace en el backend.
   */
  private extractRoleFromToken(token: string): string | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.role || decoded.rol || null;
    } catch {
      return null;
    }
  }

  private getStoredUser(): User | null {
    if (isPlatformBrowser(this.platformId)) {
      const userJson = localStorage.getItem('user');
      if (!userJson) return null;
      try {
        const user: User = JSON.parse(userJson);
        // Enriquecer con role del JWT si no viene en el objeto guardado
        if (!user.rol && !user.role) {
          const token = localStorage.getItem('token');
          if (token) {
            const roleFromToken = this.extractRoleFromToken(token);
            if (roleFromToken) {
              user.role = roleFromToken;
              // Actualizar localStorage con el role enriquecido
              localStorage.setItem('user', JSON.stringify(user));
            }
          }
        }
        return user;
      } catch {
        return null;
      }
    }
    return null;
  }
}
