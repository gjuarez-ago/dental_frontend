package com.meyisoft.dental.system.enums;

/**
 * Representa el estado financiero (de cobro) de una cita dental.
 */
public enum TicketStatus {
    /** Cita terminada pero el costo final no ha sido capturado aún */
    POR_DEFINIR,

    /** Existe al menos un pago en espera de validación de comprobante */
    EN_REVISION,
    
    /** El costo está definido pero no se ha recibido ningún pago confirmado */
    PENDIENTE,
    
    /** Se han recibido pagos parciales pero hay saldo deudor */
    ABONADO,
    
    /** La cuenta ha sido pagada al 100% */
    LIQUIDADO,
    
    /** Marcado explícitamente como sin cargo (Cortesía) */
    CORTESIA
}
