package com.meyisoft.dental.system.models.request;

import lombok.Data;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
public class ProfileSetupRequest {
    @NotBlank
    @Size(min = 6, max = 6)
    private String newPin;
    
    @NotBlank
    @Email
    private String email;
}
