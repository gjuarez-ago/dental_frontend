import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../../core/models/user-role.enum';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  protected readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);

  readonly menuItems = [
    { 
      label: 'Panel de Control', 
      path: '/dashboard', 
      icon: 'ph ph-chart-bar' 
    },
    { 
      label: 'Pacientes', 
      path: '/dashboard/patients', 
      icon: 'ph ph-users' 
    },
    { 
      label: 'Calendario', 
      path: '/dashboard/appointments', 
      icon: 'ph ph-calendar' 
    },
    { 
      label: 'Servicios', 
      path: '/dashboard/services', 
      icon: 'ph ph-clipboard-text' 
    },
    { 
      label: 'Usuarios', 
      path: '/dashboard/users', 
      icon: 'ph ph-user-plus',
      onlyOwner: true 
    }
  ];

  get filteredMenuItems() {
    const userRole = this.auth.getUserRole();
    return this.menuItems.filter(item => {
      if (item.onlyOwner) {
        return userRole === UserRole.OWNER || userRole === UserRole.SUPER_ADMIN;
      }
      return true;
    });
  }

  logout() {
    this.auth.logout();
  }
}
