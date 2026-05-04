export const HEALTH_CATALOGS = {
  giros: [
    { id: 'DENTAL', label: 'Clínica Dental', icon: 'ph-tooth' },
    { id: 'PSICOLOGIA', label: 'Consultorio Psicológico', icon: 'ph-brain' },
    { id: 'GENERAL', label: 'Medicina General', icon: 'ph-first-aid' }
  ],
  
  specialtiesByGiro: {
    'DENTAL': [
      'Odontología General',
      'Ortodoncia',
      'Endodoncia',
      'Periodoncia',
      'Odontopediatría',
      'Cirugía Maxilofacial',
      'Implantología',
      'Rehabilitación Oral',
      'Estética Dental'
    ],
    'PSICOLOGIA': [
      'Terapia Cognitivo-Conductual',
      'Psicoanálisis',
      'Terapia de Pareja',
      'Psicología Infantil',
      'Neuropsicología'
    ],
    'GENERAL': [
      'Medicina Familiar',
      'Pediatría',
      'Ginecología',
      'Nutrición',
      'Dermatología',
      'Fisioterapia'
    ]
  }
};

export type HealthGiro = 'DENTAL' | 'PSICOLOGIA' | 'GENERAL';
