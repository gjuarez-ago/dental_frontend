package com.meyisoft.dental.system.repository;

import com.meyisoft.dental.system.entity.Cita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface CitaRepository extends JpaRepository<Cita, UUID> {
    List<Cita> findByTenantIdAndRegBorrado(UUID tenantId, Integer regBorrado);
    
    List<Cita> findByTenantIdAndSucursalIdAndFechaHoraBetweenAndRegBorrado(
            UUID tenantId, UUID sucursalId, OffsetDateTime start, OffsetDateTime end, Integer regBorrado);

    // Búsqueda de traslapes para un doctor específico (Sintaxis Nativa PostgreSQL)
    @Query(nativeQuery = true, value =
            "SELECT COUNT(*) > 0 FROM citas c " +
            "WHERE c.doctor_id = :doctorId " +
            "AND c.reg_borrado = 1 " +
            "AND c.estado NOT IN ('CANCELADA', 'AUSENTE') " +
            "AND ( " +
            "   (c.fecha_hora <= :start AND (c.fecha_hora + (c.duracion_minutos * INTERVAL '1 minute')) > :start) " +
            "   OR (c.fecha_hora < :end AND c.fecha_hora >= :start) " +
            ")")
    boolean existsOverlapping(UUID doctorId, OffsetDateTime start, OffsetDateTime end);
}
