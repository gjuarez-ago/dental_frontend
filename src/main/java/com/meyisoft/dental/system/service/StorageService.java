package com.meyisoft.dental.system.service;

import com.meyisoft.dental.system.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

    private final S3Client s3Client;

    @Value("${cloudflare.r2.bucket-name}")
    private String bucketName;

    @Value("${cloudflare.r2.public-url}")
    private String publicUrl;

    @Value("${cloudflare.r2.endpoint}")
    private String endpoint;

    /**
     * Sube un archivo a Cloudflare R2
     *
     * @param file   Archivo a subir
     * @param folder Carpeta virtual dentro del bucket (ej. "avatars", "products")
     * @return La URL pública completa del archivo subido
     */
    public String uploadFile(MultipartFile file, String folder) {
        if (file.isEmpty()) {
            throw new BusinessException("FILE_EMPTY", "El archivo está vacío", HttpStatus.BAD_REQUEST);
        }

        try {
            // Si el endpoint es el de default, no intentamos subir a R2
            if (endpoint.contains("default-endpoint.com")) {
                log.warn("Usando configuración de R2 por defecto. El archivo no se subirá realmente.");
                return "https://storage.googleapis.com/placeholder-dental/" + UUID.randomUUID();
            }

            String originalFileName = file.getOriginalFilename();
            if (originalFileName == null) {
                originalFileName = "unnamed_file";
            }

            String cleanFileName = originalFileName.replaceAll("\\s+", "_");
            String uniqueName = UUID.randomUUID() + "-" + cleanFileName;

            // Formar el "key" en base a la carpeta
            String objectKey = (folder != null && !folder.isBlank()) ? folder + "/" + uniqueName : uniqueName;

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(objectKey)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(
                    putObjectRequest,
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // Evitar doble slash si publicUrl ya termina en '/'
            String baseUrl = publicUrl.endsWith("/") ? publicUrl : publicUrl + "/";
            return baseUrl + objectKey;

        } catch (IOException e) {
            throw new BusinessException("UPLOAD_ERROR", "Error al procesar el archivo para subirlo. " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            log.error("Error crítico en R2: {}", e.getMessage());
            throw new BusinessException("S3_ERROR", "Error al comunicarse con Cloudflare R2. " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Elimina un archivo de Cloudflare R2 utilizando su URL pública.
     *
     * @param fileUrl URL pública del archivo
     */
    public void deleteFileByUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return; // Nada que borrar
        }

        try {
            // Si el endpoint es el de default, no intentamos borrar en R2
            if (endpoint.contains("default-endpoint.com")) {
                return;
            }

            // Extraer el "key" (la ruta después del dominio público)
            String baseUrl = publicUrl.endsWith("/") ? publicUrl : publicUrl + "/";

            if (fileUrl.startsWith(baseUrl)) {
                String objectKey = fileUrl.substring(baseUrl.length());

                DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(objectKey)
                        .build();

                s3Client.deleteObject(deleteObjectRequest);
            }
        } catch (Exception e) {
            throw new BusinessException("DELETE_ERROR", "No se pudo eliminar el archivo. " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
