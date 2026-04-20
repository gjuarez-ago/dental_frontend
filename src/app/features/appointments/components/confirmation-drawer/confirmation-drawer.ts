import { Component, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { LayoutService } from '../../../../core/services/layout.service';
import { Cita } from '../../../../core/models/appointment.model';

@Component({
  selector: 'app-confirmation-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="drawer-overlay" [class.open]="layout.isConfirmationOpen()" (click)="close()">
      <div class="drawer-content" (click)="$event.stopPropagation()">
        <div class="drawer-header">
          <h3>Confirmar Pago y Cita</h3>
          <button class="close-btn" (click)="close()">×</button>
        </div>

        <div class="drawer-body">
          <p class="instruction">Valida el anticipo recibido y asigna al profesional para confirmar la cita.</p>
          <div class="financial-summary">
            <div class="summary-item">
              <span class="summary-label">Anticipo Recibido</span>
              <span class="summary-value positive">+ \${{ paidAmount() | number:'1.2-2' }}</span>
            </div>
            <div class="summary-item highlight">
              <span class="summary-label">Saldo Pendiente</span>
              <span class="summary-value danger">\${{ pendingBalance() | number:'1.2-2' }}</span>
            </div>
          </div>

          <!-- VISUALIZACIÓN DE COMPROBANTE -->
          @if (layout.selectedCitaForConfirmation()?.comprobanteUrl) {
            <div class="comprobante-preview">
              <label>Comprobante de Pago</label>
              <div class="preview-box">
                <i class="ph ph-file-doc"></i>
                <a [href]="layout.selectedCitaForConfirmation()?.comprobanteUrl" target="_blank" class="view-link">
                  Ver comprobante adjunto
                </a>
              </div>
            </div>
          }

          <div class="section-title">
            <label>Asignar Profesional</label>
            @if (!selectedDoctorId()) {
              <span class="warning-text"><i class="ph ph-warning-circle"></i> Requiere asignación</span>
            }
          </div>

          <div class="doctors-list">
            @for (doctor of doctors(); track doctor.id) {
              <div 
                class="doctor-card" 
                [class.selected]="selectedDoctorId() === doctor.id"
                (click)="selectedDoctorId.set(doctor.id)"
              >
                <div class="doctor-info">
                  <span class="doctor-name">{{ doctor.nombreCompleto }}</span>
                  <span class="doctor-tag">Doctor</span>
                </div>
                <div class="selection-indicator">
                  <div class="radio-circle"></div>
                </div>
              </div>
            } @empty {
              <p class="no-data">No hay doctores disponibles.</p>
            }
          </div>

          <div class="cost-section">
            <div class="input-field primary-field">
              <label for="remainingPayment">Monto a Liquidar Hoy (MXN)</label>
              <div class="input-wrapper">
                <span class="currency-prefix">$</span>
                <input 
                  type="number" 
                  id="remainingPayment" 
                  [value]="remainingPayment()" 
                  (input)="onRemainingChange($event)"
                  placeholder="0.00"
                >
              </div>
            </div>

            <div class="financial-breakdown">
              <div class="breakdown-row">
                <span>Anticipo recibido:</span>
                <span>\${{ paidAmount() | number:'1.2-2' }}</span>
              </div>
              <div class="breakdown-row total">
                <span>Costo final de la cita:</span>
                <span>\${{ totalFinal() | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <button class="btn-reject" (click)="rechazar()">Rechazar Pago</button>
          <button class="btn-cancel" (click)="close()">Cancelar</button>
          <button 
            class="btn-confirm" 
            [disabled]="!selectedDoctorId() || submitting()"
            (click)="confirmar()"
          >
            {{ submitting() ? 'Procesando...' : 'Confirmar y Aplicar Pago' }}
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
      background: #fdfdfd;
    }

    .drawer-header h3 { 
      margin: 0; 
      font-size: 1.5rem; 
      font-weight: 850; 
      color: #1A2B4C; 
      letter-spacing: -0.02em;
    }
    
    .drawer-header .close-btn { 
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f1f5f9;
      border: none; 
      font-size: 1.25rem; 
      cursor: pointer; 
      color: #64748b; 
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .drawer-header .close-btn:hover { 
      background: #1A2B4C; 
      color: white; 
      transform: rotate(90deg);
    }

    .drawer-body {
      padding: 2rem;
      flex: 1;
      overflow-y: auto;
    }

    .instruction { 
      color: #64748b; 
      margin-bottom: 2rem; 
      font-size: 0.9375rem; 
      line-height: 1.6;
      font-weight: 500;
    }

    .comprobante-preview {
      margin-bottom: 2.5rem;
    }

    .comprobante-preview label { 
      display: block; 
      font-size: 0.75rem; 
      font-weight: 800; 
      color: #94a3b8; 
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.75rem; 
    }

    .preview-box {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: #f8fafc;
      border: 2px dashed #BEE7DF;
      border-radius: 1rem;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .preview-box:hover {
      background: #f0fdfa;
      border-color: #85CDBB;
      transform: translateY(-2px);
    }

    .preview-box i { 
      font-size: 1.75rem; 
      color: #1A2B4C; 
      opacity: 0.8;
    }

    .preview-box .view-link { 
      color: #1A2B4C; 
      font-weight: 700; 
      text-decoration: none; 
      font-size: 0.9375rem;
    }

    .preview-box .view-link:hover { text-decoration: underline; }

    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-title label { 
      font-size: 0.75rem; 
      font-weight: 800; 
      color: #94a3b8; 
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .section-title .warning-text { 
      font-size: 0.75rem; 
      color: #ef4444; 
      display: flex; 
      align-items: center; 
      gap: 0.35rem; 
      font-weight: 700;
      background: #fef2f2;
      padding: 0.35rem 0.65rem;
      border-radius: 0.5rem;
    }

    .doctor-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.25rem;
      border: 1.5px solid #f1f5f9;
      border-radius: 1rem;
      margin-bottom: 0.875rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      background: #fcfcfd;
    }

    .doctor-card:hover { 
      border-color: #BEE7DF; 
      background: white;
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    .doctor-card.selected { 
      border-color: #1A2B4C; 
      background: white;
      box-shadow: 0 10px 20px rgba(26, 43, 76, 0.08);
    }

    .doctor-name { 
      display: block; 
      font-weight: 700; 
      color: #1A2B4C; 
      font-size: 1rem;
      margin-bottom: 0.125rem;
    }

    .doctor-tag { 
      font-size: 0.75rem; 
      font-weight: 600;
      color: #85CDBB; 
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .radio-circle {
      width: 22px;
      height: 22px;
      border: 2px solid #e2e8f0;
      border-radius: 50%;
      position: relative;
      transition: all 0.2s;
    }

    .doctor-card.selected .radio-circle {
      border-color: #1A2B4C;
      background: #1A2B4C;
    }

    .doctor-card.selected .radio-circle::after {
      content: '';
      position: absolute;
      inset: 5px;
      background: white;
      border-radius: 50%;
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
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border: none;
    }

    .btn-cancel { 
      background: #f1f5f9; 
      color: #64748b; 
    }
    
    .btn-reject {
      background: #fff1f2;
      color: #e11d48;
      border: 1px solid #fecaca !important;
    }

    .btn-reject:hover {
      background: #ffe4e6;
      color: #9f1239;
    }

    .btn-cancel:hover {
      background: #e2e8f0;
      color: #1A2B4C;
    }

    .btn-confirm { 
      background: #1A2B4C; 
      color: white; 
      box-shadow: 0 10px 20px rgba(26, 43, 76, 0.2);
    }

    .btn-confirm:hover:not(:disabled) { 
      transform: translateY(-3px);
      box-shadow: 0 15px 30px rgba(26, 43, 76, 0.3);
      filter: brightness(1.1);
    }

    .btn-confirm:disabled { 
      background: #ccd3dd; 
      color: white; 
      opacity: 0.8; 
      cursor: not-allowed; 
      box-shadow: none;
    }

    .financial-summary {
      background: #f8fafc;
      border-radius: 1.25rem;
      padding: 1.5rem;
      margin-top: 2rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      border: 1px solid #f1f5f9;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-item .summary-label {
      font-size: 0.625rem;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .summary-item .summary-value {
      font-size: 1.125rem;
      font-weight: 800;
      color: #1A2B4C;
    }

    .summary-item .summary-value.positive { color: #10B981; }
    .summary-item .summary-value.danger { color: #ef4444; }

    .summary-item.highlight {
      border-left: 2px solid #f1f5f9;
      padding-left: 1.5rem;
    }

      .cost-section {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid #f1f5f9;

        .input-field.primary-field {
          margin-bottom: 20px;

          label {
            font-size: 0.85rem;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            margin-bottom: 12px;
          }

          input {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            padding: 16px 16px 16px 36px;
            font-size: 1.5rem;
            font-weight: 850;
            color: #0d213f;
            border-radius: 12px;
            
            &:focus {
              background: #fff;
              border-color: #0d213f;
              box-shadow: 0 8px 20px rgba(13, 33, 63, 0.08);
            }
          }

          .currency-prefix {
            font-size: 1.25rem;
            font-weight: 800;
            color: #0d213f;
            left: 16px;
          }
        }

        .financial-breakdown {
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;

          .breakdown-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.95rem;
            color: #64748b;

            &.total {
              margin-top: 4px;
              padding-top: 10px;
              border-top: 1px dashed #e2e8f0;
              color: #0d213f;
              font-weight: 700;
            }
          }
        }
      }
  `]
})
export class ConfirmationDrawerComponent implements OnInit {
  protected readonly appointmentService = inject(AppointmentService);
  protected readonly layout = inject(LayoutService);

  doctors = signal<any[]>([]);
  selectedDoctorId = signal<string | null>(null);
  remainingPayment = signal<number>(0);
  paidAmount = signal<number>(0);
  submitting = signal(false);

  constructor() {
    // Reaccionar cuando cambie la cita en el servicio
    effect(() => {
      const cita = this.layout.selectedCitaForConfirmation();
      if (cita) {
        this.syncFromCita(cita);
      }
    });
  }

  totalFinal = computed(() => {
    return (this.paidAmount() || 0) + (this.remainingPayment() || 0);
  });

  pendingBalance = computed(() => {
    return Math.max(0, this.remainingPayment());
  });

  ngOnInit(): void {
    this.loadDoctors();
  }

  private loadDoctors() {
    this.appointmentService.getDoctores().subscribe(docs => {
      this.doctors.set(docs || []);
    });
  }

  private syncFromCita(cita: Cita) {
    const total = cita.montoTotal || 0;
    const paid = cita.montoPagado || 0;
    
    this.paidAmount.set(paid);
    this.remainingPayment.set(Math.max(0, total - paid));
  }

  onRemainingChange(event: any) {
    const val = parseFloat(event.target.value) || 0;
    this.remainingPayment.set(val);
  }

  confirmar() {
    const cita = this.layout.selectedCitaForConfirmation();
    if (!cita?.id || !this.selectedDoctorId()) return;

    this.submitting.set(true);
    this.appointmentService.confirmarCita(cita.id, this.selectedDoctorId()!, this.totalFinal()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res.ok) {
          this.close();
          this.appointmentService.notificarCitaGuardada(res.result);
        }
      },
      error: () => this.submitting.set(false)
    });
  }

  rechazar() {
    const cita = this.layout.selectedCitaForConfirmation();
    if (cita) {
      this.layout.closeConfirmationDrawer();
      setTimeout(() => {
        this.layout.openRejectionDrawer(cita);
      }, 300);
    }
  }

  close() {
    this.layout.closeConfirmationDrawer();
  }
}
