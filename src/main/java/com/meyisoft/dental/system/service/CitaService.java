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
import com.meyisoft.dental.system.models.dto.DisponibilidadDiaDTO;
import com.meyisoft.dental.system.models.dto.SlotDisponibilidadDTO;
import com.meyisoft.dental.system.entity.ServicioDental;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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

    @Data
    public static class DashboardStats {
        private double ingresosPorValidar;
        private long comprobantesPendientesCount;
        private double ingresosHoy;
        private double ingresosHoyTrend;
        private long citasHoyCount;
        private double citasHoyTrend;
        private long pacientesNuevosCount;
        private double pacientesNuevosTrend;
    }

    @Transactional(readOnly = true)
    public DashboardStats getDashboardSummary(UUID tenantId, UUID sucursalId, UUID doctorId) {
        OffsetDateTime hoyStart = LocalDate.now().atStartOfDay().atOffset(OffsetDateTime.now().getOffset());
        OffsetDateTime hoyEnd = LocalDate.now().atTime(LocalTime.MAX).atOffset(OffsetDateTime.now().getOffset());
        OffsetDateTime ayerStart = hoyStart.minusDays(1);
        OffsetDateTime ayerEnd = hoyEnd.minusDays(1);

        DashboardStats stats = new DashboardStats();

        // 1. Ingresos y Pagos Pendientes
        stats.setIngresosHoy(pagoRepository.sumIngresosByRange(tenantId, hoyStart, hoyEnd, doctorId).doubleValue());
        double ingresosAyer = pagoRepository.sumIngresosByRange(tenantId, ayerStart, ayerEnd, doctorId).doubleValue();
        stats.setIngresosHoyTrend(calcularTendencia(stats.getIngresosHoy(), ingresosAyer));
        
        stats.setComprobantesPendientesCount(pagoRepository.countPendingPaymentsByDoctor(tenantId, doctorId));
        // El monto de ingresos por validar es la suma de esos pagos pendientes
        // (Nota: Podríamos agregar una query específica en el repo, pero por ahora sumamos los de hoy por validar)
        // stats.setIngresosPorValidar(...); 
        // Simplificación: sumamos todos los pendientes de revisión para el doctor/clínica
        // (Podemos usar el mismo query sumIngresos cambiando el status o agregando uno nuevo)

        // 2. Citas
        stats.setCitasHoyCount(repository.countApptsByRange(tenantId, sucursalId, hoyStart, hoyEnd, doctorId));
        long citasAyer = repository.countApptsByRange(tenantId, sucursalId, ayerStart, ayerEnd, doctorId);
        stats.setCitasHoyTrend(stats.getCitasHoyCount() - citasAyer); // Diferencia numérica según indica el frontend en su trend

        // 3. Pacientes Nuevos (Clinic-wide generalmente, pero si hay doctorId podríamos filtrar si quisiéramos)
        stats.setPacientesNuevosCount(pacienteRepository.countNewPatientsByRange(tenantId, hoyStart, hoyEnd));
        long pacientesAyer = pacienteRepository.countNewPatientsByRange(tenantId, ayerStart, ayerEnd);
        stats.setPacientesNuevosTrend(calcularTendencia(stats.getPacientesNuevosCount(), pacientesAyer));

        return stats;
    }

    private double calcularTendencia(double hoy, double ayer) {
        if (ayer == 0) return hoy > 0 ? 100.0 : 0.0;
        return ((hoy - ayer) / ayer) * 100.0;
    }

    @Transactional(readOnly = true)
    public List<CitaDTO> listarPorRango(UUID tenantId, UUID sucursalId, OffsetDateTime start, OffsetDateTime end, UUID doctorId) {
        return repository.findByRangeWithDoctorFilter(
                tenantId, sucursalId, start, end, 1, doctorId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Usuario> listarDoctores(UUID tenantId) {
        return usuarioRepository.findByTenantIdAndRolAndRegBorrado(tenantId, UserRole.DOCTOR, 1);
    }

    @Transactional
    public CitaDTO agendar(CitaDTO dto, UUID tenantId, String comprobanteUrl) {
        log.info("Agendando cita desde source: {} con montoTotal: {} y montoPagado recibido: {}", 
                dto.getSource(), dto.getMontoTotal(), dto.getMontoPagado());
        // 1. Validar horario de sucursal
        validarHorarioSucursal(dto.getSucursalId(), dto.getFechaHora(), dto.getDuracionMinutos());

        // 2. Validar disponibilidad del doctor (No traslapes)
        OffsetDateTime finCita = dto.getFechaHora().plusMinutes(dto.getDuracionMinutos());
        if (repository.existsOverlappingExcludingId(dto.getDoctorId(), dto.getFechaHora(), finCita, null)) {
            throw new BusinessException("CHOQUE_CITAS", "El doctor ya tiene una cita agendada en este horario",
                    HttpStatus.CONFLICT);
        }

        // 3. Manejo de Paciente (Si es APP y no existe pacienteId, crear expediente
        // incompleto)
        String source = (dto.getSource() != null) ? dto.getSource().toUpperCase() : "CRM";
        UUID pacienteId = dto.getPacienteId();

        if (pacienteId == null && (source.equals("APP") || source.equals("PUBLIC"))) {
            if (dto.getPacienteNombre() == null || dto.getPacienteNombre().trim().isEmpty()) {
                throw new BusinessException("MISSING_DATA",
                        "El nombre del paciente es obligatorio para agendar desde la App", HttpStatus.BAD_REQUEST);
            }
            Paciente nuevoPaciente = Paciente.builder()
                    .nombreCompleto(dto.getPacienteNombre())
                    .telefono(dto.getPacienteTelefono())
                    .expedienteCompleto(false)
                    .build();
            nuevoPaciente.setTenantId(tenantId);
            nuevoPaciente.setRegBorrado(1);
            pacienteId = pacienteRepository.save(nuevoPaciente).getId();
        } else if (pacienteId == null) {
            throw new BusinessException("MISSING_DATA", "El paciente es obligatorio", HttpStatus.BAD_REQUEST);
        } else {
            // Validar que el paciente exista y pertenezca al tenant
            pacienteRepository.findById(pacienteId)
                    .filter(p -> p.getTenantId().equals(tenantId) && p.getRegBorrado() == 1)
                    .orElseThrow(
                            () -> new BusinessException("NOT_FOUND", "Paciente no encontrado", HttpStatus.NOT_FOUND));
        }

        // 4. Determinar estado inicial
        AppointmentStatus estadoInicial = (source.equals("APP") || source.equals("PUBLIC"))
                ? AppointmentStatus.POR_CONFIRMAR
                : AppointmentStatus.CONFIRMADA;

        // 5. Generar Folio Profesional (CIT-YYYYMMDD-XXX)
        String folio = generarSiguienteFolio(tenantId, "CITA");

        Cita entity = Cita.builder()
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
                .montoTotal(dto.getMontoTotal())
                .build();

        entity.setTenantId(tenantId);
        entity.setRegBorrado(1);
        Cita saved = repository.save(entity);

        // 6. Si es APP o PUBLIC, registrar el intento de anticipo con el comprobante
        if (source.equals("APP") || source.equals("PUBLIC")) {
            Pago anticipo = Pago.builder()
                    .citaId(saved.getId())
                    .pacienteId(pacienteId)
                    .monto(dto.getMontoPagado() != null ? dto.getMontoPagado() : java.math.BigDecimal.ZERO)
                    .metodoPago(PaymentMethod.TRANSFERENCIA)
                    .status(PagoStatus.PENDIENTE_REVISION)
                    .comprobanteUrl(comprobanteUrl)
                    .notas("Anticipo pendiente de validación desde " + source)
                    .build();
            anticipo.setTenantId(tenantId);
            anticipo.setRegBorrado(1);
            pagoRepository.save(anticipo);
            pagoRepository.flush(); // Asegurar que el registro sea visible para la siguiente consulta
            log.info("Anticipo registrado y flusheado para cita ID: {}", saved.getId());
        }

        return mapToDTO(saved);
    }

    @Transactional
    public CitaDTO reprogramar(UUID id, OffsetDateTime nuevaFechaHora, Integer nuevaDuracion, UUID tenantId) {
        Cita entity = repository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        // Validar choque en nuevo horario
        Integer duracion = (nuevaDuracion != null) ? nuevaDuracion : entity.getDuracionMinutos();
        OffsetDateTime finCita = nuevaFechaHora.plusMinutes(duracion);

        // Excluir la misma cita de la validación de traslape
        if (repository.existsOverlappingExcludingId(entity.getDoctorId(), nuevaFechaHora, finCita, id)) {
            throw new BusinessException("CHOQUE_CITAS", "El doctor ya tiene una cita agendada en ese nuevo horario",
                    HttpStatus.CONFLICT);
        }

        validarHorarioSucursal(entity.getSucursalId(), nuevaFechaHora, duracion);

        entity.setFechaHora(nuevaFechaHora);
        entity.setDuracionMinutos(duracion);
        entity.setEstado(AppointmentStatus.CONFIRMADA); // Se marca como confirmada al reprogramar

        return mapToDTO(repository.save(entity));
    }

    @Transactional
    public CitaDTO confirmarCita(UUID id, UUID doctorId, java.math.BigDecimal montoTotal, UUID tenantId) {
        Cita entity = repository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        if (entity.getEstado() != AppointmentStatus.POR_CONFIRMAR) {
            throw new BusinessException("INVALID_STATE", "Solo se pueden confirmar citas en espera",
                    HttpStatus.BAD_REQUEST);
        }

        // Validar disponibilidad del doctor (No traslapes)
        OffsetDateTime start = entity.getFechaHora();
        OffsetDateTime end = start.plusMinutes(entity.getDuracionMinutos());
        
        if (repository.existsOverlappingExcludingId(doctorId, start, end, id)) {
            throw new BusinessException("CHOQUE_CITAS", "El doctor seleccionado ya tiene una cita agendada en este horario",
                    HttpStatus.CONFLICT);
        }

        if (montoTotal != null) {
            entity.setMontoTotal(montoTotal);
        }

        entity.setDoctorId(doctorId);
        entity.setEstado(AppointmentStatus.CONFIRMADA);
        Cita saved = repository.save(entity);

        // APROBACIÓN AUTOMÁTICA DE ANTICIPO
        List<Pago> pagosPendientes = pagoRepository.findByCitaIdAndRegBorrado(id, 1).stream()
                .filter(p -> p.getStatus() == PagoStatus.PENDIENTE_REVISION)
                .collect(Collectors.toList());

        if (!pagosPendientes.isEmpty()) {
            Paciente paciente = pacienteRepository.findById(entity.getPacienteId())
                    .orElseThrow(() -> new BusinessException("NOT_FOUND", "Paciente no encontrado", HttpStatus.NOT_FOUND));

            if (paciente.getSaldoPendiente() == null) {
                paciente.setSaldoPendiente(java.math.BigDecimal.ZERO);
            }

            for (Pago pago : pagosPendientes) {
                pago.setStatus(PagoStatus.APROBADO);
                paciente.setSaldoPendiente(paciente.getSaldoPendiente().subtract(pago.getMonto()));
                pagoRepository.save(pago);
            }
            pacienteRepository.save(paciente);
            log.info("Se aprobaron {} pagos de anticipo automáticamente para la cita {}", pagosPendientes.size(), id);
        }

        return mapToDTO(saved);
    }

    @Transactional
    public CitaDTO rechazarCita(UUID id, String motivo, UUID tenantId) {
        Cita entity = repository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        if (entity.getEstado() != AppointmentStatus.POR_CONFIRMAR) {
            throw new BusinessException("INVALID_STATE", "Solo se pueden rechazar citas en espera",
                    HttpStatus.BAD_REQUEST);
        }

        entity.setEstado(AppointmentStatus.CANCELADA);
        entity.setMotivoRechazo(motivo);
        return mapToDTO(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<CitaDTO> listarPorConfirmar(UUID tenantId, UUID sucursalId) {
        if (sucursalId != null) {
            return repository.findByTenantIdAndSucursalIdAndEstadoAndRegBorrado(tenantId, sucursalId, AppointmentStatus.POR_CONFIRMAR, 1)
                    .stream().map(this::mapToDTO).collect(Collectors.toList());
        }
        return repository.findByTenantIdAndEstadoAndRegBorrado(tenantId, AppointmentStatus.POR_CONFIRMAR, 1)
                .stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public CitaDTO actualizarEstado(UUID id, AppointmentStatus nuevoEstado, java.math.BigDecimal montoTotal,
            UUID tenantId) {
        Cita entity = repository.findById(id)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        entity.setEstado(nuevoEstado);
        if (montoTotal != null) {
            entity.setMontoTotal(montoTotal);
        }
        return mapToDTO(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<DisponibilidadDiaDTO> obtenerDisponibilidadMes(UUID tenantId, UUID sucursalId, int mes, int anio) {
        YearMonth yearMonth = YearMonth.of(anio, mes);
        List<DisponibilidadDiaDTO> disponibilidad = new ArrayList<>();

        List<Usuario> doctores = usuarioRepository.findByTenantIdAndRolAndRegBorrado(tenantId, UserRole.DOCTOR, 1)
                .stream()
                .filter(d -> d.getSucursalIdPrincipal() != null && d.getSucursalIdPrincipal().equals(sucursalId))
                .collect(Collectors.toList());

        for (int day = 1; day <= yearMonth.lengthOfMonth(); day++) {
            LocalDate fecha = yearMonth.atDay(day);
            DayConfig config = obtenerConfiguracionDia(sucursalId, fecha);

            boolean esLaboral = config != null && config.isActive();
            boolean estaLlena = true;

            if (esLaboral && !doctores.isEmpty()) {
                // Verificar si hay al menos un slot disponible en el día (paso de 30 min)
                List<SlotDisponibilidadDTO> slots = calcularSlotsParaFecha(tenantId, sucursalId, fecha, 30, doctores);
                estaLlena = slots.stream().noneMatch(SlotDisponibilidadDTO::isDisponible);
            }

            disponibilidad.add(new DisponibilidadDiaDTO(fecha, estaLlena, esLaboral));
        }

        return disponibilidad;
    }

    @Transactional(readOnly = true)
    public List<SlotDisponibilidadDTO> obtenerSlotsDisponibles(UUID tenantId, UUID sucursalId, LocalDate fecha,
            UUID servicioId) {
        ServicioDental servicio = servicioDentalRepository.findByIdAndTenantIdAndRegBorrado(servicioId, tenantId, 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Servicio no encontrado", HttpStatus.NOT_FOUND));

        List<Usuario> doctores = usuarioRepository.findByTenantIdAndRolAndRegBorrado(tenantId, UserRole.DOCTOR, 1)
                .stream()
                .filter(d -> d.getSucursalIdPrincipal() != null && d.getSucursalIdPrincipal().equals(sucursalId))
                .collect(Collectors.toList());

        int duracion = servicio.getDuracionMinutos() != null ? servicio.getDuracionMinutos() : 30;

        return calcularSlotsParaFecha(tenantId, sucursalId, fecha, duracion, doctores);
    }

    private List<SlotDisponibilidadDTO> calcularSlotsParaFecha(UUID tenantId, UUID sucursalId, LocalDate fecha,
            int duracion, List<Usuario> doctores) {
        List<SlotDisponibilidadDTO> slots = new ArrayList<>();
        DayConfig config = obtenerConfiguracionDia(sucursalId, fecha);

        if (config == null || !config.isActive() || config.getStartTime() == null || config.getEndTime() == null) {
            return slots;
        }

        LocalTime apertura = LocalTime.parse(config.getStartTime());
        LocalTime cierre = LocalTime.parse(config.getEndTime());

        LocalTime actual = apertura;
        while (actual.plusMinutes(duracion).isBefore(cierre) || actual.plusMinutes(duracion).equals(cierre)) {
            LocalTime finSlot = actual.plusMinutes(duracion);
            OffsetDateTime slotStart = actual.atDate(fecha).atOffset(OffsetDateTime.now().getOffset());
            OffsetDateTime slotEnd = finSlot.atDate(fecha).atOffset(OffsetDateTime.now().getOffset());

            boolean disponible = false;
            for (Usuario doctor : doctores) {
                // Si el doctor está libre en este rango, el slot es tomable
                if (!repository.existsOverlapping(doctor.getId(), slotStart, slotEnd)) {
                    disponible = true;
                    break;
                }
            }

            if (fecha.equals(LocalDate.now()) && slotStart.isBefore(OffsetDateTime.now())) {
                disponible = false;
            }

            slots.add(new SlotDisponibilidadDTO(actual, finSlot, disponible));
            actual = actual.plusMinutes(30); // Usamos paso de 30 min para dar más flexibilidad
        }

        return slots;
    }

    private DayConfig obtenerConfiguracionDia(UUID sucursalId, LocalDate fecha) {
        Sucursal sucursal = sucursalRepository.findById(sucursalId).orElse(null);
        if (sucursal == null || sucursal.getHorariosLaborales() == null)
            return null;

        try {
            String json = sucursal.getHorariosLaborales();
            if (json.trim().startsWith("{")) {
                java.util.Map<String, DayConfig> configs = objectMapper.readValue(json,
                        new TypeReference<java.util.Map<String, DayConfig>>() {
                        });

                String englishKey = fecha.getDayOfWeek().name().toLowerCase();
                String spanishKey = fecha.getDayOfWeek().getDisplayName(TextStyle.FULL, new Locale("es", "ES"))
                        .toLowerCase();

                DayConfig config = configs.get(englishKey);
                if (config == null) {
                    config = configs.get(spanishKey);
                }
                return config;
            } else {
                List<java.util.Map<String, Object>> list = objectMapper.readValue(json,
                        new TypeReference<List<java.util.Map<String, Object>>>() {
                        });
                String daySpanish = fecha.getDayOfWeek().getDisplayName(TextStyle.FULL, new Locale("es", "ES"));
                for (java.util.Map<String, Object> item : list) {
                    if (daySpanish.equalsIgnoreCase((String) item.get("day"))) {
                        return objectMapper.convertValue(item, DayConfig.class);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error al parsear horarios: {}", e.getMessage());
        }
        return null;
    }

    private String generarSiguienteFolio(UUID tenantId, String tipo) {
        java.time.LocalDate hoy = java.time.LocalDate.now();
        RegistroFolio registro = folioRepository
                .findByTenantIdAndTipoAndFechaAndRegBorrado(tenantId, tipo, hoy, 1)
                .orElseGet(() -> {
                    RegistroFolio nuevo = RegistroFolio
                            .builder()
                            .tipo(tipo)
                            .fecha(hoy)
                            .ultimoNumero(0)
                            .build();
                    nuevo.setTenantId(tenantId);
                    nuevo.setRegBorrado(1);
                    return nuevo;
                });

        int siguiente = registro.getUltimoNumero() + 1;
        registro.setUltimoNumero(siguiente);
        folioRepository.save(registro);

        String fechaStr = hoy.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        return String.format("CIT-%s-%04d", fechaStr, siguiente);
    }

    private void validarHorarioSucursal(UUID sucursalId, OffsetDateTime fechaHora, Integer duracion) {
        if (fechaHora.isBefore(OffsetDateTime.now())) {
            throw new BusinessException("PAST_DATE", "No se puede agendar en el pasado", HttpStatus.BAD_REQUEST);
        }

        DayConfig config = obtenerConfiguracionDia(sucursalId, fechaHora.toLocalDate());

        if (config != null) {
            if (!config.isActive()) {
                throw new BusinessException("CLOSED_DAY", "La sucursal está cerrada este " +
                        fechaHora.getDayOfWeek().getDisplayName(TextStyle.FULL,
                                new java.util.Locale("es", "ES")),
                        HttpStatus.BAD_REQUEST);
            }

            if (config.getStartTime() != null && config.getEndTime() != null) {
                try {
                    LocalTime apertura = LocalTime.parse(config.getStartTime());
                    LocalTime cierre = LocalTime.parse(config.getEndTime());
                    LocalTime citaInicio = fechaHora.toLocalTime();
                    LocalTime citaFin = fechaHora.plusMinutes(duracion).toLocalTime();

                    log.info("Validando horario: Cita {}-{} | Sucursal {}-{}",
                            citaInicio, citaFin, apertura, cierre);

                    if (citaInicio.isBefore(apertura) || citaInicio.isAfter(cierre)) {
                        log.warn("Cita fuera de rango: Inicio {} < Apertura {} o Inicio {} > Cierre {}",
                                citaInicio, apertura, citaInicio, cierre);
                        throw new BusinessException("OUT_OF_HOURS", "Fuera de horario laboral",
                                HttpStatus.BAD_REQUEST);
                    }

                    if (citaFin.isAfter(cierre)) {
                        log.warn("Cita excede cierre: Fin {} > Cierre {}", citaFin, cierre);
                        throw new BusinessException("OUT_OF_HOURS", "La cita termina después del cierre",
                                HttpStatus.BAD_REQUEST);
                    }
                } catch (BusinessException e) {
                    throw e;
                } catch (Exception e) {
                    log.error("Error al validar horario: {}", e.getMessage());
                }
            }
        }
    }

    private CitaDTO mapToDTO(Cita entity) {
        CitaDTO dto = CitaDTO.builder()
                .id(entity.getId())
                .pacienteId(entity.getPacienteId())
                .doctorId(entity.getDoctorId())
                .sucursalId(entity.getSucursalId())
                .servicioId(entity.getServicioId())
                .fechaHora(entity.getFechaHora())
                .duracionMinutos(entity.getDuracionMinutos())
                .estado(entity.getEstado())
                .source(entity.getSource())
                .folio(entity.getFolio())
                .motivoConsulta(entity.getMotivoConsulta())
                .notasRecepcion(entity.getNotasRecepcion())
                .montoTotal(entity.getMontoTotal())
                .motivoRechazo(entity.getMotivoRechazo())
                .build();

        // Mapear pagos y comprobante
        List<Pago> pagos = pagoRepository.findByCitaIdAndRegBorrado(entity.getId(), 1);
        
        java.math.BigDecimal totalPagado = pagos.stream()
                .filter(p -> p.getRegBorrado() == 1 && p.getStatus() != PagoStatus.RECHAZADO && p.getStatus() != PagoStatus.CANCELADO)
                .map(p -> p.getMonto() != null ? p.getMonto() : java.math.BigDecimal.ZERO)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        
        dto.setMontoPagado(totalPagado);
        
        log.info("Mapeando Cita {}: Total={}, Pagado={}, PagosEncontrados={}", 
                entity.getFolio(), dto.getMontoTotal(), dto.getMontoPagado(), pagos.size());

        pagos.stream()
                .filter(p -> p.getComprobanteUrl() != null && !p.getComprobanteUrl().isEmpty())
                .findFirst()
                .ifPresent(p -> dto.setComprobanteUrl(p.getComprobanteUrl()));

        // Enriquecer con nombres (Opcional pero recomendado para el frontend)
        pacienteRepository.findById(entity.getPacienteId())
                .ifPresent(p -> {
                    dto.setPacienteNombre(p.getNombreCompleto());
                    dto.setPacienteTelefono(p.getTelefono());
                });

        usuarioRepository.findById(entity.getDoctorId())
                .ifPresent(d -> dto.setDoctorNombre(d.getNombreCompleto()));

        servicioDentalRepository.findByIdAndTenantIdAndRegBorrado(entity.getServicioId(), entity.getTenantId(), 1)
                .ifPresent(s -> dto.setServicioNombre(s.getNombre()));

        if (dto.getMontoTotal() == null) dto.setMontoTotal(java.math.BigDecimal.ZERO);
        if (dto.getMontoPagado() == null) dto.setMontoPagado(java.math.BigDecimal.ZERO);

        return dto;
    }
}
