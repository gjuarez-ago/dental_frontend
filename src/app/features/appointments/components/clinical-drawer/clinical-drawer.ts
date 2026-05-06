import { Component, EventEmitter, Input, Output, signal, inject, computed, effect, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { ClinicalService, ConsultaMedica, Medicamento } from '../../../../core/services/clinical.service';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { Cie10Service } from '../../../../core/services/cie10.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { Cita, AppointmentStatus } from '../../../../core/models/appointment.model';

export const prescriptionValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const indicaciones = control.get('indicaciones')?.value;
  const medicamentos = control.get('medicamentos') as FormArray;

  const hasIndicaciones = indicaciones && indicaciones.trim().length > 0;
  const hasMedicamentos = medicamentos && medicamentos.length > 0;

  if (!hasIndicaciones && !hasMedicamentos) {
    return { prescriptionRequired: true };
  }

  return null;
};

@Component({
  selector: 'app-clinical-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clinical-drawer.html',
  styleUrls: ['./clinical-drawer.scss']
})
export class ClinicalDrawerComponent implements OnChanges {
  private fb = inject(FormBuilder);
  private clinicalService = inject(ClinicalService);
  private appointmentService = inject(AppointmentService);
  private cie10Service = inject(Cie10Service);
  private loadingService = inject(LoadingService);

  @Input() isOpen = false;
  @Input() cita: Cita | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() consultationFinished = new EventEmitter<void>();

  clinicalForm: FormGroup;
  isLoading = signal(false);
  activeTab = signal<'clinical' | 'prescription' | 'history'>('clinical');
  history = signal<ConsultaMedica[]>([]);

  // Estado del resumen post-consulta
  showSummary = signal(false);
  summaryData = signal<ConsultaMedica | null>(null);
  atencionInicioReal = signal<string | null>(null);

  // LÃ³gica CIE-10
  cie10Results = signal<any[]>([]);
  showCie10Results = signal(false);
  selectedCie10Nombre = signal<string | null>(null);

