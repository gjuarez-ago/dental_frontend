import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatientPortalService, CitaPatient } from '../../../core/services/patient-portal.service';
import { AuthService } from '../../../core/services/auth.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { ProfileSetupComponent } from '../profile-setup/profile-setup';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, NgxSpinnerModule, ProfileSetupComponent],
  template: `
    <div class="patient-portal animate-fade-in">
      <!-- BLOQUEO DE CONFIGURACIÓN INICIAL -->
      <app-profile-setup 
        *ngIf="showSetup()" 
        (completed)="onSetupComplete()"
      ></app-profile-setup>

      <header class="portal-header">
        <div class="header-content">
          <div class="user-info">
            <h1>Mis Citas</h1>
            <p>Gestiona tus citas en todas nuestras clínicas</p>
          </div>
          <button class="logout-btn" (click)="logout()">
            <i class="ph ph-sign-out"></i>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </header>

      <main class="portal-main">
        <ngx-spinner bdColor="rgba(255,255,255,0.8)" size="medium" color="#0f172a" type="ball-beat" [fullScreen]="false"></ngx-spinner>

        <div class="appointments-grid" *ngIf="appointments().length > 0; else emptyState">
          <div class="appointment-card-premium" *ngFor="let cita of appointments()">
            <div class="card-status-line" [class]="cita.estado.toLowerCase()"></div>
            
            <div class="card-body">
              <div class="clinic-info">
                <span class="clinic-badge">{{ cita.clinicaNombre }}</span>
                <span class="sucursal-name"><i class="ph ph-map-pin"></i> {{ cita.sucursalNombre }}</span>
              </div>

              <div class="appointment-details">
                <h3 class="service-name">{{ cita.servicioNombre }}</h3>
                <div class="time-info">
                  <i class="ph ph-calendar-blank"></i>
                  <span>{{ cita.fechaHora | date:'EEEE d MMMM, y' | titlecase }}</span>
                  <span class="time-dot">•</span>
                  <i class="ph ph-clock"></i>
                  <span>{{ cita.fechaHora | date:'h:mm a' }}</span>
                </div>
              </div>

              <div class="financial-summary">
                <div class="finance-header">
                  <span class="label">Resumen de Pago</span>
                  <span class="folio">#{{ cita.folio }}</span>
                </div>
                
                <div class="finance-rows">
                  <div class="row">
                    <span class="row-label">Costo Estimado</span>
                    <span class="row-value">\${{ cita.montoBase | number:'1.2-2' }}</span>
                  </div>
                  <div class="row highlights">
                    <span class="row-label">Monto Pagado</span>
                    <span class="row-value success">\${{ cita.montoPagado | number:'1.2-2' }}</span>
                  </div>
                  <div class="row total" *ngIf="cita.saldoPendiente > 0">
                    <span class="row-label">Saldo Pendiente</span>
                    <span class="row-value warning">\${{ cita.saldoPendiente | number:'1.2-2' }}</span>
                  </div>
                </div>

                <div class="finance-disclaimer">
                  <i class="ph ph-info"></i>
                  <span>El precio final puede variar según el diagnóstico clínico.</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <div class="status-indicator">
                <span class="status-dot" [class]="cita.estado.toLowerCase()"></span>
                <span class="status-text">{{ cita.estado.replace('_', ' ') }}</span>
              </div>

              <button 
                class="btn-cancel" 
                *ngIf="cita.permiteCancelar"
                (click)="cancelAppointment(cita)"
              >
                Cancelar Cita
              </button>
              
              <span class="cancel-msg" *ngIf="!cita.permiteCancelar && cita.mensajeCancelacion">
                {{ cita.mensajeCancelacion }}
              </span>
            </div>
          </div>
        </div>

        <ng-template #emptyState>
          <div class="empty-state" *ngIf="!loading()">
            <i class="ph ph-calendar-slash"></i>
            <h2>No tienes citas agendadas</h2>
            <p>Cuando agendes una cita, aparecerá aquí.</p>
            <button class="btn-primary" (click)="goToBooking()">Agendar Cita</button>
          </div>
        </ng-template>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #f8fafc;
      font-family: 'Inter', sans-serif;
    }

    .patient-portal {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .portal-header {
      margin-bottom: 3rem;
      
      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      h1 {
        font-size: 2.5rem;
        font-weight: 850;
        color: #0f172a;
        letter-spacing: -0.04em;
        margin: 0;
      }

      p {
        color: #64748b;
        margin-top: 0.5rem;
        font-size: 1.1rem;
      }
    }

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 1rem;
      color: #ef4444;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #fee2e2;
        border-color: #fecaca;
      }
    }

    .appointments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 2rem;
    }

    .appointment-card-premium {
      background: white;
      border-radius: 2rem;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.04);
      border: 1px solid #f1f5f9;
      position: relative;
      display: flex;
      flex-direction: column;
      transition: transform 0.3s ease;

      &:hover {
        transform: translateY(-5px);
      }
    }

    .card-status-line {
      height: 6px;
      width: 100%;
      background: #cbd5e1;

      &.por_confirmar { background: #f59e0b; }
      &.confirmada { background: #10b981; }
      &.finalizada { background: #6366f1; }
    }

    .card-body {
      padding: 2rem;
      flex: 1;
    }

    .clinic-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;

      .clinic-badge {
        background: #0f172a;
        color: white;
        padding: 0.4rem 1rem;
        border-radius: 2rem;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .sucursal-name {
        color: #64748b;
        font-size: 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
    }

    .service-name {
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }

    .time-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #475569;
      font-size: 0.95rem;
      margin-bottom: 2rem;

      i { color: #6366f1; }
      .time-dot { margin: 0 0.25rem; color: #cbd5e1; }
    }

    .financial-summary {
      background: #f8fafc;
      border-radius: 1.5rem;
      padding: 1.5rem;
      border: 1px solid #f1f5f9;

      .finance-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
        
        .label { font-size: 0.75rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .folio { font-family: monospace; font-size: 0.875rem; color: #64748b; }
      }

      .finance-rows {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1rem;

        .row {
          display: flex;
          justify-content: space-between;
          font-size: 0.95rem;

          .row-label { color: #64748b; }
          .row-value { font-weight: 700; color: #0f172a; }

          &.total {
            padding-top: 0.75rem;
            border-top: 1px dashed #e2e8f0;
          }

          .success { color: #10b981; }
          .warning { color: #f59e0b; }
        }
      }

      .finance-disclaimer {
        display: flex;
        gap: 0.5rem;
        color: #94a3b8;
        font-size: 0.75rem;
        line-height: 1.4;

        i { margin-top: 2px; }
      }
    }

    .card-footer {
      padding: 1.5rem 2rem;
      background: #ffffff;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 0.6rem;

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #cbd5e1;

        &.por_confirmar { background: #f59e0b; box-shadow: 0 0 10px rgba(245, 158, 11, 0.4); }
        &.confirmada { background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }
      }

      .status-text {
        font-size: 0.8125rem;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }

    .btn-cancel {
      padding: 0.6rem 1rem;
      border-radius: 0.75rem;
      background: #ffffff;
      color: #ef4444;
      border: 1px solid #fee2e2;
      font-size: 0.8125rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #ef4444;
        color: white;
      }
    }

    .cancel-msg {
      font-size: 0.7rem;
      color: #94a3b8;
      max-width: 180px;
      text-align: right;
    }

    .empty-state {
      text-align: center;
      padding: 5rem 1rem;

      i { font-size: 5rem; color: #e2e8f0; margin-bottom: 2rem; }
      h2 { font-size: 2rem; color: #0f172a; margin-bottom: 0.5rem; }
      p { color: #64748b; margin-bottom: 2rem; }
    }

    .btn-primary {
      background: #0f172a;
      color: white;
      padding: 1rem 2.5rem;
      border-radius: 1.5rem;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.2);
    }
  `]
})
export class MyAppointmentsComponent implements OnInit {
  private readonly portalService = inject(PatientPortalService);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  appointments = signal<CitaPatient[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    if (!this.showSetup()) {
      this.loadAppointments();
    }
  }

