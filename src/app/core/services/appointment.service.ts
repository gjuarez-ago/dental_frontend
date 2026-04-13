import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { Cita, AppointmentStatus } from '../models/appointment.model';
import { ApiResponse } from './patient.service';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/citas`;

  getCitas(sucursalId: string, start: string, end: string): Observable<Cita[]> {
    let params = new HttpParams()
      .set('sucursalId', sucursalId)
      .set('start', start)
      .set('end', end);

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
}
