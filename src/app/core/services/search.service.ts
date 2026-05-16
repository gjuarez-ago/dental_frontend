import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { EspecialistaCard, GiroOption, PageResult, SearchParams } from '../models/search.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/public/search`;

  /**
   * Busca especialistas con proyección plana (sin N+1).
   * El backend debe hacer un JOIN único con estado, municipio,
   * rating agregado y próximo slot via subquery lateral.
   */
  searchEspecialistas(params: SearchParams): Observable<PageResult<EspecialistaCard>> {
    let p = new HttpParams()
      .set('estadoId', params.estadoId)
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);

    if (params.municipioId) p = p.set('municipioId', params.municipioId);
    if (params.giro)        p = p.set('giro', params.giro);
    if (params.q)           p = p.set('q', params.q);
    if (params.modalidad)   p = p.set('modalidad', params.modalidad);
    if (params.sort)        p = p.set('sort', params.sort);

    return this.http
      .get<ApiResponse<PageResult<EspecialistaCard>>>(`${this.API}/especialistas`, { params: p })
      .pipe(map(r => r.result!));
  }

  /**
   * Giros disponibles para el autocomplete.
   * Devuelve hasta 50 resultados ordenados por totalEspecialistas DESC.
   * El backend hace un GROUP BY giro con COUNT(*) para evitar N+1.
   */
  getGiros(q?: string): Observable<GiroOption[]> {
    const p = q?.trim() ? new HttpParams().set('q', q.trim()) : undefined;
    return this.http
      .get<ApiResponse<GiroOption[]>>(`${this.API}/giros`, { params: p })
      .pipe(map(r => r.result ?? []));
  }
}
