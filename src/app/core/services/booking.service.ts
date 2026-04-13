import { Injectable, signal } from '@angular/core';

export interface BookingState {
  serviceName: string;
  price: string;
  selectedDate: Date | null;
  selectedSlot: string | null;
  customerName: string;
  customerPhone: string;
  receiptUploaded: boolean;
  step: number;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  // Estado reactivo usando Signals de Angular
  private readonly _state = signal<BookingState>({
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

  setCustomerInfo(name: string, phone: string) {
    this._state.update(s => ({ ...s, customerName: name, customerPhone: phone }));
  }

  setReceiptUploaded(status: boolean) {
    this._state.update(s => ({ ...s, receiptUploaded: status }));
  }

  resetBooking() {
    this._state.set({
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

  setService(name: string, price: string) {
    this._state.update(s => ({ ...s, serviceName: name, price: price, step: 1 }));
  }

  setDate(date: Date) {
    this._state.update(s => ({ ...s, selectedDate: date }));
  }

  setSlot(slot: string) {
    this._state.update(s => ({ ...s, selectedSlot: slot }));
  }

  setStep(step: number) {
    this._state.update(s => ({ ...s, step: step }));
  }

  calculateDeposit(totalPrice: string): number {
    // Normalizar el precio (ej: "~$2,500 MXN" -> 2500)
    const numericPrice = parseFloat(totalPrice.replace(/[^0-9.]/g, ''));
    if (isNaN(numericPrice)) return 0;
    return numericPrice * this.bankDetails.depositPercentage;
  }
}
