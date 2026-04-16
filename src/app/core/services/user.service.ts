import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model'; // I'll check/create this
import { UsuarioRequest, UsuarioResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/usuarios`;

  listarPorSucursal(sucursalId: string): Observable<UsuarioResponse[]> {
    return this.http.get<ApiResponse<UsuarioResponse[]>>(`${this.API_URL}/sucursal/${sucursalId}`)
      .pipe(map(res => (res.result ?? []) as UsuarioResponse[]));
  }

  crear(request: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.post<ApiResponse<UsuarioResponse>>(this.API_URL, request)
      .pipe(map(res => res.result as UsuarioResponse));
  }

  actualizar(id: string, request: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.put<ApiResponse<UsuarioResponse>>(`${this.API_URL}/${id}`, request)
      .pipe(map(res => res.result as UsuarioResponse));
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.API_URL}/${id}`)
      .pipe(map(() => void 0));
  }
}
