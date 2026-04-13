import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  protected readonly layout = inject(LayoutService);

  readonly menuItems = [
    { 
      label: 'Panel de Control', 
      path: '/dashboard', 
      icon: '' 
    },
    { 
      label: 'Pacientes', 
      path: '/dashboard/patients', 
      icon: '' 
    },
    { 
      label: 'Calendario', 
      path: '/dashboard/appointments', 
      icon: '' 
    },
    { 
      label: 'Servicios', 
      path: '/dashboard/services', 
      icon: '' 
    }
  ];
}
