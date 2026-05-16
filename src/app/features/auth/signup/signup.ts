import { Component, ChangeDetectionStrategy, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, of, catchError, tap } from 'rxjs';
import { AuthService, EmailCheckResponse, RegisterTenantPayload, TenantType } from '../../../core/services/auth.service';
import { CatalogService, Estado, Municipio } from '../../../core/services/catalog.service';

type SignupStep = 'EMAIL' | 'BUSINESS' | 'OWNER';

interface AccountType {
  value: TenantType;
  title: string;
  desc: string;
  icon: string;
  disabled?: boolean;
  badge?: string;
}

interface Giro {
  value: string;
  label: string;
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgxSpinnerModule],
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);
  private readonly catalogService = inject(CatalogService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly toastr = inject(ToastrService);
  private readonly destroy$ = new Subject<void>();

  readonly step = signal<SignupStep>('EMAIL');
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly emailStatus = signal<EmailCheckResponse['status'] | null>(null);
  readonly emailHint = signal<string>('');
  
  readonly states = signal<Estado[]>([]);
  readonly municipalities = signal<Municipio[]>([]);

  readonly accountTypes: AccountType[] = [
    { value: 'DOCTOR_INDEPENDIENTE', title: 'Doctor independiente', desc: 'Atención personal en consultorio propio.', icon: 'ph ph-user-circle-gear', badge: '15 días de prueba gratis' }
  ];

  readonly giros: Giro[] = [
    { value: 'MEDICINA_GENERAL', label: 'Medicina General' },
    { value: 'DENTAL', label: 'Odontología' },
    { value: 'PEDIATRIA', label: 'Pediatría' },
    { value: 'GINECOLOGIA', label: 'Ginecología' },
    { value: 'DERMATOLOGIA', label: 'Dermatología' },
    { value: 'PSICOLOGIA', label: 'Psicología' },
    { value: 'NUTRICION', label: 'Nutrición' },
    { value: 'CARDIOLOGIA', label: 'Cardiología' },
    { value: 'ORTOPEDIA', label: 'Ortopedia' },
    { value: 'GENERAL', label: 'Otro / General' }
  ];

  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly businessForm = this.fb.nonNullable.group({
    tenantType: ['DOCTOR_INDEPENDIENTE' as TenantType, [Validators.required]],
    tenantName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    giro: ['', [Validators.required]],
    estadoId: ['', [Validators.required]],
    municipioId: ['', [Validators.required]]
  });

  readonly ownerForm = this.fb.nonNullable.group({
    adminFullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    adminPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    adminNip: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    sucursalDireccion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    sucursalTelefono: ['', [Validators.maxLength(20)]]
  });

  // El status NOT_FOUND solo se emite cuando el form era válido al consultar,
  // así que basta con esa señal para habilitar el botón.
  readonly canContinueEmail = computed(() => this.emailStatus() === 'NOT_FOUND');

  constructor() {
    this.emailForm.controls.email.valueChanges
      .pipe(
        // Limpiar inmediatamente cualquier estado anterior al editar:
        // mantiene el botón deshabilitado hasta confirmar que el nuevo correo está libre.
        tap(() => {
          this.emailStatus.set(null);
          this.emailHint.set('');
        }),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(value => {
          if (!value || this.emailForm.controls.email.invalid) return of(null);
          return this.authService.checkEmailAvailability(value).pipe(
            catchError(() => of(null))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(res => {
        if (!res) return;
        this.emailStatus.set(res.status);
        this.emailHint.set(res.message);
      });

    // Cargar estados
    this.catalogService.getStates().subscribe(res => this.states.set(res));

    // Escuchar cambios en estado para cargar municipios
    this.businessForm.controls.estadoId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(stateId => {
        this.businessForm.controls.municipioId.setValue('');
        this.municipalities.set([]);
        if (stateId) {
          this.catalogService.getMunicipalitiesByState(stateId).subscribe(res => {
            this.municipalities.set(res);
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goBack(): void {
    if (this.step() === 'OWNER') { this.step.set('BUSINESS'); return; }
    if (this.step() === 'BUSINESS') { this.step.set('EMAIL'); return; }
    if (window.history.length > 1) this.location.back();
    else this.router.navigate(['/']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  onContinueFromEmail(): void {
    if (!this.canContinueEmail()) return;
    this.step.set('BUSINESS');
  }

  onContinueFromBusiness(): void {
    if (this.businessForm.invalid) {
      this.businessForm.markAllAsTouched();
      return;
    }
    this.step.set('OWNER');
  }

  onPhoneInput(controlName: 'adminPhone' | 'sucursalTelefono', event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.ownerForm.controls[controlName].setValue(input.value);
  }

  onNipInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').substring(0, 6);
    this.ownerForm.controls.adminNip.setValue(input.value);
  }

  onSubmitRegister(): void {
    if (this.ownerForm.invalid || this.isLoading()) {
      this.ownerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    const business = this.businessForm.getRawValue();
    const owner = this.ownerForm.getRawValue();
    const payload: RegisterTenantPayload = {
      tenantName: business.tenantName.trim(),
      tenantType: business.tenantType,
      giro: business.giro,
      estadoId: business.estadoId,
      municipioId: business.municipioId,
      adminEmail: this.emailForm.getRawValue().email.trim().toLowerCase(),
      adminFullName: owner.adminFullName.trim(),
      adminPhone: owner.adminPhone,
      adminNip: owner.adminNip,
      sucursalDireccion: owner.sucursalDireccion.trim(),
      sucursalTelefono: owner.sucursalTelefono.trim() || undefined
    };

    this.authService.registerTenant(payload).subscribe({
      next: () => {
        this.spinner.hide();
        this.toastr.success('¡Cuenta creada! Bienvenido a Novatia.', 'Listo');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'No fue posible crear la cuenta. Intenta de nuevo.';
        this.errorMessage.set(msg);
        if (!(err instanceof HttpErrorResponse)) {
          this.toastr.error(msg, 'Error');
        }
      }
    });
  }

  hasError(form: AbstractControl, controlName: string, errorKey: string): boolean {
    const control = (form as any).controls?.[controlName] || (form as any).get?.(controlName);
    return !!(control && control.touched && control.errors?.[errorKey]);
  }
}
