package com.meyisoft.dental.system.controller;

import com.meyisoft.dental.system.models.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public/health")
@RequiredArgsConstructor
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public ApiResponse<Map<String, Object>> checkHealth() {
        Map<String, Object> status = new HashMap<>();
        status.put("java_version", System.getProperty("java.version"));
        status.put("status", "UP");
        
        try {
            // Verificamos conexión real a la base de datos
            jdbcTemplate.execute("SELECT 1");
            status.put("database", "CONNECTED");
        } catch (Exception e) {
            status.put("database", "DISCONNECTED");
            status.put("db_error", e.getMessage());
        }

        return ApiResponse.<Map<String, Object>>builder()
                .ok(true)
                .result(status)
                .timestamp(OffsetDateTime.now())
                .build();
    }
}
