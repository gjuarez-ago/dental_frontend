package com.meyisoft.dental.system.models.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterTenantRequest {

    @NotBlank
    private String tenantName;

    @NotBlank
    @Email
    private String adminEmail;

    private String adminPhone;

    @NotBlank
    private String adminFullName;

    @NotBlank
    private String adminPassword;
}
