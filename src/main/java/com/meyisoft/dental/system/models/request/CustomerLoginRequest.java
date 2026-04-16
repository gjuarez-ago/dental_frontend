package com.meyisoft.dental.system.models.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CustomerLoginRequest {
    @NotBlank
    private String identifier; // email or phone

    @NotBlank
    private String password;

    @NotNull
    private UUID tenantId;
}
