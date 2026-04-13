import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges, OnDestroy, signal, computed, inject } from '@angular/core';
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
    motivoConsulta: ['', [Validators.required]],
    notasRecepcion: ['']
  });

  // Catálogos
  readonly doctors = signal<any[]>([]);
  readonly services = signal<ServicioDental[]>([]);
  readonly patients = signal<Patient[]>([]);
  readonly isSaving = signal(false);

  // Restricciones
  readonly minDate = signal(new Date().toISOString().split('T')[0]);

  // Búsqueda de pacientes
  readonly patientSearch = signal('');
  readonly filteredPatients = signal<Patient[]>([]);
  readonly showPatientResults = signal(false);

  // Selectores de tiempo 12h
  readonly hoursSelection = signal<string[]>(['1','2','3','4','5','6','7','8','9','10','11','12']);
  readonly minutesSelection = signal<string[]>(['00','15','30','45']);
  readonly periodsSelection = signal<string[]>(['AM','PM']);

  readonly tempHour = signal('09');
  readonly tempMinute = signal('00');
  readonly tempPeriod = signal('AM');

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    this.appointmentService.getDoctores().subscribe(docs => this.doctors.set(docs));
    this.serviceDentalService.getServicios().subscribe(svcs => this.services.set(svcs));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.toggleBodyScroll(true);
      this.resetFormWithDate();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.toggleBodyScroll(false);
    }
  }

  private resetFormWithDate() {
    const date = this.initialDate || new Date();
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
    
    this.updateTimeFromSelectors();

    this.appointmentForm.patchValue({
      date: formattedDate
    });
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

      const cita: Cita = {
        pacienteId: val.pacienteId,
        doctorId: val.doctorId,
        sucursalId: val.sucursalId,
        servicioId: val.servicioId,
        fechaHora: fechaHora,
        duracionMinutos: val.duracionMinutos,
        estado: AppointmentStatus.PENDIENTE,
        motivoConsulta: val.motivoConsulta,
        notasRecepcion: val.notasRecepcion
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
            // La mayoría de los errores los maneja el interceptor,
            // pero podemos añadir un mensaje genérico si el interceptor no tiene userMessage
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
