import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PatientPortalService } from '../../../core/services/patient-portal.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-profile-setup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxSpinnerModule],
  template: `
    <div class="setup-overlay animate-fade-in">
      <div class="setup-card">
        <div class="setup-header">
          <div class="icon-circle">
            <i class="ph ph-shield-check"></i>
          </div>
          <h2>Configura tu Acceso</h2>
          <p>Para proteger tu información y enviarte tus comprobantes, necesitamos completar un par de detalles.</p>
        </div>

        <form [formGroup]="setupForm" (ngSubmit)="onSubmit()" class="setup-form">
          <!-- SECCIÓN PIN -->
          <div class="form-section">
            <label>Nuevo PIN de 6 Dígitos</label>
            <div class="pin-inputs">
              <input 
                type="password" 
                formControlName="pin" 
                placeholder="••••••" 
                maxlength="6"
                class="premium-input text-center letter-spacing-lg"
              >
            </div>
            <p class="helper-text">Este será tu nuevo acceso personal.</p>
          </div>

          <div class="form-section">
            <label>Confirmar PIN</label>
            <input 
              type="password" 
              formControlName="confirmPin" 
              placeholder="••••••" 
              maxlength="6"
              class="premium-input text-center letter-spacing-lg"
            >
          </div>

          <!-- SECCIÓN EMAIL -->
          <div class="form-section">
            <label>Correo Electrónico</label>
            <div class="input-with-icon">
              <i class="ph ph-envelope"></i>
              <input 
                type="email" 
                formControlName="email" 
                placeholder="ejemplo@correo.com"
                class="premium-input-icon"
              >
            </div>
            <div class="alert-info">
              <i class="ph ph-info"></i>
              <span>Sin un correo válido, no podremos enviarte tus comprobantes de pago legalmente.</span>
            </div>
          </div>

          <button 
            type="submit" 
            class="btn-setup-submit" 
            [disabled]="setupForm.invalid || loading()"
          >
            {{ loading() ? 'Guardando...' : 'Completar Configuración' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .setup-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .setup-card {
      background: white;
      width: 100%;
      max-width: 480px;
      padding: 3rem;
      border-radius: 2.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .setup-header {
      text-align: center;
      margin-bottom: 2.5rem;

      .icon-circle {
        width: 72px;
        height: 72px;
        background: #f0fdf4;
        color: #10b981;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem;
        font-size: 2.5rem;
      }

      h2 { font-size: 1.75rem; font-weight: 850; color: #0f172a; margin: 0; }
      p { color: #64748b; font-size: 0.95rem; margin-top: 0.75rem; line-height: 1.5; }
    }

    .setup-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-section {
      label {
        display: block;
        font-size: 0.75rem;
        font-weight: 800;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.75rem;
      }
    }

    .premium-input {
      width: 100%;
      padding: 1rem;
      background: #f8fafc;
      border: 2px solid #f1f5f9;
      border-radius: 1rem;
      font-size: 1.125rem;
      transition: all 0.2s;

      &:focus {
        outline: none;
        border-color: #6366f1;
        background: white;
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
      }
    }

    .letter-spacing-lg { letter-spacing: 0.5em; }

    .input-with-icon {
      position: relative;
      i {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        font-size: 1.25rem;
      }
      .premium-input-icon {
        width: 100%;
        padding: 1rem 1rem 1rem 3rem;
        background: #f8fafc;
        border: 2px solid #f1f5f9;
        border-radius: 1rem;
        font-size: 1rem;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: #6366f1;
          background: white;
        }
      }
    }

    .alert-info {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background: #eff6ff;
      border-radius: 1rem;
      color: #1e40af;
      font-size: 0.8125rem;
      margin-top: 1rem;
      line-height: 1.4;
      i { font-size: 1.1rem; flex-shrink: 0; }
    }

    .helper-text { font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem; text-align: center; }

    .btn-setup-submit {
      margin-top: 1rem;
      padding: 1.25rem;
      border-radius: 1.25rem;
      background: #0f172a;
      color: white;
      font-weight: 700;
      font-size: 1rem;
      border: none;
      cursor: pointer;
      transition: all 0.3s;
      
      &:hover:not(:disabled) {
        background: #1e293b;
        transform: translateY(-2px);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  `]
})
export class ProfileSetupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly portalService = inject(PatientPortalService);
  private readonly toastr = inject(ToastrService);
  private readonly spinner = inject(NgxSpinnerService);

  @Output() completed = new EventEmitter<void>();

  loading = signal(false);

  setupForm = this.fb.nonNullable.group({
    pin: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
    confirmPin: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]]
  }, {
    validators: (group: any) => {
      const pin = group.get('pin').value;
      const confirmPin = group.get('confirmPin').value;
      return pin === confirmPin ? null : { notSame: true };
    }
  });

  onSubmit() {
    if (this.setupForm.invalid || this.loading()) return;

    const { pin, email } = this.setupForm.getRawValue();
    this.loading.set(true);
    this.spinner.show();

    this.portalService.setupProfile(pin, email).subscribe({
      next: (res) => {
        if (res.ok) {
          this.toastr.success('Perfil configurado correctamente', '¡Bienvenido!');
          this.completed.emit();
        }
        this.loading.set(false);
        this.spinner.hide();
      },
      error: (err) => {
        this.toastr.error('Error al guardar la configuración', 'Error');
        this.loading.set(false);
        this.spinner.hide();
      }
    });
  }
}
