import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, of, tap } from 'rxjs';
import { AuthService } from './auth.service';

export interface DaySchedule {
  day: string;
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface UserConfig {
  professionalName: string;
  professionalCedula: string;
  cancellationWindow: number;
  weeklySchedule: DaySchedule[];
}

// Mapeo entre frontend (español) y backend (inglés)
const DAY_MAP: Record<string, string> = {
  'Lunes': 'monday',
  'Martes': 'tuesday',
  'Miércoles': 'wednesday',
  'Jueves': 'thursday',
  'Viernes': 'friday',
  'Sábado': 'saturday',
  'Domingo': 'sunday'
};

const REV_DAY_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(DAY_MAP).map(([k, v]) => [v, k])
);

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly API_URL = `${environment.apiUrl}/clinical-config`;

  private readonly _config = signal<UserConfig>({
    professionalName: '',
    professionalCedula: '',
    cancellationWindow: 24,
    weeklySchedule: [
      { day: 'Lunes', enabled: false, startTime: '09:00', endTime: '18:00' },
      { day: 'Martes', enabled: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Miércoles', enabled: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Jueves', enabled: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Viernes', enabled: true, startTime: '09:00', endTime: '18:00' },
      { day: 'Sábado', enabled: true, startTime: '09:00', endTime: '14:00' },
      { day: 'Domingo', enabled: false, startTime: '09:00', endTime: '18:00' }
    ]
  });

  readonly config = this._config.asReadonly();

  readonly isIdentityComplete = computed(() => {
    const cfg = this._config();
    return cfg.professionalName?.trim().length > 0 && cfg.professionalCedula?.trim().length > 0;
  });

  /**
   * Carga la configuración desde el servidor
   */
  loadConfig(sucursalId?: string) {
    const sid = sucursalId || this.authService.currentUser()?.sucursalIdPrincipal;
    const url = sid ? `${this.API_URL}?sucursalId=${sid}` : this.API_URL;

    return this.http.get<any>(url).pipe(
      tap(response => {
        if (response.ok && response.result) {
          this.updateStateFromBackend(response.result);
        }
      }),
      catchError(err => {
        console.error('Error loading config:', err);
        return of(null);
      })
    );
  }

  /**
   * Persiste la configuración en el servidor
   */
  updateConfig(newConfig: UserConfig, sucursalId?: string) {
    const sid = sucursalId || this.authService.currentUser()?.sucursalIdPrincipal;
    const url = sid ? `${this.API_URL}?sucursalId=${sid}` : this.API_URL;
    const payload = this.mapToBackend(newConfig);

    return this.http.put<any>(url, payload).pipe(
      tap(response => {
        if (response.ok) {
          this._config.set(newConfig);
        }
      })
    );
  }

  private updateStateFromBackend(res: any) {
    const schedule: DaySchedule[] = [
      'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
    ].map(dayName => {
      const engKey = DAY_MAP[dayName];
      const backDay = res.horarios?.[engKey];
      return {
        day: dayName,
        enabled: backDay?.active ?? false,
        startTime: backDay?.startTime ?? '09:00',
        endTime: backDay?.endTime ?? '18:00'
      };
    });

    this._config.set({
      professionalName: res.nombreCompleto ?? '',
      professionalCedula: res.cedulaProfesional ?? '',
      cancellationWindow: res.ventanaCancelacion ?? 24,
      weeklySchedule: schedule
    });
  }

  private mapToBackend(config: UserConfig) {
    const horarios: any = {};
    config.weeklySchedule.forEach(ds => {
      const engKey = DAY_MAP[ds.day];
      horarios[engKey] = {
        active: ds.enabled,
        startTime: ds.startTime,
        endTime: ds.endTime
      };
    });

    return {
      nombreCompleto: config.professionalName,
      cedulaProfesional: config.professionalCedula,
      ventanaCancelacion: config.cancellationWindow,
      horarios: horarios
    };
  }
}
