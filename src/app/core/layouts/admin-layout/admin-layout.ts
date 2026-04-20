import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { NavbarComponent } from '../../components/navbar/navbar';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { AppointmentDrawerComponent } from '../../../features/appointments/components/appointment-drawer/appointment-drawer';
import { ConfirmationDrawerComponent } from '../../../features/appointments/components/confirmation-drawer/confirmation-drawer';
import { CancellationDrawerComponent } from '../../../features/appointments/components/cancellation-drawer/cancellation-drawer';
import { RejectionDrawerComponent } from '../../../features/appointments/components/rejection-drawer/rejection-drawer';
import { AppointmentService } from '../../services/appointment.service';
import { ConfigDrawerComponent } from '../../components/config-drawer/config-drawer';
import { NgxSpinnerModule } from 'ngx-spinner';

import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    NavbarComponent, 
    SidebarComponent, 
    AppointmentDrawerComponent, 
    ConfirmationDrawerComponent,
    CancellationDrawerComponent,
    RejectionDrawerComponent,
    ConfigDrawerComponent,
    NgxSpinnerModule
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminLayoutComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly appointmentService = inject(AppointmentService);
  private readonly router = inject(Router);

  onAppointmentSaved(data: any) {
    this.layout.closeAppointmentDrawer();
    
    // Si la cita se guardó correctamente, redirigir al calendario con la fecha seleccionada
    if (data) {
      this.appointmentService.notificarCitaGuardada(data);
      
      // Extraer la fecha (solo parte YYYY-MM-DD para el query param)
      const dateStr = new Date(data.fechaHora).toISOString().split('T')[0];
      
      this.router.navigate(['/dashboard/appointments'], { 
        queryParams: { date: dateStr } 
      });
    }
  }
}
