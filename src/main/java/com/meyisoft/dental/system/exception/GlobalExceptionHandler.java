package com.meyisoft.dental.system.exception;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import com.meyisoft.dental.system.models.response.ApiResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // ============================
    // ERROR 400 - BAD REQUEST (VALIDACIÓN)
    // ============================

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .ok(false)
                .errorCode("VALIDATION_ERROR")
                .userMessage("Error de validación en los campos enviados")
                .result(errors)
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // ============================
    // MANEJO DE ERRORES DE NEGOCIO
    // ============================

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(
            BusinessException ex) {

        String message = ex.getMessage();
        if (ex.getArgs() != null && ex.getArgs().length > 0) {
            message = String.format(ex.getMessage(), ex.getArgs());
        }

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .ok(false)
                .errorCode(ex.getCode())
                .userMessage(message)
                .build();

        return new ResponseEntity<>(response, ex.getStatus());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalStateException(
            IllegalStateException ex) {

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .ok(false)
                .errorCode("ILLEGAL_STATE")
                .userMessage(ex.getMessage())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(
            IllegalArgumentException ex) {

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .ok(false)
                .errorCode("ILLEGAL_ARGUMENT")
                .userMessage(ex.getMessage())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // ============================
    // ERROR 500 - INTERNAL SERVER ERROR
    // ============================

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleAllUncaughtException(
            Exception ex) {

        // Log del error para depuración
        ex.printStackTrace();

        ApiResponse<Void> response = ApiResponse.<Void>builder()
                .ok(false)
                .errorCode("INTERNAL_ERROR")
                .userMessage("Ha ocurrido un error inesperado en el servidor")
                .build();

        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
