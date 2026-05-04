import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { AppointmentService } from '../../core/services/appointment.service';
import { PaymentService } from '../../core/services/payment.service';
import { LayoutService } from '../../core/services/layout.service';
import { signal, computed } from '@angular/core';
import { Cita, AppointmentStatus } from '../../core/models/appointment.model';
import { APPOINTMENT_STATUS_METADATA } from '../../core/constants/appointment-status.constants';
import { finalize, Subject, takeUntil } from 'rxjs';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  appointments: Cita[];
}

import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';

import { PaymentDrawerComponent } from './components/payment-drawer/payment-drawer';
import { ClinicalDrawerComponent } from './components/clinical-drawer/clinical-drawer';
import { ClinicalService } from '../../core/services/clinical.service';
import { ExpedienteDrawerComponent } from '../patients/components/expediente-drawer/expediente-drawer';
import { PatientService } from '../../core/services/patient.service';


@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, PaymentDrawerComponent, ClinicalDrawerComponent, ExpedienteDrawerComponent, NgxSpinnerModule, ConfirmModalComponent],
  templateUrl: './appointments.html',
  styleUrl: './appointments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly appointmentService = inject(AppointmentService);
  private readonly paymentService = inject(PaymentService);
  protected readonly layout = inject(LayoutService);
  private readonly spinner = inject(NgxSpinnerService);
  protected readonly authService = inject(AuthService);
  private readonly toastr = inject(ToastrService);
  private readonly route = inject(ActivatedRoute);
  private readonly patientService = inject(PatientService);

  // Modal State
  readonly showModal = signal(false);
  readonly modalConfig = signal({
    title: 'Confirmar',
    message: '',
    type: 'warning' as 'info' | 'danger' | 'warning' | 'success',
    icon: 'ph ph-warning'
  });

  private modalCallback: (() => void) | null = null;

  showConfirm(message: string, callback: () => void, type: 'info' | 'danger' | 'warning' | 'success' = 'warning', title = 'Confirmar') {
    this.modalConfig.set({
      title, message, type,
      icon: 'ph ph-question'
    });
    this.showModal.set(true);
    this.modalCallback = callback;
  }

  handleModalConfirm() {
    if (this.modalCallback) {
      this.modalCallback();
    }
    this.showModal.set(false);
  }

  // Exponer enum y metadatos al template
  public readonly StatusEnum = AppointmentStatus;
  public readonly StatusMetadata = APPOINTMENT_STATUS_METADATA;

  // Estados del Calendario
  readonly viewDate = signal(new Date());   // Mes que se está viendo
  readonly selectedDate = signal(new Date()); // Día seleccionado
  readonly monthAppointments = signal<Cita[]>([]); // Citas del mes
  readonly appointments = signal<Cita[]>([]); // Citas del día seleccionado

  // Estados de Cajones (Drawers)
  readonly isPaymentDrawerOpen = signal(false);
  readonly selectedAppointmentForPayment = signal<Cita | null>(null);
  readonly isClinicalDrawerOpen = signal(false);
  readonly selectedAppointmentForClinical = signal<Cita | null>(null);
  readonly isExpedienteOpen = signal(false);
  readonly selectedAppointmentForExpediente = signal<Cita | null>(null);
  readonly selectedPatientForExpediente = signal<any | null>(null);

  // Computados
  readonly currentMonth = computed(() => {
    return this.viewDate().toLocaleString('es-ES', { month: 'long', year: 'numeric' });
  });

  readonly todayLabel = computed(() => {
    return `Hoy es ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;
  });

  readonly selectedDateSummary = computed(() => {
    const selected = this.selectedDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = selected.getTime() === today.getTime();

    const dateStr = selected.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    return isToday ? `Hoy, ${dateStr}` : dateStr;
  });

  // Estadísticas del día seleccionado
  readonly stats = computed(() => {
    const list = this.appointments();
    return {
      total: list.length,
      waiting: list.filter(a => a.estado === this.StatusEnum.CONFIRMADA || a.estado === this.StatusEnum.POR_CONFIRMAR).length,
      arrived: list.filter(a => a.estado === this.StatusEnum.LLEGADA).length,
      inConsultation: list.filter(a => a.estado === this.StatusEnum.EN_CONSULTA).length,
      finished: list.filter(a => a.estado === this.StatusEnum.FINALIZADA).length
    };
  });

  // Generación de la tira diaria horizontal (31 días para realismo y navegación)
  readonly weekDays = computed(() => {
    const selected = this.selectedDate();
    const days = [];

    // Generamos un rango de 31 días: -10 días y +20 días desde el seleccionado
    const startRange = new Date(selected);
    startRange.setDate(selected.getDate() - 10);
    startRange.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 31; i++) {
      const d = new Date(startRange);
      d.setDate(startRange.getDate() + i);

      // Verificar si hay citas en este día (usando las citas del mes ya cargadas)
      const hasAppointments = this.monthAppointments().some(app => {
        const appDate = new Date(app.fechaHora);
        return appDate.getDate() === d.getDate() &&
          appDate.getMonth() === d.getMonth() &&
          appDate.getFullYear() === d.getFullYear();
      });

      days.push({
        date: d,
        dayName: d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase().substring(0, 3),
        dayNum: d.getDate(),
        isSelected: d.getTime() === this.selectedDate().getTime(),
        isToday: d.getTime() === today.getTime(),
        hasAppointments
      });
    }
    return days;
  });

  // Permisos
  readonly isAllowedToCancel = computed(() => {
    const role = this.authService.getUserRole();
    return role === 'OWNER' || role === 'SUPER_ADMIN';
  });

  // Generación dinámica del Grid
  readonly calendarDays = computed(() => {
    const date = this.viewDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Obtener el primer lunes de la cuadrícula (relleno del mes anterior)
    let startDay = new Date(firstDayOfMonth);
    const dayOfWeek = startDay.getDay(); // 0 (Dom) - 6 (Sáb)
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajustar para que el primer día sea Lunes
    startDay.setDate(startDay.getDate() - diff);

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = this.selectedDate();
    selected.setHours(0, 0, 0, 0);

    // Generamos 6 semanas (42 días) para un grid perfecto
    for (let i = 0; i < 42; i++) {
      const current = new Date(startDay);
      current.setDate(startDay.getDate() + i);

      const isCurrentMonth = current.getMonth() === month;
      const isToday = current.getTime() === today.getTime();
      const isSelected = current.getTime() === selected.getTime();

      // Filtrar citas para este día (Solo CONFIRMADAS para el grid mensual)
      const dayAppointments = this.monthAppointments().filter(app => {
        const appDate = new Date(app.fechaHora);
        return appDate.getDate() === current.getDate() &&
          appDate.getMonth() === current.getMonth() &&
          appDate.getFullYear() === current.getFullYear() &&
          app.estado === AppointmentStatus.CONFIRMADA;
      });

      days.push({
        date: current,
        isCurrentMonth,
        isToday,
        isSelected,
        appointments: dayAppointments
      });
    }
    return days;
  });

  ngOnInit() {
    this.loadMonthData(); // Carga inicial

    // 1. Escuchar parámetros de la URL para autoselección de fecha
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['date']) {
          // El formato esperado es YYYY-MM-DD
          const incomingDate = new Date(params['date'] + 'T00:00:00');
          if (!isNaN(incomingDate.getTime())) {
            this.selectDay(incomingDate);
          }
        }
      });

    // 2. Escuchar cuando el admin-layout (u otro componente) guarda una cita
    // para recargar automáticamente el calendario sin importar cuál drawer emitió
    this.appointmentService.citaGuardada$
      .pipe(takeUntil(this.destroy$))
      .subscribe(cita => {
        this.onAppointmentSaved(cita);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMonthData() {
    console.log('--- loadMonthData TRACE ---');
    const date = this.viewDate();
    const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0).toISOString();
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const sucursalId = this.authService.currentUser()?.sucursalIdPrincipal || '';
    console.log('Sucursal ID (LoadMonth):', sucursalId);

    if (!sucursalId) return;
    this.spinner.show();
    
    const user = this.authService.currentUser();
    const doctorFilterId = user?.rol === 'DOCTOR' ? user.id : undefined;

    this.appointmentService.getCitas(sucursalId, start, end, doctorFilterId)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (data) => {
          this.monthAppointments.set(data);
          this.refreshDailyAppointments();
        },
        error: (err) => console.error('Error loadMonthData API:', err)
      });
  }

  selectDay(day: CalendarDay | any) {
    const date = day instanceof Date ? day : day.date;
    const cleanDate = new Date(date);
    cleanDate.setHours(0, 0, 0, 0);

    const oldMonth = this.selectedDate().getMonth();
    const newMonth = cleanDate.getMonth();

    this.selectedDate.set(cleanDate);

    // Si saltamos a otro mes, actualizamos viewDate y recargamos el mes
    if (oldMonth !== newMonth) {
      this.viewDate.set(new Date(cleanDate.getFullYear(), cleanDate.getMonth(), 1));
      this.loadMonthData();
    } else {
      this.refreshDailyAppointments();
    }
  }

  refreshDailyAppointments() {
    console.log('--- refreshDailyAppointments TRACE ---');
    const date = this.selectedDate();
    // Inicio del día local -> UTC
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString();
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
    const sucursalId = this.authService.currentUser()?.sucursalIdPrincipal || '';

    console.log('Sucursal ID (Daily):', sucursalId);
    console.log('Range:', { start, end });

    if (!sucursalId) {
      console.warn('Abortando refreshDailyAppointments: sucursalId vacío');
      return;
    }

    this.spinner.show();

    const user = this.authService.currentUser();
    const doctorFilterId = user?.rol === 'DOCTOR' ? user.id : undefined;

    this.appointmentService.getCitas(sucursalId, start, end, doctorFilterId)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (data) => {
          console.log('Citas recibidas:', data.length);
          this.appointments.set(data);
        },
        error: (err) => console.error('Error refreshDailyAppointments API:', err)
      });
  }


  changeMonth(delta: number) {
    const current = this.viewDate();
    this.viewDate.set(new Date(current.getFullYear(), current.getMonth() + delta, 1));
    this.loadMonthData();
  }

  setToday() {
    this.viewDate.set(new Date());
    this.selectedDate.set(new Date());
    this.loadMonthData();
  }

  updateStatus(citaId: string, status: AppointmentStatus) {
    this.appointmentService.actualizarEstado(citaId, status).subscribe(res => {
      if (res) {
        this.appointments.update(prev => prev.map(c => c.id === citaId ? res : c));
        
        // Si empezamos la atención, abrimos el expediente clínico automáticamente
        if (status === AppointmentStatus.EN_CONSULTA) {
          this.openClinicalDrawer(res);
        }

        // Si el estado es POR_LIQUIDAR, abrimos el drawer de pagos automáticamente
        if (status === AppointmentStatus.POR_LIQUIDAR) {
          this.openPaymentDrawer(res);
        }
        // También actualizar el grid mensual si cambió a Confirmada o dejó de serlo
        this.loadMonthData();
      }
    });
  }

  openClinicalDrawer(cita: Cita) {
    this.selectedAppointmentForClinical.set(cita);
    this.isClinicalDrawerOpen.set(true);
  }

  openPaymentDrawer(cita: Cita) {
    this.selectedAppointmentForPayment.set(cita);
    this.isPaymentDrawerOpen.set(true);
  }

  openExpediente(cita: Cita) {
    this.spinner.show();
    this.patientService.getPatientById(cita.pacienteId).pipe(
      finalize(() => this.spinner.hide())
    ).subscribe(patient => {
      if (patient) {
        this.selectedPatientForExpediente.set(patient);
        this.selectedAppointmentForExpediente.set(cita);
        this.isExpedienteOpen.set(true);
      }
    });
  }

  openNewAppointmentDrawer() {
    this.layout.openAppointmentDrawer(this.selectedDate());
  }

  onPaymentReceived() {
    this.refreshDailyAppointments();
    this.loadMonthData();
  }

  finalizarCortesia(cita: Cita) {
    this.showConfirm(`¿Deseas finalizar la cita de ${cita.pacienteNombre} como cortesía (sin costo)?`, () => {
      this.spinner.show();
      const payload = {
        citaId: cita.id,
        pacienteId: cita.pacienteId,
        monto: 0,
        metodoPago: 'SIN_COBRO',
        notas: 'Finalizado como cortesía desde agenda.'
      };
      
      this.paymentService.registrarPago(payload as any).subscribe({
        next: () => {
          this.spinner.hide();
          this.toastr.success('Cita finalizada como cortesía.', '¡Éxito!');
          this.onPaymentReceived();
        },
        error: (err) => {
          this.spinner.hide();
          this.toastr.error('No se pudo finalizar la cortesía.', 'Error');
          console.error(err);
        }
      });
    }, 'info', 'Finalizar Cortesía');
  }

  openConfirmationDrawer(cita: Cita) {
    const user = this.authService.currentUser();
    if (user?.rol === 'DOCTOR') {
      // Auto-confirmar para el mismo doctor
      this.spinner.show();
      this.appointmentService.confirmarCita(cita.id!, user.id).pipe(
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

  onAppointmentConfirmed() {
    this.toastr.success('Cita confirmada y pago validado.', '¡Éxito!');
    this.refreshDailyAppointments();
    this.loadMonthData();
  }

  openCancellationDrawer(cita: Cita) {
    this.layout.openCancellationDrawer(cita);
  }

  openRescheduleDrawer(cita: Cita) {
    this.layout.openAppointmentDrawer(new Date(cita.fechaHora), cita);
  }

  onAppointmentSaved(cita: Cita) {
    if (!cita) return;

    this.toastr.success(`Cita agendada para ${cita.pacienteNombre}`, '¡Éxito!');
    this.layout.closeAppointmentDrawer();

    // Extraer la fecha de la cita para navegar al día correcto
    const appDate = new Date(cita.fechaHora);
    appDate.setHours(0, 0, 0, 0);

    const oldMonth = this.selectedDate().getMonth();
    const newMonth = appDate.getMonth();

    this.selectedDate.set(appDate);

    // Si la cita cae en otro mes, actualizar viewDate también
    if (oldMonth !== newMonth) {
      this.viewDate.set(new Date(appDate.getFullYear(), appDate.getMonth(), 1));
    }

    // SIEMPRE recargar datos del mes y del día desde el backend
    // para garantizar que la nueva cita aparezca en el grid y en la lista diaria
    this.loadMonthData();
  }

  formatPatientName(fullName: string): string {
    if (!fullName) return 'S/N';
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastName = parts[parts.length - 1]; // Usualmente el apellido paterno al final o el segundo bloque
    // Tomamos la inicial del primer apellido (segunda palabra)
    const initial = parts[1] ? ` ${parts[1][0]}.` : '';
    return `${firstName}${initial}`;
  }

  getStatusData(status: AppointmentStatus) {
    return this.StatusMetadata[status];
  }

  getTicketStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'POR_DEFINIR': '⏳ Por Definir',
      'EN_REVISION': '🔍 En Revisión',
      'PENDIENTE': '💳 Pendiente',
      'ABONADO': '💰 Abonado',
      'LIQUIDADO': '✅ Liquidado',
      'CORTESIA': '🎁 Cortesía'
    };
    return labels[status] || status.replace('_', ' ');
  }

  getIconForType(type: string): string {
    const icons: any = {
      limpieza: 'ph-sparkle',
      endodoncia: 'ph-activity',
      cirugia: 'ph-first-aid-kit',
      ortodoncia: 'ph-brackets-square',
      valoracion: 'ph-clipboard-text'
    };
    return icons[type] || 'ph-calendar';
  }

  getEndTime(startTime: string, durationMinutes: number): string {
    if (!startTime) return '';
    const date = new Date(startTime);
    date.setMinutes(date.getMinutes() + (durationMinutes || 30));
    return date.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  }

  getDurationLabel(duration: number): string {
    if (!duration) return '30 min';
    if (duration >= 60) {
      const hours = Math.floor(duration / 60);
      const mins = duration % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${duration} min`;
  }
}
