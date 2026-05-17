import { Component, inject, ChangeDetectionStrategy, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

type StaffStep = 'PHONE_INPUT' | 'LOGIN';

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
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toastr = inject(ToastrService);
  private readonly location = inject(Location);

  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly step = signal<StaffStep>('PHONE_INPUT');
  readonly staffIdentifier = signal('');

  readonly phoneForm = this.fb.nonNullable.group({
    telefono: ['', [Validators.required]],
  });

  readonly nipForm = this.fb.nonNullable.group({
    nip: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(10)]]
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('staff_identifier');
      if (saved) this.phoneForm.patchValue({ telefono: saved });
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  goBackToPhone(): void {
    this.step.set('PHONE_INPUT');
    this.staffIdentifier.set('');
    this.errorMessage.set(null);
  }

  onCheckPhone(): void {
    if (this.phoneForm.invalid || this.isLoading()) return;

    const { telefono } = this.phoneForm.getRawValue();

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    this.authService.checkPatientPhone(telefono).subscribe({
      next: (res) => {
        this.spinner.hide();
        this.isLoading.set(false);

        if (res.status === 'STAFF_FOUND') {
          this.staffIdentifier.set(telefono);
          localStorage.setItem('staff_identifier', telefono);
          this.step.set('LOGIN');
        } else {
          this.errorMessage.set('Acceso exclusivo para profesionales. Si eres paciente, accede desde el portal de citas.');
        }
      },
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        const msg = err?.userMessage || err?.error?.userMessage || err?.message || err?.error?.message || 'Error al verificar el acceso.';
        this.errorMessage.set(msg);
        if (!(err instanceof HttpErrorResponse)) {
          this.toastr.error(msg, 'Error');
        }
      }
    });
  }

  onLogin(): void {
    if (this.nipForm.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.spinner.show();

    const nip = this.nipForm.getRawValue().nip;

    this.authService.login({ user: this.staffIdentifier(), nip }).subscribe({
      next: (res) => {
        this.spinner.hide();
        localStorage.removeItem('staff_identifier');
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
  }
}
