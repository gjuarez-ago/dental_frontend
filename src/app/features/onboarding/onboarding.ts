import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService, Estado, Municipio } from '../../core/services/catalog.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NgxSpinnerModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly toastr = inject(ToastrService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly catalogService = inject(CatalogService);

  readonly states = signal<Estado[]>([]);
  readonly municipalities = signal<Municipio[]>([]);
  readonly loadingPhoto = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);

  readonly labels = computed(() => {
    return {
      clinicTitle: 'Tu Consultorio',
      clinicSubtitle: 'Configura los datos básicos de tu espacio de atención.',
      clinicNameLabel: 'Nombre del Consultorio',
      clinicNamePlaceholder: 'Ej. Consultorio Dr. García',
      scheduleSubtitle: 'Define los días y horas en los que estarás disponible para recibir pacientes.',
      serviceSubtitle: 'Agrega el servicio principal que ofreces para habilitar tu agenda.'
    };
  });

  readonly currentStep = signal(1);
  readonly totalSteps = 4;

  // Forms
  readonly legalForm = this.fb.group({
    cedulaProfesional: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20), Validators.pattern(/^[0-9]+$/)]],
    confirmaCedula: [false, Validators.requiredTrue]
  });

  readonly profileForm = this.fb.group({
    biografia: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(600)]],
    fotografiaUrl: [''],
    genero: ['', Validators.required]
  });

  readonly clinicForm = this.fb.group({
    nombreConsultorio: [''],
    telefono: ['', [Validators.pattern(/^\d+$/), Validators.minLength(10)]],
    zonaHoraria: ['America/Mexico_City', Validators.required],
    habilitarComprobantes: [true],
    banco: [''],
    cuentaBancaria: ['', [Validators.pattern(/^\d+$/), Validators.minLength(10), Validators.maxLength(20)]],
    clabeInterbancaria: ['', [Validators.pattern(/^\d{18}$/)]],
    estadoId: [''],
    municipioId: [{value: '', disabled: true}]
  });

  readonly scheduleForm = this.fb.group({
    mon: this.createDayGroup(),
    tue: this.createDayGroup(),
    wed: this.createDayGroup(),
    thu: this.createDayGroup(),
    fri: this.createDayGroup(),
    sat: this.createDayGroup(false),
    sun: this.createDayGroup(false)
  });

  readonly serviceForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    duracion: [30, [Validators.required, Validators.min(10), Validators.max(480)]],
    precio: [0, [Validators.required, Validators.min(0), Validators.max(1000000)]]
  });

  constructor() {
    // Cargar estados al iniciar
    this.catalogService.getStates().subscribe(res => this.states.set(res));

    // Escuchar cambios en estado para cargar municipios
    this.clinicForm.get('estadoId')?.valueChanges.subscribe(stateId => {
      const municipioCtrl = this.clinicForm.get('municipioId');
      municipioCtrl?.setValue('');
      this.municipalities.set([]);
      
      if (stateId) {
        municipioCtrl?.enable();
        this.catalogService.getMunicipalitiesByState(stateId).subscribe(res => {
          this.municipalities.set(res);
        });
      } else {
        municipioCtrl?.disable();
      }
    });

    // Pre-llenado inicial
    const user = this.authService.currentUser();
    if (user) {
      this.clinicForm.patchValue({
        nombreConsultorio: user.nombreComercial || '',
        telefono: user.sucursalTelefono || '',
        estadoId: user.estadoId || '',
        municipioId: user.municipioId || ''
      });
      // Asegurar que si hay estado, el municipio esté habilitado
      if (user.estadoId) {
        this.clinicForm.get('municipioId')?.enable();
      }
    }
  }

  private createDayGroup(active = true) {
    return this.fb.group({
      active: [active],
      start: ['09:00'],
      end: ['18:00']
    });
  }

  next() {
    const step = this.currentStep();
    if (step === 1 && this.legalForm.invalid) {
      this.legalForm.markAllAsTouched();
      return;
    }
    if (step === 2 && (this.profileForm.invalid || this.clinicForm.invalid)) {
      this.profileForm.markAllAsTouched();
      this.clinicForm.markAllAsTouched();
      return;
    }
    if (step === 3 && this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    if (step < this.totalSteps) {
      this.currentStep.update(s => s + 1);
    }
  }

  prev() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  cancelAccount() {
    this.toastr.warning('Para usar Novatia es obligatorio contar con cédula profesional. Tu cuenta será desactivada.', 'Aviso Legal');
    // Aquí se llamaría a un endpoint de cancelación
    setTimeout(() => this.authService.logout(), 3000);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // 1. Validaciones básicas en frontend
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.toastr.error('Solo se permiten imágenes (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toastr.error('La imagen no debe pesar más de 5MB');
      return;
    }

    // 2. Guardar archivo para subida diferida
    this.selectedFile.set(file);
    
    // 3. Generar preview local
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl.set(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async finish() {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    this.spinner.show();

    // 1. Subir foto si hay una seleccionada
    if (this.selectedFile()) {
      const formData = new FormData();
      formData.append('file', this.selectedFile()!);

      try {
        const res = await lastValueFrom(this.http.post<any>(`${environment.apiUrl}/onboarding/upload-photo`, formData));
        if (res.ok) {
          this.profileForm.patchValue({ fotografiaUrl: res.result });
        }
      } catch (e) {
        this.spinner.hide();
        this.toastr.error('Error al subir la fotografía');
        return;
      }
    }

    const data = {
      empresa: this.clinicForm.value,
      perfil: this.profileForm.value,
      horarios: this.scheduleForm.value,
      servicio: this.serviceForm.value,
      cedulaProfesional: this.legalForm.value.cedulaProfesional,
      cedulaConfirmada: this.legalForm.value.confirmaCedula
    };

    this.http.post(`${environment.apiUrl}/onboarding/complete`, data).subscribe({
      next: () => {
        this.spinner.hide();
        this.toastr.success('¡Configuración completada!', 'Bienvenido');
        // Actualizar el estado del usuario localmente y persistir incluyendo la cédula
        this.authService.updateUserState({ 
          onboardingCompletado: true,
          cedulaProfesional: this.legalForm.value.cedulaProfesional || undefined,
          fotografiaUrl: this.profileForm.value.fotografiaUrl || undefined,
          biografia: this.profileForm.value.biografia || undefined,
          genero: this.profileForm.value.genero || undefined,
          nombreComercial: this.clinicForm.value.nombreConsultorio || undefined,
          sucursalTelefono: this.clinicForm.value.telefono || undefined
        });
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.spinner.hide();
        this.toastr.error('Hubo un error al guardar tu configuración.');
      }
    });
  }
}
