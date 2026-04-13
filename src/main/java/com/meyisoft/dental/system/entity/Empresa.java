package com.meyisoft.dental.system.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "empresas")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Empresa {

    @Id
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID id; // Este es el tenant_id

    @Column(name = "nombre_comercial", nullable = false)
    private String nombreComercial;

    @Column(name = "plan_suscripcion")
    private String planSuscripcion; // BASICO, PRO, ELITE

    @Column(name = "estado_cuenta")
    @Builder.Default
    private Boolean estadoCuenta = true;

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
