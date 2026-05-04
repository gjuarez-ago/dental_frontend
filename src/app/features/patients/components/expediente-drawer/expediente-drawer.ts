import { Component, EventEmitter, Input, Output, signal, inject, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { ClinicalService, ConsultaMedica } from '../../../../core/services/clinical.service';
import { Patient } from '../../../../core/models/patient.model';
import { LayoutService } from '../../../../core/services/layout.service';

@Component({
  selector: 'app-expediente-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expediente-drawer.html',
  styleUrls: ['./expediente-drawer.scss']
})
export class ExpedienteDrawerComponent implements OnChanges {
  private clinicalService = inject(ClinicalService);
  private layout = inject(LayoutService);

  @Input() isOpen = false;
  @Input() patient: Patient | null = null;
  @Input() citaId: string | null = null;
  @Output() close = new EventEmitter<void>();

  isLoading = signal(false);
  activeTab = signal<'resumen' | 'historial'>('historial');
  history = signal<ConsultaMedica[]>([]);

  // Computado para el resumen de la cita específica
  selectedConsulta = computed(() => {
    if (!this.citaId) return null;
    return this.history().find(c => c.citaId === this.citaId) || null;
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && this.isOpen && this.patient?.id) {
      // Si se proporciona citaId, el tab por defecto es resumen, si no historial
      if (this.citaId) {
        this.activeTab.set('resumen');
      } else {
        this.activeTab.set('historial');
      }
      this.loadHistory();
    } else if (!this.isOpen) {
      this.history.set([]); // Reset on close
    }
  }

  setTab(tab: 'resumen' | 'historial') {
    this.activeTab.set(tab);
  }

  agendarDesdeExpediente() {
    if (this.patient) {
      this.layout.openAppointmentDrawerForPatient(this.patient);
      this.closeDrawer();
    }
  }

  private loadHistory() {
    this.isLoading.set(true);
    this.clinicalService.obtenerHistorial(this.patient!.id!).subscribe({
      next: (res) => {
        if (res.ok && res.result) {
          this.history.set(res.result);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  closeDrawer() {
    this.close.emit();
  }

  printSummary() {
    const item = this.selectedConsulta();
    if (!item) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fechaConsulta = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

    const doctorNombre = item.doctorNombre || 'Médico Tratante';
    const pacienteNombre = this.patient?.nombreCompleto || 'Paciente';
    const sitioWeb = 'https://novatia.health';
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(sitioWeb)}`;

    const medicamentosHtml = (item.prescripcionMedica && item.prescripcionMedica.length > 0)
      ? item.prescripcionMedica.map((med: any, i: number) => `
          <tr>
            <td class="med-num">${i + 1}.</td>
            <td>
              <div class="med-nombre">${med.nombre} <span class="med-dosis">${med.dosis}</span></div>
              <div class="med-instruc">${med.frecuencia} por ${med.duracion}${med.instrucciones ? ' &mdash; ' + med.instrucciones : ''}</div>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="2" class="sin-med">Sin medicamentos prescritos en esta consulta.</td></tr>`;

    const indicacionesHtml = item.indicaciones
      ? `<div class="indicaciones-box">
           <div class="indicaciones-titulo">Indicaciones Generales:</div>
           <div class="indicaciones-texto">${item.indicaciones.replace(/\n/g, '<br>')}</div>
         </div>`
      : '';

    const signosHtml = (item.peso || item.talla || item.presionArterial || item.temperatura)
      ? `<div class="signos-grid">
          ${item.peso ? `<div class="signo"><strong>Peso:</strong> ${item.peso} kg</div>` : ''}
          ${item.talla ? `<div class="signo"><strong>Talla:</strong> ${item.talla} m</div>` : ''}
          ${item.imc ? `<div class="signo"><strong>IMC:</strong> ${item.imc}</div>` : ''}
          ${item.presionArterial ? `<div class="signo"><strong>P.A.:</strong> ${item.presionArterial}</div>` : ''}
          ${item.temperatura ? `<div class="signo"><strong>Temp:</strong> ${item.temperatura} °C</div>` : ''}
         </div>`
      : '';

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Resumen Clínico — ${pacienteNombre}</title>
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
      padding: 30px 35px 100px 35px;
      position: relative;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
    }
    .cabecera {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 14px;
      border-bottom: 3px solid #3B82F6;
      margin-bottom: 16px;
    }
    .clinica-nombre { font-size: 18px; font-weight: 900; color: #1A2B4C; }
    .clinica-sub { font-size: 9.5px; color: #64748B; margin-top: 2px; line-height: 1.5; }
    .titulo-doc {
      font-size: 13px;
      font-weight: 800;
      color: #3B82F6;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      text-align: right;
    }
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
      margin-bottom: 6px;
    }
    .paciente-nombre { font-size: 14px; font-weight: 900; color: #1A2B4C; }
    .paciente-meta { font-size: 10px; color: #64748B; margin-top: 3px; }
    .signos-grid {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #CBD5E1;
    }
    .signo { font-size: 10px; color: #64748B; }
    .signo strong { color: #1A2B4C; font-weight: 700; }
    .lbl { font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #94A3B8; letter-spacing: 0.05em; }
    .val { font-weight: 700; color: #1A2B4C; }
    .section {
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 1px solid #F1F5F9;
    }
    .section:last-of-type { border-bottom: none; }
    .section-lbl {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94A3B8;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-lbl::before {
      content: '';
      display: block;
      width: 3px;
      height: 10px;
      background: #3B82F6;
      border-radius: 2px;
    }
    .section-text { font-size: 12px; color: #1A2B4C; line-height: 1.6; }
    .rx-titulo {
      font-family: 'Times New Roman', Georgia, serif;
      font-size: 36px;
      font-weight: 900;
      font-style: italic;
      color: #3B82F6;
      margin-bottom: 10px;
      line-height: 1;
    }
    .meds-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
    .meds-table td { padding: 6px 4px; vertical-align: top; }
    .meds-table tr { border-bottom: 1px solid #F8FAFC; }
    .meds-table tr:last-child { border-bottom: none; }
    .med-num { font-size: 14px; font-weight: 900; color: #3B82F6; width: 24px; padding-top: 6px; }
    .med-nombre { font-size: 13px; font-weight: 800; color: #1A2B4C; text-transform: uppercase; }
    .med-dosis { font-weight: 600; text-transform: none; font-size: 12px; color: #3B82F6; }
    .med-instruc { font-size: 11px; color: #64748B; font-style: italic; margin-top: 2px; line-height: 1.4; }
    .sin-med { font-style: italic; color: #94A3B8; font-size: 11px; padding: 8px 0; }
    .indicaciones-box {
      margin-top: 16px;
      background: #FFFBF5;
      border-left: 4px solid #F97316;
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
    }
    .indicaciones-titulo {
      font-size: 9px; font-weight: 900; text-transform: uppercase;
      letter-spacing: 0.08em; color: #F97316; margin-bottom: 5px;
    }
    .indicaciones-texto { font-size: 11px; color: #1A2B4C; line-height: 1.6; }
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

  <div class="cabecera">
    <div>
      <div class="clinica-nombre">Dental Sonrisana</div>
      <div class="clinica-sub">Resumen de Consulta Médica</div>
    </div>
    <div class="titulo-doc">Expediente Clínico</div>
  </div>

  <div class="paciente-box">
    <div class="paciente-row-top">
      <div><span class="lbl">Médico: </span><span class="val">Dr. ${doctorNombre}</span></div>
      <div><span class="lbl">Fecha: </span><span class="val">${fechaConsulta}</span></div>
    </div>
    <div class="paciente-nombre">${pacienteNombre}</div>
    ${signosHtml}
  </div>

  <div class="section">
    <div class="section-lbl">Diagnóstico Clínico</div>
    <div class="section-text">${item.cie10Nombre ? item.cie10Nombre + ' — ' : ''}${item.diagnostico || '—'}</div>
  </div>

  <div class="section">
    <div class="section-lbl">Procedimiento Realizado</div>
    <div class="section-text">${item.procedimientoRealizado || '—'}</div>
  </div>

  <div class="rx-titulo">Rx.</div>
  <table class="meds-table">
    ${medicamentosHtml}
  </table>

  ${indicacionesHtml}

  <div class="pie">
    <div class="qr-box">
      <img src="${qrUrl}" class="qr-img" alt="QR">
      <div class="qr-lbl">Expediente digital</div>
    </div>
    <div class="firma-box">
      <div class="firma-linea"></div>
      <div class="firma-nombre">Dr. ${doctorNombre}</div>
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

  getDuration(item: ConsultaMedica): string {
    if (!item.atencionInicio || !item.atencionFin) return '';
    const start = new Date(item.atencionInicio).getTime();
    const end = new Date(item.atencionFin).getTime();
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} min`;
  }
}
