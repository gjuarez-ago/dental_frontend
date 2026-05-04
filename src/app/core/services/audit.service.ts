import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BitacoraEntry {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  modulo: string;
  accion: string;
  descripcion: string;
  entidadRelacionadaId: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

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
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/bitacora`;

  /**
   * Obtiene los registros de bitácora paginados (solo para OWNER)
   */
  getLogs(page: number = 0, size: number = 50): Observable<PaginatedResponse<BitacoraEntry> | null> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse<PaginatedResponse<BitacoraEntry>>>(this.API_URL, { params }).pipe(
      map(res => res.ok ? res.result : null)
    );
  }
}
