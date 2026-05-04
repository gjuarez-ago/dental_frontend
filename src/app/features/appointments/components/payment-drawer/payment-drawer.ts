import { Component, Input, Output, EventEmitter, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, CitaResumenFinanciero, PaymentMethod, Pago, PagoStatus, TicketStatus } from '../../../../core/services/payment.service';
import { Cita } from '../../../../core/models/appointment.model';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-payment-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  templateUrl: './payment-drawer.html',
  styleUrls: ['./payment-drawer.scss']
})
export class PaymentDrawerComponent {
  private readonly paymentService = inject(PaymentService);

  // Modal State
  readonly showModal = signal(false);
  readonly modalConfig = signal({
    title: 'Aviso',
    message: '',
    type: 'info' as 'info' | 'danger' | 'warning' | 'success',
    icon: 'ph ph-info',
    showCancel: false,
    isPrompt: false,
    confirmText: 'Entendido',
    placeholder: ''
  });

  private modalCallback: ((val?: any) => void) | null = null;

  showAlert(message: string, type: 'info' | 'danger' | 'warning' | 'success' = 'info', title = 'Aviso') {
    this.modalConfig.set({
      title, message, type,
      icon: type === 'danger' ? 'ph ph-warning-circle' : (type === 'warning' ? 'ph ph-warning' : 'ph ph-info'),
      showCancel: false, isPrompt: false, confirmText: 'Entendido', placeholder: ''
    });
    this.showModal.set(true);
    this.modalCallback = null;
  }

  showConfirm(message: string, callback: () => void, type: 'info' | 'danger' | 'warning' | 'success' = 'warning', title = 'Confirmar') {
    this.modalConfig.set({
      title, message, type,
      icon: 'ph ph-question',
      showCancel: true, isPrompt: false, confirmText: 'Confirmar', placeholder: ''
    });
    this.showModal.set(true);
    this.modalCallback = callback;
  }

  showPrompt(message: string, placeholder: string, callback: (val: string) => void, title = 'Requerido') {
    this.modalConfig.set({
      title, message, type: 'info',
      icon: 'ph ph-chat-centered-text',
      showCancel: true, isPrompt: true, confirmText: 'Enviar', placeholder
    });
    this.showModal.set(true);
    this.modalCallback = callback;
  }

  handleModalConfirm(val?: any) {
    if (this.modalCallback) {
      this.modalCallback(val);
    }
    this.showModal.set(false);
  }

  @Input() isOpen = false;
  private _citaActiva = signal<Cita | null>(null);
  
  @Input() set cita(value: Cita | null) {
    this._citaActiva.set(value);
    if (value) {
      this._citaId.set(value.id!);
      this._pacienteId.set(value.pacienteId!);
      this.loadResumen(value.id!);
    }
  }

  get cita(): Cita | null {
    return this._citaActiva();
  }
  @Output() closed = new EventEmitter<void>();
  @Output() paymentRecorded = new EventEmitter<void>();

  private _citaId = signal<string | null>(null);
  private _pacienteId = signal<string | null>(null);

  resumen = signal<CitaResumenFinanciero | null>(null);
  montoTotalEditado = signal<number>(0);
  loading = signal(false);
  submitting = signal(false);

  // Cálculo dinámico del saldo pendiente basado en la edición del costo total
  readonly saldoPendienteActual = computed(() => {
    const res = this.resumen();
    if (!res) return 0;
    
    // Si el costo es editable, usamos el valor del input, si no, el precio base oficial
    const total = res.costoDefinido ? res.precioBase : this.montoTotalEditado();
    return Math.max(0, total - (res.totalPagado || 0));
  });

  // Exponer los enums al template
  readonly PagoStatus = PagoStatus;
  readonly TicketStatus = TicketStatus;

  nuevoPago: Partial<Pago> = {
    monto: 0,
    metodoPago: PaymentMethod.EFECTIVO,
    notas: ''
  };

