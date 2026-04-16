package com.meyisoft.dental.system.config;

import com.meyisoft.dental.system.entity.Empresa;
import com.meyisoft.dental.system.entity.Sucursal;
import com.meyisoft.dental.system.entity.Usuario;
import com.meyisoft.dental.system.enums.UserRole;
import com.meyisoft.dental.system.repository.EmpresaRepository;
import com.meyisoft.dental.system.repository.SucursalRepository;
import com.meyisoft.dental.system.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final EmpresaRepository empresaRepository;
    private final SucursalRepository sucursalRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        UUID tenantId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

        if (empresaRepository.existsById(tenantId) || usuarioRepository.findByTelefonoContactoAndActive("9991234567").isPresent()) {
            log.info("Los datos de prueba de Sarai ya existen en el sistema. Saltando inicialización.");
            return;
        }

        log.info("Cargando datos iniciales de prueba...");

        // 1. Crear Empresa (Tenant)
        Empresa empresa = Empresa.builder()
                .id(tenantId)
                .nombreComercial("Sarai Rios - Dental Studio")
                .planSuscripcion("ELITE")
                .build();
        empresaRepository.save(empresa);

        // 2. Crear Sucursal
        UUID sucursalId = UUID.fromString("550e8400-e29b-41d4-a716-446655440001");
        Sucursal sucursal = Sucursal.builder()
                .id(sucursalId)
                .tenantId(tenantId)
                .nombreSucursal("Matriz Centro")
                .horariosLaborales("{" +
                    "\"monday\": {\"active\": true, \"startTime\": \"09:00\", \"endTime\": \"20:00\"}," +
                    "\"tuesday\": {\"active\": true, \"startTime\": \"09:00\", \"endTime\": \"20:00\"}," +
                    "\"wednesday\": {\"active\": true, \"startTime\": \"09:00\", \"endTime\": \"20:00\"}," +
                    "\"thursday\": {\"active\": true, \"startTime\": \"09:00\", \"endTime\": \"20:00\"}," +
                    "\"friday\": {\"active\": true, \"startTime\": \"09:00\", \"endTime\": \"20:00\"}," +
                    "\"saturday\": {\"active\": true, \"startTime\": \"09:00\", \"endTime\": \"14:00\"}," +
                    "\"sunday\": {\"active\": false}" +
                    "}")
                .build();
        sucursalRepository.save(sucursal);

        // NIP común para pruebas
        String commonNipHash = passwordEncoder.encode("1234");

        // 3. Crear Usuarios
        
        // Sarai Rios (OWNER)
        Usuario sarai = Usuario.builder()
                .id(UUID.fromString("550e8400-e29b-41d4-a716-446655440002"))
                .tenantId(tenantId)
                .sucursalIdPrincipal(sucursalId)
                .rol(UserRole.OWNER)
                .telefonoContacto("9991234567")
                .nipHash(commonNipHash)
                .nombreCompleto("Sarai Rios")
                .requiereCambioNip(false)
                .build();
        usuarioRepository.save(sarai);

        // Dr. Julián Galavis (DOCTOR)
        Usuario julian = Usuario.builder()
                .id(UUID.fromString("550e8400-e29b-41d4-a716-446655440003"))
                .tenantId(tenantId)
                .sucursalIdPrincipal(sucursalId)
                .rol(UserRole.DOCTOR)
                .telefonoContacto("9997654321")
                .nipHash(commonNipHash)
                .nombreCompleto("Dr. Julián Galavis")
                .cedulaProfesional("MED-JG-1234567")
                .requiereCambioNip(true)
                .build();
        usuarioRepository.save(julian);

        // Elena Ruiz (RECEPTIONIST)
        Usuario elena = Usuario.builder()
                .id(UUID.fromString("550e8400-e29b-41d4-a716-446655440004"))
                .tenantId(tenantId)
                .sucursalIdPrincipal(sucursalId)
                .rol(UserRole.RECEPTIONIST)
                .telefonoContacto("9990001122")
                .nipHash(commonNipHash)
                .nombreCompleto("Elena Ruiz")
                .requiereCambioNip(false)
                .build();
        usuarioRepository.save(elena);

        log.info("Datos iniciales cargados exitosamente. NIP por defecto: 1234");
    }
}
