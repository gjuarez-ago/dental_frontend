import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { User } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/profile`;

  getProfile(): Observable<User> {
    return this.http.get<ApiResponse<User>>(this.API_URL)
      .pipe(map(res => res.result as User));
  }

  updateProfile(data: {
    biografia?: string;
    genero?: string;
    fechaNacimiento?: string;
    photo?: File;
  }): Observable<string> {
    const formData = new FormData();
    if (data.biografia) formData.append('biografia', data.biografia);
    if (data.genero) formData.append('genero', data.genero);
    if (data.fechaNacimiento) formData.append('fechaNacimiento', data.fechaNacimiento);
    if (data.photo) formData.append('photo', data.photo);

    return this.http.post<ApiResponse<string>>(`${this.API_URL}/update`, formData)
      .pipe(map(res => res.result as string));
  }
}