  constructor() {
    this.clinicalForm = this.fb.group({
      cie10Id: [null],
      presionArterial: [''],
      frecuenciaCardiaca: [null, [Validators.min(0)]],
      frecuenciaRespiratoria: [null, [Validators.min(0)]],
      temperatura: [null, [Validators.min(30), Validators.max(45)]],
      peso: [null, [Validators.min(0)]],
      talla: [null, [Validators.min(0)]],
      imc: [{ value: null, disabled: true }],
      diagnostico: ['', [Validators.required, Validators.minLength(5)]],
      procedimientoRealizado: ['', [Validators.required]],
      indicaciones: [''],
      observacionesInternas: [''],
      complicaciones: [''],
      consentimientoFirmado: [false],
      medicamentos: this.fb.array([])
    }, { validators: prescriptionValidator });

    // LÃ³gica Ultra-Inteligente para IMC
    this.clinicalForm.valueChanges.subscribe(val => {
      const peso = parseFloat(val.peso);
      const tallaRaw = parseFloat(val.talla);

      if (!isNaN(peso) && !isNaN(tallaRaw) && peso > 0 && tallaRaw > 0) {
        // Inteligencia: Si es mayor a 3, son CM; si es menor, son Metros.
        // Ejemplo: 170 -> 1.7m | 1.7 -> 1.7m
        const tallaEnMetros = tallaRaw > 3 ? tallaRaw / 100 : tallaRaw;

        // Solo calculamos si la talla es razonable (0.5m a 2.5m)
        if (tallaEnMetros >= 0.5 && tallaEnMetros <= 2.5) {
          const imc = peso / (tallaEnMetros * tallaEnMetros);
          this.clinicalForm.get('imc')?.setValue(imc.toFixed(2), { emitEvent: false });
        } else {
          this.clinicalForm.get('imc')?.setValue(null, { emitEvent: false });
        }
      } else {
        this.clinicalForm.get('imc')?.setValue(null, { emitEvent: false });
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']) {
      if (this.isOpen) {
        document.body.classList.add('no-scroll');
        if (this.cita?.id) {
          this.atencionInicioReal.set(new Date().toISOString());
          this.updateSurgicalValidators();
          this.loadExistingConsultation();
          this.loadHistory();
        }
      } else {
        document.body.classList.remove('no-scroll');
      }
    }
  }

  private updateSurgicalValidators() {
    const consentimientoControl = this.clinicalForm.get('consentimientoFirmado');
    if (this.cita?.procedimientoQuirurgico) {
      consentimientoControl?.setValidators([Validators.requiredTrue]);
    } else {
      consentimientoControl?.clearValidators();
    }
    consentimientoControl?.updateValueAndValidity();
  }

  onSearchCie10(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    if (query.length < 2) {
      this.cie10Results.set([]);
      this.showCie10Results.set(false);
      return;
    }

    this.cie10Service.buscar(query).subscribe(res => {
      this.cie10Results.set(res);
      this.showCie10Results.set(res.length > 0);
    });
  }

  selectCie10(item: any) {
    this.clinicalForm.get('cie10Id')?.setValue(item.id);
    this.selectedCie10Nombre.set(`${item.codigo} - ${item.nombre}`);
    this.showCie10Results.set(false);

    // Autocompletar diagnÃ³stico si estÃ¡ vacÃ­o
    const diagCtrl = this.clinicalForm.get('diagnostico');
    if (!diagCtrl?.value || diagCtrl.value.trim().length === 0) {
      diagCtrl?.setValue(item.nombre);
    }
  }

  clearCie10() {
    this.clinicalForm.get('cie10Id')?.setValue(null);
    this.selectedCie10Nombre.set(null);
  }

  private loadHistory() {
    if (!this.cita?.pacienteId) return;
    this.clinicalService.obtenerHistorial(this.cita.pacienteId).subscribe({
      next: (res) => {
        if (res.ok) {
          // Filtrar la consulta actual si ya existe para no mostrarla en el historial
          this.history.set(res.result!.filter(h => h.citaId !== this.cita?.id));
        }
      }
    });
  }

  get medicamentos() {
    return this.clinicalForm.get('medicamentos') as FormArray;
  }

  addMedicamento() {
    const medGroup = this.fb.group({
      nombre: ['', Validators.required],
      dosis: ['', Validators.required],
      frecuencia: ['', Validators.required],
      duracion: ['', Validators.required],
      instrucciones: ['']
    });
    this.medicamentos.push(medGroup);
    this.activeTab.set('prescription');
  }

  removeMedicamento(index: number) {
    this.medicamentos.removeAt(index);
  }

  private loadExistingConsultation() {
    this.isLoading.set(true);
    this.clinicalService.obtenerPorCita(this.cita!.id!).subscribe({
      next: (res) => {
        if (res.ok && res.result) {
          const data = res.result;
          this.clinicalForm.patchValue({
            cie10Id: data.cie10Id,
            presionArterial: data.presionArterial,
            frecuenciaCardiaca: data.frecuenciaCardiaca,
            frecuenciaRespiratoria: data.frecuenciaRespiratoria,
            temperatura: data.temperatura,
            peso: data.peso,
            talla: data.talla,
            imc: data.imc,
            diagnostico: data.diagnostico,
            procedimientoRealizado: data.procedimientoRealizado,
            indicaciones: data.indicaciones,
            observacionesInternas: data.observacionesInternas,
            complicaciones: data.complicaciones
          });

          if (data.cie10Id && data.cie10Nombre) {
            this.selectedCie10Nombre.set(`${data.cie10Nombre}`);
          }

          // Cargar medicamentos
          this.medicamentos.clear();
          data.prescripcionMedica?.forEach(m => {
            this.medicamentos.push(this.fb.group(m));
          });
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSubmit() {
    if (this.clinicalForm.invalid || !this.cita) {
      this.clinicalForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.loadingService.show();
    const formValue = this.clinicalForm.getRawValue();

    const consulta: ConsultaMedica = {
      citaId: this.cita.id!,
      pacienteId: this.cita.pacienteId,
      doctorId: this.cita.doctorId!,
      cie10Id: formValue.cie10Id,
      presionArterial: formValue.presionArterial,
      frecuenciaCardiaca: formValue.frecuenciaCardiaca,
      frecuenciaRespiratoria: formValue.frecuenciaRespiratoria,
      temperatura: formValue.temperatura,
      peso: formValue.peso,
      talla: formValue.talla,
      imc: formValue.imc,
      diagnostico: formValue.diagnostico,
      procedimientoRealizado: formValue.procedimientoRealizado,
      prescripcionMedica: formValue.medicamentos,
      indicaciones: formValue.indicaciones,
      observacionesInternas: formValue.observacionesInternas,
      complicaciones: formValue.complicaciones,
      atencionInicio: this.atencionInicioReal(),
      atencionFin: new Date().toISOString()
    };

    // Simulamos un procesamiento de 3 segundos para mostrar el logo de Novatia con impacto
    setTimeout(() => {
      this.clinicalService.guardarConsulta(consulta).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.loadingService.hide();
          if (res.ok && res.result) {
            this.summaryData.set(res.result);
            this.showSummary.set(true);
            this.consultationFinished.emit();
          }
        },
        error: () => {
          this.isLoading.set(false);
          this.loadingService.hide();
        }
      });
    }, 3000);
  }

  /** Cierra el panel de resumen y el drawer completo */
  closeSummary() {
    this.showSummary.set(false);
    this.summaryData.set(null);
    this.closeDrawer();
  }

  /** MÃ©todo para cerrar el drawer desde el HTML */
  closeDrawer() {
    this.isOpen = false;
    this.closed.emit();
    this.clinicalForm.reset();
    this.medicamentos.clear();
    this.activeTab.set('clinical');
    this.showSummary.set(false);
    this.summaryData.set(null);
    document.body.classList.remove('no-scroll');
  }

  /** Imprime el resumen de la cita usando un diseÃ±o limpio y profesional */
  printSummary() {
    const data = this.summaryData();
    if (!data) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoUrl = this.cita?.empresaIsotipoUrl
      || this.cita?.empresaLogoUrl
      || 'images/logo_erm.png';
    const sitioWeb = this.cita?.empresaSitioWeb || 'https://novatia.health';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(sitioWeb)}`;
    const fechaActual = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    const doctorNombre = this.cita?.doctorNombre || 'Dra. Sarai Rios';

    const medicamentosHtml = (data.prescripcionMedica && data.prescripcionMedica.length > 0)
      ? data.prescripcionMedica.map((med: any, i: number) => `
          <tr>
            <td class="med-num">${i + 1}.</td>
            <td>
              <div class="med-nombre">${med.nombre} <span class="med-dosis">${med.dosis}</span></div>
              <div class="med-instruc">${med.frecuencia} por ${med.duracion}${med.instrucciones ? ' &mdash; ' + med.instrucciones : ''}</div>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="2" class="sin-med">Sin medicamentos prescritos en esta consulta.</td></tr>`;

    const indicacionesHtml = data.indicaciones
      ? `<div class="indicaciones-box">
           <div class="indicaciones-titulo">Indicaciones Generales:</div>
           <div class="indicaciones-texto">${data.indicaciones.replace(/\n/g, '<br>')}</div>
         </div>`
      : '';

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Receta MÃ©dica â€” ${this.cita?.pacienteNombre || 'Paciente'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    @media print {
      @page { size: A4 portrait; margin: 12mm 15mm; }
      body { background: white !important; }
      .hoja { box-shadow: none !important; }
    }

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #e8edf2;
      padding: 20px;
      color: #1A2B4C;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .hoja {
      background: white;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 30px 35px 100px 35px; /* padding-bottom para el footer fijo */
      position: relative;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    }

    /* â”€â”€ ENCABEZADO â”€â”€ */
    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 14px;
      border-bottom: 3px solid #3B82F6;
      margin-bottom: 16px;
    }
    .cabecera-izq { display: flex; align-items: center; gap: 14px; }
    .logo { width: 52px; height: 52px; object-fit: contain; border-radius: 10px; }
    .clinica-nombre { font-size: 18px; font-weight: 900; color: #1A2B4C; line-height: 1.2; }
    .clinica-sub { font-size: 9.5px; color: #64748B; margin-top: 2px; line-height: 1.5; }
    .medico-info { text-align: right; }
    .medico-nombre { font-size: 15px; font-weight: 800; color: #1A2B4C; }
    .medico-sub { font-size: 9.5px; color: #64748B; margin-top: 3px; line-height: 1.5; }

    /* â”€â”€ DATOS PACIENTE â”€â”€ */
    .paciente-box {
      background: #F8FAFE;
      border: 1px solid rgba(59,130,246,0.15);
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 18px;
    }
    .paciente-row-top {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 8px;
    }
    .paciente-nombre { font-size: 13px; font-weight: 800; color: #1A2B4C; }
    .paciente-meta { font-size: 10px; color: #64748B; margin-top: 2px; }
    .signos-grid {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #CBD5E1;
    }
    .signo { font-size: 10px; color: #64748B; }
    .signo strong { color: #1A2B4C; font-weight: 700; }
    .lbl { font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #94A3B8; letter-spacing: 0.05em; }
    .val { font-weight: 700; color: #1A2B4C; }

    /* â”€â”€ DIAGNÃ“STICO â”€â”€ */
    .diagnostico-line {
      font-size: 11px;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid #F1F5F9;
    }

    /* â”€â”€ Rx â”€â”€ */
    .rx-titulo {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 36px;
      font-weight: 900;
      font-style: italic;
      color: #3B82F6;
      margin-bottom: 12px;
      line-height: 1;
    }

    .meds-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
    }
    .meds-table td { padding: 6px 4px; vertical-align: top; }
    .meds-table tr { border-bottom: 1px solid #F8FAFC; }
    .meds-table tr:last-child { border-bottom: none; }
    .med-num {
      font-size: 14px;
      font-weight: 900;
      color: #3B82F6;
      width: 24px;
      padding-top: 7px;
    }
    .med-nombre {
      font-size: 13px;
      font-weight: 800;
      color: #1A2B4C;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .med-dosis {
      font-weight: 600;
      text-transform: none;
      font-size: 12px;
      color: #3B82F6;
    }
    .med-instruc {
      font-size: 11px;
      color: #64748B;
      font-style: italic;
      margin-top: 2px;
      padding-left: 2px;
      line-height: 1.4;
    }
    .sin-med {
      font-style: italic;
      color: #94A3B8;
      font-size: 11px;
      padding: 8px 0;
    }

    /* â”€â”€ INDICACIONES â”€â”€ */
    .indicaciones-box {
      margin-top: 18px;
      background: #FFFBF5;
      border-left: 4px solid #F97316;
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
      page-break-inside: avoid;
    }
    .indicaciones-titulo {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #F97316;
      margin-bottom: 5px;
    }
    .indicaciones-texto {
      font-size: 11px;
      color: #1A2B4C;
      line-height: 1.6;
    }

    /* â”€â”€ FOOTER FIJO AL FONDO â”€â”€ */
    .pie {
      position: absolute;
      bottom: 30px;
      left: 35px;
      right: 35px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #E2E8F0;
      padding-top: 14px;
    }
    .qr-box { text-align: center; }
    .qr-img { width: 55px; height: 55px; display: block; margin: 0 auto 3px; }
    .qr-lbl { font-size: 7.5px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; }

    .firma-box { text-align: center; }
    .firma-linea { width: 180px; border-top: 1.5px solid #1A2B4C; margin: 0 auto 5px; }
    .firma-nombre { font-size: 11px; font-weight: 800; color: #1A2B4C; }
    .firma-cargo { font-size: 8px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }

    .brand-box { text-align: right; font-size: 9px; color: #94A3B8; }
    .brand-box strong { color: #1A2B4C; }
    .brand-dot { color: #F97316; }
  </style>
</head>
<body>
<div class="hoja">

  <!-- CABECERA -->
  <div class="cabecera">
    <div class="cabecera-izq">
      <img src="${logoUrl}" class="logo" onerror="this.src='images/logo_erm.png'" alt="Logo">
      <div>
        <div class="clinica-nombre">${this.cita?.empresaNombre || 'Dental Sonrisana'}</div>
        <div class="clinica-sub">
          ${this.cita?.sucursalDireccion || 'Niños Héroes 8, Centro, 40831 San Jeronimito, Gro.'}<br>
          Tel: ${this.cita?.sucursalTelefono || '758-108-2962'}
        </div>
      </div>
    </div>
    <div class="medico-info">
      <div class="medico-nombre">${doctorNombre}</div>
      <div class="medico-sub">
        Cédula: ${this.cita?.doctorCedula || '-'}<br>
        ${this.cita?.doctorEspecialidad || 'Odontología General'}
      </div>
    </div>
  </div>

  <!-- DATOS PACIENTE -->
  <div class="paciente-box">
    <div class="paciente-row-top">
      <div><span class="lbl">Folio: </span><span class="val">${this.cita?.folio || '—'}</span></div>
      <div><span class="lbl">Fecha: </span><span class="val">${fechaActual}</span></div>
    </div>
    <div class="paciente-nombre">${this.cita?.pacienteNombre || 'Paciente'}</div>
    <div class="paciente-meta">
      Edad: <strong>${this.cita?.pacienteEdad || '-'} años</strong>
      &nbsp;&nbsp;Sexo: <strong>${this.cita?.pacienteSexo || '-'}</strong>
    </div>
    <div class="signos-grid">
      ${data.peso ? `<div class="signo"><strong>Peso:</strong> ${data.peso} kg</div>` : ''}
      ${data.talla ? `<div class="signo"><strong>Talla:</strong> ${data.talla} m</div>` : ''}
      ${data.imc ? `<div class="signo"><strong>IMC:</strong> ${data.imc}</div>` : ''}
      ${data.presionArterial ? `<div class="signo"><strong>P.A.:</strong> ${data.presionArterial}</div>` : ''}
      ${data.temperatura ? `<div class="signo"><strong>Temp:</strong> ${data.temperatura} °C</div>` : ''}
    </div>
  </div>

  <!-- DIAGNÓSTICO -->
  <div class="diagnostico-line">
    <span class="lbl">Diagnóstico: </span>
    <span class="val">${data.cie10Nombre || data.diagnostico || 'Evaluación General'}</span>
  </div>

  <!-- Rx -->
  <div class="rx-titulo">Rx.</div>
  <table class="meds-table">
    ${medicamentosHtml}
  </table>

  <!-- INDICACIONES -->
  ${indicacionesHtml}

  <!-- FOOTER -->
  <div class="pie">
    <div class="qr-box">
      <img src="${qrUrl}" class="qr-img" alt="QR">
      <div class="qr-lbl">Expediente digital</div>
    </div>

    <div class="firma-box">
      <div class="firma-linea"></div>
      <div class="firma-nombre">${doctorNombre}</div>
      <div class="firma-cargo">Firma del Médico Responsable</div>
    </div>

    <div class="brand-box">
      Powered by <strong>Novatia</strong><span class="brand-dot">.</span>
    </div>
  </div>

</div>

<script>
  // Auto-escala: garantiza que todo el contenido cabe en una sola hoja A4
  window.addEventListener('load', function() {
    var hoja = document.querySelector('.hoja');
    if (!hoja) return;
    var A4_HEIGHT_PX = 1122; // 297mm a 96dpi
    var contenidoAltura = hoja.scrollHeight;
    if (contenidoAltura > A4_HEIGHT_PX) {
      var escala = A4_HEIGHT_PX / contenidoAltura;
      hoja.style.transformOrigin = 'top center';
      hoja.style.transform = 'scale(' + escala + ')';
      // Compensa el espacio visual que deja el scale
      document.body.style.height = (contenidoAltura * escala) + 'px';
    }
  });
</script>
</body>
</html>`);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 600);
  }
}
