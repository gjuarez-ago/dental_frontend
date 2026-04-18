import { Component, Input, Output, EventEmitter, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, CitaResumenFinanciero, PaymentMethod, Pago, PagoStatus, TicketStatus } from '../../../../core/services/payment.service';
import { Cita } from '../../../../core/models/appointment.model';

@Component({
  selector: 'app-payment-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-drawer.html',
  styleUrls: ['./payment-drawer.scss']
})
export class PaymentDrawerComponent {
  private readonly paymentService = inject(PaymentService);

  @Input() isOpen = false;
  @Input() set cita(value: Cita | null) {
    if (value) {
      this._citaId.set(value.id!);
      this._pacienteId.set(value.pacienteId!);
      this.loadResumen(value.id!);
    }
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
          // Sugerimos el monto según el saldo pendiente confirmado
          if (data.totalPagado === 0) {
            this.nuevoPago.monto = data.precioBase;
          } else {
            this.nuevoPago.monto = data.saldoPendiente;
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
        alert(`No se permite saldo a favor. El abono no puede ser mayor al saldo pendiente actual (${saldoMaximo}).`);
        return;
    }

    this.submitting.set(true);
    const payload: Pago = {
      citaId: this._citaId()!,
      pacienteId: this._pacienteId()!,
      monto: this.nuevoPago.monto!,
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
        }
      },
      error: () => this.submitting.set(false)
    });
  }

  aprobarPago(pagoId: string) {
    if (confirm('¿Confirmas que el ingreso ya está en cuenta?')) {
        this.paymentService.updatePagoStatus(pagoId, PagoStatus.APROBADO).subscribe(() => {
            this.loadResumen(this._citaId()!);
            this.paymentRecorded.emit();
        });
    }
  }

  rechazarPago(pagoId: string) {
    const motivo = prompt('Por favor, indica el motivo del rechazo (obligatorio):');
    if (motivo && motivo.trim()) {
        this.paymentService.updatePagoStatus(pagoId, PagoStatus.RECHAZADO, motivo).subscribe(() => {
            this.loadResumen(this._citaId()!);
            this.paymentRecorded.emit();
        });
    } else if (motivo !== null) {
        alert('El motivo es obligatorio para rechazar un pago.');
    }
  }

  cancelarPago(pagoId: string) {
    if (confirm('¿Deseas cancelar este registro de pago?')) {
        this.paymentService.updatePagoStatus(pagoId, PagoStatus.CANCELADO).subscribe(() => {
            this.loadResumen(this._citaId()!);
            this.paymentRecorded.emit();
        });
    }
  }

  validarMontoTotal(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;
    this.montoTotalEditado.set(val);
  }

  validarAbono(event: Event) {
    const input = event.target as HTMLInputElement;
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;
    this.nuevoPago.monto = val;
  }

  close() {
    this.isOpen = false;
    this.closed.emit();
  }
}
