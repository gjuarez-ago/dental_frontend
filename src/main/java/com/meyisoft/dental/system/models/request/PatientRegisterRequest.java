package com.meyisoft.dental.system.models.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientRegisterRequest {
    @NotBlank(message = "El nombre completo es obligatorio")
    private String nombreCompleto;

    @NotBlank(message = "El teléfono es obligatorio")
    private String telefono;

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Debe ser un email válido")
    private String email;

    @NotBlank(message = "El NIP es obligatorio")
    @Pattern(regexp = "\\d{6}", message = "El NIP debe ser de exactamente 6 dígitos")
    private String nip;

    @NotBlank(message = "El género es obligatorio")
    private String genero;

    // Opcional: si la vista no lo envía, el backend asignará la primera clínica disponible
    private UUID tenantId;
}
