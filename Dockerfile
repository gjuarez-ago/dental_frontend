# Stage 1: Build Spring Boot Backend
FROM maven:3.9-eclipse-temurin-17-alpine AS backend-build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY . .
# Eliminamos la construcción y copia del frontend ya que se desplegará en Cloudflare
RUN mvn package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=backend-build /app/target/crm-0.0.1-SNAPSHOT.jar app.jar

# Cloud Run escucha en el puerto definido por la variable de entorno $PORT (default 8080)
EXPOSE 8080

ENTRYPOINT java -Dserver.port=${PORT} -jar app.jar
