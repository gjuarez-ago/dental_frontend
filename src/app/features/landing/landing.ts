import { Component, ChangeDetectionStrategy, inject, OnInit, signal, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs';
import { BookingService } from '../../core/services/booking.service';
import { ServicioDental } from '../../core/models/service-dental.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgxSpinnerModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent implements OnInit, AfterViewInit {
  private readonly bookingService = inject(BookingService);
  private readonly router = inject(Router);
  private readonly spinner = inject(NgxSpinnerService);

  // Tenant ID fijo para Sarai Rios (Dental Studio)
  private readonly tenantId = '550e8400-e29b-41d4-a716-446655440000';

  protected readonly services = signal<ServicioDental[]>([]);
  protected readonly isLoading = signal(true);

  ngOnInit(): void {
    this.spinner.show();
    this.bookingService.getPublicServices(this.tenantId)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (services) => {
          this.services.set(services);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    // Token de Mapbox desde entorno
    mapboxgl.accessToken = environment.mapboxToken;

    const map = new mapboxgl.Map({
      container: 'mapbox-container',
      style: 'mapbox://styles/mapbox/streets-v12', // Estilo más colorido y detallado
      center: [-101.3453983, 17.5648433], // [lng, lat]
      zoom: 15,
      scrollZoom: false // Evitar zoom accidental al hacer scroll
    });

    // Añadir controles de navegación
    map.addControl(new mapboxgl.NavigationControl());

    // Añadir marcador personalizado (Color Mint Dark de la marca)
    new mapboxgl.Marker({ color: '#85CDBB' })
      .setLngLat([-101.3453983, 17.5648433])
      .setPopup(new mapboxgl.Popup({ offset: 25 })
        .setHTML('<h3>Dental Sonrisana</h3><p>Dra. Sarai Rios</p>'))
      .addTo(map);
  }

  openBooking(service: ServicioDental | string, price?: string): void {
    if (typeof service === 'string') {
      this.bookingService.setService({ nombre: service, price: price });
    } else {
      this.bookingService.setService(service);
    }
    this.router.navigate(['/booking']);
  }
}
