import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { ApiResponse } from './patient.service';

export enum PaymentMethod {
  EFECTIVO = 'EFECTIVO',
  TARJETA_DEBITO = 'TARJETA_DEBITO',
  TARJETA_CREDITO = 'TARJETA_CREDITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  SIN_COBRO = 'SIN_COBRO',
  OTRO = 'OTRO'
}

export enum PagoStatus {
  PENDIENTE_REVISION = 'PENDIENTE_REVISION',
  APROBADO = 'APROBADO',
  RECHAZADO = 'RECHAZADO',
  CANCELADO = 'CANCELADO'
}

export enum TicketStatus {
  POR_DEFINIR = 'POR_DEFINIR',
  EN_REVISION = 'EN_REVISION',
  PENDIENTE = 'PENDIENTE',
  ABONADO = 'ABONADO',
  LIQUIDADO = 'LIQUIDADO',
  CORTESIA = 'CORTESIA'
}

export interface Pago {
  id?: string;
  citaId: string;
  pacienteId: string;
  monto: number;
  metodoPago: PaymentMethod;
  notas: string;
  montoTotalCita?: number;
  status?: PagoStatus;
  motivoRechazo?: string;
  createdAt?: string;
}

export interface CitaResumenFinanciero {
  citaId: string;
  pacienteNombre: string;
  servicioNombre: string;
  precioBase: number;
  totalPagado: number;
  saldoPendiente: number;
  costoDefinido: boolean;
  estadoTicket: TicketStatus;
  historialPagos: Pago[];
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/pagos`;

  getResumenCita(citaId: string): Observable<CitaResumenFinanciero | null> {
    return this.http.get<ApiResponse<CitaResumenFinanciero>>(`${this.apiUrl}/cita/${citaId}`).pipe(
      map(res => res.ok ? res.result : null)
    );
  }

  registrarPago(pago: Pago): Observable<Pago | null> {
    return this.http.post<ApiResponse<Pago>>(this.apiUrl, pago).pipe(
      map(res => res.ok ? res.result : null)
    );
  }

  updatePagoStatus(pagoId: string, nuevoStatus: PagoStatus, motivo?: string): Observable<Pago | null> {
    let params = { nuevoStatus };
    if (motivo) (params as any).motivo = motivo;
    
    return this.http.put<ApiResponse<Pago>>(`${this.apiUrl}/${pagoId}/status`, {}, { params }).pipe(
      map(res => res.ok ? res.result : null)
    );
  }
}
