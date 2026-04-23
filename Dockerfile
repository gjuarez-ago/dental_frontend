# Stage 1: Build Angular Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Build Spring Boot Backend
FROM maven:3.9-eclipse-temurin-17-alpine AS backend-build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY . .
# Copiar el build de Angular a la carpeta de recursos estáticos de Spring Boot
# Nota: Ajusta la ruta 'dist/crm-web/browser' según la salida real de tu 'ng build'
COPY --from=frontend-build /app/dist/crm-web/browser src/main/resources/static/
RUN mvn package -DskipTests

# Stage 3: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=backend-build /app/target/*.jar app.jar

# Cloud Run escucha en el puerto definido por la variable de entorno $PORT (default 8080)
EXPOSE 8080

ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-jar", "app.jar"]
