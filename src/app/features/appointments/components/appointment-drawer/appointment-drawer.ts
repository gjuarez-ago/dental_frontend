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

  // Restricciones
  readonly minDate = signal(new Date().toISOString().split('T')[0]);

  // Búsqueda de pacientes
  readonly patientSearch = signal('');
  readonly filteredPatients = signal<Patient[]>([]);
  readonly showPatientResults = signal(false);

  readonly tempHour = signal('09');
  readonly tempMinute = signal('00');
  readonly tempPeriod = signal('AM');

  // Señales reactivas para filtrado
  private readonly selectedDateSignal = toSignal(this.appointmentForm.get('date')!.valueChanges);
  private readonly currentTime = signal(new Date());

  readonly isToday = computed(() => {
    const val = this.selectedDateSignal();
    if (!val) return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return val === todayStr;
  });

  readonly periodsSelection = computed(() => {
    if (!this.isToday()) return ['AM', 'PM'];
    const now = this.currentTime();
    return now.getHours() >= 12 ? ['PM'] : ['AM', 'PM'];
  });

  readonly hoursSelection = computed(() => {
    const allHours = ['1','2','3','4','5','6','7','8','9','10','11','12'];
    if (!this.isToday()) return allHours;

    const now = this.currentTime();
    const currentPeriod = this.tempPeriod();
    const nowHour24 = now.getHours();
    const nowPeriod = nowHour24 >= 12 ? 'PM' : 'AM';

    if (currentPeriod === 'AM' && nowPeriod === 'PM') return []; // No debería pasar si periodsSelection filtra bien
    if (currentPeriod !== nowPeriod) return allHours;

    // Si estamos en el mismo período, filtrar horas pasadas
    let h12 = nowHour24 % 12;
    h12 = h12 === 0 ? 12 : h12;

    return allHours.filter(h => {
      const hNum = parseInt(h);
      // Caso especial 12: es la primera hora del ciclo (12 AM < 1 AM, 12 PM < 1 PM)
      const normalizedH = hNum === 12 ? 0 : hNum;
      const normalizedNow = h12 === 12 ? 0 : h12;
      return normalizedH >= normalizedNow;
    });
  });

  readonly minutesSelection = computed(() => {
    const allMins = ['00','15','30','45'];
    if (!this.isToday()) return allMins;

    const now = this.currentTime();
    const h12 = now.getHours() % 12 || 12;
    const p = now.getHours() >= 12 ? 'PM' : 'AM';

    if (this.tempPeriod() === p && parseInt(this.tempHour()) === h12) {
      return allMins.filter(m => parseInt(m) > now.getMinutes());
    }
    return allMins;
  });

  constructor() {
    this.loadInitialData();

    // Efecto para asegurar que la selección siempre sea válida al cambiar filtros
    effect(() => {
      const availablePeriods = this.periodsSelection();
      if (!availablePeriods.includes(this.tempPeriod())) {
        this.tempPeriod.set(availablePeriods[0] || 'PM');
      }

      const availableHours = this.hoursSelection();
      if (availableHours.length > 0 && !availableHours.includes(this.tempHour())) {
        this.tempHour.set(availableHours[0]);
      }

      const availableMins = this.minutesSelection();
      if (availableMins.length > 0 && !availableMins.includes(this.tempMinute())) {
        this.tempMinute.set(availableMins[0]);
      }
      
      this.updateTimeFromSelectors();
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

  private patchFormForEdit(cita: any) {
    const dateObj = new Date(cita.fechaHora);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    
    let h = dateObj.getHours();
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;

    this.tempHour.set(String(h));
    this.tempMinute.set(String(dateObj.getMinutes()).padStart(2, '0'));
    this.tempPeriod.set(period);
    this.updateTimeFromSelectors();

    this.appointmentForm.patchValue({
      pacienteId: cita.pacienteId,
      doctorId: cita.doctorId,
      sucursalId: cita.sucursalId,
      servicioId: cita.servicioId,
      date: `${y}-${m}-${d}`,
      duracionMinutos: cita.duracionMinutos,
      montoTotal: cita.montoTotal,
      motivoConsulta: cita.motivoConsulta,
      notasRecepcion: cita.notasRecepcion
    });
    
    this.patientSearch.set(cita.pacienteNombre || '');
    this.appointmentForm.markAsPristine();
  }

  private loadInitialData() {
    this.appointmentService.getDoctores().subscribe(docs => this.doctors.set(docs));
    this.serviceDentalService.getServicios().subscribe(svcs => {
      this.services.set(svcs);
    });

    // Escuchar cambios en el servicio para actualizar el precio sugerido y duración
    this.appointmentForm.get('servicioId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {
        const service = this.services().find(s => s.id === id);
        if (service) {
          this.appointmentForm.patchValue({ 
            montoTotal: service.precioBase || 0,
            duracionMinutos: service.duracionMinutos || 30
          });
          this.selectedServiceDuration.set(service.duracionMinutos || 30);
        } else {
          this.selectedServiceDuration.set(null);
        }
      });
  }

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
    
    // Inicializar selectores de tiempo (por defecto 09:00 AM o la hora actual redondeada)
    const now = new Date();
    let h = now.getHours();
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // la hora 0 es 12
    
    this.tempHour.set(String(h));
    this.tempMinute.set('00');
    this.tempPeriod.set(period);
    
    // Si la hora actual ya pasó (ej: son las 4:33 y pusimos 4:00), saltar a la siguiente disponible
    const currentMins = now.getMinutes();
    if (this.isToday() && currentMins > 0) {
      if (currentMins < 15) this.tempMinute.set('15');
      else if (currentMins < 30) this.tempMinute.set('30');
      else if (currentMins < 45) this.tempMinute.set('45');
      else {
        // Saltar a la siguiente hora
        this.tempMinute.set('00');
        h = h + 1;
        if (h > 12) h = 1;
        this.tempHour.set(String(h));
        if (h === 12) this.tempPeriod.set(period === 'AM' ? 'PM' : 'AM');
      }
    }

    this.updateTimeFromSelectors();

    this.appointmentForm.patchValue({
      date: formattedDate,
      pacienteId: '',
      servicioId: '',
      motivoConsulta: '',
      notasRecepcion: ''
    }, { emitEvent: true }); 
    
    this.patientSearch.set('');
    this.appointmentForm.markAsPristine();
    this.appointmentForm.markAsUntouched();
  }

  onTimePartChange(part: 'h' | 'm' | 'p', event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    if (part === 'h') this.tempHour.set(val);
    if (part === 'm') this.tempMinute.set(val);
    if (part === 'p') this.tempPeriod.set(val);
    this.updateTimeFromSelectors();
  }

  private updateTimeFromSelectors() {
    let h = parseInt(this.tempHour());
    const m = this.tempMinute();
    const p = this.tempPeriod();

    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;

    const formattedTime = `${String(h).padStart(2, '0')}:${m}`;
    this.appointmentForm.patchValue({ time: formattedTime });
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
        this.appointmentService.reprogramarCita(citaId, fechaHora, val.duracionMinutos)
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
}
