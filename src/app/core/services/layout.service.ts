import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private readonly _isSidebarOpen = signal(true);
  private readonly _isNotificationOpen = signal(false);
  private readonly _isAppointmentDrawerOpen = signal(false);
  private readonly _isConfigOpen = signal(false);
  private readonly _isConfirmationOpen = signal(false);
  private readonly _selectedCitaForConfirmation = signal<any>(null);
  
  private readonly _isRejectionOpen = signal(false);
  private readonly _selectedCitaForRejection = signal<any>(null);

  private readonly _isCancellationOpen = signal(false);
  private readonly _selectedCitaForCancellation = signal<any>(null);
  
  private readonly _selectedDate = signal<Date>(new Date());
  private readonly _selectedCitaForEdit = signal<any | null>(null);
  private readonly _selectedPatientForAppointment = signal<any | null>(null);
  
  // Public signals
  readonly isSidebarOpen = this._isSidebarOpen.asReadonly();
  readonly isNotificationOpen = this._isNotificationOpen.asReadonly();
  readonly isAppointmentDrawerOpen = this._isAppointmentDrawerOpen.asReadonly();
  readonly isConfigOpen = this._isConfigOpen.asReadonly();
  readonly isConfirmationOpen = this._isConfirmationOpen.asReadonly();
  readonly selectedCitaForConfirmation = this._selectedCitaForConfirmation.asReadonly();
  readonly isRejectionOpen = this._isRejectionOpen.asReadonly();
  readonly selectedCitaForRejection = this._selectedCitaForRejection.asReadonly();
  readonly isCancellationOpen = this._isCancellationOpen.asReadonly();
  readonly selectedCitaForCancellation = this._selectedCitaForCancellation.asReadonly();
  readonly selectedDate = this._selectedDate.asReadonly();
  readonly selectedCitaForEdit = this._selectedCitaForEdit.asReadonly();
  readonly selectedPatientForAppointment = this._selectedPatientForAppointment.asReadonly();
  
  // Computed signals
  readonly sidebarWidth = computed(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      return '0px';
    }
    return this._isSidebarOpen() ? '280px' : '80px';
  });

  toggleSidebar(): void {
    this._isSidebarOpen.update(state => !state);
  }

  toggleNotificationDrawer(): void {
    this._isNotificationOpen.update(state => !state);
  }

  closeNotificationDrawer(): void {
    this._isNotificationOpen.set(false);
  }

  toggleAppointmentDrawer(): void {
    this._isAppointmentDrawerOpen.update(state => !state);
  }

  openAppointmentDrawer(date: Date = new Date(), cita?: any): void {
    this._selectedDate.set(date);
    this._selectedCitaForEdit.set(cita || null);
    this._isAppointmentDrawerOpen.set(true);
  }

  closeAppointmentDrawer(): void {
    this._isAppointmentDrawerOpen.set(false);
    this._selectedCitaForEdit.set(null);
    this._selectedPatientForAppointment.set(null);
  }

  openAppointmentDrawerForPatient(patient: any): void {
    this._selectedPatientForAppointment.set(patient);
    this._selectedCitaForEdit.set(null); // Asegurar que no sea modo edición
    this._selectedDate.set(new Date());
    this._isAppointmentDrawerOpen.set(true);
  }

  toggleConfigDrawer(): void {
    this._isConfigOpen.update(state => !state);
  }

  closeConfigDrawer(): void {
    this._isConfigOpen.set(false);
  }

  closeSidebar(): void {
    this._isSidebarOpen.set(false);
  }

  openSidebar(): void {
    this._isSidebarOpen.set(true);
  }

  openConfirmationDrawer(cita: any): void {
    this._selectedCitaForConfirmation.set(cita);
    this._isConfirmationOpen.set(true);
  }

  closeConfirmationDrawer(): void {
    this._isConfirmationOpen.set(false);
    this._selectedCitaForConfirmation.set(null);
  }

  openRejectionDrawer(cita: any): void {
    this._selectedCitaForRejection.set(cita);
    this._isRejectionOpen.set(true);
  }

  closeRejectionDrawer(): void {
    this._isRejectionOpen.set(false);
    this._selectedCitaForRejection.set(null);
  }

  openCancellationDrawer(cita: any): void {
    this._selectedCitaForCancellation.set(cita);
    this._isCancellationOpen.set(true);
  }

  closeCancellationDrawer(): void {
    this._isCancellationOpen.set(false);
    this._selectedCitaForCancellation.set(null);
  }
}
