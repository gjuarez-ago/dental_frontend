export type Modalidad = 'PRESENCIAL' | 'ONLINE' | 'AMBAS';
export type SortOption = 'CALIFICACION' | 'PRECIO_ASC' | 'PRECIO_DESC';

export interface GiroOption {
  valor: string;
  nombre: string;
  totalEspecialistas: number;
}

export interface EspecialistaCard {
  tenantId: string;
  nombreComercial: string;
  nombreDoctor?: string;
  giro: string;
  giroNombre: string;
  estadoNombre: string;
  municipioNombre: string;
  fotografiaUrl?: string;
  calificacion: number;
  totalResenas: number;
  precioDesde: number;
  modalidad: Modalidad;
  proximoSlot?: string;
  biografia?: string;
}

export interface SearchParams {
  estadoId: string;
  municipioId?: string;
  giro?: string;
  q?: string;
  modalidad?: Modalidad;
  sort?: SortOption;
  page?: number;
  size?: number;
}

export interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
