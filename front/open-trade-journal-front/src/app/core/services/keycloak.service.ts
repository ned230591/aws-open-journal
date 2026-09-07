import { Injectable } from '@angular/core';
import Keycloak from 'keycloak-js';

@Injectable({
  providedIn: 'root'
})
export class KeycloakService {

private readonly keycloak = new Keycloak({
  url: 'https://auth-open-trade-journal.duckdns.org',
  realm: 'open-trade-journal-app',
  clientId: 'open-trade-journal-angular-app'
});


  async init(): Promise<boolean> {
    const authenticated = await this.keycloak.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256'
    });

    if (authenticated) {
      console.log('Keycloak access token:', this.keycloak.token);
    }

    return authenticated;
  }

  async login(): Promise<void> {
    await this.keycloak.login({
      redirectUri: window.location.origin
    });
  }

  async logout(): Promise<void> {
    await this.keycloak.logout({
      redirectUri: window.location.origin
    });
  }

  isLoggedIn(): boolean {
    return !!this.keycloak.authenticated;
  }

  getToken(): string | undefined {
    return this.keycloak.token;
  }

  getUsername(): string | undefined {
    return this.keycloak.tokenParsed?.['preferred_username'];
  }

  async refreshToken(): Promise<boolean> {
    try {
      await this.keycloak.updateToken(30);
      return true;
    } catch {
      return false;
    }
  }



}
