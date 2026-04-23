package com.meyisoft.dental.system.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    // Ingresos por validar
    private BigDecimal ingresosPorValidar;
    private long comprobantesPendientesCount;

    // Ingresos Hoy
    private BigDecimal ingresosHoy;
    private double ingresosHoyTrend; // Porcentaje de cambio vs ayer

    // Citas Hoy
    private long citasHoyCount;
    private long citasHoyTrend; // Diferencia numérica vs ayer (ej: +2)

    // Pacientes Nuevos
    private long pacientesNuevosCount;
    private double pacientesNuevosTrend; // Porcentaje de cambio vs ayer

    // Detalle de ingresos de hoy
    private java.util.List<IncomeDetailDTO> ingresosDetalleHoy;
}
