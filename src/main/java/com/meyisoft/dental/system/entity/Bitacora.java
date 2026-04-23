package com.meyisoft.dental.system.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "bitacora", indexes = {
        @Index(name = "idx_bitacora_tenant", columnList = "tenant_id"),
        @Index(name = "idx_bitacora_fecha", columnList = "created_at"),
        @Index(name = "idx_bitacora_modulo", columnList = "modulo")
})
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class Bitacora extends BaseEntity {

    @Column(name = "usuario_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID usuarioId; // Quien realiza la acción

    @Column(nullable = false)
    private String modulo; // Ejemplo: USUARIOS, CITAS, PAGOS

    @Column(nullable = false)
    private String accion; // Ejemplo: DESHABILITAR, CREAR, ACTUALIZAR

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(name = "entidad_relacionada_id")
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID entidadRelacionadaId;
}
