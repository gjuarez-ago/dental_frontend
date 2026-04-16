import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { Cita, DisponibilidadDia, SlotDisponibilidad } from '../models/appointment.model';
import { ServicioDental } from '../models/service-dental.model';
import { ApiResponse } from '../models/api-response.model';

export interface BookingState {
  serviceId: string;
  serviceName: string;
  price: string;
  selectedDate: Date | null;
  selectedSlot: SlotDisponibilidad | null;
  customerName: string;
  customerPhone: string;
  receiptUploaded: boolean;
  step: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/public`;

  // Estado reactivo usando Signals de Angular
  private readonly _state = signal<BookingState>({
    serviceId: '',
    serviceName: '',
    price: '',
    selectedDate: null,
    selectedSlot: null,
    customerName: '',
    customerPhone: '',
    receiptUploaded: false,
    step: 1
  });

  readonly state = this._state.asReadonly();

  // --- MÉTODOS DE CONSULTA AL API PÚBLICO ---
  getPublicServices(tenantId: string): Observable<ServicioDental[]> {
    const params = new HttpParams().set('tenantId', tenantId);
    return this.http.get<ApiResponse<ServicioDental[]>>(`${this.apiUrl}/servicios`, { params }).pipe(
      map(res => (res.ok && res.result) ? res.result : [] as ServicioDental[])
    );
  }

  getMonthlyAvailability(tenantId: string, sucursalId: string, month: number, year: number): Observable<DisponibilidadDia[]> {
    const params = new HttpParams()
      .set('tenantId', tenantId)
      .set('sucursalId', sucursalId)
      .set('mes', month)
      .set('anio', year);

    return this.http.get<ApiResponse<DisponibilidadDia[]>>(`${this.apiUrl}/agenda/disponibilidad-mes`, { params }).pipe(
      map(res => (res.ok && res.result) ? res.result : [] as DisponibilidadDia[])
    );
  }

  getAvailableSlots(tenantId: string, sucursalId: string, date: string, serviceId: string): Observable<SlotDisponibilidad[]> {
    const params = new HttpParams()
      .set('tenantId', tenantId)
      .set('sucursalId', sucursalId)
      .set('fecha', date)
      .set('servicioId', serviceId);

    return this.http.get<ApiResponse<SlotDisponibilidad[]>>(`${this.apiUrl}/agenda/slots-disponibles`, { params }).pipe(
      map(res => (res.ok && res.result) ? res.result : [] as SlotDisponibilidad[])
    );
  }

  confirmBooking(cita: Partial<Cita>, voucher: File): Observable<ApiResponse<Cita>> {
    const formData = new FormData();

    // El backend espera el JSON como un string en el parámetro "cita"
    formData.append('cita', JSON.stringify(cita));

    // El archivo físico del comprobante en el parámetro "file"
    formData.append('file', voucher);

    return this.http.post<ApiResponse<Cita>>(`${this.apiUrl}/agenda/agendar`, formData);
  }

  // --- MANEJO DE ESTADO LOCAL ---

  setCustomerInfo(name: string, phone: string) {
    this._state.update(s => ({ ...s, customerName: name, customerPhone: phone }));
  }

  setReceiptUploaded(status: boolean) {
    this._state.update(s => ({ ...s, receiptUploaded: status }));
  }

  resetBooking() {
    this._state.set({
      serviceId: '',
      serviceName: '',
      price: '',
      selectedDate: null,
      selectedSlot: null,
      customerName: '',
      customerPhone: '',
      receiptUploaded: false,
      step: 1
    });
  }

  // Datos Bancarios Reales
  readonly bankDetails = {
    bank: 'BBVA México',
    holder: 'Sarai Rios',
    clabe: '012 180 00123 4567 890',
    depositPercentage: 0.30
  };

  setService(service: Partial<ServicioDental> & { nombre: string; price?: string }) {
    this._state.update(s => ({
      ...s,
      serviceId: service.id || '',
      serviceName: service.nombre,
      price: service.price || `$${service.precioBase || 0} MXN`,
      step: 1
    }));
  }

  setDate(date: Date) {
    this._state.update(s => ({ ...s, selectedDate: date }));
  }

  setSlot(slot: SlotDisponibilidad | string) {
    const normalizedSlot: SlotDisponibilidad = typeof slot === 'string' 
      ? { horaInicio: slot, horaFin: '', disponible: true } 
      : slot;
    this._state.update(s => ({ ...s, selectedSlot: normalizedSlot }));
  }

  setStep(step: number) {
    this._state.update(s => ({ ...s, step: step }));
  }

  calculateDeposit(totalPrice: string): number {
    const numericPrice = parseFloat(totalPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(numericPrice)) return 0;
    return numericPrice * this.bankDetails.depositPercentage;
  }
}
