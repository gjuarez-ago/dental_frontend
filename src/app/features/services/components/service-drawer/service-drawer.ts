import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServicioDental } from '../../../../core/models/service-dental.model';
import { ServiceDentalService } from '../../../../core/services/service-dental.service';
import { HEALTH_CATALOGS } from '../../../../core/constants/catalogs.constants';
import { finalize } from 'rxjs';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-service-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmModalComponent],
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
  
  // Modal State
  readonly showModal = signal(false);
  readonly modalConfig = signal({
    title: 'Aviso',
    message: '',
    type: 'info' as 'info' | 'danger' | 'warning' | 'success',
    icon: 'ph ph-info'
  });

  showAlert(message: string, type: 'info' | 'danger' | 'warning' | 'success' = 'info', title = 'Aviso') {
    this.modalConfig.set({
      title,
      message,
      type,
      icon: type === 'danger' ? 'ph ph-warning-circle' : (type === 'warning' ? 'ph ph-warning' : 'ph ph-info')
    });
    this.showModal.set(true);
  }
  
  readonly catalogs = HEALTH_CATALOGS;

  get todasEspecialidades(): string[] {
    return [
      ...this.catalogs.specialtiesByGiro['DENTAL'],
      ...this.catalogs.specialtiesByGiro['PSICOLOGIA'],
      ...this.catalogs.specialtiesByGiro['GENERAL']
    ].sort();
  }
  
  readonly serviceForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['', [Validators.required]],
    precioBase: [0, [Validators.required, Validators.min(0)]],
    duracionMinutos: [30, [Validators.required, Validators.min(5)]],
    colorEtiqueta: ['#1A2B4C', [Validators.required]],
    imagenUrl: [null],
    requiereValoracion: [false],
    procedimientoQuirurgico: [false],
    giro: ['DENTAL'],
    especialidadRequerida: ['']
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
        requiereValoracion: this.serviceData.requiereValoracion || false,
        procedimientoQuirurgico: this.serviceData.procedimientoQuirurgico || false,
        giro: this.serviceData.giro || 'DENTAL',
        especialidadRequerida: this.serviceData.especialidadRequerida || ''
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
      requiereValoracion: false,
      procedimientoQuirurgico: false,
      giro: 'DENTAL',
      especialidadRequerida: ''
    });
    this.imagePreview.set(null);
    this.selectedFile = null;
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.showAlert('Por favor selecciona solo archivos de imagen (JPG, PNG).', 'warning', 'Archivo no permitido');
        input.value = '';
        return;
      }

      try {
        this.isUploading.set(true);
        const compressedFile = await this.compressImage(file, 0.7, 1000);
        this.selectedFile = compressedFile.size > 500 * 1024 ? await this.compressImage(compressedFile, 0.5, 800) : compressedFile;

        const reader = new FileReader();
        reader.onload = () => this.imagePreview.set(reader.result as string);
        reader.readAsDataURL(this.selectedFile);
      } catch (error) {
        console.error('Error al procesar la imagen:', error);
      } finally {
        input.value = '';
        this.isUploading.set(false);
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
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  }

  private async handleImageUpload(): Promise<string | null> {
    if (!this.selectedFile) return this.serviceForm.get('imagenUrl')?.value;

    return new Promise((resolve, reject) => {
      this.isUploading.set(true);
      this.serviceDentalService.uploadImage(this.selectedFile!)
        .pipe(finalize(() => this.isUploading.set(false)))
        .subscribe({
          next: (url) => resolve(url),
          error: (err) => reject(err)
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
          requiereValoracion: formValue.requiereValoracion,
          procedimientoQuirurgico: formValue.procedimientoQuirurgico,
          giro: formValue.giro,
          especialidadRequerida: formValue.especialidadRequerida
        };
        this.saved.emit(result);
      } catch (error) {
        console.error('Error al guardar servicio:', error);
      }
    } else {
      Object.keys(this.serviceForm.controls).forEach(key => this.serviceForm.get(key)?.markAsTouched());
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
