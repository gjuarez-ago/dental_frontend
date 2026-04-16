package com.meyisoft.dental.system.repository;

import com.meyisoft.dental.system.entity.Paciente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PacienteRepository extends JpaRepository<Paciente, UUID> {
    
    List<Paciente> findByTenantIdAndRegBorrado(UUID tenantId, Integer regBorrado);
    
    Optional<Paciente> findByIdAndTenantIdAndRegBorrado(UUID id, UUID tenantId, Integer regBorrado);

    /**
     * Consulta optimizada que trae a los pacientes con su próxima cita (si existe)
     * ordenados por:
     * 1. Cercanía de la próxima cita (Ascendente).
     * 2. Fecha de creación (Descendente) para los que no tienen cita.
     */
    @Query(value = "SELECT p.*, " +
           "(SELECT MIN(c.fecha_hora) FROM citas c WHERE c.paciente_id = p.id AND c.fecha_hora >= NOW() AND c.reg_borrado = 1) as proxima_cita " +
           "FROM pacientes p " +
           "WHERE p.tenant_id = :tenantId AND p.reg_borrado = 1 " +
           "ORDER BY " +
           "CASE WHEN (SELECT MIN(c.fecha_hora) FROM citas c WHERE c.paciente_id = p.id AND c.fecha_hora >= NOW() AND c.reg_borrado = 1) IS NOT NULL THEN 0 ELSE 1 END, " +
           "(SELECT MIN(c.fecha_hora) FROM citas c WHERE c.paciente_id = p.id AND c.fecha_hora >= NOW() AND c.reg_borrado = 1) ASC, " +
           "p.created_at DESC", 
           nativeQuery = true)
    List<Paciente> findListadoPriorizado(@Param("tenantId") UUID tenantId);
}
