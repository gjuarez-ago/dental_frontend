package com.meyisoft.dental.system.service;

import com.meyisoft.dental.system.entity.Usuario;
import com.meyisoft.dental.system.enums.UserRole;
import com.meyisoft.dental.system.config.AuditAction;
import com.meyisoft.dental.system.exception.BusinessException;
import com.meyisoft.dental.system.models.request.UsuarioRequest;
import com.meyisoft.dental.system.models.response.UsuarioResponse;
import com.meyisoft.dental.system.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UsuarioResponse> listarUsuariosPorSucursal(UUID tenantId, UUID sucursalId) {
        return usuarioRepository.findByTenantIdAndSucursalIdPrincipalAndRegBorrado(tenantId, sucursalId, 1)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    @AuditAction(modulo = "USUARIOS", accion = "CREAR", descripcion = "Registro de nuevo integrante al equipo")
    public UsuarioResponse crearUsuario(UsuarioRequest request, UUID tenantId, UserRole callerRole) {
        // 1. Validar que solo el OWNER pueda crear usuarios
        if (callerRole != UserRole.OWNER && callerRole != UserRole.SUPER_ADMIN) {
            throw new BusinessException("SOLO_OWNER_PUEDE_CREAR", "Solo el propietario puede crear nuevos usuarios.");
        }

        // 2. Validar longitud del NIP
        if (request.getNip() == null || request.getNip().length() != 6 || !request.getNip().matches("\\d+")) {
            throw new BusinessException("NIP_INVALIDO", "El NIP debe ser exactamente de 6 dígitos numéricos.");
        }

        // 3. Validar límites por rol
        if (request.getRol() == UserRole.OWNER) {
            throw new BusinessException("DUENO_UNICO", "El sistema solo permite un dueño único por clínica.");
        }

        if (request.getRol() == UserRole.DOCTOR) {
            long doctorCount = usuarioRepository.countByTenantIdAndRolAndRegBorrado(tenantId, UserRole.DOCTOR, 1);
            if (doctorCount >= 3) {
                throw new BusinessException("LIMITE_DOCTORES_EXCEDIDO",
                        "Se ha alcanzado el límite máximo de 3 doctores permitidos por sucursal.");
            }
        } else if (request.getRol() == UserRole.RECEPTIONIST) {
            long receptionistCount = usuarioRepository.countByTenantIdAndRolAndRegBorrado(tenantId,
                    UserRole.RECEPTIONIST, 1);
            if (receptionistCount >= 1) {
                throw new BusinessException("LIMITE_RECEPCIONISTA_EXCEDIDO",
                        "Ya existe un recepcionista registrado. Su plan solo permite 1.");
            }
        }

        // 4. Validar verificación clínica obligatoria para Doctores
        if (request.getRol() == UserRole.DOCTOR && Boolean.FALSE.equals(request.getEsPersonalClinico())) {
            throw new BusinessException("VERIFICACION_CLINICA_REQUERIDA",
                    "Es obligatorio certificar la idoneidad clínica para el rol de Doctor.");
        }

        // 5. Validar teléfono duplicado
        usuarioRepository.findByTelefonoContactoAndActive(request.getTelefonoContacto())
                .ifPresent(u -> {
                    throw new BusinessException("TELEFONO_DUPLICADO",
                            "Ya existe un usuario con este número de teléfono.");
                });

        // 5. Crear entidad
        Usuario usuario = Usuario.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .sucursalIdPrincipal(request.getSucursalId())
                .nombreCompleto(request.getNombreCompleto())
                .telefonoContacto(request.getTelefonoContacto())
                .email(request.getEmail())
                .rol(request.getRol())
                .cedulaProfesional(request.getCedulaProfesional())
                .fotografiaUrl(request.getFotografiaUrl())
                .esPersonalClinico(request.getEsPersonalClinico() != null && request.getEsPersonalClinico())
                .nipHash(passwordEncoder.encode(request.getNip()))
                .requiereCambioNip(true) // Obligar a cambio de NIP
                .regBorrado(1)
                .build();

        return mapToResponse(usuarioRepository.save(usuario));
    }

    @Transactional
    @AuditAction(modulo = "USUARIOS", accion = "ACTUALIZAR", descripcion = "Actualización de datos de perfil")
    public UsuarioResponse actualizarUsuario(UUID id, UsuarioRequest request, UUID tenantId) {
        Usuario usuario = usuarioRepository.findById(id)
                .filter(u -> u.getTenantId().equals(tenantId) && u.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("USUARIO_NO_ENCONTRADO",
                        "El usuario no existe o ha sido eliminado."));

        usuario.setNombreCompleto(request.getNombreCompleto());
        usuario.setEmail(request.getEmail());
        usuario.setCedulaProfesional(request.getCedulaProfesional());
        usuario.setFotografiaUrl(request.getFotografiaUrl());
        usuario.setEsPersonalClinico(request.getEsPersonalClinico() != null && request.getEsPersonalClinico());

        // Validar verificación clínica obligatoria tras actualización
        if (usuario.getRol() == UserRole.DOCTOR && Boolean.FALSE.equals(usuario.getEsPersonalClinico())) {
            throw new BusinessException("VERIFICACION_CLINICA_REQUERIDA",
                    "Es obligatorio certificar la idoneidad clínica para el rol de Doctor.");
        }

        // Si se envía el NIP, validar y actualizar
        if (request.getNip() != null && !request.getNip().isEmpty()) {
            if (request.getNip().length() != 6 || !request.getNip().matches("\\d+")) {
                throw new BusinessException("NIP_INVALIDO", "El NIP debe ser exactamente de 6 dígitos numéricos.");
            }
            usuario.setNipHash(passwordEncoder.encode(request.getNip()));
            usuario.setRequiereCambioNip(true);
        }

        return mapToResponse(usuarioRepository.save(usuario));
    }

    @Transactional
    @AuditAction(modulo = "USUARIOS", accion = "DESHABILITAR", descripcion = "Deshabilitación manual de usuario")
    public void eliminarUsuario(UUID id, UUID tenantId) {
        Usuario usuario = usuarioRepository.findById(id)
                .filter(u -> u.getTenantId().equals(tenantId) && u.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("USUARIO_NO_ENCONTRADO",
                        "El usuario no existe o ya ha sido deshabilitado."));

        // Protección: No se puede deshabilitar al OWNER
        if (usuario.getRol() == UserRole.OWNER) {
            throw new BusinessException("OPERACION_NO_PERMITIDA",
                    "No es posible deshabilitar al propietario principal de la clínica.");
        }

        usuario.setRegBorrado(0); // Deshabilitar (Soft delete)
        usuarioRepository.save(usuario);
    }

    private UsuarioResponse mapToResponse(Usuario usuario) {
        return UsuarioResponse.builder()
                .id(usuario.getId())
                .nombreCompleto(usuario.getNombreCompleto())
                .telefonoContacto(usuario.getTelefonoContacto())
                .email(usuario.getEmail())
                .rol(usuario.getRol())
                .cedulaProfesional(usuario.getCedulaProfesional())
                .fotografiaUrl(usuario.getFotografiaUrl())
                .esPersonalClinico(usuario.getEsPersonalClinico())
                .sucursalIdPrincipal(usuario.getSucursalIdPrincipal())
                .requiereCambioNip(usuario.getRequiereCambioNip())
                .createdAt(usuario.getCreatedAt())
                .build();
    }
}
