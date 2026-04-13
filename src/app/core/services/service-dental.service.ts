import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { ServicioDental } from '../models/service-dental.model';
import { ApiResponse } from './patient.service';

@Injectable({
  providedIn: 'root'
})
export class ServiceDentalService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/servicios`;

  getServicios(): Observable<ServicioDental[]> {
    return this.http.get<ApiResponse<ServicioDental[]>>(this.apiUrl).pipe(
      map(response => response.ok ? response.result : [])
    );
  }

  uploadImage(file: File): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<string>>(`${this.apiUrl}/upload`, formData).pipe(
      map(response => response.ok ? response.result : null)
    );
  }

  crearServicio(servicio: ServicioDental): Observable<ServicioDental | null> {
    return this.http.post<ApiResponse<ServicioDental>>(this.apiUrl, servicio).pipe(
      map(response => response.ok ? response.result : null)
    );
  }

  actualizarServicio(id: string, servicio: ServicioDental): Observable<ServicioDental | null> {
    return this.http.put<ApiResponse<ServicioDental>>(`${this.apiUrl}/${id}`, servicio).pipe(
      map(response => response.ok ? response.result : null)
    );
  }

  eliminarServicio(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.ok)
    );
  }
}
