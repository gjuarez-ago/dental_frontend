import { Component, ChangeDetectionStrategy, HostListener, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { CatalogService, Estado } from '../../core/services/catalog.service';
import { SearchService } from '../../core/services/search.service';
import { GiroOption } from '../../core/models/search.model';
import { AuthService } from '../../core/services/auth.service';
import { AuthDrawerComponent, AuthRole } from '../../core/components/auth-drawer/auth-drawer';

interface Specialty {
  slug: string;
  name: string;
  emoji: string;
  count: number;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AuthDrawerComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent implements OnInit {
  private readonly router     = inject(Router);
  private readonly catalogSvc = inject(CatalogService);
  private readonly searchSvc  = inject(SearchService);
  readonly authService        = inject(AuthService);

  // ─── Auth state ───────────────────────────────────────────────────────
  readonly authDrawerOpen = signal(false);

  readonly isLoggedIn  = computed(() => this.authService.isLoggedIn());
  readonly isPatient   = computed(() => this.authService.isPatient());

  readonly userInitials = computed(() => {
    const name = this.authService.currentUser()?.nombreCompleto ?? '';
    return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U';
  });

  // ─── Catalogs ─────────────────────────────────────────────────────────
  readonly estados     = signal<Estado[]>([]);
  readonly giroOptions = signal<GiroOption[]>([]);

  // ─── Search state ──────────────────────────────────────────────────────
  readonly selectedEstadoId  = signal('');
  readonly giroInputText     = signal('');
  readonly selectedGiroValor = signal('');
  readonly giroDropdownOpen  = signal(false);
  readonly searchSpec        = signal('');
  readonly proMenuOpen       = signal(false);

  // ─── Computed dropdown ────────────────────────────────────────────────
  readonly filteredGiros = signal<GiroOption[]>([]);

  readonly popularSpecs: Specialty[] = [
    { slug: 'ginecologia',  name: 'Ginecología',  emoji: '👩‍⚕️', count: 42 },
    { slug: 'dermatologia', name: 'Dermatología', emoji: '🧴', count: 33 },
    { slug: 'psicologia',   name: 'Psicología',   emoji: '🧠', count: 38 },
    { slug: 'cardiologia',  name: 'Cardiología',  emoji: '❤️', count: 24 },
    { slug: 'pediatria',    name: 'Pediatría',    emoji: '👶', count: 41 },
  ];

  readonly specialties: Specialty[] = [
    { slug: 'medicina-general', name: 'Medicina General', emoji: '🩺', count: 56 },
    { slug: 'ginecologia',      name: 'Ginecología',       emoji: '👩‍⚕️', count: 42 },
    { slug: 'odontologia',      name: 'Odontología',       emoji: '🦷', count: 47 },
    { slug: 'pediatria',        name: 'Pediatría',         emoji: '👶', count: 41 },
    { slug: 'psicologia',       name: 'Psicología',        emoji: '🧠', count: 38 },
    { slug: 'dermatologia',     name: 'Dermatología',      emoji: '🧴', count: 33 },
    { slug: 'ortopedia',        name: 'Ortopedia',         emoji: '🦴', count: 31 },
    { slug: 'nutricion',        name: 'Nutrición',         emoji: '🥗', count: 28 },
  ];

  ngOnInit(): void {
    this.catalogSvc.getStates().subscribe(e => this.estados.set(e));
    this.searchSvc.getGiros().subscribe(g => {
      this.giroOptions.set(g);
      this.filteredGiros.set(g);
    });
  }

  // ─── Giro autocomplete ────────────────────────────────────────────────
  onGiroInput(value: string): void {
    this.giroInputText.set(value);
    this.selectedGiroValor.set('');
    const q = value.toLowerCase();
    this.filteredGiros.set(
      q ? this.giroOptions().filter(g => g.nombre.toLowerCase().includes(q)) : this.giroOptions()
    );
    this.giroDropdownOpen.set(true);
  }

  selectGiro(opt: GiroOption): void {
    this.giroInputText.set(opt.nombre);
    this.selectedGiroValor.set(opt.valor);
    this.giroDropdownOpen.set(false);
  }

  clearGiro(): void {
    this.giroInputText.set('');
    this.selectedGiroValor.set('');
    this.filteredGiros.set(this.giroOptions());
    this.giroDropdownOpen.set(false);
  }

  blurGiro(): void {
    setTimeout(() => this.giroDropdownOpen.set(false), 150);
  }

  // ─── Navigation ───────────────────────────────────────────────────────
  handleSearch(): void {
    const estadoId = this.selectedEstadoId();
    if (!estadoId) return;
    const params: Record<string, string> = { estadoId };
    if (this.selectedGiroValor()) {
      params['giro']      = this.selectedGiroValor();
      params['giroNombre'] = this.giroInputText();
    }
    const q = this.searchSpec().trim();
    if (q) params['q'] = q;
    this.router.navigate(['/booking'], { queryParams: params });
  }

  goToSpecialty(slug: string): void {
    const estadoId = this.selectedEstadoId();
    const params: Record<string, string> = { giro: slug };
    if (estadoId) params['estadoId'] = estadoId;
    this.router.navigate(['/booking'], { queryParams: params });
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  toggleProMenu(event: Event): void {
    event.stopPropagation();
    this.proMenuOpen.update(v => !v);
  }

  openAuthDrawer(): void  { this.authDrawerOpen.set(true); }
  closeAuthDrawer(): void { this.authDrawerOpen.set(false); }

  onAuthenticated(_role: AuthRole): void {
    this.router.navigate([this.authService.getHomeRoute()]);
  }

  goToPortal(): void {
    this.router.navigate([this.authService.getHomeRoute()]);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.proMenuOpen()) this.proMenuOpen.set(false);
  }
}
