import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../core/services/appointment.service';
import { Cita, AppointmentStatus } from '../../core/models/appointment.model';

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
export class HomeComponent implements OnInit {
  private readonly citaService = inject(AppointmentService);

  readonly stats = [
    { label: 'Ingresos Hoy', value: '$8,450.00 MXN', trend: '+12%', up: true, color: '#6366f1' },
    { label: 'Citas Hoy', value: '12', trend: '+2', up: true, color: '#10b981' },
    { label: 'Pacientes Nuevos', value: '4', trend: '+5%', up: true, color: '#f59e0b' }
  ];

  readonly comprobantesPendientes = signal<ComprobantePendiente[]>([]);
  private readonly rawCitas = signal<Cita[]>([]);

  ngOnInit(): void {
    this.cargarCitasPendientes();
  }

  cargarCitasPendientes(): void {
    this.citaService.getPorConfirmar().subscribe({
      next: (citas) => {
        this.rawCitas.set(citas);
        this.comprobantesPendientes.set(citas.map(c => this.mapCitaToComprobante(c)));
      }
    });
  }

  private mapCitaToComprobante(cita: Cita): ComprobantePendiente {
    const date = new Date(cita.fechaHora);
    return {
      id: cita.id!,
      pacienteNombre: cita.pacienteNombre || 'Paciente Nuevo',
      pacienteId: cita.pacienteId.substring(0, 8).toUpperCase(),
      prioridad: cita.source === 'PUBLIC' ? 'NUEVO' : 'ESTÁNDAR',
      fecha: date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
      hora: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      tratamiento: cita.servicioNombre || cita.motivoConsulta || 'Consulta Dental',
      monto: `$${cita.montoTotal || 0}.00`,
      comprobanteUrl: (cita as any).comprobanteUrl || ''
    };
  }

  aprobarComprobante(id: string) {
    // Para simplificar, obtenemos los doctores y asignamos el primero
    this.citaService.getDoctores().subscribe(doctores => {
      const doctorId = doctores.length > 0 ? doctores[0].id : null;
      if (!doctorId) {
        alert('No hay doctores disponibles para asignar.');
        return;
      }

      this.citaService.confirmarCita(id, doctorId).subscribe({
        next: (res) => {
          if (res.ok) {
            this.comprobantesPendientes.update(list => list.filter(c => c.id !== id));
          }
        }
      });
    });
  }

  rechazarComprobante(id: string) {
    const motivo = prompt('Motivo del rechazo:', 'Comprobante ilegible o pago no recibido');
    if (!motivo) return;

    this.citaService.rechazarCita(id, motivo).subscribe({
      next: (res) => {
        if (res.ok) {
          this.comprobantesPendientes.update(list => list.filter(c => c.id !== id));
        }
      }
    });
  }
}
