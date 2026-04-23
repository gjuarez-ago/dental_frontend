package com.meyisoft.dental.system.service;

import com.meyisoft.dental.system.entity.Empresa;
import com.meyisoft.dental.system.entity.Paciente;
import com.meyisoft.dental.system.exception.BusinessException;
import com.meyisoft.dental.system.exception.ErrorCodes;
import com.meyisoft.dental.system.models.request.PatientCheckRequest;
import com.meyisoft.dental.system.models.request.PatientCompleteProfileRequest;
import com.meyisoft.dental.system.models.request.PatientRegisterRequest;
import com.meyisoft.dental.system.models.response.AuthResponse;
import com.meyisoft.dental.system.models.response.PatientCheckResponse;
import com.meyisoft.dental.system.repository.EmpresaRepository;
import com.meyisoft.dental.system.repository.PacienteRepository;
import com.meyisoft.dental.system.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PatientAuthService {

    private final PacienteRepository pacienteRepository;
    private final EmpresaRepository empresaRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional(readOnly = true)
    public PatientCheckResponse checkPatientPhone(PatientCheckRequest request) {
        var pacientes = pacienteRepository.findAllByTelefonoAndRegBorrado(request.getTelefono(), 1);

        if (pacientes.isEmpty()) {
            return PatientCheckResponse.builder()
                    .status("NOT_FOUND")
                    .message("No existe un paciente con ese número.")
                    .build();
        }

        // Un paciente solo está verificado si ya cambió su PIN inicial Y verificó su email
        boolean isVerified = pacientes.stream().anyMatch(
                p -> Boolean.TRUE.equals(p.getPinCambiado()) && Boolean.TRUE.equals(p.getEmailVerificado()));

        return PatientCheckResponse.builder()
                .status(isVerified ? "EXISTS_VERIFIED" : "EXISTS_UNVERIFIED")
                .message(isVerified ? "Paciente verificado." : "Requiere completar perfil.")
                .build();
    }

    @Transactional
    public AuthResponse completeProfile(PatientCompleteProfileRequest request) {
        List<Paciente> vinculados = pacienteRepository.findAllByTelefonoAndRegBorrado(request.getTelefono(), 1);

        if (vinculados.isEmpty()) {
            throw new BusinessException(ErrorCodes.USER_NOT_FOUND, "El paciente no existe.", HttpStatus.NOT_FOUND);
        }

        String hashedPin = passwordEncoder.encode(request.getNip());

        // Actualizamos todos los perfiles asociados a este teléfono (Sincronización
        // global)
        Paciente pacientePrincipal = vinculados.get(0);
        for (Paciente p : vinculados) {
            p.setEmail(request.getEmail());
            p.setGenero(request.getGenero());
            p.setPinHash(hashedPin);
            p.setPinCambiado(true);
            p.setEmailVerificado(true);
            pacienteRepository.save(p);
        }

        // Generamos el token usando el primero encontrado
        return AuthResponse.builder()
                .token(jwtUtil.generateTokenForPatient(pacientePrincipal.getId(), pacientePrincipal.getTelefono(),
                        pacientePrincipal.getEmail()))
                .user(pacientePrincipal)
                .build();
    }

    @Transactional
    public AuthResponse register(PatientRegisterRequest request) {
        // Verificar si ya existe globalmente
        var existente = pacienteRepository.findAllByTelefonoAndRegBorrado(request.getTelefono(), 1);
        if (!existente.isEmpty()) {
            throw new BusinessException("TELEFONO_DUPLICADO", "Este número ya está registrado. Intente iniciar sesión.",
                    HttpStatus.BAD_REQUEST);
        }

        UUID assignedTenantId = request.getTenantId();

        // Si no envía TenantId, intentamos asignar la clínica por defecto para que no
        // quede huérfano
        if (assignedTenantId == null) {
            assignedTenantId = empresaRepository.findAll().stream()
                    .findFirst()
                    .map(Empresa::getId)
                    .orElseThrow(() -> new BusinessException("CLINICA_NO_ENCONTRADA",
                            "No hay clínicas registradas en el sistema para asociar al paciente.",
                            HttpStatus.INTERNAL_SERVER_ERROR));
        }

        Paciente nuevoPaciente = Paciente.builder()
                .nombreCompleto(request.getNombreCompleto())
                .telefono(request.getTelefono())
                .email(request.getEmail())
                .genero(request.getGenero())
                .pinHash(passwordEncoder.encode(request.getNip()))
                .pinCambiado(true)
                .emailVerificado(true)
                .build();

        nuevoPaciente.setId(UUID.randomUUID());
        nuevoPaciente.setTenantId(assignedTenantId);
        nuevoPaciente.setRegBorrado(1);

        pacienteRepository.save(nuevoPaciente);

        return AuthResponse.builder()
                .token(jwtUtil.generateTokenForPatient(nuevoPaciente.getId(), nuevoPaciente.getTelefono(),
                        nuevoPaciente.getEmail()))
                .user(nuevoPaciente)
                .build();
    }
}
