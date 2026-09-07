FROM eclipse-temurin:21-jre

WORKDIR /app

COPY journal-service/target/*.jar trade-journal-service.jar

RUN mkdir -p /app/logs

EXPOSE 8083

ENTRYPOINT ["java", "-jar", "trade-journal-service.jar"]