import {Component, inject , CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {KeycloakService} from '../../core/services/keycloak.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',

  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Login {

  private readonly keycloak = inject(KeycloakService);

  async loginWithKeycloak(): Promise<void> {
    await this.keycloak.login();
  }
}
