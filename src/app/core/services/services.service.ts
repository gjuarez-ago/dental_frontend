import { Injectable, signal } from '@angular/core';

export interface DentalService {
  id: string;
  title: string;
  description: string;
  type: 'Cita' | 'Valoración';
  price?: number;
  icon: string;
  image?: string; // Base64 or URL
  category: 'Estética' | 'Cirugía' | 'Prevención' | 'General';
}

@Injectable({
  providedIn: 'root'
})
export class ServicesService {
  readonly services = signal<DentalService[]>([
    {
      id: '1',
      title: 'Limpieza Dental Ultrasonido',
      description: 'Remoción de sarro y placa bacteriana mediante tecnología ultrasónica. Incluye pulido coronario.',
      type: 'Cita',
      price: 1200,
      icon: 'ph-sparkle',
      category: 'Prevención'
    },
    {
      id: '2',
      title: 'Valoración Ortodoncia',
      description: 'Estudio inicial para alineación dental. Incluye diagnóstico facial y dental.',
      type: 'Valoración',
      icon: 'ph-brackets-square',
      category: 'Estética'
    },
    {
      id: '3',
      title: 'Endodoncia Unirradicular',
      description: 'Tratamiento de conductos en piezas de una sola raíz. Incluye radiografías de control.',
      type: 'Cita',
      price: 3500,
      icon: 'ph-activity',
      category: 'General'
    },
    {
      id: '4',
      title: 'Diseño de Sonrisa (Carillas)',
      description: 'Transformación estética completa mediante carillas de porcelana o resina.',
      type: 'Valoración',
      icon: 'ph-magic-wand',
      category: 'Estética'
    },
    {
      id: '5',
      title: 'Extracción de Terceros Molares',
      description: 'Cirugía especializada para muelas del juicio. Procedimiento con sedación opcional.',
      type: 'Cita',
      price: 2800,
      icon: 'ph-first-aid-kit',
      category: 'Cirugía'
    },
    {
      id: '6',
      title: 'Blanqueamiento Premium',
      description: 'Aclaramiento dental de alta potencia en una sola sesión de 45 minutos.',
      type: 'Cita',
      price: 4500,
      icon: 'ph-sun',
      category: 'Estética'
    }
  ]);

  addService(data: Partial<DentalService>) {
    const newService: DentalService = {
      id: Math.random().toString(36).substr(2, 9),
      title: data.title || '',
      description: data.description || '',
      type: data.type || 'Cita',
      price: data.price,
      icon: data.icon || 'ph-cube',
      image: data.image,
      category: data.category || 'General'
    };
    this.services.update(list => [newService, ...list]);
  }

  updateService(id: string, data: Partial<DentalService>) {
    this.services.update(list => 
      list.map(s => s.id === id ? { ...s, ...data } : s)
    );
  }

  deleteService(id: string) {
    this.services.update(list => list.filter(s => s.id !== id));
  }
}
