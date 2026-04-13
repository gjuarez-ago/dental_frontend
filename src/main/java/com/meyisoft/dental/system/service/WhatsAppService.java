package com.meyisoft.dental.system.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class WhatsAppService {

    @Value("${whatsapp.access-token}")
    private String accessToken;

    @Value("${whatsapp.phone-number-id}")
    private String phoneNumberId;

    @Value("${whatsapp.api-url}")
    private String apiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Async
    public void sendTextMessage(String to, String text) {
        try {
            String url = String.format("%s/%s/messages", apiUrl, phoneNumberId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            Map<String, Object> body = new HashMap<>();
            body.put("messaging_product", "whatsapp");
            body.put("recipient_type", "individual");
            body.put("to", to);
            body.put("type", "text");

            Map<String, String> textObj = new HashMap<>();
            textObj.put("body", text);
            body.put("text", textObj);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("WhatsApp enviado exitosamente a: {}", to);
            } else {
                log.error("Error enviando WhatsApp a {}: {}", to, response.getBody());
            }
        } catch (Exception e) {
            log.error("Excepción al enviar WhatsApp: {}", e.getMessage());
        }
    }
}
