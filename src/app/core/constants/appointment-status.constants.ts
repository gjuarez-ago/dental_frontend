import { AppointmentStatus } from '../models/appointment.model';

export interface StatusMetadata {
  label: string;
  description: string;
  color: string;
  icon: string;
  actionLabel?: string;
  order: number;
}

export const APPOINTMENT_STATUS_METADATA: Record<AppointmentStatus, StatusMetadata> = {
  [AppointmentStatus.POR_CONFIRMAR]: {
    label: 'Pendiente de Confirmar',
    description: 'Solicitud externa (App/Web) que requiere aprobación y asignación de doctor.',
    color: '#FFB300', // Amber
    icon: 'ph-clock-countdown',
    actionLabel: 'Confirmar Cita',
    order: 5
  },
  [AppointmentStatus.CONFIRMADA]: {
    label: 'Agendada',
    description: 'Cita confirmada en calendario, esperando la llegada del paciente.',
    color: '#2196F3', // Blue
    icon: 'ph-calendar-check',
    actionLabel: 'Confirmar Asistencia',
    order: 3
  },
  [AppointmentStatus.LLEGADA]: {
    label: 'En Sala de Espera',
    description: 'El paciente ya se encuentra en la sucursal y está listo para ser atendido.',
    color: '#4CAF50', // Green
    icon: 'ph-user-check',
    actionLabel: 'Ingresar a Consulta',
    order: 2
  },
  [AppointmentStatus.EN_CONSULTA]: {
    label: 'En Atención Médica',
    description: 'El paciente está siendo atendido actualmente en el consultorio.',
    color: '#9C27B0', // Purple
    icon: 'ph-stethoscope',
    actionLabel: 'Finalizar Consulta',
    order: 1
  },
  [AppointmentStatus.POR_LIQUIDAR]: {
    label: 'Pendiente de Pago',
    description: 'La consulta ha terminado satisfactoriamente y el paciente está en recepción para liquidar.',
    color: '#FF5722', // Deep Orange
    icon: 'ph-hand-coins',
    actionLabel: 'Registrar Pago',
    order: 4
  },
  [AppointmentStatus.FINALIZADA]: {
    label: 'Completada',
    description: 'Proceso médico y administrativo concluido exitosamente.',
    color: '#757575', // Grey
    icon: 'ph-check-circle',
    order: 6
  },
  [AppointmentStatus.CANCELADA]: {
    label: 'Cancelada',
    description: 'La cita fue anulada por la clínica o el paciente.',
    color: '#F44336', // Red
    icon: 'ph-x-circle',
    order: 8
  },
  [AppointmentStatus.AUSENTE]: {
    label: 'No se Presentó',
    description: 'El paciente faltó a su cita sin previo aviso.',
    color: '#212121', // Local Black
    icon: 'ph-user-minus',
    order: 7
  }
};
