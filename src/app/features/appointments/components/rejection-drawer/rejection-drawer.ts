import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-rejection-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="drawer-overlay" [class.open]="layout.isRejectionOpen()" (click)="close()">
      <div class="drawer-content" (click)="$event.stopPropagation()">
        <header class="drawer-header">
          <div class="header-info">
            <h3>Registrar Rechazo</h3>
            <p>Indica el motivo por el cual no se pudo validar el pago.</p>
          </div>
          <button class="close-btn" (click)="close()">×</button>
        </header>

        <div class="drawer-body">
          <div class="rejection-target">
            <span class="label">Rechazando pago de:</span>
            <span class="patient-name">{{ layout.selectedCitaForRejection()?.pacienteNombre }}</span>
          </div>

          <div class="reason-section">
            <label>Motivo del Rechazo *</label>
            <div class="quick-tags">
              @for (tag of tags; track tag) {
                <button 
                  class="tag-btn" 
                  [class.active]="motivo() === tag"
                  (click)="motivo.set(tag)"
                >
                  {{ tag }}
                </button>
              }
            </div>
            
            <textarea 
              [(ngModel)]="motivo" 
              placeholder="Escribe aquí los detalles del rechazo o selecciona una opción rápida..."
              rows="5"
              class="premium-textarea"
            ></textarea>
          </div>

          <div class="notice-box">
            <i class="ph-fill ph-info"></i>
            <p>Al rechazar, la cita permanecerá en "Por Confirmar" para que el paciente pueda subir un nuevo comprobante.</p>
          </div>
        </div>

        <div class="drawer-footer">
          <button class="btn-cancel" (click)="close()">Volver</button>
          <button 
            class="btn-reject-confirm" 
            [disabled]="!motivo() || submitting()"
            (click)="confirmarRechazo()"
          >
            {{ submitting() ? 'Registrando...' : 'Confirmar Rechazo' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(8px); z-index: 2100; opacity: 0; visibility: hidden;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); display: flex; justify-content: flex-end;
    }
    .drawer-overlay.open { opacity: 1; visibility: visible; }
    .drawer-content {
      width: 440px; height: 100%; background: #ffffff;
      transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex; flex-direction: column; box-shadow: -20px 0 60px rgba(0, 0, 0, 0.1);
    }
    .drawer-overlay.open .drawer-content { transform: translateX(0); }

    .drawer-header {
      padding: 2rem; border-bottom: 1px solid #f1f5f9;
      display: flex; justify-content: space-between; align-items: center;
    }
    .header-info h3 { margin: 0; font-size: 1.5rem; font-weight: 850; color: #1A2B4C; letter-spacing: -0.02em; }
    .header-info p { margin: 0.25rem 0 0; font-size: 0.875rem; color: #64748b; font-weight: 500; }
    
    .close-btn { 
      width: 32px; height: 32px; border-radius: 50%; background: #f1f5f9;
      border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center;
    }

    .drawer-body { padding: 2rem; flex: 1; overflow-y: auto; }

    .rejection-target {
      padding: 1rem; background: #fff1f2; border-radius: 12px; margin-bottom: 2rem;
      border: 1px solid #fecaca;
      .label { display: block; font-size: 0.75rem; font-weight: 800; color: #e11d48; text-transform: uppercase; margin-bottom: 0.25rem; }
      .patient-name { font-weight: 850; color: #9f1239; font-size: 1.1rem; }
    }

    .reason-section label { display: block; font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 1rem; }
    
    .quick-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .tag-btn {
      padding: 0.5rem 1rem; border-radius: 2rem; border: 1.5px solid #f1f5f9;
      background: white; color: #64748b; font-size: 0.8rem; font-weight: 600; cursor: pointer;
      transition: all 0.2s;
    }
    .tag-btn.active { background: #1A2B4C; color: white; border-color: #1A2B4C; }
    .tag-btn:hover:not(.active) { border-color: #cbd5e1; background: #f8fafc; }

    .premium-textarea {
      width: 100%; padding: 1.25rem; border-radius: 12px; border: 1.5px solid #e2e8f0;
      font-size: 0.95rem; font-weight: 500; resize: none; color: #1A2B4C;
      transition: all 0.3s; background: #fcfcfd;
    }
    .premium-textarea:focus { outline: none; border-color: #1A2B4C; background: white; box-shadow: 0 8px 20px rgba(0,0,0,0.05); }

    .notice-box {
      margin-top: 2rem; padding: 1.25rem; background: #f8fafc; border-radius: 12px;
      display: flex; gap: 0.75rem; align-items: flex-start;
      i { color: #3b82f6; font-size: 1.25rem; }
      p { margin: 0; font-size: 0.85rem; color: #64748b; line-height: 1.5; font-weight: 500; }
    }

    .drawer-footer { padding: 2rem; border-top: 1px solid #f1f5f9; display: flex; gap: 1rem; background: #fcfcfd; }
    .drawer-footer button { flex: 1; padding: 1rem; border-radius: 1rem; font-weight: 800; cursor: pointer; transition: all 0.3s; border: none; }
    .btn-cancel { background: #f1f5f9; color: #64748b; }
    .btn-reject-confirm { background: #e11d48; color: white; box-shadow: 0 10px 20px rgba(225, 29, 72, 0.2); }
    .btn-reject-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class RejectionDrawerComponent {
  protected readonly layout = inject(LayoutService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly toastr = inject(ToastrService);

  motivo = signal('');
  submitting = signal(false);

  tags = [
    'Comprobante ilegible',
    'Pago no recibido',
    'Monto incorrecto',
    'Datos de transferencia erróneos'
  ];

  confirmarRechazo() {
    const cita = this.layout.selectedCitaForRejection();
    if (!cita?.id || !this.motivo()) return;

    this.submitting.set(true);
    this.appointmentService.rechazarCita(cita.id, this.motivo())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (res) => {
          if (res.ok) {
            this.toastr.info('Pago rechazado correctamente', 'Registro Actualizado');
            this.close();
            this.appointmentService.notificarCitaGuardada(res.result);
          }
        },
        error: (err) => {
          const msg = err.error?.userMessage || 'No se pudo registrar el rechazo.';
          this.toastr.error(msg, 'Error');
        }
      });
  }

  close() {
    this.layout.closeRejectionDrawer();
    this.motivo.set('');
  }
}
