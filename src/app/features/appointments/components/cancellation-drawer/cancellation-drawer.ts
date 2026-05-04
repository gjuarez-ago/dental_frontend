import { Component, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { AppointmentStatus, Cita } from '../../../../core/models/appointment.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-cancellation-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="drawer-overlay" [class.open]="layout.isCancellationOpen()" (click)="close()">
      <div class="drawer-content" [class.reject-mode]="isRejectMode()" (click)="$event.stopPropagation()">
        <div class="drawer-header">
          <h3>{{ drawerTitle() }}</h3>
          <button class="close-btn" (click)="close()">×</button>
        </div>

        <div class="drawer-body">
          <div class="appointment-summary" *ngIf="citaSignal()">
            <div class="summary-header">
              <div class="patient-avatar">
                {{ (citaSignal()?.pacienteNombre || 'P').substring(0,1) }}{{
                (citaSignal()?.pacienteNombre?.split(' ')?.length || 0) > 1 ? citaSignal()?.pacienteNombre?.split(' ')![1].substring(0,1) : '' }}
              </div>
              <div class="patient-info">
                <span class="patient-name">{{ citaSignal()?.pacienteNombre }}</span>
                <span class="appointment-time">
                  <i class="ph ph-calendar"></i>
                  {{ citaSignal()?.fechaHora | date:'EEEE d MMMM, h:mm a':'':'es-ES' }}
                </span>
              </div>
            </div>
                        <!-- Sugerencia de Reagendar: Solo para citaActivas confirmadas -->
            <div class="reschedule-tip" *ngIf="!isRejectMode()">
              <i class="ph ph-info"></i>
              <p>¿Solo quieres cambiar la fecha? Te recomendamos usar <strong>Reagendar</strong> para conservar los anticipos intactos.</p>
            </div>
          </div>

          <div class="reason-section">
            <label for="motivo">{{ reasonLabel() }}</label>
            <textarea 
              id="motivo" 
              [ngModel]="motivo()" 
              (ngModelChange)="motivo.set($event)"
              [placeholder]="placeholderText()"
              rows="4"
            ></textarea>
            <p class="helper-text">Esta nota será enviada al paciente por correo electrónico.</p>
          </div>

          <!-- Switch de Reembolso Dinámico -->
          <div class="refund-action-section" *ngIf="!isRejectMode()">
            <div class="refund-card" [class.active]="reembolsar()">
              <div class="refund-info">
                <div class="refund-icon">
                  <i class="ph-fill" [class]="reembolsar() ? 'ph-hand-coins' : 'ph-bank'"></i>
                </div>
                <div class="refund-text">
                  <span class="refund-title">{{ reembolsar() ? 'Reembolsar Anticipo' : 'Retener Pago' }}</span>
                  <span class="refund-desc">
                    {{ reembolsar() ? 'El dinero se marcará como devuelto al paciente.' : 'El monto se quedará como ingreso para la clínica.' }}
                  </span>
                </div>
              </div>
              <label class="premium-switch">
                <input type="checkbox" [ngModel]="reembolsar()" (ngModelChange)="reembolsar.set($event)">
                <span class="premium-slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <button class="btn-back" (click)="close()">Regresar</button>
          <button 
            class="btn-confirm-cancel" 
            [disabled]="!motivo().trim() || submitting()"
            (click)="confirmAction()"
          >
            {{ submitting() ? 'Procesando...' : confirmButtonText() }}
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

      .reschedule-tip {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        background: #f0f9ff;
        border-radius: 1rem;
        border: 1px solid #e0f2fe;
        color: #0369a1;
        
        i { font-size: 1.25rem; }
        p { font-size: 0.75rem; margin: 0; line-height: 1.4; }
      }
    }

    /* Estilos Premium para el Switch de Reembolso */
    .refund-action-section {
      margin-top: 1.5rem;
    }

    .refund-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem;
      background: #f8fafc;
      border: 2px solid #f1f5f9;
      border-radius: 1.25rem;
      transition: all 0.3s ease;
      gap: 1rem;
    }

    .refund-card.active {
      background: #fff5f5;
      border-color: #fee2e2;
    }

    .refund-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .refund-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      color: #64748b;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      transition: all 0.3s;
    }

    .refund-card.active .refund-icon {
      background: #ef4444;
      color: white;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
    }

    .refund-text {
      display: flex;
      flex-direction: column;
    }

    .refund-title {
      font-size: 0.875rem;
      font-weight: 850;
      color: #1e293b;
    }

    .refund-desc {
      font-size: 0.75rem;
      color: #64748b;
      line-height: 1.3;
    }

    .premium-switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
      flex-shrink: 0;
    }

    .premium-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .premium-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: .4s;
      border-radius: 34px;
    }

    .premium-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    input:checked + .premium-slider {
      background-color: #ef4444;
    }

    input:checked + .premium-slider:before {
      transform: translateX(22px);
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

  citaSignal = signal<Cita | null>(null);
  motivo = signal('');
  reembolsar = signal(true);
  submitting = signal(false);

  // Computeds inteligentes
  readonly isRejectMode = computed(() => this.citaSignal()?.estado === AppointmentStatus.POR_CONFIRMAR);
  
  readonly drawerTitle = computed(() => this.isRejectMode() ? 'Rechazar Solicitud' : 'Cancelar Cita');
  readonly confirmButtonText = computed(() => this.isRejectMode() ? 'Confirmar Rechazo' : 'Confirmar Cancelación');
  readonly reasonLabel = computed(() => this.isRejectMode() ? 'Motivo del Rechazo' : 'Motivo de Cancelación');
  
  readonly placeholderText = computed(() => 
    this.isRejectMode() 
      ? 'Ej: El doctor no tiene disponibilidad en ese horario...' 
      : 'Ej: El paciente llamó para cancelar por motivos personales...'
  );

  constructor() {
    effect(() => {
      const selected = this.layout.selectedCitaForCancellation();
      if (selected) {
        this.citaSignal.set(selected);
        this.motivo.set(''); 
        this.reembolsar.set(true); 
      }
    });
  }

  confirmAction() {
    const citaActivaId = this.citaSignal()?.id;
    if (!citaActivaId || !this.motivo().trim()) return;

    this.submitting.set(true);
    
    const request = this.isRejectMode()
      ? this.appointmentService.rechazarCita(citaActivaId, this.motivo())
      : this.appointmentService.cancelarCita(citaActivaId, this.motivo(), this.reembolsar());

    request.subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.ok) {
          const actionText = this.isRejectMode() ? 'rechazada' : 'cancelada';
          this.toastr.success(`Cita ${actionText} correctamente`, 'Éxito');
          this.close();
          this.appointmentService.notificarCitaGuardada(res.result);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        const msg = err.error?.userMessage || `No se pudo procesar la acción`;
        this.toastr.error(msg, 'Error');
      }
    });
  }

  close() {
    this.layout.closeCancellationDrawer();
  }
}
