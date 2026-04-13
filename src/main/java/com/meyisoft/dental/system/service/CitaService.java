package com.meyisoft.dental.system.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meyisoft.dental.system.entity.Cita;
import com.meyisoft.dental.system.entity.Sucursal;
import com.meyisoft.dental.system.enums.AppointmentStatus;
import com.meyisoft.dental.system.exception.BusinessException;
import com.meyisoft.dental.system.models.dto.CitaDTO;
import com.meyisoft.dental.system.repository.CitaRepository;
import com.meyisoft.dental.system.repository.SucursalRepository;
import com.meyisoft.dental.system.repository.UsuarioRepository;
import com.meyisoft.dental.system.enums.UserRole;
import com.meyisoft.dental.system.entity.Usuario;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CitaService {

    private final CitaRepository repository;
    private final SucursalRepository sucursalRepository;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper;

    @Data
    public static class DayConfig {
        @JsonProperty("active")
        private boolean active;    
        
        @JsonProperty("enabled") // Alias para compatibilidad con data vieja
        public void setEnabled(boolean enabled) { this.active = enabled; }

        @JsonProperty("startTime")
        private String startTime; 
        
        @JsonProperty("start") // Alias
        public void setStart(String start) { this.startTime = start; }

        @JsonProperty("endTime")
        private String endTime;
        
        @JsonProperty("end") // Alias
        public void setEnd(String end) { this.endTime = end; }
    }

    @Transactional(readOnly = true)
    public List<CitaDTO> listarPorRango(UUID tenantId, UUID sucursalId, OffsetDateTime start, OffsetDateTime end) {
        return repository.findByTenantIdAndSucursalIdAndFechaHoraBetweenAndRegBorrado(
                tenantId, sucursalId, start, end, 1).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Usuario> listarDoctores(UUID tenantId) {
        return usuarioRepository.findByTenantIdAndRolAndRegBorrado(tenantId, UserRole.DOCTOR, 1);
    }

    @Transactional
    public CitaDTO agendar(CitaDTO dto, UUID tenantId) {
        // 1. Validar horario de sucursal
        validarHorarioSucursal(dto.getSucursalId(), dto.getFechaHora(), dto.getDuracionMinutos());

        // 2. Validar disponibilidad del doctor (No traslapes)
        OffsetDateTime finCita = dto.getFechaHora().plusMinutes(dto.getDuracionMinutos());
        if (repository.existsOverlapping(dto.getDoctorId(), dto.getFechaHora(), finCita)) {
            throw new BusinessException("CHOQUE_CITAS", "El doctor ya tiene una cita agendada en este horario",
                    HttpStatus.CONFLICT);
        }

        Cita entity = Cita.builder()
                .pacienteId(dto.getPacienteId())
                .doctorId(dto.getDoctorId())
                .sucursalId(dto.getSucursalId())
                .servicioId(dto.getServicioId())
                .fechaHora(dto.getFechaHora())
                .duracionMinutos(dto.getDuracionMinutos())
                .estado(AppointmentStatus.PENDIENTE)
                .motivoConsulta(dto.getMotivoConsulta())
                .notasRecepcion(dto.getNotasRecepcion())
                .build();

        entity.setTenantId(tenantId);
        entity.setRegBorrado(1);

        return mapToDTO(repository.save(entity));
    }

    @Transactional
    public CitaDTO actualizarEstado(UUID id, AppointmentStatus nuevoEstado, java.math.BigDecimal montoTotal, UUID tenantId) {
        Cita entity = repository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        entity.setEstado(nuevoEstado);
        if (montoTotal != null) {
            entity.setMontoTotal(montoTotal);
        }
        return mapToDTO(repository.save(entity));
    }

    private void validarHorarioSucursal(UUID sucursalId, OffsetDateTime fechaHora, Integer duracion) {
        Sucursal sucursal = sucursalRepository.findById(sucursalId)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Sucursal no encontrada", HttpStatus.NOT_FOUND));

        if (fechaHora.isBefore(OffsetDateTime.now())) {
            throw new BusinessException("PAST_DATE", "No se puede agendar en el pasado", HttpStatus.BAD_REQUEST);
        }

        if (sucursal.getHorariosLaborales() != null && !sucursal.getHorariosLaborales().isEmpty()) {
            try {
                String json = sucursal.getHorariosLaborales();
                DayConfig config = null;

                // 1. Determinar si es Map {} o List []
                if (json.trim().startsWith("{")) {
                    java.util.Map<String, DayConfig> configs = objectMapper.readValue(json, 
                        new TypeReference<java.util.Map<String, DayConfig>>() {});
                    String dayKey = fechaHora.getDayOfWeek().name().toLowerCase();
                    config = configs.get(dayKey);
                } else {
                    // Fallback para formato de lista antiguo [{"day": "Lunes", ...}]
                    List<java.util.Map<String, Object>> list = objectMapper.readValue(json, 
                        new TypeReference<List<java.util.Map<String, Object>>>() {});
                    String daySpanish = fechaHora.getDayOfWeek().getDisplayName(TextStyle.FULL, new java.util.Locale("es", "ES"));
                    
                    for (java.util.Map<String, Object> item : list) {
                        String dayName = (String) item.get("day");
                        if (dayName != null && dayName.equalsIgnoreCase(daySpanish)) {
                            config = objectMapper.convertValue(item, DayConfig.class);
                            break;
                        }
                    }
                }

                if (config != null) {
                    if (!config.isActive()) {
                        throw new BusinessException("CLOSED_DAY", "La sucursal está cerrada este " + 
                            fechaHora.getDayOfWeek().getDisplayName(TextStyle.FULL, new java.util.Locale("es", "ES")), 
                            HttpStatus.BAD_REQUEST);
                    }

                    if (config.getStartTime() != null && config.getEndTime() != null) {
                        LocalTime apertura = LocalTime.parse(config.getStartTime());
                        LocalTime cierre = LocalTime.parse(config.getEndTime());
                        LocalTime citaInicio = fechaHora.toLocalTime();
                        LocalTime citaFin = fechaHora.plusMinutes(duracion).toLocalTime();

                        if (citaInicio.isBefore(apertura) || citaInicio.isAfter(cierre)) {
                            throw new BusinessException("OUT_OF_HOURS", 
                                "La hora de inicio (" + citaInicio + ") está fuera del horario laboral (" + config.getStartTime() + " - " + config.getEndTime() + ")", 
                                HttpStatus.BAD_REQUEST);
                        }

                        if (citaFin.isAfter(cierre)) {
                            throw new BusinessException("OUT_OF_HOURS", 
                                "La cita termina después del horario de cierre (Finaliza: " + citaFin + ", Cierre: " + config.getEndTime() + ")", 
                                HttpStatus.BAD_REQUEST);
                        }
                    }
                }
            } catch (BusinessException e) {
                throw e;
            } catch (Exception e) {
                log.error("Error al parsear horarios de sucursal: {}", e.getMessage());
            }
        }
    }

    private CitaDTO mapToDTO(Cita entity) {
        return CitaDTO.builder()
                .id(entity.getId())
                .pacienteId(entity.getPacienteId())
                .doctorId(entity.getDoctorId())
                .sucursalId(entity.getSucursalId())
                .servicioId(entity.getServicioId())
                .fechaHora(entity.getFechaHora())
                .duracionMinutos(entity.getDuracionMinutos())
                .estado(entity.getEstado())
                .motivoConsulta(entity.getMotivoConsulta())
                .notasRecepcion(entity.getNotasRecepcion())
                .montoTotal(entity.getMontoTotal())
                .build();
    }
}
