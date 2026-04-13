package com.meyisoft.dental.system.entity;

import com.meyisoft.dental.system.enums.UserRole;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "usuarios", uniqueConstraints = {
        @UniqueConstraint(name = "uq_usuarios_phone", columnNames = { "telefono_contacto" })
})
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Usuario {

    @Id
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID tenantId;

    @Column(name = "sucursal_id_principal")
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID sucursalIdPrincipal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole rol; // OWNER, AGENT (Según AGENTS.md)

    @Column(name = "telefono_contacto", nullable = false)
    private String telefonoContacto;

    @Column(name = "email")
    private String email;

    @JsonIgnore
    @Column(name = "nip_hash", nullable = false)
    private String nipHash; // NIP encriptado por Spring Security

    @JsonIgnore
    @Column(name = "requiere_cambio_nip")
    @Builder.Default
    private Boolean requiereCambioNip = true;

    @Column(name = "nombre_completo", nullable = false)
    private String nombreCompleto;

    @Column(name = "cedula_profesional")
    private String cedulaProfesional;

    @Column(name = "fotografia_url")
    private String fotografiaUrl;

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
