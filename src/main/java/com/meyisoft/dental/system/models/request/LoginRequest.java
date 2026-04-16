package com.meyisoft.dental.system.models.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    private String user;

    @NotBlank
    private String nip;
}
