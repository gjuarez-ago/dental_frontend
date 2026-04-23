package com.meyisoft.dental.system.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Anotación para marcar métodos que deben ser auditados automáticamente en la Bitácora.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface AuditAction {
    /**
     * Módulo del sistema (ej: "USUARIOS", "CITAS", "PAGOS")
     */
    String modulo();

    /**
     * Acción realizada (ej: "DESHABILITAR", "CREAR", "CANCELAR")
     */
    String accion();

    /**
     * Descripción opcional del evento.
     */
    String descripcion() default "";
}
