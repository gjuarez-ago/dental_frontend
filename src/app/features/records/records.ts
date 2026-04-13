import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ClinicalEvent {
  date: string;
  type: 'visit' | 'xray' | 'surgery' | 'cleaning' | 'payment';
  title: string;
  description: string;
  doctor: string;
  attachments?: string[];
}

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  lastVisit: string;
  status: 'Active' | 'Pending' | 'Follow-up';
  mainTreatment: string;
  history: ClinicalEvent[];
}

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './records.html',
  styleUrl: './records.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecordsComponent {
  // Search state
  searchTerm = signal('');
  
  // Data
  readonly patients: PatientRecord[] = [
    { 
      id: '1', 
      name: 'Ana García', 
      age: 28,
      lastVisit: '2024-03-10', 
      status: 'Active', 
      mainTreatment: 'Ortodoncia',
      history: [
        { 
          date: '2024-03-10', 
          type: 'visit', 
          title: 'Ajuste de Brackets', 
          description: 'Se realizó el cambio de ligas y ajuste de arco superior e inferior. El paciente reporta buena evolución.', 
          doctor: 'Dra. Sarai Rios' 
        },
        { 
          date: '2024-02-15', 
          type: 'cleaning', 
          title: 'Limpieza Profunda', 
          description: 'Profilaxis ultrasónica y pulido coronario previo al ajuste mensual.', 
          doctor: 'Higienista - Martha P.' 
        },
        { 
          date: '2024-01-10', 
          type: 'xray', 
          title: 'Radiografía Panorámica', 
          description: 'Control trimestral para evaluar posición de molares del juicio.', 
          doctor: 'Dra. Sarai Rios',
          attachments: ['Panoramica_Control.jpg']
        }
      ]
    },
    { 
      id: '2', 
      name: 'Carlos López', 
      age: 45,
      lastVisit: '2024-03-12', 
      status: 'Pending', 
      mainTreatment: 'Limpieza',
      history: [
        { 
          date: '2024-03-12', 
          type: 'cleaning', 
          title: 'Valoración Inicial', 
          description: 'Paciente acude por dolor en zona molar. Se detecta sarro supra y subgingival.', 
          doctor: 'Dra. Sarai Rios' 
        }
      ]
    },
    { 
      id: '3', 
      name: 'María Rodríguez', 
      age: 32,
      lastVisit: '2024-02-28', 
      status: 'Active', 
      mainTreatment: 'Endodoncia',
      history: [
        { 
          date: '2024-02-28', 
          type: 'surgery', 
          title: 'Fase I Retratamiento', 
          description: 'Apertura de conductos y colocación de hidróxido de calcio.', 
          doctor: 'Dra. Sarai Rios' 
        }
      ]
    }
  ];

  // Selection state
  selectedId = signal<string | null>(this.patients[0].id);

  selectedPatient = computed(() => {
    const id = this.selectedId();
    return this.patients.find(p => p.id === id) || this.patients[0];
  });
  
  // Filtering logic
  filteredPatients = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.patients.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.mainTreatment.toLowerCase().includes(term)
    );
  });

  selectPatient(id: string) {
    this.selectedId.set(id);
  }

  getIconForType(type: string): string {
    const icons: any = {
      visit: 'ph-calendar-check',
      xray: 'ph-article',
      surgery: 'ph-first-aid-kit',
      cleaning: 'ph-sparkle',
      payment: 'ph-credit-card'
    };
    return icons[type] || 'ph-dot';
  }
}
