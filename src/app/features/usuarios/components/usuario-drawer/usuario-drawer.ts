import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuarioResponse, UsuarioRequest } from '../../../../core/models/user.model';
import { UserRole } from '../../../../core/models/user-role.enum';
import { HEALTH_CATALOGS, HealthGiro } from '../../../../core/constants/catalogs.constants';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-usuario-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ConfirmModalComponent],
  templateUrl: './usuario-drawer.html',
  styleUrl: './usuario-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly toastr = inject(ToastrService);

  @Input() isOpen = false;
  @Input() user: UsuarioResponse | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  userForm: FormGroup;
  isSaving = false;
  UserRole = UserRole;
  
  // Catálogos inteligentes
  readonly catalogs = HEALTH_CATALOGS;

  // Modal de Confirmación
  showStatusModal = false;
  statusModalConfig = {
    title: '',
    message: '',
    confirmText: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'danger',
    icon: ''
  };

  // Signal para rastrear las especialidades seleccionadas y que el filtro sea reactivo
  private readonly selectedSpecsSignal = signal<string[]>([]);

  // Especialidades filtradas por el giro y eliminando las ya seleccionadas
  readonly availableSpecialties = computed(() => {
    const userGiro = (this.authService.currentUser()?.giro || 'DENTAL') as HealthGiro;
    const allForGiro = this.catalogs.specialtiesByGiro[userGiro] || [];
    const selected = this.selectedSpecsSignal();
    
    return allForGiro.filter(esp => !selected.includes(esp));
  });

  addSpecialty(event: any) {
    const specialty = event.target.value;
    if (!specialty) return;

    const current = this.userForm.get('especialidades')?.value as string[] || [];
    if (!current.includes(specialty)) {
      const updated = [...current, specialty];
      this.userForm.patchValue({ especialidades: updated });
      this.selectedSpecsSignal.set(updated);
    }
    event.target.value = ''; // Reset input
  }

  removeSpecialty(specialty: string) {
    const current = this.userForm.get('especialidades')?.value as string[] || [];
    const updated = current.filter(s => s !== specialty);
    this.userForm.patchValue({ especialidades: updated });
    this.selectedSpecsSignal.set(updated);
  }

  constructor() {
    this.userForm = this.fb.group({
      nombreCompleto: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      telefonoContacto: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(10), Validators.maxLength(15)]],
      rol: [UserRole.RECEPTIONIST, [Validators.required]],
      cedulaProfesional: ['', [Validators.maxLength(50)]],
      genero: ['', [Validators.required]],
      especialidades: [[]],
      esPersonalClinico: [false]
    });

    this.userForm.get('rol')?.valueChanges.subscribe(rol => {
      const cedula = this.userForm.get('cedulaProfesional');
      const verification = this.userForm.get('esPersonalClinico');
      const especialidades = this.userForm.get('especialidades');

      if (rol === UserRole.DOCTOR) {
        cedula?.setValidators([Validators.required]);
        verification?.setValidators([Validators.requiredTrue]);
        especialidades?.setValidators([Validators.required, (control) => control.value?.length > 0 ? null : { required: true }]);
      } else {
        cedula?.clearValidators();
        verification?.clearValidators();
        especialidades?.clearValidators();
      }
      cedula?.updateValueAndValidity();
      verification?.updateValueAndValidity();
      especialidades?.updateValueAndValidity();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue && this.user) {
      this.userForm.patchValue({
        nombreCompleto: this.user.nombreCompleto,
        email: this.user.email,
        telefonoContacto: this.user.telefonoContacto,
        rol: this.user.rol,
        genero: this.user.genero || '',
        cedulaProfesional: this.user.cedulaProfesional,
        especialidades: this.user.especialidades || [],
        esPersonalClinico: this.user.esPersonalClinico || false
      });
      this.selectedSpecsSignal.set(this.user.especialidades || []);
      
      // El rol del OWNER es inmutable para evitar bloqueos
      if (this.user.rol === UserRole.OWNER) {
        this.userForm.get('rol')?.disable();
      } else {
        this.userForm.get('rol')?.enable();
      }

      // La verificación clínica es obligatoria para doctores y no es editable tras el registro
      if (this.user.rol === UserRole.DOCTOR) {
        this.userForm.patchValue({ esPersonalClinico: true });
        this.userForm.get('esPersonalClinico')?.disable();
      } else {
        this.userForm.get('esPersonalClinico')?.enable();
      }
    } else if (changes['isOpen']?.currentValue && !this.user) {
      this.userForm.reset({
        rol: UserRole.RECEPTIONIST,
        genero: '',
        esPersonalClinico: false
      });
      this.selectedSpecsSignal.set([]);
      this.userForm.get('esPersonalClinico')?.enable();
    }
  }

  save() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.toastr.warning('Por favor revisa los campos obligatorios', 'Formulario Incompleto');
      return;
    }

    const currentAuthUser = this.authService.currentUser();
    if (!currentAuthUser?.sucursalIdPrincipal) return;

    this.isSaving = true;
    const formData = this.userForm.getRawValue();
    const request: UsuarioRequest = {
      ...formData,
      sucursalId: currentAuthUser.sucursalIdPrincipal
    };

    if (this.user) {
      this.userService.actualizar(this.user.id, request)
        .pipe(finalize(() => this.isSaving = false))
        .subscribe({
          next: () => {
            this.toastr.success('Usuario actualizado correctamente', 'Éxito');
            this.saved.emit();
          },
          error: (err) => {
            const msg = err.error?.userMessage || 'No se pudo actualizar el usuario.';
            this.toastr.error(msg, 'Error al Actualizar');
          }
        });
    } else {
      this.userService.crear(request)
        .pipe(finalize(() => this.isSaving = false))
        .subscribe({
          next: () => {
            this.toastr.success('Usuario creado correctamente. Se ha enviado un email con el NIP temporal.', 'Éxito');
            this.saved.emit();
          },
          error: (err) => {
            const msg = err.error?.userMessage || 'No se pudo crear el usuario.';
            this.toastr.error(msg, 'Error');
          }
        });
    }
  }

  toggleStatus() {
    if (!this.user) return;
    const nuevoEstado = !this.user.activo;
    this.statusModalConfig = {
      title: nuevoEstado ? 'Reactivar Usuario' : 'Desactivar Usuario',
      message: nuevoEstado 
        ? '¿Reactivar el acceso de este colaborador?' 
        : 'Este usuario ya no podrá recibir citas ni entrar al sistema.',
      confirmText: nuevoEstado ? 'Reactivar Ahora' : 'Desactivar Ahora',
      type: nuevoEstado ? 'success' : 'danger',
      icon: nuevoEstado ? 'ph ph-user-plus' : 'ph ph-user-minus'
    };
    this.showStatusModal = true;
  }

  confirmStatusChange() {
    if (!this.user) return;
    const nuevoEstado = !this.user.activo;
    this.isSaving = true;
    this.userService.cambiarEstado(this.user.id, nuevoEstado)
      .pipe(finalize(() => {
        this.isSaving = false;
        this.showStatusModal = false;
      }))
      .subscribe({
        next: (res) => {
          this.toastr.success('Estado actualizado', 'Éxito');
          this.user = res;
          this.saved.emit();
        },
        error: (err) => this.toastr.error('Error al cambiar estado', 'Error')
      });
  }

  onClose() {
    this.close.emit();
  }
}
