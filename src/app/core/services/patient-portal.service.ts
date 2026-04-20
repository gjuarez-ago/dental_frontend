import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface CitaPatient {
  id: string;
  folio: string;
  clinicaNombre: string;
  sucursalNombre: string;
  servicioNombre: string;
  fechaHora: string;
  estado: string;
  montoBase: number;
  montoPagado: number;
  saldoPendiente: number;
  permiteCancelar: boolean;
  mensajeCancelacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PatientPortalService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/patient`;

  getMyAppointments(): Observable<ApiResponse<CitaPatient[]>> {
    return this.http.get<ApiResponse<CitaPatient[]>>(`${this.API_URL}/my-appointments`);
  }

  cancelAppointment(id: string, motivo: string): Observable<ApiResponse<string>> {
    return this.http.patch<ApiResponse<string>>(`${this.API_URL}/appointments/${id}/cancel`, motivo);
  }

  setupProfile(newPin: string, email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.API_URL}/setup-profile`, { newPin, email });
  }
}
