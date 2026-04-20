import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceDentalService } from '../../core/services/service-dental.service';
import { ServicioDental } from '../../core/models/service-dental.model';
import { ServiceDrawerComponent } from './components/service-drawer/service-drawer';
import { LayoutService } from '../../core/services/layout.service';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, ServiceDrawerComponent, NgxSpinnerModule],
  templateUrl: './services.html',
  styleUrl: './services.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServicesComponent implements OnInit {
  private serviceDentalService = inject(ServiceDentalService);
  protected readonly layout = inject(LayoutService);
  private readonly spinner = inject(NgxSpinnerService);
  
  readonly services = signal<ServicioDental[]>([]);
  isDrawerOpen = signal(false);
  selectedService = signal<ServicioDental | undefined>(undefined);

  ngOnInit() {
    this.loadServices();
  }

  loadServices() {
    this.spinner.show();
    this.serviceDentalService.getServicios()
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (data) => this.services.set(data),
        error: (err) => console.error('Error al cargar servicios:', err)
      });
  }

  openNew() {
    this.selectedService.set(undefined);
    this.isDrawerOpen.set(true);
  }

  openEdit(service: ServicioDental) {
    this.selectedService.set(service);
    this.isDrawerOpen.set(true);
  }

  onServiceSaved(data: ServicioDental) {
    const request = data.id 
      ? this.serviceDentalService.actualizarServicio(data.id, data)
      : this.serviceDentalService.crearServicio(data);

    this.spinner.show();
    request.pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (res) => {
          if (res) {
            this.loadServices();
            this.isDrawerOpen.set(false);
          }
        },
        error: (err) => console.error('Error al guardar servicio:', err)
      });
  }
}
