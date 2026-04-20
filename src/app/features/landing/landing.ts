import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs';
import { BookingService } from '../../core/services/booking.service';
import { ServicioDental } from '../../core/models/service-dental.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgxSpinnerModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent implements OnInit {
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

  openBooking(service: ServicioDental | string, price?: string): void {
    if (typeof service === 'string') {
      this.bookingService.setService({ nombre: service, price: price });
    } else {
      this.bookingService.setService(service);
    }
    this.router.navigate(['/booking']);
  }
}
