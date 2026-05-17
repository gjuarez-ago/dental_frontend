import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgxSpinnerModule } from 'ngx-spinner';
import { PatientPortalService, TimelineEntry } from '../../../core/services/patient-portal.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-medical-history',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule],
  templateUrl: './medical-history.html',
  styleUrl: './medical-history.scss'
})
export class MedicalHistoryComponent implements OnInit {
  private readonly patientService = inject(PatientPortalService);
  private readonly auth           = inject(AuthService);
  private readonly router         = inject(Router);

  readonly history   = signal<TimelineEntry[]>([]);
  readonly isLoading = signal(true);
  readonly error     = signal<string | null>(null);

  readonly statusConfig: Record<string, { label: string; class: string }> = {
    'FINALIZADA':    { label: 'Finalizada',      class: 'finalizada' },
    'CONFIRMADA':    { label: 'Confirmada',       class: 'confirmada' },
    'POR_LIQUIDAR':  { label: 'Pago pendiente',  class: 'por-liquidar' },
    'EN_CONSULTA':   { label: 'En consulta',     class: 'en-consulta' },
    'LLEGADA':       { label: 'En sala',         class: 'en-consulta' },
    'POR_CONFIRMAR': { label: 'Por confirmar',   class: 'por-confirmar' },
    'CANCELADA':     { label: 'Cancelada',       class: 'cancelada' },
    'RECHAZADA':     { label: 'Rechazada',       class: 'rechazada' },
    'AUSENTE':       { label: 'No asistió',      class: 'ausente' },
  };

  ngOnInit(): void { this.loadHistory(); }

  loadHistory(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.patientService.getMedicalHistory().subscribe({
      next: (res) => {
        if (res.ok && res.result) this.history.set(res.result);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar tu historial. Intenta más tarde.');
        this.isLoading.set(false);
      }
    });
  }

  goToBooking(): void {
    const estadoId = this.auth.currentUser()?.estadoId
      || localStorage.getItem('novatia_last_estado')
      || null;
    this.router.navigate(['/booking'], estadoId ? { queryParams: { estadoId } } : {});
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  getDoctorPrefix(genero?: string): string {
    if (genero === 'FEMENINO')   return 'Dra.';
    if (genero === 'MASCULINO')  return 'Dr.';
    return 'Dr(a).';
  }

  formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateStr));
  }
}
