import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import {
  AgendaPublica,
  BookingPublicRequest,
  BookingPublicResponse
} from '../models/agenda-publica.model';

@Injectable({ providedIn: 'root' })
export class AgendaPublicaService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/public/especialistas`;

  /**
   * Carga la agenda de un especialista para los próximos `dias` días.
   * El backend devuelve los días laborales con sus slots calculados en
   * una sola consulta JOIN (sin N+1 por día).
   */
  getAgenda(tenantId: string, fechaInicio: string, dias = 14): Observable<AgendaPublica> {
    const params = new HttpParams()
      .set('fechaInicio', fechaInicio)
      .set('dias', dias);

    return this.http
      .get<ApiResponse<AgendaPublica>>(`${this.API}/${tenantId}/agenda`, { params })
      .pipe(map(r => r.result!));
  }

  /**
   * Solicita una cita en el marketplace.
   * No requiere autenticación del paciente; el backend crea el paciente
   * implícitamente si no existe (igual que setupAccess en quick-booking).
   */
  requestBooking(payload: BookingPublicRequest): Observable<BookingPublicResponse> {
    return this.http
      .post<ApiResponse<BookingPublicResponse>>(`${this.API}/citas/solicitar`, payload)
      .pipe(map(r => r.result!));
  }
}
