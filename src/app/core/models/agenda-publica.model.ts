export interface SlotPublico {
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
}

export interface DiaAgenda {
  fecha: string;
  esDiaLaboral: boolean;
  estaLlena: boolean;
  slots: SlotPublico[];
}

export interface ServicioPublico {
  id: string;
  nombre: string;
  descripcion?: string;
  precioBase: number;
  duracionMinutos: number;
}

export interface AgendaPublica {
  tenantId: string;
  nombreComercial: string;
  nombreDoctor?: string;
  giroNombre: string;
  fotografiaUrl?: string;
  biografia?: string;
  modalidad: 'PRESENCIAL' | 'ONLINE' | 'AMBAS';
  calificacion: number;
  totalResenas: number;
  diasAnticipacionReserva: number;
  servicios: ServicioPublico[];
  diasDisponibles: DiaAgenda[];
}

export interface BookingPublicRequest {
  tenantId: string;
  servicioId: string;
  fecha: string;
  horaInicio: string;
  nombrePaciente: string;
  telefonoPaciente: string;
  emailPaciente?: string;
  notas?: string;
}

export interface BookingPublicResponse {
  citaId: string;
  folio: string;
}
