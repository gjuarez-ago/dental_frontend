package com.meyisoft.dental.system.repository;

import com.meyisoft.dental.system.entity.Sucursal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SucursalRepository extends JpaRepository<Sucursal, UUID> {
    Iterable<Sucursal> findAllByTenantIdAndRegBorrado(UUID tenantId, Integer regBorrado);
    List<Sucursal> findByTenantIdAndRegBorrado(UUID tenantId, Integer regBorrado);
}
