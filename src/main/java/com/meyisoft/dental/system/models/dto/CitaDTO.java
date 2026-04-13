package com.meyisoft.dental.system.models.dto;

import com.meyisoft.dental.system.enums.AppointmentStatus;
import com.meyisoft.dental.system.enums.TicketStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CitaDTO {
    private UUID id;
    private UUID pacienteId;
    private String pacienteNombre; // Auxiliar para el frontend
    private UUID doctorId;
    private String doctorNombre;   // Auxiliar para el frontend
    private UUID sucursalId;
    private UUID servicioId;
    private String servicioNombre; // Auxiliar para el frontend
    private OffsetDateTime fechaHora;
    private Integer duracionMinutos;
    private AppointmentStatus estado;
    private String motivoConsulta;
    private String notasRecepcion;
    
    // Información financiera básica
    private java.math.BigDecimal montoTotal;
    private java.math.BigDecimal montoPagado;
}
