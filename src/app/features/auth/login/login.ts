import { Component, inject, ChangeDetectionStrategy, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

type PatientStep = 'PHONE_INPUT' | 'LOGIN' | 'REGISTER' | 'ACTIVATE_ACCOUNT';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgxSpinnerModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toastr = inject(ToastrService);
  private readonly location = inject(Location);

  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly loginMode = signal<'STAFF' | 'PACIENTE'>('PACIENTE');
  readonly patientStep = signal<PatientStep>('PHONE_INPUT');
  readonly patientPhone = signal('');
  readonly returnUrl = signal<string | null>(null);

  readonly phoneForm = this.fb.nonNullable.group({
    telefono: ['', [Validators.required]],
    rememberMe: [false]
  });

  readonly patientLoginForm = this.fb.nonNullable.group({
    nip: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
  });

  readonly registerForm = this.fb.nonNullable.group({
    nombreCompleto: ['', [Validators.required, Validators.minLength(2)]],
    email:          ['', [Validators.required, Validators.email]],
    nip:            ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    genero:         ['', Validators.required],
  });

  readonly activateForm = this.fb.nonNullable.group({
    email:  ['', [Validators.required, Validators.email]],
    nip:    ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    genero: ['', Validators.required],
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadRememberedData();
    }
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    if (url) this.returnUrl.set(url);
  }

  private loadRememberedData(): void {
    const savedPhone = localStorage.getItem('patient_phone');
    if (savedPhone) {
      this.phoneForm.patchValue({ telefono: savedPhone, rememberMe: true });
    }
  }

  private navigateAfterPatientAuth(): void {
    this.router.navigate([this.returnUrl() ?? '/mis-citas']);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
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
          case 'STAFF_FOUND':
            this.loginMode.set('STAFF');
            this.patientStep.set('LOGIN');
            break;
          case 'EXISTS_VERIFIED':
            this.loginMode.set('PACIENTE');
            this.patientStep.set('LOGIN');
            break;
          case 'EXISTS_UNVERIFIED':
            this.patientStep.set('ACTIVATE_ACCOUNT');
            break;
          case 'NOT_FOUND':
            this.patientStep.set('REGISTER');
            break;
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'Error al verificar el teléfono.';
        this.errorMessage.set(msg);
        if (!(err instanceof HttpErrorResponse)) {
          this.toastr.error(msg, 'Error');
        }
      }
    });
  }

  onPatientLogin(): void {
    if (this.patientLoginForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    const nip = this.patientLoginForm.getRawValue().nip;

    if (this.loginMode() === 'STAFF') {
      this.authService.login({ user: this.patientPhone(), nip }).subscribe({
        next: (res) => {
          this.spinner.hide();
          if (res.user?.onboardingCompletado) {
            this.router.navigate(['/dashboard']);
          } else {
            this.router.navigate(['/onboarding']);
          }
        },
        error: (err) => {
          this.spinner.hide();
          this.isLoading.set(false);
          const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'NIP incorrecto.';
          this.errorMessage.set(msg);
          if (!(err instanceof HttpErrorResponse)) {
            this.toastr.error(msg, 'Error');
          }
        }
      });
    } else {
      this.authService.patientLogin(this.patientPhone(), nip).subscribe({
        next: () => {
          this.spinner.hide();
          this.navigateAfterPatientAuth();
        },
        error: (err) => {
          this.spinner.hide();
          this.isLoading.set(false);
          const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'NIP incorrecto.';
          this.errorMessage.set(msg);
          if (!(err instanceof HttpErrorResponse)) {
            this.toastr.error(msg, 'Error');
          }
        }
      });
    }
  }

  onRegister(): void {
    if (this.registerForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    const { nombreCompleto, email, nip, genero } = this.registerForm.getRawValue();
    this.authService.registerPatient({
      nombreCompleto,
      telefono: this.patientPhone(),
      email,
      nip,
      genero,
    }).subscribe({
      next: () => {
        this.spinner.hide();
        this.navigateAfterPatientAuth();
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'No fue posible crear tu cuenta.';
        this.errorMessage.set(msg);
      }
    });
  }

  onActivateAccount(): void {
    if (this.activateForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    const { email, nip, genero } = this.activateForm.getRawValue();
    this.authService.completePatientProfile({
      telefono: this.patientPhone(),
      email,
      nip,
      genero,
    }).subscribe({
      next: () => {
        this.spinner.hide();
        this.navigateAfterPatientAuth();
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'No fue posible activar tu cuenta.';
        this.errorMessage.set(msg);
      }
    });
  }

}
