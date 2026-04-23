import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard para proteger rutas que solo deben ser accesibles para usuarios NO autenticados.
 * Si el usuario ya inició sesión, lo redirige a su ruta correspondiente según su rol.
 */
export const publicGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isLoggedIn()) {
        // Redirigir según rol: pacientes → /mis-citas, staff → /dashboard
        router.navigate([authService.getHomeRoute()]);
        return false;
    }

    return true;
};
