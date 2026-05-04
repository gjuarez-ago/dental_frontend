import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditService, BitacoraEntry } from '../../../core/services/audit.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-audit-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-drawer.html',
  styleUrl: './audit-drawer.scss'
})
export class AuditDrawerComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  private auditService = inject(AuditService);
  
  logs = signal<BitacoraEntry[]>([]);
  isLoading = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.loadLogs();
      document.body.classList.add('no-scroll');
    } else if (changes['isOpen'] && !this.isOpen) {
      document.body.classList.remove('no-scroll');
    }
  }

  loadLogs() {
    this.isLoading.set(true);
    // Pedimos los primeros 50 registros (página 0, tamaño 50)
    this.auditService.getLogs(0, 50)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res) {
            this.logs.set(res.content);
          }
        },
        error: (err) => console.error('Error al cargar bitácora:', err)
      });
  }

  closeDrawer() {
    this.close.emit();
  }

  getModuleIcon(modulo: string): string {
    switch (modulo.toUpperCase()) {
      case 'CITAS': return 'ph-calendar';
      case 'PAGOS': return 'ph-currency-dollar';
      case 'PACIENTES': return 'ph-user';
      case 'USUARIOS': return 'ph-users-three';
      case 'CLINICO': return 'ph-stethoscope';
      default: return 'ph-activity';
    }
  }

  getModuleClass(modulo: string): string {
    return modulo.toLowerCase();
  }
}
