import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { SlotDisponibilidad, DisponibilidadDia } from '../../core/models/appointment.model';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgxSpinnerModule],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingComponent implements OnInit {
  protected readonly fb = inject(BookingService);
  private readonly router = inject(Router);
  private readonly spinner = inject(NgxSpinnerService);

  // Tenant y Sucursal Fijos
  private readonly tenantId = '550e8400-e29b-41d4-a716-446655440000';
  private readonly sucursalId = '550e8400-e29b-41d4-a716-446655440001';

  // Exponer el estado al template
  readonly state = this.fb.state;
  readonly bankDetails = this.fb.bankDetails;

  // Reactividad para disponibilidad
  readonly monthlyDays = signal<DisponibilidadDia[]>([]);
  readonly availableSlots = signal<SlotDisponibilidad[]>([]);
  readonly currentMonthDate = signal<Date>(new Date());

  // Nueva señal computada para filtrar slots pasados
  readonly filteredSlots = computed(() => {
    const slots = this.availableSlots();
    const selectedDate = this.fb.state().selectedDate;
    if (!selectedDate) return slots;

    const now = new Date();
    const isToday = selectedDate.getDate() === now.getDate() &&
                    selectedDate.getMonth() === now.getMonth() &&
                    selectedDate.getFullYear() === now.getFullYear();

    if (!isToday) return slots;

    // Filtrar slots cuya hora de inicio sea posterior a la actual
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    return slots.filter(slot => {
      const [h, m] = slot.horaInicio.split(':').map(Number);
      if (h > currentHour) return true;
      if (h === currentHour && m > currentMin) return true;
      return false;
    });
  });

  readonly currentMonthName = computed(() => {
    const name = this.currentMonthDate().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });

  // Cálculo de espacios vacíos al inicio del calendario (lunes a domingo)
  readonly leadingEmptyDays = computed(() => {
    const firstDay = new Date(this.currentMonthDate().getFullYear(), this.currentMonthDate().getMonth(), 1);
    let dayOfWeek = firstDay.getDay(); // 0 = Dom, 1 = Lun...
    // Ajustar a 0 = Lun, 6 = Dom
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  });

  // Doctor Profile
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
  bookingNotes = '';

  // Estados de carga
  isLoadingAvailability = signal(false);
  isLoadingSlots = signal(false);
  isSubmitting = signal(false);

  ngOnInit(): void {
    if (!this.state().serviceName) {
      this.router.navigate(['/']);
      return;
    }
    
    this.bookingName = this.state().customerName;
    this.bookingPhone = this.state().customerPhone;
    
    this.loadMonthlyAvailability();
    this.fb.getClinicInfo(this.tenantId, this.sucursalId);
    this.scrollToTop();
  }

  loadMonthlyAvailability(): void {
    this.isLoadingAvailability.set(true);
    this.spinner.show();
    const date = this.currentMonthDate();
    this.fb.getMonthlyAvailability(
      this.tenantId, 
      this.sucursalId, 
      date.getMonth() + 1, 
      date.getFullYear()
    ).subscribe({
      next: (days) => {
        this.monthlyDays.set(days);
        this.isLoadingAvailability.set(false);
        this.spinner.hide();
      },
      error: () => {
        this.isLoadingAvailability.set(false);
        this.spinner.hide();
      }
    });
  }

  changeMonth(delta: number): void {
    const next = new Date(this.currentMonthDate());
    next.setMonth(next.getMonth() + delta);
    this.currentMonthDate.set(next);
    this.fb.setDate(null as any); // Limpiar fecha seleccionada
    this.availableSlots.set([]);
    this.loadMonthlyAvailability();
  }

  isPastDay(dateStr: string): boolean {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dayDate < today;
  }

  onDateSelect(day: DisponibilidadDia): void {
    if (!day.esLaboral || day.estaLlena) return;
    
    const dateStr = day.fecha; // El backend devuelve "YYYY-MM-DD"
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    
    this.fb.setDate(dateObj);
    this.availableSlots.set([]); // Limpiar inmediatamente para evitar clics en slots viejos
    this.loadSlots(dateStr);
  }

  loadSlots(dateStr: string): void {
    this.isLoadingSlots.set(true);
    this.spinner.show();
    this.fb.getAvailableSlots(
      this.tenantId,
      this.sucursalId,
      dateStr,
      this.state().serviceId
    ).subscribe({
      next: (slots) => {
        this.spinner.hide(); // Ocultar primero para liberar la interfaz
        this.availableSlots.set(slots);
        this.isLoadingSlots.set(false);
      },
      error: () => {
        this.isLoadingSlots.set(false);
        this.spinner.hide();
      }
    });
  }

  onSlotSelect(slot: SlotDisponibilidad): void {
    if (!slot.disponible) return;
    this.fb.setSlot(slot);
    // Solo desplazamos si es necesario para mostrar el botón de continuar
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const scrollOptions: ScrollToOptions = { 
        top: document.documentElement.scrollHeight, 
        left: 0, 
        behavior: 'smooth' 
      };
      window.scrollTo(scrollOptions);
      
      const container = document.querySelector('.booking-container');
      if (container) {
        container.scrollTo({ 
          top: container.scrollHeight, 
          behavior: 'smooth' 
        });
      }
    }, 150); // Incrementar ligeramente para no interrumpir el registro del clic
  }

  private scrollToTop(): void {
    setTimeout(() => {
      const scrollOptions: ScrollToOptions = { top: 0, left: 0, behavior: 'smooth' };
      window.scrollTo(scrollOptions);
      document.body.scrollTo(scrollOptions);
      document.documentElement.scrollTo(scrollOptions);
      
      const container = document.querySelector('.booking-container');
      if (container) {
        container.scrollTo(scrollOptions);
      }
    }, 10);
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
    this.scrollToTop();
  }

  async onFileSelected(event: any): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      // 1. Validar que sea solo imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona solo archivos de imagen (JPG, PNG). Los PDF no están permitidos.');
        input.value = '';
        return;
      }

      try {
        this.spinner.show();
        // 2. Comprimir imagen (Máximo 500KB)
        const compressedFile = await this.compressImage(file, 0.7, 1200);
        
        if (compressedFile.size > 500 * 1024) {
          // Si aún es pesada, re-comprimir con menor calidad
          const highCompression = await this.compressImage(compressedFile, 0.5, 1000);
          this.confirmBooking(highCompression);
        } else {
          this.confirmBooking(compressedFile);
        }
      } catch (error) {
        console.error('Error al procesar la imagen:', error);
        alert('No se pudo procesar la imagen. Intenta con otra.');
      } finally {
        // 3. Reset del input para permitir seleccionar el mismo archivo
        input.value = '';
        this.spinner.hide();
      }
    }
  }

  private compressImage(file: File, quality: number, maxWidth: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionar si es muy grande
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Error al comprimir imagen'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    // Solo permitir números
    input.value = input.value.replace(/[^0-9]/g, '');
    this.bookingPhone = input.value;
    
    // Auto-limitado a 10 dígitos (opcional si maxlength está en html)
    if (this.bookingPhone.length > 10) {
      this.bookingPhone = this.bookingPhone.substring(0, 10);
    }
  }

  isPhoneValid(): boolean {
    return /^[0-9]{10}$/.test(this.bookingPhone);
  }

  isNameValid(): boolean {
    return this.bookingName.trim().length >= 3;
  }

  confirmBooking(file: File): void {
    this.isSubmitting.set(true);
    this.spinner.show();
    
    const slot = this.state().selectedSlot;
    const date = this.state().selectedDate;
    
    if (!slot || !date) return;

    // Construir DTO para el backend asegurando que no haya desfase de zona horaria (UTC)
    const timeParts = slot.horaInicio.split(':');
    const pad = (n: number) => n < 10 ? '0' + n : n;
    
    // Obtener desplazamiento local (ej. -06:00 para México)
    const offset = -date.getTimezoneOffset();
    const absOffset = Math.abs(offset);
    const offsetStr = (offset >= 0 ? '+' : '-') + pad(Math.floor(absOffset / 60)) + ':' + pad(absOffset % 60);
    
    // Formato completo esperado por OffsetDateTime: YYYY-MM-DDTHH:mm:ss-06:00
    const fechaLocalConOffset = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(parseInt(timeParts[0]))}:${pad(parseInt(timeParts[1]))}:00${offsetStr}`;

    const totalPriceStr = this.state().price || '0';
    const numericTotal = parseFloat(totalPriceStr.replace(/[^0-9.]/g, '')) || 0;
    const numericDeposit = this.fb.calculateDeposit(totalPriceStr);
    
    console.log('Booking Debug:', { totalPriceStr, numericTotal, numericDeposit });

    const citaDto = {
      sucursalId: this.sucursalId,
      servicioId: this.state().serviceId,
      fechaHora: fechaLocalConOffset,
      duracionMinutos: this.state().duracionMinutos,
      pacienteNombre: this.bookingName,
      pacienteTelefono: this.bookingPhone,
      motivoConsulta: this.bookingNotes || this.state().serviceName,
      notasRecepcion: `Servicio solicitado: ${this.state().serviceName}`,
      montoTotal: numericTotal,
      montoPagado: numericDeposit
    };
    
    console.log('--- ENVIANDO CITA AL BACKEND ---');
    console.log('CitaDTO:', citaDto);
    console.log('--------------------------------');

    this.fb.confirmBooking(citaDto, file).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.spinner.hide();
        if (res.ok) {
          this.fb.setReceiptUploaded(true);
          this.fb.setStep(4);
          this.scrollToTop();
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        this.spinner.hide();
        alert('Hubo un error al procesar tu cita. Por favor intenta de nuevo.');
      }
    });
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
    this.scrollToTop();
  }

  getDepositAmount(): number {
    return this.fb.calculateDeposit(this.state().price);
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

  triggerFileInput(input: HTMLInputElement): void {
    if (!this.isSubmitting()) {
      input.click();
    }
  }
}
