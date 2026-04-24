import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface CitaPatient {
  id: string;
  folio: string;
  clinicaNombre: string;
  sucursalNombre: string;
  sucursalTelefono?: string;
  servicioNombre: string;
  fechaHora: string;
  estado: string;
  montoBase: number;
  montoPagado: number;
  saldoPendiente: number;
  permiteCancelar: boolean;
  mensajeCancelacion?: string;
}

export interface ServicioItem {
  id: string;
  nombre: string;
  descripcion: string;
  precioBase: number;
  duracionMinutos: number;
  colorEtiqueta: string;
}

export interface SlotItem {
  horaInicio: string; // "09:00"
  horaFin: string;    // "09:30"
  disponible: boolean;
}

export interface DiaDisponibilidad {
  fecha: string;
  estaLlena: boolean;
  esLaboral: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PatientPortalService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/patient`;
  private readonly PUBLIC_URL = `${environment.apiUrl}/public`;

  // ─── Endpoints protegidos (requieren token) ──────────────────────
  getMyAppointments(): Observable<ApiResponse<CitaPatient[]>> {
    return this.http.get<ApiResponse<CitaPatient[]>>(`${this.API_URL}/my-appointments`);
  }

  cancelAppointment(id: string, motivo: string): Observable<ApiResponse<string>> {
    return this.http.patch<ApiResponse<string>>(`${this.API_URL}/appointments/${id}/cancel`, motivo);
  }

  setupProfile(newPin: string, email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/setup-profile`, { newPin, email });
  }

  bookAppointment(data: { 
    servicioId: string; 
    fechaHora: string; 
    motivoConsulta?: string;
    referenciaPago: string;
    montoAnticipo: number;
  }, file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('cita', JSON.stringify(data));
    formData.append('file', file);
    
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/book`, formData);
  }

  getMyClinic(): Observable<ApiResponse<{
    tenantId: string; 
    sucursalId: string;
    banco?: string;
    cuentaBancaria?: string;
    clabeInterbancaria?: string;
    telefono?: string;
  }>> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/my-clinic`);
  }

  // ─── Endpoints públicos (sin token, para servicios y disponibilidad) ──
  getServicios(tenantId: string): Observable<ApiResponse<ServicioItem[]>> {
    return this.http.get<ApiResponse<ServicioItem[]>>(`${this.PUBLIC_URL}/servicios`, {
      params: new HttpParams().set('tenantId', tenantId)
    });
  }

  getDisponibilidadMes(tenantId: string, sucursalId: string, mes: number, anio: number): Observable<ApiResponse<DiaDisponibilidad[]>> {
    return this.http.get<ApiResponse<DiaDisponibilidad[]>>(`${this.PUBLIC_URL}/agenda/disponibilidad-mes`, {
      params: new HttpParams()
        .set('tenantId', tenantId)
        .set('sucursalId', sucursalId)
        .set('mes', mes)
        .set('anio', anio)
    });
  }

  getSlotsDisponibles(tenantId: string, sucursalId: string, fecha: string, servicioId: string): Observable<ApiResponse<SlotItem[]>> {
    return this.http.get<ApiResponse<SlotItem[]>>(`${this.PUBLIC_URL}/agenda/slots-disponibles`, {
      params: new HttpParams()
        .set('tenantId', tenantId)
        .set('sucursalId', sucursalId)
        .set('fecha', fecha)
        .set('servicioId', servicioId)
    });
  }
}

