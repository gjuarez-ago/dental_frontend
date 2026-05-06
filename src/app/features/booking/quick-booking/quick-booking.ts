import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { SlotDisponibilidad, DisponibilidadDia } from '../../../core/models/appointment.model';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { ServicioDental } from '../../../core/models/service-dental.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-quick-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgxSpinnerModule, ConfirmModalComponent],
  templateUrl: './quick-booking.html',
  styleUrl: './quick-booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickBookingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);
  private readonly fb = inject(BookingService);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly toastr = inject(ToastrService);
  private readonly destroy$ = new Subject<void>();

  // Modal State
  readonly showModal = signal(false);
  readonly modalConfig = signal({
    title: 'Aviso',
    message: '',
    type: 'info' as 'info' | 'danger' | 'warning' | 'success',
    icon: 'ph ph-info'
  });

  // ID's dinámicos desde URL
  tenantId = signal<string | null>(null);
  sucursalId = signal<string | null>(null);

  // Datos maestros
  servicios = signal<ServicioDental[]>([]);
  clinicInfo = this.fb.bankDetails;

  // Estado del flujo "Una sola vista"
  selectedService = signal<ServicioDental | null>(null);
  selectedDate = signal<Date | null>(null);
  selectedSlot = signal<SlotDisponibilidad | null>(null);
  
  // Disponibilidad
  monthlyDays = signal<DisponibilidadDia[]>([]);
  availableSlots = signal<SlotDisponibilidad[]>([]);
  currentMonthDate = signal<Date>(new Date());

  // Formulario
  customerName = '';
  customerPhone = '';
  notes = '';
  bookingEmail = '';
  lastSetupPin = '';
  isSubmitting = signal(false);
  isBookingSuccess = signal(false);

  // Computeds
  readonly currentMonthName = computed(() => {
    const name = this.currentMonthDate().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });

  readonly filteredSlots = computed(() => {
    const slots = this.availableSlots();
    const date = this.selectedDate();
    if (!date) return slots;

    const now = new Date();
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();

    if (!isToday) return slots;

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    return slots.filter(slot => {
      const [h, m] = slot.horaInicio.split(':').map(Number);
      if (h > currentHour) return true;
      if (h === currentHour && m > currentMin) return true;
      return false;
    });
  });

  readonly depositAmount = computed(() => {
    const s = this.selectedService();
    if (!s) return 0;
    return s.precioBase * this.clinicInfo().depositPercentage;
  });

  ngOnInit(): void {
    const tid = this.route.snapshot.paramMap.get('tenantId');
    if (!tid) {
      this.router.navigate(['/']);
      return;
    }
    this.tenantId.set(tid);
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    const tid = this.tenantId();
    if (!tid) return;

    this.spinner.show();
    forkJoin({
      sucursales: this.fb.getPublicSucursales(tid),
      servicios: this.fb.getPublicServices(tid)
    }).subscribe({
      next: (data) => {
        this.servicios.set(data.servicios);
        if (data.sucursales.length > 0) {
          const sid = data.sucursales[0].id;
          this.sucursalId.set(sid);
          this.fb.getClinicInfo(tid, sid);
          this.loadMonthlyAvailability();
        }
        this.spinner.hide();
      },
      error: () => {
        this.toastr.error('Error al cargar la información de la clínica');
        this.spinner.hide();
      }
    });
  }

  loadMonthlyAvailability(): void {
    const tid = this.tenantId();
    const sid = this.sucursalId();
    const date = this.currentMonthDate();
    const svcId = this.selectedService()?.id;

    if (!tid || !sid) return;

    this.fb.getMonthlyAvailability(tid, sid, date.getMonth() + 1, date.getFullYear(), svcId)
      .subscribe(days => this.monthlyDays.set(days));
  }

  changeMonth(delta: number): void {
    const next = new Date(this.currentMonthDate());
    next.setMonth(next.getMonth() + delta);
    this.currentMonthDate.set(next);
    this.selectedDate.set(null);
    this.availableSlots.set([]);
    this.loadMonthlyAvailability();
  }

  selectService(svc: ServicioDental): void {
    this.selectedService.set(svc);
    this.selectedDate.set(null);
    this.selectedSlot.set(null);
    this.availableSlots.set([]);
    this.loadMonthlyAvailability();
  }

  selectDate(day: DisponibilidadDia): void {
    if (!day.esLaboral || day.estaLlena || this.isPastDay(day.fecha)) return;
    
    const [y, m, d] = day.fecha.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    this.selectedDate.set(dateObj);
    this.selectedSlot.set(null);
    
    const tid = this.tenantId();
    const sid = this.sucursalId();
    const svcId = this.selectedService()?.id;

    if (tid && sid && svcId) {
      this.spinner.show();
      this.fb.getAvailableSlots(tid, sid, day.fecha, svcId).subscribe(slots => {
        this.availableSlots.set(slots);
        this.spinner.hide();
      });
    }
  }

  isPastDay(dateStr: string): boolean {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const minDays = this.clinicInfo().leadDays || 1;
    const minSelectableDate = new Date(today);
    minSelectableDate.setDate(today.getDate() + minDays);

    return dayDate < minSelectableDate;
  }

  async onFileSelected(event: any): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.warning('Solo se permiten imágenes (JPG/PNG).');
      return;
    }

    if (!this.selectedService() || !this.selectedDate() || !this.selectedSlot() || !this.customerName || !this.customerPhone) {
      this.toastr.warning('Por favor completa todos los campos antes de subir el comprobante.');
      return;
    }

    this.isSubmitting.set(true);
    this.spinner.show();

    try {
      // Agendar
      const slot = this.selectedSlot();
      const date = this.selectedDate();
      if (!slot || !date) return;

      const pad = (n: number) => n < 10 ? '0' + n : n;
      const offset = -date.getTimezoneOffset();
      const absOffset = Math.abs(offset);
      const offsetStr = (offset >= 0 ? '+' : '-') + pad(Math.floor(absOffset / 60)) + ':' + pad(absOffset % 60);
      const timeParts = slot.horaInicio.split(':');
      const fechaLocalConOffset = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(parseInt(timeParts[0]))}:${pad(parseInt(timeParts[1]))}:00${offsetStr}`;

      const citaDto = {
        sucursalId: this.sucursalId(),
        servicioId: this.selectedService()?.id,
        fechaHora: fechaLocalConOffset,
        duracionMinutos: this.selectedService()?.duracionMinutos || 30,
        pacienteNombre: this.customerName,
        pacienteTelefono: this.customerPhone,
        motivoConsulta: this.notes || this.selectedService()?.nombre,
        montoTotal: this.selectedService()?.precioBase || 0,
        montoPagado: this.depositAmount()
      };

      this.fb.confirmBooking(citaDto as any, file).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.spinner.hide();
          if (res.ok) {
            this.toastr.success('¡Cita agendada exitosamente!', 'Éxito');
            this.isBookingSuccess.set(true);
            setTimeout(() => {
              const successEl = document.getElementById('success-flow');
              successEl?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          } else {
            this.toastr.error(res.userMessage || 'Error al agendar cita');
          }
        },
        error: () => {
          this.isSubmitting.set(false);
          this.spinner.hide();
        }
      });
    } catch (e) {
      this.toastr.error('Error al procesar la solicitud');
      this.isSubmitting.set(false);
      this.spinner.hide();
    }
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  getDaysInMonth(): (DisponibilidadDia | null)[] {
    const date = this.currentMonthDate();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const leadingEmpty = firstDay === 0 ? 6 : firstDay - 1;
    
    const days: (DisponibilidadDia | null)[] = [];
    for (let i = 0; i < leadingEmpty; i++) days.push(null);
    
    return [...days, ...this.monthlyDays()];
  }

  isEmailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.bookingEmail);
  }

  setupAccount(): void {
    if (!this.isEmailValid() || !this.customerPhone) {
      this.toastr.warning('Ingresa un correo electrónico válido.', 'Correo Inválido');
      return;
    }

    this.isSubmitting.set(true);
    this.spinner.show();

    this.authService.setupAccess({ telefono: this.customerPhone, email: this.bookingEmail }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.spinner.hide();
        this.lastSetupPin = res.temporaryPin || '';
        if (res.token) {
          if (res.temporaryPin === 'YA_TIENES_CUENTA') {
            this.modalConfig.set({
              title: '¡Ya tienes cuenta!',
              message: 'Identificamos que ya habías generado tu acceso antes. Te redirigiremos a tu portal para que ingreses con tu número y NIP de siempre.',
              type: 'info',
              icon: 'ph ph-user-check'
            });
          } else {
            const pinMsg = res.temporaryPin ? `<br><br><b>Tu NIP de acceso es: <span style="font-size:1.5rem; color:#0d9488">${res.temporaryPin}</span></b><br><br>Úsalo para iniciar sesión.` : '';
            this.modalConfig.set({
              title: '¡Acceso Creado!',
              message: `Hemos vinculado tu correo exitosamente.${pinMsg}`,
              type: 'success',
              icon: 'ph ph-check-circle'
            });
          }
          this.showModal.set(true);
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.spinner.hide();
      }
    });
  }

  onModalConfirm(): void {
    this.showModal.set(false);
    if (this.lastSetupPin === 'YA_TIENES_CUENTA') {
      this.authService.clearSession();
      this.router.navigate(['/login']);
    } else {
      // Es nuevo, dejarlo pasar directo
      this.router.navigate(['/mis-citas']);
    }
  }
}
