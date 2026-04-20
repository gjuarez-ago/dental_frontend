import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastrService } from 'ngx-toastr';

/**
 * Guard funcional para validar el rol del usuario antes de acceder a una ruta.
 * Se espera que la ruta tenga un objeto 'data' con una lista de roles permitidos.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  const allowedRoles = route.data['roles'] as string[];
  const user = auth.currentUser();

  // Si no hay roles definidos para validar, permitir acceso
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  // Verificar si el usuario tiene uno de los roles permitidos
  const role = user?.rol || user?.role; // Soportar ambos formatos (CRM y Paciente)

  if (role && allowedRoles.includes(role)) {
    return true;
  }

  // Si no tiene permiso, redirigir al dashboard y mostrar error
  toastr.error('No tienes permisos suficientes para acceder a este módulo.', 'Acceso Denegado');
  router.navigate(['/dashboard']);
  return false;
};
