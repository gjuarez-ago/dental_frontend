package com.meyisoft.dental.system.exception;

public final class ErrorCodes {

    private ErrorCodes() {
    }

    // Errores de Cliente (CLIENT-XXX)
    public static final String CLIENT_NOT_FOUND = "CLIENT-001";
    public static final String CLIENT_PHONE_ALREADY_REGISTERED = "CLIENT-002";

    // Errores de Pedidos (ORDER-XXX)
    public static final String ORDER_NOT_FOUND = "ORDER-001";
    public static final String ORDER_ALREADY_ACTIVE = "ORDER-002"; // El famoso "Candado"
    public static final String ORDER_INVALID_TRANSITION = "ORDER-003"; // Ej: Pasar de POR_ACEPTAR a ENTREGADO de golpe
    public static final String ORDER_CANNOT_BE_CANCELLED = "ORDER-004"; // Ya está en cocina

    // Errores de Menú e Inventario (MENU-XXX)
    public static final String MENU_PRODUCT_NOT_FOUND = "MENU-001";
    public static final String MENU_PRODUCT_OUT_OF_STOCK = "MENU-002"; // Se acabó el pastor
    public static final String MENU_VARIANT_NOT_FOUND = "MENU-003";

    // Errores de Promociones (PROMO-XXX)
    public static final String PROMO_NOT_FOUND = "PROMO-001";
    public static final String PROMO_EXPIRED = "PROMO-002";
    public static final String PROMO_NOT_APPLICABLE = "PROMO-003";

    // Errores de Autenticación para el Admin (AUTH-XXX)
    public static final String AUTH_INVALID_CREDENTIALS = "AUTH-001";
    public static final String AUTH_TOKEN_EXPIRED = "AUTH-002";
    public static final String AUTH_UNAUTHORIZED = "AUTH-004";

    // ============================================
    // Mensajes descriptivos
    // ============================================

    // Cliente
    public static final String MSG_CLIENT_NOT_FOUND = "Cliente no encontrado";

    // Pedidos
    public static final String MSG_ORDER_NOT_FOUND = "El pedido solicitado no existe";
    public static final String MSG_ORDER_ALREADY_ACTIVE = "Ya tienes un pedido en curso. No puedes crear otro hasta que finalice.";
    public static final String MSG_ORDER_INVALID_TRANSITION = "No puedes cambiar el pedido a este estado desde su estado actual.";
    public static final String MSG_ORDER_CANNOT_BE_CANCELLED = "El pedido ya se está preparando y no puede ser cancelado.";

    // Menú e Inventario
    public static final String MSG_MENU_PRODUCT_NOT_FOUND = "El producto seleccionado ya no existe en el menú.";
    public static final String MSG_MENU_PRODUCT_OUT_OF_STOCK = "Lo sentimos, el producto '%s' se ha agotado.";
    public static final String MSG_MENU_VARIANT_NOT_FOUND = "La opción seleccionada no está disponible.";

    // Promociones
    public static final String MSG_PROMO_NOT_FOUND = "El código de promoción no existe.";
    public static final String MSG_PROMO_EXPIRED = "Esta promoción ya ha expirado.";
    public static final String MSG_PROMO_NOT_APPLICABLE = "Esta promoción no aplica para los productos en tu carrito.";
    public static final String USER_NOT_FOUND = "USER-001";
    public static final String MSG_USER_NOT_FOUND = "Usuario no encontrado";
}
