package com.meyisoft.dental.system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "sucursales")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sucursal {

    @Id
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID tenantId;

    @Column(name = "nombre_sucursal", nullable = false)
    private String nombreSucursal;

    @Column(name = "horarios_laborales", columnDefinition = "TEXT")
    private String horariosLaborales; // Almacena el JSON de la configuración de horarios

    @Column(name = "ventana_cancelacion")
    @Builder.Default
    private Integer ventanaCancelacion = 24; // Tiempo en horas para cambios de último momento

    /** Soft-delete flag (1: active, 0: deleted) */
    @Column(name = "reg_borrado", nullable = false)
    @Builder.Default
    private Integer regBorrado = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    @PreUpdate
    void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
