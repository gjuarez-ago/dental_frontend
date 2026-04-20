import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, Subject, map } from 'rxjs';
import { Cita, AppointmentStatus } from '../models/appointment.model';
import { ApiResponse } from './patient.service';

export interface DashboardStats {
  ingresosPorValidar: number;
  comprobantesPendientesCount: number;
  ingresosHoy: number;
  ingresosHoyTrend: number;
  citasHoyCount: number;
  citasHoyTrend: number;
  pacientesNuevosCount: number;
  pacientesNuevosTrend: number;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/citas`;

  // Subject que notifica a cualquier componente suscrito cuando una cita fue guardada
  private readonly _citaGuardada$ = new Subject<Cita>();
  readonly citaGuardada$ = this._citaGuardada$.asObservable();

  /** Emitir manualmente que una cita fue guardada (para recargar listas) */
  notificarCitaGuardada(cita: Cita): void {
    this._citaGuardada$.next(cita);
  }

  getCitas(sucursalId: string, start: string, end: string, doctorId?: string): Observable<Cita[]> {
    let params = new HttpParams()
      .set('sucursalId', sucursalId)
      .set('start', start)
      .set('end', end);

    if (doctorId) {
      params = params.set('doctorId', doctorId);
    }

    return this.http.get<ApiResponse<Cita[]>>(this.apiUrl, { params }).pipe(
      map(res => res.ok ? res.result : [])
    );
  }

  getDoctores(): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/doctores`).pipe(
      map(res => res.ok ? res.result : [])
    );
  }

  agendarCita(cita: Cita): Observable<Cita | null> {
    return this.http.post<ApiResponse<Cita>>(this.apiUrl, cita).pipe(
      map(res => res.ok ? res.result : null)
    );
  }

  actualizarEstado(id: string, estado: AppointmentStatus, montoTotal?: number): Observable<Cita | null> {
    let params = new HttpParams().set('estado', estado);
    if (montoTotal !== undefined && montoTotal !== null) {
      params = params.set('montoTotal', montoTotal.toString());
    }
    return this.http.patch<ApiResponse<Cita>>(`${this.apiUrl}/${id}/estado`, {}, { params }).pipe(
      map(res => res.ok ? res.result : null)
    );
  }
  
  getPorConfirmar(sucursalId?: string): Observable<Cita[]> {
    let params = new HttpParams();
    if (sucursalId) params = params.set('sucursalId', sucursalId);
    
    return this.http.get<ApiResponse<Cita[]>>(`${this.apiUrl}/por-confirmar`, { params }).pipe(
      map(res => res.ok ? res.result : [])
    );
  }

  getDashboardSummary(doctorId?: string): Observable<DashboardStats | null> {
    let params = new HttpParams();
    if (doctorId) {
      params = params.set('doctorId', doctorId);
    }
    return this.http.get<ApiResponse<DashboardStats>>(`${this.apiUrl}/dashboard-summary`, { params }).pipe(
      map(res => res.ok ? res.result : null)
    );
  }

  confirmarCita(id: string, doctorId: string, montoTotal?: number): Observable<ApiResponse<Cita>> {
    let params = new HttpParams().set('doctorId', doctorId);
    if (montoTotal !== undefined && montoTotal !== null) {
      params = params.set('montoTotal', montoTotal.toString());
    }
    return this.http.patch<ApiResponse<Cita>>(`${this.apiUrl}/${id}/confirmar`, {}, { params });
  }

  rechazarCita(id: string, motivo: string): Observable<ApiResponse<Cita>> {
    const params = new HttpParams().set('motivo', motivo);
    return this.http.patch<ApiResponse<Cita>>(`${this.apiUrl}/${id}/rechazar`, {}, { params });
  }

  cancelarCita(id: string, motivo: string): Observable<ApiResponse<Cita>> {
    const params = new HttpParams().set('motivo', motivo);
    return this.http.patch<ApiResponse<Cita>>(`${this.apiUrl}/${id}/cancelar`, {}, { params });
  }

  reprogramarCita(id: string, fechaHora: string, duracionMinutos: number): Observable<ApiResponse<Cita>> {
    const params = new HttpParams()
      .set('nuevaFechaHora', fechaHora)
      .set('nuevaDuracion', duracionMinutos.toString());
    return this.http.put<ApiResponse<Cita>>(`${this.apiUrl}/${id}/reprogramar`, {}, { params });
  }
}
