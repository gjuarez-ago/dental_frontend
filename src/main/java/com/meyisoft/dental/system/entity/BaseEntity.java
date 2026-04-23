package com.meyisoft.dental.system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PreUpdate;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Superclase para estandarizar el aislamiento multi-tenant y la auditoría.
 */
@Getter
@Setter
@MappedSuperclass
@SuperBuilder
@NoArgsConstructor
public abstract class BaseEntity {

    @Id
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID tenantId;

    /** Soft-delete flag (1: activo, 0: eliminado) */
    @Column(name = "reg_borrado", nullable = false)
    @Builder.Default
    private Integer regBorrado = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private OffsetDateTime updatedAt = OffsetDateTime.now(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
    }
}
