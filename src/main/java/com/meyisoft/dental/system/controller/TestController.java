package com.meyisoft.dental.system.controller;

import com.meyisoft.dental.system.models.response.ApiResponse;
import com.meyisoft.dental.system.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/test")
@RequiredArgsConstructor
public class TestController {

    private final NotificationService notificationService;

    @GetMapping("/notification")
    public ApiResponse<String> testNotification(
            @RequestParam String email,
            @RequestParam String phone,
            @RequestParam String message) {

        notificationService.sendGlobalNotification(email, phone, "Prueba de Notificación Dental", message);

        return ApiResponse.success("Notificación en proceso de envío (Asíncrona)");
    }
}
