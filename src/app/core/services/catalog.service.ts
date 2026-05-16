import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { GiroOption } from '../models/search.model';

export interface Estado {
  id: string;
  nombre: string;
  codigo: string;
}

export interface Municipio {
  id: string;
  nombre: string;
  estadoId: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/public/catalogs`;

  getStates(): Observable<Estado[]> {
    return this.http.get<Estado[]>(`${this.API_URL}/states`);
  }

  getMunicipalitiesByState(stateId: string): Observable<Municipio[]> {
    return this.http.get<Municipio[]>(`${this.API_URL}/municipalities`, {
      params: { stateId }
    });
  }

  /**
   * Giros con conteo de especialistas activos.
   * Equivalente a: SELECT giro, nombre, COUNT(*) FROM tenants GROUP BY giro ORDER BY count DESC.
   * El backend cachea este resultado (TTL 10 min) ya que cambia poco.
   */
  getGiros(q?: string): Observable<GiroOption[]> {
    const params = q?.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http
      .get<ApiResponse<GiroOption[]>>(`${this.API_URL}/giros`, { params })
      .pipe(map(r => (r as any).result ?? (r as any)));
  }
}
