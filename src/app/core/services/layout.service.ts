import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  private readonly _isSidebarOpen = signal(true);
  private readonly _isNotificationOpen = signal(false);
  private readonly _isAppointmentDrawerOpen = signal(false);
  private readonly _isConfigOpen = signal(false);
  
  // Public signals
  readonly isSidebarOpen = this._isSidebarOpen.asReadonly();
  readonly isNotificationOpen = this._isNotificationOpen.asReadonly();
  readonly isAppointmentDrawerOpen = this._isAppointmentDrawerOpen.asReadonly();
  readonly isConfigOpen = this._isConfigOpen.asReadonly();
  
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

  closeAppointmentDrawer(): void {
    this._isAppointmentDrawerOpen.set(false);
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
}
