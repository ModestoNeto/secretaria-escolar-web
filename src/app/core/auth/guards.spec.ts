import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { jwtFalso } from './jwt-falso';
import { authGuard, roleGuard } from './guards';
import { Role } from './auth.models';

const rota = {} as ActivatedRouteSnapshot;
const estado = {} as RouterStateSnapshot;

const executar = (guard: typeof authGuard) => TestBed.runInInjectionContext(() => guard(rota, estado));

const comSessao = (role: Role | null) => {
  sessionStorage.clear();
  if (role) {
    sessionStorage.setItem(
      'secretaria.tokens',
      JSON.stringify({ accessToken: jwtFalso(role), refreshToken: 'r' }),
    );
  }
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
};

const destino = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

describe('guards', () => {
  afterEach(() => sessionStorage.clear());

  it('authGuard deixa passar quem está logado', () => {
    comSessao('ADMIN');
    expect(executar(authGuard)).toBe(true);
  });

  it('authGuard manda quem não está logado para /entrar', () => {
    comSessao(null);
    expect(destino(executar(authGuard))).toBe('/entrar');
  });

  it('roleGuard deixa passar o papel permitido', () => {
    comSessao('ADMIN');
    expect(executar(roleGuard('ADMIN'))).toBe(true);
  });

  it.each<Role>(['SECRETARIA', 'PROFESSOR'])('roleGuard(ADMIN) barra %s', (role) => {
    comSessao(role);
    expect(destino(executar(roleGuard('ADMIN')))).toBe('/acesso-negado');
  });

  it('roleGuard barra quem não tem papel', () => {
    comSessao(null);
    expect(destino(executar(roleGuard('ADMIN', 'SECRETARIA')))).toBe('/acesso-negado');
  });
});
