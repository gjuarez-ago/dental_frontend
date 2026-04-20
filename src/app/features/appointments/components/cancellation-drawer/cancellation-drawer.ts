import { Component, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { Cita } from '../../../../core/models/appointment.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-cancellation-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="drawer-overlay" [class.open]="layout.isCancellationOpen()" (click)="close()">
      <div class="drawer-content" (click)="$event.stopPropagation()">
        <div class="drawer-header">
          <h3>Cancelar Cita</h3>
          <button class="close-btn" (click)="close()">×</button>
        </div>

        <div class="drawer-body">
          <div class="appointment-summary" *ngIf="cita()">
            <div class="summary-header">
              <div class="patient-avatar">
                {{ cita()?.pacienteNombre ? cita()?.pacienteNombre!.substring(0,1) : 'P' }}{{
                cita()?.pacienteNombre?.split(' ')?.length! > 1 ? cita()?.pacienteNombre?.split(' ')![1].substring(0,1) : '' }}
              </div>
              <div class="patient-info">
                <span class="patient-name">{{ cita()?.pacienteNombre }}</span>
                <span class="appointment-time">
                  <i class="ph ph-calendar"></i>
                  {{ cita()?.fechaHora | date:'EEEE d MMMM, h:mm a':'':'es-ES' }}
                </span>
              </div>
            </div>
            
            <div class="finance-impact" *ngIf="(cita()?.montoPagado ?? 0) > 0">
              <i class="ph ph-warning-circle"></i>
              <div class="impact-text">
                <strong>Impacto Financiero</strong>
                <p>Se ha registrado un anticipo de <strong>\${{ cita()?.montoPagado | number:'1.2-2' }}</strong>. 
                Al cancelar, el pago pasará a estado <strong>CANCELADO</strong> para cuadrar la caja.</p>
              </div>
            </div>
          </div>

          <div class="reason-section">
            <label for="motivo">Motivo de Cancelación</label>
            <textarea 
              id="motivo" 
              [(ngModel)]="motivo" 
              placeholder="Ej: El paciente llamó para reprogramar por motivos personales..."
              rows="4"
            ></textarea>
            <p class="helper-text">Este motivo quedará registrado en el historial de la cita.</p>
          </div>
        </div>

        <div class="drawer-footer">
          <button class="btn-back" (click)="close()">Regresar</button>
          <button 
            class="btn-confirm-cancel" 
            [disabled]="!motivo().trim() || submitting()"
            (click)="confirmCancellation()"
          >
            {{ submitting() ? 'Procesando...' : 'Confirmar Cancelación' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(8px);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      justify-content: flex-end;
    }

    .drawer-overlay.open {
      opacity: 1;
      visibility: visible;
    }

    .drawer-content {
      width: 440px;
      height: 100%;
      background: #ffffff;
      transform: translateX(100%);
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      box-shadow: -20px 0 60px rgba(0, 0, 0, 0.1);
    }

    .drawer-overlay.open .drawer-content {
      transform: translateX(0);
    }

    .drawer-header {
      padding: 2rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fffafa; /* Sutil toque rojizo suave */
    }

    .drawer-header h3 { 
      margin: 0; 
      font-size: 1.5rem; 
      font-weight: 850; 
      color: #7f1d1d; 
      letter-spacing: -0.02em;
    }
    
    .drawer-header .close-btn { 
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #fee2e2;
      border: none; 
      font-size: 1.25rem; 
      cursor: pointer; 
      color: #b91c1c; 
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drawer-body {
      padding: 2rem;
      flex: 1;
      overflow-y: auto;
    }

    .appointment-summary {
      background: #fcfcfd;
      border-radius: 1.5rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid #f1f5f9;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;

      .summary-header {
        display: flex;
        align-items: center;
        gap: 1.25rem;
      }

      .patient-avatar {
        width: 56px;
        height: 56px;
        border-radius: 1.25rem;
        background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
        color: #b91c1c;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: 900;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
        flex-shrink: 0;
      }

      .patient-info {
        display: flex;
        flex-direction: column;

        .patient-name {
          font-size: 1.125rem;
          font-weight: 850;
          color: #0f172a;
          line-height: 1.2;
        }

        .appointment-time {
          font-size: 0.8125rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.35rem;
          text-transform: capitalize;
          font-weight: 500;
        }
      }

      .finance-impact {
        display: flex;
        gap: 1rem;
        padding-top: 1rem;
        border-top: 1px dashed #cbd5e1;
        color: #b45309;

        i { font-size: 1.5rem; }
        
        .impact-text {
          strong { display: block; font-size: 0.875rem; margin-bottom: 0.25rem; }
          p { font-size: 0.8125rem; margin: 0; line-height: 1.4; }
        }
      }
    }

    .reason-section {
      label {
        display: block;
        font-size: 0.75rem;
        font-weight: 800;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.75rem;
      }

      textarea {
        width: 100%;
        padding: 1rem;
        border: 2px solid #f1f5f9;
        background: #f8fafc;
        border-radius: 1rem;
        font-size: 1rem;
        font-family: inherit;
        resize: none;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: #ef4444;
          background: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.05);
        }
      }

      .helper-text {
        font-size: 0.75rem;
        color: #94a3b8;
        margin-top: 0.5rem;
      }
    }

    .drawer-footer {
      padding: 2rem;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 1rem;
      background: #fcfcfd;
    }

    .drawer-footer button {
      flex: 1;
      padding: 1rem;
      border-radius: 1rem;
      font-weight: 800;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s;
      border: none;
    }

    .btn-back { background: #f1f5f9; color: #64748b; }
    .btn-back:hover { background: #e2e8f0; }

    .btn-confirm-cancel {
      background: #ef4444;
      color: white;
      box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2);
    }

    .btn-confirm-cancel:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px rgba(239, 68, 68, 0.3);
    }

    .btn-confirm-cancel:disabled {
      background: #fee2e2;
      color: #fca5a5;
      cursor: not-allowed;
      box-shadow: none;
    }
  `]
})
export class CancellationDrawerComponent {
  protected readonly appointmentService = inject(AppointmentService);
  protected readonly layout = inject(LayoutService);
  private readonly toastr = inject(ToastrService);

  cita = signal<Cita | null>(null);
  motivo = signal('');
  submitting = signal(false);

  constructor() {
    effect(() => {
      const selected = this.layout.selectedCitaForCancellation();
      if (selected) {
        this.cita.set(selected);
        this.motivo.set(''); // Reset
      }
    });
  }

  confirmCancellation() {
    const citaId = this.cita()?.id;
    if (!citaId || !this.motivo().trim()) return;

    this.submitting.set(true);
    this.appointmentService.cancelarCita(citaId, this.motivo()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.ok) {
          this.toastr.success('Cita cancelada correctamente', 'Éxito');
          this.close();
          // Notificar para recargar listas
          this.appointmentService.notificarCitaGuardada(res.result);
        }
      },
      error: () => {
        this.submitting.set(false);
        this.toastr.error('No se pudo cancelar la cita', 'Error');
      }
    });
  }

  close() {
    this.layout.closeCancellationDrawer();
  }
}
