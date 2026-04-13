import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../services/layout.service';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'pago' | 'cita' | 'sistema';
  read: boolean;
}

@Component({
  selector: 'app-notification-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-drawer.html',
  styleUrl: './notification-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationDrawerComponent {
  layout = inject(LayoutService);

  readonly notifications: Notification[] = [
    {
      id: '1',
      title: 'Nuevo Comprobante Recibido',
      message: 'Marco Torres ha subido un nuevo comprobante para validación.',
      time: 'Hace 5 min',
      type: 'pago',
      read: false
    },
    {
      id: '2',
      title: 'Cita Próxima',
      message: 'Elena Ruiz tiene una cita en 15 minutos (Ortodoncia).',
      time: 'Hace 15 min',
      type: 'cita',
      read: false
    },
    {
      id: '3',
      title: 'Sistema Actualizado',
      message: 'Se han aplicado mejoras en el panel de revisión administrativa.',
      time: 'Hace 1 h',
      type: 'sistema',
      read: true
    },
    {
      id: '4',
      title: 'Auditoría Pendiente',
      message: 'Recuerda realizar el cierre de caja de la jornada anterior.',
      time: 'Hace 3 h',
      type: 'sistema',
      read: true
    }
  ];

  getIconForType(type: string): string {
    switch (type) {
      case 'pago': return 'ph-receipt';
      case 'cita': return 'ph-calendar-check';
      case 'sistema': return 'ph-database';
      default: return 'ph-bell';
    }
  }

  close(): void {
    this.layout.closeNotificationDrawer();
  }
}
