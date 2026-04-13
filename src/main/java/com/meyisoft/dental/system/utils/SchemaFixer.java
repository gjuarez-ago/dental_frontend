package com.meyisoft.dental.system.utils;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Parche temporal para corregir el esquema de la base de datos (Columnas faltantes en 'pagos').
 * Se puede eliminar una vez que el esquema esté actualizado en producción.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SchemaFixer {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void fixSchema() {
        log.info("Iniciando parche de esquema de base de datos...");
        try {
            // Añadir columna 'status' si no existe
            jdbcTemplate.execute("ALTER TABLE pagos ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'APROBADO' NOT NULL");
            log.info("Columna 'status' verificada/añadida.");

            // Añadir columna 'motivo_rechazo' si no existe
            jdbcTemplate.execute("ALTER TABLE pagos ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT");
            log.info("Columna 'motivo_rechazo' verificada/añadida.");

            log.info("Parche de esquema completado con éxito.");
        } catch (Exception e) {
            log.error("Error al aplicar el parche de esquema: {}", e.getMessage());
        }
    }
}
