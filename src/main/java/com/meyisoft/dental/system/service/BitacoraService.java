package com.meyisoft.dental.system.service;

import com.meyisoft.dental.system.entity.Bitacora;
import com.meyisoft.dental.system.repository.BitacoraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BitacoraService {

    private final BitacoraRepository repository;

    @Async
    @Transactional
    public void registrar(UUID tenantId, UUID usuarioId, String modulo, String accion, String descripcion, UUID entidadId) {
        Bitacora log = Bitacora.builder()
                .id(UUID.randomUUID())
                .tenantId(tenantId)
                .usuarioId(usuarioId)
                .modulo(modulo)
                .accion(accion)
                .descripcion(descripcion)
                .entidadRelacionadaId(entidadId)
                .createdAt(OffsetDateTime.now(com.meyisoft.dental.system.utils.DateUtils.MEXICO_OFFSET))
                .build();
        repository.save(log);
    }
}
