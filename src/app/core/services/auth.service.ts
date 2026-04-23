import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

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
}

export interface AuthResponse {
  token: string;
  type: string;
  user: User;
}

// Respuesta del endpoint /check
export interface PatientCheckResponse {
  status: 'EXISTS_VERIFIED' | 'EXISTS_UNVERIFIED' | 'NOT_FOUND';
  message: string;
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
  readonly currentUser = signal<User | null>(this.getStoredUser());

  // ─── Login CRM (Personal Clínico) ─────────────────────────────────────────
  login(credentials: { user: string; nip: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap(response => {
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
      tap(response => this.saveSession(response))
    );
  }

  completePatientProfile(data: { telefono: string; email: string; nip: string; genero: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.PATIENT_API}/complete-profile`, data).pipe(
      tap(response => this.saveSession(response))
    );
  }

  registerPatient(data: { nombreCompleto: string; telefono: string; email: string; nip: string; genero: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.PATIENT_API}/register`, data).pipe(
      tap(response => this.saveSession(response))
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUser.set(null);
    this.router.navigate(['/']);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
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
