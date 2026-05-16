import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, catchError, finalize, filter } from 'rxjs/operators';
import { combineLatest, of } from 'rxjs';

import { CatalogService, Estado, Municipio } from '../../core/services/catalog.service';
import { SearchService } from '../../core/services/search.service';
import { AgendaPublicaService } from '../../core/services/agenda-publica.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthDrawerComponent, AuthRole } from '../../core/components/auth-drawer/auth-drawer';
import { EspecialistaCard, GiroOption, Modalidad, SortOption } from '../../core/models/search.model';
import { AgendaPublica, DiaAgenda, SlotPublico, ServicioPublico } from '../../core/models/agenda-publica.model';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AuthDrawerComponent],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingComponent implements OnInit {
  private readonly route     = inject(ActivatedRoute);
  private readonly router    = inject(Router);
  private readonly catalogSvc = inject(CatalogService);
  private readonly searchSvc  = inject(SearchService);
  private readonly agendaSvc  = inject(AgendaPublicaService);
  private readonly authService = inject(AuthService);

  // ─── Auth state ──────────────────────────────────────────────────────────
  readonly authDrawerOpen  = signal(false);
  readonly bookingError    = signal<string | null>(null);
  readonly isLoggedInPatient = computed(() => this.authService.isLoggedIn() && this.authService.isPatient());
  readonly authedUser = computed(() => this.authService.currentUser());

  // ─── Catalogs ────────────────────────────────────────────────────────────
  readonly estados     = signal<Estado[]>([]);
  readonly municipios  = signal<Municipio[]>([]);
  readonly giroOptions = signal<GiroOption[]>([]);

  // ─── Search filters ──────────────────────────────────────────────────────
  readonly selectedEstadoId    = signal('');
  readonly selectedMunicipioId = signal('');
  readonly selectedGiroValor   = signal('');
  readonly giroInputText       = signal('');
  readonly giroDropdownOpen    = signal(false);
  readonly searchQ             = signal('');
  readonly modalityFilter      = signal<'TODAS' | Modalidad>('TODAS');
  readonly sortBy              = signal<SortOption>('CALIFICACION');

  readonly modalityOpts: { value: 'TODAS' | Modalidad; label: string }[] = [
    { value: 'TODAS',      label: 'Todas'      },
    { value: 'PRESENCIAL', label: 'Presencial' },
    { value: 'ONLINE',     label: 'Online'     },
  ];

  // ─── Results ─────────────────────────────────────────────────────────────
  readonly results       = signal<EspecialistaCard[]>([]);
  readonly totalElements = signal(0);
  readonly isSearching   = signal(false);
  readonly hasSearched   = signal(false);

  // ─── Panel ───────────────────────────────────────────────────────────────
  readonly panelEsp     = signal<EspecialistaCard | null>(null);
  readonly panelAgenda  = signal<AgendaPublica | null>(null);
  readonly panelLoading = signal(false);
  readonly panelStep    = signal<'slots' | 'form' | 'success'>('slots');

  // ─── Slot selection ──────────────────────────────────────────────────────
  readonly selServicio = signal<ServicioPublico | null>(null);
  readonly selDia      = signal<DiaAgenda | null>(null);
  readonly selSlot     = signal<SlotPublico | null>(null);
  readonly panelMonth  = signal(new Date());
  readonly isBooking   = signal(false);

  // ─── Form (plain props: ngModel triggers CD in OnPush via event) ─────────
  bookingNotes = '';

  // ─── Computed ─────────────────────────────────────────────────────────────
  readonly headingLabel = computed(() => {
    const giro   = this.giroInputText();
    const estado = this.estados().find(e => e.id === this.selectedEstadoId());
    if (giro && estado) return `${giro} en ${estado.nombre}`;
    if (estado)         return `Especialistas en ${estado.nombre}`;
    return 'Especialistas disponibles';
  });

  readonly filteredGiros = computed(() => {
    const q = this.giroInputText().toLowerCase();
    return q
      ? this.giroOptions().filter(g => g.nombre.toLowerCase().includes(q))
      : this.giroOptions();
  });

  readonly currentMonthLabel = computed(() =>
    this.panelMonth().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  );

  readonly daysGrid = computed((): (DiaAgenda | null)[] => {
    const agenda = this.panelAgenda();
    if (!agenda) return [];
    const m      = this.panelMonth();
    const year   = m.getFullYear();
    const month  = m.getMonth();
    const dow    = new Date(year, month, 1).getDay();
    const offset = dow === 0 ? 6 : dow - 1;   // Monday-indexed
    const days   = new Date(year, month + 1, 0).getDate();
    const grid: (DiaAgenda | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= days; d++) {
      const fecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push(
        agenda.diasDisponibles.find(dia => dia.fecha === fecha)
        ?? { fecha, esDiaLaboral: false, estaLlena: true, slots: [] }
      );
    }
    return grid;
  });

  readonly daySlots = computed(() =>
    (this.selDia()?.slots ?? []).filter(s => s.disponible)
  );

  readonly canProceed = computed(() =>
    !!this.selServicio() && !!this.selDia() && !!this.selSlot()
  );

  constructor() {
    // Municipios reactivos al estado
    toObservable(this.selectedEstadoId).pipe(takeUntilDestroyed()).subscribe(id => {
      this.selectedMunicipioId.set('');
      this.municipios.set([]);
      if (id) {
        this.catalogSvc.getMunicipalitiesByState(id).subscribe(m => this.municipios.set(m));
      }
    });

    // Stream de búsqueda reactivo con debounce
    combineLatest([
      toObservable(this.selectedEstadoId),
      toObservable(this.selectedMunicipioId),
      toObservable(this.selectedGiroValor),
      toObservable(this.modalityFilter),
      toObservable(this.sortBy),
      toObservable(this.searchQ),
    ]).pipe(
      filter(([estadoId]) => !!estadoId),
      debounceTime(300),
      distinctUntilChanged((a, b) => a.join('|') === b.join('|')),
      switchMap(([estadoId, municipioId, giro, modality, sort, q]) => {
        this.isSearching.set(true);
        this.hasSearched.set(true);
        return this.searchSvc.searchEspecialistas({
          estadoId,
          municipioId: municipioId || undefined,
          giro:        giro || undefined,
          q:           q || undefined,
          modalidad:   modality === 'TODAS' ? undefined : modality as Modalidad,
          sort:        sort as SortOption,
          page: 0, size: 20,
        }).pipe(
          catchError(() => of(null)),
          finalize(() => this.isSearching.set(false))
        );
      }),
      takeUntilDestroyed()
    ).subscribe(result => {
      if (result) {
        this.results.set(result.content);
        this.totalElements.set(result.totalElements);
      }
    });
  }

  ngOnInit(): void {
    this.catalogSvc.getStates().subscribe(e => this.estados.set(e));
    this.searchSvc.getGiros().subscribe(g => this.giroOptions.set(g));

    const p = this.route.snapshot.queryParamMap;
    if (p.get('estadoId'))   this.selectedEstadoId.set(p.get('estadoId')!);
    if (p.get('giro'))       this.selectedGiroValor.set(p.get('giro')!);
    if (p.get('giroNombre')) this.giroInputText.set(p.get('giroNombre')!);
    if (p.get('q'))          this.searchQ.set(p.get('q')!);
  }

  // ─── Giro autocomplete ───────────────────────────────────────────────────
  onGiroInput(value: string): void {
    this.giroInputText.set(value);
    this.selectedGiroValor.set('');
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
    this.giroDropdownOpen.set(false);
  }

  blurGiro(): void {
    setTimeout(() => this.giroDropdownOpen.set(false), 150);
  }

  // ─── Panel de agenda ─────────────────────────────────────────────────────
  openPanel(esp: EspecialistaCard): void {
    if (this.panelEsp()?.tenantId === esp.tenantId) { this.closePanel(); return; }
    this.panelEsp.set(esp);
    this.resetPanel();
    const today = new Date().toISOString().split('T')[0];
    this.panelLoading.set(true);
    this.agendaSvc.getAgenda(esp.tenantId, today, 14).pipe(
      catchError(() => of(null)),
      finalize(() => this.panelLoading.set(false))
    ).subscribe(agenda => {
      if (!agenda) return;
      this.panelAgenda.set(agenda);
      if (agenda.servicios.length === 1) this.selServicio.set(agenda.servicios[0]);
    });
  }

  closePanel(): void { this.panelEsp.set(null); this.resetPanel(); }

  private resetPanel(): void {
    this.panelAgenda.set(null);
    this.selServicio.set(null);
    this.selDia.set(null);
    this.selSlot.set(null);
    this.panelStep.set('slots');
    this.panelMonth.set(new Date());
    this.bookingNotes = '';
    this.bookingError.set(null);
  }

  selectDia(dia: DiaAgenda): void { this.selDia.set(dia); this.selSlot.set(null); }

  changeMonth(delta: number): void {
    const m = new Date(this.panelMonth());
    m.setMonth(m.getMonth() + delta);
    this.panelMonth.set(m);
  }

  goToForm(): void {
    if (!this.canProceed()) return;
    this.bookingError.set(null);
    if (!this.isLoggedInPatient()) {
      this.authDrawerOpen.set(true);
      return;
    }
    this.panelStep.set('form');
  }

  goBackToSlots(): void {
    this.bookingError.set(null);
    this.panelStep.set('slots');
  }

  closeAuthDrawer(): void { this.authDrawerOpen.set(false); }

  onAuthenticated(role: AuthRole): void {
    this.authDrawerOpen.set(false);
    if (role === 'PACIENTE' && this.canProceed()) {
      this.panelStep.set('form');
    }
  }

  submitBooking(): void {
    const esp  = this.panelEsp();
    const svc  = this.selServicio();
    const dia  = this.selDia();
    const slot = this.selSlot();
    const user = this.authService.currentUser();
    if (!esp || !svc || !dia || !slot || !user) return;

    this.bookingError.set(null);
    this.isBooking.set(true);
    this.agendaSvc.requestBooking({
      tenantId:         esp.tenantId,
      servicioId:       svc.id,
      fecha:            dia.fecha,
      horaInicio:       slot.horaInicio,
      nombrePaciente:   user.nombreCompleto,
      telefonoPaciente: user.telefono,
      emailPaciente:    user.email ?? undefined,
      notas:            this.bookingNotes.trim() || undefined,
    }).pipe(
      catchError((err) => {
        const msg = err?.error?.userMessage ?? err?.error?.message ?? 'No fue posible procesar tu solicitud.';
        this.bookingError.set(msg);
        return of(null);
      }),
      finalize(() => this.isBooking.set(false))
    ).subscribe(res => { if (res) this.panelStep.set('success'); });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  dayNum(fecha: string): number { return +fecha.split('-')[2]; }

  formatDia(dia: DiaAgenda | null): string {
    if (!dia) return '';
    return new Date(dia.fecha + 'T12:00:00').toLocaleDateString('es-MX', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  formatSlot(iso: string | undefined): string {
    if (!iso) return '';
    const d    = new Date(iso);
    const now  = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((d.getTime() - now.getTime()) / 86_400_000);
    const t    = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    if (diff === 0) return `Hoy, ${t}`;
    if (diff === 1) return `Mañana, ${t}`;
    return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + t;
  }

  isPastDay(fecha: string): boolean {
    const dias = this.panelAgenda()?.diasAnticipacionReserva ?? 1;
    const min = new Date();
    min.setDate(min.getDate() + dias);
    const y = min.getFullYear();
    const m = String(min.getMonth() + 1).padStart(2, '0');
    const d = String(min.getDate()).padStart(2, '0');
    return fecha < `${y}-${m}-${d}`;
  }

  goHome(): void { this.router.navigate(['/']); }
}
