package com.meyisoft.dental.system.repository;

import com.meyisoft.dental.system.entity.Pago;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PagoRepository extends JpaRepository<Pago, UUID> {
    List<Pago> findByTenantIdAndRegBorrado(UUID tenantId, Integer regBorrado);
    
    List<Pago> findByCitaIdAndRegBorrado(UUID citaId, Integer regBorrado);
}
