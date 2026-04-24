package com.meyisoft.dental.system.service;

import com.meyisoft.dental.system.entity.Cita;
import com.meyisoft.dental.system.entity.Paciente;
import com.meyisoft.dental.system.entity.Pago;
import com.meyisoft.dental.system.entity.ServicioDental;
import com.meyisoft.dental.system.enums.AppointmentStatus;
import com.meyisoft.dental.system.enums.PagoStatus;
import com.meyisoft.dental.system.enums.PaymentMethod;
import com.meyisoft.dental.system.enums.TicketStatus;
import com.meyisoft.dental.system.exception.BusinessException;
import com.meyisoft.dental.system.models.dto.CitaResumenFinancieroDTO;
import com.meyisoft.dental.system.models.dto.PagoDTO;
import com.meyisoft.dental.system.repository.CitaRepository;
import com.meyisoft.dental.system.repository.PacienteRepository;
import com.meyisoft.dental.system.repository.PagoRepository;
import com.meyisoft.dental.system.repository.ServicioDentalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PagoService {

    private final PagoRepository repository;
    private final PacienteRepository pacienteRepository;
    private final CitaRepository citaRepository;
    private final ServicioDentalRepository servicioRepository;

    @Transactional
    public PagoDTO registrarPago(PagoDTO dto, UUID tenantId) {
        log.info("Registrando pago de {} para cita {}", dto.getMonto(), dto.getCitaId());

        // 0. ACTUALIZAR MONTO TOTAL DE LA CITA SI SE PROVEE
        if (dto.getMontoTotalCita() != null) {
            Cita cita = citaRepository.findById(dto.getCitaId())
                    .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                    .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

            cita.setMontoTotal(dto.getMontoTotalCita());
            citaRepository.save(cita);
            log.info("Costo total de la cita actualizado a {}", dto.getMontoTotalCita());
        }

        // 1. Validar Cita y Saldo Actual (Usará el nuevo monto si se actualizó arriba)
        CitaResumenFinancieroDTO resumen = obtenerResumenCita(dto.getCitaId(), tenantId);

        if (dto.getMonto().compareTo(resumen.getSaldoPendiente()) > 0) {
            throw new BusinessException("EXCESSIVE_PAYMENT",
                    "No se permite saldo a favor. El monto máximo permitido es " + resumen.getSaldoPendiente(),
                    HttpStatus.BAD_REQUEST);
        }

        // 2. Validar Paciente
        Paciente paciente = pacienteRepository.findById(dto.getPacienteId())
                .filter(p -> p.getTenantId().equals(tenantId) && p.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Paciente no encontrado", HttpStatus.NOT_FOUND));

        // 2. Crear Entidad Pago
        // Determinar estado inicial del pago según el método
        PagoStatus initialStatus = (dto.getMetodoPago() == PaymentMethod.TRANSFERENCIA)
                ? PagoStatus.PENDIENTE_REVISION
                : PagoStatus.APROBADO;

        Pago entity = Pago.builder()
                .citaId(dto.getCitaId())
                .pacienteId(dto.getPacienteId())
                .monto(dto.getMonto())
                .metodoPago(dto.getMetodoPago())
                .notas(dto.getNotas())
                .folioPago(dto.getFolioPago())
                .comprobanteUrl(dto.getComprobanteUrl())
                .status(initialStatus)
                .build();

        entity.setTenantId(tenantId);
        entity.setRegBorrado(1);

        Pago saved = repository.save(entity);

        // 3. ACTUALIZAR DEUDA DEL PACIENTE
        // La deuda disminuye con el pago
        if (paciente.getSaldoPendiente() == null) {
            paciente.setSaldoPendiente(BigDecimal.ZERO);
        }
        paciente.setSaldoPendiente(paciente.getSaldoPendiente().subtract(dto.getMonto()));
        pacienteRepository.save(paciente);

        // 4. FINALIZAR CITA SI SALDO ES 0 Y ESTÁ EN POR_LIQUIDAR
        checkAndFinalizeCita(dto.getCitaId(), tenantId);

        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public CitaResumenFinancieroDTO obtenerResumenCita(UUID citaId, UUID tenantId) {
        Cita cita = citaRepository.findById(citaId)
                .filter(c -> c.getTenantId().equals(tenantId) && c.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Cita no encontrada", HttpStatus.NOT_FOUND));

        Paciente paciente = pacienteRepository.findById(cita.getPacienteId())
                .orElse(new Paciente());

        ServicioDental servicio = servicioRepository.findById(cita.getServicioId())
                .orElse(new ServicioDental());

        List<Pago> pagos = repository.findByCitaIdAndRegBorrado(citaId, 1);

        // Prioridad: 1. montoTotal de la cita, 2. precioBase del servicio
        BigDecimal costoBase = (cita.getMontoTotal() != null) ? cita.getMontoTotal() : servicio.getPrecioBase();

        // Solo sumamos los pagos que ya están APROBADOS
        BigDecimal totalPagado = pagos.stream()
                .filter(p -> p.getStatus() == PagoStatus.APROBADO)
                .map(Pago::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal saldoPendienteCita = (costoBase != null)
                ? costoBase.subtract(totalPagado)
                : BigDecimal.ZERO;

        // Determinar Estado del Ticket
        TicketStatus estadoTicket;
        boolean tienePendientesRevision = pagos.stream().anyMatch(p -> p.getStatus() == PagoStatus.PENDIENTE_REVISION);

        if (cita.getMontoTotal() == null) {
            estadoTicket = TicketStatus.POR_DEFINIR;
        } else if (tienePendientesRevision) {
            estadoTicket = TicketStatus.EN_REVISION;
        } else if (cita.getMontoTotal().compareTo(BigDecimal.ZERO) == 0) {
            estadoTicket = TicketStatus.CORTESIA;
        } else if (totalPagado.compareTo(BigDecimal.ZERO) == 0) {
            estadoTicket = TicketStatus.PENDIENTE;
        } else if (totalPagado.compareTo(cita.getMontoTotal()) >= 0) {
            estadoTicket = TicketStatus.LIQUIDADO;
        } else {
            estadoTicket = TicketStatus.ABONADO;
        }

        return CitaResumenFinancieroDTO.builder()
                .citaId(citaId)
                .pacienteNombre(paciente.getNombreCompleto())
                .servicioNombre(servicio.getNombre())
                .precioBase(costoBase) // Usamos el costo real/negociado
                .totalPagado(totalPagado)
                .saldoPendiente(saldoPendienteCita)
                .costoDefinido(cita.getMontoTotal() != null)
                .estadoTicket(estadoTicket)
                .historialPagos(pagos.stream().map(p -> this.mapToDTO(p)).collect(Collectors.toList()))
                .build();
    }

    @Transactional
    public PagoDTO actualizarStatus(UUID pagoId, PagoStatus nuevoStatus, String motivo, UUID tenantId) {
        Pago pago = repository.findById(pagoId)
                .filter(p -> p.getTenantId().equals(tenantId) && p.getRegBorrado() == 1)
                .orElseThrow(() -> new BusinessException("NOT_FOUND", "Pago no encontrado", HttpStatus.NOT_FOUND));

        pago.setStatus(nuevoStatus);
        if (nuevoStatus == PagoStatus.RECHAZADO) {
            pago.setMotivoRechazo(motivo);
            if (motivo == null || motivo.trim().isEmpty()) {
                throw new BusinessException("NOT_FOUND", "El motivo de rechazo es obligatorio", HttpStatus.BAD_REQUEST);
            }
        }
        Pago saved = repository.save(pago);

        // Si el pago fue aprobado, verificar si se debe finalizar la cita
        if (nuevoStatus == PagoStatus.APROBADO) {
            checkAndFinalizeCita(pago.getCitaId(), tenantId);
        }

        return mapToDTO(saved);
    }

    private void checkAndFinalizeCita(UUID citaId, UUID tenantId) {
        CitaResumenFinancieroDTO resumen = obtenerResumenCita(citaId, tenantId);
        if (resumen.getEstadoTicket() == TicketStatus.LIQUIDADO) {
            citaRepository.findById(citaId).ifPresent(cita -> {
                if (cita.getEstado() == AppointmentStatus.POR_LIQUIDAR) {
                    cita.setEstado(AppointmentStatus.FINALIZADA);
                    citaRepository.save(cita);
                    log.info("Cita {} finalizada automáticamente tras liquidación", citaId);
                }
            });
        }
    }

    private PagoDTO mapToDTO(Pago entity) {
        return PagoDTO.builder()
                .id(entity.getId())
                .citaId(entity.getCitaId())
                .pacienteId(entity.getPacienteId())
                .monto(entity.getMonto())
                .metodoPago(entity.getMetodoPago())
                .notas(entity.getNotas())
                .folioPago(entity.getFolioPago())
                .comprobanteUrl(entity.getComprobanteUrl())
                .status(entity.getStatus())
                .motivoRechazo(entity.getMotivoRechazo())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
