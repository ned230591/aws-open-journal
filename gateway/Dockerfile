FROM eclipse-temurin:21-jre

WORKDIR /app

COPY gateway/target/*.jar trade-journal-gateway.jar

RUN mkdir -p /app/logs

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "trade-journal-gateway.jar"]