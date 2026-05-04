import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface CatalogoCie10 {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
}

@Injectable({
  providedIn: 'root'
})
export class Cie10Service {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/cie10`;

  buscar(query: string): Observable<CatalogoCie10[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<ApiResponse<CatalogoCie10[]>>(`${this.apiUrl}/search`, { params }).pipe(
      map(res => (res.ok && res.result) ? res.result : [])
    );
  }
}
