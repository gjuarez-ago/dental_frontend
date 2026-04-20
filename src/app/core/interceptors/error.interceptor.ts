import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ApiResponse } from '../models/api-response.model';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Ha ocurrido un error inesperado';

      // 401: Unauthorized -> Token expirado o inválido
      if (error.status === 401) {
        authService.logout();
        toastr.warning('Su sesión ha expirado. Por favor, ingrese de nuevo.', 'Sesión Expirada', {
          timeOut: 5000,
          progressBar: true
        });
        return throwError(() => error);
      }

      if (error.error) {
        // Intentar castear al formato ApiResponse del backend
        const apiResponse = error.error as ApiResponse<any>;
        
        if (apiResponse.userMessage) {
          errorMessage = apiResponse.userMessage;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        }
      }

      // Mostrar notificación visual
      toastr.error(errorMessage, 'Error en el Sistema', {
        timeOut: 5000,
        progressBar: true,
        closeButton: true
      });

      console.error('Error Interceptado:', error);
      return throwError(() => error);
    })
  );
};
