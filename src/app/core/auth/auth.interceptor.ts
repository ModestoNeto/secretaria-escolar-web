import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const comToken = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  // só a nossa API, e nunca as rotas /auth (login e refresh não levam Bearer)
  if (!req.url.startsWith(environment.apiUrl) || req.url.includes('/auth/')) {
    return next(req);
  }
  return next(comToken(req, auth.accessToken())).pipe(
    catchError((erro) => {
      if (erro.status !== 401 || !auth.refreshToken()) return throwError(() => erro);
      return auth.renovar().pipe(
        switchMap((t) => next(comToken(req, t.accessToken))),
        catchError((e) => {
          auth.logout();
          return throwError(() => e);
        }),
      );
    }),
  );
};
