package com.meyisoft.dental.system.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final EmailService emailService;
    private final WhatsAppService whatsAppService;

    /**
     * Envía una notificación por Email y WhatsApp simultáneamente.
     */
    public void sendGlobalNotification(String emailTo, String phoneTo, String subject, String message) {
        log.info("Iniciando envío de notificación global a {}", emailTo);
        
        if (emailTo != null && !emailTo.isEmpty()) {
            emailService.sendSimpleEmail(emailTo, subject, message);
        }
        
        if (phoneTo != null && !phoneTo.isEmpty()) {
            whatsAppService.sendTextMessage(phoneTo, message);
        }
    }

    public void sendWhatsAppOnly(String phoneTo, String message) {
        whatsAppService.sendTextMessage(phoneTo, message);
    }

    public void sendEmailOnly(String emailTo, String subject, String message) {
        emailService.sendSimpleEmail(emailTo, subject, message);
    }
}
