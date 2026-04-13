package com.meyisoft.dental.system.controller;

import com.meyisoft.dental.system.enums.AppointmentStatus;
import com.meyisoft.dental.system.models.dto.CitaDTO;
import com.meyisoft.dental.system.models.response.ApiResponse;
import com.meyisoft.dental.system.security.UserPrincipal;
import com.meyisoft.dental.system.service.CitaService;
import com.meyisoft.dental.system.entity.Usuario;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/citas")
@RequiredArgsConstructor
@Tag(name = "Citas", description = "Gestión de la agenda dental")
public class CitaController {

    private final CitaService service;

    @GetMapping
    @Operation(summary = "Listar citas por rango de fechas y sucursal")
    public ResponseEntity<ApiResponse<List<CitaDTO>>> listarCitas(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID sucursalId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime end) {
        
        List<CitaDTO> result = service.listarPorRango(principal.getTenantId(), sucursalId, start, end);
        
        return ResponseEntity.ok(ApiResponse.<List<CitaDTO>>builder()
                .ok(true)
                .result(result)
                .timestamp(OffsetDateTime.now())
                .build());
    }

    @GetMapping("/doctores")
    @Operation(summary = "Listar doctores del tenant")
    public ResponseEntity<ApiResponse<List<Usuario>>> getDoctores(
            @AuthenticationPrincipal UserPrincipal principal) {
        
        List<Usuario> result = service.listarDoctores(principal.getTenantId());
        
        return ResponseEntity.ok(ApiResponse.<List<Usuario>>builder()
                .ok(true)
                .result(result)
                .timestamp(OffsetDateTime.now())
                .build());
    }

    @PostMapping
    @Operation(summary = "Agendar una nueva cita")
    public ResponseEntity<ApiResponse<CitaDTO>> agendarCita(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody CitaDTO dto) {
        
        CitaDTO result = service.agendar(dto, principal.getTenantId());
        
        return ResponseEntity.ok(ApiResponse.<CitaDTO>builder()
                .ok(true)
                .result(result)
                .timestamp(OffsetDateTime.now())
                .build());
    }

    @PatchMapping("/{id}/estado")
    @Operation(summary = "Actualizar el estado de una cita (Confirmar, Llegada, Completada, etc.)")
    public ResponseEntity<ApiResponse<CitaDTO>> actualizarEstado(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam AppointmentStatus estado,
            @RequestParam(required = false) java.math.BigDecimal montoTotal) {
        
        CitaDTO result = service.actualizarEstado(id, estado, montoTotal, principal.getTenantId());
        
        return ResponseEntity.ok(ApiResponse.<CitaDTO>builder()
                .ok(true)
                .result(result)
                .timestamp(OffsetDateTime.now())
                .build());
    }
}
