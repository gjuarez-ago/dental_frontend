import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PatientPortalService, CitaPatient } from '../../../core/services/patient-portal.service';
import { AuthService } from '../../../core/services/auth.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { ProfileSetupComponent } from '../profile-setup/profile-setup';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule, ProfileSetupComponent, FormsModule, RouterModule, ConfirmModalComponent],
  templateUrl: './my-appointments.html',
  styleUrl: './my-appointments.scss',
})
export class MyAppointmentsComponent implements OnInit {
  private readonly portalService = inject(PatientPortalService);
  protected readonly authService = inject(AuthService);
  private readonly spinner       = inject(NgxSpinnerService);
  private readonly toastr        = inject(ToastrService);
  private readonly router        = inject(Router);

  // ─── Modal ────────────────────────────────────────────────────────
  readonly showModal   = signal(false);
  readonly modalConfig = signal({
    title: 'Confirmar', message: '',
    type: 'warning' as 'info' | 'danger' | 'warning' | 'success',
    icon: 'ph ph-warning'
  });
  private modalCallback: (() => void) | null = null;

  showConfirm(message: string, callback: () => void, type: 'info' | 'danger' | 'warning' | 'success' = 'warning', title = 'Confirmar') {
    this.modalConfig.set({ title, message, type, icon: type === 'danger' ? 'ph ph-trash' : 'ph ph-warning' });
    this.showModal.set(true);
    this.modalCallback = callback;
  }

  handleModalConfirm() {
    this.modalCallback?.();
    this.showModal.set(false);
  }

  // ─── State ────────────────────────────────────────────────────────
  readonly appointments   = signal<CitaPatient[]>([]);
  readonly loading        = signal(true);
  readonly selectedFilter = signal<string>('TODAS');

  filteredAppointments = computed(() => {
    const filter = this.selectedFilter();
    if (filter === 'TODAS') return this.appointments();
    return this.appointments().filter(a => a.estado === filter);
  });

  readonly statusLabels: Record<string, { label: string; class: string }> = {
    'POR_CONFIRMAR': { label: 'Por confirmar',  class: 'por-confirmar' },
    'CONFIRMADA':    { label: 'Confirmada',      class: 'confirmada' },
    'LLEGADA':       { label: 'En sala',         class: 'en-consulta' },
    'EN_CONSULTA':   { label: 'En consulta',    class: 'en-consulta' },
    'FINALIZADA':    { label: 'Completada',     class: 'finalizada' },
    'POR_LIQUIDAR':  { label: 'Pago pendiente', class: 'por-liquidar' },
    'CANCELADA':     { label: 'Cancelada',      class: 'cancelada' },
    'RECHAZADA':     { label: 'Rechazada',      class: 'rechazada' },
    'AUSENTE':       { label: 'No asistió',     class: 'ausente' },
  };

  // ─── Lifecycle ────────────────────────────────────────────────────
  ngOnInit(): void {
    if (!this.showSetup()) this.loadAppointments();
  }

  showSetup(): boolean {
    return this.authService.currentUser()?.pinCambiado === false;
  }

  onSetupComplete(): void {
    const user = this.authService.currentUser();
    if (user) {
      const updated = { ...user, pinCambiado: true, emailVerificado: true };
      localStorage.setItem('user', JSON.stringify(updated));
      this.authService.currentUser.set(updated);
    }
    this.loadAppointments();
  }

  // ─── Data ─────────────────────────────────────────────────────────
  loadAppointments(): void {
    this.loading.set(true);
    this.spinner.show();
    this.portalService.getMyAppointments().subscribe({
      next: (res) => {
        if (res.ok && res.result) this.appointments.set(res.result);
        this.loading.set(false);
        this.spinner.hide();
      },
      error: () => {
        this.toastr.error('Error al cargar tus citas');
        this.loading.set(false);
        this.spinner.hide();
      }
    });
  }

  cancelAppointment(cita: CitaPatient): void {
    this.showConfirm('¿Seguro que deseas cancelar esta cita?', () => {
      this.spinner.show();
      this.portalService.cancelAppointment(cita.id, 'Cancelada por el paciente').subscribe({
        next: (res) => { if (res.ok) { this.toastr.success('Cita cancelada'); this.loadAppointments(); } this.spinner.hide(); },
        error: () => { this.toastr.error('No se pudo cancelar'); this.spinner.hide(); }
      });
    }, 'danger', 'Cancelar Cita');
  }

  // ─── Helpers ──────────────────────────────────────────────────────
  goToBooking(): void {
    const estadoId = this.authService.currentUser()?.estadoId
      || localStorage.getItem('novatia_last_estado')
      || null;
    this.router.navigate(['/booking'], estadoId ? { queryParams: { estadoId } } : {});
  }

  getDoctorPrefix(genero?: string): string {
    if (genero === 'FEMENINO') return 'Dra.';
    if (genero === 'MASCULINO') return 'Dr.';
    return 'Dr(a).';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  contactWhatsApp(cita: CitaPatient): void {
    if (!cita.sucursalTelefono) { this.toastr.error('No se encontró el teléfono de la sucursal'); return; }
    const phone = cita.sucursalTelefono.replace(/\D/g, '');
    const msg = encodeURIComponent(`[DENTAL-PORTAL] Hola, necesito información sobre mi cita folio ${cita.folio} (${cita.servicioNombre}).`);
    window.open(`https://wa.me/52${phone}?text=${msg}`, '_blank');
  }

  requestRescheduleWA(cita: CitaPatient): void {
    if (!cita.sucursalTelefono) return;
    const phone = cita.sucursalTelefono.replace(/\D/g, '');
    const msg = encodeURIComponent(`[ACCION:REAGENDAR] Hola, deseo REAGENDAR mi cita confirmada con folio ${cita.folio} programada para el día ${this.formatDate(cita.fechaHora)} a las ${new Date(cita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}hs. ¿Qué horarios tienen disponibles?`);
    window.open(`https://wa.me/52${phone}?text=${msg}`, '_blank');
  }

  requestCancellationWA(cita: CitaPatient): void {
    if (!cita.sucursalTelefono) return;
    const phone = cita.sucursalTelefono.replace(/\D/g, '');
    const msg = encodeURIComponent(`[ACCION:CANCELAR] Hola, deseo CANCELAR mi cita confirmada con folio ${cita.folio} programada para el día ${this.formatDate(cita.fechaHora)} a las ${new Date(cita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}hs.`);
    window.open(`https://wa.me/52${phone}?text=${msg}`, '_blank');
  }
}
