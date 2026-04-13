package com.meyisoft.dental.system.models.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * Clase genérica para respuestas unificadas según AGENTS.md
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    @Builder.Default
    private boolean ok = true;

    private T result;

    private String errorCode;

    private String userMessage;

    @Builder.Default
    private OffsetDateTime timestamp = OffsetDateTime.now();

    /**
     * Crea una respuesta exitosa
     */
    public static <T> ApiResponse<T> success(T result) {
        return ApiResponse.<T>builder()
                .ok(true)
                .result(result)
                .build();
    }

    /**
     * Crea una respuesta de error
     */
    public static <T> ApiResponse<T> error(String errorCode, String userMessage) {
        return ApiResponse.<T>builder()
                .ok(false)
                .errorCode(errorCode)
                .userMessage(userMessage)
                .build();
    }
}
