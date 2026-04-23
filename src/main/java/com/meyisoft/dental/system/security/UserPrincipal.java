package com.meyisoft.dental.system.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPrincipal {
    private UUID userId;
    private UUID tenantId;
    private UUID sucursalId;
    private String role;
    private String telefono;
    private String email;
}
