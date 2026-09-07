import {Component, inject} from '@angular/core';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatIconModule} from '@angular/material/icon';
import { RouterLink, RouterLinkActive} from '@angular/router';
import {MatNavList} from '@angular/material/list';
import { KeycloakService } from '../../core/services/keycloak.service';


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    RouterLink,
    MatNavList,
    RouterLinkActive
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private readonly keycloak = inject(KeycloakService);

  async logout(): Promise<void> {
    await this.keycloak.logout();
  }
}
