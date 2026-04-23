package com.meyisoft.dental.system.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncomeDetailDTO {
    private String pacienteNombre;
    private String motivo;
    private String servicioNombre;
    private BigDecimal monto;
    private OffsetDateTime fecha;
}
