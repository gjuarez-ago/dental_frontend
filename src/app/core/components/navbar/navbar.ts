import { Component, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly auth = inject(AuthService);

  readonly userInitials = computed(() => {
    const user = this.auth.currentUser();
    if (!user || !user.nombreCompleto) return 'AD';
    
    return user.nombreCompleto
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  });
}
