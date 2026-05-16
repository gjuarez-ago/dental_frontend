import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { LoadingService } from './core/services/loading.service';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'sr-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  animations: [
    trigger('overlayAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('500ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ],
  template: `
    <router-outlet></router-outlet>

    <!-- LOADER CELESTE PREMIUM (GLASSMORPHISM) -->
    <div 
      class="loader-overlay" 
      *ngIf="loadingService.isLoading()" 
      [@overlayAnimation]>
      
      <div class="loader-card">
        <div class="spinner-box">
          <div class="spinner-ring"></div>
          <div class="spinner-core"></div>
        </div>
        
        <div class="loader-content">
          <span class="loader-text">Cargando</span>
          <span class="loader-subtext">Por favor, espera un momento</span>
        </div>
      </div>

      <!-- Luces ambientales de fondo -->
      <div class="ambient-light top"></div>
      <div class="ambient-light bottom"></div>
    </div>
  `,
  styles: [`
    :host { 
      --celeste-soft: #e0f2fe;
      --celeste-primary: #7dd3fc;
      --celeste-deep: #0ea5e9;
      --text-soft: #64748b;
    }

    .loader-overlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      /* Fondo traslúcido muy suave */
      background: rgba(240, 249, 255, 0.6);
      backdrop-filter: blur(18px) saturate(120%);
      overflow: hidden;
    }

    .loader-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 40px 60px;
      border-radius: 40px;
      /* Efecto cristal blanco */
      background: rgba(255, 255, 255, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.8);
      box-shadow: 0 20px 40px rgba(125, 211, 252, 0.15);
      z-index: 10;
    }

    /* Spinner Estilo "Hilo de Seda" */
    .spinner-box {
      position: relative;
      width: 64px;
      height: 64px;
    }

    .spinner-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: var(--celeste-deep);
      border-left-color: var(--celeste-primary);
      animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }

    .spinner-core {
      position: absolute;
      inset: 6px;
      border-radius: 50%;
      border: 1px solid rgba(125, 211, 252, 0.3);
    }

    /* Textos */
    .loader-content {
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .loader-text {
      color: var(--celeste-deep);
      font-size: 1rem;
      font-weight: 600;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      font-family: 'Outfit', sans-serif;
    }

    .loader-subtext {
      color: var(--text-soft);
      font-size: 0.75rem;
      font-weight: 400;
      letter-spacing: 0.05em;
    }

    /* Luces de fondo decorativas */
    .ambient-light {
      position: absolute;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.4;
      z-index: 1;
    }
    .ambient-light.top {
      background: var(--celeste-primary);
      top: -100px;
      left: -100px;
    }
    .ambient-light.bottom {
      background: #bae6fd;
      bottom: -100px;
      right: -100px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private router = inject(Router);
  public loadingService = inject(LoadingService);

  constructor() {
    this.router.events.pipe(
      takeUntilDestroyed()
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.show();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Delay sutil para suavizar la salida
        setTimeout(() => this.loadingService.hide(), 500);
      }
    });
  }
}