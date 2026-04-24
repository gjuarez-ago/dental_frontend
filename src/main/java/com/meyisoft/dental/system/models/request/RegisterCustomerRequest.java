package com.meyisoft.dental.system.models.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class RegisterCustomerRequest {
    @NotBlank
    private String fullName;

    @NotBlank
    @Email
    private String email;

    private String phone;

    @NotBlank
    private String password;

    @NotNull
    private UUID tenantId;
}
