import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Patient } from '../models/patient.model';
import { map, Observable } from 'rxjs';

export interface ApiResponse<T> {
  ok: boolean;
  result: T;
  errorCode?: string;
  userMessage?: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/pacientes`;

  /**
   * Obtiene el listado de pacientes con prioridad (citas próximas primero)
   */
  getPatients(): Observable<Patient[]> {
    return this.http.get<ApiResponse<Patient[]>>(this.API_URL).pipe(
      map(res => res.ok ? res.result : [])
    );
  }

  /**
   * Crea un nuevo paciente con expediente clínico completo
   */
  createPatient(patient: Patient): Observable<Patient | null> {
    return this.http.post<ApiResponse<Patient>>(this.API_URL, patient).pipe(
      map(res => res.ok ? res.result : null)
    );
  }

  /**
   * Obtiene el detalle de un paciente por su ID
   */
  getPatientById(id: string): Observable<Patient | null> {
    return this.http.get<ApiResponse<Patient>>(`${this.API_URL}/${id}`).pipe(
      map(res => res.ok ? res.result : null)
    );
  }

  /**
   * Actualiza la información clínica de un paciente
   */
  updatePatient(id: string, patient: Patient): Observable<Patient | null> {
    return this.http.put<ApiResponse<Patient>>(`${this.API_URL}/${id}`, patient).pipe(
      map(res => res.ok ? res.result : null)
    );
  }
}
