import { Component, ChangeDetectionStrategy, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { forkJoin, finalize, takeUntil, Subject } from 'rxjs';
import { AppointmentService } from '../../core/services/appointment.service';
import { LayoutService } from '../../core/services/layout.service';
import { Cita, AppointmentStatus } from '../../core/models/appointment.model';

interface ComprobantePendiente {
  id: string;
  pacienteNombre: string;
  pacienteId: string;
  prioridad: 'URGENTE' | 'ESTÁNDAR' | 'NUEVO';
  fecha: string;
  hora: string;
  tratamiento: string;
  motivo: string;
  monto: string;
  anticipo: string;
  comprobanteUrl: string;
}

import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly citaService = inject(AppointmentService);
  private readonly layout = inject(LayoutService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly toastr = inject(ToastrService);
  private readonly destroy$ = new Subject<void>();

  readonly stats = signal<any[]>([]);
  readonly dashboardStats = signal<any>(null);

  readonly comprobantesPendientes = signal<ComprobantePendiente[]>([]);
  readonly loading = signal<boolean>(false);
  readonly selectedImageUrl = signal<string | null>(null);
  private readonly rawCitas = signal<Cita[]>([]);

  ngOnInit(): void {
    this.cargarDashboard();
    
    // Escuchar cuando se confirme una cita desde el drawer global
    this.citaService.citaGuardada$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.cargarDashboard();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDashboard(): void {
    const user = this.authService.currentUser();
    const doctorFilterId = user?.rol === 'DOCTOR' ? user.id : undefined;

    this.loading.set(true);
    this.spinner.show();
    
    // Carga paralela de stats y listado
    forkJoin({
      stats: this.citaService.getDashboardSummary(doctorFilterId),
      citas: this.citaService.getPorConfirmar()
    }).subscribe({
      next: (data) => {
        this.rawCitas.set(data.citas);
        this.comprobantesPendientes.set(data.citas.map(c => this.mapCitaToComprobante(c)));
        
        if (data.stats) {
          this.dashboardStats.set(data.stats);
          this.stats.set([
            { 
              label: 'Ingresos Hoy', 
              value: `$${data.stats.ingresosHoy.toLocaleString('es-MX', {minimumFractionDigits: 2})} MXN`, 
              trend: `${data.stats.ingresosHoyTrend.toFixed(1)}%`, 
              up: data.stats.ingresosHoyTrend >= 0, 
              color: '#6366f1' 
            },
            { 
              label: 'Citas Hoy', 
              value: data.stats.citasHoyCount.toString(), 
              trend: (data.stats.citasHoyTrend >= 0 ? '+' : '') + data.stats.citasHoyTrend, 
              up: data.stats.citasHoyTrend >= 0, 
              color: '#10b981' 
            },
            { 
              label: 'Pacientes Nuevos', 
              value: data.stats.pacientesNuevosCount.toString(), 
              trend: `${data.stats.pacientesNuevosTrend.toFixed(1)}%`, 
              up: data.stats.pacientesNuevosTrend >= 0, 
              color: '#f59e0b' 
            }
          ]);
        }
        this.loading.set(false);
        this.spinner.hide();
      },
      error: () => {
        this.loading.set(false);
        this.spinner.hide();
        this.toastr.error('Error al cargar la información del panel.', 'Error');
      }
    });
  }

  private mapCitaToComprobante(cita: Cita): ComprobantePendiente {
    const date = new Date(cita.fechaHora);
    return {
      id: cita.id!,
      pacienteNombre: cita.pacienteNombre || 'Paciente Nuevo',
      pacienteId: cita.pacienteId ? cita.pacienteId.substring(0, 8).toUpperCase() : 'NUEVO',
      prioridad: cita.source === 'PUBLIC' ? 'NUEVO' : 'ESTÁNDAR',
      fecha: date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
      hora: date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
      tratamiento: cita.servicioNombre || 'Consulta Dental',
      motivo: cita.motivoConsulta || '',
      monto: `$${cita.montoTotal || 0}.00`,
      anticipo: `$${cita.montoPagado || 0}.00`,
      comprobanteUrl: (cita as any).comprobanteUrl || ''
    };
  }

  aprobarComprobante(id: string) {
    const user = this.authService.currentUser();
    const cita = this.rawCitas().find(c => c.id === id);
    
    if (cita) {
      if (user?.rol === 'DOCTOR') {
        this.spinner.show();
        this.citaService.confirmarCita(id, user.id).pipe(
          finalize(() => this.spinner.hide())
        ).subscribe({
          next: (res) => {
            if (res.ok) {
              this.onAppointmentConfirmed();
            }
          }
        });
      } else {
        this.layout.openConfirmationDrawer(cita);
      }
    }
  }

  onAppointmentConfirmed() {
    this.cargarDashboard();
    this.toastr.success('Cita confirmada y comprobante validado.', 'Éxito');
  }

  rechazarComprobante(id: string) {
    const cita = this.rawCitas().find(c => c.id === id);
    if (cita) {
      this.layout.openRejectionDrawer(cita);
    }
  }

  verImagen(url: string) {
    this.selectedImageUrl.set(url);
  }

  cerrarImagen() {
    this.selectedImageUrl.set(null);
  }
}
