package com.meyisoft.dental.system.models.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientCheckResponse {
    private String status; // EXISTS_VERIFIED, EXISTS_UNVERIFIED, NOT_FOUND
    private String message;
}
