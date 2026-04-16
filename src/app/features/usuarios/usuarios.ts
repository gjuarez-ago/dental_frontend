import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { UsuarioResponse } from '../../core/models/user.model';
import { UserRole } from '../../core/models/user-role.enum';
import { UsuarioDrawerComponent } from './components/usuario-drawer/usuario-drawer';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, UsuarioDrawerComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuariosComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  
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
    this.userService.listarPorSucursal(currentUser.sucursalIdPrincipal).subscribe({
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
    if (!this.canManage() || !confirm(`¿Estás seguro de eliminar a ${user.nombreCompleto}?`)) return;
    
    this.userService.eliminar(user.id).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err) => console.error('Error al eliminar usuario:', err)
    });
  }
}
