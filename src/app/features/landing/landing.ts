import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';

interface DentalService {
  name: string;
  price: string;
  description: string;
  img: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent {
  private readonly bookingService = inject(BookingService);
  private readonly router = inject(Router);

  protected readonly services: DentalService[] = [
    { 
      name: 'Limpieza Dental', 
      price: '~$600 MXN', 
      description: 'Profilaxis profunda para eliminar placa y sarro, previniendo caries y gingivitis.',
      img: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600'
    },
    { 
      name: 'Resinas', 
      price: '~$800 MXN', 
      description: 'Restauración estética por pieza, del mismo color de tu diente para tratar caries.',
      img: 'https://images.unsplash.com/photo-1598256989800-fea5f61d5f2a?w=600'
    },
    { 
      name: 'Blanqueamiento', 
      price: '~$2,500 MXN', 
      description: 'Recupera el blanco natural de tus dientes en sesiones clínicas sin dolor.',
      img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600'
    },
    { 
      name: 'Extracciones', 
      price: 'Valoración', 
      description: 'Retiro seguro de muelas del juicio o piezas irreparables con anestesia local.',
      img: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600'
    },
    { 
      name: 'Endodoncias', 
      price: 'Valoración', 
      description: 'Salva tu diente natural tratando la infección del nervio interno.',
      img: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600'
    },
    { 
      name: 'Brackets', 
      price: 'Valoración', 
      description: 'Alineación dental para lograr una sonrisa estética y una mordida funcional.',
      img: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600'
    },
    { 
      name: 'Prótesis Dentales', 
      price: 'Valoración', 
      description: 'Coronas, puentes y placas para restaurar dientes perdidos y recuperar confianza.',
      img: 'https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=600'
    },
    { 
      name: 'Cirugías', 
      price: 'Valoración', 
      description: 'Intervenciones maxilofaciales menores en un ambiente seguro y estéril.',
      img: 'https://images.unsplash.com/photo-1551076805-e1869043e560?w=600'
    }
  ];

  openBooking(serviceName: string, price: string): void {
    this.bookingService.setService(serviceName, price);
    this.router.navigate(['/booking']);
  }
}
