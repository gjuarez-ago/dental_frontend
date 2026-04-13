import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(NgxSpinnerService);
  
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);

  readonly loginForm = this.fb.nonNullable.group({
    user: ['', [Validators.required]],
    nip: ['', [Validators.required, Validators.minLength(4)]]
  });

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
      error: (err) => {
        this.spinner.hide();
        this.isLoading.set(false);
        this.errorMessage.set('Credenciales incorrectas. Verifica tu usuario y NIP.');
        console.error('Error de login:', err);
      }
    });
  }
}
