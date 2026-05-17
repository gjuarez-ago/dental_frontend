import { Component, computed, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './patient-layout.html',
  styleUrl: './patient-layout.scss',
})
export class PatientLayoutComponent {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  readonly userInitials = computed(() => {
    const name = this.auth.currentUser()?.nombreCompleto ?? '';
    return name.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
  });

  readonly firstName = computed(() =>
    (this.auth.currentUser()?.nombreCompleto?.split(' ') || [])[0] ?? 'Paciente'
  );

  goToBooking(): void {
    const estadoId = this.auth.currentUser()?.estadoId
      || localStorage.getItem('novatia_last_estado')
      || null;
    this.router.navigate(['/booking'], estadoId ? { queryParams: { estadoId } } : {});
  }

  logout(): void { this.auth.logout(); }
}
