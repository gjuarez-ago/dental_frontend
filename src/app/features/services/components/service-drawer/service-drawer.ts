import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServicioDental } from '../../../../core/models/service-dental.model';
import { ServiceDentalService } from '../../../../core/services/service-dental.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-service-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './service-drawer.html',
  styleUrl: './service-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ServiceDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() serviceData?: ServicioDental;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<ServicioDental>();

  private readonly fb = inject(FormBuilder);
  private readonly serviceDentalService = inject(ServiceDentalService);
  
  readonly serviceForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required]],
    precioBase: [0, [Validators.required, Validators.min(0)]],
    duracionMinutos: [30, [Validators.required, Validators.min(5)]],
    colorEtiqueta: ['#1A2B4C', [Validators.required]],
    imagenUrl: [null],
    requiereValoracion: [false]
  });

  readonly imagePreview = signal<string | null>(null);
  readonly isUploading = signal<boolean>(false);
  private selectedFile: File | null = null;

  get isValoracion(): boolean {
    return this.serviceForm.get('requiereValoracion')?.value || false;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['serviceData'] && this.serviceData) {
      this.serviceForm.patchValue({
        nombre: this.serviceData.nombre,
        descripcion: this.serviceData.descripcion,
        precioBase: this.serviceData.precioBase,
        duracionMinutos: this.serviceData.duracionMinutos,
        colorEtiqueta: this.serviceData.colorEtiqueta,
        imagenUrl: this.serviceData.imagenUrl,
        requiereValoracion: this.serviceData.requiereValoracion || false
      });
      this.imagePreview.set(this.serviceData.imagenUrl || null);
    } 
    
    if (changes['isOpen'] && !this.isOpen) {
      this.resetForm();
    }
  }

  resetForm() {
    this.serviceForm.reset({ 
      precioBase: 0, 
      duracionMinutos: 30, 
      colorEtiqueta: '#1A2B4C', 
      requiereValoracion: false 
    });
    this.imagePreview.set(null);
    this.selectedFile = null;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFile = file;
      // Solo previsualización local, no subimos a Cloudflare todavía
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  private async handleImageUpload(): Promise<string | null> {
    if (!this.selectedFile) return this.serviceForm.get('imagenUrl')?.value;

    return new Promise((resolve, reject) => {
      this.isUploading.set(true);
      this.serviceDentalService.uploadImage(this.selectedFile!)
        .pipe(finalize(() => this.isUploading.set(false)))
        .subscribe({
          next: (url) => resolve(url),
          error: (err) => {
            console.error('Error al subir a Cloudflare:', err);
            reject(err);
          }
        });
    });
  }

  async onSubmit() {
    if (this.serviceForm.valid) {
      try {
        const finalImageUrl = await this.handleImageUpload();
        
        const formValue = this.serviceForm.value;
        const result: ServicioDental = {
          id: this.serviceData?.id,
          nombre: formValue.nombre,
          descripcion: formValue.descripcion,
          precioBase: formValue.precioBase,
          duracionMinutos: formValue.duracionMinutos,
          colorEtiqueta: formValue.colorEtiqueta,
          imagenUrl: finalImageUrl || undefined,
          requiereValoracion: formValue.requiereValoracion
        };
        this.saved.emit(result);
      } catch (error) {
        // El error ya fue logueado en handleImageUpload
      }
    } else {
      Object.keys(this.serviceForm.controls).forEach(key => {
        const control = this.serviceForm.get(key);
        control?.markAsTouched();
      });
    }
  }

  closeDrawer() {
    this.close.emit();
  }

  isInvalid(controlName: string): boolean {
    const control = this.serviceForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
