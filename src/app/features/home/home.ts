import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ComprobantePendiente {
  id: string;
  pacienteNombre: string;
  pacienteId: string;
  prioridad: 'URGENTE' | 'ESTÁNDAR' | 'NUEVO';
  fecha: string;
  hora: string;
  tratamiento: string;
  monto: string;
  comprobanteUrl: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent {
  readonly stats = [
    { label: 'Ingresos Hoy', value: '$8,450.00 MXN', trend: '+12%', up: true, color: '#6366f1' },
    { label: 'Citas Hoy', value: '12', trend: '+2', up: true, color: '#10b981' },
    { label: 'Pacientes Nuevos', value: '4', trend: '+5%', up: true, color: '#f59e0b' }
  ];

  readonly comprobantesPendientes = signal<ComprobantePendiente[]>([
    { 
      id: '1', 
      pacienteNombre: 'Elena Ruiz', 
      pacienteId: 'D-8821', 
      prioridad: 'URGENTE', 
      fecha: '12 Oct, 2023', 
      hora: '09:45 AM', 
      tratamiento: 'Anticipo Endodoncia',
      monto: '$500.00',
      comprobanteUrl: 'https://images.unsplash.com/photo-1583522684074-90141cb3352f?w=400' 
    },
    { 
      id: '2', 
      pacienteNombre: 'Marco Torres', 
      pacienteId: 'D-8822', 
      prioridad: 'ESTÁNDAR', 
      fecha: '12 Oct, 2023', 
      hora: '10:12 AM', 
      tratamiento: 'Pago Limpieza Profesional',
      monto: '$350.00',
      comprobanteUrl: '' 
    },
    { 
      id: '3', 
      pacienteNombre: 'Sofía Jiménez', 
      pacienteId: 'D-8231', 
      prioridad: 'NUEVO', 
      fecha: '12 Oct, 2023', 
      hora: '11:03 AM', 
      tratamiento: 'Abono Ortodoncia',
      monto: '$1,200.00',
      comprobanteUrl: '' 
    },
    { 
      id: '4', 
      pacienteNombre: 'Julián Vélez', 
      pacienteId: 'D-8235', 
      prioridad: 'ESTÁNDAR', 
      fecha: '12 Oct, 2023', 
      hora: '01:15 PM', 
      tratamiento: 'Depósito Valoración',
      monto: '$200.00',
      comprobanteUrl: '' 
    },
  ]);

  aprobarComprobante(id: string) {
    console.log('Aprobando comprobante:', id);
    this.comprobantesPendientes.update(tasks => tasks.filter(t => t.id !== id));
  }

  rechazarComprobante(id: string) {
    console.log('Rechazando comprobante:', id);
    this.comprobantesPendientes.update(tasks => tasks.filter(t => t.id !== id));
  }
}
