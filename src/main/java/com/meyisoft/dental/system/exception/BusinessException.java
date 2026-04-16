package com.meyisoft.dental.system.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final String code;
    private final HttpStatus status;
    private final Object[] args;

    // Constructor completo
    public BusinessException(String code, String message, HttpStatus status, Object... args) {
        super(message);
        this.code = code;
        this.status = status;
        this.args = args;
    }

    // Constructor simplificado sin argumentos variables
    public BusinessException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
        this.args = new Object[0];
    }

    // Constructor de compatibilidad (default to 400 BAD_REQUEST)
    public BusinessException(String code, String message) {
        this(code, message, HttpStatus.BAD_REQUEST);
    }
}
