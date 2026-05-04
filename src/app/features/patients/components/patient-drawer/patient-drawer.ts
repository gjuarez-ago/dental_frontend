import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PatientService } from '../../../../core/services/patient.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-patient-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patient-drawer.html',
  styleUrl: './patient-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientDrawerComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() patientToEdit: any = null; // Usamos any por ahora si hay discrepancias menores de tipos, o Patient
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  
  patientForm: FormGroup;
  isLoading = false;

  constructor() {
    this.patientForm = this.fb.group({
      nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9\s-]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      fechaNacimiento: ['', [Validators.required]],
      genero: ['OTRO', [Validators.required]],
      curp: [''],
      direccion: [''],
      ocupacion: [''],
      
      alergias: ['', [Validators.required]], 
      enfermedadesCronicas: ['', [Validators.required]],
      antecedentesHeredofamiliares: [''],
      antecedentesNoPatologicos: [''],
      medicamentosActuales: [''],
      tipoSangre: ['O+'],
      
      // Privacidad
      aceptacionPrivacidad: [false, [Validators.requiredTrue]],
      fechaAceptacionPrivacidad: [null],
      
      // Emergencia
      emergenciaNombre: ['', [Validators.required]],
      emergenciaTelefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      
      // Notas
      motivoVisita: ['', [Validators.required]],
      notasClinicas: [''],

      // Auditoría (Campos gestionados internamente)
      saldoPendiente: [{ value: 0, disabled: true }, [Validators.min(0)]],
      expedienteCompleto: [false]
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      this.toggleBodyScroll(this.isOpen);
      if (this.isOpen) {
        if (this.patientToEdit) {
          this.patientForm.patchValue(this.patientToEdit);
        } else {
          this.patientForm.reset({ 
            genero: 'OTRO', 
            tipoSangre: 'O+', 
            saldoPendiente: 0, 
            expedienteCompleto: false,
            aceptacionPrivacidad: false
          });
        }
      }
    }
  }

  ngOnDestroy() {
    this.toggleBodyScroll(false);
  }

  private toggleBodyScroll(lock: boolean) {
    if (typeof document !== 'undefined') {
      if (lock) {
        document.body.classList.add('no-scroll');
      } else {
        document.body.classList.remove('no-scroll');
      }
    }
  }

  onSubmit() {
    if (this.patientForm.valid) {
      this.isLoading = true;
      const formData = { ...this.patientForm.value };
      
      // Set fechaAceptacionPrivacidad si se aceptó y no tenía fecha
      if (formData.aceptacionPrivacidad && !formData.fechaAceptacionPrivacidad) {
          formData.fechaAceptacionPrivacidad = new Date().toISOString();
      }

      const patientId = this.patientToEdit?.id;
      
      const request = patientId 
        ? this.patientService.updatePatient(patientId, formData)
        : this.patientService.createPatient(formData);

      request.pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (res) => {
            if (res) {
              this.saved.emit(res);
              this.patientForm.reset({ genero: 'OTRO', tipoSangre: 'O+' });
              this.closeDrawer();
            }
          },
          error: (err) => {
            console.error('Error al guardar paciente:', err);
            // Aquí se podría mostrar un toast de error
          }
        });
    } else {
      Object.values(this.patientForm.controls).forEach(control => {
        control.markAsTouched();
      });
    }
  }

  closeDrawer() {
    this.close.emit();
  }

  isInvalid(controlName: string): boolean {
    const control = this.patientForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
