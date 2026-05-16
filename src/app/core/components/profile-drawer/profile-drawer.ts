import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LayoutService } from '../../services/layout.service';
import { AuthService, User } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-profile-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile-drawer.html',
  styleUrl: './profile-drawer.scss'
})
export class ProfileDrawerComponent {
  private readonly fb = inject(FormBuilder);
  readonly layout = inject(LayoutService);
  private readonly auth = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly toastr = inject(ToastrService);

  readonly isSaving = signal(false);
  readonly isLoading = signal(false);
  readonly imagePreview = signal<string | null>(null);
  private selectedFile: File | null = null;

  profileForm: FormGroup = this.fb.group({
    biografia: ['', [Validators.maxLength(500)]],
    genero: [''],
    fechaNacimiento: ['']
  });

  constructor() {
    effect(() => {
      if (this.layout.isProfileOpen()) {
        this.fetchProfile();
      }
    });

    effect(() => {
      const user = this.auth.currentUser() as User;
      if (user && this.layout.isProfileOpen()) {
        this.profileForm.patchValue({
          biografia: user.biografia || '',
          genero: user.genero || '',
          fechaNacimiento: user.fechaNacimiento || ''
        });
        this.imagePreview.set(user.fotografiaUrl || null);
      }
    }, { allowSignalWrites: true });
  }

  fetchProfile() {
    this.isLoading.set(true);
    this.profileService.getProfile().pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (user) => {
        this.auth.updateUserState(user);
      },
      error: (err) => {
        console.error('Error al cargar perfil:', err);
        this.toastr.error('No se pudo sincronizar la información del perfil');
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.toastr.warning('Por favor selecciona una imagen válida');
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  async onSubmit() {
    if (this.profileForm.invalid) return;

    this.isSaving.set(true);
    const formValue = this.profileForm.value;

    this.profileService.updateProfile({
      biografia: formValue.biografia,
      genero: formValue.genero,
      fechaNacimiento: formValue.fechaNacimiento,
      photo: this.selectedFile || undefined
    }).pipe(
      finalize(() => this.isSaving.set(false))
    ).subscribe({
      next: (newPhotoUrl) => {
        this.toastr.success('Perfil actualizado correctamente');
        // Actualizar el estado global del usuario
        this.auth.updateUserState({
          biografia: formValue.biografia,
          genero: formValue.genero,
          fechaNacimiento: formValue.fechaNacimiento,
          fotografiaUrl: newPhotoUrl || (this.auth.currentUser() as User)?.fotografiaUrl
        } as Partial<User>);
        this.layout.closeProfileDrawer();
      },
      error: (err) => {
        this.toastr.error('Error al actualizar el perfil');
        console.error(err);
      }
    });
  }

  closeDrawer() {
    this.layout.closeProfileDrawer();
  }

  get userInitials(): string {
    const name = this.auth.currentUser()?.nombreCompleto || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }
}
