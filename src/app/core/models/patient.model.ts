export interface Patient {
  id?: string;
  nombreCompleto: string;
  fechaNacimiento: string;
  telefono: string;
  email: string;
  genero: string;
  curp: string;
  direccion: string;
  ocupacion: string;
  alergias: string;
  enfermedadesCronicas: string;
  medicamentosActuales: string;
  emergenciaNombre: string;
  emergenciaTelefono: string;
  tipoSangre: string;
  notasClinicas: string;
  
  // Auditoría
  proximaCita?: string;
  createdAt?: string;
  saldoPendiente?: number;
  expedienteCompleto?: boolean;
}
