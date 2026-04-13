package com.meyisoft.dental.system.entity;

import com.meyisoft.dental.system.enums.AppointmentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "citas")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
public class Cita extends BaseEntity {

    @Column(name = "paciente_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID pacienteId;

    @Column(name = "doctor_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID doctorId;

    @Column(name = "sucursal_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID sucursalId;

    @Column(name = "servicio_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID servicioId;

    @Column(name = "fecha_hora", nullable = false)
    private OffsetDateTime fechaHora;

    @Column(name = "duracion_minutos")
    private Integer duracionMinutos;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false)
    @Builder.Default
    private AppointmentStatus estado = AppointmentStatus.PENDIENTE;

    @Column(name = "motivo_consulta", columnDefinition = "TEXT")
    private String motivoConsulta;

    @Column(name = "notas_recepcion", columnDefinition = "TEXT")
    private String notasRecepcion;

    @Column(name = "monto_total", precision = 12, scale = 2)
    private java.math.BigDecimal montoTotal;

}
