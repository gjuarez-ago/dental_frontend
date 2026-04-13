export enum AppointmentStatus {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  LLEGADA = 'LLEGADA',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
  AUSENTE = 'AUSENTE'
}

export enum TicketStatus {
  POR_DEFINIR = 'POR_DEFINIR',
  EN_REVISION = 'EN_REVISION',
  PENDIENTE = 'PENDIENTE',
  ABONADO = 'ABONADO',
  LIQUIDADO = 'LIQUIDADO',
  CORTESIA = 'CORTESIA'
}

export interface Cita {
  id?: string;
  pacienteId: string;
  pacienteNombre?: string;
  doctorId: string;
  doctorNombre?: string;
  sucursalId: string;
  servicioId: string;
  servicioNombre?: string;
  fechaHora: string; // ISO OffsetDateTime
  duracionMinutos: number;
  estado: AppointmentStatus;
  motivoConsulta?: string;
  notasRecepcion?: string;
  
  // Info financiera
  montoTotal?: number;
  montoPagado?: number;
  ticketStatus?: TicketStatus;
}
