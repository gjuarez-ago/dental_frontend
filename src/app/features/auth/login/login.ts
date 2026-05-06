import { Component, inject, ChangeDetectionStrategy, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

type PatientStep = 'PHONE_INPUT' | 'LOGIN' | 'COMPLETE_PROFILE' | 'REGISTER';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxSpinnerModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toastr = inject(ToastrService);

  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly loginMode = signal<'STAFF' | 'PACIENTE'>('PACIENTE');
  readonly patientStep = signal<PatientStep>('PHONE_INPUT');
  readonly patientPhone = signal('');

  readonly loginForm = this.fb.nonNullable.group({
    user: ['', [Validators.required]],
    nip: ['', [Validators.required, Validators.minLength(4)]],
    rememberMe: [false]
  });

  readonly phoneForm = this.fb.nonNullable.group({
    telefono: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
    rememberMe: [false]
  });

  readonly patientLoginForm = this.fb.nonNullable.group({
    nip: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  readonly completeForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    nip: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    genero: ['', [Validators.required]]
  });

  readonly registerForm = this.fb.nonNullable.group({
    nombreCompleto: ['', [Validators.required]],
    telefono: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
    email: ['', [Validators.required, Validators.email]],
    nip: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    genero: ['', [Validators.required]]
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadRememberedData();
    }
  }

  private loadRememberedData(): void {
    const savedUser = localStorage.getItem('staff_user');
    if (savedUser) {
      this.loginForm.patchValue({ user: savedUser, rememberMe: true });
    }

    const savedPhone = localStorage.getItem('patient_phone');
    if (savedPhone) {
      this.phoneForm.patchValue({ telefono: savedPhone, rememberMe: true });
    }
  }

  setLoginMode(mode: 'STAFF' | 'PACIENTE'): void {
    this.loginMode.set(mode);
    this.patientStep.set('PHONE_INPUT');
    this.patientPhone.set('');
    this.errorMessage.set(null);
    // Reset sin borrar rememberMe si es posible, o re-cargando
    this.loginForm.controls.user.reset();
    this.loginForm.controls.nip.reset();
    this.phoneForm.controls.telefono.reset();
  }

  goBackToPhone(): void {
    this.patientStep.set('PHONE_INPUT');
    this.patientPhone.set('');
    this.errorMessage.set(null);
  }

  onCheckPhone(): void {
    if (this.phoneForm.invalid || this.isLoading()) return;

    const { telefono, rememberMe } = this.phoneForm.getRawValue();
    
    if (isPlatformBrowser(this.platformId)) {
      if (rememberMe) {
        localStorage.setItem('patient_phone', telefono);
      } else {
        localStorage.removeItem('patient_phone');
      }
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    this.authService.checkPatientPhone(telefono).subscribe({
      next: (res) => {
        this.spinner.hide();
        this.isLoading.set(false);
        this.patientPhone.set(telefono);

        switch (res.status) {
          case 'EXISTS_VERIFIED': this.patientStep.set('LOGIN'); break;
          case 'EXISTS_UNVERIFIED': this.patientStep.set('COMPLETE_PROFILE'); break;
          case 'NOT_FOUND':
            this.patientStep.set('REGISTER');
            this.registerForm.patchValue({ telefono });
            break;
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'Error al verificar el teléfono.';
        this.errorMessage.set(msg);
        this.toastr.error(msg, 'Error');
      }
    });
  }

  onPatientLogin(): void {
    if (this.patientLoginForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();
    this.authService.patientLogin(this.patientPhone(), this.patientLoginForm.getRawValue().nip).subscribe({
      next: () => {
        this.spinner.hide();
        this.router.navigate(['/mis-citas']);
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'NIP incorrecto.';
        this.errorMessage.set(msg);
        this.toastr.error(msg, 'Error');
      }
    });
  }

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
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'Error al completar el perfil.';
        this.errorMessage.set(msg);
        this.toastr.error(msg, 'Error');
      }
    });
  }

  onRegisterPatient(): void {
    if (this.registerForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();
    this.authService.registerPatient(this.registerForm.getRawValue()).subscribe({
      next: () => {
        this.spinner.hide();
        this.router.navigate(['/mis-citas']);
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'Error al registrar.';
        this.errorMessage.set(msg);
        this.toastr.error(msg, 'Error');
      }
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid || this.isLoading()) return;
    const { user, nip, rememberMe } = this.loginForm.getRawValue();
    if (isPlatformBrowser(this.platformId)) {
      if (rememberMe) {
        localStorage.setItem('staff_user', user);
      } else {
        localStorage.removeItem('staff_user');
      }
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();
    this.authService.login({ user, nip }).subscribe({
      next: () => {
        this.spinner.hide();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'Credenciales incorrectas.';
        this.errorMessage.set(msg);
        this.toastr.error(msg, 'Error');
      }
    });
  }
}
