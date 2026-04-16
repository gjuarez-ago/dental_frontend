import { UserRole } from './user-role.enum'; // I'll create this too

export interface UsuarioRequest {
  nombreCompleto: string;
  telefonoContacto: string;
  email?: string;
  nip?: string;
  rol: UserRole | string;
  cedulaProfesional?: string;
  fotografiaUrl?: string;
  sucursalId: string;
}

export interface UsuarioResponse {
  id: string;
  nombreCompleto: string;
  telefonoContacto: string;
  email?: string;
  rol: UserRole | string;
  cedulaProfesional?: string;
  fotografiaUrl?: string;
  sucursalIdPrincipal: string;
  requiereCambioNip: boolean;
  createdAt: string;
}
