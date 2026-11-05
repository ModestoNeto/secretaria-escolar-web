import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from './auth.models';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () =>
  inject(AuthService).autenticado() ? true : inject(Router).createUrlTree(['/entrar']);

export const roleGuard =
  (...papeis: Role[]): CanActivateFn =>
  () => {
    const role = inject(AuthService).role();
    return role && papeis.includes(role) ? true : inject(Router).createUrlTree(['/acesso-negado']);
  };
