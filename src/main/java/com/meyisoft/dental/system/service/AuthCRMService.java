package com.meyisoft.dental.system.service;

import com.meyisoft.dental.system.entity.Empresa;
import com.meyisoft.dental.system.entity.Usuario;
import com.meyisoft.dental.system.models.request.LoginRequest;
import com.meyisoft.dental.system.models.request.RegisterTenantRequest;
import com.meyisoft.dental.system.models.response.AuthResponse;
import com.meyisoft.dental.system.repository.EmpresaRepository;
import com.meyisoft.dental.system.repository.UsuarioRepository;
import com.meyisoft.dental.system.repository.PacienteRepository;
import com.meyisoft.dental.system.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.meyisoft.dental.system.exception.BusinessException;
import com.meyisoft.dental.system.exception.ErrorCodes;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthCRMService {

    private final EmpresaRepository empresaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PacienteRepository pacienteRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public AuthResponse registerTenant(RegisterTenantRequest request) {
        // Registro deshabilitado temporalmente para el sistema de gimnasios
        throw new RuntimeException("El registro público está deshabilitado. Contacte al administrador.");
    }

    public AuthResponse loginCRM(LoginRequest request) {
        // 1. Intentar como Usuario (Personal Clínico)
        var usuarioOpt = usuarioRepository.findByTelefonoContactoAndActive(request.getUser());
        
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            if (!passwordEncoder.matches(request.getNip(), usuario.getNipHash())) {
                throw new BusinessException(ErrorCodes.AUTH_INVALID_CREDENTIALS, "Credenciales inválidas", HttpStatus.UNAUTHORIZED);
            }
            return AuthResponse.builder()
                    .token(jwtUtil.generateTokenForCRM(usuario.getId(), usuario.getTenantId(), usuario.getRol(), usuario.getSucursalIdPrincipal()))
                    .user(usuario)
                    .build();
        }

        // 2. Intentar como Paciente (Fallback global)
        var pacienteOpt = pacienteRepository.findFirstByTelefonoAndRegBorrado(request.getUser(), 1);
        if (pacienteOpt.isPresent()) {
            var paciente = pacienteOpt.get();
            if (!passwordEncoder.matches(request.getNip(), paciente.getPinHash())) {
                throw new BusinessException(ErrorCodes.AUTH_INVALID_CREDENTIALS, "PIN inválido", HttpStatus.UNAUTHORIZED);
            }
            
            return AuthResponse.builder()
                    .token(jwtUtil.generateTokenForPatient(paciente.getId(), paciente.getTelefono(), paciente.getEmail()))
                    .user(paciente)
                    .build();
        }

        throw new BusinessException(ErrorCodes.USER_NOT_FOUND, ErrorCodes.MSG_USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
}
