import { Component, ChangeDetectionStrategy, inject, OnInit, Input, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { LayoutService } from '../../services/layout.service';
import { ConfigService, DaySchedule } from '../../services/config.service';

@Component({
  selector: 'app-config-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './config-drawer.html',
  styleUrl: './config-drawer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfigDrawerComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  protected readonly layout = inject(LayoutService);
  private readonly configService = inject(ConfigService);
  private readonly fb = inject(FormBuilder);

  configForm: FormGroup;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

  constructor() {
    this.configForm = this.fb.group({
      professionalName: ['', [Validators.required]],
      professionalCedula: ['', [Validators.required]],
      cancellationWindow: [24, [Validators.required, Validators.min(1)]],
      weeklySchedule: this.fb.array([])
    });
  }

  ngOnInit() {
    // La carga inicial se maneja en ngOnChanges para asegurar que ocurre al abrir
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen) {
      this.refreshData();
    }
  }

  get scheduleArray() {
    return this.configForm.get('weeklySchedule') as FormArray;
  }

  /**
   * Obtiene los datos frescos del servidor
   */
  refreshData() {
    this.isLoading.set(true);
    this.configService.loadConfig().subscribe({
      next: () => {
        this.populateForm();
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  /**
   * Mapea el estado del signal al formulario reactivo
   */
  populateForm() {
    const cfg = this.configService.config();
    this.configForm.patchValue({
      professionalName: cfg.professionalName,
      professionalCedula: cfg.professionalCedula,
      cancellationWindow: cfg.cancellationWindow
    });

    this.scheduleArray.clear();
    cfg.weeklySchedule.forEach(day => {
      this.scheduleArray.push(this.fb.group({
        day: [day.day],
        enabled: [day.enabled],
        startTime: [day.startTime],
        endTime: [day.endTime]
      }));
    });
  }

  save() {
    if (this.configForm.valid && !this.isSaving()) {
      this.isSaving.set(true);
      this.configService.updateConfig(this.configForm.value).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.layout.closeConfigDrawer();
        },
        error: () => this.isSaving.set(false)
      });
    }
  }

  close() {
    this.layout.closeConfigDrawer();
  }
}
