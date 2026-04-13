package com.meyisoft.dental.system.repository;

import com.meyisoft.dental.system.entity.ServicioDental;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServicioDentalRepository extends JpaRepository<ServicioDental, UUID> {
    
    List<ServicioDental> findByTenantIdAndRegBorrado(UUID tenantId, Integer regBorrado);
    
    Optional<ServicioDental> findByIdAndTenantIdAndRegBorrado(UUID id, UUID tenantId, Integer regBorrado);
}
