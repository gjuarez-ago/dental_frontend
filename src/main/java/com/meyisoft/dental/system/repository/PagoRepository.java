package com.meyisoft.dental.system.repository;

import com.meyisoft.dental.system.entity.Pago;
import com.meyisoft.dental.system.enums.PagoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PagoRepository extends JpaRepository<Pago, UUID> {

    List<Pago> findByTenantIdAndRegBorrado(UUID tenantId, Integer regBorrado);

    List<Pago> findByCitaIdAndRegBorrado(UUID citaId, Integer regBorrado);

    @Query("SELECT COALESCE(SUM(p.monto), 0) FROM Pago p LEFT JOIN Cita c ON p.citaId = c.id " +
           "WHERE p.tenantId = :tenantId AND p.status = com.meyisoft.dental.system.enums.PagoStatus.APROBADO " +
           "AND p.regBorrado = 1 AND p.createdAt BETWEEN :start AND :end " +
           "AND (:doctorId IS NULL OR c.doctorId = :doctorId)")
    BigDecimal sumIngresosByTenantAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("start") OffsetDateTime start,
            @Param("end") OffsetDateTime end,
            @Param("doctorId") UUID doctorId);

    // Alias para compatibilidad con el remoto
    default BigDecimal sumIngresosByRange(UUID tenantId, OffsetDateTime start, OffsetDateTime end, UUID doctorId) {
        return sumIngresosByTenantAndDateRange(tenantId, start, end, doctorId);
    }

    List<Pago> findByTenantIdAndStatusAndCreatedAtBetweenAndRegBorrado(
            UUID tenantId, PagoStatus status,
            OffsetDateTime start, OffsetDateTime end, Integer regBorrado);

    @Query("SELECT COALESCE(SUM(p.monto), 0) FROM Pago p LEFT JOIN Cita c ON p.citaId = c.id " +
           "WHERE p.tenantId = :tenantId AND p.status = com.meyisoft.dental.system.enums.PagoStatus.PENDIENTE_REVISION " +
           "AND p.regBorrado = 1 AND (:doctorId IS NULL OR c.doctorId = :doctorId)")
    BigDecimal sumIngresosPendientesByTenant(
            @Param("tenantId") UUID tenantId,
            @Param("doctorId") UUID doctorId);

    @Query("SELECT COUNT(p) FROM Pago p LEFT JOIN Cita c ON p.citaId = c.id " +
           "WHERE p.tenantId = :tenantId AND p.status = com.meyisoft.dental.system.enums.PagoStatus.PENDIENTE_REVISION " +
           "AND p.regBorrado = 1 AND (:doctorId IS NULL OR c.doctorId = :doctorId)")
    long countPendingPaymentsByDoctor(
            @Param("tenantId") UUID tenantId,
            @Param("doctorId") UUID doctorId);

    long countByTenantIdAndStatusAndRegBorrado(UUID tenantId, PagoStatus status, Integer regBorrado);

    List<Pago> findAllByCitaIdInAndRegBorrado(Collection<UUID> citaIds, Integer regBorrado);
}
