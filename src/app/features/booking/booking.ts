import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingComponent implements OnInit {
  protected readonly fb = inject(BookingService);
  private readonly router = inject(Router);

  // Exponer el estado al template
  readonly state = this.fb.state;
  readonly bankDetails = this.fb.bankDetails;

  // Datos para el calendario y horarios
  readonly timeSlots = ['09:00 AM', '10:30 AM', '12:00 PM', '01:30 PM', '03:00 PM', '04:30 PM'];
  readonly currentMonth = 'Abril 2026'; // Mock para el diseño
  
  // Doctor Profile (Datos reales de la Dra. Sarai Rios)
  readonly doctor = {
    name: 'Dra. Sarai Rios',
    title: 'CIRUJANO DENTISTA',
    description: 'Especialista en odontología estética y restauradora, dedicada a transformar sonrisas con tecnología de vanguardia.',
    rating: 4.9,
    reviews: 120,
    img: 'https://images.unsplash.com/photo-1629470948467-313620719067?auto=format&fit=crop&q=80&w=400'
  };

  // Form fields para el Paso 2
  bookingName = '';
  bookingPhone = '';

  // Interacción de carga
  isUploading = signal(false);

  ngOnInit(): void {
    // Si no hay un servicio seleccionado, podríamos volver a la landing
    if (!this.state().serviceName) {
      this.router.navigate(['/']);
    }
    // Sincronizar info si ya existe
    this.bookingName = this.state().customerName;
    this.bookingPhone = this.state().customerPhone;
  }

  onDateSelect(day: number): void {
    const date = new Date(2026, 3, day); // Abril 2026
    this.fb.setDate(date);
  }

  onSlotSelect(slot: string): void {
    this.fb.setSlot(slot);
  }

  nextStep(): void {
    const currentStep = this.state().step;
    
    if (currentStep === 1) {
      if (this.state().selectedDate && this.state().selectedSlot) {
        this.fb.setStep(2);
      }
    } else if (currentStep === 2) {
      if (this.bookingName && this.bookingPhone) {
        this.fb.setCustomerInfo(this.bookingName, this.bookingPhone);
        this.fb.setStep(3);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Lógica de archivos
  triggerFileInput(input: HTMLInputElement): void {
    if (!this.isUploading()) {
      input.click();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.isUploading.set(true);
      
      // Simulación de carga premium (1.5s)
      setTimeout(() => {
        this.isUploading.set(false);
        this.fb.setReceiptUploaded(true);
        this.fb.setStep(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 1500);
    }
  }

  finish(): void {
    this.fb.resetBooking();
    this.router.navigate(['/']);
  }

  prevStep(): void {
    const currentStep = this.state().step;
    if (currentStep > 1 && currentStep < 4) {
      this.fb.setStep(currentStep - 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getDepositAmount(): number {
    return this.fb.calculateDeposit(this.state().price);
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('es-ES', options);
  }

  goBack(): void {
    if (this.state().step === 1) {
      this.router.navigate(['/']);
    } else if (this.state().step === 4) {
      this.finish();
    } else {
      this.prevStep();
    }
  }
}
