package com.meyisoft.dental.system.controller.auth;

import com.meyisoft.dental.system.models.request.LoginRequest;
import com.meyisoft.dental.system.models.request.RegisterTenantRequest;
import com.meyisoft.dental.system.models.response.AuthResponse;
import com.meyisoft.dental.system.service.AuthCRMService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthCRMService authCRMService;

    @PostMapping("/crm/login")
    public ResponseEntity<AuthResponse> loginCRM(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authCRMService.loginCRM(request));
    }

}
