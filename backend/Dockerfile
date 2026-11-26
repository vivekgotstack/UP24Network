# syntax=docker/dockerfile:1.7
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /build
COPY backend/pom.xml ./pom.xml
COPY backend/src/main ./src/main
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine AS runtime
RUN apk add --no-cache ffmpeg \
    && addgroup -S -g 10001 up24 && adduser -S -u 10001 -G up24 up24 \
    && mkdir -p /app/uploads/.video-work /app/uploads/videos && chown -R up24:up24 /app
WORKDIR /app
COPY --from=build --chown=up24:up24 /build/target/news-0.0.1-SNAPSHOT.jar ./app.jar
USER up24
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=50.0 -XX:+ExitOnOutOfMemoryError"
HEALTHCHECK --interval=20s --timeout=5s --start-period=90s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