  showSetup() {
    const user = this.authService.currentUser();
    return user && user.pinCambiado === false;
  }

  onSetupComplete() {
    // Actualizar el estado del usuario en el storage y en el signal
    const user = this.authService.currentUser();
    if (user) {
      const updatedUser = { ...user, pinCambiado: true, emailVerificado: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      this.authService.currentUser.set(updatedUser);
    }
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.spinner.show();
    this.portalService.getMyAppointments().subscribe({
      next: (res) => {
        if (res.ok && res.result) {
          this.appointments.set(res.result);
        }
        this.loading.set(false);
        this.spinner.hide();
      },
      error: () => {
        this.toastr.error('Error al cargar tus citas', 'Error');
        this.loading.set(false);
        this.spinner.hide();
      }
    });
  }

  cancelAppointment(cita: CitaPatient): void {
    if (!confirm('¿Seguro que deseas cancelar esta cita?')) return;

    this.spinner.show();
    this.portalService.cancelAppointment(cita.id, 'Cancelada por el paciente desde el portal').subscribe({
      next: (res) => {
        if (res.ok) {
          this.toastr.success('Cita cancelada correctamente');
          this.loadAppointments();
        }
        this.spinner.hide();
      },
      error: () => {
        this.toastr.error('No se pudo cancelar la cita');
        this.spinner.hide();
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  goToBooking(): void {
    this.router.navigate(['/booking']);
  }
}
