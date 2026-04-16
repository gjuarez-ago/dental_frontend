import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuarioResponse, UsuarioRequest } from '../../../../core/models/user.model';
import { UserRole } from '../../../../core/models/user-role.enum';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-usuario-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './usuario-drawer.html',
  styleUrl: './usuario-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioDrawerComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  @Input() isOpen = false;
  @Input() user: UsuarioResponse | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  userForm: FormGroup;
  isSaving = false;
  UserRole = UserRole;

  constructor() {
    this.userForm = this.fb.group({
      nombreCompleto: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.email]],
      telefonoContacto: ['', [Validators.required, Validators.pattern(/^\d+$/), Validators.minLength(10)]],
      rol: [UserRole.RECEPTIONIST, [Validators.required]],
      cedulaProfesional: [''],
      nip: ['', [Validators.pattern(/^\d{6}$/)]], // Opcional en edición, pero debe ser 6 dígitos si se pone
      fotografiaUrl: ['']
    });

    // Validar NIP obligatorio solo al crear
    this.userForm.get('rol')?.valueChanges.subscribe(rol => {
      const cedula = this.userForm.get('cedulaProfesional');
      if (rol === UserRole.DOCTOR) {
        cedula?.setValidators([Validators.required]);
      } else {
        cedula?.clearValidators();
      }
      cedula?.updateValueAndValidity();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue && this.user) {
      this.userForm.patchValue({
        nombreCompleto: this.user.nombreCompleto,
        email: this.user.email,
        telefonoContacto: this.user.telefonoContacto,
        rol: this.user.rol,
        cedulaProfesional: this.user.cedulaProfesional,
        fotografiaUrl: this.user.fotografiaUrl,
        nip: '' // No cargar el NIP anterior
      });
      // En edición el NIP es opcional
      this.userForm.get('nip')?.clearValidators();
      this.userForm.get('nip')?.setValidators([Validators.pattern(/^\d{6}$/)]);
    } else if (changes['isOpen']?.currentValue && !this.user) {
      this.userForm.reset({
        rol: UserRole.RECEPTIONIST,
        nip: ''
      });
      // Al crear, el NIP es obligatorio y debe ser 6 dígitos
      this.userForm.get('nip')?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
    }
    this.userForm.get('nip')?.updateValueAndValidity();
  }

  save() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const currentAuthUser = this.authService.currentUser();
    if (!currentAuthUser?.sucursalIdPrincipal) return;

    this.isSaving = true;
    const formData = this.userForm.value;
    const request: UsuarioRequest = {
      ...formData,
      sucursalId: currentAuthUser.sucursalIdPrincipal
    };

    if (this.user) {
      this.userService.actualizar(this.user.id, request)
        .pipe(finalize(() => this.isSaving = false))
        .subscribe({
          next: () => this.saved.emit(),
          error: (err) => alert('Error al actualizar: ' + err.error?.userMessage || 'Error desconocido')
        });
    } else {
      this.userService.crear(request)
        .pipe(finalize(() => this.isSaving = false))
        .subscribe({
          next: () => this.saved.emit(),
          error: (err) => alert('Error al crear: ' + (err.error?.userMessage || 'Error desconocido'))
        });
    }
  }

  onClose() {
    this.close.emit();
  }
}
