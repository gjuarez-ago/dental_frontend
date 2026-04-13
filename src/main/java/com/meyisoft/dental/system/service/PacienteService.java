package com.meyisoft.dental.system.service;

import com.meyisoft.dental.system.entity.Paciente;
import com.meyisoft.dental.system.exception.BusinessException;
import com.meyisoft.dental.system.exception.ErrorCodes;
import com.meyisoft.dental.system.models.dto.PacienteDTO;
import com.meyisoft.dental.system.repository.PacienteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PacienteService {

    private final PacienteRepository pacienteRepository;

    @Transactional(readOnly = true)
    public List<PacienteDTO> obtenerListadoPriorizado(UUID tenantId) {
        return pacienteRepository.findListadoPriorizado(tenantId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public PacienteDTO crearPaciente(PacienteDTO dto, UUID tenantId) {
        Paciente paciente = Paciente.builder()
                .nombreCompleto(dto.getNombreCompleto())
                .fechaNacimiento(dto.getFechaNacimiento())
                .telefono(dto.getTelefono())
                .email(dto.getEmail())
                .genero(dto.getGenero())
                .curp(dto.getCurp())
                .direccion(dto.getDireccion())
                .ocupacion(dto.getOcupacion())
                .alergias(dto.getAlergias())
                .enfermedadesCronicas(dto.getEnfermedadesCronicas())
                .medicamentosActuales(dto.getMedicamentosActuales())
                .emergenciaNombre(dto.getEmergenciaNombre())
                .emergenciaTelefono(dto.getEmergenciaTelefono())
                .tipoSangre(dto.getTipoSangre())
                .notasClinicas(dto.getNotasClinicas())
                .saldoPendiente(dto.getSaldoPendiente() != null ? dto.getSaldoPendiente() : java.math.BigDecimal.ZERO)
                .expedienteCompleto(dto.getExpedienteCompleto() != null ? dto.getExpedienteCompleto() : false)
                .build();

        paciente.setTenantId(tenantId);
        paciente.setRegBorrado(1);

        Paciente guardado = pacienteRepository.save(paciente);
        return mapToDTO(guardado);
    }

    @Transactional(readOnly = true)
    public PacienteDTO obtenerPorId(UUID id, UUID tenantId) {
        Paciente paciente = pacienteRepository.findByIdAndTenantIdAndRegBorrado(id, tenantId, 1)
                .orElseThrow(() -> new BusinessException(ErrorCodes.USER_NOT_FOUND, "Paciente no encontrado",
                        HttpStatus.NOT_FOUND));
        return mapToDTO(paciente);
    }

    @Transactional
    public PacienteDTO actualizar(UUID id, PacienteDTO dto, UUID tenantId) {
        Paciente paciente = pacienteRepository.findByIdAndTenantIdAndRegBorrado(id, tenantId, 1)
                .orElseThrow(() -> new BusinessException(ErrorCodes.USER_NOT_FOUND, "Paciente no encontrado",
                        HttpStatus.NOT_FOUND));

        paciente.setNombreCompleto(dto.getNombreCompleto());
        paciente.setFechaNacimiento(dto.getFechaNacimiento());
        paciente.setTelefono(dto.getTelefono());
        paciente.setEmail(dto.getEmail());
        paciente.setGenero(dto.getGenero());
        paciente.setCurp(dto.getCurp());
        paciente.setDireccion(dto.getDireccion());
        paciente.setOcupacion(dto.getOcupacion());
        paciente.setAlergias(dto.getAlergias());
        paciente.setEnfermedadesCronicas(dto.getEnfermedadesCronicas());
        paciente.setMedicamentosActuales(dto.getMedicamentosActuales());
        paciente.setEmergenciaNombre(dto.getEmergenciaNombre());
        paciente.setEmergenciaTelefono(dto.getEmergenciaTelefono());
        paciente.setTipoSangre(dto.getTipoSangre());
        paciente.setNotasClinicas(dto.getNotasClinicas());

        if (dto.getSaldoPendiente() != null)
            paciente.setSaldoPendiente(dto.getSaldoPendiente());
        if (dto.getExpedienteCompleto() != null)
            paciente.setExpedienteCompleto(dto.getExpedienteCompleto());

        return mapToDTO(pacienteRepository.save(paciente));
    }

    private PacienteDTO mapToDTO(Paciente p) {
        return PacienteDTO.builder()
                .id(p.getId())
                .nombreCompleto(p.getNombreCompleto())
                .fechaNacimiento(p.getFechaNacimiento())
                .telefono(p.getTelefono())
                .email(p.getEmail())
                .genero(p.getGenero())
                .curp(p.getCurp())
                .direccion(p.getDireccion())
                .ocupacion(p.getOcupacion())
                .alergias(p.getAlergias())
                .enfermedadesCronicas(p.getEnfermedadesCronicas())
                .medicamentosActuales(p.getMedicamentosActuales())
                .emergenciaNombre(p.getEmergenciaNombre())
                .emergenciaTelefono(p.getEmergenciaTelefono())
                .tipoSangre(p.getTipoSangre())
                .notasClinicas(p.getNotasClinicas())
                .saldoPendiente(p.getSaldoPendiente())
                .expedienteCompleto(p.getExpedienteCompleto())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
