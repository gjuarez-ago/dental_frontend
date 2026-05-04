import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientPortalService, TimelineEntry } from '../../../core/services/patient-portal.service';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-medical-history',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterModule],
  templateUrl: './medical-history.html',
  styleUrl: './medical-history.scss'
})
export class MedicalHistoryComponent implements OnInit {
  private patientService = inject(PatientPortalService);
  protected readonly authService = inject(AuthService);
  
  history = signal<TimelineEntry[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  statusConfig: Record<string, { label: string, class: string, icon: string }> = {
    'FINALIZADA': { label: '🎉 Tratamiento Concluido', class: 'finalizada', icon: 'check-circle' },
    'CONFIRMADA': { label: '📅 Próxima Cita', class: 'confirmada', icon: 'calendar-days' },
    'POR_LIQUIDAR': { label: '💳 Pendiente de Pago', class: 'por-liquidar', icon: 'credit-card' },
    'EN_CONSULTA': { label: '🦷 En Atención', class: 'en-consulta', icon: 'stethoscope' },
    'POR_CONFIRMAR': { label: '⏳ En Validación', class: 'por-confirmar', icon: 'clock' },
    'CANCELADA': { label: '❌ Cancelada', class: 'cancelada', icon: 'x-circle' },
    'RECHAZADA': { label: '🚫 Rechazada', class: 'rechazada', icon: 'ban' },
    'AUSENTE': { label: '👣 No Asistió', class: 'ausente', icon: 'user-x' }
  };

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.isLoading.set(true);
    this.patientService.getMedicalHistory().subscribe({
      next: (res) => {
        if (res.ok && res.result) {
          this.history.set(res.result);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading history', err);
        this.error.set('No pudimos cargar tu historial médico. Intenta más tarde.');
        this.isLoading.set(false);
      }
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getDoctorPrefix(genero?: string): string {
    if (genero === 'FEMENINO') return 'Dra.';
    if (genero === 'MASCULINO') return 'Dr.';
    return 'Dr(a).';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-MX', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date) + ' hs';
  }

  isAppointmentPending(entry: TimelineEntry): boolean {
    return ['POR_CONFIRMAR', 'CONFIRMADA', 'EN_CONSULTA'].includes(entry.estado);
  }

  getClinicalPlaceholder(field: 'diagnostico' | 'procedimiento' | 'recomendaciones', entry: TimelineEntry): string {
    const isPending = this.isAppointmentPending(entry);
    
    if (isPending) {
      switch (field) {
        case 'diagnostico': return 'Se registrará durante tu valoración clínica.';
        case 'procedimiento': return 'Se definirá según la necesidad del tratamiento.';
        case 'recomendaciones': return 'Se te entregarán indicaciones personalizadas al finalizar tu cita.';
      }
    }

    // Default fallbacks for completed appointments with empty fields
    switch (field) {
      case 'diagnostico': return 'Sin observaciones adicionales registradas.';
      case 'procedimiento': return 'Tratamiento de rutina realizado.';
      case 'recomendaciones': return 'Siga las indicaciones generales de cuidado dental y mantenga su higiene diaria.';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
