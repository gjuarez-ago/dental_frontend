import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LayoutService } from '../../services/layout.service';

@Component({
  selector: 'app-navbar',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent {
  protected readonly layout = inject(LayoutService);
}