  private loadResumen(citaId: string) {
    this.loading.set(true);
    this.paymentService.getResumenCita(citaId).subscribe({
      next: (data) => {
        this.resumen.set(data);
        if (data) {
          this.montoTotalEditado.set(data.precioBase);
          
          // Lógica automática para Cortesías (Monto 0)
          if (data.precioBase === 0) {
            this.nuevoPago.monto = 0;
            this.nuevoPago.metodoPago = PaymentMethod.SIN_COBRO;
          } else if (data.totalPagado === 0) {
            this.nuevoPago.monto = data.precioBase;
            this.nuevoPago.metodoPago = PaymentMethod.EFECTIVO;
          } else {
            this.nuevoPago.monto = data.saldoPendiente;
            this.nuevoPago.metodoPago = data.saldoPendiente <= 0 ? PaymentMethod.SIN_COBRO : PaymentMethod.EFECTIVO;
          }
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  registrarPago() {
    if (!this._citaId() || !this._pacienteId()) return;

    // Validación live: No saldo a favor basado en el saldo real calculado
    const saldoMaximo = this.saldoPendienteActual();
    if (this.nuevoPago.monto! > saldoMaximo) {
        this.showAlert(`No se permite saldo a favor. El abono no puede ser mayor al saldo pendiente actual (${saldoMaximo}).`, 'warning', 'Monto no válido');
        return;
    }

    this.submitting.set(true);
    const isCourtesy = this.nuevoPago.metodoPago === PaymentMethod.SIN_COBRO;
    
    const payload: Pago = {
      citaId: this._citaId()!,
      pacienteId: this._pacienteId()!,
      // Seguridad: Nunca registrar un pago negativo. Si el saldo es negativo, la cortesía es 0.
      monto: isCourtesy ? Math.max(0, this.resumen()?.saldoPendiente || 0) : this.nuevoPago.monto!,
      metodoPago: this.nuevoPago.metodoPago || PaymentMethod.EFECTIVO,
      notas: this.nuevoPago.notas || '',
      montoTotalCita: !this.resumen()?.costoDefinido ? this.montoTotalEditado() : undefined
    };

    this.paymentService.registrarPago(payload).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (res) {
          this.loadResumen(this._citaId()!); 
          this.nuevoPago.monto = 0;
          this.nuevoPago.notas = '';
          this.paymentRecorded.emit();
          
          // Si el pago liquidó la cuenta o fue cortesía, cerramos el drawer tras un momento
          // para que el usuario vea que se guardó pero no pueda duplicar clics.
          setTimeout(() => {
            const currentResumen = this.resumen();
            if (currentResumen?.estadoTicket === TicketStatus.LIQUIDADO || 
                currentResumen?.estadoTicket === TicketStatus.CORTESIA) {
                this.close();
            }
          }, 800);
        }
      },
      error: () => this.submitting.set(false)
    });
  }

  aprobarPago(pagoId: string) {
    this.showConfirm('¿Confirmas que el ingreso ya está en cuenta?', () => {
        this.paymentService.updatePagoStatus(pagoId, PagoStatus.APROBADO).subscribe(() => {
            this.loadResumen(this._citaId()!);
            this.paymentRecorded.emit();
        });
    }, 'success', 'Aprobar Pago');
  }

  rechazarPago(pagoId: string) {
    this.showPrompt('Por favor, indica el motivo del rechazo (obligatorio):', 'Ej: Transferencia no recibida', (motivo) => {
        if (motivo && motivo.trim()) {
            this.paymentService.updatePagoStatus(pagoId, PagoStatus.RECHAZADO, motivo).subscribe(() => {
                this.loadResumen(this._citaId()!);
                this.paymentRecorded.emit();
            });
        } else {
            this.showAlert('El motivo es obligatorio para rechazar un pago.', 'danger', 'Error');
        }
    }, 'Rechazar Pago');
  }

  cancelarPago(pagoId: string) {
    this.showConfirm('¿Deseas cancelar este registro de pago?', () => {
        this.paymentService.updatePagoStatus(pagoId, PagoStatus.CANCELADO).subscribe(() => {
            this.loadResumen(this._citaId()!);
            this.paymentRecorded.emit();
        });
    }, 'danger', 'Cancelar Pago');
  }

  validarMontoTotal(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;
    this.montoTotalEditado.set(val);
  }

  isCostInvalid = computed(() => {
    const current = this.montoTotalEditado();
    const base = this.resumen()?.precioBase || 0;
    return base > 0 && current < base;
  });

  validarAbono(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;
    this.nuevoPago.monto = val;

    // Si el usuario pone 0 manualmente, sugerimos el método Cortesía
    if (val === 0) {
      this.nuevoPago.metodoPago = PaymentMethod.SIN_COBRO;
    }
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'EFECTIVO': '💵 Efectivo',
      'TRANSFERENCIA': '🏦 Transferencia',
      'TARJETA_DEBITO': '💳 Tarjeta Débito',
      'TARJETA_CREDITO': '💳 Tarjeta Crédito',
      'SIN_COBRO': '🎁 Cortesía',
      'OTRO': '📝 Otro'
    };
    return labels[method] || method;
  }

  close() {
    this.isOpen = false;
    this.closed.emit();
  }
}
