import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface Medicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  instrucciones?: string;
}

export interface ConsultaMedica {
  id?: string;
  citaId: string;
  pacienteId: string;
  doctorId: string;
  doctorNombre?: string;
  cie10Id?: string | null;
  cie10Nombre?: string | null;
  presionArterial?: string | null;
  frecuenciaCardiaca?: number | null;
  frecuenciaRespiratoria?: number | null;
  temperatura?: number | null;
  peso?: number | null;
  talla?: number | null;
  imc?: number | null;
  diagnostico: string;
  procedimientoRealizado: string;
  prescripcionMedica: Medicamento[];
  indicaciones: string;
  observacionesInternas?: string;
  complicaciones?: string | null;
  recetaGenerada?: boolean;
  atencionInicio?: string | null;
  atencionFin?: string | null;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClinicalService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/consultas`;

  guardarConsulta(consulta: ConsultaMedica): Observable<ApiResponse<ConsultaMedica>> {
    return this.http.post<ApiResponse<ConsultaMedica>>(this.apiUrl, consulta);
  }

  obtenerPorCita(citaId: string): Observable<ApiResponse<ConsultaMedica>> {
    return this.http.get<ApiResponse<ConsultaMedica>>(`${this.apiUrl}/cita/${citaId}`);
  }

  obtenerHistorial(pacienteId: string): Observable<ApiResponse<ConsultaMedica[]>> {
    return this.http.get<ApiResponse<ConsultaMedica[]>>(`${this.apiUrl}/paciente/${pacienteId}`);
  }
}
