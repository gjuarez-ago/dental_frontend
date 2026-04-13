import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { NavbarComponent } from '../../components/navbar/navbar';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { NotificationDrawerComponent } from '../../components/notification-drawer/notification-drawer';
import { AppointmentDrawerComponent } from '../../../features/appointments/components/appointment-drawer/appointment-drawer';
import { AppointmentService } from '../../services/appointment.service';
import { ConfigDrawerComponent } from '../../components/config-drawer/config-drawer';
import { NgxSpinnerModule } from 'ngx-spinner';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    NavbarComponent, 
    SidebarComponent, 
    NotificationDrawerComponent, 
    AppointmentDrawerComponent, 
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

  onAppointmentSaved(data: any) {
    this.layout.closeAppointmentDrawer();
  }
}
