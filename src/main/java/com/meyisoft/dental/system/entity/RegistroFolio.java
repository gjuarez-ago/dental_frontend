package com.meyisoft.dental.system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Data
@Entity
@Table(name = "registro_folios", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"tenant_id", "tipo", "fecha"})
})
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class RegistroFolio extends BaseEntity {

    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo; // CITA, VENTA, PAGO

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "ultimo_numero", nullable = false)
    private Integer ultimoNumero;
}
