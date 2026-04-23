import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientPortalService, CitaPatient, ServicioItem, SlotItem } from '../../../core/services/patient-portal.service';
import { AuthService } from '../../../core/services/auth.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { ProfileSetupComponent } from '../profile-setup/profile-setup';

type BookingStep = 'CLOSED' | 'SELECT_SERVICE' | 'SELECT_DATE' | 'SELECT_SLOT' | 'PAYMENT' | 'CONFIRM';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule, ProfileSetupComponent, FormsModule],
  templateUrl: './my-appointments.html',
  styleUrl: './my-appointments.scss',
})
export class MyAppointmentsComponent implements OnInit {
  private readonly portalService = inject(PatientPortalService);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  appointments = signal<CitaPatient[]>([]);
  loading = signal(true);

  // ─── Booking Drawer State ──────────────────────────────────────
  bookingStep = signal<BookingStep>('CLOSED');
  servicios = signal<ServicioItem[]>([]);
  selectedServicio = signal<ServicioItem | null>(null);
  selectedDate = signal('');
  slots = signal<SlotItem[]>([]);
  selectedSlot = signal<SlotItem | null>(null);
  motivoConsulta = signal('');
  bookingLoading = signal(false);
  clinicInfo = signal<{
    tenantId: string; 
    sucursalId: string;
    banco?: string;
    cuentaBancaria?: string;
    clabeInterbancaria?: string;
    telefono?: string;
  } | null>(null);

  // Pago
  referenciaPago = signal('');
  
  // Anticipo Dinámico: Exactamente el 20% del costo del servicio
  montoAnticipo = computed(() => {
    const s = this.selectedServicio();
    if (!s) return 0;
    // Cálculo exacto del 20%
    return s.precioBase * 0.20;
  });

  // Calendario simple
  calendarDays = signal<{date: string; day: number; disabled: boolean; past: boolean}[]>([]);
  currentMonth = signal(new Date().getMonth());
  currentYear = signal(new Date().getFullYear());

  get monthLabel(): string {
    const d = new Date(this.currentYear(), this.currentMonth(), 1);
    return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  }

  ngOnInit(): void {
    if (!this.showSetup()) this.loadAppointments();
  }

  showSetup() {
    const user = this.authService.currentUser();
    return user && user.pinCambiado === false;
  }

  onSetupComplete() {
    const user = this.authService.currentUser();
    if (user) {
      const updated = { ...user, pinCambiado: true, emailVerificado: true };
      localStorage.setItem('user', JSON.stringify(updated));
      this.authService.currentUser.set(updated);
    }
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.spinner.show();
    this.portalService.getMyAppointments().subscribe({
      next: (res) => { if (res.ok && res.result) this.appointments.set(res.result); this.loading.set(false); this.spinner.hide(); },
      error: () => { this.toastr.error('Error al cargar tus citas'); this.loading.set(false); this.spinner.hide(); }
    });
  }

  cancelAppointment(cita: CitaPatient): void {
    if (!confirm('¿Seguro que deseas cancelar esta cita?')) return;
    this.spinner.show();
    this.portalService.cancelAppointment(cita.id, 'Cancelada por el paciente').subscribe({
      next: (res) => { if (res.ok) { this.toastr.success('Cita cancelada'); this.loadAppointments(); } this.spinner.hide(); },
      error: () => { this.toastr.error('No se pudo cancelar'); this.spinner.hide(); }
    });
  }

  logout(): void { this.authService.logout(); }

  // ─── Booking Flow ──────────────────────────────────────────────
  openBooking(): void {
    this.bookingStep.set('SELECT_SERVICE');
    this.bookingLoading.set(true);
    // Primero obtenemos los datos de clínica del backend
    this.portalService.getMyClinic().subscribe({
      next: (res) => {
        if (res.ok && res.result) {
          this.clinicInfo.set(res.result);
          this.loadServicios();
        } else {
          this.toastr.error('No se pudo obtener la información de la clínica');
          this.bookingLoading.set(false);
        }
      },
      error: () => { this.toastr.error('Error al obtener datos de clínica'); this.bookingLoading.set(false); }
    });
  }

  closeBooking(): void {
    this.bookingStep.set('CLOSED');
    this.selectedServicio.set(null);
    this.selectedDate.set('');
    this.selectedSlot.set(null);
    this.slots.set([]);
    this.motivoConsulta.set('');
    this.referenciaPago.set('');
  }

