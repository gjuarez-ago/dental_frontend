import { UserRole } from './user-role.enum'; // I'll create this too

export interface UsuarioRequest {
  nombreCompleto: string;
  telefonoContacto: string;
  email?: string;
  nip?: string;
  rol: UserRole | string;
  cedulaProfesional?: string;
  fotografiaUrl?: string;
  esPersonalClinico?: boolean;
  sucursalId: string;
  especialidades?: string[];
  genero?: string;
}

export interface UsuarioResponse {
  id: string;
  nombreCompleto: string;
  telefonoContacto: string;
  email?: string;
  rol: UserRole | string;
  cedulaProfesional?: string;
  fotografiaUrl?: string;
  esPersonalClinico?: boolean;
  sucursalIdPrincipal: string;
  requiereCambioNip: boolean;
  activo: boolean;
  especialidades?: string[];
  genero?: string;
  createdAt: string;
}
