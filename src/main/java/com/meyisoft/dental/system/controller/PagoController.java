package com.meyisoft.dental.system.controller;

import com.meyisoft.dental.system.enums.PagoStatus;
import com.meyisoft.dental.system.models.dto.CitaResumenFinancieroDTO;
import com.meyisoft.dental.system.models.dto.PagoDTO;
import com.meyisoft.dental.system.models.response.ApiResponse;
import com.meyisoft.dental.system.security.UserPrincipal;
import com.meyisoft.dental.system.service.PagoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pagos")
@RequiredArgsConstructor
@Tag(name = "Finanzas", description = "Gestión de pagos y abonos de citas")
public class PagoController {

        private final PagoService service;

        @PostMapping
        @Operation(summary = "Registrar un nuevo abono a una cita")
        public ResponseEntity<ApiResponse<PagoDTO>> registrarPago(
                        @AuthenticationPrincipal UserPrincipal principal,
                        @RequestBody PagoDTO dto) {

                PagoDTO result = service.registrarPago(dto, principal.getTenantId());

                return ResponseEntity.ok(ApiResponse.<PagoDTO>builder()
                                .ok(true)
                                .result(result)
                                .timestamp(OffsetDateTime.now())
                                .build());
        }

        @GetMapping("/cita/{citaId}")
        @Operation(summary = "Obtener el resumen financiero y pagos de una cita específica")
        public ResponseEntity<ApiResponse<CitaResumenFinancieroDTO>> obtenerResumenCita(
                        @AuthenticationPrincipal UserPrincipal principal,
                        @PathVariable UUID citaId) {

                CitaResumenFinancieroDTO result = service.obtenerResumenCita(citaId, principal.getTenantId());

                return ResponseEntity.ok(ApiResponse.<CitaResumenFinancieroDTO>builder()
                                .ok(true)
                                .result(result)
                                .timestamp(OffsetDateTime.now())
                                .build());
        }

        @PutMapping("/{id}/status")
        @Operation(summary = "Actualizar el estado de un pago (Aprobar/Rechazar/Cancelar)")
        public ResponseEntity<ApiResponse<PagoDTO>> actualizarStatus(
                        @AuthenticationPrincipal UserPrincipal principal,
                        @PathVariable UUID id,
                        @RequestParam PagoStatus nuevoStatus,
                        @RequestParam(required = false) String motivo) {

                PagoDTO result = service.actualizarStatus(id, nuevoStatus, motivo, principal.getTenantId());

                return ResponseEntity.ok(ApiResponse.<PagoDTO>builder()
                                .ok(true)
                                .result(result)
                                .timestamp(OffsetDateTime.now())
                                .build());
        }
}
