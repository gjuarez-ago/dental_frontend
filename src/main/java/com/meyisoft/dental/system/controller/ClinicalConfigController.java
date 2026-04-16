package com.meyisoft.dental.system.controller;

import com.meyisoft.dental.system.models.dto.ClinicalConfigDTO;
import com.meyisoft.dental.system.models.response.ApiResponse;
import com.meyisoft.dental.system.service.ClinicalConfigService;
import lombok.RequiredArgsConstructor;
import com.meyisoft.dental.system.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clinical-config")
@RequiredArgsConstructor
public class ClinicalConfigController {

    private final ClinicalConfigService clinicalConfigService;

    /**
     * Obtiene la configuración operativa del consultorio para el usuario autenticado.
     */
    @GetMapping
    public ApiResponse<ClinicalConfigDTO> getMapping(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID sucursalId) {
        ClinicalConfigDTO config = clinicalConfigService.getClinicalConfig(principal.getUserId(), sucursalId);
        return ApiResponse.success(config);
    }

    /**
     * Actualiza la identidad profesional y los horarios laborales del consultorio.
     */
    @PutMapping
    public ApiResponse<Void> updateMapping(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID sucursalId,
            @RequestBody ClinicalConfigDTO dto) {
        clinicalConfigService.updateClinicalConfig(principal.getUserId(), sucursalId, dto);
        return ApiResponse.success(null);
    }
}
