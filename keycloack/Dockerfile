FROM quay.io/keycloak/keycloak:26.7.0

COPY  keycloack/target/*.jar /opt/keycloak/providers/

RUN /opt/keycloak/bin/kc.sh build