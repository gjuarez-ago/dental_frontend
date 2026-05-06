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

  errorMessage: string | null = null;

  constructor() {
    this.patientForm = this.fb.group({
      nombreCompleto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[0-9\s-]+$/), Validators.maxLength(15)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]], // Ahora requerido por tu petición
      fechaNacimiento: ['', [Validators.required]],
      genero: ['OTRO', [Validators.required]],
      curp: ['', [Validators.maxLength(18)]],
      direccion: ['', [Validators.maxLength(255)]],
      ocupacion: ['', [Validators.maxLength(100)]],

      alergias: ['', [Validators.required, Validators.maxLength(500)]],
      enfermedadesCronicas: ['', [Validators.required, Validators.maxLength(500)]],
      antecedentesHeredofamiliares: ['', [Validators.maxLength(500)]],
      antecedentesNoPatologicos: ['', [Validators.maxLength(500)]],
      medicamentosActuales: ['', [Validators.maxLength(500)]],
      tipoSangre: ['O+'],

      // Privacidad
      aceptacionPrivacidad: [false, [Validators.requiredTrue]],
      fechaAceptacionPrivacidad: [null],

      // Emergencia
      emergenciaNombre: ['', [Validators.required, Validators.maxLength(150)]],
      emergenciaTelefono: ['', [Validators.required, Validators.pattern(/^[0-9\s-]+$/), Validators.maxLength(15)]],
      
      // Notas clínicas
      notasClinicas: ['', [Validators.maxLength(2000)]],

      // Auditoría
      saldoPendiente: [{ value: 0, disabled: true }],
      expedienteCompleto: [false]
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      this.toggleBodyScroll(this.isOpen);
      if (this.isOpen) {
        this.errorMessage = null;
        if (this.patientToEdit) {
          const data = { ...this.patientToEdit };
          
          // Normalizar Fecha para input date
          if (data.fechaNacimiento) {
            data.fechaNacimiento = new Date(data.fechaNacimiento).toISOString().split('T')[0];
          }
          
          // Normalizar Género
          if (data.genero) {
            data.genero = data.genero.toUpperCase();
          }

          // Asegurar que campos obligatorios no sean null para evitar invalidar el form
          data.alergias = data.alergias || 'Ninguna';
          data.enfermedadesCronicas = data.enfermedadesCronicas || 'Ninguna';
          data.aceptacionPrivacidad = data.aceptacionPrivacidad || false;

          this.patientForm.patchValue(data);
        } else {
          this.patientForm.reset({ 
            genero: 'OTRO', 
            tipoSangre: 'O+', 
            saldoPendiente: 0, 
            expedienteCompleto: false,
            aceptacionPrivacidad: false,
            alergias: 'Ninguna',
            enfermedadesCronicas: 'Ninguna'
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
      const rawValue = this.patientForm.getRawValue();
      
      // Limpiar y preparar datos
      const formData: any = { ...rawValue };
      
      // Asegurar fecha de privacidad
      if (formData.aceptacionPrivacidad && !formData.fechaAceptacionPrivacidad) {
          formData.fechaAceptacionPrivacidad = new Date().toISOString();
      }

      // Eliminar campos vacíos y metadatos que el backend no debe recibir en el body
      const metadataToClean = ['createdAt', 'proximaCita', 'tenantId', 'id'];

      Object.keys(formData).forEach(key => {
        // Si el valor es una cadena vacía, null o undefined, lo eliminamos (excepto booleanos como aceptacionPrivacidad)
        const value = formData[key];
        if (value === '' || value === null || value === undefined || metadataToClean.includes(key)) {
          delete formData[key];
        }
      });

      console.log('Enviando datos de paciente:', formData);

      const patientId = this.patientToEdit?.id;
      const request = patientId 
        ? this.patientService.updatePatient(patientId, formData)
        : this.patientService.createPatient(formData);

      request.pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (res) => {
            if (res) {
              console.log('Paciente guardado con éxito:', res);
              this.saved.emit(res);
              // Pequeña pausa para que el usuario vea el cambio (opcional)
              setTimeout(() => {
                this.closeDrawer();
              }, 300);
            }
          },
          error: (err) => {
            console.error('Error al guardar paciente:', err);
            this.isLoading = false;
            
            // Extraer mensaje del backend sin usar alert()
            if (err.error?.errorCode === 'DUPLICATE_PHONE') {
              this.errorMessage = 'Este número de teléfono ya está registrado con otro paciente.';
            } else if (err.error?.errorCode === 'DUPLICATE_EMAIL') {
              this.errorMessage = 'Este correo electrónico ya pertenece a otro expediente.';
            } else {
              this.errorMessage = err.error?.userMessage || 'Error al guardar el expediente. Revisa los datos.';
            }

            this.patientForm.markAllAsTouched();
          }
        });
    } else {
      console.warn('El formulario es inválido. Campos con error:');
      Object.keys(this.patientForm.controls).forEach(key => {
        const controlErrors = this.patientForm.get(key)?.errors;
        if (controlErrors) {
          console.log(`- Campo "${key}":`, controlErrors);
        }
      });

      this.patientForm.markAllAsTouched();
      // Scroll suave al primer error
      const firstInvalidControl = document.querySelector('.input-group.error, .privacy-card.error');
      if (firstInvalidControl) {
        firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
