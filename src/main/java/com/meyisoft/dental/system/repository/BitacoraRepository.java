package com.meyisoft.dental.system.repository;

import com.meyisoft.dental.system.entity.Bitacora;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BitacoraRepository extends JpaRepository<Bitacora, UUID> {
}
