package com.meyisoft.dental.system.repository;

import com.meyisoft.dental.system.entity.Cita;
import com.meyisoft.dental.system.enums.AppointmentStatus;
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

        @Query("SELECT c FROM Cita c WHERE c.tenantId = :tenantId AND c.sucursalId = :sucursalId " +
                        "AND c.fechaHora BETWEEN :start AND :end AND c.regBorrado = :regBorrado " +
                        "AND (:doctorId IS NULL OR c.doctorId = :doctorId OR c.estado = 'POR_CONFIRMAR')")
        List<Cita> findByRangeWithDoctorFilter(
                        @org.springframework.data.repository.query.Param("tenantId") UUID tenantId,
                        @org.springframework.data.repository.query.Param("sucursalId") UUID sucursalId,
                        @org.springframework.data.repository.query.Param("start") OffsetDateTime start,
                        @org.springframework.data.repository.query.Param("end") OffsetDateTime end,
                        @org.springframework.data.repository.query.Param("regBorrado") Integer regBorrado,
                        @org.springframework.data.repository.query.Param("doctorId") UUID doctorId);

        @Query("SELECT COUNT(c) FROM Cita c WHERE c.tenantId = :tenantId AND c.sucursalId = :sucursalId " +
                        "AND c.fechaHora BETWEEN :start AND :end AND c.regBorrado = 1 " +
                        "AND c.estado NOT IN (com.meyisoft.dental.system.enums.AppointmentStatus.CANCELADA, com.meyisoft.dental.system.enums.AppointmentStatus.AUSENTE) "
                        +
                        "AND (:doctorId IS NULL OR c.doctorId = :doctorId)")
        long countApptsByRange(
                        @org.springframework.data.repository.query.Param("tenantId") UUID tenantId,
                        @org.springframework.data.repository.query.Param("sucursalId") UUID sucursalId,
                        @org.springframework.data.repository.query.Param("start") OffsetDateTime start,
                        @org.springframework.data.repository.query.Param("end") OffsetDateTime end,
                        @org.springframework.data.repository.query.Param("doctorId") UUID doctorId);

        List<Cita> findByTenantIdAndEstadoAndRegBorrado(UUID tenantId, AppointmentStatus estado, Integer regBorrado);

        List<Cita> findByTenantIdAndSucursalIdAndEstadoAndRegBorrado(UUID tenantId, UUID sucursalId,
                        AppointmentStatus estado, Integer regBorrado);

        // Búsqueda de traslapes para un doctor específico (Sintaxis Nativa PostgreSQL)
        @Query(nativeQuery = true, value = "SELECT COUNT(*) > 0 FROM citas c " +
                        "WHERE c.doctor_id = :doctorId " +
                        "AND c.reg_borrado = 1 " +
                        "AND c.estado NOT IN ('CANCELADA', 'AUSENTE') " +
                        "AND ( " +
                        "   (c.fecha_hora <= :start AND (c.fecha_hora + (c.duracion_minutos * INTERVAL '1 minute')) > :start) "
                        +
                        "   OR (c.fecha_hora < :end AND c.fecha_hora >= :start) " +
                        ")")
        boolean existsOverlapping(UUID doctorId, OffsetDateTime start, OffsetDateTime end);

        @Query(nativeQuery = true, value = "SELECT COUNT(*) > 0 FROM citas c " +
                        "WHERE c.doctor_id = :doctorId " +
                        "AND c.id != :excludeId " +
                        "AND c.reg_borrado = 1 " +
                        "AND c.estado NOT IN ('CANCELADA', 'AUSENTE') " +
                        "AND ( " +
                        "   (c.fecha_hora <= :start AND (c.fecha_hora + (c.duracion_minutos * INTERVAL '1 minute')) > :start) "
                        +
                        "   OR (c.fecha_hora < :end AND c.fecha_hora >= :start) " +
                        ")")
        boolean existsOverlappingExcludingId(UUID doctorId, OffsetDateTime start, OffsetDateTime end, UUID excludeId);

        @Query(nativeQuery = true, value = "SELECT COUNT(*) FROM citas c " +
                        "WHERE c.tenant_id = :tenantId AND c.sucursal_id = :sucursalId " +
                        "AND c.reg_borrado = 1 " +
                        "AND c.estado NOT IN ('CANCELADA', 'AUSENTE') " +
                        "AND ( " +
                        "   (c.fecha_hora <= :start AND (c.fecha_hora + (c.duracion_minutos * INTERVAL '1 minute')) > :start) "
                        +
                        "   OR (c.fecha_hora < :end AND c.fecha_hora >= :start) " +
                        ")")
        long countOverlappingSucursal(UUID tenantId, UUID sucursalId, OffsetDateTime start, OffsetDateTime end);

        @Query(nativeQuery = true, value = "SELECT COUNT(*) FROM citas c " +
                        "WHERE c.tenant_id = :tenantId AND c.paciente_id = :pacienteId " +
                        "AND c.reg_borrado = 1 " +
                        "AND c.estado NOT IN ('CANCELADA', 'AUSENTE') " +
                        "AND ( " +
                        "   (c.fecha_hora <= :start AND (c.fecha_hora + (c.duracion_minutos * INTERVAL '1 minute')) > :start) "
                        +
                        "   OR (c.fecha_hora < :end AND c.fecha_hora >= :start) " +
                        ")")
        long countOverlappingPaciente(UUID tenantId, UUID pacienteId, OffsetDateTime start, OffsetDateTime end);

        @Query(nativeQuery = true, value = "SELECT COUNT(*) FROM citas c " +
                        "WHERE c.tenant_id = :tenantId AND c.sucursal_id = :sucursalId " +
                        "AND c.id != :excludeId " +
                        "AND c.reg_borrado = 1 " +
                        "AND c.estado NOT IN ('CANCELADA', 'AUSENTE') " +
                        "AND ( " +
                        "   (c.fecha_hora <= :start AND (c.fecha_hora + (c.duracion_minutos * INTERVAL '1 minute')) > :start) "
                        +
                        "   OR (c.fecha_hora < :end AND c.fecha_hora >= :start) " +
                        ")")
        long countOverlappingSucursalExcludingId(UUID tenantId, UUID sucursalId, OffsetDateTime start,
                        OffsetDateTime end, UUID excludeId);

        @Query(nativeQuery = true, value = "SELECT COUNT(*) FROM citas c " +
                        "WHERE c.tenant_id = :tenantId AND c.paciente_id = :pacienteId " +
                        "AND c.id != :excludeId " +
                        "AND c.reg_borrado = 1 " +
                        "AND c.estado NOT IN ('CANCELADA', 'AUSENTE') " +
                        "AND ( " +
                        "   (c.fecha_hora <= :start AND (c.fecha_hora + (c.duracion_minutos * INTERVAL '1 minute')) > :start) "
                        +
                        "   OR (c.fecha_hora < :end AND c.fecha_hora >= :start) " +
                        ")")
        long countOverlappingPacienteExcludingId(UUID tenantId, UUID pacienteId, OffsetDateTime start,
                        OffsetDateTime end, UUID excludeId);

        @Query(nativeQuery = true, value = "SELECT COUNT(*) FROM citas c " +
                        "WHERE c.tenant_id = :tenantId AND c.sucursal_id = :sucursalId " +
                        "AND c.reg_borrado = 1 " +
                        "AND c.estado NOT IN ('CANCELADA', 'AUSENTE') " +
                        "AND ( " +
                        "   (c.fecha_hora <= :start AND (c.fecha_hora + (c.duracion_minutos * INTERVAL '1 minute')) > :start) "
                        +
                        "   OR (c.fecha_hora < :end AND c.fecha_hora >= :start) " +
                        ")")
        long countCitasEnRango(UUID tenantId, UUID sucursalId, OffsetDateTime start, OffsetDateTime end);
}
