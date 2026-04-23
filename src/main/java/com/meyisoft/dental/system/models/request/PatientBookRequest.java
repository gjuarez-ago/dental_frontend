package com.meyisoft.dental.system.models.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO sencillo para que un paciente agende una cita desde su portal.
 * El backend resuelve el tenantId y sucursalId desde el perfil del paciente.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientBookRequest {

    @NotNull(message = "El servicio es obligatorio")
    private UUID servicioId;

    @NotNull(message = "La fecha y hora son obligatorias")
    private OffsetDateTime fechaHora;

    private String motivoConsulta;

    @NotNull(message = "La referencia de pago es obligatoria")
    private String referenciaPago;

    @NotNull(message = "El monto del anticipo es obligatorio")
    private java.math.BigDecimal montoAnticipo;
}
