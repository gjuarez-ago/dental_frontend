package com.meyisoft.dental.system.models.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientCheckRequest {
    @NotBlank(message = "El teléfono es obligatorio")
    private String telefono;
}
