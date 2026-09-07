import {HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {KeycloakService} from '../services/keycloak.service';
import {from, switchMap} from 'rxjs';
import {environments} from '../../../environments/environments';


export const authInterceptor: HttpInterceptorFn = (req, next) => {


  if (!req.url.startsWith(environments.apiUrl) &&  (!req.url.startsWith('ws') )) {
    return next(req);
  }

  const keycloak = inject(KeycloakService);

  return from(keycloak.refreshToken()).pipe(
    switchMap(() => {

      const token = keycloak.getToken();

      if (!token) {
        return next(req);
      }
      console.log("token " + token)
      return next(req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      }));
    })
  );
};
