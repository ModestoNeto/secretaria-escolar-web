import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

const mensagem = (e: HttpErrorResponse) =>
  e.status === 0 ? 'Sem conexão com a API' : (e.error?.message ?? 'Erro inesperado');

export const erroInterceptor: HttpInterceptorFn = (req, next) => {
  const aviso = inject(MatSnackBar);
  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      // o login mostra o próprio erro no formulário; o 401 é tratado pelo auth.interceptor
      if (!req.url.includes('/auth/login') && e.status !== 401) {
        aviso.open(mensagem(e), 'Fechar', { duration: 5000 });
      }
      return throwError(() => e);
    }),
  );
};
