import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges, OnDestroy, signal, computed, inject, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, finalize, of } from 'rxjs';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { PatientService } from '../../../../core/services/patient.service';
import { ServiceDentalService } from '../../../../core/services/service-dental.service';
import { Patient } from '../../../../core/models/patient.model';
import { ServicioDental } from '../../../../core/models/service-dental.model';
import { AppointmentStatus, Cita } from '../../../../core/models/appointment.model';
import { AuthService } from '../../../../core/services/auth.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { ToastrService } from 'ngx-toastr';
import { BookingService } from '../../../../core/services/booking.service';

@Component({
  selector: 'app-appointment-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-drawer.html',
  styleUrl: './appointment-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppointmentDrawerComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() initialDate: Date = new Date();
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Cita>();

  protected readonly layout = inject(LayoutService);
  private readonly fb = inject(FormBuilder);
  private readonly appointmentService = inject(AppointmentService);
  private readonly patientService = inject(PatientService);
  private readonly serviceDentalService = inject(ServiceDentalService);
  private readonly authService = inject(AuthService);
  private readonly bookingService = inject(BookingService);
  private readonly toastr = inject(ToastrService);
  private readonly destroy$ = new Subject<void>();

  readonly appointmentForm: FormGroup = this.fb.group({
    pacienteId: ['', [Validators.required]],
    doctorId: ['', [Validators.required]],
    sucursalId: [this.authService.currentUser()?.sucursalIdPrincipal || '', [Validators.required]],
    servicioId: ['', [Validators.required]],
    date: ['', [Validators.required]],
    time: ['', [Validators.required]],
    duracionMinutos: [30, [Validators.required, Validators.min(10)]],
    montoTotal: [0, [Validators.required, Validators.min(0)]],
    motivoConsulta: ['', [Validators.required]],
    notasRecepcion: ['']
  });

  // Catálogos
  readonly doctors = signal<any[]>([]);
  readonly services = signal<ServicioDental[]>([]);
  readonly patients = signal<Patient[]>([]);
  readonly isSaving = signal(false);
  readonly selectedServiceDuration = signal<number | null>(null);

  // Slots de Disponibilidad
  readonly availableSlots = signal<any[]>([]);
  readonly isLoadingSlots = signal(false);

  // Restricciones
  readonly minDate = signal(new Date().toISOString().split('T')[0]);

  // Búsqueda de pacientes
  readonly patientSearch = signal('');
  readonly filteredPatients = signal<Patient[]>([]);
  readonly showPatientResults = signal(false);
  readonly selectedPatient = signal<Patient | null>(null);

  // Señales reactivas para filtrado
  private readonly selectedDateSignal = toSignal(this.appointmentForm.get('date')!.valueChanges);
  private readonly selectedServiceIdSignal = toSignal(this.appointmentForm.get('servicioId')!.valueChanges);
  private readonly montoTotalSignal = toSignal(this.appointmentForm.get('montoTotal')!.valueChanges);
  private readonly currentTime = signal(new Date());

  constructor() {
    this.loadInitialData();

    // Efecto para cargar slots automáticamente cuando cambian fecha o servicio
    effect(() => {
      const date = this.selectedDateSignal();
      const serviceId = this.selectedServiceIdSignal();
      if (date && serviceId) {
        this.loadSlots(date, serviceId);
      } else {
        this.availableSlots.set([]);
      }
    }, { allowSignalWrites: true });

    // Efecto para modo edición/reprogramación
    effect(() => {
      const cita = this.layout.selectedCitaForEdit();
      if (cita && this.isOpen) {
        this.patchFormForEdit(cita);
      }
    }, { allowSignalWrites: true });

    // Efecto para modo nueva cita con paciente pre-seleccionado
    effect(() => {
      const patient = this.layout.selectedPatientForAppointment();
      if (patient && this.isOpen) {
        this.selectPatient(patient);
      }
    }, { allowSignalWrites: true });
  }

  private loadSlots(date: string, serviceId: string) {
    const user = this.authService.currentUser();
    if (!user?.tenantId || !user?.sucursalIdPrincipal) return;

    this.isLoadingSlots.set(true);
    this.bookingService.getAvailableSlots(user.tenantId, user.sucursalIdPrincipal, date, serviceId)
      .pipe(finalize(() => this.isLoadingSlots.set(false)))
      .subscribe({
        next: (slots) => {
          this.availableSlots.set(slots);
          // Si la hora actual de la cita ya no está en los slots disponibles (y no estamos editando), limpiar
          const currentTime = this.appointmentForm.get('time')?.value;
          if (currentTime && !slots.some(s => s.horaInicio === currentTime) && !this.layout.selectedCitaForEdit()) {
            this.appointmentForm.get('time')?.setValue('');
          }
        },
        error: (err) => {
          console.error('Error al cargar slots:', err);
          this.availableSlots.set([]);
        }
      });
  }

  selectSlot(hora: string) {
    this.appointmentForm.patchValue({ time: hora });
  }

  private patchFormForEdit(cita: any) {
    const dateObj = new Date(cita.fechaHora);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    const formattedTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

    this.appointmentForm.patchValue({
      pacienteId: cita.pacienteId,
      doctorId: cita.doctorId,
      sucursalId: cita.sucursalId,
      servicioId: cita.servicioId,
      date: `${y}-${m}-${d}`,
      time: formattedTime,
      duracionMinutos: cita.duracionMinutos,
      montoTotal: cita.montoTotal,
      motivoConsulta: cita.motivoConsulta,
      notasRecepcion: cita.notasRecepcion
    });

    this.patientSearch.set(cita.pacienteNombre || '');
    this.selectedPatient.set({ id: cita.pacienteId, nombreCompleto: cita.pacienteNombre } as any);
    this.appointmentForm.markAsPristine();
  }

  private loadInitialData() {
    this.serviceDentalService.getServicios().subscribe(svcs => {
      this.services.set(svcs);
    });

    // Carga inicial de doctores
    this.appointmentService.getDoctores().subscribe(docs => {
      this.doctors.set(docs);
      const plan = this.authService.currentUser()?.planSuscripcion;
      // Pre-selección inicial si es Plan SOLO o solo hay uno
      if (docs && (docs.length === 1 || plan === 'SOLO')) {
        if (docs[0] && !this.appointmentForm.get('doctorId')?.value) {
          this.appointmentForm.patchValue({ doctorId: docs[0].id });
        }
      }
    });

    // Escuchar cambios en el servicio para actualizar doctores calificados, precio y duración
    this.appointmentForm.get('servicioId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        const service = this.services().find(s => s.id === id);

        // Actualizar doctores según el servicio seleccionado
        this.appointmentService.getDoctores(id).subscribe(docs => {
          this.doctors.set(docs);
          const plan = this.authService.currentUser()?.planSuscripcion;
          if (docs && (docs.length === 1 || plan === 'SOLO')) {
            if (docs[0] && !this.appointmentForm.get('doctorId')?.value) {
              this.appointmentForm.patchValue({ doctorId: docs[0].id });
            }
          }
        });

        if (service) {
          const montoCtrl = this.appointmentForm.get('montoTotal');
          // Actualizamos siempre si el valor actual es 0 o si el valor coincide con el precio de un servicio previo
          // (lo que indica que no ha habido edición manual personalizada)
          montoCtrl?.patchValue(service.precioBase || 0);

          this.appointmentForm.patchValue({
            duracionMinutos: service.duracionMinutos || 30
          });
          this.selectedServiceDuration.set(service.duracionMinutos || 30);
        } else {
          this.selectedServiceDuration.set(null);
        }
      });

    // Nueva validación para evitar costos en 0 en citas nuevas
    this.appointmentForm.get('montoTotal')?.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(300), distinctUntilChanged())
      .subscribe(val => {
        // La validación ahora se maneja visualmente con isCostInvalid
      });
  }

  isCostInvalid = computed(() => {
    const serviceId = this.selectedServiceIdSignal();
    const service = this.services().find(s => s.id === serviceId);
    const val = this.montoTotalSignal() || 0;

    return service && service.precioBase > 0 && val < service.precioBase;
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.toggleBodyScroll(true);
      if (!this.layout.selectedCitaForEdit()) {
        this.resetFormWithDate();
      }
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.toggleBodyScroll(false);
    }
  }

  private resetFormWithDate() {
    const date = this.layout.selectedDate() || new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    this.appointmentForm.patchValue({
      date: formattedDate,
      time: '',
      pacienteId: '',
      servicioId: '',
      motivoConsulta: '',
      notasRecepcion: ''
    }, { emitEvent: true });

    this.patientSearch.set('');
    this.selectedPatient.set(null);
    this.appointmentForm.markAsPristine();
    this.appointmentForm.markAsUntouched();
  }

  ngOnDestroy() {
    this.toggleBodyScroll(false);
  }

  private toggleBodyScroll(lock: boolean) {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = lock ? 'hidden' : '';
    }
  }

  onPatientSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.patientSearch.set(term);
    if (term.length >= 2) {
      // Por simplicidad, filtramos la lista completa, pero se podría llamar a un search API
      this.patientService.getPatients().subscribe(all => {
        const filtered = all.filter(p => p.nombreCompleto.toLowerCase().includes(term.toLowerCase()));
        this.filteredPatients.set(filtered);
        this.showPatientResults.set(true);
      });
    } else {
      this.showPatientResults.set(false);
    }
  }

  selectPatient(patient: Patient) {
    this.appointmentForm.patchValue({ pacienteId: patient.id });
    this.patientSearch.set(patient.nombreCompleto);
    this.selectedPatient.set(patient);
    this.showPatientResults.set(false);
  }

  onSubmit() {
    if (this.appointmentForm.valid) {
      this.isSaving.set(true);
      const val = this.appointmentForm.value;

      // Combinar fecha y hora localmente para evitar desajustes de zona horaria (Timezone)
      const [year, month, day] = val.date.split('-').map(Number);
      const [hour, min] = val.time.split(':').map(Number);
      // Mes es 0-indexed en Date
      const dateObj = new Date(year, month - 1, day, hour, min);

      // Construir ISO string con offset local para evitar la conversión a UTC (Z)
      // que resulta confusa para el usuario (ej: de 4 PM a 10 PM Z)
      const pad = (n: number) => String(n).padStart(2, '0');
      const offset = -dateObj.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const offH = pad(Math.floor(Math.abs(offset) / 60));
      const offM = pad(Math.abs(offset) % 60);

      const fechaHora = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(min)}:00${sign}${offH}:${offM}`;

      const citaId = this.layout.selectedCitaForEdit()?.id;

      if (citaId) {
        // MODO REPROGRAMAR
        this.appointmentService.reprogramarCita(citaId, fechaHora, val.duracionMinutos, val.montoTotal)
          .pipe(finalize(() => this.isSaving.set(false)))
          .subscribe({
            next: (res) => {
              if (res.ok) {
                this.toastr.success('Cita reprogramada con éxito', 'Operación Exitosa');
                this.saved.emit(res.result);
                this.closeDrawer();
              }
            },
            error: (err) => {
              const msg = err.error?.userMessage || 'No se pudo reprogramar la cita.';
              this.toastr.error(msg, 'Error de Validación');
            }
          });
        return;
      }

      // MODO AGENDAR NUEVA
      const cita: Cita = {
        pacienteId: val.pacienteId,
        doctorId: val.doctorId,
        sucursalId: val.sucursalId,
        servicioId: val.servicioId,
        fechaHora: fechaHora,
        duracionMinutos: val.duracionMinutos,
        estado: AppointmentStatus.CONFIRMADA,
        motivoConsulta: val.motivoConsulta,
        notasRecepcion: val.notasRecepcion,
        montoTotal: val.montoTotal
      };

      this.appointmentService.agendarCita(cita)
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: (res) => {
            if (res) {
              this.saved.emit(res);
              this.closeDrawer();
            }
          },
          error: (err) => {
            console.error('Error al agendar:', err);
            const msg = err.error?.userMessage || 'No se pudo agendar la cita. Verifica la disponibilidad.';
            this.toastr.error(msg, 'Error de Validación');
          }
        });
    } else {
      this.appointmentForm.markAllAsTouched();
    }
  }

  closeDrawer() {
    this.close.emit();
  }

  isInvalid(controlName: string): boolean {
    const control = this.appointmentForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  getIconForService(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('limpieza')) return 'ph-sparkle';
    if (n.includes('extra')) return 'ph-scissors';
    if (n.includes('endo')) return 'ph-activity';
    if (n.includes('orto')) return 'ph-brackets-square';
    if (n.includes('valor') || n.includes('consul')) return 'ph-clipboard-text';
    if (n.includes('resina') || n.includes('calza')) return 'ph-seal';
    return 'ph-first-aid';
  }
}
