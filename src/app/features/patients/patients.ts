import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { PatientDrawerComponent } from './components/patient-drawer/patient-drawer';
import { PatientService } from '../../core/services/patient.service';
import { Patient } from '../../core/models/patient.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, PatientDrawerComponent],
  templateUrl: './patients.html',
  styleUrl: './patients.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientsComponent implements OnInit {
  private readonly patientService = inject(PatientService);
  
  searchTerm = signal('');
  isDrawerOpen = signal(false);
  isLoading = signal(false);
  
  // Edición dinámica
  selectedPatient = signal<Patient | null>(null);
  isFetchingPatient = signal(false);

  // Lista real de pacientes desde el backend
  private readonly ALL_PATIENTS = signal<Patient[]>([]);

  // Paginación con ngx-pagination
  config = {
    id: 'patients-pagination',
    itemsPerPage: 10,
    currentPage: 1
  };

  ngOnInit() {
    this.loadPatients();
  }

  loadPatients() {
    this.isLoading.set(true);
    this.patientService.getPatients().subscribe({
      next: (patients) => {
        this.ALL_PATIENTS.set(patients);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar pacientes:', err);
        this.isLoading.set(false);
      }
    });
  }

  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.ALL_PATIENTS();

    if (term) {
      this.config.currentPage = 1;
    }

    if (!term) return all;

    return all.filter(p =>
      p.nombreCompleto.toLowerCase().includes(term) ||
      p.curp?.toLowerCase().includes(term) ||
      p.telefono.toLowerCase().includes(term) ||
      p.emergenciaNombre?.toLowerCase().includes(term)
    );
  });

  onPageChange(page: number) {
    this.config.currentPage = page;
  }

  openNewPatientDrawer() {
    this.selectedPatient.set(null);
    this.isDrawerOpen.set(true);
  }

  openEditDrawer(patient: Patient) {
    if (!patient.id) return;
    
    this.isFetchingPatient.set(true);
    this.patientService.getPatientById(patient.id)
      .pipe(finalize(() => this.isFetchingPatient.set(false)))
      .subscribe({
        next: (fullPatient) => {
          if (fullPatient) {
            this.selectedPatient.set(fullPatient);
            this.isDrawerOpen.set(true);
          }
        },
        error: (err) => console.error('Error al cargar paciente para edición:', err)
      });
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
    this.selectedPatient.set(null);
  }

  onPatientSaved(newPatient: Patient) {
    console.log('Paciente guardado exitosamente:', newPatient);
    this.loadPatients(); // Recargar el listado priorizado
  }

  get totalElements() { return this.filteredPatients().length; }
  
  get fromElement() { 
    if (this.totalElements === 0) return 0;
    return (this.config.currentPage - 1) * this.config.itemsPerPage + 1; 
  }

  get toElement() {
    if (this.totalElements === 0) return 0;
    return Math.min(this.config.currentPage * this.config.itemsPerPage, this.totalElements);
  }
}
