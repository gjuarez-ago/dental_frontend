export interface ServicioDental {
  id?: string;
  nombre: string;
  descripcion: string;
  precioBase: number;
  duracionMinutos: number;
  colorEtiqueta: string;
  imagenUrl?: string;
  requiereValoracion: boolean;
}
