import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { KeycloakService } from '../../core/services/keycloak.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly keycloak = inject(KeycloakService);

  async loginWithKeycloak(): Promise<void> {
    await this.keycloak.login();
  }
}
