import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CatalogService, Estado } from '../../core/services/catalog.service';
import { SearchService } from '../../core/services/search.service';
import { GiroOption } from '../../core/models/search.model';

// Mapa de iconos phosphor por valor de giro (normalizado a minúsculas sin acentos)
const GIRO_ICONS: Record<string, string> = {
  'odontologia':         'ph-tooth',
  'cardiologia':         'ph-heart',
  'pediatria':           'ph-baby',
  'nutricion':           'ph-apple',
  'nutriologia':         'ph-apple',
  'dermatologia':        'ph-sun',
  'psicologia':          'ph-brain',
  'oftalmologia':        'ph-eye',
  'ortopedia':           'ph-bone',
  'traumatologia':       'ph-bone',
  'ginecologia':         'ph-gender-female',
  'obstetricia':         'ph-gender-female',
  'neurologia':          'ph-activity',
  'medicina-general':    'ph-stethoscope',
  'medicina-interna':    'ph-stethoscope',
  'endocrinologia':      'ph-drop',
  'gastroenterologia':   'ph-stomach',
  'urologia':            'ph-drop-half',
  'oncologia':           'ph-cell-signal-full',
  'reumatologia':        'ph-hand',
  'otorrinolaringologia':'ph-ear',
  'neumologia':          'ph-lungs',
  'cirugia-general':     'ph-first-aid-kit',
  'cirugia-plastica':    'ph-scissors',
  'radiologia':          'ph-scan',
  'anestesiologia':      'ph-syringe',
  'patologia':           'ph-flask',
  'infectologia':        'ph-virus',
};

function normalizeKey(val: string): string {
  return val.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-');
}

@Component({
  selector: 'app-directorio',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './directorio.html',
  styleUrl:    './directorio.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DirectorioComponent implements OnInit {
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);
  private readonly catalogSvc = inject(CatalogService);
  private readonly searchSvc  = inject(SearchService);

  readonly estados          = signal<Estado[]>([]);
  readonly giros            = signal<GiroOption[]>([]);
  readonly selectedEstadoId = signal('');
  readonly searchQ          = signal('');

  readonly selectedEstado = computed(() =>
    this.estados().find(e => e.id === this.selectedEstadoId()) ?? null
  );

  readonly filteredGiros = computed(() => {
    const q = this.searchQ().toLowerCase().trim();
    const list = this.giros();
    return q ? list.filter(g => g.nombre.toLowerCase().includes(q)) : list;
  });

  ngOnInit(): void {
    this.catalogSvc.getStates().subscribe(e => this.estados.set(e));
    this.searchSvc.getGiros().subscribe(g => {
      // Ordenar por total de especialistas desc
      this.giros.set([...g].sort((a, b) => b.totalEspecialistas - a.totalEspecialistas));
    });

    const estadoId = this.route.snapshot.queryParamMap.get('estadoId');
    if (estadoId) this.selectedEstadoId.set(estadoId);
  }

  goToSearch(giro: GiroOption): void {
    const estadoId = this.selectedEstadoId()
      || localStorage.getItem('novatia_last_estado')
      || null;
    const params: Record<string, string> = { giro: giro.valor, giroNombre: giro.nombre };
    if (estadoId) params['estadoId'] = estadoId;
    if (estadoId) localStorage.setItem('novatia_last_estado', estadoId);
    this.router.navigate(['/booking'], { queryParams: params });
  }

  selectEstado(id: string): void {
    this.selectedEstadoId.set(this.selectedEstadoId() === id ? '' : id);
  }

  getIcon(giro: GiroOption): string {
    const key = normalizeKey(giro.valor || giro.nombre);
    return GIRO_ICONS[key] ?? 'ph-stethoscope';
  }

  get pageTitle(): string {
    const estado = this.selectedEstado();
    return estado ? `Especialistas en ${estado.nombre}` : 'Directorio de Especialistas';
  }
}
