import {
  Component,
  HostListener,
  signal,
  AfterViewInit,
  inject} from '@angular/core';

import {RouterOutlet} from '@angular/router';
import {
  MatSidenav,
  MatSidenavContainer,
  MatSidenavContent
} from '@angular/material/sidenav';

import {MatToolbar} from '@angular/material/toolbar';

import {Sidebar} from './features/sidebar/sidebar';
import {KeycloakService} from './core/services/keycloak.service';

@Component({
  selector: 'app-root',
  standalone: true,

  imports: [
    RouterOutlet,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    Sidebar,
    MatToolbar
  ],

  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements AfterViewInit {
  private readonly keycloak =
    inject(KeycloakService);

  protected readonly title =
    signal('open_trade_journal');

  isMobile = false;

  constructor() {
    this.checkScreen();
  }


  ngAfterViewInit(): void {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.remove();
      }, 250);
    }
  }

  @HostListener('window:resize')
  checkScreen(): void {
    this.isMobile = window.innerWidth < 768;
  }

  get isLoggedIn(): boolean {
    return this.keycloak.isLoggedIn();
  }

}
