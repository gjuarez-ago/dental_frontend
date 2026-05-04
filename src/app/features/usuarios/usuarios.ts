import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgxSpinnerModule, NgxSpinnerService } from 'ngx-spinner';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioResponse } from '../../core/models/user.model';
import { UserRole } from '../../core/models/user-role.enum';
import { UsuarioDrawerComponent } from './components/usuario-drawer/usuario-drawer';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, UsuarioDrawerComponent, NgxSpinnerModule, ConfirmModalComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuariosComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly spinner = inject(NgxSpinnerService);
  private readonly toastr = inject(ToastrService);
  
  searchTerm = signal('');
  isDrawerOpen = signal(false);
  isLoading = signal(false);
  
  selectedUser = signal<UsuarioResponse | null>(null);

  private readonly ALL_USERS = signal<UsuarioResponse[]>([]);

  // Paginación
  config = {
    id: 'users-pagination',
    itemsPerPage: 10,
    currentPage: 1
  };

  // Permisos: Solo Owner o SuperAdmin pueden crear/editar
  canManage = computed(() => {
    const user = this.authService.currentUser();
    return user?.rol === UserRole.OWNER || user?.rol === UserRole.SUPER_ADMIN;
  });

  // Suscripción y Límites
  plan = computed(() => this.authService.currentUser()?.planSuscripcion || 'SOLO');
  
  clinicalStaffCount = computed(() => {
    return this.ALL_USERS().filter(u => u.esPersonalClinico).length;
  });

  clinicalLimitReached = computed(() => {
    const p = this.plan();
    const count = this.clinicalStaffCount();
    if (p === 'SOLO') return count >= 1;
    if (p === 'CONSULTORIO') return count >= 5;
    return false; // RED es ilimitado
  });

  // Modales de Confirmación
  showStatusModal = signal(false);
  showDeleteModal = signal(false);
  userToToggle = signal<UsuarioResponse | null>(null);
  userToDelete = signal<UsuarioResponse | null>(null);
  statusModalConfig = {
    title: '',
    message: '',
    confirmText: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'danger',
    icon: ''
  };

  constructor() {
    // Reiniciar a la primera página cuando el término de búsqueda cambie
    effect(() => {
      if (this.searchTerm()) {
        this.config.currentPage = 1;
      }
    });
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    const currentUser = this.authService.currentUser();
    if (!currentUser?.sucursalIdPrincipal) return;

    this.isLoading.set(true);
    this.spinner.show();
    this.userService.listarPorSucursal(currentUser.sucursalIdPrincipal)
      .pipe(finalize(() => this.spinner.hide()))
      .subscribe({
        next: (users) => {
          this.ALL_USERS.set(users);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
          this.isLoading.set(false);
        }
      });
  }

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.ALL_USERS();

    if (!term) return all;

    return all.filter(u =>
      u.nombreCompleto.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.telefonoContacto.toLowerCase().includes(term) ||
      u.rol.toLowerCase().includes(term)
    );
  });

  onPageChange(page: number) {
    this.config.currentPage = page;
  }

  openNewUserDrawer() {
    this.selectedUser.set(null);
    this.isDrawerOpen.set(true);
  }

  openEditDrawer(user: UsuarioResponse) {
    if (!this.canManage()) return;
    this.selectedUser.set(user);
    this.isDrawerOpen.set(true);
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.selectedUser.set(null);
  }

  onUserSaved() {
    this.loadUsers();
    this.closeDrawer();
  }

  eliminarUser(user: UsuarioResponse) {
    if (!this.canManage()) return;
    if (user.rol === UserRole.OWNER) {
      this.toastr.warning('No es posible deshabilitar al propietario principal.');
      return;
    }

    this.userToDelete.set(user);
    this.statusModalConfig = {
      title: 'Deshabilitar Usuario',
      message: `¿Estás seguro de deshabilitar a ${user.nombreCompleto}? Esta acción es definitiva y quedará registrada en la bitácora de auditoría para fines legales.`,
      confirmText: 'Deshabilitar permanentemente',
      type: 'danger',
      icon: 'ph ph-trash'
    };
    this.showDeleteModal.set(true);
  }

  confirmDeleteChange() {
    const user = this.userToDelete();
    if (!user) return;

    this.spinner.show();
    this.userService.eliminar(user.id)
      .pipe(finalize(() => {
        this.spinner.hide();
        this.showDeleteModal.set(false);
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Usuario deshabilitado correctamente', 'Auditoría Actualizada');
          this.loadUsers();
        },
        error: (err) => {
          this.toastr.error('No se pudo deshabilitar al usuario.', 'Error');
        }
      });
  }

  toggleUserStatus(user: UsuarioResponse) {
    if (!this.canManage()) return;
    if (user.rol === UserRole.OWNER) {
      this.toastr.info('El perfil del propietario principal se mantiene siempre activo para garantizar la continuidad del servicio.');
      return;
    }

    const nuevoEstado = !user.activo;
    this.userToToggle.set(user);
    
    this.statusModalConfig = {
      title: nuevoEstado ? 'Reactivar Usuario' : 'Desactivar Usuario',
      message: nuevoEstado 
        ? `¿Reactivar el acceso de ${user.nombreCompleto}? Podrá volver a entrar al sistema y agendar citas de inmediato.` 
        : `PERSONAL NO DISPONIBLE: Al desactivar a ${user.nombreCompleto}, su perfil dejará de recibir nuevos pacientes y no aparecerá en la lista de atención. Además, perderá su acceso al sistema inmediatamente.`,
      confirmText: nuevoEstado ? 'Reactivar Ahora' : 'Desactivar Ahora',
      type: nuevoEstado ? 'success' : 'danger',
      icon: nuevoEstado ? 'ph ph-user-plus' : 'ph ph-user-minus'
    };

    this.showStatusModal.set(true);
  }

  confirmStatusChange() {
    const user = this.userToToggle();
    if (!user) return;

    const nuevoEstado = !user.activo;
    this.spinner.show();

    this.userService.cambiarEstado(user.id, nuevoEstado)
      .pipe(finalize(() => {
        this.spinner.hide();
        this.showStatusModal.set(false);
      }))
      .subscribe({
        next: () => {
          this.toastr.success('Estado actualizado correctamente');
          this.loadUsers();
        },
        error: (err) => {
          const msg = err.error?.userMessage || 'No se pudo cambiar el estado.';
          this.toastr.error(msg, 'Error');
        }
      });
  }
}
