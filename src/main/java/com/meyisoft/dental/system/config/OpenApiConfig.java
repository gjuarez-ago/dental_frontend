package com.meyisoft.dental.system.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

        @Bean
        public OpenAPI customOpenAPI() {
                final String securitySchemeName = "bearerAuth";

                return new OpenAPI()
                                .info(new Info()
                                                .title("CRM & Ecommerce API")
                                                .version("1.0")
                                                .description("API Multi-Tenant para administración de pedidos, cotizaciones y catálogo.")
                                                .contact(new Contact().name("Tu Nombre/Empresa")
                                                                .email("soporte@tuempresa.com")))
                                // Añadir requerimiento de seguridad global
                                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                                // Definir cómo es el esquema de seguridad (JWT)
                                .components(new Components()
                                                .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                                                .name(securitySchemeName)
                                                                .type(SecurityScheme.Type.HTTP)
                                                                .scheme("bearer")
                                                                .bearerFormat("JWT")));
        }
}
