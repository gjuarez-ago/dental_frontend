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
@Table(name = "empresas")
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class Empresa extends BaseEntity {

    @Column(name = "nombre_comercial", nullable = false)
    private String nombreComercial;

    @Column(name = "plan_suscripcion")
    private String planSuscripcion; // BASICO, PRO, ELITE

    @Column(name = "estado_cuenta")
    @Builder.Default
    private Boolean estadoCuenta = true;
}
