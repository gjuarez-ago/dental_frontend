package com.meyisoft.dental.system.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DisponibilidadDiaDTO {
    private LocalDate fecha;
    private boolean estaLlena;
    private boolean esLaboral;
}
