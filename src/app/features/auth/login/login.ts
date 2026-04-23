import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';

/**
 * Estados posibles del flujo de pacientes:
 * - PHONE_INPUT:      Paso 1 → Solo ingresa su teléfono.
 * - LOGIN:            Existe y verificado → Pide NIP.
 * - COMPLETE_PROFILE: Existe pero no verificado → Pide email, NIP, género.
 * - REGISTER:         No existe → Formulario completo de registro.
 */
type PatientStep = 'PHONE_INPUT' | 'LOGIN' | 'COMPLETE_PROFILE' | 'REGISTER';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxSpinnerModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(NgxSpinnerService);

  // ─── Signals reactivos ──────────────────────────────────────────────────
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly loginMode = signal<'STAFF' | 'PACIENTE'>('PACIENTE');
  readonly patientStep = signal<PatientStep>('PHONE_INPUT');
  readonly patientPhone = signal('');

  // ─── Formulario Staff (teléfono + NIP) ──────────────────────────────────
  readonly loginForm = this.fb.nonNullable.group({
    user: ['', [Validators.required]],
    nip: ['', [Validators.required, Validators.minLength(4)]]
  });

  // ─── Formulario Paciente: Paso 1 (solo teléfono) ───────────────────────
  readonly phoneForm = this.fb.nonNullable.group({
    telefono: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]]
  });

  // ─── Formulario Paciente: Login (NIP) ──────────────────────────────────
  readonly patientLoginForm = this.fb.nonNullable.group({
    nip: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  // ─── Formulario Paciente: Completar perfil ─────────────────────────────
  readonly completeForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    nip: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    genero: ['', [Validators.required]]
  });

  // ─── Formulario Paciente: Registro completo ────────────────────────────
  readonly registerForm = this.fb.nonNullable.group({
    nombreCompleto: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
    email: ['', [Validators.required, Validators.email]],
    nip: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    genero: ['', [Validators.required]]
  });

  // ─── Cambiar modo Staff / Paciente ──────────────────────────────────────
  setLoginMode(mode: 'STAFF' | 'PACIENTE'): void {
    this.loginMode.set(mode);
    this.patientStep.set('PHONE_INPUT');
    this.patientPhone.set('');
    this.loginForm.reset();
    this.phoneForm.reset();
    this.patientLoginForm.reset();
    this.completeForm.reset();
    this.registerForm.reset();
    this.errorMessage.set(null);
  }

  // ─── Volver al paso del teléfono ────────────────────────────────────────
  goBackToPhone(): void {
    this.patientStep.set('PHONE_INPUT');
    this.patientPhone.set('');
    this.phoneForm.reset();
    this.patientLoginForm.reset();
    this.completeForm.reset();
    this.registerForm.reset();
    this.errorMessage.set(null);
  }

  // ─── PASO 1: Verificar teléfono ─────────────────────────────────────────
  onCheckPhone(): void {
    if (this.phoneForm.invalid || this.isLoading()) return;

    const telefono = this.phoneForm.getRawValue().telefono;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    this.authService.checkPatientPhone(telefono).subscribe({
      next: (res) => {
        this.spinner.hide();
        this.isLoading.set(false);
        this.patientPhone.set(telefono);

        switch (res.status) {
          case 'EXISTS_VERIFIED':
            this.patientStep.set('LOGIN');
            break;
          case 'EXISTS_UNVERIFIED':
            this.patientStep.set('COMPLETE_PROFILE');
            break;
          case 'NOT_FOUND':
            this.patientStep.set('REGISTER');
            this.registerForm.patchValue({ telefono });
            break;
        }
      },
      error: () => {
        this.spinner.hide();
        this.isLoading.set(false);
        this.errorMessage.set('Error al verificar el teléfono. Intente de nuevo.');
      }
    });
  }

  // ─── PASO 2A: Login paciente verificado ─────────────────────────────────
  onPatientLogin(): void {
    if (this.patientLoginForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    const nip = this.patientLoginForm.getRawValue().nip;

    this.authService.patientLogin(this.patientPhone(), nip).subscribe({
      next: () => {
        this.spinner.hide();
        this.router.navigate(['/mis-citas']);
      },
      error: () => {
        this.spinner.hide();
        this.isLoading.set(false);
        this.errorMessage.set('NIP incorrecto. Verifique e intente de nuevo.');
      }
    });
  }

  // ─── PASO 2B: Completar perfil de paciente no verificado ────────────────
  onCompleteProfile(): void {
    if (this.completeForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    const formData = this.completeForm.getRawValue();

    this.authService.completePatientProfile({
      telefono: this.patientPhone(),
      email: formData.email,
      nip: formData.nip,
      genero: formData.genero
    }).subscribe({
      next: () => {
        this.spinner.hide();
        this.router.navigate(['/mis-citas']);
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.userMessage || 'Error al completar el perfil.');
      }
    });
  }

  // ─── PASO 2C: Registro de paciente nuevo ────────────────────────────────
  onRegisterPatient(): void {
    if (this.registerForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    const formData = this.registerForm.getRawValue();

    this.authService.registerPatient(formData).subscribe({
      next: () => {
        this.spinner.hide();
        this.router.navigate(['/mis-citas']);
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.userMessage || 'Error al registrar. Intente de nuevo.');
      }
    });
  }

  // ─── Login Staff (Personal Clínico) ─────────────────────────────────────
  onLogin(): void {
    if (this.loginForm.invalid || this.isLoading()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    const credentials = this.loginForm.getRawValue();

    this.authService.login(credentials).subscribe({
      next: () => {
        this.spinner.hide();
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.spinner.hide();
        this.isLoading.set(false);
        this.errorMessage.set('Credenciales incorrectas. Verifica tu usuario y NIP.');
      }
    });
  }
}
