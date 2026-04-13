import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../core/services/appointment.service';
import { LayoutService } from '../../core/services/layout.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { signal, computed } from '@angular/core';
import { Cita, AppointmentStatus } from '../../core/models/appointment.model';
import { finalize } from 'rxjs';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  appointments: Cita[];
}

import { AuthService } from '../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';

import { PaymentDrawerComponent } from './components/payment-drawer/payment-drawer';
import { AppointmentDrawerComponent } from './components/appointment-drawer/appointment-drawer';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, PaymentDrawerComponent, AppointmentDrawerComponent],
  templateUrl: './appointments.html',
  styleUrl: './appointments.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentsComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  protected readonly layout = inject(LayoutService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly authService = inject(AuthService);
  private readonly toastr = inject(ToastrService);

  // Exponer enum al template
  protected readonly AppointmentStatus = AppointmentStatus;

  // Estados del Calendario
  readonly viewDate = signal(new Date());   // Mes que se está viendo
  readonly selectedDate = signal(new Date()); // Día seleccionado
  readonly monthAppointments = signal<Cita[]>([]); // Citas de todo el mes (para el grid)
  readonly appointments = signal<Cita[]>([]); // Citas del día seleccionado (sidebar)
  
  // Estados de Pago
  readonly isPaymentDrawerOpen = signal(false);
  readonly selectedAppointmentForPayment = signal<Cita | null>(null);
  
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
    today.setHours(0,0,0,0);
    const isToday = selected.getTime() === today.getTime();
    
    const dateStr = selected.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
    return isToday ? `Hoy, ${dateStr}` : dateStr;
  });

  // Generación de la tira diaria horizontal (31 días para realismo y navegación)
  readonly weekDays = computed(() => {
    const selected = this.selectedDate();
    const days = [];
    
    // Generamos un rango de 31 días: -10 días y +20 días desde el seleccionado
    const startRange = new Date(selected);
    startRange.setDate(selected.getDate() - 10);
    startRange.setHours(0,0,0,0);
    
    const today = new Date();
    today.setHours(0,0,0,0);

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
    today.setHours(0,0,0,0);
    const selected = this.selectedDate();
    selected.setHours(0,0,0,0);

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
  }

  // Carga las citas de todo el mes visualizado
  loadMonthData() {
    const date = this.viewDate();
    // Inicio del mes en local -> UTC
    const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0).toISOString();
    // Fin del mes en local -> UTC
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const sucursalId = this.authService.currentUser()?.sucursalIdPrincipal || '';

    if (!sucursalId) return;

    this.appointmentService.getCitas(sucursalId, start, end)
      .subscribe(data => {
        this.monthAppointments.set(data);
        // Sincronizar sidebar con el día seleccionado al cargar el mes
        this.refreshDailyAppointments();
      });
  }

  selectDay(day: CalendarDay | any) {
    const date = day instanceof Date ? day : day.date;
    const cleanDate = new Date(date);
    cleanDate.setHours(0,0,0,0);
    
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
    const date = this.selectedDate();
    // Inicio del día local -> UTC
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString();
    // Fin del día local -> UTC
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
    const sucursalId = this.authService.currentUser()?.sucursalIdPrincipal || '';

    if (!sucursalId) return;

    this.spinner.show();
    this.appointmentService.getCitas(sucursalId, start, end)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe(data => this.appointments.set(data));
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
        // Si el estado es COMPLETADA, abrimos el drawer de pagos automáticamente
        if (status === AppointmentStatus.COMPLETADA) {
            this.openPaymentDrawer(res);
        }
        // También actualizar el grid mensual si cambió a Confirmada o dejó de serlo
        this.loadMonthData();
      }
    });
  }

  openPaymentDrawer(cita: Cita) {
    this.selectedAppointmentForPayment.set(cita);
    this.isPaymentDrawerOpen.set(true);
  }

  onPaymentReceived() {
     // Podríamos recargar algo si fuera necesario, pero el drawer ya refresca su resumen
     // Tal vez refrescar el sidebar para ver badges de pagos (a implementar luego si se desea)
  }

  onAppointmentSaved(cita: Cita) {
    if (!cita) return;
    
    this.toastr.success(`Cita agendada para ${cita.pacienteNombre}`, '¡Éxito!');
    this.layout.closeAppointmentDrawer();
    
    // 1. Actualización Optimista: Inyectamos la cita directamente en los signals
    // para que el usuario la vea SIN ESPERAR a la red.
    const selected = this.selectedDate();
    const appDate = new Date(cita.fechaHora);
    
    // Si la cita es para el día que estamos viendo, la añadimos al feed inmediatamente
    if (appDate.getDate() === selected.getDate() && 
        appDate.getMonth() === selected.getMonth() &&
        appDate.getFullYear() === selected.getFullYear()) {
      this.appointments.update(prev => [cita, ...prev].sort((a,b) => 
        new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()
      ));
    }

    // 2. Actualizamos también los dots del selector horizontal
    this.monthAppointments.update(prev => [...prev, cita]);

    // 3. De todas formas refrescamos desde el servidor por seguridad en background
    this.refreshDailyAppointments();
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
}
