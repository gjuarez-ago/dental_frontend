import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { LoadingService } from './core/services/loading.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'sr-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <router-outlet></router-outlet>

    <!-- NATIVE GLOBAL LOADER PREMIUM -->
    <div class="novatia-global-loader" *ngIf="loadingService.isLoading()">
        <div class="loader-content">
            <div class="premium-orb"></div>
            <p class="loader-text">Cargando<span class="dots"></span></p>
        </div>
    </div>
  `,
  styles: [`
    .novatia-global-loader {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(26, 43, 76, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      backdrop-filter: blur(6px);
      transition: all 0.3s ease;
    }
    .loader-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 25px;
    }
    
    /* Animación Premium "Infinity Glow" */
    .premium-orb {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3B82F6 0%, #1A2B4C 100%);
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), inset 0 0 10px rgba(255,255,255,0.3);
      animation: morph-pulse 2s ease-in-out infinite alternate;
      position: relative;
    }
    
    .premium-orb::before {
      content: '';
      position: absolute;
      top: -10px; left: -10px; right: -10px; bottom: -10px;
      border: 2px solid rgba(59, 130, 246, 0.3);
      border-radius: 50%;
      animation: spin-orbit 3s linear infinite;
    }

    .loader-text {
      color: white;
      font-size: 1.1rem;
      font-weight: 500;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-family: 'Outfit', sans-serif;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }

    @keyframes morph-pulse {
      0% { transform: scale(0.9); border-radius: 50%; box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }
      50% { transform: scale(1.1); border-radius: 40% 60% 60% 40% / 50% 50% 50% 50%; box-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
      100% { transform: scale(0.95); border-radius: 50%; box-shadow: 0 0 20px rgba(59, 130, 246, 0.6); }
    }

    @keyframes spin-orbit {
      0% { transform: rotate(0deg) scale(1); opacity: 0.8; }
      50% { transform: rotate(180deg) scale(1.1); opacity: 0.3; }
      100% { transform: rotate(360deg) scale(1); opacity: 0.8; }
    }

    .dots::after {
      content: '.';
      animation: dots 1.5s infinite;
    }
    @keyframes dots {
      0% { content: '.'; }
      33% { content: '..'; }
      66% { content: '...'; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private router = inject(Router);
  public loadingService = inject(LoadingService);

  constructor() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.show();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        setTimeout(() => this.loadingService.hide(), 500);
      }
    });
  }
}