  private loadServicios(): void {
    const clinic = this.clinicInfo();
    if (!clinic) { this.toastr.error('No se encontró la clínica asociada'); return; }
    this.bookingLoading.set(true);
    this.portalService.getServicios(clinic.tenantId).subscribe({
      next: (res) => { if (res.ok && res.result) this.servicios.set(res.result); this.bookingLoading.set(false); },
      error: () => { this.toastr.error('Error al cargar servicios'); this.bookingLoading.set(false); }
    });
  }

  selectServicio(s: ServicioItem): void {
    this.selectedServicio.set(s);
    this.bookingStep.set('SELECT_DATE');
    this.buildCalendar();
  }

  buildCalendar(): void {
    const year = this.currentYear();
    const month = this.currentMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    const days: {date: string; day: number; disabled: boolean; past: boolean}[] = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: '', day: 0, disabled: true, past: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      days.push({ date: dateStr, day: d, disabled: dt.getDay() === 0, past: dt < today });
    }
    this.calendarDays.set(days);
  }

  prevMonth(): void {
    if (this.currentMonth() === 0) { this.currentMonth.set(11); this.currentYear.update(y => y - 1); }
    else this.currentMonth.update(m => m - 1);
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.currentMonth() === 11) { this.currentMonth.set(0); this.currentYear.update(y => y + 1); }
    else this.currentMonth.update(m => m + 1);
    this.buildCalendar();
  }

  selectDate(day: {date: string; day: number; disabled: boolean; past: boolean}): void {
    if (day.disabled || day.past || !day.date) return;
    this.selectedDate.set(day.date);
    this.bookingStep.set('SELECT_SLOT');
    this.loadSlots();
  }

  private loadSlots(): void {
    const clinic = this.clinicInfo();
    if (!clinic) { this.toastr.error('Faltan datos de clínica'); return; }
    this.bookingLoading.set(true);
    this.portalService.getSlotsDisponibles(clinic.tenantId, clinic.sucursalId, this.selectedDate(), this.selectedServicio()!.id).subscribe({
      next: (res) => { if (res.ok && res.result) this.slots.set(res.result); this.bookingLoading.set(false); },
      error: () => { this.toastr.error('Error al cargar horarios'); this.bookingLoading.set(false); }
    });
  }

  selectSlot(slot: SlotItem): void {
    if (!slot.disponible) return;
    this.selectedSlot.set(slot);
    this.bookingStep.set('PAYMENT');
  }

  goToConfirm(): void {
    if (!this.referenciaPago().trim()) {
      this.toastr.warning('Por favor ingresa la referencia de tu transferencia');
      return;
    }
    this.bookingStep.set('CONFIRM');
  }

  goBackTo(step: BookingStep): void {
    this.bookingStep.set(step);
    if (step === 'SELECT_DATE') { this.selectedSlot.set(null); this.slots.set([]); }
    if (step === 'SELECT_SERVICE') { this.selectedServicio.set(null); this.selectedDate.set(''); }
    if (step === 'SELECT_SLOT') { this.referenciaPago.set(''); }
  }

  confirmBooking(): void {
    const slot = this.selectedSlot();
    const servicio = this.selectedServicio();
    if (!slot || !servicio) return;

    this.bookingLoading.set(true);
    const fechaHora = `${this.selectedDate()}T${slot.horaInicio}-06:00`;

    this.portalService.bookAppointment({
      servicioId: servicio.id,
      fechaHora,
      motivoConsulta: this.motivoConsulta() || undefined,
      referenciaPago: this.referenciaPago(),
      montoAnticipo: this.montoAnticipo()
    }).subscribe({
      next: (res) => {
        if (res.ok) {
          this.toastr.success('¡Cita agendada exitosamente!');
          this.closeBooking();
          this.loadAppointments();
        }
        this.bookingLoading.set(false);
      },
      error: (err) => {
        this.toastr.error(err?.error?.userMessage || 'Error al agendar la cita');
        this.bookingLoading.set(false);
      }
    });
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  copyToClipboard(text: string | undefined): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toastr.success('Copiado al portapapeles');
    });
  }

  contactWhatsApp(cita: CitaPatient): void {
    if (!cita.sucursalTelefono) {
      this.toastr.error('No se encontró el teléfono de la sucursal');
      return;
    }
    
    const phone = cita.sucursalTelefono.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola, necesito ayuda con mi cita folio ${cita.folio} para el día ${this.formatDate(cita.fechaHora)}.`);
    window.open(`https://wa.me/52${phone}?text=${message}`, '_blank');
  }
}
