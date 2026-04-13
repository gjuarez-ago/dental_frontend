package com.meyisoft.dental.system.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

import java.time.LocalDate;
import java.math.BigDecimal;

@Data
@Entity
@Table(name = "pacientes")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = true)
public class Paciente extends BaseEntity {

    @Column(name = "nombre_completo", nullable = false)
    private String nombreCompleto;

    @Column(name = "fecha_nacimiento")
    private LocalDate fechaNacimiento;

    @Column(name = "telefono")
    private String telefono;

    @Column(name = "email")
    private String email;

    @Column(name = "genero")
    private String genero; // MASCULINO, FEMENINO, OTRO

    @Column(name = "curp")
    private String curp;

    @Column(name = "direccion")
    private String direccion;

    @Column(name = "ocupacion")
    private String ocupacion;

    @Column(name = "alergias", columnDefinition = "TEXT")
    private String alergias;

    @Column(name = "enfermedades_cronicas", columnDefinition = "TEXT")
    private String enfermedadesCronicas;

    @Column(name = "medicamentos_actuales", columnDefinition = "TEXT")
    private String medicamentosActuales;

    @Column(name = "emergencia_nombre")
    private String emergenciaNombre;

    @Column(name = "emergencia_telefono")
    private String emergenciaTelefono;

    @Column(name = "tipo_sangre")
    private String tipoSangre;

    @Column(name = "notas_clinicas", columnDefinition = "TEXT")
    private String notasClinicas;

    @Column(name = "saldo_pendiente", nullable = false, precision = 19, scale = 2)
    @Builder.Default
    private BigDecimal saldoPendiente = BigDecimal.ZERO;

    @Column(name = "expediente_completo", nullable = false)
    @Builder.Default
    private Boolean expedienteCompleto = false;
}
