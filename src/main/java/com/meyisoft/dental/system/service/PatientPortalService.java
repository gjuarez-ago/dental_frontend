package com.meyisoft.dental.system.service;

import com.meyisoft.dental.system.entity.Cita;
import com.meyisoft.dental.system.entity.Empresa;
import com.meyisoft.dental.system.entity.Paciente;
import com.meyisoft.dental.system.entity.Pago;
import com.meyisoft.dental.system.entity.Sucursal;
import com.meyisoft.dental.system.enums.AppointmentStatus;
import com.meyisoft.dental.system.enums.PagoStatus;
import com.meyisoft.dental.system.models.dto.CitaDTO;
import com.meyisoft.dental.system.models.dto.CitaPatientDTO;
import com.meyisoft.dental.system.models.request.PatientBookRequest;
import com.meyisoft.dental.system.repository.*;
import com.meyisoft.dental.system.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PatientPortalService {

    private final PacienteRepository pacienteRepository;
    private final CitaRepository citaRepository;
    private final EmpresaRepository empresaRepository;
    private final SucursalRepository sucursalRepository;
    private final ServicioDentalRepository servicioRepository;
    private final PagoRepository pagoRepository;
    private final PasswordEncoder passwordEncoder;
    private final CitaService citaService; // Para reutilizar lógica de cancelación
    private final StorageService storageService;

    @Transactional(readOnly = true)
    public List<CitaPatientDTO> getMyAppointments(String telefono, String email) {
        log.info("Consultando citas globales para paciente: {} / {}", telefono, email);
        
        // 1. Buscar todos los registros de paciente que coincidan con teléfono o email en toda la red
        List<Paciente> pacientes = new ArrayList<>();
        if (telefono != null) {
            pacientes.addAll(pacienteRepository.findAllByTelefonoAndRegBorrado(telefono, 1));
        }
        if (email != null) {
            // Evitar duplicados si el teléfono y el email traen el mismo registro
            List<Paciente> porEmail = pacienteRepository.findAllByEmailAndRegBorrado(email, 1);
            for (Paciente p : porEmail) {
                if (pacientes.stream().noneMatch(existing -> existing.getId().equals(p.getId()))) {
                    pacientes.add(p);
                }
            }
        }

        // 2. Por cada paciente encontrado, obtener sus citas
        List<CitaPatientDTO> todasLasCitas = new ArrayList<>();
        
        for (Paciente p : pacientes) {
            List<Cita> citas = citaRepository.findByPacienteIdAndRegBorrado(p.getId(), 1);
            for (Cita c : citas) {
                todasLasCitas.add(mapToPatientDTO(c, p.getTenantId()));
            }
        }

        // 3. Ordenar por fecha (descendente, las más próximas/recientes primero)
        return todasLasCitas.stream()
                .sorted((c1, c2) -> c2.getFechaHora().compareTo(c1.getFechaHora()))
                .collect(Collectors.toList());
    }

    private CitaPatientDTO mapToPatientDTO(Cita cita, UUID tenantId) {
        Empresa empresa = empresaRepository.findById(tenantId).orElse(null);
        Sucursal sucursal = sucursalRepository.findById(cita.getSucursalId()).orElse(null);
        var servicio = servicioRepository.findById(cita.getServicioId()).orElse(null);
        
        // Cálculo financiero en tiempo real
        List<Pago> pagos = pagoRepository.findByCitaIdAndRegBorrado(cita.getId(), 1);
        BigDecimal pagado = pagos.stream()
                .filter(p -> p.getStatus() == com.meyisoft.dental.system.enums.PagoStatus.APROBADO || 
                            p.getStatus() == com.meyisoft.dental.system.enums.PagoStatus.PENDIENTE_REVISION)
                .map(com.meyisoft.dental.system.entity.Pago::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal total = cita.getMontoTotal() != null ? cita.getMontoTotal() : BigDecimal.ZERO;
        BigDecimal pendiente = total.subtract(pagado);

        // Lógica de cancelación realista
        boolean permiteCancelar = (cita.getEstado() == AppointmentStatus.POR_CONFIRMAR || 
                                 cita.getEstado() == AppointmentStatus.CONFIRMADA) && 
                                 cita.getFechaHora().isAfter(OffsetDateTime.now().plusHours(24));

        String mensajeCancelacion = "";
        if (!permiteCancelar) {
            if (cita.getFechaHora().isBefore(OffsetDateTime.now().plusHours(24))) {
                mensajeCancelacion = "Favor de contactar a la clínica para cancelaciones con menos de 24h de antelación.";
            } else if (cita.getEstado() != AppointmentStatus.POR_CONFIRMAR && cita.getEstado() != AppointmentStatus.CONFIRMADA) {
                mensajeCancelacion = "La cita ya se encuentra en un estado que no permite cancelación automática.";
            }
        }

        return CitaPatientDTO.builder()
                .id(cita.getId())
                .folio(cita.getFolio())
                .clinicaNombre(empresa != null ? empresa.getNombreComercial() : "Clínica Dental")
                .sucursalNombre(sucursal != null ? sucursal.getNombreSucursal() : "Sucursal Principal")
                .sucursalTelefono(sucursal != null ? sucursal.getTelefono() : null)
                .servicioNombre(servicio != null ? servicio.getNombre() : "Consulta")
                .fechaHora(cita.getFechaHora())
                .estado(cita.getEstado())
                .montoBase(total)
                .montoPagado(pagado)
                .saldoPendiente(pendiente.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : pendiente)
                .permiteCancelar(permiteCancelar)
                .mensajeCancelacion(mensajeCancelacion)
                .build();
    }

    @Transactional
    public void cancelarCitaDesdePortal(UUID citaId, String motivo) {
        Cita cita = citaRepository.findById(citaId)
                .filter(c -> c.getRegBorrado() == 1)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada"));
                
        citaService.cancelarCita(citaId, motivo, cita.getTenantId());
    }

    @Transactional
    public void setupProfile(UUID patientId, String newPin, String email) {
        Paciente current = pacienteRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Paciente no encontrado"));

        String hashedPin = passwordEncoder.encode(newPin);
        
        // Sincronización global por Teléfono
        List<Paciente> vinculados = pacienteRepository.findAllByTelefonoAndRegBorrado(current.getTelefono(), 1);
        
        log.info("Sincronizando perfil para {} registros vinculados al teléfono {}", vinculados.size(), current.getTelefono());
        
        for (Paciente p : vinculados) {
            p.setPinHash(hashedPin);
            p.setEmail(email);
            p.setPinCambiado(true);
            p.setEmailVerificado(true);
            pacienteRepository.save(p);
        }
    }

    @Transactional
    public CitaDTO bookAppointmentFromPortalWithFile(UUID pacienteId, PatientBookRequest request, org.springframework.web.multipart.MultipartFile file) {
        // 1. Subir el ticket obligatoriamente
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("El ticket de pago es obligatorio");
        }
        String ticketUrl = storageService.uploadFile(file, "tickets_pacientes");

        // 2. Obtener el paciente para resolver tenantId y sucursalId
        Paciente paciente = pacienteRepository.findById(pacienteId)
                .filter(p -> p.getRegBorrado() == 1)
                .orElseThrow(() -> new RuntimeException("Paciente no encontrado"));

        UUID tenantId = paciente.getTenantId();

        // 3. Obtener la sucursal principal del tenant
        var sucursal = sucursalRepository.findByTenantIdAndRegBorrado(tenantId, 1)
                .stream().findFirst()
                .orElseThrow(() -> new RuntimeException("No hay sucursales configuradas para esta clínica"));

        // 4. Construir el DTO
        CitaDTO citaDTO = CitaDTO.builder()
                .pacienteId(pacienteId)
                .sucursalId(sucursal.getId())
                .servicioId(request.getServicioId())
                .fechaHora(request.getFechaHora())
                .motivoConsulta(request.getMotivoConsulta())
                .referenciaPago(request.getReferenciaPago())
                .montoPagado(request.getMontoAnticipo())
                .source("APP")
                .build();

        // 5. Agendar con el comprobante subido
        return citaService.agendar(citaDTO, tenantId, ticketUrl);
    }

    @Transactional(readOnly = true)
    public java.util.Map<String, String> getPatientClinicInfo(UUID pacienteId) {
        Paciente paciente = pacienteRepository.findById(pacienteId)
                .filter(p -> p.getRegBorrado() == 1)
                .orElseThrow(() -> new RuntimeException("Paciente no encontrado"));

        UUID tenantId = paciente.getTenantId();

        // Obtener la primera sucursal del tenant
        var sucursal = sucursalRepository.findByTenantIdAndRegBorrado(tenantId, 1)
                .stream().findFirst()
                .orElseThrow(() -> new RuntimeException("No hay sucursales configuradas"));

        java.util.Map<String, String> info = new java.util.HashMap<>();
        info.put("tenantId", tenantId.toString());
        info.put("sucursalId", sucursal.getId().toString());
        info.put("banco", sucursal.getBanco());
        info.put("cuentaBancaria", sucursal.getCuentaBancaria());
        info.put("clabeInterbancaria", sucursal.getClabeInterbancaria());
        info.put("telefono", sucursal.getTelefono());
        return info;
    }
}
