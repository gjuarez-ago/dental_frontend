package com.meyisoft.dental.system.enums;

/**
 * Representa los estados posibles de un registro de pago/abono.
 */
public enum PagoStatus {
    /**
     * El pago está pendiente de que el personal valide el comprobante (ej.
     * Transferencia)
     */
    PENDIENTE_REVISION,

    /** Pago verificado y confirmado. Cuenta para el saldo del paciente. */
    APROBADO,

    /** El comprobante fue rechazado por el personal administrativo */
    RECHAZADO,

    /** El pago fue cancelado por el usuario o personal antes de procesarse */
    CANCELADO
}
