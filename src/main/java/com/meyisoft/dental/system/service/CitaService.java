package com.meyisoft.dental.system.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.meyisoft.dental.system.entity.Cita;
import com.meyisoft.dental.system.entity.Sucursal;
import com.meyisoft.dental.system.enums.AppointmentStatus;
import com.meyisoft.dental.system.exception.BusinessException;
import com.meyisoft.dental.system.config.AuditAction;
import com.meyisoft.dental.system.models.dto.CitaDTO;
import com.meyisoft.dental.system.repository.CitaRepository;
import com.meyisoft.dental.system.repository.RegistroFolioRepository;
import com.meyisoft.dental.system.repository.SucursalRepository;
import com.meyisoft.dental.system.repository.UsuarioRepository;
import com.meyisoft.dental.system.repository.PacienteRepository;
import com.meyisoft.dental.system.repository.PagoRepository;
import com.meyisoft.dental.system.repository.ServicioDentalRepository;
import com.meyisoft.dental.system.enums.UserRole;
import com.meyisoft.dental.system.entity.Usuario;
import com.meyisoft.dental.system.entity.Paciente;
import com.meyisoft.dental.system.entity.Pago;
import com.meyisoft.dental.system.entity.RegistroFolio;
import com.meyisoft.dental.system.enums.PaymentMethod;
import com.meyisoft.dental.system.enums.PagoStatus;
import com.meyisoft.dental.system.models.dto.DashboardStatsDTO;
import com.meyisoft.dental.system.models.dto.IncomeDetailDTO;
import com.meyisoft.dental.system.models.dto.DisponibilidadDiaDTO;
import com.meyisoft.dental.system.models.dto.SlotDisponibilidadDTO;
import com.meyisoft.dental.system.entity.ServicioDental;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CitaService {

    private final CitaRepository repository;
    private final SucursalRepository sucursalRepository;
    private final UsuarioRepository usuarioRepository;
    private final RegistroFolioRepository folioRepository;
    private final PacienteRepository pacienteRepository;
    private final PasswordEncoder passwordEncoder;
    private final PagoRepository pagoRepository;
    private final ServicioDentalRepository servicioDentalRepository;
    private final ObjectMapper objectMapper;

    @Data
    public static class DayConfig {
        @JsonProperty("active")
        private boolean active;

        @JsonProperty("enabled")
        public void setEnabled(boolean enabled) {
            this.active = enabled;
        }

        @JsonProperty("startTime")
        private String startTime;

        @JsonProperty("start")
        public void setStart(String start) {
            this.startTime = start;
        }

        @JsonProperty("endTime")
        private String endTime;

        @JsonProperty("end")
        public void setEnd(String end) {
            this.endTime = end;
        }
    }

    @Transactional(readOnly = true)
    public List<CitaDTO> listarPorRango(UUID tenantId, UUID sucursalId, OffsetDateTime start, OffsetDateTime end, UUID doctorId) {
        List<Cita> citas = repository.findByRangeWithDoctorFilter(tenantId, sucursalId, start, end, 1, doctorId);

        if (citas.isEmpty()) return new ArrayList<>();

        // Optimización N+1: Precarga de datos relacionados
        Set<UUID> pacienteIds = citas.stream().map(Cita::getPacienteId).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Set<UUID> doctorIds = citas.stream().map(Cita::getDoctorId).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Set<UUID> servicioIds = citas.stream().map(Cita::getServicioId).filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Set<UUID> citaIds = citas.stream().map(Cita::getId).collect(Collectors.toSet());

        Map<UUID, Paciente> pacientesMap = pacienteRepository.findAllById(pacienteIds).stream()
                .collect(Collectors.toMap(Paciente::getId, p -> p));
        Map<UUID, Usuario> doctoresMap = usuarioRepository.findAllById(doctorIds).stream()
                .collect(Collectors.toMap(Usuario::getId, d -> d));
        Map<UUID, ServicioDental> serviciosMap = servicioDentalRepository.findAllById(servicioIds).stream()
                .collect(Collectors.toMap(ServicioDental::getId, s -> s));
        Map<UUID, List<Pago>> pagosMap = pagoRepository.findAllByCitaIdInAndRegBorrado(citaIds, 1).stream()
                .collect(Collectors.groupingBy(Pago::getCitaId));

        return citas.stream()
                .sorted((c1, c2) -> {
                    int p1 = getStatusPriority(c1.getEstado());
                    int p2 = getStatusPriority(c2.getEstado());
                    if (p1 != p2) {
                        return Integer.compare(p1, p2);
                    }
                    return c1.getFechaHora().compareTo(c2.getFechaHora());
                })
                .map(c -> mapToDTOOptimized(c, pacientesMap, doctoresMap, serviciosMap, pagosMap))
                .collect(Collectors.toList());
    }

    private int getStatusPriority(AppointmentStatus status) {
        return switch (status) {
            case EN_CONSULTA -> 1;
            case LLEGADA -> 2;
            case CONFIRMADA -> 3;
            case POR_LIQUIDAR -> 4;
            case POR_CONFIRMAR -> 5;
            case FINALIZADA -> 6;
            case AUSENTE -> 7;
            case CANCELADA -> 8;
            default -> 9;
        };
    }

    @Transactional(readOnly = true)
    public List<Usuario> listarDoctores(UUID tenantId) {
        return usuarioRepository.findByTenantIdAndRolAndRegBorrado(tenantId, UserRole.DOCTOR, 1);
    }

    @Transactional
    @AuditAction(modulo = "CITAS", accion = "AGENDAR", descripcion = "Agendamiento de nueva cita médica")
    public CitaDTO agendar(CitaDTO dto, UUID tenantId, String comprobanteUrl) {
        // 1. Obtener información del servicio
        ServicioDental servicio = null;
        if (dto.getServicioId() != null) {
            servicio = servicioDentalRepository.findByIdAndTenantIdAndRegBorrado(dto.getServicioId(), tenantId, 1)
                    .orElseThrow(() -> new BusinessException("NOT_FOUND", "Servicio no encontrado", HttpStatus.NOT_FOUND));

            if (dto.getDuracionMinutos() == null) {
                dto.setDuracionMinutos(servicio.getDuracionMinutos());
            }
        }

        if (dto.getDuracionMinutos() == null) dto.setDuracionMinutos(30);

        // 2. Validar horario de sucursal
        validarHorarioSucursal(dto.getSucursalId(), dto.getFechaHora(), dto.getDuracionMinutos());

        // 3. Validar disponibilidad
        OffsetDateTime finCita = dto.getFechaHora().plusMinutes(dto.getDuracionMinutos());
        
        // Validar consultorio
        if (repository.countOverlappingSucursal(tenantId, dto.getSucursalId(), dto.getFechaHora(), finCita) > 0) {
            throw new BusinessException("CHOQUE_CITAS", "El consultorio ya está ocupado en este horario", HttpStatus.CONFLICT);
        }

        // Validar doctor si está asignado
        if (dto.getDoctorId() != null && repository.countOverlapping(tenantId, dto.getDoctorId(), dto.getFechaHora(), finCita) > 0) {
            throw new BusinessException("CHOQUE_CITAS", "El doctor ya tiene una cita agendada en este horario", HttpStatus.CONFLICT);
        }

        // 4. Manejo de Paciente
        String source = (dto.getSource() != null) ? dto.getSource().toUpperCase() : "CRM";
        UUID pacienteId = dto.getPacienteId();

        if (pacienteId == null && (source.equals("APP") || source.equals("PUBLIC"))) {
            if (dto.getPacienteNombre() == null || dto.getPacienteNombre().trim().isEmpty()) {
                throw new BusinessException("MISSING_DATA", "El nombre del paciente es obligatorio", HttpStatus.BAD_REQUEST);
            }

            validarTelefono(dto.getPacienteTelefono());

            Optional<Paciente> pacienteExistente = pacienteRepository.findByTelefonoAndTenantIdAndRegBorrado(
                    dto.getPacienteTelefono(), tenantId, 1);

            if (pacienteExistente.isPresent()) {
                pacienteId = pacienteExistente.get().getId();
            } else {
                Paciente nuevoPaciente = Paciente.builder()
                        .id(UUID.randomUUID())
                        .nombreCompleto(dto.getPacienteNombre())
                        .telefono(dto.getPacienteTelefono())
                        .expedienteCompleto(false)
                        .pinHash(passwordEncoder.encode("123456"))
                        .pinCambiado(false)
                        .build();
                nuevoPaciente.setTenantId(tenantId);
                nuevoPaciente.setRegBorrado(1);
                pacienteId = pacienteRepository.save(nuevoPaciente).getId();
            }
        } else if (pacienteId == null) {
            throw new BusinessException("MISSING_DATA", "El paciente es obligatorio", HttpStatus.BAD_REQUEST);
        }

        // 5. Traslape Paciente
        if (repository.countOverlappingPaciente(tenantId, pacienteId, dto.getFechaHora(), finCita) > 0) {
            throw new BusinessException("CHOQUE_CITAS_PACIENTE", "El paciente ya tiene una cita agendada en este horario", HttpStatus.CONFLICT);
        }

        AppointmentStatus estadoInicial = (source.equals("APP") || source.equals("PUBLIC"))
                ? AppointmentStatus.POR_CONFIRMAR : AppointmentStatus.CONFIRMADA;

        String folio = generarSiguienteFolio(tenantId, "CITA");

        Cita entity = Cita.builder()
                .id(UUID.randomUUID())
                .pacienteId(pacienteId)
                .doctorId(dto.getDoctorId())
                .sucursalId(dto.getSucursalId())
                .servicioId(dto.getServicioId())
                .fechaHora(dto.getFechaHora())
                .duracionMinutos(dto.getDuracionMinutos())
                .estado(estadoInicial)
                .source(source)
                .folio(folio)
                .motivoConsulta(dto.getMotivoConsulta())
                .notasRecepcion(dto.getNotasRecepcion())
                .montoTotal(servicio != null ? servicio.getPrecioBase() : BigDecimal.ZERO)
                .build();

        entity.setTenantId(tenantId);
        entity.setRegBorrado(1);
        Cita saved = repository.save(entity);

        // Registrar anticipo si aplica
        if ((source.equals("APP") || source.equals("PUBLIC")) && dto.getMontoPagado() != null) {
            Pago anticipo = Pago.builder()
                    .id(UUID.randomUUID())
                    .citaId(saved.getId())
                    .pacienteId(pacienteId)
                    .monto(dto.getMontoPagado())
                    .metodoPago(PaymentMethod.TRANSFERENCIA)
                    .status(PagoStatus.PENDIENTE_REVISION)
                    .comprobanteUrl(comprobanteUrl)
                    .folioPago(dto.getReferenciaPago())
                    .notas("Anticipo desde " + source)
                    .build();
            anticipo.setTenantId(tenantId);
            anticipo.setRegBorrado(1);
            pagoRepository.save(anticipo);
        }

        return mapToDTO(saved);
    }

    @Transactional
    @AuditAction(modulo = "CITAS", accion = "REPROGRAMAR", descripcion = "Cambio de fecha/hora de cita existente")
    public CitaDTO reprogramar(UUID id, OffsetDateTime nuevaFechaHora, Integer nuevaDuracion, UUID tenantId) {
        Cita entity = repository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        Integer duracion = (nuevaDuracion != null) ? nuevaDuracion : entity.getDuracionMinutos();
        OffsetDateTime finCita = nuevaFechaHora.plusMinutes(duracion);

        if (repository.countOverlappingSucursalExcludingId(tenantId, entity.getSucursalId(), nuevaFechaHora, finCita, id) > 0) {
            throw new BusinessException("CHOQUE_CITAS", "El consultorio ya está ocupado", HttpStatus.CONFLICT);
        }

        if (entity.getDoctorId() != null && repository.countOverlappingExcludingId(tenantId, entity.getDoctorId(), nuevaFechaHora, finCita, id) > 0) {
            throw new BusinessException("CHOQUE_CITAS", "El doctor ya está ocupado", HttpStatus.CONFLICT);
        }

        validarHorarioSucursal(entity.getSucursalId(), nuevaFechaHora, duracion);

        entity.setFechaHora(nuevaFechaHora);
        entity.setDuracionMinutos(duracion);
        entity.setEstado(AppointmentStatus.CONFIRMADA);

        return mapToDTO(repository.save(entity));
    }

    @Transactional
    @AuditAction(modulo = "CITAS", accion = "CONFIRMAR", descripcion = "Confirmación de cita por personal clínico")
    public CitaDTO confirmarCita(UUID id, UUID doctorId, BigDecimal montoTotal, UUID tenantId) {
        Cita entity = repository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        if (entity.getEstado() != AppointmentStatus.POR_CONFIRMAR) {
            throw new BusinessException("INVALID_STATE", "La cita ya no está pendiente de confirmar", HttpStatus.BAD_REQUEST);
        }

        OffsetDateTime start = entity.getFechaHora();
        OffsetDateTime end = start.plusMinutes(entity.getDuracionMinutos());

        if (repository.countOverlappingExcludingId(tenantId, doctorId, start, end, id) > 0) {
            throw new BusinessException("CHOQUE_CITAS", "El doctor ya tiene otra cita en este horario", HttpStatus.CONFLICT);
        }

        if (montoTotal != null) entity.setMontoTotal(montoTotal);
        entity.setDoctorId(doctorId);
        entity.setEstado(AppointmentStatus.CONFIRMADA);
        Cita saved = repository.save(entity);

        // Aprobar pagos pendientes y actualizar saldo del paciente
        List<Pago> pagosPendientes = pagoRepository.findByCitaIdAndRegBorrado(id, 1).stream()
                .filter(p -> p.getStatus() == PagoStatus.PENDIENTE_REVISION)
                .collect(Collectors.toList());

        if (!pagosPendientes.isEmpty()) {
            Paciente paciente = pacienteRepository.findById(entity.getPacienteId()).orElseThrow();
            if (paciente.getSaldoPendiente() == null) paciente.setSaldoPendiente(BigDecimal.ZERO);

            for (Pago p : pagosPendientes) {
                p.setStatus(PagoStatus.APROBADO);
                paciente.setSaldoPendiente(paciente.getSaldoPendiente().subtract(p.getMonto()));
                pagoRepository.save(p);
            }
            pacienteRepository.save(paciente);
        }

        return mapToDTO(saved);
    }

    @Transactional
    public CitaDTO rechazarCita(UUID id, String motivo, UUID tenantId) {
        return cancelarCita(id, motivo, tenantId);
    }

    @Transactional
    public CitaDTO cancelarCita(UUID id, String motivo, UUID tenantId) {
        Cita entity = repository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        entity.setEstado(AppointmentStatus.CANCELADA);
        entity.setMotivoRechazo(motivo);
        Cita saved = repository.save(entity);

        pagoRepository.findByCitaIdAndRegBorrado(id, 1).forEach(pago -> {
            if (pago.getStatus() == PagoStatus.PENDIENTE_REVISION) pago.setStatus(PagoStatus.RECHAZADO);
            else if (pago.getStatus() == PagoStatus.APROBADO) pago.setStatus(PagoStatus.CANCELADO);
            pagoRepository.save(pago);
        });

        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<CitaDTO> listarPorConfirmar(UUID tenantId, UUID sucursalId) {
        List<Cita> list = (sucursalId != null) 
            ? repository.findByTenantIdAndSucursalIdAndEstadoAndRegBorrado(tenantId, sucursalId, AppointmentStatus.POR_CONFIRMAR, 1)
            : repository.findByTenantIdAndEstadoAndRegBorrado(tenantId, AppointmentStatus.POR_CONFIRMAR, 1);
        return list.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public CitaDTO actualizarEstado(UUID id, AppointmentStatus nuevoEstado, BigDecimal montoTotal, UUID tenantId) {
        Cita entity = repository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        entity.setEstado(nuevoEstado);
        if (montoTotal != null) entity.setMontoTotal(montoTotal);
        return mapToDTO(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public DashboardStatsDTO getDashboardSummary(UUID tenantId, UUID sucursalId, UUID doctorId) {
        OffsetDateTime now = OffsetDateTime.now(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
        OffsetDateTime todayStart = now.toLocalDate().atStartOfDay().atOffset(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
        OffsetDateTime todayEnd = now.toLocalDate().atTime(23, 59, 59).atOffset(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
        OffsetDateTime yesterdayStart = todayStart.minusDays(1);
        OffsetDateTime yesterdayEnd = todayEnd.minusDays(1);

        BigDecimal ingresosHoy = pagoRepository.sumIngresosByTenantAndDateRange(tenantId, todayStart, todayEnd, doctorId);
        BigDecimal ingresosAyer = pagoRepository.sumIngresosByTenantAndDateRange(tenantId, yesterdayStart, yesterdayEnd, doctorId);
        
        long citasHoy = repository.countApptsByRange(tenantId, sucursalId, todayStart, todayEnd, doctorId);
        long citasAyer = repository.countApptsByRange(tenantId, sucursalId, yesterdayStart, yesterdayEnd, doctorId);

        BigDecimal ingresosPendientes = pagoRepository.sumIngresosPendientesByTenant(tenantId, doctorId);
        long countPendientes = pagoRepository.countPendingPaymentsByDoctor(tenantId, doctorId);

        long pacientesHoy = pacienteRepository.countByTenantIdAndCreatedAtBetweenAndRegBorrado(tenantId, todayStart, todayEnd, 1);
        long pacientesAyer = pacienteRepository.countByTenantIdAndCreatedAtBetweenAndRegBorrado(tenantId, yesterdayStart, yesterdayEnd, 1);

        List<IncomeDetailDTO> detalleHoy = pagoRepository.findByTenantIdAndStatusAndCreatedAtBetweenAndRegBorrado(
                tenantId, PagoStatus.APROBADO, todayStart, todayEnd, 1)
                .stream().map(pago -> IncomeDetailDTO.builder().monto(pago.getMonto()).fecha(pago.getCreatedAt()).build())
                .collect(Collectors.toList());

        return DashboardStatsDTO.builder()
                .ingresosPorValidar(ingresosPendientes)
                .comprobantesPendientesCount(countPendientes)
                .ingresosHoy(ingresosHoy)
                .ingresosHoyTrend(calculateTrend(ingresosHoy, ingresosAyer))
                .citasHoyCount(citasHoy)
                .citasHoyTrend(citasHoy - citasAyer)
                .pacientesNuevosCount(pacientesHoy)
                .pacientesNuevosTrend(calculateTrend(BigDecimal.valueOf(pacientesHoy), BigDecimal.valueOf(pacientesAyer)))
                .ingresosDetalleHoy(detalleHoy)
                .build();
    }

    private double calculateTrend(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(BigDecimal.ZERO) == 0) return current.compareTo(BigDecimal.ZERO) > 0 ? 100.0 : 0.0;
        return ((current.doubleValue() - previous.doubleValue()) / previous.doubleValue()) * 100.0;
    }

    // --- MÉTODOS DE DISPONIBILIDAD (MANTENIDOS) ---

    @Transactional(readOnly = true)
    public List<DisponibilidadDiaDTO> obtenerDisponibilidadMes(UUID tenantId, UUID sucursalId, int mes, int anio) {
        YearMonth yearMonth = YearMonth.of(anio, mes);
        List<DisponibilidadDiaDTO> disponibilidad = new ArrayList<>();
        List<Usuario> doctores = usuarioRepository.findByTenantIdAndRolAndRegBorrado(tenantId, UserRole.DOCTOR, 1)
                .stream().filter(d -> sucursalId.equals(d.getSucursalIdPrincipal())).collect(Collectors.toList());

        OffsetDateTime start = yearMonth.atDay(1).atStartOfDay().atOffset(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
        OffsetDateTime end = yearMonth.atEndOfMonth().atTime(23, 59, 59).atOffset(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
        List<Cita> citasMes = repository.findAllActiveByTenantAndSucursalInRange(tenantId, sucursalId, start, end);

        for (int day = 1; day <= yearMonth.lengthOfMonth(); day++) {
            LocalDate fecha = yearMonth.atDay(day);
            DayConfig config = obtenerConfiguracionDia(sucursalId, fecha);
            boolean esLaboral = config != null && config.isActive();
            boolean estaLlena = true;
            if (esLaboral && !doctores.isEmpty()) {
                List<Cita> citasDia = citasMes.stream().filter(c -> c.getFechaHora().toLocalDate().equals(fecha)).collect(Collectors.toList());
                estaLlena = calcularSlotsParaFechaOptimizado(tenantId, sucursalId, fecha, 30, doctores, citasDia).stream().noneMatch(SlotDisponibilidadDTO::isDisponible);
            }
            disponibilidad.add(new DisponibilidadDiaDTO(fecha, estaLlena, esLaboral));
        }
        return disponibilidad;
    }

    @Transactional(readOnly = true)
    public List<SlotDisponibilidadDTO> obtenerSlotsDisponibles(UUID tenantId, UUID sucursalId, LocalDate fecha, UUID servicioId) {
        ServicioDental servicio = servicioDentalRepository.findByIdAndTenantIdAndRegBorrado(servicioId, tenantId, 1).orElseThrow();
        List<Usuario> doctores = usuarioRepository.findByTenantIdAndRolAndRegBorrado(tenantId, UserRole.DOCTOR, 1)
                .stream().filter(d -> sucursalId.equals(d.getSucursalIdPrincipal())).collect(Collectors.toList());
        int duracion = servicio.getDuracionMinutos() != null ? servicio.getDuracionMinutos() : 30;
        OffsetDateTime s = fecha.atStartOfDay().atOffset(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
        OffsetDateTime e = fecha.atTime(23, 59, 59).atOffset(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
        List<Cita> citasDia = repository.findAllActiveByTenantAndSucursalInRange(tenantId, sucursalId, s, e);
        return calcularSlotsParaFechaOptimizado(tenantId, sucursalId, fecha, duracion, doctores, citasDia).stream().filter(SlotDisponibilidadDTO::isDisponible).collect(Collectors.toList());
    }

    private List<SlotDisponibilidadDTO> calcularSlotsParaFechaOptimizado(UUID tenantId, UUID sucursalId, LocalDate fecha, int duracion, List<Usuario> doctores, List<Cita> citasDia) {
        List<SlotDisponibilidadDTO> slots = new ArrayList<>();
        DayConfig config = obtenerConfiguracionDia(sucursalId, fecha);
        if (config == null || !config.isActive()) return slots;
        LocalTime actual = LocalTime.parse(config.getStartTime());
        LocalTime cierre = LocalTime.parse(config.getEndTime());
        while (actual.plusMinutes(duracion).isBefore(cierre) || actual.plusMinutes(duracion).equals(cierre)) {
            LocalTime fin = actual.plusMinutes(duracion);
            OffsetDateTime s = actual.atDate(fecha).atOffset(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
            OffsetDateTime e = fin.atDate(fecha).atOffset(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET);
            boolean ocupado = citasDia.stream().anyMatch(c -> c.getFechaHora().isBefore(e) && c.getFechaHora().plusMinutes(c.getDuracionMinutos()).isAfter(s));
            boolean disp = !ocupado;
            if (fecha.equals(LocalDate.now(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET)) && s.isBefore(OffsetDateTime.now(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET))) disp = false;
            slots.add(new SlotDisponibilidadDTO(actual, fin, disp));
            actual = actual.plusMinutes(30);
        }
        return slots;
    }

    private DayConfig obtenerConfiguracionDia(UUID sucursalId, LocalDate fecha) {
        Sucursal sucursal = sucursalRepository.findById(sucursalId).orElse(null);
        if (sucursal == null || sucursal.getHorariosLaborales() == null) return null;
        try {
            Map<String, DayConfig> configs = objectMapper.readValue(sucursal.getHorariosLaborales(), new TypeReference<Map<String, DayConfig>>() {});
            String key = fecha.getDayOfWeek().name().toLowerCase();
            return configs.get(key);
        } catch (Exception e) { return null; }
    }

    private String generarSiguienteFolio(UUID tenantId, String tipo) {
        LocalDate hoy = LocalDate.now();
        RegistroFolio reg = folioRepository.findByTenantIdAndTipoAndFechaAndRegBorrado(tenantId, tipo, hoy, 1).orElseGet(() -> {
            RegistroFolio n = RegistroFolio.builder().id(UUID.randomUUID()).tipo(tipo).fecha(hoy).ultimoNumero(0).build();
            n.setTenantId(tenantId); n.setRegBorrado(1); return n;
        });
        reg.setUltimoNumero(reg.getUltimoNumero() + 1);
        folioRepository.save(reg);
        return String.format("CIT-%s-%04d", hoy.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")), reg.getUltimoNumero());
    }

    private void validarHorarioSucursal(UUID sucursalId, OffsetDateTime fechaHora, Integer duracion) {
        DayConfig config = obtenerConfiguracionDia(sucursalId, fechaHora.toLocalDate());
        if (config != null && (!config.isActive() || fechaHora.toLocalTime().isBefore(LocalTime.parse(config.getStartTime())) || fechaHora.toLocalTime().plusMinutes(duracion).isAfter(LocalTime.parse(config.getEndTime())))) {
            throw new BusinessException("OUT_OF_HOURS", "Fuera de horario laboral", HttpStatus.BAD_REQUEST);
        }
    }

    private CitaDTO mapToDTO(Cita entity) { return mapToDTOOptimized(entity, null, null, null, null); }

    private CitaDTO mapToDTOOptimized(Cita entity, Map<UUID, Paciente> pacientes, Map<UUID, Usuario> doctores, Map<UUID, ServicioDental> servicios, Map<UUID, List<Pago>> pagosPorCita) {
        CitaDTO dto = CitaDTO.builder().id(entity.getId()).pacienteId(entity.getPacienteId()).doctorId(entity.getDoctorId()).sucursalId(entity.getSucursalId()).servicioId(entity.getServicioId()).fechaHora(entity.getFechaHora()).duracionMinutos(entity.getDuracionMinutos()).estado(entity.getEstado()).source(entity.getSource()).folio(entity.getFolio()).motivoConsulta(entity.getMotivoConsulta()).notasRecepcion(entity.getNotasRecepcion()).montoTotal(entity.getMontoTotal()).motivoRechazo(entity.getMotivoRechazo()).build();
        
        if (entity.getPacienteId() != null) {
            Paciente p = (pacientes != null) ? pacientes.get(entity.getPacienteId()) : pacienteRepository.findById(entity.getPacienteId()).orElse(null);
            if (p != null) { dto.setPacienteNombre(p.getNombreCompleto()); dto.setPacienteTelefono(p.getTelefono()); }
        }
        if (entity.getDoctorId() != null) {
            Usuario d = (doctores != null) ? doctores.get(entity.getDoctorId()) : usuarioRepository.findById(entity.getDoctorId()).orElse(null);
            if (d != null) dto.setDoctorNombre(d.getNombreCompleto());
        }
        if (entity.getServicioId() != null) {
            ServicioDental s = (servicios != null) ? servicios.get(entity.getServicioId()) : servicioDentalRepository.findById(entity.getServicioId()).orElse(null);
            if (s != null) dto.setServicioNombre(s.getNombre());
        }

        List<Pago> pagos = (pagosPorCita != null) ? pagosPorCita.get(entity.getId()) : pagoRepository.findByCitaIdAndRegBorrado(entity.getId(), 1);
        if (pagos != null) {
            BigDecimal pagado = pagos.stream().filter(p -> p.getStatus() == PagoStatus.APROBADO || p.getStatus() == PagoStatus.PENDIENTE_REVISION).map(Pago::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
            dto.setMontoPagado(pagado);
            pagos.stream().filter(p -> p.getComprobanteUrl() != null).findFirst().ifPresent(p -> dto.setComprobanteUrl(p.getComprobanteUrl()));
        }
        return dto;
    }

    private void validarTelefono(String telefono) {
        if (telefono == null || !telefono.matches("^[0-9]{10}$")) throw new BusinessException("INVALID_PHONE", "Teléfono inválido", HttpStatus.BAD_REQUEST);
    }
}
