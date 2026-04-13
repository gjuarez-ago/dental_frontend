package com.meyisoft.dental.system.models.dto;

import com.meyisoft.dental.system.enums.PagoStatus;
import com.meyisoft.dental.system.enums.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagoDTO {
    private UUID id;
    private UUID citaId;
    private UUID pacienteId;
    private BigDecimal monto;
    private PaymentMethod metodoPago;
    private String notas;
    private String folioPago;
    private String comprobanteUrl;
    private BigDecimal montoTotalCita;
    private PagoStatus status;
    private String motivoRechazo;
    private OffsetDateTime createdAt;
}
