import {ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter, Router} from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';

import * as echarts from 'echarts/core';

import {
  BarChart,
  LineChart
} from 'echarts/charts';

import {
  GridComponent,
  TooltipComponent
} from 'echarts/components';

import {
  CanvasRenderer
} from 'echarts/renderers';
import { KeycloakService } from './core/services/keycloak.service';



echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  CanvasRenderer
]);
import { routes } from './app.routes';
import {authInterceptor} from './core/interceptors/auth.interceptor';
import {provideHttpClient, withInterceptors} from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        authInterceptor
      ])
    ),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideEchartsCore({
      echarts
    }),
    provideAppInitializer(() => {
      const keycloak = inject(KeycloakService);
      const router = inject(Router);

      return keycloak.init()
        .catch((error) => {
          console.error('Keycloak initialization failed:', error);
          router.navigateByUrl('/error');
          return false;
        });
    })
  ]
};


